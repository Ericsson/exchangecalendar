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

function mivExchangeAuthPromptProvider() {
    //dump("\nmivExchangeAuthPromptProvider.init\n");
    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

var mivExchangeAuthPromptProviderGUID = "1bf6e930-20fc-11e2-81c1-0800200c9a66";

mivExchangeAuthPromptProvider.prototype = {

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAuthPromptProvider,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange Add-on AuthPromptProvider interface",
    classID: components.ID("{" + mivExchangeAuthPromptProviderGUID + "}"),
    contractID: "@1st-setup.nl/exchange/authpromptprovider;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods

    //void getAuthPrompt(in PRUint32 aPromptReason, in nsIIDRef iid, [iid_is(iid),retval] out nsQIResult result);
    getAuthPrompt: function _nsIAuthPromptProvider_getAuthPrompt(aPromptReason, iid) {
        this.logInfo("  --- mivExchangeAuthPromptProvider.getAuthPrompt:aPromptReason:" + aPromptReason + ", iid:" + iid);
        if (iid.equals(Ci.nsIAuthPrompt2)) { // id == 651395eb-8612-4876-8ac0-a88d4dce9e1e
            this.logInfo("  --- ecnsIAuthPrompt2.getAuthPrompt: iid=nsIAuthPrompt2");
            return Cc["@1st-setup.nl/exchange/authprompt2;1"].getService();
        }

        this.logInfo("  --- mivExchangeAuthPromptProvider.getAuthPrompt:aPromptReason:" + aPromptReason + ", iid:" + iid);
        this.globalFunctions.LOG("  >>>>>>>>>>> SUBMIT THIS LINE TO https://github.com/ExchangeCalendar/exchangecalendar/issues: ecnsIAuthPrompt2.getAuthPrompt(" + iid + ")");

        return Cr.NS_ERROR_NOT_AVAILABLE;
    },

    // Internal methods.

    logInfo: function _logInfo(aMsg, aDebugLevel) {
        var prefB = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);

        this.debug = this.globalFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.authentication.debug", false, true);
        if (this.debug) {
            this.globalFunctions.LOG("mivExchangeAuthPromptProvider: " + aMsg);
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAuthPromptProvider) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAuthPromptProvider = XPCOMUtils.generateNSGetFactory([mivExchangeAuthPromptProvider]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAuthPromptProvider(cid);
}
