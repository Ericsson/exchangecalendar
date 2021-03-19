/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 * ***** BEGIN LICENSE BLOCK *****/

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erFindInboxFolderRequest"];

function erFindInboxFolderRequest(aArgument, aCbOk, aCbError, aListener) {
    this.mCbOk = aCbOk;
    this.mCbError = aCbError;

    var self = this;

    this.parent = new ExchangeRequest(aArgument,
        function (aExchangeRequest, aResp) {
            self.onSendOk(aExchangeRequest, aResp);
        },
        function (aExchangeRequest, aCode, aMsg) {
            self.onSendError(aExchangeRequest, aCode, aMsg);
        },
        aListener);

    this.argument = aArgument;

    this.serverUrl = aArgument.serverUrl;
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;

    while ((aArgument.folderPath.length > 0) && (aArgument.folderPath.indexOf("/") == 0)) {
        aArgument.folderPath = aArgument.folderPath.substr(1);
    }

    this.folderPath = aArgument.folderPath.split("/");

    this.isRunning = true;
    if (this.folderPath.length > 0) {
        var counter = 0;
        while (counter < this.folderPath.length) {
            this.folderPath[counter] = exchWebService.commonFunctions.decodeFolderSpecialChars(this.folderPath[counter]);
            counter++
        }

        this.folderCount = 0;
        this.execute();
    }
    else {
        this.onSendError(this, this.parent.ER_ERROR_EMPTY_FOLDERPATH, "No folderpath to search specified");
    }
}

erFindInboxFolderRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erFindInboxFolderRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:FindFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("Traversal", "Deep");

        var fs = req.addChildTag("FolderShape", "nsMessages", null);
        fs.addChildTag("BaseShape", "nsTypes", "IdOnly");
        var ap = fs.addChildTag("AdditionalProperties", "nsTypes", null);
        ap.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName");
        ap.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:ParentFolderId");
        ap.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:FolderClass");

        var extProp = ap.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extProp.setAttribute("PropertyTag", "4340");
        extProp.setAttribute("PropertyType", "Boolean");

        /*var restr = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Restriction xmlns:nsMessages="'+nsMessagesStr+'" xmlns:nsTypes="'+nsTypesStr+'"/>');
        var isEqualTo = restr.addChildTag("IsEqualTo", "nsTypes", null);
        isEqualTo.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName");
        isEqualTo.addChildTag("FieldURIOrConstant", "nsTypes", null).addChildTag("Constant", "nsTypes", null).setAttribute("Value", this.folderPath[this.folderCount]);
 
        req.addChildTagObject(restr);
        restr = null;
         */

        var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erFindInboxFolderRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erFindInboxFolderRequest.onSendOk:"+String(aResp));
        // Get FolderID and ChangeKey
        var aContinue = true;
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindFolderResponse/m:ResponseMessages/m:FindFolderResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");
        var fldrs = [];
        if (rm.length > 0) {

            var totalItemsInView = rm[0].getAttributeByTag("m:RootFolder", "TotalItemsInView");

            exchWebService.commonFunctions.LOG("totalItemsInView=" + totalItemsInView + "\n");
            if (totalItemsInView > 0) {
                var folder = rm[0].XPath("/m:RootFolder/t:Folders/*");
                try {
                    for (var i = 0; i < folder.length; i++) {
                        fldrs[i] = {
                            id: folder[i].getAttributeByTag("t:FolderId", "Id"),
                            changeKey: folder[i].getAttributeByTag("t:FolderId", "ChangeKey"),
                            name: folder[i].getTagValue("t:DisplayName"),
                            pId: folder[i].getAttributeByTag("t:ParentFolderId", "Id"),
                            folderClass: folder[i].getTagValue("t:FolderClass"),
                        };
                    }
                }
                catch (err) {
                    exchWebService.commonFunctions.LOG("bliepbliep 4");
                    aMsg = err;
                    aCode = this.parent.ER_ERROR_FINDFOLDER_FOLDERID_DETAILS;
                    aContinue = false;
                    aError = true;
                }
                folder = null;
            }
            else {
                exchWebService.commonFunctions.LOG("totalItemsInView != 1 (" + totalItemsInView + ")\n");
                aError = true;
                aCode = this.parent.ER_ERROR_FINDFOLDER_MULTIPLE_RESULTS;
                aMsg = "Expected on findfolder result but have " + totalItemsInView + " results.";
            }
        }
        else {
            aMsg = err;
            aCode = this.parent.ER_ERROR_FINDFOLDER_NO_TOTALITEMSVIEW;
            aContinue = false;
            aError = true;
        }

        rm = null;

        if (aError) {
            this.onSendError(aExchangeRequest, aCode, aMsg);
        }
        else {
            if (this.mCbOk) {
                this.mCbOk(this, fldrs);
            }
            this.isRunning = false;
        }

    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
