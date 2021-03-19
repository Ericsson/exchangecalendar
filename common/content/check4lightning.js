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
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource:///modules/mailServices.js");

function exchCheck4Lightning(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchCheck4Lightning.prototype = {

    lightningIsInstalled: -1,
    // -1 = Check for Lightning has not yet run.
    // 0 = Lightning is not installed.
    // 1 = Lightning is installed but not active.
    // 2 = Lightning is installed and active.
    checkingIfLightnigIsInstalled: false,

    updateCheckDone: false,

    lightningAlertTimer: Cc["@mozilla.org/timer;1"]
        .createInstance(Ci.nsITimer),
    lightningAlertTimer2: Cc["@mozilla.org/timer;1"]
        .createInstance(Ci.nsITimer),

    lightningAlertCallback: function _lightningAlertCallback() {
        this.globalFunctions.LOG("lightningAlertCallback.");

        var prefB = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefBranch);
        var promptStr = "";
        var promptTitle = "";

        switch (this.lightningIsInstalled) {
        case 0:
            promptTitle = "Lightning is not installed.";
            promptStr = "Please install the Lightning Add-on if you wish\nto use the Exchange 2007/2010 Calendar and Tasks add-on.";
            break;
        case 1:
            promptTitle = "Lightning is not active.";
            promptStr = "Please activate the Lightning Add-on if you wish\nto use the Exchange 2007/2010 Calendar and Tasks add-on.";
            break;
        }

        if (!this.globalFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.lightningCheck.showWarning", true)) {
            this.globalFunctions.LOG("lightningAlertCallback: Not showing warning dialog:" + promptStr);
            return;
        }

        var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

        var answer = {
            value: false
        };
        prompts.alertCheck(null, promptTitle, promptStr, "Do not show this prompt anymore.", answer);
        this.globalFunctions.LOG("lightningAlertCallback. Answer:" + answer.value);

        prefB.setBoolPref("extensions.1st-setup.lightningCheck.showWarning", !answer.value);

        switch (this.lightningIsInstalled) {
        case 0:
            openContentTab("https://addons.mozilla.org/en-US/thunderbird/addon/lightning/", "tab", "addons.mozilla.org");
            break;
        case 1:
            openContentTab("about:addons", "tab", "addons.mozilla.org");
            break;
        }

        this.checkingIfLightnigIsInstalled = false;
    },

    checkLightningIsInstalledCallback: function _checkLightningIsInstalledCallback(aAddOn) {
        if (!aAddOn) {
            this.lightningIsInstalled = 0;
        }
        else {
            this.lightningIsInstalled = 1;
            this.globalFunctions.LOG("Lightning is installed.");
        }

        var self = this;
        if (this.lightningIsInstalled == 0) {
            // Lightning is not installed. Try to install it.
            this.globalFunctions.WARN("Lightning is not installed.");
            this.lightningAlertTimer.initWithCallback(function () {
                self.lightningAlertCallback();
            }, 1500, this.lightningAlertTimer.TYPE_ONE_SHOT);

        }
        else {
            // Ligntning is installed check if it is enabled.
            try {
                this.globalFunctions.LOG("Lightning was installed from:" + aAddOn.sourceURI.prePath + aAddOn.sourceURI.path);
            }
            catch (er) {
                this.globalFunctions.LOG("Lightning was installed from unknown source. Probably manualy outside the AddOnManager.");
            }
            if (aAddOn.isActive) {
                this.lightningIsInstalled = 2;
            }
            else {
                // Not Active.  
                this.globalFunctions.WARN("Lightning is not active.1");
                this.lightningAlertTimer.initWithCallback(function () {
                    self.lightningAlertCallback();
                }, 1500, this.lightningAlertTimer.TYPE_ONE_SHOT);
            }
        }
    },

    checkLightningIsInstalled: function _checkLightningIsInstalled() {
        if (this.lightningIsInstalled > 1) {
            // Lightning is allready installed.
            return;
        }

        if (this.checkingIfLightnigIsInstalled) {
            return;
        }

        this.checkingIfLightnigIsInstalled = true;

        if (this.lightningIsInstalled == -1) {
            Cu.import("resource://gre/modules/AddonManager.jsm");
        }
        var self = this;
        AddonManager.getAddonByID("{e2fda1a4-762b-4020-b5ad-a41df1933103}", function (aAddon) {
            self.checkLightningIsInstalledCallback(aAddon);
        });
    },

    onLoad: function _onLoad(event) {

        // We preload the exchange Address book
        var rootDir = MailServices.ab.getDirectory("exchWebService-contactRoot-directory://");
        var folders = rootDir.childNodes;

        this.checkLightningIsInstalled();

        if ((this.globalFunctions.safeGetBoolPref(null, "extensions.1st-setup.others.checkForNewAddOnVersion", true, true)) && (!this.updateCheckDone)) {
            var updatecheck = Cc["@1st-setup.nl/checkers/updater;1"]
                .getService(Ci.mivUpdater);
            var self = this;
            updatecheck.checkForUpdate("exchangecalendar@extensions.1st-setup.nl", function (aResult) {
                self.updaterCallBack(aResult);
            });
            this.updateCheckDone = true;
        }
    },

    updaterCallBack: function _updaterCallBack(aResult) {

        if (aResult.versionChanged <= 0) {
            if (aResult.error) {
                this.globalFunctions.LOG("updaterCallBack: Unable to fetch from url");
            }
            this.globalFunctions.LOG("updaterCallBack: No new version available.");
        }
        else {
            this.globalFunctions.LOG("updaterCallBack: New version available.");
            this.globalFunctions.LOG("updaterCallBack: ++ Version:" + aResult.updateDetails.newVersion);
            this.globalFunctions.LOG("updaterCallBack: ++ URL:" + aResult.updateDetails.updateURL);
            var self = this;
            if (this.globalFunctions.safeGetBoolPref(null, "extensions.1st-setup.others.warnAboutNewAddOnVersion", true, true)) {
                //						this.lightningAlertTimer2.initWithCallback(function(aResult){ self.lightningAlertCallback2(aResult);}, 15000, this.lightningAlertTimer2.TYPE_ONE_SHOT);
                this.lightningAlertTimer2.initWithCallback(function () {
                    self.lightningAlertCallback2(aResult);
                }, 15000, this.lightningAlertTimer2.TYPE_ONE_SHOT);
            }
        }
    },

    lightningAlertCallback2: function _lightningAlertCallback2(aResult) {
        this.globalFunctions.LOG("lightningAlertCallback2.");

        var prefB = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefBranch);
        var promptStr = "There is an update available for the Exchange Calendar and Tasks provider on the main website.";
        promptStr += "\n\nDo you want to install this newer version: " + aResult.updateDetails.newVersion;
        promptStr += "\nCurrent version is: " + aResult.addon.version;
        if (aResult.updateDetails.msg != "") {
            promptStr += "\n\nChanges:\n" + aResult.updateDetails.msg;
        }
        promptStr += '\n\nOr read the info on ' + aResult.updateDetails.infoURL;
        var promptTitle = "Update available";

        var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].
        getService(Ci.nsIPromptService);

        var answer = {
            value: false
        };

        var flags = prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES
            + prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO
            + prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING;

        var button = prompts.confirmEx(null, promptTitle, promptStr, flags, "", "", "Info", "Do not show this prompt anymore.", answer);

        this.globalFunctions.LOG("lightningAlertCallback2. button:" + button);
        prefB.setBoolPref("extensions.1st-setup.others.warnAboutNewAddOnVersion", !answer.value);

        if (button == 0) {
            aResult.updater.installNewVersion(aResult, true);
        }
        if (button == 2) {
            openContentTab(aResult.updateDetails.infoURL, "tab", "www.1st-setup.nl");
        }

    },

}

var tmpCheck4Lightning = new exchCheck4Lightning(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpCheck4Lightning.onLoad();
}, true);
