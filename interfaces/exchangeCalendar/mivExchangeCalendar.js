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
 * -- Exchange 2007/2010 Calendar and Tasks Provider.
 * -- For Thunderbird with the Lightning add-on.
 *
 * This work is a combination of the Storage calendar, part of the default Lightning add-on, and 
 * the "Exchange Data Provider for Lightning" add-on currently, october 2011, maintained by Simon Schubert.
 * Primarily made because the "Exchange Data Provider for Lightning" add-on is a continuation 
 * of old code and this one is build up from the ground. It still uses some parts from the 
 * "Exchange Data Provider for Lightning" project.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 * Contributor: Krzysztof Nowicki (krissn@op.pl)
 * 
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecalendar/ecFunctions.js");
Cu.import("resource://exchangecalendar/soapFunctions.js");
Cu.import("resource://exchangecalendar/ecExchangeRequest.js");
Cu.import("resource://exchangecalendar/erFindFolder.js");
Cu.import("resource://exchangecalendar/erGetFolder.js");
Cu.import("resource://exchangecalendar/erFindCalendarItems.js");
Cu.import("resource://exchangecalendar/erFindTaskItems.js");
Cu.import("resource://exchangecalendar/erFindFollowupItems.js"); 
Cu.import("resource://exchangecalendar/erGetItems.js");
Cu.import("resource://exchangecalendar/erGetMasterOccurrenceId.js");
Cu.import("resource://exchangecalendar/erGetMeetingRequestByUID.js");
Cu.import("resource://exchangecalendar/erGetOccurrenceIndex.js");
Cu.import("resource://exchangecalendar/erDeleteItem.js");
Cu.import("resource://exchangecalendar/erFindMasterOccurrences.js");
Cu.import("resource://exchangecalendar/erSyncFolderItems.js");
Cu.import("resource://exchangecalendar/erFindOccurrences.js");
Cu.import("resource://exchangecalendar/erUpdateItem.js");
Cu.import("resource://exchangecalendar/erGetUserAvailability.js");
Cu.import("resource://exchangecalendar/erCreateItem.js");
Cu.import("resource://exchangecalendar/erSendMeetingRespons.js");
Cu.import("resource://exchangecalendar/erSyncInbox.js");
Cu.import("resource://exchangecalendar/erCreateAttachment.js");
Cu.import("resource://exchangecalendar/erDeleteAttachment.js");

Cu.import("resource://interfaces/xml2json/xml2json.js");

//Cu.import("resource://interfaces/xml.js");

Cu.import("resource://interfaces/exchangeTodo/mivExchangeTodo.js");
Cu.import("resource://interfaces/exchangeEvent/mivExchangeEvent.js");
//Cu.import("resource://interfaces/exchangeBaseItem/mivExchangeBaseItem.js");

var globalStart = new Date().getTime();

const nsIAP =  Ci.nsIActivityProcess;  
const nsIAE =  Ci.nsIActivityEvent;  
const nsIAM = Ci.nsIActivityManager;

var gActivityManager;

if( Cc["@mozilla.org/activity-manager;1"]){
    gActivityManager = Cc["@mozilla.org/activity-manager;1"].getService(nsIAM);   
    Cc["@1st-setup.nl/global/functions;1"].getService(Ci.mivFunctions).LOG("-- ActivityManager available. Enabling it."); 
}
else {
	Cc["@1st-setup.nl/global/functions;1"].getService(Ci.mivFunctions).LOG("-- ActivityManager not available.");
}


const fieldPathMap = {
	'ActualWork'			: 'task',
	'AdjacentMeetingCount'		: 'calendar',
	'AdjacentMeetings'		: 'calendar',
	'AllowNewTimeProposal'		: 'calendar',
	'AppointmentReplyTime'		: 'calendar',
	'AppointmentSequenceNumber'	: 'calendar',
	'AppointmentState'		: 'calendar',
	'AssignedTime'			: 'task',
	'AssociatedCalendarItemId'	: 'meeting',
	'Attachments'			: 'item',
	'BillingInformation'		: 'task',
	'Body'				: 'item',
	'CalendarItemType'		: 'calendar',
	'Categories'			: 'item',
	'ChangeCount'			: 'task',
	'Companies'			: 'task',
	'CompleteDate'			: 'task',
	'ConferenceType'		: 'calendar',
	'ConflictingMeetingCount'	: 'calendar',
	'ConflictingMeetings'		: 'calendar',
	'Contacts'			: 'task',
	'ConversationId'		: 'item',
	'Culture'			: 'item',
	'DateTimeCreated'		: 'item',
	'DateTimeReceived'		: 'item',
	'DateTimeSent'			: 'item',
	'DateTimeStamp'			: 'calendar',
	'DelegationState'		: 'task',
	'Delegator'			: 'task',
	'DeletedOccurrences'		: 'calendar',
	'DisplayCc'			: 'item',
	'DisplayTo'			: 'item',
	'DueDate'			: 'task',
	'Duration'			: 'calendar',
	'EffectiveRights'		: 'item',
	'End'				: 'calendar',
	'EndTimeZone'			: 'calendar',
	'FirstOccurrence'		: 'calendar',
	'FolderClass'			: 'folder',
	'FolderId'			: 'folder',
	'HasAttachments'		: 'item',
	'HasBeenProcessed'		: 'meeting',
	'Importance'			: 'item',
	'InReplyTo'			: 'item',
	'IntendedFreeBusyStatus'	: 'meetingRequest',
	'InternetMessageHeaders'	: 'item',
	'IsAllDayEvent'			: 'calendar',
	'IsAssignmentEditable'		: 'task',
	'IsAssociated'			: 'item',
	'IsCancelled'			: 'calendar',
	'IsComplete'			: 'task',
	'IsDelegated'			: 'meeting',
	'IsDraft'			: 'item',
	'IsFromMe'			: 'item',
	'IsMeeting'			: 'calendar',
	'IsOnlineMeeting'		: 'calendar',
	'IsOutOfDate'			: 'meeting',
	'IsRecurring'			: 'calendar',
	'IsResend'			: 'item',
	'IsResponseRequested'		: 'calendar',
	'IsSubmitted'			: 'item',
	'IsTeamTask'			: 'task',
	'IsUnmodified'			: 'item',
	'ItemClass'			: 'item',
	'messageId'			: 'item', 
	'ItemId'			: 'item',
	'LastModifiedName'		: 'item',
	'LastModifiedTime'		: 'item',
	'LastOccurrence'		: 'calendar',
	'LegacyFreeBusyStatus'		: 'calendar',
	'Location'			: 'calendar',
	'MeetingRequestType'		: 'meetingRequest',
	'MeetingRequestWasSent'		: 'calendar',
	'MeetingTimeZone'		: 'calendar',
	'MeetingWorkspaceUrl'		: 'calendar',
	'Mileage'			: 'task',
	'MimeContent'			: 'item',
	'ModifiedOccurrences'		: 'calendar',
	'MyResponseType'		: 'calendar',
	'NetShowUrl'			: 'calendar',
	'OptionalAttendees'		: 'calendar',
	'Organizer'			: 'calendar',
	'OriginalStart'			: 'calendar',
	'Owner'				: 'task',
	'ParentFolderId'		: 'item',
	'PercentComplete'		: 'task',
	'Recurrence'			: 'calendar',
	'RecurrenceId'			: 'calendar',
	'ReminderDueBy'			: 'item',
	'ReminderIsSet'			: 'item',
	'ReminderMinutesBeforeStart'	: 'item',
	'RequiredAttendees'		: 'calendar',
	'Resources'			: 'calendar',
	'ResponseObjects'		: 'item',
	'ResponseType'			: 'meeting',
	'SearchParameters'		: 'folder',
	'Sensitivity'			: 'item',
	'Size'				: 'item',
	'Start'				: 'calendar',
	'StartDate'			: 'task',
	'StartTimeZone'			: 'calendar',
	'StatusDescription'		: 'task',
	'Status'			: 'task',
	'Subject'			: 'item',
	'TimeZone'			: 'calendar',
	'TotalWork'			: 'task',
	'UID'				: 'calendar',
	'UniqueBody'			: 'item',
	'WebClientEditFormQueryString'	: 'item',
	'WebClientReadFormQueryString'	: 'item',
	'When'				: 'calendar'
};

const dayRevMap = {
	'MO' : 'Monday',
	'TU' : 'Tuesday',
	'WE' : 'Wednesday',
	'TH' : 'Thursday',
	'FR' : 'Friday',
	'SA' : 'Saturday',
	'SU' : 'Sunday'
};

const dayIdxMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const weekRevMap = {
	'1' : 'First',
	'2' : 'Second',
	'3' : 'Third',
	'4' : 'Fourth',
	'-1': 'Last'
};

const monthIdxMap = ['January', 'February', 'March', 'April', 'May', 'June',
		     'July', 'August', 'September', 'October', 'November', 'December'];

const participationMap = {
	"Unknown"	: "NEEDS-ACTION",
	"NoResponseReceived" : "NEEDS-ACTION",
	"Tentative"	: "TENTATIVE",
	"Accept"	: "ACCEPTED",
	"Decline"	: "DECLINED",
	"Organizer"	: "ACCEPTED"
};

const dayMap = {
	'Monday'	: 'MO',
	'Tuesday'	: 'TU',
	'Wednesday'	: 'WE',
	'Thursday'	: 'TH',
	'Friday'	: 'FR',
	'Saturday'	: 'SA',
	'Sunday'	: 'SU',
	'Weekday'	: ['MO', 'TU', 'WE', 'TH', 'FR'],
	'WeekendDay'	: ['SA', 'SO'],
	'Day'		: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SO']
};

const weekMap = {
	'First'		: 1,
	'Second'	: 2,
	'Third'		: 3,
	'Fourth'	: 4,
	'Last'		: -1
};

const monthMap = {
	'January'	: 1,
	'February'	: 2,
	'March'		: 3,
	'April'		: 4,
	'May'		: 5,
	'June'		: 6,
	'July'		: 7,
	'August'	: 8,
	'September'	: 9,
	'October'	: 10,
	'November'	: 11,
	'December'	: 12
};

const MAPI_PidLidTaskAccepted = "33032";
const MAPI_PidLidTaskLastUpdate = "33045";
const MAPI_PidLidTaskHistory = "33050";
const MAPI_PidLidTaskOwnership = "33065";
const MAPI_PidLidTaskMode = "34072";
const MAPI_PidLidTaskGlobalId = "34073";
const MAPI_PidLidTaskAcceptanceState = "33066";
const MAPI_PidLidReminderSignalTime = "34144";
const MAPI_PidLidReminderSet = "34051";

//
// calExchangeCalendar
//

//var EXPORTED_SYMBOLS = ["calExchangeCalendar"];

function calExchangeCalendar() {

try{
	this.myId = null;

	this.initProviderBase();

	this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
				.getService(Ci.mivFunctions);

	this.timeZones = Cc["@1st-setup.nl/exchange/timezones;1"]
				.getService(Ci.mivExchangeTimeZones);

	this.setDoDebug();

	this.noDB = true;
	this.dbInit = false;

	this.folderPathStatus = 1;
	this.firstrun = true;
	this.mUri = "";
	this.mid = null;

//	this.initialized = false;

//	this.prefs = null;
	this.mUseOfflineCache = null;
	this.mNotConnected = true;

	this.myAvailable = false;

	this.mPrefs = null;

	this.itemCacheById = {};
	this.itemCancelQueue = {};

	this.itemCacheByStartDate = {};
	this.itemCacheByEndDate = {};
	this.recurringMasterCache = {};
	this.recurringMasterCacheById ={};
	this.newMasters = {};
	this.parentLessItems = {};

	this.startDate = null;
	this.endDate = null;

	this.syncState = null;
	this.syncStateInbox=null;
	this.syncInboxState = null;
	this._weAreSyncing = false;
	this.firstSyncDone = false;

	this.meetingRequestsCache = [];
	this.meetingCancelationsCache = [];
	this.meetingrequestAnswered = [];
	this.meetingResponsesCache = [];

	this.getItemSyncQueue = [];
	this.getItemsSyncQueue = [];
	this.processItemSyncQueueBusy = false;

	this.offlineTimer = null;
	this.offlineQueue = [];

	this.doReset = false;

	this.shutdown = false;

	this.inboxPoller = Cc["@mozilla.org/timer;1"]
			.createInstance(Ci.nsITimer);

	this.cacheLoader = Cc["@mozilla.org/timer;1"]
			.createInstance(Ci.nsITimer);
	this.loadingFromCache = false;

	this.observerService = Cc["@mozilla.org/observer-service;1"]  
	                          .getService(Ci.nsIObserverService);  

	this.lightningNotifier = Cc["@1st-setup.nl/exchange/lightningnotifier;1"]  
	                          .getService(Ci.mivExchangeLightningNotifier); 

	this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]  
	                          .getService(Ci.mivExchangeLoadBalancer); 

	this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
			.getService(Ci.mivExchangeStatistics);

	this.calendarPoller = null;

        this.mObserver = new ecObserver(this);

	this.supportsTasks = false;
	this.supportsEvents = false;

	this.folderProperties = null;
	this._readOnly = true;
	this.folderIsNotAvailable = true;

	this.exporting = false;
	this.OnlyShowAvailability = false;

	this.updateCalendarItems = [];
	this.updateCalendarTimer = Cc["@mozilla.org/timer;1"]
			.createInstance(Ci.nsITimer); 
	this.updateCalendarTimerRunning = false;

	this._canDelete = false;
	this._canModify = false;
	this._canCreateContent = false;

	this.mIsOffline = Components.classes["@mozilla.org/network/io-service;1"]
                             .getService(Components.interfaces.nsIIOService).offline;
	
	this._exchangeCurrentStatus = Cr.NS_OK; //Cr.NS_ERROR_FAILURE; //Cr.NS_OK;

	this._connectionStateDescription = "";
	//this.globalFunctions.LOG("Our offline status is:"+this.mIsOffline+".");

	this.itemCount = 0;
	this.itemUpdates = 0;
	this.itemsFromExchange = 0;
	this.masterCount = 0;
}catch(err){dump("mivExchangeCalendar.new Err:"+err+"\n");}
}

var calExchangeCalendarGUID = "720a458e-b6cd-4883-8a4d-5be27ec454d8";

calExchangeCalendar.prototype = {

	get timeStamp()
	{
		var elapsed = new Date().getTime() - globalStart;
		//dump("elapsed:"+elapsed);
		return elapsed;
	},

	__proto__: cal.ProviderBase.prototype,

// Begin nsIClassInfo
	classID: components.ID("{"+calExchangeCalendarGUID+"}"),
	contractID: "@mozilla.org/calendar/calendar;1?type=exchangecalendar",
	classDescription: "Exchange 2007/2010 Calendar and Tasks Provider",

	// void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
	getInterfaces: function _getInterfaces(count) 
	{
		var ifaces = [Ci.mivExchangeCalendar,
			Ci.calICalendarACLManager,
			Ci.calICalendar,
			Ci.calICalendarProvider,
			Ci.calIFreeBusyService,
			Ci.calIItipTransport,
			Ci.calISchedulingSupport,
			Ci.calICalendarProvider,
			Ci.nsIClassInfo,
			Ci.nsISupports];
		count.value = ifaces.length;
		return ifaces;
	},

	// nsISupports getHelperForLanguage(in PRUint32 language);
	getHelperForLanguage: function _getHelperForLanguage(language) {
		return null;
	},

	implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,
	flags: 0,
// End nsIClassInfo

// Begin nsISupports
	// void QueryInterface(in nsIIDRef uuid, [iid_is(uuid),retval] out nsQIResult result);
	QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeCalendar,
		Ci.calICalendarACLManager,
		Ci.calICalendar,
		Ci.calICalendarProvider,
		Ci.calIFreeBusyService,
		Ci.calIItipTransport,
		Ci.calISchedulingSupport,
		Ci.calICalendarProvider,
		Ci.nsIClassInfo,
		Ci.nsISupports]),
// End nsISupports

// Begin calICalendarProvider
	// readonly attribute nsIURI prefChromeOverlay;
	get prefChromeOverlay() {
		if (this.debug) this.logInfo("get prefChromeOverlay()");
		return null;
	},

	get displayName() {
		if (this.debug) this.logInfo("get displayName()");
		return calGetString("calExchangeCalendar", "displayName", null, "exchangecalendar");
	},

	//  void createCalendar(in AUTF8String aName, in nsIURI aURL,
        //	            in calIProviderListener aListener);
	createCalendar: function calWcapCalendar_createCalendar(name, url, listener) {
		if (this.debug) this.logInfo("createCalendar");
		throw NS_ERROR_NOT_IMPLEMENTED;
	},

	//  void deleteCalendar(in calICalendar aCalendar,
        //  	            in calIProviderListener aListener);
	deleteCalendar: function calWcapCalendar_deleteCalendar(calendar, listener) {
		if (this.debug) this.logInfo("deleteCalendar");
		throw NS_ERROR_NOT_IMPLEMENTED;
	},

	//  calICalendar getCalendar(in nsIURI aURL);
	getCalendar: function calWcapCalendar_getCalendar(url) {
		if (this.debug) this.logInfo("getCalendar");
		throw NS_ERROR_NOT_IMPLEMENTED;
	},
// End calICalendarProvider

// Begin calICalendarACLManager
	/* Gets the calICalendarACLEntry of the current user for the specified
	calendar. */
	//void getCalendarEntry(in calICalendar aCalendar,
	//	          in calIOperationListener aListener);
	getCalendarEntry: function _getCalendarEntry(aCalendar, aListener)
	{
		//dump("getCalendarEntry: aCalendar.name:"+aCalendar.name+", aLsitener:"+aListener+"\n");
	},

	/* Gets the calIItemACLEntry of the current user for the specified
	calendar item. Depending on the implementation, each item can have
	different permissions based on specific attributes.
	(TODO: should be made asynchronous one day) */
	//calIItemACLEntry getItemEntry(in calIItemBase aItem);
	getItemEntry: function _getItemEntry(aItem)
	{
		//dump("getItemEntry: aCalendar.name:"+this.name+", aItem:"+aItem.title+"\n");
		if (this.itemCacheById[aItem.id]) {
			return this.itemCacheById[aItem.id].aclEntry;
		}
	},

// End calICalendarACLManager

// Begin calICalendar

	//  attribute AUTF8String id;

	//   attribute AUTF8String name;

	//  readonly attribute AUTF8String type;
	get type()
	{
//		if (this.debug) this.logInfo("get type()");
		return "exchangecalendar";
	},

	//  readonly attribute AString providerID;
	get providerID()
	{
		return "exchangecalendar@extensions.1st-setup.nl";
	},

	//  attribute calICalendar superCalendar;

	get id()
	{
		return this.myId;
	},

	set id(aValue)
	{
		// We ignore this.
		//dump("Someone is setting the id to '"+aValue+"' for calendar:"+this.name+"\n");
	},

	//  attribute nsIURI uri;
	get uri()
	{
	        return this.mUri;
	},

	set uri(aUri)
	{
		//if (this.debug) this.logInfo("set uri:"+aUri.path);
		this.myId = aUri.path.substr(1);
	        this.mUri = aUri;

		this.mPrefs = Cc["@mozilla.org/preferences-service;1"]
	                    .getService(Ci.nsIPrefService)
			    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl."+this.myId+".");
		if (this.exchangePrefVersion < 1) {
			this.mPrefs = null;
			this.myId = null;
		}

		if (this.name) {
			this.newCalendar = false;
			this.performStartup();
		}
		else {
			if (this.debug) this.logInfo("We are not going to perform a startup because we do not have a name yet and the calendar is probably still created.");
			this.newCalendar = true;
		}

	        return this.uri;
	},

	startupLoadFromOfflineCache: function _startupLoadFromOfflineCache()
	{
		if (this.debug) this.logInfo("startupLoadFromOfflineCache: Starting load from offline cache.");

		if (this.loadingFromCache) return;

		this.loadingFromCache = true;

		var startTime = cal.createDateTime();

		if (!this.startDate) {
			this.startDate = this.offlineStartDate;
		}
		if (!this.endDate) {
			this.endDate = this.offlineEndDate;
		}
		var itemsFromCache = this.getItemsFromOfflineCache(this.startDate, this.endDate);
		if (itemsFromCache) {
			var endTime = cal.createDateTime();
			var duration = endTime.subtractDate(startTime);
			if (this.debug) this.logInfo("We got '"+itemsFromCache.length+"' items from offline cache.(took "+duration.inSeconds+" seconds)");
		}

		this.loadingFromCache = false;

	},

	performStartup: function _performStartup()
	{
		if (this.debug) this.logInfo("Performing startup.");

		if (this.getProperty("disabled")) {
			if (this.debug) this.logInfo("This calendar is disabled so not doing the startup.");
			return;
		}

		// Load from offline Cache into memory cache.
/*		if (this.useOfflineCache) {
			if (this.debug) this.logInfo("Getting items from offlineCache.");

			let self = this;
			this.cacheLoader.cancel();
			this.cacheLoader.initWithCallback({ notify: function setTimeout_notify() {self.startupLoadFromOfflineCache();	}}, 0, this.cacheLoader.TYPE_ONE_SHOT);

		}
*/
		if (!this.isOffline) {
			// Start online processes.
			// 1. Check folder.
			// 2. Get timezone settings.
			// 3. Start pollers.
			if (this.debug) this.logInfo("Initialized:"+this.isInitialized);

/*			if (this.useOfflineCache) {
				this.syncExchangeToOfflineCache();
			}*/ // Not necessary anymore as it will follow the cache by default.
		}
		
		//Enable cache on startup :)
		this.prefs.setBoolPref("useOfflineCache",true);
	},

	set readOnly(aValue)
	{
//dump("set readOnly:"+this.name+"|"+this.globalFunctions.STACK(10)+"\n");
		this.prefs.setBoolPref("UserReadOnly", aValue);
		this.readOnlyInternal = aValue;
	},

	get readOnly()
	{
		var userPref = this.globalFunctions.safeGetBoolPref(this.prefs, "UserReadOnly", false);
		if (userPref === true) return true;
		return this.readOnlyInternal;
	},

	set readOnlyInternal(aValue)
	{
//dump("set readOnlyInternal:"+this.name+"\n");
		if (this.folderProperties) {
			var effectiveRights = this.folderProperties.XPath("/s:Envelope/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage/m:Folders/t:CalendarFolder/t:EffectiveRights");
			if (effectiveRights.length > 0) {
				if (((effectiveRights[0].getTagValue("t:Delete") == "false") || (effectiveRights[0].getTagValue("t:Modify") == "false")) &&
					(effectiveRights[0].getTagValue("t:CreateContents") == "false")) {
					aValue = true;
				}
			}
			effectiveRights = null;

		}

		var changed = false;
		if (aValue != this._readOnly) {
			if (this.debug) this.logInfo("readOnly property changed from "+this._readOnly+" to "+aValue);
			changed = true;
		}

		if (this.debug) this.logInfo("set readOnly to '"+aValue+"'");
		this._readOnly = aValue;

		if (changed) {
			var userPref = this.globalFunctions.safeGetBoolPref(this.prefs, "UserReadOnly", false);
			if ((userPref === true) && (aValue === false)) return; // Do not change icon when use wants it readonly.

			this.observers.notify("onPropertyChanged", [this.superCalendar, "readOnly", aValue, !aValue]);
			this.observerService.notifyObservers(this, "onExchangeReadOnlyChange", this.name);  
		}
	},

	//  attribute boolean readOnly;
	get readOnlyInternal() {
		//dump("get readOnly: name:"+this.name+", this._readOnly:"+this._readOnly+", this.notConnected:"+this.notConnected+"\n");
		return ((this._readOnly) || (this.notConnected));
	},

	set notConnected(aValue)
	{
		if (aValue != this.mNotConnected) {
			this.mNotConnected = aValue;
			if (aValue) {
				this.observers.notify("onPropertyChanged", [this.superCalendar, "readOnly", true, false]);
				this.observerService.notifyObservers(this, "onExchangeReadOnlyChange", this.name);  
			}
			else {
				this.observers.notify("onPropertyChanged", [this.superCalendar, "readOnly", false, true]);
				this.observerService.notifyObservers(this, "onExchangeReadOnlyChange", this.name);  
			}
		}

	},

	get notConnected()
	{
		return this.mNotConnected;
	},

	//  readonly attribute boolean canRefresh;
	get canRefresh() {
		return true;
	},

	//  attribute boolean transientProperties;

	//  nsIVariant getProperty(in AUTF8String aName);
	getProperty: function _getProperty(aName) 
	{
	//	if (!this.isInitialized) {
	//		return;
	//	}

		//dump("2 getProperty("+aName+")\n");
		switch (aName) {
		case "exchWebService.offlineCacheDBHandle":
			return this.offlineCacheDB;

		case "exchWebService.offlineOrNotConnected":
			return ((this.notConnected) || (this.isOffline));

		case "exchWebService.useOfflineCache":
			return this.useOfflineCache;
		case "exchWebService.getFolderProperties":
			this.globalFunctions.LOG("Requesting exchWebService.getFolderProperties property.");
			if (this.folderProperties) {
				return this.folderProperties.toString();
			}
			return null;
			break;
		case "exchWebService.checkFolderPath":
			this.globalFunctions.LOG("Requesting exchWebService.checkFolderPath property.");
			this.checkFolderPath();
			return "ok";
			break;
		case "capabilities.tasks.supported" :
			return this.supportsTasks;
			break;
		case "capabilities.events.supported" :
			return this.supportsEvents;
			break;
		case "auto-enabled":
			return true;
		case "organizerId":
			//if (this.debug) this.logInfo("getProperty: organizerId");
			//return "exchangecalendar:" + this.mailbox;
			return "mailto:" + this.mailbox;
	                break;
		case "organizerCN":
			return this.userDisplayName;
	                break;
		case "cache.supported":
			return false;
		case "requiresNetwork":
                	return false;
		case "disabled":
			if (this.prefs) {
				this._disabled = this.globalFunctions.safeGetBoolPref(this.prefs, "disabled", false);
				if (this._disabled) return this._disabled;
			}

			return ((!this.isInitialized) && (this.folderPathStatus == 0));
		case "itip.notify-replies":
			return true;
		case "itip.transport":
			if (this.debug) this.logInfo("getProperty: itip.transport");
			return this.QueryInterface(Ci.calIItipTransport);
			break;
			//return true;
            	case "capabilities.autoschedule.supported":
			if (this.debug) this.logInfo("capabilities.autoschedule.supported");
                	return true;
		case "exchangeCurrentStatus":
			return this._exchangeCurrentStatus;
	        }
		// itip.disableRevisionChecks

		// capabilities.events.supported
		// capabilities.tasks.supported

		//dump("1 getProperty("+aName+")="+this.__proto__.__proto__.getProperty.apply(this, arguments)+"\n");
	        return this.__proto__.__proto__.getProperty.apply(this, arguments);
	},

	//  void setProperty(in AUTF8String aName, in nsIVariant aValue);
	setProperty: function setProperty(aName, aValue)
	{

		 if (this.debug) this.logInfo("setProperty. aName:"+aName+", aValue:"+aValue);
		switch (aName) {
		case "exchangeCurrentStatus":
			//dump("name1:"+this.name+", exchangeCurrentStatus:"+this._exchangeCurrentStatus+", newStatus:"+aValue+"\n");
			var oldStatus = this._exchangeCurrentStatus;
			this._exchangeCurrentStatus = aValue;
			if (aValue != oldStatus) {
				//dump("name2:"+this.name+", exchangeCurrentStatus:"+aValue+"\n");
				this.observers.notify("onPropertyChanged", [this.superCalendar, "exchangeCurrentStatus", aValue, oldStatus]);
			}
			return;
		case "disabled" :
			var oldDisabledState = this._disabled;
			this._disabled = aValue;
			this.prefs.setBoolPref("disabled", aValue);
			if ((aValue) && (oldDisabledState != this._disabled)) {
//dump("Calendar is set to disabled\n");
				this.resetCalendar();
			}
			if ((!this._disabled) && (oldDisabledState != this._disabled)) {
				this.doReset = true;
				this.resetCalendar();
			}
			return;
		case "exchWebService.useOfflineCache":

			this.useOfflineCache = aValue;
		    if (this.debug) this.logInfo("setProperty: useOfflineCache = " + this.useOfflineCache + "  offlineCacheDB  "  + this.offlineCacheDB);  

		    if (!aValue) {
				if (this.offlineCacheDB) {
					try {
						 if (this.offlineCacheDB) this.offlineCacheDB.close();
                                                 this.offlineCacheDB = null;
                                         } catch(exc) {}
                                }
 
                                // Remove the offline cache database when we delete the calendar.
                            if (this.dbFile) {
                                    this.dbFile.remove(true);
                                     this.offlineCacheDB = null;
                            }
                    } 
			return;
		}

		this.__proto__.__proto__.setProperty.apply(this, arguments);

	},

	//  void deleteProperty(in AUTF8String aName);

	//  void addObserver( in calIObserver observer );
	//  void removeObserver( in calIObserver observer );

	//  calIOperation addItem(in calIItemBase aItem,
        //                in calIOperationListener aListener);
	addItem: function _addItem(aItem, aListener)
	{
		if (this.debug) this.logInfo("addItem id="+aItem.id+", aItem.calendar:"+aItem.calendar);

		var itemEnum = aItem.propertyEnumerator;
/*		dump("Properties of:"+aItem.title+"\n");
		while (itemEnum.hasMoreElements()) {
			var property = itemEnum.getNext().QueryInterface(Components.interfaces.nsIProperty);
			dump(property.name+":"+property.value+"\n");
		}*/
		var invite = aItem.getAttendees({});
		//dump("a. Attendee count:"+invite.length+"\n");

		// if aItem.id == null then it is a newly created item in Lightning.
		// if aItem.id == "040000008200E00074C5B7101A82E008000000005D721F845633CD0100000000000000001000000006CC9AC20EA39441B863D6E454306174" it is from iTIP
		// if aItem.id == "31d9835f-1c29-4d18-ab39-7587c56e3982" paste in lightning after a copy in lightning.
		// if aItem.id == "AAMkAGFkNzVhOGVlLTYxMDktNGU0MC05YWZjLWIzMWY1YmNmOTAzNQBGAAAAAAD9bSPYK6piTIbhfZ5n6SOXBwAfSIGbKdCWQbNg+oqR8EJMAAAA9OKyAAAfSIGbKdCWQbNg+oqR8EJMAAB8S1QtAAA=" copy back and forth between exchange to other type and exchange.

	        if (this.OnlyShowAvailability) {
			this.readOnlyInternal = true;
			this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.ADD,
                        	             aItem.id,
                        	             aItem);

/*	            this.notifyOperationComplete(aListener,
	                                         Ci.calIErrors.CAL_IS_READONLY,
	                                         Ci.calIOperationListener.ADD,
	                                         null,
	                                         "Calendar is readonly");*/
			return null;
	        }

	        var newItem = aItem;

		// Make sure we have one of our own object types
		if ((cal.isEvent(aItem)) && (!aItem.className)) {
			var newItem = Cc["@1st-setup.nl/exchange/calendarevent;1"]
					.createInstance(Ci.mivExchangeEvent);
			newItem.cloneToCalEvent(aItem);
		}

		if ((!cal.isEvent(aItem)) && (!aItem.className)) {
			var newItem = Cc["@1st-setup.nl/exchange/calendartodo;1"]
					.createInstance(Ci.mivExchangeTodo);
			newItem.cloneToCalEvent(aItem);
		}

		if (aItem.calendar === null) {
			if (this.debug) this.logInfo("addItem Calendar is null for item going add me '"+this.name+"' as calendar.\n");
			newItem.calendar = this.superCalendar;
		}

		var invite = newItem.getAttendees({});
		//dump("b. Attendee count:"+invite.length+"\n");
	        //let newItem = aItem.clone();
	
		// We check if we not allready have this item in Cache. If so we modify.
		// This will happen when someone pressed the accept,decline or tentative buttons
		// in the itip status bar on the header of an email message.
		if (this.itemCacheById[newItem.id]) {
			if (newItem.calendar === null) {
				// This is an import from an export and item still exists
				newItem.calendar = this;
			}
			if (this.itemCacheById[newItem.id].isInvitation) {
				return this.modifyItem(newItem, this.itemCacheById[newItem.id], aListener); // We do this when we receive an update for an invitation.
			}
			else {
				this.deleteItem(this.itemCacheById[newItem.id], null);  // we do this on import of item which was exported earlier.
			}
		}

		if ((newItem.id) && ((newItem.id.indexOf("-") > 2) || (newItem.id.length == 152))) {
			// This is added from a copy/paste procedure.
			newItem.id = null;
			newItem.clearId(null);
			if (this.debug) this.logInfo("addItem Copy/pasted item. item.id:"+newItem.id);
			//newItem.deleteProperty("X-UID");

			// If I am invited. Remove myself.
			var attendees = newItem.getAttendees({});
			newItem.removeAllAttendees(); // Need to have this. When we add attendees when we create a new calendaritem we become organizer.
			for each (var attendee in attendees) {
				if ((attendee.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()) ||
					(attendee.id.replace(/^exchangecalendar:/, '').toLowerCase() == this.mailbox.toLowerCase()) ) {
					if (this.debug) this.logInfo("addItem: FOUND myself as an attendee and we are going to remove myself:"+newItem.title);
					newItem.removeAttendee(attendee);
				}
			}
		}

		var invite = newItem.getAttendees({});
		//dump("c. Attendee count:"+invite.length+"\n");
	        return this.adoptItem(newItem, aListener);
	},


	//  calIOperation adoptItem(in calIItemBase aItem,
        //                  in calIOperationListener aListener);
	adoptItem: function _adoptItem(aItem, aListener)
	{
		if (this.debug) this.logInfo("adoptItem()");

		if ((this.readOnly) || (this.OnlyShowAvailability)) {
			this.readOnlyInternal = true;
			if (this.OnlyShowAvailability) {
				this.notifyOperationComplete(aListener,
			                             Ci.calIErrors.OPERATION_CANCELLED,
		                	             Ci.calIOperationListener.ADD,
		                	             aItem.id,
		                	             aItem);
			}
			else {
				this.notifyOperationComplete(aListener,
		                                 Ci.calIErrors.CAL_IS_READONLY,
		                                 Ci.calIOperationListener.ADD,
		                                 null,
		                                 "Calendar is readonly");
			}
			return;
		}

		if (isEvent(aItem)) {	
			// michel123

			if (aItem.exchangeXML) {
				var tmpItem = aItem.clone();
				if (this.debug) this.logInfo("adoptItem 1 Copy/pasted item. item.id:"+tmpItem.id);
			}
			else {
				if (!aItem.className) {
					var tmpItem = Cc["@1st-setup.nl/exchange/calendarevent;1"]
							.createInstance(Ci.mivExchangeEvent);
					tmpItem.addMailboxAlias(this.mailbox);
					tmpItem.cloneToCalEvent(aItem);
				}
				else {
					var tmpItem = aItem.clone();
					tmpItem.addMailboxAlias(this.mailbox);
				}
				if (this.debug) this.logInfo("adoptItem 2 Copy/pasted item. item.id:"+tmpItem.id);
			}

		var invite = tmpItem.getAttendees({});
		//dump("d. Attendee count:"+invite.length+"\n");

//			if ((tmpItem.id) && (tmpItem.id != "not a valid id")) {
			if ((tmpItem.hasProperty("UID")) && (!aItem.id)) {
				// This is and item create through an iTIP response.

				var cachedItem = null;
				for (var index in this.meetingRequestsCache) {
					if (this.meetingRequestsCache[index]) {
//						if (this.meetingRequestsCache[index].uid == tmpItem.id) {
						if (this.meetingRequestsCache[index].uid == tmpItem.getProperty("UID")) {
							cachedItem = this.meetingRequestsCache[index];
							break;
						}
					}
				}

				if (cachedItem) {
					// We have meeting request in our cache.
					// Send meetingrespons base on status and remove message in inbox.
					if (this.debug) this.logInfo("BOA: iTIP action item with STATUS:"+tmpItem.getProperty("STATUS"));

					var aNewItem = this.cloneItem(tmpItem);
					//aNewItem.setProperty("X-UID", cachedItem.uid);
					//aNewItem.setProperty("X-ChangeKey", cachedItem.changeKey);
					aNewItem.setProperty("X-MEETINGREQUEST", cachedItem.getProperty("X-MEETINGREQUEST"));
					//aNewItem.setProperty("X-IsInvitation" , cachedItem.isInvitation);
					aNewItem.id = cachedItem.id;


					if ((aNewItem) && (this.sendMeetingRespons(aNewItem, null, "new"))) {
						this.notifyOperationComplete(aListener,
			        	                             Cr.NS_OK,
			                        	             Ci.calIOperationListener.ADD,
			                        	             tmpItem.getProperty("UID"),
			                        	             aNewItem);
					}
					else {
						// User cancel.. How to respond!!
						this.notifyOperationComplete(aListener,
			        	                             Ci.calIErrors.OPERATION_CANCELLED,
			                        	             Ci.calIOperationListener.ADD,
			                        	             tmpItem.getProperty("UID"),
			                        	             aNewItem);
					}
					return;
				}
				else {
					if (this.debug) this.logInfo("getMeetingRequestFromServer:"+tmpItem.title);
//					this.getMeetingRequestFromServer(tmpItem, tmpItem.id, Ci.calIOperationListener.ADD, aListener);
					this.getMeetingRequestFromServer(tmpItem, tmpItem.getProperty("UID"), Ci.calIOperationListener.ADD, aListener);
					return;

				}
			}
			var ewsItem = this.convertCalAppointmentToExchangeAppointment(tmpItem, "create", true);
		}
		if (isToDo(aItem)) {
			var ewsItem = this.convertCalTaskToExchangeTask(aItem, "create");
		}

		if (ewsItem) {

			// Create attachment create and delete object
			var attachmentsUpdates = null;

			var attachments = aItem.getAttachments({});
			if (attachments.length > 0) {
				if (this.debug) this.logInfo("  -- We have attachments:"+attachments.length);
				var attachmentsUpdates = { create: [], delete:[] };
				for (var index in attachments) {
					attachmentsUpdates.create.push(attachments[index]);
				}
			}

			var self = this;
			this.addToQueue( erCreateItemRequest,
				{user: this.user, 
				 mailbox: this.mailbox,
				 folderBase: this.folderBase,
				 serverUrl: this.serverUrl,
				 item: aItem,
				 folderID: this.folderID,
				 changeKey: this.changeKey,
				 createReq: ewsItem,
				 newItem: aItem,
				 attachmentsUpdates: attachmentsUpdates,
				 actionStart: Date.now(),
				 sendto: "sendtoall"}, 
				function(erCreateItemRequest, aId, aChangeKey) { self.createItemOk(erCreateItemRequest, aId, aChangeKey);}, 
				function(erCreateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erCreateItemRequest, aCode, aMsg);},
				aListener);
		}
		else {
			// notify the listener
			this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.MODIFICATION_FAILED,
                        	             Ci.calIOperationListener.ADD,
                        	             aItem.id,
                        	             aItem);
		}

	},

	getMeetingRequestByUIDOk: function _getMeetingRequestByUIDOk(erGetMeetingRequestByUIDRequest, aMeetingRequests)
	{
		this.notConnected = false;
		this.saveCredentials(erGetMeetingRequestByUIDRequest.argument);
		if (this.debug) this.logInfo("getMeetingRequestByUIDOk: itemcount="+aMeetingRequests.length);

		if (erGetMeetingRequestByUIDRequest.argument.item.organizer) {
			if (this.debug) this.logInfo(" >>>>>>> 1 We have a organizer and SCHEDULE-AGENT="+erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT"));
		}
		else {
			if (this.debug) this.logInfo("item has no oranizer!!!!!!!!!!!!");
		}

		if (aMeetingRequests.length > 0) {
			// Convert list to CalAppointment and try to find the matching one
			var tmpList = [];
			for (var i=0; i<aMeetingRequests.length; i++) {
				var tmpItem = this.convertExchangeAppointmentToCalAppointment(aMeetingRequests[i], true);
				if (tmpItem) {
					tmpList.push(tmpItem);
				}
			}
			var ewsItem = this.findItemInListByDatesAndID(tmpList, erGetMeetingRequestByUIDRequest.argument.item);

			//var ewsItem = this.convertExchangeAppointmentToCalAppointment(aMeetingRequests[aMeetingRequests.length-1], true);
					
			if (this.debug) this.logInfo("getMeetingRequestByUIDOk: iTIP action item with STATUS:"+erGetMeetingRequestByUIDRequest.argument.item.getProperty("STATUS"));

			var me = this.getInvitedAttendee(erGetMeetingRequestByUIDRequest.argument.item);
			if (me) {
				if (this.debug) this.logInfo("getMeetingRequestByUIDOk: me.participationStatus:"+me.participationStatus);
				var tmpMe = this.getInvitedAttendee(ewsItem);
				if (tmpMe) {
					if (this.debug) this.logInfo("getMeetingRequestByUIDOk: tmpMe.participationStatus:"+tmpMe.participationStatus);
					tmpMe.participationStatus = me.participationStatus;

					switch (tmpMe.participationStatus) {
					case "ACCEPTED": 
						ewsItem.setProperty("STATUS", "CONFIRMED");
						break;
					case null:
					case "TENTATIVE": 
						ewsItem.setProperty("STATUS", "TENTATIVE");
						break;
					case "DECLINED": 
						ewsItem.setProperty("STATUS", "CANCELLED");
						break;
					}
				}
			}
			if (!me) {
				// I'm not directly invited. Just through distributionlist or mailgroup.
				if (this.debug) this.logInfo("getMeetingRequestByUIDOk: I'm not directly invited so we are going to create a dummy attendee for now.");
				me = cal.createAttendee();
				me.id = "mailto:"+this.mailbox;
				me.commonName = this.userDisplayName;
				me.rsvp = "FALSE";
				me.userType = "INDIVIDUAL";
				me.role = "NON-PARTICIPANT";
				switch (erGetMeetingRequestByUIDRequest.argument.item.getProperty("STATUS")) {
					case "CONFIRMED":
						me.participationStatus = "ACCEPTED";
						break;
					case "TENTATIVE":
						me.participationStatus = "TENTATIVE";
						break;
					case "CANCELLED":
						me.participationStatus = "DECLINED";
						break;
				}
				
			}

			if (this.debug) this.logInfo("getMeetingRequestByUIDOk: iTIP action item with ewsItem.STATUS:"+ewsItem.getProperty("STATUS"));

			ewsItem.setProperty("X-MEETINGREQUEST", true);
			if ((ewsItem) && (this.sendMeetingRespons(ewsItem, null, "new", me.participationStatus))) {
				if (erGetMeetingRequestByUIDRequest.listener) {
					this.notifyOperationComplete( erGetMeetingRequestByUIDRequest.listener,
		        	                             Cr.NS_OK,
		                        	             erGetMeetingRequestByUIDRequest.argument.operation,
		                        	             erGetMeetingRequestByUIDRequest.argument.item.id,
		                        	             ewsItem);
				}
				return;
			}
			// User cancel or other problem.
		}
		else {
			// inbox item has been removed between pressing iTIP button and requesting the info from the server.
			// Or it is an ICS import or a invitation from another mailbox... BUG 59
			if (this.debug) this.logInfo("Meeting request was removed from inbox after iTIP button was pressed and before Exchange server could be checked.");
			if (this.debug) this.logInfo("Someone else working in the same inbox?");
			if (this.debug) this.logInfo("OR We see this when someone imports an ICS file or imports a meeting request into another calendar.");
			// If it is an ICS we would like it to be added to the calendar as new item
			// If is a meeting request then we want it accepted and not added. This must produce an error
			// Problem is we cannot identify it as a ICS import or a acceptation of a meeting request.
			var doStop = false;

			if (erGetMeetingRequestByUIDRequest.argument.item.organizer) {
				if (this.debug) this.logInfo(" >>>>>>> 2 We have a organizer and SCHEDULE-AGENT="+erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT"));
				if (erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT") == "CLIENT") {
					// looks like iTIP because SCHEDULE-AGENT is set. 
					if (this.debug) this.logInfo(" >>>>>>> 2 We have a organizer and SCHEDULE-AGENT="+erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT"));
					if (this.debug) this.logInfo(" !!!!!!!!!!!!!! THIS SHOULD NEVER HAPPEN ON AN iTIP. DO WE HAVE AN iTIP");
					if (this.debug) this.logInfo("iCalString:"+erGetMeetingRequestByUIDRequest.argument.item.icalString);
					//if (this.debug) this.logInfo(" Stopping processing.. Report this problem to exchangecalendar@extensions.1st-setup.nl");
					//doStop = true;  // For now we going to clean out the UID and me as an attendee
					// We fake that we do a paste and that it is an invitation.
					
					if (this.debug) this.logInfo(" !!!>>  We are going to treat this as a copy/paste for a new event.");
					var tmpItem = erGetMeetingRequestByUIDRequest.argument.item.clone();
					tmpItem.clearId("xxxx-xxxx-xxx-xxxx");
					//tmpItem.setProperty("X-IsInvitation", "true");
					tmpItem.setProperty("X-exchangeITIP1", "true");
					tmpItem.setProperty("X-IsMeeting", true);
					this.addItem(tmpItem, erGetMeetingRequestByUIDRequest.listener);
					return;
					
				}

				if (erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT")) {
					if (this.debug) this.logInfo("Unknown SCHEDULE-AGENT property for item. SCHEDULE-AGENT:"+erGetMeetingRequestByUIDRequest.argument.item.organizer.getProperty("SCHEDULE-AGENT"));
					if (this.debug) this.logInfo("Please mail the previous line to exchangecalendar@extensions.1st-setup.nl");
					return;
				}
				else {
					if (this.debug) this.logInfo("SCHEDULE-AGENT not set. We are going add the item. At a later stage we will want to have a proper restore.");
					var tmpItem = erGetMeetingRequestByUIDRequest.argument.item.clone();
					tmpItem.clearId("xxxx-xxxx-xxx-xxxx");
					tmpItem.setProperty("X-exchangeITIP2", "true");
					tmpItem.removeAllAttendees();
					this.addItem(tmpItem, erGetMeetingRequestByUIDRequest.listener);
					return;
				}
			}

			if (!doStop) {
				if (erGetMeetingRequestByUIDRequest.argument.item.isMutable) {
					if (this.debug) this.logInfo("item is Mutable.");
					erGetMeetingRequestByUIDRequest.argument.item.clearId("not a valid id");
					if (this.debug) this.logInfo("item is Mutable. item.id set to '"+erGetMeetingRequestByUIDRequest.argument.item.id+"'");
					this.adoptItem(erGetMeetingRequestByUIDRequest.argument.item, erGetMeetingRequestByUIDRequest.listener);
				}
				else {
					if (this.debug) this.logInfo("item is NOT Mutable. Going to create clone.");
					var tmpItem = erGetMeetingRequestByUIDRequest.argument.item.clone();
					tmpItem.clearId("not a valid id");
					this.adoptItem(tmpItem, erGetMeetingRequestByUIDRequest.listener);
				}
				return;
			}
		}

		// User cancel.. How to respond!!
		if (erGetMeetingRequestByUIDRequest.listener) {
			this.notifyOperationComplete(erGetMeetingRequestByUIDRequest.listener,
	       	                             Ci.calIErrors.OPERATION_CANCELLED, 
	                       	             erGetMeetingRequestByUIDRequest.argument.operation,
	                       	             erGetMeetingRequestByUIDRequest.argument.item.id,
	                       	             erGetMeetingRequestByUIDRequest.argument.item);
		}
	},

	getMeetingRequestByUIDError: function _getMeetingRequestByUIDError(erGetMeetingRequestByUIDRequest, aCode, aMsg)
	{
		this.saveCredentials(erGetMeetingRequestByUIDRequest.argument);
		this.notConnected = true;
		if (this.debug) this.logInfo("getMeetingRequestByUIDError: aCode:"+aCode+", aMsg:"+aMsg);

		this.notifyOperationComplete(erGetMeetingRequestByUIDRequest.listener,
       	                             Ci.calIErrors.OPERATION_CANCELLED,
                       	             Ci.calIOperationListener.ADD,
                       	             erGetMeetingRequestByUIDRequest.argument.item.id,
                       	             erGetMeetingRequestByUIDRequest.argument.item);

		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
		promptService.alert(null, "Error", aMsg+" ("+aCode+")");
	},

	singleModified: function _singleModified(aModifiedSingle, doNotify, aFastNotify)
	{
		if (this.itemCacheById[aModifiedSingle.id]) {
			this.itemUpdates++;
			//dump(" ==Cal:"+this.name+", item updated:"+this.itemUpdates+", title:"+aModifiedSingle.title+", startDate:"+aModifiedSingle.startDate+"\n");

			if (doNotify) {
				if (this.debug) this.logInfo("singleModified doNotify");
				this.notifyTheObservers("onModifyItem", [aModifiedSingle, this.itemCacheById[aModifiedSingle.id]], aFastNotify);
			}
			/*if (this.itemCacheById[aModifiedSingle.id].className) {
				this.itemCacheById[aModifiedSingle.id].deleteItem();
			}
			this.itemCacheById[aModifiedSingle.id] = null;
			delete this.itemCacheById[aModifiedSingle.id];*/
			this.removeItemFromCache(aModifiedSingle);

			//this.itemCacheById[aModifiedSingle.id] = aModifiedSingle;
			this.addItemToCache(aModifiedSingle);
		}
	},

	masterModified: function _masterModified(aModifiedMaster)
	{
		//if (this.debug) this.logInfo("masterModified:"+aModifiedMaster.title);
		if (!this.recurringMasterCache[aModifiedMaster.uid]) {
			return null;
		}

		// Master was modified so tell the chidlren they have a new parent.
		for each(var item in this.itemCacheById) {
//			if ((item) && (item.parentItem.id != item.id) && (item.uid == aModifiedMaster.uid)) {
			if ((item) && (item.uid == aModifiedMaster.uid)) {
				//var newItem = item.clone();
				var newItem = this.cloneItem(item);
				newItem.parentItem = aModifiedMaster;
				this.singleModified(newItem, true);
				//this.notifyTheObservers("onModifyItem", [newItem, item]);
				//this.itemCacheById[newItem.id] = newItem;
			}
		}
		
		// We send a modify for the master. But we do not show the masters in the calendar 
//miv		this.notifyTheObservers("onModifyItem", [aModifiedMaster, this.recurringMasterCache[aModifiedMaster.uid]]);
		// Because we do not want it to be visible and the previous modify made it visible.
//miv		this.notifyTheObservers("onDeleteItem", [aModifiedMaster]);
		this.recurringMasterCache[aModifiedMaster.uid] = aModifiedMaster;
		this.recurringMasterCacheById[aModifiedMaster.id] = aModifiedMaster;
	},

	/**
	* Returns the acl entry associated to the calendar.
	*/
	//readonly attribute calICalendarACLEntry aclEntry;
	get aclEntry()
	{
		var accountMgr = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
		var identities = accountMgr.allIdentities;
		var idList = [];
		if ((identities["Count"]) && (identities["QueryElementAt"])) {
			for (var index=0; index < identities.Count; index++) {
				var identity = identities.QueryElementAt(index, Ci.nsIMsgIdentity);
				idList.push(identity);
				/*if (!this.name) {
					dump("aclEntry: index:"+index+", identitie:"+identity+"\n");
				}*/
			}
		}
		else {
			for (var index=0; index < identities.length; index++) {
				var identity = identities.queryElementAt(index, Ci.nsIMsgIdentity);
				idList.push(identity);
				/*if (!this.name) {
					dump("aclEntry: index:"+index+", identitie:"+identity+"\n");
				}*/
			}
		}
		var self = this;
		return {
			aclManager: this,
			hasAccessControl: true,
			userIsOwner: (this.canDelete || this.canModify),
			userCanAddItems: this._canCreateContent,
			userCanDeleteItems: this._canDelete,
			getUserAddresses: function(aCount) { dump("calICalendarACLEntry getUserAddresses:"+self.name+"\n"); aCount.value = 1; return ["babe"]; },
			getUserIdentities: function(aCount) { dump("calICalendarACLEntry getUserIdentities:"+self.name+"\n"); aCount.value = idList.length; return idList; },
			getOwnerIdentities: function(aCount) { dump("calICalendarACLEntry getOwnerIdentities:"+self.name+"\n"); aCount.value = idList.length; return idList; },
			refresh: function() { dump("calICalendarACLEntry refresh:"+self.name+"\n");  },
			};

	},


	//  calIOperation modifyItem(in calIItemBase aNewItem,
        //                   in calIItemBase aOldItem,
        //                   in calIOperationListener aListener);

	modifyItem: function _modifyItem(aNewItem, aOldItem, aListener)
	{

		if (this.debug) this.logInfo("modifyItem");
		var result = Ci.calIErrors.MODIFICATION_FAILED;

	        if (this.OnlyShowAvailability) {
			this.readOnlyInternal = true;
			this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.MODIFY,
        	                             aNewItem.id,
        	                             aNewItem);
			return null;
	        }

	        if (this.readOnly) {
			// When we hit this it probably is the change on a alarm. We will process this only in the local cache.
			if (this.debug) this.logInfo("modifyItem and this calendar is ReadOnly");
			this.notifyTheObservers("onModifyItem", [aNewItem, aOldItem]);
	        	this.notifyOperationComplete(aListener,
	        	                             Cr.NS_OK,
	        	                             Ci.calIOperationListener.MODIFY,
	        	                             aNewItem.id,
	        	                             aNewItem);
			return null;
	        }

		if ((aOldItem.className) && (!aOldItem.canModify)) {
			if (this.debug) this.logInfo("modifyItem and this item is ReadOnly for this user.");
	        	this.notifyOperationComplete(aListener,
	        	                             Cr.NS_OK,
	        	                             Ci.calIOperationListener.MODIFY,
	        	                             aOldItem.id,
	        	                             aOldItem);
			return null;
		}

		if (this.debug) this.logInfo("1 -- aOldItem.recurrenceInfo:"+aOldItem.recurrenceInfo+", aNewItem.recurrenceInfo:"+aNewItem.recurrenceInfo);
		if ((this.debug) && (aOldItem.recurrenceInfo)) this.logInfo("1 -- aOldItem.recurrenceInfo.toString():"+aOldItem.recurrenceInfo.toString());
		if ((this.debug) && (aNewItem.recurrenceInfo)) this.logInfo("1 -- aNewItem.recurrenceInfo.toString():"+aNewItem.recurrenceInfo.toString());

	        if (!aNewItem) {
	            throw Cr.NS_ERROR_INVALID_ARG;
	        }

	        var this_ = this;
	        function reportError(errStr, errId) {
	            this_.notifyOperationComplete(aListener,
	                                          errId ? errId : Cr.NS_ERROR_FAILURE,
	                                          Ci.calIOperationListener.MODIFY,
	                                          aNewItem.id,
	                                          errStr);
	            return null;
	        }

	        if (aNewItem.id == null) {
	            // this is definitely an error
	            return reportError("ID for modifyItem item is null");
	        }

		// See if attachments changed.
		var newAttachments = aNewItem.getAttachments({});
		var attachments = {};

		var attachmentsUpdates = { create: [], delete:[] };
		if (newAttachments.length > 0) {
			if (this.debug) this.logInfo("  -- We have newAttachments:"+newAttachments.length);
			for (var index in newAttachments) {
				if (newAttachments[index].getParameter("X-AttachmentId")) {
					attachments[newAttachments[index].getParameter("X-AttachmentId")] = newAttachments[index];
				}
				else {
					attachmentsUpdates.create.push(newAttachments[index]);
					if (this.debug) this.logInfo("newAttachment:"+newAttachments[index].uri.spec);
				}
			}
		}
		// Check which have been removed.
		var oldAttachments = aOldItem.getAttachments({});
		for (var index in oldAttachments) {
			if (! attachments[oldAttachments[index].getParameter("X-AttachmentId")]) {
				attachmentsUpdates.delete.push(oldAttachments[index]);
				if (this.debug) this.logInfo("removedAttachment:"+oldAttachments[index].uri.spec);
			}
		}			
		

		if (isEvent(aNewItem)) {
			if (this.debug) this.logInfo("ModifyItem: it is an event.");
			var doSendMeetingRespons = false;
			var meOld = this.getInvitedAttendee(aOldItem);
			if (!meOld) {
				if (this.debug) this.logInfo("Did not find meOld");
				meOld = cal.createAttendee();
				meOld.participationStatus = "NEEDS-ACTION";
			}

			var meNew = this.getInvitedAttendee(aNewItem);
			if (!meNew) {
				if (this.debug) this.logInfo("Did not find meNew");
				meNew = cal.createAttendee();
				meNew.participationStatus = "NEEDS-ACTION";
			}

			if (aOldItem.isInvitation) {

				if (this.debug) this.logInfo("1 meOld.participationStatus="+meOld.participationStatus+", meNew.participationStatus="+meNew.participationStatus);
				if (this.debug) this.logInfo("1 aOldItem.status="+aOldItem.getProperty("STATUS")+", aNewItem.status="+aNewItem.getProperty("STATUS"));

				if ((meOld) && (meNew) && (meOld.participationStatus != meNew.participationStatus)) {
					doSendMeetingRespons = true;
				}

				if ((meNew) && (meNew.participationStatus == "NEEDS-ACTION") && (meOld.participationStatus != meNew.participationStatus)) {
					// They choose to confirm at a later state. Do not change this item.
			        	this.notifyOperationComplete(aListener,
			        	                             Cr.NS_OK,
			        	                             Ci.calIOperationListener.MODIFY,
			        	                             aNewItem.id,
			        	                             aNewItem);

			        	return null;
				}

				if ((meOld) && (meNew) && (aOldItem.getProperty("STATUS") != aNewItem.getProperty("STATUS")) && (!doSendMeetingRespons)) {
					switch (aNewItem.getProperty("STATUS")) {
					case "CONFIRMED": 
						meNew.participationStatus = "ACCEPTED";
						break;
					case null:
					case "TENTATIVE": 
						meNew.participationStatus = "TENTATIVE";
						break;
					case "CANCELLED": 
						meNew.participationStatus = "DECLINED";
						break;
					}
					doSendMeetingRespons = true;
				}

			}

			if (doSendMeetingRespons) {
				// The item is an invitation.
				// My status has changed. Send to this.globalFunctions.
				if (this.debug) this.logInfo("2 aOldItem.participationStatus="+meOld.participationStatus+", aNewItem.participationStatus="+(meNew ? meNew.participationStatus : ".."));
				if (this.debug) this.logInfo("3a aOldItem.id="+aOldItem.id);
				if (this.debug) this.logInfo("3b aNewItem.id="+aNewItem.id);

				var requestResponseItem = aNewItem;
				requestResponseItem.setProperty("X-MEETINGREQUEST", true);
				var aResponse = null;

				// Loop through meetingRequestsCache to find it.
				var cachedItem = null;
				for (var index in this.meetingRequestsCache) {
					if (this.meetingRequestsCache[index]) {
						if (this.meetingRequestsCache[index].uid == aNewItem.id) {
							cachedItem = this.meetingRequestsCache[index];
							break;
						}
					}
				}

				if (cachedItem) {
					if (this.debug) this.logInfo("___________ Found in meeting request cache.");
					var tmpItem = cachedItem;
					var tmpUID = aNewItem.id;
					requestResponseItem = this.cloneItem(aNewItem);
					requestResponseItem.id = tmpItem.id;
					//requestResponseItem.setProperty("X-UID",  tmpItem.uid);
					//requestResponseItem.setProperty("X-ChangeKey",  tmpItem.changeKey);
				}
				else {
					if (this.debug) this.logInfo("___________ NOT Found in meeting request cache. X-UID:"+aNewItem.uid);

					if (aNewItem.id == aNewItem.parentItem.id) {
						if (this.debug) this.logInfo("_________ it is a master.");
					}

					if ((!this.itemCacheById[aNewItem.id]) && (!this.recurringMasterCache[aNewItem.uid])) {
						this.getMeetingRequestFromServer(aNewItem, aOldItem.uid, Ci.calIOperationListener.MODIFY, aListener);
						return;
					}

				}

				if (this.sendMeetingRespons(requestResponseItem, null, "exisiting", aResponse)) {
					//return;
					result = Cr.NS_OK;
				}
				else {
					if (this.debug) this.logInfo("modifyItem: canceled by user.");
					result = Cr.NS_OK;
				}
			}
			else {

				var input= { item: aNewItem, 
					     response: "sendtonone"};

				if (aNewItem.organizer) {
					if (this.debug) this.logInfo("The organizer is:"+aNewItem.organizer.id);
				}
				else {
					if (this.debug) this.logInfo("We have no organizer!");
				}


				var changesObj = this.makeUpdateOneItem(aNewItem, aOldItem, null, null, null, aOldItem.isInvitation);
				var changes;
				if (changesObj) {
					changes = changesObj.changes;
				}
				var weHaveChanges = (changes || (attachmentsUpdates.create.length > 0) || (attachmentsUpdates.delete.length > 0));
//				var weHaveChanges = (this.makeUpdateOneItem(aNewItem, aOldItem, null, null, null, aOldItem.isInvitation) || (attachmentsUpdates.create.length > 0) || (attachmentsUpdates.delete.length > 0));

				var iAmOrganizer = ((aNewItem.organizer) && (aNewItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()));
				if (iAmOrganizer) {

					if (((changes) && ((changesObj) && (!changesObj.onlySnoozeChanged))) || (attachmentsUpdates.create.length > 0) || (attachmentsUpdates.delete.length > 0)) {

						input.response = "sendtoall";

						// Get the eventsummarywindow to attach dialog to.
						let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
						                  .getService(Ci.nsIWindowMediator);
						let calWindow = wm.getMostRecentWindow("Calendar:EventSummaryDialog") || cal.getCalendarWindow() || wm.getMostRecentWindow("mail:3pane") ;
	
						var attendees = aNewItem.getAttendees({}).length + aOldItem.getAttendees({}).length;
						if (this.debug) this.logInfo("  -- aOldItem.getAttendees({}).length="+aOldItem.getAttendees({}).length);
						if (this.debug) this.logInfo("  -- aNewItem.getAttendees({}).length="+aNewItem.getAttendees({}).length);
						if (this.getInvitedAttendee(aOldItem)) {
							attendees--;
						}
						if (this.getInvitedAttendee(aNewItem)) {
							attendees--;
						}

						if ((calWindow) && (attendees > 0) && (weHaveChanges)) {
							calWindow.openDialog("chrome://exchangecalendar/content/sendUpdateTo.xul",
								"sendUpdateTo",
								"chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
								input); 
						}

						if ((attendees == 0) || (!weHaveChanges)) {
							if (this.debug) this.logInfo(" -- There are no attendees left");
							input.response = "sendtonone";
						}
					}
					else {
						if (this.debug) this.logInfo(" -- The user/organizer only dismissed or removed a reminder. We are not going to send this update to the invited people of the meeting.");
						input.response = "sendtonone";
					}
				}

				if (this.debug) this.logInfo("modifyItem: it is a event. aOldItem.CalendarItemType=:"+aOldItem.calendarItemType);

				// We have a Single or master
				if (aOldItem.calendarItemType == "RecurringMaster") {
					if (this.debug) this.logInfo(" Master changed:"+aNewItem.title);
					// See if the aNewItem is also the master record.
					var masterChanged = (aNewItem.parentItem.id == aNewItem.id);

					// We need to find out wat has changed;
					if (this.debug) this.logInfo(" ==1 invite="+aOldItem.isInvitation);

					if (changes) {
						if (this.debug) this.logInfo("modifyItem: changed:"+String(changes));

						var self = this;
						this.addToQueue( erUpdateItemRequest,
							{user: this.user, 
							 mailbox: this.mailbox,
							 folderBase: this.folderBase,
							 serverUrl: this.serverUrl,
							 item: aOldItem,
							 folderID: this.folderID,
							 changeKey: this.changeKey,
							 updateReq: changes,
							 newItem: aNewItem,
					 		 actionStart: Date.now(),
							 attachmentsUpdates: attachmentsUpdates,
							 onlySnoozeChanges:changesObj.onlySnoozeChanged,
							 sendto: input.response}, 
							function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
							function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
							aListener);
						return;
					}
					else {
						if (this.debug) this.logInfo("modifyItem: No changes for master.");
						// No changes to a master could means that one of the occurrences
						// was deleted. 
						var removedOccurrence = this.getRemovedOccurrence(aOldItem, aNewItem);
						if (removedOccurrence) {
							// Delete this occurrence; multi
							this.notifyTheObservers("onDeleteItem", [removedOccurrence], true);
							this.deleteItem(removedOccurrence);
							result = Cr.NS_OK;
						}
						else {
							// Could be an alarm dismiss or snooze
							dump("IF YOU SEE THIS PLEASE REPORT..(CODE1)\n");
							this.masterModified(aNewItem);
						}
						result = Cr.NS_OK;
					}
				}
				else {
					if (this.debug) this.logInfo("modifyItem: '"+aOldItem.calendarItemType+"' event modification");
					// We need to find out wat has changed;
					if (this.debug) this.logInfo(" ==1 invite="+aOldItem.isInvitation);

					if (changes) {
						if (this.debug) this.logInfo("modifyItem: changed:"+String(changes));

						var self = this;
						this.addToQueue( erUpdateItemRequest,
							{user: this.user, 
							 mailbox: this.mailbox,
							 folderBase: this.folderBase,
							 serverUrl: this.serverUrl,
							 item: aOldItem,
							 folderID: this.folderID,
							 changeKey: this.changeKey,
							 updateReq: changes,
							 newItem: aNewItem,
					 		 actionStart: Date.now(),
							 attachmentsUpdates: attachmentsUpdates,
							 onlySnoozeChanges:changesObj.onlySnoozeChanged,
							 sendto: input.response}, 
							function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
							function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
							aListener);
						this.singleModified(aNewItem, true, true);
						return;
					}
					else {
						if (this.doAttachmentUpdates(attachmentsUpdates, aOldItem, input.response, aListener)) {
							// We are done
							if (this.debug) this.logInfo("modifyItem: No only attachment changes no other fields.");
							return;
						}
						else {
							if (this.debug) this.logInfo("modifyItem: No changes 1.");
							if (!aOldItem.isInvitation) {
								//aNewItem.parentItem = aNewItem; move to storagecalendar
								this.singleModified(aNewItem, true, true);
							}
							result = Cr.NS_OK;
						}
					}
				}
			}
		}
		else {
			if (isToDo(aNewItem)) {
				if (this.debug) this.logInfo("modifyItem: it is a todo");

				var changesObj = this.makeUpdateOneItem(aNewItem, aOldItem);
				var changes;
				if (changesObj) {
					changes = changesObj.changes;
				}
				if (changes) {
					if (this.debug) this.logInfo("modifyItem: changed:"+String(changes));
					var self = this;
					this.addToQueue( erUpdateItemRequest,
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 item: aOldItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 updateReq: changes,
						 newItem: aNewItem,
						 attachmentsUpdates: attachmentsUpdates,
					 	 actionStart: Date.now()}, 
						function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
						function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
						aListener);
					this.singleModified(aNewItem, true, true);
					return;
				}
				else {
					if (this.doAttachmentUpdates(attachmentsUpdates, aOldItem, "sendtonone", aListener)) {
						// We are done
						if (this.debug) this.logInfo("modifyItem: No only attachment changes no other fields.");
						return;
					}
					else {
						if (this.debug) this.logInfo("modifyItem: No changes 2.");
						//aNewItem.parentItem = aNewItem;
						this.singleModified(aNewItem, true, true);
						result = Cr.NS_OK;
					}
				}
			}
			else {
				return reportError("Unknown itemtype for modifyItem");
			}
		}

		//this.notifyTheObservers("onModifyItem", [aNewItem, aOldItem]);

        	this.notifyOperationComplete(aListener,
        	                             result,
        	                             Ci.calIOperationListener.MODIFY,
        	                             aNewItem.id,
        	                             aNewItem);

        	return null;
	},

	getChildByUIDandNativeTime: function _getChildByUIDandNativeTime(aUID, aNativeTime)
	{
		for (var index in this.itemCacheById) {
			if ((this.itemCacheById[index]) && (this.itemCacheById[index].uid == aUID)) {
				// We found a child with the specified UID.
				if ((this.itemCacheById[index].recurrenceId) && (this.itemCacheById[index].recurrenceId.nativeTime == aNativeTime)) {
					return this.itemCacheById[index];
				} 
			}
		}

		return null;
	},
	
	deleteItemCancelled: function _deleteItemCancelled(aItem,aListener) {
		if (this.debug) this.logInfo("deleteItemCancelled: "+aItem.title);
		if ((aItem.className) && (!aItem.canDelete)) {
			if (this.debug) this.logInfo("User is not allowed to delete this item.");
	        	this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.DELETE,
                        	             aItem.id,
                        	             aItem);
			return null;
		}

		if (aItem.id == null) {
			if (aListener) {
				this.notifyOperationComplete(aListener,
		                                 Ci.calIErrors.MODIFICATION_FAILED,
		                                 Ci.calIOperationListener.DELETE,
		                                 null,
		                                 "ID is null for deleteItem");
			}
			return;
		}

		// Check if this item is still in cache
		if ((aItem.id == aItem.parentItem.id) && (!this.itemCacheById[aItem.id]) && (!this.recurringMasterCache[aItem.uid]))	 {
			if (this.debug) this.logInfo("Item is not in itemCache anymore. Probably not removed from view by Lightning..");
			if (aListener) {
				this.notifyOperationComplete(aListener,
		                                 Cr.NS_OK,
		                                 Ci.calIOperationListener.DELETE,
		                                 aItem.id,
		                                 aItem);
			}
			return;
		}
		
		switch (aItem.calendarItemType) {
				case "Single" :
					if (this.debug) this.logInfo("-- Single CalendarItemType");
					this.removeItemFromCache(aItem);

					var self = this;
					this.addToQueue( erDeleteItemRequest, 
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 actionStart: Date.now(),
						 itemType: "single"}, 
						function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);}, 
						function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
						aListener);

					break;
				case "Occurrence" :
				case "Exception" :
					if (this.debug) this.logInfo("-- "+aItem.calendarItemType+" CalendarItemType");
					this.removeItemFromCache(aItem);

					var self = this;
					this.addToQueue( erGetOccurrenceIndexRequest,
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 masterItem: aItem,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 action: "deleteItem",
						 itemType: "occurrence",
						 whichOccurrence: "occurrence" },//dialogArg.answer}, 
						function(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey) { self.getOccurrenceIndexOk(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey);}, 
						function(erGetOccurrenceIndexRequest, aCode, aMsg) { self.getOccurrenceIndexError(erGetOccurrenceIndexRequest, aCode, aMsg);},
						aListener);

					break;
				case "RecurringMaster" :
					if (this.debug) this.logInfo("-- RecurringMaster CalendarItemType");
					this.removeItemFromCache(aItem); 
					
					var self = this;
					this.addToQueue( erDeleteItemRequest,
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 itemType: "master",
						 actionStart: Date.now(),
						 whichOccurrence: "all_occurrences"}, 
						function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);}, 
						function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
						aListener);
					break;
				default :
					// TODO: This will happen when the sync to/from EWS has not yet happened.
					if (this.debug) this.logInfo("WARNING: unknown CalendarItemType="+aItem.calendarItemType);
			}
			
	},
	//  calIOperation deleteItem(in calIItemBase aItem,
        //                   in calIOperationListener aListener);
	deleteItem: function _deleteItem(aItem, aListener) {
		if (this.debug) this.logInfo("deleteItem");

	        if (this.OnlyShowAvailability) {
			this.readOnlyInternal = true;
			this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.DELETE,
                        	             aItem.id,
                        	             aItem);
/*	            this.notifyOperationComplete(aListener,
	                                         Ci.calIErrors.CAL_IS_READONLY,
	                                         Ci.calIOperationListener.DELETE,
	                                         null,
	                                         "Calendar is readonly");*/
			return null;
	        }

		if ((aItem.className) && (!aItem.canDelete)) {
			if (this.debug) this.logInfo("User is not allowed to delete this item.");
	        	this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.DELETE,
                        	             aItem.id,
                        	             aItem);
			return null;
		}

		if (aItem.id == null) {
			if (aListener) {
				this.notifyOperationComplete(aListener,
		                                 Ci.calIErrors.MODIFICATION_FAILED,
		                                 Ci.calIOperationListener.DELETE,
		                                 null,
		                                 "ID is null for deleteItem");
			}
			return;
		}

		// Check if this item is still in cache
		if ((aItem.id == aItem.parentItem.id) && (!this.itemCacheById[aItem.id]) && (!this.recurringMasterCache[aItem.uid]))	 {
			if (this.debug) this.logInfo("Item is not in itemCache anymore. Probably not removed from view by Lightning..");
			if (aListener) {
				this.notifyOperationComplete(aListener,
		                                 Cr.NS_OK,
		                                 Ci.calIOperationListener.DELETE,
		                                 aItem.id,
		                                 aItem);
			}
			return;
		}

		var self = this;
		if (isEvent(aItem)) {
			if (this.debug) this.logInfo("deleteItem is calIEvent");

			var iAmOrganizer = ((aItem.organizer) && (aItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()));
			var isCancelled = aItem.isCancelled;
			var isInvitation = this.isInvitation(aItem, true);

			if ((isInvitation) && (!isCancelled)) {
//			if ((this.folderBase == "calendar") && (!this.folderID) && 
//			    (!iAmOrganizer) && (aItem.getProperty("STATUS") != "DECLINED") &&
//			    (aItem.getProperty("STATUS") != "NONE") && (!isCancelled)) {
				//var aOldItem = aItem.clone();
				var aOldItem = this.cloneItem(aItem);
				aOldItem.setProperty("STATUS", "DECLINED");

				if (!this.sendMeetingRespons(aOldItem, null, "exisiting", "DECLINED")) {
					if (this.debug) this.logInfo("deleteItem: canceled by user.");
					if (aListener) {
						this.notifyOperationComplete(aListener,
						      Ci.calIErrors.OPERATION_CANCELLED,
						      Ci.calIOperationListener.DELETE,
						      aItem.id,
						      aItem);
					}
					return;
				}
				else {
					if (aListener) {
						this.notifyOperationComplete(aListener,
						      Cr.NS_OK,
						      Ci.calIOperationListener.DELETE,
						      aItem.id,
						      aItem);
					}
					return;
				}

			}

			var input= { item: aItem, 
				     response: "sendtonone"};

			if (iAmOrganizer) {

				input.response = "sendtoall";

				// Get the eventsummarywindow to attach dialog to.
				let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
			                          .getService(Ci.nsIWindowMediator);
				let calWindow = wm.getMostRecentWindow("Calendar:EventSummaryDialog") || cal.getCalendarWindow() || wm.getMostRecentWindow("mail:3pane") ;

				var attendees = aItem.getAttendees({}).length;
				var meOld = this.getInvitedAttendee(aItem);

				if (meOld) {
					attendees--;
				}

				if ((calWindow) && (attendees > 0)) {
					calWindow.openDialog("chrome://exchangecalendar/content/sendUpdateTo.xul",
						"sendUpdateTo",
						"chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
						input); 
				}

				if (attendees == 0) {
					input.response = "sendtonone";
				}

			}


			switch (aItem.calendarItemType) {

				case "Single" :
					if (this.debug) this.logInfo("-- Single CalendarItemType");

					var self = this;
					this.addToQueue( erDeleteItemRequest, 
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 actionStart: Date.now(),
						 itemType: "single"}, 
						function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);}, 
						function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
						aListener);

					break;
				case "Occurrence" :
				case "Exception" :
					if (this.debug) this.logInfo("-- "+aItem.calendarItemType+" CalendarItemType");

					var self = this;
					this.addToQueue( erGetOccurrenceIndexRequest,
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 masterItem: aItem,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 action: "deleteItem",
						 itemType: "occurrence",
						 whichOccurrence: "occurrence" },//dialogArg.answer}, 
						function(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey) { self.getOccurrenceIndexOk(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey);}, 
						function(erGetOccurrenceIndexRequest, aCode, aMsg) { self.getOccurrenceIndexError(erGetOccurrenceIndexRequest, aCode, aMsg);},
						aListener);

					break;
				case "RecurringMaster" :
					if (this.debug) this.logInfo("-- RecurringMaster CalendarItemType");

					var self = this;
					this.addToQueue( erDeleteItemRequest,
						{user: this.user, 
						 mailbox: this.mailbox,
						 folderBase: this.folderBase,
						 serverUrl: this.serverUrl,
						 item: aItem,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 itemType: "master",
						 actionStart: Date.now(),
						 whichOccurrence: "all_occurrences"}, 
						function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);}, 
						function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
						aListener);
					break;
				default :
					// TODO: This will happen when the sync to/from EWS has not yet happened.
					if (this.debug) this.logInfo("WARNING: unknown CalendarItemType="+aItem.calendarItemType);
			}
		}

		if (isToDo(aItem)) {
			if (this.debug) this.logInfo("deleteItem is calITask");
			var self = this;
			this.addToQueue( erDeleteItemRequest,
				{user: this.user, 
				 mailbox: this.mailbox,
				 folderBase: this.folderBase,
				 serverUrl: this.serverUrl,
				 item: aItem,
				 actionStart: Date.now(),
				 folderID: this.folderID,
				 changeKey: this.changeKey,
				 itemType: "single"}, 
				function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);}, 
				function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
				aListener);
		}
	},

	//  calIOperation getItem(in string aId, in calIOperationListener aListener);
	getItem: function _getItem(aId, aListener, aRetry) {
 		if (this.debug) this.logInfo("getItem: aId:"+aId);

		if (!aListener)
			return;

		var item = null;
 
        for (var index in this.itemCacheById) {
				if (this.itemCacheById[index]) {
					if (this.itemCacheById[index].uid == aId) {
						var item = this.itemCacheById[index];
						break;
					}
				}
		 }
		 

		if (!item) {
			var cachedRequest = null;
      			for (var index in this.meetingCancelationsCache) {
				if (this.meetingCancelationsCache[index]) {
					if (this.meetingCancelationsCache[index].uid == aId) {
						cachedRequest = this.meetingCancelationsCache[index];
						break;
					}
				}
			}

			if (cachedRequest) {
				//We have a meeting cancelation but not any calendaritem.
				if (this.debug) this.logInfo("This is odd we have a meeting cancelation but not any calendaritem. THIS SHOULD NOT HAPPEN");
				delete this.meetingCancelationsCache[cachedRequest.id];
				return;
			}

		}

	/*	if (!item) {
			for (var index in this.meetingRequestsCache) {
				if (this.meetingRequestsCache[index]) {
					if (this.meetingRequestsCache[index].uid == aId) {
						if (this.debug) this.logInfo("getItem is in meetingRequestsCache");
						if (this.debug) this.logInfo("  id="+index);
						var item = this.meetingRequestsCache[index];
						break;
					}
				}
			}  
		}*/

		if (!item) {
			// Wait with an answer until next sync. This could be an iTIP request
			// we could have received am email with a meetingrequest which was not
			// yet received through sync. Therefore we do not find it in cache. And
			// iTIP will show accept buttons and stuff. We do not want those buttons because
			// when pressed they will try to add the item to the calendar which gets synced to
			// EWS and we get an conflict...(item allready exists in EWS).
			// After next sync we can do this check again.
			if (!aRetry) {
				if (this.debug) this.logInfo("Not found putting it in ItemSyncQue");
				this.getItemSyncQueue.push( { id: aId,
							      listener: aListener } );
				this.notifyOperationComplete(aListener,
                        Cr.NS_OK,
                        Ci.calIOperationListener.GET,
                        aId,
                        null);
				this.refresh();
				return;
			}
			else {
				if (this.debug) this.logInfo("getItem not FOUND");
				// querying by id is a valid use case, even if no item is returned:
				this.notifyOperationComplete(aListener,
	                                         Cr.NS_OK,
	                                         Ci.calIOperationListener.GET,
	                                         aId,
	                                         null);
				return;
			}
		}

		var item_iid = null;
		if (isEvent(item))
			item_iid = Ci.calIEvent;
		else if (isToDo(item))
			item_iid = Ci.calITodo;
		else {
			this.notifyOperationComplete(aListener,
                                         Cr.NS_ERROR_FAILURE,
                                         Ci.calIOperationListener.GET,
                                         aId,
                                         "Can't deduce item type based on QI");
			this.notifyOperationComplete(aListener,
                    Cr.NS_OK,
                    Ci.calIOperationListener.GET,
                    aId,
                    null);
			return;
		}

		if (this.debug) this.logInfo("Found item in cache with Status:"+item.getProperty("STATUS"));
		
		this.notifyOperationComplete(aListener,
                                     Cr.NS_OK,
                                     Ci.calIOperationListener.GET,
                                     aId,
                                     null);
	 	/*
		aListener.onGetResult (this, 
		                       Cr.NS_OK,
		                       item_iid, null,
		                       1, [item]);*/
		return;
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

	//  calIOperation getItems(in unsigned long aItemFilter,
        //                 in unsigned long aCount,
        //                 in calIDateTime aRangeStart,
        //                 in calIDateTime aRangeEndEx,
        //                 in calIOperationListener aListener);
	getItems: function _getItems(aItemFilter, aCount,
                                    aRangeStart, aRangeEnd, aListener) 
	{
		if (this.debug) this.logInfo("getItems 0: " + "  aItemFilter, " + aItemFilter + "  aCount, " + aCount 
                                   								 + " aRangeStart,  " + aRangeStart + " aRangeEnd, "+  aRangeEnd 
                                   								 +  " aListener , " + aListener ); 

	    //Start poller if not already runnning  this may resolve suspend issue
		this.startCalendarPoller(); 

		if (aRangeStart)  { 
			if (this.debug) this.logInfo("getItems 2: aRangeStart:"+aRangeStart.toString()); 
			//dump(", aRangeStart:"+aRangeStart.toString());
		}
		else { 
			if (this.debug) this.logInfo("getItems 2: aRangeStart:null");
			//dump(", aRangeStart:null");
		}
		if (aRangeEnd) { 
			if (this.debug) this.logInfo("getItems 3: aRangeEnd:"+aRangeEnd.toString()); 
			//dump(", aRangeEnd:"+aRangeEnd.toString()); 
		}
		else { 
			if (this.debug) this.logInfo("getItems 3: aRangeEnd:null");
			//dump(", aRangeEnd:null");
		}
		//dump("\n");

		//dump(" typeString(aListener):"+this.typeString(aListener)+"\n");
		if (this.typeString(aListener) == "object") { 
			if (this.debug) this.logInfo("We received a getItems from repeatingInvitationsTimer function. Because this request if always for a full year it will consume a lot of memory when we have a lot of recurring events with no end date. So for now we only request the period we have in memory cache. startDate:"+this.startDate+", endDate:"+this.endDate);
			//dump(this.globalFunctions.STACK(10)+"\n");
			if (this.startDate) {
				aRangeStart = this.startDate.clone();
			}
			else {
				aRangeStart = undefined;
			}
			if (this.endDate) {
				aRangeEnd = this.endDate.clone();
			}
			else {
				aRangeEnd = undefined;
			}
		}

		var wantEvents = ((aItemFilter & Ci.calICalendar
			.ITEM_FILTER_TYPE_EVENT) != 0);

		var wantTodos = ((aItemFilter & Ci.calICalendar
			.ITEM_FILTER_TYPE_TODO) != 0);

		//if (wantEvents) dump("Events are requested by calendar.\n");
		//if (wantTodos) dump("Tasks are requested by calendar.\n");

		if (wantEvents) if (this.debug) this.logInfo("Events are requested by calendar.");
		if (wantTodos) if (this.debug) this.logInfo("Tasks are requested by calendar.");

		if (this.newCalendar) {
			if (this.debug) this.logInfo("We are still creating this calendar. Ignore getItems for now.");
			if (aRangeStart) {
				if (wantEvents) {
					if (this.newCalRangeStartEvents) {
						if (aRangeStart.compare(this.newCalRangeStartEvents) < 0) {
							this.newCalRangeStartEvents = aRangeStart.clone();
						}
					}
					else {
						this.newCalRangeStartEvents = aRangeStart.clone();
					}
				}
				if (wantTodos) {
					if (this.newCalRangeStartTodos) {
						if (aRangeStart.compare(this.newCalRangeStartTodos) < 0) {
							this.newCalRangeStartTodos = aRangeStart.clone();
						}
					}
					else {
						this.newCalRangeStartTodos = aRangeStart.clone();
					}
				}
			}
		
			if (aRangeEnd) {
				if (wantEvents) {
					if (this.newCalRangeEndEvents) {
						if (aRangeEnd.compare(this.newCalRangeEndEvents) > 0) {
							this.newCalRangeEndEvents = aRangeEnd.clone();
						}
					}
					else {
						this.newCalRangeEndEvents = aRangeEnd.clone();
					}
				}
				if (wantTodos) {
					if (this.newCalRangeEndTodos) {
						if (aRangeEnd.compare(this.newCalRangeEndTodos) > 0) {
							this.newCalRangeEndTodos = aRangeEnd.clone();
						}
					}
					else {
						this.newCalRangeEndTodos = aRangeEnd.clone();
					}
				}
			}
		
			if (aListener) {
				this.notifyOperationComplete(aListener,
				      Cr.NS_OK,
				      Ci.calIOperationListener.GET,
				      null,
				      null);
			}
			return;
		}

		if (!this.firstSyncDone) {
			//dump("!this.firstSyncDone\n");
			this.getItemsSyncQueue.push({itemFilter: aItemFilter, 
						count: aCount,
                		rangeStart: aRangeStart, 
						rangeEnd: aRangeEnd,
						listener: aListener});
			return;
		}

		if (!this.isInitialized) {
			//dump("!this.isInitialized\n");
			if (aListener) {
				this.notifyOperationComplete(aListener,
				      Cr.NS_OK,
				      Ci.calIOperationListener.GET,
				      null,
				      null);
			}
			return;
		}

		var validPeriod = false;
		if ((aRangeStart) && (aRangeEnd) && (aRangeStart.isDate) && (aRangeEnd.isDate)) {
			validPeriod = true;
			this.lastValidRangeStart = aRangeStart.clone();
			this.lastValidRangeEnd = aRangeEnd.clone();
		}

		this.exporting = false;
		if ((aItemFilter == Ci.calICalendar.ITEM_FILTER_ALL_ITEMS) &&
		    (aCount == 0) &&
		    (aRangeStart === null) &&
		    (aRangeEnd === null)) {
			if (this.debug) this.logInfo("getItems: Request to get all Items in Calendar. Probably an export");
			this.exporting = true;
		}

		var asOccurrences = ((aItemFilter & Ci.calICalendar
			.ITEM_FILTER_CLASS_OCCURRENCES) != 0);

		var wantInvitations =  ((aItemFilter & Ci.calICalendar
	  		.ITEM_FILTER_REQUEST_NEEDS_ACTION) != 0);

		if (!wantEvents && !wantInvitations && !wantTodos) {
			this.notifyOperationComplete(aListener,
				Cr.NS_OK,
				Ci.calIOperationListener.GET,
				null, null);
			return;
		}

		if (wantInvitations) if (this.debug) this.logInfo("Invitations are requested by calendar.");

		if ((!this.supportsEvents) && (!this.supportsTasks) && (!this.OnlyShowAvailability)) {
			// Something requested we cannot fullfill.
			if (this.debug) this.logInfo("This folder currently is not able yet to support events or tasks.");
			this.notifyOperationComplete(aListener,
				Cr.NS_OK,
				Ci.calIOperationListener.GET,
				null, null);
			return;
		}

		var eventsRequestedAndPossible = (((wantEvents) && (this.supportsEvents)) || (this.OnlyShowAvailability));
		var tasksRequestedAndPossible = ((wantTodos) && (this.supportsTasks));
		if ((!eventsRequestedAndPossible) && (!tasksRequestedAndPossible)) {
			if (this.debug) this.logInfo("This folder is not able to support requested items. this.OnlyShowAvailability:"+this.OnlyShowAvailability);
			this.notifyOperationComplete(aListener,
				Cr.NS_OK,
				Ci.calIOperationListener.GET,
				null, null);
			return;
		}
		if (eventsRequestedAndPossible) if (this.debug) this.logInfo("Events are requested and this is possible for this folder");
		if (tasksRequestedAndPossible) if (this.debug) this.logInfo("Tasks are requested and this is possible for this folder");

		if (!aRangeStart) {
			/*if (this.startDate) {
				aRangeStart = this.startDate.clone();
			}
			else {
				aRangeStart = cal.fromRFC3339("1900-01-01T00:00:00Z");
			}*/

			// We are going to request a rangestart of 5 weeks before now.
			aRangeStart = cal.now()
			var offset = cal.createDuration();
			offset.weeks = -5;
			aRangeStart.addDuration(offset);
			//dump("aRangeStart == null. Setting to:"+aRangeStart+"\n");

			if ((this.startDate) && (this.startDate.compare(aRangeStart) < 0)) {
				aRangeStart = this.startDate.clone();
			}

		}

		if (!aRangeEnd) {
			/*if (this.endDate) {
				aRangeEnd = this.endDate.clone();
			}
			else {
				aRangeEnd = cal.fromRFC3339("3500-01-01T00:00:00Z");
			}*/

			// We are going to request a rangeend of 5 weeks after now.
			aRangeEnd = cal.now()
			var offset = cal.createDuration();
			offset.weeks = 5;
			aRangeEnd.addDuration(offset);
			//dump("aRangeEnd == null. Setting to:"+aRangeEnd+"\n");

			if ((this.endDate) && (this.endDate.compare(aRangeEnd) > 0)) {
				aRangeEnd = this.endDate.clone();
			}

		} 

		var dateChanged = false;
		var startChanged = false;
		var endChanged = false;

		if (!this.periods) {
			this.periods = [];
		}
		// Check if this requested period touches a previous seen period.
		var periodMatch = false;
		var i = 0;
		while ((!periodMatch) && (i < this.periods.length)) {
			if (this.periods[i].startDate.compare(aRangeStart) > 0) {
			}
			i++;
		}

		if (!this.startDate) {
			if (this.debug) this.logInfo("no startdate");
			this.startDate = aRangeStart.clone();
			dateChanged = true;
		}
		else {
			if (this.startDate.compare(aRangeStart) > 0) {
				if (this.debug) this.logInfo("aRangeStart ("+aRangeStart.toString()+") is before current startDate ("+this.startDate.toString()+")");
				// New start date is before old startdate. Period has grown.
				var oldStartDate = this.startDate.clone();
				this.startDate = aRangeStart.clone();
				dateChanged = true;
				startChanged = true;
			}
		}

		if (!this.endDate) {
			if (this.debug) this.logInfo("no enddate");
			this.endDate = aRangeEnd.clone();
			dateChanged = true;
		}
		else {
			if (this.endDate.compare(aRangeEnd) < 0) {
				if (this.debug) this.logInfo("aRangeEnd ("+aRangeEnd.toString()+") is after current endDate ("+this.endDate.toString()+")");
				// New end date is after old enddate. Period has grown.
				var oldEndDate = this.endDate.clone();
				this.endDate = aRangeEnd.clone();
				dateChanged = true;
				endChanged = true;
			}
		} 
		
		if (aRangeStart)  { if (this.debug) this.logInfo("getItems 5a: aRangeStart:"+aRangeStart.toString()); }
		if (aRangeEnd) { if (this.debug) this.logInfo("getItems 5b: aRangeEnd:"+aRangeEnd.toString()); }

		if (!this.lastValidRangeStart) this.lastValidRangeStart = aRangeStart.clone();
		if (!this.lastValidRangeEnd) this.lastValidRangeEnd = aRangeEnd.clone();

		if ((this.useOfflineCache) && (dateChanged)) {
			if (((wantEvents) && (this.supportsEvents)) || ((wantTodos) && (this.supportsTasks))) {
				if (this.debug) this.logInfo("Requesting events/tasks from offline cache.");

				if ((startChanged) || (endChanged)) {

					if (startChanged) {
						if (this.debug) this.logInfo("Startdate has changed to an earlier date. Requesting difference.");
						this.getItemsFromOfflineCache(aRangeStart, oldStartDate);
					}
					if (endChanged) {
						if (this.debug) this.logInfo("Enddate has changed to a later date. Requesting difference.");
						this.getItemsFromOfflineCache(oldEndDate, aRangeEnd, aListener);
					}

					// We need to get the period which did not change from memorycache.
				}
				else {
					if (this.debug) this.logInfo("New time period. Requesting items in period.");
					this.getItemsFromOfflineCache(aRangeStart, aRangeEnd, aListener);
				}
			}

			if ((this.offlineStartDate) && (aRangeStart.compare(this.offlineStartDate) < 0)) {
				if (this.debug) this.logInfo("Rangestart is before offlineCache start.");
				oldStartDate = this.offlineStartDate.clone();
				startChanged = true;
			}
			else {
				if (this.offlineStartDate) {
					if (this.debug) this.logInfo("Rangestart is after offlineCache start.");
					startChanged = false;
				}
				else {
					startChanged = true;
				}
			} 

			if ((this.offlineEndDate) && (aRangeEnd.compare(this.offlineEndDate) > 0)) {
				if (this.debug) this.logInfo("RangeEnd is after offlineCache end.");
				oldEndDate = this.offlineEndDate.clone();
				endChanged = true;
			}
			else {
				if (this.offlineEndDate) {
					if (this.debug) this.logInfo("RangeEnd is before offlineCache end.");
					endChanged = false;
				}
				else {
					endChanged = true;
				}
			}

		}  
		
		//Update calendar/task view 
		this.getItemsFromMemoryCache(aRangeStart, aRangeEnd, aItemFilter, aListener, this.exporting);

 		if (this.OnlyShowAvailability) {
			if ((startChanged) || (endChanged)) {
				if (startChanged) {
					this.getOnlyFreeBusyInformation(aRangeStart, oldStartDate);
				}
				if (endChanged) {
					this.getOnlyFreeBusyInformation(oldEndDate, aRangeEnd);
				}
			}
			else {
				this.getOnlyFreeBusyInformation(aRangeStart, aRangeEnd);
			}

			return;
		}

/* We started the inbox poller again in the normal place
		if ((this.syncInboxState) && (!this.weAreInboxSyncing)) {
			if ((this.folderBase == "calendar") && (!this.folderID)) {

				// Start the inbox poller to check for meetinginvitations or cancelations.
				this.checkInbox();
			}
		}
*/ 
		// 2013-11-19 Going to request getitems period from exchange.
		if (!dateChanged) {
			if (this.debug) this.logInfo("No dateChanged. Not going to request items from server.");
			return;
		}

		if (this.isOffline) {
			if (this.debug) this.logInfo("We are offline. Not going to request items from server.");
			return;
		}
 
		// 2013-11-19 Going to request getitems period from exchange.
/*		if ((wantEvents) && (this.supportsEvents)) {
			this.requestPeriod(aRangeStart, aRangeEnd, aItemFilter, aCount, false);
		}*/

		if ((wantEvents) && (this.supportsEvents)) {
			if (this.debug) this.logInfo("Requesting events from exchange server.");
			if (((startChanged) && (oldStartDate)) || ((endChanged) && (oldEndDate))) {

				//this.getItemsFromMemoryCache(aRangeStart, aRangeEnd, aItemFilter, aListener, this.exporting);

				if (startChanged) {
					if (this.debug) this.logInfo("Startdate has changed to an earlier date. Requesting difference.");
					this.requestPeriod(aRangeStart, oldStartDate, aItemFilter, aCount, false);
				}
				if (endChanged) {
					if (this.debug) this.logInfo("Enddate has changed to a later date. Requesting difference.");
					this.requestPeriod(oldEndDate, aRangeEnd, aItemFilter, aCount, true);
				}

				// We need to get the period which did not change from memorycache.
			}
			else {
				if (this.debug) this.logInfo("New time period. Requesting items in period.");
				this.requestPeriod(aRangeStart, aRangeEnd, aItemFilter, aCount, false);
			}
		}
	
		//Request server when calendar date changed  .
		if ((wantTodos) && (this.supportsTasks) && (startChanged || endChanged )) {
			if (this.debug) this.logInfo("Requesting tasks from exchange server.");
    			var self = this;
    			this.addToQueue( erFindTaskItemsRequest, 
					{user: this.user, 
					 mailbox: this.mailbox,
					 serverUrl: this.serverUrl,
					 folderBase: this.folderBase,
					 itemFilter: aItemFilter,
					 folderID: this.folderID,
					 changeKey: this.changeKey,
					 actionStart: Date.now() }, 
					function(erFindTaskItemsRequest, aIds) { self.findTaskItemsOK(erFindTaskItemsRequest, aIds);}, 
					function(erFindTaskItemsRequest, aCode, aMsg) { self.findTaskItemsError(erFindTaskItemsRequest, aCode, aMsg);},
					null);
    	    		
  	    	if	(!this.deactivateTaskFollowup) {
  				if (this.debug) this.logInfo("Requesting followup tasks from exchange server."); 
  	    		this.addToQueue( erFindFollowupItemsRequest, 
					{user: this.user, 
					 mailbox: this.mailbox,
					 serverUrl: this.serverUrl,
					 folderBase: "inbox",
					 itemFilter: aItemFilter,
					 folderID: this.folderID,
					 changeKey: this.changeKey,
					 actionStart: Date.now() }, 
					function(erFindFollowupItemsRequest, aIds) { self.findFollowupTaskItemsOK(erFindFollowupItemsRequest, aIds);}, 
					function(erFindFollowupItemsRequest, aCode, aMsg) { self.findFollowupTaskItemsError(erFindFollowupItemsRequest, aCode, aMsg);},
					null); 
  	    	}
		} 
    },

	getItemsFromMemoryCache: function _getItemsFromMemoryCache(aRangeStart, aRangeEnd, aItemFilter, aListener, aExporting)
	{
		if (this.debug) this.logInfo("getItemsFromMemoryCache startDate:"+aRangeStart+", endDate:"+aRangeEnd+", aListener:"+aListener+", aExporting:"+aExporting);
		var events = [];
		var tasks = [];

		var wantEvents = ((aItemFilter & Ci.calICalendar
			.ITEM_FILTER_TYPE_EVENT) != 0);

		var wantTodos = ((aItemFilter & Ci.calICalendar
			.ITEM_FILTER_TYPE_TODO) != 0);

		// This is by using the this.itemCacheByStartDate and this.itemCacheByEndDate index.
		if (wantEvents) {

			var startYear = aRangeStart.year;
			var startYearday = aRangeStart.yearday;

			var endYear = aRangeEnd.year;
			var endYearday = aRangeEnd.yearday;
			var doStop = false;
			var ids = {};
			while (!doStop) {
				if ((startYear == endYear) && (startYearday == endYearday)) {doStop = true;}

				if ((this.itemCacheByStartDate) && (this.itemCacheByStartDate[startYear]) && (this.itemCacheByStartDate[startYear][startYearday])) {
					for (var itemid in this.itemCacheByStartDate[startYear][startYearday]) {
						ids[itemid] = true;
					}
				}

				startYearday++;
				if (startYearday > 366) {
					startYear++;
					startYearday = 1;
				}
			}
	 
			for (var itemid in ids) {
				if (this.itemCacheById[itemid]) {
					if (isEvent(this.itemCacheById[itemid])) {			 
						if ( this.deleteCancelledInvitation && this.itemCacheById[itemid].isCancelled )  
						{ 	 
							events.push(this.itemCacheById[itemid]);  
							this.deleteItemCancelled(this.itemCacheById[itemid]);
					 
						}
						else
						{						
							events.push(this.itemCacheById[itemid]); 
						}
					}
				}
			}
		}
		else {
			if (wantTodos) {
				for (var index in this.itemCacheById) {
					if (isToDo(this.itemCacheById[index])) {  
						if ((this.deactivateTaskFollowup) && (this.itemCacheById[index].itemClass == "IPM.Note")){  
							//Do not change order or removing from local or it will throw db error
							//remove from offlinecache 
							this.removeFromOfflineCache(this.itemCacheById[index]);
 							//remove from lighting GUI  
							this.removeItemFromCache(this.itemCacheById[index]); 
						}
						else	{						
							if ( ((this.itemCacheById[index].isCompleted) && (aItemFilter & Ci.calICalendar.ITEM_FILTER_COMPLETED_YES)) ||
							     ((!this.itemCacheById[index].isCompleted) && (aItemFilter & Ci.calICalendar.ITEM_FILTER_COMPLETED_NO)) ) {
								tasks.push(this.itemCacheById[index]);
							}
						}
					}
				}
			}
		} 

		if (this.debug) this.logInfo("We got '"+events.length+"' events and  '"+tasks.length+"'  tasks from memory cache.");
		if (aListener) {
			if (this.debug) this.logInfo("We have a listener so going to inform it.(2)");
			if ((events.length > 0) && (wantEvents)) {
				aListener.onGetResult(this,
					     Cr.NS_OK,
					     Ci.calIEvent,
					     null,
					     events.length,
					     events);
			}
			
			if ((tasks.length > 0) && (wantTodos)) {
				aListener.onGetResult(this,
					     Cr.NS_OK,
					     Ci.calITodo,
					     null,
					     tasks.length,
					     tasks);
			}

			this.notifyOperationComplete(aListener,
			Cr.NS_OK,
			Ci.calIOperationListener.GET,
			null, null);
		}  
	},

	requestPeriod: function _requestPeriod(aStartDate, aEndDate, aItemFilter, aCount, findReverse, aUID)
	{
		if (this.debug) this.logInfo("Getting period from: "+aStartDate+" until "+aEndDate);
		//dump(this.name+": Getting period from: "+aStartDate+" until "+aEndDate+"\n");

/*      		var self = this;
		this.addToQueue( erFindCalendarItemsRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 serverUrl: this.serverUrl,
			 count: aCount,
			 rangeStart: aStartDate.clone(),
			 rangeEnd: aEndDate.clone(),
			 folderBase: this.folderBase,
			 itemFilter: aItemFilter,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 actionStart: Date.now() }, 
			function(erFindCalendarItemsRequest, aIds, aOccurrences) { self.findCalendarItemsOK(erFindCalendarItemsRequest, aIds, aOccurrences);}, 
			function(erFindCalendarItemsRequest, aCode, aMsg) { self.findCalendarItemsError(erFindCalendarItemsRequest, aCode, aMsg);},
			null);

		return;*/

		if (findReverse) {
			var endDate = aEndDate.clone();
			var startDate = endDate.clone();

			var offset = cal.createDuration();
			offset.weeks = -1;
			startDate.addDuration(offset);
			if ((aStartDate) && (startDate.compare(aStartDate) < 1)) {
				startDate = aStartDate.clone();
			}
		}
		else {
			var startDate = aStartDate.clone();
			var endDate = startDate.clone();

			var offset = cal.createDuration();
			offset.weeks = 1;
			endDate.addDuration(offset);
			if ((aEndDate) && (endDate.compare(aEndDate) > -1)) {
				endDate = aEndDate.clone();
			}
		}

		var self = this;
		var doStop = false;
		var stopNext = false;

		while (!doStop) {
			if (startDate.compare(endDate) != 0) {
				if (this.debug) this.logInfo("Getting period part of: "+startDate.toString()+" until "+endDate.toString());
				//dump(this.name+": Getting period part of: "+startDate.toString()+" until "+endDate.toString()+"\n");
				this.addToQueue( erFindCalendarItemsRequest, 
					{user: this.user, 
					 mailbox: this.mailbox,
					 serverUrl: this.serverUrl,
					 count: aCount,
					 rangeStart: startDate.clone(),
					 rangeEnd: endDate.clone(),
					 folderBase: this.folderBase,
					 itemFilter: aItemFilter,
					 folderID: this.folderID,
					 changeKey: this.changeKey,
					 actionStart: Date.now(),
					 uid: aUID }, 
					function(erFindCalendarItemsRequest, aIds, aOccurrences) { self.findCalendarItemsOK(erFindCalendarItemsRequest, aIds, aOccurrences);}, 
					function(erFindCalendarItemsRequest, aCode, aMsg) { self.findCalendarItemsError(erFindCalendarItemsRequest, aCode, aMsg);},
					null);
			}

			if (!stopNext) {
				if (findReverse) {
					endDate = startDate.clone();
					startDate.addDuration(offset);
					if ((aStartDate) && (startDate.compare(aStartDate) < 1)) {
						startDate = aStartDate.clone();
						stopNext = true;
					}
					if (!aStartDate) {
						doStop = true;
					}
				}
				else {
					startDate = endDate.clone();
					endDate.addDuration(offset);
					if ((aEndDate) && (endDate.compare(aEndDate) > -1)) {
						endDate = aEndDate.clone();
						stopNext = true;
					}
					if (!aEndDate) {
						doStop = true;
					}
				}
			}
			else {
				doStop = true;
			}			
		}
		if (this.debug) this.logInfo("Getting period done.");
	},

	//  calIOperation refresh();
	refresh: function _refresh() {

		if (this.debug) this.logInfo("refresh");
		if (this.shutdown) {
			if (this.debug) this.logInfo("Shutting down. So no refresh.");
			return;
		}

		if (((!this.syncState) && (!this.OnlyShowAvailability)) || (this.weAreSyncing)) {
			if (this.weAreSyncing) {
				if (this.debug) this.logInfo("weAreSyncing. So no refresh.");
			}	
	
	
	
			else {
				if (this.debug) this.logInfo("No syncState yet. So no refresh.");
			}
			return;
		} 
	
		if (this.isOffline) {
			if (this.debug) this.logInfo("We are offline. So no refresh.");
			return;
		}

		if (this._disabled) {
			if (this.debug) this.logInfo("We are disabled. So no refresh.");
			return;
		}
		
		if (!this.isInitialized) {	
			if (this.debug) this.logInfo("Not initialized yet. So no refresh.");
			return;
		} 

		//if (this.debug) this.logInfo("Refresh. We start a sync.");
		//var self = this;

		if (this.OnlyShowAvailability) {
			if (!this.lastValidRangeStart) this.lastValidRangeStart = aRangeStart.clone(); 
			this.getOnlyFreeBusyInformation(this.lastValidRangeStart, this.lastValidRangeEnd);
		}		
		else {
			this.getSyncState();
		}

		return;

	},

	//  void startBatch();
	startBatch: function _startBatch()
	{
		dump("Start batch\n");
	},

	//  void endBatch();
	endBatch: function _endBatch()
	{
		dump("End batch\n");
	},

// End calICalendar

// Begin calISchedulingSupport
	//  boolean isInvitation(in calIItemBase aItem);
	isInvitation: function _isInvitation(aItem, ignoreStatus)
	{
		try {
			var exchangeItem = aItem.QueryInterface(Ci.mivExchangeEvent);

			if (exchangeItem) {
				if (aItem.canModify) {
//dump("X-exchangeITIP1:"+aItem.getProperty("X-exchangeITIP1")+"\n");
//dump("X-exchangeITIP2:"+aItem.getProperty("X-exchangeITIP2")+"\n");
					return aItem.isInvitation;
				}
			}
		}
		catch(err){
		}

		return false;
	},

	// boolean canNotify(in AUTF8String aMethod, in calIItemBase aItem);
	canNotify: function _canNotify(aMethod, aItem)
	{
		if (this.debug) this.logInfo("canNotify: aMethod="+aMethod+":"+aItem.title);

		return true;
	},

	// calIAttendee getInvitedAttendee(in calIItemBase aItem);
	getInvitedAttendee: function _getInvitedAttendee(aItem)
	{
		//if (this.debug) this.logInfo("getInvitedAttendee 1:"+aItem.title);
		if (!aItem) {
			return;
		}

		// Parse through the attendees
		var attendees = aItem.getAttendees({});
		for each (var attendee in attendees) {
			if (this.debug) this.logInfo("getInvitedAttendee 2:"+attendee.id);
			if ((attendee.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()) ||
				(attendee.id.replace(/^exchangecalendar:/, '').toLowerCase() == this.mailbox.toLowerCase()) ) {
				if (this.debug) this.logInfo("getInvitedAttendee FOUND myself:"+aItem.title+", attendee.participationStatus:"+attendee.participationStatus+", aItem.myResponseType:"+aItem.myResponseType);
//				attendee.participationStatus = participationMap[aItem.myResponseType];
				return attendee; //.clone();
			}
			else {
				if (this.debug) this.logInfo("getInvitedAttendee FOUND someonelse:"+aItem.title+", attendee.id:"+attendee.id+", attendee.participationStatus:"+attendee.participationStatus);
			}
		}

		if (aItem.isInvitation) {
			if (this.debug) this.logInfo("getInvitedAttendee  X-IsInvitation = true");
			var tmpAttendee = cal.createAttendee();
			tmpAttendee.id = "mailto:"+this.mailbox;
			tmpAttendee.commonName = this.userDisplayName;
			tmpAttendee.rsvp = "FALSE";
			tmpAttendee.userType = "INDIVIDUAL";
			tmpAttendee.role = "REQ-PARTICIPANT";
			tmpAttendee.participationStatus = aItem.participationStatus;
			return tmpAttendee;
		}
		
		//dump("Did not find an attendee.!\n");

	},
// End calISchedulingSupport

// Begin calIFreeBusyProvider
	//    calIOperation getFreeBusyIntervals(in AUTF8String aCalId,
        //                               in calIDateTime aRangeStart,
        //                               in calIDateTime aRangeEnd,
        //                               in unsigned long aBusyTypes,
        //                               in calIGenericOperationListener aListener);

	getFreeBusyIntervals: function(aCalId, aRangeStart, aRangeEnd,
				       aBusyTypes, aListener)
	{
		if (this.debug) this.logInfo("getFreeBusyIntervals: " + aCalId + ", aBusyTypes:"+aBusyTypes+", aRangeStart:"+aRangeStart+", aRangeEnd:"+aRangeEnd);

		if (aCalId.indexOf("@") < 0 || aCalId.indexOf(".") < 0) {
            		// No valid email, screw it
			if (aListener) {
				aListener.onResult(null, null);
			}
			return;
		}

		var tmpStartDate = aRangeStart.clone();
		tmpStartDate.isDate = false;
		var tmpEndDate = aRangeEnd.clone();
		tmpEndDate.isDate = false;

		var self = this;
		this.addToQueue( erGetUserAvailabilityRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 email: aCalId.replace(/^mailto:/i, ""),
			 attendeeType: 'Required',
			 start: cal.toRFC3339(tmpStartDate.getInTimezone(this.globalFunctions.ecUTC())),
			 end: cal.toRFC3339(tmpEndDate.getInTimezone(this.globalFunctions.ecUTC())),
			 calId: aCalId,
			 folderID: this.folderID,
			 changeKey: this.changeKey }, 
			function(erGetUserAvailabilityRequest, aEvents) { self.getUserAvailabilityRequestOK(erGetUserAvailabilityRequest, aEvents);}, 
			function(erGetUserAvailabilityRequest, aCode, aMsg) { self.getUserAvailabilityRequestError(erGetUserAvailabilityRequest, aCode, aMsg);},
			aListener);

	},
// End calIFreeBusyProvider

// Begin calIItipTransport
	//    readonly attribute AUTF8String scheme;
	get scheme()
	{
		if (this.debug) this.logInfo("get scheme");
		return "";
	},

	//    attribute AUTF8String senderAddress;
	get senderAddress()
	{
		if (this.debug) this.logInfo("get senderAddress");
		return "hihi";
	},

	set senderAddress(aValue)
	{
		if (this.debug) this.logInfo("set senderAddress("+aValue+")");
	},

	//    readonly attribute AUTF8String type;
	//* IS DEFINED EARLIER AS PART OF calICalendar

    /**
     * Sends a calIItipItem to the recipients using the specified title and
     * alternative representation. If a calIItipItem is attached, then an ICS
     * representation of those objects are generated and attached to the email.
     * If the calIItipItem is null, then the item(s) is sent without any
     * text/calendar mime part.
     * @param count             size of recipient array
     * @param recipientArray    array of recipients
     * @param calIItipItem      set of calIItems encapsulated as calIItipItems
     */
	//    void sendItems(in PRUint32 count,
	//                   [array, size_is(count)] in calIAttendee recipientArray,
	//                   in calIItipItem item);
	sendItems: function _sendItems(count, recipientArray, item)
	{
		if (this.debug) this.logInfo("sendItems");
	},
// End calIItipTransport

	isRemoved: function _isRemoved(aItem)
	{
		if (!aItem) {
			return null;
		}

		if (this.debug) this.logInfo("isRemoved title:"+aItem.title+", status="+aItem.status);

		if (aItem.status == "") {
			return true;
		}

		return false;
	},

	getExceptions: function _getExceptions(aRecurrenceItems)
	{
		var tmpCount = 0;
		var exceptions = {};
		for each(var recurrenceItem in aRecurrenceItems) {
			tmpCount++;
			if (this.debug) this.logInfo("getExceptions: nr:"+tmpCount+", isNegative:"+recurrenceItem.isNegative);
			if (recurrenceItem.isNegative) {
				// A deletion is an exception and therefore isNegative === true
				var occurrences = recurrenceItem.getOccurrences(this.startDate, this.startDate, this.endDate, 0,  {});
				if (this.debug) this.logInfo("getExceptions: we have occurrences.length="+occurrences.length);
				for each(var occurrence in occurrences) {
					exceptions[occurrence.toString()] = occurrence;
				}				
			}
		}
		return exceptions;
	},

	getRemovedOccurrence: function _getRemovedOccurrence(aOldItem, aNewItem)
	{
		if (this.debug) this.logInfo("getRemovedOccurrence");

		// We first check if an occurrence was removed.
		var oldCount = {};
		var oldOccurrences = aOldItem.getOccurrences(oldCount);

		var newCount = {};
		var newOccurrences = aNewItem.getOccurrences(newCount);

		if (this.debug) this.logInfo("getRemovedOccurrence: oldCount.value="+oldCount.value);
		if (this.debug) this.logInfo("getRemovedOccurrence: newCount.value="+newCount.value);
		if (newCount.value > oldCount.value) {
			if (this.debug) this.logInfo("getRemovedOccurrence: We have less occurrences than before.");

			for each(var newOccurrence in newOccurrences) {
				var foundOld = false;
				for each(var oldOccurrence in oldOccurrences) {
					if (oldOccurrence.id == newOccurrence.id) {
						foundOld = true;
						break;
					}
				}
				if (foundOld == false) {
					if (this.debug) this.logInfo("getRemovedOccurrence: We found the removed occurrence: startdate:"+newOccurrence.startDate.toString());
					return newOccurrence;
				}
			}
		}

		// No occurrence was removed. We check the exceptions.
		var oldCount = {};
		var oldExceptions = aOldItem.getExceptions(oldCount);

		var newCount = {};
		var newExceptions = aNewItem.getExceptions(newCount);

		if (this.debug) this.logInfo("getRemovedOccurrence: oldCount.value="+oldCount.value);
		if (this.debug) this.logInfo("getRemovedOccurrence: newCount.value="+newCount.value);

		if (newCount.value > oldCount.value) {
			if (this.debug) this.logInfo("getRemovedOccurrence: We have less exceptions than before.");

			for each(var newException in newExceptions) {
				var foundOld = false;
				for each(var oldException in oldExceptions) {
					if (oldException.id == newException.id) {
						foundOld = true;
						break;
					}
				}
				if (foundOld == false) {
					if (this.debug) this.logInfo("getRemovedOccurrence: We found the removed exception: startdate:"+newException.startDate.toString());
					return newException;
				}
			}
		}

		if (this.debug) this.logInfo("getRemovedOccurrence: we DID NOT FIND our removed occurrence or exception");
		return null;
	},

	get prefs()
	{
		return this.mPrefs;
	},

	get exchangePrefVersion()
	{
		return this.globalFunctions.safeGetIntPref( this.prefs, "exchangePrefVersion", 0);
	},

	get isInitialized()
	{
		if (!this.id) {
			return false;
		}

		if (!this.mPrefs) {
			if (this.debug) this.logInfo("Found old version preferences. THIS IS A PROBLEM.");
			return false;
		}

		if (this.globalFunctions.safeGetBoolPref(this.prefs, "disabled", false)) {
			return false;
		}

		if (this.firstrun) {
			this.firstrun = false; 
			
			//Add Prvider for busy free information for  invite attendees etc.
			getFreeBusyService().addProvider(this);
			
			// The first thing we want to do is check the folderbase and folderpath for their id & changekey.
			// It might have changed between restarts.
			this.checkFolderPath();
 		 
/* Disabled as on startup we do not wish to use old syncstate until we get some offline caching implemented for this (2013-12-20)
			this.syncInboxState = this.globalFunctions.safeGetCharPref(this.prefs,"syncInboxState", "");
			if (this.syncInboxState != "") {
				this.saveToFile("syncInboxState.txt", this.syncInboxState);
				this.prefs.deleteBranch("syncInboxState");
			}
*/ 
			if (this.useOfflineCache) {
  					this.syncStateInbox = this.loadFromFile("syncStateInbox.txt"); 
  					this.prefs.deleteBranch("syncStateInbox");

 					this.syncState = this.loadFromFile("syncState.txt"); 
 					this.prefs.deleteBranch("syncState");  
			}
			
//			this.syncInboxState = this.loadFromFile("syncInboxState.txt");

			this.getSyncState();

			if ((this.isOffline) || ((this.useOfflineCache) && (this.syncState))) {
				this.firstSyncDone = true;
				if (this.debug) this.logInfo("First sync is done. Normal operation is starting.");

				while (this.getItemsSyncQueue.length > 0) {
					let getItemsReq = this.getItemsSyncQueue.shift();
					this.getItems(getItemsReq.itemFilter, getItemsReq.count, getItemsReq.rangeStart, getItemsReq.rangeEnd, getItemsReq.listener);
				}
				if (this.debug) this.logInfo("First sync is done. Processed getItemsSyncQueue.");
			}

			//dump(this.name+": Going to load testdata ("+this.id+")\n");
//			var testData = this.loadFromFile("testitem");
//			if (testData) {
//				var testJSON = xml2json.newJSON();
//				xml2json.parseXML(testJSON, testData);
//				var tmpItems = [testJSON[telements][0]];
//try{
//				this.updateCalendar(null, tmpItems, true, false);
//}catch(err){dump(this.name+": Testdata error:"+err+"\n");}
//				dump("Loaded testdata\n");
//			}
		}
		return true;

	},

	getCharPref: function(aName) {
		return this.globalFunctions.safeGetCharPref(this.prefs, aName, null);
	},

	setCharPref: function(aName, aValue) {
		if (this.prefs) {
			return this.prefs.setCharPref(aName, aValue);
		}
	},

	get user() {
		var username = this.globalFunctions.safeGetCharPref(this.prefs, "ecUser", "");
		if (username.indexOf("@") > -1) {
			return username;
		}
		else {
			if (this.domain == "") {
				return this.globalFunctions.safeGetCharPref(this.prefs, "ecUser", "");
			}
			else {
				return this.domain+"\\"+this.globalFunctions.safeGetCharPref(this.prefs, "ecUser", "");
			}
		}
	},

	set user(value) {
		if ((value.indexOf("\\") > -1) && (value.indexOf("@") == -1)) {
			this.domain = value.substr(0,value.indexOf("\\"));
			this.setCharPref("ecUser", value.substr(value.indexOf("\\")+1));
		}
		else {
			this.setCharPref("ecUser", value);
		}
	},

	get domain() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecDomain", "");
	},

	set domain(value) {
		return this.setCharPref("ecDomain", value);
	},

	get mailbox() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecMailbox", "");
	},

	get serverUrl() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecServer", "");
	},

	get userDisplayName() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecDisplayname", "");
	},

	get folderBase() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecFolderbase", "calendar");
	},

	get folderPath() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecFolderpath", "/");
	},

	get folderID() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecFolderID", null);
	},

	set folderID(aValue) {
		this.prefs.setCharPref("ecFolderID", aValue);
	},

	get changeKey() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecChangeKey", null);
	},

	set changeKey(aValue) {
		this.prefs.setCharPref("ecChangeKey", aValue);
	},

	get folderIDOfShare() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecFolderIDOfShare", "");
	},

	get isPublicFolder()
	{
		if (publicFoldersMap[this.folderBase]) {
			return true;
		}
		else {
			return false;
		}
	},

	get doPollInbox() {
		if (this.doReset) {
			return false;
		}

		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecPollInbox", true);
	},

	get pollInboxInterval() {
		return this.globalFunctions.safeGetIntPref(this.prefs, "ecPollInboxInterval", 180);
	},

	get doAutoRespondMeeting() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecAutoRespondMeetingRequest", false);
	},

	get autoResponseAnswer() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecAutoRespondAnswer", "TENTATIVE");
	},

	get doAutoRemoveInvitationCancelation1() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecAutoRemoveInvitationCancellation1", false);
	},

	get doAutoRemoveInvitationCancelation2() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecAutoRemoveInvitationCancellation2", false);
	},

	get doAutoRemoveInvitationResponse1() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecAutoRemoveInvitationResponse1", true);
	},

	get sendAutoRespondMeetingRequestMessage() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecSendAutoRespondMeetingRequestMessage", false);
	},

	get autoRespondMeetingRequestMessage() {
		return this.globalFunctions.safeGetCharPref(this.prefs, "ecAutoRespondMeetingRequestMessage", "");
	},

	get cacheStartupBefore() {
		return this.globalFunctions.safeGetIntPref(null, "extensions.1st-setup.cache.startupBefore", 30, true);
	},

	get cacheStartupAfter() {
		return this.globalFunctions.safeGetIntPref(null, "extensions.1st-setup.cache.startupAfter", 30, true);
	},

	get startCacheDate() {
		var aDate = cal.now();
		var tmpDur = cal.createDuration();
		tmpDur.hours = -1 * 24 * this.cacheStartupBefore;
		aDate.addDuration(tmpDur);
		if (this.debug) this.logInfo("startCacheDate:"+aDate.toString());
		return aDate
	},

	get endCacheDate() 
	{
		var aDate = cal.now();
		var tmpDur = cal.createDuration();
		tmpDur.hours = 1 * 24 * this.cacheStartupAfter;
		aDate.addDuration(tmpDur);
		if (this.debug) this.logInfo("endCacheDate:"+aDate.toString());
		return aDate
	},
	
	get deleteCancelledInvitation() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecautoprocessingdeletecancelleditems", true);
	},
	
	get deactivateTaskFollowup() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "followup.task.deactivate", false);
	},
	
	get markEventasTentative() {
		return this.globalFunctions.safeGetBoolPref(this.prefs, "ecautoprocessingmarkeventtentative", false);
	},

	checkInbox: function _checkInbox()
	{
		if (this.debug) this.logInfo("checkInbox 1.");

		if (this.isOffline) return;

		if ((this.weAreInboxSyncing) || (!this.doPollInbox) || (this.OnlyShowAvailability)) {
			return;
		}

		this.weAreInboxSyncing = true;
		var self = this;

		//if (this.debug) this.logInfo("checkInbox 2.");
		this.addToQueue( erSyncInboxRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 serverUrl: this.serverUrl,
			 folderBase: 'inbox',
			 folderID: null,
			 changeKey: null,
			 syncState: this.syncInboxState,
			 actionStart: Date.now() }, 
			function(erSyncInboxRequest, creations, updates, deletions, syncState) { self.syncInboxOK(erSyncInboxRequest, creations, updates, deletions, syncState);}, 
			function(erSyncInboxRequest, aCode, aMsg) { self.syncInboxError(erSyncInboxRequest, aCode, aMsg);},
			null);
	},

	syncInbox: function _syncInbox()
	{
		if (this.debug) this.logInfo("syncInbox 1.");

		if (this.isOffline) return;

		if ((this.folderBase != "calendar") || (this.folderID)) {
			if (this.debug) this.logInfo("syncInbox 2.");
			return;
		}

		if ((this.weAreInboxSyncing) || (!this.doPollInbox) || (this.OnlyShowAvailability)) {
			if (this.debug) this.logInfo("syncInbox 3.");
			return;
		}

		this.inboxPoller.cancel();

		var self = this;
		this.weAreInboxSyncing = true;

		//if (this.debug) this.logInfo("syncInbox 2.");
		this.addToQueue( erSyncInboxRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 serverUrl: this.serverUrl,
			 folderBase: 'inbox',
			 folderID: null,
			 changeKey: null,
			 syncState: this.syncInboxState,
			 actionStart: Date.now() }, 
			function(erSyncInboxRequest, creations, updates, deletions, syncState) { self.syncInboxOK(erSyncInboxRequest, creations, updates, deletions, syncState);}, 
			function(erSyncInboxRequest, aCode, aMsg) { self.syncInboxError(erSyncInboxRequest, aCode, aMsg);},
			null);
	},

	removeMeetingItem: function _removeMeetingItem(aRequestItem)
	{
		var self = this;

		if (this.debug) this.logInfo("Going to remove meetingItem:"+aRequestItem.title);
		this.addToQueue( erDeleteItemRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: 'inbox',
			 serverUrl: this.serverUrl,
			 item: null,
			 folderID: null,
			 id: aRequestItem.id,
			 changeKey: aRequestItem.changeKey,
			 itemType: "meeting"}, 
			function(erDeleteItemRequest) { self.removeMeetingItemOk(erDeleteItemRequest);}, 
			function(erDeleteItemRequest, aCode, aMsg) { self.removeMeetingItemError(erDeleteItemRequest, aCode, aMsg);},
			null);
	},

	removeResponseItem: function _removeResponseItem(aResponse)
	{
		var self = this;

//		if (this.debug) this.logInfo("Going to remove responseItem:"+xml2json.getAttributeByTag(aResponse, "t:Subject")+" from:"+aResponse.getTag("t:Sender").getTag("t:Mailbox").getTagValue("t:Name")+" ("+aResponse.getTag("t:Sender").getTag("t:Mailbox").getTagValue("t:EmailAddress")+")");
		if (this.debug) this.logInfo("Going to remove responseItem:"+xml2json.getAttributeByTag(aResponse, "t:Subject"));
		this.addToQueue( erDeleteItemRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: 'inbox',
			 serverUrl: this.serverUrl,
			 item: null,
			 folderID: null,
			 id: xml2json.getAttributeByTag(aResponse, "t:ItemId", "Id"),
			 changeKey: xml2json.getAttributeByTag(aResponse, "t:ItemId", "ChangeKey"),
			 itemType: "response"}, 
			function(erDeleteItemRequest) { self.removeMeetingItemOk(erDeleteItemRequest);}, 
			function(erDeleteItemRequest, aCode, aMsg) { self.removeMeetingItemError(erDeleteItemRequest, aCode, aMsg);},
			null);
	},

	removeMeetingItemOk: function _removeMeetingItemOk(erDeleteItemRequest)
	{
		this.notConnected = false;
		this.saveCredentials(erDeleteItemRequest.argument);
		if (this.debug) this.logInfo("removeItemOk: "+erDeleteItemRequest.argument.itemType);

	},

	removeMeetingItemError: function _removeMeetingItemError(erDeleteItemRequest, aCode, aMsg)
	{
		this.saveCredentials(erDeleteItemRequest.argument);
		this.notConnected = true;
		if (this.debug) this.logInfo("removeItemError: "+erDeleteItemRequest.argument.itemType+" msg:"+String(aMsg));
	},

	syncInboxOK: function _syncInboxOK(erSyncInboxRequest, creations, updates, deletions, syncState)
	{
		if (this.debug) this.logInfo("syncInboxOk.");
		this.notConnected = false;
		this.saveCredentials(erSyncFolderItemsRequest.argument);

		if ((creations.meetingrequests.length > 0) || (updates.meetingrequests.length > 0) || (deletions.meetingrequests.length > 0)) {
			this.addActivity(calGetString("calExchangeCalendar", "syncInboxRequests", [creations.meetingrequests.length, updates.meetingrequests.length, deletions.meetingrequests.length, this.name], "exchangecalendar"), "", erSyncInboxRequest.argument.actionStart, Date.now());
			this.refresh();
		}

		if ((creations.meetingCancellations.length > 0) || (updates.meetingCancellations.length > 0) || (deletions.meetingCancellations.length > 0)) {
			this.addActivity(calGetString("calExchangeCalendar", "syncInboxCancelations", [creations.meetingCancellations.length, updates.meetingCancellations.length, deletions.meetingCancellations.length, this.name], "exchangecalendar"), "", erSyncInboxRequest.argument.actionStart, Date.now());
			this.refresh();
		}

		if ((creations.meetingResponses.length > 0) || (updates.meetingResponses.length > 0) || (deletions.meetingResponses.length > 0)) {
			this.addActivity(calGetString("calExchangeCalendar", "syncInboxResponses", [creations.meetingResponses.length, updates.meetingResponses.length, deletions.meetingResponses.length, this.name], "exchangecalendar"), "", erSyncInboxRequest.argument.actionStart, Date.now());
			this.refresh();
		}

		// Do something with the output.
		if ((this.syncInboxState) && (syncState == this.syncInboxState)) {
			this.logError("Same syncState received.");
		}

		this.syncInboxState = syncState;
		//this.prefs.setCharPref("syncInboxState", syncState);
		this.saveToFile("syncInboxState.txt", syncState);

		if ((creations.meetingrequests.length == 0) && (updates.meetingrequests.length == 0) && (deletions.meetingrequests.length == 0) && 
			(creations.meetingCancellations.length == 0) && (updates.meetingCancellations.length == 0) && (deletions.meetingCancellations.length == 0) && 
			(creations.meetingResponses.length == 0) && (updates.meetingResponses.length == 0) && (deletions.meetingResponses.length == 0)) {
			if (this.debug) this.logInfo("syncInboxOk: No new, changed or deleted meetingrequests, meetingCancellations and meetingresponses.");
			this.weAreInboxSyncing = false;
			this.startSyncInboxPoller();

			return;
		}

		// Do something with the results.
//		if (this.debug) this.logInfo("syncInboxOK meetingrequests: Creation:"+creations.meetingrequests.length+", Updates:"+updates.meetingrequests.length+", Deletions:"+deletions.meetingrequests.length);
//		if (this.debug) this.logInfo("syncInboxOK meetingCancellations: Creation:"+creations.meetingCancellations.length+", Updates:"+updates.meetingCancellations.length+", Deletions:"+deletions.meetingCancellations.length);

		// Save requests into cache.
		if (creations.meetingrequests.length > 0) {
			for each (var request in creations.meetingrequests) {
				var meetingItem = this.convertExchangeAppointmentToCalAppointment(request, true);
				if (meetingItem) {
					if (this.debug) this.logInfo(" -- MeetingRequest creation:"+ meetingItem.title+", UID:"+meetingItem.uid+",id:"+meetingItem.id+",changeKey:"+meetingItem.changeKey);
					meetingItem.setProperty("X-MEETINGREQUEST", true);
					meetingItem.setProperty("STATUS", "NONE")
					//this.meetingRequestsCache[request.getTagValue("t:UID")] = meetingItem;
					this.meetingRequestsCache[meetingItem.id] = meetingItem;
				}
			}
		}

		if (updates.meetingrequests.length > 0) {
			for each (var update in updates.meetingrequests) {
				var meetingItem = this.convertExchangeAppointmentToCalAppointment(update, true);
				if (meetingItem) {
					if (this.debug) this.logInfo(" -- MeetingRequest update:"+ meetingItem.title+", UID:"+meetingItem.uid+",id:"+meetingItem.id+",changeKey:"+meetingItem.changeKey);
					meetingItem.setProperty("X-MEETINGREQUEST", true);
				
					if ((this.meetingRequestsCache[update.id]) && (this.meetingRequestsCache[update.id].uid == meetingItem.uid)) {
						if (this.debug) this.logInfo("2 modifing  meeting request:"+update.id);
	//					this.meetingRequestsCache[update.getTagValue("t:UID")] = meetingItem;
						this.meetingRequestsCache[meetingItem.id] = meetingItem;
					}
					else {
						if (this.debug) this.logInfo("WE DO NOT HAVE AN MEETING IN CACHE FOR THIS UPDATE!!!!. PLEASE REPORT");
					}
				}
			}
		}

		if (deletions.meetingrequests.length > 0) {
			for each (var deletion in deletions.meetingrequests) {
				var meetingItem = this.convertExchangeAppointmentToCalAppointment(deletion, true);
				if (meetingItem) {
					if (this.debug) this.logInfo(" -- MeetingRequest deletion:"+ meetingItem.title+", UID:"+meetingItem.uid+",id:"+meetingItem.id+",changeKey:"+meetingItem.changeKey);
					meetingItem.setProperty("X-MEETINGREQUEST", true);
					this.removeFromMeetingRequestCache(deletion.id);			
					this.meetingrequestAnswered[deletion.id] = false;
				}
			}
		}

		// Save cancelations into cache and remove request for which we received a cancelation.
		if (creations.meetingCancellations.length > 0) {
			for each (var request in creations.meetingCancellations) {
				var cancelItem = this.convertExchangeAppointmentToCalAppointment(request, true);
				if (cancelItem) {
					if (this.debug) this.logInfo(" -- MeetingCancelation creation:"+ cancelItem.title+", UID:"+cancelItem.uid+",id:"+cancelItem.id+",changeKey:"+cancelItem.changeKey);
					cancelItem.setProperty("X-MEETINGCANCELATION", true);
					this.meetingCancelationsCache[request.id] = cancelItem;
				}
			}
		}

		if (updates.meetingCancellations.length > 0) {
			for each (var update in updates.meetingCancellations) {
				var cancelItem = this.convertExchangeAppointmentToCalAppointment(update, true);
				if (cancelItem) {
					cancelItem.setProperty("X-MEETINGCANCELATION", true);
					if (this.meetingCancelationsCache[update.id].uid == cancelItem.uid) {
						this.meetingCancelationsCache[update.id] = meetingItem;
					}
					else {
						if (this.debug) this.logInfo("WE DO NOT HAVE A MEETING IN CACHE FOR THIS UPDATE!!!!. PLEASE REPORT");
					}
				}
			}
		}

		if (deletions.meetingCancellations.length > 0) {
			for each (var deletion in deletions.meetingCancellations) {
				delete this.meetingCancelationsCache[deletion.id];
			}
		}

		var requestCount = 0;
		var cancelationCount = 0;
		var tmpInCalendarCache = {};
		for each (var index in this.meetingRequestsCache) {
			if (index) {
				// Remove request for which we have an calendaritem which is confirmed
				var tmpID = index.id;
				var tmpUID = index.uid;
				var inCalendar = null;

				// First check recurring Masters
				if (this.recurringMasterCache[tmpUID]) {
					inCalendar = this.recurringMasterCache[tmpUID];
				}

				// Check single items
				if (!inCalendar) {
					for each (var item in this.itemCacheById) {
						if ((item) && (item.uid == tmpUID)) {
							inCalendar = item;
							break;
						}
					}
				}				
				
				var confirmed = false;

				// We turn this off for now (10-12-2011) This so meeting update items in mailbox are not removed.
				/*if (inCalendar) {
					//if (this.debug) this.logInfo("request '"+inCalendar.title+"' allready in Calendar with status="+inCalendar.getProperty("STATUS"));
					//var newItem = 
					confirmed = (inCalendar.getProperty("STATUS") != "NONE");
					tmpInCalendarCache[tmpUID] = inCalendar;
				}*/

				if (confirmed) {	
					// Remove request. Meeting is in calendar and confirmed.
					this.removeMeetingItem(index);
					this.removeFromMeetingRequestCache(tmpID);
					//this.meetingRequestsCache[tmpUID] = null;
					this.meetingrequestAnswered[tmpID] = false;
				}
				else {
					// Keep this request
					requestCount++;
					//if (this.debug) this.logInfo("meetingRequest:"+index.getTagValue("t:Subject"));

					// This is a new request. Check if we should autorespond.
					if (!this.meetingrequestAnswered[tmpID]) {
						this.meetingrequestAnswered[tmpID] = false;
					}

					if ((this.doAutoRespondMeeting) && (this.meetingrequestAnswered[tmpID] === false)) {

						var bodyText = null;
						if (this.sendAutoRespondMeetingRequestMessage) {
							bodyText = this.autoRespondMeetingRequestMessage;
							this.addActivity(calGetString("calExchangeCalendar", "sendAutoRespondMeetingRequestMessage", [index.title, this.name], "exchangecalendar"), "", Date.now(), Date.now());

						}

						if (inCalendar) {
							//var aItem = inCalendar.clone();
							var aItem = this.cloneItem(inCalendar);
							this.sendMeetingRespons(aItem, null, "existing", this.autoResponseAnswer, bodyText);
						}
						else {
							//var aItem = index.clone();
							var aItem = this.cloneItem(index);
							this.sendMeetingRespons(aItem, null, "existing", this.autoResponseAnswer, bodyText); // TODO: might have to set new
						}
						this.meetingrequestAnswered[tmpID] = true;
					}
				}

				// We turn this off for now (10-12-2011) This so meeting update items in mailbox are not removed.
/*				if (inCalendar) {
					// remove our cached request from calendar otherwise it will appear twice.
					this.notifyTheObservers("onDeleteItem", [index]);
					this.removeFromMeetingRequestCache(tmpUID);
					//this.meetingRequestsCache[tmpUID] == null;
					this.meetingrequestAnswered[tmpUID] = false;
				}*/
			}
		}
		
		for each (var index in this.meetingCancelationsCache) {
			if (index) {
				// Remove cancelation for which we do not have an calendaritem.
				var tmpID = index.id;
				var tmpUID = index.uid;
				var inCalendar = false;

				// First check recurring Masters
				if (this.recurringMasterCache[tmpUID]) {
					inCalendar = this.recurringMasterCache[tmpUID];
				}

				// Check single items
				if (!inCalendar) {
					for each (var item in this.itemCacheById) {
						if ((item) && (item.uid == tmpUID)) {
							inCalendar = item;
							break;
						}
					}
				}				

				// Check meetingrequest cache
				var inCache = false;					
				if (!inCalendar) {
					inCalendar = this.meetingRequestsCache[tmpID];
					if (inCalendar) {
						// We have a cancellation and a request but no item in the calendar
						inCache = true;
					}
				}
	
				if (inCalendar) {	
					// Keep this cancelation if it is allready confirmed. Or remove it when we we have it only in cache.
					if (((inCalendar.getProperty("STATUS") == "NONE") && (this.doAutoRemoveInvitationCancelation1)) ||
						(inCache)) {
						// We have an calendaritem for this cancelation but it is not yet confirmed.
						// We remove the cancelation and the meetingitem if it is not in cache
						// and user specified this in the EWS settings.
						if (inCache) {
							// We remove it from the cache
							if (this.meetingRequestsCache[tmpID]) {
								this.removeMeetingItem(this.meetingRequestsCache[tmpID]);
								this.removeFromMeetingRequestCache(tmpID);
								//this.meetingRequestsCache[tmpUID] = null;
							}
							this.removeMeetingItem(index);
							this.notifyTheObservers("onDeleteItem", [inCalendar]);
							this.removeFromMeetingRequestCache(tmpID);
							//this.meetingRequestsCache[tmpUID] = null;
							this.meetingrequestAnswered[tmpID] = false;
							delete this.meetingCancelationsCache[tmpID];
						}
						else {
							// We remove it from the real calendar.
							this.removeMeetingItem(index);
							this.deleteItem(inCalendar);
						}
					}
					else {
						if (! inCalendar.isCancelled) {
							if (!this.doAutoRemoveInvitationCancelation2) {
								// It is in calendar and allready confirmed. We update the current calendaritem.
								// Change title of current calendaritem.
								//var newItem = inCalendar.clone();
								var newItem = this.cloneItem(inCalendar);
								newItem.setProperty("X-IsCancelled", true);
								newItem.title = index.title;
								// Set status in calendar as free.
								newItem.setProperty("TRANSP", "TRANSPARENT");
								if (inCache) {
									this.notifyTheObservers("onModifyItem", [newItem, inCalendar]);
									this.meetingRequestsCache[tmpID] = newItem;
								}
								else {
									this.modifyItem(inCalendar, newItem, null);
								}
								cancelationCount++;
							}
							else {
								// Remove calendar item and cancellation message
								// because user specified so in the EWS settings.
								// We remove it from the real calendar and in the inbox.
								this.addActivity(calGetString("calExchangeCalendar", "autoRemoveConfirmedInvitationOnCancellation", [inCalendar.title, this.name], "exchangecalendar"), "", Date.now(), Date.now());
								inCalendar.setProperty("X-IsCancelled", true);
								this.deleteItem(inCalendar);
								this.removeMeetingItem(index);
								this.removeFromMeetingRequestCache(tmpID);
								//this.meetingRequestsCache[tmpUID] = null;
							}
						}
						delete this.meetingCancelationsCache[tmpID];
						if (this.debug) this.logInfo("meetingCancelation:"+index.title);
					}
				}
				else {
					// Meeting is not in calendar yet. We remove it if user specified it
					// as a setting in EWS settings.
					if (this.doAutoRemoveInvitationCancelation1) {
						if (this.meetingRequestsCache[tmpID]) {
							this.removeMeetingItem(this.meetingRequestsCache[tmpID]);
							this.removeFromMeetingRequestCache(tmpID);
							//this.meetingRequestsCache[tmpUID] = null;
						}
						this.removeMeetingItem(index);
						delete this.meetingCancelationsCache[tmpID];
					}
				}
			}
		}

		// Process Meetingresponses
		// Save responses into cache and remove request for which we received a cancelation.
		for each (var response in creations.meetingResponses) {
			this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")] = response;
		}

		for each (var response in updates.meetingResponses) {
			if (this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")]) {
				this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")] = response;
			}
			else {
				if (this.debug) this.logInfo("WE DO NOT HAVE A RESPONSE IN CACHE FOR THIS UPDATE!!!!. PLEASE REPORT");
			}
		}

		for each (var response in deletions.meetingResponses) {
			if (this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")]) {
				delete this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")];
			}
		}


		if (this.doAutoRemoveInvitationResponse1) {
			for each(var response in this.meetingResponsesCache) {
				// Check if we have this meeting 
				var tmpUID = xml2json.getTagValue(response, "t:UID");
				var inCalendar = false;

				// First check recurring Masters
				if (this.recurringMasterCache[tmpUID]) {
					inCalendar = this.recurringMasterCache[tmpUID];
				}

				// Check single items
				if (!inCalendar) {
					for each (var item in this.itemCacheById) {
						if ((item) && (item.uid == tmpUID)) {
							inCalendar = item;
							break;
						}
					}
				}

				if (inCalendar) {
					// Check if we are the organiser of this item.
					var iAmOrganizer = ((inCalendar.organizer) && (inCalendar.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()));
					if (!iAmOrganizer) {
						// Remove the response in the inbox. Do not update calendar.
						this.removeResponseItem(response);
						delete this.meetingResponsesCache[xml2json.getAttributeByTag(response, "t:ItemId","Id")];
					}
				}				
			}
		}

		this.weAreInboxSyncing = false;

		if ((requestCount > 0) || (cancelationCount > 0)) {
			this.refresh();
		}

		if (this.debug) this.logInfo("syncInboxOK: left with meetingRequests:"+requestCount+", meetingCancelations:"+cancelationCount);

		this.startSyncInboxPoller();
	},

	startSyncInboxPoller: function _startSyncInboxPoller()
	{
		if (!this.doPollInbox) {
			return;
		}

		this.inboxPoller.cancel();
	        let self = this;
		this.inboxPoller.initWithCallback({ notify: function setTimeout_notify() {self.syncInbox();	}}, this.pollInboxInterval * 1000, this.inboxPoller.TYPE_REPEATING_SLACK);
	},

	syncInboxError: function _syncInboxError(erSyncFolderItemsRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("syncInboxError");
		this.saveCredentials(erSyncFolderItemsRequest.argument);
		this.notConnected = true;
		this.weAreInboxSyncing = false;
		//this.processItemSyncQueue();
		
		this.startSyncInboxPoller();
	},

	doAvailability: function _doAvailability(aCalId, aCi)
	{
		const x = Ci.calIFreeBusyInterval;

		const types = {
			"Free" 		: x.FREE,
			"Tentative"	: x.BUSY_TENTATIVE,
			"Busy"		: x.BUSY,
			"OOF"		: x.BUSY_UNAVAILABLE,
			"NoData"	: x.UNKNOWN
		};

		var start = null;
		if (xml2json.getTagValue(aCi, "t:StartTime", null)) {
			if (this.isVersion2007) {
				start = cal.fromRFC3339(xml2json.getTagValue(aCi, "t:StartTime", null), this.globalFunctions.ecUTC());
			}
			else {
				start = cal.fromRFC3339(xml2json.getTagValue(aCi, "t:StartTime", null), this.globalFunctions.ecDefaultTimeZone());
			}
		}

		var end = null;
		if (xml2json.getTagValue(aCi, "t:EndTime", null)) {
			if (this.isVersion2007) {
				end = cal.fromRFC3339(xml2json.getTagValue(aCi, "t:EndTime", null), this.globalFunctions.ecUTC());
			}
			else {
				end = cal.fromRFC3339(xml2json.getTagValue(aCi, "t:EndTime", null), this.globalFunctions.ecDefaultTimeZone());
			}
		}

//		var start = this.tryToSetDateValue(aCi.getTagValue("t:StartTime"));
//		var end   = this.tryToSetDateValue(aCi.getTagValue("t:EndTime"));
		var type  = types[xml2json.getTagValue(aCi, "t:BusyType")];
		return new cal.FreeBusyInterval(aCalId, type,
					       	  start, end);
	},

	md5: function _md5(aString)
	{

		if (!aString) {
			return "";
		}

		var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
		    createInstance(Ci.nsIScriptableUnicodeConverter);
		 
		// we use UTF-8 here, you can choose other encodings.
		converter.charset = "UTF-8";
		// result is an out parameter,
		// result.value will contain the array length
		var result = {};
		// data is an array of bytes
		var data = converter.convertToByteArray(aString, result);
		var ch = Cc["@mozilla.org/security/hash;1"]
				   .createInstance(Ci.nsICryptoHash);
		ch.init(ch.MD5);
		ch.update(data, data.length);
		return ch.finish(true);
	},

	getUserAvailabilityRequestOK: function _getUserAvailabilityRequestOK(erGetUserAvailabilityRequest, aEvents)
	{
		this.notConnected = false;
		if (this.debug) this.logInfo("getUserAvailabilityRequestOK: aEvents.length:"+aEvents.length+", this.folderIsNotAvailable:"+this.folderIsNotAvailable);
		this.saveCredentials(erGetUserAvailabilityRequest.argument);

		var items = new Array();
		if (this.OnlyShowAvailability) {
			this.updateCalendar(erGetUserAvailabilityRequest, aEvents, true, false, false);
			aEvents = null;
			erGetUserAvailabilityRequest = null;
		}
		else {
			for (var index in aEvents) {
				var item = this.doAvailability(erGetUserAvailabilityRequest.argument.calId, aEvents[index]);
				items.push(item);
			}
		
			if (erGetUserAvailabilityRequest.listener) {
				erGetUserAvailabilityRequest.listener.onResult(null, items);
			}
		}
	},
	
	getUserAvailabilityRequestError: function _getUserAvailabilityRequestError(erGetUserAvailabilityRequest, aCode, aMsg)
	{
		this.saveCredentials(erGetUserAvailabilityRequest.argument);

		if (aCode != -7) {
			this.notConnected = true;
		}

		if (this.OnlyShowAvailability) {
			if (this.debug) this.logInfo("getUserAvailabilityRequestError: this.OnlyShowAvailability:"+this.OnlyShowAvailability);
			this.OnlyShowAvailability = false;
		}
		else {
			if (erGetUserAvailabilityRequest.listener) {
				erGetUserAvailabilityRequest.listener.onResult(null, null);
			}
		}
	},

	resetCalendar: function _resetCalendar()
	{
		if (this.debug) this.logInfo(" resetCalendar 1a");

		try {

		// Clean the job queue.
		this.loadBalancer.clearQueueForCalendar(this.serverUrl, this);
		this.loadBalancer.stopRunningJobsForCalendar(this.serverUrl, this);

		this.offlineQueue = [];

		this.doReset = true;

		this.resetStart = Date.now();

		this.inboxPoller.cancel();

		if (this.offlineTimer) {
			this.offlineTimer.cancel();
		}
		this.offlineTimer = null;

		if (this.calendarPoller) {
			this.calendarPoller.cancel();
		}

//dump("\resetCalendar\n");
			var myAuthPrompt2 = Cc["@1st-setup.nl/exchange/authprompt2;1"].getService(Ci.mivExchangeAuthPrompt2);
			myAuthPrompt2.removeUserCanceled(this.serverUrl);
		}catch(err) { dump("\n EROROR:"+err+"\n"); }

		if (this.getProperty("disabled")) {
			// Remove all items in cache from calendar.
			if (this.debug) this.logInfo("Calendar is disabled. So we are done resetting.");
			for (var index in this.itemCacheById) {
				if (this.itemCacheById[index]) {
					this.notifyTheObservers("onDeleteItem", [this.itemCacheById[index]]);
				}
			}
			this.doReset = false;
		}
		else {
			this.performReset();
		}
	},

	performReset: function _performReset()
	{
		if (this.debug) this.logInfo(" performReset 1");

		if (!this.doReset) {
			return;
		}

		this.doReset = false;

		// Clean the job queue again.
		this.loadBalancer.clearQueueForCalendar(this.serverUrl, this);

		this.loadBalancer.stopRunningJobsForCalendar(this.serverUrl, this);

		this.offlineQueue = [];

		// Now we can initialize.
		this.syncState = null;
		//this.prefs.deleteBranch("syncState");
		this.removeFile("syncState.txt");
		if(this.folderBase=="tasks"){
			this.syncStateInbox = null;  
			this.removeFile("syncStateInbox.txt"); 
		}
		this.weAreSyncing = false;
		this.firstSyncDone = false;
		
		// Remove all items in cache from calendar.
		//this.observers.notify("onStartBatch");
		for (var index in this.itemCacheById) {
			if (this.itemCacheById[index]) {
				this.notifyTheObservers("onDeleteItem", [this.itemCacheById[index]]);
				/*if (this.itemCacheById[index].className) {
					this.itemCacheById[index].deleteItem();
				}
				this.itemCacheById[index] = null;
				delete this.itemCacheById[index];*/
				this.removeItemFromCache(this.itemCacheById[index]);

			}
		}
		//this.observers.notify("onEndBatch");

		// Reset caches.
		this.itemCacheById = {};
		this.itemCacheByStartDate = {};
		this.itemCacheByEndDate = {};

		for (var index in this.recurringMasterCache) {
			if (this.recurringMasterCache[index]) {
				this.recurringMasterCache[index].deleteItem();
				this.recurringMasterCache[index] = null;
				delete this.recurringMasterCache[index];
			}
		}
		this.recurringMasterCache = {};
		this.recurringMasterCacheById = {};

		if (this.startDate) {
			var oldBeginDate = this.startDate.clone();
		}
		else {
			if (this.debug) this.logInfo(" THIS IS STRANGE beginDate");
			var oldBeginDate = now();
		}
		if (this.endDate) {
			var oldEndDate = this.endDate.clone();
		}
		else {
			if (this.debug) this.logInfo(" THIS IS STRANGE endDate");
			var oldEndDate = now();
		}

		this.startDate = null;
		this.endDate = null;
	
		// Reload calendar on currently known dateRanges.
		for (var index in this.meetingRequestsCache) {
			if (this.meetingRequestsCache[index]) {
				this.notifyTheObservers("onDeleteItem", [this.meetingRequestsCache[index]]);
				this.removeFromMeetingRequestCache(index);
				//this.meetingRequestsCache[index] = null;
				this.meetingrequestAnswered[index] = false;
			}
		}
		this.meetingRequestsCache = [];
		this.meetingCancelationsCache = [];
		this.meetingrequestAnswered = [];
		this.meetingResponsesCache = [];
		this.syncInboxState = null;
		//this.prefs.deleteBranch("syncInboxState");
		this.removeFile("syncInboxState.txt");
		this.weAreInboxSyncing = false;

		this.supportsTasks = false;
		this.supportsEvents = false;

		//this.mUseOfflineCache = null;

		this.firstrun = true;

		this.performStartup();

		if (this.debug) this.logInfo("oldBeginDate:"+oldBeginDate.toString()+", oldEndDate:"+oldEndDate.toString());
		this.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_TODO +
				Ci.calICalendar.ITEM_FILTER_TYPE_EVENT
				, 0, oldBeginDate, oldEndDate, null);

		// Make an event for thistory.
		this.addActivity(calGetString("calExchangeCalendar", "resetEventMessage", [this.name], "exchangecalendar"), "", this.resetStart, Date.now());
		if (this.debug) this.logInfo(" performReset 2");
	},

	addActivity: function _addActivity(aTitle, aText, aStartDate, aEndDate)
	{
		if (!gActivityManager) {
			return;
		}

		let event = Cc["@mozilla.org/activity-event;1"].createInstance(nsIAE);  
  
		event.init(aTitle,  
		           null,   
		           aText,   
		           aStartDate,     
		           aEndDate);          
  
		gActivityManager.addActivity(event);
	},

	makeRecurrenceRule: function _makeRecurrenceRule(aItem, e)
	{
		if (!aItem.parentItem) {
			return;
		}

		if (!aItem.recurrenceInfo || aItem.parentItem.id != aItem.id) {
			if (!aItem.recurrenceInfo) {
				if (this.debug) this.logInfo("makeRecurrenceRule: We have no recurrenceInfo");
			}
			if (aItem.parentItem.id != aItem.id) {
				if (this.debug) this.logInfo("makeRecurrenceRule: We have aItem.parentItem.id != aItem.id");
			}
			return;
		}

		var rrule = null;
		for each (var ritem in aItem.recurrenceInfo.getRecurrenceItems({})) {
			if (calInstanceOf(ritem, Ci.calIRecurrenceRule)) {
				rrule = ritem;
if (this.debug) this.logInfo(" ;;;; rrule:"+rrule.icalProperty.icalString);
				//break;
			}
		}

		if (!rrule) {
			// XXX exception?
			if (this.debug) this.logInfo("makeRecurrenceRule: We have no rrule");
			return;
		}

		var r = e.addChildTag("Recurrence", "nsTypes", null);

		/* can't get parameters of RRULEs... have to do it manually :/ */
		var prop = {};
		for each (let ps in rrule.icalProperty.value.split(';')) {
			let m = ps.split('=');
			prop[m[0]] = m[1];
		}

		var startDate;
		var originalDate;
		if (isEvent(aItem)) {
			startDate = aItem.startDate.clone();
			originalDate = aItem.startDate.clone();
		}
		else {
			if (aItem.entryDate) {
				startDate = aItem.entryDate.clone();
				startDate.isDate = false;
				originalDate = aItem.entryDate.clone();
			}
		}

		if (startDate) {
			var startDate = startDate.clone();
		}
		else {
			var startDate = cal.now();
		}
		startDate.isDate = true;
	
		prop["BYMONTHDAY"] = prop["BYMONTHDAY"] || startDate.day;
		prop["BYMONTH"] = prop["BYMONTH"] || (startDate.month + 1);

		switch (rrule.type) {
		case 'YEARLY':
			if (prop["BYDAY"]) {
				var m = prop["BYDAY"].match(/^(-?\d)(..)$/);
				var ryr = r.addChildTag("RelativeYearlyRecurrence", "nsTypes", null);
				ryr.addChildTag("DaysOfWeek", "nsTypes", dayRevMap[m[2]]);
				ryr.addChildTag("DayOfWeekIndex", "nsTypes", dayRevMap[m[1]]);
				ryr.addChildTag("Month", "nsTypes", monthIdxMap[prop["BYMONTH"] - 1]);
			} else {
				var ayr = r.addChildTag("AbsoluteYearlyRecurrence", "nsTypes", null);
				ayr.addChildTag("DayOfMonth", "nsTypes", prop["BYMONTHDAY"]);
				ayr.addChildTag("Month", "nsTypes", monthIdxMap[prop["BYMONTH"] - 1]);
			}
			break;
		case 'MONTHLY':
			if (prop["BYDAY"]) {
				var rmr = r.addChildTag("RelativeMonthlyRecurrence", "nsTypes", null);				
				rmr.addChildTag("Interval", "nsTypes", rrule.interval);
				var m = prop["BYDAY"].match(/^(-?\d)(..)$/);
				rmr.addChildTag("DaysOfWeek", "nsTypes", dayRevMap[m[2]]);
				rmr.addChildTag("DayOfWeekIndex", "nsTypes", weekRevMap[m[1]]);
			} else {
				var amr = r.addChildTag("AbsoluteMonthlyRecurrence", "nsTypes", null);
				amr.addChildTag("Interval", "nsTypes", rrule.interval);
				amr.addChildTag("DayOfMonth", "nsTypes", prop["BYMONTHDAY"]);
			}
			break;
		case 'WEEKLY':
			var wr = r.addChildTag("WeeklyRecurrence", "nsTypes", null);
			wr.addChildTag("Interval", "nsTypes", rrule.interval);
			var days = [];
			var daystr = prop["BYDAY"] || dayIdxMap[startDate.weekday];
			for each (let day in daystr.split(",")) {
				days.push(dayRevMap[day]);
			}
			wr.addChildTag("DaysOfWeek", "nsTypes", days.join(' '));
			break;
		case 'DAILY':
			if (prop["BYDAY"]) {
				var wr = r.addChildTag("WeeklyRecurrence", "nsTypes", null);
				wr.addChildTag("Interval", "nsTypes", rrule.interval);
				var days = [];
				var daystr = prop["BYDAY"];
				for each (let day in daystr.split(",")) {
					days.push(dayRevMap[day]);
				}
				wr.addChildTag("DaysOfWeek", "nsTypes", days.join(' '));
			}
			else {
				var dr = r.addChildTag("DailyRecurrence", "nsTypes", null);
				dr.addChildTag("Interval", "nsTypes", rrule.interval);
			}
			break;
		}

		if (isEvent(aItem)) {
			var startDateStr = cal.toRFC3339(startDate.getInTimezone(this.globalFunctions.ecUTC()));
//			var startDateStr = cal.toRFC3339(originalDate.getInTimezone(this.globalFunctions.ecUTC()));
		}
		else {
			// We make a non-UTC datetime value for this.globalFunctions.
			// EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
			//LOG("  ==== tmpStart:"+cal.toRFC3339(tmpStart));
			var startDateStr = cal.toRFC3339(startDate).substr(0, 19); //cal.toRFC3339(tmpStart).length-6);
		}

		if (rrule.isByCount && rrule.count != -1) {
			var nr = r.addChildTag("NumberedRecurrence", "nsTypes", null);
			nr.addChildTag("StartDate", "nsTypes", startDateStr);
			nr.addChildTag("NumberOfOccurrences", "nsTypes", rrule.count);
		} else if (!rrule.isByCount && rrule.untilDate) {

			var endDate = rrule.untilDate.clone();
			if (isEvent(aItem)) {
				endDate.isDate = true;
				var endDateStr = cal.toRFC3339(endDate.getInTimezone(this.globalFunctions.ecUTC()));
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
			var edr = r.addChildTag("EndDateRecurrence", "nsTypes", null);
			edr.addChildTag("StartDate", "nsTypes", startDateStr);
			edr.addChildTag("EndDate", "nsTypes", endDateStr);
		} else {
			var ner = r.addChildTag("NoEndRecurrence", "nsTypes", null);
			ner.addChildTag("StartDate", "nsTypes", startDateStr);
		}

		/* We won't write WKST/FirstDayOfWeek for now because it is Exchange 2010 and up */
	},

	getAlarmTime: function _getAlarmTime(aItem)
	{
		if (!aItem) {
			return null;
		}

		var alarms = aItem.getAlarms({});		
		var alarm = alarms[0];		
		if (!alarm) {
			return null;
		}

		switch (alarm.related) {
		case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
			var alarmTime = alarm.alarmDate;
			break;
		case Ci.calIAlarm.ALARM_RELATED_START:
			if (isEvent(aItem)) {
				var alarmTime = aItem.startDate.clone();
			}
			else {
				var alarmTime = aItem.entryDate.clone();
			}
			alarmTime.addDuration(alarm.offset);
			break;
		case Ci.calIAlarm.ALARM_RELATED_END:
			if (isEvent(aItem)) {
				var alarmTime = aItem.endDate.clone();
			}
			else {
				var alarmTime = aItem.dueDate.clone();
			}
			alarmTime.addDuration(alarm.offset);
			break;
		}

		alarmTime = alarmTime.getInTimezone(cal.UTC());

		return alarmTime;
	},

	getSingleSnoozeState: function _getSingleSnoozeState(e, aSingle)
	{
		if (this.debug) this.logInfo("getSingleSnoozeState");
		var tmpStr = null;
		var mozSnooze = aSingle.getProperty("X-MOZ-SNOOZE-TIME");
		if (mozSnooze) {
			if (aSingle.alarmLastAck) {
				// We have a X-MOZ-SNOOZE and an alarmLastAck. We are going to check if the LastAck is before the X-MOZ-SNOOZE or after
				if (this.debug) this.logInfo("We have a X-MOZ-SNOOZE and an alarmLastAck. We are going to check if the LastAck is before the X-MOZ-SNOOZE or after.");

				// if mozSnooze < alarmLastAck it means the last alarm has been Acked and it was a dismiss.
				// if mozSnooze >= alarmLastAck it means the last alarm was snoozed to a new alarm time in the future.
				var tmpMozSnooze = cal.createDateTime(mozSnooze);
				if (tmpMozSnooze.compare(aSingle.alarmLastAck) == -1) {
					if (this.debug) this.logInfo("The X-MOZ-SNOOZE is before alarmLastAck. The alarm has been dismissed.");
					tmpStr = "4501-01-01T00:00:00Z";
				}
				else {
					if (this.debug) this.logInfo("The X-MOZ-SNOOZE is after or equal to alarmLastAck. The alarm has been snoozed.");
					tmpStr = mozSnooze;
				}
			}
			else {
				// We have a X-MOZ-SNOOZE and no alarmLastAck. This means we use the X-MOZ-SNOOZE as the next reminder time.
				if (this.debug) this.logInfo("We have a X-MOZ-SNOOZE and no alarmLastAck. This means no snooze or dismiss yet and we use the X-MOZ-SNOOZE as the next reminder time.");
				tmpStr = mozSnooze;
			}
		}
		else {
			if (aSingle.alarmLastAck) {
				// The alarm has been snoozed or dismissed before and we do not have a X-MOZ-SNOOZE. So it is dismissed.
				if (this.debug) this.logInfo("The alarm has been snoozed or dismissed before and we do not have a X-MOZ-SNOOZE. So it is dismissed.");
				tmpStr = "4501-01-01T00:00:00Z";
			}
			else {
				// We have no snooze time and no alarmLastAck this means the alarm was never snoozed or dismissed
				// We set the next reminder to the alarm time.
				if (this.getAlarmTime(aSingle)) {
					if (this.debug) this.logInfo("We have no snooze time and no alarmLastAck this means the alarm was never snoozed or dismissed. We set the next reminder to the alarm time.");
					tmpStr = this.getAlarmTime(aSingle).icalString;
				}
				else {
					if (this.debug) this.logInfo("We have no snooze time and no alarmLastAck this means the alarm was never snoozed or dismissed AND we have no alarm time skipping PidLidReminderSignalTime.");
					tmpStr = null;
				}
			}
		}

		if (tmpStr) {
			if (this.debug) this.logInfo("We have a new PidLidReminderSignalTime:"+tmpStr);
			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSignalTime);
			extField.setAttribute("PropertyType", "SystemTime");

			var newSnoozeTime = cal.createDateTime(tmpStr);
			newSnoozeTime = newSnoozeTime.getInTimezone(cal.UTC());
			eprop.addChildTag("Value", "nsTypes", cal.toRFC3339(newSnoozeTime));
		}

		if (this.debug) this.logInfo("getSingleSnoozeState END");
		return tmpStr;
	},

	getMasterSnoozeStates: function _getMasterSnoozeStates(e, aMaster, aItem)
	{
		if (this.debug) this.logInfo("getMasterSnoozeStates");
		var tmpStr = "";

		if ((aItem) && (aMaster)) {
			if (this.debug) this.logInfo("getMasterSnoozeStates: We have an item (occurrence/exception) and a master.");
			if (aMaster.hasProperty("X-MOZ-SNOOZE-TIME-"+aItem.recurrenceId.nativeTime)) {
				tmpStr = aMaster.getProperty("X-MOZ-SNOOZE-TIME-"+aItem.recurrenceId.nativeTime);
				if (this.debug) this.logInfo("getMasterSnoozeStates: Master has a X-MOZ-SNOOZE-TIME value for this occurrence. startDate:"+aItem.startDate.icalString+", X-MOZ-SNOOZE-TIME:"+tmpStr);
				
				// What value does alarmLastAck has?? This will determine what to send to 
			}
			else {
				if (this.debug) this.logInfo("getMasterSnoozeStates: Master has NO X-MOZ-SNOOZE-TIME value for this occurrence. startDate:"+aItem.startDate.icalString);

				// If alarmLastAck for this item is null then the item was dismissed.
				tmpStr = "";
			}
		}
		else {
			if (aMaster) {
				if (this.debug) this.logInfo("getMasterSnoozeStates: We only have a master and no item. We are going to see if a X-MOZ-SNOOZE-TIME- is set for a child event.");

				// We need to get the event for which the alarm is active.
				var props = aMaster.propertyEnumerator;
				while (props.hasMoreElements()) {
					var prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty);
					if (prop.name.indexOf("X-MOZ-SNOOZE-TIME-") == 0) {
						if (this.debug) this.logInfo("getMasterSnoozeStates: "+prop.name+"="+prop.value);
						tmpStr = prop.value;
						if (this.debug) this.logInfo("getMasterSnoozeStates2: Master has a X-MOZ-SNOOZE-TIME- value. "+prop.name+":"+tmpStr);
						break;
					}
				}

				if (tmpStr == "") {
					if (this.debug) this.logInfo("We did not find a X-MOZ-SNOOZE-TIME- for one of the children.");

					// Nothing smoozed we are going to set it to the next alarm.
					if (this.debug) this.logInfo("We did not find a childEvent by using the X-MOZ-SNOOZE-TIME-. We are going to find the child by the alarmLastAck of the Master. alarmLastAck:"+aMaster.alarmLastAck);
					if (aMaster.alarmLastAck) {
						if (this.debug) this.logInfo("Master has an alarmLastAck. We set the alarm to the first child with an alarm after alarmLastAck.");
						var prevTime = aMaster.alarmLastAck.clone();
					}
					else {
						if (this.debug) this.logInfo("Master has no alarmLastAck. We set the alarm to the first child with an alarm in the future.");
						var prevTime = cal.createDateTime().getInTimezone(cal.UTC());
					}

					var childEvent = null;

					if (this.debug) this.logInfo("Trying to find a child event with an alarmdate after '"+prevTime.icalString+"'");
					var childAlarm = cal.createDateTime("4501-01-01T00:00:00Z");
					for (var index in this.itemCacheById) {
						if ((this.itemCacheById[index]) && (this.itemCacheById[index].uid == aMaster.uid)) {
							var newChildAlarm = this.getAlarmTime(this.itemCacheById[index]);
							if ((newChildAlarm) && (newChildAlarm.compare(prevTime) == 1)) {
								if (childAlarm.compare(newChildAlarm) == 1) {
									childAlarm = newChildAlarm.clone();
									childEvent = this.itemCacheById[index];
									if (this.debug) this.logInfo("Found child event for which the alarmdate ("+childAlarm.icalString+") is set after '"+prevTime.icalString+"'");
								}
							}
						}
					}
					if ((childAlarm) && (childEvent)) {
						if (this.debug) this.logInfo("Found a child and we are going to calculate the alarmLastAck based on it.");
						tmpStr = this.getAlarmTime(childEvent);
						if (tmpStr) {
							tmpStr = tmpStr.icalString;
							if (this.debug) this.logInfo("This child has the following alarm:"+tmpStr);
						}
						else {
							tmpStr = "";
							if (this.debug) this.logInfo("Did not find an alarm time for the child. This is strange..!!");
						}

					}
					else {
						if (this.debug) this.logInfo("We did not find a child. Unable to set alarmLastAck... Maybe set it to 4501-01-01T00:00:00Z");
						tmpStr = "4501-01-01T00:00:00Z";
					}
				}
			}
			else {
				if (this.debug) this.logInfo("Only an item was specified. This is odd this should never happen. Bailing out.");
				return;
			}
		}

		if (tmpStr != "") {
			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);

			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSignalTime);
			extField.setAttribute("PropertyType", "SystemTime");
			
			var newSnoozeTime = cal.createDateTime(tmpStr);
			newSnoozeTime = newSnoozeTime.getInTimezone(cal.UTC());
			eprop.addChildTag("Value", "nsTypes", cal.toRFC3339(newSnoozeTime));
		}
		if (this.debug) this.logInfo("getMasterSnoozeStates END");
		return tmpStr;
	},

	getAlarmLastAck: function _getAlarmLastAck(e, aItem)
	{
		if (this.debug) this.logInfo("getAlarmLastAck");
		var tmpStr = "";
		return tmpStr;
	},

	addSnoozeDismissState: function _addSnoozeDismissState(e, aItem, aAlarmTime)
	{
		// Check if we have a single item or not
		var tmpStr = this.getAlarmLastAck(e, aItem);

		if (this.debug) this.logInfo("addSnoozeDismissState: Start1");

		if (aAlarmTime) {
			if (this.debug) this.logInfo("addSnoozeDismissState: item has alarms");

			var tmpDateTime;
			var nextReminder = "";

			if ((aItem.id != aItem.parentItem.id) && (aItem.parentItem.recurrenceInfo)) {
				if (this.debug) this.logInfo("addSnoozeDismissState: Occurrence or Exception");
				// Find out which one got snoozed/dismisses
				tmpStr = tmpStr + this.getMasterSnoozeStates(e, aItem.parentItem, aItem);
			}
			else {
				if (aItem.recurrenceInfo) {
					if (this.debug) this.logInfo("addSnoozeDismissState: Master");
					tmpStr = tmpStr + this.getMasterSnoozeStates(e, aItem, null);
				}
				else {
					if (this.debug) this.logInfo("addSnoozeDismissState: Single");
					nextReminder = this.getSingleSnoozeState(e, aItem)
					tmpStr = tmpStr + nextReminder;
				}

			}

			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);

			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSet);
			extField.setAttribute("PropertyType", "Boolean");
		//	if (nextReminder.indexOf("4501-01-01T00:00:00Z") > -1) {
				// Reminder is turned off.
		//		eprop.nsTypes::Value = "false";
		//	}
		//	else {
				eprop.addChildTag("Value", "nsTypes", "true");
		//	}
		}
		else {
			if (this.debug) this.logInfo("addSnoozeDismissState: item has no alarms");

			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSet);
			extField.setAttribute("PropertyType", "Boolean");
			eprop.addChildTag("Value", "nsTypes", "false");
		}

		if (this.debug) this.logInfo("addSnoozeDismissState: End:"+tmpStr);

		return tmpStr;
	},

	convertCalAppointmentToExchangeAppointment: function _convertCalAppointmentToExchangeAppointment(aItem, aAction, isNew)
	{
		if (!aAction) {
			aAction = "modify";
		}

		// The order in which create items are specified is important.
		// EWS expects the right order.

		var e = this.globalFunctions.xmlToJxon('<nsTypes:CalendarItem xmlns:nsTypes="'+nsTypesStr+'" xmlns:nsMessages="'+nsMessagesStr+'"/>');

		e.addChildTag("Subject", "nsTypes", aItem.title);

		const privacies = { "PUBLIC": "Normal",
				"CONFIDENTIAL": "Confidential", 
				"PRIVATE" : "Private",
				null: "Normal" };
		
		if (privacies[aItem.privacy] == undefined) {
			e.addChildTag("Sensitivity", "nsTypes", "Normal");
		}
		else {
			e.addChildTag("Sensitivity", "nsTypes", privacies[aItem.privacy]);
		}

		//var body = e.addChildTag("Body", "nsTypes", aItem.getProperty('DESCRIPTION') || "");
		if (aItem.bodyType == "HTML" ) {
			var body = e.addChildTag("Body", "nsTypes", "<html>"+aItem.body+"</html>" || "");
			body.setAttribute("BodyType", "HTML");
		}
		else {
			var body = e.addChildTag("Body", "nsTypes", aItem.getProperty('DESCRIPTION') || "");
			body.setAttribute("BodyType", "Text");
		}

		var categories = aItem.getCategories({});
		var categoriesTag = e.addChildTag("Categories", "nsTypes", null);
		for each (var category in categories) {
			categoriesTag.addChildTag("String", "nsTypes", category);
		}
	
		var importance = "Normal";
		if (aItem.priority > 5) {
			importance = "Low";
		}
		if (aItem.priority == 5) {
			importance = "Normal";
		}
		if (aItem.priority < 5) {
			importance = "High";
		}
		if (aItem.priority == 0) {
			importance = "Normal";
		}
		e.addChildTag("Importance", "nsTypes", importance);

		// Precalculate right start and end time for exchange.
		// If not timezone specified set them to the lightning preference.
//		if ((aItem.startDate.timezone.isFloating) && (!aItem.startDate.isDate)) {
		if (aItem.startDate.timezone.isFloating) {
			aItem.startDate = aItem.startDate.getInTimezone(this.globalFunctions.ecDefaultTimeZone());
		}

//		if ((aItem.endDate.timezone.isFloating) && (!aItem.endDate.isDate)) {
		if (aItem.endDate.timezone.isFloating) {
			aItem.endDate = aItem.endDate.getInTimezone(this.globalFunctions.ecDefaultTimeZone());
		}

		var tmpStart = aItem.startDate.clone();
		var tmpEnd = aItem.endDate.clone();

		if (aItem.startDate.isDate) {
			tmpStart.isDate = false;
			tmpEnd.isDate = false;
			var tmpDuration = cal.createDuration();
			tmpDuration.minutes = -1;
			tmpEnd.addDuration(tmpDuration);

			// We make a non-UTC datetime value for this.globalFunctions.
			// EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
			var exchStart = cal.toRFC3339(tmpStart.getInTimezone(this.globalFunctions.ecUTC())).substr(0, 19)+"Z"; //cal.toRFC3339(tmpStart).length-6);
			var exchEnd = cal.toRFC3339(tmpEnd.getInTimezone(this.globalFunctions.ecUTC())).substr(0, 19)+"Z"; //cal.toRFC3339(tmpEnd).length-6);
		}
		else {
			// We set in bias advanced to UCT datetime values for this.globalFunctions.
			var exchStart = cal.toRFC3339(tmpStart.getInTimezone(cal.UTC()));
			var exchEnd = cal.toRFC3339(tmpEnd.getInTimezone(cal.UTC()));
		}

		var alarms = aItem.getAlarms({});
		if (this.debug) this.logInfo("We have '"+alarms.length+"' alarms.");
		if (alarms.length > 0) {

			// Exchange alarm is always an offset to the start.
			switch (alarms[0].related) {
			case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
				if (this.debug) this.logInfo("ALARM_RELATED_ABSOLUTE we are going to calculate a offset from the start.");
				var newAlarmTime = alarms[0].alarmDate.clone();

				// Calculate offset from start of item.
				var offset = newAlarmTime.subtractDate(aItem.startDate);
				break;
			case Ci.calIAlarm.ALARM_RELATED_START:
				if (this.debug) this.logInfo("ALARM_RELATED_START this is easy exchange does the same.");
				var newAlarmTime = aItem.startDate.clone();
				var offset = alarms[0].offset.clone();
				break;
			case Ci.calIAlarm.ALARM_RELATED_END:
				if (this.debug) this.logInfo("ALARM_RELATED_END we are going to calculate the offset from the start.");
				var newAlarmTime = aItem.endDate.clone();
				newAlarmTime.addDuration(alarms[0].offset);

				var offset = newAlarmTime.subtractDate(aItem.startDate);
				break;
			}
	
			e.addChildTag("ReminderIsSet", "nsTypes", "true");
			if (offset.inSeconds != 0) {
				e.addChildTag("ReminderMinutesBeforeStart", "nsTypes", String((offset.inSeconds / 60) * -1));
			}
			else {
				e.addChildTag("ReminderMinutesBeforeStart", "nsTypes", "0");
			}

		}
		else {
			e.addChildTag("ReminderIsSet", "nsTypes", "false");
		}

		// An imported item alreay could have a snooze time set.
		if (aItem.hasProperty("X-MOZ-SNOOZE-TIME")) {
			//dump("Item is snoozed. Going to set the snooze time\n");
			var newSnoozeTime = cal.createDateTime(aItem.getProperty("X-MOZ-SNOOZE-TIME"));
			newSnoozeTime = newSnoozeTime.getInTimezone(cal.UTC());
			const MAPI_PidLidReminderSignalTime = "34144";

			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSignalTime);
			extField.setAttribute("PropertyType", "SystemTime");
			eprop.addChildTag("Value", "nsTypes", cal.toRFC3339(newSnoozeTime));

		}

		if (aItem.uid) {
			e.addChildTag("UID", "nsTypes", aItem.uid);
		}
		else {
// TODO: Check if this is still valid..
			if (aItem.id) {
				// This is when we accept and an iTIP
				e.addChildTag("UID", "nsTypes", aItem.id);
				//aItem.setProperty("X-UID", aItem.id);
				if (aItem.currenceInfo) {
					if (this.debug) this.logInfo("we have recurrence info");
					//aItem.setProperty("X-CalendarItemType", "RecurringMaster");
					this.recurringMasterCache[aItem.id] = aItem;
					this.recurringMasterCacheById[aItem.id] = aItem;
				}
				else {
					//aItem.setProperty("X-CalendarItemType", "Single");
				}
			}
		}

		const freeBusy = { "TRANSPARENT": "Free",
				  "OPAQUE": "Busy",
				  null: "Busy" };

		const attendeeStatus = {
			"NEEDS-ACTION"	: "Unknown",
			"TENTATIVE"	: "Tentative",
			"ACCEPTED"	: "Accept",
			"DECLINED"	: "Decline",
			null		: "Unknown"
		};

		if (!this.isInvitation(aItem, true)) {
			if (this.debug) this.logInfo("convertCalAppointmentToExchangeAppointment: Item is not an invitation.\n");
			e.addChildTag("Start", "nsTypes", exchStart);
			e.addChildTag("End", "nsTypes", exchEnd);

			e.addChildTag("IsAllDayEvent", "nsTypes", aItem.startDate.isDate);
	
			e.addChildTag("LegacyFreeBusyStatus", "nsTypes", freeBusy[aItem.getProperty("TRANSP")]);
	
			e.addChildTag("Location", "nsTypes", aItem.getProperty("LOCATION") || "");

			var attendees = aItem.getAttendees({});
			var ae;
			
			for each (var attendee in attendees) {
//dump("attendee.role:"+attendee.role+"\n");
				switch (attendee.role) {
				case "REQ-PARTICIPANT":
					if (!reqAttendees) {
						var reqAttendees = e.addChildTag("RequiredAttendees", "nsTypes", null);
					}
					ae = reqAttendees.addChildTag("Attendee", "nsTypes", null);
					break;
				case "OPT-PARTICIPANT":
					if (!optAttendees) {
						var optAttendees = e.addChildTag("OptionalAttendees", "nsTypes", null);
					}
					ae = optAttendees.addChildTag("Attendee", "nsTypes", null);
					break;
				case "CHAIR":
/*					if (!tmpOrganizer) {
						var tmpOrganizer = e.addChildTag("Organizer", "nsTypes", null);
					}
					ae = tmpOrganizer;
					break;*/ // Sadly this is not posible when we create a new item.
				default:
					ae = null;
				}

				if (ae) {
					var mailbox = ae.addChildTag("Mailbox", "nsTypes", null);
					mailbox.addChildTag("Name", "nsTypes", attendee.commonName);

					var tmpEmailAddress = attendee.id.replace(/^mailto:/i, '');
					if (tmpEmailAddress.indexOf("@") > 0) {
						mailbox.addChildTag("EmailAddress", "nsTypes", tmpEmailAddress);
					}
					else {
						mailbox.addChildTag("EmailAddress", "nsTypes", "unknown@somewhere.com");
					}
					if (attendee.role != "CHAIR") {
						ae.addChildTag("ResponseType", "nsTypes", attendeeStatus[attendee.participationStatus]);
					}
				}
			}

			this.makeRecurrenceRule(aItem, e);
	
			if (this.isVersion2007) {
				e.addChildTag("MeetingTimeZone", "nsTypes", null).setAttribute("TimeZoneName", this.getEWSTimeZoneId(tmpStart.timezone, tmpStart));
			}
			else {
				e.addChildTag("StartTimeZone", "nsTypes", null).setAttribute("Id", this.getEWSTimeZoneId(tmpStart.timezone, tmpStart));
				e.addChildTag("EndTimeZone", "nsTypes", null).setAttribute("Id", this.getEWSTimeZoneId(tmpEnd.timezone, tmpEnd));
			}

		}
		else {
			if (this.debug) this.logInfo("convertCalAppointmentToExchangeAppointment: Item is an invitation.\n");

			//return e;
			
			if ((aItem.hasProperty("X-exchangeITIP1")) && (aItem.getProperty("X-exchangeITIP1") == "true")) {
				if (this.debug) this.logInfo("This is a message which came from an import or an copy/paste operation or is an invitation from an external party outside our Exchange.");

				e.addChildTag("Start", "nsTypes", exchStart);
				e.addChildTag("End", "nsTypes", exchEnd);

				e.addChildTag("IsAllDayEvent", "nsTypes", aItem.startDate.isDate);
	
				e.addChildTag("LegacyFreeBusyStatus", "nsTypes", freeBusy[aItem.getProperty("TRANSP")]);
					
				e.addChildTag("Location", "nsTypes", aItem.getProperty("LOCATION") || "");

				// Set if the item is from the user itself or not.
				if (aItem.organizer) {
					if (aItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()) {
						if (this.debug) this.logInfo(" ## I am the organizer of this meeting.");
					}
					else {
						if (this.debug) this.logInfo(" ## I am NOT the organizer of this meeting.'"+aItem.organizer.id.replace(/^mailto:/i, '')+"' is the organizer.");
					}
				}
				else {
					if (this.debug) this.logInfo(" ## There is not organizer for this meeting.");
				}
		

				this.makeRecurrenceRule(aItem, e);
	
				if (this.isVersion2007) {
					e.addChildTag("MeetingTimeZone", "nsTypes", null).setAttribute("TimeZoneName", this.getEWSTimeZoneId(tmpStart.timezone, tmpStart));
				}
				else {
					e.addChildTag("StartTimeZone", "nsTypes", null).setAttribute("Id", this.getEWSTimeZoneId(tmpStart.timezone, tmpStart));
					e.addChildTag("EndTimeZone", "nsTypes", null).setAttribute("Id", this.getEWSTimeZoneId(tmpEnd.timezone, tmpEnd));
				}

			}
		}

		if (this.debug) this.logInfo("convertCalAppointmentToExchangeAppointment: "+String(e));

		return e;
	},

	convertCalTaskToExchangeTask: function _convertCalTaskToExchangeTask(aItem, aAction)
	{
		if (!aAction) {
			aAction = "modify";
		}

		var e = this.globalFunctions.xmlToJxon('<nsTypes:Task xmlns:nsTypes="'+nsTypesStr+'" xmlns:nsMessages="'+nsMessagesStr+'"/>');

		e.addChildTag("Subject", "nsTypes", aItem.title);

		const privacies = { "PUBLIC": "Normal",
				"CONFIDENTIAL": "Confidential", 
				"PRIVATE" : "Private",
				null: "Normal" };
		if (!aItem.privacy) {
			e.addChildTag("Sensitivity", "nsTypes", "Normal");
		}
		else {
			e.addChildTag("Sensitivity", "nsTypes", privacies[aItem.privacy]);
		}

		//var body = e.addChildTag("Body", "nsTypes", aItem.getProperty('DESCRIPTION') || "");
		if (aItem.bodyType == "HTML" ) {
			var body = e.addChildTag("Body", "nsTypes", "<html>"+aItem.body+"</html>" || "");
			body.setAttribute("BodyType", "HTML");
		}
		else {
			var body = e.addChildTag("Body", "nsTypes", aItem.getProperty('DESCRIPTION') || "");
			body.setAttribute("BodyType", "Text");
		}


		var categories = aItem.getCategories({});
		var categoriesTag = null;
		for each (var category in categories) {
			if (categoriesTag == null) {
				categoriesTag = e.addChildTag("Categories", "nsTypes", null);
			}
			categoriesTag.addChildTag("String", "nsTypes", category);
		}
	
		var importance = "Normal";
		if (aItem.priority > 5) {
			importance = "Low";
		}
		if (aItem.priority == 5) {
			importance = "Normal";
		}
		if (aItem.priority < 5) {
			importance = "High";
		}
		if (aItem.priority == 0) {
			importance = "Normal";
		}
		e.addChildTag("Importance", "nsTypes", importance);
		 
		var alarms = aItem.getAlarms({});
		if (this.debug) this.logInfo("We have '"+alarms.length+"' alarms.");
		if (alarms.length > 0) {

			// Exchange alarm for task is always an absolute date and time.
			switch (alarms[0].related) {
			case Ci.calIAlarm.ALARM_RELATED_ABSOLUTE:
				if (this.debug) this.logInfo("ALARM_RELATED_ABSOLUTE.");
				var newAlarmTime = alarms[0].alarmDate.clone().getInTimezone(cal.UTC());
				break;
			case Ci.calIAlarm.ALARM_RELATED_START:
				if (this.debug) this.logInfo("ALARM_RELATED_START we are going to calculate the absolute.");
				var newAlarmTime = aItem.entryDate.clone();
				newAlarmTime.addDuration(alarms[0].offset);
				break;
			case Ci.calIAlarm.ALARM_RELATED_END:
				if (this.debug) this.logInfo("ALARM_RELATED_END we are going to calculate the absolute.");
				var newAlarmTime = aItem.dueDate.clone();
				newAlarmTime.addDuration(alarms[0].offset);
				break;
			}
	
			e.addChildTag("ReminderDueBy", "nsTypes", cal.toRFC3339(newAlarmTime));
			e.addChildTag("ReminderIsSet", "nsTypes", "true");
		}
		else {
			e.addChildTag("ReminderIsSet", "nsTypes", "false");
		}


/*		// Delegation changes
		if (aItem.hasProperty("X-exchWebService-PidLidTaskLastUpdate")) {
			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Task");
			extField.setAttribute("PropertyId", "33045");
			extField.setAttribute("PropertyType", "SystemTime");
			eprop.addChildTag("Value", "nsTypes", aItem.getProperty("X-exchWebService-PidLidTaskLastUpdate"));
		}

		if (aItem.hasProperty("X-exchWebService-PidLidTaskHistory")) {
			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Task");
			extField.setAttribute("PropertyId", "33050");
			extField.setAttribute("PropertyType", "Integer");
			eprop.addChildTag("Value", "nsTypes", aItem.getProperty("X-exchWebService-PidLidTaskHistory"));
		}

		if (aItem.hasProperty("X-exchWebService-PidLidTaskAccepted")) {
			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Task");
			extField.setAttribute("PropertyId", "33032");
			extField.setAttribute("PropertyType", "Boolean");
			eprop.addChildTag("Value", "nsTypes", aItem.getProperty("X-exchWebService-PidLidTaskAccepted"));
		}
*/

		// An imported item alreay could have a snooze time set.
		if (aItem.hasProperty("X-MOZ-SNOOZE-TIME")) {
			//dump("Item is snoozed. Going to set the snooze time\n");
			var newSnoozeTime = cal.createDateTime(aItem.getProperty("X-MOZ-SNOOZE-TIME"));
			newSnoozeTime = newSnoozeTime.getInTimezone(cal.UTC());
			const MAPI_PidLidReminderSignalTime = "34144";

			var eprop = e.addChildTag("ExtendedProperty", "nsTypes", null);
			var extField = eprop.addChildTag("ExtendedFieldURI", "nsTypes", null);
			extField.setAttribute("DistinguishedPropertySetId", "Common");
			extField.setAttribute("PropertyId", MAPI_PidLidReminderSignalTime);
			extField.setAttribute("PropertyType", "SystemTime");
			eprop.addChildTag("Value", "nsTypes", cal.toRFC3339(newSnoozeTime));

		}

		if (aItem.actualWork) {
			e.addChildTag("ActualWork", "nsTypes", aItem.actualWork);
		}

		if (aItem.billingInformation) {
			e.addChildTag("BillingInformation", "nsTypes", aItem.billingInformation);
		}

		var companiesTag = e.addChildTag("Companies", "nsTypes", null);

		var companies = aItem.getCompanies({});
		var first = true;
		for each(var company in companies) {
			companiesTag.addChildTag("String", "nsTypes", company);
		}

		if (aItem.completedDate) {

			tmpStart = aItem.completedDate.clone();

			if (tmpStart.timezone.isFloating) {
				tmpStart = tmpStart.getInTimezone(this.globalFunctions.ecDefaultTimeZone());
			}

			tmpStart = tmpStart.getInTimezone(this.globalFunctions.ecUTC());

			tmpStart.isDate = true;
			tmpStart.isDate = false;
		/*	var tmpDuration = cal.createDuration();
			tmpDuration.minutes = -1;
			tmpStart.addDuration(tmpDuration);*/

			e.addChildTag("CompleteDate", "nsTypes", cal.toRFC3339(tmpStart));
		}


//		if ((!aItem.parentItem.id) ||
//		    (!aItem.recurrenceInfo)) {
		if (aItem.dueDate) {
			if (aItem.dueDate.timezone.isFloating) {
				aItem.dueDate = aItem.dueDate.getInTimezone(this.globalFunctions.ecDefaultTimeZone());
			}

			e.addChildTag("DueDate", "nsTypes", cal.toRFC3339(aItem.dueDate));
		}

		if (aItem.mileage) {
			e.addChildTag("Mileage", "nsTypes", aItem.mileage);
		}

		if (aItem.percentComplete) {
			e.addChildTag("PercentComplete", "nsTypes", aItem.percentComplete);
		}
//}

		this.makeRecurrenceRule(aItem, e);

//		if ((!aItem.parentItem.id) ||
//		    (!aItem.recurrenceInfo)) {

			if (aItem.entryDate) {
				if (aItem.entryDate.timezone.isFloating) {
					aItem.entryDate = aItem.entryDate.getInTimezone(this.globalFunctions.ecDefaultTimeZone());
				}

				e.addChildTag("StartDate", "nsTypes", cal.toRFC3339(aItem.entryDate));
			}
//		}

		const statuses = { "NONE": "NotStarted",
				"IN-PROCESS": "InProgress", 
				"COMPLETED" : "Completed",
				"NEEDS-ACTION" : "WaitingOnOthers",
				"CANCELLED" : "Deferred",
				null: "NotStarted" };
		if (!statuses[aItem.status]) {
			e.addChildTag("Status", "nsTypes", "NotStarted");
		}
		else {
			e.addChildTag("Status", "nsTypes", statuses[aItem.status]);
		}

		if (aItem.totalWork) {
			e.addChildTag("TotalWork", "nsTypes", aItem.totalWork);
		}

		if (this.debug) this.logInfo("!!CHANGED:"+String(e));

		return e;
	},


	createItemOk: function _createItemOk(erCreateItemRequest, aId, aChangeKey)
	{
		this.notConnected = false;
		this.saveCredentials(erCreateItemRequest.argument);
		if (this.debug) this.logInfo("createItemOk 1");

		// Check if we have attachmentsUpdates
		if ((erCreateItemRequest.argument.attachmentsUpdates) && (erCreateItemRequest.argument.attachmentsUpdates.create.length > 0)) {
			if (this.debug) this.logInfo("createItemOk We have "+erCreateItemRequest.argument.attachmentsUpdates.create.length+" attachments to create.");
			var self = this;
			this.addToQueue( erCreateAttachmentRequest,
				{user: this.user, 
				 serverUrl: this.serverUrl,
				 item: erCreateItemRequest.argument.item,
				 parentItemId: aId,
				 parentItemChangeKey: aChangeKey, 
				 attachmentsUpdates: erCreateItemRequest.argument.attachmentsUpdates,
				 actionStart: Date.now(),
				 sendto: erCreateItemRequest.argument.sendto}, 
				function(erCreateAttachmentRequest, attachmentId, RootItemId, RootItemChangeKey) { self.createAttachmentOk(erCreateAttachmentRequest, attachmentId, RootItemId, RootItemChangeKey);}, 
				function(erCreateAttachmentRequest, aCode, aMsg) { self.createAttachmentError(erCreateAttachmentRequest, aCode, aMsg);},
				erCreateItemRequest.listener);
		}
		else {
			if (this.debug) this.logInfo("createItemOk We have no attachments to create.");

			if (erCreateItemRequest.listener) {
				this.notifyOperationComplete(erCreateItemRequest.listener,
				      Cr.NS_OK,
				      Ci.calIOperationListener.ADD,
				      erCreateItemRequest.argument.item.id,
				      erCreateItemRequest.argument.item);
			}

		}

		// Make an event for thistory.
		if (isEvent(erCreateItemRequest.argument.item)) {
			this.addActivity(calGetString("calExchangeCalendar", "addCalendarEventMessage", [erCreateItemRequest.argument.item.title, this.name], "exchangecalendar"), "", erCreateItemRequest.argument.actionStart, Date.now());
		}
		else {
			//this.notifyTheObservers("onAddItem", [newItem]);
			this.addActivity(calGetString("calExchangeCalendar", "addTaskEventMessage", [erCreateItemRequest.argument.item.title, this.name], "exchangecalendar"), "", erCreateItemRequest.argument.actionStart, Date.now());
		}


		// We do a refresh to get all details of the new item which EWS added.
		if ((! erCreateItemRequest.argument.attachmentsUpdates) || (erCreateItemRequest.argument.attachmentsUpdates.create.length == 0)) {
			this.refresh();
		}
	},

	createAttachmentOk: function _createAttachmentOk(erCreateAttachmentRequest, attachmentId, RootItemId, RootItemChangeKey)
	{
		if (this.debug) this.logInfo("createAttachmentOk");
		this.notConnected = false;

		if (erCreateAttachmentRequest.argument.attachmentsUpdates.delete.length > 0) {
			if (this.debug) this.logInfo("We also need to delete some attachments: count="+erCreateAttachmentRequest.argument.attachmentsUpdates.delete.length);
			var self = this;
			this.addToQueue( erDeleteAttachmentRequest,
				{user: this.user, 
				 serverUrl: this.serverUrl,
				 item: erCreateAttachmentRequest.argument.item,
				 parentItemId: RootItemId,
				 parentItemChangeKey: RootItemChangeKey, 
				 attachmentsUpdates: erCreateAttachmentRequest.argument.attachmentsUpdates,
				 sendto: erCreateAttachmentRequest.argument.sendto,
				 actionStart: Date.now()}, 
				function(erDeleteAttachmentRequest, aId, aChangeKey) { self.deleteAttachmentOk(erDeleteAttachmentRequest, aId, aChangeKey);}, 
				function(erDeleteAttachmentRequest, aCode, aMsg) { self.deleteAttachmentError(erDeleteAttachmentRequest, aCode, aMsg);},
				erCreateAttachmentRequest.listener);
			return;
		}
		else {
			if (this.debug) this.logInfo("We have no attachment deletions.");
			if ((erCreateAttachmentRequest.argument.sendto) && ((erCreateAttachmentRequest.argument.sendto != "sendtonone"))) {
				// The item we processed was a meeting of which I'm the organiser.
				// It contained new attachments and we need to send an item update to get it to the invited.
				if (this.debug) this.logInfo("We had attachment changes and it is a meeting for which we are the organiser send the changed item to the others as specified:"+erCreateAttachmentRequest.argument.sendto);
				this.doAttachmentUpdatesFinalize(erCreateAttachmentRequest.argument.attachmentsUpdates, erCreateAttachmentRequest.argument.item, RootItemId, RootItemChangeKey, erCreateAttachmentRequest.argument.sendto, erCreateAttachmentRequest.listener);
				return;
			}
			else {
				if (this.debug) this.logInfo("createAttachmentOk erCreateAttachmentRequest.argument.sendto is not set.");
				if (erCreateAttachmentRequest.listener) {
					this.notifyOperationComplete(erCreateAttachmentRequest.listener,
					      Cr.NS_OK,
					      Ci.calIOperationListener.MODIFY,
					      erCreateAttachmentRequest.argument.item.id,
					      erCreateAttachmentRequest.argument.item);
				}

				this.refresh();
			}
		}
	},

	createAttachmentError: function _createAttachmentError(erDeleteAttachmentRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("createAttachmentError: aCode:"+aCode+", aMsg:"+aMsg);
		this.notConnected = true;

	},

	deleteAttachmentOk: function _deleteAttachmentOk(erDeleteAttachmentRequest, aId, aChangeKey)
	{
		if (this.debug) this.logInfo("deleteAttachmentOk");
		this.notConnected = false;

		// See if we need to update the item when it is an invitation to others
		// This to get the invitation uncluding the attachments send out.
		this.addAttachmentsToOfflineCache({ man: {calItem:erDeleteAttachmentRequest.argument.item}});

		if ((erDeleteAttachmentRequest.argument.sendto) && ((erDeleteAttachmentRequest.argument.sendto != "sendtonone"))) {
			// The item we processed was a meeting of which I'm the organiser.
			// It contained new attachments and we need to send an item update to get it to the invited.
			if (this.debug) this.logInfo("We had attachment changes and it is a meeting for which we are the organiser send the changed item to the others as specified:"+erDeleteAttachmentRequest.argument.sendto);
			this.doAttachmentUpdatesFinalize(erDeleteAttachmentRequest.argument.attachmentsUpdates, erDeleteAttachmentRequest.argument.item, aId, aChangeKey, erDeleteAttachmentRequest.argument.sendto, erDeleteAttachmentRequest.listener);
			return;
		}
		else {
			if (erDeleteAttachmentRequest.listener) {
				this.notifyOperationComplete(erDeleteAttachmentRequest.listener,
				      Cr.NS_OK,
				      Ci.calIOperationListener.MODIFY,
				      erDeleteAttachmentRequest.argument.item.id,
				      erDeleteAttachmentRequest.argument.item);
			}

			this.refresh();
		}
	},

	deleteAttachmentError: function _deleteAttachmentError(erCreateAttachmentRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("deleteAttachmentError");
		this.notConnected = true;
	},

	makeUpdateOneItem: function _makeUpdateOneItem(aNewItem, aOldItem, aIndex, aMasterId, aMasterChangeKey, aInvitation)
	{
		var upd = this.globalFunctions.xmlToJxon('<nsTypes:ItemChange xmlns:nsTypes="'+nsTypesStr+'"/>');

		if (!aIndex) {
			var itemId = upd.addChildTag("ItemId", "nsTypes", null);
			itemId.setAttribute("Id", aOldItem.id);
			itemId.setAttribute("ChangeKey", aOldItem.changeKey);			
		}
		else {
			var oItemId = upd.addChildTag("OccurrenceItemId", "nsTypes", null);
			oItemId.setAttribute("RecurringMasterId", aMasterId);
			oItemId.setAttribute("ChangeKey", aMasterChangeKey);
			oItemId.setAttribute("InstanceIndex", aIndex);
		}
	
		var isInvitation = aInvitation;
		if (! aInvitation) {
			isInvitation = false;
		}

		var onlySnoozeChanged = true;

		var updateObject = aNewItem.updateXML;

		if (updateObject.toString() == '<t:Updates xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"/>') {
			// Nothing changed
			return {changes: null, onlySnoozeChanged: false};
		}

		upd.addChildTagObject(updateObject);
		updateObject = null;
		if (aNewItem.nonPersonalDataChanged) {
			onlySnoozeChanged = false;
		}

		if (onlySnoozeChanged) {
			if (this.debug) this.logInfo("onlySnoozeChanged Or reminder time before start.");
		}

		return {changes: upd, onlySnoozeChanged: onlySnoozeChanged};
	},

	sendMeetingRespons: function _sendMeetingRespons(aItem, aListener, aItemType, aResponse, aBodyText)
	{
		// Check if I'm the organiser. Do not send to myself.
		if (aItem.organizer) {
			if (aItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()) {
				return true;
			}
		}
		var me = this.getInvitedAttendee(aItem);
		if ((!me) && (!aResponse)) {
			return false;
		}

		if (aResponse) {
			var tmpResponse = aResponse;
		}
		else {
			var tmpResponse = me.participationStatus;
		}

		var messageDisposition = null;

		// First ask the user if he wants to send a response.
		// Get the eventsummarywindow to attach dialog to.
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
	                          .getService(Ci.nsIWindowMediator);
		let calWindow = wm.getMostRecentWindow("Calendar:EventSummaryDialog") || cal.getCalendarWindow();

		var preInput= { item: aItem, 
			     response: tmpResponse,
			     answer: ""};

		if (calWindow) {
			calWindow.openDialog("chrome://exchangecalendar/content/preInvitationResponse.xul",
				"preInvitationResponseId",
				"chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
				preInput); 
		}

		if (preInput.answer != "send") {
			if (this.debug) this.logInfo("User canceled preInvitationDialog.");
			return false;
		}

		var input= { item: aItem, 
			     response: tmpResponse,
			     answer: "",
				 proposeStart: "",
				 proposeEnd: "",
				 serverUrl: this.serverUrl,
			     bodyText: ""};

		if (preInput.response == "edit") {
			// If the user would like to edit his response we show him the window for it.
			if (this.debug) this.logInfo("User indicated he would like to edit response.");
			if (aBodyText) {
				input.bodyText = aBodyText;
				input.answer = "send";
			}

			if ((calWindow) && (!aBodyText)) {
				calWindow.openDialog("chrome://exchangecalendar/content/invitationResponse.xul",
					"invitationResponseId",
					"chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
					input); 
			}
						
			if (input.answer != "send") {
				if (this.debug) this.logInfo("User canceled invitationDialog.");
				return false;
			}

		}
		else {
			if (this.debug) this.logInfo("User indicated he does not want to edit the response.");
			if (preInput.response == "donotsend") {
				if (this.debug) this.logInfo("User indicated he does not want to send a response.");
				messageDisposition = "SaveOnly";
			}
		}
		if (this.debug) this.logInfo("  -------------- messageDisposition="+messageDisposition); 
	
		var proposeStart = this.tryToSetDateValue(input.proposeStart,"");
		var proposeEnd   = this.tryToSetDateValue(input.proposeEnd,""); 
	 	var proposeNewTime = false;
		
		if (proposeStart) 
                        input.proposeStart = cal.toRFC3339(proposeStart.getInTimezone(this.globalFunctions.ecUTC()));
		if (proposeEnd)
                        input.proposeEnd   = cal.toRFC3339(proposeEnd.getInTimezone(  this.globalFunctions.ecUTC())); 
		
		if( input.proposeStart && input.proposeEnd ){
			proposeNewTime = true;
		}
	 
		var self = this;
		this.addToQueue( erSendMeetingResponsRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 item: aItem,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 response: input.response,
			 bodyText: input.bodyText,
			 proposeStart: input.proposeStart,
			 proposeEnd: input.proposeEnd,
			 proposeNewTime: proposeNewTime,
			 senderMailbox: this.mailbox,
	 		 actionStart: Date.now(),
			 itemType: aItemType,
			 messageDisposition: messageDisposition}, 
			function(erSendMeetingResponsRequest) { self.sendMeetingResponsOk(erSendMeetingResponsRequest);}, 
			function(erSendMeetingResponsRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erSendMeetingResponsRequest, aCode, aMsg);},
			aListener);
		return true;
	},

	sendMeetingResponsOk: function _sendMeetingResponsOk(erSendMeetingResponsRequest)
	{
		if (this.debug) this.logInfo("sendMeetingResponsOk");
		this.saveCredentials(erSendMeetingResponsRequest.argument);
		this.notConnected = false;

		if (erSendMeetingResponsRequest.listener) {
		        this.notifyOperationComplete(erSendMeetingResponsRequest.listener,
		                                     Cr.NS_OK,
		                                     Ci.calIOperationListener.MODIFY,
		                                     erSendMeetingResponsRequest.argument.item.id,
		                                     erSendMeetingResponsRequest.argument.item);
		}
		
		if ( !erSendMeetingResponsRequest.argument.item.getProperty("X-MEETINGREQUEST")) {
			//this.notifyTheObservers("onModifyItem", [erSendMeetingResponsRequest.argument.item, this.itemCacheById[erSendMeetingResponsRequest.argument.item.id]]);
			//this.itemCacheById[erSendMeetingResponsRequest.argument.item.id] = erSendMeetingResponsRequest.argument.item;
			this.addItemToCache(erSendMeetingResponsRequest.argument.item);
		}
		else {
			// From meetingrequest cache. Do not remove meetingrequest from cache this will be done when invitation is removed
			//this.removeFromMeetingRequestCache(erSendMeetingResponsRequest.argument.item.uid);
			//this.meetingrequestAnswered[erSendMeetingResponsRequest.argument.item.uid] = false;
		}

		this.addActivity(calGetString("calExchangeCalendar", "ewsMeetingResponsEventMessage", [erSendMeetingResponsRequest.argument.item.title, erSendMeetingResponsRequest.argument.response, this.name], "exchangecalendar"), erSendMeetingResponsRequest.argument.bodyText, erSendMeetingResponsRequest.argument.actionStart, Date.now());
		this.refresh();
	},

	modifyItemgetOccurrenceIndexOk: function _modifyItemgetOccurrenceIndexOk(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey)
	{
		if (this.debug) this.logInfo("modifyItemgetOccurrenceIndexOk");
		this.saveCredentials(erGetOccurrenceIndexRequest.argument);
		this.notConnected = false;

		var changesObj = this.makeUpdateOneItem(erGetOccurrenceIndexRequest.argument.newItem, erGetOccurrenceIndexRequest.argument.masterItem, aIndex, aMasterId, aMasterChangeKey);
		var changes;
		if (changesObj) {
			changes = changesObj.changes;
		}
		if (changes) {

			// We remove the item from cache and calendar because the update request will add
			// it again.

			// bug 13.o when we change an occurrence it will send an updated master
		//	this.notifyTheObservers("onDeleteItem", [this.itemCacheById[erGetOccurrenceIndexRequest.argument.newItem.id]]);
		//	delete this.itemCacheById[erGetOccurrenceIndexRequest.argument.newItem.id];
			this.notifyTheObservers("onModifyItem", [erGetOccurrenceIndexRequest.argument.newItem, this.itemCacheById[erGetOccurrenceIndexRequest.argument.newItem.id]]);
			//this.itemCacheById[erGetOccurrenceIndexRequest.argument.newItem.id] = erGetOccurrenceIndexRequest.argument.newItem;
			this.addItemToCache(erGetOccurrenceIndexRequest.argument.newItem);


			var self = this;
			if (this.debug) this.logInfo("modifyItemgetOccurrenceIndexOk: changed:"+String(changes));
			this.addToQueue( erUpdateItemRequest,
				{user: this.user, 
				 mailbox: this.mailbox,
				 folderBase: this.folderBase,
				 serverUrl: this.serverUrl,
				 item: erGetOccurrenceIndexRequest.argument.masterItem,
				 folderID: this.folderID,
				 changeKey: this.changeKey,
				 updateReq: changes,
				 newItem: erGetOccurrenceIndexRequest.argument.newItem,
				 actionStart: Date.now(),
				 attachmentsUpdates: erGetOccurrenceIndexRequest.argument.attachmentsUpdates,
			         sendto: erGetOccurrenceIndexRequest.argument.sendto}, 
				function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
				function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
				erGetOccurrenceIndexRequest.listener);
			return;
			
		}
		else {
			if (this.doAttachmentUpdates(erGetOccurrenceIndexRequest.argument.attachmentsUpdates, erGetOccurrenceIndexRequest.argument.masterItem, erGetOccurrenceIndexRequest.argument.sendto, erGetOccurrenceIndexRequest.listener)) {
				if (this.debug) this.logInfo("modifyItemgetOccurrenceIndexOk: Only attachment changes no field changes 3.");
				return;
			}
			else {
				if (this.debug) this.logInfo("modifyItemgetOccurrenceIndexOk: No changes 3.");
				if (!this.isInvitation(erGetOccurrenceIndexRequest.argument.newItem, true)) {
					this.singleModified(erGetOccurrenceIndexRequest.argument.newItem, true);
				}
			}
		}

		if (erGetOccurrenceIndexRequest.listener) {
		        this.notifyOperationComplete(erGetOccurrenceIndexRequest.listener,
		                                     Cr.NS_OK,
		                                     Ci.calIOperationListener.MODIFY,
		                                     erGetOccurrenceIndexRequest.argument.newItem.id,
		                                     erGetOccurrenceIndexRequest.argument.newItem);
		}
	},

	whichOccurrencegetOccurrenceIndexError: function _whichOccurrencegetOccurrenceIndexError(erGetOccurrenceIndexRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("whichOccurrencegetOccurrenceIndexError:("+aCode+")"+aMsg);
		this.notConnected = true;
		this.saveCredentials(erGetOccurrenceIndexRequest.argument);

		if ((aCode == -8) && (aMsg="ErrorCalendarIsCancelledForDecline")) {
			if (erGetOccurrenceIndexRequest.listener) {
			        this.notifyOperationComplete(erGetOccurrenceIndexRequest.listener,
			                                     Cr.NS_OK,
			                                     Ci.calIOperationListener.MODIFY,
			                                     erGetOccurrenceIndexRequest.argument.newItem.id,
			                                     erGetOccurrenceIndexRequest.argument.newItem);
			}
			return;
		}

		// TODO: We need to retry when we get here from adoptItem.
//		if ((aCode == -8) && (this.itemCacheById[erGetOccurrenceIndexRequest.argument.item.id])) {
		if ((aCode == erGetOccurrenceIndexRequest.ER_ERROR_ER_ERROR_SOAP_ERROR) && (this.itemCacheById[erGetOccurrenceIndexRequest.argument.item.id])) {
			// Probably the item on the EWS server was changed and that
			// update was not received by us yet.
			// Do a refresh en retry modification.
			if (this.debug) this.logInfo("We have a conflict with the server for this update. We are going to refresh and then retry.");
			this.refresh();
			//var newItem = erGetOccurrenceIndexRequest.argument.newItem.clone();
			var newItem = this.cloneItem(erGetOccurrenceIndexRequest.argument.newItem);
			//var oldItem = this.itemCacheById[erGetOccurrenceIndexRequest.argument.item.id].clone();
			var oldItem = this.cloneItem(this.itemCacheById[erGetOccurrenceIndexRequest.argument.item.id]);
			if (erGetOccurrenceIndexRequest.argument.item.getProperty("X-RetryCount")) {
				oldItem.setProperty("X-RetryCount", erGetOccurrenceIndexRequest.argument.item.getProperty("X-RetryCount")+1);
			}
			else {
				oldItem.setProperty("X-RetryCount", 1);
			}

			if (this.debug) this.logInfo("X-RetryCount="+oldItem.getProperty("X-RetryCount"));

			if (oldItem.getProperty("X-RetryCount") < 25) {
				this.modifyItem(newItem, oldItem, erGetOccurrenceIndexRequest.listener);
			}
			else {
				if (this.debug) this.logInfo("To many update retries. Giving up.");
				if (erGetOccurrenceIndexRequest.listener) {
				        this.notifyOperationComplete(erGetOccurrenceIndexRequest.listener,
				                                     Ci.calIErrors.READ_FAILED,
				                                     Ci.calIOperationListener.MODIFY,
				                                     erGetOccurrenceIndexRequest.argument.newItem.id,
				                                     erGetOccurrenceIndexRequest.argument.newItem);
				}
			}
		}
		else {
			this.addActivity(calGetString("calExchangeCalendar", "ewsErrorEventMessage", [this.name, aMsg, aCode], "exchangecalendar"), aMsg, erGetOccurrenceIndexRequest.argument.actionStart, Date.now());

			var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Components.interfaces.nsIPromptService);
			if (aMsg.indexOf(":") > -1) {
				var msgStr = aMsg.substr(aMsg.indexOf(":")+1);
				switch (msgStr) {
					case "ErrorCalendarMeetingRequestIsOutOfDate" :
						msgStr = "Meeting request is Out Of Date. You cannot use it anymore. ("+msgStr+")";
						break;
					case "ErrorItemNotFound" :
						msgStr = "Calendar item is not available anymore in the exchange database. ("+msgStr+")";
						break;
				}
				promptService.alert(null, "Info", msgStr);
			}
			else {
				promptService.alert(null, "Info", aMsg);
			}

			if (erGetOccurrenceIndexRequest.listener) {
			        this.notifyOperationComplete(erGetOccurrenceIndexRequest.listener,
			                                     Ci.calIErrors.MODIFICATION_FAILED,
			                                     Ci.calIOperationListener.MODIFY,
			                                     erGetOccurrenceIndexRequest.argument.newItem.id,
			                                     erGetOccurrenceIndexRequest.argument.newItem);
			}
		}
	},

	doAttachmentUpdates: function _doAttachmentUpdates(aAttachmentsUpdates, aItem, aSendTo, aListener)
	{
		var result = false;
		if ((aAttachmentsUpdates) && ( (aAttachmentsUpdates.create.length > 0) || (aAttachmentsUpdates.delete.length > 0) )) {
			result = true;
			if (aAttachmentsUpdates.create.length > 0) {
				if (this.debug) this.logInfo("doAttachmentUpdates We have "+aAttachmentsUpdates.create.length+" attachments to create.");
				var self = this;
				this.addToQueue( erCreateAttachmentRequest,
					{user: this.user, 
					 serverUrl: this.serverUrl,
					 item: aItem,
					 parentItemId: aItem.id,
					 parentItemChangeKey: aItem.changeKey, 
					 attachmentsUpdates: aAttachmentsUpdates,
					 sendto: aSendTo,
					 actionStart: Date.now()}, 
					function(erCreateAttachmentRequest, attachmentId, RootItemId, RootItemChangeKey) { self.createAttachmentOk(erCreateAttachmentRequest, attachmentId, RootItemId, RootItemChangeKey);}, 
					function(erCreateAttachmentRequest, aCode, aMsg) { self.createAttachmentError(erCreateAttachmentRequest, aCode, aMsg);},
					aListener);
			}
			else {
				if (this.debug) this.logInfo("updateItemOk We have "+aAttachmentsUpdates.delete.length+" attachments to delete.");
				var self = this;
				this.addToQueue( erDeleteAttachmentRequest,
					{user: this.user, 
					 serverUrl: this.serverUrl,
					 item: aItem,
					 parentItemId: aItem.id,
					 parentItemChangeKey: aItem.changeKey, 
					 attachmentsUpdates: aAttachmentsUpdates,
					 sendto: aSendTo,
					 actionStart: Date.now()}, 
					function(erDeleteAttachmentRequest, aId, aChangeKey) { self.deleteAttachmentOk(erDeleteAttachmentRequest, aId, aChangeKey);}, 
					function(erDeleteAttachmentRequest, aCode, aMsg) { self.deleteAttachmentError(erDeleteAttachmentRequest, aCode, aMsg);},
					aListener);
			}
		}
		return result;
	},

	doAttachmentUpdatesFinalize: function _doAttachmentUpdatesFinalize(aAttachmentsUpdates, aItem, aId, aChangeKey, aSendTo, aListener)
	{
		if (this.debug) this.logInfo("doAttachmentUpdatesFinalize: item:"+aItem.title+", aSendTo:"+aSendTo);

		/*var req = <nsTypes:ItemChange xmlns:nsTypes="http://schemas.microsoft.com/exchange/services/2006/types">
			  <nsTypes:ItemId Id={aId} ChangeKey={aChangeKey}/>
			  <nsTypes:Updates>
			    <nsTypes:SetItemField>
			      <nsTypes:FieldURI FieldURI="item:Subject"/>
			      <nsTypes:CalendarItem>
				<nsTypes:Subject>{aItem.title}</nsTypes:Subject>
			      </nsTypes:CalendarItem>
			    </nsTypes:SetItemField>
			  </nsTypes:Updates>
			</nsTypes:ItemChange>;*/

		var req = this.globalFunctions.xmlToJxon('<nsTypes:ItemChange xmlns:nsTypes="'+nsTypesStr+'"/>');
		var itemId = req.addChildTag("ItemId", "nsTypes", null);
		itemId.setAttribute("Id", aId);
		itemId.setAttribute("ChangeKey", aChangeKey);
		var setItemField = req.addChildTag("Updates", "nsTypes", null).addChildTag("SetItemField", "nsTypes", null);
		setItemField.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Subject");
		setItemField.addChildTag("CalendarItem", "nsTypes", null).addChildTag("Subject", "nsTypes", aItem.title);

		var self = this;
		this.addToQueue( erUpdateItemRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 item: aItem,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 updateReq: req,
			 newItem: aItem,
			 actionStart: Date.now(),
			 attachmentsUpdates: null,
		         sendto: aSendTo}, 
			function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
			function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
			aListener);
		
	},

	updateItemOk: function _updateItemOk(erUpdateItemRequest, aId, aChangeKey)
	{
		if (this.debug) this.logInfo("updateItemOk: aId"+aId);

		this.saveCredentials(erUpdateItemRequest.argument);
		this.notConnected = false;

		// Make an event for thistory.
		if (isEvent(erUpdateItemRequest.argument.newItem)) {
			this.addActivity(calGetString("calExchangeCalendar", "updateCalendarEventMessage", [erUpdateItemRequest.argument.newItem.title, this.name], "exchangecalendar"), "", erUpdateItemRequest.argument.actionStart, Date.now());
		}
		else {
			this.addActivity(calGetString("calExchangeCalendar", "updateTaskEventMessage", [erUpdateItemRequest.argument.newItem.title, this.name], "exchangecalendar"), "", erUpdateItemRequest.argument.actionStart, Date.now());
		}

		if (! this.doAttachmentUpdates(erUpdateItemRequest.argument.attachmentsUpdates, erUpdateItemRequest.argument.item, erUpdateItemRequest.argument.sendto, erUpdateItemRequest.listener)) {
			if (erUpdateItemRequest.listener) {
				this.notifyOperationComplete(erUpdateItemRequest.listener,
				                             Cr.NS_OK,
				                             Ci.calIOperationListener.MODIFY,
				                             erUpdateItemRequest.argument.newItem.id,
				                             erUpdateItemRequest.argument.newItem);
			}
		
			this.refresh();
		}
	},

	getOccurrenceIndexOk: function _getOccurrenceIndexOk(erGetOccurrenceIndexRequest, aIndex, aMasterId, aMasterChangeKey)
	{
		if (this.debug) this.logInfo("getOccurrenceIndexOk index="+aIndex);
		this.saveCredentials(erGetOccurrenceIndexRequest.argument);

		this.notifyTheObservers("onDeleteItem", [erGetOccurrenceIndexRequest.argument.masterItem]);
		//this.itemCacheById[erGetOccurrenceIndexRequest.argument.masterItem.id]= null;
		this.removeItemFromCache(erGetOccurrenceIndexRequest.argument.masterItem);

		this.notConnected = false;
		var self = this;
		switch (erGetOccurrenceIndexRequest.argument.action) {
			case "deleteItem":
				this.addToQueue( erDeleteItemRequest,
					{user: erGetOccurrenceIndexRequest.argument.user, 
					 mailbox: this.mailbox,
					 folderBase: this.folderBase,
					 serverUrl: erGetOccurrenceIndexRequest.argument.serverUrl,
					 item: erGetOccurrenceIndexRequest.argument.item,
					 folderID: erGetOccurrenceIndexRequest.argument.folderID,
					 masterID: aMasterId,
					 masterChangeKey: aMasterChangeKey,
					 itemIndex: aIndex,
					 actionStart: Date.now(),
					 itemType: erGetOccurrenceIndexRequest.argument.itemType,
					 whichOccurrence: erGetOccurrenceIndexRequest.argument.whichOccurrence}, 
					function(erDeleteItemRequest) { self.deleteItemOk(erDeleteItemRequest);},
					function(erDeleteItemRequest, aCode, aMsg) { self.deleteItemError(erDeleteItemRequest, aCode, aMsg);},
					erGetOccurrenceIndexRequest.listener);
				break;
		}
	},

	getOccurrenceIndexError: function _getOccurrenceIndexError(erGetOccurrenceIndexRequest, aCode, aMsg)
	{
//		if (this.debug) this.logInfo("getOccurrenceIndexError");
		this.saveCredentials(erGetOccurrenceIndexRequest.argument);
		this.notConnected = true;
		switch (erGetOccurrenceIndexRequest.argument.action) {
			case "deleteItem":
				if (erGetOccurrenceIndexRequest.listener) {
					this.notifyOperationComplete(erGetOccurrenceIndexRequest.listener,
					      Ci.calIErrors.MODIFICATION_FAILED,
					      Ci.calIOperationListener.DELETE,
					      null,
					      aMsg);
				}
				break;
		}
	},

	deleteItemOk: function _deleteItemOk(erDeleteItemRequest)
	{
		this.saveCredentials(erDeleteItemRequest.argument);
		if (this.debug) this.logInfo("deleteItemOK");
		this.notConnected = false;

		if (erDeleteItemRequest.listener) {
			this.notifyOperationComplete(erDeleteItemRequest.listener,
			      Cr.NS_OK,
			      Ci.calIOperationListener.DELETE,
			      erDeleteItemRequest.argument.item.id,
			      erDeleteItemRequest.argument.item);
		}

		if (this.debug) this.logInfo("itemType:"+erDeleteItemRequest.itemType+", Subject:"+erDeleteItemRequest.argument.item.title);
		switch (erDeleteItemRequest.itemType) {
			case "master" :
				// Also remove the children.
				// 12-12-2011 Turned this of because this is done when we receive the update from the exchange server.
				//this.removeChildrenFromMaster(erDeleteItemRequest.argument.item);
				//delete this.recurringMasterCache[erDeleteItemRequest.argument.item.uid];
				break;
			case "single":
			case "occurrence":

			// This will be done on receiving the update from this.globalFunctions.
				//this.notifyTheObservers("onDeleteItem", [erDeleteItemRequest.argument.item]);
				//delete this.itemCacheById[erDeleteItemRequest.argument.item.id];
				break;
		}


		if (isEvent(erDeleteItemRequest.argument.item)) {
			this.addActivity(calGetString("calExchangeCalendar", "deleteCalendarEventMessage", [erDeleteItemRequest.argument.item.title, this.name], "exchangecalendar"), "", erDeleteItemRequest.argument.actionStart, Date.now());
		}
		else {
			this.addActivity(calGetString("calExchangeCalendar", "deleteTaskEventMessage", [erDeleteItemRequest.argument.item.title, this.name], "exchangecalendar"), "", erDeleteItemRequest.argument.actionStart, Date.now());
		}

		//delete erDeleteItemRequest.argument.item;
		this.refresh();
	},

	deleteItemError: function _deleteItemError(erDeleteItemRequest, aCode, aMsg)
	{
		this.saveCredentials(erDeleteItemRequest.argument);
		this.notConnected = true;
		if (this.debug) this.logInfo("deleteItemError msg:"+String(aMsg));
		if (erDeleteItemRequest.listener) {
			this.notifyOperationComplete(erDeleteItemRequest.listener,
			      Ci.calIErrors.MODIFICATION_FAILED,
			      Ci.calIOperationListener.DELETE,
			      null,
			      aMsg);
		}
	},

	saveCredentials: function _saveCredentials(aCredentials)
	{
		if (aCredentials) {
			if ((aCredentials.user != "") && (aCredentials.user != "\\") && (aCredentials.user != "/")) {
				this.user = aCredentials.user;
			}
		}
	},

	addToQueue: function _addToQueue(aRequest, aArgument, aCbOk, aCbError, aListener)
	{
		if (this.getProperty("disabled")) {
			if (this.debug) this.logInfo("Not adding to queue because we are disabled.");
			return;
		}
		 
		//if (!aArgument["ServerVersion"]) aArgument["ServerVersion"] = this.exchangeStatistics.getServerVersion(this.serverUrl);

		this.loadBalancer.addToQueue({ calendar: this,
				 ecRequest:aRequest,
				 arguments: aArgument,
				 cbOk: aCbOk,
				 cbError: aCbError,
				 listener: aListener});
	},

	findCalendarItemsOK: function _findCalendarItemsOK(erFindCalendarItemsRequest, aIds, aOccurrences, doNotCheckCache)
	{
		if (this.debug) this.logInfo("findCalendarItemsOK: aIds.length="+aIds.length+", aOccurrences.length="+aOccurrences.length);

		if (erFindCalendarItemsRequest) this.saveCredentials(erFindCalendarItemsRequest.argument);
		this.notConnected = false;

		if ((aIds.length == 0) && (aOccurrences.length)) {
			return;
		}

		if( doNotCheckCache === undefined ){
			if( this.useOfflineCache ){
				doNotCheckCache = false;
			}
			else{
				doNotCheckCache = true;
			}
		}
		
		// Removed Single/Master items in the lists which we already have in memory
		var newIdList = new Array();
//dump("     findCalendarItemsOK: aIds.length:"+aIds.length+"\n");
		for each(var item in aIds) {
			if (!doNotCheckCache) {
				var inItemCache = ((this.itemCacheById[item.Id]) && (this.itemCacheById[item.Id].changeKey == item.ChangeKey));
				if ((!inItemCache) && (this.useOfflineCache)) {
					inItemCache = (this.itemIsInOfflineCache(item.Id) == item.ChangeKey);
				}
				var inMasterCache = ((item.type == "RecurringMaster") && (this.recurringMasterCache[item.uid]) && (this.recurringMasterCache[item.uid].changeKey == item.ChangeKey));
			}
			else {
				var inItemCache = false;
				var inMasterCache = false;
			}
			if ((!inItemCache) && (!inMasterCache)) {
				newIdList.push(item);
			}
		}
 
		// Remove Occurrence/Exception items in the lists which we already have in memory
		var newOccurrenceList = new Array();
//dump("     findCalendarItemsOK: aOccurrences.length:"+aOccurrences.length+"\n");
		for each(var item in aOccurrences) {
			if (!this.recurringMasterCache[item.uid]) {
				newOccurrenceList.push(item);
			}
		}
//dump("     findCalendarItemsOK: newOccurrenceList.length:"+newOccurrenceList.length+"\n");

       		var self = this;

		// We have single and/or master items. Get full details and cache them.
		if (newIdList.length > 0) {
			this.addToQueue( erGetItemsRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 ids: newIdList,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 occurrences: newOccurrenceList,
			 folderClass: this.folderClass,
			 GUID: calExchangeCalendarGUID}, 
			function(erGetItemsRequest, aIds, aItemErrors) { self.getCalendarItemsOK(erGetItemsRequest, aIds, aItemErrors);}, 
			function(erGetItemsRequest, aCode, aMsg) { self.findCalendarItemsError(erGetItemsRequest, aCode, aMsg);},
			null);
		}

		this.startCalendarPoller();
	},

	startCalendarPoller: function _startCalendarPoller()
	{
	        var self = this;
	        var timerCallback = {
			notify: function setTimeout_notify() {
						self.refresh();
	        		}
	        };
		
		if( 60 > this.globalFunctions.safeGetIntPref(this.prefs, "ecCalendarPollInterval",0) ){  
			this.prefs.setIntPref("ecCalendarPollInterval",60);
		}
		
 		if (!this.calendarPoller) { 
			// start the calendar poller
			this.calendarPoller = Cc["@mozilla.org/timer;1"]
					.createInstance(Ci.nsITimer);
			this.calendarPoller.initWithCallback(timerCallback, this.globalFunctions.safeGetIntPref(this.prefs, "ecCalendarPollInterval", 60) * 1000, this.calendarPoller.TYPE_REPEATING_SLACK);
		}
		else {
			this.calendarPoller.initWithCallback(timerCallback, this.globalFunctions.safeGetIntPref(this.prefs, "ecCalendarPollInterval", 60) * 1000, this.calendarPoller.TYPE_REPEATING_SLACK);
		}
	},

	findCalendarItemsError: function _findCalendarItemsError(erFindCalendarItemsRequest, aCode, aMsg) 
	{
		if (this.debug) this.logInfo("findCalendarItemsError aCode:"+aCode+", aMsg:"+aMsg);
		if ((aCode == -8) && (aMsg == "ErrorCalendarFolderIsInvalidForCalendarView")) {
			this.supportsEvents = false;
		}
		else {
			this.notConnected = true;
		}
		this.saveCredentials(erFindCalendarItemsRequest.argument);
	},

/*	findMasterOccurrencesOk: function _findMasterOccurrencesOk(erGetItemsRequest, aIds)
	{
		if (this.debug) this.logInfo("findMasterOccurrencesOk:Start: aIds.length="+aIds.length);

		this.saveCredentials(erFindCalendarItemsRequest.argument);
		this.notConnected = false;

		if (aIds.length == 0) {
			return;
		}

		// Cache full master details.
		this.updateCalendar(erGetItemsRequest, aIds, true);
		if (this.debug) this.logInfo("findMasterOccurrencesOk:End: aIds.length="+aIds.length);
		erGetItemsRequest= null;
		aIds = null;

	},*/

	findOccurrencesOK: function _findOccurrencesOK(erFindOccurrencesRequest, aIds)
	{
		if (this.debug) this.logInfo("findOccurrencesOK: aIds.length="+aIds.length);
		//dump("findOccurrencesOK: aIds.length="+aIds.length+"\n");
		// Get full details of occurrences and exceptions and cache them.
		this.notConnected = false;
		this.findCalendarItemsOK(erFindOccurrencesRequest, aIds, []);
	},

	findFollowupTaskItemsOK: function _findFollowupTaskItemsOK(erFindFollowupItemsRequest, aIds)
	{
 	if (this.debug) this.logInfo("findFollowupTaskItemsOK: aIds.length:"+aIds.length);
		this.saveCredentials(erFindFollowupItemsRequest.argument);
		this.notConnected = false;

		if (aIds.length == 0) {
			return;
		}
 
       		var self = this;

	 	this.addToQueue( erGetItemsRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 ids: aIds,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 folderClass: "IPF.Note",
			 GUID: calExchangeCalendarGUID }, 
			function(erGetItemsRequest, aIds, aItemErrors) { self.getTaskItemsOK(erGetItemsRequest, aIds, aItemErrors);}, 
			function(erGetItemsRequest, aCode, aMsg) { self.getTaskItemsError(erGetItemsRequest, aCode, aMsg);},
			null); 

	 	this.startCalendarPoller();
	},

	findFollowupTaskItemsError: function _findFollowupTaskItemsError(erFindFollowupItemsRequest, aCode, aMsg)
	{
		this.saveCredentials(erFindFollowupItemsRequest.argument);
		this.notConnected = true;

	},
	
	findTaskItemsOK: function _findTaskItemsOK(erFindTaskItemsRequest, aIds, doNotCheckCache)
	{
 		if (this.debug) this.logInfo("findTaskItemsOK: aIds.length:"+aIds.length);
		this.saveCredentials(erFindTaskItemsRequest.argument);
		this.notConnected = false;

		if (aIds.length == 0) {
			return;
		}
		
		if( doNotCheckCache === undefined ){
			if( this.useOfflineCache ){
				doNotCheckCache = false;
			}
			else{
				doNotCheckCache = true;
			}
		}
		
		// Removed Single/Master items in the lists which we already have in memory
		var newIdList = new Array();
//dump("     findCalendarItemsOK: aIds.length:"+aIds.length+"\n");
		for each(var item in aIds) {
			if (!doNotCheckCache) {
				var inItemCache = ((this.itemCacheById[item.Id]) && (this.itemCacheById[item.Id].changeKey == item.ChangeKey));
				if ((!inItemCache) && (this.useOfflineCache)) {
					inItemCache = (this.itemIsInOfflineCache(item.Id) == item.ChangeKey);
				}
 			}
			else {
				var inItemCache = false;
 			}
 			if ((!inItemCache)) {
				newIdList.push(item);
			}
		}
 
   		var self = this; 
		this.addToQueue( erGetItemsRequest, 
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 ids: newIdList,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 folderClass: this.folderClass,
			 GUID: calExchangeCalendarGUID }, 
			function(erGetItemsRequest, aIds, aItemErrors) { self.getTaskItemsOK(erGetItemsRequest, aIds, aItemErrors);}, 
			function(erGetItemsRequest, aCode, aMsg) { self.getTaskItemsError(erGetItemsRequest, aCode, aMsg);},
			null);

		this.startCalendarPoller();
	},

	findTaskItemsError: function _findTaskItemsError(erFindTaskItemsRequest, aCode, aMsg)
	{
		this.saveCredentials(erFindTaskItemsRequest.argument);
		this.notConnected = true;

	},
	
	tryToSetDateValue: function _TryToSetDateValue(ewsvalue, aDefault)
	{
		if ((ewsvalue) && (ewsvalue.toString().length)) {
			return cal.fromRFC3339(ewsvalue, this.globalFunctions.ecTZService().UTC).getInTimezone(this.globalFunctions.ecDefaultTimeZone());
		}

		return aDefault;
	},

	tryToSetValue: function _tryToSetValue(ewsvalue, aDefault)
	{
		if (ewsvalue) {
			return ewsvalue;
		}

		return aDefault;
	},

	processItemSyncQueue: function _processItemSyncQueue()
	{
		if (this.processItemSyncQueueBusy) {
			return;
		}

		this.processItemSyncQueueBusy = true;

		// Process this.getItemSyncQueue
		while (this.getItemSyncQueue.length > 0) {
 			if (this.debug) this.logInfo("processItemSyncQueue: id:"+this.getItemSyncQueue[0].id);
			this.getItem(this.getItemSyncQueue[0].id, this.getItemSyncQueue[0].listener, true);
			this.getItemSyncQueue.shift();
		}

		this.processItemSyncQueueBusy = false;

	},

	getTaskItemsOK: function _getTaskItemsOK(erGetItemsRequest, aItems, aItemErrors)
	{
		if (this.debug) this.logInfo("getTaskItemsOK: aItems.length:"+aItems.length);
		
		this.saveCredentials(erGetItemsRequest.argument);
		this.notConnected = false;

		if (this.debug) this.logInfo("getTaskItemsOK 2");

		if ((aItemErrors) && (aItemErrors.length > 0)) {
			// Remove these items as they have an error
			var i = 0;
			while (i < aItemErrors.length) {
				if (this.itemCacheById[aItemErrors[i]]) {
					this.removeFromOfflineCache(this.itemCacheById[aItemErrors[i]]);
					this.notifyTheObservers("onDeleteItem", [this.itemCacheById[aItemErrors[i]]]);
					this.removeItemFromCache(this.itemCacheById[aItemErrors[i]]);
				}
				else {
					this.removeFromOfflineCache({ id: aItemErrors[i], title:"from offline"});
				}
				i++;
			} 
		}

		if (aItems.length == 0) {
			this.processItemSyncQueue(); 
			return;
		}

		if (this.debug) this.logInfo("getTaskItemsOK 3");
		this.updateCalendar(erGetItemsRequest, aItems, true);

		if ((erGetItemsRequest.argument) && (erGetItemsRequest.argument.syncState)) {
				if (this.debug) this.logInfo("getTaskItemsOK: We have a syncState to save.");
				//this.prefs.setCharPref("syncState", erGetItemsRequest.argument.syncState);
				
				switch(erGetItemsRequest.argument.folderBase){
				case "inbox":
					this.syncStateInbox = erGetItemsRequest.argument.syncState;
					this.saveToFile("syncStateInbox.txt", erGetItemsRequest.argument.syncState);
					this.prefs.setCharPref("syncStateInbox", erGetItemsRequest.argument.syncState); 
					break;
				default:
					this.syncState = erGetItemsRequest.argument.syncState;
					this.saveToFile("syncState.txt", erGetItemsRequest.argument.syncState);  
					this.prefs.setCharPref("syncState", erGetItemsRequest.argument.syncState); 
				}		 
		}

		aItems  = null;
		erGetItemsRequest = null;

		if (this.debug) this.logInfo("getTaskItemsOK 4");

		this.processItemSyncQueue();

	},

	getTaskItemsError: function _getTaskItemsError(erGetItemsRequest, aCode, aMsg) 
	{
//		if (this.debug) this.logInfo("getTaskItemsError: aMsg:"+ aMsg);
		this.saveCredentials(erGetItemsRequest.argument);
		this.notConnected = true;

		this.processItemSyncQueue();

	},

	getMeetingRequestFromServer: function _getMeetingRequestFromServer(aItem, aUID, aOperation, aListener)
	{
		if (this.debug) this.logInfo("aUID="+aUID);

		// We do not have a meetingrequest in cache but it is an iTIP.
		// Is inbox polling off? Or did the inbox polling not yet happen interval to long.
// bug 59		if (!this.doPollInbox) {
			// We are not polling the inbox so treat it as a meetingrespons.
			if (this.debug) this.logInfo("We get a new calendar item. It looks like an iTIP respons because aItem.id is set. Going to check if we can find it in the users inbox.");
			// We mis the exchange id and changekey which we need for responding.
			// We can get these by polling or searching the inbox but this is async. We can do this
			// because we received a listener. So search inbox for this uid and then use the full exchange message.
			// We could have multiple meetingrequest with the same uid but different id and changekey. How do we handle those??
						
			var self = this;
			this.addToQueue( erGetMeetingRequestByUIDRequest,
				{user: this.user, 
				 mailbox: this.mailbox,
				 folderBase: "inbox",
				 serverUrl: this.serverUrl,
				 item: aItem,
				 uid: aUID,
				 actionStart: Date.now(),
				 operation: aOperation,
				 GUID: calExchangeCalendarGUID}, 
				function(erGetMeetingRequestByUIDRequest, aMeetingRequests) { self.getMeetingRequestByUIDOk(erGetMeetingRequestByUIDRequest, aMeetingRequests);}, 
				function(erGetMeetingRequestByUIDRequest, aCode, aMsg) { self.getMeetingRequestByUIDError(erGetMeetingRequestByUIDRequest, aCode, aMsg);},
				aListener);

			return;
// bug 59		}
/* bug 59		else {
			if (this.debug) this.logInfo("!! THIS IS A SITUATION WHICH NEVER SHOULD HAPPEN !!");
			if (this.debug) this.logInfo("We have an iTIP respons and are polling the inbox but the item is not in the meetingrequestcache.");
			if (this.debug) this.logInfo("We see this when someone imports an ICS file or imports a meeting request into another calendar.");
			// If it is an ICS we would like it to be added to the calendar as new item
			// If is a meeting request then we want it accepted and not added. This must produce an error
			// Problem is we cannot identify it as a ICS import or a acceptation of a meeting request.
			aItem.id = undefined;
			this.adoptItem(aItem, aListener);
		/*	// We could do the same as we are not polling inbox..
			if (aListener) {
				this.notifyOperationComplete(aListener,
	        	                             Ci.calIErrors.MODIFICATION_FAILED,
	                        	             aOperation,
	                        	             aUID,
	                        	             aItem);
			} */
/* bug 59			return;
		} */ // bug 59
	},

	createAttendee: function _createAttendee(aElement, aType, aMyResponseType) 
	{
		let mbox = aElement.getTag("t:Mailbox");
		let attendee = cal.createAttendee();

		if (!aType) {
			aType = "REQ-PARTICIPANT";
		}

		switch (mbox.getTagValue("t:RoutingType","unknown")) {
			case "SMTP" :
				attendee.id = 'mailto:' + mbox.getTagValue("t:EmailAddress","unknown");
				break;
			case "EX" :
				attendee.id = 'ldap:' + mbox.getTagValue("t:EmailAddress","unknown");
				break;
			default:
				this.logInfo("createAttendee: Unknown RoutingType:'"+mbox.getTagValue("t:RoutingType")+"'");
				attendee.id = 'mailto:' + mbox.getTagValue("t:EmailAddress","unknown");
				break;
		}
		attendee.commonName = mbox.getTagValue("t:Name");
		attendee.rsvp = "FALSE";
		attendee.userType = "INDIVIDUAL";
		attendee.role = aType;

		if (aElement.getTagValue("t:ResponseType", "") != "") {
			attendee.participationStatus = participationMap[aElement.getTagValue("t:ResponseType")];

			// check if we specified a myResponseType for the complete item and the specified mailbox is equal to the mailbox for the calendar.
			if ((aMyResponseType) && (mbox.getTagValue("t:EmailAddress","unknown").toLowerCase() == this.mailbox.toLowerCase())) {
				attendee.participationStatus = participationMap[aMyResponseType];
				//if (this.debug) this.logInfo("Setting my response type from the global myresponsetype for the item.");
			}
		}

		return attendee;
	},

	createMeAsAttendee: function _createMeAsAttendee(aMyResponseType) 
	{
		var attendee = cal.createAttendee();

		attendee.id = 'mailto:' + this.mailbox;
		attendee.commonName = this.userDisplayName;
		attendee.rsvp = "FALSE";
		attendee.userType = "INDIVIDUAL";
		attendee.role = "REQ-PARTICIPANT";

		attendee.participationStatus = participationMap[aMyResponseType];

		return attendee;
	},

	get notifyObservers()
	{
		return this.observers;
	},

	notifyTheObservers: function _notifyTheObservers(aCommand, aArray, aFastNotify)
	{
		if (aFastNotify) {
			this.observers.notify(aCommand, aArray);
		}
		else {
			this.lightningNotifier.addToNotifyQueue(this, aCommand, aArray);
		}

		switch (aCommand) {
			case "onDeleteItem": 
				if (!this.notConnected) {
					this.removeFromOfflineCache(aArray[0]);
				}
				break;
		}
	},

	removeChildrenFromMaster: function _removeChildrenFromMaster(aMaster)
	{
		if (this.debug) this.logInfo("removeChildrenFromMaster start. Title:"+aMaster.title);
		// Remove children of this master. They will be added later.
		for each(var child in aMaster.getExceptions({})) {
			this.notifyTheObservers("onDeleteItem", [child]);
			aMaster.removeException(child);
			/*if (this.itemCacheById[child.id]) {
				this.itemCacheById[child.id].deleteItem();
			}
else { dump("Exception does not exist in cache anymore.\n");}
			this.itemCacheById[child.id] = null;
			delete this.itemCacheById[child.id];*/
			this.removeItemFromCache(child);

		}

		for each(var child in aMaster.getOccurrences({})) {
			this.notifyTheObservers("onDeleteItem", [child]);
			aMaster.removeOccurrence(child);
			/*if (this.itemCacheById[child.id]) {
				this.itemCacheById[child.id].deleteItem();
			}
else { dump("Occurrence does not exist in cache anymore.\n");}
			this.itemCacheById[child.id] = null;
			delete this.itemCacheById[child.id];*/
			this.removeItemFromCache(child);
		}

		if (this.debug) this.logInfo("removeChildrenFromMaster end.:"+aMaster.title);
	},

	setStatus: function _setStatus(aItem, aStatus)
	{
		switch (aStatus) {
			case "Unknown" : 
				aItem.setProperty("STATUS", "NONE");
				break;
			case "Organizer" : 
				aItem.setProperty("STATUS", "CONFIRMED");
				break;
			case "Tentative" : 
				aItem.setProperty("STATUS", "TENTATIVE");
				break;
			case "Accept" : 
				aItem.setProperty("STATUS", "CONFIRMED");
				break;
			case "Decline" : 
				aItem.setProperty("STATUS", "CANCELLED");
				break;
			case "NoResponseReceived" : 
				aItem.setProperty("STATUS", "NONE");
				break;
			default:
				aItem.setProperty("STATUS", "NONE");
				break;
		}
	},

	cloneItem: function _cloneItem(aItem) {
		var newItem = aItem.clone();
/*		if (aItem.id != aItem.parentItem.id) {
			newItem.parentItem = aItem.parentItem;
		}*/

		return newItem;
	},

	addExchangeAttachmentToCal: function _addExchangeAttachmentToCal(aExchangeItem, aItem)
	{
		if (aExchangeItem.getTagValue("t:HasAttachments") == "true") {
//			if (this.debug) this.logInfo("Title:"+aItem.title+"Attachments:"+aExchangeItem.getTagValue("Attachments"));
			var fileAttachments = aExchangeItem.XPath("/t:Attachments/t:FileAttachment");
			for each(var fileAttachment in fileAttachments) {
//				if (this.debug) this.logInfo(" -- Attachment: name="+fileAttachment.getTagValue("t:Name"));

				var newAttachment = createAttachment();
				newAttachment.setParameter("X-AttachmentId",fileAttachment.getAttributeByTag("t:AttachmentId","Id")); 
				newAttachment.uri = makeURL(this.serverUrl+"/?id="+encodeURIComponent(fileAttachment.getAttributeByTag("t:AttachmentId","Id"))+"&name="+encodeURIComponent(fileAttachment.getTagValue("t:Name"))+"&size="+encodeURIComponent(fileAttachment.getTagValue("t:Size", ""))+"&user="+encodeURIComponent(this.user));

				if (this.debug) this.logInfo("New attachment URI:"+this.serverUrl+"/?id="+encodeURIComponent(fileAttachment.getAttributeByTag("t:AttachmentId","Id"))+"&name="+encodeURIComponent(fileAttachment.getTagValue("t:Name"))+"&size="+encodeURIComponent(fileAttachment.getTagValue("t:Size", ""))+"&user="+encodeURIComponent(this.user));

				aItem.addAttachment(newAttachment);
			}
			fileAttachments = null;
		} 
	},

	clearXMozSnoozeTimes: function _clearXMozSnoozeTimes(aItem) 
	{
		if (!aItem) return;

		if (aItem.propertyEnumerator) {
			var props = aItem.propertyEnumerator;
			while (props.hasMoreElements()) {
				var prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty);
				if (prop.name.indexOf("X-MOZ-SNOOZE-TIME") > -1) {
					if (this.debug) this.logInfo("deleting Property:"+prop.name+"="+prop.value);

					aItem.deleteProperty(prop.name);
					var props = aItem.propertyEnumerator;
				}
			}
		}
	},

	setSnoozeTime: function _setSnoozeTime(aItem, aMaster)
	{

		if (aMaster) {
			var pidLidReminderSet = aMaster.reminderIsSet;
			var pidLidReminderSignalTime = aMaster.reminderSignalTime;
		}
		else {
			var pidLidReminderSet = aItem.reminderIsSet;
			var pidLidReminderSignalTime = aItem.reminderSignalTime;
		}

		if (this.debug) this.logInfo("-- pidLidReminderSet:"+pidLidReminderSet);

		if (pidLidReminderSet) {

			if (this.debug) this.logInfo("Reminder date is set for item");

			if (aMaster) {
				// Exchange only has the next reminderSignaltime. This is one value. Lightning can handle multiple.
//				this.clearXMozSnoozeTimes(aMaster);

//				var reminderTime = cal.createDateTime(pidLidReminderSignalTime);
				var reminderTime = aMaster.reminderSignalTime;
				if (reminderTime) {

					if (aItem) {
						if (this.debug) this.logInfo("We have an exception or an occurrence. We are going to use the master to see if it is snoozed or not.");

						// if the master ReminderDueBy is the same as the item Start date then this is the occurrence for which the next alarm is active.
						var masterReminderDueBy = this.tryToSetDateValue(aMaster.getProperty("X-ReminderDueBy"), null);
						if (masterReminderDueBy) {
							switch (masterReminderDueBy.compare(aItem.startDate)) {
								case -1:
									if (this.debug) this.logInfo("The ReminderDueBy date of the master is before the item's startdate. This alarm has not been snoozed or dismissed.");
									aItem.alarmLastAck = null;
									break;
								case 0: 
									if (this.debug) this.logInfo("The ReminderDueBy date of the master is equal to the item's startdate. We found the occurrence for which the alarm is active or dismissed or snoozed.");
									// We need to find out if it snoozed or dismissed.
									this.clearXMozSnoozeTimes(aMaster);
									if (this.debug) this.logInfo("Set snooze time: X-MOZ-SNOOZE-TIME-"+aItem.recurrenceId.nativeTime+"="+reminderTime.icalString);
									aMaster.setProperty("X-MOZ-SNOOZE-TIME-"+aItem.recurrenceId.nativeTime, reminderTime.icalString);

									var lastAck = reminderTime.clone();
									lastAck.addDuration(cal.createDuration('-PT1S'));
									aItem.alarmLastAck = lastAck;
									aMaster.alarmLastAck = lastAck;
									if (this.debug) this.logInfo("Set alarmLastAck:"+lastAck.icalString);
									break;
								case 1:
									if (this.debug) this.logInfo("The ReminderDueBy date of the master is after the item's startdate. This alarm has been dismissed.");
									var lastAck = aItem.startDate.clone();
									//lastAck.addDuration(cal.createDuration('-PT1S'));
									aItem.alarmLastAck = lastAck;
									if (this.debug) this.logInfo("Set alarmLastAck:"+lastAck.icalString);
									break;
							}
						}
						else {
							// Cannot determine for which alarm the next reminder is set. Bailing out.
							if (this.debug) this.logInfo("Cannot determine for which alarm the next reminder is set. Bailing out.");
							return;
						}


					}
					else {
						// We have a master only. Check for which of its occurrences/exceptions the X-MOZ-SNOOZE_TIME- needs to be set.
						// Easyest way for now is loop through it's children and call this function again with the child as item.
						// This can probably be optimized.
						if (this.debug) this.logInfo("A master. Will try to set snooze time on right occurrenceid");
						for (var index in this.itemCacheById) {

							if ( (this.itemCacheById[index]) &&
							     (isEvent(this.itemCacheById[index])) &&
							     ( (this.itemCacheById[index].calendarItemType == "Occurrence") ||
							       (this.itemCacheById[index].calendarItemType == "Exception") ) &&
							     (this.itemCacheById[index].uid == aMaster.uid) &&
							     (this.itemCacheById[index].parentItem.id == aMaster.id) ) {
								this.setSnoozeTime(this.itemCacheById[index], aMaster);
							}
						}
					}
				}
				else {
					if (this.debug) this.logInfo("Received pidLidReminderSignalTime is invalid:"+pidLidReminderSignalTime);
				}
			}
			else {
				// aItem is a Single
/*				this.clearXMozSnoozeTimes(aItem);
				var reminderTime = pidLidReminderSignalTime;
				if (this.debug) this.logInfo("Set snooze time: X-MOZ-SNOOZE-TIME="+reminderTime.icalString);
				aItem.setProperty("X-MOZ-SNOOZE-TIME", reminderTime.icalString);

				var lastAck = reminderTime.clone();
				lastAck.addDuration(cal.createDuration('-PT1S'));
				aItem.alarmLastAck = lastAck;
				if (this.debug) this.logInfo("Set alarmLastAck:"+lastAck.icalString);
 */
			}
		}
		else {
			// Remove any snooze states according http://msdn.microsoft.com/en-us/library/cc765589.aspx
			if (this.debug) this.logInfo("Item has no snooze date set.");
			aItem.alarmLastAck = null;
		}
	},

	setAlarm: function _setAlarm(aItem, aCalendarItem)
	{
		if ((aCalendarItem.getTagValue("t:ReminderIsSet") == "true")) {
			var alarm = cal.createAlarm();
			alarm.action = "DISPLAY";
			alarm.repeat = 0;

			var alarmOffset = cal.createDuration();
			alarmOffset.minutes = -1 * aCalendarItem.getTagValue("t:ReminderMinutesBeforeStart");

			// This is a bug fix for when the offset is more than a year)
			if (alarmOffset.minutes < (-60*24*365)) {
				alarmOffset.minutes = -5;
			}
			alarmOffset.normalize();

			alarm.related = Ci.calIAlarm.ALARM_RELATED_START;
			alarm.offset = alarmOffset;

			if (this.debug) this.logInfo("Alarm set with an offset of "+alarmOffset.minutes+" minutes from the start");
			aItem.setProperty("X-ReminderDueBy", aCalendarItem.getTagValue("t:ReminderDueBy"));

			aItem.addAlarm(alarm);
		}
	},

	getMasterByItem: function _getMasterByItem(aItem)
	{
		if (this.debug) this.logInfo("getMasterByItem for item:"+aItem.title+", startdate:"+aItem.startDate+", uid:"+aItem.uid);
		var self = this;
		this.addToQueue( erGetMasterOccurrenceIdRequest, 
			{user: this.user, 
			 serverUrl: this.serverUrl,
			 item: aItem,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 getType: "lightning" }, 
			function(erGetMasterOccurrenceIdRequest, aId, aChangeKey) { self.getMasterOk(erGetMasterOccurrenceIdRequest, aId, aChangeKey, aItem.uid);}, 
			function(erGetMasterOccurrenceIdRequest, aCode, aMsg) { self.getMasterError(erGetMasterOccurrenceIdRequest, aCode, aMsg);},
			null);
	},

	getMasterOk: function _getMasterOk(erGetMasterOccurrenceIdRequest, aId, aChangeKey, aUID)
	{
		if (this.debug) this.logInfo("getMasterOk aId:"+aId+", aChangeKey:"+aChangeKey+", uid:"+aUID);
		var ids = [{Id: aId,
				  ChangeKey: aChangeKey,
				  type: "RecurringMaster",
				  uid: aUID,
				  start: null,
				  end: null}];

		this.findCalendarItemsOK(erGetMasterOccurrenceIdRequest, ids, [])
	},

	getMasterError: function _getMasterError(erGetMasterOccurrenceIdRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("getMasterError aCode:"+aCode+", aMsg:"+aMsg);
		this.saveCredentials(erGetMasterOccurrenceIdRequest.argument);
	},

	convertExchangeItemtoCalItem: function _convertExchangeItemtoCalItem(aCalendarItem, item, fromOfflineCache, isMeetingRequest)
	{
		//dump("1. uid:"+item.uid+", it:"+item.calendarItemType+", t:"+item.title+", sd:"+item.startDate+"\n");
		var uid = item.uid;
//		if ((item.className == "mivExchangeEvent") && (!uid)) return null;

		if (this.itemCacheById[item.id]) {
			if (this.itemCacheById[item.id].changeKey == item.changeKey) {
				//if (this.debug) this.logInfo("Item is allready in cache and the id and changeKey are the same. Skipping it.");
			//dump("convertExchangeAppointmentToCalAppointment. Item is allready in cache and the id and changeKey are the same. Skipping it:"+item.title+", startDate"+item.startDate+"\n");
				this.itemCacheById[item.id].occurrenceIndex = item.occurrenceIndex
				item.deleteItem();
				item = null;
				return null;
			}
		}
		else {
			if ((uid) && (this.recurringMasterCache[uid])) {
				if ( (this.recurringMasterCache[uid].changeKey == xml2json.getAttributeByTag(aCalendarItem, "t:ItemId", "ChangeKey")) && (this.recurringMasterCache[uid].id == item.id)) {
					//if (this.debug) this.logInfo("Master item is allready in cache and the id and changeKey are the same. Skipping it.");
			//dump("convertExchangeAppointmentToCalAppointment. Master item is allready in cache and the id and changeKey are the same. Skipping it:"+item.title+", item.calendarItemType:"+item.calendarItemType+"\n");
					item.deleteItem();
					item = null;
					return null;
				}
			}
		}
		
		item.setProperty("DTSTAMP", this.tryToSetDateValue(xml2json.getTagValue(aCalendarItem, "t:DateTimeReceived")));
  		if (!isMeetingRequest) {
			//if (this.debug) this.logInfo(" == item.title:"+item.title+", calendarItemType:"+aCalendarItem.getTagValue("t:CalendarItemType"));
			switch (item.calendarItemType) {
				case "Single" :
					// Check if this item.id has existed as master. This could be a change from master to single.
					var offlineMasterData = null;
					if (!fromOfflineCache) {
						offlineMasterData = this.masterIsInOfflineCache(item.id);
					}

					if ((this.recurringMasterCacheById[item.id]) || (offlineMasterData)) {
						if (this.debug) this.logInfo("Item has changed from master into single. Going to remove it and it's children.");

						let masterUID = null;						
						if (offlineMasterData) {
							masterUID = offlineMasterData.uid;
						}
						else {
							masterUID = this.recurringMasterCacheById[item.id].uid;
						}

						this.removeChildrenFromMaster(this.recurringMasterCache[masterUID]);

						this.removeFromOfflineCache(this.recurringMasterCache[masterUID]);
						delete this.recurringMasterCacheById[item.id];
						delete this.recurringMasterCache[masterUID];
					}
					break;
				case "Exception" :
					if (this.debug) this.logInfo("@1:"+(item.startDate || item.entryDate)+":IsException");
					item.setProperty("X-RecurringType", "RE");
					var master = this.recurringMasterCache[uid];
					if (master) {
						// We allready have a master in Cache.
						if (this.debug) this.logInfo("Found master for exception:"+master.title+", date:"+(master.startDate || master.entryDate));
						master.addException(item);
					}
					else {
						//if (this.debug) this.logInfo("HAS NO MASTER: STRANGE: Exception:"+item.title);
						// We do not have a master yet so we are going to request it and put this in itemcache but do not show it.
						this.parentLessItems[item.id] = item;
						if (!this.newMasters[item.uid]) {
							this.newMasters[item.uid] = true;
							this.getMasterByItem(item);
						}
						//this.itemCacheById[item.id] = item;
						this.addItemToCache(item);

						if ((this.useOfflineCache) && (!fromOfflineCache)) {
							let cacheItem = {};
							cacheItem[item.id] = {calItem: item,
									exchangeItemXML: xml2json.toString(aCalendarItem)};
							this.addToOfflineCache(cacheItem);
						}

						return null;
					}

					break;
				case "Occurrence" :
					if (this.debug) this.logInfo("@1:"+(item.startDate || item.entryDate)+":IsOccurrence");
					item.setProperty("X-RecurringType", "RO");
					// This is a occurrence. Try to find the master and link recurrenceinfo.
					var master = this.recurringMasterCache[uid];
					if (master) {
						// We allready have a master in Cache.
						if (this.debug) this.logInfo("Found master for occurrence:"+master.title+", date:"+(master.startDate || master.entryDate));

						master.addOccurrence(item);
					}
					else {
						//if (this.debug) this.logInfo("HAS NO MASTER: STRANGE: Occurrence:"+item.title);
						// We do not have a master yet so we are going to request it and put this in itemcache but do not show it.
						this.parentLessItems[item.id] = item;
						if (!this.newMasters[item.uid]) {
							this.newMasters[item.uid] = true;
							this.getMasterByItem(item);
						}
						//this.itemCacheById[item.id] = item;
						this.addItemToCache(item);

						if ((this.useOfflineCache) && (!fromOfflineCache)) {
							let cacheItem = {};
							cacheItem[item.id] = {calItem: item,
									exchangeItemXML: xml2json.toString(aCalendarItem)};
							this.addToOfflineCache(cacheItem);
						}

						return null;
					}
					
					break;
				case "RecurringMaster" :
	
//					if (this.debug) this.logInfo(item.title+":"+(item.startDate || item.entryDate)+":IsMaster, fromOfflineCache:"+fromOfflineCache);
					//dump(item.title+":"+(item.startDate || item.entryDate)+":IsMaster, fromOfflineCache:"+fromOfflineCache+"\n");

					// Check if this item existed previously as a Single item and is not converted into a master.
					if (this.itemCacheById[item.id]) {
						if (this.debug) this.logInfo("We allready have this master in the single itemcache. single changed into master. Removing ");
						this.notifyTheObservers("onDeleteItem", [this.itemCacheById[item.id]]);
						this.removeFromOfflineCache(item);
						this.removeItemFromCache(this.itemCacheById[item.id]);
					}

//					if ((this.recurringMasterCache[item.uid]) && (this.recurringMasterCache[item.uid].id == item.id) && (this.recurringMasterCache[item.uid].changeKey != item.changeKey)) {
					if ((this.recurringMasterCache[item.uid]) && (this.recurringMasterCache[item.uid].changeKey != item.changeKey)) {
						if (this.debug) this.logInfo("We allready have this master in cache but the changeKey changed.");
						if (this.recurringMasterCache[item.uid].id != item.id) {
							dump(" @#@# THIS IS WEARD id do not match. @@@!!\n");
							dump(" item.title:"+item.title+", startDate:"+item.startDate+", calendarItemType:"+item.calendarItemType+"\n");
							dump(" this.recurringMasterCache[item.uid].title:"+this.recurringMasterCache[item.uid].title+", startDate:"+this.recurringMasterCache[item.uid].startDate+", calendarItemType:"+this.recurringMasterCache[item.uid].calendarItemType+"\n");
						}
						//dump("We allready have this master in cache but the changeKey changed.\n");

						let ids = [];
						let myExceptions = this.recurringMasterCache[item.uid].getExceptions({});
						for each(var tmpException in myExceptions) {
							ids.push({Id: tmpException.id,
									  type: "Exception",
									  uid: item.uid,
									  start: null,
									  end: null});
						}
						let myOccurrences = this.recurringMasterCache[item.uid].getOccurrences({});
						for each(var tmpOccurrence in myOccurrences) {
							ids.push({Id: tmpOccurrence.id,
									  type: "Occurrence",
									  uid: item.uid,
									  start: null,
									  end: null});
						}

						if (this.debug) this.logInfo("Going to request '"+ids.length+"' children to see if they are updated.");
						//dump("Going to request '"+ids.length+"' memorycache children to see if they are updated.\n");

						// Devide the whole in smaller request otherwise on the return answer we will flood the cpu and memory.
						while (ids.length > 0) {
							let req = [];
							for (var counter=0; ((counter < 10) && (ids.length > 0)); counter++) {
								req.push(ids.pop());
							}
							this.findCalendarItemsOK(null, req, [], true);
						}
					}

					if (!fromOfflineCache) {
						let changeKey = this.itemIsInOfflineCache(item.id);
						if ((changeKey) && (item.changeKey != changeKey)) {
							//dump("Master is in offline cache and changeKey is different. Going to see if children have changed.\n");
							let inOfflineCache = this.getOccurrencesFromOfflineCache(item, "RO");
							let i = 0;
							let ids = [];
							while (i < inOfflineCache.length) {
								ids.push({Id: inOfflineCache[i],
										  type: "Occurrence",
										  uid: item.uid,
										  start: null,
										  end: null});
								i++;
							}

							inOfflineCache = this.getOccurrencesFromOfflineCache(item, "RE");
							i = 0;
							while (i < inOfflineCache.length) {
								ids.push({Id: inOfflineCache[i],
										  type: "Exception",
										  uid: item.uid,
										  start: null,
										  end: null});
								i++;
							}

							if (this.debug) this.logInfo("Going to request '"+ids.length+"' offline children to see if they are updated.");
							//dump("Going to request '"+ids.length+"' offline children to see if they are updated.\n");

							// Devide the whole in smaller request otherwise on the return answer we will flood the cpu and memory.
							while (ids.length > 0) {
								let req = [];
								for (var counter=0; ((counter < 10) && (ids.length > 0)); counter++) {
									req.push(ids.pop());
								}
								this.findCalendarItemsOK(null, req, [], true);
							}
						}
					}

					if (this.debug) this.logInfo("Trying to see if there are parentless items for this master:"+item.title+".");
					//this.observers.notify("onStartBatch");
					var parentLessCounter = 0;
					for (var itemId in this.parentLessItems) {
						parentLessCounter++;
						if ( (this.parentLessItems[itemId]) &&
						     (isEvent(this.parentLessItems[itemId])) &&
						     ( (this.parentLessItems[itemId].calendarItemType == "Occurrence") ||
						       (this.parentLessItems[itemId].calendarItemType == "Exception") ) &&
						     (this.parentLessItems[itemId].uid == item.uid) &&
						     (this.parentLessItems[itemId].parentItem.id != item.id) ) {
							if (this.debug) this.logInfo("convertExchangeAppointmentToCalAppointment: Found item without parent:"+this.parentLessItems[itemId]+", going to set parent.");
							//this.itemCacheById[index].parentItem = item;
							if (this.parentLessItems[itemId].calendarItemType == "Exception") {
								item.addException(this.parentLessItems[itemId]);
							}
							if (this.parentLessItems[itemId].calendarItemType == "Occurrence") {
								item.addOccurrence(this.parentLessItems[itemId]);
							}

							this.notifyTheObservers("onAddItem", [this.parentLessItems[itemId]]);
							this.parentLessItems[itemId] = null;
							delete this.parentLessItems[itemId];
						}

					}
					//this.observers.notify("onEndBatch");

					if (!fromOfflineCache) {
						let cacheItem = {};
						cacheItem[item.id] = {calItem: item,
								exchangeItemXML: xml2json.toString(aCalendarItem)};
						this.addToOfflineCache(cacheItem);
					}

					if (this.recurringMasterCache[uid]) {
						if (this.recurringMasterCache[uid].recurrenceInfo.toString() != item.recurrenceInfo.toString()) {
							// Recurrence info change. We are going to request all children in a known period.
							if (this.debug) this.logInfo(this.name+": ("+item.title+") Recurrence info change for master. We are going to request all children in a known period..");
							this.masterCount--;
							//dump("   xx MasterCount:"+this.masterCount+"\n");
							this.recurringMasterCache[uid].deleteItem();
							this.recurringMasterCache[uid] = null;
							this.recurringMasterCacheById[item.id] = null;
							var self = this;
							var tmpItem = { Id: item.id, ChangeKey: item.changeKey, type:"RecurringMaster"};
							this.addToQueue( erFindOccurrencesRequest, 
								{user: this.user, 
								 mailbox: this.mailbox,
								 folderBase: this.folderBase,
								 serverUrl: this.serverUrl,
								 masterItem: tmpItem,
								 folderID: this.folderID,
								 changeKey: this.changeKey,
								 startDate: this.startDate || this.entryDate,
								 endDate: this.endDate || this.dueDate,
						 		 GUID: calExchangeCalendarGUID}, 
								function(erGetItemsRequest, aIds) { self.findOccurrencesOK(erGetItemsRequest, aIds);}, 
								function(erGetItemsRequest, aCode, aMsg) { self.findCalendarItemsError(erGetItemsRequest, aCode, aMsg);},
								null);	
						}
/*						this.masterCount--;
						//dump("   xx MasterCount:"+this.masterCount+"\n");
						this.recurringMasterCache[uid].deleteItem();
						this.recurringMasterCache[uid] = null;*/
					}
					else {
						if ((parentLessCounter == 0) && (!fromOfflineCache) && (this.syncState)) {
							if (this.debug) this.logInfo("We have a new master without children. Most of the times this means we nead to request the children separately.");
							//dump(this.name+": ("+item.title+") We have a new master without children. Most of the times this means we nead to request the children separately.\n");
							//dump("     -- this.startDate:"+this.startDate+", this.endDate:"+this.endDate+"\n");

							this.requestPeriod(this.startDate || this.entryDate, this.endDate || this.dueDate, Ci.calICalendar.ITEM_FILTER_TYPE_EVENT, 0, false, item.uid);
						} 
					}

					this.masterCount++;
					this.recurringMasterCache[uid] = item;
					//dump("** Add to this.recurringMasterCache: title:"+item.title+", item.startDate:"+item.startDate+"\n");
					this.recurringMasterCacheById[item.id] = item;
					//dump("   :: MasterCount:"+this.masterCount+"\n");

					if (this.debug) this.logInfo("This is a master it will not be put into the normal items cache list.");
			//dump("convertExchangeAppointmentToCalAppointment. The master will not be visible:"+item.title+"\n");
					return null;  // The master will not be visible

					break;
				default:
					//this.setSnoozeTime(item, null);
			}
		}

		return item;
	},

	convertExchangeAppointmentToCalAppointment: function _convertExchangeAppointmentToCalAppointment(aCalendarItem, isMeetingRequest, erGetItemsRequest, doNotify, fromOfflineCache)
	{
		if (this.debug) this.logInfo("convertExchangeAppointmentToCalAppointment:"+xml2json.toString(aCalendarItem), 2);

		//var item = createEvent();
//		var item = Cc["@1st-setup.nl/exchange/calendarevent;1"]
//				.createInstance(Ci.mivExchangeEvent, this);

		var item = new mivExchangeEvent();

		item.addMailboxAlias(this.mailbox);
		item.calendar = this.superCalendar;
		item.exchangeData = aCalendarItem;

//		item.calendar = this;

		//return item;

		if (!doNotify) {
			doNotify = false;
		}

		//item.id = this.tryToSetValue(aCalendarItem.getAttributeByTag("t:ItemId", "Id"), item.id);
		if (! item.id) {
			if (this.debug) this.logInfo("Item.id is missing. this is a required field.");
			item.deleteItem();
			item = null;
			//dump("convertExchangeAppointmentToCalAppointment. Item.id is missing. this is a required field.\n");
			return null;
		}
		//item.setProperty("X-ChangeKey", aCalendarItem.getAttributeByTag("t:ItemId", "ChangeKey"));
		if ((erGetItemsRequest) && (erGetItemsRequest.argument.occurrenceIndexes) && (erGetItemsRequest.argument.occurrenceIndexes[item.id])) {
			if (this.debug) this.logInfo(" Muriel:"+erGetItemsRequest.argument.occurrenceIndexes[item.id]+", title:"+item.title);
			item.occurrenceIndex = erGetItemsRequest.argument.occurrenceIndexes[item.id];
			//setProperty("X-OccurrenceIndex", erGetItemsRequest.argument.occurrenceIndexes[item.id]+"");
		}
		
		if (! item.startDate) {
			if (this.debug) this.logInfo("We have an empty startdate. Skipping this item.");
			item.deleteItem();
			item = null;
			//dump("convertExchangeAppointmentToCalAppointment. We have an empty startdate. Skipping this item.\n");
			return null;
		}

		if (! item.endDate) {
			if (this.debug) this.logInfo("We have an empty enddate. Skipping this item.");
			item.deleteItem();
			item = null;
			//dump("convertExchangeAppointmentToCalAppointment. We have an empty enddate. Skipping this item.\n");
			return null;
		}

		if (item.startDate.compare(item.endDate) > 0) {
			if (this.debug) this.logInfo("Startdate ("+item.startDate+") is after enddate ("+item.endDate+")? Skipping this item.");
			item.deleteItem();
			item = null;
			//dump("convertExchangeAppointmentToCalAppointment. Startdate ("+item.startDate+") is after enddate ("+item.endDate+")? Skipping this item.\n");
			return null;
		}

		return this.convertExchangeItemtoCalItem(aCalendarItem, item, fromOfflineCache, isMeetingRequest);
	},

	convertExchangeTaskToCalTask: function _convertExchangeTaskToCalTask(aTask, erGetItemsRequest, fromOfflineCache)
	{
		//if (this.debug) this.logInfo("convertExchangeTaskToCalTask:"+xml2json.toString(aTask), 2);
		//var item = createTodo();
//		var item = Cc["@1st-setup.nl/exchange/calendartodo;1"]
//				.createInstance(Ci.mivExchangeTodo, this);

		var item = new mivExchangeTodo();

		item.addMailboxAlias(this.mailbox);
		item.calendar = this.superCalendar;
	 	item.exchangeData = aTask;

		return this.convertExchangeItemtoCalItem(aTask, item, fromOfflineCache, false);

		// See if this is a delegated task.
/*		var isNotAccepted = 0;

		for each (var extendedProperty in aTask.getTagValue("t:ExtendedProperty")) {

			if (extendedProperty.getAttributeByTag("t:ExtendedFieldURI","PropertyId") == "33032") {
				item.setProperty("X-exchWebService-PidLidTaskAccepted",extendedProperty.getTagValue("t:Value"));
				// TRUE means accepted or rejected.
				if (extendedProperty.getTagValue("t:Value") == "false") isNotAccepted++;
			}
			if (extendedProperty.getAttributeByTag("t:ExtendedFieldURI","PropertyId") == "33045") {
				item.setProperty("X-exchWebService-PidLidTaskLastUpdate",extendedProperty.getTagValue("t:Value"));
				// Date of last update. 
			}
			if (extendedProperty.getAttributeByTag("t:ExtendedFieldURI","PropertyId") == "33066") {
				item.setProperty("X-exchWebService-PidLidTaskAcceptanceState",extendedProperty.getTagValue("t:Value"));
				// Only visible on the Owner task item. Otherwise value == NoMatch
				//0x00000000 The task is not assigned.
				//0x00000001 The task’s acceptance status is unknown.
				//0x00000002 The task assignee accepted the task. This value is set when the client processes a task acceptance.
				//0x00000003 The task assignee rejected the task. This value is set when the client processes a task rejection.
				if (extendedProperty.getTagValue("t:Value") == "NoMatch") isNotAccepted++;
			}
			if (extendedProperty.getAttributeByTag("t:ExtendedFieldURI","PropertyId") == "33050") {
				item.setProperty("X-exchWebService-PidLidTaskHistory",extendedProperty.getTagValue("t:Value"));
				// Specifies last change to record. PidLidTaskLastUpdate shows date of this change.
				//0x00000004 The dispidTaskDueDate (PidLidTaskDueDate) property changed.
				//0x00000003 Another property was changed.
				//0x00000001 The task assignee accepted this task.
				//0x00000002 The task assignee rejected this task.
				//0x00000005 The task was assigned to a task assignee.
				//0x00000000 No changes were made.
				if (extendedProperty.getTagValue("t:Value") == "5") isNotAccepted++;
			}
			if (extendedProperty.getAttributeByTag("t:ExtendedFieldURI","PropertyId") == "33065") {
				item.setProperty("X-exchWebService-PidLidTaskOwnership",extendedProperty.getTagValue("t:Value"));
			}
		}
		if (aTask.getTagValue("t:Delegator") != "") {
			item.setProperty("X-exchWebService-Delegator",aTask.getTagValue("t:Delegator"));
			item.setProperty("X-exchWebService-Owner",aTask.getTagValue("t:Owner"));
			item.setProperty("X-exchWebService-IsTeamTask",aTask.getTagValue("t:IsTeamTask"));
		}
*/		
	},

	convertExchangeUserAvailabilityToCalAppointment: function _convertExchangeUserAvailabilityToCalAppointment(aCalendarEvent)
	{
//		if (aCalendarEvent.getTagValue("t:BusyType") == "Free") {
/*			var startDate = this.tryToSetDateValue(aCalendarEvent.getTagValue("t:StartTime"), null);
			var endDate = this.tryToSetDateValue(aCalendarEvent.getTagValue("t:EndTime"), null);

			// Cleanup items that were busy but are now free.
dump("\n== removed ==:"+aCalendarEvent.toString()+"\n");
			for (var index in this.itemCacheById) {
				if ((startDate.compare(this.itemCacheById[index].endDate) < 0) && (endDate.compare(this.itemCacheById[index].startDate) > 0)) {
					this.notifyTheObservers("onDeleteItem", [this.itemCacheById[index]]);
					delete this.itemCacheById[index];
				}
			}*/
			
//			return null;
//		}

		var item = createEvent();
//		var item = Cc["@1st-setup.nl/exchange/calendarevent;1"]
//				.createInstance(Ci.mivExchangeEvent);
		item.calendar = this.superCalendar;

		if (xml2json.getTagValue(aCalendarEvent, "t:BusyType") == "Free") {
			item.setProperty("TRANSP", "TRANSPARENT");
		}
		else {
			item.setProperty("TRANSP", "OPAQUE");
		}

		item.title = this.tryToSetValue(xml2json.getTagValue(aCalendarEvent, "t:BusyType"), "");
		if (! item.title) {
			item.title = "";
		}

		if (xml2json.getTag(aCalendarEvent, "t:CalendarEventDetails")) {
			item.title = this.tryToSetValue(xml2json.getTagValue(xml2json.getTag(aCalendarEvent, "t:CalendarEventDetails"), "t:Subject"), "")+" ("+item.title+")";

			item.setProperty("LOCATION", xml2json.getTagValue(xml2json.getTag(aCalendarEvent, "t:CalendarEventDetails"), "t:Location"));
		}
		else {
			item.title = " ("+item.title+")";
		}

//		item.setProperty("DESCRIPTION", aCalendarItem.getTagValue("t:Body"));

		item.startDate = null;
		if (xml2json.getTagValue(aCalendarEvent, "t:StartTime", null)) {
			if (this.isVersion2007) {
				item.startDate = cal.fromRFC3339(xml2json.getTagValue(aCalendarEvent, "t:StartTime", null), this.globalFunctions.ecUTC());
			}
			else {
				item.startDate = cal.fromRFC3339(xml2json.getTagValue(aCalendarEvent, "t:StartTime", null), this.globalFunctions.ecDefaultTimeZone());
			}
		}

//		item.startDate = this.tryToSetDateValue(aCalendarEvent.getTagValue("t:StartTime"), null);
		if (! item.startDate) {
			if (this.debug) this.logInfo("We have an empty startdate. Skipping this item.");
			item = null;
			return null;
		}

		item.endDate = null;
		if (xml2json.getTagValue(aCalendarEvent, "t:EndTime", null)) {
			if (this.isVersion2007) {
				item.endDate = cal.fromRFC3339(xml2json.getTagValue(aCalendarEvent, "t:EndTime", null), this.globalFunctions.ecUTC());
			}
			else {
				item.endDate = cal.fromRFC3339(xml2json.getTagValue(aCalendarEvent, "t:EndTime", null), this.globalFunctions.ecDefaultTimeZone());
			}
		}

		//item.endDate = this.tryToSetDateValue(aCalendarEvent.getTagValue("t:EndTime"), null);
		if (! item.endDate) {
			if (this.debug) this.logInfo("We have an empty enddate. Skipping this item.");
			return null;
		}


		var startDateStr = xml2json.getTagValue(aCalendarEvent, "t:StartTime", "");
		var endDateStr = xml2json.getTagValue(aCalendarEvent, "t:EndTime", "");
		item.id = this.md5(startDateStr+endDateStr);
		if (this.itemCacheById[item.id]) {
//dump("\n-- we already know this one --:"+xml2json.toString(aCalendarEvent)+"\n");
			//item = null;
			return this.itemCacheById[item.id];
		}

		// Try to see if it is an all day event. Only to see if all hours, minutes and seconds are 0 (zero)
		if ( (item.startDate.hour == 0) && (item.startDate.minute == 0) && (item.startDate.second == 0) &&
		     (item.endDate.hour == 0) && (item.endDate.second == 0) && (item.endDate.second == 0) ) {
			item.startDate.isDate = true;
			item.endDate.isDate = true;
		}

//dump("\n-- added --:"+xml2json.toString(aCalendarEvent)+"\n");
		return item;
	},

	convertExchangeToCal: function _convertExchangeToCal(aExchangeItem, erGetItemsRequest, doNotify, fromOfflineCache)
	{
//		if (this.debug) this.logInfo("convertExchangeToCal:"+aExchangeItem, 2);
		if (!aExchangeItem) { 
			if (this.debug) this.logInfo("convertExchangeToCal: !aExchangeItem", 2);
			//dump("convertExchangeToCal. !aExchangeItem\n");
			return;
		}

		var switchValue = xml2json.getTagValue(aExchangeItem, "t:ItemClass", "");
		if (switchValue.indexOf(".{") > -1) {
			switchValue = switchValue.substr(0,switchValue.indexOf(".{"));
		}

		if (switchValue.indexOf("IPM.Appointment") == 0) {

			if (this.debug) this.logInfo("INFO: convertExchangeToCal: ItemClass = '"+switchValue+"'", 2);
			switchValue = "IPM.Appointment";
		}

		switch (switchValue) {
			case "IPM.Appointment" :
			case "IPM.Appointment.Occurrence" :
			case "IPM.Appointment.MP" :
			case "IPM.Appointment.Live Meeting Request" :
			case "IPM.OLE.CLASS" :
			case "IPM.Schedule.Meeting.Request":
			case "IPM.Schedule.Meeting.Canceled":
				return this.convertExchangeAppointmentToCalAppointment(aExchangeItem, false, erGetItemsRequest, doNotify, fromOfflineCache);
				break;
			case "IPM.Task" : 
				return this.convertExchangeTaskToCalTask(aExchangeItem, erGetItemsRequest, fromOfflineCache);
				break;
			case "IPM.Note" : 
 				return this.convertExchangeTaskToCalTask(aExchangeItem, erGetItemsRequest, fromOfflineCache);
				break;	
			default :
				if (aExchangeItem.tagName == "CalendarEvent") {
					return this.convertExchangeUserAvailabilityToCalAppointment(aExchangeItem);
				}
				if (this.debug) this.logInfo("WARNING: convertExchangeToCal: unknown ItemClass = '"+switchValue+"'");
		}
	},

	updateCalendar: function _updateCalendar(erGetItemsRequest, aItems, doNotify, fromOfflineCache, processInParts)
	{
		if (!processInParts) {
			this.updateCalendar2(erGetItemsRequest, aItems,doNotify, fromOfflineCache);
			return;
		}

		if (this.debug) this.logInfo("updateCalendar: We have '"+aItems.length+"' items to update in calendar in parts. fromOfflineCache:"+fromOfflineCache);

		for (var index in aItems) {
			this.updateCalendarItems.push({ request: erGetItemsRequest,
							item: aItems[index],
							doNotify: doNotify,
							fromOfflineCache: fromOfflineCache});
			aItems[index] = null;
		}

		this.doUpdateCalendarItem();

		if ((this.updateCalendarItems.length > 0) && (!this.updateCalendarTimerRunning)) {
			this.updateCalendarTimerRunning = true;
		        let self = this;
			//this.observerService.notifyObservers(this, "onExchangeProgressChange", "2");
			this.updateCalendarTimer.initWithCallback({ notify: function setTimeout_notify() {self.doUpdateCalendarItem();	}}, 20, this.updateCalendarTimer.TYPE_REPEATING_SLACK);
		}
	},
	
	doUpdateCalendarItem: function _doUpdateCalendarItem()
	{
		if (this.updateCalendarItems.length > 0) {
			var tmpItems = [];

			let counter = 5;
			while ((counter > 0) && (this.updateCalendarItems.length > 0)) {
				var updateRecord = this.updateCalendarItems.shift();
				tmpItems.push(updateRecord.item);
				counter--;
			}

			this.updateCalendar2(updateRecord.request, tmpItems, false, true);
			tmpItems = null;
			updateRecord.item = null;
			updateRecord.request = null;
			updateRecord = null;
		}

		if (this.updateCalendarItems.length == 0) {
			//this.observerService.notifyObservers(this, "onExchangeProgressChange", "-2");
			this.updateCalendarTimer.cancel();
			this.updateCalendarTimerRunning = false;
		}
	},

	updateCalendar2: function _updateCalendar2(erGetItemsRequest, aItems, doNotify, fromOfflineCache)
	{
		if (this.debug) this.logInfo("updateCalendar2: We have '"+aItems.length+"' items to update in calendar. fromOfflineCache:"+fromOfflineCache);

		let cacheItem = {};

		for (var index = 0; index < aItems.length; index++) {

			this.itemsFromExchange++;

			var item = this.convertExchangeToCal(aItems[index], erGetItemsRequest, doNotify, fromOfflineCache);
		
			if (item) { 				
				if ( item.isCancelled && item.reminderIsSet &&  isEvent(item) )
				{
				    var aNewItem = item.QueryInterface(Ci.mivExchangeEvent);				    
					if (this.debug) this.logInfo("updateCalendar2: This item is Cancelled resetting reminder to false :  " + aNewItem.title );
 					this.itemCount++; 
					aNewItem._reminderIsSet=false;
					aNewItem._newAlarm=null;					
					this.modifyItem(aNewItem, item);					
					if (this.debug) this.logInfo("updateCalendar2: hope! reminder is set  for item " +  aNewItem.title + " going to modify next item"  );
				}
				//convertedItems.push(item);
				else if (!this.itemCacheById[item.id]) {
					// This is a new unknown item
					//this.itemCacheById[item.id] = item;  
					if( ( this.isEmailTodo(item,aItems[index]) ===  false ) && ( this.isEmail(item) ===  true  ) ){
					//We are not adding this item because its no longer email followup
 					} 
					else{
						this.addItemToCache(item);
						this.itemCount++;
					
						if ( isEvent(item) && this.markEventasTentative )
						{
							var isOldCacheItem=false;  
							var aItem=item.QueryInterface(Ci.mivExchangeEvent);
	
							if (this.debug) this.logInfo("updateCalendar2: proceed setTentative:"+ item.title);  
								this.setTentative(aItem,aItems[index],isOldCacheItem);
						}
						
						if (this.debug) this.logInfo("updateCalendar2: onAddItem:"+ item.title);
						if (doNotify) {
							this.notifyTheObservers("onAddItem", [item]);
						}
	
						if ((this.useOfflineCache) && (!fromOfflineCache)) {
							cacheItem[item.id] = {calItem: item,
									exchangeItemXML: xml2json.toString(aItems[index])};
							//this.addToOfflineCache(item, xml2json.toString(aItems[index]));
						}
					}
				}
				else {
					// I Allready known this one.
					if (this.debug) this.logInfo("updateCalendar2: onModifyItem:"+ item.title);
					//dump("updateCalendar: onModifyItem:"+ item.title);
					 
					if(( this.isEmail(item) ===  true  ) && ( this.isEmailTodo(item,aItems[index]) ===  false ) ){
  								//We are removing this item from cache because its no longer email followup  
							this.notifyTheObservers("onDeleteItem", [this.itemCacheById[item.id]]);
							this.removeFromOfflineCache(item);
							this.removeItemFromCache(this.itemCacheById[item.id]); 
 					}
					else{						
						this.singleModified(item, doNotify);
	
						if ((this.useOfflineCache) && (!fromOfflineCache)) {
							cacheItem[item.id] = {calItem: item,
									exchangeItemXML: xml2json.toString(aItems[index])};
							//this.addToOfflineCache(item, xml2json.toString(aItems[index]));
						}
					}
				}
 			}

			aItems[index] = null;

		}

		if ((this.useOfflineCache) && (!fromOfflineCache)) {
			this.addToOfflineCache(cacheItem);
		}
	},
	
	isEmailTodo: function _isEmailTodo(item,exchangeData){ 
 		if( this.isEmail(item) ){
			var tmpObject = xml2json.XPath(exchangeData,"/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyTag = '0x1090']");
			
			if (tmpObject.length > 0) {
				 	let ext_val = xml2json.getTagValue(tmpObject[0], "t:Value", "0");
 				 	if( (ext_val === "1") || (ext_val === "2") ){
 				 		return true;	
				 	}
				 	else{
				 		return false;
				 	}
				} 
			else{
		 		return false;
			}
		} 
 		return false; 
	},
	
	isEmail: function _isEmail(item){
		if(item){
			if( item.itemClass == "IPM.Note" ) return true;
		}
		return false;
	},
	
	setTentative: function _setTentative(aItem, exchangeItem ,isOldCacheItem)
	{ 
		//Return when item already in cache
		if ( !aItem  || !exchangeItem || !isEvent(aItem)   ) 
		{
			if (this.debug) this.logInfo("setTentative"); 
			return;
		} 
		
		if ( this.newCalendar )
		{
			if (this.debug) this.logInfo("setTentative : calendar is creating so no setTentative will not proceed"); 
			return;
		}
		
		if ( isOldCacheItem ) 
		{
			//NoResponseReceived
			//t:MyResponseType 
			 if (this.debug) this.logInfo("setTentative 2: This item : " + aItem.title + " is Old and responded with - "  + xml2json.getTagValue(exchangeItem,"t:MyResponseType")  );
			 return;
		}  		
		else
		{
		    var aNewItem = aItem.QueryInterface(Ci.mivExchangeEvent); 
		    var aOldItem = aItem.QueryInterface(Ci.mivExchangeEvent); 
		   
		    var aNewItem = this.cloneItem(aItem);
		    var aOldItem = this.cloneItem(aItem); 
		    
			var itemResponse =xml2json.getTagValue(exchangeItem,"t:MyResponseType");
			if ( itemResponse == "NoResponseReceived" )
			{
				var meNew = this.getInvitedAttendee(aNewItem);
			 	var meOld = this.getInvitedAttendee(aOldItem);
				//Assuming items already marked as tentaive in auto processing settings in ews server
				if (this.debug) this.logInfo("setTentative 2: This item is not in cache " + " stauts: "  + meNew.participationStatus + " :: "  + meOld.participationStatus+ " - " +  aItem.title + " Responded : " + itemResponse );
				//aNewItem.setProperty("STATUS", "TENTATIVE");
		
			 	meNew.participationStatus="TENTATIVE"; 
			 	
				if (this.debug) this.logInfo("setTentative 2: This item is not in cache " + meNew.participationStatus + " :: "  + meOld.participationStatus) ;
				this.modifyEventImmediate(aNewItem, aOldItem); 
			}
			else				
			{
				if (this.debug) this.logInfo("setTentative 2: This item is found in cache " + aItem.title + " Responded : " + itemResponse );
				return;
			}
		}  
	},	
	
	modifyEventImmediate: function _modifyItemImmediate(aNewItem, aOldItem, aListener)
	{

		if (this.debug) this.logInfo("modifyEventImmediate");
		var result = Ci.calIErrors.MODIFICATION_FAILED;

	        if (this.OnlyShowAvailability) {
			this.readOnlyInternal = true;
			this.notifyOperationComplete(aListener,
        	                             Ci.calIErrors.OPERATION_CANCELLED,
                        	             Ci.calIOperationListener.MODIFY,
        	                             aNewItem.id,
        	                             aNewItem);
			return null;
	        }

	        if (this.readOnly) {
			// When we hit this it probably is the change on a alarm. We will process this only in the local cache.
			if (this.debug) this.logInfo("modifyEventImmediate: modifyItem and this calendar is ReadOnly");
			this.notifyTheObservers("onModifyItem", [aNewItem, aOldItem]);
	        	this.notifyOperationComplete(aListener,
	        	                             Cr.NS_OK,
	        	                             Ci.calIOperationListener.MODIFY,
	        	                             aNewItem.id,
	        	                             aNewItem);
			return null;
	        }

		if ((aOldItem.className) && (!aOldItem.canModify)) {
			if (this.debug) this.logInfo("modifyEventImmediate: modifyItem and this item is ReadOnly for this user.");
	        	this.notifyOperationComplete(aListener,
	        	                             Cr.NS_OK,
	        	                             Ci.calIOperationListener.MODIFY,
	        	                             aOldItem.id,
	        	                             aOldItem);
			return null;
		}

		if (this.debug) this.logInfo("modifyEventImmediate: 1 -- aOldItem.recurrenceInfo:"+aOldItem.recurrenceInfo+", aNewItem.recurrenceInfo:"+aNewItem.recurrenceInfo);
		if ((this.debug) && (aOldItem.recurrenceInfo)) this.logInfo("modifyItemAsTentative: 1 -- aOldItem.recurrenceInfo.toString():"+aOldItem.recurrenceInfo.toString());
		if ((this.debug) && (aNewItem.recurrenceInfo)) this.logInfo("modifyItemAsTentative: 1 -- aNewItem.recurrenceInfo.toString():"+aNewItem.recurrenceInfo.toString());

	        if (!aNewItem) {
	            throw Cr.NS_ERROR_INVALID_ARG;
	        }

	        var this_ = this;
	        function reportError(errStr, errId) {
	            this_.notifyOperationComplete(aListener,
	                                          errId ? errId : Cr.NS_ERROR_FAILURE,
	                                          Ci.calIOperationListener.MODIFY,
	                                          aNewItem.id,
	                                          errStr);
	            return null; 
	        }

	        if (aNewItem.id == null) {
	            // this is definitely an error
	            return reportError("modifyEventImmediate: ID for modifyItem item is null");
	        }

		// See if attachments changed.
		var newAttachments = aNewItem.getAttachments({});
		var attachments = {};

		var attachmentsUpdates = { create: [], delete:[] };
		if (newAttachments.length > 0) {
			if (this.debug) this.logInfo("modifyEventImmediate:   -- We have newAttachments:"+newAttachments.length);
			for (var index in newAttachments) {
				if (newAttachments[index].getParameter("X-AttachmentId")) {
					attachments[newAttachments[index].getParameter("X-AttachmentId")] = newAttachments[index];
				}
				else {
					attachmentsUpdates.create.push(newAttachments[index]);
					if (this.debug) this.logInfo("modifyEventImmediate: newAttachment:"+newAttachments[index].uri.spec);
				}
			}
		}
		// Check which have been removed.
		var oldAttachments = aOldItem.getAttachments({});
		for (var index in oldAttachments) {
			if (! attachments[oldAttachments[index].getParameter("X-AttachmentId")]) {
				attachmentsUpdates.delete.push(oldAttachments[index]);
				if (this.debug) this.logInfo("modifyEventImmediate: removedAttachment:"+oldAttachments[index].uri.spec);
			}
		}			
		

		if (isEvent(aNewItem)) {
			if (this.debug) this.logInfo("modifyEventImmediate:  it is an event.");
			var doSendMeetingRespons = false;
			var meOld = this.getInvitedAttendee(aOldItem);
			if (!meOld) {
				if (this.debug) this.logInfo("modifyEventImmediate: Did not find meOld");
				meOld = cal.createAttendee();
				meOld.participationStatus = "NEEDS-ACTION";
			}

			var meNew = this.getInvitedAttendee(aNewItem);
			if (!meNew) {
				if (this.debug) this.logInfo("modifyEventImmediate: Did not find meNew");
				meNew = cal.createAttendee();
				meNew.participationStatus = "NEEDS-ACTION";
			}

			if (aOldItem.isInvitation) {

				if (this.debug) this.logInfo("modifyEventImmediate: 1 meOld.participationStatus="+meOld.participationStatus+", meNew.participationStatus="+meNew.participationStatus);
				if (this.debug) this.logInfo("modifyEventImmediate: 1 aOldItem.status="+aOldItem.getProperty("STATUS")+", aNewItem.status="+aNewItem.getProperty("STATUS"));

				if ((meOld) && (meNew) && (meOld.participationStatus != meNew.participationStatus)) {
					doSendMeetingRespons = true;
				}

				if ((meNew) && (meNew.participationStatus == "NEEDS-ACTION") && (meOld.participationStatus != meNew.participationStatus)) {
					// They choose to confirm at a later state. Do not change this item.
			        	this.notifyOperationComplete(aListener,
			        	                             Cr.NS_OK,
			        	                             Ci.calIOperationListener.MODIFY,
			        	                             aNewItem.id,
			        	                             aNewItem);

			        	return null;
				}

				if ((meOld) && (meNew) && (aOldItem.getProperty("STATUS") != aNewItem.getProperty("STATUS")) && (!doSendMeetingRespons)) {
					switch (aNewItem.getProperty("STATUS")) {
					case "CONFIRMED": 
						meNew.participationStatus = "ACCEPTED";
						break;
					case null:
					case "TENTATIVE": 
						meNew.participationStatus = "TENTATIVE";
						break;
					case "CANCELLED": 
						meNew.participationStatus = "DECLINED";
						break;
					}
					doSendMeetingRespons = true;
				}

			}
			
			if (this.debug) this.logInfo("modifyEventImmediate:  doSendMeetingRespons " + doSendMeetingRespons );
			
			if (doSendMeetingRespons) {
				// The item is an invitation.
				// My status has changed. Send to this.globalFunctions.
				if (this.debug) this.logInfo("modifyEventImmediate: 2 aOldItem.participationStatus="+meOld.participationStatus+", aNewItem.participationStatus="+(meNew ? meNew.participationStatus : ".."));
				if (this.debug) this.logInfo("modifyEventImmediate: 3a aOldItem.id="+aOldItem.id);
				if (this.debug) this.logInfo("modifyEventImmediate: 3b aNewItem.id="+aNewItem.id);

				var requestResponseItem = aNewItem;
				requestResponseItem.setProperty("X-MEETINGREQUEST", true);
				var aResponse = null;

				// Loop through meetingRequestsCache to find it.
				var cachedItem = null;
				for (var index in this.meetingRequestsCache) {
					if (this.meetingRequestsCache[index]) {
						if (this.meetingRequestsCache[index].uid == aNewItem.id) {
							cachedItem = this.meetingRequestsCache[index];
							break;
						}
					}
				}

				if (cachedItem) {
					if (this.debug) this.logInfo("modifyEventImmediate: ___________ Found in meeting request cache.");
					var tmpItem = cachedItem;
					var tmpUID = aNewItem.id;
					requestResponseItem = this.cloneItem(aNewItem);
					requestResponseItem.id = tmpItem.id;
					//requestResponseItem.setProperty("X-UID",  tmpItem.uid);
					//requestResponseItem.setProperty("X-ChangeKey",  tmpItem.changeKey);
				}
				else {
					if (this.debug) this.logInfo("modifyEventImmediate: ___________ NOT Found in meeting request cache. X-UID:"+aNewItem.uid);

					if (aNewItem.id == aNewItem.parentItem.id) {
						if (this.debug) this.logInfo("modifyEventImmediate: _________ it is a master.");
					}

					if ((!this.itemCacheById[aNewItem.id]) && (!this.recurringMasterCache[aNewItem.uid])) {
						this.getMeetingRequestFromServer(aNewItem, aOldItem.uid, Ci.calIOperationListener.MODIFY, aListener);
						return;
					}

				}

				if (this.sendMeetingResponsImmediate(requestResponseItem, null, "exisiting", aResponse)) {
					//return;
					result = Cr.NS_OK;
				}
				else {
					if (this.debug) this.logInfo("modifyEventImmediate : canceled by user.");
					result = Cr.NS_OK;
				}
			}
			else {

				var input= { item: aNewItem, 
					     response: "sendtonone"};

				if (aNewItem.organizer) {
					if (this.debug) this.logInfo("The organizer is:"+aNewItem.organizer.id);
				}
				else {
					if (this.debug) this.logInfo("We have no organizer!");
				}


				var changesObj = this.makeUpdateOneItem(aNewItem, aOldItem, null, null, null, aOldItem.isInvitation);
				var changes;
				if (changesObj) {
					changes = changesObj.changes;
				}
				var weHaveChanges = (changes || (attachmentsUpdates.create.length > 0) || (attachmentsUpdates.delete.length > 0));
//				var weHaveChanges = (this.makeUpdateOneItem(aNewItem, aOldItem, null, null, null, aOldItem.isInvitation) || (attachmentsUpdates.create.length > 0) || (attachmentsUpdates.delete.length > 0));

				var iAmOrganizer = ((aNewItem.organizer) && (aNewItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()));
				//if (iAmOrganizer) {}

				if (this.debug) this.logInfo("modifyEventImmediate:  it is a event. aOldItem.CalendarItemType=:"+aOldItem.calendarItemType);

				// We have a Single or master
				if (aOldItem.calendarItemType == "RecurringMaster") {
					if (this.debug) this.logInfo(" Master changed:"+aNewItem.title);
					// See if the aNewItem is also the master record.
					var masterChanged = (aNewItem.parentItem.id == aNewItem.id);

					// We need to find out wat has changed;
					if (this.debug) this.logInfo("modifyEventImmediate:  ==1 invite="+aOldItem.isInvitation);

					if (changes) {
						if (this.debug) this.logInfo("modifyEventImmediate: changed:"+String(changes));

						var self = this;
						this.addToQueue( erUpdateItemRequest,
							{user: this.user, 
							 mailbox: this.mailbox,
							 folderBase: this.folderBase,
							 serverUrl: this.serverUrl,
							 item: aOldItem,
							 folderID: this.folderID,
							 changeKey: this.changeKey,
							 updateReq: changes,
							 newItem: aNewItem,
					 		 actionStart: Date.now(),
							 attachmentsUpdates: attachmentsUpdates,
							 sendto: input.response}, 
							function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
							function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
							aListener);
						return;
					}
					else {
						if (this.debug) this.logInfo("modifyEventImmediate:  No changes for master.");
						// No changes to a master could means that one of the occurrences
						// was deleted. 
						var removedOccurrence = this.getRemovedOccurrence(aOldItem, aNewItem);
						if (removedOccurrence) {
							// Delete this occurrence; multi
							this.notifyTheObservers("onDeleteItem", [removedOccurrence], true);
							this.deleteItem(removedOccurrence);
							result = Cr.NS_OK;
						}
						else {
							// Could be an alarm dismiss or snooze
							dump("IF YOU SEE THIS PLEASE REPORT..(CODE1)\n");
							this.masterModified(aNewItem);
						}
						result = Cr.NS_OK;
					}
				}
				else {
					if (this.debug) this.logInfo("modifyEventImmediate: '"+aOldItem.calendarItemType+"' event modification");
					// We need to find out wat has changed;
					if (this.debug) this.logInfo("modifyEventImmediate:  ==1 invite="+aOldItem.isInvitation);

					if (changes) {
						if (this.debug) this.logInfo("modifyEventImmediate:  changed:"+String(changes));

						var self = this;
						this.addToQueue( erUpdateItemRequest,
							{user: this.user, 
							 mailbox: this.mailbox,
							 folderBase: this.folderBase,
							 serverUrl: this.serverUrl,
							 item: aOldItem,
							 folderID: this.folderID,
							 changeKey: this.changeKey,
							 updateReq: changes,
							 newItem: aNewItem,
					 		 actionStart: Date.now(),
							 attachmentsUpdates: attachmentsUpdates,
							 sendto: input.response}, 
							function(erUpdateItemRequest, aId, aChangeKey) { self.updateItemOk(erUpdateItemRequest, aId, aChangeKey);}, 
							function(erUpdateItemRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erUpdateItemRequest, aCode, aMsg);},
							aListener);
						this.singleModified(aNewItem, true, true);
						return;
					}
					else {
						if (this.doAttachmentUpdates(attachmentsUpdates, aOldItem, input.response, aListener)) {
							// We are done
							if (this.debug) this.logInfo("modifyEventImmediate:  No only attachment changes no other fields.");
							return;
						}
						else {
							if (this.debug) this.logInfo("modifyEventImmediate:  No changes 1.");
							if (!aOldItem.isInvitation) {
								//aNewItem.parentItem = aNewItem; move to storagecalendar
								this.singleModified(aNewItem, true, true);
							}
							result = Cr.NS_OK;
						}
					}
				}
			}
		} 
		//this.notifyTheObservers("onModifyItem", [aNewItem, aOldItem]); 
        	this.notifyOperationComplete(aListener,
        	                             result,
        	                             Ci.calIOperationListener.MODIFY,
        	                             aNewItem.id,
        	                             aNewItem);

        	return null;
	},
	
	sendMeetingResponsImmediate: function _sendMeetingResponsImmediate(aItem, aListener, aItemType, aResponse, aBodyText)
	{
		if (this.debug) this.logInfo("sendMeetingResponsImmediate");

		// Check if I'm the organiser. Do not send to myself.
		if (aItem.organizer) {
			if (aItem.organizer.id.replace(/^mailto:/i, '').toLowerCase() == this.mailbox.toLowerCase()) {
				return true;
			}
		}
		var me = this.getInvitedAttendee(aItem);
		if ((!me) && (!aResponse)) {
			return false;
		}

		if (aResponse) {
			var tmpResponse = aResponse;
		}
		else {
			var tmpResponse = me.participationStatus;
		}

		var messageDisposition = "SendOnly";
		
		var input= { item: aItem, 
			     response: tmpResponse,
			     answer: "",
			     bodyText: ""}; 
	 
		if (this.debug) this.logInfo("sendMeetingResponsImmediate:  -------------- messageDisposition="+messageDisposition);

		var self = this;
		this.addToQueue( erSendMeetingResponsRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 folderBase: this.folderBase,
			 serverUrl: this.serverUrl,
			 item: aItem,
			 folderID: this.folderID,
			 changeKey: this.changeKey,
			 response: input.response,
			 bodyText: input.bodyText,
			 senderMailbox: this.mailbox,
	 		 actionStart: Date.now(),
			 itemType: aItemType,
			 messageDisposition: messageDisposition}, 
			function(erSendMeetingResponsRequest) { self.sendMeetingResponsOk(erSendMeetingResponsRequest);}, 
			function(erSendMeetingResponsRequest, aCode, aMsg) { self.whichOccurrencegetOccurrenceIndexError(erSendMeetingResponsRequest, aCode, aMsg);},
			aListener);
		return true;
	},
	

	getCalendarItemsOK: function _getCalendarItemsOK(erGetItemsRequest, aItems, aItemErrors)
	{
 		if (this.debug) this.logInfo("getCalendarItemsOK: aItems.length="+aItems.length);
 		this.saveCredentials(erGetItemsRequest.argument);
		this.notConnected = false;

		if ((aItemErrors) && (aItemErrors.length > 0)) {
			// Remove these items as they have an error
			var i = 0;
			while (i < aItemErrors.length) {
				if (this.itemCacheById[aItemErrors[i]]) {
					this.removeFromOfflineCache(this.itemCacheById[aItemErrors[i]]);
					this.notifyTheObservers("onDeleteItem", [this.itemCacheById[aItemErrors[i]]]);
					this.removeItemFromCache(this.itemCacheById[aItemErrors[i]]);
				}
				else {
					this.removeFromOfflineCache({ id: aItemErrors[i], title:"from offline"});
				}
				i++;
			}
			
		}

		if (aItems.length == 0) {
			return;
		}

		this.updateCalendar(erGetItemsRequest, aItems, true);
		aItems = null;
		erGetItemsRequest = null;
	},

	getCalendarItemsError: function _getCalendarItemsError(erGetItemsRequest, aCode, aMsg)
	{
		this.saveCredentials(erGetItemsRequest.argument);
		this.notConnected = true;

	},

	get isVersion2013()
	{
		if (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2013") > -1 ) {
			return true;
		}

		return false;
	},

	get isVersion2010()
	{
		if (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2010") > -1 ) {
			return true;
		}

		return false;
	},

	get isVersion2007()
	{
		if (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2007") > -1 ) {
			return true;
		}

		return false;
	},

	set weAreSyncing(aValue)
	{
		if (aValue != this._weAreSyncing) {
			if (this.debug) this.logInfo("this._weAreSyncing changed from '"+this._weAreSyncing+"' to '"+aValue+"'");
		}
		this._weAreSyncing = aValue;
	},

	get weAreSyncing()
	{
		return this._weAreSyncing;
	},

	getSyncState: function _getSyncState()
	{ 
		if (this.isOffline) return;

		if (!this.weAreSyncing) {
			// We do not yet have a syncState. Get it first.
			if (this.debug) this.logInfo("getSyncState: Creating erSyncFolderItemsRequest");
			var self = this;
			this.weAreSyncing = true;
			switch (this.folderBase) {
			case "tasks":
			    if(!this.deactivateTaskFollowup){
				    this.logInfo("getSyncState: this.syncStateInbox - " +  this.syncStateInbox );  
					this.addToQueue(erSyncFolderItemsRequest,
							{user: this.user, 
						 mailbox: this.mailbox,
						 serverUrl: this.serverUrl,
						 folderBase: "inbox",
  						 syncState: this.syncStateInbox,
						 actionStart: Date.now() },
						function(erSyncFolderItemsRequest, creations, updates, deletions, syncState) { self.syncFolderItemsOK(erSyncFolderItemsRequest, creations, updates, deletions, syncState);}, 
						function(erSyncFolderItemsRequest, aCode, aMsg) { self.syncFolderItemsError(erSyncFolderItemsRequest, aCode, aMsg);},
						null);  
			    }
				//Donot  break because we neet to call below section by default..
				default:
				    this.logInfo("getSyncState: this.syncState - "  + this.syncState); 

					this.addToQueue(erSyncFolderItemsRequest,
							{user: this.user, 
						 mailbox: this.mailbox,
						 serverUrl: this.serverUrl,
						 folderBase: this.folderBase,
						 folderID: this.folderID,
						 changeKey: this.changeKey,
						 syncState: this.syncState,
						 actionStart: Date.now() },
						function(erSyncFolderItemsRequest, creations, updates, deletions, syncState) { self.syncFolderItemsOK(erSyncFolderItemsRequest, creations, updates, deletions, syncState);}, 
						function(erSyncFolderItemsRequest, aCode, aMsg) { self.syncFolderItemsError(erSyncFolderItemsRequest, aCode, aMsg);},
						null);  
			} 
		}
		else {
			if (this.debug) this.logInfo("getSyncState: not creating erSyncFolderItemsRequest because we are allready syncing");
		}
	},

	syncFolderItemsOK: function _syncFolderItemsOK(erSyncFolderItemsRequest, creations, updates, deletions, syncState)
	{
		this.folderPathStatus = 0;
		this.saveCredentials(erSyncFolderItemsRequest.argument);
		this.notConnected = false;
		if (this.debug) this.logInfo("syncFolderItemsOK: Folderbase: "+erSyncFolderItemsRequest.folderBase+", Creation:"+creations.length+", Updates:"+updates.length+", Deletions:"+deletions.length+", syncState:" + syncState);

		if ((creations.length > 0) || (updates.length > 0) || (deletions.length > 0)) {
			this.addActivity(calGetString("calExchangeCalendar", "syncFolderEventMessage", [creations.length, updates.length, deletions.length, this.name], "exchangecalendar"), "", erSyncFolderItemsRequest.argument.actionStart, Date.now());
		} 

		if (syncState) {
			
			if ((this.syncState) && (syncState == this.syncState || syncState == this.syncStateInbox )) {
				this.logError("Same syncState received.");
			}
			
 			// This was the first time. we now save the syncState;
			if( erSyncFolderItemsRequest.folderBase == "inbox" )	{
				this.syncStateInbox = syncState;  
				this.prefs.deleteBranch("syncStateInbox");
				this.prefs.setCharPref("syncStateInbox",syncState);
				this.saveToFile("syncStateInbox.txt", syncState);
			}
			else{
				this.syncState = syncState; 
				this.prefs.deleteBranch("syncState"); 
				this.prefs.setCharPref("syncState",syncState); 
				this.saveToFile("syncState.txt", syncState); 
			}
			this.weAreSyncing = false; 
		}

		var self = this;

		var changes = [];
		for each(var creation in creations) { changes.push(creation); }
		for each(var update in updates) { changes.push(update); }
		if (changes.length > 0) {
  			switch(erSyncFolderItemsRequest.folderBase){
			case "tasks": 
				this.findTaskItemsOK(erSyncFolderItemsRequest,changes);
				break;
			case "calendar":
				this.findCalendarItemsOK(erSyncFolderItemsRequest,changes,[]);
				break;
			case "inbox":
				this.findFollowupTaskItemsOK(erSyncFolderItemsRequest,changes);
				break;
			default: 
				this.logError("Changes could not be made." + erSyncFolderItemsRequest.folderBase); 
			}
			
/*			this.addToQueue( erGetItemsRequest, 
				{user: this.user, 
				 mailbox: this.mailbox,
				 folderBase: this.folderBase,
				 serverUrl: this.serverUrl,
				 ids: changes,
				 folderID: this.folderID,
				 changeKey: this.changeKey,
				 folderClass: this.folderClass,
				 GUID: calExchangeCalendarGUID,
				 syncState: syncState }, 
				function(erGetItemsRequest, aIds, aItemErrors) { self.getTaskItemsOK(erGetItemsRequest, aIds, aItemErrors);}, 
				function(erGetItemsRequest, aCode, aMsg) { self.getTaskItemsError(erGetItemsRequest, aCode, aMsg);},
				null);
				*/
		}

		if (!syncState) return;

		if (deletions.length > 0) {
			for each (var deleted in deletions) {
				var item = this.itemCacheById[deleted.Id];
				if ((!item) && (this.useOfflineCache)) {
					// It could be that the item is not yet loaded from offlineCache. We do this now.
					item = this.getItemFromOfflineCache(deleted.Id);
				}
				if ((item) && (item.calendarItemType != "RecurringMaster")) {
					// We have this one. Remove it.
					if (this.debug) this.logInfo("Going to remove an item");
					// Single item or occurrence.
					if (item.parentItem.id == item.id) {
						if (this.debug) this.logInfo("This is a Single to delete. Title:"+item.title+", calendarItemType:"+item.calendarItemType);
					}
					else {
						if (this.debug) this.logInfo("This is a Occurrence or Exception to delete. THIS SHOULD NEVER HAPPEN.");
					}
					this.notifyTheObservers("onDeleteItem", [item]);
					/*this.itemCacheById[item.id].deleteItem();
					this.itemCacheById[item.id] = null;
					delete this.itemCacheById[item.id];*/
					this.removeItemFromCache(item);
					this.removeFromOfflineCache(item); 
				}
				else {
					// Find matching master record.
					var master;
					for (var index in this.recurringMasterCache) {
						if ((this.recurringMasterCache[index]) && (this.recurringMasterCache[index].id == deleted.Id)) {
							master = this.recurringMasterCache[index]
						}
					}
					if (master) {
						// This is a master recurrence. Also remove children.
						if (this.debug) this.logInfo("This is Master to delete");
						this.removeChildrenFromMaster(master);

						this.removeFromOfflineCache(master);
						//this.notifyTheObservers("onDeleteItem", [master]);
						delete this.recurringMasterCache[master.uid];
						delete this.recurringMasterCacheById[master.id];
					}
					else {
						if (this.debug) this.logInfo("Do not know what you are trying to delete !!!");
					}
				}
			}
		}

		if (!this.firstSyncDone) { 
			this.firstSyncDone = true;
			if (this.debug) this.logInfo("First sync is done. Normal operation is starting.");

			while (this.getItemsSyncQueue.length > 0) {
				let getItemsReq = this.getItemsSyncQueue.shift();
				this.getItems(getItemsReq.itemFilter, getItemsReq.count, getItemsReq.rangeStart, getItemsReq.rangeEnd, getItemsReq.listener);
			}
			if (this.debug) this.logInfo("First sync is done. Processed getItemsSyncQueue.");
		}

		if (this.getItemSyncQueue.length > 0) {
			if (this.debug) this.logInfo("We have "+this.getItemSyncQueue.length+" items in this.getItemSyncQueue");
			this.processItemSyncQueue();
		} 
	},

	syncFolderItemsError: function _syncFolderItemsError(erSyncFolderItemsRequest, aCode, aMsg)
	{
		if (this.debug) this.logInfo("syncFolderItemsError");
		this.folderPathStatus = -1;
		this.saveCredentials(erSyncFolderItemsRequest.argument);
		this.notConnected = true;
		this.weAreSyncing = false;
		this.processItemSyncQueue();
	},

	// Check if specified folder still exists. If so get new id and changekey.
	checkFolderPath: function _checkFolderPath()
	{
		// We first restore from prefs.js file from the last time.
		var tmpFolderClass = this.globalFunctions.safeGetCharPref(this.prefs,"folderClass", null);
		if (tmpFolderClass) {
			if (this.debug) this.logInfo("Restore folderClass from prefs.js:"+tmpFolderClass);
			this.setSupportedItems(tmpFolderClass);

			var tmpFolderProperties = this.globalFunctions.safeGetCharPref(this.prefs,"folderProperties", null);
			if (tmpFolderProperties) {
				this.saveToFile("folderProperties.txt", tmpFolderProperties);
				this.prefs.deleteBranch("folderProperties");
			}

			if (tmpFolderProperties) {
				//if (this.debug) this.logInfo("Restore folderProperties from prefs.js:"+tmpFolderProperties);
				var tmpXML = this.globalFunctions.xmlToJxon(tmpFolderProperties);
				this.folderProperties = tmpXML;

				this.folderIsNotAvailable = true;

				this.setFolderProperties(tmpXML, tmpFolderClass);
				tmpXML = null;
			}
		}

		this.setServerVersion();

		if (this.isOffline) return;

		if (this.folderPath != "/") {
			if (this.debug) this.logInfo("checkFolderPath 1");
			this.folderPathStatus = 1;
			var self = this;

			this.addToQueue( erFindFolderRequest,
				{user: this.user, 
				 mailbox: this.mailbox,
				 serverUrl: this.serverUrl,
				 folderBase: this.folderBase,
				 folderPath: this.folderPath,
				 actionStart: Date.now()}, 
				function(erFindFolderRequest, aId, aChangeKey, aFolderClass) { self.checkFolderPathOk(erFindFolderRequest, aId, aChangeKey, aFolderClass);}, 
				function(erFindFolderRequest, aCode, aMsg) { self.checkFolderPathError(erFindFolderRequest, aCode, aMsg);},
				null);
		}
		else {
			if (this.folderIDOfShare != "") {
				// Get Folder Properties.
				var self = this;

				this.addToQueue( erGetFolderRequest,
					{user: this.user, 
					 mailbox: this.mailbox,
					 serverUrl: this.serverUrl,
					 folderID: this.folderID,
					 changeKey: this.changeKey,
					 actionStart: Date.now()}, 
					function(erGetFolderRequest, aId, aChangeKey, aFolderClass) { self.getFolderOk(erGetFolderRequest, aId, aChangeKey, aFolderClass);}, 
					function(erGetFolderRequest, aCode, aMsg) { self.checkFolderPathError(erGetFolderRequest, aCode, aMsg);},
					null);
			}
			else {
				if (this.debug) this.logInfo("checkFolderPath 2");
				this.folderPathStatus = 1;
				var self = this;
	
				this.addToQueue( erGetFolderRequest,
					{user: this.user, 
					 mailbox: this.mailbox,
					 serverUrl: this.serverUrl,
					 folderBase: this.folderBase,
					 folderPath: this.folderPath,
					 actionStart: Date.now()}, 
					function(erGetFolderRequest, aId, aChangeKey, aFolderClass) { self.getFolderOk(erGetFolderRequest, aId, aChangeKey, aFolderClass);}, 
					function(erGetFolderRequest, aCode, aMsg) { self.checkFolderPathError(erGetFolderRequest, aCode, aMsg);},
					null);
			}
		}
	},

	setSupportedItems: function _setSupportedItems(aFolderClass)
	{
		this.folderClass = aFolderClass;
		if (this.debug) this.logInfo("Set folderClass="+this.folderClass.toString());
		this.prefs.setCharPref("folderClass", aFolderClass);
		var itemType = Ci.calICalendar.ITEM_FILTER_TYPE_EVENT;

		switch (aFolderClass.toString()) {
			case "IPF.Appointment":
				this.supportsEvents = true;
				this.supportsTasks = false;
				if (this.debug) this.logInfo("This folder supports only events.");
				//this.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_EVENT, 0, this.startCacheDate, this.endCacheDate, null);
				break;
			case "IPF.Task":
				this.supportsEvents = false;
				this.supportsTasks = true;
				if (this.debug) this.logInfo("This folder supports only tasks.");
				itemType = Ci.calICalendar.ITEM_FILTER_TYPE_TODO;
				// Get the tasks for the current know time frame
				//this.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_TODO, 0, this.startCacheDate, this.endCacheDate, null);
				break;
			case "IPF.Note":
				this.supportsEvents = false;
				this.supportsTasks = true;
				if (this.debug) this.logInfo("This folder supports only tasks.");
				itemType = Ci.calICalendar.ITEM_FILTER_TYPE_TODO; 
				break;
			default:
				this.supportsEvents = false;
				this.supportsTasks = false;
				if (this.debug) this.logInfo("Unknown folderclass. We do not know if it supports events or tasks so turning it off.");
				break;
		}		

	},

	checkFolderPathOk: function _checkFolderPathOk(erFindFolderRequest, aId, aChangeKey, aFolderClass)
	{
		this.saveCredentials(erFindFolderRequest.argument);
		if (this.debug) this.logInfo("checkFolderPathOk: aId"+aId+", aChangeKey:"+aChangeKey+", aFolderClass:"+aFolderClass);
		this.notConnected = false;
		
		this.folderID = aId;
		this.changeKey = aChangeKey;
		
		this.setSupportedItems(aFolderClass);

		// Get Folder Properties.
		var self = this;

		this.addToQueue( erGetFolderRequest,
			{user: this.user, 
			 mailbox: this.mailbox,
			 serverUrl: this.serverUrl,
			 folderID: aId,
			 changeKey: aChangeKey,
			 actionStart: Date.now()}, 
			function(erGetFolderRequest, aId, aChangeKey, aFolderClass) { self.getFolderOk(erGetFolderRequest, aId, aChangeKey, aFolderClass);}, 
			function(erGetFolderRequest, aCode, aMsg) { self.checkFolderPathError(erGetFolderRequest, aCode, aMsg);},
			null);
		
	},

	get canCreateContent()
	{
		if ((this.OnlyShowAvailability) || (this.folderIsNotAvailable)) {
			return false;
		}
		return this._canCreateContent;
	},
 
	get canDelete()
	{
		if ((this.OnlyShowAvailability) || (this.folderIsNotAvailable)) {
			return false;
		}
		return this._canDelete;
	},
 
	get canRead()
	{
		if ((this.OnlyShowAvailability) || (this.folderIsNotAvailable)) {
			return true;
		}
		return this._canRead;
	},
 
	get canModify()
	{
		if ((this.OnlyShowAvailability) || (this.folderIsNotAvailable)) {
			return false;
		}
		return this._canModify;
	},
 
	setFolderProperties: function _setFolderProperties(aFolderProperties, aFolderClass)
	{
		//BUG 111
		// When the user only has permissions to see free/busy info and also permissions to read the folder
		// properties we should activate OnlyShowAvailability variable.
		// Problem is when is this condition true
		// For now we will set OnlyShowAvailability = true when EffectiveRights.Read == false
		if (this.debug) this.logInfo(" >>>>>>>>>>>>>>MIV>:"+aFolderClass.toString());
		var rm = aFolderProperties.XPath("/s:Envelope/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage/m:Folders/*/t:EffectiveRights");
		if (rm.length > 0) {
			this._effectiveRights = rm[0];
			if (this._effectiveRights) {
				this._canDelete = (this._effectiveRights.getTagValue("t:Delete", "false") == "true");
				this._canModify = (this._effectiveRights.getTagValue("t:Modify", "false") == "true");
				this._canRead = (this._effectiveRights.getTagValue("t:Read", "false") == "true");
				this._canCreateContent = (this._effectiveRights.getTagValue("t:CreateContents", "false") == "true"); 
			}
		}
		else {
			this._effectiveRights = null;
			this._canDelete = false;
			this._canModify = false;
			this._canRead = false;
			this._canCreateContent = false;
		}
		rm = null;

		var rm = aFolderProperties.XPath("/s:Envelope/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage/m:Folders/*/t:EffectiveRights[t:Read='true']");
		this.folderIsNotAvailable = false;

		if (rm.length == 0) {
			if (this.debug) this.logInfo("getFolderOk: but EffectiveRights.Read == false. Only getting Free/Busy information.");
			if (!this.OnlyShowAvailability) {
				this.OnlyShowAvailability = true;
				this.useOfflineCache = false;
				this.firstSyncDone = true;
				this.getOnlyFreeBusyInformation(this.lastValidRangeStart, this.lastValidRangeEnd);
				this.startCalendarPoller();
			}		
		}
		else {
			if (this.debug) this.logInfo("getFolderOk: but EffectiveRights.Read != false. Trying to get all event information.");
			this.readOnlyInternal = false;

			this.setSupportedItems(aFolderClass);		
		}
		rm = null;

		this.getTimeZones();

	},

	getFolderOk: function _getFolderOk(erGetFolderRequest, aId, aChangeKey, aFolderClass)
	{
		this.saveCredentials(erGetFolderRequest.argument);
		if (this.debug) this.logInfo("getFolderOk: aId"+aId+", aChangeKey:"+aChangeKey+", aFolderClass:"+aFolderClass);
		this.notConnected = false;
		
		this.folderProperties = erGetFolderRequest.properties;
		this.saveToFile("folderProperties.txt", this.folderProperties.toString());
		//this.prefs.setCharPref("folderProperties", this.folderProperties.toString());

		this.prefs.setCharPref("lastServerVersion", this.exchangeStatistics.getServerVersion(this.serverUrl));
		this.prefs.setCharPref("lastMajorVersion", this.exchangeStatistics.getMajorVersion(this.serverUrl));
		this.prefs.setCharPref("lastMinorVersion", this.exchangeStatistics.getMinorVersion(this.serverUrl));

		this.folderIsNotAvailable = true;

		this.setFolderProperties(this.folderProperties, aFolderClass);

		if (this.newCalendar) {
			this.newCalendar = false;
			if (this.supportsEvents) {
				this.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_EVENT, 0, this.newCalRangeStartEvents, this.newCalRangeEndEvents, null);
			}
			if (this.supportsTasks) {
				this.getItems(Ci.calICalendar.ITEM_FILTER_TYPE_TODO, 0, this.newCalRangeStartTodos, this.newCalRangeEndTodos, null);
			}
		}
	},

	checkFolderPathError: function _checkFolderPathError(erFindFolderRequest, aCode, aMsg)
	{
		this.folderPathStatus = -1;
		if (this.debug) this.logInfo("checkFolderPathError: Code:"+aCode+", Msg:"+aMsg);
		// We could not get the specified folder anymore. Stop working.
		// 21-03-2012 Try to get Free/Busy/Tentative information and show that.

		if (aCode == -10) {
			this.notConnected = true;
		}
		else {

			if (this.debug) this.logInfo("Going to check if we should show free/busy data.");
			if (!this.OnlyShowAvailability) {
				if (this.debug) this.logInfo("Turning on the showing of only free/busy data.");
				this.OnlyShowAvailability = true;
				this.useOfflineCache = false;
				this.firstSyncDone = true;
				this.folderIsNotAvailable = true;
				this.folderProperties = null;
				//this.prefs.deleteBranch("folderProperties");
				this.removeFile("folderProperties.txt");
				this.readOnlyInternal = true;
				this.getOnlyFreeBusyInformation(this.lastValidRangeStart, this.lastValidRangeEnd);
				this.startCalendarPoller();
			}		
		}
	},

	getOnlyFreeBusyInformation: function _getOnlyFreeBusyInformation(aRangeStart, aRangeEnd)
	{
		if ((!aRangeStart) && (!aRangeEnd)) {
			if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeStart and aRangeEnd missing. Going to set start to 20 days before and end to 20 days after now.");
			var offset = cal.createDuration();
			offset.days = -20;
			//offset.normalize();
			aRangeStart = cal.now();
			aRangeStart.addDuration(offset);
			var offset = cal.createDuration();
			offset.days = 20;
			//offset.normalize();
			aRangeEnd = cal.now();
			aRangeEnd.addDuration(offset);
		}

		if ((aRangeStart) && (!aRangeEnd)) {
			if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeEnd missing. Going to set end to 40 days after start.");
			var offset = cal.createDuration();
			offset.days = 40;
			//offset.normalize();
			aRangeEnd = aRangeStart.clone();
			aRangeEnd.addDuration(offset);
		}

		if ((!aRangeStart) && (aRangeEnd)) {
			if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeStart missing. Going to set start to 40 days before end.");
			var offset = cal.createDuration();
			offset.days = -40;
			//offset.normalize();
			aRangeStart = aRangeEnd.clone();
			aRangeStart.addDuration(offset);
		}

		if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeStart:"+aRangeStart+", aRangeEnd:"+aRangeEnd);

		var tmpStartDate = aRangeStart.clone();
		tmpStartDate.isDate = false;
		var tmpEndDate = aRangeEnd.clone();
		tmpEndDate.isDate = false;

		if (tmpStartDate.year == 1970) {
			if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeStart is 1970. To big a range. Setting startrange to 40 days before endrange.");
			var offset = cal.createDuration();
			offset.days = -40;
			offset.normalize();
			tmpStartDate = tmpEndDate.clone();
			tmpStartDate.addDuration(offset);
		}
		else {
			var offset = tmpEndDate.subtractDate(tmpStartDate);
			if (offset.days > 40) {
				if (this.debug) this.logInfo("getOnlyFreeBusyInformation: aRangeStart is more than 40 days before endrange. Setting startrange to 40 days before endrange.");
				var offset = cal.createDuration();
				offset.days = -40;
				offset.normalize();
				tmpStartDate = tmpEndDate.clone();
				tmpStartDate.addDuration(offset);
			}
		}

		var self = this;
		this.addToQueue( erGetUserAvailabilityRequest, 
			{user: this.user, 
			 folderBase: "calendar",
			 serverUrl: this.serverUrl,
			 email: this.mailbox.replace(/^mailto:/i, ""),
			 attendeeType: 'Required',
			 start: cal.toRFC3339(tmpStartDate.getInTimezone(this.globalFunctions.ecUTC())),
			 end: cal.toRFC3339(tmpEndDate.getInTimezone(this.globalFunctions.ecUTC())),
			 folderID: this.folderID,
			 changeKey: this.changeKey }, 
			function(erGetUserAvailabilityRequest, aEvents) { self.getUserAvailabilityRequestOK(erGetUserAvailabilityRequest, aEvents);}, 
			function(erGetUserAvailabilityRequest, aCode, aMsg) { self.getUserAvailabilityRequestError(erGetUserAvailabilityRequest, aCode, aMsg);},
			null);
	},

	setServerVersion: function _setServerVersion()
	{
		this.prefServerVersion = this.globalFunctions.safeGetCharPref(this.prefs,"lastServerVersion", null);
		this.prefMajorVersion = this.globalFunctions.safeGetCharPref(this.prefs,"lastMajorVersion", null);
		this.prefMinorVersion = this.globalFunctions.safeGetCharPref(this.prefs,"lastMinorVersion", null);
		if (this.prefServerVersion) {
			if (this.debug) this.logInfo("Restored prefServerVersion from prefs.js:"+this.prefServerVersion+" ("+this.prefMajorVersion+"."+this.prefMinorVersion+")");
			this.exchangeStatistics.setServerVersion(this.serverUrl, this.prefServerVersion, this.prefMajorVersion, this.prefMinorVersion);
		}
	},

	getTimeZones: function _getTimeZones()
	{
		this.setServerVersion();

		this.timeZones.addURL(this.serverUrl, this.user, this);
	},

	getEWSTimeZoneId: function _getEWSTimeZoneId(aCalTimeZone, aDate)
	{
		if (this.debug) this.logInfo("getEWSTimeZoneId:"+aCalTimeZone.tzid);

		return this.timeZones.getExchangeTimeZoneIdByCalTimeZone(aCalTimeZone, this.serverUrl, aDate);
	},

	doDeleteCalendar: function _doDeleteCalendar()
	{
		this.doShutdown();

		// Remove the offline cache database when we delete the calendar.
		if (this.dbFile) {
			this.dbFile.remove(true);
			this.offlineCacheDB = null;
		}
	},

	addItemToCache: function _addItemToCache(item)
	{
		if (!item) {
			//dump("addItemToCache: item is null.\n");
			return;
		}

		var itemStartDate = item.startDate || item.entryDate;
		var itemEndDate = item.endDate || item.dueDate;

/*if (this.itemCacheById[item.id]) { 
	dump("addItemToCache: item.title:"+item.title+", startDate:"+itemDate+". IS AL READY IN CACHE.\n");
}
else {
	dump("addItemToCache: item.title:"+item.title+", startDate:"+itemDate+" | "+item.id+".\n");
}*/
		if (this.debug) this.logInfo("addItemToCache ById: item.title:"+item.title+", startDate:"+itemStartDate+", endDate:"+itemEndDate+" | "+item.id+".");
	//dump("addItemToCache ById: item.title:"+item.title+", startDate:"+itemStartDate+", endDate:"+itemEndDate+" | "+item.id+".\n");

		// Add to Id index.
		this.itemCacheById[item.id] = item;

		// Add to startDate index.
		if ((itemStartDate) && (itemEndDate)) {
			itemStartDate = itemStartDate.getInTimezone(this.globalFunctions.ecUTC());
			itemEndDate = itemEndDate.getInTimezone(this.globalFunctions.ecUTC());
			var startYear = itemStartDate.year;
			var startYearDay = itemStartDate.yearday;
			var endYear = itemEndDate.year;
			var endYearDay = itemEndDate.yearday;
			var doStop = false;

			while (!doStop) {

				if ((startYear == endYear) && (startYearDay == endYearDay)) {
					doStop= true;
				}
				if (!this.itemCacheByStartDate) this.itemCacheByStartDate = {};
				if (!this.itemCacheByStartDate[startYear]) this.itemCacheByStartDate[startYear] = {};
				if (!this.itemCacheByStartDate[startYear][startYearDay]) this.itemCacheByStartDate[startYear][startYearDay] = [];
		if (this.debug) this.logInfo(" -- addItemToCache ByStartDate: item.title:"+item.title+", startYear:"+startYear+", startYearDay:"+startYearDay+" | "+item.id+".",2);
	//dump(" -- addItemToCache ByStartDate: item.title:"+item.title+", startYear:"+startYear+", startYearDay:"+startYearDay+" | "+item.id+".\n");
				this.itemCacheByStartDate[startYear][startYearDay][item.id] = true;

				startYearDay++;
				if (startYearDay > 366) {
					startYearDay = 1;
					startYear++;
				}
			}
		}

	},

	removeItemFromCache: function _removeItemFromCache(item)
	{
		if (!item) {
			//dump("removeItemFromCache: item is null.\n");
			return;
		}

		var itemStartDate = item.startDate || item.entryDate;
		var itemEndDate = item.endDate || item.dueDate;
		// Remove from startDate index.
		if ((itemStartDate) && (itemEndDate) && (this.itemCacheByStartDate)) {
			var startYear = itemStartDate.year;
			var startYearDay = itemStartDate.yearday;
			var endYear = itemEndDate.year;
			var endYearDay = itemEndDate.yearday;
			var doStop = false;

			while (!doStop) {

				if ((startYear >= endYear) && (startYearDay >= endYearDay)) {
					doStop= true;
				}

				if ((this.itemCacheByStartDate[startYear]) && (this.itemCacheByStartDate[startYear][startYearDay])) {
					if (this.itemCacheByStartDate[startYear][startYearDay][item.id]) {
						this.itemCacheByStartDate[startYear][startYearDay][item.id] = null;
						delete this.itemCacheByStartDate[startYear][startYearDay][item.id];
					}
				}

				startYearDay++;
				if (startYearDay > 366) {
					startYearDay = 1;
					startYear++;
				}
			}
		}

		if (this.itemCacheById[item.id]) {
			if (this.itemCacheById[item.id].className) {
				this.itemCacheById[item.id].deleteItem();
			}
			this.itemCacheById[item.id] = null;
			delete this.itemCacheById[item.id];
//			var itemDate = item.startDate || item.entryDate;
//dump("removeItemFromCache: item.title:"+item.title+", startDate:"+itemDate+" | "+item.id+".\n");
		}
		else {
//			var itemDate = item.startDate || item.entryDate;
			//dump("removeItemFromCache: item.title:"+item.title+", startDate:"+itemDate+". is not in itemCache. | "+item.id+"\n");
		}
	},

	doShutdown: function _doShutdown()
	{
		if (this.shutdown) {
			return;
		}

		this.shutdown = true;
		this.inboxPoller.cancel();

		if (this.offlineTimer) {
			this.offlineTimer.cancel();
		}

		if (this.calendarPoller) {
			this.calendarPoller.cancel();
		}

		this.loadBalancer.stopRunningJobsForCalendar(this.serverUrl, this);

		this.loadBalancer.clearQueueForCalendar(this.serverUrl, this);
		this.offlineQueue = [];

		// Now we can initialize.
		this.syncState = null;
		this.syncStateInbox = null;
		this.weAreSyncing = false;
		
		// Remove all items in cache from calendar.
		for (var index in this.itemCacheById) {
			if (this.itemCacheById[index]) {
				//this.notifyTheObservers("onDeleteItem", [this.itemCacheById[index]]);
				/*if (this.itemCacheById[index].className) {
					this.itemCacheById[index].deleteItem();
				}
				this.itemCacheById[index] = null;
				delete this.itemCacheById[index];*/
				this.removeItemFromCache(this.itemCacheById[index]);
			}
		} 

		// Reset caches.
		this.itemCacheById = {};
		this.itemCacheByStartDate = {};
		this.itemCacheByEndDate = {};

		for (var index in this.recurringMasterCache) {
			if (this.recurringMasterCache[index]) {
				//this.notifyTheObservers("onDeleteItem", [this.itemCacheById[index]]);
				this.recurringMasterCache[index].deleteItem();
				this.recurringMasterCache[index] = null;
				delete this.recurringMasterCache[index];
			}
		} 
		this.recurringMasterCache = {};
		this.recurringMasterCacheById = {};

		this.meetingRequestsCache = [];
		this.meetingCancelationsCache = [];
		this.meetingrequestAnswered = [];
		this.meetingResponsesCache = [];

		if (this.offlineCacheDB) {
			try {
				if (this.offlineCacheDB) this.offlineCacheDB.close();
				this.offlineCacheDB = null;
			} catch(exc) {}
		}
	},

	removeFromMeetingRequestCache: function _removeFromMeetingRequestCache(aID) {
		//if (this.debug) this.logInfo("removeFromMeetingRequestCache:"+aUID);
//		this.meetingRequestsCache[aUID] == null;
		delete this.meetingRequestsCache[aID];
	},

	findItemInListByDatesAndID: function _findItemInListByDates(aList, aItem)
	{
		var result = null;
		for each(var listItem in aList) {
			if ((aItem.getProperty("UID") == listItem.uid) &&
				(listItem.startDate.compare(aItem.startDate) == 0) &&
				(listItem.endDate.compare(aItem.endDate) == 0)) {
				if (this.debug) this.logInfo("Found matching item in list.");
				result = listItem;
			}
		}

		return result;
	},

	updateVersionInfoCache:function _updateVersionInfoCache(self, Addon)
	{
 		this.logInfo("updateVersionInfoCache  : ");

		if (this.noDB) return;
		if (!Addon) return;
		var version=Addon.version;
		
		var sqlStr2 = "DELETE FROM version"; 
		try{
		if (!this.executeQuery(sqlStr2)) {
			if (this.debug) this.logInfo("removeExchCalDbCache : Error removing attachment from offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
		}
		else {
			if (this.debug) this.logInfo("removeExchCalDbCache: Removed version from offlineCacheDB. ");
		}
		 
		var sqlStr = "INSERT INTO version VALUES ('"+version+"')";
 		if (!this.executeQuery(sqlStr)) {
			if (this.debug) this.logInfo("removeExchCalDbCache : Error inserting attachments_per_item into offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
		}
		else {
			if (this.debug) this.logInfo("removeExchCalDbCache: Inserted attachments_per_item into offlineCacheDB. Name:"+ version );
		} 
		}
		catch(ex)
		{
	 		this.logInfo("updateVersionInfoCache: excepetion occured ");

		}
 		this.logInfo("updateVersionInfoCache 21 : Done");

		return true;
		
	},
	
	checkExchCalAddonVerion: function _checkExchCalAddonVersion()
	{
 
		try{
		    this.logInfo("checkExchCalAddonVerion: ");
		    Cu.import("resource://gre/modules/AddonManager.jsm");
	 		var self=this; 
		    AddonManager.getAddonByID("exchangecalendar@extensions.1st-setup.nl",function(Addon){  
			    																self.removeExchCalDbCache(self,Addon); 
	  	    																}); 
 		}
		catch(ex){
		 	 this.logInfo("checkExchCalAddonVerion:  Exception occured ");
		 	 }
	}, 
	
	removeExchCalDbCache: function _removeExchCalDbCache(self,Addon){  
  		var currentAddonVersion = Addon.version;
  		var OldAddonversion = null; 
  		var result = null;
		
  		this.logInfo("removeExchCalDbCache" );

		var sqlStr = "SELECT name FROM version limit 1";

		if (this.debug) this.logInfo("removeExchCalDbCache sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("removeExchCalDbCache Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return null;
		}
		
		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("removeExchCalDbCache Found item in offline Cache."); 
					OldAddonversion =  sqlStatement.row.name;
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}			
  		 
		if ( OldAddonversion ){
	  		if ( OldAddonversion != currentAddonVersion  ) {  
			  			if(this.offlineCacheDB.connectionReady && this.offlineCacheDB.tableExists("items")){
			  				 this.logInfo("removeExchCalDbCache clearCachedData - " + " NewVersion: " + currentAddonVersion + " OldVersion: " +   OldAddonversion  );
			  					let statement = this.offlineCacheDB.createStatement("DELETE FROM items");
			  					let statement1 = this.offlineCacheDB.createStatement("DELETE FROM attachments");
			  					let statement2 = this.offlineCacheDB.createStatement("DELETE FROM attachments_per_item");
			  									
			  					try{	
			  						statement.executeStep();
			  						statement1.executeStep();
			  						statement2.executeStep();					
		
			  						statement.finalize();
			  						statement1.finalize();
			  						statement2.finalize();
			  					}
			  					catch(e){
			  						 this.logInfo("removeExchCalDbCache 41: unable to clear tables"+e);					
			  					}
			  				this.logInfo("removeExchCalDbCache cache cleared! current version : " + currentAddonVersion + " resetting calendar: " +  this.id );
			  				var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
			  				observerService.notifyObservers(this, "onCalReset", this.id);			
		 	  			}
			  			
			  			if(this.updateVersionInfoCache(self,Addon))
						{
							if (this.debug) this.logInfo("removeExchCalDbCache 21: new version updated in cache: " + currentAddonVersion);  
						}
						else
						{
							if (this.debug) this.logInfo("removeExchCalDbCache 22: failed! New version not updated in cache" );  
						}
			  			
						if (this.debug) this.logInfo("removeExchCalDbCache 31: removing offlineCacheDB new/old wVersion found" );  
	   		}  
		}
  		else
  		{
  			if (this.debug) this.logInfo("removeExchCalDbCache 26: not removing offlineCacheDB new/old Version not found: "+ currentAddonVersion ); 

  			if(this.updateVersionInfoCache(self,Addon))
			{
				if (this.debug) this.logInfo("removeExchCalDbCache 32: new version updated in cache: " + currentAddonVersion);  
			}
			else
			{
				if (this.debug) this.logInfo("removeExchCalDbCache 35: failed! New version not updated in cache" );  
			}
  		}  
		
 	}, 
		
	createOfflineCacheDB: function _createOfflineCacheDB()
	{ 
 		
		if ((this.mUseOfflineCache) && (!this.offlineCacheDB)) {
			this.noDB = true;
			this.dbInit = true;
			this.dbFile = Cc["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get("ProfD", Components.interfaces.nsIFile);
			this.dbFile.append("exchange-data");
			if ( !this.dbFile.exists() || !this.dbFile.isDirectory() ) {
				this.dbFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0777", 8));  
			}
			
			this.dbFile.append(this.id+".offlineCache.sqlite");

			var dbExists = false;
			if (this.dbFile.exists()) {
				dbExists = true;
			}
			
			try {
				this.offlineCacheDB = Services.storage.openUnsharedDatabase(this.dbFile); // Will also create the file if it does not exist
			}
			catch(exc) {
				this.offlineCacheDB = null;
				if (this.debug) this.logInfo("Could not open offlineCache database.");
				return;
			}
			
			if (!this.offlineCacheDB.connectionReady) {
				this.offlineCacheDB = null;
				if (this.debug) this.logInfo("connectionReady for offlineCache database.");
				return;
			}

			var latestDBVersion = 1;
			var dbVersion = 0;
			if (dbExists) {
				dbVersion = this.globalFunctions.safeGetIntPref(this.prefs, "dbVersion", 0);
			}
	 		
			//Check exchange calendar version clear cache
			if(!this.mIsOffline) this.checkExchCalAddonVerion();

//			if (dbVersion < latestDBVersion) {
				if (!this.offlineCacheDB.tableExists("version")) {
					if (this.debug) this.logInfo("Table 'version' does not yet exist. We are going to create it.");
					try {
						this.offlineCacheDB.createTable("version", "name STRING");
					}
					catch(exc) {
						if (this.debug) this.logInfo("Could not create table 'version'. Error:"+exc);
						return;
					}
	
					var sqlStr = "CREATE UNIQUE INDEX idx_ver_id ON version (name)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_ver_id'");
						this.offlineCacheDB = null;
						return;
					}   
				}
				
				if (!this.offlineCacheDB.tableExists("items")) {
					if (this.debug) this.logInfo("Table 'items' does not yet exist. We are going to create it.");
					try {
						this.offlineCacheDB.createTable("items", "event STRING, id STRING, changeKey STRING, startDate STRING, endDate STRING, uid STRING, type STRING, parentItem STRING, item STRING");
					}
					catch(exc) {
						if (this.debug) this.logInfo("Could not create table 'items'. Error:"+exc);
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_id ON items (id)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_id'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_type ON items (type)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_type'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE UNIQUE INDEX idx_items_id_changekey ON items (id, changeKey)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_id_changekey'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_type_uid ON items (type ASC, uid)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_type_uid'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_uid ON items (uid)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_uid'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_uid_startdate_enddate ON items (uid, startDate ASC, endDate)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_uid_startdate_enddate'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_startdate_enddate ON items (startDate ASC, endDate)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_startdate_enddate'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_parentitem_startdate_enddate ON items (parentitem, startDate ASC, endDate)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_startdate_enddate'");
						this.offlineCacheDB = null;
						return;
					}

					var sqlStr = "CREATE INDEX idx_items_type_startdate_enddate ON items (type, startDate ASC, endDate)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_items_type_startdate_enddate'");
						this.offlineCacheDB = null;
						return;
					}

				}

				if (!this.offlineCacheDB.tableExists("attachments")) {
					if (this.debug) this.logInfo("Table 'attachments' does not yet exist. We are going to create it.");
					try {
						this.offlineCacheDB.createTable("attachments", "id STRING, name STRING, size INTEGER, cachePath STRING");
					}
					catch(exc) {
						if (this.debug) this.logInfo("Could not create table 'attachments'. Error:"+exc);
						return;
					}

					var sqlStr = "CREATE UNIQUE INDEX idx_att_id ON attachments (id)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_att_id'");
						this.offlineCacheDB = null;
						return;
					}

				}

				if (!this.offlineCacheDB.tableExists("attachments_per_item")) {
					if (this.debug) this.logInfo("Table 'attachments_per_item' does not yet exist. We are going to create it.");
					try {
						this.offlineCacheDB.createTable("attachments_per_item", "itemId STRING, attId STRING");
					}
					catch(exc) {
						if (this.debug) this.logInfo("Could not create table 'attachments_per_item'. Error:"+exc);
						return;
					}

					var sqlStr = "CREATE INDEX idx_attitem_itemid ON attachments_per_item (itemId)";
					if (!this.executeQuery(sqlStr)) {
						if (this.debug) this.logInfo("Could not create index 'idx_attitem_itemid'");
						this.offlineCacheDB = null;
						return;
					}
				}

				if (this.debug) this.logInfo("Created/opened offlineCache database.");
				// Fix the database corruption bug from version 2.0.0-2.0.3 (fixed in version 2.0.4) 26-05-2012
			if (dbVersion < latestDBVersion) {
				if (this.debug) this.logInfo("Running fix for database corruption bug from version 2.0.0-2.0.3 (fixed in version 2.0.4)");
				var masters = this.executeQueryWithResults("SELECT uid FROM items WHERE type='M'",["uid"]);
				if ((masters) && (masters.length > 0)) {
					for (var index in masters) {
						var newMasterEndDate = this.executeQueryWithResults("SELECT max(endDate) as newEndDate FROM items WHERE uid='"+masters[index].uid+"'",["newEndDate"]);
						if ((newMasterEndDate) && (newMasterEndDate.length > 0)) {
							if (this.debug) this.logInfo("newMasterEndDate:"+newMasterEndDate[0].newEndDate);
							var endDateStr = newMasterEndDate[0].newEndDate;
							if (endDateStr) {
								if (endDateStr.length == 10) {
									endDateStr += "T23:59:59Z";
								}
								if (this.debug) this.logInfo("newEndDate for master setting it to:"+endDateStr);
								this.executeQuery("UPDATE items set endDate='"+endDateStr+"' where type='M' AND uid='"+masters[index].uid+"'");
							}
							else {
								if (this.debug) this.logInfo("newEndDate for master is null not going to use this. Strange!!");
							}
						}
						else {
							if (this.debug) this.logInfo("Could not get newEndDate for Master. What is wrong!!"); 
						} 
					}
				} 
				this.prefs.setIntPref("dbVersion", latestDBVersion);
 			}
			//this.executeQuery("UPDATE items set event='y' where event='y_'"); // Turned of 2013-11-19. Items will always be read from offline cache even if they have already been read
			//this.executeQuery("UPDATE items set event='n' where event='n_'");

			this.dbInit = false;
			this.noDB = false;
		}
		else {
			this.noDB = true;
			var tryCount = 0;
			while ((this.offlineCacheDB) && (tryCount < 3)) {
				try{
					if (this.offlineCacheDB) this.offlineCacheDB.close();
					this.offlineCacheDB = null;
				}
				catch(exc){
					dump("\nUnable to close offlineCache database connection:"+exc+"\n");
//					if (this.debug) this.logInfo("Unable to close offlineCache database connection:"+exc);
					tryCount++;	
				}
			}
			this.offlineCacheDB = null;
		}		
	},

	get useOfflineCache()
	{
		if (this.mUseOfflineCache) {
			return this.mUseOfflineCache;
		}
		else {
			this.mUseOfflineCache = this.globalFunctions.safeGetBoolPref(this.prefs, "useOfflineCache", true);
			this.createOfflineCacheDB();
			return this.mUseOfflineCache;
		}
	},

	set useOfflineCache(aValue)
	{
		var oldValue = this.mUseOfflineCache;
		this.mUseOfflineCache = aValue;
		this.prefs.setBoolPref("useOfflineCache", aValue);
		this.createOfflineCacheDB();

		if ((oldValue != aValue) && (aValue)) {
			 //this.syncExchangeToOfflineCache();
		}
	},

	getItemType: function _getItemType(aCalItem)
	{
		if (aCalItem.id == aCalItem.parentItem.id) {
			// Master or Single
			if (aCalItem.recurrenceInfo) {
				return "M";
			}
			else {
				return "S";
			}
		}
		else {
			return aCalItem.getProperty("X-RecurringType");
		}
	},

	executeQuery: function _executeQuery(aQuery)
	{
		if (this.debug) this.logInfo("sql-query:"+aQuery, 2);
		if ((this.noDB) && (!this.dbInit)) return false;
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(aQuery);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+aQuery+")");
			return false;
		}

		if ((this.noDB) && (!this.dbInit)) return false;
		try {
			sqlStatement.executeStep();
		}
		catch(err) {
			this.logInfo("executeQuery: Error:"+err);
		}
		finally {  
			if ((this.noDB) && (!this.dbInit)) return false;
			sqlStatement.finalize();
		}

		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {
			return true;
		}
		else {
			if (this.debug) this.logInfo("Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return false;
		}
	},

	executeQueryWithResults: function _executeQueryWithResults(aQuery, aFieldArray)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return null;
		}

		if (this.debug) this.logInfo("sql-query:"+aQuery, 2);
		if ((this.noDB) && (!this.dbInit)) return [];
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(aQuery);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+aQuery+")");
			return null;
		}

		var results = [];
		if ((this.noDB) && (!this.dbInit)) return [];
		try {
			while (sqlStatement.executeStep()) {
				var tmpResult = {};
				for (var index in aFieldArray) {
					try {
						tmpResult[aFieldArray[index]] = sqlStatement.row[aFieldArray[index]];
					}
					catch(exc) {
						if (this.debug) this.logInfo("Error on getting field '"+aFieldArray[index]+"' from query '"+aQuery+"' result.("+exc+")");
					}
				}
				results.push(tmpResult);
				if ((this.noDB) && (!this.dbInit)) return [];
			}
		}
		finally {  
			if ((this.noDB) && (!this.dbInit)) return [];
			sqlStatement.finalize();
		}

		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {
			return results;
		}
		else {
			if (this.debug) this.logInfo("Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return null;
		}
	},

	addAttachmentsToOfflineCache: function _addAttachmentsToOfflineCache(aList)
	{
		for each(var item in aList) {
			var attachments = item.calItem.getAttachments({});
			this.removeAttachmentsFromOfflineCache(item.calItem);
			for (var index in attachments) {
				this.addAttachmentToOfflineCache(item.calItem, attachments[index]);
			}
		}
	},

	addAttachmentToOfflineCache: function _addAttachmentToOfflineCache(aCalItem, aCalAttachment)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var attParams = this.globalFunctions.splitUriGetParams(aCalAttachment.uri);

		if (attParams) {

			var sqlStr = "SELECT COUNT() as attcount from attachments WHERE id='"+attParams.id+"'";
			if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
			if (this.noDB) return;
			sqlStatement.executeStep();
			if (sqlStatement.row.attcount > 0) {
				if (this.debug) this.logInfo("Going to update the attachment because it all ready exist.");
				this.updateAttachmentInOfflineCache(aCalItem, aCalAttachment);
				sqlStatement.finalize();
				return;
			}
			sqlStatement.finalize();
		
			var sqlStr = "INSERT INTO attachments VALUES ('"+attParams.id+"', '"+attParams.name.replace(/\x27/g, "''")+"', '"+attParams.size+"', '')";
			if (this.noDB) return;
			if (!this.executeQuery(sqlStr)) {
				if (this.debug) this.logInfo("Error inserting attachment into offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
			}
			else {
				if (this.debug) this.logInfo("Inserted attachment into offlineCacheDB. Name:"+attParams.name+", Title:"+aCalItem.title);
			}

			var sqlStr = "INSERT INTO attachments_per_item VALUES ('"+aCalItem.id+"','"+attParams.id+"')";
			if (this.noDB) return;
			if (!this.executeQuery(sqlStr)) {
				if (this.debug) this.logInfo("Error inserting attachments_per_item into offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
			}
			else {
				if (this.debug) this.logInfo("Inserted attachments_per_item into offlineCacheDB. Name:"+attParams.name+", Title:"+aCalItem.title);
			}

		}
	},

	updateAttachmentInOfflineCache: function _updateAttachmentInOfflineCache(aCalItem, aCalAttachment)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var attParams = this.globalFunctions.splitUriGetParams(aCalAttachment.uri);

		if (attParams) {

			var sqlStr = "UPDATE attachments SET id='"+attParams.id+"', name='"+attParams.name.replace(/\x27/g, "''")+"', size='"+attParams.size+"', cachePath='' WHERE id='"+attParams.id+"'";
			if (this.noDB) return;
			if (!this.executeQuery(sqlStr)) {
				if (this.debug) this.logInfo("Error updating attachment into offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
			}
			else {
				if (this.debug) this.logInfo("Updated attachment into offlineCacheDB. Name:"+attParams.name+", Title:"+aCalItem.title);
			}
		}
	},

	removeAttachmentsFromOfflineCache: function _removeAttachmentsFromOfflineCache(aCalItem)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var sqlStr = "SELECT attId FROM attachments_per_item WHERE itemId='"+aCalItem.id+"'";

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return false;
		}

		var doContinue = true;
		try {
			while (doContinue) {
				if (this.noDB) return;
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					var sqlStr2 = "DELETE FROM attachments WHERE id='"+sqlStatement.row.attId+"'";
					if (this.noDB) return;
					if (!this.executeQuery(sqlStr2)) {
						if (this.debug) this.logInfo("Error removing attachment from offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
					}
					else {
						if (this.debug) this.logInfo("Removed attachment from offlineCacheDB. Title:"+aCalItem.title);
					}
				}
			}
		}
		finally {  
			sqlStatement.finalize();
		}

		if ((this.offlineCacheDB.lastError != 0) && (this.offlineCacheDB.lastError != 100) && (this.offlineCacheDB.lastError != 101)) {
			if (this.debug) this.logInfo("Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return false;
		}

		var sqlStr2 = "DELETE FROM attachments_per_item WHERE itemId='"+aCalItem.id+"'";
		if (this.noDB) return;
		if (!this.executeQuery(sqlStr2)) {
			if (this.debug) this.logInfo("Error removing attachments_per_item from offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
		}
		else {
			if (this.debug) this.logInfo("Removed attachments_per_item from offlineCacheDB. Title:"+aCalItem.title);
		}

		return true;
	},

	removeAttachmentFromOfflineCache: function _removeAttachmentFromOfflineCache(aCalItem, aCalAttachment)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var attParams = this.globalFunctions.splitUriGetParams(aCalAttachment.uri);

		if (attParams) {

			var sqlStr = "DELETE FROM attachments WHERE id='"+attParams.id+"'";
			if (this.noDB) return;
			if (!this.executeQuery(sqlStr)) {
				if (this.debug) this.logInfo("Error removing attachment from offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
			}
			else {
				if (this.debug) this.logInfo("Removed attachment from offlineCacheDB. Name:"+attParams.name+", Title:"+aCalItem.title);
			}

			var sqlStr = "DELETE FROM attachments_per_item WHERE itemId='"+aCalItem.id+"' AND attId='"+attParams.id+"'";
			if (this.noDB) return;
			if (!this.executeQuery(sqlStr)) {
				if (this.debug) this.logInfo("Error removing attachments_per_item from offlineCacheDB. Error:("+this.offlineCacheDB.lastError+")"+this.offlineCacheDB.lastErrorString);
			}
			else {
				if (this.debug) this.logInfo("Removed attachments_per_item from offlineCacheDB. Name:"+attParams.name+", Title:"+aCalItem.title);
			}
		}
	},

	addToOfflineCache: function _addToOfflineCache(aList)
	{

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		//dump(this.name+":addToOfflineCache 1\n");
		var sqlQueries = [];

		for each(var item in aList) {

			if (isEvent(item.calItem)) {
				var startDate = cal.toRFC3339(item.calItem.startDate.getInTimezone(this.globalFunctions.ecUTC()));
				var endDate = cal.toRFC3339(item.calItem.endDate.getInTimezone(this.globalFunctions.ecUTC()));
				var eventField = "y";
			}
			else {
				if (item.calItem.entryDate) {
					var startDate = cal.toRFC3339(item.calItem.entryDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					var startDate = "";
				};

				if (((item.calItem.completedDate) && (item.calItem.dueDate) && (item.calItem.completedDate.compare(item.calItem.dueDate) == 1)) || ((item.calItem.completedDate) && (!item.calItem.dueDate))) {
					var endDate = cal.toRFC3339(item.calItem.completedDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					if (item.calItem.dueDate) {
						var endDate = cal.toRFC3339(item.calItem.dueDate.getInTimezone(this.globalFunctions.ecUTC()));
					}
					else {
						var endDate = "";
					}
				}
				var eventField = "n";
			}

			var sqlStr = "SELECT '"+item.calItem.id+"' as realid, id, changeKey, COUNT() as itemcount from items WHERE id='"+item.calItem.id+"'";
			//dump(this.name+":addToOfflineCache: sqlStr:"+sqlStr+"\n");
			if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);

			sqlQueries.push(this.offlineCacheDB.createAsyncStatement(sqlStr));
		}

		if (sqlQueries.length == 0) {
			//dump(this.name+":addToOfflineCache: No items in aList to be added to offlinecache.\n");
			return;
		}

		//dump(this.name+":addToOfflineCache: Going to execute '"+sqlQueries.length+"' queries\n");

		var self = this;
		var pendingStatement = this.offlineCacheDB.executeAsync(sqlQueries, sqlQueries.length,{
				toBeInserted: [],
				toBeUpdated: [],
				list: aList,
				handleCompletion: function _handleCompletion(aReason) {
					if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
						// Finished looking up items in offline cache. Now insert or update the items.
						//dump(self.name+":Finished looking up items in offline cache. Now insert or update the items.\n");
						if (this.toBeInserted.length > 0) {
							self.insertToOfflineCache(this.toBeInserted);
						}
						if (this.toBeUpdated.length > 0) {
							self.updateInOfflineCache(this.toBeUpdated);
						}
					}
					else {
						//dump(self.name+":addToOfflineCache: handleCompletion: DB update did not end normally aReason:"+aReason+".\n");
						/*if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_CANCELED) {
							dump("  -- It was canceled.\n");
						}
						if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_ERROR) {
							dump("  -- It was an error.\n");
						}*/
					}
				},

				handleError: function _handleError(aError) {
					dump(self.name+":addToOfflineCache: handleError: aError:"+aError.message+" ("+aError.result+")\n");
				},

				handleResult: function _handleResult(aResultSet) {
					if (self.debug) self.logInfo("Found item in offline Cache.");
					var row = aResultSet.getNextRow();
					while (row) {

						if (row) {
							if (row.getResultByName('itemcount') > 0) {
								if (row.getResultByName('changeKey') != this.list[row.getResultByName('id')].calItem.changeKey) {
									//dump(self.name+":Item will be updated id:"+row.getResultByName('id')+"\n");
									this.toBeUpdated.push(this.list[row.getResultByName('id')]);
								}
								else {
									if (this.debug) 
										this.logInfo("This item '"+this.list[row.getResultByName('id')]+"' is allready in offlineCache database. id and changeKey are the same. Not going to update it.");
										//dump(self.name+":This item '"+this.list[row.getResultByName('id')]+"' is allready in offlineCache database. id and changeKey are the same. Not going to update it.\n");
								}
							}
							else {
								//dump(self.name+":Item will be inserted id 1:"+row.getResultByName('realid')+"\n");
								//dump("Item will be inserted id 2:"+row.getResultByName('id')+"\n");
								//dump("Item will be inserted id 3:"+row.getResultByIndex(0)+"\n");
								this.toBeInserted.push(this.list[row.getResultByName('realid')]);
							}
						}
						row = aResultSet.getNextRow();
					}
				}
			});

	},

	insertToOfflineCache: function _insertToOfflineCache(aList)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			//dump(this.name+":NO Offline Cache DB: insertToOfflineCache 1\n");
			return;
		}

try{
		//dump(this.name+":insertToOfflineCache 1\n");
		var sqlQueries = [];
		var mastersToBeUpdated = [];

		for each(var item in aList) {

			if (isEvent(item.calItem)) {
				var startDate = cal.toRFC3339(item.calItem.startDate.getInTimezone(this.globalFunctions.ecUTC()));
				var endDate = cal.toRFC3339(item.calItem.endDate.getInTimezone(this.globalFunctions.ecUTC()));
				var eventField = "y";
			}
			else {
				if (item.calItem.entryDate) {
					var startDate = cal.toRFC3339(item.calItem.entryDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					var startDate = "";
				};

				if (((item.calItem.completedDate) && (item.calItem.dueDate) && (item.calItem.completedDate.compare(item.calItem.dueDate) == 1)) || ((item.calItem.completedDate) && (!item.calItem.dueDate))) {
					var endDate = cal.toRFC3339(item.calItem.completedDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					if (item.calItem.dueDate) {
						var endDate = cal.toRFC3339(item.calItem.dueDate.getInTimezone(this.globalFunctions.ecUTC()));
					}
					else {
						var endDate = "";
					}
				}
				var eventField = "n";
			}

			if (isEvent(item.calItem)) {
				if (this.getItemType(item.calItem) == "M") {
					// Lets find the real end date.
					for (var childIndex in this.itemCacheById) {
						if ((this.itemCacheById[childIndex]) && (item.calItem.uid == this.itemCacheById[childIndex].uid)) {
							var childEnd = cal.toRFC3339(this.itemCacheById[childIndex].endDate.getInTimezone(this.globalFunctions.ecUTC()));
							if (childEnd > endDate) {
								endDate = childEnd;
							}
						}
					}
				}
				else {
					if ((this.getItemType(item.calItem) == "RO") || (this.getItemType(item.calItem) == "RE")) {
						mastersToBeUpdated.push(item.calItem.parentItem);
					}
				}
			}
		
			var sqlStr = "INSERT INTO items VALUES ('"+eventField+"','"+item.calItem.id+"', '"+item.calItem.changeKey+"', '"+startDate+"', '"+endDate+"', '"+item.calItem.uid+"', '"+this.getItemType(item.calItem)+"', '"+item.calItem.parentItem.id+"', '"+item.exchangeItemXML.replace(/\x27/g, "''")+"')";

			sqlQueries.push(this.offlineCacheDB.createAsyncStatement(sqlStr));
		}

		//dump(this.name+":insertToOfflineCache 2\n");
		if (mastersToBeUpdated.length > 0) {
			this.updateMasterInOfflineCache(mastersToBeUpdated);
		}

		//dump(this.name+":insertToOfflineCache 3\n");
		if (sqlQueries.length == 0) {
			//dump(this.name+":insertToOfflineCache: No items in aList to be inserted to offlinecache.\n");
			return;
		}

		//dump(this.name+":insertToOfflineCache: Going to insert '"+sqlQueries.length+"' items to offlinecache.\n");

		var self = this;
		var pendingStatement = this.offlineCacheDB.executeAsync(sqlQueries, sqlQueries.length,{
				handleCompletion: function _handleCompletion(aReason) {
					if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
						// Finished looking up items in offline cache. Now insert or update the items.
						//dump(self.name+":updateInOfflineCache: handleCompletion: items were inserted ok.\n");
						self.addAttachmentsToOfflineCache(aList);
					}
					else {
						//dump(self.name+":updateInOfflineCache: handleCompletion: DB update did not end normally aReason:"+aReason+".\n");
					}
				},

				handleError: function _handleError(aError) {
					dump(self.name+":updateInOfflineCache: handleError: aError:"+aError.message+" ("+aError.result+")\n");
				},

				handleResult: function _handleResult(aResultSet) {
					//dump(self.name+":updateInOfflineCache: handleResult.  DOES THIS EVER GET CALLED \n");
				}
			});
}
catch(err) {
	dump(this.name+":insertToOfflineCache: err:"+err+"\n");
}
	},

	updateInOfflineCache: function _updateInOfflineCache(aList) //aCalItem, aExchangeItemXML)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		//dump(this.name+":updateInOfflineCache:\n");

		var sqlQueries = [];
		var mastersToBeUpdated = [];

		for each(var item in aList) {

			if (isEvent(item.calItem)) {
				var startDate = cal.toRFC3339(item.calItem.startDate.getInTimezone(this.globalFunctions.ecUTC()));
				var endDate = cal.toRFC3339(item.calItem.endDate.getInTimezone(this.globalFunctions.ecUTC()));
				var eventField = "y";
			}
			else {
				if (item.calItem.entryDate) {
					var startDate = cal.toRFC3339(item.calItem.entryDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					var startDate = "";
				};

				if ((item.calItem.completedDate) && (item.calItem.completedDate.compare(item.calItem.dueDate) == 1)) {
					var endDate = cal.toRFC3339(item.calItem.completedDate.getInTimezone(this.globalFunctions.ecUTC()));
				}
				else {
					if (item.calItem.dueDate) {
						var endDate = cal.toRFC3339(item.calItem.dueDate.getInTimezone(this.globalFunctions.ecUTC()));
					}
					else {
						var endDate = "";
					}
				}
				var eventField = "n";
			}

			if (isEvent(item.calItem)) {
				if (this.getItemType(item.calItem) == "M") {
					// Lets find the real end date.
					if (this.noDB) return;
					var newMasterEndDate = this.executeQueryWithResults("SELECT max(endDate) as newEndDate FROM items WHERE uid='"+item.calItem.uid+"'",["newEndDate"]);
					if ((newMasterEndDate) && (newMasterEndDate.length > 0)) {
						if (this.debug) this.logInfo("newMasterEndDate:"+newMasterEndDate[0].newEndDate);
						var endDateStr = newMasterEndDate[0].newEndDate;
						if (endDateStr) {
							if (endDateStr.length == 10) {
								endDateStr += "T23:59:59Z";
							}
							if (this.debug) this.logInfo("newEndDate for master setting it to:"+endDateStr);
							endDate = endDateStr;
						}
						else {
							if (this.debug) this.logInfo("newEndDate for master is null not going to use this. Strange!!");
						}
					}
					else {
						if (this.debug) this.logInfo("Could not get newEndDate for Master. What is wrong!!"); 
					} 

				}
				else {
					if ((this.getItemType(item.calItem) == "RO") || (this.getItemType(item.calItem) == "RE")) {
						mastersToBeUpdated.push(item.calItem.parentItem); 
					}
				}
			}
		
			let sqlStr = "UPDATE items SET event='"+eventField+"', id='"+item.calItem.id+"', changeKey='"+item.calItem.changeKey+"', startDate='"+startDate+"', endDate='"+endDate+"', uid='"+item.calItem.uid+"', type='"+this.getItemType(item.calItem)+"', parentItem='"+item.calItem.parentItem.id+"', item='"+item.exchangeItemXML.replace(/\x27/g, "''")+"' WHERE id='"+item.calItem.id+"'";

			sqlQueries.push(this.offlineCacheDB.createAsyncStatement(sqlStr));
		}

		if (mastersToBeUpdated.length > 0) {
			this.updateMasterInOfflineCache(mastersToBeUpdated);
		}

		if (sqlQueries.length == 0) {
			//dump(this.name+":updateInOfflineCache: No items in aList to be updated in offlinecache.\n");
			return;
		}

		//dump(this.name+":updateInOfflineCache: Going to update '"+sqlQueries.length+"' items to offlinecache.\n");

		var self = this;
		var pendingStatement = this.offlineCacheDB.executeAsync(sqlQueries, sqlQueries.length,{
				handleCompletion: function _handleCompletion(aReason) {
					if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
						// Finished looking up items in offline cache. Now insert or update the items.
						//dump(self.name+":updateInOfflineCache: handleCompletion: items were updated ok.\n");
						self.addAttachmentsToOfflineCache(aList);
					}
					else {
						//dump(self.name+":updateInOfflineCache: handleCompletion: DB update did not end normally aReason:"+aReason+".\n");
					}
				},

				handleError: function _handleError(aError) {
					dump(self.name+":updateInOfflineCache: handleError: aError:"+aError.message+" ("+aError.result+")\n");
				},

				handleResult: function _handleResult(aResultSet) {
					//dump(self.name+":updateInOfflineCache: handleResult.  DOES THIS EVER GET CALLED \n");
				}
			});

	},

	updateMasterInOfflineCache: function _updateMasterInOfflineCache(aList)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

try{
		//dump(this.name+":updateMasterInOfflineCache:\n");

		var sqlQueries = [];
		var mastersToBeUpdated = [];

		for each(var item in aList) {


			var endDate = cal.toRFC3339(item.endDate.getInTimezone(this.globalFunctions.ecUTC()));

			if (this.getItemType(item) == "M") {
				// Lets find the real end date.
				for (var childIndex in this.itemCacheById) {
					if ((this.itemCacheById[childIndex]) && (item.uid == this.itemCacheById[childIndex].uid)) {
						var childEnd = cal.toRFC3339(this.itemCacheById[childIndex].endDate.getInTimezone(this.globalFunctions.ecUTC()));
						if (childEnd > endDate) {
							endDate = childEnd;
						}
					}
				}
			}
			else {
				if ((this.getItemType(item) == "RO") || (this.getItemType(item) == "RE")) {
					mastersToBeUpdated.push(item.parentItem);
				}
			}
		
			let sqlStr = "UPDATE items SET endDate='"+endDate+"' WHERE id='"+item.id+"'";
			sqlQueries.push(this.offlineCacheDB.createAsyncStatement(sqlStr));
		}

		if (mastersToBeUpdated.length > 0) {
			this.updateMasterInOfflineCache(mastersToBeUpdated);
		}

		if (sqlQueries.length == 0) {
			//dump(this.name+":updateMasterInOfflineCache: No masters in aList to be updated in offlinecache.\n");
			return;
		}

		//dump(this.name+":updateMasterInOfflineCache: '"+sqlQueries.length+"' masters will be updated in offlinecache.\n");

		var self = this;
		var pendingStatement = this.offlineCacheDB.executeAsync(sqlQueries, sqlQueries.length,{
				handleCompletion: function _handleCompletion(aReason) {
					if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
						// Finished looking up items in offline cache. Now insert or update the items.
						//dump(self.name+":updateMasterInOfflineCache: handleCompletion: masters were updated ok.\n");
					}
					else {
						//dump(self.name+":updateMasterInOfflineCache: handleCompletion: DB update did not end normally aReason:"+aReason+".\n");
					}
				},

				handleError: function _handleError(aError) {
					dump(self.name+":updateMasterInOfflineCache: handleError: aError:"+aError.message+" ("+aError.result+")\n");
				},

				handleResult: function _handleResult(aResultSet) {
					//dump(self.name+":updateMasterInOfflineCache: handleResult.  DOES THIS EVER GET CALLED \n");
				}
			});

}
catch(err) {
	dump(this.name+":updateMasterInOfflineCache: err:"+err+"\n");
}
	},

	removeFromOfflineCache: function _removeFromOfflineCache(aCalItem)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var sqlStr = "DELETE FROM items WHERE id='"+aCalItem.id+"'";
		if (this.noDB) return;
		if (!this.executeQuery(sqlStr)) {
			if (this.debug) this.logInfo("Error deleting item from offlineCacheDB. Error:"+this.offlineCacheDB.lastErrorString);
		}
		else {
			if (this.debug) this.logInfo("Removed item from offlineCacheDB. Title:"+aCalItem.title);
		}
		this.removeAttachmentsFromOfflineCache(aCalItem);
	},

	removeChildrenFromMasterInOfflineCache: function _removeChildrenFromMasterInOfflineCache(aMaster)
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var sqlStr = "DELETE FROM items WHERE uid='"+aMaster.uid+"' and type <> 'M'";
		if (this.noDB) return;
		if (!this.executeQuery(sqlStr)) {
			if (this.debug) this.logInfo("Error deleting children from offlineCacheDB. Error:"+this.offlineCacheDB.lastErrorString);
		}
		else {
			if (this.debug) this.logInfo("Removed children from offlineCacheDB. Title:"+aMaster.title);
		}

		// We have to remove the attachments from offline cache for each child.
		this.removeAttachmentsFromOfflineCache(aMaster);

	},

	syncExchangeToOfflineCache: function _syncExchangeToOfflineCache()
	{
		if ((!this.useOfflineCache) || (!this.offlineCacheDB) || (this.mIsOffline) || (this.weAreSyncing) ) {
			if (this.debug) this.logInfo("syncExchangeToOfflineCache: You are offline or already syncing or no cache enabled! " );
			return;
		}
		if (this.debug) this.logInfo("syncExchangeToOfflineCache: You are online syncing  " );
		// This will sync the specified period from Exchange to offlineCache.
		var monthsAfter = this.globalFunctions.safeGetIntPref(this.prefs, "ecOfflineCacheMonthsAfterToday", 1, true)*31;
		var monthsBefore = this.globalFunctions.safeGetIntPref(this.prefs, "ecOfflineCacheMonthsBeforeToday", 1, true)*31;

		var monthAfterDurarion = cal.createDuration("P"+monthsAfter+"D");
		var monthsBeforeDurarion = cal.createDuration("-P"+monthsBefore+"D");

		var startDate = cal.now();
		var endDate = cal.now();
		startDate.addDuration(monthsBeforeDurarion);
		endDate.addDuration(monthAfterDurarion);

		// Check what is missing for minimal time period.
		var filter = 0;
		if (this.supportsEvents) filter |= Ci.calICalendar.ITEM_FILTER_TYPE_EVENT;
		if (this.supportsTasks) filter |= Ci.calICalendar.ITEM_FILTER_TYPE_TODO;

		// Reset memory caches.
		this.itemCacheById = {};
		this.itemCacheByStartDate = {};
		this.itemCacheByEndDate = {};
		this.recurringMasterCache = {};
		this.recurringMasterCacheById = {};

		if (this.supportsEvents) {
			if ((!this.startDate) && (!this.endDate)) {
				if (this.debug) this.logInfo("Going to request events in the period of '"+startDate.toString()+"' until '"+endDate.toString()+"' from the exchange server to fill offlinecache.");
				//this.getItems(filter, 0, startDate, endDate, null);
				this.requestPeriod(startDate, endDate, filter, {}, false);
	
			}
			else {
				if (this.debug) this.logInfo("Going to request events in the period of '"+this.startDate+"' until '"+this.endDate+"' from the exchange server to fill offlinecache.");
				this.requestPeriod(this.startDate, this.endDate, filter, {}, false);

				if ((this.startDate) && (startDate.compare(this.startDate)) < 0) {
					if (this.debug) this.logInfo("Going to request events in the period of '"+startDate.toString()+"' until '"+this.startDate.toString()+"' from the exchange server to fill offlinecache.");
					//this.getItems(filter, 0, startDate, this.startDate, null);
					this.requestPeriod(startDate, this.startDate, filter, {}, false);
				}
				if ((this.endDate) && (endDate.compare(this.endDate) > 0)) {
					if (this.debug) this.logInfo("Going to request events in the period of '"+this.endDate.toString()+"' until '"+endDate.toString()+"' from the exchange server to fill offlinecache.");
					//this.getItems(filter, 0, this.endDate, endDate, null);
					this.requestPeriod(this.endDate, endDate, filter, {}, false);
				}
			}
		}

		var self = this;
		if (this.supportsTasks) {
			if (this.debug) this.logInfo("Requesting tasks from exchange server.");
			this.addToQueue( erFindTaskItemsRequest, 
				{user: this.user, 
				 mailbox: this.mailbox,
				 serverUrl: this.serverUrl,
				 folderBase: this.folderBase,
				 itemFilter: filter,
				 folderID: this.folderID,
				 changeKey: this.changeKey,
				 actionStart: Date.now() }, 
				function(erFindTaskItemsRequest, aIds) { self.findTaskItemsOK(erFindTaskItemsRequest, aIds);}, 
				function(erFindTaskItemsRequest, aCode, aMsg) { self.findTaskItemsError(erFindTaskItemsRequest, aCode, aMsg);},
				null);
		}

	},

	masterIsInOfflineCache: function _masterIsInOfflineCache(aId) {
		if (this.debug) this.logInfo("masterIsInOfflineCache: aId:"+aId);
		if (!aId) return null;

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return null;
		}

		var result = null;

		var sqlStr = "SELECT id, uid, changeKey FROM items WHERE id = '"+aId+"' AND type='M'";

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return null;
		}

		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("Found item in offline Cache.");

					// Check if this item is not in the itemCache already.
					result = {changeKey: sqlStatement.row.changeKey, uid: sqlStatement.row.uid };
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}

		if ((this.debug) && (result)) this.logInfo("masterIsInOfflineCache: Retreived uid:'"+result.uid+"', changeKey:'"+result.changeKey+"' from offline cache.");
		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {

			if (result) {
				if (this.debug) this.logInfo("masterIsInOfflineCache: found in offline cache aId:"+aId+", changeKey:"+result.changeKey);
				return result;
			}
		}
		else {
			if (this.debug) this.logInfo("masterIsInOfflineCache: Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return null;
		}
		return null;
	},


	itemIsInOfflineCache: function _itemIsInOfflineCache(aId) {
		if (this.debug) this.logInfo("itemIsInOfflineCache: aId:"+aId);
		if (!aId) return null;

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return null;
		}

		var result = null;

		var sqlStr = "SELECT id, changeKey FROM items WHERE id = '"+aId+"'";

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return null;
		}

		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("Found item in offline Cache.");

					// Check if this item is not in the itemCache already.
					result = sqlStatement.row.changeKey;
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}

		if (this.debug) this.logInfo("itemIsInOfflineCache: Retreived changeKey:'"+result+"' from offline cache.");
		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {

			if (result) {
dump("itemIsInOfflineCache: found:"+result+"\n");
				return result;
			}
		}
		else {
			if (this.debug) this.logInfo("itemIsInOfflineCache: Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return null;
		}
		return null;
	},

	getOccurrencesFromOfflineCache: function _getOccurrencesFromOfflineCache(aMaster, aType) {
		if (this.debug) this.logInfo("getOccurrencesFromOfflineCache: aMaster.title:"+aMaster.title);
		if (!aMaster) return [];

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return [];
		}

		var result = [];

		var sqlStr = "SELECT id FROM items";
		var whereStr = "";
		if ((this.supportsEvents) && (!this.supportsTasks)) {
			whereStr = " WHERE event = 'y' AND type = '"+aType+"' AND uid = '"+aMaster.uid+"'";
			sqlStr += whereStr;
		}
		else {
			if ((!this.supportsEvents) && (this.supportsTasks)) {
				whereStr = " WHERE event = 'n' AND type = '"+aType+"' AND uid = '"+aMaster.uid+"'";
				sqlStr += whereStr;
			}
		}

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return [];
		}

		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("Found item in offline Cache.");

					// Check if this item is not in the itemCache already.
					if (!this.itemCacheById[sqlStatement.row.id]) {
						result.push(sqlStatement.row.id);
						cachedItem = null;
					}
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}

		if (this.debug) this.logInfo("getOccurrencesFromOfflineCache: Retreived '"+result.length+"' records from offline cache.");
		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {

			if (result.length > 0) {
dump("getOccurrencesFromOfflineCache: found:"+result.length+"\n");
				return result;
			}
		}
		else {
			if (this.debug) this.logInfo("getOccurrencesFromOfflineCache: Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return [];
		}
		return [];
	},

	getItemsFromOfflineCache: function _getItemsFromOfflineCache(aStartDate, aEndDate)
	{
		if (this.debug) this.logInfo("getItemsFromOfflineCache startDate:"+aStartDate+", endDate:"+aEndDate);
		//dump("getItemsFromOfflineCache: name:"+this.name+", startDate:"+aStartDate+", endDate:"+aEndDate+"\n");

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return;
		}

		var result = [];

		if (aStartDate) {
			var startDate = cal.toRFC3339(aStartDate.getInTimezone(this.globalFunctions.ecUTC()));
		}
		else {
			var startDate = "1900-01-01";
		}

		if (aEndDate) {
			var endDate = cal.toRFC3339(aEndDate.getInTimezone(this.globalFunctions.ecUTC()));
		}
		else {
			var endDate = "3500-01-01";
		}

		var sqlStr = "SELECT item FROM items";
		var whereStr = "";
		if ((this.supportsEvents) && (!this.supportsTasks)) {
			whereStr = " WHERE event = 'y' AND startDate <= '"+endDate+"' AND endDate >= '"+startDate+"'";
			sqlStr += whereStr+" ORDER BY type ASC";
		}
		else {
			if ((!this.supportsEvents) && (this.supportsTasks)) {
				whereStr = " WHERE event = 'n' AND ((startDate = '' AND endDate >= '"+startDate+"' AND endDate <= '"+endDate+"') OR (endDate = '' AND startDate >= '"+startDate+"' AND startDate <= '"+endDate+"') OR (startDate <= '"+endDate+"' AND endDate >= '"+startDate+"') OR (startDate = '' AND endDate = ''))";
				sqlStr += whereStr+" ORDER BY type ASC";
			}
		}

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return false;
		}

		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("Found item in offline Cache.");
					var root = xml2json.newJSON();
					xml2json.parseXML(root, sqlStatement.row.item);
					var cachedItem = root[telements][0];

					//cachedItem.content = ;
					//if (this.debug) this.logInfo(" --:"+cachedItem.toString());
					result.push(cachedItem);
					cachedItem = null;
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}

/*		var self = this;
		sqlStatement.executeAsync({
			handleResult: function(aResultSet) {
				if (self.debug) self.logInfo("Found item in offline Cache.");
				var row;
				while (row = aResultSet.getNextRow()) {

					if (row) {
						var cachedItem = this.globalFunctions.xmlToJxon(row.getResultByName('item'));

						//cachedItem.content = ;
						//if (self.debug) self.logInfo(" --:"+cachedItem.toString());
						//var result = [];
						result.push(cachedItem);
						//self.updateCalendar(null, result, false);
					}
				}
			},

			handleError: function(aError) {
				self.logInfo("Error reading from offline cache:" + aError.message);
			},

			handleCompletion: function(aReason) {
				sqlStatement.finalize();
				if (self.debug) self.logInfo("Retreived 1 '"+result.length+"' records from offline cache. startDate:"+startDate+", endDate:"+endDate);
				if (aReason == Ci.mozIStorageStatementCallback.REASON_FINISHED) {
					if (self.debug) self.logInfo("Retreived 2 '"+result.length+"' records from offline cache. startDate:"+startDate+", endDate:"+endDate);
					if (result.length > 0) {
						if (self.noDB) return;
						self.executeQuery("UPDATE items set event=(event || '_')"+whereStr);

						self.updateCalendar(null, result, false);
					}
				} else {
					if (self.debug) self.logInfo("Error executing Query. Error:"+aReason);
				}
			}
		});*/

		if (this.debug) this.logInfo("Retreived '"+result.length+"' records from offline cache. startDate:"+startDate+", endDate:"+endDate);
		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {

			if (result.length > 0) {
				//this.executeQuery("UPDATE items set event=(event || '_')"+whereStr); // Turned this of so items are always requested from offline cache. Even if they have been requested already.

				let updateResult = this.updateCalendar(null, result, false, true, false);

				if (this.debug) this.logInfo("Updated calendar with '"+result.length+"' records from offline cache. startDate:"+startDate+", endDate:"+endDate);
				return updateResult;
			}
		}
		else {
			if (this.debug) this.logInfo("Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return null;
		}
		return null;
	},

	getItemFromOfflineCache: function _getItemFromOfflineCache(aId) {
		if (this.debug) this.logInfo("getItemFromOfflineCache: aId:"+aId);
		if (!aId) return null;

		if ((!this.useOfflineCache) || (!this.offlineCacheDB) ) {
			return null;
		}

		var result = null;

		var sqlStr = "SELECT item FROM items WHERE id = '"+aId+"'";

		if (this.debug) this.logInfo("sql-query:"+sqlStr, 2);
		try {
			var sqlStatement = this.offlineCacheDB.createStatement(sqlStr);
		}
		catch(exc) {
			if (this.debug) this.logInfo("Error on createStatement. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString+", Exception:"+exc+". ("+sqlStr+")");
			return null;
		}

		var doContinue = true;
		try {
			while (doContinue) {
				doContinue = sqlStatement.executeStep();

				if (doContinue) {
					if (this.debug) this.logInfo("Found item in offline Cache.");

					// Check if this item is not in the itemCache already.
					var root = xml2json.newJSON();
					xml2json.parseXML(root, sqlStatement.row.item);
					result = this.convertExchangeToCal(root[telements][0], null, false, true);
					if (!result) {
						if (this.debug) this.logInfo("getItemFromOfflineCache: Could not convert exchange XML into Cal item.!! item:"+sqlStatement.row.item);
					}
				}
			}
		}
		finally {  
			sqlStatement.reset();
		}

		if (this.debug) this.logInfo("getItemFromOfflineCache: Retreived item from offline cache.");
		if ((this.offlineCacheDB.lastError == 0) || (this.offlineCacheDB.lastError == 100) || (this.offlineCacheDB.lastError == 101)) {

			if (result) {
				return result;
			}
		}
		else {
			if (this.debug) this.logInfo("getItemFromOfflineCache: Error executing Query. Error:"+this.offlineCacheDB.lastError+", Msg:"+this.offlineCacheDB.lastErrorString);
			return null;
		}
		return null;
	},


	set isOffline(aValue)
	{
		if (this.debug) this.logInfo("setting mIsOffline="+aValue);

		if (aValue != this.mIsOffline) {
			this.notConnected = aValue;
			this.mIsOffline = aValue;

			if (!aValue) {
				if (this.debug) this.logInfo("Initialized:"+this.isInitialized);
				this.readOnlyInternal = false;
				this.refresh();
			}
			else {
				if (this.calendarPoller) {
					this.calendarPoller.cancel();
				}
				this.inboxPoller.cancel();
				this.firstrun = true;
			}
		}
	},

	get isOffline()
	{
		return this.mIsOffline;
	},

	offlineStateChanged: function _offlineStateChanged(aStatus)
	{
		if (this.debug) this.logInfo("The offline state of TB changed to:"+aStatus);
		this.isOffline = (aStatus == "offline");
	},

	get offlineStartDate()
	{
		if (this.noDB) return null;
		var tmpStartDate = this.executeQueryWithResults("SELECT min(endDate) as newStartDate FROM items where type <> 'M'", ["newStartDate"]);
		if ((tmpStartDate) && (tmpStartDate.length > 0)) {
			var newStartDate = tmpStartDate[0].newStartDate;
			if (newStartDate) {
				if (newStartDate.length == 10) {
					newStartDate += "T00:00:00Z";
				}
				if (this.debug) this.logInfo("get offlineStartDate = '"+newStartDate+"'");
				return cal.createDateTime(newStartDate);
			}
		}

		return null;
	},

	get offlineEndDate()
	{
		if (this.noDB) return null;
		var tmpEndDate = this.executeQueryWithResults("SELECT max(endDate) as newEndDate FROM items where type <> 'M'", ["newEndDate"]);
		if ((tmpEndDate) && (tmpEndDate.length > 0)) {
			var newEndDate = tmpEndDate[0].newEndDate;
			if (newEndDate) {
				if (newEndDate.length == 10) {
					newEndDate += "T00:00:00Z";
				}
				if (this.debug) this.logInfo("get offlineEndDate = '"+newEndDate+"'");
				return cal.createDateTime(newEndDate);
			}
		}

		return null;
	},
	
	get offlineEventItemCount()
	{
		if (this.noDB) return "-";
		var tmpEventCount = this.executeQueryWithResults("SELECT COUNT() as eventCount FROM items where event = 'y' or event = 'y_'", ["eventCount"]);
		if ((tmpEventCount) && (tmpEventCount.length > 0)) {
			return tmpEventCount[0].eventCount;
		}

		return "--";
	},

	get offlineToDoItemCount()
	{
		if (this.noDB) return "-";
		var tmpToDoCount = this.executeQueryWithResults("SELECT COUNT() as toDoCount FROM items where event = 'n' or event = 'n_'", ["toDoCount"]);
		if ((tmpToDoCount) && (tmpToDoCount.length > 0)) {
			return tmpToDoCount[0].toDoCount;
		}

		return "--";
	},

	get memoryCacheItemCount()
	{
		var result = 0;
		for (var index in this.itemCacheById) {
			result++;
		}
		return result;
	},

    /**
     * Internal logging function that should be called on any database error,
     * it will log as much info as possible about the database context and
     * last statement so the problem can be investigated more easilly.
     *
     * @param message           Error message to log.
     * @param exception         Exception that caused the error.
     */
	logError: function _logError(message,exception) {
		let logMessage = "("+this.name+") " + message;

		if (exception) {
			logMessage += "\nException: " + exception;
		}

		this.globalFunctions.ERROR(logMessage + "\n" + this.globalFunctions.STACK(10));
	},

	logInfo: function _logInfo(message, aDebugLevel) {

		if (!this.debug) return;

		if (!aDebugLevel) {
			var debugLevel = 1;
		}
		else {
			var debugLevel = aDebugLevel;
		}

		if (this.globalFunctions.shouldLog()) {
			exchWebService.check4addon.logAddOnVersion();
		}

		if (debugLevel <= this.storedDebugLevel) {
			this.globalFunctions.LOG("["+this.name+"] "+message + " ("+this.globalFunctions.STACKshort()+")");
		}
	},

	setDoDebug: function _setDoDebug()
	{
		
		var prefB = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
		this.storedDebugLevel = this.globalFunctions.safeGetIntPref(prefB, "extensions.1st-setup.core.debuglevel", 0, true);

		this.debug = (this.storedDebugLevel > 0);

		if ((this.storedDebugLevel == 0) || (!this.globalFunctions.shouldLog())) {
			this.debug = false;
		}
	},

	connectionIsNotOk: function _connectionIsNotOk(aUrl, aStatus)
	{
		switch (aStatus) {
		case "2152398851": 
			this._connectionStateDescription = "Error resolving hostname '"+aUrl+"'. Did you type the right hostname. (STATUS_RESOLVING)";
			break;
		case "2152398852":
			this._connectionStateDescription = "Error during connection to hostname '"+aUrl+"'. (STATUS_CONNECTED_TO)";
			break;
		case "2152398853":
			this._connectionStateDescription = "Error during sending data to hostname '"+aUrl+"'. (STATUS_SENDING_TO)";
			break;
		case "2152398854": 
			this._connectionStateDescription = "Error during receiving of data from hostname '"+aUrl+"'. (STATUS_RECEIVING_FROM)";
			break;
		case "2152398855":
			this._connectionStateDescription = "Error during connecting to hostname '"+aUrl+"'. Is the host down?. (STATUS_CONNECTING_TO)";
			break;
		case "2152398858":
			this._connectionStateDescription = "Error during waiting for data of hostname '"+aUrl+"'. (STATUS_WAITING_FOR)";
			break;
		case "2152398859": 
			this._connectionStateDescription = "Error resolving hostname '"+aUrl+"'. Did you type the right hostname. (STATUS_RESOLVED)";
			break;
		default:
			this._connectionStateDescription = "Unknown error during communication with hostname '"+aUrl+"'. ("+aStatus+")";
		}
		this.setProperty("exchangeCurrentStatus", Cr.NS_ERROR_FAILURE);
	},

	connectionIsOk: function _connectionIsOk()
	{
		this._connectionStateDescription = "";
		this.setProperty("exchangeCurrentStatus", Cr.NS_OK);
	},

	get connectionStateDescription()
	{
		if (this._disabled) {
			this._connectionStateDescription = "Disabled";
		}
		else {
			if (this.isOffline) {
				this._connectionStateDescription = "Thunderbird is in Offline mode";
			}
		}
		return this._connectionStateDescription;
	},

	// Loads a file which is located below the Thunderbird <profile folder>/exchange-data
	// Real filename will be <calendar.id>.<aFilename>
	// e.g: aFilename == 'syncState'  -> <ProfD>/exchange-data/<calendar.id>.syncState
	// When the file exists the content will be read and returned as a string.
	// When the file does not exists it will return null.
	loadFromFile: function _loadFromFile(aFilename)
	
	{
		var file = Cc["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("ProfD", Components.interfaces.nsIFile);
		file.append("exchange-data");
		if ( !file.exists() || !file.isDirectory() ) {
			return null;  
		}

		file.append(this.id+"."+aFilename);

		if (!file.exists()) {
			return null;
		}

		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].  
				 createInstance(Components.interfaces.nsIFileInputStream);  
		istream.init(file, -1, -1, 0);  
		istream.QueryInterface(Components.interfaces.nsILineInputStream);  
		  
		// read lines into array  
		var line = {}, lines = "", hasmore;  
		do {  
			hasmore = istream.readLine(line);
			if (lines != "") lines += "\n";  
			lines += line.value;   
		} while(hasmore);  
		  
		istream.close();

		return lines;
	},

	// Loads a file which is located below the Thunderbird <profile folder>/exchange-data
	// Real filename will be <calendar.id>.<aFilename>
	// e.g: aFilename == 'syncState'  -> <ProfD>/exchange-data/<calendar.id>.syncState
	// When the file exists the file will be overwritten.
	saveToFile: function _saveToFile(aFilename, aContent)
	{
		var file = Cc["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("ProfD", Components.interfaces.nsIFile);
		file.append("exchange-data");
		if ( !file.exists() || !file.isDirectory() ) {
			file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0777", 8));  
		}

		file.append(this.id+"."+aFilename);

		if (file.exists()) {
			file.remove(false);
		}

//		file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0777);  

		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].  
				 createInstance(Components.interfaces.nsIFileOutputStream);  
		foStream.init(file, 0x02 | 0x08 | 0x20, parseInt("0777", 8), 0);  

		var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
				createInstance(Components.interfaces.nsIConverterOutputStream);
		converter.init(foStream, "UTF-8", 0, 0);
		converter.writeString(aContent);
		converter.close(); // this closes foStream
		  
		return 0;
	},

	removeFile: function _removeFile(aFilename)
	{
		var file = Cc["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties)
				.get("ProfD", Components.interfaces.nsIFile);
		file.append("exchange-data");
		if ( !file.exists() || !file.isDirectory() ) {
			return;  
		}

		file.append(this.id+"."+aFilename);

		if (file.exists()) {
			file.remove(false);
		}
	},
};

function ecObserver(inCalendar)  
{  
	this.calendar = inCalendar;

	var self = this;
	this.ecInvitationsCalendarManagerObserver = {
		onCalendarRegistered: function cMO_onCalendarRegistered(aCalendar) {
//			self.calendar.logInfo("onCalendarRegistered name="+aCalendar.name+", id="+aCalendar.id);
		},

		onCalendarUnregistering: function cMO_onCalendarUnregistering(aCalendar) {
			self.calendar.logInfo("onCalendarUnregistering name="+aCalendar.name+", id="+aCalendar.id);
			if (aCalendar.id == self.calendar.id) {

				self.calendar.doDeleteCalendar();
				self.calendar.logInfo("Removing calendar preference settings.");
	
				var rmPrefs = Cc["@mozilla.org/preferences-service;1"]
			                    .getService(Ci.nsIPrefService)
					    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl.");
				try {
					rmPrefs.deleteBranch(aCalendar.id);
				} catch(err) {}

				aCalendar.removeFile("syncState.txt");
				aCalendar.removeFile("syncInboxState.txt");
				aCalendar.removeFile("folderProperties.txt");
				aCalendar.removeFile("syncStateInbox.txt");
				self.unregister();
			}
		},

		onCalendarDeleting: function cMO_onCalendarDeleting(aCalendar) {
			self.calendar.logInfo("onCalendarDeleting name="+aCalendar.name+", id="+aCalendar.id);

		}
	};


	this.register();  
}  

ecObserver.prototype = {  

	observe: function(subject, topic, data) 
	{  
		// Do your stuff here.
		//LOG("ecObserver.observe. topic="+topic+",data="+data+"\n"); 
		switch (topic) {
			case "onCalReset":
				if (data == this.calendar.id) {
					this.calendar.resetCalendar();
				}
				break;
			case "onExchangeConnectionError":
				var parts = data.split("|");
				if (this.calendar.serverUrl == parts[0]) {
					this.calendar.connectionIsNotOk(parts[2], parts[1]);
				}
				break;
			case "onExchangeConnectionOk":
				// See if it is for us
				if (data == this.calendar.serverUrl) {
					this.calendar.connectionIsOk();
				}
				break;
			case "quit-application":
				this.unregister();
				break;
			case "nsPref:changed":
				if ((data == "extensions.1st-setup.debug.log") || (data == "extensions.1st-setup.core.debuglevel")) {
					this.calendar.setDoDebug();
				}
				break;
			case "network:offline-status-changed":
					this.calendar.offlineStateChanged(data);
				break;
		} 
	},  

	register: function()
	{  
		var observerService = Cc["@mozilla.org/observer-service;1"]  
		                          .getService(Ci.nsIObserverService);  
		observerService.addObserver(this, "onCalReset", false);  
		observerService.addObserver(this, "onExchangeConnectionError", false);  
		observerService.addObserver(this, "onExchangeConnectionOk", false);  
		observerService.addObserver(this, "quit-application", false); 
		observerService.addObserver(this, "network:offline-status-changed", false);

		Services.prefs.addObserver("extensions.1st-setup.debug.log", this, false);
		Services.prefs.addObserver("extensions.1st-setup.core.debuglevel", this, false);


		getCalendarManager().addObserver(this.ecInvitationsCalendarManagerObserver);
	},  

	unregister: function()
	{  
		this.calendar.doShutdown();

		var observerService = Cc["@mozilla.org/observer-service;1"]  
		                            .getService(Ci.nsIObserverService);  
		observerService.removeObserver(this, "onCalReset");  
		observerService.removeObserver(this, "onExchangeConnectionError");  
		observerService.removeObserver(this, "onExchangeConnectionOk");  
		observerService.removeObserver(this, "quit-application");  
		observerService.removeObserver(this, "network:offline-status-changed");

		getCalendarManager().removeObserver(this.ecInvitationsCalendarManagerObserver);
	}  
}

function convertToVersion1()
{
	var tmpPrefService = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService);
	var tmpPrefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
		    .getBranch("calendar.registry.");

	var mivFunctions = Cc["@1st-setup.nl/global/functions;1"].getService(Ci.mivFunctions);

	var children = tmpPrefs.getChildList("");
	if (children.length > 0) {
		// Move prefs from old location to new location.
		var oldUUID = "";
		var newUUID = false;
		var exchangeType = false;
		var updateToUUID = null;
		for (var index in children) {

			var pos = children[index].indexOf(".");
			var tmpUUID = children[index].substr(0, pos);
			var tmpField = children[index].substr(pos+1); 

			if (tmpField == "uri") {
				mivFunctions.LOG("Going to check calendar registry '"+tmpUUID+"' if it needs to be updated.");

				var tmpType = mivFunctions.safeGetCharPref(null, "calendar.registry."+tmpUUID+".type", null, false);

				var tmpURI = mivFunctions.safeGetCharPref(null, "calendar.registry."+children[index], null, false);
				if ((tmpURI != "https://auto/"+tmpUUID) && (tmpType == "exchangecalendar")) {
					// update uri preference
					mivFunctions.LOG("Going to upgrade calendar registry '"+tmpUUID+"'");
					
					var updatePrefs = Cc["@mozilla.org/preferences-service;1"]
						    .getService(Ci.nsIPrefService)
						    .getBranch("calendar.registry."+tmpUUID+".");
					updatePrefs.setCharPref("uri", "https://auto/"+tmpUUID);

					var updatePrefs = Cc["@mozilla.org/preferences-service;1"]
						    .getService(Ci.nsIPrefService)
						    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl."+tmpUUID+".");
					updatePrefs.setIntPref("exchangePrefVersion", 1);
					tmpPrefService.savePrefFile(null);
				}
			}
		}
		
	}

}

/** Module Registration */
const scriptLoadOrder = [
	"calUtils.js"
];

if (! exchWebService) var exchWebService = {};

exchWebService.check4addon = {

	allReadyLogged: false,

	checkAddOnIsInstalledCallback: function _checkAddOnIsInstalledCallback(aAddOn)
	{
		var mivFunctions = Cc["@1st-setup.nl/global/functions;1"].getService(Ci.mivFunctions);
		if (!aAddOn) {
			mivFunctions.LOG("Exchange Calendar and Tasks add-on is NOT installed.");
		}
		else {
			mivFunctions.LOG(aAddOn.name +" is installed.");
			try {
				mivFunctions.LOG(aAddOn.name +" is installed from:"+aAddOn.sourceURI.prePath+aAddOn.sourceURI.path);
			}
			catch(err) {
				mivFunctions.LOG(aAddOn.name +" unable to determine where installed from.");
			}
			mivFunctions.LOG(aAddOn.name +" is version:"+aAddOn.version);
			if (aAddOn.isActive) {
				mivFunctions.LOG(aAddOn.name +" is active.");
			}
			else {
				mivFunctions.LOG(aAddOn.name +" is NOT active.");
			}
		}

	},

	logAddOnVersion: function _logAddOnVersion()
	{
		if (this.allReadyLogged) return;

		this.allReadyLogged = true;

		Cu.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("exchangecalendar@extensions.1st-setup.nl", exchWebService.check4addon.checkAddOnIsInstalledCallback);
	}
}

function NSGetFactory(cid) {
	try {
		if (!NSGetFactory.mainEC) {
			// Load main script from lightning that we need.
			convertToVersion1();

			cal.loadScripts(scriptLoadOrder, Cu.getGlobalForObject(this));
			NSGetFactory.mainEC = XPCOMUtils.generateNSGetFactory([calExchangeCalendar]);
			
	}

	} catch(e) {
		Components.utils.reportError(e);
		dump(e);
		throw e;
	}

	return NSGetFactory.mainEC(cid);
} 

/* Following is code for testing and debugging. 

var tmpStr = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"'+"\r\n"+'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+"\r\n"+'xmlns:xsd="http://www.w3.org/2001/XMLSchema">'+"\r\n"+'<soap:Header><t:ServerVersionInfo'+"\r\n"+'MajorVersion="8" MinorVersion="3" MajorBuildNumber="279" MinorBuildNumber="1"'+"\r\n"+'Version="Exchange2007_SP1"'+"\r\n"+'xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"'+"\r\n"+'/></soap:Header>\n\t<soap:Body>\n\t\t<m:SyncFolderItemsResponse'+"\r\n"+'xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"'+"\r\n"+'xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"><m:ResponseMessages><m:SyncFolderItemsResponseMessage'+"\r\n"+'ResponseClass="Success"><m:ResponseCode>NoError</m:ResponseCode><m:SyncState>.'+"\r\n"+'..</m:SyncState><m:IncludesLastItemInRange>true</m:IncludesLastItemInRange><m:Changes'+"\r\n"+'/></m:SyncFolderItemsResponseMessage></m:ResponseMessages></m:SyncFolderItemsResponse></soap:Body></soap:Envelope>';

var start = new Date().getTime();
var samples = 1;//5000;
var globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
				.getService(Ci.mivFunctions);

for (var i=0;i<samples;i++) {
var tmpXML = globalFunctions.xmlToJxon(tmpStr);
				tmpXML.addNameSpace("s", nsSoapStr);
				tmpXML.addNameSpace("m", nsMessagesStr);
				tmpXML.addNameSpace("t", nsTypesStr);
				tmpXML.addNameSpace("michel", nsTypesStr);
}
var elapsed = new Date().getTime() - start;
dump(">>>>>>>>>>> -----:elapsed:"+elapsed+", for samples:"+samples+"\n");
dump(">>>>>>>>>>> -----:Going to do XPath"+"\n");
var tmpobject = tmpXML.XPath("/s:Envelope/s:Header/michel:ServerVersionInfo");
dump(">>>>>>>>>>> -----: MinorVersion:"+tmpobject[0].getAttribute("MinorVersion")+"\n");
var tmpobject = tmpXML.XPath("/s:Envelope/s:Body/m:SyncFolderItemsResponse/m:ResponseMessages/m:SyncFolderItemsResponseMessage[@ResponseClass='Success1' and m:ResponseCode='NoError']");
if (tmpobject.length > 0) {
	dump(">>>>>>>>>>> -----: SyncFolderItemsResponseMessage:"+tmpobject[0].toString()+"\n");
}
else {
	dump(">>>>>>>>>>> -----: XPath not foound SyncFolderItemsResponseMessage"+"\n");
}
dump(">>>>>>>>>>> -----:"+tmpXML.toString()+"\n");

*/
