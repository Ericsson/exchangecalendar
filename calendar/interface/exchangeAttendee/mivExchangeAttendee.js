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

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

const participationMap = {
    "Unknown": "NEEDS-ACTION",
    "NoResponseReceived": "NEEDS-ACTION",
    "Tentative": "TENTATIVE",
    "Accept": "ACCEPTED",
    "Decline": "DECLINED",
    "Organizer": "ACCEPTED"
};

var EXPORTED_SYMBOLS = ["mivExchangeAttendee"];

function mivExchangeAttendee() {
    this._attendee = Cc["@mozilla.org/calendar/attendee;1"].createInstance(Ci.calIAttendee);
}

var mivExchangeAttendeeGUID = "0bc8c910-70f4-4c5c-a2cd-e2657ca53595";

mivExchangeAttendee.prototype = {

    _className: "mivExchangeAttendee",

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAttendee,
        Ci.calIAttendee,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange calendar Attendee.",
    classID: components.ID("{" + mivExchangeAttendeeGUID + "}"),
    contractID: "@1st-setup.nl/exchange/attendee;1",
    flags: 0,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // methods from nsIClassInfo

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeAttendee,
            Ci.calIAttendee,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    //  readonly attribute boolean isMutable;
    get isMutable() {
        return this._attendee.isMutable;
    },

    // makes this item immutable
    //  void makeImmutable();
    makeImmutable: function _makeImmutable() {
        this._attendee.makeImmutable();
    },

    cloneToCalAttendee: function _cloneToCalAttendee(aCalAttendee) {
        this._attendee = aCalAttendee.clone();
    },

    // clone always returns a mutable event
    //  calIAttendee clone();
    clone: function _clone() {

        var a = new mivExchangeAttendee();
        a.cloneToCalAttendee(this._attendee);
        a.parent = this.parent;
        return a;
    },

    //  attribute AUTF8String id;
    get id() {
        return this._attendee.id;
    },

    set id(aValue) {
        this._attendee.id = aValue;
    },

    //  attribute AUTF8String commonName;
    get commonName() {
        return this._attendee.commonName;
    },

    set commonName(aValue) {
        this._attendee.commonName = aValue;
    },

    //  attribute AUTF8String rsvp;
    get rsvp() {
        return this._attendee.rsvp;
    },

    set rsvp(aValue) {
        this._attendee.rsvp = aValue;
    },

    /** 
     * If true, indicates that this is not a standard attendee, but rather this
     * icalProperty corresponds to the organizer of the event (rfc2445 Sec 4.8.4.3)
     */
    //  attribute boolean isOrganizer;
    get isOrganizer() {
        return this._attendee.isOrganizer;
    },

    set isOrganizer(aValue) {
        this._attendee.isOrganizer = aValue;
    },

    /**
     * CHAIR
     * REQ-PARTICIPANT
     * OPT-PARTICIPANT
     * NON-PARTICIPANT
     */
    //  attribute AUTF8String    role;
    get role() {
        return this._attendee.role;
    },

    set role(aValue) {
        this._attendee.role = aValue;
    },

    /**
     * NEEDS-ACTION
     * ACCEPTED
     * DECLINED
     * TENTATIVE
     * DELEGATED
     * COMPLETED
     * IN-PROCESS
     */
    //  attribute AUTF8String    participationStatus;
    get participationStatus() {
        return this._attendee.participationStatus;
    },

    set participationStatus(aValue) {
        //dump("attendee: changing participationStatus from '"+this._attendee.participationStatus+"' to '"+aValue+"' for id:"+this.id+"\n");
        this._attendee.participationStatus = aValue;
    },

    /**
     * INDIVIDUAL
     * GROUP
     * RESOURCE
     * ROOM
     * UNKNOWN
     */
    //  attribute AUTF8String    userType;
    get userType() {
        return this._attendee.userType;
    },

    set userType(aValue) {
        this._attendee.userType = aValue;
    },

    //  readonly attribute nsISimpleEnumerator propertyEnumerator;
    get propertyEnumerator() {
        return this._attendee.propertyEnumerator;
    },

    // If you use the has/get/set/deleteProperty
    // methods, property names are case-insensitive.
    // 
    // For purposes of ICS serialization, all property names in
    // the hashbag are in uppercase.
    //  AUTF8String getProperty(in AString name);
    getProperty: function _getProperty(name) {
        return this._attendee.getProperty(name);
    },

    //  void setProperty(in AString name, in AUTF8String value);
    setProperty: function _setProperty(name, value) {
        this._attendee.setProperty(name, value);
    },

    //  void deleteProperty(in AString name);
    deleteProperty: function _deleteProperty(name) {
        this._attendee.deleteProperty(name);
    },

    //  attribute calIIcalProperty icalProperty;
    get icalProperty() {
        return this._attendee.icalProperty;
    },

    set icalProperty(aValue) {
        this._attendee.icalProperty = aValue;
    },

    //  attribute AUTF8String icalString;
    get icalString() {
        return this._attendee.icalString;
    },

    set icalString(aValue) {
        this._attendee.icalString = aValue;
    },


    /**
     * The display name of the attendee. If the attendee has a common name, this
     * is used. Otherwise, the attendee id is displayed (often an email), with the
     * mailto: prefix dropped.
     */
    //  AUTF8String toString();
    toString: function _toString() {
        return this._attendee.toString();
    },

    // attribute mivExchangeBaseItem parent;
    get parent() {
        return this._parent;
    },

    set parent(aValue) {
        this._parent = aValue;
    },

    convertFromExchange: function _convertFromExchange(aParent, aElement, aType) {
        if (!aElement) return null;

        this._parent = aParent;

        let mbox = xml2json.getTag(aElement, "t:Mailbox");

        if (!aType) {
            aType = "REQ-PARTICIPANT";
        }

        var me = false;

        for each(var alias in aParent.mailboxAliases) {
            if (xml2json.getTagValue(mbox, "t:EmailAddress", "unknown").toLowerCase() == alias.toLowerCase()) {
                me = true;
                //dump("convertFromExchange: Title:"+aParent.title+", email:"+xml2json.getTagValue(mbox, "t:EmailAddress","unknown")+". This address is mine ("+alias+").\n");
                break;
            }
        }

        // We also need to check aliases but these do not get stored yet.

        switch (xml2json.getTagValue(mbox, "t:RoutingType", "unknown")) {
        case "SMTP":
            this.id = 'mailto:' + xml2json.getTagValue(mbox, "t:EmailAddress", "unknown");
            break;
        case "EX":
            this.id = 'ldap:' + xml2json.getTagValue(mbox, "t:EmailAddress", "unknown");
            break;
        default:
            //dump("convertFromExchange: Unknown RoutingType:'"+xml2json.getTagValue(mbox, "t:RoutingType")+"'\n");
            this.id = 'mailto:' + xml2json.getTagValue(mbox, "t:EmailAddress", "unknown");
            break;
        }
        this.commonName = xml2json.getTagValue(mbox, "t:Name");
        this.rsvp = "FALSE";
        this.userType = "INDIVIDUAL";
        this.role = aType;

        if (me) {
            this.participationStatus = participationMap[aParent.myResponseType];
            //dump("convertFromExchange A: Title:"+aParent.title+", attendee:"+this.id+", myResponseType:"+aParent.myResponseType+", this.participationStatus:"+this.participationStatus+"\n");
        }
        else {
            if (xml2json.getTagValue(aElement, "t:ResponseType", "") != "") {
                this.participationStatus = participationMap[xml2json.getTagValue(aElement, "t:ResponseType")];
                //dump("convertFromExchange B: Title:"+aParent.title+", attendee:"+this.id+", ResponseType:"+xml2json.getTagValue(aElement, "t:ResponseType")+", this.participationStatus:"+this.participationStatus+"\n");
            }
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAttendee) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAttendee = XPCOMUtils.generateNSGetFactory([mivExchangeAttendee]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAttendee(cid);
}
