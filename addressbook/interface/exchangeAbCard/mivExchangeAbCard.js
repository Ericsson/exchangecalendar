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

function mivExchangeAbCard() {

    this._abCard = Cc["@mozilla.org/addressbook/cardproperty;1"]
        .createInstance(Ci.nsIAbCard);

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this._readOnly = false;

    this._photo = null;
}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.abcard.';

var mivExchangeAbCardGUID = "5b42082a-d0f7-490a-80d2-a0a221bf23ec";

mivExchangeAbCard.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAbCard,
        Ci.nsIAbItem,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange Addressbook card.",
    classID: components.ID("{" + mivExchangeAbCardGUID + "}"),
    contractID: "@1st-setup.nl/exchange/abcard;1",
    flags: Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods

    // nsAbItem.idl
    //  readonly attribute AUTF8String uuid;
    get uuid() {
        return this._abCard.uuid;
    },

    //  AString generateName(in long aGenerateFormat,
    //                       [optional] in nsIStringBundle aBundle);
    generateName: function _generateName(aGenerateFormat, aBundle) {
        return this._abCard.generateName(aGenerateFormat, aBundle);
    },

    // nsAbCard.idl
    //  attribute AUTF8String directoryId;
    get directoryId() {
        return this._abCard.directoryId;
    },

    set directoryId(aValue) {
        this._abCard.directoryId = aValue;
    },

    //  attribute AUTF8String localId;
    get localId() {
        return this._abCard.localId;
    },

    set localId(aValue) {
        this._abCard.localId = aValue;
    },

    //  readonly attribute nsISimpleEnumerator properties;
    get properties() {
        return this._abCard.properties;
    },

    //  nsIVariant getProperty(in AUTF8String name, in nsIVariant defaultValue);
    getProperty: function _getProperty(name, defaultValue) {
        return this._abCard.getProperty(name, defaultValue);
    },

    //  AString getPropertyAsAString(in string name);
    getPropertyAsAString: function _getPropertyAsAString(name) {
        return this._abCard.getProperty(name, "");
    },

    //  AUTF8String getPropertyAsAUTF8String(in string name);
    getPropertyAsAUTF8String: function _getPropertyAsAUTF8String(name) {
        return this._abCard.getProperty(name, "");
    },

    //  unsigned long getPropertyAsUint32(in string name);
    getPropertyAsUint32: function _getPropertyAsUint32(name) {
        return this._abCard.getProperty(name, 0);
    },

    //  boolean getPropertyAsBool(in string name);
    getPropertyAsBool: function _getPropertyAsBool(name) {
        return this._abCard.getProperty(name, true);
    },

    //  void setProperty(in AUTF8String name, in nsIVariant value);
    setProperty: function _setProperty(name, value) {
        if (name == "PrimaryEmail") {
            if ((value.indexOf("SMTP:") > -1) || (value.indexOf("smtp:") > -1)) {
                value = value.substr(5);
            }
        }
        this._abCard.setProperty(name, value);
    },

    //  void setPropertyAsAString(in string name, in AString value);
    setPropertyAsAString: function _setPropertyAsAString(name, value) {
        this._abCard.setProperty(name, value);
    },

    //  void setPropertyAsAUTF8String(in string name, in AUTF8String value);
    setPropertyAsAUTF8String: function _setPropertyAsAUTF8String(name, value) {
        this._abCard.setProperty(name, value);
    },

    //  void setPropertyAsUint32(in string name, in unsigned long value);
    setPropertyAsUint32: function _setPropertyAsUint32(name, value) {
        this._abCard.setProperty(name, value);
    },

    //  void setPropertyAsBool(in string name, in boolean value);
    setPropertyAsBool: function _setPropertyAsBool(name, value) {
        this._abCard.setProperty(name, value);
    },

    //  void deleteProperty(in AUTF8String name);
    deleteProperty: function _deleteProperty(name) {
        this._abCard.deleteProperty(name);
    },

    //  attribute AString firstName;
    get firstName() {
        return this._abCard.firstName;
    },

    set firstName(aValue) {
        this._abCard.firstName = aValue;
    },

    //  attribute AString lastName;
    get lastName() {
        return this._abCard.lastName;
    },

    set lastName(aValue) {
        this._abCard.lastName = aValue;
    },

    //  attribute AString displayName;
    get displayName() {
        return this._abCard.displayName;
    },

    set displayName(aValue) {
        this._abCard.displayName = aValue;
    },

    //  attribute AString primaryEmail;
    get primaryEmail() {
        return this._abCard.primaryEmail;
    },

    set primaryEmail(aValue) {
        if ((aValue.indexOf("SMTP:") > -1) || (aValue.indexOf("smtp:") > -1)) {
            this._abCard.primaryEmail = aValue.substr(5);
        }
        else {
            this._abCard.primaryEmail = aValue;
        }
    },

    //  boolean hasEmailAddress(in AUTF8String aEmailAddress);
    hasEmailAddress: function _hasEmailAddress(aEmailAddress) {
        return this._abCard.hasEmailAddress(aEmailAddress);
    },

    //  AUTF8String translateTo(in AUTF8String aType);
    translateTo: function _translateTo(aType) {
        return this._abCard.translateTo(aType);
    },

    //  AString generatePhoneticName(in boolean aLastNameFirst);
    generatePhoneticName: function _generatePhoneticName(aLastNameFirst) {
        return this._abCard.generatePhoneticName(aLastNameFirst);
    },

    //  AString generateChatName();
    generateChatName: function _generateChatName() {
        return this._abCard.generateChatName();
    },

    //  void copy(in nsIAbCard aSrcCard);
    copy: function _copy(aSrcCard) {
        this._abCard.copy(aSrcCard);
    },

    //  boolean equals(in nsIAbCard aCard);
    equals: function _equals(aCard) {
        return this._abCard.equals(aCard);
    },

    //  attribute boolean isMailList;
    get isMailList() {
        return this._abCard.isMailList;
    },

    set isMailList(aValue) {
        this._abCard.isMailList = aValue;
    },

    //  attribute string mailListURI;
    get mailListURI() {
        return this._abCard.mailListURI;
    },

    set mailListURI(aValue) {
        this._abCard.mailListURI = aValue;
    },

    // External methods.
    //	attribute boolean readOnly;
    get readOnly() {
        return this._readOnly;
    },

    set readOnly(aValue) {
        this._readOnly = aValue;
    },

    //	readonly attribute unsigned long type;
    get type() {
        return this._type;
    },

    //	readonly attribute AUTF8String routingType;
    get routingType() {
        return this._routingType;
    },

    //	readonly attribute AUTF8String mailboxType;
    get mailboxType() {
        return this._mailboxType;
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

    //	void convertExchangeDistListToCard(in jsval aParent, in jsval aExchangeContact, in AUTF8String aURI);  
    convertExchangeDistListToCard: function _convertExchangeDistListToCard(aParent, aExchangeContact, aURI) {
        this.logInfo("convertExchangeDistListToCard: aURI:" + aURI);

        if (!aURI) {
            return;
        }

        this.directoryId = aParent.uuid;
        this.localId = aExchangeContact.getAttributeByTag("t:ItemId", "Id", null);
        if (!this.localId) {
            this.localId = aExchangeContact.getTagValue("t:RoutingType", "SMTP") + ":" + aExchangeContact.getTagValue("t:EmailAddress", "");
        }
        var tmpAddress = aExchangeContact.getTagValue("t:EmailAddress", "");
        if ((tmpAddress.indexOf("SMTP:") > -1) | (tmpAddress.indexOf("smtp:") > -1)) {
            tmpAddress = tmpAddress.substr(5);
        }
        this.setProperty("PrimaryEmail", tmpAddress);
        this.setProperty("DisplayName", decodeURIComponent(aExchangeContact.getTagValue("t:Name", "")));

        this.isMailList = true;
        this.mailListURI = aURI;
        this._type = Ci.mivExchangeAbCard.CARD_TYPE_MAILLIST;

    },

    //	void convertExchangeContactToCard(in jsval aParent, in jsval aExchangeContact, in AUTF8String aMailboxType);
    convertExchangeContactToCard: function _convertExchangeContactToCard(aParent, aExchangeContact, aMailboxType) {
        //this.logInfo("convertExchangeContactToCard: "+aExchangeContact.toString());

        this.logInfo("convertExchangeContactToCard: aExchangeContact.tagName:" + aExchangeContact.tagName);

        this._photo = null;

        var contacts = new Array();
        var mailbox = new Array();
        if (aExchangeContact.tagName == "Resolution") {
            var contacts = aExchangeContact.getTags("t:Contact");
            var mailbox = aExchangeContact.getTags("t:Mailbox");
            if ((contacts.length == 0) && (mailbox.length == 0)) {
                this.logInfo("convertExchangeContactToCard: No valid contact information available in:" + aExchangeContact.toString());
                return;
            }

            if (contacts.length > 0) {
                aExchangeContact = contacts[0];
            }
            else {
                aExchangeContact = mailbox[0];
            }

        }

        this.isMailList = false;
        this.directoryId = aParent.uuid;
        if (aExchangeContact.tagName == "Mailbox") {
            this.logInfo("convertExchangeContactToCard: Processing as Mailbox only.");
            this._type = Ci.mivExchangeAbCard.CARD_TYPE_MAILBOX;
            this.localId = aExchangeContact.getTagValue("t:RoutingType", "SMTP") + ":" + aExchangeContact.getTagValue("t:EmailAddress", "");
            this.setProperty("DisplayName", aExchangeContact.getTagValue("t:Name", ""));
            var tmpAddress = aExchangeContact.getTagValue("t:EmailAddress", "");
            if ((tmpAddress.indexOf("SMTP:") > -1) | (tmpAddress.indexOf("smtp:") > -1)) {
                tmpAddress = tmpAddress.substr(5);
            }
            this.setProperty("PrimaryEmail", tmpAddress);

            /*			this.setProperty("FirstName", "");
            			this.setProperty("LastName", "");
            			this.setProperty("JobTitle", "");
            			this.setProperty("Department", "");
            			this.setProperty("Company", "");

            			this.setProperty("HomePhone", "");

            			this.setProperty("WorkPhone", "");
            			this.setProperty("WorkPhone2", "");
            			this.setProperty("CellularNumber", "");
            			this.setProperty("PagerNumber", "");
            			this.setProperty("FaxNumber", "");

            			this.setProperty("_AimScreenName", "");
            			this.setProperty("WebPage1", "");

            			this.setProperty("Notes", "");*/

            this.deleteProperty("PhotoType");
            this.deleteProperty("PhotoData");

            this._routingType = aExchangeContact.getTagValue("t:RoutingType");
            this._mailboxType = aExchangeContact.getTagValue("t:MailboxType");
        }
        else {
            switch (aMailboxType) {
            case "Mailbox":
                this._type = Ci.mivExchangeAbCard.CARD_TYPE_MAILBOX;
                break;
            case "Contact":
                this._type = Ci.mivExchangeAbCard.CARD_TYPE_CONTACT;
                break;
            case "OneOff":
                this._type = Ci.mivExchangeAbCard.CARD_TYPE_ONEOFF;
                break;
            }
            this.localId = aExchangeContact.getAttributeByTag("t:ItemId", "Id", null);
            this.setProperty("X-ChangeKey", aExchangeContact.getAttributeByTag("t:ItemId", "ChangeKey", ""));
            this.setProperty("X-ContactSource", aExchangeContact.getTagValue("t:ContactSource", ""));
            this.setProperty("DisplayName", aExchangeContact.getTagValue("t:DisplayName", ""));
            this.setProperty("FirstName", aExchangeContact.getTagValue("t:GivenName", ""));
            this.setProperty("LastName", aExchangeContact.getTagValue("t:Surname", ""));

            // We need to check which email address is primary. For exchange it will start with 'SMTP:' (in capital)
            if (mailbox.length > 0) {
                this.logInfo("convertExchangeContactToCard: Processing as Contact and Mailbox.");
                var primaryEmail = mailbox[0].getTagValue('t:EmailAddress', "");
                if ((primaryEmail.indexOf("SMTP:") == 0) || (primaryEmail.indexOf("smtp:") == 0)) {
                    primaryEmail = primaryEmail.substr(5);
                }
                var secondEmail = aExchangeContact.getTagValueByXPath('/t:EmailAddresses/t:Entry[@Key="EmailAddress1"]', "");
                if ((secondEmail.indexOf("SMTP:") == 0) || (secondEmail.indexOf("smtp:") == 0)) {
                    secondEmail = secondEmail.substr(5);
                }
                this._routingType = mailbox[0].getTagValue("t:RoutingType");
                this._mailboxType = mailbox[0].getTagValue("t:MailboxType");
            }
            else {
                this.logInfo("convertExchangeContactToCard: Processing as Contact only.");
                var primaryEmail = aExchangeContact.getTagValueByXPath('/t:EmailAddresses/t:Entry[@Key="EmailAddress1"]', "");
                var secondEmail = aExchangeContact.getTagValueByXPath('/t:EmailAddresses/t:Entry[@Key="EmailAddress2"]', "");
                if (primaryEmail.indexOf("SMTP:") > -1) {
                    primaryEmail = primaryEmail.substr(primaryEmail.indexOf("SMTP:") + 5);
                    if (secondEmail.indexOf("smtp:") > -1) {
                        secondEmail = secondEmail.substr(secondEmail.indexOf("smtp:") + 5);
                    }
                }
                else {
                    if (secondEmail.indexOf("SMTP:") > -1) {
                        var tmpPrimary = primaryEmail;
                        primaryEmail = secondEmail.substr(secondEmail.indexOf("SMTP:") + 5);
                        secondEmail = tmpPrimary;
                        if (secondEmail.indexOf("smtp:") > -1) {
                            secondEmail = secondEmail.substr(secondEmail.indexOf("smtp:") + 5);
                        }
                    }
                }
            }

            this.logInfo("convertExchangeContactToCard: primaryEmail:" + primaryEmail + ", secondEmail:" + secondEmail);

            if (!this.localId) {
                this.localId = aExchangeContact.getTagValue("t:ContactSource", "") + ":" + primaryEmail;
            }
            this.setProperty("PrimaryEmail", primaryEmail);
            this.setProperty("SecondEmail", secondEmail);

            this.setProperty("JobTitle", aExchangeContact.getTagValue("t:JobTitle", ""));
            this.setProperty("Department", aExchangeContact.getTagValue("t:Department", ""));
            this.setProperty("Company", aExchangeContact.getTagValue("t:CompanyName", ""));

            this.setProperty("HomePhone", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="HomePhone"]', ""));

            this.setProperty("WorkPhone", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="BusinessPhone"]', ""));
            this.setProperty("WorkPhone2", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="BusinessPhone2"]', ""));
            this.setProperty("CellularNumber", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="MobilePhone"]', ""));
            this.setProperty("PagerNumber", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="Pager"]', ""));
            this.setProperty("FaxNumber", aExchangeContact.getTagValueByXPath('/t:PhoneNumbers/t:Entry[@Key="Telex"]', ""));

            var homeDetails = aExchangeContact.XPath('/t:PhysicalAddresses/t:Entry[@Key="Home"]');
            if (homeDetails.length > 0) {
                this.setProperty("HomeAddress", homeDetails[0].getTagValue('t:Street', ""));
                this.setProperty("HomeCity", homeDetails[0].getTagValue('t:City', ""));
                this.setProperty("HomeState", homeDetails[0].getTagValue('t:State', ""));
                this.setProperty("HomeCountry", homeDetails[0].getTagValue('t:CountryOrRegion', ""));
                this.setProperty("HomeZipCode", homeDetails[0].getTagValue('t:PostalCode', ""));
            }

            var workDetails = aExchangeContact.XPath('/t:PhysicalAddresses/t:Entry[@Key="Business"]');
            if (workDetails.length > 0) {
                this.setProperty("WorkAddress", workDetails[0].getTagValue('t:Street', ""));
                this.setProperty("WorkCity", workDetails[0].getTagValue('t:City', ""));
                this.setProperty("WorkState", workDetails[0].getTagValue('t:State', ""));
                this.setProperty("WorkCountry", workDetails[0].getTagValue('t:CountryOrRegion', ""));
                this.setProperty("WorkZipCode", workDetails[0].getTagValue('t:PostalCode', ""));
            }

            var otherDetails = aExchangeContact.XPath('/t:PhysicalAddresses/t:Entry[@Key="Other"]');
            if (otherDetails.length > 0) {
                this.setProperty("OtherAddress", otherDetails[0].getTagValue('t:Street', ""));
                this.setProperty("OtherCity", otherDetails[0].getTagValue('t:City', ""));
                this.setProperty("OtherState", otherDetails[0].getTagValue('t:State', ""));
                this.setProperty("OtherCountry", otherDetails[0].getTagValue('t:CountryOrRegion', ""));
                this.setProperty("OtherZipCode", otherDetails[0].getTagValue('t:PostalCode', ""));
            }

            this.setProperty("_AimScreenName", aExchangeContact.getTagValueByXPath('/t:ImAddresses/t:Entry[@Key="ImAddress"]', ""));
            this.setProperty("WebPage1", aExchangeContact.getTagValue("t:BusinessHomePage", ""));

            this.setProperty("Notes", aExchangeContact.getTagValue("t:Body", ""));

            var birthDay = aExchangeContact.getTagValue("t:Birthday");

            if (birthDay) {
                this.setProperty("BirthYear", birthDay.substr(0, 4));
                this.setProperty("BirthMonth", birthDay.substr(5, 2));
                this.setProperty("BirthDay", birthDay.substr(8, 2));
            }

            //dump("!!! Checking if we have a photo element: "+primaryEmail+"\n");
            this._photo = aExchangeContact.getTagValue("t:Photo", null)
            if (this._photo) {
                this.setProperty("PhotoType", "exchangeContactPhotoInline");
                this.setProperty("PhotoData", this._photo);
                //dump("!!! We have a photo element: "+primaryEmail+"\n");
            }
            else {
                // See if we have an IsContactPhoto attachment element.
                var attachments = aExchangeContact.XPath('/t:Attachments/t:FileAttachment[/t:IsContactPhoto="true"]');
                if (attachments.length > 0) {
                    this.setProperty("PhotoType", "exchangeContactPhotoExternal");
                    this.setProperty("PhotoData", attachments[0].getAttributeByTag("t:AttachmentId", "Id", null));
                    //dump("!!! We have a photo attachment: "+primaryEmail+"\n");
                }
                else {
                    this.deleteProperty("PhotoType");
                    this.deleteProperty("PhotoData");
                    //dump("no photo: "+primaryEmail+"\n");
                }
                attachments = null;
            }
        }
    },

    get photo() {
        return this._photo;
    },

    set photo(aValue) {},

    get hasPhoto() {
        return (this._photo !== null);
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
        //this.storedDebugLevel = 1;

        if (debugLevel <= this.storedDebugLevel) {
            this.globalFunctions.LOG("[exchangeAbCard] " + message + " (" + this.globalFunctions.STACKshort() + ")");
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAbCard) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAbCard = XPCOMUtils.generateNSGetFactory([mivExchangeAbCard]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAbCard(cid);
}
