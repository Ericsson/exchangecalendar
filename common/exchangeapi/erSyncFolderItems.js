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

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erSyncFolderItemsRequest"];

function erSyncFolderItemsRequest(aArgument, aCbOk, aCbError, aListener) {

    this.argument = aArgument;
    this.mailbox = aArgument.mailbox;
    this.serverUrl = aArgument.serverUrl;
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;
    this.syncState = aArgument.syncState;
    this.mCbOk = aCbOk;
    this.mCbError = aCbError;
    if (!aArgument.syncState) {
        this.getSyncState = true;
    }
    else {
        this.getSyncState = false;
    }

    this.creations = [];
    this.updates = [];
    this.deletions = [];

    this.attempts = 0;
    this.runs = 0;
    this.isRunning = true;

    var self = this;
    this.parent = new ExchangeRequest(aArgument,
        function (aExchangeRequest, aResp) {
            self.onSendOk(aExchangeRequest, aResp);
        },
        function (aExchangeRequest, aCode, aMsg) {
            self.onSendError(aExchangeRequest, aCode, aMsg);
        },
        aListener);


    this.execute(aArgument.syncState);
}

erSyncFolderItemsRequest.prototype = {

    execute: function _execute(aSyncState) {
        //exchWebService.commonFunctions.LOG("erSyncFolderItemsRequest.execute\n");
        this.runs++;

        var root = xml2json.newJSON();
        xml2json.parseXML(root, '<nsMessages:SyncFolderItems xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var req = root[telements][0];

        var itemShape = xml2json.addTag(req, "ItemShape", "nsMessages", null);
        xml2json.addTag(itemShape, "BaseShape", "nsTypes", "IdOnly");
        itemShape = null;

        var parentFolder = makeParentFolderIds3("SyncFolderId", this.argument);
        xml2json.addTagObject(req, parentFolder);
        parentFolder = null;

        if ((aSyncState) && (aSyncState != "")) {
            xml2json.addTag(req, "SyncState", "nsMessages", aSyncState);
        }

        if (this.getSyncState) {
            xml2json.addTag(req, "MaxChangesReturned", "nsMessages", "512");
        }
        else {
            xml2json.addTag(req, "MaxChangesReturned", "nsMessages", "25");
        }

        this.parent.xml2json = true;

        //exchWebService.commonFunctions.LOG(String(this.parent.makeSoapMessage(req)));		
        this.attempts++;

        var soapStr = this.parent.makeSoapMessage2(req);
        req = null;
        this.parent.sendRequest(soapStr, this.serverUrl);
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //dump("\nerSyncFolderItemsRequest.onSendOk:"+xml2json.toString(aResp));
        try {
            var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:SyncFolderItemsResponse/m:ResponseMessages/m:SyncFolderItemsResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

            if (rm.length > 0) {
                var syncState = xml2json.getTagValue(rm[0], "m:SyncState");

                var lastItemInRange = xml2json.getTagValue(rm[0], "m:IncludesLastItemInRange");

                if (this.getSyncState === false) {
                    var createItems = xml2json.XPath(rm[0], "/m:Changes/t:Create");
                    for each(var creation in createItems) {
                        var calendarItems = xml2json.XPath(creation, "/t:CalendarItem/t:ItemId");
                        for each(var calendarItem in calendarItems) {
                            this.creations.push({
                                Id: xml2json.getAttribute(calendarItem, "Id").toString(),
                                ChangeKey: xml2json.getAttribute(calendarItem, "ChangeKey").toString()
                            });
                        }
                        calendarItems = null;

                        var tasks;
                        switch (this.folderBase) {
                        case "tasks":
                            tasks = xml2json.XPath(creation, "/t:Task/t:ItemId");
                            break;
                        case "inbox":
                            tasks = xml2json.XPath(creation, "/t:Message/t:ItemId");
                            break;
                        default:
                        }

                        for each(var task in tasks) {
                            this.creations.push({
                                Id: xml2json.getAttribute(task, "Id").toString(),
                                ChangeKey: xml2json.getAttribute(task, "ChangeKey").toString()
                            });
                        }
                        tasks = null;
                    }
                    createItems = null;

                    var updateItems = xml2json.XPath(rm[0], "/m:Changes/t:Update");
                    for each(var update in updateItems) {
                        var calendarItems = xml2json.XPath(update, "/t:CalendarItem/t:ItemId");
                        for each(var calendarItem in calendarItems) {
                            this.updates.push({
                                Id: xml2json.getAttribute(calendarItem, "Id").toString(),
                                ChangeKey: xml2json.getAttribute(calendarItem, "ChangeKey").toString()
                            });
                        }
                        calendarItems = null;

                        var tasks;
                        switch (this.folderBase) {
                        case "tasks":
                            tasks = xml2json.XPath(update, "/t:Task/t:ItemId");
                            break;
                        case "inbox":
                            tasks = xml2json.XPath(update, "/t:Message/t:ItemId");
                            break;
                        default:
                        }
                        for each(var task in tasks) {
                            this.updates.push({
                                Id: xml2json.getAttribute(task, "Id").toString(),
                                ChangeKey: xml2json.getAttribute(task, "ChangeKey").toString()
                            });
                        }
                        tasks = null;
                    }
                    updateItems = null;

                    var deleteItems = xml2json.XPath(rm[0], "/m:Changes/t:Delete/t:ItemId");
                    for each(var deleted in deleteItems) {
                        this.deletions.push({
                            Id: xml2json.getAttribute(deleted, "Id").toString(),
                            ChangeKey: xml2json.getAttribute(deleted, "ChangeKey").toString()
                        });
                    }
                    deleteItems = null;

                    rm = null;
                    aResp = null;
                }

                if (lastItemInRange == "false") {
                    if ((this.mCbOk) && (this.getSyncState === false)) {
                        this.mCbOk(this, this.creations, this.updates, this.deletions, syncState);
                    }
                    this.creations = [];
                    this.updates = [];
                    this.deletions = [];
                    this.execute(syncState);
                    return;
                }
                else {
                    if (this.mCbOk) {
                        this.mCbOk(this, this.creations, this.updates, this.deletions, syncState);
                    }
                    this.creations = [];
                    this.updates = [];
                    this.deletions = [];
                    this.isRunning = false;
                }
            }
            else {
                if (this.attempts == 1) {
                    // We retry without a known syncstate.
                    this.getSyncState = true;
                    this.execute(null);
                    return;
                }
                else {
                    var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:SyncFolderItemsResponse/m:ResponseMessages/m:SyncFolderItemsResponseMessage");
                    if (rm.length > 0) {
                        var ResponseCode = xml2json.getTagValue(rm[0], "m:ResponseCode");
                    }
                    else {
                        var ResponseCode = "Unknown error from Exchange server.";
                    }
                    rm = null;
                    this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SYNCFOLDERITEMS_UNKNOWN, "Error during SyncFolderItems:" + ResponseCode);
                    return;
                }
            }
            this.parent = null;
        }
        catch (tmpErr) {
            dump("\nerSyncFolderItemsRequest.onSendOk: try error '" + tmpErr + "'.\n");
        }
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        dump("erSyncFolderItemsRequest.onSendError aMsg:" + aMsg + "\n");
        this.isRunning = false;
        this.parent = null;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
