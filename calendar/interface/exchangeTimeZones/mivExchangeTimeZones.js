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
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/
 *
 * This interface/service is used for TimeZone conversions to Exchange
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calProviderUtils.jsm");

Cu.import("resource://exchangecalendar/erGetTimeZones.js");

//Cu.import("resource://exchangecommoninterfaces/xml2jxon/mivIxml2jxon.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

function mivExchangeTimeZones() {
    this._timeZones = {};

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
        .getService(Ci.mivExchangeLoadBalancer);

    this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
        .getService(Ci.mivExchangeStatistics);

    this.timezoneService = Cc["@mozilla.org/calendar/timezone-service;1"]
        .getService(Ci.calITimezoneProvider);

    this.exchangeToLightningMemory = {};

    // load timezone file from resource. This is for Exchange server version before 2010.
    this.load_timezonedefinitions_file();
}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.timezones.';

var mivExchangeTimeZonesGUID = "16093d9f-a9ac-41ab-9995-0a3a7423b45c";

mivExchangeTimeZones.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeTimeZones,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Keeps the Exchange TimeZones retreived from server in memory.",
    classID: components.ID("{" + mivExchangeTimeZonesGUID + "}"),
    contractID: "@1st-setup.nl/exchange/timezones;1",
    flags: Ci.nsIClassInfo.SINGLETON,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeTimeZones,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },
    // External methods

    // void addURL(in AUTF8String aURL);
    addURL: function _addURL(aURL, aUser, aCalendar) {
        var version = this.exchangeStatistics.getServerVersion(aURL);

        if (this._timeZones[version] === undefined) {
            this._timeZones[version] = null;
            var self = this;
            this.loadBalancer.addToQueue({
                calendar: aCalendar,
                ecRequest: erGetTimeZonesRequest,
                arguments: {
                    user: aUser,
                    serverUrl: aURL,
                    serverVersion: version,
                    actionStart: Date.now()
                },
                cbOk: function (erGetTimeZonesRequest, aTimeZoneDefinitions) {
                    self.getTimeZonesOK(erGetTimeZonesRequest, aTimeZoneDefinitions);
                },
                cbError: function (erGetTimeZonesRequest, aCode, aMsg) {
                    self.getTimeZonesError(erGetTimeZonesRequest, aCode, aMsg);
                },
                listener: null
            });

        }

    },

    getExchangeTimeZoneByCalTimeZone: function _getExchangeTimeZoneByCalTimeZone(aCalTimeZone, aURL, aIndexDate) {
        var version = this.exchangeStatistics.getServerVersion(aURL);
        if (!this._timeZones[version]) {
            version = "Exchange2007_SP1";
        }

        if (this._timeZones[version]) {
            if (aCalTimeZone.isFloating) {
                var tmpZone = this.globalFunctions.ecDefaultTimeZone();
            }
            else {
                var tmpZone = aCalTimeZone;
            }

            var calTimeZone = this.getTimeZone(tmpZone, aIndexDate);

            var tmpArray = calTimeZone.id.split("/");

            var weHaveAMatch = null;

            var finalScore = -1;
            for each(var timeZoneDefinition in this._timeZones[version]) {

                // First we match on values.
                var exchangeTimeZone = this.getTimeZone(timeZoneDefinition, aIndexDate);
                if (exchangeTimeZone.equal(calTimeZone)) {
                    // Now we see if we have also a match on name.
                    var tmpScore = 0;
                    for each(var zonePart in tmpArray) {
                        if ((exchangeTimeZone.id) && (exchangeTimeZone.id.indexOf(zonePart) > -1)) {
                            tmpScore = tmpScore + 1;
                        }
                        if ((exchangeTimeZone.name) && (exchangeTimeZone.name.indexOf(zonePart) > -1)) {
                            tmpScore = tmpScore + 1;
                        }
                    }

                    if (tmpScore > finalScore) {
                        finalScore = tmpScore;
                        weHaveAMatch = exchangeTimeZone;
                    }
                }
            }

            return weHaveAMatch;
        }

        return null;
    },

    getExchangeTimeZoneIdByCalTimeZone: function _getExchangeTimeZoneIdByCalTimeZone(aCalTimeZone, aURL, aIndexDate) {

        var exchangeTimeZone = this.getExchangeTimeZoneByCalTimeZone(aCalTimeZone, aURL, aIndexDate);
        if (exchangeTimeZone) {
            return exchangeTimeZone.id;
        }
        return "UTC";
    },

    getExchangeTimeZoneNameByCalTimeZone: function _getExchangeTimeZoneNameByCalTimeZone(aCalTimeZone, aURL, aIndexDate) {

        var exchangeTimeZone = this.getExchangeTimeZoneByCalTimeZone(aCalTimeZone, aURL, aIndexDate);
        if (exchangeTimeZone) {
            return exchangeTimeZone.name;
        }
        return "UTC";
    },

    getTimeZone: function _getTimeZone(aTimeZone, aIndexDate) {
        if (!aTimeZone) return null;

        var timeZoneId = null;
        if (aTimeZone[telements]) {
            timeZoneId = xml2json.getAttribute(aTimeZone, "Id", null);
        }
        if (aTimeZone instanceof Ci.calITimezone) {
            timeZoneId = aTimeZone.tzid;
        }

        if (!timeZoneId) return null;

        if (!this._tzCache) {
            this._tzCache = {};
        }

        if (this._tzCache[timeZoneId]) {
            return this._tzCache[timeZoneId];
        }

        this._tzCache[timeZoneId] = Cc["@1st-setup.nl/exchange/timezone;1"]
            .createInstance(Ci.mivExchangeTimeZone);

        this._tzCache[timeZoneId].indexDate = aIndexDate;
        this._tzCache[timeZoneId].timeZone = aTimeZone;

        return this._tzCache[timeZoneId];
    },

    getCalTimeZoneByExchangeMeetingTimeZone: function _getCalTimeZoneByExchangeMeetingTimeZone(aMeetingTimeZone, aIndexDate) {
        var name;
        if (!aMeetingTimeZone) {
            return null;
        }
        if (aMeetingTimeZone.indexOf(") ") > -1) {
            name = aMeetingTimeZone.substr(aMeetingTimeZone.indexOf(") ") + 2).toLowerCase();
        }
        else {
            // We need to get the timezone name for this id.
            if (this._timeZones["Exchange2007_SP1"][aMeetingTimeZone]) {
                return this.getCalTimeZoneByExchangeTimeZone(this._timeZones["Exchange2007_SP1"][aMeetingTimeZone], "", aIndexDate);
            }
            else {
                return null;
            }
        }

        // The name could contain multiple names comma separated.
        name = name.replace(/, /g, ",");
        var names = name.split(",");

        var timezones = this.timezoneService.timezoneIds;
        var tmpResult = null;
        while (timezones.hasMore()) {
            var tmpZoneId = timezones.getNext();
            for each(var cname in names) {
                if (tmpZoneId.toLowerCase().indexOf(cname) > -1) {
                    return this.timezoneService.getTimezone(tmpZoneId);
                }
            }
        }

        return null;
    },

    getCalTimeZoneByExchangeTimeZone: function _getCalTimeZoneByExchangeTimeZone(aExchangeTimeZone, aURL, aIndexDate) {
        //dump("getCalTimeZoneByExchangeTimeZone: aExchangeTimeZone:"+xml2json.toString(aExchangeTimeZone)+"\n");
        var exchangeTimeZone = this.getTimeZone(aExchangeTimeZone, aIndexDate);

        if (exchangeTimeZone == null) return null;

        var result = null;

        if (this.exchangeToLightningMemory[exchangeTimeZone.id]) {
            return this.exchangeToLightningMemory[exchangeTimeZone.id];
        }

        // See if the Lightning default timezone matches.
        var defaultTimeZone = this.getTimeZone(this.globalFunctions.ecDefaultTimeZone());
        if (defaultTimeZone.equal(exchangeTimeZone)) {
            return this.globalFunctions.ecDefaultTimeZone();
        }

        // Loop through the lightning timezones.
        // First we try to do a fast detection by name
        var zoneScore = 0;
        if ((exchangeTimeZone.id != "??") || (exchangeTimeZone.name != "??")) {
            var timezones = this.timezoneService.timezoneIds;
            var tmpResult = null;
            while (timezones.hasMore()) {
                var tmpZoneId = timezones.getNext();
                var tmpZone = this.timezoneService.getTimezone(tmpZoneId);

                var calTimeZone = this.getTimeZone(tmpZone, aIndexDate);

                var tmpArray = calTimeZone.id.split("/");

                var tmpScore = 0;
                for each(var zonePart in tmpArray) {

                    if ((exchangeTimeZone.id) && (exchangeTimeZone.id.indexOf(zonePart) > -1)) {
                        tmpScore = tmpScore + 1;
                    }
                    if ((exchangeTimeZone.name) && (exchangeTimeZone.name.indexOf(zonePart) > -1)) {
                        tmpScore = tmpScore + 1;
                    }
                }
                if ((tmpScore > zoneScore) && (tmpScore > 0)) {
                    if (calTimeZone.equal(exchangeTimeZone)) {
                        result = tmpZone;
                        zoneScore = tmpScore;
                    }
                }
            }
        }

        var weHaveAMatch = false;
        if (result == null) {
            // We scan the while list to find a match.
            var timezones = this.timezoneService.timezoneIds;
            var tmpResult = null;
            while (timezones.hasMore() && (!weHaveAMatch)) {
                var tmpZoneId = timezones.getNext();
                var tmpZone = this.timezoneService.getTimezone(tmpZoneId);

                var calTimeZone = this.getTimeZone(tmpZone);
                if (calTimeZone.equal(exchangeTimeZone)) {
                    result = tmpZone;
                    weHaveAMatch = true;
                }

            }
        }

        if (result == null) {
            dump("  --> c. Could not find a matching lightning timezone.\n");
        }
        else {
            this.exchangeToLightningMemory[exchangeTimeZone.id] = result;
        }

        return result;
    },

    // Internal methods.

    calculateBiasOffsets: function _calculateBiasOffsets(aCalTimeZone) {
        var tzcomp = aCalTimeZone.icalComponent;
        if (!tzcomp) {
            return {};
        }

        var dsttz = null;
        for (var comp = tzcomp.getFirstSubcomponent("DAYLIGHT"); comp; comp = tzcomp.getNextSubcomponent("DAYLIGHT")) {
            if (!dsttz || dsttz.getFirstProperty("DTSTART").valueAsDatetime.compare(
                    comp.getFirstProperty("DTSTART").valueAsDatetime) < 0) {
                dsttz = comp;
            }
        }
        var stdtz = null;
        for (var comp = tzcomp.getFirstSubcomponent("STANDARD"); comp; comp = tzcomp.getNextSubcomponent("STANDARD")) {
            if (!stdtz || stdtz.getFirstProperty("DTSTART").valueAsDatetime.compare(
                    comp.getFirstProperty("DTSTART").valueAsDatetime) < 0) {
                stdtz = comp;
            }
        }

        if (!stdtz) {
            return {};
        }

        // Get TZOFFSETTO from standard time.
        var m = stdtz.getFirstProperty("TZOFFSETTO").value.match(/^([+-]?)(\d\d)(\d\d)$/);
        var biasOffset = cal.createDuration();
        biasOffset.hours = m[2];
        biasOffset.minutes = m[3];
        if (m[1] == '+') {
            biasOffset.isNegative = true;
        }

        var tmpBaseOffset = biasOffset.icalString;

        var daylightOffset = null;
        if (dsttz) {
            var m = dsttz.getFirstProperty("TZOFFSETTO").value.match(/^([+-]?)(\d\d)(\d\d)$/);
            daylightOffset = cal.createDuration();
            daylightOffset.hours = m[2];
            daylightOffset.minutes = m[3];
            if (m[1] == '+') {
                daylightOffset.isNegative = true;
            }
        }

        if (daylightOffset) {
            return {
                standard: biasOffset.icalString,
                daylight: daylightOffset.icalString
            };
        }
        else {
            return {
                standard: biasOffset.icalString,
                daylight: null
            };
        }
    },

    getTimeZonesOK: function _getTimeZonesOK(erGetTimeZonesRequest, aTimeZoneDefinitions) {
        this.addExchangeTimeZones(aTimeZoneDefinitions, erGetTimeZonesRequest.argument.serverVersion);
    },

    getTimeZonesError: function _getTimeZonesError(erGetTimeZonesRequest, aCode, aMsg) {},

    addExchangeTimeZones: function _addExchangeTimeZones(aTimeZoneDefinitions, aVersion) {
        var rm = xml2json.XPath(aTimeZoneDefinitions, "/s:Envelope/s:Body/m:GetServerTimeZonesResponse/m:ResponseMessages/m:GetServerTimeZonesResponseMessage");
        if (rm.length == 0) return null;
        this._timeZones[aVersion] = {};

        var timeZoneDefinitionArray = xml2json.XPath(rm[0], "/m:TimeZoneDefinitions/t:TimeZoneDefinition");
        for (var index in timeZoneDefinitionArray) {
            this._timeZones[aVersion][xml2json.getAttribute(timeZoneDefinitionArray[index], "Id")] = timeZoneDefinitionArray[index];
        }
        timeZoneDefinitionArray = null;
        rm = null;
    },

    load_timezonedefinitions_file: function _load_timezonedefinitions_file() {
        var somefile = this.globalFunctions.chromeToPath("chrome://exchangeTimeZones/content/ewsTimesZoneDefinitions_2007.xml");
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);

        file.initWithPath(somefile);

        var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].
        createInstance(Components.interfaces.nsIFileInputStream);
        istream.init(file, -1, -1, 0);
        istream.QueryInterface(Components.interfaces.nsILineInputStream);

        // read lines into array  
        var line = {},
            lines = "",
            hasmore;
        do {
            hasmore = istream.readLine(line);
            lines += line.value;
        } while (hasmore);

        istream.close();
        var root = xml2json.newJSON();
        xml2json.parseXML(root, lines);
        var timezonedefinitions = root[telements][0];
        this.addExchangeTimeZones(root, "Exchange2007_SP1");

        timezonedefinitions = null;
        lines = null;
        line = null;
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeTimeZones) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeTimeZones = XPCOMUtils.generateNSGetFactory([mivExchangeTimeZones]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }
    return NSGetFactory.mivExchangeTimeZones(cid);
}
