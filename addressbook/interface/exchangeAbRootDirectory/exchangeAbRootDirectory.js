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

Cu.import("resource://exchangeaddress/exchangeAbFunctions.js");

//
// exchangeAbRootDirectory
//

function exchangeAbRootDirectory() {
    exchWebService.commonAbFunctions.logInfo("new exchangeAbRootDirectory");
    this._searchQuery = null;
    this._UUID = "";
    this._schema = null;

    this.childDirs = {};

    this._isInitialized = false;

    this.childNodeURI = "exchWebService-contactFolder-directory://";

    this.contacts = {};

    var self = this;
    var adBookListener = {
        // nsIAbListener.idl
        //  void onItemAdded(in nsISupports parentDir, in nsISupports item);
        onItemAdded: function adBookListener_onItemAdded(aParentDir, aItem) {
            if (!aParentDir.uuid) return;
            if ((aParentDir.uuid != self.uuid) && (aParentDir.isQuery)) {
                var card = aItem.QueryInterface(Ci.mivExchangeAbCard);
                exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: onItemAdded: Card:" + card.displayName);
                try {
                    self.contacts[card.localId] = card;
                }
                catch (err) {
                    exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: onItemAdded: Error:" + err);
                }
                MailServices.ab.notifyDirectoryItemAdded(self, card);

            }
        },

    }

    MailServices.ab.addAddressBookListener(adBookListener, Ci.nsIAbListener.itemAdded);

}

exchangeAbRootDirectory.prototype = {

    classID: components.ID("{227664eb-cce6-4b7a-8d57-0bb0c6c9b362}"),
    contractID: "@mozilla.org/addressbook/directory;1?type=exchWebService-contactRoot-directory",
    classDescription: "Exchange 2007/2010 Contacts Root Directory",

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    QueryInterface: XPCOMUtils.generateQI([Ci.exchangeAbRootDirectory,
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
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: uuid\n");
        if (this._UUID) {
            return this._UUID;
        }

        return "";
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: generateName\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: generateFormattedEmail\n");
        return "";
    },

    /**
     * Returns true if this collection is read-only.
     */
    //readonly attribute boolean readOnly;
    get readOnly() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: readOnly\n");
        return true;
    },

    /**
     * Returns true if this collection is accessed over a network connection.
     */
    //readonly attribute boolean isRemote;
    get isRemote() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: isRemote\n");
        //		return true;
        return false; // This to fake the compose->addressing preferences Directory Server list.
    },


    /**
     * Returns true if this collection is accessed over a secure connection.
     *
     * If isRemote returns false, then this value MUST be false as well.
     */
    //readonly attribute boolean isSecure;
    get isSecure() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: isSecure\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: cardForEmailAddress");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getCardFromProperty: aProperty:" + aProperty + ", aValue:" + aValue);
        //throw Cr.NS_ERROR_NOT_IMPLEMENTED;
        return null;
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getCardsFromProperty");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get propertiesChromeURI 1");
        return "";
    },

    /**
     * The description of the directory. If this directory is not a mailing list,
     * then setting this attribute will send round a "DirName" update via
     * nsIAddrBookSession.
     */
    //attribute AString dirName;
    get dirName() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get dirName\n");
        return "Exchange contacts";
    },

    set dirName(aValue) {},

    // XXX This should really be replaced by a QI or something better
    //readonly attribute long dirType;
    get dirType() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get dirType\n");
        return 2;
    },

    // eliminated a bit more.

    // The filename for address books within this directory.
    //readonly attribute ACString fileName;
    get fileName() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get fileName\n");
        return "filename";
    },

    // The URI of the address book
    //readonly attribute ACString URI;
    get URI() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get URI:"+this._URI);
        return this._URI;
    },

    // The position of the directory on the display.
    //readonly attribute long position;
    get position() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get position\n");
        return 1;
    },

    // will be used for LDAP replication
    //attribute unsigned long lastModifiedDate;
    get lastModifiedDate() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get lastModifiedDate\n");
        return this._lastModifiedDate;
    },

    set lastModifiedDate(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: set lastModifiedDate\n");
        this._lastModifiedDate = aValue;
    },

    // Defines whether this directory is a mail
    // list or not
    //attribute boolean isMailList;
    get isMailList() {
        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get isMailList\n");
        return false;
    },

    set isMailList(aValue) {
        return;
    },

    // Get the children directories
    //readonly attribute nsISimpleEnumerator childNodes;
    get childNodes() {
        var accounts = exchWebService.commonAbFunctions.getAccounts();
        this.childDirs = {};
        var results = [];
        if (accounts.length > 0) {
            var dir;
            for each(var account in accounts) {
                if (account != "") {
                    var dirName = this.childNodeURI + "id=" + encodeURI(account) + "&type=basefolder";
                    try {
                        dir = MailServices.ab.getDirectory(dirName);
                        results.push(dir);
                        this.childDirs[dir.uuid] = dir;
                    }
                    catch (err) {
                        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: Error getDirectory for '" + dirName + "'.:" + err + "\n");
                    }
                }
            }
        }
        return exchWebService.commonFunctions.CreateSimpleEnumerator(results);
    },

    /**
     * Get the cards associated with the directory. This will return the cards
     * associated with the mailing lists too.
     */
    //readonly attribute nsISimpleEnumerator childCards;
    get childCards() {
        var result = {};

        if (this._searchQuery) {
            result = this.contacts;
        }

        return exchWebService.commonFunctions.CreateSimpleObjectEnumerator(result);

    },

    /**
     * Returns true if this directory represents a query - i.e. the rdf resource
     * was something like moz-abmdbdirectory://abook.mab?....
     */
    //readonly attribute boolean isQuery;
    get isQuery() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get isQuery");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: init. aURI:" + aURI + "\n");
        this._URI = aURI;

        this._Schema = null;
        this._UUID = "";
        this._searchQuery = null;

        if (this._isInitialized) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: '" + this.dirName + "' is allready initialized");
            return;
        }

        if (aURI.indexOf("?") > -1) {
            this._searchQuery = aURI.substr(aURI.indexOf("?") + 1);
            this.contacts = {};

            var schema = aURI.substr(0, aURI.indexOf("://") + 3);

            exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: this._searchQuery:" + this._searchQuery + ", dirName:" + schema);

            var dir = MailServices.ab.getDirectory(schema);
            if (dir) {
                exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: Going to get children of '" + schema + "'");

                // Get contact in childNodes (distLists)
                var childNodes = dir.childNodes;
                while (childNodes.hasMoreElements()) {
                    var childNode = childNodes.getNext();
                    exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: Going to get children of distList '" + childNode.dirName + "':'" + childNode.URI + "' dirName:" + this.dirName);
                    var tmpDir = MailServices.ab.getDirectory(childNode.URI + "?" + this._searchQuery);
                    var childContacts = tmpDir.childCards;
                    while (childContacts.hasMoreElements()) {
                        var contact = childContacts.getNext().QueryInterface(Ci.nsIAbCard);
                        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: Adding sub child '" + contact.displayName + "' to contacts.");
                        this.contacts[contact.localId] = contact;
                    }
                }
            }
            else {
                exchWebService.commonAbFunctions.logInfo("ERROR Rootdirectory '" + schema + "' does not exist.");
            }
        }

        this._UUID = exchWebService.commonAbFunctions.getRootUUID();
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: this is a root:" + aURI);

        this._isInitialized = true;
    },

    // Deletes either a mailing list or a top
    // level directory, which also updates the
    // preferences
    //void deleteDirectory(in nsIAbDirectory directory);
    deleteDirectory: function _deleteDirectory(directory) {
        // We cannot remove the root.
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: deleteDirectory this:" + this.URI + ", directory:" + directory.URI + "\n");

        return;

        //exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: deleteDirectory uri:"+directory.URI+"\n");
    },

    // Check if directory contains card
    // If the implementation is asynchronous the card
    // may not yet have arrived. If it is in the process
    // of obtaining cards the method will throw an
    // NS_ERROR_NOT_AVAILABLE exception if the card
    // cannot be found.
    //boolean hasCard(in nsIAbCard cards);
    hasCard: function _hasCard(cards) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: hasCard\n");
        return false;
    },


    // Check if directory contains directory
    //boolean hasDirectory(in nsIAbDirectory dir);
    hasDirectory: function _hasDirectory(dir) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: hasDirectory\n");

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
        return null;
    },

    /**
     * Modifies a card in the database to match that supplied.
     */
    //void modifyCard(in nsIAbCard modifiedCard);
    modifyCard: function _modifyCard(modifiedCard) {
        return null;
    },

    /**
     * Deletes the array of cards from the database.
     *
     * @param  aCards  The cards to delete from the database.
     */
    //void deleteCards(in nsIArray aCards);
    deleteCards: function _deleteCards(aCards) {
        return null;
    },

    //void dropCard(in nsIAbCard card, in boolean needToCopyCard);
    dropCard: function _dropCard(Card, needToCopyCard) {
        return null;
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: useForAutocomplete\n");

        return false;
    },

    /** 
     * Does this directory support mailing lists? Note that in the case
     * this directory is a mailing list and nested mailing lists are not
     * supported, this will return false rather than true which the parent
     * directory might.
     */
    //readonly attribute boolean supportsMailingLists;
    get supportsMailingLists() {
        return false;
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get addressLists\n");
        return this._addressLists;
    },

    set addressLists(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: set addressLists\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: addMailList\n");
        return list;
    },

    /**
     * Nick Name of the mailing list. This attribute is only really used when
     * the nsIAbDirectory represents a mailing list.
     */
    //attribute AString listNickName;
    get listNickName() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get listNickName\n");
        return this._listNickName;
    },

    set listNickName(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: set listNickName\n");
        this._listNickName = aValue;
    },

    /**
     * Description of the mailing list. This attribute is only really used when
     * the nsIAbDirectory represents a mailing list.
     */
    //attribute AString description;
    get description() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get description\n");
        return this._description;
    },

    set description(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: set description\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: editMailListToDatabase\n");
    },

    // Copies mail list properties from the srcList
    //void copyMailList(in nsIAbDirectory srcList);
    copyMailList: function _copyMailList(srcList) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: copyMailList\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: createNewDirectory uuid:" + this.uuid + "\n");
        return "createNewDirectory";
    },


    /* create a directory by passing the display name and address book uri */
    //void createDirectoryByURI(in AString displayName, in ACString aURI);
    createDirectoryByURI: function _createDirectoryByURI(displayName, aURI) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: createDirectoryByURI uuid:" + this.uuid + "\n");
    },
    /**
     * The id of the directory used in prefs e.g. "ldap_2.servers.pab"
     * Setting this will cause directoryPrefs to be updated.
     */
    //attribute ACString dirPrefId;
    get dirPrefId() {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: get dirPrefId: " + this.uuid);
        if (this._dirPrefId) {
            return this._dirPrefId;
        }
        return "ldap_2.servers.exchangecontacts";
    },

    set dirPrefId(aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: set dirPrefId\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getIntValue\n");
        return aDefaultValue;
    },

    //boolean getBoolValue(in string aName, in boolean aDefaultValue);
    getBoolValue: function _getBoolValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getBoolValue\n");
        return aDefaultValue;
    },

    //ACString getStringValue(in string aName, in ACString aDefaultValue);
    getStringValue: function _getStringValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getStringValue\n");
        return aDefaultValue;
    },

    //AUTF8String getLocalizedStringValue(in string aName, in AUTF8String aDefaultValue);
    getLocalizedStringValue: function _getLocalizedStringValue(aName, aDefaultValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: getLocalizedStringValue\n");
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
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: setIntValue\n");
    },

    //void setBoolValue(in string aName, in boolean aValue);
    setBoolValue: function _setBoolValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: setBoolValue\n");
    },

    //void setStringValue(in string aName, in ACString aValue);
    setStringValue: function _setStringValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: setStringValue\n");
    },

    //void setLocalizedStringValue(in string aName, in AUTF8String aValue);
    setLocalizedStringValue: function _setLocalizedStringValue(aName, aValue) {
        exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: setLocalizedStringValue\n");
    },

    //@}


};


function NSGetFactory(cid) {

    exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: NSGetFactory for exchangeAbRootDirectory 1");
    try {
        if (!NSGetFactory.exchWebService_ab2) {
            exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: NSGetFactory for exchangeAbRootDirectory 1a");

            NSGetFactory.exchWebService_ab2 = XPCOMUtils.generateNSGetFactory([exchangeAbRootDirectory]);
        }

    }
    catch (e) {
        Components.utils.reportError(e);
        exchWebService.commonAbFunctions.logInfo(e);
        throw e;
    }

    exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory: NSGetFactory for exchangeAbRootDirectory 2");
    return NSGetFactory.exchWebService_ab2(cid);
}

exchWebService.commonAbFunctions.logInfo("exchangeAbRootDirectory. init.");
