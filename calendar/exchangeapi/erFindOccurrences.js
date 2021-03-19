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

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erFindOccurrencesRequest"];

function erFindOccurrencesRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.masterID = aArgument.masterItem.Id;
    this.masterChangeKey = aArgument.masterItem.ChangeKey;
    this.startDate = aArgument.startDate;
    this.endDate = aArgument.endDate;

    try {
        if (!this.startDate) {
            var monthBeforeDuration = cal.createDuration("-P4W");

            this.startDate = cal.now();
            this.startDate.addDuration(monthBeforeDuration);
        }
        dump("  -------------->>> erFindOccurrences: this.startDate=" + this.startDate + "\n");
        if (!this.endDate) {
            var monthAfterDuration = cal.createDuration("P4W");

            this.endDate = cal.now();
            this.endDate.addDuration(monthAfterDuration);
        }
        dump("  -------------->>> erFindOccurrences: this.endDate=" + this.endDate + "\n");
    }
    catch (err) {
        dump(" ERROR: erFindOccurrences: err:" + err + "\n");
    }

    this.currentSearchIndex = 1;
    this.currentRealIndex = 0;
    this.idGroupSize = 25; // We will request in pages of 50 occurrences of the list at once
    this.items = [];

    var self = this;

    this.isRunning = true;

    if (aArgument.masterItem.type == "RecurringMaster") {
        //exchWebService.commonFunctions.LOG("We have a master. Find occurences\n");
        this.execute();
    }
    else {
        //exchWebService.commonFunctions.LOG("We have a child. First try to find master.\n");
        var tmpObject = new erGetMasterOccurrenceIdRequest({
                user: aArgument.user,
                serverUrl: aArgument.serverUrl,
                item: aArgument.masterItem,
                folderID: aArgument.folderID,
                changeKey: aArgument.changeKey,
                getType: "exchange"
            },
            function (erGetMasterOccurrenceIdRequest, aId, aChangeKey) {
                self.getMasterOk(erGetMasterOccurrenceIdRequest, aId, aChangeKey);
            },
            function (erGetMasterOccurrenceIdRequest, aCode, aMsg) {
                self.onSendError(erGetMasterOccurrenceIdRequest, aCode, aMsg);
            },
            aListener);
    }

    //	this.execute();
}

erFindOccurrencesRequest.prototype = {

    execute: function _execute() {
        //var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetItem xmlns:nsMessages="'+nsMessagesStr+'" xmlns:nsTypes="'+nsTypesStr+'"/>');
        var root = xml2json.newJSON();
        xml2json.parseXML(root, '<nsMessages:GetItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var req = root[telements][0];

        //var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        //itemShape.addChildTag("BaseShape", "nsTypes", "IdOnly"); 

        var itemShape = xml2json.addTag(req, "ItemShape", "nsMessages", null);
        xml2json.addTag(itemShape, "BaseShape", "nsTypes", "IdOnly");

        var additionalProperties = xml2json.addTag(itemShape, "AdditionalProperties", "nsTypes", null);
        let fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        xml2json.setAttribute(fieldURI, "FieldURI", "calendar:UID");
        fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        fieldURI = xml2json.setAttribute(fieldURI, "FieldURI", "calendar:CalendarItemType");
        fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        fieldURI = xml2json.setAttribute(fieldURI, "FieldURI", "calendar:Start");
        fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        fieldURI = xml2json.setAttribute(fieldURI, "FieldURI", "calendar:End");
        fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        fieldURI = xml2json.setAttribute(fieldURI, "FieldURI", "item:ItemClass");

        var itemids = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ItemIds xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var itemids = xml2json.addTag(req, "ItemIds", "nsMessages", null);
        for (var x = 0; x < this.idGroupSize; x++) {
            var occurrenceItemID = xml2json.addTag(itemids, "OccurrenceItemId", "nsTypes", null);
            xml2json.setAttribute(occurrenceItemID, "RecurringMasterId", this.masterID);
            xml2json.setAttribute(occurrenceItemID, "ChangeKey", this.masterChangeKey);
            xml2json.setAttribute(occurrenceItemID, "InstanceIndex", this.currentSearchIndex++);
            occurrenceItemID = null;
        }

        itemids = null;

        this.parent.xml2json = true;

        //dump("erFindOccurrencesRequest.execute>"+String(this.parent.makeSoapMessage(req))+"\n");
        this.parent.sendRequest(this.parent.makeSoapMessage2(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //dump("erFindOccurrencesRequest.onSendOk>"+xml2json.toString(aResp)+"\n");
        var finished = false;
        var found = false;

        //var rm = aResp.XPath("/s:Envelope/s:Body/m:GetItemResponse/m:ResponseMessages/m:GetItemResponseMessage");
        var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:GetItemResponse/m:ResponseMessages/m:GetItemResponseMessage");
        for each(var e in rm) {
            var responseCode = xml2json.getTagValue(e, "m:ResponseCode");
            switch (responseCode) {
            case "ErrorCalendarOccurrenceIsDeletedFromRecurrence":
                this.currentRealIndex++;
                break;
            case "NoError":
                var tmpItems = xml2json.XPath(e, "/m:Items/*");
                for each(var tmpItem in tmpItems) {
                    this.currentRealIndex++;
                    var startDate = cal.fromRFC3339(xml2json.getTagValue(tmpItem, "t:Start"), cal.UTC()).getInTimezone(cal.UTC());
                    var endDate = cal.fromRFC3339(xml2json.getTagValue(tmpItem, "t:End"), cal.UTC()).getInTimezone(cal.UTC());
                    if ((this.startDate.compare(endDate) < 1)
                        && (this.endDate.compare(startDate) > -1)) {
                        // We found our occurrence
                        this.items.push({
                            Id: xml2json.getAttributeByTag(tmpItem, "t:ItemId", "Id"),
                            ChangeKey: xml2json.getAttributeByTag(tmpItem, "t:ItemId", "ChangeKey"),
                            type: xml2json.getTagValue(tmpItem, "t:CalendarItemType"),
                            uid: xml2json.getTagValue(tmpItem, "t:UID"),
                            start: xml2json.getTagValue(tmpItem, "t:Start"),
                            end: xml2json.getTagValue(tmpItem, "t:End"),
                            index: this.currentRealIndex
                        });
                    }

                    // When we see occurrences past our endDate range stop.
                    if (startDate.compare(this.endDate) == 1) {
                        finished = true;
                        break;
                    }
                }
                tmpItems = null;
                break;
            case "ErrorItemNotFound":
            case "ErrorCalendarOccurrenceIndexIsOutOfRecurrenceRange":
                finished = true;
                break;
            case "ErrorInvalidIdMalformed":
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_FINDOCCURRENCES_INVALIDIDMALFORMED, responseCode);
                return;
            default:
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_FINDOCCURRENCES_UNKNOWN, responseCode);
                return;
            }

            if ((finished) || (found)) {
                break; // break the loop
            }
        }
        rm = null;

        // This is so we do not get in an infinite loop
        if (this.currentSearchIndex > 20000) {
            finished = true;
        }

        if (finished) {
            // We found our occurrence.
            if (this.mCbOk) {
                this.mCbOk(this, this.items);
            }
            this.isRunning = false;
        }
        else {
            // We did not find the occurrence but we did not yet hit the end of the
            // occurrence list. Request the next page.
            if (this.mCbOk) {
                this.mCbOk(this, this.items);
            }
            this.items = [];
            this.execute();
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
