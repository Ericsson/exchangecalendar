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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://exchangecommon/ecFunctions.js");

if (!exchWebService) var exchWebService = {};

exchWebService.preInvitationResponse = {

    onAccept: function _onAccept() {
        window.arguments[0].answer = "send";
        window.arguments[0].response = document.getElementById("exchWebService_preInvitationResponse_radio").value;
        return true;
    },

    onLoad: function _onLoad() {
        var item = window.arguments[0].item;

        document.getElementById("exchWebService_calendarName").value = item.calendar.name;
        document.getElementById("exchWebService_itemTitle").value = item.title;

        let dtFormat = Cc["@mozilla.org/calendar/datetime-formatter;1"]
            .getService(Ci.calIDateTimeFormatter);

        let tzService = Cc["@mozilla.org/calendar/timezone-service;1"]
            .getService(Ci.calITimezoneService);

        let displayDate = item.startDate.getInTimezone(tzService.defaultTimezone);
        document.getElementById("exchWebService_itemStart").value = dtFormat.formatDate(displayDate) + " " + dtFormat.formatTime(displayDate);

        document.getElementById("exchWebService_itemResponse").value = window.arguments[0].response;

        if (item.organizer) {
            document.getElementById("exchWebService_meetingOrganiser").value = item.organizer.commonName + " (" + item.organizer.id.replace(/^mailto:/i, '') + ")";
        }
        else {
            // Should never happen.
            document.getElementById("exchWebService_meetingOrganiser").value = "(unknown)";
        }

    },

}
