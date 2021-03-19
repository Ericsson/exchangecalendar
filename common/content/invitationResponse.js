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

var exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
    .getService(Ci.mivExchangeStatistics);

exchWebService.invitationResponse = {

    onAccept: function _onAccept() {
        window.arguments[0].answer = "send";
        window.arguments[0].bodyText = document.getElementById("exchWebService_messageReponseBody").value;
        window.arguments[0].response = document.getElementById("exchWebService_itemResponse").value;

        var pStart = this.formatDate(document.getElementById("exchWebService_propose_start").value);
        var pEnd = this.formatDate(document.getElementById("exchWebService_propose_end").value);


        window.arguments[0].proposeStart = pStart;
        window.arguments[0].proposeEnd = pEnd;

        return true;
    },

    formatDate: function _formatDate(date) {
        var year = date.getFullYear(),
            month = date.getMonth() + 1, // months are zero indexed
            day = date.getDate(),
            hour = date.getHours(),
            minute = date.getMinutes(),
            second = date.getSeconds(),
            dayFormatted = day < 10 ? "0" + day : day,
            monthFormatted = month < 10 ? "0" + month : month,
            hourFormatted = hour < 10 ? "0" + hour : hour,
            minuteFormatted = minute < 10 ? "0" + minute : minute,
            secondFormatted = second < 10 ? "0" + second : second,
            morning = hour < 12 ? "am" : "pm";

        return year + "-" + monthFormatted + "-" + dayFormatted + "T" + hourFormatted + ":"
            + minuteFormatted + ":" + secondFormatted + "Z";
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

        document.getElementById("exchWebService_messageReponseBody").placeholder = window.arguments[0].response;

        var serverUrl = window.arguments[0].serverUrl;
        if (exchangeStatistics.getServerVersion(serverUrl).indexOf("Exchange2013") > -1) {
            document.getElementById("exchWebService_propose_time_checkbox").setAttribute("disabled", "false");
        }
        else {
            document.getElementById("exchWebService_propose_time_checkbox").setAttribute("disabled", "true");
        }
    },

    doResponseChanged: function _doResponseChanged(aMenuList) {
        document.getElementById("exchWebService_messageReponseBody").placeholder = aMenuList.value;
    },

    onCheckChanged: function _onCheckChanged(aCheckbox) {
        if (aCheckbox.checked == true) {
            document.getElementById("exchWebService_propose_end_label").setAttribute("disabled", "false");
            document.getElementById("exchWebService_propose_start_label").setAttribute("disabled", "false");
            document.getElementById("exchWebService_propose_start").setAttribute("disabled", "false");
            document.getElementById("exchWebService_propose_end").setAttribute("disabled", "false");
        }
        else {
            document.getElementById("exchWebService_propose_end_label").setAttribute("disabled", "true");
            document.getElementById("exchWebService_propose_start_label").setAttribute("disabled", "true");
            document.getElementById("exchWebService_propose_start").setAttribute("disabled", "true");
            document.getElementById("exchWebService_propose_end").setAttribute("disabled", "true");
        }
    },

}
