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

var EXPORTED_SYMBOLS = ["erFindFolderRequest"];

function erFindFolderRequest(aArgument, aCbOk, aCbError, aListener) {
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

erFindFolderRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erFindFolderRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:FindFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("Traversal", "Shallow");

        req.addChildTag("FolderShape", "nsMessages", null).addChildTag("BaseShape", "nsTypes", "AllProperties");

        var restr = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Restriction xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var isEqualTo = restr.addChildTag("IsEqualTo", "nsTypes", null);
        isEqualTo.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName");
        isEqualTo.addChildTag("FieldURIOrConstant", "nsTypes", null).addChildTag("Constant", "nsTypes", null).setAttribute("Value", this.folderPath[this.folderCount]);

        /*		var restr = 
        			<nsMessages:Restriction xmlns:nsMessages={nsMessages} xmlns:nsTypes={nsTypes}>
        				<nsTypes:IsEqualTo>
        					<nsTypes:FieldURI FieldURI="folder:DisplayName"/>
        					<nsTypes:FieldURIOrConstant>
        						<nsTypes:Constant Value={this.folderPath[this.folderCount]}/>
        					</nsTypes:FieldURIOrConstant>
        				</nsTypes:IsEqualTo>
        			</nsMessages:Restriction>;*/

        req.addChildTagObject(restr);
        restr = null;

        var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erFindFolderRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erFindFolderRequest.onSendOk:"+String(aResp));
        // Get FolderID and ChangeKey
        var aContinue = true;
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindFolderResponse/m:ResponseMessages/m:FindFolderResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {

            var totalItemsInView = rm[0].getAttributeByTag("m:RootFolder", "TotalItemsInView");

            exchWebService.commonFunctions.LOG("totalItemsInView=" + totalItemsInView + "\n");
            if (totalItemsInView == 1) {
                var folder = rm[0].XPath("/m:RootFolder/t:Folders/*");
                try {
                    this.argument.folderID = folder[0].getAttributeByTag("t:FolderId", "Id");
                    this.argument.changeKey = folder[0].getAttributeByTag("t:FolderId", "ChangeKey");
                    var folderClass = folder[0].getTagValue("t:FolderClass");
                    this.folderCount++;
                    if (this.folderCount < this.folderPath.length) {
                        this.execute();
                        return;
                    }
                }
                catch (err) {
                    exchWebService.commonFunctions.LOG("bliepbliep 3");
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
                this.mCbOk(this, this.argument.folderID, this.argument.changeKey, folderClass);
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
