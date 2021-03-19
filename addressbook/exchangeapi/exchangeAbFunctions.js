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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

var EXPORTED_SYMBOLS = [];

if (!exchWebService) var exchWebService = {};

exchWebService.commonAbFunctions = {

    exchangePrefs: Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl."),

    /*
     * getAccounts
     * returns: a list with uuid values which represent user defined Exchange accounts
     */
    getAccounts: function _getAccounts() {
        try {
            var accounts = exchWebService.commonAbFunctions.exchangePrefs.getCharPref("accounts");
        }
        catch (err) {
            this.logInfo("no Exchange accounts found.");
            return [];
        }

        return accounts.split(",");
    },

    addAccount: function _addAccount(aAccountObject) {
        exchWebService.commonFunctions.ASSERT(aAccountObject);

        var newUUID = exchWebService.commonFunctions.getUUID();

        try {
            var accounts = exchWebService.commonAbFunctions.exchangePrefs.getCharPref("accounts");
            if (accounts != "") {
                accounts = accounts + "," + newUUID;
            }
            else {
                accounts = newUUID;
            }
        }
        catch (err) {
            var accounts = newUUID;
        }

        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("accounts", accounts);

        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".description", aAccountObject.description);
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".mailbox", aAccountObject.mailbox);
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".user", aAccountObject.user);
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".domain", aAccountObject.domain);
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".server", aAccountObject.serverUrl);

        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".folderbase", aAccountObject.folderBase);
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".folderpath", aAccountObject.folderPath);

        if (aAccountObject.folderID) {
            exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".folderid", aAccountObject.folderID);
        }
        if (aAccountObject.changeKey) {
            exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + newUUID + ".changekey", aAccountObject.changeKey);
        }

        return newUUID;
    },

    deleteAccount: function _deleteAccount(aUUID) {
        this.logInfo("deleteAccount:" + aUUID);
        var currentAccounts = this.getAccounts();
        var newAccounts = [];
        for each(var account in currentAccounts) {
            this.logInfo("  Account:" + account);
            if (account != aUUID) {
                newAccounts.push(account);
            }
        }
        this.logInfo("  accounts:" + newAccounts.join(","));
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("accounts", newAccounts.join(","));
        exchWebService.commonAbFunctions.exchangePrefs.deleteBranch("account." + aUUID);
    },

    getDescription: function _getDescription(aUUID) {
        try {
            return exchWebService.commonAbFunctions.exchangePrefs.getCharPref("account." + aUUID + ".description");
        }
        catch (err) {
            return "";
        }
    },

    setDescription: function _setDescription(aUUID, aValue) {
        exchWebService.commonAbFunctions.exchangePrefs.setCharPref("account." + aUUID + ".description", aValue);
    },

    getRootUUID: function _getRootUUID() {
        try {
            return exchWebService.commonAbFunctions.exchangePrefs.getCharPref("rootUUID");
        }
        catch (err) {
            var newRootUUID = exchWebService.commonFunctions.getUUID();
            exchWebService.commonAbFunctions.exchangePrefs.setCharPref("rootUUID", newRootUUID);
            return newRootUUID;
        }
    },

    // aQuery should be enclosed by round brackets.
    cardMatchesQuery: function _cardMatchesQuery(aQuery, aCard) {
        this.logInfo("cardMatchesQuery: aQuery=" + aQuery);

        if (!aCard) {
            return false;
        }

        var cleanQuery = aQuery.trim();

        // Check for round brackets.
        if ((cleanQuery.substr(0, 1) != "(") || (cleanQuery.substr(cleanQuery.length - 1, 1) != ")")) {
            throw "Invalid query. Missing leading or trailing round bracket";
        }

        // Remove brackets;
        cleanQuery = cleanQuery.substr(1, cleanQuery.length - 2);

        var operator = cleanQuery.substr(0, cleanQuery.indexOf("("));
        if ((operator == "or") || (operator == "and")) {
            // We have a valid operator so get the list of subquery.
            cleanQuery = cleanQuery.substr(cleanQuery.indexOf("("));
            var totalResult = false;
            while (cleanQuery.indexOf("(") > -1) {
                this.logInfo("cardMatchesQuery. cleanQuery:" + cleanQuery);
                var openBrackets = 1;
                var subQuery = "(";
                var charPos = 1;
                var tmpChar;
                while ((openBrackets > 0) && (charPos < cleanQuery.length)) {
                    tmpChar = cleanQuery.substr(charPos, 1);
                    if (tmpChar == "(") openBrackets++;
                    if (tmpChar == ")") openBrackets--;
                    subQuery = subQuery + tmpChar;
                    charPos++;
                }

                this.logInfo("cardMatchesQuery. subQuery:" + subQuery);
                var subMatches = exchWebService.commonAbFunctions.cardMatchesQuery(subQuery, aCard);
                if (subMatches) {
                    this.logInfo("cardMatchesQuery. Match on subQuery:" + subQuery);
                }
                else {
                    this.logInfo("cardMatchesQuery. NO Match on subQuery:" + subQuery);
                }
                switch (operator) {
                case "or":
                    if (subMatches) return true;
                    break;
                case "and":
                    if (!subMatches) return false;
                    totalResult = true;
                    break;
                }
                cleanQuery = cleanQuery.substr(subQuery.length);
            }
            return totalResult;

        }
        else {
            // We only have a query.
            var queryFields = cleanQuery.split(",");
            if (queryFields.length != 3) {
                throw "Invalid query. Not enough fields in '" + cleanQuery + "'";
            }
            queryFields[2] = decodeURI(queryFields[2]);
            this.logInfo("   - Field=" + queryFields[0]);
            this.logInfo("   - match=" + queryFields[1]);
            this.logInfo("   - value=" + queryFields[2]);
            switch (queryFields[1]) {
            case "c":
                if (aCard.getProperty(queryFields[0], "").toLowerCase().indexOf(queryFields[2].toLowerCase()) > -1) {
                    this.logInfo("   -- Matches card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return true;
                }
                else {
                    this.logInfo("   -- NO Match with card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return false;
                }
                break;
            case "bw":
                this.logInfo("   -'" + queryFields[0] + "'='" + aCard.getProperty(queryFields[0], "") + "' bw:'" + queryFields[2] + "'");
                if (aCard.getProperty(queryFields[0], "").toLowerCase().indexOf(queryFields[2].toLowerCase()) == 0) {
                    this.logInfo("   -- Matches card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return true;
                }
                else {
                    this.logInfo("   -- NO Match with card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return false;
                }
                break;
            case "=":
                var value = false;
                if (queryFields[2] == "TRUE") value = true;
                if (aCard.getProperty(queryFields[0], !value) == value) {
                    this.logInfo("   -- Matches card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return true;
                }
                else {
                    this.logInfo("   -- NO Match with card." + queryFields[0] + "=" + aCard.getProperty(queryFields[0], "") + ", value=" + queryFields[2]);
                    return false;
                }
                break;
            }
        }

    },

    filterCardsOnQuery: function _filterCarsOnQuery(aQuery, aCards, aDirectory) {
        var result = {};
        for (var card in fixIterator(aCards, Ci.mivExchangeAbCard)) {
            if (exchWebService.commonAbFunctions.cardMatchesQuery(aQuery, card)) {
                result[card.localId] = card;
            }
        }
        return result;
    },

    paramsToArray: function _paramsToArray(aParams, aSplitcharacter) {
        var tmpList = aParams.split(aSplitcharacter);
        var result = {};
        for (var index in tmpList) {
            var tmpParam = tmpList[index].substr(0, tmpList[index].indexOf("="));
            var tmpValue = tmpList[index].substr(tmpList[index].indexOf("=") + 1);
            result[tmpParam] = tmpValue;
        }
        return result;
    },

    logInfo: function _logInfo(message, aDebugLevel) {

        if (!aDebugLevel) {
            var debugLevel = 1;
        }
        else {
            var debugLevel = aDebugLevel;
        }

        var prefB = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

        var doDebug = exchWebService.commonFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.contacts.debug", false, true);
        if (!doDebug) {
            return;
        }

        var storedDebugLevel = exchWebService.commonFunctions.safeGetIntPref(prefB, "extensions.1st-setup.contacts.debuglevel", 0, true);

        if (debugLevel <= storedDebugLevel) {
            exchWebService.commonFunctions.LOG("[contacts] " + message + " (" + exchWebService.commonFunctions.STACKshort() + ")");
        }
    },

}

exchWebService.commonAbFunctions.logInfo("exchangeAbFunctions: init.");
