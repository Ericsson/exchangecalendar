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
var Cr = Components.results;
var components = Components;

// Initialize the preferences
function initPreferences() {
    var exchangeContactsInitPrefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getBranch("ldap_2.servers.exchangecontacts.");

    exchangeContactsInitPrefs.setCharPref("description", "Exchange Contacts");
    exchangeContactsInitPrefs.setCharPref("uri", "exchWebService-contactRoot-directory://");

    Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService).savePrefFile(null);
}

window.addEventListener("load", function () {
    var exchangeContactsInitPrefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getBranch("");
    if (exchangeContactsInitPrefs.getPrefType('ldap_2.servers.exchangecontacts')) {
        exchangeContactsInitPrefs.deleteBranch('ldap_2.servers.exchangecontacts');
    }
    initPreferences();
}, false);
