/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0 
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 */

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://exchangecommon/erGetItems.js");
Cu.import("resource://exchangecommon/erFindInboxFolder.js");
Cu.import("resource://exchangecommon/erSubscribe.js");
Cu.import("resource://exchangecommon/erGetEvents.js");
Cu.import("resource://exchangecommon/erFindItems.js");
Cu.import("resource://exchangecommon/erUpdateItem.js");
Cu.import("resource://exchangecommon/erUnsubscribe.js");

const eventTypes = ["NewMailEvent", "ModifiedEvent", "MovedEvent", "CopiedEvent", "CreatedEvent"];

const mivFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);

if (Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions)) {
    dump("\EwsTagging(exception) 2 :");
}

function globalLOG(msg, user) {
    if (!debug) return;
    if (user) {
        mivFunctions.LOG("ewsTagger(" + user + "): " + msg);
    }
    else {
        mivFunctions.LOG("ewsTagger-----: " + msg);
    }
}

var tmpDebug = null;

try {
    let prefB = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    let storedDebugLevel = mivFunctions.safeGetIntPref(prefB, "extensions.1st-setup.core.debuglevel", 0, true);
    tmpDebug = (storedDebugLevel > 0);

    if ((storedDebugLevel == 0) || (!mivFunctions.shouldLog())) {
        tmpDebug = false;
    }

}
catch (e) {
    dump("\EwsTagging(exception) 1 :" + e);
}


const debug = tmpDebug;
const exchangeGlobalFunction = globalLOG;

//hold all array of ews objects
var ewsTaggerObj = [];

/*
 * @Constructor
 * Message updater
 *
 */
rtews.UpdateMessage = function (updates) {
    this.updates = updates;
    this.pendingUpdates = [];
    this.pendingAttempts = 0;
};

rtews.UpdateMessage.prototype = {
    update: function () {
        var that = this;
        var messageId = this.updates[0].msgId;
        var tags = this.updates[0].tags;
        var folderPath = this.updates[0].path;
        exchangeGlobalFunction("Going to update server messages, total - " + this.updates.length);

        that.searchGloda(messageId, folderPath, function (msgHdrs) {
            exchangeGlobalFunction("Going to update local messages, total - " + msgHdrs.length);
            exchangeGlobalFunction("Searching Gloda for messageId - " + messageId + " in  folderPath - " + folderPath);
            if (msgHdrs.length == 0) {
                exchangeGlobalFunction("Gloda did not find message for messageId - " + messageId + " in  folderPath - " + folderPath);
            }
            else {
                exchangeGlobalFunction("update messages with tags  " + String(tags));
                for (var x = 0; x < msgHdrs.length; x++) {
                    exchangeGlobalFunction("Remove messages tags  " + String(tags));
                    rtews.removeAllMessageTagsPostEwsUpdate(msgHdrs[x]);
                    if (tags.length > 0) {
                        exchangeGlobalFunction("Toggle messages tags  " + String(tags));
                        that.addKeywordsToMessage(msgHdrs[x], tags);
                    }
                }
            }

            that.updates.shift();
            if (that.updates.length > 0) {
                that.update();
            }
        });
    },

    /*
     * Upated message with categories received
     */
    addKeywordsToMessage: function (msgHdr, keywords) {
        try {
            var messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
            messages.appendElement(msgHdr, false);

            var toggler = "addKeywordsToMessages";
            for (var t = 0; t < keywords.length; t++) {
                msgHdr.folder[toggler](messages, keywords[t]);
            }
        }
        catch (e) {
            exchangeGlobalFunction("addKeywordsToMessages.exception{1} " + e);
        }

        OnTagsChange();
    },

    /*
     * Search the GLODA for message
     */
    searchGloda: function (messageId, folderPath, callback) {
        try {
            var query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
            query.headerMessageID(messageId);

            var queryListener = {
                /* called when new items are returned by the database query or freshly indexed */
                onItemsAdded: function queryListener_onItemsAdded(aItems, aCollection) {},
                /* called when items that are already in our collection get re-indexed */
                onItemsModified: function queryListener_onItemsModified(aItems, aCollection) {},
                /* called when items that are in our collection are purged from the system */
                onItemsRemoved: function queryListener_onItemsRemoved(aItems, aCollection) {},
                /* called when our database query completes */
                onQueryCompleted: function queryListener_onQueryCompleted(aCollection) {
                    msgHdrs = [];
                    //             exchangeGlobalFunction("rtews:UpdateMessage.update , Found messages "+aCollection.items.length);
                    try {
                        for (var j = 0; j < aCollection.items.length; j++) {
                            if (aCollection.items[j].folder.uri.toLowerCase().endsWith(folderPath.toLowerCase())) {
                                if (aCollection.items[j].folderMessage != null) {
                                    msgHdrs.push(aCollection.items[j].folderMessage);
                                }
                            }
                        }
                        callback(msgHdrs);
                    }
                    catch (e) {
                        exchangeGlobalFunction("searchGloda.exception{1} " + e);
                        callback(msgHdrs);
                    }
                }
            };
            var collection = query.getCollection(queryListener);
        }
        catch (e) {
            exchangeGlobalFunction("searchGloda.exception{2} " + e);
        }
    }
};

rtews.Tags = {
    tagService: Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService),

    getKeyForTag: function (name) {
        return this.tagService.getKeyForTag(name) ? this.tagService.getKeyForTag(name) : null;
    },

    getTagForKey: function (key) {
        try {
            return this.tagService.getTagForKey(key);
        }
        catch (e) {

        }
        return null;
    },

    getTagsForKeys: function (keys) {
        var tags = [];
        for (var x = 0; x < keys.length; x++) {
            var tag = this.getTagForKey(keys[x]);
            if (tag != null) {
                tags.push(tag);
            }
        }
        return tags;
    },

    addTag: function (name) {
        this.tagService.addTag(name, "", "");
        return this.getKeyForTag(name);
    }
};

function rtews(identity) {
    this.identity = identity;
    // fixing bug #270 

    if (identity.username.indexOf("@") > -1) {
        this.user = identity.username;
    }
    else {
        if (identity.domain == "") {
            this.user = identity.username;
        }
        else {
            this.user = identity.domain + "\\" + identity.username;
        }
    }

    this.mailbox = identity.email;
    this.serverUrl = identity.ewsUrl;

    this.folderByImapPath = [];
    this.folderByEwsId = [];
    this.foldersByIdentity = {};

    this.session = {
        subscriptionId: "",
        watermark: "",
    };

    this.retry = true;

    this.globalFunctions = mivFunctions;

    this.prefs = identity.prefs;

    if (this.prefs) {
        this.pollOffset = this.globalFunctions.safeGetIntPref(this.prefs, "syncMailItems.Interval", 15) * 1000; //time for getevents   
        this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
            .getService(Ci.mivExchangeLoadBalancer);
    }
    else {
        this.prefs = null;
        this.pollOffset = 30000; //time for getevents 
    }

    this.subscriptionTimeout = "1440";
}

rtews.prototype = {
    /*
     *use Calendar queue for xml request
     */
    addToQueue: function _addToQueue(aRequest, aArgument, aCbOk, aCbError, aListener) {
        if (mivFunctions.safeGetBoolPref(this.prefs, "mailsync.active", false) == false) {
            exchangeGlobalFunction("Not adding to queue because we are disabled,  " + this.serverUrl, this.user);
            this.Running = false;
            return;
        }
        //if (!aArgument["ServerVersion"]) aArgument["ServerVersion"] = this.exchangeStatistics.getServerVersion(this.serverUrl);

        this.loadBalancer.addToQueue({
            calendar: this.prefs,
            ecRequest: aRequest,
            arguments: aArgument,
            cbOk: aCbOk,
            cbError: aCbError,
            listener: aListener
        });
    },
    /*
     * Gets the ItemId element from response of the FindItem SOAP request
     *
     */
    findFolders: function _findFolders(identity) {
        exchangeGlobalFunction("Find all the folderd in msgfolderroot,  " + this.serverUrl, this.user);
        //Call API
        var self = this;
        this.addToQueue(erFindInboxFolderRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                folderBase: "msgfolderroot",
                folderPath: "",
                actionStart: Date.now()
            },
            function (erFindInboxFolderRequest, folders) {
                self.findFoldersOK(erFindInboxFolderRequest, folders);
            },
            function (erFindInboxFolderRequest, aCode, aMsg) {
                self.findFoldersError(erFindInboxFolderRequest, aCode, aMsg);
            },
            null);
    },

    findFoldersOK: function _findFoldersOK(erFindInboxFolderRequest, afolders) {
        exchangeGlobalFunction("folders found, going to subscribe  " + JSON.stringify(afolders), this.user);
        this.processFolders(afolders);
        var folders = this.getFoldersByIdentity(this.identity);
        if (folders.length > 0) {
            this.subscribe(folders);
        }
    },

    subscribe: function _subscribe(folders) {
        exchangeGlobalFunction("Trying to subscribe  ", this.user);
        var self = this;
        this.addToQueue(erSubscribeRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                folderBase: "",
                changeKey: "",
                folderIds: folders,
                actionStart: Date.now(),
                timeout: this.subscriptionTimeout, //Keep the subscription for one day i.e 1440 minutes 
                eventTypes: eventTypes,
            },
            function (erSubscribeRequest, subscriptionId, watermark) {
                self.subscribeOK(erSubscribeRequest, subscriptionId, watermark);
            },
            function (erSubscribeRequest, aCode, aMsg) {
                self.subscribeError(erSubscribeRequest, aCode, aMsg);
            },
            null);
    },

    subscribeOK: function _subscribeOK(erSubscribeRequest, subscriptionId, watermark) {
        exchangeGlobalFunction("Subscribed,  subscriptionId - " + subscriptionId + ",  watermark  " + watermark, this.user);
        exchangeGlobalFunction("Subscription Timeout set to " + this.subscriptionTimeout + "(minutes)", this.user);
        this.session.subscriptionId = subscriptionId;
        this.session.watermark = watermark;
        this.poll();
    },

    unsubscribe: function _unsubscribe() {
        exchangeGlobalFunction("Error occured Unsubscribing user.", this.user);
        this.Running = false;
        var that = this;
        this.addToQueue(erUnsubscribeRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                actionStart: Date.now(),
                subscriptionId: this.session.subscriptionId,
                watermark: this.session.watermark,
            },
            function (erUnsubscribeRequest, aResp) {
                unsubscribeOK(erUnsubscribeRequest, aResp);
            },
            function (erUnsubscribeRequest, aCode, aMsg) {
                unsubscribeError(erUnsubscribeRequest, aCode, aMsg);
            },
            null);
    },

    unsubscribeOK: function _unsubscribeOK(erUnsubscribeRequest, aResp) {
        exchangeGlobalFunction("Unsubscribed user.", this.user);
    },

    unsubscribeError: function _unsubscribeError(erUnsubscribeRequest, aCode, aMsg) {
        exchangeGlobalFunction("unsubscribeError: " + aMsg);
    },

    poll: function _poll() {
        var self = this;
        this.Running = false;
        exchangeGlobalFunction("Polltime set -  " + this.pollOffset + "(milliseconds)", this.user);

        this.pollInterval = setInterval(function () {
            if (self.session == null) {
                return;
            }
            exchangeGlobalFunction("Syncting TagItems now.", self.user);

            if (self.Running == true) {
                exchangeGlobalFunction("Already Running", self.user);
                return;
            }
            //Check for new event on the mail box
            self.getEvents();
        }, this.pollOffset);
    },

    getItemsError: function _getItemsError(erGetItemsRequest, aCode, aMsg) {
        exchangeGlobalFunction("getItemsError: " + aMsg);
    },

    getItemsOK: function _getItemsOK(erGetItemsRequest, aItems, aItemErrors) {
        exchangeGlobalFunction("getItemsOK, Received server items to update: " + aItems.length, this.user);
        if (aItems.length > 0) {

            var getItem = function (aItem) {
                let id = xml2json.getAttributeByTag(aItem, 't:ItemId', 'Id');
                let changeKey = xml2json.getAttributeByTag(aItem, 't:ItemId', 'ChangeKey');
                return {
                    "Id": id,
                    "ChangeKey": changeKey,
                };
            }

            var getParentItem = function (aItem) {
                let id = xml2json.getAttributeByTag(aItem, 't:ParentFolderId', 'Id');
                let changeKey = xml2json.getAttributeByTag(aItem, 't:ParentFolderId', 'ChangeKey');
                return {
                    "Id": id,
                    "ChangeKey": changeKey,
                };
            }

            var updates = [];

            for (var item = 0; item < aItems.length; item++) {
                var itemId = getItem(aItems[item]);
                var parentItemId = getParentItem(aItems[item]);

                var messageIdElm = xml2json.XPath(aItems[item], "/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyTag = '0x1035']");
                var messageId = null;
                if (messageIdElm.length > 0) {
                    messageId = xml2json.getTagValue(messageIdElm[0], "t:Value", null);
                }
                messageId = messageId.replace('<', '').replace('>', '');
                if (messageId == undefined || messageId == null || messageId == "") {
                    exchangeGlobalFunction("(warn?) messageId " + messageId + " is invalid.", this.user);
                    continue;
                }
                var categories = [];
                var tags = [];

                var categoriesElm = xml2json.XPath(aItems[item], '/t:Categories/t:String');
                for (var index = 0; index < categoriesElm.length; index++) {
                    categories.push(categoriesElm[index].c);
                }

                if (categories.length > 0) {
                    var errCategory = [];

                    for (var index = 0; index < categories.length; index++) {
                        var category = categories[index];

                        if (category) {
                            var tKey = rtews.Tags.getKeyForTag(category);

                            if (tKey != null) {
                                tags.push(tKey);
                            }
                            else {
                                var newTagKey = rtews.Tags.addTag(category);

                                if (newTagKey != null) {
                                    tags.push(newTagKey);
                                }
                                else {
                                    errCategory.push(category);
                                }
                            }
                        }
                    }
                    //Prompt categories that were not converted to tags.
                    if (errCategory.length) {
                        var stringBundle = document.getElementById("string-bundle");
                        Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).alert(null, stringBundle.getString("rtews.title"), stringBundle.getString("rtews.tagAddError") + " " + errCategory.join(", "));
                    }
                }

                var folderEwsId = this.gerFolderByEwsId(parentItemId.Id);

                if (folderEwsId != null) {
                    updates.push({
                        msgId: messageId,
                        tags: tags,
                        path: folderEwsId.path
                    });
                }
            } //Close received items update

            exchangeGlobalFunction("Server getItemsOK, received items:  " + updates.length, this.user);
            if (updates.length) {
                setTimeout(function () {
                    var updateMsg = new rtews.UpdateMessage(updates);
                    updateMsg.update();
                }, 500);
            }
        }
    },

    getAndUpdateItems: function _getAndUpdateItems(aIds) {
        exchangeGlobalFunction("Received request to update messages,  total items to be requested - " + aIds.length, this.user);
        var that = this;
        this.addToQueue(erGetItemsRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                ids: aIds,
                folderClass: "IPM.Note",
            },
            function (erGetItemsRequest, aIds, aItemErrors) {
                that.getItemsOK(erGetItemsRequest, aIds, aItemErrors);
            },
            function (erGetItemsRequest, aCode, aMsg) {
                that.getItemsError(erGetItemsRequest, aCode, aMsg);
            },
            null);
    },

    getEvents: function _getEvents() {
        //exchangeGlobalFunction("calling getEvents for user, ", this.user );
        this.Running = true;
        var that = this;

        this.addToQueue(erGetEventsRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                actionStart: Date.now(),
                subscriptionId: this.session.subscriptionId,
                watermark: this.session.watermark,
            },
            function (erGetEventsRequest, aResp) {
                getEventsOK(erGetEventsRequest, aResp);
            },
            function (erGetEventsRequest, aCode, aMsg) {
                getEventsError(erGetEventsRequest, aCode, aMsg);
            },
            null);

        function getEventsOK(erGetEventsRequest, response) {
            exchangeGlobalFunction("Getting events finished..", that.user);

            if (response.length > 0) {
                var note = response[0].XPath("/m:GetEventsResponseMessage/m:Notification");
                var subscriptionId = note[0].getTagValue("t:SubscriptionId");
                var moreEvents = note[0].getTagValue("t:MoreEvents");
                var previousWatermark = note[0].getTagValue("t:PreviousWatermark");

                var _Watermark = response[0].XPath("/m:GetEventsResponseMessage/m:Notification/*/t:Watermark");
                var watermark = _Watermark[_Watermark.length - 1].value;

                that.session.watermark = watermark;
                that.Running = false;

                var itemIds = [];
                var _itemIds = response[0].XPath("/m:GetEventsResponseMessage/m:Notification/*/t:ItemId");
                if (_itemIds.length > 0) {
                    for (var index = 0; index < _itemIds.length; index++) {
                        itemIds.push(_itemIds[index]);
                    }
                }

                exchangeGlobalFunction("Received update messages,  total items pending - " + itemIds.length, that.user);

                if (itemIds.length == 0) {
                    exchangeGlobalFunction("No action needed. now going to sleep..", that.user);
                    return;
                }

                var oldItemIds = [];
                var _oldItemIds = response[0].XPath("/m:GetEventsResponseMessage/m:Notification/*/t:OldItemId");
                if (_oldItemIds.length > 0) {
                    for (var index = 0; index < _oldItemIds.length; index++) {
                        oldItemIds.push(_oldItemIds[index]);
                    }
                }
                var newItemIds = [];
                if (oldItemIds.length > 0) {
                    for (var itemId = 0; itemId < itemIds.length; itemId++) {
                        var id = itemIds[itemId].getAttribute("Id");

                        for (var oldItemId = 0; oldItemId < oldItemIds.length; oldItemId++) {
                            var oId = oldItemIds[oldItemId].getAttribute("Id");
                            if (id != oId) {
                                newItemIds.push(itemIds[itemId]);
                            }
                        }
                    }
                }
                else {
                    newItemIds = itemIds.splice(0);
                }

                var getItem = function (aItem) {
                    let id = aItem.getAttribute('Id');
                    let changeKey = aItem.getAttribute('ChangeKey');
                    return {
                        "Id": id,
                        "ChangeKey": changeKey,
                    };
                }

                if (newItemIds.length == 0) return;
                var itemList = [];
                for (var index = 0; index < newItemIds.length; index++) {
                    itemList.push(getItem(newItemIds[index]));
                }
                try {
                    that.getAndUpdateItems(itemList);
                }
                catch (e) {}

            }
            else {
                exchangeGlobalFunction("Get events returned with resonse error. going to sleep.. ", that.user);
                that.Running = false;
            }
        }

        function getEventsError(erGetEventsRequest, aCode, aMsg) {
            exchangeGlobalFunction("getEventsError aCode:" + aCode + " aMsg: " + aMsg);
            that.Running = false;

            //If error reset tags syncing 
            if (that.retry) that.reset();
            that.retry = false;
        }
    },

    reset: function _reset() {
        exchangeGlobalFunction("Received error while gettign error", this.user);
        this.pollInterval = 0;
        exchangeGlobalFunction("Stop syncing  now.. " + this.pollInterval, this.user);
        this.unsubscribe();
        exchangeGlobalFunction("Going to unsubscribe current subsciption. " + this.session.subscriptionId, this.user);
        exchangeGlobalFunction("Resume syncing tags for user", this.user);
        this.processIdentity();
    },

    getIdentities: function _getIdentities() {
        //	exchangeGlobalFunction("getIdentities " , this.user);

        var pref = getCalendarPref(this.identity.email);
        if (pref) {
            this.session.subscriptionId = this.globalFunctions.safeGetCharPref(pref, "subscriptionId");
        }
    },

    saveIdentities: function _saveIdentities() {
        //	exchangeGlobalFunction("saveIdentities ", this.user);

        var pref = getCalendarPref(this.identity.email);
        if (pref) {
            pref.setCharPref("subscriptionId", this.session.subscriptionId);
        }

    },

    subscribeError: function _subscribeError(erSubscribeRequest, aCode, aMsg) {
        exchangeGlobalFunction("subscribeError aCode:" + aCode + " aMsg: " + aMsg);
    },

    getFoldersByIdentity: function _getFoldersByIdentity(identity) {
        return this.foldersByIdentity[this.identity.email] != undefined ? this.foldersByIdentity[this.identity.email] : null;
    },

    gerFolderByEwsId: function _gerFolderByEwsId(id) {
        return this.folderByEwsId[id] != undefined ? this.folderByEwsId[id] : null;
    },

    gerFolderByImapPath: function _gerFolderByImapPath(path) {
        return this.folderByImapPath[path.toLowerCase()] != undefined ? this.folderByImapPath[path.toLowerCase()] : null;
    },

    findFoldersError: function _findFoldersError(erFindInboxFolderRequest, aCode, aMsg) {
        exchangeGlobalFunction("findFoldersError aCode:" + aCode + " aMsg: " + aMsg);
    },

    processFolders: function _processFolders(response) {
        var identity = this.identity;

        var folderElms = response;
        var folders = [];
        var obj = {};

        function Folder(id, name, parentId, changeKey) {
            this.id = id;
            this.name = name;
            this.pId = parentId;
            this.changeKey = changeKey;
            this.path = "";
        }

        for (var x = 0, len = folderElms.length; x < len; x++) {
            var folderClass = folderElms[x].folderClass;
            if (folderClass == "IPF.Note") {
                var fId = folderElms[x].id;
                var fName = folderElms[x].name;
                var fPId = folderElms[x].pId;

                var fo = new Folder(fId, fName, fPId, null);

                obj[fId] = fo;
            }
        }

        //Find path of the folder
        var __parents = [];
        //Find parent of the given objects. Loops parent of parent to build the path
        function getParent(o) {
            var parent = obj[o.pId];
            __parents.push(o.name);
            if (parent) {
                getParent(parent);
            }
        }

        this.foldersByIdentity[identity.email] = [];

        for (var p in obj) {
            __parents = [];
            getParent(obj[p]);
            var path = [];
            path.push(identity.serverURI);
            path.push(__parents.reverse().join("/"));
            obj[p].path = path.join("/").toLowerCase();
            folders.push(obj[p]);
            this.folderByEwsId[obj[p].id] = obj[p];
            this.folderByImapPath[obj[p].path] = obj[p];
            this.foldersByIdentity[identity.email].push(obj[p]);
        }
    },
    /*
     * Initialize each identity.  
     */
    processIdentity: function _processIdentity() {
        this.findFolders();
    },
    /*
     * Event handler for Sync Tags menu item. s
     */
    syncTags: function _syncTags() {
        var selectedMessages = gFolderDisplay.selectedMessages;
        var that = this;
        for (var i = 0; i < selectedMessages.length; ++i) {
            var msgHdr = selectedMessages[i];
            var messageId = '<' + msgHdr.messageId + '>';
            var folder = this.gerFolderByImapPath(msgHdr.folder.URI);

            exchangeGlobalFunction("Syncing Tags for message id - " + messageId, this.user);

            if (!folder) {
                continue;
            }

            this.addToQueue(erFindItemsRequest, {
                    user: this.user,
                    mailbox: this.mailbox,
                    serverUrl: this.serverUrl,
                    actionStart: Date.now(),
                    folderID: folder.id,
                    messageId: messageId,
                },
                function (erFindItemsRequest, aIds) {
                    //findItemOk Callback 
                    exchangeGlobalFunction("Syncing tags found items on server returned total - " + aIds.length, that.user);
                    if (aIds.length > 0) {
                        that.getAndUpdateItems(aIds);
                    }
                    else {
                        exchangeGlobalFunction("Syncing tags not finding any items in server for Ids. " + JSON.stringify(messageId), that.user);
                    }
                },
                function (erFindItemsRequest, aCode, aMsg) {
                    exchangeGlobalFunction("findItemsError:  aCode:" + aCode + " aMsg: " + aMsg);
                },
                null);
        }
    },
    /*
     * Updates the tags (categories) on exchange server before updating locally. 
     */
    toggleTags: function _toggleTags(msgHdr, identity, toggleType, categories, key, addKey) {

        var folder = this.gerFolderByImapPath(msgHdr.folder.URI);
        var messageId = '<' + msgHdr.messageId + '>';

        exchangeGlobalFunction("Toggle tags on message id - " + messageId, this.user);

        var that = this;
        if (!folder) {
            return;
        }

        function findItemsOK(erFindItemsRequest, aIds) {
            exchangeGlobalFunction("Toggle tags found items on server returned total - " + aIds.length, that.user);
            if (aIds.length > 0) {
                that.updateItem(aIds, msgHdr, identity, toggleType, categories, key, addKey);
            }
            else {
                exchangeGlobalFunction("Toggle tags not finding any items in server for Ids. " + JSON.stringify(messageId), that.user);
                //when no mail item is find toggle tags locally
                exchangeGlobalFunction("Update tags locally", that.user);
                rtews.fallBackTagUpdate(msgHdr, identity, toggleType, categories, key, addKey);
            }
        }

        function findItemsError(erFindItemsRequest, aCode, aMsg) {
            exchangeGlobalFunction("findItemsError:  aCode:" + aCode + " aMsg: " + aMsg);
        }

        this.addToQueue(erFindItemsRequest, {
                user: this.user,
                mailbox: this.mailbox,
                serverUrl: this.serverUrl,
                actionStart: Date.now(),
                folderID: folder.id,
                messageId: messageId,
            },
            function (erFindItemsRequest, aIds) {
                findItemsOK(erFindItemsRequest, aIds);
            },
            function (erFindItemsRequest, aCode, aMsg) {
                findItemsError(erFindItemsRequest, aCode, aMsg);
            },
            null);

    },
    /*
     * Update Mail item with category
     */
    updateItem: function _updateItem(aIds, msgHdr, identity, toggleType, categories, key, addKey) {
        exchangeGlobalFunction("updating Item(s), aIds total -  " + aIds.length + " ,   toggleType " + toggleType, this.user);

        var that = this;

        var item = aIds[0];

        var changes = '<nsTypes:ItemChange>';
        changes += '<nsTypes:ItemId Id="' + item.Id + '" ChangeKey="' + item.ChangeKey + '" />';
        changes += '<nsTypes:Updates>';
        changes += '<nsTypes:SetItemField>';
        changes += '<nsTypes:FieldURI FieldURI="item:Categories"/>';
        changes += '<nsTypes:Message>';
        changes += '<nsTypes:Categories>';
        if (categories.length > 0) {
            for (var index in categories) {
                changes += '<nsTypes:String>' + categories[index] + '</nsTypes:String>';
            }
        }
        changes += '</nsTypes:Categories>';
        changes += '</nsTypes:Message>';
        changes += '</nsTypes:SetItemField>';
        changes += '</nsTypes:Updates>';
        changes += '</nsTypes:ItemChange>';

        exchangeGlobalFunction("UpdateItem with changes " + changes, this.user);

        this.addToQueue(erUpdateItemRequest, {
                user: this.user,
                mailbox: this.mailbox,
                folderBase: this.folderBase,
                serverUrl: this.serverUrl,
                updateReq: changes,
                actionStart: Date.now(),
                onlySnoozeChanges: false,
            },
            function (erUpdateItemRequest, aId, aChangeKey) {
                updateItemOK(erUpdateItemRequest, aId, aChangeKey);
            },
            function (erUpdateItemRequest, aCode, aMsg) {
                updateItemError(erUpdateItemRequest, aCode, aMsg);
            },
            null);

        function updateItemOK(erUpdateItemRequest, aId, aChangeKey) {
            exchangeGlobalFunction("Updated item with id  = " + aId + " and ChangeKey =  " + aChangeKey, that.user);
            if (toggleType == "removeAll") {
                rtews.removeAllMessageTagsPostEwsUpdate(msgHdr);
            }
            else {
                rtews.toggleMessageTagPostEwsUpdate(key, addKey, msgHdr);
            }
        }

        function updateItemError(erUpdateItemRequest, aCode, aMsg) {
            exchangeGlobalFunction("updateItemError:  aCode:" + aCode + " aMsg: " + aMsg);
        }
    },
    /*
     *  Initialize 
     */
    load: function _load() {
        this.processIdentity();
    },
};


/*
 * On remote fails
 */
rtews.fallBackTagUpdate = function (msgHdr, identity, toggleType, categories, key, addKey) {
    if (toggleType == "removeAll") {
        rtews.removeAllMessageTagsPostEwsUpdate(msgHdr);
    }
    else {
        rtews.toggleMessageTagPostEwsUpdate(key, addKey, msgHdr);
    }
};

/*
 * Custom method for remove all tags menuitem 
 */
rtews.removeAllMessageTagsPostEwsUpdate = function (msgHdr) {
    //Check if a message header is passed
    //Else use the selected messages
    if (msgHdr == undefined) {
        var selectedMessages = gFolderDisplay.selectedMessages;
    }
    else {
        var selectedMessages = [msgHdr];
    }

    if (!selectedMessages.length)
        return;

    var messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    var tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
    var tagArray = tagService.getAllTags({});

    var allKeys = "";
    for (var j = 0; j < tagArray.length; ++j) {
        if (j)
            allKeys += " ";
        allKeys += tagArray[j].key;
    }

    var prevHdrFolder = null;
    // this crudely handles cross-folder virtual folders with selected messages
    // that spans folders, by coalescing consecutive messages in the selection
    // that happen to be in the same folder. nsMsgSearchDBView does this better,
    // but nsIMsgDBView doesn't handle commands with arguments, and untag takes a
    // key argument. Furthermore, we only delete legacy labels and known tags,
    // keeping other keywords like (non)junk intact.

    for (var i = 0; i < selectedMessages.length; ++i) {
        msgHdr = selectedMessages[i];
        msgHdr.label = 0;
        // remove legacy label
        if (prevHdrFolder != msgHdr.folder) {
            if (prevHdrFolder)
                prevHdrFolder.removeKeywordsFromMessages(messages, allKeys);
            messages.clear();
            prevHdrFolder = msgHdr.folder;
        }
        messages.appendElement(msgHdr, false);
    }
    if (prevHdrFolder)
        prevHdrFolder.removeKeywordsFromMessages(messages, allKeys);
    OnTagsChange();
};
/*
 * Custom method to handle tag menu click event 
 */
rtews.toggleMessageTagPostEwsUpdate = function (key, addKey, msgHdr) {
    var messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    var msg = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

    if (msgHdr == undefined) {
        var selectedMessages = gFolderDisplay.selectedMessages;
    }
    else {
        var selectedMessages = [msgHdr];
    }

    var toggler = addKey ? "addKeywordsToMessages" : "removeKeywordsFromMessages";
    var prevHdrFolder = null;
    // this crudely handles cross-folder virtual folders with selected messages
    // that spans folders, by coalescing consecutive msgs in the selection
    // that happen to be in the same folder. nsMsgSearchDBView does this
    // better, but nsIMsgDBView doesn't handle commands with arguments,
    // and (un)tag takes a key argument.
    for (var i = 0; i < selectedMessages.length; ++i) {
        msgHdr = selectedMessages[i];

        if (msgHdr.label) {
            // Since we touch all these messages anyway, migrate the label now.
            // If we don't, the thread tree won't always show the correct tag state,
            // because resetting a label doesn't update the tree anymore...
            msg.clear();
            msg.appendElement(msgHdr, false);
            msgHdr.folder.addKeywordsToMessages(msg, "$label" + msgHdr.label);
            msgHdr.label = 0;
            // remove legacy label
        }
        if (prevHdrFolder != msgHdr.folder) {
            if (prevHdrFolder)
                prevHdrFolder[toggler](messages, key);
            messages.clear();
            prevHdrFolder = msgHdr.folder;
        }
        messages.appendElement(msgHdr, false);
    }
    if (prevHdrFolder)
        prevHdrFolder[toggler](messages, key);
    OnTagsChange();
};

rtews.syncTags = function (event) {
    var identity = rtews.getIdentity(gFolderDisplay.displayedFolder.server.prettyName);
    rtewsObj(identity).syncTags();
};

rtews.addSyncMenu = function (menuPopup) {
    var newMenuItem = document.createElement("menuitem");
    newMenuItem.setAttribute('oncommand', 'rtews.syncTags(event.target);');
    newMenuItem.setAttribute("label", "EWS Sync Tags");
    menuPopup.appendChild(newMenuItem);

    var newMenuSeperator = document.createElement("menuseparator");
    newMenuSeperator.setAttribute("id", "mailContext-sep-afterTagSync");
    menuPopup.appendChild(newMenuSeperator);
};

/*
 * Fetch configured identity based on the email
 */
rtews.getIdentity = function (server) {
    var ids = identities;
    if (ids) {
        for (var x = 0, len = ids.length; x < len; x++) {
            if (ids[x] && ids[x].enabled == true && ids[x].server == server) {
                return ids[x];
            }
        }
    }
    return null;
};

//Get all the identities 
const identities = getAllAccounts();

/*
 * Initialilize 
 */
function init() {
    exchangeGlobalFunction("Initializing Remote tagger.");
    exchangeGlobalFunction("Total accounts after filtering -  " + identities.length);

    exchangeGlobalFunction("debug =  " + debug);
    for (var account = 0, len = identities.length; account < len; account++) {
        if (identities[account].ewsUrl && identities[account].enabled) {

            var tmp = new rtews(identities[account]);
            tmp.load();
            ewsTaggerObj[account] = tmp;
            if (tmp) {
                exchangeGlobalFunction("Initialized {" + (account + 1) + "} - " + identities[account].email);
            }
            tmp = null;
            // 	             exchangeGlobalFunction("xxxxxxxxxxxxxxxxx account: " + ewsTaggerObj[account].identity.email +  JSON.stringify(identities[account]) );
        }
    }
}
/*
 * Get ews obj of respective mail account
 */
function rtewsObj(identity) {
    if (!identity) {
        return null;
    }
    for (var obj in ewsTaggerObj) {
        if ((ewsTaggerObj[obj].identity.email == identity.email) && (ewsTaggerObj[obj].identity.serverURI == identity.serverURI)) {
            return ewsTaggerObj[obj];
        }
    }
    return null;
}

function removeDuplicateAccount(identities) {
    exchangeGlobalFunction("Account available total -  " + identities.length);

    if (identities.length > 0) {
        var newidentities = [];

        find = function (arr, key, val) { //Find array element which has a key value of val 
            for (var ai, i = arr.length; i--;) {
                if ((ai = arr[i]) && ai[key] == val) {
                    return true;
                }
                else {
                    return null;
                }
            }
        }

        for (var account in identities) {
            if (identities[account].email != null) {
                if (account == 0) {
                    newidentities.push(identities[account]);
                    continue;
                }

                var test = find(newidentities, "serverURI", identities[account].serverURI);
                if (!test) {
                    newidentities.push(identities[account]);
                }
                else {
                    exchangeGlobalFunction("Removing duplicate account with email address ,  " + identities[account].email);
                }
                test = null;
            }
        }

        //return filtered accounts
        return newidentities;
    }
    else {
        return [];
    }
}

function getAllAccounts() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = acctMgr.accounts;
    //  exchangeGlobalFunction("rtews:getAllAccounts " + versionChecker.compare(appInfo.version, "20.0") +accounts.length );
    if (accounts) {
        if (versionChecker.compare(appInfo.version, "20.0") >= 0) {
            var _accounts = [];

            for (var i = 0; i < accounts.length; i++) {

                var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
                var identities = account.identities;
                for (var index = 0; index < identities.length; index++) {
                    var identity = identities.queryElementAt(index, Ci.nsIMsgIdentity);
                    var calAccount = getCalendarPref(identity.email);
                    var enabled = false;
                    exchangeGlobalFunction("Account exists  for email address -  " + identity.email);

                    var details = null;

                    if (calAccount && mivFunctions) {
                        enabled = mivFunctions.safeGetBoolPref(calAccount, "mailsync.active", false);
                        details = {
                            "server": account.incomingServer.prettyName,
                            "serverURI": account.incomingServer.serverURI,
                            "email": mivFunctions.safeGetCharPref(calAccount, "ecMailbox"),
                            "username": mivFunctions.safeGetCharPref(calAccount, "ecUser"),
                            "name": identity.fullName,
                            "domain": mivFunctions.safeGetCharPref(calAccount, "ecDomain"),
                            "enabled": enabled,
                            "ewsUrl": mivFunctions.safeGetCharPref(calAccount, "ecServer"),
                            "prefs": calAccount,
                        };
                    }

                    if (details != null) {
                        if (details.enabled == true) {
                            _accounts.push(details);
                        }
                    }
                }
            }
            var _newaccounts = removeDuplicateAccount(_accounts);
            return _newaccounts;

        }
        else {
            let _accounts = [];

            for (let i = 0; i < accounts.length; i++) {

                let account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
                let identities = account.identities;
                for (let index = 0; index < identities.length; index++) {
                    let identity = identities.queryElementAt(index, Ci.nsIMsgIdentity);
                    let calAccount = getCalendarPref(identity.email);
                    let enabled = false;
                    exchangeGlobalFunction("Account exists  for email address -  " + identity.email);

                    let details = null;

                    if (calAccount && mivFunctions) {
                        enabled = mivFunctions.safeGetBoolPref(calAccount, "mailsync.active", false);
                        details = {
                            "server": account.incomingServer.prettyName,
                            "serverURI": account.incomingServer.serverURI,
                            "email": mivFunctions.safeGetCharPref(calAccount, "ecMailbox"),
                            "username": mivFunctions.safeGetCharPref(calAccount, "ecUser"),
                            "name": identity.fullName,
                            "domain": mivFunctions.safeGetCharPref(calAccount, "ecDomain"),
                            "enabled": enabled,
                            "ewsUrl": mivFunctions.safeGetCharPref(calAccount, "ecServer"),
                            "prefs": calAccount,
                        };
                    }
                    if (details != null) {
                        if (details.enabled == true) {
                            _accounts.push(details);
                        }
                    }
                }
            }

            let _newaccounts = removeDuplicateAccount(_accounts);
            return _newaccounts;

        }
    }
    else {
        var _newaccounts = [];
        return _newaccounts;
    }

}

function findAccountFromFolder(aFolder) {
    if (!aFolder)
        return null;
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = acctMgr.accounts;
    if (versionChecker.compare(appInfo.version, "20.0") >= 0) {
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);

            var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder  
            if (rootFolder.hasSubFolders) {
                var subFolders = rootFolder.subFolders; // nsIMsgFolder  
                while (subFolders.hasMoreElements()) {
                    if (aFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                        return account.QueryInterface(Components.interfaces.nsIMsgAccount);
                }
            }
        }
    }
    else {
        for (let i = 0; i < accounts.Count(); i++) {
            let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);

            let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder  
            if (rootFolder.hasSubFolders) {
                let subFolders = rootFolder.subFolders; // nsIMsgFolder  
                while (subFolders.hasMoreElements()) {
                    if (aFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                        return account.QueryInterface(Components.interfaces.nsIMsgAccount);
                }
            }
        }
    }
    return null;
}

function getCalendarPref(aEmail) {
    if (!aEmail)
        return null;

    ///Get Calendar manager
    var calManager = Cc["@mozilla.org/calendar/manager;1"]
        .getService(Ci.calICalendarManager);
    var cals = calManager.getCalendars({});

    for (var i = 0; i < cals.length; i++) {
        var cal = cals[i];
        if (cal.type == "exchangecalendar") {

            if (cal.mailbox == aEmail) {
                try {
                    var calPref = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService)
                        .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + cal.id + ".");

                    if (calPref.getCharPref("ecFolderbase") == "calendar") {
                        return calPref;
                    }

                }
                catch (e) {
                    exchangeGlobalFunction("rtews: e2 " + e);
                }
            }
        }
    }
    return null;
}
/*
 * Overrides default method for applying tag.
 *
 */
function ToggleMessageTag(key, addKey) {
    var identity = rtews.getIdentity(gFolderDisplay.displayedFolder.server.prettyName);

    //if we don't have the id configured run the default toggle functionality
    if (identity == null) {
        rtews.toggleMessageTagPostEwsUpdate(key, addKey);
        return;
    }

    var selectedMessages = gFolderDisplay.selectedMessages;

    for (var i = 0; i < selectedMessages.length; ++i) {
        var msgHdr = selectedMessages[i];
        var keywords = Array.prototype.slice.call(msgHdr.getStringProperty('keywords').trim().split(" "));

        if (addKey) {
            keywords.push(key);
        }
        else {
            keywords.splice(keywords.indexOf(key), 1);
        }

        var categories = rtews.Tags.getTagsForKeys(keywords);

        rtewsObj(identity).toggleTags(msgHdr, identity, "single", categories, key, addKey);
    }
}

/*
 * Overrides default remove all method.
 *
 */
function RemoveAllMessageTags() {
    var identity = rtews.getIdentity(gFolderDisplay.displayedFolder.server.prettyName);
    //if we don't have the id configured run the default toggle functionality
    if (identity == null) {
        rtews.removeAllMessageTagsPostEwsUpdate();
        return;
    }

    var selectedMessages = gFolderDisplay.selectedMessages;

    for (var i = 0; i < selectedMessages.length; ++i) {
        var msgHdr = selectedMessages[i];
        rtewsObj(identity).toggleTags(msgHdr, identity, "removeAll", []);
    }
}
/*
 * Overrides default method for initialize tag menu
 *
 */
function InitMessageTags(menuPopup) {
    var tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
    var tagArray = tagService.getAllTags({});
    var tagCount = tagArray.length;

    // Remove any existing non-static entries... (clear tags list before rebuilding it)
    // "5" is the number of menu items (including separators) on the top of the menu
    // that should not be cleared.
    for (var i = menuPopup.childNodes.length; i > 5; --i)
        menuPopup.removeChild(menuPopup.lastChild);

    // create label and accesskey for the static remove item
    var tagRemoveLabel = document.getElementById("bundle_messenger").getString("mailnews.tags.remove");
    SetMessageTagLabel(menuPopup.lastChild.previousSibling, 0, tagRemoveLabel);

    var identity = rtews.getIdentity(gFolderDisplay.displayedFolder.server.prettyName);
    if (identity != null) {
        rtews.addSyncMenu(menuPopup);
    }
    // now rebuild the list
    var msgHdr = gFolderDisplay.selectedMessage;
    var curKeys = msgHdr.getStringProperty("keywords");
    if (msgHdr.label)
        curKeys += " $label" + msgHdr.label;

    for (var i = 0; i < tagCount; ++i) {
        var taginfo = tagArray[i];
        // TODO we want to either remove or "check" the tags that already exist
        var newMenuItem = document.createElement("menuitem");
        SetMessageTagLabel(newMenuItem, i + 1, taginfo.tag);
        newMenuItem.setAttribute("value", taginfo.key);
        newMenuItem.setAttribute("type", "checkbox");
        var removeKey = (" " + curKeys + " ").indexOf(" " + taginfo.key + " ") > -1;
        newMenuItem.setAttribute('checked', removeKey);
        newMenuItem.setAttribute('oncommand', 'ToggleMessageTagMenu(event.target);');
        var color = taginfo.color;
        if (color)
            newMenuItem.setAttribute("class", "lc-" + color.substr(1));
        menuPopup.appendChild(newMenuItem);
    }
}

//Lets initialize
window.addEventListener("load", init(), false);
