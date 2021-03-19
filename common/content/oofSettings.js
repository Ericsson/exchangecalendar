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


Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://exchangecommon/erGetUserOofSettings.js");
Cu.import("resource://exchangecommon/erSetUserOofSettings.js");

//Cu.import("resource://exchangecommon/ecFunctions.js");

//if (! exchWebService) var exchWebService = {};

/*if (! this.cal) {
	Cu.import("resource://calendar/modules/calUtils.jsm", exchWebService);
}
*/

function exchOOFSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchOOFSettings.prototype = {

    //exchWebService.oofSettings = {

    calPrefs: null,
    intOofSettings: {},

    onLoad: function _onLoad() {
        Cu.import("resource://calendar/modules/calUtils.jsm", this);
        var calId = this._window.arguments[0].calendar.id;

        this.calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");
        this._document.getElementById("exchWebService-oofSettings-title").value = this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox", "null");
        this.getOofSettings();

        this.internalEditorElement = this._document.getElementById("exchWebService-oof-editor-internal");
        this.externalEditorElement = this._document.getElementById("exchWebService-oof-editor-external");
    },

    onSave: function _onSave() {
        this.setOofSettings();

        Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService).savePrefFile(null);
        return false;
    },

    getOofSettings: function _getOofSettings() {
        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecLoadingOofSettings", [], "exchangecommon");

        var self = this;
        var tmpObject = new erGetUserOofSettingsRequest({
                user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain", "null") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser", "null"),
                mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox", "null"),
                serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer", "null")
            },
            function (aGetUserOofSettingsRequest, aOofSettings) {
                self.getOofSettingsOK(aGetUserOofSettingsRequest, aOofSettings);
            },
            function (aGetUserOofSettingsRequest, aCode, aMsg) {
                self.getOofSettingsError(aGetUserOofSettingsRequest, aCode, aMsg);
            });
    },

    getOofSettingsOK: function _getOofSettingsOK(aGetUserOofSettingsRequest, aOofSettings) {
        this.intOofSettings = aOofSettings;

        this.globalFunctions.LOG("intern:" + this.intOofSettings.internalReply);
        this.globalFunctions.LOG("extern:" + this.intOofSettings.externalReply);

        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecLoadedOofSettings", [], "exchangecommon");

        this._document.getElementById("exchWebService_oofSettings_dialog").buttons = "accept,cancel";

        this._document.getElementById("vbox-exchWebService-oof-settings").disabled = false;

        this._document.getElementById("exchWebService-oof-status").value = (aOofSettings.oofState == "Disabled") ? "Disabled" : "Enabled";

        this._document.getElementById("exchWebService-oof-scheduled").checked = (aOofSettings.oofState == "Scheduled");

        if (aOofSettings.startTime) {
            this._document.getElementById("exchWebService-oof-startdate").year = aOofSettings.startTime.year;
            this._document.getElementById("exchWebService-oof-startdate").month = aOofSettings.startTime.month;
            this._document.getElementById("exchWebService-oof-startdate").date = aOofSettings.startTime.day;

            this._document.getElementById("exchWebService-oof-starttime").hour = aOofSettings.startTime.hour;
            this._document.getElementById("exchWebService-oof-starttime").minute = aOofSettings.startTime.minute;
        }

        if (aOofSettings.endTime) {
            this._document.getElementById("exchWebService-oof-enddate").year = aOofSettings.endTime.year;
            this._document.getElementById("exchWebService-oof-enddate").month = aOofSettings.endTime.month;
            this._document.getElementById("exchWebService-oof-enddate").date = aOofSettings.endTime.day;

            this._document.getElementById("exchWebService-oof-endtime").hour = aOofSettings.endTime.hour;
            this._document.getElementById("exchWebService-oof-endtime").minute = aOofSettings.endTime.minute;
        }
        this.doScheduledChanged();

        this._document.getElementById("exchWebService-oof-externalaudience").value = aOofSettings.externalAudience;

        if (this.internalEditorElement) {
            this.internalEditorElement.content = this.intOofSettings.internalReply;
        }

        if (this.externalEditorElement) {
            this.externalEditorElement.content = this.intOofSettings.externalReply;
        }

    },

    getOofSettingsError: function _getOofSettingsError(aGetUserOofSettingsRequest, aCode, aMsg) {
        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecErrorLoadingOofSettings", [aMsg, aCode], "exchangecommon");
    },

    doScheduledChanged: function _doScheduledChanged() {
        // Enable or disable time/date pickers
        this._document.getElementById("exchWebService-oof-startdate").disabled = (!this._document.getElementById("exchWebService-oof-scheduled").checked);
        this._document.getElementById("exchWebService-oof-starttime").disabled = (!this._document.getElementById("exchWebService-oof-scheduled").checked);
        this._document.getElementById("exchWebService-oof-enddate").disabled = (!this._document.getElementById("exchWebService-oof-scheduled").checked);
        this._document.getElementById("exchWebService-oof-endtime").disabled = (!this._document.getElementById("exchWebService-oof-scheduled").checked);
    },

    setOofSettings: function _setOofSettings() {
        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecSavingOofSettings", [], "exchangecommon");

        var oofState = "Disabled";
        if (this._document.getElementById("exchWebService-oof-status").value == "Enabled") {
            oofState = "Enabled";
            if (this._document.getElementById("exchWebService-oof-scheduled").checked) {
                oofState = "Scheduled";
            }
        }

        var startTime = this.cal.createDateTime();
        startTime.resetTo(this._document.getElementById("exchWebService-oof-startdate").year,
            this._document.getElementById("exchWebService-oof-startdate").month,
            this._document.getElementById("exchWebService-oof-startdate").date,
            this._document.getElementById("exchWebService-oof-starttime").hour,
            this._document.getElementById("exchWebService-oof-starttime").minute,
            0,
            this.globalFunctions.ecDefaultTimeZone());
        startTime = startTime.getInTimezone(this.globalFunctions.ecUTC());

        var endTime = this.cal.createDateTime();
        endTime.resetTo(this._document.getElementById("exchWebService-oof-enddate").year,
            this._document.getElementById("exchWebService-oof-enddate").month,
            this._document.getElementById("exchWebService-oof-enddate").date,
            this._document.getElementById("exchWebService-oof-endtime").hour,
            this._document.getElementById("exchWebService-oof-endtime").minute,
            0,
            this.globalFunctions.ecDefaultTimeZone());
        endTime = endTime.getInTimezone(this.globalFunctions.ecUTC());

        var internalReply = this.intOofSettings.internalReply;
        var externalReply = this.intOofSettings.externalReply;

        internalReply = "<html>" + this.internalEditorElement.content + "</html>";

        externalReply = "<html>" + this.externalEditorElement.content + "</html>";


        var self = this;
        var tmpObject = new erSetUserOofSettingsRequest({
                user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain", "null") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser", "null"),
                mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox", "null"),
                serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer", "null"),

                oofState: oofState,
                externalAudience: this._document.getElementById("exchWebService-oof-externalaudience").value,
                startTime: startTime,
                endTime: endTime,
                internalReply: internalReply,
                externalReply: externalReply

            },
            function (aGetUserOofSettingsRequest) {
                self.setOofSettingsOK(aGetUserOofSettingsRequest);
            },
            function (aGetUserOofSettingsRequest, aCode, aMsg) {
                self.setOofSettingsError(aGetUserOofSettingsRequest, aCode, aMsg);
            });
    },

    setOofSettingsOK: function _setOofSettingsOK(aGetUserOofSettingsRequest) {
        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecSavedOofSettings", [], "exchangecommon");
        this.infoPopup(this._document.title, "Settings saved.");
        this.getOofSettings();

    },

    setOofSettingsError: function _setOofSettingsError(aGetUserOofSettingsRequest, aCode, aMsg) {
        this._document.getElementById("exchWebService-load-error-message").value = this.globalFunctions.getString("calExchangeCalendar", "ecErrorSavingOofSettings", [aMsg, aCode], "exchangecommon");
        alert("Error saving settings. Msg:" + aMsg + ", Code:" + aCode);

        this.getOofSettings();

    },

    infoPopup: function _infoPopup(title, msg) {
        var image = "chrome://exchangecommon-common/skin/images/notify-icon.png";
        var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
        getService(Components.interfaces.nsIWindowWatcher).
        openWindow(null, 'chrome://global/content/alerts/alert.xul',
            '_blank', 'chrome,titlebar=no,popup=yes', null);
        win.arguments = [image, title, msg, true, ''];
    },

}

var tmpOOFSettings = new exchOOFSettings(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpOOFSettings.onLoad();
}, true);
