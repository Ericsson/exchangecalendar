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

function mivExchangeItemsManager() {

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this._exchangeAccountId = null;
    this._exchangeAccount = null;

    this._folderBase = null;
    this._folderId = null;
    this._folderChangeKey = null;
    this._name = "noname";
    this._displayName = null;
    this._status = this.STATUS_UNINITIALIZED;

    this._pollInterval = 0; // 0 (zero) is off. Value is in seconds.

    this.prefsBase = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefBranch)
        .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl.");

    this._accountManager = Cc["@1st-setup.nl/exchange/accountmanager;1"]
        .getService(Ci.mivExchangeAccountManager)

    this._loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
        .getService(Ci.mivExchangeLoadBalancer)

    this.uuid = this.globalFunctions.getUUID();

    this.logInfo("mivExchangeItemsManager: init");

}

var mivExchangeItemsManagerGUID = "b722909d-f83d-4f01-9b98-369201f8ae38";

mivExchangeItemsManager.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeItemsManager,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange Items Manager.",
    classID: components.ID("{" + mivExchangeItemsManagerGUID + "}"),
    contractID: "@1st-setup.nl/exchange/itemmanager;1",
    flags: Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // methods from nsIClassInfo

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeItemsManager,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },

    // External methods 
    get exchangeAccountId() {
        return this._exchangeAccountId;
    },

    set exchangeAccountId(aValue) {
        var tmpAccount = this._accountManager.getAccountById(aValue);
        if (tmpAccount.result) {
            // We found an account;
            this._exchangeAccountId = aValue;
            this._exchangeAccount = tmpAccount.account;

            // We need to reload everything.
        }
    },

    get folderBase() {
        return this._folderBase;
    },

    set folderBase(aValue) {
        if (aValue != this._folderBase) {
            this._folderBase = aValue;

            // We need to reload everything.
        }
    },

    get folderId() {
        return this._folderId;
    },

    set folderId(aValue) {
        if (aValue != this._folderId) {
            this._folderId = aValue;

            // We need to reload everything.
        }
    },

    get pollInterval() {
        return this._pollInterval;
    },

    set pollInterval(aValue) {
        if (aValue != this._pollInterval) {
            this._pollInterval = aValue;

            // We need to reload everything.
        }
    },

    get name() {
        var tmpStr = this._name;
        if (this._displayName) {
            tmpStr = tmpStr + " (" + this._displayName + ")";
        }
        return tmpStr;
    },

    set name(aValue) {
        if (aValue != this._name) {
            this._name = aValue;
        }
    },

    get status() {
        return this._status;
    },

    // Internal Methods
    reset: function reset {
        if ((!this._exchangeAccount) || ((!this._folderBase) && (!this._folderId))) {
            return;
        }

        // Kill all running jobs.
        this._loadBalancer.clearQueueForCalendar(this._exchangeAccount.server.value, this);
        this._loadBalancer.stopRunningJobsForCalendar(this._exchangeAccount.server.value, this);

        // Get Folder details.
        this._status = this.STATUS_GET_FOLDER;

        this.loadBalancer.addToQueue({
            calendar: this,
            ecRequest: erGetFolderRequest,
            arguments: {
                user: this.user,
                mailbox: this.mailbox,
                folderBase: this.folderBase,
                serverUrl: this.serverUrl,
                occurrences: aOccurrences,
                folderID: this.folderID,
                changeKey: this.changeKey,
                folderClass: this.folderClass,
                GUID: calExchangeCalendarGUID
            },
            cbOk: function (aFolderRequest, aFolderId, aChangeKey, aFolderClass) {
                this.getFolderRequestOk(aFolderRequest, aFolderId, aChangeKey, aFolderClass);
            },
            cbError: function (aRequest, aCode, aMsg) {
                this.ecRequestError(aRequest, aCode, aMsg);
            },
            listener: null
        });

    },

    getFolderRequestOk: function getFolderRequestOk(aFolderRequest, aFolderId, aChangeKey, aFolderClass) {
        this._folderId = afolderId;
    },

    ecRequestError: function (aRequest, aCode, aMsg) {},

    logInfo: function _logInfo(aMsg, aDebugLevel) {
        this.globalFunctions.LOG("mivExchangeItemsManager: " + aMsg);
        return;

        if (!aDebugLevel) aDebugLevel = 1;

        var prefB = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);

        this.debugLevel = this.globalFunctions.safeGetIntPref(prefB, "extensions.1st-setup.core.debuglevel", 0, true);
        if (aDebugLevel <= this.debugLevel) {
            this.globalFunctions.LOG("mivExchangeItemsManager: " + aMsg);
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeItemsManager) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeItemsManager = XPCOMUtils.generateNSGetFactory([mivExchangeItemsManager]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeItemsManager(cid);
}
