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
var Cr = Components.results;
var components = Components;

function exchCalPopUpMenu(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchCalPopUpMenu.prototype = {

    editExchangeSettings: function _editExchangeSettings() {
        var myCal = getSelectedCalendar();
        var aResult = "";
        if (myCal) {
            var aResult = {
                calendar: myCal,
                answer: ""
            };
            this._window.openDialog("chrome://exchangecommon/content/exchangeSettings.xul",
                "exchangeSettings",
                "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=no",
                aResult);
        }
    },

    editOofSettings: function _editOofSettings() {
        var myCal = getSelectedCalendar();
        var aResult = "";
        if (myCal) {
            var aResult = {
                calendar: myCal,
                answer: ""
            };
            this._window.openDialog("chrome://exchangecommon/content/oofSettings.xul",
                "oofSettings",
                "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
                aResult);
        }
    },

    checkForExchangeCalendar: function _checkForExchangeCalendar() {
        var myCal = getSelectedCalendar();
        if (myCal) {
            if (myCal.type == "exchangecalendar") {
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").disabled = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").disabled = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").disabled = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").hidden = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").hidden = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").hidden = false;
                myCal.getProperty("exchWebService.checkFolderPath");
            }
            else if (myCal.type == "exchange") {
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").disabled = false;
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").hidden = false;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").hidden = true;
            }
            else {
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").disabled = true;
                this._document.getElementById("exchWebService-list-calendars-context-convertFromOldAddOn").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-edit").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-oof-settings").hidden = true;
                this._document.getElementById("exchWebService-list-calendars-context-exchange-clone-settings").hidden = true;
            }
        }
    },

    convertSettings: function _convertSettings() {
        var myCal = getSelectedCalendar();
        var uuid = myCal.id;

        var currentPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry." + uuid + ".");

        // Get the name of the calendar. Is for in the prompt.
        var calName = this.globalFunctions.safeGetCharPref(currentPrefs, "name", "");

        var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

        // Get mail address from imip identity key
        var identity = this.globalFunctions.safeGetCharPref(currentPrefs, "imip.identity.key", "");
        if (identity != "") {
            var exchWebServicesIdentityprefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("mail.identity." + identity + ".");

            var mailbox = {
                value: exchWebServicesIdentityprefs.getCharPref("useremail")
            };
        }
        else {
            var mailbox = {
                value: "someone@somewhere.com"
            };
        }

        if (prompts.prompt(null, "Convert Calendar", "Do you want to convert this calendar '" + calName + "' to the new Exchange 2007/2010 Calendar and Tasks add-on? If YES please enter the primarySMTP emailaddress:", mailbox, "", {})) {

            // We have a entry for the old Exchange Provider.

            // We need to get the uri
            var uri = this.globalFunctions.safeGetCharPref(currentPrefs, "uri", "");
            if (uri != "") {
                // We have a uri. Check for domainname and username.
                var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
                var tmpURI = ioService.newURI(decodeURIComponent(uri), null, null);
                var username = decodeURIComponent(tmpURI.username);
                if (username.indexOf("\\") > -1) {
                    var domainname = username.substr(0, username.indexOf("\\"));
                    username = username.substr(username.indexOf("\\") + 1);
                }
                this.globalFunctions.LOG("username:" + username);
                this.globalFunctions.LOG("domainname:" + domainname);
                this.globalFunctions.LOG("url:" + tmpURI.scheme + "://" + tmpURI.hostPort + tmpURI.path);

                var newPrefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + uuid + ".");
                newPrefs.setCharPref("ecChangeKey", "");
                newPrefs.setCharPref("ecDisplayname", "");
                if (domainname) {
                    newPrefs.setCharPref("ecDomain", domainname);
                }
                else {
                    newPrefs.setCharPref("ecDomain", "");
                }
                newPrefs.setCharPref("ecFolderID", "");
                newPrefs.setCharPref("ecFolderbase", "calendar");
                newPrefs.setCharPref("ecFolderpath", "/");
                newPrefs.setCharPref("ecMailbox", mailbox.value); // We have to ask this in a prompt
                newPrefs.setCharPref("ecServer", tmpURI.scheme + "://" + tmpURI.hostPort + tmpURI.path);
                newPrefs.setCharPref("ecUser", username);

                currentPrefs.setCharPref("type", "exchangecalendar");
                currentPrefs.setCharPref("refreshInterval", "1");

                Application.restart();
            }
            else {
                this.globalFunctions.LOG(calName + ": Wrong empty uri.");
            }
        }
        else {
            this.globalFunctions.LOG("migrateFromOldExchangeProvider: Calendar '" + calName + "' is skipped.");
        }
    },

    cloneSettings: function _cloneSettings() {
        var myCal = getSelectedCalendar();
        var aResult = "";
        if (myCal) {
            var aResult = {
                calendar: myCal,
                answer: ""
            };
            this._window.openDialog("chrome://exchangecommon/content/exchangeCloneSettings.xul",
                "exchangeCloneSettings",
                "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=no",
                aResult);

            if (aResult.answer == "saved") {
                // Tell the Calendar Manager we have a new calendar.
                this.globalFunctions.addCalendarById(aResult.newCalId);
            }
        }
    },

    delegateCalendarSettings: function _delegateCalendarSettings() {
        var myCal = getSelectedCalendar();
        var aResult = "";
        if (myCal) {
            var aResult = {
                calendar: myCal,
                answer: ""
            };
            this._window.openDialog("chrome://exchangecalendar/content/delegateCalendar.xul",
                "delegateCalendarSettings",
                "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=no",
                aResult);
        }
    },

    onLoad: function _onLoad() {
        //this._document.getElementById("calendar-list-tree-widget").setAttribute("type", "exchange");
    },

    tooltipShowing: function _tooltipShowing(aEvent) {
        let tree = document.getElementById("calendar-list-tree-widget");
        let calendar = tree.getCalendarFromEvent(aEvent);
        let tooltipText = false;
        if ((calendar) && (calendar.type == "exchangecalendar")) {
            let exchangeCurrentStatus = calendar.getProperty("exchangeCurrentStatus");
            if ((!Components.isSuccessCode(exchangeCurrentStatus)) || (calendar.getProperty("disabled"))) {
                if (calendar.readOnly) {
                    tooltipText = this.globalFunctions.getString("calExchangeCalendar", "tooltipCalendarDisconnectedReadOnly", [calendar.name, calendar.connectionStateDescription], "exchangecommon");
                }
                else {
                    tooltipText = this.globalFunctions.getString("calExchangeCalendar", "tooltipCalendarDisconnected", [calendar.name, calendar.connectionStateDescription], "exchangecommon");
                }
            }
            else {
                if (calendar.readOnly) {
                    tooltipText = this.globalFunctions.getString("calExchangeCalendar", "tooltipCalendarConnectedReadOnly", [calendar.name], "exchangecommon");
                }
                else {
                    tooltipText = this.globalFunctions.getString("calExchangeCalendar", "tooltipCalendarConnected", [calendar.name], "exchangecommon");
                }
            }
            setElementValue("calendar-list-tooltip", tooltipText, "label");
        }
        if (tooltipText) {
            return (tooltipText != false);
        }
        return calendarListTooltipShowing(aEvent);
    },

}

var tmpCalPopUpMenu = new exchCalPopUpMenu(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpCalPopUpMenu.onLoad();
}, true);
