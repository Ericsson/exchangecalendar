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

function mivExchangeBadCertListener2() {

    this.targetSites = {};
    this.userCanceled = {};

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.abcard.';

var mivExchangeBadCertListener2GUID = "33242776-0e06-4c30-afc1-bd68f3bb2417";

mivExchangeBadCertListener2.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeBadCertListener2,
        Ci.nsIBadCertListener2,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange BadCertListener2.",
    classID: components.ID("{" + mivExchangeBadCertListener2GUID + "}"),
    contractID: "@1st-setup.nl/exchange/badcertlistener2;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods
    // nsIBadCertListener2
    notifyCertProblem: function _notifyCertProblem(socketInfo, status, targetSite) {
        this.logInfo("notifyCertProblem: targetSite:" + targetSite);

        this.targetSites[targetSite] = true;

        return true;
    },

    checkCertProblem: function _checkCertProblem(targetSite) {
        if (!targetSite) return false;

        var waitingProblem = false;
        for (var index in this.targetSites) {
            if (this.targetSites[index]) {
                var index2 = index;
                if (index2.indexOf(":") > -1) {
                    index2 = index2.substr(0, index2.indexOf(":"));
                }
                if ((targetSite.indexOf(index) > -1) || (targetSite.indexOf(index2) > -1)) {
                    waitingProblem = true;
                }
            }
        }

        return waitingProblem;
    },

    checkAndSolveCertProblem: function _checkAndSolveCertProblem(targetSite) {
        var waitingProblem = this.checkCertProblem(targetSite);

        this.logInfo("checkAndSolveCertProblem: waitingProblem:" + waitingProblem + ", targetSite:" + targetSite);
        if (waitingProblem) {
            var params = {
                exceptionAdded: false,
                prefetchCert: true,
                location: targetSite
            };

            var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                .getService(Ci.nsIWindowMediator);
            var calWindow = wm.getMostRecentWindow("mail:3pane");

            calWindow.openDialog("chrome://pippki/content/exceptionDialog.xul",
                "",
                "chrome,centerscreen,modal",
                params);

            if (params.exceptionAdded) {
                this.targetSites[targetSite] = false;
                delete this.targetSites[targetSite];
                this.userCanceled[targetSite] = false;
                delete this.userCanceled[targetSite];
                return {
                    hadProblem: true,
                    solved: true
                };
            }
            else {
                this.userCanceled[targetSite] = true;
                return {
                    hadProblem: true,
                    solved: false
                };
            }
        }
        else {
            return {
                hadProblem: false
            };
        }
    },

    userCanceledCertProblem: function _userCanceledCertProblem(targetSite) {
        if (this.userCanceled[targetSite]) {
            return true;
        }
        return false;
    },

    // Internal methods.
    logInfo: function _logInfo(aMsg, aDebugLevel) {
        var prefB = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);

        this.debug = this.globalFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.authentication.debug", false, true);
        if (this.debug) {
            this.globalFunctions.LOG("mivExchangeAuthPrompt2: " + aMsg);
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeBadCertListener2) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeBadCertListener2 = XPCOMUtils.generateNSGetFactory([mivExchangeBadCertListener2]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeBadCertListener2(cid);
}
