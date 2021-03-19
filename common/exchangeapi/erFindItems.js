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

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erFindItemsRequest"];

function convDate(aDate) {
    if (aDate) {
        var d = aDate.clone();

        d.isDate = false;
        return cal.toRFC3339(d);
    }

    return null;
}

function erFindItemsRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.mailbox = aArgument.mailbox;
    this.serverUrl = aArgument.serverUrl;

    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;

    this.messageId = aArgument.messageId;

    this.ids = [];

    this.itemsFound = 0;
    this.isRunning = true;
    this.execute();
}

erFindItemsRequest.prototype = {

    execute: function _execute() {
        //dump("erFindItemsRequest.execute\n");

        var root = xml2json.newJSON();
        var req = xml2json.addTag(root, "FindItem", "nsMessages", null);
        xml2json.setAttribute(req, "xmlns:nsMessages", nsMessagesStr);
        xml2json.setAttribute(req, "xmlns:nsTypes", nsTypesStr);
        xml2json.setAttribute(req, "Traversal", "Shallow");

        var itemShape = xml2json.addTag(req, "ItemShape", "nsMessages", null);
        var baseShape = xml2json.addTag(itemShape, "BaseShape", "nsTypes", "IdOnly");

        var view = xml2json.addTag(req, "IndexedPageItemView", "nsMessages", null);
        xml2json.setAttribute(view, "MaxEntriesReturned", "100");
        xml2json.setAttribute(view, "Offset", "0");
        xml2json.setAttribute(view, "BasePoint", "Beginning");

        var restrict = xml2json.addTag(req, "Restriction", "nsMessages", null);
        var isequal = xml2json.addTag(restrict, "IsEqualTo", "nsTypes", null);
        var extField = xml2json.addTag(isequal, "ExtendedFieldURI", "nsTypes", null);
        xml2json.setAttribute(extField, "PropertyTag", "0x1035");
        xml2json.setAttribute(extField, "PropertyType", "String");
        var fieldUri = xml2json.addTag(isequal, "FieldURIOrConstant", "nsTypes", null);
        var constant = xml2json.addTag(fieldUri, "Constant", "nsTypes", null);
        xml2json.setAttribute(constant, "Value", this.messageId);

        view = null;
        var parentFolder = makeParentFolderIds3("ParentFolderIds", this.argument);
        xml2json.addTagObject(req, parentFolder);
        parentFolder = null;

        this.parent.xml2json = true;
        exchWebService.commonFunctions.LOG("erFindItemsRequest.execute 2:" + String(xml2json.toString(req)) + "\n");

        this.parent.sendRequest(this.parent.makeSoapMessage2(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erFindItemsRequest.execute 2: " + String(xml2json.toString(aResp)) + "\n");
        var aError = false;
        var aCode = 0;
        var aMsg = "";

        var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {
            var rootFolder = xml2json.getTag(rm[0], "m:RootFolder");
            if (rootFolder) {
                // Process results.
                var message = xml2json.XPath(rootFolder, "/t:Items/t:Message");
                for (var index = 0; index < message.length; index++) {
                    var id = xml2json.getAttributeByTag(message[index], "t:ItemId", "Id");
                    var changeKey = xml2json.getAttributeByTag(message[index], "t:ItemId", "ChangeKey");

                    this.ids.push({
                        "Id": id,
                        "ChangeKey": changeKey,
                    });
                }
                message = null;
            }
            else {
                aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
                aError = true;
                aMsg = "No RootFolder found in FindItemResponse.";
            }
        }
        else {
            aMsg = this.parent.getSoapErrorMsg(aResp);
            if (aMsg) {
                aCode = this.parent.ER_ERROR_CONVERTID;
                aError = true;
            }
            else {
                aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
                aError = true;
                aMsg = "Wrong response received.";
            }
        }

        rm = null;

        if (aError) {
            this.onSendError(aExchangeRequest, aCode, aMsg);
        }
        else {
            if (this.mCbOk) {
                this.mCbOk(this, this.ids);
            }
            this.ids = null;
            this.isRunning = false;
        }

    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        dump(" @@@ onSendError aCode:" + aCode + ", aMsg:" + aMsg + " @@@\n");
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
