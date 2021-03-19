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
 * Contributor: Krzysztof Nowicki (krissn@op.pl)
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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erFindMasterOccurrencesRequest"];

const MAPI_PidLidTaskAccepted = "33032";
const MAPI_PidLidTaskLastUpdate = "33045";
const MAPI_PidLidTaskHistory = "33050";
const MAPI_PidLidTaskOwnership = "33065";
const MAPI_PidLidTaskMode = "34072";
const MAPI_PidLidTaskGlobalId = "34073";
const MAPI_PidLidTaskAcceptanceState = "33066";
const MAPI_PidLidReminderSignalTime = "34144";
const MAPI_PidLidReminderSet = "34051";
const MAPI_PidLidReminderDelta = "34049";

function erFindMasterOccurrencesRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.occurrences = aArgument.occurrences;

    this.folderClass = aArgument.folderClass;

    this.isRunning = true;
    this.execute();
}

erFindMasterOccurrencesRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erFindMasterOccurrencesRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "IdOnly");

        itemShape.addChildTag("BodyType", "nsTypes", "Text");

        var additionalProperties = itemShape.addChildTag("AdditionalProperties", "nsTypes", null);
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ItemId");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ParentFolderId");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ItemClass");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Attachments");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Subject");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:DateTimeReceived");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Size");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Categories");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:HasAttachments");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Importance");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:IsDraft");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:IsFromMe");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:IsResend");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:IsSubmitted");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:IsUnmodified");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:DateTimeSent");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:DateTimeCreated");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Body");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ResponseObjects");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Sensitivity");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ReminderDueBy");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ReminderIsSet");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ReminderMinutesBeforeStart");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:EffectiveRights");

        this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
            .getService(Ci.mivExchangeStatistics);

        if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2010") > -1) || (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2013") > -1)) {
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:UniqueBody");
        }
        else { // Exchange2007
        }

        var extFieldURI;
        extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extFieldURI.setAttribute("DistinguishedPropertySetId", "Common");
        extFieldURI.setAttribute("PropertyId", MAPI_PidLidReminderSignalTime);
        extFieldURI.setAttribute("PropertyType", "SystemTime");
        extFieldURI = null;

        extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extFieldURI.setAttribute("DistinguishedPropertySetId", "Common");
        extFieldURI.setAttribute("PropertyId", MAPI_PidLidReminderSet);
        extFieldURI.setAttribute("PropertyType", "Boolean");
        extFieldURI = null;

        extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extFieldURI.setAttribute("DistinguishedPropertySetId", "Common");
        extFieldURI.setAttribute("PropertyId", MAPI_PidLidReminderDelta);
        extFieldURI.setAttribute("PropertyType", "Integer");
        extFieldURI = null;

        // Calendar fields
        switch (this.folderClass) {
        case "IPF.Appointment":

            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Start");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:End");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:OriginalStart");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsAllDayEvent");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:LegacyFreeBusyStatus");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Location");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:When");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsMeeting");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsCancelled");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsRecurring");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:MeetingRequestWasSent");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsResponseRequested");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:CalendarItemType");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:MyResponseType");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Organizer");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:RequiredAttendees");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:OptionalAttendees");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Resources");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Duration");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:TimeZone");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:Recurrence");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:ConferenceType");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:AllowNewTimeProposal");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:IsOnlineMeeting");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:MeetingWorkspaceUrl");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:UID");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:RecurrenceId");

            if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2010") > -1) || (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2013") > -1)) {
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:StartTimeZone");
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:EndTimeZone");
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:ModifiedOccurrences");
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:DeletedOccurrences");
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:FirstOccurrence");
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:FirstOccurrence");

            }
            else { // Exchange2007
                additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "calendar:MeetingTimeZone");
            }
            break;

        case "IPF.Task":
            //Task fields
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:ActualWork");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:AssignedTime");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:BillingInformation");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:ChangeCount");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Companies");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:CompleteDate");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Contacts");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:DelegationState");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Delegator");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:DueDate");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:IsAssignmentEditable");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:IsComplete");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:IsRecurring");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:IsTeamTask");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Mileage");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Owner");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:PercentComplete");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Recurrence");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:StartDate");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:Status");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:StatusDescription");
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "task:TotalWork");

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskAccepted);
            extFieldURI.setAttribute("PropertyType", "Boolean");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskLastUpdate);
            extFieldURI.setAttribute("PropertyType", "SystemTime");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskAcceptanceState);
            extFieldURI.setAttribute("PropertyType", "Integer");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskMode);
            extFieldURI.setAttribute("PropertyType", "Integer");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskGlobalId);
            extFieldURI.setAttribute("PropertyType", "Binary");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskHistory);
            extFieldURI.setAttribute("PropertyType", "Integer");
            extFieldURI = null;

            extFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
            extFieldURI.setAttribute("DistinguishedPropertySetId", "Task");
            extFieldURI.setAttribute("PropertyId", MAPI_PidLidTaskOwnership);
            extFieldURI.setAttribute("PropertyType", "Integer");
            extFieldURI = null;

        }
        /*
        			//meeting fields
        			req.nsMessages::ItemShape.nsTypes::AdditionalProperties.content += <>
        				<nsTypes:FieldURI FieldURI="meeting:AssociatedCalendarItemId" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meeting:IsDelegated" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meeting:IsOutOfDate" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meeting:HasBeenProcessed" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meeting:ResponseType" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meetingRequest:MeetingRequestType" xmlns:nsTypes={nsTypes}/>
        				<nsTypes:FieldURI FieldURI="meetingRequest:IntendedFreeBusyStatus" xmlns:nsTypes={nsTypes}/>
        				</>;
        */

        itemids = req.addChildTag("ItemIds", "nsMessages", null);

        for each(var master in this.occurrences) {
            var reccMasterItemId = itemids.addChildTag("RecurringMasterItemId", "nsTypes", null);
            reccMasterItemId.setAttribute("OccurrenceId", master.Id);
            reccMasterItemId.setAttribute("ChangeKey", master.ChangeKey);
            reccMasterItemId = null;
        }
        itemids = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erFindMasterOccurrencesRequest.execute:"+String(this.parent.makeSoapMessage(req)));

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
        additionalProperties = null;
        itemShape = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erFindMasterOccurrencesRequest.onSendOk>"+String(aResp)+"\n");

        var rm = aResp.XPath("/s:Envelope/s:Body/m:GetItemResponse/m:ResponseMessages/m:GetItemResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        var items = [];

        for each(var e in rm) {
            var calendarItem = e.XPath("/m:Items/t:CalendarItem");
            if (calendarItem.length > 0) {
                items.push(calendarItem[0]);
            }
            calendarItem = null;
        }
        rm = null;

        if (this.mCbOk) {
            this.mCbOk(this, items);
        }
        items = null;
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
