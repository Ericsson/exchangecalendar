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

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erCreateItemRequest"];

function erCreateItemRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.listener = aListener;
    this.createReq = aArgument.createReq;

    this.isRunning = true;
    this.execute("AutoResolve");
}

erCreateItemRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erCreateItemRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:CreateItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        if (publicFoldersMap[this.argument.folderBase]) {
            var SendMeetingInvitations = "SendToNone";
        }
        else {
            // When noone else is invited we want an appointment and not a meeting
            if ((this.argument.item) && (this.argument.item.getAttendees({}).length == 0)) {
                var SendMeetingInvitations = "SendToNone";
            }
            else {
                var SendMeetingInvitations = "SendToAllAndSaveCopy";
            }
        }

        if (cal.isEvent(this.argument.item)) {
            req.setAttribute("SendMeetingInvitations", SendMeetingInvitations);
        }

        // Following two are only needed for emails.
        //req.setAttribute("MessageDisposition", "SaveOnly");

        var savedItemFolderId = makeParentFolderIds2("SavedItemFolderId", this.argument);
        req.addChildTagObject(savedItemFolderId);
        savedItemFolderId = null;

        var Items = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Items xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '">' + String(this.createReq) + '</nsMessages:Items>');
        req.addChildTagObject(Items);
        Items = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erCreateItemRequest.execute>"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erCreateItemRequest.onSendOk: "+String(aResp)+"\n");

        var rm = aResp.XPath("/s:Envelope/s:Body/m:CreateItemResponse/m:ResponseMessages/m:CreateItemResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");
        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Respons does not contain expected field.");
            return;
        }
        rm = null;

        var aItem = aResp.XPath("/s:Envelope/s:Body/m:CreateItemResponse/m:ResponseMessages/m:CreateItemResponseMessage/m:Items/*");

        if (aItem.length > 0) {
            var itemId = aItem[0].getAttributeByTag("t:ItemId", "Id");
            var changeKey = aItem[0].getAttributeByTag("t:ItemId", "ChangeKey");
        }
        else {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_CREATING_ITEM_UNKNOWN, "Error. Valid createitem request but received no update details:" + String(aResp));
            aItem = null;
            return;
        }
        aItem = null;

        if (this.mCbOk) {
            this.mCbOk(this, itemId, changeKey);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
