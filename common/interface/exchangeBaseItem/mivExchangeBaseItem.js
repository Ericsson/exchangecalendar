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

Cu.import("resource://exchangecommon/ecExchangeRequest.js");

Cu.import("resource://calendar/modules/calProviderUtils.jsm");

Cu.import("resource://interfacescalendartask/exchangeAttendee/mivExchangeAttendee.js");

Cu.import("resource://exchangecommoninterfaces/xml2jxon/mivIxml2jxon.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

const participationMap = {
    "Unknown": "NEEDS-ACTION",
    "NoResponseReceived": "NEEDS-ACTION",
    "Tentative": "TENTATIVE",
    "Accept": "ACCEPTED",
    "Decline": "DECLINED",
    "Organizer": "ACCEPTED"
};

const fieldPathMap = {
    'ActualWork': 'task',
    'AdjacentMeetingCount': 'calendar',
    'AdjacentMeetings': 'calendar',
    'AllowNewTimeProposal': 'calendar',
    'AppointmentReplyTime': 'calendar',
    'AppointmentSequenceNumber': 'calendar',
    'AppointmentState': 'calendar',
    'AssignedTime': 'task',
    'AssociatedCalendarItemId': 'meeting',
    'Attachments': 'item',
    'BillingInformation': 'task',
    'Body': 'item',
    'CalendarItemType': 'calendar',
    'Categories': 'item',
    'ChangeCount': 'task',
    'Companies': 'task',
    'CompleteDate': 'task',
    'ConferenceType': 'calendar',
    'ConflictingMeetingCount': 'calendar',
    'ConflictingMeetings': 'calendar',
    'Contacts': 'task',
    'ConversationId': 'item',
    'Culture': 'item',
    'DateTimeCreated': 'item',
    'DateTimeReceived': 'item',
    'DateTimeSent': 'item',
    'DateTimeStamp': 'calendar',
    'DelegationState': 'task',
    'Delegator': 'task',
    'DeletedOccurrences': 'calendar',
    'DisplayCc': 'item',
    'DisplayTo': 'item',
    'DueDate': 'task',
    'Duration': 'calendar',
    'EffectiveRights': 'item',
    'End': 'calendar',
    'EndTimeZone': 'calendar',
    'FirstOccurrence': 'calendar',
    'FolderClass': 'folder',
    'FolderId': 'folder',
    'HasAttachments': 'item',
    'HasBeenProcessed': 'meeting',
    'Importance': 'item',
    'InReplyTo': 'item',
    'IntendedFreeBusyStatus': 'meetingRequest',
    'InternetMessageHeaders': 'item',
    'IsAllDayEvent': 'calendar',
    'IsAssignmentEditable': 'task',
    'IsAssociated': 'item',
    'IsCancelled': 'calendar',
    'IsComplete': 'task',
    'IsDelegated': 'meeting',
    'IsDraft': 'item',
    'IsFromMe': 'item',
    'IsMeeting': 'calendar',
    'IsOnlineMeeting': 'calendar',
    'IsOutOfDate': 'meeting',
    'IsRecurring': 'calendar',
    'IsResend': 'item',
    'IsResponseRequested': 'calendar',
    'IsSubmitted': 'item',
    'IsTeamTask': 'task',
    'IsUnmodified': 'item',
    'ItemClass': 'item',
    'ItemId': 'item',
    'LastModifiedName': 'item',
    'LastModifiedTime': 'item',
    'LastOccurrence': 'calendar',
    'LegacyFreeBusyStatus': 'calendar',
    'Location': 'calendar',
    'MeetingRequestType': 'meetingRequest',
    'MeetingRequestWasSent': 'calendar',
    'MeetingTimeZone': 'calendar',
    'MeetingWorkspaceUrl': 'calendar',
    'Mileage': 'task',
    'MimeContent': 'item',
    'ModifiedOccurrences': 'calendar',
    'MyResponseType': 'calendar',
    'NetShowUrl': 'calendar',
    'OptionalAttendees': 'calendar',
    'Organizer': 'calendar',
    'OriginalStart': 'calendar',
    'Owner': 'task',
    'ParentFolderId': 'item',
    'PercentComplete': 'task',
    'Recurrence': 'calendar',
    'RecurrenceId': 'calendar',
    'ReminderDueBy': 'item',
    'ReminderIsSet': 'item',
    'ReminderMinutesBeforeStart': 'item',
    'RequiredAttendees': 'calendar',
    'Resources': 'calendar',
    'ResponseObjects': 'item',
    'ResponseType': 'meeting',
    'SearchParameters': 'folder',
    'Sensitivity': 'item',
    'Size': 'item',
    'Start': 'calendar',
    'StartDate': 'task',
    'StartTimeZone': 'calendar',
    'StatusDescription': 'task',
    'Status': 'task',
    'Subject': 'item',
    'TimeZone': 'calendar',
    'TotalWork': 'task',
    'UID': 'calendar',
    'UniqueBody': 'item',
    'WebClientEditFormQueryString': 'item',
    'WebClientReadFormQueryString': 'item',
    'When': 'calendar'
};

const dayRevMap = {
    'MO': 'Monday',
    'TU': 'Tuesday',
    'WE': 'Wednesday',
    'TH': 'Thursday',
    'FR': 'Friday',
    'SA': 'Saturday',
    'SU': 'Sunday'
};

const dayIdxMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const weekRevMap = {
    '1': 'First',
    '2': 'Second',
    '3': 'Third',
    '4': 'Fourth',
    '-1': 'Last'
};

const monthIdxMap = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const dayMap = {
    'Monday': 'MO',
    'Tuesday': 'TU',
    'Wednesday': 'WE',
    'Thursday': 'TH',
    'Friday': 'FR',
    'Saturday': 'SA',
    'Sunday': 'SU',
    'Weekday': ['MO', 'TU', 'WE', 'TH', 'FR'],
    'WeekendDay': ['SA', 'SO'],
    'Day': ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SO']
};

const weekMap = {
    'First': 1,
    'Second': 2,
    'Third': 3,
    'Fourth': 4,
    'Last': -1
};

const monthMap = {
    'January': 1,
    'February': 2,
    'March': 3,
    'April': 4,
    'May': 5,
    'June': 6,
    'July': 7,
    'August': 8,
    'September': 9,
    'October': 10,
    'November': 11,
    'December': 12
};

var EXPORTED_SYMBOLS = ["mivExchangeBaseItem"];

var exchGlobalFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);

function mivExchangeBaseItem() {

    this.initialize();

    this.initExchangeBaseItem();

    //dump("mivExchangeBaseItem: init\n");

}

var mivExchangeBaseItemGUID = "9bc0fca0-9465-11e2-9e96-0800200c9a66";

mivExchangeBaseItem.prototype = {

    _className: "mivExchangeBaseItem",
    _mainTag: "BaseItem",

    initExchangeBaseItem: function _initExchangeBaseItem() {

        this._exchangeData = null;
        this.updatedItem = {};
        this.newItem = {};

        this._changesAttendees = [];
        this._changesAttachments = [];
        this._changesAlarm = [];
        this._changedProperties = [];
        this.mailboxAliases = [];

        this._newBody = undefined;
        this._newLocation = undefined;
        this._newLegacyFreeBusyStatus = undefined;
        this._newMyResponseType = undefined;
        this._newIsInvitation = undefined;
        this._reminderSignalTime = undefined;
        this._newXMozSnoozeTime = undefined;
        this._nonPersonalDataChanged = false;

        this._occurrences = {};
        this._exceptions = {};

        this._isMutable = true;

        this._cloneCount = 0;

        //		this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        //					.getService(Ci.mivFunctions);

        //		this.timeZones = Cc["@1st-setup.nl/exchange/timezones;1"]
        //					.getService(Ci.mivExchangeTimeZones);

        //dump("initExchangeBaseItem: done.\n");

    },

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeBaseItem,
        Ci.calIInternalShallowCopy,
        Ci.calIItemBase,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange calendar BaseItem.",
    classID: components.ID("{" + mivExchangeBaseItemGUID + "}"),
    contractID: "@1st-setup.nl/exchange/calendarbaseitem;1",
    flags: 0,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // methods from nsIClassInfo

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeBaseItem,
            Ci.calIInternalShallowCopy,
            Ci.calIItemBase,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    // External methods calIInternalShallowCopy
    /**
     * create a proxy for this item; the returned item
     * proxy will have parentItem set to this instance.
     *
     * @param aRecurrenceId RECURRENCE-ID of the proxy to be created 
     */
    //calIItemBase createProxy(in calIDateTime aRecurrenceId);
    createProxy: function _createProxy(aRecurrenceId) {
        //dump("CreateProxy aRecurrenceId:"+aRecurrenceId);

        var occurrence;
        for each(var occurrence in this._occurrences) {
            if (occurrence.recurrenceId.compare(aRecurrenceId) == 0) break;
        }

        if (!occurrence) {
            for each(var occurrence in this._exceptions) {
                if (occurrence.recurrenceId.compare(aRecurrenceId) == 0) break;
            }
        }

        var newItem;
        if (occurrence) {
            newItem = occurrence.clone();
            newItem.parentItem = this;
        }

        //dump("CreateProxy the end");
        return newItem;
    },

    // used by recurrenceInfo when cloning proxy objects to
    // avoid an infinite loop.  aNewParent is optional, and is
    // used to set the parent of the new item; it should be null
    // if no new parent is passed in.
    //calIItemBase cloneShallow(in calIItemBase aNewParent);
    cloneShallow: function _cloneShallow(aNewParent) {
        //dump("cloneShallow aNewParent:"+aNewParent);
        var newItem = this.clone();
        if (aNewParent) {
            newItem.parentItem = aNewParent;
        }
        else {
            newItem.parentItem = null;
        }
        return newItem;
    },

    // External methods calIItemBase

    // returns true if this thing is able to be modified;
    // if the item is not mutable, attempts to modify
    // any data will throw CAL_ERROR_ITEM_IS_IMMUTABLE
    //readonly attribute boolean isMutable;
    get isMutable() {
        //dump("get isMutable: title:"+this.title+", value:"+this._calEvent.isMutable);
        return this._isMutable;
    },

    // makes this item immutable
    //void makeImmutable();
    makeImmutable: function _makeImmutable() {
        //dump("makeImmutable: title:"+this.title);
        this._isMutable = false;
    },


    typeString: function _typeString(o) {
        if (typeof o != 'object')
            return typeof o;

        if (o === null)
            return "null";
        //object, array, function, date, regexp, string, number, boolean, error
        var internalClass = Object.prototype.toString.call(o)
            .match(/\[object\s(\w+)\]/)[1];
        return internalClass.toLowerCase();
    },

    get cloneCount() {
        return this._cloneCount;
    },

    baseCloneFrom: function _baseCloneFrom(aItem) {
        //dump("mivExchangeBaseItem: baseCloneFrom 1: title:"+this.title+", contractId:"+this.contractID+"\n");
        try {
            this._cloneCount = aItem._cloneCount + 1;
            this._isMutable = aItem._isMutable;
            this._calendar = aItem._calendar;
            this._isAllDayEvent = aItem._isAllDayEvent;
            this._startTimeZoneId = aItem._startTimeZoneId;
            this._meetingTimeZone = aItem._meetingTimeZone;
            this._timeZone = aItem._timeZone;
            this._endTimeZoneId = aItem._endTimeZoneId;
            this._effectiveRights = aItem._effectiveRights;
            this._canDelete = aItem._canDelete;
            this._canModify = aItem._canModify;
            this._canRead = aItem._canRead;
            if (aItem._lastModifiedTime) this._lastModifiedTime = aItem._lastModifiedTime.clone();
            this._subject = aItem._subject;
            this._title = aItem._title;
            this._mimeContent = aItem._mimeContent;
            this._id = aItem._id;
            this._priority = aItem._priority;
            this._sensitivity = aItem._sensitivity;
            this._privacy = aItem._privacyl
            this._reminderIsSet = aItem._reminderIsSet;
            this._calendarItemType = aItem._calendarItemType;
            if (aItem._reminderDueBy) this._reminderDueBy = aItem._reminderDueBy.clone();
            this._reminderMinutesBeforeStart = aItem._reminderMinutesBeforeStart;
            if (aItem._dateTimeReceived) this._dateTimeReceived = aItem._dateTimeReceived.clone();
            if (aItem._dateTimeSent) this._dateTimeSent = aItem._dateTimeSent.clone();
            this._size = aItem._size;
            if (aItem._originalStart) this._originalStart = aItem._originalStart.clone();
            this._location = aItem._location;
            this._changeKey = aItem._changeKey;
            this._uid = aItem._uid;
            this._itemClass = aItem._itemClass;
            this._messageId = aItem._messageId;
            this._isMeeting = aItem._isMeeting;
            this._isRecurring = aItem._isRecurring;
            this._meetingRequestWasSent = aItem._meetingRequestWasSent;
            this._isResponseRequested = aItem._isResponseRequested;
            this._myResponseType = aItem._myResponseType;
            this._startTimeZoneName = aItem._startTimeZoneName;
            this._endTimeZoneName = aItem._endTimeZoneName;
            this._conferenceType = aItem._conferenceType;
            this._allowNewTimeProposal = aItem._allowNewTimeProposal;
            this._parentId = aItem._parentId;
            this._parentChangeKey = aItem._parentChangeKey;
            if (aItem._alarm) this._alarm = aItem._alarm.clone();
            if (aItem._reminderSignalTime) this._reminderSignalTime = aItem._reminderSignalTime.clone();
            this._xMozSnoozeTime = aItem._xMozSnoozeTime;
            if (aItem._alarmLastAck) this._alarmLastAck = aItem._alarmLastAck.clone();
            if (aItem._recurrenceInfo) {
                this._recurrenceInfo = aItem._recurrenceInfo.clone();
            }
            else {
                this._recurrenceInfo = aItem._recurrenceInfo;
            }

            this._occurrences = {};
            if (aItem._occurrences) {
                for each(var occurrence in aItem._occurrences) {
                    //dump("baseClone: aItem._ocurrences 1");
                    //this.removeOccurrence(occurrence);
                    this.addOccurrence(occurrence.clone());
                }
            }

            this._exceptions = {};
            if (aItem._exceptions) {
                for each(var exception in aItem._exceptions) {
                    //this.removeException(exception);
                    this.addException(exception.clone());
                }
            }

            this._bodyType = aItem._bodyType;
            this._body = aItem._body;
            if (aItem._dateTimeCreated) this._dateTimeCreated = aItem._dateTimeCreated.clone();
            if (aItem._created) this._created = aItem._created.clone();
            this._legacyFreeBusyStatus = aItem._legacyFreeBusyStatus;
            this._isCancelled = aItem._isCancelled;
            this._responseObjects = {};
            if (aItem._responseObjects) {
                for (var index in aItem._responseObjects) {
                    this._responseObjects[index] = aItem._responseObjects[index];
                }
            }
            this._type = aItem._type;
            if (aItem._organizer) this._organizer = aItem._organizer.clone();
            this._attendees = [];
            if (aItem._attendees) {
                for each(var attendee in aItem._attendees) {
                    this._attendees.push(attendee.clone());
                }
            }
            this._hasAttachments = aItem._hasAttachments;
            this._attachments = [];
            if (aItem._attachments) {
                for each(var attachment in aItem._attachments) {
                    this._attachments.push(attachment.clone());
                }
            }
            this._categories = [];
            if (aItem._categories) {
                for each(var category in aItem._categories) {
                    this._categories.push(category);
                }
            }
            this._recurrenceId = aItem._recurrenceId;

            if (aItem._occurrenceIndex) {
                this.occurrenceIndex = aItem._occurrenceIndex;
            }

        }
        catch (err) {
            dump(" @@@@@@@@@@@@@ mivExchangeEvent: baseCloneFrom Error:" + err + "\n");
        }
        //dump("mivExchangeBaseItem: baseCloneFrom 2: title:"+this.title+", contractId:"+this.contractID+"\n");
    },

    cloneFrom: function _cloneFrom(aItem) {
        /*for(var index in aItem) {
        	if ((this.typeString(aItem[index]) != "function") && (index.substr(0,1) == "_")) {
        		dump("aItem."+index+"="+aItem[index]+"\n");
        	}
        }*/
        //dump(" mivExchangeBaseItem: cloneFrom 1 \n");
        //dump(" mivExchangeBaseItem: cloneFrom 2 \n");
    },

    // clone always returns a mutable event
    //calIItemBase clone();
    clone: function _clone() {
        //dump("mivExchangeBaseItem: clone 1: title:"+this.title+", contractId:"+this.contractID+"\n");
        var result = new mivExchangeBaseItem();
        result.baseClone(this);
        return result;
        //dump("mivExchangeBaseItem: clone 1: title:"+this.title+", contractId:"+this.contractID+"\n");
    },

    baseClone: function _baseClone(aItem) {
        try {
            //dump("mivExchangeBaseItem: baseClone 1: title:"+this.title+", contractId:"+this.contractID+"\n");
            for each(var alias in aItem.mailboxAliases) {
                this.addMailboxAlias(alias);
            }
            this.cloneToCalEvent(aItem._calEvent);
            this.cloneFrom(aItem);

            if (aItem._newId !== undefined) result.id = aItem._newId;

            // We are going to replay all changes to clone
            if (aItem._newBody === null) this.deleteProperty("DESCRIPTION");
            if (aItem._newLocation === null) this.deleteProperty("LOCATION");
            if (aItem._newLegacyFreeBusyStatus === null) this.deleteProperty("TRANSP");
            if (aItem._newMyResponseType === null) this.deleteProperty("STATUS");
            if (aItem._newIsInvitation === null) this.deleteProperty("X-MOZ-SEND-INVITATIONS");

            if (aItem._newTitle) this.title = aItem.title;
            if (aItem._newPriority) this.priority = aItem.priority;
            if (aItem._newPrivacy) this.privacy = aItem.privacy;

            if (aItem._newAlarm !== undefined) {
                //dump("baseClone: We have alarm changes.\n");
                if (aItem._newAlarm) {
                    this.addAlarm(aItem._newAlarm);
                }
                else {
                    this.clearAlarms();
                }
            }

            if (aItem._newRecurrenceInfo !== undefined) {
                if (aItem._newRecurrenceInfo == null) {
                    this.recurrenceInfo = aItem._newRecurrenceInfo;
                }
                else {
                    this.recurrenceInfo = aItem._newRecurrenceInfo.clone();
                }
            }
            /*		else {
            			if (((aItem._recurrenceInfo) && (aItem.recurrenceInfo) && (aItem._recurrenceInfo.toString() != aItem.recurrenceInfo.toString())) || (aItem._recurrenceInfo !== aItem.recurrenceInfo)) {
            				if (aItem.recurrenceInfo) {
            					this.recurrenceInfo = aItem.recurrenceInfo.clone();
            				}
            				else {
            					this.recurrenceInfo = aItem.recurrenceInfo;
            				}
            			}
            		}*/

            if (aItem._newBodyType) this.bodyType = aItem.bodyType;

            if (aItem._newBody !== undefined) this.setProperty("DESCRIPTION", aItem.getProperty("DESCRIPTION"));
            if (aItem._newBody2 !== undefined) this.body = aItem.body;
            if (aItem._newLocation) this.setProperty("LOCATION", aItem.getProperty("LOCATION"));
            if (aItem._newLegacyFreeBusyStatus) this.setProperty("TRANSP", aItem.getProperty("TRANSP"));
            if (aItem._newMyResponseType) this.setProperty("STATUS", aItem.getProperty("STATUS"));
            if (aItem._newIsInvitation) this.setProperty("X-MOZ-SEND-INVITATIONS", aItem.getProperty("X-MOZ-SEND-INVITATIONS"));

            if (aItem._changedProperties) {
                for each(var change in aItem._changedProperties) {
                    switch (change.action) {
                    case "set":
                        this.setProperty(change.name, xml2json.getValue(change));
                        break;
                    case "remove":
                        this.deleteProperty(change.name);
                        break;
                    }
                }
            }
            if (aItem._newOrganizer) this.organizer = aItem.organizer.clone();

            if (aItem._changesAttendees) {
                for each(var attendee in aItem._changesAttendees) {
                    switch (attendee.action) {
                    case "add":
                        this.addAttendee(attendee.attendee);
                        break;
                    case "remove":
                        this.removeAttendee(attendee.attendee);
                        break;
                    }
                }
                var tmpattendees = this.getAttendees({});
            }

            if (aItem._changesAttachments) {
                for each(var attachment in aItem._changesAttachments) {
                    switch (attachment.action) {
                    case "add":
                        this.addAttachment(attachment.attachment);
                        break;
                    case "remove":
                        this.removeAttachment(attachment.attachment);
                        break;
                    }
                }
            }
            if (aItem._changesCategories) {
                var categories = aItem.getCategories({});
                this.setCategories(categories.length, categories);
            }

            if (aItem._newParentItem) this.parentItem = aItem.parentItem;
            if (aItem._newAlarmLastAck) this.alarmLastAck = aItem.alarmLastAck;

            //dump("mivExchangeBaseItem: baseClone 99: title:"+aItem.title+", startDate:"+this.startDate, -1);
        }
        catch (err) {
            dump("mivExchangeBaseItem: baseClone: error:" + err + "\n");
        }
        //dump("mivExchangeBaseItem: baseClone 2: title:"+this.title+", contractId:"+this.contractID+"\n");
    },

    /**
     * Hash Id that incorporates the item's UID, RECURRENCE-ID and calendar.id
     * to be used for lookup of items that come from different calendars.
     * Setting either id, recurrenceId or the calendar attribute leads to
     * a recomputation of hashId.
     *
     * @attention Individual implementors of calIItemBase must stick to the
     *            same algorithm that base/src/calItemBase.js uses.
     */
    //readonly attribute AUTF8String hashId;
    get hashId() {
        //this.id;
        //this.recurrenceId;
        //this.calendar;
        return this._calEvent.hashId;

        /*		 this._hashId = [encodeURIComponent(this.id),
        			this.recurrenceId ? this.recurrenceId.getInTimezone(exchGlobalFunctions.ecUTC()).icalString : "",
        			this.calendar ? encodeURIComponent(this.calendar.id) : ""].join("#");

        		//dump("get hashId: title:"+this.title+", value:"+this._hashId);
        		return this._hashId;*/
    },

    /**
     * Checks whether the argument object refers the same calendar item as
     * this one, by testing both the id and recurrenceId property.  This
     *
     * @arg aItem     the item to compare against this one
     *
     * @return        true if both ids match, false otherwise
     */
    //boolean hasSameIds(in calIItemBase aItem);
    hasSameIds: function _hasSameIds(aItem) {
        //dump("hasSameIds: title:"+this.title);
        return this._calEvent.hasSameIds(aItem);
    },

    get canDelete() {
        if (this._canDelete !== undefined) {
            return this._canDelete;
        }
        return true;
    },

    get canModify() {
        if (this._canModify !== undefined) {
            return this._canModify;
        }

        return true;
    },

    get canRead() {
        if (this._canRead !== undefined) {
            return this._canRead;
        }
        return true;
    },

    /**
     * Returns the acl entry associated to the item.
     */
    //readonly attribute calIItemACLEntry aclEntry;
    get aclEntry() {
        var result = {
            calendarEntry: this.calendar.aclEntry,
            userCanModify: ((this._canModify) || (this._canDelete)),
            userCanRespond: this._canModify,
            userCanViewAll: this._canRead,
            userCanViewDateAndTime: true,
        };
        return result;
    },

    //
    // the generation number of this item
    //
    //attribute PRUint32 generation;
    get generation() {
        return this._calEvent.generation;
    },

    set generation(aValue) {
        //dump("set generation: title:"+this.title);
        this._calEvent.generation = aValue;
    },

    // the time when this item was created
    //readonly attribute calIDateTime creationDate;
    get creationDate() {
        //dump("get creationDate: title:"+this.title+", value:"+this.dateTimeCreated);
        return this.dateTimeCreated;
    },

    // last time any attribute was modified on this item, in UTC
    //readonly attribute calIDateTime lastModifiedTime;
    get lastModifiedTime() {
        //dump("get lastModifiedTime: title:"+this.title+", value:"+this._lastModifiedTime);
        return this._lastModifiedTime;
    },

    // last time a "significant change" was made to this item
    //readonly attribute calIDateTime stampTime;
    get stampTime() {
        //dump("get stampTime: title:"+this.title+", value:"+this._calEvent.stampTime);
        return this._calEvent.stampTime;
    },

    // the calICalendar to which this event belongs
    //attribute calICalendar calendar;
    get calendar() {
        return this._calEvent.calendar;
    },

    set calendar(aValue) {
        this._calendar = aValue;
        this._calEvent.calendar = aValue;
    },

    // the ID of this event
    //attribute AUTF8String id;
    get id() {
        //dump("get id: title:"+this.title+", _id:"+this._id+", id:"+this._calEvent.id+"\n");
        //return this._calEvent.id;
        return this._id;
    },

    set id(aValue) {
        //dump("set id: title:"+this.title);
        return; // We do not allow this.
    },

    clearId: function _clearId(newId) {
        if (newId) {
            //dump("clearId newId:"+newId+"\n");
            this._id = newId;
            this._calEvent.id = newId;
        }
        else {
            //dump("clearId newId:undefined\n");
            this._id = undefined;
            this._calEvent.id = undefined;
        }
    },

    // event title
    //attribute AUTF8String title;
    get title() {
        //dump("get title: title:"+this._calEvent.title);
        if (this._newTitle) {
            return this._newTitle;
        }

        if (this._title) {
            return this._title;
        }

        return this._calEvent.title;
    },

    set title(aValue) {
        //dump("set title: oldTitle:"+this.title+", newTitle:"+aValue);
        if (aValue != this._title) {
            this._newTitle = aValue;
            this._calEvent.title = aValue;
        }
    },

    // event priority
    //attribute short priority;
    get priority() {
        //dump("get priority: title:"+this.title+", value:"+this._calEvent.priority);
        return this._calEvent.priority;
    },

    set priority(aValue) {
        //dump("set priority: title:"+this.title+", aValue:"+aValue);
        if (aValue != this.priority) {
            if (aValue > 5) {
                this._newPriority = "Low";
            }
            if (aValue == 5) {
                this._newPriority = "Normal";
            }
            if (aValue < 5) {
                this._newPriority = "High";
            }
            if (aValue == 0) {
                this._newPriority = "Normal";
            }
            this._calEvent.priority = aValue;
        }
    },

    //attribute AUTF8String privacy;
    get privacy() {
        //dump("get privacy: title:"+this.title+", value:"+this._calEvent.privacy);
        if (this._newPrivacy !== undefined) {
            const privacies = {
                "Normal": "PUBLIC",
                "Confidential": "CONFIDENTIAL",
                "Private": "PRIVATE",
                null: "PUBLIC"
            };

            return privacies[this._newPrivacy];
        }

        return this._calEvent.privacy;
    },

    set privacy(aValue) {
        //dump("set privacy: title:"+this.title+", aValue:"+aValue);
        if (aValue != this.privacy) {
            const privacies = {
                "PUBLIC": "Normal",
                "CONFIDENTIAL": "Confidential",
                "PRIVATE": "Private",
                null: "Normal"
            };
            this._newPrivacy = privacies[aValue];
            this._calEvent.privacy = aValue;
        }
    },

    // status of the event
    //attribute AUTF8String status;
    get status() {
        //dump("get status: title:"+this.title+", value:"+this._calEvent.status+", this._status:"+this._status);
        if (this._newStatus !== undefined) {
            return this._newStatus;
        }

        return this._calEvent.status;
    },

    set status(aValue) {
        if (aValue != this.status) {
            this._newStatus = aValue;
            this._calEvent.status = aValue;
        }
    },

    // ical interop; writing this means parsing
    // the ical string into this event
    //attribute AUTF8String icalString;
    get icalString() {
        //dump("get icalString: title:"+this.title+", value:"+this._calEvent.icalString);
        return this._calEvent.icalString;
    },

    set icalString(aValue) {
        //dump("set icalString: title:"+this.title+", aValue:"+aValue);
        this._calEvent.icalString = aValue;
    },

    // an icalComponent for this item, suitable for serialization.
    // the icalComponent returned is not live: changes in it or this
    // item will not be reflected in the other.
    //attribute calIIcalComponent icalComponent;
    get icalComponent() {
        //dump("get icalComponent: title:"+this.title+", value:"+this._calEvent.icalComponent);
        return this._calEvent.icalComponent;
    },

    set icalComponent(aValue) {
        //dump("set icalComponent: title:"+this.title+", aValue:"+aValue);
        this._calEvent.icalComponent = aValue;
    },

    //
    // alarms
    //

    alarmsAreEqual: function _alarmsAreEqual(aAlarm1, aAlarm2) {
        var result = false;

        if (((!aAlarm1) && (aAlarm2))
            || ((!aAlarm2) && (aAlarm1))) {
            return false;
        }

        if ((!aAlarm1) && (!aAlarm2)) {
            return true;
        }

        if ((((aAlarm1.alarmDate) && (aAlarm2.alarmDate) && (aAlarm1.alarmDate.compare(aAlarm2.alarmDate) == 0)) || ((!aAlarm1.alarmDate) && (!aAlarm2.alarmDate)))
            && (aAlarm1.related == aAlarm2.related)
            && (aAlarm1.offset == aAlarm2.offset)) {
            result = true;
        }

        return result;
    },

    /**
     * Get all alarms assigned to this item
     *
     * @param count       The number of alarms
     * @param aAlarms     The array of calIAlarms
     */
    //void getAlarms(out PRUint32 count, [array, size_is(count), retval] out calIAlarm aAlarms);
    getAlarms: function _getAlarms(count) {

        if (!this.canModify) {
            count.value = 0;
            return [];
        }

        return this._calEvent.getAlarms(count);
    },

    /**
     * Add an alarm to the item
     *
     * @param aAlarm      The calIAlarm to add
     */
    //void addAlarm(in calIAlarm aAlarm);
    addAlarm: function _addAlarm(aAlarm) {
        if (!aAlarm) return;
        // As exchange can only handle one alarm. We make sure there is only one.

        //dump("addAlarm 1: title:"+this.title+", aAlarm.alarmDate:"+aAlarm.alarmDate+", offset:"+aAlarm.offset+"("+this.calendarItemType+")\n");
        var alarms = this.getAlarms({}); // Preload
        this._calEvent.clearAlarms();

        if (((this._alarm) && (!this.alarmsAreEqual(this._alarm, aAlarm))) || (!this._alarm)) {
            //dump("addAlarm 2: title:"+this.title+", aAlarm.alarmDate:"+aAlarm.alarmDate+", offset:"+aAlarm.offset+"("+this.calendarItemType+")\n");
            this._newAlarm = aAlarm.clone();
        }
        this._calEvent.addAlarm(aAlarm.clone());
    },

    /**
     * Delete an alarm from the item
     *
     * @param aAlarm      The calIAlarm to delete
     */
    //void deleteAlarm(in calIAlarm aAlarm);
    deleteAlarm: function _deleteAlarm(aAlarm) {
        //dump("deleteAlarm: title:"+this.title+"("+this.calendarItemType+")\n");
        this._newAlarm = null;
        this._calEvent.clearAlarms();
    },

    /**
     * Clear all alarms from the item
     */
    //void clearAlarms();
    clearAlarms: function _clearAlarms() {
        //dump("clearAlarms: title:"+this.title+"("+this.calendarItemType+")\n");
        this._newAlarm = null;
        this._calEvent.clearAlarms();
    },

    // The last time this alarm was fired and acknowledged by the user; coerced to UTC.
    //attribute calIDateTime alarmLastAck;
    get alarmLastAck() {
        //dump("get alarmLastAck. this._alarmLastAck:"+this._alarmLastAck+"\n");
        //dump("get alarmLastAck: title:"+this.title+", alarmLastAck:"+this._calEvent.alarmLastAck+"\n");
        return this._calEvent.alarmLastAck;
    },

    set alarmLastAck(aValue) {
        //dump("set alarmLastAck 1:"+aValue+"\n");
        try {
            if ((aValue) && ((!this.alarmLastAck) || (aValue.compare(this.alarmLastAck) != 0))) {

                //dump("set alarmLastAck: User snoozed alarm. Title:"+this.title+", aValue:"+aValue.toString()+", alarmTime:"+this.getAlarmTime(), -1);
                //dump("set alarmLastAck 2:"+aValue+"\n");
                this._newAlarmLastAck = aValue.clone();
            }
            else {
                //dump("set alarmLastAck 3:"+aValue+"\n");
                if (aValue === null) {
                    //dump("set alarmLastAck: set to NULL. Title:"+this.title+", aValue:"+aValue+", alarmTime:"+this.getAlarmTime(), -1);
                    this._newAlarmLastAck = null;
                }
            }
        }
        catch (err) {
            dump("alarmlastack err:" + err + "\n");
        }
        this._calEvent.alarmLastAck = aValue;
    },

    //
    // recurrence
    //
    //attribute calIRecurrenceInfo recurrenceInfo;
    get recurrenceInfo() {

        if (this._newRecurrenceInfo !== undefined) {
            return this._newRecurrenceInfo;
        }

        if (this._recurrenceInfo !== undefined) {
            return this._recurrenceInfo;
        }

        return this._calEvent.recurrenceInfo;
    },

    set recurrenceInfo(aValue) {
        //dump("set recurrenceInfo 1: title:"+this.title+", this.recurrenceInfo:"+this.recurrenceInfo+", aValue:"+aValue+"\n");
        if (aValue) {
            // Lets see if something changed.
            var infoChanged = false;
            if (this.recurrenceInfo) {
                if (this.recurrenceInfo.countRecurrenceItems() == aValue.countRecurrenceItems()) {
                    var oldRecurrenceItems = this.recurrenceInfo.getRecurrenceItems({});
                    var newRecurrenceItems = aValue.getRecurrenceItems({});
                    // See if the oldReccurrenceItems exists in the new
                    var allOldExist = true;
                    for each(var oldRecurrenceItem in oldRecurrenceItems) {
                        var oldExists = false;
                        for each(var newRecurrenceItem in newRecurrenceItems) {
                            if (newRecurrenceItem.icalString == oldRecurrenceItem.icalString) {
                                oldExists = true;
                                break;
                            }
                        }
                        if (!oldExists) {
                            allOldExist = false;
                            break;
                        }
                    }
                    if (!allOldExist) {
                        infoChanged = true;
                    }
                }
                else {
                    infoChanged = true;
                }
            }
            else {
                infoChanged = true;
            }
            if (infoChanged) {
                //dump("set recurrenceInfo 2: recurrenceinfo changed.\n"); 
                this._newRecurrenceInfo = aValue.clone();
                this._calEvent.recurrenceInfo = aValue.clone();
            }
            else {
                //dump("set recurrenceInfo 3: recurrenceinfo did not change.\n"); 
            }
        }
        else {
            //dump("set recurrenceInfo 4: recurrenceinfo changed.\n"); 
            this._newRecurrenceInfo = aValue;
            this._calEvent.recurrenceInfo = aValue;
        }

    },

    //readonly attribute calIDateTime recurrenceStartDate;
    get recurrenceStartDate() {
        if ((this.recurrenceInfo) && (!this._newRecurrenceInfo)) {
            if (this._recurrenceStartDate) {
                return this._recurrenceStartDate;
            }
        }
        //dump("get recurrenceStartDate: title:"+this.title+", value:"+this._calEvent.recurrenceStartDate);
        return this._calEvent.recurrenceStartDate;
    },

    //
    // All event properties are stored in a property bag;
    // some number of these are "promoted" to top-level
    // accessor attributes.  For example, "SUMMARY" is
    // promoted to the top-level "title" attribute.
    //
    // If you use the has/get/set/deleteProperty
    // methods, property names are case-insensitive.
    //
    // For purposes of ICS serialization, all property names in
    // the hashbag are in uppercase.
    //
    // The isPropertyPromoted() attribute can will indicate
    // if a particular property is promoted or not, for
    // serialization purposes.
    //

    // Note that if this item is a proxy, then any requests for
    // non-existant properties will be forward to the parent item.

    // some other properties that may exist:
    //
    // 'description' - description (string)
    // 'location' - location (string)
    // 'categories' - categories (string)
    // 'syncId' - sync id (string)
    // 'inviteEmailAddress' - string
    // alarmLength/alarmUnits/alarmEmailAddress/lastAlarmAck
    // recurInterval/recurCount/recurWeekdays/recurWeeknumber

    // these forward to an internal property bag; implemented here, so we can
    // do access control on set/delete to have control over mutability.
    //readonly attribute nsISimpleEnumerator propertyEnumerator;
    get propertyEnumerator() {
        this.getProperty("DESCRIPTION"); // To preload.
        this.getProperty("LOCATION"); // To preload.
        this.getProperty("TRANSP"); // To preload.
        this.getProperty("STATUS"); // To preload.
        this.getProperty("X-MOZ-SEND-INVITATIONS"); // To preload.
        return this._calEvent.propertyEnumerator;
    },

    //boolean hasProperty(in AString name);
    hasProperty: function _hasProperty(name) {
        //dump("hasProperty: title:"+this.title+", name:"+name);
        this.getProperty(name); // To preload.
        return this._calEvent.hasProperty(name);
    },

    /**
     * Gets a particular property.
     * Objects passed back are still owned by the item, e.g. if callers need to
     * store or modify a calIDateTime they must clone it.
     */
    //nsIVariant getProperty(in AString name);
    getProperty: function _getProperty(name) {
        //dump("get property 1: title:"+this.title+", name:"+name+" == "+this._calEvent.getProperty(name)+"\n");
        switch (name) {
        case "X-MOZ-SNOOZE-TIME":
            this.reminderSignalTime;
            break;
        case "PERCENT-COMPLETE":
            this._calEvent.setProperty(name, this.percentComplete);
            break;
        case "DESCRIPTION":
            break;
        case "CREATED":
            break;
        case "LOCATION":
            if ((this.location) && (!this._newLocation)) this._calEvent.setProperty(name, this.location);
            break;
        case "TRANSP":
            break;
        case "STATUS":
            //dump("get property STATUS: title:"+this.title+", name:"+name+", value:"+this._calEvent.getProperty(name)+", startDate:"+this.startDate+"\n");
            if (this._className == "mivExchangeEvent") {}
            else {
                //dump("get property STATUS: title:"+this.title+", name:"+name+", isCompleted:"+this.isCompleted+", value:"+this._calEvent.getProperty(name)+", this.status:"+this.status+", entryDate:"+this.entryDate+"\n");
                return this.status;
            }
            break;
        case "X-MOZ-SEND-INVITATIONS":
            break;
        case "CLASS":
            this.privacy; // preload
            break;
        default:
            if (name.indexOf("X-MOZ-SNOOZE-TIME-") > -1) {
                //dump("setProperty: "+name+" is set to value:"+value);
                //dump("getProperty:"+name+":"+this._calEvent.getProperty(name)+"\n");
                //dump("getProperty: this.reminderSignalTime:"+this.reminderSignalTime+"\n");
            }
        }

        //dump("get property 2: title:"+this.title+", name:"+name+", value:"+this._calEvent.getProperty(name)+", _newLocation:"+this._newLocation);
        return this._calEvent.getProperty(name);
    },

    /**
     * Sets a particular property.
     * Ownership of objects gets passed to the item, e.g. callers must not
     * modify a calIDateTime after it's been passed to an item.
     *
     * @warning this reflects the current implementation
     *          xxx todo: rethink whether it's more sensible to store
     *                    clones in calItemBase.
     */
    //void setProperty(in AString name, in nsIVariant value);
    setProperty: function _setProperty(name, value) {
        //dump("set property: title:"+this.title+", name:"+name+", aValue:"+value+"\n", -1);
        switch (name) {
        case "PERCENT-COMPLETE":
            this.percentComplete = value;
            break;
        case "DESCRIPTION":
            if (value != this._newBody) {
                this._newBody = value;
            }
            break;
        case "CREATED":
            if (value != this._newCreated) {
                this._newCreated = value;
            }
            break;
        case "LOCATION":
            if (value != this._newLocation) {
                this._newLocation = value;
            }
            break;
        case "PRIORITY":
            this.priority = value;
            break;
        case "CLASS":
            this.privacy = value;
            break;
        case "TRANSP":
            if (value != this.getProperty(name)) {
                switch (value) {
                case "TRANSPARENT":
                    this._newLegacyFreeBusyStatus = "Free";
                    break;
                case "OPAQUE":
                    this._newLegacyFreeBusyStatus = "Busy";
                    break;
                default:
                    this._newLegacyFreeBusyStatus = "Busy";
                    break;
                }
            }
            break;
        case "STATUS":
            //dump("set property: title:"+this.title+", name:"+name+", aValue:"+value+"\n", -1);
            //dump("set property: title:"+this.title+", name:"+name+", aValue:"+value+"\n");
            if (this.className == "mivExchangeEvent") {
                if (value != this.getProperty(name)) {
                    switch (value) {
                    case "NONE":
                        this._newMyResponseType = "Unknown";
                        break;
                    case "CONFIRMED":
                        this._newMyResponseType = "Accept";
                        break;
                    case "TENTATIVE":
                        this._newMyResponseType = "Tentative";
                        break;
                    case "CANCELLED":
                        this._newMyResponseType = "Decline";
                        break;
                    default:
                        this._newMyResponseType = "Unknown";
                        break;
                    }
                }
            }
            else {
                this.status = value;
                return;
            }
            break;
        case "X-MOZ-SEND-INVITATIONS":
            if (value != this.getProperty(name)) {
                this._newIsInvitation = value;
            }
            break;
        case "X-MOZ-SNOOZE-TIME":
            //dump("setProperty: title:"+this.title+", X-MOZ-SNOOZE-TIME:"+value+"\n");
            if (value != this._xMozSnoozetime) {
                this._newXMozSnoozeTime = value;
            }
            else {
                this._newXMozSnoozeTime = undefined;
            }
            break;
        default:
            if (name.indexOf("X-MOZ-SNOOZE-TIME-") > -1) {
                //dump("setProperty: "+name+" is set to value:"+value);
                if ((this._xMozSnoozetime === undefined) && (this._reminderSignalTime)) {
                    //dump("setProperty: X-MOZ-SNOOZE-TIME-:"+this.title+", Going to set initial xMozSnoozeTime for master to:"+value+"\n");
                    this._xMozSnoozetime = value;
                }
                else {
                    if (value != this._xMozSnoozetime) {

                        //dump("setProperty: X-MOZ-SNOOZE-TIME-:"+this.title+", this._reminderSignalTime:"+this._reminderSignalTime+"\n");
                        //dump("setProperty: X-MOZ-SNOOZE-TIME-:"+this.title+", this._xMozSnoozetime:"+this._xMozSnoozetime+"\n");
                        //dump("setProperty: X-MOZ-SNOOZE-TIME-:"+this.title+", "+name+":"+value+"\n");
                        this._newXMozSnoozeTime = value;
                        this._lastXMozSnoozeTimeNativeId = name.substr(18);
                        //dump("setProperty this._lastXMozSnoozeTimeNativeId:"+this._lastXMozSnoozeTimeNativeId+"\n");
                    }
                    else {
                        //dump("setProperty: X-MOZ-SNOOZE-TIME-:"+this.title+", Not changed\n");
                        this._newXMozSnoozeTime = undefined;
                    }
                }
            }
            else {
                this._changedProperties.push({
                    action: "set",
                    name: name,
                    value: value
                });
            }
        }

        this._calEvent.setProperty(name, value);
    },

    // will not throw an error if you delete a property that doesn't exist
    //void deleteProperty(in AString name);
    deleteProperty: function _deleteProperty(name) {
        //dump("deleteProperty: title:"+this.title+", name:"+name+"\n");
        switch (name) {
        case "DESCRIPTION":
            this._newBody = null;
            break;
        case "LOCATION":
            this._newLocation = null;
            break;
        case "TRANSP":
            this._newLegacyFreeBusyStatus = null;
            break;
        case "STATUS":
            if (this.className == "mivExchangeEvent") {
                this._newMyResponseType = null;
            }
            else {
                this._status = null;
            }
            break;
        case "X-MOZ-SEND-INVITATIONS":
            this._newIsInvitation = null;
            break;

        case "X-MOZ-SNOOZE-TIME":
            //dump("deleteProperty: title:"+this.title+", "+name+", this._xMozSnoozeTime="+this._xMozSnoozeTime+", this._calEvent.getProperty(X-MOZ-SNOOZE-TIME)="+this._calEvent.getProperty("X-MOZ-SNOOZE-TIME")+", reminderSignalTime="+this.reminderSignalTime+"\n");
            this._newXMozSnoozeTime = null;
            break;
        default:
            if (name.indexOf("X-MOZ-SNOOZE-TIME-") > -1) {
                //dump("deleteProperty: title:"+this.title+", "+name+"\n");
                //dump("setProperty: "+name+" is set to value:"+value);
                this._newXMozSnoozeTime = null;
                this._lastXMozSnoozeTimeNativeId = name.substr(18);
                //dump("deleteProperty this._lastXMozSnoozeTimeNativeId:"+this._lastXMozSnoozeTimeNativeId+"\n");
            }
            else {
                this._changedProperties.push({
                    action: "remove",
                    name: name,
                    value: null
                });
            }

            //		default:
            //			this._changedProperties.push({ action: "remove", name: name});
        }

        this._calEvent.deleteProperty(name);
    },

    // returns true if the given property is promoted to some
    // top-level attribute (e.g. id or title)
    //boolean isPropertyPromoted(in AString name);
    isPropertyPromoted: function _isPropertyPromoted(name) {
        //dump("isPropertyPromoted: title:"+this.title+", name:"+name);
        return this._calEvent.isPropertyPromoted(name);
    },

    /**
     * Returns a particular parameter value for a property, or null if the
     * parameter does not exist.  If the property does not exist, throws.
     *
     * @param aPropertyName  the name of the property
     * @param aParameterName the name of the parameter on the property
     */
    //AString getPropertyParameter(in AString aPropertyName,
    //	               in AString aParameterName);
    getPropertyParameter: function _getPropertyParameter(aPropertyName, aParameterName) {
        //dump("getPropertyParameter: title:"+this.title+", aPropertyName:"+aPropertyName+", aParameterName:"+aParameterName+", value:"+this._calEvent.getPropertyParameter(aPropertyName, aParameterName));
        return this._calEvent.getPropertyParameter(aPropertyName, aParameterName);
    },

    /**
     * Checks if the given property has the given parameter.
     *
     * @param aPropertyName   The name of the property.
     * @param aParameterName  The name of the parameter on the property.
     * @return                True, if the parameter exists on the property
     */
    //boolean hasPropertyParameter(in AString aPropertyName,
    //	              in AString aParameterName);
    hasPropertyParameter: function _hasPropertyParameter(aPropertyName, aParameterName) {
        //dump("hasPropertyParameter: title:"+this.title+", aPropertyName:"+aPropertyName+", aParameterName:"+aParameterName+", value:"+this._calEvent.hasPropertyParameter(aPropertyName, aParameterName));
        return this._calEvent.hasPropertyParameter(aPropertyName, aParameterName);
    },

    /**
     * Sets a particular parameter value for a property, or unsets if null is
     * passed. If the property does not exist, throws.
     *
     * @param aPropertyName   The name of the property
     * @param aParameterName  The name of the parameter on the property
     * @param aParameterValue The value of the parameter to set
     */
    //void setPropertyParameter(in AString aPropertyName,
    //	            in AString aParameterName,
    //	            in AUTF8String aParameterValue);
    setPropertyParameter: function _setPropertyParameter(aPropertyName, aParameterName, aParameterValue) {
        //dump("setPropertyParameter: title:"+this.title+", aPropertyName:"+aPropertyName+", aParameterName:"+aParameterName+", aParameterValue:"+aParameterValue);
        return this._calEvent.setPropertyParameter(aPropertyName, aParameterName, aParameterValue);
    },

    /**
     * Returns a property parameter enumerator for the given property name
     *
     * @param aPropertyName   The name of the property.
     * @return                The parameter enumerator.
     */
    //nsISimpleEnumerator getParameterEnumerator(in AString aPropertyName);
    getParameterEnumerator: function _getParameterEnumerator(aPropertyName) {
        //dump("getParameterEnumerator: title:"+this.title+", aPropertyName:"+aPropertyName);
        return this._calEvent.getParameterEnumerator(aPropertyName);
    },

    /**
     * The organizer (originator) of the item.  We will likely not
     * honour or preserve all fields in the calIAttendee passed around here.
     * A base class like calIPerson might be more appropriate here, if we ever
     * grow one.
     */
    //attribute calIAttendee organizer;
    get organizer() {
        //dump("get organizer: title:"+this.title+", value:"+this._calEvent.organizer);
        return this._calEvent.organizer;
    },

    set organizer(aValue) {
        //dump("set organizer: title:"+this.title+", aValue:"+aValue);
        this.organizer;
        if (aValue) {
            if ((!this.organizer) || (aValue.toString() != this.organizer.toString())) {
                this._newOrganizer = aValue.clone();
                this._calEvent.organizer = aValue;
            }
        }
        else {
            this._calEvent.organizer = aValue;
        }
    },

    //
    // Attendees
    //

    // The array returned here is not live; it will not reflect calls to
    // removeAttendee/addAttendee that follow the call to getAttendees.
    //void getAttendees(out PRUint32 count,
    //	    [array,size_is(count),retval] out calIAttendee attendees);
    getAttendees: function _getAttendees(count) {
        //dump("getAttendees: title:"+this.title);
        return this._calEvent.getAttendees(count);
    },

    /**
     * getAttendeeById's matching is done in a case-insensitive manner to handle
     * places where "MAILTO:" or similar properties are capitalized arbitrarily
     * by different calendar clients.
     */
    //calIAttendee getAttendeeById(in AUTF8String id);
    getAttendeeById: function _getAttendeeById(id) {
        //dump("getAttendeeById: title:"+this.title+", id:"+id);
        if (!this._attendees) this.getAttendees({});

        return this._calEvent.getAttendeeById(id);
    },

    attendeeIsInList: function _attendeeIsInList(attendee) {
        for each(var tmpAttendee in this.getAttendees({})) {
            if ((tmpAttendee) && (tmpAttendee.id == attendee.id)) {
                return tmpAttendee;
            }
        }
        return null;
    },

    attendeeIsInChangesList: function _attendeeIsInChangesList(attendee) {
        for each(var tmpAttendee in this._changesAttendees) {
            if ((tmpAttendee.attendee) && (tmpAttendee.attendee.id == attendee.id)) {
                return tmpAttendee;
            }
        }
        return null;
    },

    removeAttendeeFromChangesList: function _removeAttendeeFromChangesList(attendee) {
        var newChangesList = [];

        for each(var tmpAttendee in this._changesAttendees) {
            if ((tmpAttendee.attendee) && (tmpAttendee.attendee.id != attendee.id)) {
                newChangesList.push(tmpAttendee);
            }
        }

        this._changesAttendees = undefined;
        this._changesAttendees = newChangesList;
    },

    //void addAttendee(in calIAttendee attendee);
    addAttendee: function _addAttendee(attendee) {
        if (!attendee) return;
        //dump("addAttendee1: title:"+this.title+", attendee.id:"+attendee.id+"\n");

        if (!this._attendees) this.getAttendees({});

        var attendeeExists = this.attendeeIsInList(attendee);
        if (attendeeExists != null) {
            // We are not going to add this attendee as it is already in the list
            //dump("addAttendee1a: title:"+this.title+", attendee is already in list. not going to add change record.\n");
            return;
        }

        attendeeExists = this.attendeeIsInChangesList(attendee);
        if (attendeeExists != null) {
            // We have a change for this attendee already in the changes list.
            if (attendeeExists.action == "remove") {
                // We have a remove change in the list and we now want to re-add it. We just remove the remove change.
                this.removeAttendeeFromChangesList(attendee);
                this._calEvent.addAttendee(attendee);
                //dump("addAttendee1b: title:"+this.title+", attendee.id:"+attendee.id+", removed from changes list.\n");
            }
            else {
                // If the action was "add" we do not do anything as we do not have to duplicate it.
                //dump("addAttendee1c: title:"+this.title+", attendee.id:"+attendee.id+", action:"+attendeeExists.action+"\n");
            }
            return;
        }
        this._changesAttendees.push({
            action: "add",
            attendee: attendee
        });
        this._calEvent.addAttendee(attendee);
        //dump("addAttendee2: title:"+this.title+", attendee.id:"+attendee.id+"\n");
    },

    //void removeAttendee(in calIAttendee attendee);
    removeAttendee: function _removeAttendee(attendee) {
        if (!attendee) return;
        //dump("removeAttendee: title:"+this.title+", attendee.id:"+attendee.id+"\n");

        if (!this._attendees) this.getAttendees({});

        var attendeeExists = this.attendeeIsInList(attendee);
        if (attendeeExists == null) {
            // We are not going to remove this attendee as it is not in the list
            return;
        }

        var attendeeExists = this.attendeeIsInChangesList(attendee);
        if (attendeeExists != null) {
            if (attendeeExists.action == "add") {
                // There was already a change for this attendee and it was an addition. We remove this addition
                //dump("removeAttendee: title:"+this.title+", attendee.id:"+attendee.id+" |  There was already a change for this attendee and it was an addition. We remove this addition\n");
                this.removeAttendeeFromChangesList(attendee);
                this._calEvent.removeAttendee(attendee);
            }

            // If the action was "remove" we do not do anything as we do not have to duplicate it.
            return;
        }

        this._changesAttendees.push({
            action: "remove",
            attendee: attendee.clone()
        });
        this._calEvent.removeAttendee(attendee);
    },

    //void removeAllAttendees();
    removeAllAttendees: function _removeAllAttendees() {
        //dump("removeAllAttendees: title:"+this.title+"\n");
        var allAttendees = this.getAttendees({});
        for each(var attendee in allAttendees) {

            var attendeeExists = this.attendeeIsInChangesList(attendee);
            if (attendeeExists != null) {
                if (attendeeExists.action == "add") {
                    // There was already a change for this attendee and it was an addition. We remove this addition
                    //dump("removeAllAttendees: title:"+this.title+", attendee.id:"+attendee.id+" |  There was already a change for this attendee and it was an addition. We remove this addition\n");
                    this.removeAttendeeFromChangesList(attendee);
                }

                // If the action was "remove" we do not do anything as we do not have to duplicate it.
            }
            else {
                this._changesAttendees.push({
                    action: "remove",
                    attendee: attendee.clone()
                });
            }
        }
        allAttendees = null;
        this._calEvent.removeAllAttendees();
    },

    //
    // Attachments
    //
    //void getAttachments(out PRUint32 count,
    //	      [array,size_is(count),retval] out calIAttachment attachments);
    getAttachments: function _getAttachments(count) {
        //dump("getAttachments: title:"+this.title);
        return this._calEvent.getAttachments(count);
    },

    //void addAttachment(in calIAttachment attachment);
    addAttachment: function _addAttachment(attachment) {
        //dump("addAttachment: title:"+this.title+"\n");
        this.getAttachments({});
        if (!this._changesAttachments) this._changesAttachments = [];
        this._changesAttachments.push({
            action: "add",
            attachment: attachment.clone()
        });
        this._calEvent.addAttachment(attachment);
    },

    //void removeAttachment(in calIAttachment attachment);
    removeAttachment: function _removeAttachment(attachment) {
        //dump("removeAttachment: title:"+this.title+"\n");
        //dump("removeAttachment: title:"+this.title);
        this.getAttachments({});
        if (!this._changesAttachments) this._changesAttachments = [];
        this._changesAttachments.push({
            action: "remove",
            attachment: attachment.clone()
        });
        this._calEvent.removeAttachment(attachment);
    },

    //void removeAllAttachments();
    removeAllAttachments: function _removeAllAttachments() {
        //dump("removeAllAttachments: title:"+this.title+"\n");
        //dump("removeAllAttachments: title:"+this.title);
        //		var allAttachments = this._calEvent.getAttachments({});
        var allAttachments = this.getAttachments({});
        for each(var attachment in allAttachments) {
            if (!this._changesAttachments) this._changesAttachments = [];
            this._changesAttachments.push({
                action: "remove",
                attachment: attachment.clone()
            });
        }
        allAttachments = null;
        this._calEvent.removeAllAttachments();
    },

    //
    // Categories
    //

    /**
     * Gets the array of categories this item belongs to.
     */
    //void getCategories(out PRUint32 aCount,
    //	     [array, size_is(aCount), retval] out wstring aCategories);
    getCategories: function _getCategories(aCount) {
        //dump("getCategories: title:"+this.title+"\n");
        return this._calEvent.getCategories(aCount);
    },

    /**
     * Sets the array of categories this item belongs to.
     */
    //void setCategories(in PRUint32 aCount,
    //	     [array, size_is(aCount)] in wstring aCategories);
    setCategories: function _setCategories(aCount, aCategories) {
        //dump("set categories: title:"+this.title+", aCategories.length:"+aCategories.length+"\n");
        this.getCategories({});
        this._changesCategories = true;
        this._calEvent.setCategories(aCount, aCategories);
    },

    //
    // Relations
    //

    /**
     * This gives back every relation where the item is neighter the owner of the
     * relation nor the referred relation
     */
    //void getRelations(out PRUint32 count,
    //	    [array,size_is(count),retval] out calIRelation relations);
    getRelations: function _getRelations(count) {
        //dump("getRelations: title:"+this.title);
        return this._calEvent.getRelations(count);
    },

    /**
     * Adds a relation to the item
     */
    //void addRelation(in calIRelation relation);
    addRelation: function _addRelation(relation) {
        //dump("addRelation: title:"+this.title);
        this._calEvent.addRelation(relation);
    },

    /**
     * Removes the relation for this item and the referred item
     */
    //void removeRelation(in calIRelation relation);
    removeRelation: function _removeRelation(relation) {
        //dump("removeRelation: title:"+this.title);
        this._calEvent.removeRelation(relation);
    },

    /**
     * Removes every relation for this item (in this items and also where it is referred
     */
    //void removeAllRelations();
    removeAllRelations: function _removeAllRelations() {
        //dump("removeAllRelations: title:"+this.title);
        this._calEvent.removeAllRelations();
    },

    // Occurrence querying
    //

    /**
     * Return a list of occurrences of this item between the given dates.  The items
     * returned are the same type as this one, as proxies.
     */
    //void getOccurrencesBetween (in calIDateTime aStartDate, in calIDateTime aEndDate,
    //	              out PRUint32 aCount,
    //	              [array,size_is(aCount),retval] out calIItemBase aOccurrences);
    getOccurrencesBetween: function _getOccurrencesBetween(aStartDate, aEndDate, aCount) {
        if (aStartDate === null) {
            if (this.startDate) {
                aStartDate = this.startDate.clone();
            }
            else {
                if (this.entryDate) aStartDate = this.entryDate.clone();
            }
        }
        if (aEndDate === null) {
            if (this.endDate) {
                aEndDate = this.endDate.clone();
            }
            else {
                if (this.dueDate) aEndDate = this.dueDate.clone();
            }
        }

        var occurrences = [];
        switch (this.calendarItemType) {
        case "Task":
        case "Single":
        case "Occurrence":
        case "Exception":
            var tmpStartDate = this.startDate || this.entryDate;
            var tmpEndDate = this.endDate || this.dueDate;
            if (((aStartDate === null) || (!tmpStartDate) || (tmpStartDate.compare(aStartDate) >= 0)) && ((aEndDate === null) || (!tmpEndDate) || (tmpEndDate.compare(aEndDate) < 0))) {
                //dump("getOccurrencesBetween 0a: inserting myself into list.");
                occurrences.push(this);
            }
            break;
        case "RecurringMaster":
            for each(var exception in this._exceptions) {
                var tmpStartDate = exception.startDate || exception.entryDate;
                var tmpEndDate = exception.endDate || exception.entryDate;
                if (((aStartDate === null) || (!tmpStartDate) || (tmpStartDate.compare(aStartDate) >= 0)) && ((aEndDate === null) || (!tmpEndDate) || (tmpEndDate.compare(aEndDate) < 0))) {
                    //dump("getOccurrencesBetween 0d: inserting myself into list.");
                    occurrences.push(exception);
                }
            }
            for each(var occurrence in this._occurrences) {
                var tmpStartDate = occurrence.startDate || occurrence.entryDate;
                var tmpEndDate = occurrence.endDate || occurrence.entryDate;
                if (((aStartDate === null) || (!tmpStartDate) || (tmpStartDate.compare(aStartDate) >= 0)) && ((aEndDate === null) || (!tmpEndDate) || (tmpEndDate.compare(aEndDate) < 0))) {
                    //dump("getOccurrencesBetween 0e: inserting myself into list.");
                    occurrences.push(occurrence);
                }
            }
            break;
        default:
            if (this.recurrenceInfo) {
                if (this.className == "mivExchangeTodo") {
                    //dump("  : getOccurrencesBetween mivExchangeTodo\n");
                    occurrences.push(this);
                }
                else {
                    //dump("  : getOccurrencesBetween mivExchangeEvent\n");
                    occurrences = this.recurrenceInfo.getOccurrences(aStartDate, aEndDate, 0, aCount);
                    //dump("getOccurrencesBetween 0b: title:"+this.title+", this.calendarItemType:"+this.calendarItemType+", aStartDate:"+aStartDate+", aEndDate:"+aEndDate+", occurrences.length:"+occurrences.length);
                    return this.recurrenceInfo.getOccurrences(aStartDate, aEndDate, 0, aCount);
                }
            }
        }
        //dump("getOccurrencesBetween 1: title:"+this.title+", aStartDate:"+aStartDate+", aEndDate:"+aEndDate+", occurrences.length:"+occurrences.length);

        aCount.value = occurrences.length;
        return occurrences;
    },

    /**
     * If this item is a proxy or overridden item, parentItem will point upwards
     * to our parent.  Otherwise, it will point to this.
     * parentItem can thus always be used for modifyItem() calls
     * to providers.
     */
    //attribute calIItemBase parentItem;
    get parentItem() {
        //dump("get parentItem: title:"+this.title);
        if ((!this._parentItem) && (!this._newParentItem)) {
            this._parenItem = this;
            this._calEvent.parentItem = this;
        }
        return this._calEvent.parentItem;
    },

    set parentItem(aValue) {
        //dump("set parentItem: title:"+this.title);
        if (aValue != this.parentItem) {
            this._newParentItem = aValue;
            this._calEvent.parentItem = aValue;
        }
    },

    /**
     * The recurrence ID, a.k.a. DTSTART-of-calculated-occurrence,
     * or null if this isn't an occurrence.
     * Be conservative about setting this. It isn't marked as such, but
     * consider it as readonly.
     */
    //attribute calIDateTime recurrenceId;
    get recurrenceId() {
        //dump("get recurrenceId: title:"+this.title+", value:"+this._calEvent.recurrenceId);
        return this._calEvent.recurrenceId;
    },

    set recurrenceId(aValue) {
        if (aValue != this.recurrenceId) {
            this._newRecurrenceId = aValue;
            //dump("set recurrenceId: User tries to set recurrenceId to:"+aValue.toString()+", title:"+this.title+", this.calendarItemType:"+this.calendarItemType);
        }
        else {
            //dump("set recurrenceId: User tries to set recurrenceId to null, title:"+this.title);
        }
        this._calEvent.recurrenceId = aValue;
    },

    // New external methods

    cloneToCalEvent: function cloneToCalEvent(aCalEvent) {
        //dump("cloneToCalEvent: start: this.calendarItemType:"+this.calendarItemType);
        this._calEvent = aCalEvent.clone();

        /*		var alarms = aCalEvent.getAlarms({});
        		if (alarms.length > 0) {
        			this._alarm = alarms[0].clone();
        			this._reminderIsSet = true;
        			var offset = 0;

        			var tmpStartDate;
        			var tmpEndDate;
        			if (this.className == "mivExchangeEvent") {
        				tmpStartDate = aCalEvent.startDate;
        				tmpEndDate = aCalEvent.endDate;
        			}
        			if (this.className == "mivExchangeTodo") {
        				tmpStartDate = aCalEvent.entryDate;
        				tmpEndDate = aCalEvent.dueDate;
        			}

        			// Exchange alarm is always an offset to the start.
        			switch (alarms[0].related) {
        			case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
        //dump("cloneToCalEvent: Ci.calIAlarm.ALARM_RELATED_ABSOLUTE\n");
        				var newAlarmTime = alarms[0].alarmDate.clone();

        				// Calculate offset from start of item.
        				offset = newAlarmTime.subtractDate(tmpStartDate);
        				break;
        			case Ci.calIAlarm.ALARM_RELATED_START:
        //dump("cloneToCalEvent: Ci.calIAlarm.ALARM_RELATED_START\n");
        				var newAlarmTime = tmpStartDate.clone();
        				offset = alarms[0].offset.clone();
        				break;
        			case Ci.calIAlarm.ALARM_RELATED_END:
        //dump("cloneToCalEvent: Ci.calIAlarm.ALARM_RELATED_END\n");
        				var newAlarmTime = tmpEndDate.clone();
        				newAlarmTime.addDuration(alarms[0].offset);

        				offset = newAlarmTime.subtractDate(tmpStartDate);
        				break;
        			}
        //dump("cloneToCalEvent: offset="+offset.inSeconds+"\n");
        			this._reminderMinutesBeforeStart = (offset.inSeconds / 60) * -1;
        		}*/
    },

    //readonly attribute AUTF8String subject;
    get subject() {
        return this._subject;
    },

    //readonly attribute AUTF8String sensitivity;
    get sensitivity() {
        return this._sensitivity;
    },

    //readonly attribute calIDateTime dateTimeReceived;
    get dateTimeReceived() {
        return this._dateTimeReceived;
    },

    //readonly attribute calIDateTime dateTimeSent;
    get dateTimeSent() {
        return this._dateTimeSent;
    },

    //readonly attribute calIDateTime dateTimeCreated;
    get dateTimeCreated() {
        return this._dateTimeCreated;
    },

    //readonly attribute calIDateTime reminderDueBy;
    get reminderDueBy() {
        return this._reminderDueBy;
    },

    //readonly attribute calIDateTime reminderSignalTime;
    get reminderSignalTime() {
        return this._reminderSignalTime;
    },

    //readonly attribute boolean reminderIsSet;
    get reminderIsSet() {
        return this._reminderIsSet;
    },

    //readonly attribute long reminderMinutesBeforeStart;
    get reminderMinutesBeforeStart() {
        return this._reminderMinutesBeforeStart;
    },

    //readonly attribute long size;
    get size() {
        return this._size;
    },

    //readonly attribute calIDateTime originalStart;
    get originalStart() {
        return this._originalStart;
    },

    //readonly attribute boolean isAllDayEvent;
    get isAllDayEvent() {
        return this._isAllDayEvent;
    },

    //readonly attribute AUTF8String legacyFreeBusyStatus;
    get legacyFreeBusyStatus() {
        return this._legacyFreeBusyStatus;
    },

    //readonly attribute AUTF8String location;
    get location() {
        return this._location;
    },

    // the exchange changeKey of this event
    //readonly attribute AUTF8String changeKey;
    get changeKey() {
        return this._changeKey;
    },

    // the exchange UID of this event
    //readonly attribute AUTF8String uid;
    get uid() {
        return this._uid;
    },

    // the exchange calendarItemType of this event
    //readonly attribute AUTF8String calendarItemType;
    get calendarItemType() {
        //dump("get calendarItemType: title:"+this.title+", this._calendarItemType:"+this._calendarItemType+", startdate="+this.startDate.toString()+"\n");
        return this._calendarItemType;
    },

    // the exchange ItemClass of this event
    //readonly attribute AUTF8String itemClass;
    get itemClass() {
        return this._itemClass;
    },

    // the exchange messageId of this event
    //readonly attribute AUTF8String messageId;
    get messageId() {
        return this._messageId;
    },
    // the exchange isCancelled of this event
    //readonly attribute boolean isCancelled;
    get isCancelled() {
        return this._isCancelled;
    },

    // the exchange isMeeting of this event
    //readonly attribute boolean isMeeting;
    get isMeeting() {
        return this._isMeeting;
    },

    // the exchange hasAttachments of this event
    //readonly attribute boolean hasAttachments;
    get hasAttachments() {
        return this._hasAttachments;
    },

    //readonly attribute boolean isRecurring;
    get isRecurring() {
        return this._isRecurring;
    },

    //readonly attribute boolean isInvitation;
    get isInvitation() {
        if (((this.responseObjects) && ((this.responseObjects.AcceptItem)
                || (this.responseObjects.TentativelyAcceptItem)
                || (this.responseObjects.DeclineItem)))
            || (this.type == "MeetingRequest")) {
            return true;
        }
        else {
            if (this.getProperty("X-exchangeITIP2") === true) {
                return true;
            }
            else {
                return false;
            }
        }
    },


    //readonly attribute boolean meetingRequestWasSent;
    get meetingRequestWasSent() {
        return this._meetingRequestWasSent;
    },

    //readonly attribute boolean isResponseRequested;
    get isResponseRequested() {
        return this._isResponseRequested;
    },

    //readonly attribute AUTF8String myResponseType;
    get myResponseType() {
        if (this._newMyResponseType) {
            //dump(" 22 this._newMyResponseType:"+this._newMyResponseType+"\n");
            return this._newMyResponseType;
        }

        return this._myResponseType;
    },

    get participationStatus() {
        return participationMap[this.myResponseType];
    },

    //readonly attribute AUTF8String timeZone;
    get timeZone() {
        return this._timeZone;
    },

    //readonly attribute AUTF8String MeetingTimeZone;
    get meetingTimeZone() {
        return this._meetingTimeZone;
    },

    //readonly attribute AUTF8String startTimeZoneName;
    get startTimeZoneName() {
        return this._startTimeZoneName;
    },

    //readonly attribute AUTF8String startTimeZoneId;
    get startTimeZoneId() {
        return this._startTimeZoneId;
    },

    //readonly attribute AUTF8String endTimeZoneName;
    get endTimeZoneName() {
        return this._endTimeZoneName;
    },

    //readonly attribute AUTF8String endTimeZoneId;
    get endTimeZoneId() {
        return this._endTimeZoneId;
    },

    get mimeContent() {
        return this._mimeContent;
    },

    get mimeContentCharacterSet() {
        return this._mimeContentCharacterSet;
    },

    //readonly attribute AUTF8String conferenceType;
    get conferenceType() {
        return this._conferenceType;
    },

    //readonly attribute boolean allowNewTimeProposal;
    get allowNewTimeProposal() {
        return this._allowNewTimeProposal;
    },


    // the tagName of the object of this event
    //readonly attribute AUTF8String type;
    get type() {
        return this._type;
    },

    // New external methods
    // the exchange ParentFolderId.Id of this event
    //readonly attribute AUTF8String parentId;
    get parentId() {
        return this._parentId;
    },

    // New external methods
    // the exchange ParentFolderId.ChangeKey of this event
    //readonly attribute AUTF8String parentChangeKey;
    get parentChangeKey() {
        return this._parentChangeKey;
    },

    // the exchange responseObjects of this event
    //readonly attribute jsval responseObjects;

    /*
      <t:ResponseObjects>
        <t:AcceptItem/>
        <t:TentativelyAcceptItem/>
        <t:DeclineItem/>
        <t:ReplyToItem/>
        <t:ReplyAllToItem/>
        <t:ForwardItem/>
        <t:CancelCalendarItem/>  // part of my own items.
      </t:ResponseObjects>

    */
    get responseObjects() {
        return this._responseObjects;
    },

    //void getExceptions(out uint32_t count,
    //	      [array,size_is(count),retval] out mivExchangeBaseItem aException);
    getExceptions: function _getExceptions(aCount) {
        var result = [];
        for each(var exception in this._exceptions) {
            result.push(exception);
        }
        aCount.value = result.length;
        return result;
    },

    //void addException(in mivExchangeBaseItem aItem);
    addException: function _addException(aItem) {
        if ((aItem.calendarItemType == "Exception") && (this.calendarItemType == "RecurringMaster") && (aItem.isMutable)) {
            aItem.parentItem = this;

            if (this._exceptions[aItem.id]) {
                this._exceptions[aItem.id].deleteItem();
                this._exceptions[aItem.id] = null;
                delete this._exceptions[aItem.id];
            }
            this._exceptions[aItem.id] = aItem;
            //			this._exceptions[aItem.id] = aItem;

            if (this.recurrenceInfo) {
                this.recurrenceInfo.modifyException(aItem, true);
            }
            else {
                //this._calEvent.addException(aItem. true);
                dump("What not recurrenceinfo for title:'" + this.title + "', aItem.title:" + aItem.title + "\n");
                dump(" ++    MASTER:" + xml2json.toString(this.exchangeData) + "\n");
                dump(" ++ Exception:" + xml2json.toString(aItem.exchangeData) + "\n");
            }

            var itemAlarms = aItem.getAlarms({});
            //dump("addException:"+this.title+"| itemAlarms.length:"+itemAlarms.length+", aItem.reminderSignalTime:"+aItem.reminderSignalTime+"\n");
            var tmpStartDate = aItem.startDate || aItem.entryDate;
            if ((itemAlarms.length > 0) && (aItem.reminderSignalTime) && ((!tmpStartDate) || (tmpStartDate.compare(aItem.reminderSignalTime) >= 0))) {
                this.setProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime, aItem.reminderSignalTime.getInTimezone(cal.UTC()).icalString);
            }
        }
    },

    //void modifyException(in mivExchangeBaseItem aItem);
    modifyException: function _modifyException(aItem) {
        if ((aItem.calendarItemType == "Exception") && (this.calendarItemType == "RecurringMaster") && (aItem.isMutable)) {

            if ((this._exceptions[aItem.id]) && (this._exceptions[aItem.id].changeKey == aItem.changeKey)) {
                // We already have this in the list. No need to change.
                return;
            }

            // Remove any alarms we might have for this exception.
            if (this._exceptions[aItem.id]) {
                var itemAlarms = this._exceptions[aItem.id].getAlarms({});
                if (itemAlarms.length > 0) {
                    this.deleteProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime);
                }
                this._exceptions[aItem.id].deleteItem();
                this._exceptions[aItem.id] = null;
                delete this._exceptions[aItem.id];
            }

            //			this._exceptions[aItem.id] = aItem.clone();
            this._exceptions[aItem.id] = aItem;

            var itemAlarms = aItem.getAlarms({});
            var tmpStartDate = aItem.startDate || aItem.entryDate;
            if ((itemAlarms.length > 0) && (aItem.reminderSignalTime) && ((!tmpStartDate) || (tmpStartDate.compare(aItem.reminderSignalTime) >= 0))) {
                this.setProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime, this.reminderSignalTime.getInTimezone(cal.UTC()).icalString);
            }
        }
    },

    //void removeException(in mivExchangeBaseItem aItem);
    removeException: function _removeException(aItem) {
        if ((aItem.calendarItemType == "Exception") && (this.calendarItemType == "RecurringMaster")) {
            if (this._exceptions[aItem.id]) {
                this.recurrenceInfo.removeExceptionFor(aItem.recurrenceId);

                if (this.hasProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime)) {
                    this.deleteProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime);
                }
                this._exceptions[aItem.id].deleteItem();
                this._exceptions[aItem.id] = null;
                delete this._exceptions[aItem.id];
            }
        }
    },

    //void removeExceptionAt(in calIDateTime aRecurrenceId);
    removeExceptionAt: function _removeExceptionAt(aRecurrenceId) {
        // Find item.
        var item = null;
        for each(var exception in this._exceptions) {
            if (exception.recurrenceId.compare(aRecurrenceId) == 0) {
                item = exception;
                break;
            }
        }

        if (item) {
            this.removeException(item);
        }

    },

    //void getOccurrences(out uint32_t count, [array,size_is(count),retval] out mivExchangeBaseItem aOccurrence);
    getOccurrences: function _getOccurrences(aCount) {
        var result = [];
        for each(var occurrence in this._occurrences) {
            //dump("getOccurrences: occurrence.title:"+occurrence.title+", startDate:"+occurrence.startDate.toString()+"\n");
            result.push(occurrence);
        }
        aCount.value = result.length;
        return result;
    },

    //void addOccurrence(in mivExchangeBaseItem aItem);
    addOccurrence: function _addOccurrence(aItem) {
        if ((aItem.calendarItemType == "Occurrence") && (this.calendarItemType == "RecurringMaster") && (aItem.isMutable)) {
            aItem.parentItem = this;

            if (this._occurrences[aItem.id]) {
                this._occurrences[aItem.id].deleteItem();
                this._occurrences[aItem.id] = null;
                delete this._occurrences[aItem.id];
            }
            this._occurrences[aItem.id] = aItem;
            //			this._occurrences[aItem.id] = aItem.clone();

            var itemAlarms = aItem.getAlarms({});
            //dump("AddOccurrence: itemAlarms.length:"+itemAlarms.length+", X-MOZ-SNOOZE-TIME-"+aItem.recurrenceId.nativeTime);
            var tmpStartDate = aItem.startDate || aItem.entryDate;
            if ((itemAlarms.length > 0) && ((!tmpStartDate) || ((this.reminderDueBy) && (tmpStartDate.compare(this.reminderDueBy) == 0)))) {
                this.setProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime, this.reminderSignalTime.getInTimezone(cal.UTC()).icalString);
            }
        }
    },

    //void removeOccurrence(in mivExchangeBaseItem aItem);
    removeOccurrence: function _removeOccurrence(aItem) {
        if (aItem) {
            if ((aItem.calendarItemType == "Occurrence") && (this.calendarItemType == "RecurringMaster")) {
                if (this._occurrences[aItem.id]) {
                    if (this.hasProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime)) {
                        this.deleteProperty("X-MOZ-SNOOZE-TIME-" + aItem.recurrenceId.nativeTime);
                    }
                    this._occurrences[aItem.id].deleteItem();
                    this._occurrences[aItem.id] = null;
                    delete this._occurrences[aItem.id];
                }
            }
        }
    },

    //void removeOccurrenceAt(in calIDateTime aRecurrenceId);
    removeOccurrenceAt: function _removeOccurrenceAt(aRecurrenceId) {
        //dump("removeOccurrenceAt this._cloneCount:"+this._cloneCount+"\n");
        // Find item.
        var item = null;
        for each(var occurrence in this._occurrences) {
            if (occurrence.recurrenceId.compare(aRecurrenceId) == 0) {
                item = occurrence;
                break;
            }
        }

        if (item) {
            this.removeOccurrence(item);
        }
        else {
            // This recurrenceId is not an occurrence. Maybe an exception.
            this.removeExceptionAt(aRecurrenceId);
        }

    },

    //attribute mivIxml2jxon exchangeData;
    get exchangeData() {
        /*		if (this._exchangeData === null) {
        			dump("Who is requesting exchangedata when it is null:"+exchGlobalFunctions.STACK()+"\n");
        		}*/
        return this._exchangeData;
    },

    set exchangeData(aValue) {
        //dump("exchangeData:"+aValue.toString());
        //dump("exchangeData:"+aValue.toString()+"\n\n");

        this.initialize();

        if (this._calendar) {
            this.calendar = this._calendar;
        }

        /*		if (aValue === null) {
        			dump("Who is setting exchangeData to null:"+exchGlobalFunctions.STACK()+"\n");
        		}*/
        this._exchangeData = aValue;

        this._isAllDayEvent = (this.getTagValue("t:IsAllDayEvent", "false") == "true");

        this._startTimeZoneId = this.getAttributeByTag("t:StartTimeZone", "Id", null);

        this._meetingTimeZone = this.getAttributeByTag("t:MeetingTimeZone", "TimeZoneName", null);

        this._timeZone = this.getTagValue("t:TimeZone", null);

        this._endTimeZoneId = this.getAttributeByTag("t:EndTimeZone", "Id", null);

        this._effectiveRights = this.getTag("t:EffectiveRights", null);

        if (this._effectiveRights) {
            this._canDelete = (xml2json.getTagValue(this._effectiveRights, "t:Delete", "false") == "true");
            this._canModify = (xml2json.getTagValue(this._effectiveRights, "t:Modify", "false") == "true");
            this._canRead = (xml2json.getTagValue(this._effectiveRights, "t:Read", "false") == "true");
        }
        else {
            this._canDelete = this.calendar.canCreateContent;
            this._canModify = this.calendar.canCreateContent;
            this._canRead = this.calendar.canRead;
        }

        this._effectiveRights = null;
        this._effectiveRights = true;

        this._lastModifiedTime = this.tryToSetDateValueUTC(this.getTagValue("t:LastModifiedTime", null), null);

        this._subject = this.getTagValue("t:Subject", null);

        this._title = this.subject;
        if (this._title) {
            this._calEvent.title = this._title;
        }

        this._mimeContent = this.getTagValue("t:MimeContent", null);
        if (this._mimeContent) {
            this._mimeContentCharacterSet = xml2json.getAttribute(this.getTag("t:MimeContent"), "CharacterSet");
        }

        this._id = this.getAttributeByTag("t:ItemId", "Id", null);
        if (this._id) {
            this._calEvent.id = this._id;
        }

        this._priority = this.getTagValue("t:Importance", null);
        switch (this._priority) {
        case "Low":
            this._calEvent.priority = 9;
            break;
        case "Normal":
            this._calEvent.priority = 5;
            break;
        case "High":
            this._calEvent.priority = 1;
            break;
        }

        this._sensitivity = this.getTagValue("t:Sensitivity", null);

        this._privacy = this.sensitivity;
        if (this._privacy != null) {
            switch (this._privacy) {
            case "Normal":
                this._calEvent.privacy = "PUBLIC";
                break;
            case "Confidential":
                this._calEvent.privacy = "CONFIDENTIAL";
                break;
            case "Personal":
                this._calEvent.privacy = "PRIVATE";
                break;
            case "Private":
                this._calEvent.privacy = "PRIVATE";
                break;
            default:
                this._calEvent.privacy = "PUBLIC";
            }
            this.setProperty("CLASS", this._calEvent.privacy);
        }

        this._reminderIsSet = (this.getTagValue("t:ReminderIsSet", "false") == "true");

        if (this.className == "mivExchangeEvent") {
            this._calendarItemType = this.getTagValue("t:CalendarItemType", undefined);
        }
        else {
            this._calendarItemType = "Task";
        }

        this._reminderDueBy = this.tryToSetDateValueUTC(this.getTagValue("t:ReminderDueBy", null), null);

        this._reminderMinutesBeforeStart = this.getTagValue("t:ReminderMinutesBeforeStart", 0);

        this._dateTimeReceived = this.tryToSetDateValueUTC(this.getTagValue("t:DateTimeReceived", null), null);

        this._dateTimeSent = this.tryToSetDateValueUTC(this.getTagValue("t:DateTimeSent", null), null);

        this._size = this.getTagValue("t:Size", 0);

        this._originalStart = this.tryToSetDateValueUTC(this.getTagValue("t:OriginalStart", null), null);

        this._location = this.getTagValue("t:Location", null);

        this._changeKey = this.getAttributeByTag("t:ItemId", "ChangeKey", null);

        this._uid = this.getTagValue("t:UID", undefined);

        this._itemClass = this.getTagValue("t:ItemClass", null);

        this._isMeeting = (this.getTagValue("t:IsMeeting", "false") == "true");

        this._isRecurring = (this.getTagValue("t:IsRecurring", "false") == "true");

        this._meetingRequestWasSent = (this.getTagValue("t:MeetingRequestWasSent", "false") == "true");

        this._isResponseRequested = (this.getTagValue("t:IsResponseRequested", "false") == "true");

        this._myResponseType = this.getTagValue("t:MyResponseType", "NoResponseReceived");

        this._startTimeZoneName = this.getAttributeByTag("t:StartTimeZone", "Name", null);

        this._endTimeZoneName = this.getAttributeByTag("t:EndTimeZone", "Name", null);

        this._conferenceType = this.getTagValue("t:ConferenceType", null);

        this._allowNewTimeProposal = (this.getTagValue("t:AllowNewTimeProposal", "false") == "true");

        this._parentId = this.getAttributeByTag("t:ParentFolderId", "Id", null);

        this._parentChangeKey = this.getAttributeByTag("t:ParentFolderId", "ChangeKey", null);

        //MessageId of item used to locate mail item.
        var messageIdElm = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyTag = '0x1035']");
        if (messageIdElm.length > 0) {
            this._messageId = xml2json.getTagValue(messageIdElm[0], "t:Value", null);
        }
        else {
            this._messageId = null;
        }
        messageIdElm = null;

        // Do the initializaton of this one.
        this.preLoad();

        this._alarm = null;
        this._calEvent.clearAlarms();
        switch (this.className) {
        case "mivExchangeTodo":
            if ((this.reminderIsSet) && (this.calendarItemType != "RecurringMaster")) {
                //dump("Creating alarm in getAlarms: title:"+this.title+", this.reminderDueBy:"+this.reminderDueBy+"\n");
                var alarm = cal.createAlarm();
                alarm.action = "DISPLAY";
                alarm.repeat = 0;
                if (this.reminderDueBy) {
                    alarm.alarmDate = this.reminderDueBy.clone().getInTimezone(exchGlobalFunctions.ecDefaultTimeZone());
                    alarm.related = Ci.calIAlarm.ALARM_RELATED_ABSOLUTE;

                }
                else {
                    var alarmOffset = cal.createDuration();
                    alarmOffset.minutes = -1 * this.reminderMinutesBeforeStart;

                    // This is a bug fix for when the offset is more than a year)
                    if (alarmOffset.minutes < (-60 * 24 * 365)) {
                        alarmOffset.minutes = -5;
                    }
                    alarmOffset.normalize();

                    alarm.related = Ci.calIAlarm.ALARM_RELATED_START;
                    alarm.offset = alarmOffset;

                }

                this._alarm = alarm.clone();
                this._calEvent.addAlarm(alarm);
            }
            break;
        case "mivExchangeEvent":
            //	if ((this.reminderIsSet) && (this.reminderDueBy.compare(this.startDate) < 1) && (this.calendarItemType != "RecurringMaster")) {
            if (this.reminderIsSet) {
                var alarm = cal.createAlarm();
                alarm.action = "DISPLAY";
                alarm.repeat = 0;

                var alarmOffset = cal.createDuration();
                alarmOffset.minutes = -1 * this.reminderMinutesBeforeStart;

                // This is a bug fix for when the offset is more than a year)
                if (alarmOffset.minutes < (-60 * 24 * 365)) {
                    alarmOffset.minutes = -5;
                }
                alarmOffset.normalize();

                alarm.related = Ci.calIAlarm.ALARM_RELATED_START;
                alarm.offset = alarmOffset;

                //dump("getAlarms: Creating alarm in getAlarms: this.calendarItemType:"+this.calendarItemType+", alarm.offset="+alarmOffset.minutes+"\n");
                this._alarm = alarm.clone();
                this._calEvent.addAlarm(alarm);
            }
            else {
                //dump("getAlarms: no alarm info in exchangeData.\n");
            }
            break;
        }

        var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '34144']");
        if (tmpObject.length > 0) {
            //dump(this.title+"| /t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '34144']:"+tmpObject[0].getTagValue("t:Value", null)+"\n");
            this._reminderSignalTime = this.tryToSetDateValueUTC(xml2json.getTagValue(tmpObject[0], "t:Value", null), null);
            //dump(this.title+"| this._reminderSignalTime:"+this._reminderSignalTime+"\n");
            //dump(this.title+"| this._reminderSignalTime.icalString:"+this._reminderSignalTime.icalString+"\n");
            //dump(this.title+"| this.calendarItemType:"+this.calendarItemType+"\n");

            //dump("Setting X-MOZ-SNOOZE-TIME by data in exchangedata", -1);
            if (this.className == "mivExchangeEvent") {
                switch (this.calendarItemType) {
                case "RecurringMaster":
                    this._xMozSnoozeTime = this._reminderSignalTime.icalString;
                    break;
                case "Single":

                    this._calEvent.setProperty("X-MOZ-SNOOZE-TIME", this._reminderSignalTime.icalString);
                    //this.setProperty("X-MOZ-SNOOZE-TIME", this._reminderSignalTime.icalString);
                    this._xMozSnoozeTime = this._reminderSignalTime.icalString;
                    break;
                default:
                    //dump("Would like to set X-MOZ-SNOOZE-TIME for this.calendarItemType:"+this.calendarItemType);
                }
            }

            if (this.className == "mivExchangeTodo") {
                //dump("reminderSignalTime: title:"+this.title+", this.reminderSignalTime:"+this._reminderSignalTime+"\n");
                this._calEvent.setProperty("X-MOZ-SNOOZE-TIME", this._reminderSignalTime.icalString);
                //this.setProperty("X-MOZ-SNOOZE-TIME", this._reminderSignalTime.icalString);
                this._xMozSnoozeTime = this._reminderSignalTime.icalString;
            }
        }
        tmpObject = null;

        try {
            this._alarmLastAck = this.reminderSignalTime.clone();
        }
        catch (err) {
            this._alarmLastAck = this.tryToSetDateValueUTC("2030-01-01T00:00:00Z", null);
        }
        if (!this._alarmLastAck) {
            this._alarmLastAck = this.tryToSetDateValueUTC("2030-01-01T00:00:00Z", null);
        }

        switch (this.calendarItemType) {
        case "Exception":
        case "Occurrence":
            if (this.startDate) {
                if (this.reminderDueBy) {
                    switch (this.reminderDueBy.compare(this.startDate)) {
                    case -1:
                        this._alarmLastAck = null;
                        break;
                    case 0:
                        this._alarmLastAck.addDuration(cal.createDuration('-PT1S'));
                        break;
                    case 1:
                        this._alarmLastAck = this.startDate.clone();
                        break;
                    }
                }
                else {
                    this._alarmLastAck = null;
                }
            }
            break;
        case "Single":
            this._alarmLastAck.addDuration(cal.createDuration('-PT1S'));
            break;
        default:
            //dump("get alarmLastAck: this.calendarItemType:"+this.calendarItemType+"\n");
        }
        this._calEvent.alarmLastAck = this._alarmLastAck;

        var recurrence = this.XPath("/t:Recurrence/*");
        if (recurrence.length > 0) {
            //dump("Recurrence::"+recurrence);
            var recrule = this.readRecurrenceRule(recurrence);
            recurrence = null;

            if (recrule) {
                //var recurrenceInfo = cal.createRecurrenceInfo(this);
                this._recurrenceInfo = Cc["@1st-setup.nl/exchange/recurrenceinfo;1"]
                    .createInstance(Ci.mivExchangeRecurrenceInfo);

                this._recurrenceInfo.item = this;

                this._recurrenceInfo.setRecurrenceItems(1, [recrule]);

                this._calEvent.recurrenceInfo = Cc["@1st-setup.nl/exchange/recurrenceinfo;1"]
                    .createInstance(Ci.mivExchangeRecurrenceInfo);

                this._calEvent.recurrenceInfo.item = this;

                this._calEvent.recurrenceInfo.setRecurrenceItems(1, [recrule]);

                //this.parentItem = this;

            }
            else {
                this._recurrenceInfo = null;
                //if( this.title == "SE overleg") {
                //					dump("get recurrenceInfo 2: title:"+this.title+", recurrence.length="+recurrence.length+", recrule:null, recurrence="+this.exchangeData.toString()+"\n");
                //}
            }
        }
        else {
            //dump("No Recurrence tag. this.title:"+this.title+"\n -- "+xml2json.toString(this.exchangeData)+"\n\n");
            this._recurrenceInfo = null;
        }

        this._bodyType = this.getAttributeByTag("t:Body", "BodyType", "HTML");

        this._body = this.getTagValue("t:Body", null);
        //dump("get property 1a: title:"+this.title+", name:"+name+", this._body:"+this._body);
        if (this._body) {
            if (this._bodyType == "HTML") {
                this._calEvent.setProperty("DESCRIPTION", exchGlobalFunctions.fromHTML2Text(this._body));
            }
            else {
                this._calEvent.setProperty("DESCRIPTION", this._body);
                this._body = exchGlobalFunctions.fromText2HTML(this._body);
            }
        }
        this._bodyType = "HTML";

        this._dateTimeCreated = this.tryToSetDateValueUTC(this.getTagValue("t:DateTimeCreated", null), null);

        this._created = this.dateTimeCreated;
        //dump("get property 1a: title:"+this.title+", name:"+name+", this._body:"+this._body);
        if (this._created) {
            this._calEvent.setProperty("CREATED", this._created);
        }

        this._legacyFreeBusyStatus = this.getTagValue("t:LegacyFreeBusyStatus", null);

        switch (this.legacyFreeBusyStatus) {
        case "Free":
            this._calEvent.setProperty("TRANSP", "TRANSPARENT");
            break;
        case "Busy":
        case "Tentative":
        case "OOF":
            this._calEvent.setProperty("TRANSP", "OPAQUE");
            break;
        }

        this._isCancelled = (this.getTagValue("t:IsCancelled", "false") == "true");

        if (this._className == "mivExchangeEvent") {
            if (!this._myResponseType) {
                if (this.isCancelled) {
                    this._calEvent.setProperty("STATUS", "CANCELLED");
                }
                else {
                    switch (this.myResponseType) {
                    case "Unknown":
                        this._calEvent.setProperty("STATUS", "NONE");
                        break;
                    case "Organizer":
                        this._calEvent.setProperty("STATUS", "CONFIRMED");
                        break;
                    case "Tentative":
                        this._calEvent.setProperty("STATUS", "TENTATIVE");
                        break;
                    case "Accept":
                        this._calEvent.setProperty("STATUS", "CONFIRMED");
                        break;
                    case "Decline":
                        this._calEvent.setProperty("STATUS", "CANCELLED");
                        break;
                    case "NoResponseReceived":
                        this._calEvent.setProperty("STATUS", "NONE");
                        break;
                    default:
                        //this._calEvent.setProperty("STATUS", "NONE");
                        break;
                    }
                }
            }
        }


        this._responseObjects = {};

        var responseObjects = this.XPath("/t:ResponseObjects/*");
        for each(var prop in responseObjects) {
            this._responseObjects[prop.tagName] = true;
        }
        responseObjects = null;

        this._type = this._exchangeData.tagName;

        if (((this.responseObjects) && ((this.responseObjects.AcceptItem)
                || (this.responseObjects.TentativelyAcceptItem)
                || (this.responseObjects.DeclineItem)))
            || (this.type == "MeetingRequest")) {
            this._calEvent.setProperty("X-MOZ-SEND-INVITATIONS", true);
        }
        else {
            this._calEvent.setProperty("X-MOZ-SEND-INVITATIONS", false);
        }

        //		this._organizer = this.createAttendee(this.getTag("t:Organizer"), "CHAIR");
        this._organizer = this.createAttendee(this.getTag("t:Organizer"), null);
        if (this._organizer) {
            this._organizer.isOrganizer = true;
            this._calEvent.organizer = this._organizer;
        }

        this._attendees = [];
        var tmpAttendee;

        this._calEvent.removeAllAttendees();

        var attendees = this.XPath("/t:RequiredAttendees/t:Attendee")
        for each(var at in attendees) {
            tmpAttendee = this.createAttendee(at, "REQ-PARTICIPANT");
            this._calEvent.addAttendee(tmpAttendee);
            //dump("getAttendees: title:"+this.title+", adding required attendee.id:"+tmpAttendee.id+"\n");
            this._attendees.push(tmpAttendee.clone());
            this._reqParticipants = true;
        }
        attendees = null;
        attendees = this.XPath("/t:OptionalAttendees/t:Attendee")
        for each(var at in attendees) {
            tmpAttendee = this.createAttendee(at, "OPT-PARTICIPANT");
            this._calEvent.addAttendee(tmpAttendee);
            //dump("getAttendees: title:"+this.title+", adding optional attendee.id:"+tmpAttendee.id+"\n");
            this._attendees.push(tmpAttendee.clone());
            this._optParticipants = true;
        }
        attendees = null;

        this._hasAttachments = (this.getTagValue("t:HasAttachments", "false") == "true");

        this._attachments = [];
        if (this.hasAttachments) {
            var fileAttachments = this.XPath("/t:Attachments/t:FileAttachment");
            for each(var fileAttachment in fileAttachments) {
                var newAttachment = cal.createAttachment();
                newAttachment.setParameter("X-AttachmentId", xml2json.getAttributeByTag(fileAttachment, "t:AttachmentId", "Id"));
                newAttachment.uri = cal.makeURL("http://somewhere/?id=" + encodeURIComponent(xml2json.getAttributeByTag(fileAttachment, "t:AttachmentId", "Id")) + "&name=" + encodeURIComponent(xml2json.getTagValue(fileAttachment, "t:Name")) + "&size=" + encodeURIComponent(xml2json.getTagValue(fileAttachment, "t:Size", "")) + "&calendarid=" + encodeURIComponent(this.calendar.id) + "&isinline=" + encodeURIComponent(xml2json.getTagValue(fileAttachment, "t:IsInline", "false")) + "&contentid=" + encodeURIComponent(xml2json.getTagValue(fileAttachment, "t:ContentId", "<NOPE>")));

                this._attachments.push(newAttachment.clone());
                this._calEvent.addAttachment(newAttachment);
            }
            fileAttachments = null;
        }

        this._categories = [];
        var strings = this.XPath("/t:Categories/t:String");
        for each(var cat in strings) {
            this._categories.push(xml2json.getValue(cat));
        }
        strings = null;
        this._calEvent.setCategories(this._categories.length, this._categories);

        this._recurrenceId = this.tryToSetDateValueUTC(this.getTagValue("t:RecurrenceId", null), this._calEvent.recurrenceId);
        if (this._recurrenceId) {
            this._recurrenceId.isDate = true;
            this._calEvent.recurrenceId = this._recurrenceId;
        }

        // End of afterPre initialization

        this.postLoad();

        this._exchangeXML = true;
        this._exchangeData = null;

    },

    get exchangeXML() {
        return this._exchangeXML;
    },

    preLoad: function _preLoad() {},

    postLoad: function _postLoad() {},

    convertToExchange: function _convertToExchange() {},

    set body(aValue) {
        //dump("set body aValue:"+aValue+"\n");
        this._newBody2 = aValue;
        if (this.bodyType == "HTML") {
            this._calEvent.setProperty("DESCRIPTION", exchGlobalFunctions.fromHTML2Text(aValue));
        }
        else {
            this._calEvent.setProperty("DESCRIPTION", aValue);
            this._newBody2 = exchGlobalFunctions.fromText2HTML(aValue);
        }
    },

    get body() {
        if (this._newBody2) {
            return this._newBody2;
        }

        if (!this._body) {
            return "<HTML><BODY></BODY></HTML>";
        }

        return this._body;
    },

    set bodyType(aValue) {
        if ((aValue != "HTML") && (aValue != "Text")) {
            return;
        }
        this._newBodyType = aValue;
    },

    get bodyType() {
        if (this._newBodyType) {
            return this._newBodyType;
        }
        return this._bodyType;
    },

    //attribute long occurrenceIndex;
    get occurrenceIndex() {
        if (this._occurrenceIndex) {
            return this._occurrenceIndex;
        }

        return -1;
    },

    set occurrenceIndex(aValue) {
        if (aValue != this._occurrenceIndex) {
            this._occurrenceIndex = aValue;
        }
    },

    addUpdateXMLField: function _addUpdateXMLField(updateType, parentItem, aField, aValue, aAttributes, aValueIsComplete) {
        var setItemField = parentItem.addChildTag(updateType, "t", null);
        if (aField != "ExtendedFieldURI") {
            var fieldURI = setItemField.addChildTag("FieldURI", "t", null);

            if ((this.className == "mivExchangeTodo") && (aField == "Recurrence")) {
                fieldURI.setAttribute("FieldURI", "task:" + aField);
            }
            else {
                fieldURI.setAttribute("FieldURI", fieldPathMap[aField] + ":" + aField);
            }

            if ((aValue !== null) && (aValue !== undefined)) {
                try {
                    if (aValue.QueryInterface(Ci.mivIxml2jxon)) {
                        if (aValueIsComplete) {
                            var fieldValue = setItemField.addChildTag(this._mainTag, "t", null).addChildTagObject(aValue);
                        }
                        else {
                            var fieldValue = setItemField.addChildTag(this._mainTag, "t", null).addChildTag(aField, "t", null).addChildTagObject(aValue);
                        }
                    }
                    else {
                        var fieldValue = setItemField.addChildTag(this._mainTag, "t", null).addChildTag(aField, "t", aValue);
                    }
                }
                catch (err) {
                    var fieldValue = setItemField.addChildTag(this._mainTag, "t", null).addChildTag(aField, "t", aValue);
                }

                if (aAttributes) {
                    for (var attribute in aAttributes) {
                        fieldValue.setAttribute(attribute, aAttributes[attribute]);
                    }
                }
            }
            else {
                if (updateType == "SetItemField") {
                    var fieldValue = setItemField.addChildTag(this._mainTag, "t", null).addChildTag(aField, "t", aValue);

                    if (aAttributes) {
                        for (var attribute in aAttributes) {
                            fieldValue.setAttribute(attribute, aAttributes[attribute]);
                        }
                    }
                }
            }
        }
        else {

            var extFieldURI = setItemField.addChildTag("ExtendedFieldURI", "t", null);
            if (aAttributes) {
                for (var attribute in aAttributes) {
                    extFieldURI.setAttribute(attribute, aAttributes[attribute]);
                }
            }

            var extProp = setItemField.addChildTag(this._mainTag, "t", null).addChildTag("ExtendedProperty", "t", null);
            extProp.addChildTagObject(extFieldURI);
            extProp.addChildTag("Value", "t", aValue);
        }

    },

    addSetItemField: function _addSetItemField(parentItem, aField, aValue, aAttributes, aValueIsComplete) {
        this.addUpdateXMLField("SetItemField", parentItem, aField, aValue, aAttributes, aValueIsComplete);
    },

    addDeleteItemField: function _addDeleteItemField(parentItem, aField) {
        this.addUpdateXMLField("DeleteItemField", parentItem, aField);
    },

    getAlarmTime: function _getAlarmTime() {
        var alarms = this.getAlarms({});

        var alarm;
        if (alarms.length > 0) {
            alarm = alarms[0];
        }
        if (!alarm) {
            return null;
        }

        switch (alarm.related) {
        case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
            var alarmTime = alarm.alarmDate;
            break;
        case Ci.calIAlarm.ALARM_RELATED_START:
            var alarmTime = this.startDate.clone();
            alarmTime.addDuration(alarm.offset);
            break;
        case Ci.calIAlarm.ALARM_RELATED_END:
            var alarmTime = this.endDate.clone();
            alarmTime.addDuration(alarm.offset);
            break;
        }

        alarmTime = alarmTime.getInTimezone(cal.UTC());

        return alarmTime;
    },

    makeRecurrenceRule: function _makeRecurrenceRule() {
        if (!this.parentItem) {
            return;
        }
        try {
            if (!this.recurrenceInfo || this.parentItem.id != this.id) {
                if (!this.recurrenceInfo) {}
                if (this.parentItem.id != this.id) {}
                return;
            }

            var recurrenceItems = this.recurrenceInfo.getRecurrenceItems({});
            var rrule = null;
            for each(var ritem in recurrenceItems) {
                if (ritem instanceof Ci.calIRecurrenceRule) {
                    rrule = ritem;
                    break;
                }
            }

            if (!rrule) {
                // XXX exception?
                //dump("makeRecurrenceRule: We have no rrule");
                return;
            }

            var r = exchGlobalFunctions.xmlToJxon('<t:Recurrence xmlns:m="' + nsMessagesStr + '" xmlns:t="' + nsTypesStr + '"/>');

            //var r = updates.addChildTag("Recurrence", "t", null);

            /* can't get parameters of RRULEs... have to do it manually :/ */
            var prop = {};
            for each(let ps in rrule.icalProperty.value.split(';')) {
                let m = ps.split('=');
                prop[m[0]] = m[1];
            }

            var startDate;
            var originalDate;
            if (cal.isEvent(this)) {
                //dump(" GoGo 2\n");
                startDate = this.startDate.clone();
                originalDate = this.startDate.clone();
            }
            else {
                if (this.entryDate) {
                    startDate = this.entryDate.clone();
                    startDate.isDate = false;
                    originalDate = this.entryDate.clone();
                }
            }

            if (startDate) {
                startDate = startDate.clone();
            }
            else {
                startDate = cal.now();
                originalDate = cal.now();
            }
            startDate.isDate = true;

            prop["BYMONTHDAY"] = prop["BYMONTHDAY"] || startDate.day;
            prop["BYMONTH"] = prop["BYMONTH"] || (startDate.month + 1);

            switch (rrule.type) {
            case 'YEARLY':
                if (prop["BYDAY"]) {
                    var m = prop["BYDAY"].match(/^(-?\d)(..)$/);
                    var ryr = r.addChildTag("RelativeYearlyRecurrence", "t", null);
                    ryr.addChildTag("DaysOfWeek", "t", dayRevMap[m[2]]);
                    ryr.addChildTag("DayOfWeekIndex", "t", dayRevMap[m[1]]);
                    ryr.addChildTag("Month", "t", monthIdxMap[prop["BYMONTH"] - 1]);
                }
                else {
                    var ayr = r.addChildTag("AbsoluteYearlyRecurrence", "t", null);
                    ayr.addChildTag("DayOfMonth", "t", prop["BYMONTHDAY"]);
                    ayr.addChildTag("Month", "t", monthIdxMap[prop["BYMONTH"] - 1]);
                }
                break;
            case 'MONTHLY':
                if (prop["BYDAY"]) {
                    var rmr = r.addChildTag("RelativeMonthlyRecurrence", "t", null);
                    rmr.addChildTag("Interval", "t", rrule.interval);
                    var m = prop["BYDAY"].match(/^(-?\d)(..)$/);
                    rmr.addChildTag("DaysOfWeek", "t", dayRevMap[m[2]]);
                    rmr.addChildTag("DayOfWeekIndex", "t", weekRevMap[m[1]]);
                }
                else {
                    var amr = r.addChildTag("AbsoluteMonthlyRecurrence", "t", null);
                    amr.addChildTag("Interval", "t", rrule.interval);
                    amr.addChildTag("DayOfMonth", "t", prop["BYMONTHDAY"]);
                }
                break;
            case 'WEEKLY':
                var wr = r.addChildTag("WeeklyRecurrence", "t", null);
                wr.addChildTag("Interval", "t", rrule.interval);
                var days = [];
                var daystr = prop["BYDAY"] || dayIdxMap[startDate.weekday];
                for each(let day in daystr.split(",")) {
                    days.push(dayRevMap[day]);
                }
                wr.addChildTag("DaysOfWeek", "t", days.join(' '));
                break;
            case 'DAILY':
                var dr = r.addChildTag("DailyRecurrence", "t", null);
                dr.addChildTag("Interval", "t", rrule.interval);
                break;
            }

            if (cal.isEvent(this)) {
                //			var startDateStr = cal.toRFC3339(startDate.getInTimezone(exchGlobalFunctions.ecUTC()))+"Z";
                var startDateStr = cal.toRFC3339(startDate.getInTimezone(exchGlobalFunctions.ecUTC()));
                //var startDateStr = cal.toRFC3339(originalDate.getInTimezone(exchGlobalFunctions.ecUTC()));
            }
            else {
                // We make a non-UTC datetime value for exchGlobalFunctions.
                // EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
                //LOG("  ==== tmpStart:"+cal.toRFC3339(tmpStart));
                var startDateStr = cal.toRFC3339(startDate).substr(0, 19); //cal.toRFC3339(tmpStart).length-6);
            }

            if (rrule.isByCount && rrule.count != -1) {
                var nr = r.addChildTag("NumberedRecurrence", "t", null);
                nr.addChildTag("StartDate", "t", startDateStr);
                nr.addChildTag("NumberOfOccurrences", "t", rrule.count);
            }
            else if (!rrule.isByCount && rrule.untilDate) {

                var endDate = rrule.untilDate.clone();
                if (cal.isEvent(this)) {
                    endDate.isDate = true;
                    var endDateStr = cal.toRFC3339(endDate.getInTimezone(exchGlobalFunctions.ecUTC()));
                }
                else {
                    if (!endDate.isDate) {
                        endDate.isDate = true;
                        endDate.isDate = false;
                        var tmpDuration = cal.createDuration();
                        tmpDuration.days = 1;
                        endDate.addDuration(tmpDuration);

                        endDate.isDate = true;
                    }
                    var endDateStr = cal.toRFC3339(endDate).substr(0, 19); //cal.toRFC3339(tmpEnd).length-6);
                }
                var edr = r.addChildTag("EndDateRecurrence", "t", null);
                edr.addChildTag("StartDate", "t", startDateStr);
                edr.addChildTag("EndDate", "t", endDateStr);
            }
            else {
                var ner = r.addChildTag("NoEndRecurrence", "t", null);
                ner.addChildTag("StartDate", "t", startDateStr);
            }

            return r;
        }
        catch (err) {
            dump("Error2:" + err + " | " + exchGlobalFunctions.STACK() + "\n");
        }

        /* We won't write WKST/FirstDayOfWeek for now because it is Exchange 2010 and up */
    },

    get updateXML() {
        this._nonPersonalDataChanged = false;

        var updates = exchGlobalFunctions.xmlToJxon('<t:Updates xmlns:m="' + nsMessagesStr + '" xmlns:t="' + nsTypesStr + '"/>');
        //dump("updates:"+updates.toString()+"\n");
        return updates;
    },

    get nonPersonalDataChanged() {
        return this._nonPersonalDataChanged;
    },

    getOccurrenceByNativeId: function _getOccurrenceByNativeId(aNativeId) {
        var result = null;
        for (var index in this._exceptions) {
            if (this._exceptions[index].recurrenceId.nativeTime == aNativeId) {
                // found the exception for which the alarm was snoozed.
                result = this._exceptions[index];
                break;
            }
        }

        if (!result) {
            for (var index in this._occurrences) {
                if (this._occurrences[index].recurrenceId.nativeTime == aNativeId) {
                    // found the occurrence for which the alarm was snoozed.
                    result = this._occurrences[index];
                    break;
                }
            }
        }

        return result;
    },

    checkAlarmChange: function _checkAlarmChange(updates) {
        var reminderIsSetChanged = undefined;
        var newReminderMinutesBeforeStart = undefined;
        this.reminderMinutesBeforeStart; // To have is initialized.
        // Alarm
        if (this._newAlarm !== undefined) {
            dump("checkAlarmChange:" + this.title + ",  Alarm was changed: " + this._newAlarm + ".\n");
            // Alarm was changed.
            if (this._newAlarm === null) {
                // Alarm was removed.
                //dump("checkAlarmChange: alarm is removed. this._newAlarm !== undefined and this._newAlarm === null.\n");
                reminderIsSetChanged = "false";
            }
            else {
                // New alarm setting.
                var alarms = this.getAlarms({});
                if (alarms.length > 0) {
                    //this.addSetItemField(updates, "ReminderIsSet", "true");
                    reminderIsSetChanged = "true";
                    // Calculate the alarm.

                    var alarm = alarms[0];

                    if ((!this._alarm) || (this._alarm.offset != alarm.offset) || (this.className == "mivExchangeTodo")) {
                        //dump(" We have alarms."+alarms[0].alarmDate+", alarm:"+alarm+", alarm.offset:"+alarm.offset+", X-MOZ-SNOOZE-TIME:"+this.getProperty("X-MOZ-SNOOZE-TIME")+"\n");
                        // Exchange alarm is always an offset to the start.
                        // A Todo always has an alarm.related of ALARM_RELATED_ABSOLUTE
                        // So referenceDate is set there.
                        if (this.className == "mivExchangeEvent") {
                            var referenceDate = this.startDate.getInTimezone(cal.UTC());
                            referenceDate.isDate = false;
                        }

                        switch (alarm.related) {
                        case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
                            //dump("ALARM_RELATED_ABSOLUTE we are going to calculate a offset from the start.");
                            var newAlarmTime = alarm.alarmDate.clone();

                            // Calculate offset from start of item.
                            if (this.className == "mivExchangeEvent") {
                                var offset = newAlarmTime.subtractDate(this.startDate);
                            }
                            else {
                                //var offset = 0;
                                referenceDate = newAlarmTime.getInTimezone(cal.UTC());
                            }
                            break;
                        case Ci.calIAlarm.ALARM_RELATED_START:
                            //dump("ALARM_RELATED_START this is easy exchange does the same.");
                            //var newAlarmTime = this.startDate.clone();
                            var offset = alarm.offset.clone();
                            break;
                        case Ci.calIAlarm.ALARM_RELATED_END:
                            //dump("ALARM_RELATED_END we are going to calculate the offset from the start.");
                            var newAlarmTime = this.endDate.clone();
                            newAlarmTime.isDate = false;
                            newAlarmTime.addDuration(alarm.offset);

                            var offset = newAlarmTime.subtractDate(referenceDate);
                            break;
                        }
                        this.addSetItemField(updates, "ReminderDueBy", cal.toRFC3339(referenceDate));

                        if ((offset) && (offset.inSeconds != 0)) {
                            this.addSetItemField(updates, "ReminderMinutesBeforeStart", String((offset.inSeconds / 60) * -1));
                            if (this._reminderMinutesBeforeStart) {
                                if (this._reminderMinutesBeforeStart != String((offset.inSeconds / 60) * -1)) {
                                    newReminderMinutesBeforeStart = true;
                                }
                                else {
                                    newReminderMinutesBeforeStart = false;
                                }
                            }
                        }
                        else {
                            this.addSetItemField(updates, "ReminderMinutesBeforeStart", "0");
                            if (this._reminderMinutesBeforeStart) {
                                if (this._reminderMinutesBeforeStart != "0") {
                                    newReminderMinutesBeforeStart = true;
                                }
                                else {
                                    newReminderMinutesBeforeStart = false;
                                }
                            }
                        }
                    }
                }
                else {
                    // This should never happen.
                    dump("mivExchangeBaseItem: updateXML: Weird error. We have a history of an alarm added but no alarms exist. This should never happen. please report to info@1st-setup.nl\n");
                }
            }

        }
        else {
            // Check if an exisiting alarm setting changed.
            //dump("checkAlarmChange: checking is an existing alarm changed.\n");
            var alarms = this.getAlarms({});
            if (alarms.length > 0) {
                //dump("checkAlarmChange: We have an alarm.\n");
                var alarm = alarms[0];

                // Exchange alarm is always an offset to the start.
                // A Todo always has an alarm.related of ALARM_RELATED_ABSOLUTE
                // So referenceDate is set there.
                if (this.className == "mivExchangeEvent") {
                    var referenceDate = this.startDate.getInTimezone(cal.UTC());
                    referenceDate.isDate = false;
                }

                switch (alarm.related) {
                case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
                    //dump("ALARM_RELATED_ABSOLUTE we are going to calculate a offset from the start.");
                    var newAlarmTime = alarm.alarmDate.clone();

                    // Calculate offset from start of item.
                    if (this.className == "mivExchangeEvent") {
                        var offset = newAlarmTime.subtractDate(this.startDate);
                    }
                    else {
                        //var offset = 0;
                        referenceDate = newAlarmTime.getInTimezone(cal.UTC());
                    }
                    break;
                case Ci.calIAlarm.ALARM_RELATED_START:
                    //dump("ALARM_RELATED_START this is easy exchange does the same.");
                    var offset = alarm.offset.clone();
                    break;
                case Ci.calIAlarm.ALARM_RELATED_END:
                    //dump("ALARM_RELATED_END we are going to calculate the offset from the start.");
                    var newAlarmTime = this.endDate.clone();
                    newAlarmTime.isDate = false;
                    newAlarmTime.addDuration(alarm.offset);

                    var offset = newAlarmTime.subtractDate(referenceDate);
                    break;
                }

                if ((offset) && (offset.inSeconds != 0)) {
                    if (this._reminderMinutesBeforeStart) {
                        if (this._reminderMinutesBeforeStart != String((offset.inSeconds / 60) * -1)) {
                            newReminderMinutesBeforeStart = true;
                        }
                        else {
                            newReminderMinutesBeforeStart = false;
                        }
                    }
                }
                else {
                    if (this._reminderMinutesBeforeStart) {
                        if (this._reminderMinutesBeforeStart != "0") {
                            newReminderMinutesBeforeStart = true;
                        }
                        else {
                            newReminderMinutesBeforeStart = false;
                        }
                    }
                }
            }
        }

        var newSnoozeTime = null;
        // Alarm snooze or dismiss
        if (typeof this._newXMozSnoozeTime !== undefined) {
            //dump("checkAlarmChange: this._newXMozSnoozeTime was set to:"+this._newXMozSnoozeTime+", newReminderMinutesBeforeStart="+newReminderMinutesBeforeStart+"\n");
            dump("\ncheckAlarmChange: snoozetime " + this._newXMozSnoozeTime);
            if ((this._newXMozSnoozeTime === null) && (newReminderMinutesBeforeStart !== true)) {
                dump("\ncheckAlarmChange: dismissed " + newReminderMinutesBeforeStart + ".\n");
                //dump("checkAlarmChange: We have a change\n");
                if (this.calendarItemType == "RecurringMaster") {
                    // Find out which occurrence or exception was dismissed
                    var dismissedItem = this.getOccurrenceByNativeId(this._lastXMozSnoozeTimeNativeId);
                    if (!dismissedItem) {
                        //dump("This is weird. We did not find the dismissedItem.\n");
                    }
                    else {
                        if (dismissedItem.calendarItemType == "Exception") {
                            //dump("Dismissed an exception with startDate:"+dismissedItem.startDate+"\n");
                            var newException = dismissedItem.clone();
                            newException.deleteProperty("X-MOZ-SNOOZE-TIME-" + this._lastXMozSnoozeTimeNativeId);
                            this.calendar.modifyItem(newException, dismissedItem, null);
                        }
                        else {

                            //							Recurring Events reminder fix for occurence  ** Wed Jun 24 10:04:44 IST 2015
                            var aNewItem = dismissedItem.clone();
                            aNewItem._reminderIsSet = false;
                            aNewItem._newAlarm = null;
                            this.calendar.modifyItem(aNewItem, dismissedItem, null);
                            //dump("Dismissed an occurrence with startDate:"+dismissedItem.startDate+"\n");
                        }

                        var tmpDate = dismissedItem.endDate || dismissedItem.dueDate;
                        if (tmpDate) {
                            var nextOccurrence = this.recurrenceInfo.getNextOccurrence(tmpDate);
                        }
                        else {
                            var nextOccurrence = null;
                        }
                        do {
                            if (nextOccurrence) {
                                // We have a next occurrence. Set newSnoozeTime.
                                //dump("We have a next occurrence.\n");
                                if (nextOccurrence.reminderIsSet) {
                                    //newSnoozeTime = cal.createDateTime(this._newXMozSnoozeTime);
                                    if (nextOccurrence.calendarItemType == "Exception") {
                                        // Next occurrence is an exception
                                        //dump("Next occurrence is an exception\n");
                                        var alarmOffset = cal.createDuration();
                                        alarmOffset.minutes = -1 * nextOccurrence.reminderMinutesBeforeStart;

                                        newSnoozeTime = nextOccurrence.startDate.clone();
                                        newSnoozeTime.addDuration(alarmOffset);
                                    }
                                    else {
                                        //dump("Next occurrence is NOT an exception\n");
                                        var alarmOffset = cal.createDuration();
                                        alarmOffset.minutes = -1 * this.reminderMinutesBeforeStart;

                                        newSnoozeTime = nextOccurrence.startDate.clone();
                                        newSnoozeTime.addDuration(alarmOffset);
                                    }
                                }
                                else {
                                    //dump("Reminder not active on item:"+nextOccurrence.startDate+". Going to look for next.\n");
                                    var tmpDate = dismissedItem.endDate || dismissedItem.dueDate;
                                    if (tmpDate) {
                                        nextOccurrence = this.recurrenceInfo.getNextOccurrence(nextOccurrence.endDate);
                                    }
                                    else {
                                        nextOccurrence = null;
                                    }
                                }
                            }

                            if (!nextOccurrence) {
                                // No next occurrence.
                                //dump("No next occurrence so turning alarm of on master.\n");
                                reminderIsSetChanged = "false";
                            }
                        }
                        while ((nextOccurrence) && (newSnoozeTime === null));

                    }
                }
                else {
                    // Single dismiss. We turn it off.
                    //dump("dismiss Single:"+this.title+", startDate:"+this.startDate+"\n");
                    if (this.className == "mivExchangeEvent") reminderIsSetChanged = "false";
                }
            }
            else {
                // We have a snooze
                if (this.calendarItemType == "RecurringMaster") {
                    // Master snooze. set new alarm time.
                    // Find out which occurrence or exception was snoozed
                    var snoozedItem = this.getOccurrenceByNativeId(this._lastXMozSnoozeTimeNativeId);
                    if (!snoozedItem) {
                        //dump("This is weird. We did not find the snoozedItem.\n");
                    }
                    else {
                        if (snoozedItem.calendarItemType == "Exception") {
                            //dump("Snoozed an exception with startDate:"+snoozedItem.startDate+"\n");
                            var newException = snoozedItem.clone();
                            newException.setProperty("X-MOZ-SNOOZE-TIME-" + this._lastXMozSnoozeTimeNativeId, this._newXMozSnoozeTime);
                            this.calendar.modifyItem(newException, snoozedItem, null);
                        }
                        else {
                            //dump("Snoozed an occurrence with startDate:"+snoozedItem.startDate+"\n");
                        }

                        newSnoozeTime = cal.createDateTime(this._newXMozSnoozeTime);
                    }
                }
                else {
                    // Single snooze. set new alarm time.
                    //dump("Snooze Single:"+this.title+", startDate:"+this.startDate+", newAlarmTime:"+this._newXMozSnoozeTime+"\n");
                    newSnoozeTime = cal.createDateTime(this._newXMozSnoozeTime);
                }
            }

        }

        if (newSnoozeTime) {
            newSnoozeTime = newSnoozeTime.getInTimezone(cal.UTC());
            const MAPI_PidLidReminderSignalTime = "34144";

            this.addSetItemField(updates, "ExtendedFieldURI", cal.toRFC3339(newSnoozeTime), {
                DistinguishedPropertySetId: "Common",
                PropertyId: MAPI_PidLidReminderSignalTime,
                PropertyType: "SystemTime"
            });
        }

        if (reminderIsSetChanged !== undefined) {
            this.addSetItemField(updates, "ReminderIsSet", reminderIsSetChanged);
        }
    },

    // Internal methods.
    readRecurrenceRule: function _readRecurrenceRule(aElement) {
        /*
         * The Mozilla recurrence API is bothersome and dictated by libical.
         *
         * We need to obey and build an iCalendar string which we feed in
         * to get the proper recurrence info.
         */
        const dayMap = {
            'Monday': 'MO',
            'Tuesday': 'TU',
            'Wednesday': 'WE',
            'Thursday': 'TH',
            'Friday': 'FR',
            'Saturday': 'SA',
            'Sunday': 'SU',
            'Weekday': ['MO', 'TU', 'WE', 'TH', 'FR'],
            'WeekendDay': ['SA', 'SO'],
            'Day': ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SO']
        };

        const monthMap = {
            'January': 1,
            'February': 2,
            'March': 3,
            'April': 4,
            'May': 5,
            'June': 6,
            'July': 7,
            'August': 8,
            'September': 9,
            'October': 10,
            'November': 11,
            'December': 12
        };

        var comps = {};

        for each(var rec in aElement) {
            switch (rec.tagName) {
            case "RelativeYearlyRecurrence":
            case "AbsoluteYearlyRecurrence":
                comps['FREQ'] = "YEARLY";
                break;
            case "RelativeMonthlyRecurrence":
            case "AbsoluteMonthlyRecurrence":
                comps['FREQ'] = "MONTHLY";
                break;
            case "WeeklyRecurrence":
                comps['FREQ'] = "WEEKLY";
                break;
            case "DailyRecurrence":
            case "DailyRegeneration":
                comps['FREQ'] = "DAILY";
                break;
            case "NoEndRecurrence":
            case "NumberedRecurrence":
                break;
            case "EndDateRecurrence":
                break;
            default:
                //dump("skipping " + rec.tagName);
                continue;
            }

            var weekdays = [];
            var week = [];
            var comps2 = xml2json.XPath(rec, "/*");
            for each(var comp in comps2) {
                switch (comp.tagName) {
                case 'DaysOfWeek':
                    for each(let day in xml2json.getValue(comp).split(" ")) {
                        weekdays = weekdays.concat(dayMap[day]);
                    }
                    break;
                case 'DayOfWeekIndex':
                    week = weekMap[xml2json.getValue(comp)];
                    break;
                case 'Month':
                    comps['BYMONTH'] = monthMap[xml2json.getValue(comp)];
                    break;
                case 'DayOfMonth':
                    comps['BYMONTHDAY'] = xml2json.getValue(comp);
                    break;
                case 'FirstDayOfWeek':
                    comps['WKST'] = dayMap[xml2json.getValue(comp)];
                    break;
                case 'Interval':
                    comps['INTERVAL'] = xml2json.getValue(comp);
                    break;
                case 'StartDate':
                    /* Dunno what to do with this for iCal; no place to set */
                    this._recurrenceStartDate = cal.fromRFC3339(xml2json.getValue(comp).substr(0, 10) + "T00:00:00Z", exchGlobalFunctions.ecTZService().UTC);
                    this._recurrenceStartDate.isDate = true;
                    break;
                case 'EndDate':
                    //					comps['UNTIL'] = comp.value.replace(/Z$/, '');
                    // As we only get the date + timezonediff we make a nice date+time from it.
                    comps['UNTIL'] = xml2json.getValue(comp).substr(0, 10) + "T00:00:00Z";
                    break;
                case 'NumberOfOccurrences':
                    comps['COUNT'] = xml2json.getValue(comp);
                    break;
                }
            }
            comps2 = null;

            let wdtemp = weekdays;
            weekdays = [];
            for each(let day in wdtemp) {
                weekdays.push(week + day);
            }
            if (weekdays.length > 0) {
                comps['BYDAY'] = weekdays.join(',');
            }
        }

        var compstrs = [];
        for (var k in comps) {
            compstrs.push(k + "=" + comps[k]);
        }

        if (compstrs.length == 0) {
            return null;
        }

        var recrule = cal.createRecurrenceRule();

        /* need to do this re-assign game so that the string gets parsed */
        var prop = recrule.icalProperty;
        prop.value = compstrs.join(';');
        recrule.icalProperty = prop;
        return recrule;
    },

    addMailboxAlias: function _addMailboxAlias(aAlias) {
        this.mailboxAliases.push(aAlias);
    },

    createAttendee: function _createAttendee(aElement, aType) {
        if (!aElement) return null;

        if (!Ci.mivExchangeAttendee) {
            dump(" !!!!!!!!!!!!!!!! no Ci.mivExchangeAttendee\n");
            return null;
        }
        //var attendee = Cc["@1st-setup.nl/exchange/attendee;1"]
        //			.createInstance(Ci.mivExchangeAttendee); // This one currently creates an error. Why ??!!
        var attendee = new mivExchangeAttendee();
        attendee.convertFromExchange(this, aElement, aType);
        //dump("  -- CreateAttendee:"+attendee+", attendee.id:"+attendee.id+", title:"+this.title+"\n");
        return attendee;
        /* 
        		let mbox = aElement.getTag("t:Mailbox");
        		var attendee = cal.createAttendee();

        		if (!aType) {
        			aType = "REQ-PARTICIPANT";
        		}

        		var me = false;
        		for each(var alias in this.mailboxAliases) {
        			if (xml2json.getTagValue(mbox, "t:EmailAddress","unknown").toLowerCase() == alias.toLowerCase()) {
        				me = true;
        				//dump("createAttendee: Title:"+this.title+", email:"+xml2json.getTagValue(mbox, "t:EmailAddress","unknown")+". This address is mine ("+alias+").\n");
        				break;
        			}
        		}

        		// We also need to check aliases but these do not get stored yet.

        		switch (xml2json.getTagValue(mbox, "t:RoutingType","unknown")) {
        			case "SMTP" :
        				attendee.id = 'mailto:' + xml2json.getTagValue(mbox, "t:EmailAddress","unknown");
        				break;
        			case "EX" :
        				attendee.id = 'ldap:' + xml2json.getTagValue(mbox, "t:EmailAddress","unknown");
        				break;
        			default:
        				//dump("createAttendee: Unknown RoutingType:'"+xml2json.getTagValue(mbox, "t:RoutingType")+"'");
        				attendee.id = 'mailto:' + xml2json.getTagValue(mbox, "t:EmailAddress","unknown");
        				break;
        		}
        		attendee.commonName = xml2json.getTagValue(mbox, "t:Name");
        		attendee.rsvp = "FALSE";
        		attendee.userType = "INDIVIDUAL";
        		attendee.role = aType;

        		if (me) {
        			attendee.participationStatus = participationMap[this.myResponseType];
        				//dump("createAttendee A: Title:"+this.title+", attendee:"+attendee.id+", myResponseType:"+this.myResponseType+", attendee.participationStatus:"+attendee.participationStatus+"\n");
        		}
        		else {
        			if (xml2json.getTagValue(aElement, "t:ResponseType", "") != "") {
        				attendee.participationStatus = participationMap[xml2json.getTagValue(aElement, "t:ResponseType")];
        				//dump("createAttendee B: Title:"+this.title+", attendee:"+attendee.id+", ResponseType:"+aElement.getTagValue("t:ResponseType")+", attendee.participationStatus:"+attendee.participationStatus+"\n");
        			}
        		}

        		mbox = null;
        		aElement = null;
        		return attendee; */
    },

    tryToSetDateValueUTC: function _tryToSetDateValueUTC(ewsvalue, aDefault) {
        if ((ewsvalue) && (ewsvalue.toString().length)) {
            if (ewsvalue.indexOf("Z") > -1) {
                return cal.fromRFC3339(ewsvalue, exchGlobalFunctions.ecTZService().UTC);
            }
            else {
                return cal.fromRFC3339(ewsvalue, exchGlobalFunctions.ecDefaultTimeZone()).getInTimezone(exchGlobalFunctions.ecTZService().UTC);
            }
        }

        return aDefault;
    },

    tryToSetDateValueDefaultTZ: function _tryToSetDateValueDefaultTZ(ewsvalue, aDefault) {
        if ((ewsvalue) && (ewsvalue.toString().length)) {
            return cal.fromRFC3339(ewsvalue, exchGlobalFunctions.ecDefaultTimeZone());
        }

        return aDefault;
    },

    tryToSetDateValue: function _TryToSetDateValue(ewsvalue, aDefault) {
        if ((ewsvalue) && (ewsvalue.toString().length)) {
            return cal.fromRFC3339(ewsvalue, exchGlobalFunctions.ecTZService().UTC).getInTimezone(exchGlobalFunctions.ecDefaultTimeZone());
        }

        return aDefault;
    },

    XPath: function _XPath(aString) {
        if (this._exchangeData) {
            return xml2json.XPath(this._exchangeData, aString);
        }

        return [];
    },

    getTag: function _getTag(aTagName) {
        if (this._exchangeData) {
            return xml2json.getTag(this._exchangeData, aTagName);
        }

        return null;
    },

    getTags: function _getTags(aTagName) {
        if (this._exchangeData) {
            return xml2json.getTags(this._exchangeData, aTagName);
        }

        return [];
    },

    getTagValue: function _getTagValue(aTagName, aDefaultValue) {
        if (this._exchangeData) {
            return xml2json.getTagValue(this._exchangeData, aTagName, aDefaultValue);
        }

        return aDefaultValue;
    },

    getAttributeByTag: function _getAttributeByTag(aTagName, aAttribute, aDefaultValue) {
        //dump("getAttributeByTag 1: title:"+this.title+", aTagName:"+aTagName+", aAttribute:"+aAttribute+"\n");
        if (this._exchangeData) {
            return xml2json.getAttributeByTag(this._exchangeData, aTagName, aAttribute, aDefaultValue);
        }
        //dump("getAttributeByTag 3: title:"+this.title+", aTagName:"+aTagName+", aAttribute:"+aAttribute);

        return aDefaultValue;
    },

    get className() {
        return this._className;
    },

    initialize: function _initialize() {
        this._calEvent = null;
        if (this.className == "mivExchangeTodo") {
            this._calEvent = Cc["@mozilla.org/calendar/todo;1"]
                .createInstance(Ci.calITodo);
        }
        else {
            this._calEvent = Cc["@mozilla.org/calendar/event;1"]
                .createInstance(Ci.calIEvent);
        }
    },

    deleteItem: function _deleteItem() {
        for (var index in this._occurrences) {
            this._occurrences[index].deleteItem();
            this._occurrences[index] = null;
            delete this._occurrences[index];
        }

        for (var index in this._exceptions) {
            this._exceptions[index].deleteItem();
            this._exceptions[index] = null;
            delete this._exceptions[index];
        }

        this._exchangeData = null;
    },
}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeBaseItem) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeBaseItem = XPCOMUtils.generateNSGetFactory([mivExchangeBaseItem]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeBaseItem(cid);
}
