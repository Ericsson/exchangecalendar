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

function mivExchangeAccountManager() {

    this.prefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getBranch("extensions.exchangeWebServices.accounts."),

        this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

}

var mivExchangeAccountManagerGUID = "41397c22-bcea-4e98-a562-2f5f435c6111";

mivExchangeAccountManager.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAccountManager,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange Account Manager.",
    classID: components.ID("{" + mivExchangeAccountManagerGUID + "}"),
    contractID: "@1st-setup.nl/exchange/accountmanager;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods 
    getAccountIds: function _getAccountIds() {
        var ids = this.globalFunctions.safeGetCharPref(this.prefs, "ids", "");
        this.logInfo("ids:" + ids);
        return ids.split(",");
    },

    getAccounts: function _getAccounts() {
        var result = {};
        var ids = this.getAccountIds()
        for each(var id in ids) {

            if (id != "") {
                this.logInfo("id:" + id);
                var tmpResult = this.getAccountById(id);
                if (tmpResult.result) {
                    result[id] = tmpResult.account;
                }
            }
        }

        return result;
    },

    getAccountById: function _getAccountById(aId) {
        var result = false;
        var account = {};

        this.logInfo("id:" + aId);
        var children = this.prefs.getChildList(aId + ".", {});
        if (children.length > 0) {
            result = true;
            account["id"] = aId;
            for (var index in children) {
                var attribute = children[index].substr(children[index].indexOf(".") + 1);
                switch (this.prefs.getPrefType(children[index])) {
                case this.prefs.PREF_STRING:
                    account[attribute] = {
                        type: "string",
                        value: this.prefs.getCharPref(children[index])
                    };
                    break;
                case this.prefs.PREF_INT:
                    account[attribute] = {
                        type: "int",
                        value: this.prefs.getIntPref(children[index])
                    };
                    break;
                case this.prefs.PREF_BOOL:
                    account[attribute] = {
                        type: "bool",
                        value: this.prefs.getBoolPref(children[index])
                    };
                    break;
                }
            }
        }

        return {
            result: result,
            account: account
        };
    },

    getAccountByServer: function _getAccountByServer(aServer) {
        var accounts = this.getAccounts();
        for each(var account in accounts) {
            if ((account.server) && (account.server.value) && (account.server.value.toLowerCase() == aServer.toLowerCase())) {
                return account;
            }
        }
        return null;
    },

    saveAccount: function _saveAccount(aAccount) {
        for (var index in aAccount) {
            if (index != "id") {
                switch (aAccount[index].type) {
                case "string":
                    this.prefs.setCharPref(aAccount.id + "." + index, aAccount[index].value);
                    break;
                case "int":
                    this.prefs.setIntPref(aAccount.id + "." + index, aAccount[index].value);
                    break;
                case "bool":
                    this.prefs.setBoolPref(aAccount.id + "." + index, aAccount[index].value);
                    break;
                default:
                    this.logInfo("Unknown preference index:" + index + ", value:" + aAccount[index].value + ", type:" + aAccount[index].type);
                }
            }
        }

        // Check if the ids all ready exists. If not add it.
        var ids = this.getAccountIds();
        var idExists = false;
        for (var index in ids) {
            if (ids[index] == aAccount.id) {
                idExists = true;
                break;
            }
        }
        if (!idExists) {
            ids.push(aAccount.id);
            ids = ids.join(",");
            this.prefs.setCharPref("ids", ids);
        }
    },

    removeAccount: function _removeAccount(aAccount) {
        if (aAccount.id) {
            this.removeAccountById(aAccount.id);
        }
    },

    removeAccountById: function _removeAccountById(aAccountId) {
        this.prefs.deleteBranch(aAccountId);
        // Remove from ids list.
        var oldIds = this.getAccountIds();
        var newIds = [];
        for (var index in oldIds) {
            if (oldIds[index] != aAccountId) {
                newIds.push(oldIds[index]);
            }
        }

        if (newIds.length > 0) {
            newIds = newIds.join(",");
        }
        else {
            newIds = "";
        }
        this.prefs.setCharPref("ids", newIds);
    },

    // Internal methods 
    logInfo: function _logInfo(aMsg, aDebugLevel) {
        return;
        /* if (!aDebugLevel) aDebugLevel = 1;

        var prefB = Cc["@mozilla.org/preferences-service;1"]
        	.getService(Ci.nsIPrefBranch);

        this.debugLevel = this.globalFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.accounts.debuglevel", 0, true);
        if (aDebugLevel <= this.debugLevel) {
        	this.globalFunctions.LOG("mivExchangeAccountManager: "+aMsg);
        } */
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAccountManager) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAccountManager = XPCOMUtils.generateNSGetFactory([mivExchangeAccountManager]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAccountManager(cid);
}
