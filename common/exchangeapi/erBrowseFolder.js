/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * -- Exchange 2007/2010 Calendar and Tasks Provider.
 * -- For Thunderbird with the Lightning add-on.
 *
 * This work is a combination of the Storage calendar, part of the default Lightning add-on, and 
 * the "Exchange Data Provider for Lightning" add-on currently, october 2011, maintained by Simon Schubert.
 * Primarily made because the "Exchange Data Provider for Lightning" add-on is a continuation 
 * of old code and this one is build up from the ground. It still uses some parts from the 
 * "Exchange Data Provider for Lightning" project.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erBrowseFolderRequest"];

function erBrowseFolderRequest(aArgument, aCbOk, aCbError) {
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
        null);

    this.argument = aArgument;

    this.serverUrl = aArgument.serverUrl;
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;

    this.isRunning = true;
    this.execute();
}

erBrowseFolderRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erBrowseFolderRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:FindFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("Traversal", "Shallow");

        req.addChildTag("FolderShape", "nsMessages", null).addChildTag("BaseShape", "nsTypes", "AllProperties");

        var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        this.parent.xml2jxon = true;

        exchWebService.commonFunctions.LOG("erBrowseFolderRequest.execute:" + String(this.parent.makeSoapMessage(req)));

        //exchWebService.commonFunctions.LOG("erBrowseFolderRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erBrowseFolderRequest.onSendOk:" + String(aResp));
        // Get FolderID and ChangeKey
        var aContinue = true;
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;
        var childFolders = [];

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindFolderResponse/m:ResponseMessages/m:FindFolderResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {
            var rootFolder = rm[0].getTag("m:RootFolder");
            if (rootFolder) {
                if (rootFolder.getAttribute("IncludesLastItemInRange") == "true") {
                    // Process results.
                    var folders = rootFolder.XPath("/t:Folders/*");
                    exchWebService.commonFunctions.LOG("Found '" + folders.length + "' folders.");
                    for (var index in folders) {
                        exchWebService.commonFunctions.LOG("Adding folder:" + folders[index].getTagValue("t:DisplayName"));
                        var tmpFolderClass = folders[index].getTagValue("t:FolderClass", "");
                        childFolders.push({
                            user: this.argument.user,
                            mailbox: this.argument.mailbox,
                            folderBase: this.argument.folderBase,
                            serverUrl: this.argument.serverUrl,
                            folderID: folders[index].getAttributeByTag("t:FolderId", "Id"),
                            changeKey: folders[index].getAttributeByTag("t:FolderId", "ChangeKey"),
                            foldername: folders[index].getTagValue("t:DisplayName", ""),
                            isContainer: (folders[index].getTagValue("t:ChildFolderCount", 0) > 0),
                            isContainerOpen: false,
                            isContainerEmpty: (folders[index].getTagValue("t:ChildFolderCount", 0) == 0),
                            level: this.argument.level + 1,
                            children: [],
                            folderClass: tmpFolderClass
                        });
                    }
                    folders = null;
                }
                else {
                    // We do not know how to handle this yet. Do not know if it ever happens. We did not restrict MaxEntriesReturned.
                    exchWebService.commonFunctions.LOG("SUBMIT THIS LINE TO https://github.com/ExchangeCalendar/exchangecalendar/issues: IncludesLastItemInRange == false in FindFolderResponse.");
                }
            }
            else {
                aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
                aError = true;
                aMsg = "No RootFolder found in FindFolderResponse.";
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
                this.mCbOk(this, childFolders);
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
