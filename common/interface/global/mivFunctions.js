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
 * -- Global Functions for Exchange Calendar and Exchange Contacts.
 * -- For Thunderbird.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: info@1st-setup.nl
 *
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource:///modules/Services.jsm");

Cu.import("resource://exchangecommoninterfaces/xml2jxon/mivIxml2jxon.js");
Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

function mivFunctions() {
    // Mozilla helpers
    this.domParser = Cc["@mozilla.org/xmlextras/domparser;1"]
        .getService(Ci.nsIDOMParser);
    this.xmlSerializer = Cc["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Ci.nsIDOMSerializer);
}

mivFunctions.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivFunctions,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Global functions.",
    classID: components.ID("{c7543f10-e2d1-44b3-ae37-9221e0d5b524}"),
    contractID: "@1st-setup.nl/global/functions;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    doEncodeFolderSpecialChars: function _doEncodeFolderSpecialChars(str, r1) {
        var result = str;
        switch (r1) {
        case "/":
            result = "%2F";
            break;
        case "%":
            result = "%25";
            break;
        }

        return result;
    },

    encodeFolderSpecialChars: function _encodeFolderSpecialChars(aStr) {
        // characters like "/" (forward slash) is converted to %2F
        // Character "%" (percentage) is converted to %25
        var result = aStr.toString();
        result = result.replace(/([\x2F|\x25])/g, this.doEncodeFolderSpecialChars);
        return result;
    },

    doDecodeFolderSpecialChars: function _doDecodeFolderSpecialChars(str, r1) {
        var result = str;
        switch (r1) {
        case "%2F":
            result = "/";
            break;
        case "%25":
            result = "%";
            break;
        }
        return result;
    },

    decodeFolderSpecialChars: function _decodeFolderSpecialChars(aStr) {
        // Does the oposit of encodeFolderSpecialChars
        var result = aStr.toString();
        result = result.replace(/(\x252F|\x2525)/g, this.doDecodeFolderSpecialChars);
        return result;
    },

    ecTZService: function _ecTZService() {
        if (Cc["@mozilla.org/calendar/timezone-service;1"]) {
            return Cc["@mozilla.org/calendar/timezone-service;1"]
                .getService(Ci.calITimezoneService);
        }

        return null;
    },

    ecDefaultTimeZone: function _ecDefaultTimeZone() {
        if (this.ecTZService()) {
            return this.ecTZService().defaultTimezone;
        }
        return null;
    },

    ecUTC: function _ecUTC() {
        if (this.ecTZService()) {
            return this.ecTZService().UTC;
        }

        return null;
    },

    convertDurationToSeconds: function _convertDurationToSeconds(aDuration) {
        if (!aDuration) return null;

        var tmpStr = aDuration;
        var multiplier = 1;
        if (tmpStr.substr(0, 1) == "-") {
            multiplier = -1;
            tmpStr = tmpStr.substr(1);
        }

        var total = 0;
        var subtotal = 0;

        if (tmpStr.substr(0, 2) == "PT") {
            tmpStr = tmpStr.substr(2);

            var counter = 0;
            while (counter < tmpStr.length) {
                if (isNaN(tmpStr.substr(counter, 1))) {
                    switch (tmpStr.substr(counter, 1).toUpperCase()) {
                    case "D":
                        subtotal = subtotal * 3600 * 24;
                        break;
                    case "H":
                        subtotal = subtotal * 3600;
                        break;
                    case "M":
                        subtotal = subtotal * 60;
                        break;
                    case "S":
                        subtotal = subtotal;
                        break;
                    }
                    total = total + subtotal;
                    subtotal = 0;
                    //if (this.debug) this.logInfo(" ++ total:"+total);
                }
                else {
                    subtotal = (subtotal * 10) + Number(tmpStr.substr(counter, 1));
                    //if (this.debug) this.logInfo(" ++ subtotal:"+subtotal);
                }
                counter = counter + 1;
            }

        }


        return total * multiplier;

    },

    splitUriGetParams: function _splitUriGetParams(aUri) {
        if (aUri.path.indexOf("?") > -1) {
            // We have get params.
            let getParamsStr = aUri.path.substr(aUri.path.indexOf("?") + 1);
            // Split is in the individual params.
            var getParams = {};
            while (getParamsStr.indexOf("&") > -1) {
                var tmpParam = getParamsStr.substr(0, getParamsStr.indexOf("&"));
                getParamsStr = getParamsStr.substr(getParamsStr.indexOf("&") + 1);
                if (tmpParam.indexOf("=") > -1) {
                    getParams[tmpParam.substr(0, tmpParam.indexOf("="))] = decodeURIComponent(tmpParam.substr(tmpParam.indexOf("=") + 1));
                }
            }
            if (getParamsStr.indexOf("=") > -1) {
                getParams[getParamsStr.substr(0, getParamsStr.indexOf("="))] = decodeURIComponent(getParamsStr.substr(getParamsStr.indexOf("=") + 1));
            }

            return getParams;
        }

        return null;
    },


    getBranch: function _getBranche(aName) {
        var lBranche = "";
        var lName = "";
        var lastIndexOf = aName.lastIndexOf(".");
        if (lastIndexOf > -1) {
            lBranche = aName.substr(0, lastIndexOf + 1);
            lName = aName.substr(lastIndexOf + 1);
        }
        else {
            lName = aName;
        }

        //this.LOG("aName:"+aName+", lBranche:"+lBranche+", lName:"+lName+"|");

        return {
            branch: Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch(lBranche),
            name: lName
        };
    },

    safeGetCharPref: function _safeGetCharPref(aBranch, aName, aDefaultValue, aCreateWhenNotAvailable) {
        if (!aBranch) {
            //			return aDefaultValue;
            var realBranche = this.getBranch(aName);
            if (!realBranche.branch) {
                return aDefaultValue;
            }
            aBranch = realBranche.branch;
            aName = realBranche.name;
        }

        if (!aCreateWhenNotAvailable) {
            aCreateWhenNotAvailable = false;
        }

        try {
            return aBranch.getCharPref(aName);
        }
        catch (err) {
            if (aCreateWhenNotAvailable) {
                try {
                    aBranch.setCharPref(aName, aDefaultValue);
                }
                catch (er) {
                    aBranch.deleteBranch(aName);
                    aBranch.setCharPref(aName, aDefaultValue);
                }
            }
            return aDefaultValue;
        }
    },

    safeGetBoolPref: function _safeGetBoolPref(aBranch, aName, aDefaultValue, aCreateWhenNotAvailable) {
        if (!aBranch) {
            //			return aDefaultValue;
            var realBranche = this.getBranch(aName);
            if (!realBranche.branch) {
                return aDefaultValue;
            }
            aBranch = realBranche.branch;
            aName = realBranche.name;
        }

        if (!aCreateWhenNotAvailable) {
            aCreateWhenNotAvailable = false;
        }

        try {
            return aBranch.getBoolPref(aName);
        }
        catch (err) {
            if (aCreateWhenNotAvailable) {
                try {
                    aBranch.setBoolPref(aName, aDefaultValue);
                }
                catch (er) {
                    aBranch.deleteBranch(aName);
                    aBranch.setBoolPref(aName, aDefaultValue);
                }
            }
            return aDefaultValue;
        }
    },

    safeGetIntPref: function _safeGetIntPref(aBranch, aName, aDefaultValue, aCreateWhenNotAvailable) {
        if (!aBranch) {
            //			return aDefaultValue;
            var realBranche = this.getBranch(aName);
            if (!realBranche.branch) {
                return aDefaultValue;
            }
            aBranch = realBranche.branch;
            aName = realBranche.name;
        }

        if (!aCreateWhenNotAvailable) {
            aCreateWhenNotAvailable = false;
        }

        try {
            return aBranch.getIntPref(aName);
        }
        catch (err) {
            if (aCreateWhenNotAvailable) {
                try {
                    aBranch.setIntPref(aName, aDefaultValue);
                }
                catch (er) {
                    aBranch.deleteBranch(aName);
                    aBranch.setIntPref(aName, aDefaultValue);
                }
            }
            return aDefaultValue;
        }
    },

    // Following code was taken from calUtils.jsm in Lightning

    // Code from calUtils.jsm

    // Following code was taken from calUtils.js in Lightning and modified

    /**
     * Creates a string bundle.
     *
     * @param bundleURL The bundle URL
     * @return string bundle
     */
    getStringBundle: function _getStringBundle(bundleURL) {
        let service = Cc["@mozilla.org/intl/stringbundle;1"]
            .getService(Ci.nsIStringBundleService);
        return service.createBundle(bundleURL);
    },

    /**
     * Gets the value of a string in a .properties file from the calendar bundle
     *
     * @param aBundleName  the name of the properties file.  It is assumed that the
     *                     file lives in chrome://calendar/locale/
     * @param aStringName  the name of the string within the properties file
     * @param aParams      optional array of parameters to format the string
     * @param aComponent   required stringbundle component name
     */
    getString: function _getString(aBundleName, aStringName, aParams, aComponent) {
        try {
            if (!aComponent) {
                return "";
            }
            var propName = "chrome://" + aComponent + "/locale/" + aBundleName + ".properties";
            var props = this.getStringBundle(propName);

            if (aParams && aParams.length) {
                return props.formatStringFromName(aStringName, aParams, aParams.length);
            }
            else {
                return props.GetStringFromName(aStringName);
            }
        }
        catch (ex) {
            var s = ("Failed to read '" + aStringName + "' from " + propName + ".");
            Cu.reportError(s + " Error: " + ex);
            return s;
        }
    },

    /**
     * Make a UUID using the UUIDGenerator service available, we'll use that.
     */
    getUUID: function _getUUID() {
        // generate uuids without braces to avoid problems with
        if (!this.uuidGen) {
            this.uuidGen = Cc["@mozilla.org/uuid-generator;1"]
                .getService(Ci.nsIUUIDGenerator);
        }
        return this.uuidGen.generateUUID().toString().replace(/[{}]/g, '');
    },


    /* Shortcut to the console service */
    getConsoleService: function _getConsoleService() {
        return Cc["@mozilla.org/consoleservice;1"]
            .getService(Ci.nsIConsoleService);
    },


    /****
     **** debug code
     ****/

    /**
     * Logs a string or an object to both stderr and the js-console only in the case
     * where the calendar.debug.log pref is set to true.
     *
     * @param aArg  either a string to log or an object whose entire set of
     *              properties should be logged.
     */
    shouldLog: function _shouldLog() {
        var prefB = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefBranch);
        return this.safeGetBoolPref(prefB, "extensions.1st-setup.debug.log", false, true);
    },

    LOG: function _LOG(aArg) {

        if (!this.shouldLog()) {
            return;
        }

        try {
            this.ASSERT(aArg, "Bad log argument.", true);
        }
        catch (exc) {
            aArg = exc;
        }

        var string;
        // We should just dump() both String objects, and string primitives.
        if (!(aArg instanceof String) && !(typeof (aArg) == "string")) {
            var string = "1st-setup: Logging object...\n";
            for (var prop in aArg) {
                string += prop + ': ' + aArg[prop] + '\n';
            }
            string += "End object\n";
        }
        else {
            var dt = new Date();
            string = "ExchangeCalendar [" + dt.toISOString() + "]: " + aArg;
        }

        // xxx todo consider using function debug()
        dump(string + '\n');
        this.getConsoleService().logStringMessage(string);

        this.writeToLogFile(string);

    },

    writeToLogFile: function _writeToLogFile(aString) {
        var prefB = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

        var file = this.safeGetCharPref(prefB, "extensions.1st-setup.debug.file", "/tmp/exchangecalendar.log", true);
        if (file != "") {
            // file is nsIFile, data is a string  
            //this.getConsoleService().logStringMessage(" >>>>>>>>>>>>>>>");

            var localFile = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);

            try {
                localFile.initWithPath(file);
            }
            catch (er) {
                return;
            }

            var foStream = Cc["@mozilla.org/network/file-output-stream;1"].
            createInstance(Ci.nsIFileOutputStream);

            try {
                // On startup create a new file otherwise append.  
                if (!this.debugFileInitialized) {
                    foStream.init(localFile, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0);
                    this.debugFileInitialized = true;
                }
                else {
                    foStream.init(localFile, 0x02 | 0x08 | 0x10, parseInt("0666", 8), 0);
                }
            }
            catch (er) {
                return;
            }

            // if you are sure there will never ever be any non-ascii text in data you can   
            // also call foStream.writeData directly  
            var converter = Cc["@mozilla.org/intl/converter-output-stream;1"].
            createInstance(Ci.nsIConverterOutputStream);
            converter.init(foStream, "UTF-8", 0, 0);
            converter.writeString(aString + "\n");
            converter.close(); // this closes foStream  
        }
    },

    /**
     * Dumps a warning to both console and js console.
     *
     * @param aMessage warning message
     */
    WARN: function _WARN(aMessage) {
        dump("1st-setup: Warning: " + aMessage + '\n');
        var scriptError = Cc["@mozilla.org/scripterror;1"]
            .createInstance(Ci.nsIScriptError);
        scriptError.init("1st-setup: " + aMessage, null, null, 0, 0,
            Ci.nsIScriptError.warningFlag,
            "component javascript");
        this.getConsoleService().logMessage(scriptError);
    },

    /**
     * Dumps an error to both console and js console.
     *
     * @param aMessage error message
     */
    ERROR: function _ERROR(aMessage) {
        dump("1st-setup: Error: " + aMessage + '\n');
        var scriptError = Cc["@mozilla.org/scripterror;1"]
            .createInstance(Ci.nsIScriptError);
        scriptError.init("1st-setup: " + aMessage, null, null, 0, 0,
            Ci.nsIScriptError.errorFlag,
            "component javascript");
        this.getConsoleService().logMessage(scriptError);
    },

    /**
     * Returns a string describing the current js-stack with filename and line
     * numbers.
     *
     * @param aDepth (optional) The number of frames to include. Defaults to 5.
     * @param aSkip  (optional) Number of frames to skip
     */
    STACK: function _STACK(aDepth, aSkip) {
        let depth = aDepth || 10;
        let skip = aSkip || 0;
        let stack = "";
        let frame = components.stack.caller;
        for (let i = 1; i <= depth + skip && frame; i++) {
            if (i > skip) {
                stack += i + ": [" + frame.filename + ":"
                    + frame.lineNumber + "] " + frame.name + "\n";
            }
            frame = frame.caller;
        }
        return stack;
    },

    STACKshort: function _STACKshort() {

        let depth = 1;
        let skip = 1;
        let stack = "";
        let frame = components.stack.caller;
        for (let i = 1; i <= depth + skip && frame; i++) {
            if (i > skip) {
                var filename;
                if (frame.filename) {
                    filename = frame.filename.replace(/^.*(\\|\/|\:)/, '');
                }
                else {
                    filename = "(null)";
                }
                stack += frame.name + " in " + filename + ":" + frame.lineNumber;
            }
            frame = frame.caller;
        }

        return stack;
    },

    /**
     * Logs a message and the current js-stack, if aCondition fails
     *
     * @param aCondition  the condition to test for
     * @param aMessage    the message to report in the case the assert fails
     * @param aCritical   if true, throw an error to stop current code execution
     *                    if false, code flow will continue
     *                    may be a result code
     */
    ASSERT: function _ASSERT(aCondition, aMessage, aCritical) {
        if (aCondition) {
            return;
        }

        let string = "Assert failed: " + aMessage + '\n' + this.STACK(0, 1);
        if (aCritical) {
            throw new components.Exception(string,
                aCritical === true ? Cr.NS_ERROR_UNEXPECTED : aCritical);
        }
        else {
            Cu.reportError(string);
        }
    },

    // End of functions from calUtils.js

    CreateSimpleEnumerator: function _CreateSimpleEnumerator(aArray) {
        return {
            _i: 0,
            QueryInterface: XPCOMUtils.generateQI([Ci.nsISimpleEnumerator]),
            hasMoreElements: function CSE_hasMoreElements() {
                return this._i < aArray.length;
            },
            getNext: function CSE_getNext() {
                return aArray[this._i++];
            }
        };
    },

    CreateSimpleObjectEnumerator: function _CreateSimpleObjectEnumerator(aObj) {
        return {
            _i: 0,
            _keys: Object.keys(aObj),
            QueryInterface: XPCOMUtils.generateQI([Ci.nsISimpleEnumerator]),
            hasMoreElements: function CSOE_hasMoreElements() {
                return this._i < this._keys.length;
            },
            getNext: function CSOE_getNext() {
                return aObj[this._keys[this._i++]];
            }
        };
    },

    copyPreferences: function _copyPreferences(aFromPrefs, aToPrefs) {
        var children = aFromPrefs.getChildList("");
        var count = 0;
        if (children.length > 0) {
            // Move prefs from old location to new location.
            for (var index in children) {
                count++;
                switch (aFromPrefs.getPrefType(children[index])) {
                case aFromPrefs.PREF_STRING:
                    aToPrefs.setCharPref(children[index], aFromPrefs.getCharPref(children[index]));
                    break;
                case aFromPrefs.PREF_INT:
                    aToPrefs.setIntPref(children[index], aFromPrefs.getIntPref(children[index]));
                    break;
                case aFromPrefs.PREF_BOOL:
                    aToPrefs.setBoolPref(children[index], aFromPrefs.getBoolPref(children[index]));
                    break;
                }
            }

        }
        return count;
    },

    xmlToJxon: function _xmlToJxon(aXMLString) {
        if ((!aXMLString) || (aXMLString == "")) {
            return null;
        }

        try {
            var result = new mivIxml2jxon(aXMLString, 0, null);
        }
        catch (exc) {
            this.LOG("xmlToJxon: Error processXMLString:" + exc + ".(" + aXMLString + ")");
            result = null;
        }

        return result;
    },

    urlToPath: function _urlToPath(aPath) {

        if (!aPath || !/^file:/.test(aPath))
            return;
        var rv;
        var ph = Cc["@mozilla.org/network/protocol;1?name=file"]
            .createInstance(Ci.nsIFileProtocolHandler);
        rv = ph.getFileFromURLSpec(aPath).path;
        return rv;
    },

    chromeToPath: function _chromeToPath(aPath) {

        if (!aPath || !(/^chrome:/.test(aPath)))
            return; //not a chrome url
        var rv;

        var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci["nsIIOService"]);
        var uri = ios.newURI(aPath, "UTF-8", null);
        var cr = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci["nsIChromeRegistry"]);
        rv = cr.convertChromeURL(uri).spec;

        if (/^file:/.test(rv))
            rv = this.urlToPath(rv);
        else
            rv = this.urlToPath("file://" + rv);

        return rv;
    },

    splitOnCharacter: function _splitOnCharacter(aString, aStartPos, aSplitCharacter) {
        if (!aString) {
            return null;
        }

        var tmpPos = aStartPos;
        var result = "";
        var notClosed = true;
        var notQuoteOpen = true;
        var quotesUsed = "";
        var strLen = aString.length;
        var splitCharIsArray = Array.isArray(aSplitCharacter);
        while ((tmpPos < strLen) && (notClosed)) {
            if ((aString[tmpPos] == "'") || (aString[tmpPos] == '"')) {
                // We found quotes. Do they belong to our string.
                if (notQuoteOpen) {
                    quotesUsed = aString[tmpPos];
                    notQuoteOpen = false;
                }
                else {
                    if (aString[tmpPos] == quotesUsed) {
                        quotesUsed = "";
                        notQuoteOpen = true;
                    }
                }
            }

            var hitSplitCharacter = false;
            if (notQuoteOpen) {
                if (splitCharIsArray) {
                    for (var index in aSplitCharacter) {
                        if (aString.substr(tmpPos, aSplitCharacter[index].length) == aSplitCharacter[index]) {
                            hitSplitCharacter = true;
                            break;
                        }
                    }
                }
                else {
                    if (aString.substr(tmpPos, aSplitCharacter.length) == aSplitCharacter) {
                        hitSplitCharacter = true;
                    }
                }
            }

            if (hitSplitCharacter) {
                notClosed = false;
            }
            else {
                result += aString[tmpPos];
            }
            tmpPos++;
        }

        if (!notClosed) {
            return result;
        }
        else {
            return null;
        }
    },

    findCharacter: function _findCharacter(aString, aStartPos, aChar) {
        if (!aString) return -1;

        var pos = aStartPos;
        var strLength = aString.length;
        while ((pos < strLength) && (aString[pos] != aChar)) {
            pos++;
        }

        if (pos < strLength) {
            return pos;
        }

        return -1;
    },

    findString: function _findString(aString, aStartPos, aNeedle) {
        if (!aString) return -1;

        if (aNeedle.length == 1) {
            return this.findCharacter(aString, aStartPos, aNeedle[0]);
        }

        var pos = aStartPos;
        var needleLength = aNeedle.length;
        var strLength = aString.length - needleLength + 1;
        while ((pos < strLength) && (aString.substr(pos, needleLength) != aNeedle)) {
            pos++;
        }

        if (pos < strLength) {
            return pos;
        }

        return -1;
    },

    copyCalendarSettings: function _copyCalendarSettings(aFromId, aToId) {
        var fromCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + aFromId + ".");

        if (aToId == undefined) {
            var toId = this.getUUID();
        }
        else {
            var toId = aToId;
        }

        var toCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + toId + ".");


        this.copyPreferences(fromCalPrefs, toCalPrefs);
        toCalPrefs.deleteBranch("folderProperties");

        fromCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry." + aFromId + ".");

        toCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry." + toId + ".");

        this.copyPreferences(fromCalPrefs, toCalPrefs);

        return toId;
    },

    addCalendarById: function _addCalendarById(aId) {
        var ioService = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
        var tmpURI = ioService.newURI("https://auto/" + aId, null, null);

        var calManager = Cc["@mozilla.org/calendar/manager;1"]
            .getService(Ci.calICalendarManager);
        var newCal = calManager.createCalendar("exchangecalendar", tmpURI);

        newCal.id = aId;

        calManager.registerCalendar(newCal);
    },

    fromOctal: function _fromOctal(aStr) {
        var len = aStr.length;
        var result = 0;
        var counter = 0;
        while (len > 0) {
            result += aStr[len - 1] * Math.pow(8, counter);
            counter++;
            len--;
        }
        return result;
    },

    fromHTML2Text: function _fromHTML2Text(aString) {
        //dump("-."+aString+".-\n\n");
        var html = aString.replace(/<style([\s\S]*?)<\/style>/gi, '');
        html = html.replace(/<script([\s\S]*?)<\/script>/gi, '');
        html = html.replace(/\n/g, '');
        html = html.replace(/\r/g, '');
        html = html.replace(/<\/div>/ig, '\n');
        html = html.replace(/<\/li>/ig, '\n');
        html = html.replace(/<li>/ig, '  *  ');
        html = html.replace(/<\/ul>/ig, '\n');
        html = html.replace(/<\/p>/ig, '\n');
        html = html.replace(/<br\s*[\/]?>/gi, "\n");
        html = html.replace(/<[^>]+>/ig, '');
        html = html.replace(/\&nbsp\;/g, '');

        return convertSpecialCharatersFromXML(html);
    },

    fromText2HTML: function _fromText2HTML(aString) {
        let parsedHtml = null;

        if (!aString) {
            aString = "";
        }

        parsedHtml = this.domParser.parseFromString(aString, 'text/html');

        return this.xmlSerializer.serializeToString(parsedHtml);
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivFunctions) {
            // Load main script from lightning that we need.
            NSGetFactory.mivFunctions = XPCOMUtils.generateNSGetFactory([mivFunctions]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivFunctions(cid);
}
