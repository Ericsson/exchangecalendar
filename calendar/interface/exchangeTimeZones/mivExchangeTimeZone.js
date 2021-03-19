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

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

function mivExchangeTimeZone() {
    this._timeZone = null;
    this._indexDate = null;

    this._standardBias = 0;
    this._daylightBias = 0;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this._names = new Array();
    this._hasDaylight = false;
}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.timezones.';

var mivExchangeTimeZoneGUID = "7621c4ee-d6fb-445a-80f3-4786d2ad5903";

mivExchangeTimeZone.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeTimeZone,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Interface for Cal and Exchange TimeZones comparing.",
    classID: components.ID("{" + mivExchangeTimeZoneGUID + "}"),
    contractID: "@1st-setup.nl/exchange/timezone;1",
    flags: Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeTimeZone,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    // Internal private.
    dateTimeToStrExchange: function _dateTimeToStrExchange(aDate) {
        if (!aDate) return "1900-01-01T00:00:00";

        var result = aDate.year + "-";
        if (aDate.month < 10) result += "0";
        result += aDate.month + "-";
        if (aDate.day < 10) result += "0";
        result += aDate.day + "T";
        if (aDate.hour < 10) result += "0";
        result += aDate.hour + ":";
        if (aDate.minute < 10) result += "0";
        result += aDate.minute + ":";
        if (aDate.second < 10) result += "0";
        result += aDate.second;

        return result;
    },

    dateTimeToStrCal: function _dateTimeToStrCal(aDate) {
        if (!aDate) return "19000101T000000";

        var result = aDate.year;
        if (aDate.month < 10) result += "0";
        result += aDate.month;
        if (aDate.day < 10) result += "0";
        result += aDate.day + "T";
        if (aDate.hour < 10) result += "0";
        result += aDate.hour;
        if (aDate.minute < 10) result += "0";
        result += aDate.minute;
        if (aDate.second < 10) result += "0";
        result += aDate.second;

        return result;
    },

    // External methods

    setExchangeTimezone: function _setExchangeTimezone(aValue, aDate) {
        if (aValue == null) {
            this._hasDaylight = false;
            return null;
        }
        if (!aDate) {
            aDate = cal.now();
        }
        var indexDateStr = this.dateTimeToStrExchange(aDate);

        var result = null;

        this._id = xml2json.getAttribute(aValue, "Id", "??");

        this._name = xml2json.getAttribute(aValue, "Name", "??");
        //dump("Exchange timezone:"+this._id+"/"+this._name+"\n");

        //dump("exchangezone:"+aValue+"\n");
        // Se if we have <t:Transitions><t:AbsoluteDateTransition>
        var absoluteDateTransitions = xml2json.XPath(aValue, "/t:Transitions/t:AbsoluteDateTransition");
        var lastDate = "1900-01-01T00:00:00";
        var transitionIndex = 0;
        for each(var absoluteDateTransition in absoluteDateTransitions) {
            var newDate = xml2json.getTagValue(absoluteDateTransition, "t:DateTime", lastDate);
            if ((newDate >= lastDate) && (newDate <= indexDateStr)) {
                lastDate = xml2json.getTagValue(absoluteDateTransition, "t:DateTime", lastDate);
                transitionIndex = xml2json.getTagValue(absoluteDateTransition, "t:To", 0);
            }
        }
        absoluteDateTransitions = null;

        //dump("\nindexDateStr:"+indexDateStr+", lastDate:"+lastDate+", transitionIndex:"+transitionIndex+"\n\n");

        // Now we are going to find the right transition.
        var transitions = xml2json.XPath(aValue, "/t:TransitionsGroups/t:TransitionsGroup[@Id = '" + transitionIndex + "']/*");

        // Get Standard and Daylight transitionId's
        var standardTransition = null;
        var daylightTransition = null;
        for each(var transition in transitions) {
            var tmpId = xml2json.getTagValue(transition, "t:To", "");
            if (tmpId.indexOf("-Standard") >= 0) {
                standardTransition = transition;
            }
            else {
                if (tmpId.indexOf("-Daylight") >= 0) {
                    daylightTransition = transition;
                }
            }
        }
        transitions = null;

        const dayMap = {
            Sunday: "SU",
            Saturday: "SA",
            Monday: "MO",
            Tuesday: "TU",
            Wednesday: "WE",
            Thursday: "TH",
            Friday: "FR"
        };

        this._standardBias = null;
        if (standardTransition) {
            var standardPeriods = xml2json.XPath(aValue, "/t:Periods/t:Period[@Name = 'Standard' and @Id='" + xml2json.getTagValue(standardTransition, "t:To", "") + "']");
            if (standardPeriods.length > 0) {
                this._standardBias = this.globalFunctions.convertDurationToSeconds(xml2json.getAttribute(standardPeriods[0], "Bias"));
            }
            standardPeriods = null;

            if (standardTransition.tagName == "RecurringDayTransition") {
                this._standardRRule = "FREQ=YEARLY;BYDAY=" + xml2json.getTagValue(standardTransition, "t:Occurrence", 1) + dayMap[xml2json.getTagValue(standardTransition, "t:DayOfWeek", "Sunday")] + ";BYMONTH=" + xml2json.getTagValue(standardTransition, "t:Month", 3);
            }
            else {
                this._standardRRule = null;
            }
            //dump("this._standardBias:"+this._standardBias+"\n");
            //dump("this._standardRRule:"+this._standardRRule+"\n");
        }

        this._daylightBias = null;
        if (daylightTransition) {
            var daylightPeriods = xml2json.XPath(aValue, "/t:Periods/t:Period[@Name = 'Daylight' and @Id='" + xml2json.getTagValue(daylightTransition, "t:To", "") + "']");
            if (daylightPeriods.length > 0) {
                this._daylightBias = this.globalFunctions.convertDurationToSeconds(xml2json.getAttribute(daylightPeriods[0], "Bias"));
            }
            daylightPeriods = null;

            this._daylightRRule = "FREQ=YEARLY;BYDAY=" + xml2json.getTagValue(daylightTransition, "t:Occurrence", 1) + dayMap[xml2json.getTagValue(daylightTransition, "t:DayOfWeek", "Sunday")] + ";BYMONTH=" + xml2json.getTagValue(daylightTransition, "t:Month", 3);
            //dump("this._daylightBias:"+this._daylightBias+"\n");
            //dump("this._daylightRRule:"+this._daylightRRule+"\n");

            this._hasDaylight = true;
        }
        else {
            this._hasDaylight = false;
        }
    },

    setCalTimezone: function _setCalTimezone(aValue, aDate) {
        if (aValue == null) {
            this._hasDaylight = false;
            return null;
        }

        if (!aDate) {
            aDate = cal.now();
        }
        var indexDateStr = this.dateTimeToStrCal(aDate);

        this._id = aValue.tzid;

        var tmpNames = aValue.tzid.split("/");

        this._names = new Array();
        for each(var name in tmpNames) {
                this._names.push(name);
            }
            //dump(" setCalTimezone: this._names:"+this._names+"\n");

        //calculateBiasOffsets
        var tzcomp = aValue.icalComponent;
        if (!tzcomp) {
            this._hasDaylight = false;
            return;
        }

        var standardTimezone = null;
        comp = tzcomp.getFirstSubcomponent("STANDARD");
        while (comp) {
            var daylightStart = comp.getFirstProperty("DTSTART").value;
            if ((daylightStart) && (daylightStart <= indexDateStr)) {
                standardTimezone = comp;
            }
            comp = tzcomp.getNextSubcomponent("STANDARD");
        }

        var daylightTimezone = null;
        var comp = tzcomp.getFirstSubcomponent("DAYLIGHT");
        while (comp) {
            var daylightStart = comp.getFirstProperty("DTSTART").value;
            if ((daylightStart) && (daylightStart <= indexDateStr)) {
                daylightTimezone = comp;
            }
            comp = tzcomp.getNextSubcomponent("DAYLIGHT");
        }

        // Get TZOFFSETTO from standard time.
        if (standardTimezone) {
            var m = standardTimezone.getFirstProperty("TZOFFSETTO").value.match(/^([+-]?)(\d\d)(\d\d)$/);

            this._standardBias = (m[2] * 3600) + (m[3] * 60);

            if (m[1] == '+') {
                this._standardBias = -1 * this._standardBias;
            }

            if (standardTimezone.getFirstProperty("RRULE")) {
                this._standardRRule = standardTimezone.getFirstProperty("RRULE").value;
            }
            else {
                this._standardRRule = null;
            }
            //dump("this._standardRRule:"+this._standardRRule+"\n");
        }

        if (daylightTimezone) {
            var m = daylightTimezone.getFirstProperty("TZOFFSETTO").value.match(/^([+-]?)(\d\d)(\d\d)$/);

            this._daylightBias = (m[2] * 3600) + (m[3] * 60);

            if (m[1] == '+') {
                this._daylightBias = -1 * this._daylightBias;
            }

            if (daylightTimezone.getFirstProperty("RRULE")) {
                this._daylightRRule = daylightTimezone.getFirstProperty("RRULE").value;
            }
            else {
                this._daylightRRule = null;
            }
            //dump("this._daylightRRule:"+this._daylightRRule+"\n");

            this._hasDaylight = true;
        }
        else {
            this._hasDaylight = false;
        }

    },

    equal: function _equal(aTimeZone) {
        if (this.standardBias != aTimeZone.standardBias) { // Standard bias does not match
            //dump("  -- Standard Bias values do not match. "+this.standardBias+" != "+aTimeZone.standardBias+"\n");
            return false;
        }

        if (this.hasDaylight != aTimeZone.hasDaylight) { // daylight does not match.
            //dump("  -- One has daylight other not.\n");
            return false;
        }

        if ((this.hasDaylight) && (this.daylightBias != aTimeZone.daylightBias)) { // daylight bias does not match.
            //dump("  -- Daylight Bias values do not match. "+this.daylightBias+" != "+aTimeZone.daylightBias+"\n");
            return false;
        }

        if (this.standardRRule != aTimeZone.standardRRule) {
            //dump("  -- standard RRUle values do not match. "+this.standardRRule+" != "+aTimeZone.standardRRule+"\n");
            return false;
        }

        if ((this.hasDaylight) && (this.daylightRRule != aTimeZone.daylightRRule)) {
            //dump("  -- Daylight RRUle values do not match. "+this.daylightRRule+" != "+aTimeZone.daylightRRule+"\n");
            if (aTimeZone.id == "Asia/Jerusalem" && this.id == "Israel Standard Time") return true; //temporary fix for israel timezone wil be removed 
            return false;
        }

        return true;
    },

    get hasDaylight() {
        return this._hasDaylight;
    },

    get standardRRule() {
        return this._standardRRule;
    },

    get daylightRRule() {
        return this._daylightRRule;
    },

    get id() {
        return this._id;
    },

    get name() {
        return this._name;
    },

    getNames: function _getNames(aCount) {
        aCount.value = this._names.length;
        return this._names;
    },

    get standardBias() {
        return this._standardBias;
    },

    get daylightBias() {
        return this._daylightBias;
    },

    get timeZone() {
        return this._timeZone;
    },

    set timeZone(aValue) {
        this._timeZone = aValue;
        if (aValue[telements]) {
            //if (aValue instanceof Ci.mivIxml2jxon) {
            this.setExchangeTimezone(aValue, this._indexDate);
        }
        if (aValue instanceof Ci.calITimezone) {
            this.setCalTimezone(aValue, this._indexDate);
        }
    },

    get indexDate() {
        return this._indexDate;
    },

    set indexDate(aValue) {
        this._indexDate = aValue;
        if (this._timeZone) this.timeZone = this._timeZone;
    },
}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeTimeZone) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeTimeZone = XPCOMUtils.generateNSGetFactory([mivExchangeTimeZone]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }
    return NSGetFactory.mivExchangeTimeZone(cid);
}
