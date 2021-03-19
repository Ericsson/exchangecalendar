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

Cu.import("resource://exchangecalendar/erGetMasterOccurrenceId.js");

var EXPORTED_SYMBOLS = ["erGetOccurrenceIndexRequest"];

function erGetOccurrenceIndexRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.masterID = aArgument.masterItem.id;
    this.masterChangeKey = aArgument.masterItem.changeKey;
    //	this.startDate = aArgument.masterItem.getProperty("X-Start");

    this.currentSearchIndex = 1;
    this.currentRealIndex = 0;
    this.idGroupSize = 15; // We will request in pages of 15 occurrences of the list at once

    var self = this;

    this.isRunning = true;
    var tmpObject = new erGetMasterOccurrenceIdRequest({
            user: aArgument.user,
            serverUrl: aArgument.serverUrl,
            item: aArgument.item,
            folderID: aArgument.folderID,
            changeKey: aArgument.changeKey,
            getType: "lightning"
        },
        function (erGetMasterOccurrenceIdRequest, aId, aChangeKey) {
            self.getMasterOk(erGetMasterOccurrenceIdRequest, aId, aChangeKey);
        },
        function (erGetMasterOccurrenceIdRequest, aCode, aMsg) {
            self.onSendError(erGetMasterOccurrenceIdRequest, aCode, aMsg);
        },
        aListener);

    //	this.execute();
}

erGetOccurrenceIndexRequest.prototype = {

    execute: function _execute() {
        exchWebService.commonFunctions.LOG("erGetOccurrenceIndexRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "IdOnly");

        itemShape.addChildTag("AdditionalProperties", "nsTypes", null).addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Start");

        var itemids = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ItemIds xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        for (var x = 0; x < this.idGroupSize; x++) {
            var occurrenceItemId = itemids.addChildTag("OccurrenceItemId", "nsTypes", null);
            occurrenceItemId.setAttribute("RecurringMasterId", this.masterID);
            occurrenceItemId.setAttribute("ChangeKey", this.masterChangeKey);
            occurrenceItemId.setAttribute("InstanceIndex", this.currentSearchIndex++);
        }

        req.addChildTagObject(itemids);
        itemids = null;

        this.parent.xml2jxon = true;

        //		exchWebService.commonFunctions.LOG("erGetOccurrenceIndexRequest.execute:"+String(this.parent.makeSoapMessage(req)));

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //		exchWebService.commonFunctions.LOG("erGetOccurrenceIndexRequest.onSendOk>"+String(aResp));
        var finished = false;
        var found = false;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:GetItemResponse/m:ResponseMessages/m:GetItemResponseMessage");

        for each(var e in rm) {

            var responseCode = e.getTagValue("m:ResponseCode");
            switch (responseCode) {
            case "ErrorCalendarOccurrenceIsDeletedFromRecurrence":
                this.currentRealIndex++;
                break;
            case "NoError":
                var items = e.XPath("/m:Items/*");
                for each(var item in items) {
                    this.currentRealIndex++;
                    if (this.argument.item.id == item.getAttributeByTag("t:ItemId", "Id")) {
                        // We found our occurrence
                        finished = true;
                        found = true;
                        break;
                    }
                }
                items = null;
                break;
            case "ErrorCalendarOccurrenceIndexIsOutOfRecurrenceRange":
                finished = true;
            }

            if ((finished) || (found)) {
                break; // break the loop
            }
        }
        rm = null;

        if (found) {
            // We found our occurrence.
            if (this.mCbOk) {
                this.mCbOk(this, this.currentRealIndex, this.masterID, this.masterChangeKey);
            }
            this.isRunning = false;
        }
        else {
            if (finished) {
                // We hit the end of the occurrence list and did not find our occurrence.
                // Error....
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_GETOCCURRENCEINDEX_NOTFOUND, "Index could not be found for occurrence.");
                return;
            }
            else {
                // We did not find the occurrence but we did not yet hit the end of the
                // occurrence list. Request the next page.
                this.execute();
            }
        }
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },

    getMasterOk: function _getMasterOk(erGetMasterOccurrenceIdRequest, aId, aChangeKey) {
        this.masterID = aId;
        this.masterChangeKey = aChangeKey;

        this.execute();
    },

};
