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
 * This interface/service is used for loadBalancing Request to Exchange
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function mivExchangeStatistics() {
    this.serverVersions = {};
    this.majorVersions = {};
    this.minorVersions = {};

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this.dataRead = {};
    this.dataSend = {};

    this._xml2jxonCount = 0;
}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.statistics.';

var mivExchangeStatisticsGUID = "e491a5d9-678a-4b2c-8d7f-c1a8f8ff40e8";

mivExchangeStatistics.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeStatistics,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Statistics maintainer for requests to Exchange server.",
    classID: components.ID("{" + mivExchangeStatisticsGUID + "}"),
    contractID: "@1st-setup.nl/exchange/statistics;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeStatistics,
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

    setServerVersion: function _setServerVersion(aURL, aVersion, aMajorVersion, aMinorVersion) {
        if (aMajorVersion == 15) {
            this.serverVersions[aURL] = "Exchange2013";
            //if (aMinorVersion > 0) this.serverVersions[aURL] = this.serverVersions[aURL] + "_SP" + aMinorVersion;
        }
        else {
            if (aMajorVersion == 14) {
                this.serverVersions[aURL] = "Exchange2010";
                if (aMinorVersion > 1) {
                    this.serverVersions[aURL] = this.serverVersions[aURL] + "_SP2";
                }
                else {
                    if (aMinorVersion > 0) this.serverVersions[aURL] = this.serverVersions[aURL] + "_SP" + aMinorVersion;
                }
            }
            else {
                if (aMajorVersion == 8) {
                    this.serverVersions[aURL] = "Exchange2007";
                    if (aMinorVersion > 0) this.serverVersions[aURL] = this.serverVersions[aURL] + "_SP1";
                }
                else {
                    this.serverVersions[aURL] = aVersion;
                }
            }
        }
        this.majorVersions[aURL] = aMajorVersion;
        this.minorVersions[aURL] = aMinorVersion;
    },

    getServerVersion: function _getServerVersion(aURL) {
        if ((aURL) && (this.serverVersions[aURL])) {
            return this.serverVersions[aURL];
        }

        return "Exchange2007_SP1";
    },

    getMajorVersion: function _getMajorVersion(aURL) {
        if ((aURL) && (this.majorVersions[aURL])) {
            return this.majorVersions[aURL];
        }

        return 8;
    },

    getMinorVersion: function _getMinorVersion(aURL) {
        if ((aURL) && (this.minorVersions[aURL])) {
            return this.minorVersions[aURL];
        }

        return 1;
    },

    getURLList: function _getURLList(aCount) {
        var result = new Array();
        for (var index in this.serverVersions) {
            result.push(index);
        }
        aCount.value = result.length;
        return result;
    },

    addDataRead: function _addDataRead(aURL, aSize) {
        if (!this.dataRead[aURL]) {
            this.dataRead[aURL] = 0;
        }
        this.dataRead[aURL] += aSize;
        //		dump("addDataRead: server:"+aURL+", dataRead:"+this.dataRead[aURL]+"\n");
    },

    addDataSend: function _addDataSend(aURL, aSize) {
        if (!this.dataSend[aURL]) {
            this.dataSend[aURL] = 0;
        }
        this.dataSend[aURL] += aSize;
        //		dump("addDataSend: server:"+aURL+", dataSend:"+this.dataSend[aURL]+"\n");
    },

    // Internal methods.

    logInfo: function _logInfo(message, aDebugLevel) {

        if (!aDebugLevel) {
            var debugLevel = 1;
        }
        else {
            var debugLevel = aDebugLevel;
        }

        this.storedDebugLevel = this.globalFunctions.safeGetIntPref(null, PREF_MAINPART + "debuglevel", 0, true);
        if (debugLevel <= this.storedDebugLevel) {
            this.globalFunctions.LOG("[exchangeStatistics] " + message + " (" + this.globalFunctions.STACKshort() + ")");
        }
    },

    addXML2JXONObject: function _addXML2JXONObject() {
        this._xml2jxonCount++;
        dump(" xml2xjonCount:" + this._xml2jxonCount + "\n");
    },

    get xml2jxonCount() {
        return this._xml2jxonCount;
    },
}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeStatistics) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeStatistics = XPCOMUtils.generateNSGetFactory([mivExchangeStatistics]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeStatistics(cid);
}
