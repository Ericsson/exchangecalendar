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
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import("resource://calendar/modules/calUtils.jsm");

if (!exchWebService) var exchWebService = {};

function exchChangeCalendarPropertiesReminder(aDocument, aWindow, aArgument) {
    this._document = aDocument;
    this._window = aWindow;
    this._argument = aArgument;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchChangeCalendarPropertiesReminder.prototype = {
    onLoad: function _onLoad() {

        if ((!cal.isEvent(this._argument.item)) && (this._argument.calendar.type == "exchangecalendar")) {
            this._document.getElementById("reminder-relative-box").hidden = true;

            //this._document.getElementById("reminder-relative-radio").checked = false;
            this._document.getElementById("reminder-relative-radio").disabled = true;

            //this._document.getElementById("reminder-absolute-radio").checked = true;
            this._document.getElementById("reminder-absolute-radio").hidden = true;
            this._document.getElementById("reminder-relation-radiogroup").selectedElement = this._document.getElementById("reminder-absolute-radio");
        }

        dump(" WHAT is this:" + this._argument.calendar.type + "\n");

        if ((cal.isEvent(this._argument.item)) && (this._argument.calendar.type == "exchangecalendar")) {
            this._document.getElementById("reminder-relation-origin").hidden = true;
            this._document.getElementById("exchWebService-reminder-relation-origin").hidden = false;
        }

        if (this._argument.calendar.type == "exchangecalendar") {
            this._document.getElementById("reminder-actions-caption").hidden = true;
            this._document.getElementById("reminder-actions-menulist").hidden = true;
        }
    },

    onNewReminder: function _onNewReminder() {
        if ((!cal.isEvent(this._argument.item)) && (this._argument.calendar.type == "exchangecalendar")) {
            let itemType = (isEvent(this._argument.item) ? "event" : "todo");
            let listbox = this._document.getElementById("reminder-listbox");

            let reminder = cal.createAlarm();
            let alarmlen = getPrefSafe("calendar.alarms." + itemType + "alarmlen", 15);

            // Default is an absolute DISPLAY alarm, |alarmlen| minutes before the event.
            // If DISPLAY is not supported by the provider, then pick the provider's
            // first alarm type.
            var absDate = this._document.getElementById("reminder-absolute-date");
            reminder.related = reminder.ALARM_RELATED_ABSOLUTE;
            reminder.alarmDate = cal.jsDateToDateTime(absDate.value,
                this._argument.timezone);
            //reminder.offset = 0;
            if ("DISPLAY" in allowedActionsMap) {
                reminder.action = "DISPLAY";
            }
            else {
                let calendar = this._argument.calendar
                let actions = calendar.getProperty("capabilities.alarms.actionValues") || [];
                reminder.action = actions[0];
            }

            // Set up the listbox
            let listitem = setupListItem(null, reminder, this._argument.item);
            listbox.appendChild(listitem);
            listbox.selectItem(listitem);

            // Since we've added an item, its safe to always enable the button
            enableElement("reminder-remove-button");

            // Set up the enabled state and max reminders
            setupRadioEnabledState();
            setupMaxReminders();
        }
        else {
            if ((this._document.getElementById("reminder-listbox").itemCount == 0) || (this._argument.calendar.type != "exchangecalendar")) {
                onNewReminder();
            }
        }

        if (this._argument.calendar.type == "exchangecalendar") {
            disableElement("reminder-relation-origin");
            disableElement("reminder-new-button");
        }
    },

    onReminderUnitChange: function _onReminderUnitChange(event) {
        updateReminder(event);
        if (this._argument.calendar.type == "exchangecalendar") {
            disableElement("reminder-relation-origin");
            disableElement("reminder-new-button");
        }
    },

    onReminderLengthChange: function _onReminderLengthChange(event) {
        updateReminder(event);
        if (this._argument.calendar.type == "exchangecalendar") {
            disableElement("reminder-relation-origin");
            disableElement("reminder-new-button");
        }
    },
}

var tmpChangeCalendarPropertiesReminder = new exchChangeCalendarPropertiesReminder(document, window, window.arguments[0]);
window.addEventListener("load", function _onLoad() {
    window.removeEventListener("load", arguments.callee, false);
    tmpChangeCalendarPropertiesReminder.onLoad();
}, true);
