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

function mivExchangeAutoCompleteResult() {

    //dump("mivExchangeAutoCompleteResult init\n");
    this._cards = new Array();
}

var mivExchangeAutoCompleteResultGUID = "64587912-6dc2-413c-93ad-f062e21feaeb";

mivExchangeAutoCompleteResult.prototype = {

    _searchString: "",
    _searchResult: this.RESULT_NOMATCH_ONGOING,

    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAutoCompleteResult,
        Ci.nsIAutoCompleteResult,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    classDescription: "Exchange Autocomplete Search Result",

    classID: components.ID("{" + mivExchangeAutoCompleteResultGUID + "}"),
    contractID: "@1st-setup.nl/exchange/autocompleteresult;1",
    flags: Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeAutoCompleteResult,
            Ci.nsIAutoCompleteResult,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    /**
     * Possible values for the searchResult attribute
     */
    //  const unsigned short RESULT_IGNORED = 1; /* indicates invalid searchString */
    //  const unsigned short RESULT_FAILURE = 2; /* indicates failure */
    //  const unsigned short RESULT_NOMATCH = 3; /* indicates success with no matches
    //                                              and that the search is complete */
    //  const unsigned short RESULT_SUCCESS = 4; /* indicates success with matches
    //                                              and that the search is complete */
    //  const unsigned short RESULT_NOMATCH_ONGOING = 5; /* indicates success 
    //                                                      with no matches
    //                                                      and that the search 
    //                                                      is still ongoing */
    //  const unsigned short RESULT_SUCCESS_ONGOING = 6; /* indicates success 
    //                                                      with matches
    //                                                      and that the search 
    //                                                      is still ongoing */
    /**
     * The original search string
     */
    //readonly attribute AString searchString;
    get searchString() {
        //dump("searchString:"+this._searchString+"\n");
        return this._searchString;
    },

    setSearchString: function _setSearchString(aString) {
        this._searchString = aString;
    },

    /**
     * The result of the search
     */
    //readonly attribute unsigned short searchResult;
    get searchResult() {
        //dump("searchResult:"+this._searchResult+"\n");
        return this._searchResult;
    },

    setSearchResult: function _setSearchResult(aValue) {
        this._searchResult = aValue;
    },

    /**
     * Index of the default item that should be entered if none is selected
     */
    //readonly attribute long defaultIndex;
    get defaultIndex() {
        //dump("defaultIndex\n");
        if (this._cards.length == 0) {
            return -1;
        }

        return 0;
    },

    /**
     * A string describing the cause of a search failure
     */
    //readonly attribute AString errorDescription;
    get errorDescription() {
        //dump("errorDescription\n");
        return null;
    },

    /**
     * The number of matches
     */
    //readonly attribute unsigned long matchCount;
    get matchCount() {
        //dump("matchCount:"+this._cards.length+"\n");
        return this._cards.length;
    },

    /**
     * If true, the results will not be displayed in the popup. However,
     * if a default index is specified, the default item will still be
     * completed in the input.
     */
    //readonly attribute boolean typeAheadResult;
    get typeAheadResult() {
        return this._cards.length <= 1;
    },

    /**
     * Get the value of the result at the given index
     */
    //AString getValueAt(in long index);
    getValueAt: function _getValueAt(aIndex) {
        //dump("getValueAt["+aIndex+"]:"+this._cards[aIndex].primaryEmail+"\n");
        if ((this._cards[aIndex].isMailList) && (this._cards[aIndex].primaryEmail.indexOf("@") == -1)) {
            //dump("  >> I am a mailingList:"+this._cards[aIndex].mailListURI+"\n");
            var dir = MailServices.ab.getDirectory(this._cards[aIndex].mailListURI);
            if (dir) {
                var emailList = "";
                var childNodes = dir.childCards;
                while (childNodes.hasMoreElements()) {
                    if (emailList != "") {
                        emailList = emailList + ",";
                    }
                    var tmpCard = childNodes.getNext().QueryInterface(Ci.mivExchangeAbCard);
                    //dump(" || "+tmpCard+"\n");
                    //					emailList = emailList + tmpCard.displayName + " <" + tmpCard.primaryEmail + ">" ;
                    emailList = emailList + tmpCard.firstName + " " + tmpCard.lastName + " <" + tmpCard.primaryEmail + ">";
                }
                //dump("  ++ addr:"+emailList+"\n");
                return emailList;
            }
            //dump("  -- mailListURI:"+this._cards[aIndex].mailListURI+"\n");
        }
        //		return this._cards[aIndex].displayName + " <" + this._cards[aIndex].primaryEmail + ">";
        //dump("firstname:"+this._cards[aIndex].firstName+", lastname:"+this._cards[aIndex].lastName+", displayName:"+this._cards[aIndex].displayName+"\n");
        if ((this._cards[aIndex].firstName != "") || (this._cards[aIndex].lastName != "")) {
            return this._cards[aIndex].firstName + " " + this._cards[aIndex].lastName + " <" + this._cards[aIndex].primaryEmail + ">";
        }
        else {
            if (this._cards[aIndex].displayName != "") {
                return this._cards[aIndex].displayName + " <" + this._cards[aIndex].primaryEmail + ">";
            }
            else {
                return this._cards[aIndex].primaryEmail;
            }
        }
    },

    /**
     * This returns the string that is displayed in the dropdown
     */
    //AString getLabelAt(in long index);
    getLabelAt: function _getLabelAt(aIndex) {
        //dump("getLabelAt: aIndex:"+aIndex+"\n");
        return this.getValueAt(aIndex);
    },

    /**
     * Get the comment of the result at the given index
     */
    //AString getCommentAt(in long index);
    getCommentAt: function _getCommentAt(aIndex) {
        //dump("getCommentAt: aIndex:"+aIndex+"\n");
        if ((this._cards[aIndex].isMailList) && (this._cards[aIndex].primaryEmail.indexOf("@") == -1)) {
            return this._cards[aIndex].displayName;
        }
        return "Exchange Contact";
    },

    /**
     * Get the style hint for the result at the given index
     */
    //AString getStyleAt(in long index);
    getStyleAt: function _getStyleAt(aIndex) {
        //dump("getStyleAt: aIndex:"+aIndex+"\n");
        return "exchange-abook";
    },

    /**
     * Get the image of the result at the given index
     */
    //AString getImageAt(in long index);
    getImageAt: function _getImageAt(aIndex) {
        //dump("getImageAt: aIndex:"+aIndex+"\n");
        return "chrome://exchangecommon/content/exchange-addrbook.png";
    },

    /**
     * Get the final value that should be completed when the user confirms
     * the match at the given index.
     */
    //AString getFinalCompleteValueAt(in long index);
    getFinalCompleteValueAt: function _getFinalCompleteValueAt(aIndex) {
        return this.getValueAt(aIndex)
    },

    /**
     * Remove the value at the given index from the autocomplete results.
     * If removeFromDb is set to true, the value should be removed from
     * persistent storage as well.
     */
    //void removeValueAt(in long rowIndex, in boolean removeFromDb);
    removeValueAt: function _removeValueAt(aRowIndex, removeFromDb) {},

    //void addResult(in mivExchangeAbCard aCard);
    addResult: function _addResult(aCard) {
        // First check if this card is not already in the list
        var cardExists = false;
        for each(var card in this._cards) {
            if (card.localId == aCard.localId) {

                cardExists = true;
                break;
            }
        }
        if (!cardExists) {
            //dump("addResult:"+aCard.displayName+", primaryEmail:"+aCard.primaryEmail+", length:"+this._cards.length+"\n");
            //			if ((aCard.primaryEmail != "") && (aCard.primaryEmail.indexOf("@") > -1)) {
            if (((aCard.primaryEmail != "") && (aCard.primaryEmail.indexOf("@") > -1)) || (aCard.isMailList)) {
                this._cards.push(aCard);
            }
        }
    },

    clearResults: function _clearResults() {
        this._cards = new Array();
        this._searchResult = this.RESULT_NOMATCH_ONGOING;
        this._searchString = "";
    },

};

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAutoCompleteResult) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAutoCompleteResult = XPCOMUtils.generateNSGetFactory([mivExchangeAutoCompleteResult]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAutoCompleteResult(cid);
}
