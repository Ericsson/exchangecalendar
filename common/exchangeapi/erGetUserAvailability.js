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

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erGetUserAvailabilityRequest"];

function erGetUserAvailabilityRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.email = aArgument.email;
    this.attendeeType = aArgument.attendeeType;
    this.start = aArgument.start;
    this.end = aArgument.end;

    this.isRunning = true;
    this.execute();
}

erGetUserAvailabilityRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.execute\n");

        var root = xml2json.newJSON();
        xml2json.parseXML(root, '<nsMessages:GetUserAvailabilityRequest xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var req = root[telements][0];

        /* WTF really?  Just give me UTC. */
        var timeZone = xml2json.addTag(req, "TimeZone", "nsTypes", null);
        xml2json.addTag(timeZone, "Bias", "nsTypes", "0");
        var standardTime = xml2json.addTag(timeZone, "StandardTime", "nsTypes", null);
        xml2json.addTag(standardTime, "Bias", "nsTypes", "0");
        xml2json.addTag(standardTime, "Time", "nsTypes", "00:00:00");
        xml2json.addTag(standardTime, "DayOrder", "nsTypes", "1");
        xml2json.addTag(standardTime, "Month", "nsTypes", "0");
        xml2json.addTag(standardTime, "DayOfWeek", "nsTypes", "Sunday");

        var daylightTime = xml2json.addTag(timeZone, "DaylightTime", "nsTypes", null);
        xml2json.addTag(daylightTime, "Bias", "nsTypes", "0");
        xml2json.addTag(daylightTime, "Time", "nsTypes", "00:00:00");
        xml2json.addTag(daylightTime, "DayOrder", "nsTypes", "1");
        xml2json.addTag(daylightTime, "Month", "nsTypes", "0");
        xml2json.addTag(daylightTime, "DayOfWeek", "nsTypes", "Sunday");

        var mailboxDataArray = xml2json.addTag(req, "MailboxDataArray", "nsMessages", null);
        var mailboxData = xml2json.addTag(mailboxDataArray, "MailboxData", "nsTypes", null);
        var email = xml2json.addTag(mailboxData, "Email", "nsTypes", null);
        xml2json.addTag(email, "Address", "nsTypes", this.email);
        xml2json.addTag(mailboxData, "AttendeeType", "nsTypes", this.attendeeType);

        var freeBusyViewOptions = xml2json.addTag(req, "FreeBusyViewOptions", "nsTypes", null);
        var timeWindow = xml2json.addTag(freeBusyViewOptions, "TimeWindow", "nsTypes", null);
        xml2json.addTag(timeWindow, "StartTime", "nsTypes", this.start);
        xml2json.addTag(timeWindow, "EndTime", "nsTypes", this.end);

        xml2json.addTag(freeBusyViewOptions, "MergedFreeBusyIntervalInMinutes", "nsTypes", "15");

        xml2json.addTag(freeBusyViewOptions, "RequestedView", "nsTypes", "DetailedMerged");

        this.parent.xml2json = true;

        //exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.execute: "+String(this.parent.makeSoapMessage(req))+"\n");
        this.parent.sendRequest(this.parent.makeSoapMessage2(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.onSendOk: "+String(aResp)+"\n");

        var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/GetUserAvailabilityResponse/FreeBusyResponseArray/FreeBusyResponse/ResponseMessage[@ResponseClass='Success' and ResponseCode='NoError']");

        if (rm.length == 0) {
            rm = null;
            var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/GetUserAvailabilityResponse/FreeBusyResponseArray/FreeBusyResponse/ResponseMessage[@ResponseClass='Error']");
            if (rm.length == 0) {
                //Check if we only have a /s:Envelope/s:Body/GetUserAvailabilityResponse
                var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/GetUserAvailabilityResponse");
                if (rm.length == 0) {
                    exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.onSendOk: Respons does not contain expected field");
                    this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
                    rm = null;
                    this.isRunning = false;
                    return;
                }
            }
            else {
                var responseCode = xml2json.getTagValue(rm[0], "m:ResponseCode", "");
                var messageText = xml2json.getTagValue(rm[0], "m:MessageText", "");
                if (responseCode.indexOf("ErrorMailRecipientNotFound") > -1) {
                    exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.onSendOk: " + messageText);
                }
                else {
                    exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.onSendOk: " + messageText);
                    this.onSendError(aExchangeRequest, this.parent.ER_ERROR_NOACCESSTOFREEBUSY, messageText);
                    rm = null;
                    this.isRunning = false;
                    return;
                }
            }
        }
        rm = null;

        var items = xml2json.XPath(aResp, "/s:Envelope/s:Body/GetUserAvailabilityResponse/FreeBusyResponseArray/FreeBusyResponse/FreeBusyView/CalendarEventArray/CalendarEvent");

        // We also need to get the working hour period. But lightning cannot handle this.
        //dump("erGetUserAvailabilityRequest.onSendOk 2: We have '"+items.length+"' items.\n");

        if (this.mCbOk) {
            this.mCbOk(this, items);
        }
        this.isRunning = false;
        items = null;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        //exchWebService.commonFunctions.LOG("erGetUserAvailabilityRequest.onSendError: "+aCode+", "+aMsg+"\n");
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
