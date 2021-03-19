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

var EXPORTED_SYMBOLS = ["erDeleteItemRequest"];

function erDeleteItemRequest(aArgument, aCbOk, aCbError, aListener) {
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
    if (aArgument.item) {
        this.id = aArgument.item.id;
        this.changeKey = aArgument.item.changeKey;
    }
    else {
        this.id = aArgument.id;
        this.changeKey = aArgument.changeKey;
    }
    this.itemIndex = aArgument.itemIndex;
    this.itemType = aArgument.itemType;
    this.isRunning = true;

    this.execute();
}

erDeleteItemRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erGetMasterOccurrenceIdRequest.execute\n");

        if ((publicFoldersMap[this.argument.folderBase]) || (this.itemType == "response")) {
            var sendMeetingCancellations = "SendToNone";
        }
        else {
            var sendMeetingCancellations = "SendToAllAndSaveCopy";
        }

        var affectedTaskOccurrences = "";

        var itemids = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ItemIds xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        if (this.argument.whichOccurrence == "all_occurrences") {
            this.itemType = "master"; // Seems if we want to delete all occurrences then we need to delete the master.
        }

        switch (this.itemType) {
        case "single":
            var itemId = itemids.addChildTag("ItemId", "nsTypes", null);
            itemId.setAttribute("Id", this.id);
            itemId.setAttribute("ChangeKey", this.changeKey);

            if (cal.isToDo(this.argument.item)) {
                affectedTaskOccurrences = 'AllOccurrences';
            }
            break;
        case "occurrence":
            var occurrenceItemId = itemids.addChildTag("OccurrenceItemId", "nsTypes", null);
            occurrenceItemId.setAttribute("RecurringMasterId", this.argument.masterID);
            occurrenceItemId.setAttribute("ChangeKey", this.argument.masterChangeKey);
            occurrenceItemId.setAttribute("InstanceIndex", this.itemIndex);

            if (this.argument.whichOccurrence == "single_occurence") {
                affectedTaskOccurrences = 'SpecifiedOccurrenceOnly';
            }
            else {
                affectedTaskOccurrences = 'AllOccurrences';
            }
            break;
        case "master":
            var itemId = itemids.addChildTag("ItemId", "nsTypes", null);
            itemId.setAttribute("Id", this.id);
            itemId.setAttribute("ChangeKey", this.changeKey);

            if (this.argument.whichOccurrence == "single_occurence") {
                affectedTaskOccurrences = 'SpecifiedOccurrenceOnly';
            }
            else {
                affectedTaskOccurrences = 'AllOccurrences';
            }
            break;
        case "meeting":
        case "response":
            var itemId = itemids.addChildTag("ItemId", "nsTypes", null);
            itemId.setAttribute("Id", this.id);
            itemId.setAttribute("ChangeKey", this.changeKey);

            break;
        }

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:DeleteItem DeleteType="HardDelete" xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        if ((this.itemType != "meeting") && (cal.isEvent(this.argument.item))) {
            req.setAttribute("SendMeetingCancellations", sendMeetingCancellations);
        }

        if (affectedTaskOccurrences != "") {
            req.setAttribute("AffectedTaskOccurrences", affectedTaskOccurrences);
        }

        req.addChildTagObject(itemids);
        itemids = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erDeleteItemRequest.execute>"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erDeleteItemRequest.onSendOk>"+String(aResp));

        var rm = aResp.XPath("/s:Envelope/s:Body/m:DeleteItemResponse/m:ResponseMessages/m:DeleteItemResponseMessage/m:ResponseCode");

        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
            return;
        }

        var responseCode = rm[0].value;

        if ((responseCode != "NoError") && (responseCode != "ErrorItemNotFound")) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on deleting item:" + responseCode);
            return;
        }

        if (this.mCbOk) {
            this.mCbOk(this);
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
