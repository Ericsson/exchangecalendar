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

/*Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");*/

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erGetFolderRequest"];

function erGetFolderRequest(aArgument, aCbOk, aCbError, aListener) {
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

    /*	while ((aArgument.folderPath.length > 0) && (aArgument.folderPath.indexOf("/") == 0)) {
    		aArgument.folderPath = aArgument.folderPath.substr(1);
    	}*/

    this.isRunning = true;
    this.execute();
}

erGetFolderRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erGetFolderRequest.execute 1");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        req.addChildTag("FolderShape", "nsMessages", null).addChildTag("BaseShape", "nsTypes", "AllProperties");

        var parentFolder = makeParentFolderIds2("FolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        //exchWebService.commonFunctions.LOG(" ++ xml2jxon ++:"+this.parent.makeSoapMessage(req));

        //exchWebService.commonFunctions.LOG("erGetFolderRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erGetFolderRequest.onSendOk:"+String(aResp));
        // Get FolderID and ChangeKey
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {
            var calendarFolder = rm[0].XPath("/m:Folders/t:CalendarFolder");
            if (calendarFolder.length == 0) {
                var calendarFolder = rm[0].XPath("/m:Folders/t:TasksFolder");
            }
            if (calendarFolder.length > 0) {
                var folderID = calendarFolder[0].getAttributeByTag("t:FolderId", "Id");
                var changeKey = calendarFolder[0].getAttributeByTag("t:FolderId", "ChangeKey");
                var folderClass = calendarFolder[0].getTagValue("t:FolderClass");
                this.displayName = calendarFolder[0].getTagValue("t:DisplayName");
            }
            else {
                aMsg = "Did not find any CalendarFolder parts.";
                aCode = this.parent.ER_ERROR_FINDFOLDER_FOLDERID_DETAILS;
                aError = true;
            }
            calendarFolder = null;
        }
        else {
            aMsg = this.parent.getSoapErrorMsg(aResp);
            if (aMsg) {
                aCode = this.parent.ER_ERROR_FINDFOLDER_FOLDERID_DETAILS;
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
                this.properties = aResp;
                this.mCbOk(this, folderID, changeKey, folderClass);
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
