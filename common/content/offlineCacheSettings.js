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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calStorageHelpers.jsm");

function exchOfflineCacheSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchOfflineCacheSettings.prototype = {

    onLoad: function _onLoad(event) {
        var calId = this._window.arguments[0].calendar.id;
        var aCalendar = this._window.arguments[0].calendar;


        // Load cache preferences

        this.oldUseOfflineCache = aCalendar.useOfflineCache;
        if (aCalendar.useOfflineCache) {
            this._document.getElementById("exchWebService-offlineCacheproperties-cacheState").checked = true;
            this._document.getElementById("exchWebService-offlineCacheproperties-detaisvbox").removeAttribute("collapsed");

            var startDate = "no date";
            var endDate = "no date";

            if (aCalendar.offlineStartDate) {
                startDate = aCalendar.offlineStartDate.toString().substring(0, 10);
            }
            if (aCalendar.offlineEndDate) {
                endDate = aCalendar.offlineEndDate.toString().substring(0, 10);
            }

            this._document.getElementById("exchWebService-offlineCacheproperties-cachingStartDateValue").value = startDate;
            this._document.getElementById("exchWebService-offlineCacheproperties-cachingEndDateValue").value = endDate;

            this._document.getElementById("exchWebService-offlineCacheproperties-totalEventsValue").value = aCalendar.offlineEventItemCount;
            this._document.getElementById("exchWebService-offlineCacheproperties-totalTasksValue").value = aCalendar.offlineToDoItemCount;
            this._document.getElementById("exchWebService-memoryCache-totalItems").value = aCalendar.memoryCacheItemCount;

            this._document.getElementById("exchWebService-offlineCacheproperties-maintainancegroupbox").removeAttribute("collapsed");
            this._document.getElementById("exchWebService-offlineCacheproperties-preferencesgroupbox").removeAttribute("collapsed");

            var exchWebServicesCalPrefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

            this._document.getElementById("exchWebService-offlineCacheproperties-monthsBeforeToday").value = this.globalFunctions.safeGetIntPref(exchWebServicesCalPrefs, "ecOfflineCacheMonthsBeforeToday", 1);
            this._document.getElementById("exchWebService-offlineCacheproperties-monthsAfterToday").value = this.globalFunctions.safeGetIntPref(exchWebServicesCalPrefs, "ecOfflineCacheMonthsAfterToday", 1);

        }

    },

    doClearCache: function _doClearCache() {
        var aCalendar = this._window.arguments[0].calendar;
        this.clearCachedData(aCalendar);
    },

    onSave: function _onSave() {
        var calId = this._window.arguments[0].calendar.id;
        var aCalendar = this._window.arguments[0].calendar;
        tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByCalId(calId);

        var exchWebServicesCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

        // Save caching preferences
        /*if(this._document.getElementById("exchWebService-offlineCacheproperties-cacheState").checked){
        	exchWebServicesCalPrefs.setBoolPref("useOfflineCache", true);	
        }
        else{
        	exchWebServicesCalPrefs.setBoolPref("useOfflineCache", false);					
        }*/

        exchWebServicesCalPrefs.setIntPref("ecOfflineCacheMonthsBeforeToday", this._document.getElementById("exchWebService-offlineCacheproperties-monthsBeforeToday").value);
        exchWebServicesCalPrefs.setIntPref("ecOfflineCacheMonthsAfterToday", this._document.getElementById("exchWebService-offlineCacheproperties-monthsAfterToday").value);

        if (this.oldUseOfflineCache != this._document.getElementById("exchWebService-offlineCacheproperties-cacheState").checked) {
            aCalendar.setProperty("exchWebService.useOfflineCache", this._document.getElementById("exchWebService-offlineCacheproperties-cacheState").checked)
        }
    },

    getDBConn: function _aDBConn(aCalendar) {
        var file = Cc["@mozilla.org/file/directory_service;1"]
            .getService(Components.interfaces.nsIProperties)
            .get("ProfD", Components.interfaces.nsIFile);
        file.append("exchange-data");
        file.append(aCalendar.id + ".offlineCache.sqlite");
        let mDBConn = Services.storage.openDatabase(file);
        return mDBConn;
    },

    clearCachedData: function _clearCachedData(aCalendar) {
        let aDBConn = this.getDBConn(aCalendar);
        if (aDBConn.connectionReady && aDBConn.tableExists("items")) {
            this.globalFunctions.LOG("clearCachedData");
            let statement = aDBConn.createStatement("DELETE FROM items");
            let statement1 = aDBConn.createStatement("DELETE FROM attachments");
            let statement2 = aDBConn.createStatement("DELETE FROM attachments_per_item");

            try {
                statement.executeStep();
                statement1.executeStep();
                statement2.executeStep();

                statement.finalize();
                statement1.finalize();
                statement2.finalize();
            }
            catch (e) {
                this.globalFunctions.LOG("unable to clear tables" + e);
            }
            alert("cache cleared!");
            var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
            observerService.notifyObservers(aCalendar, "onCalReset", aCalendar.id);
            this.onLoad();
        }
    },

    doCheckOfflineCacheChanged: function _doCheckOfflineCacheChanged(aCheckBox) {
        if (this._document.getElementById("exchWebService-offlineCacheproperties-cacheState").checked) {
            this._document.getElementById("exchWebService-offlineCacheproperties-detaisvbox").setAttribute("collapsed", "false");
            this._document.getElementById("exchWebService-offlineCacheproperties-maintainancegroupbox").setAttribute("collapsed", "false");
            this._document.getElementById("exchWebService-offlineCacheproperties-preferencesgroupbox").setAttribute("collapsed", "false");
        }
        else {
            this._document.getElementById("exchWebService-offlineCacheproperties-detaisvbox").setAttribute("collapsed", "true");
            this._document.getElementById("exchWebService-offlineCacheproperties-maintainancegroupbox").setAttribute("collapsed", "true");
            this._document.getElementById("exchWebService-offlineCacheproperties-preferencesgroupbox").setAttribute("collapsed", "true");
        }
    },

}

var tmpOfflineCacheSettings = new exchOfflineCacheSettings(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpOfflineCacheSettings.onLoad();
}, true);
