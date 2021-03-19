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
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

//Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://calendar/modules/calUtils.jsm");

//if (! exchWebService) var exchWebService = {};

function exchTaskDelegation(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchTaskDelegation.prototype = {

    //exchWebService.taskDelegation = {

    _initialized: false,

    onLoad: function _onLoad() {
        if (this._initialized) return;

        if (this._document.getElementById("calendar-task-tree")) {
            this._initialized = true;
            // nuke the onload, or we get called every time there's
            // any load that occurs
            //this._document.removeEventListener("load", exchWebService.taskDelegation.onLoad, false);
            var self = this;
            this._document.getElementById("calendar-task-tree").addEventListener("select", function () {
                self.onSelect();
            }, true);
        }
    },

    onSelect: function _onSelect() {
        var task = this._document.getElementById("calendar-task-tree").currentTask;
        if (task) {
            if (task.hasProperty("exchWebService-Owner")) {
                this._document.getElementById("exchWebService-task-delegation-owner-label").value = task.getProperty("exchWebService-Owner") + "|" + task.getProperty("exchWebService-PidLidTaskAccepted") + "|" + task.getProperty("exchWebService-PidLidTaskAcceptanceState") + "|" + task.getProperty("exchWebService-PidLidTaskHistory") + "|";
                this._document.getElementById("exchWebService-task-delegation-owner").hidden = false;

                // Hide the buttons if we are the Owner.
                if (task.getProperty("exchWebService-PidLidTaskAcceptanceState") != "NoMatch") {
                    this._document.getElementById("exchWebService-task-delegation-accept-button").hidden = true;
                    this._document.getElementById("exchWebService-task-delegation-decline-button").hidden = true;
                    this._document.getElementById("exchWebService-task-delegation-toolbar").hidden = true;
                }
                else {
                    this._document.getElementById("exchWebService-task-delegation-toolbar").hidden = false;
                    if (task.getProperty("exchWebService-PidLidTaskHistory") == 5) {
                        this._document.getElementById("exchWebService-task-delegation-accept-button").hidden = false;
                        this._document.getElementById("exchWebService-task-delegation-decline-button").hidden = false;
                        this._document.getElementById("exchWebService-task-delegation-toolbar").setAttribute("defaultset", "exchWebService-task-delegation-accept-button, exchWebService-task-delegation-decline-button");
                    }
                    else {
                        this._document.getElementById("exchWebService-task-delegation-accept-button").hidden = true;
                        this._document.getElementById("exchWebService-task-delegation-toolbar").setAttribute("defaultset", "exchWebService-task-delegation-decline-button");
                    }
                }
                this._document.getElementById("exchWebService-task-delegation-toolbar").hidden = true; // Temporary until we get it fixed.
                this._document.getElementById("exchWebService-task-delegation-toolbar").setAttribute("defaultset", ""); // Temporary until we get it fixed.
            }
            else {
                this._document.getElementById("exchWebService-task-delegation-owner").hidden = true;
            }

            if (task.hasProperty("exchWebService-Delegator")) {
                this._document.getElementById("exchWebService-task-delegation-delegator-label").value = task.getProperty("exchWebService-Delegator");
                this._document.getElementById("exchWebService-task-delegation-delegator").hidden = false;
            }
            else {
                this._document.getElementById("exchWebService-task-delegation-delegator").hidden = true;
            }

            if (task.hasProperty("exchWebService-PidLidTaskLastUpdate")) {
                let dtFormat = Cc["@mozilla.org/calendar/datetime-formatter;1"]
                    .getService(Ci.calIDateTimeFormatter);

                var tmpDate = cal.fromRFC3339(task.getProperty("exchWebService-PidLidTaskLastUpdate"), this.globalFunctions.ecTZService().UTC).getInTimezone(this.globalFunctions.ecDefaultTimeZone());

                var lastChange = task.getProperty("exchWebService-PidLidTaskHistory");
                switch (lastChange) {
                case "4":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.duedate.changed", [], "exchangecommon");
                    break;
                case "3":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.some.property.changed", [], "exchangecommon");
                    break;
                case "1":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.accepted", [task.getProperty("exchWebService-Owner")], "exchangecommon");
                    break;
                case "2":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.rejected", [task.getProperty("exchWebService-Owner")], "exchangecommon");
                    break;
                case "5":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.assigned", [task.getProperty("exchWebService-Owner")], "exchangecommon");
                    break;
                case "0":
                    lastChange = this.globalFunctions.getString("calExchangeCalendar", "exchWebService.PidLidTaskHistory.no.changes", [], "exchangecommon");
                    break;
                }

                this._document.getElementById("exchWebService-task-delegation-lastUpdateDate-label").value = dtFormat.formatDateTime(tmpDate) + " " + lastChange;
                this._document.getElementById("exchWebService-task-delegation-lastUpdateDate").hidden = false;
            }
            else {
                this._document.getElementById("exchWebService-task-delegation-lastUpdateDate").hidden = true;
            }
        }
    },

    onAccept: function _onAccept() {
        this.globalFunctions.LOG("onAccept");
        var task = this._document.getElementById("calendar-task-tree").currentTask;
        if (task) {
            var newTask = task.clone();
            newTask.setProperty("exchWebService-PidLidTaskLastUpdate", cal.toRFC3339(cal.now()));
            newTask.setProperty("exchWebService-PidLidTaskHistory", "1")
            newTask.setProperty("exchWebService-PidLidTaskAccepted", "true")
            task.calendar.modifyItem(newTask, task, null);
        }
    },

    onReject: function _onReject() {
        this.globalFunctions.LOG("onReject");
        var task = this._document.getElementById("calendar-task-tree").currentTask;
        if (task) {
            var newTask = task.clone();
            newTask.setProperty("exchWebService-PidLidTaskLastUpdate", cal.toRFC3339(cal.now()));
            newTask.setProperty("exchWebService-PidLidTaskHistory", "2")
            newTask.setProperty("exchWebService-PidLidTaskAccepted", "true")
            task.calendar.modifyItem(newTask, task, null);
        }
    },

}

//this._document.addEventListener("load", exchWebService.taskDelegation.onLoad, true);

var tmpTaskDelegation = new exchTaskDelegation(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpTaskDelegation.onLoad();
}, true);
