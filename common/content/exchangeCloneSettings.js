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
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

function exchExchangeCloneSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchExchangeCloneSettings.prototype = {

    checkRequired: function _checkRequired() {
        let canAdvance = true;
        let vbox = this._document.getElementById('exchWebService-exchange-settings');
        if (vbox) {
            let eList = vbox.getElementsByAttribute('required', 'true');
            for (let i = 0; i < eList.length && canAdvance; ++i) {
                canAdvance = (eList[i].value != "");
            }

            if (canAdvance) {
                this._document.getElementById("exchWebService_CloneSettings_dialog").buttons = "accept,cancel";
            }
            else {
                this._document.getElementById("exchWebService_CloneSettings_dialog").buttons = "cancel";
            }
        }

    },

    onLoad: function _onLoad() {
        var calId = this._window.arguments[0].calendar.id;
        this._document.getElementById("exchWebService_clone_description").value = this._window.arguments[0].calendar.name + " (copy)";
        tmpSettingsOverlay.exchWebServicesLoadExchangeSettingsByCalId(calId);
    },

    onSave: function _onSave() {
        var oldCalId = this._window.arguments[0].calendar.id;

        // Clone the Calendar settings to a new cal id.
        var newCalId = this.globalFunctions.copyCalendarSettings(oldCalId);

        // Save settings in dialog to new cal id.
        tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByCalId(newCalId);

        // Save the description/name for the calendar and create a new unique uri.
        var toCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry." + newCalId + ".");

        toCalPrefs.setCharPref("name", this._document.getElementById("exchWebService_clone_description").value);
        toCalPrefs.setCharPref("uri", "https://auto/" + newCalId);

        // Store the new cal id for the calling process of this dialog.
        this._window.arguments[0].newCalId = newCalId;

        this._window.arguments[0].answer = "saved";

        Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService).savePrefFile(null);
        return true;
    },

}

var tmpExchangeCloneSettings = new exchExchangeCloneSettings(document, window);
