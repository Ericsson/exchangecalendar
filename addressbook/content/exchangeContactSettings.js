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
 * -- Exchange 2007/2010 Contacts.
 * -- For Thunderbird.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=xx
 * email: exchangecontacts@extensions.1st-setup.nl
 *
 *
 * ***** BEGIN LICENSE BLOCK *****/
"use strict";

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

function exchExchangeContactSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchExchangeContactSettings.prototype = {

    isNewDirectory: true,
    dirUUID: "",

    checkRequired: function _checkRequired() {
        let canAdvance = true;
        let vbox = this._document.getElementById('exchWebService-exchange-settings');
        if (vbox) {
            let eList = vbox.getElementsByAttribute('required', 'true');
            for (let i = 0; i < eList.length && canAdvance; ++i) {
                canAdvance = (eList[i].value != "");
            }

            if (canAdvance) {
                this._document.getElementById("exchWebService_ContactSettings_dialog").buttons = "accept,cancel";
            }
            else {
                this._document.getElementById("exchWebService_ContactSettings_dialog").buttons = "cancel";
            }
        }

    },

    onLoad: function _onLoad() {
        var directory = this._window.arguments[0].selectedDirectory;
        if (!directory) {
            // New directory to create
            this.isNewDirectory = true;
            this.dirUUID = "";
            this._document.getElementById("exchWebService_folderbase").selectedIndex = 7;
            tmpSettingsOverlay.exchWebServicesgFolderBase = "contacts";
            this._document.getElementById("exchangeWebService_preference_contacts_pollinterval").value = 300;
            this._document.getElementById("exchWebService-add-globaladdresslist").checked = false;
        }
        else {
            this.isNewDirectory = false;

            this.dirUUID = directory.uuid;

            this.prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl.account." + this.dirUUID + ".");

            this._document.getElementById("exchangeWebService_preference_contacts_pollinterval").value = this.globalFunctions.safeGetIntPref(this.prefs, "pollinterval", 300, true);
            this._document.getElementById("exchWebService-add-globaladdresslist").checked = this.globalFunctions.safeGetBoolPref(this.prefs, "globalAddressList", false, true);

            // load preferences of current directory.
            tmpSettingsOverlay.exchWebServicesLoadExchangeSettingsByContactUUID(directory.uuid);

        }

    },

    onSave: function _onSave() {
        this._window.arguments[0].newAccountObject = tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByContactUUID(this.isNewDirectory, this.dirUUID);

        this._window.arguments[0].newAccountObject.pollinterval = this._document.getElementById("exchangeWebService_preference_contacts_pollinterval").value;
        this._window.arguments[0].newAccountObject.addGlobalAddressList = this._document.getElementById("exchWebService-add-globaladdresslist").checked;

        this._window.arguments[0].answer = "saved";

        if (!this.isNewDirectory) {

            this.prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl.account." + this.dirUUID + ".");

            this.prefs.setIntPref("pollinterval", this._window.arguments[0].newAccountObject.pollinterval);
            this.prefs.setBoolPref("globalAddressList", this._window.arguments[0].newAccountObject.addGlobalAddressList);

            var observerService = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            observerService.notifyObservers(this, "onContactReset", this.dirUUID);
        }

        return true;
    },

}

var tmpExchangeContactSettings = new exchExchangeContactSettings(document, window);
