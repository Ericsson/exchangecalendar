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

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");

Cu.import("resource:///modules/mailServices.js");
Cu.import("resource:///modules/iteratorUtils.jsm");

Cu.import("resource://exchangeaddress/erFindContacts.js");
Cu.import("resource://exchangeaddress/erGetContacts.js");
Cu.import("resource://exchangeaddress/erSyncContactsFolder.js");
Cu.import("resource://exchangeaddress/erExpandDL.js");
Cu.import("resource://exchangeaddress/erResolveNames.js");

Cu.import("resource://exchangeaddress/exchangeAbFunctions.js");

const nsIAP = Ci.nsIActivityProcess;
const nsIAE = Ci.nsIActivityEvent;
const nsIAM = Ci.nsIActivityManager;



//
// exchangeAbDistListDirectory
//

function exchangeAbDistListDirectory() {
    exchWebService.commonAbFunctions.logInfo("new exchangeAbDistListDirectory");

    this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
        .getService(Ci.mivExchangeLoadBalancer);

    this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
        .getService(Ci.mivExchangeStatistics);

    this._isRoot = true;

    this._searchQuery = null;
    this._UUID = "";
    this._type = "unknown";
    this._schema = null;
    this._description = "";

    this.prefs = null;
    this.isLoading = false;
    this.findContactsRequest = null;
    this.getContactsRequest = null;

    this.contacts = {};
    this.distLists = new Array();
    this.childDirs = {};

    this._addressLists = Cc["@mozilla.org/array;1"]
        .createInstance(Ci.nsIMutableArray);

    this._isInitialized = false;

    this._listNickName = null;

    this.childNodeURI = "exchWebService-distList-directory://";

    this.observerService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);

}

exchangeAbDistListDirectory.prototype = {

    classID: components.ID("{9e260dc4-90d3-457b-8885-8dff0f69eea3}"),
    contractID: "@mozilla.org/addressbook/directory;1?type=exchWebService-distList-directory",
    classDescription: "Exchange 2007/2010 Distribution List",

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    QueryInterface: XPCOMUtils.generateQI([Ci.exchangeAbDistListDirectory,
        Ci.nsIAbDirectory,
        Ci.nsIAbCollection,
        Ci.nsIAbItem,
        Ci.nsISupports
    ]),

    /**
     * A universally-unique identifier for this item.
     *
     * If this item cannot be associated with a UUID for some reason, it MUST
     * return the empty string. The empty string MUST NOT be a valid UUID for any
     * item. Under no circumstances may this function throw an error.
     *
     * It is STRONGLY RECOMMENDED that implementations guarantee that this UUID
     * will not change between two different sessions of the application and that,
     * if this item is deleted, the UUID will not be reused.
     *
     * The format of the UUID for a generic nsIAbItem is purposefully left
     * undefined, although any item contained by an nsIAbDirectory SHOULD use
     * nsIAbManager::generateUUID to generate the UUID.
     */
    //readonly attribute AUTF8String uuid;
    get uuid() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: uuid");
        if (this._UUID) {
            return this._UUID;
        }

        return "";
    },

    get id() {
        return this.uuid;
    },

    get type() {
        return this._type;
    },

    /**
     * @{
     * These constants reflect the possible values of the
     * mail.addr_book.lastnamefirst preferences. They are intended to be used in
     * generateName, defined below.
     */
    //const unsigned long GENERATE_DISPLAY_NAME = 0;
    //const unsigned long GENERATE_LAST_FIRST_ORDER = 1;
    //const unsigned long GENERATE_FIRST_LAST_ORDER = 2;
    /** @} */

    /** 
     * Generate a name from the item for display purposes.
     *
     * If this item is an nsIAbCard, then it will use the aGenerateFormat option
     * to determine the string to return.
     * If this item is not an nsIAbCard, then the aGenerateFormat option may be
     * ignored, and the displayName of the item returned.
     *
     * @param  aGenerateFormat The format to generate as per the GENERATE_*
     *                         constants above.
     * @param  aBundle         An optional parameter that is a pointer to a string
     *                         bundle that holds:
     *           chrome://messenger/locale/addressbook/addressBook.properties
     *                         If this bundle is not supplied, then the function
     *                         will obtain the bundle itself. If cached by the
     *                         caller and supplied to this function, then
     *                         performance will be improved over many calls.
     * @return                 A string containing the generated name.
     */
    //AString generateName(in long aGenerateFormat,
    //                     [optional] in nsIStringBundle aBundle);
    generateName: function _generateName(aGenerateFormat, aBundle) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: generateName");
        return "generateName";
    },

    /**
     * Generate a formatted email address from the card, that can be used for
     * sending emails.
     *
     * @param  aExpandList     If this card is a list, and this parameter is set
     *                         to true, then the list will be expanded to include
     *                         the emails of the cards within the list.
     * @param  aGroupMailLists If this card (or the items within this card) is a
     *                         list, and this is set to true, then the list will
     *                         be expanded in the RFC 2822 group format
     *                         "displayname : email1 ; email2 ; etc".
     * @param  aHeaderParser   An optional parameter pointing to the
     *                         nsIMsgHeaderParser service. If this is not supplied
     *                         the function will obtain the service itself. If
     *                         cached by the called and supplied to this function,
     *                         then performance will be improved over many calls.
     * @return                 A string containing a comma-separated list of
     *                         formatted addresses.
     */
    //AString generateFormattedEmail(in boolean aExpandList,
    //                               in boolean aAsGroupMailLists,
    //                               [optional] in nsIMsgHeaderParser aHeaderParser);
    generateFormattedEmail: function _generateFormattedEmail(aExpandList, aAsGroupMailLists, aHeaderParser) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: generateFormattedEmail");
        return "";
    },

    /**
     * Returns true if this collection is read-only.
     */
    //readonly attribute boolean readOnly;
    get readOnly() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: readOnly");
        return true;
    },

    /**
     * Returns true if this collection is accessed over a network connection.
     */
    //readonly attribute boolean isRemote;
    get isRemote() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: isRemote");
        return true;
    },


    /**
     * Returns true if this collection is accessed over a secure connection.
     *
     * If isRemote returns false, then this value MUST be false as well.
     */
    //readonly attribute boolean isSecure;
    get isSecure() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: isSecure");
        return true;
    },


    /** 
     * Returns an address book card for the specified email address if found.
     *
     * If there are multiple cards with the given email address, this method will
     * return one of these cards in an implementation-defined manner.
     *
     * Matching is performed in a case-insensitive manner.
     *
     * This method performs a synchronous operation. If the collection cannot do
     * the search in such a manner, then it should throw NS_ERROR_NOT_IMPLEMENTED.
     *
     * @param  emailAddress The email address to find in any of the email address
     *                      fields. If emailAddress is empty, the database won't
     *                      be searched and the function will return as if no card
     *                      was found.
     * @return              An nsIAbCard if one was found, else returns NULL.
     * @exception NS_ERROR_NOT_IMPLEMENTED If the collection cannot do this.
     */
    //nsIAbCard cardForEmailAddress(in AUTF8String emailAddress);
    cardForEmailAddress: function _cardForEmailAddress(emailAddress) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: cardForEmailAddress");
        return null;
        //		throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },

    /**
     * Returns an address book card for the specified property if found.
     *
     * If there are multiple cards with the given value for the property, this
     * method will return one of these cards in an implementation-defined manner.
     *
     * This method performs a synchronous operation. If the collection cannot do
     * the search in such a manner, then it should throw NS_ERROR_NOT_IMPLEMENTED.
     *
     * If the property is not natively a string, it can still be searched for
     * using the string-encoded value of the property, e.g. "0". See
     * nsIAbCard::getPropertyAsAUTF8String for more information. Empty values will
     * return no match, to prevent spurious results.
     *
     * @param  aProperty      The property to look for.
     * @param  aValue         The value to search for.
     * @param  aCaseSensitive True if matching should be done case-sensitively.
     * @result                An nsIAbCard if one was found, else returns NULL.
     * @exception NS_ERROR_NOT_IMPLEMENTED If the collection cannot do this.
     */
    //nsIAbCard getCardFromProperty(in string aProperty, in AUTF8String aValue,
    //                              in boolean aCaseSensitive);
    getCardFromProperty: function _cardForEmailAddress(aProperty, aValue, aCaseSensitive) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getCardFromProperty: aProperty:" + aProperty + ", aValue:" + aValue);
        //throw Cr.NS_ERROR_NOT_IMPLEMENTED;
        return null
    },


    /**
     * Returns all address book cards with a specific property matching value
     *
     * This function is almost identical to getCardFromProperty, with the
     * exception of returning all cards rather than just the first.
     *
     * @param  aProperty      The property to look for.
     * @param  aValue         The value to search for.
     * @param  aCaseSensitive True if matching should be done case-sensitively.
     * @result                A nsISimpleEnumerator that holds nsIAbCard
     *                        instances.
     */
    //nsISimpleEnumerator getCardsFromProperty(in string aProperty,
    //                                         in AUTF8String aValue,
    //                                         in boolean aCaseSensitive);

    getCardsFromProperty: function _getCardsFromProperty(aProperty, aValue, aCaseSensitive) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getCardsFromProperty");
        var result = [];
        return exchWebService.commonFunctions.CreateSimpleEnumerator(result);
    },


    /**
     * The chrome URI to use for bringing up a dialog to edit this directory.
     * When opening the dialog, use a JS argument of
     * {selectedDirectory: thisdir} where thisdir is this directory that you just
     * got the chrome URI from.
     */
    //readonly attribute ACString propertiesChromeURI;
    get propertiesChromeURI() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get propertiesChromeURI 1");
        if (this.isMailList) {
            return "";
        }
        return "chrome://exchangecontacts/content/exchangeContactSettings.xul";
    },

    /**
     * The description of the directory. If this directory is not a mailing list,
     * then setting this attribute will send round a "DirName" update via
     * nsIAddrBookSession.
     */
    //attribute AString dirName;
    get dirName() {
        if (this.isMailList) {
            return this._dirName;
        }

        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get dirName");
        return exchWebService.commonAbFunctions.getDescription(this.uuid);
    },

    set dirName(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set dirName");
        if (this.isMailList) {
            return; // Currently not allowed.
        }

        exchWebService.commonAbFunctions.setDescription(this.uuid.aValue);
    },

    // XXX This should really be replaced by a QI or something better
    //readonly attribute long dirType;
    get dirType() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get dirType");
        return 0;
    },

    // eliminated a bit more.

    // The filename for address books within this directory.
    //readonly attribute ACString fileName;
    get fileName() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get fileName");
        return "filename";
    },

    // The URI of the address book
    //readonly attribute ACString URI;
    get URI() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get URI:"+this._URI);
        return this._URI;
    },

    // The position of the directory on the display.
    //readonly attribute long position;
    get position() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get position");
        return 2;
    },

    // will be used for LDAP replication
    //attribute unsigned long lastModifiedDate;
    get lastModifiedDate() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get lastModifiedDate");
        return this._lastModifiedDate;
    },

    set lastModifiedDate(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set lastModifiedDate");
        this._lastModifiedDate = aValue;
    },

    // Defines whether this directory is a mail
    // list or not
    //attribute boolean isMailList;
    get isMailList() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get isMailList");
        if (this._isMailList) {
            return this._isMailList;
        }

        return false;
    },

    set isMailList(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set isMailList");
        this._isMailList = aValue;
    },

    // Get the children directories
    //readonly attribute nsISimpleEnumerator childNodes;
    get childNodes() {
        var result = [];

        if (this.distLists.length > 0) {
            for each(var distList in this.distLists) {
                result.push(distList);
            }
        }
        return exchWebService.commonFunctions.CreateSimpleEnumerator(result);
    },

    /**
     * Get the cards associated with the directory. This will return the cards
     * associated with the mailing lists too.
     */
    //readonly attribute nsISimpleEnumerator childCards;
    get childCards() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: 1 get childCards:" + this.dirName + ", uri:" + this.URI);
        for (var index in this.contacts) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: 2 get childCards:" + index + ":" + this.contacts[index].displayName);
        }
        return exchWebService.commonFunctions.CreateSimpleObjectEnumerator(this.contacts);
    },

    /**
     * Returns true if this directory represents a query - i.e. the rdf resource
     * was something like moz-abmdbdirectory://abook.mab?....
     */
    //readonly attribute boolean isQuery;
    get isQuery() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get isQuery");
        if (this._searchQuery) {
            return true;
        }

        return false;
    },

    /**
     * Initializes a directory, pointing to a particular
     * URI
     */
    //void init(in string aURI);
    init: function _init(aURI) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: init. aURI:" + aURI + "");

        if (this._isInitialized) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' is allready initialized");

            var tmpStr = aURI.substr(aURI.indexOf("://") + 3);
            var params = exchWebService.commonAbFunctions.paramsToArray(tmpStr, "&");

            if (aURI == this._URI) {
                if (decodeURIComponent(params.id) == this.uuid) {
                    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' aURI unchanged, id is the same and changKey is different. Going to reset/reload.");

                    // We could do this more clever by finding out the differences and only update those. 
                    // But how deep will a distlist go and how many cards will be in a distlist.!!??
                    // For now we clean this distlist and re add everything.

                    // Remove cards.
                    var oldList = this.contacts;
                    this.contacts = {};
                    for each(var contact in oldList) {
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' removed contact:" + contact.getProperty("DisplayName", ""));
                        MailServices.ab.notifyDirectoryItemDeleted(this, contact);
                        MailServices.ab.notifyDirectoryDeleted(this, contact);
                    }

                    // Remove distLists.
                    var oldList = this.distLists;
                    this.distLists = new Array();
                    for each(var distList in oldList) {
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' removed distList:" + distList.dirName);
                        MailServices.ab.notifyDirectoryDeleted(this, distList);
                    }
                }
                else {
                    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' aURI unchanged but id is different. Not allowed. Going to do nothing.");
                    return;
                }
            }
            else {
                exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: '" + this.dirName + "' aURI changed. Going to do nothing.");
                return;
            }
        }

        this._URI = aURI;

        this._Schema = null;
        this._UUID = "";
        this._searchQuery = null;

        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: this is a childdir:" + aURI);

        if (aURI.indexOf("://") > -1) {
            this._Schema = aURI.substr(0, aURI.indexOf("://"));

            var tmpStr = aURI.substr(aURI.indexOf("://") + 3);

            this._searchQuery = null;
            if (tmpStr.indexOf("?") > -1) {
                this._searchQuery = tmpStr.substr(tmpStr.indexOf("?") + 1);
                tmpStr = tmpStr.substr(0, tmpStr.indexOf("?"));
            }

            var params = exchWebService.commonAbFunctions.paramsToArray(tmpStr, "&");

            this._UUID = decodeURIComponent(params.id);
            this._type = decodeURIComponent(params.type);

            this.isMailList = true;

            if (params.name) {
                this._dirName = decodeURIComponent(params.name);
            }
            else {
                this._dirName = null;
            }

            if (params.parentId) {
                this.parentId = decodeURIComponent(params.parentId);
            }
            else {
                this.parentId = null;
            }

            exchWebService.commonAbFunctions.logInfo("D: init: uuid:" + this.uuid + ", type:" + this.type + ", name:" + this.dirName);

            if (this._searchQuery) {
                var dirName = this._Schema + "://" + "id=" + encodeURIComponent(this._UUID) + "&name=" + encodeURIComponent(this.dirName) + "&parentId=" + this.parentId + "&type=" + this.type;

                exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: this._searchQuery:" + this._searchQuery + ", dirName:" + dirName);


                var dir = MailServices.ab.getDirectory(dirName);
                if (dir) {
                    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Going to get children of '" + dirName + "'");

                    this.contacts = exchWebService.commonAbFunctions.filterCardsOnQuery(this._searchQuery, dir.childCards);
                    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Got children of '" + dirName + "'");

                    this.observerService.notifyObservers(this, "onExchangeGALSearchStart", this._searchQuery);

                    for each(var contact in this.contacts) {
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Adding sub child A '" + contact.displayName + "' to contacts. dirName:" + this.dirName);
                        MailServices.ab.notifyDirectoryItemAdded(this, contact);
                    }

                    this.observerService.notifyObservers(this, "onExchangeGALSearchEnd", this._searchQuery);

                    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Going to get children of distList.");
                    // Get contact in childNodes (distLists)
                    var childNodes = dir.childNodes;
                    while (childNodes.hasMoreElements()) {
                        var childNode = childNodes.getNext();
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Going to get children of distList '" + childNode.dirName + "':'" + childNode.URI + "' dirName:" + this.dirName);
                        var tmpDir = MailServices.ab.getDirectory(childNode.URI + "?" + this._searchQuery);
                        var childContacts = tmpDir.childCards;
                        while (childContacts.hasMoreElements()) {
                            var contact = childContacts.getNext().QueryInterface(Ci.nsIAbCard);
                            exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: ++ contact:" + contact);
                            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Adding sub child B '" + contact.localId + "':'" + contact.displayName + "' to contacts. dirName:" + this.dirName);
                            this.contacts[contact.localId] = contact;
                        }
                    }
                }
                else {
                    exchWebService.commonAbFunctions.logInfo("ERROR Folderdirectory '" + dirName + "' does not exist.");
                }

            }
            else {
                if (this.parentId) {
                    this.prefs = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService)
                        .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl.account." + this.parentId + ".");
                }
                else {
                    this.prefs = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService)
                        .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl.account." + this._UUID + ".");
                }

                this.loadDistListFromExchange();
            }


        }
        else {
            // ERROR
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: exchangeAbDistListDirectory.init: WE GOT TO A POINT WERE WE NEVER SHOULD GET TO.");
        }

        this._isInitialized = true;
    },

    // Deletes either a mailing list or a top
    // level directory, which also updates the
    // preferences
    //void deleteDirectory(in nsIAbDirectory directory);
    deleteDirectory: function _deleteDirectory(directory) {
        // We cannot remove the root.
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: deleteDirectory this:" + this.URI + ", directory:" + directory.URI + "");

        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: deleteDirectory uri:"+directory.URI+"");
    },

    // Check if directory contains card
    // If the implementation is asynchronous the card
    // may not yet have arrived. If it is in the process
    // of obtaining cards the method will throw an
    // NS_ERROR_NOT_AVAILABLE exception if the card
    // cannot be found.
    //boolean hasCard(in nsIAbCard cards);
    hasCard: function _hasCard(cards) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: hasCard");
        return false;
    },


    // Check if directory contains directory
    //boolean hasDirectory(in nsIAbDirectory dir);
    hasDirectory: function _hasDirectory(dir) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: hasDirectory");

        return false;
    },

    /**
     * Adds a card to the database.
     *
     * This card does not need to be of the same type as the database, e.g., one
     * can add an nsIAbLDAPCard to an nsIAbMDBDirectory.
     *
     * @return "Real" card (eg nsIAbLDAPCard) that can be used for some
     *         extra functions.
     */
    //nsIAbCard addCard(in nsIAbCard card);
    addCard: function _addCard(card) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: addCard");
        return null;
    },

    /**
     * Modifies a card in the database to match that supplied.
     */
    //void modifyCard(in nsIAbCard modifiedCard);
    modifyCard: function _modifyCard(modifiedCard) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: modifyCard");
    },

    /**
     * Deletes the array of cards from the database.
     *
     * @param  aCards  The cards to delete from the database.
     */
    //void deleteCards(in nsIArray aCards);
    deleteCards: function _deleteCards(aCards) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: deleteCards");
    },

    //void dropCard(in nsIAbCard card, in boolean needToCopyCard);
    dropCard: function _dropCard(Card, needToCopyCard) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: dropCard");
    },

    /**
     * Whether or not the directory should be searched when doing autocomplete,
     * (currently by using GetChildCards); LDAP does not support this in online
     * mode, so that should return false; additionally any other directory types
     * that also do not support GetChildCards should return false.
     *
     * @param aIdentity  An optional parameter detailing the identity key (see
     *                   nsIMsgAccountManager) that this autocomplete is being
     *                   run against.
     * @return           True if this directory should/can be used during
     *                   local autocomplete.
     */
    //boolean useForAutocomplete(in ACString aIdentityKey);
    useForAutocomplete: function _useForAutocomplete(aIdentityKey) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: useForAutocomplete");

        return true;

        //		return true;
    },

    /** 
     * Does this directory support mailing lists? Note that in the case
     * this directory is a mailing list and nested mailing lists are not
     * supported, this will return false rather than true which the parent
     * directory might.
     */
    //readonly attribute boolean supportsMailingLists;
    get supportsMailingLists() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get supportsMailingLists");
        return true;
    },

    /**
     * This attribute serves two purposes
     *  1. If this directory is not a mail list, directories are stored here
     *  2. If it is a mail list card entries are stored here
     *
     * @note This is a *live* array and not a static copy
     */
    //attribute nsIMutableArray addressLists
    get addressLists() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get addressLists");

        return this._addressLists;
    },

    set addressLists(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set addressLists");
        this._addressLists = aValue;
    },

    // Specific to a directory which stores mail lists

    /**
     * Creates a new mailing list in the directory. Currently only supported 
     * for top-level directories.
     *
     * @param  list  The new mailing list to add.
     * @return The mailing list directory added, which may have been modified.
     */
    //nsIAbDirectory addMailList(in nsIAbDirectory list);
    addMailList: function _addMailList(list) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: addMailList");
        return list;
    },

    /**
     * Nick Name of the mailing list. This attribute is only really used when
     * the nsIAbDirectory represents a mailing list.
     */
    //attribute AString listNickName;
    get listNickName() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get listNickName");
        return this._listNickName;
    },

    set listNickName(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set listNickName");
        this._listNickName = aValue;
    },

    /**
     * Description of the mailing list. This attribute is only really used when
     * the nsIAbDirectory represents a mailing list.
     */
    //attribute AString description;
    get description() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get description");
        return this._description;
    },

    set description(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set description");
        this._description = aValue;
    },

    /**
     * Edits an existing mailing list (specified as listCard) into its parent
     * directory. You should call this function on the resource with the same
     * uri as the listCard.
     *
     * @param  listCard  A nsIAbCard version of the mailing list with the new
     *                   values.
     */
    //void editMailListToDatabase(in nsIAbCard listCard);
    editMailListToDatabase: function _editMailListToDatabase(listCard) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: editMailListToDatabase");
    },

    // Copies mail list properties from the srcList
    //void copyMailList(in nsIAbDirectory srcList);
    copyMailList: function _copyMailList(srcList) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: copyMailList");
    },


    /**
     * Only creates a top level address book
     * which is stored in the preferences
     *
     * Need to change to factory based approach
     * to create new address books
     *
     * This method should become redundant or 
     * be only associated with card folders
     *
     * The parameters are the same as for
     * nsIAbManager::newAddressBook
     */
    //ACString createNewDirectory(in AString aDirName, in ACString aURI,
    //                            in unsigned long aType, in ACString aPrefName);
    createNewDirectory: function _createNewDirectory(aDirName, aURI, aType, aPrefName) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: createNewDirectory uuid:" + this.uuid + "");
        return "createNewDirectory";
    },


    /* create a directory by passing the display name and address book uri */
    //void createDirectoryByURI(in AString displayName, in ACString aURI);
    createDirectoryByURI: function _createDirectoryByURI(displayName, aURI) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: createDirectoryByURI uuid:" + this.uuid + "");
    },
    /**
     * The id of the directory used in prefs e.g. "ldap_2.servers.pab"
     * Setting this will cause directoryPrefs to be updated.
     */
    //attribute ACString dirPrefId;
    get dirPrefId() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: get dirPrefId: " + this.uuid);
        return this._dirPrefId;
    },

    set dirPrefId(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: set dirPrefId");
        this._dirPrefId = aValue;
    },
    /**
     * @name  getXXXValue
     *
     * Helper functions to get different types of pref, but return a default
     * value if a pref value was not obtained.
     *
     * @param aName         The name of the pref within the branch dirPrefId to
     *                      get a value from.
     *
     * @param aDefaultValue The default value to return if getting the pref fails
     *                      or the pref is not present.
     *
     * @return              The value of the pref or the default value.
     *
     * @exception           NS_ERROR_NOT_INITIALIZED if the pref branch couldn't
     *                      be obtained (e.g. dirPrefId isn't set).
     */
    //@{
    //long getIntValue(in string aName, in long aDefaultValue);
    getIntValue: function _getIntValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getIntValue");
        return aDefaultValue;
    },

    //boolean getBoolValue(in string aName, in boolean aDefaultValue);
    getBoolValue: function _getBoolValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getBoolValue");
        return aDefaultValue;
    },

    //ACString getStringValue(in string aName, in ACString aDefaultValue);
    getStringValue: function _getStringValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getStringValue");
        return aDefaultValue;
    },

    //AUTF8String getLocalizedStringValue(in string aName, in AUTF8String aDefaultValue);
    getLocalizedStringValue: function _getLocalizedStringValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: getLocalizedStringValue");
        return aDefaultValue;
    },

    //@}

    /**
     * The following attributes are read from an nsIAbDirectory via the above methods:
     *
     * HidesRecipients (Boolean)
     *    If true, and this nsIAbDirectory is a mailing list, then when sending mail to
     *    this list, recipients addresses will be hidden from one another by sending
     *    via BCC.
     */

    /**
     * @name  setXXXValue
     *
     * Helper functions to set different types of pref values.
     *
     * @param aName         The name of the pref within the branch dirPrefId to
     *                      get a value from.
     *
     * @param aValue        The value to set the pref to.
     *
     * @exception           NS_ERROR_NOT_INITIALIZED if the pref branch couldn't
     *                      be obtained (e.g. dirPrefId isn't set).
     */
    //@{
    //void setIntValue(in string aName, in long aValue);
    setIntValue: function _setIntValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: setIntValue");
    },

    //void setBoolValue(in string aName, in boolean aValue);
    setBoolValue: function _setBoolValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: setBoolValue");
    },

    //void setStringValue(in string aName, in ACString aValue);
    setStringValue: function _setStringValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: setStringValue");
    },

    //void setLocalizedStringValue(in string aName, in AUTF8String aValue);
    setLocalizedStringValue: function _setLocalizedStringValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: setLocalizedStringValue");
    },

    //@}

    addToQueue: function _addToQueue(aRequest, aArgument, aCbOk, aCbError, aListener) {
        //if (!aArgument["ServerVersion"]) aArgument["ServerVersion"] = this.exchangeStatistics.getServerVersion(this.serverUrl);

        this.loadBalancer.addToQueue({
            calendar: this,
            ecRequest: aRequest,
            arguments: aArgument,
            cbOk: aCbOk,
            cbError: aCbError,
            listener: aListener
        });
    },

    get name() {
        return this.dirName;
    },

    get user() {
        var username = exchWebService.commonFunctions.safeGetCharPref(this.prefs, "user", "");
        if (username.indexOf("@") > -1) {
            return username;
        }
        else {
            if (this.domain == "") {
                return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "user", "");
            }
            else {
                return this.domain + "\\" + exchWebService.commonFunctions.safeGetCharPref(this.prefs, "user", "");
            }
        }
    },

    set user(value) {
        if (value.indexOf("\\") > -1) {
            this.domain = value.substr(0, value.indexOf("\\"));
            this.prefs.setCharPref("user", value.substr(value.indexOf("\\") + 1));
        }
        else {
            this.prefs.setCharPref("user", value);
        }
    },

    get domain() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "domain", "");
    },

    set domain(value) {
        return this.prefs.setCharPref("domain", value);
    },

    get mailbox() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "mailbox", "");
    },

    get serverUrl() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "server", "");
    },

    get folderBase() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "folderbase", "contacts");
    },

    get folderPath() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "folderpath", "/");
    },

    get folderID() {
        if (this.isMailList) {
            return this.id;
        }

        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "folderid", null);
    },

    set folderID(aValue) {
        if (this.isMailList) {
            // Cannot be changed for a distlist.
            return;
        }

        this.prefs.setCharPref("folderid", aValue);
    },

    get changeKey() {
        return exchWebService.commonFunctions.safeGetCharPref(this.prefs, "changekey", null);
    },

    set changeKey(aValue) {
        this.prefs.setCharPref("changekey", aValue);
    },

    loadDistListFromExchange: function _loadDistListFromExchange() {
        if (this.isLoading) {
            return;
        }

        exchWebService.commonAbFunctions.logInfo("loadDistListFromExchange:" + this.dirName);

        this.isLoading = true;

        var self = this;

        // changekey set to null because the same dislist can have different changeKey when it is also added as a member of another distlist.

        switch (this._type) {
        case "PrivateDL":
            this.addToQueue(erExpandDLRequest, {
                    user: this.user,
                    serverUrl: this.serverUrl,
                    actionStart: Date.now(),
                    itemId: {
                        id: this.id
                    }
                },
                function (erExpandDLRequest, aMailboxes) {
                    self.distListExpandOk(erExpandDLRequest, aMailboxes);
                },
                function (erExpandDLRequest, aCode, aMsg) {
                    self.distListExpandError(erExpandDLRequest, aCode, aMsg);
                },
                null);
            break;
        case "PublicDL":
            var emailAddress = this.id.substr(this.id.indexOf(":") + 1);
            this.addToQueue(erExpandDLRequest, {
                    user: this.user,
                    serverUrl: this.serverUrl,
                    actionStart: Date.now(),
                    emailAddress: emailAddress
                },
                function (erExpandDLRequest, aMailboxes) {
                    self.distListExpandOk(erExpandDLRequest, aMailboxes);
                },
                function (erExpandDLRequest, aCode, aMsg) {
                    self.distListExpandError(erExpandDLRequest, aCode, aMsg);
                },
                null);
            break;
        }
    },

    ecUpdateCard: function _ecUpdateCard(contact) {
        var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
            .createInstance(Ci.mivExchangeAbCard);
        newCard.convertExchangeContactToCard(this, contact);
        newCard.setProperty("exchangeUser", this.user);
        newCard.setProperty("exchangeServerUrl", this.serverUrl);
        this.updateList(newCard);
    },

    updateList: function _updateList(newCard) {
        if (!newCard) {
            return;
        }

        if (this.contacts[newCard.localId]) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory:  == We allready know this card. Lets see what has changed:" + newCard.localId);

            // Check which properties changed.
            for (var cardProperty in fixIterator(newCard.properties, Ci.nsIProperty)) {
                if (cardProperty.name) {
                    try {
                        var oldValue = this.contacts[newCard.localId].getProperty(cardProperty.name, "");
                        var newValue = cardProperty.value;
                        if (oldValue != newValue) {
                            // And existing property has changed.
                            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: --Property Changed name:" + cardProperty.name + ", oldvalue:" + oldValue + ", newValue:" + newValue);
                            this.contacts[newCard.localId].setProperty(cardProperty.name, newValue);
                            MailServices.ab.notifyItemPropertyChanged(this.contacts[newCard.localId],
                                cardProperty.name,
                                oldValue,
                                newValue);
                        }
                    }
                    catch (err) {
                        // We have a new property which was not set in the previous state. Add it
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory:  == Err:" + err);
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: --Property added name:" + cardProperty.name + ", value:" + cardProperty.value);
                        this.contacts[newCard.localId].setProperty(cardProperty.name, cardProperty.value);
                        MailServices.ab.notifyItemPropertyChanged(this.contacts[newCard.localId],
                            cardProperty.name,
                            null,
                            newValue);
                    }
                }
            }

            // We check if properties were removed.
            for (var cardProperty in fixIterator(this.contacts[newCard.localId].properties, Ci.nsIProperty)) {
                if (cardProperty.name) {
                    var oldValue = cardProperty.value;
                    try {
                        var newValue = newCard.getProperty(cardProperty.name, "");

                        if (oldValue != newValue) {
                            // If we get here something went wrong before this call.
                        }
                    }
                    catch (err) {
                        // Property is not available in new state. We have to remove it.
                        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: --Property removed name:" + cardProperty.name + ", value:" + cardProperty.value);
                        this.contacts[newCard.localId].deleteProperty(cardProperty.name);
                        MailServices.ab.notifyItemPropertyChanged(this.contacts[newCard.localId],
                            cardProperty.name,
                            oldValue,
                            null);
                    }
                }
            }
        }
        else {
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory:  || This card is new. We do not know it yet.");
            this.contacts[newCard.localId] = newCard;
            MailServices.ab.notifyDirectoryItemAdded(this, newCard);
        }

        // This will eat performance when the list is long.
        this._addressLists.clear();
        for each(var contact in this.contacts) {
            this._addressLists.appendElement(contact, false);
        }

        exchWebService.commonAbFunctions.logInfo(this.uuid + ": newCard.localId:" + newCard.localId);
    },

    convertExchangeMailbox: function _convertExchangeMailbox(aMailbox) {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: convertExchangeMailbox: Mailboxes:"+aMailbox.toString());

        var result = {
            name: aMailbox.getTagValue("t:Name"),
            emailAddress: aMailbox.getTagValue("t:EmailAddress"),
            routingType: aMailbox.getTagValue("t:RoutingType"),
            mailboxType: aMailbox.getTagValue("t:MailboxType"),
            mailbox: aMailbox
        };

        if (aMailbox.getTags("t:ItemId").length > 0) {
            result.itemId = {
                id: aMailbox.getAttributeByTag("t:ItemId", "Id", null),
                changeKey: aMailbox.getAttributeByTag("t:ItemId", "ChangeKey", null)
            };
        }

        return result;
    },

    distListExpandOk: function _contactsFoundOk(erExpandDLRequest, aMailboxes) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: distListExpandOk: Mailboxes:" + aMailboxes.length);

        if (aMailboxes.length > 0) {
            var aStoreContacts = new Array();
            var aADContacts = new Array();
            this.distLists = new Array()
            for each(var mailbox in aMailboxes) {
                var calMailbox = this.convertExchangeMailbox(mailbox);

                switch (calMailbox.mailboxType) {
                case "Contact": // A normal in store or AD contact
                    exchWebService.commonAbFunctions.logInfo("distListLoadOk: new Contact:" + calMailbox.name);
                    if ((calMailbox.itemId) && (calMailbox.itemId.id)) {
                        // It is a private store contact.
                        aStoreContacts.push({
                            Id: calMailbox.itemId.id
                        });
                    }
                    break;
                case "PrivateDL": // Private Store distribution list.
                    if ((calMailbox.itemId) && (calMailbox.itemId.id)) {
                        // It is a private store distList.
                        exchWebService.commonAbFunctions.logInfo("distListLoadOk: new Private distList:" + calMailbox.name + " in dir:" + this.dirName);

                        var dirName = this.childNodeURI + "id=" + encodeURIComponent(calMailbox.itemId.id) + "&name=" + encodeURIComponent(calMailbox.name) + "&parentId=" + this.parentId + "&type=PrivateDL";

                        try {
                            var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                                .createInstance(Ci.mivExchangeAbCard);
                            newCard.convertExchangeDistListToCard(this, mailbox, dirName);
                            this.updateList(newCard);
                            var dir = MailServices.ab.getDirectory(dirName);
                            if (dir) {
                                this.distLists.push(dir);
                                MailServices.ab.notifyDirectoryItemAdded(this, dir);
                            }
                        }
                        catch (err) {
                            exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: Error adding dislist '" + dirName + "' Error:" + err);
                        }
                    }
                    break;
                case "PublicDL": // An Active Directory distribution list.
                    exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: distListExpandOk: new Public distList:" + calMailbox.name + " in GAL of " + this.serverUrl);

                    var dirName = this.childNodeURI + "id=" + encodeURIComponent(calMailbox.routingType + ":" + calMailbox.emailAddress) + "&name=" + encodeURIComponent(calMailbox.name) + "&parentId=" + this.parentId + "&type=PublicDL";

                    // Make a card from the contact details.
                    var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                        .createInstance(Ci.mivExchangeAbCard);
                    newCard.convertExchangeDistListToCard(this, mailbox, dirName);
                    this.updateList(newCard);
                    var dir = MailServices.ab.getDirectory(dirName);
                    if (dir) {
                        this.distLists.push(dir);
                        MailServices.ab.notifyDirectoryItemAdded(this, dir);
                    }

                    break;
                case "OneOff":
                    exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: distListExpandOk: new OneOff Contact:" + calMailbox.name + " in GAL of " + this.serverUrl);

                    // Make a card from the contact details.
                    var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                        .createInstance(Ci.mivExchangeAbCard);
                    newCard.convertExchangeContactToCard(this, mailbox, calMailbox.mailboxType);
                    newCard.setProperty("exchangeUser", this.user);
                    newCard.setProperty("exchangeServerUrl", this.serverUrl);
                    this.updateList(newCard);

                    break;
                case "Mailbox": // An Active Directory mailbox
                    exchWebService.commonAbFunctions.logInfo("distListExpandOk: new Mailbox:" + calMailbox.name);
                    aADContacts.push(calMailbox);
                    break;
                default:
                    exchWebService.commonAbFunctions.logInfo("distListExpandOk: Unknown mailboxtype:" + calMailbox.mailboxType);
                }
            }

            var self = this;
            if (aStoreContacts.length > 0) {
                this.addToQueue(erGetContactsRequest, {
                        user: this.user,
                        mailbox: this.mailbox,
                        folderBase: this.folderBase,
                        serverUrl: this.serverUrl,
                        folderID: this.folderID,
                        changeKey: this.changeKey,
                        ids: aStoreContacts,
                        actionStart: Date.now()
                    },
                    function (erGetContactsRequest, aContacts) {
                        self.contactsLoadOk(erGetContactsRequest, aContacts);
                    },
                    function (erGetContactsRequest, aCode, aMsg) {
                        self.distListExpandError(erGetContactsRequest, aCode, aMsg);
                    },
                    null);
            }

            for (var index in aADContacts) {
                this.addToQueue(erResolveNames, {
                        user: this.user,
                        mailbox: this.mailbox,
                        folderBase: this.folderBase,
                        serverUrl: this.serverUrl,
                        folderID: this.folderID,
                        changeKey: this.changeKey,
                        ids: aADContacts[index],
                        actionStart: Date.now()
                    },
                    function (erResolveNames, aResolutions) {
                        self.resolveNamesOk(erResolveNames, aResolutions);
                    },
                    function (erResolveNames, aCode, aMsg) {
                        self.distListExpandError(erResolveNames, aCode, aMsg);
                    },
                    null);
            }
        }

    },

    distListExpandError: function _distListExpandError(erExpandDLRequest, aCode, aMsg) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: distListExpandError: aCode:" + aCode + ", aMsg:" + aMsg);
        this.isLoading = false;

        if ((aCode == 0) && (aMsg == "ErrorNameResolutionNoResults")) {
            // Name could not be resolved we use the mailbox element instead of the contacts.
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: Could not resolve mailbox. Going to use mailbox details for card");
            this.ecUpdateCard(erExpandDLRequest.ids.mailbox);
        }
    },

    contactsLoadOk: function _contactsLoadOk(erGetContactsRequest, aContacts) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: contactsLoadOk: contacts:" + aContacts.length);

        for each(var contact in aContacts) {
            //exchWebService.commonAbFunctions.logInfo("Contact card:"+contact.toString(),2);
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: new childCards:" + contact.getTagValue("t:DisplayName"));
            this.ecUpdateCard(contact);

        }

        this.isLoading = false;

    },

    resolveNamesOk: function _resolveNamesOk(erResolveNames, aResolutions) {

        exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: resolveNamesOk: contacts:" + aResolutions.length);

        for each(var resolution in aResolutions) {
            exchWebService.commonAbFunctions.logInfo("resolution card:" + resolution.toString());

            var mailbox = resolution.getTags("t:Mailbox");
            exchWebService.commonAbFunctions.logInfo("resolution mailbox card:" + mailbox[0].toString());
            var contact = resolution.getTags("t:Contact");
            if (contact.length > 0) {
                exchWebService.commonAbFunctions.logInfo("resolution contact card:" + contact[0].toString());
            }
            var calMailbox;
            if (mailbox.length > 0) {
                calMailbox = this.convertExchangeMailbox(mailbox[0]);

                switch (calMailbox.mailboxType) {
                case "PrivateDL": // An Contact folder distribution list.
                    try {
                        var dirName = this.childNodeURI + "id=" + encodeURIComponent(calMailbox.itemId.id) + "&name=" + encodeURIComponent(calMailbox.name) + "&parentId=" + this.parentId + "&type=PrivateDL";

                        var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                            .createInstance(Ci.mivExchangeAbCard);
                        newCard.convertExchangeDistListToCard(this, mailbox[0], dirName);
                        this.updateList(newCard);
                        var dir = MailServices.ab.getDirectory(dirName);
                        if (dir) {
                            this.distLists.push(dir);
                            MailServices.ab.notifyDirectoryItemAdded(this, dir);
                        }
                    }
                    catch (err) {
                        exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: resolveNamesOk: Foutje:" + err);
                    }
                    break;
                case "PublicDL": // An Active Directory distribution list.
                    exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: resolveNamesOk: new Public distList:" + calMailbox.name + " in GAL of " + this.serverUrl);

                    var dirName = this.childNodeURI + "id=" + encodeURIComponent(calMailbox.routingType + ":" + calMailbox.emailAddress) + "&name=" + encodeURIComponent(calMailbox.name) + "&parentId=" + this.parentId + "&type=PublicDL";

                    // Make a card from the contact details.
                    var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                        .createInstance(Ci.mivExchangeAbCard);
                    newCard.convertExchangeDistListToCard(this, contact[0], dirName);
                    this.updateList(newCard);
                    var dir = MailServices.ab.getDirectory(dirName);
                    if (dir) {
                        this.distLists.push(dir);
                        MailServices.ab.notifyDirectoryItemAdded(this, dir);
                    }

                    break;
                case "Contact":
                case "Mailbox": // An Active Directory Contact Mailbox.
                    exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: resolveNamesOk: new Mailbox Contact:" + calMailbox.name + " in GAL of " + this.serverUrl);

                    // Make a card from the contact details.
                    var newCard = Cc["@1st-setup.nl/exchange/abcard;1"]
                        .createInstance(Ci.mivExchangeAbCard);
                    newCard.convertExchangeContactToCard(this, contact[0], calMailbox.mailboxType);
                    newCard.setProperty("exchangeUser", this.user);
                    newCard.setProperty("exchangeServerUrl", this.serverUrl);
                    this.updateList(newCard);

                    break;
                default:
                    exchWebService.commonAbFunctions.logInfo("exchangeAbFolderDirectory: resolveNamesOk: Unknown mailboxtype:" + calMailbox.mailboxType);
                }
            }
        }

        this.isLoading = false;

    },

};


function NSGetFactory(cid) {

    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: NSGetFactory for exchangeAbDistListDirectory 1");
    try {
        if (!NSGetFactory.exchWebService_ab5) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: NSGetFactory for exchangeAbDistListDirectory 1a");

            NSGetFactory.exchWebService_ab5 = XPCOMUtils.generateNSGetFactory([exchangeAbDistListDirectory]);
        }

    }
    catch (e) {
        Components.utils.reportError(e);
        exchWebService.commonAbFunctions.logInfo(e);
        throw e;
    }

    exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: NSGetFactory for exchangeAbDistListDirectory 2");
    return NSGetFactory.exchWebService_ab5(cid);
}

exchWebService.commonAbFunctions.logInfo("exchangeAbDistListDirectory: init.");
