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
 * ## Exchange 2007/2010 Calendar and Tasks Provider.
 * ## For Thunderbird with the Lightning add-on.
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
 * Contributor(s):
 *   Deepak Kumar <deepk2u@gmail.com>
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

function exchOtherPreferences(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchOtherPreferences.prototype = {

    addOnDefault: function _addOnDefault() {
        this._document.getElementById("extensions.1st-setup.others.userAgent").value = "exchangecalendar@extensions.1st-setup.nl";
    },

    mozillaDefault: function _mozillaDefault() {
        if ((this._window.navigator) && (this._window.navigator.userAgent)) {
            this._document.getElementById("extensions.1st-setup.others.userAgent").value = this._window.navigator.userAgent;
        }
        else {
            this._document.getElementById("extensions.1st-setup.others.userAgent").value = "Mozilla/5.0 (X11; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0";
        }
    },

    ieDefault: function _ieDefault() {
        this._document.getElementById("extensions.1st-setup.others.userAgent").value = "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 7.1; Trident/5.0)";
    },

    onLoad: function _onLoad() {
        this.restoreUpdateSettings();
    },

    restoreUpdateSettings: function _restoreUpdateSettings() {
        let othersPreference = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefBranch);
        let toUpdate = this.globalFunctions.safeGetBoolPref(othersPreference, "extensions.1st-setup.others.updateRequired");
        if (toUpdate === false) {
            this._document.getElementById("exchangeWebService_others_prefs_groupbox2").hidden = true;
        }
        toUpdate = null;
        othersPreference = null;
    },
}


var tmpOtherPreferences = new exchOtherPreferences(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpOtherPreferences.onLoad();
}, true);
