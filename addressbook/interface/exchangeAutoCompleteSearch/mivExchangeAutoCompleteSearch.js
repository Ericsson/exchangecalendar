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

Cu.import("resource:///modules/mailServices.js");

Cu.import("resource://exchangeaddress/exchangeAbFunctions.js");

function mivExchangeAutoCompleteSearch() {

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    MailServices.ab.addAddressBookListener(this, Ci.nsIAbListener.itemAdded);
}

var mivExchangeAutoCompleteSearchGUID = "c073f5cf-15d7-47d4-b30e-9498fd728544";

mivExchangeAutoCompleteSearch.prototype = {

    _searches: {},
    _observer: null,
    _galSearches: {},
    _firstCall: true,

    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAutoCompleteSearch,
        Ci.nsIAutoCompleteSearch,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    classDescription: "Exchange Autocomplete Search",

    classID: components.ID("{" + mivExchangeAutoCompleteSearchGUID + "}"),
    contractID: "@mozilla.org/autocomplete/search;1?name=exchangeAutoCompleteSearch",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeAutoCompleteSearch,
            Ci.nsIAutoCompleteSearch,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    observe: function (subject, topic, data) {
        // Do your stuff here.
        var uuid;
        for each(var search in this._searches) {
            if (search.query == data) {
                uuid = search.uuid;
            }
        }

        if (!uuid) return;

        switch (topic) {
        case "onExchangeGALSearchStart":
            if (!this._galSearches[uuid]) {
                this._galSearches[uuid] = 0;
            }
            this._galSearches[uuid]++;
            break;
        case "onExchangeGALSearchEnd":
            if (this._galSearches[uuid] > 0) {
                this._galSearches[uuid]--;
                if (this._galSearches[uuid] == 0) {
                    if (this._searches[uuid].listener) {
                        this._searches[uuid].autoCompleteResult.setSearchResult(this._searches[uuid].autoCompleteResult.matchCount > 0 ? this._searches[uuid].autoCompleteResult.RESULT_SUCCESS
                            : this._searches[uuid].autoCompleteResult.RESULT_NOMATCH);
                        this._searches[uuid].listener.onSearchResult(this, this._searches[uuid].autoCompleteResult);
                    }

                }
            }
            else {
                dump(" ???????? Going below zero (0)\n");
            }
            break;
        }
    },

    /*
     * Search for a given string and notify a listener (either synchronously
     * or asynchronously) of the result
     *
     * @param searchString - The string to search for
     * @param searchParam - An extra parameter
     * @param previousResult - A previous result to use for faster searching
     * @param listener - A listener to notify when the search is complete
     */
    //void startSearch(in AString searchString,
    //                 in AString searchParam,
    //                 in nsIAutoCompleteResult previousResult,
    //                 in nsIAutoCompleteObserver listener);

    startSearch: function _startSearch(searchString, searchParam, previousResult, listener) {
        /*		dump("mivExchangeAutoCompleteSearch: startSearch\n");
        		dump("    searchString:"+searchString+"\n");
        		dump("     searchParam:"+searchParam+"\n");
        		dump("  previousResult:"+previousResult+"\n");
        		dump("        listener:"+listener+"\n\n");
        */
        searchString = encodeURI(searchString);
        var uuid = this.globalFunctions.getUUID();
        var query = "(or(PrimaryEmail,c," + searchString + ")(DisplayName,c," + searchString + ")(FirstName,c," + searchString + ")(LastName,c," + searchString + "))";

        this._searches[uuid] = {
            "uuid": uuid,
            "searchString": searchString,
            "query": query,
            "searchParam": searchParam,
            "previousResult": previousResult,
            "listener": listener,
        };

        if (previousResult) {
            previousResult.clearResults();
            this._searches[uuid]["autoCompleteResult"] = previousResult;
        }
        else {
            this._searches[uuid]["autoCompleteResult"] = Cc["@1st-setup.nl/exchange/autocompleteresult;1"].createInstance(Ci.mivExchangeAutoCompleteResult);
        }


        if (this._firstCall) {
            var observerService = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            observerService.addObserver(this, "onExchangeGALSearchStart", false);
            observerService.addObserver(this, "onExchangeGALSearchEnd", false);
            this._firstCall = false;
        }

        this._searches[uuid].autoCompleteResult.setSearchString(searchString);
        this._searches[uuid]["rootDir"] = MailServices.ab.getDirectory("exchWebService-contactRoot-directory://?" + query);

        /*		if (this._searches[uuid]["rootDir"]) {
        			var childCards = this._searches[uuid]["rootDir"].childCards;
        			while (childCards.hasMoreElements()) {
        				this._searches[uuid].autoCompleteResult.addResult(childCards.getNext());
        			}
        		}
        */
    },

    onItemAdded: function _onItemAdded(parentDir, item) {
        var rightDir = parentDir.QueryInterface(Ci.nsIAbDirectory);
        if (!rightDir) {
            return;
        }

        if (item.QueryInterface(Ci.mivExchangeAbCard)) {
            // Check to which search it belongs
            for each(var search in this._searches) {
                if (rightDir.URI.indexOf(search.query) > -1) {
                    dump(" 1.@@@ displayName:" + item.displayName + ", localId:" + item.localId + "\n");
                    search.autoCompleteResult.addResult(item);
                }
            }
        }
    },

    /*
     * Stop all searches that are in progress
     */
    //void stopSearch();
    stopSearch: function _stopSearch() {
        //dump("mivExchangeAutoCompleteSearch: stopSearch\n");
        for each(var search in this._searches) {
            // Clearing the results because it appears the are being reused.
            search.autoCompleteResult.clearResults();
        }

        this._searches = {};

        if (!this._firstCall) {
            var observerService = Cc["@mozilla.org/observer-service;1"]
                .getService(Ci.nsIObserverService);
            observerService.removeObserver(this, "onExchangeGALSearchStart");
            observerService.removeObserver(this, "onExchangeGALSearchEnd");
        }
        this._firstCall = true;
    },


};

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAutoCompleteSearch) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAutoCompleteSearch = XPCOMUtils.generateNSGetFactory([mivExchangeAutoCompleteSearch]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAutoCompleteSearch(cid);
}
