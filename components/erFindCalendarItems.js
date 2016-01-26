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
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/
var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecalendar/ecFunctions.js");
Cu.import("resource://exchangecalendar/ecExchangeRequest.js");
Cu.import("resource://exchangecalendar/soapFunctions.js");

Cu.import("resource://interfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erFindCalendarItemsRequest"];

function convDate(aDate)
{
	if (aDate) {
		var d = aDate.clone();

		d.isDate = false;
		return cal.toRFC3339(d);
	}

	return null;
}

function erFindCalendarItemsRequest(aArgument, aCbOk, aCbError, aListener)
{
	this.mCbOk = aCbOk;
	this.mCbError = aCbError;

	var self = this;

	this.parent = new ExchangeRequest(aArgument, 
		function(aExchangeRequest, aResp) { self.onSendOk(aExchangeRequest, aResp);},
		function(aExchangeRequest, aCode, aMsg) { self.onSendError(aExchangeRequest, aCode, aMsg);},
		aListener);

	this.argument = aArgument;
	this.mailbox = aArgument.mailbox;
	this.serverUrl = aArgument.serverUrl;
	this.rangeStart = aArgument.rangeStart;
	this.rangeEnd = aArgument.rangeEnd;

	this.count = aArgument.count;
	this.folderID = aArgument.folderID;
	this.folderBase = aArgument.folderBase;
	this.changeKey = aArgument.changeKey;
	this.listener = aListener;
	this.itemFilter = aArgument.itemFilter;

	this.uid = aArgument.uid;

	this.recurringMasters = [];
	this.occurrences = [];
	this.occurrenceIds = [];
	this.ids = [];

	this.itemsFound = 0;
	this.offset = 0;
	this.isRunning = true;
	this.execute();
}

erFindCalendarItemsRequest.prototype = {

	execute: function _execute()
	{
		//exchWebService.commonFunctions.LOG("erFindCalendarItemsRequest.execute\n");

		var root = xml2json.newJSON();
		var req = xml2json.addTag(root, "FindItem", "nsMessages", null);
		xml2json.setAttribute(req, "xmlns:nsMessages", nsMessagesStr);
		xml2json.setAttribute(req, "xmlns:nsTypes", nsTypesStr);
		xml2json.setAttribute(req, "Traversal", "Shallow");

		var itemShape = xml2json.addTag(req, "ItemShape", "nsMessages", null);
		var baseShape = xml2json.addTag(itemShape, "BaseShape", "nsTypes", "IdOnly");

		var additionalProperties = xml2json.addTag(itemShape, "AdditionalProperties", "nsTypes", null);
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='calendar:UID'/>");
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='calendar:CalendarItemType'/>");
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='calendar:Start'/>");
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='calendar:End'/>");
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='item:ItemClass'/>");
		xml2json.parseXML(additionalProperties,"<nsTypes:FieldURI FieldURI='item:Subject'/>");

		var view = xml2json.addTag(req, "CalendarView", "nsMessages", null); 

		if (this.newStartDate) {
				xml2json.setAttribute(view, "StartDate", this.newStartDate);
		}
		else {
			if (this.rangeStart) {
				xml2json.setAttribute(view, "StartDate", convDate(this.rangeStart));
			}
			else {
				xml2json.setAttribute(view, "StartDate", "1900-01-01T00:00:00-00:00");
			}
		}

		if (this.rangeEnd) {
			xml2json.setAttribute(view, "EndDate", convDate(this.rangeEnd));
		}
		else {
			xml2json.setAttribute(view, "EndDate", "2300-01-01T00:00:00-00:00");
		}
		xml2json.setAttribute(view, "MaxEntriesReturned", "1000");

		view = null;

		var parentFolder = makeParentFolderIds3("ParentFolderIds", this.argument);
		xml2json.addTagObject(req,parentFolder);
		parentFolder = null;

		this.parent.xml2json = true;

		//exchWebService.commonFunctions.LOG("erFindCalendarItemsRequest.execute 2:"+String(this.parent.makeSoapMessage2(req))+"\n");

                this.parent.sendRequest(this.parent.makeSoapMessage2(req), this.serverUrl);
		req = null;
	},

	onSendOk: function _onSendOk(aExchangeRequest, aResp)
	{
		/*
		 * We want to include all Single items, all Exception items, but also
		 * at least one Occurrence or Exception item for each master.
		 * If we include too many Occurrences, we will query for the master
		 * too often, but if we don't include any, we might not query for the
		 * master at all.
		 *
		 * We first collect all non-Occurrences, and after that we fill in
		 * Occurrence for those masters that did not yet see any Exception.
		 */
		if (this.subject) {
		 exchWebService.commonFunctions.LOG("erFindCalendarItemsRequest.onSendOk:"+xml2json.toString(aResp)+"\n");
		}

		var aError = false;
		var aCode = 0;
		var aMsg = "";

		var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

		if (rm.length > 0) {
			var rootFolder = xml2json.getTag(rm[0], "m:RootFolder");
			if (rootFolder) {
					//this.offset = xml2json.getAttribute(rootFolder, "IndexedPagingOffset");
					//exchWebService.commonFunctions.LOG(" -- Next IndexedPagingOffset:"+this.offset+".");
					//exchWebService.commonFunctions.LOG(" -- Next IndexedPagingOffset:"+this.offset+"\n");

					// Process results.
					var calendarItems = xml2json.XPath(rootFolder, "/t:Items/t:CalendarItem");
					this.newStartDate = null;
					for (var index=0; index < calendarItems.length; index++) {

						if (xml2json.getTagValue(calendarItems[index], "t:Start").substr(0,10) == xml2json.getTagValue(calendarItems[index], "t:End").substr(0,10)) {
							var tmpDateStr = xml2json.getTagValue(calendarItems[index], "t:End");
							var tmpDateObj = cal.fromRFC3339(tmpDateStr, exchWebService.commonFunctions.ecTZService().UTC).getInTimezone(exchWebService.commonFunctions.ecDefaultTimeZone());
							var offset = cal.createDuration();
							offset.seconds = 1;
							tmpDateObj.addDuration(offset);
							this.newStartDate = convDate(tmpDateObj);
//		exchWebService.commonFunctions.LOG("  && this.newStartDate:"+this.newStartDate+"\n");
						}

						this.itemsFound++;
						var uid = xml2json.getTagValue(calendarItems[index], "t:UID", "");

/*exchWebService.commonFunctions.LOG("  ** title:"+xml2json.getTagValue(calendarItems[index], "t:Subject", "<NOP>")+"\n");
exchWebService.commonFunctions.LOG("  ** Start:"+xml2json.getTagValue(calendarItems[index], "t:Start", "<NOP>")+"\n");
exchWebService.commonFunctions.LOG("  ** End:"+xml2json.getTagValue(calendarItems[index], "t:End", "<NOP>")+"\n");
exchWebService.commonFunctions.LOG("  ** CalendarItemType:"+xml2json.getTagValue(calendarItems[index], "t:CalendarItemType", "<NOP>")+"\n");*/

						switch (xml2json.getTagValue(calendarItems[index], "t:CalendarItemType")) {
							case "Occurrence" :
							case "Exception" :
								if ((this.uid) && (this.uid != uid)) { // Do not select items which do not fit the selected uid.
									uid = "";
								}
								if (uid != "") {
									this.occurrences[uid] = {Id: xml2json.getAttributeByTag(calendarItems[index], "t:ItemId","Id"),
										  ChangeKey: xml2json.getAttributeByTag(calendarItems[index], "t:ItemId", "ChangeKey"),
										  type: xml2json.getTagValue(calendarItems[index], "t:CalendarItemType"),
										  uid: uid,
										  start: xml2json.getTagValue(calendarItems[index], "t:Start"),
										  end: xml2json.getTagValue(calendarItems[index], "t:End")};
								}
							case "RecurringMaster" :
							case "Single" :
								this.ids.push({Id: xml2json.getAttributeByTag(calendarItems[index], "t:ItemId","Id"),
										  ChangeKey: xml2json.getAttributeByTag(calendarItems[index], "t:ItemId", "ChangeKey"),
										  type: xml2json.getTagValue(calendarItems[index], "t:CalendarItemType"),
										  uid: uid,
										  start: xml2json.getTagValue(calendarItems[index], "t:Start"),
										  end: xml2json.getTagValue(calendarItems[index], "t:End")});
								break;
							default:
								exchWebService.commonFunctions.LOG("UNKNOWN CalendarItemType:"+xml2json.getTagValue(calendarItems[index], "t:CalendarItemType")+"\n");
								break;
						}
					}
					calendarItems = null;
//				if ((xml2json.getAttribute(rootFolder, "IncludesLastItemInRange") == "true") || (this.newStartDate === null) || (tmpDateObj.compare(this.rangeEnd) > 0)) {
				if ((xml2json.getAttribute(rootFolder, "IncludesLastItemInRange") == "true")) {
					// We are done.
					exchWebService.commonFunctions.LOG("erFindCalendarItems: retrieved:"+this.itemsFound+" items. TotalItemsInView:"+xml2json.getAttribute(rootFolder, "TotalItemsInView")+" items. Includes last item in range.");
					//exchWebService.commonFunctions.LOG("erFindCalendarItems: retrieved:"+this.itemsFound+" items. TotalItemsInView:"+xml2json.getAttribute(rootFolder, "TotalItemsInView")+" items. Includes last item in range.\n\n");
				}
				else {
					// We return the result to be processed.
					exchWebService.commonFunctions.LOG("erFindCalendarItems: retrieved:"+this.itemsFound+" items. TotalItemsInView:"+xml2json.getAttribute(rootFolder, "TotalItemsInView")+" items. Last item not in range so going for another run.");
					//exchWebService.commonFunctions.LOG("erFindCalendarItems: retrieved:"+this.itemsFound+" items. TotalItemsInView:"+xml2json.getAttribute(rootFolder, "TotalItemsInView")+" items. Last item not in range so going for another run.\n\n");
					if (this.mCbOk) {
						var occurrenceList = [];
						for (var index in this.occurrences) {
							occurrenceList.push(this.occurrences[index]);
						}
						this.mCbOk(this, this.ids, occurrenceList);
					}
					this.recurringMasters = [];
					this.occurrences = [];
					this.occurrenceIds = [];
					this.ids = [];

					this.execute(); 
					return;
				}
			}
			else {
				aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
				aError = true;
				aMsg = "No RootFolder found in FindItemResponse.";
			}
		}
		else {
			aMsg = this.parent.getSoapErrorMsg(aResp);
			if (aMsg) {
				aCode = this.parent.ER_ERROR_CONVERTID;
				aError = true;
			}
			else {
				aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
				aError = true;
				aMsg = "Wrong response received.";
			}
		}
		
		rm = null;

		if (aError) {
			this.onSendError(aExchangeRequest, aCode, aMsg);
		}
		else {
			if (this.mCbOk) {
				var occurrenceList = [];
				for (var index in this.occurrences) {
					occurrenceList.push(this.occurrences[index]);
				}
				this.mCbOk(this, this.ids, occurrenceList);
			}
			this.ids = null;
			this.occurrences = null;
			this.isRunning = false;
		}
		
	},

	onSendError: function _onSendError(aExchangeRequest, aCode, aMsg)
	{
exchWebService.commonFunctions.LOG(" @@@ onSendError aCode:"+aCode+", aMsg:"+aMsg+" @@@\n");
		this.isRunning = false;
		if (this.mCbError) {
			this.mCbError(this, aCode, aMsg);
		}
	},
};


