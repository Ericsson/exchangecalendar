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

function mivExchangeAuthPrompt2() {

    this.passwordCache = {};
    this.details = {};

    this.showPassword = false;

    this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

var mivExchangeAuthPrompt2GUID = "b3ab11c0-20f7-11e2-81c1-0800200c9a66";

mivExchangeAuthPrompt2.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeAuthPrompt2,
        Ci.nsIAuthPrompt2,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "Exchange Add-on AuthPrompt2 interface",
    classID: components.ID("{" + mivExchangeAuthPrompt2GUID + "}"),
    contractID: "@1st-setup.nl/exchange/authprompt2;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods

    getUserCanceled: function _getUserCanceled(aURL) {
        if (this.details[aURL]) {
            return this.details[aURL].canceled;
        }

        return false;
    },

    removeUserCanceled: function _removeUserCanceled(aURL) {
        if (this.details[aURL]) {
            this.details[aURL].canceled = false;
            this.logInfo("removeUserCanceled: Cleared userCancel for URL:" + aURL);
        }
    },

    removePasswordCache: function _removePasswordCache(aUsername, aURL) {
        for (var name in this.passwordCache) {
            if (name.indexOf("|" + aURL + "|")) {
                this.logInfo("removePasswordCache: Clearing passwordCache for URL:" + aURL);

                delete this.passwordCache[name];
            }
        }
    },

    getPassword: function _getPassword(aChannel, username, aURL, aRealm, alwaysGetPassword, useCached) {
        if ((!username) || (!aURL)) {
            this.logInfo("getPassword: No username or URL specified. Aborting.");
            return null;
        }

        if ((this.details[aURL]) && (this.details[aURL].showing) && (!alwaysGetPassword)) {
            this.logInfo("getPassword: We are in the progress of asking the user for a valid password. So we do not have one yet.");
            return null;
        }

        this.showPassword = this.globalFunctions.safeGetBoolPref(null, "extensions.1st-setup.authentication.showpassword", false, true);

        /*
         * This realm variable is never used in authentication, it's just used by exchangecalendar to save
         * credentials in its cache and/or in the Thundebird password manager.
         * So, this value is fixed to a specific string to avoid having non-valid string in these two systems.
         */
        // var realm = aRealm;
        var realm = "Exchange Web Service";

        if (!realm) {
            this.logInfo("getPassword: No realm specified. Trying to get it from the URL.");
            var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
            var tmpURI = ioService.newURI(aURL, null, null);
            realm = tmpURI.host;
            this.logInfo("getPassword: Set realm to:" + realm);
        }
        else {
            this.logInfo("getPassword: A realm was specified:" + realm);
        }

        /* If we get here it means that we did not yet have a password or we had a password in the channel.
        	So first we going to see if there is a password in cache. If so we use it.
        	If there is no password in cache we going to query the password manager and use it when available.

        	if we have password from cache or manager, and we have a password in the channel. We are going to match them.
        	Because when they are equal then the cached and stored password were wrong. Otherwise we did not get here.

        	When no password at all always ask. */

        var password;
        if (this.passwordCache[username + "|" + aURL + "|" + realm]) {
            this.logInfo("getPassword: There is a password in the passwordCache[" + username + "|" + aURL + "|" + realm + "]");
            password = this.passwordCache[username + "|" + aURL + "|" + realm];
        }
        else {
            this.logInfo("getPassword: There is no password in the passwordCache[" + username + "|" + aURL + "|" + realm + "]");
        }
        if (this.showPassword) {
            this.logInfo("getPassword: password(1)=" + password);
        }
        else {
            this.logInfo("getPassword: password(1)=********");
        }

        var oldSavedPassword;
        if (!password) {
            this.logInfo("getPassword: There is no password in the cache. Going to see if there is one in the passwordManager.");
            var savedPassword = this.passwordManagerGet(username, aURL, realm);
            if (savedPassword.result) {
                this.logInfo("getPassword: There is a password stored in the passwordManager.");
                password = savedPassword.password;
                oldSavedPassword = savedPassword.password;
            }
            else {
                this.logInfo("getPassword: There is no password stored in the passwordManager.");
            }
        }
        if (this.showPassword) {
            this.logInfo("getPassword: password(2)=" + password);
        }
        else {
            this.logInfo("getPassword: password(2)=********");
        }

        if ((password) && (aChannel) && (aChannel.URI.password)
            && (decodeURIComponent(aChannel.URI.password) != "")) {
            this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. Going to see if they are the same.");
            if ((password === decodeURIComponent(aChannel.URI.password)) && (!useCached)) {
                this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. And they are the same. Going to ask user to provide a new password.");
                if ((this.details[aURL]) && (this.details[aURL].ntlmCount === 1)) {
                    this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. And they are the same. But it is a first pass on an NTLM authentication. Using stored password and going to see if it can be used.");
                }
                else {
                    this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. And they are the same. Going to ask user to provide a new password.");
                    var channel = aChannel.QueryInterface(Ci.nsIHttpChannel);
                    if (channel.responseStatus === 401) {
                        password = null;
                        this.logInfo("getPassword: Login Failed, Going to ask user to provide a new password.");
                    }
                }
            }
            else {
                if (!useCached) {
                    this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. And they are NOT the same. Going to use cached/stored password.");
                }
                else {
                    this.logInfo("getPassword: There was a password in cache or passwordManager and one on the channel. And useCached specified.");
                }
                if (this.showPassword) {
                    this.logInfo("getPassword: cached/store='" + password + "', on channel='" + decodeURIComponent(aChannel.URI.password) + "', useCached='" + useCached + "'.");
                }
                else {
                    this.logInfo("getPassword: cached/store='********', on channel='********'.");
                }
            }
        }

        //try {
        if (!password) {

            if (!this.details[aURL]) {
                this.logInfo("getPassword: First request for a password. Not going to ask user for it because we want to see if we need a password. For Kerberos for example we do not need a password.");
                return null;
            }

            /*			if (!this.details[aURL]) this.details[aURL] = { 
            							showing: true, 
            							canceled: false,
            							queue: new Array(),
            							ntlmCount: 0
            						};*/

            this.logInfo("getPassword: Going to ask user to provide a new password.");

            this.details[aURL].ntlmCount = 0;
            var answer = this.getCredentials(username, aURL);

            if (answer.result) {
                password = answer.password;
                if (this.showPassword) {
                    this.logInfo("getPassword: User specified a password:" + password);
                }
                else {
                    this.logInfo("getPassword: User specified a password:********");
                }
                if (answer.save) {
                    this.logInfo("getPassword: User requested to store password in passwordmanager.");
                    this.passwordManagerSave(username, password, aURL, realm);
                }
                else {
                    this.logInfo("getPassword: User requested not to store password in passwordmanager.");
                    this.passwordManagerRemove(username, oldSavedPassword, aURL, realm);
                }
                this.passwordCache[username + "|" + aURL + "|" + realm] = password;
                this.details[aURL].showing = false;
            }
            else {
                // user canceled the entering of a password. 
                // What do we do next.. Clear queue and !!??
                this.details[aURL].canceled = true;
                this.logInfo("getPassword: User canceled entering a password.");
                this.details[aURL].showing = false;
                throw "getPassword: User canceled entering a password.";
            }
        }

        if (this.showPassword) {
            this.logInfo("getPassword: We have a password:" + password);
        }
        else {
            this.logInfo("getPassword: We have a password:********");
        }

        //} catch(err) { this.logInfo("getPassword: Error:"+err); }
        return password;
    },

    asyncPromptAuthNotifyCallback: function _asyncPromptAuthNotifyCallback(aURL) {
        if (!this.details[aURL]) {
            this.logInfo("asyncPromptAuthNotifyCallback: This is strange, We do not have this URL '"
                + aURL + "' in queue");
            return;
        }

        if (this.details[aURL].showing) {
            this.logInfo("asyncPromptAuthNotifyCallback: Already showing a prompt or trying to get the password for URL '"
                + aURL + "'. Not going to try again until the active one has finished.");
            return;
        }
        else {
            this.details[aURL].showing = true;
        }

        if (this.details[aURL].queue.length === 0) {
            this.logInfo("asyncPromptAuthNotifyCallback: This is strange, We do not have a request in queue for URL '"
                + aURL + "'.");
            return;
        }

        while (this.details[aURL].queue.length > 0) {

            // We grab the first one from the queue.
            var request = this.details[aURL].queue.shift();
            this.logInfo("asyncPromptAuthNotifyCallback: Removed request from queue["
                + aURL + "]. There are now '"
                + this.details[aURL].queue.length + "' requests in queue left.");
            var aChannel = request.channel;
            var aCallback = request.callback;
            var aContext = request.context;
            var level = request.level;
            var authInfo = request.authInfo;
            var canUseBasicAuth = false;

            if (this.details[aURL].previousFailedCount > 4) { // Maybe make this a user preference
                this.logInfo("asyncPromptAuthNotifyCallback: We have more than '"
                    + this.details[aURL].previousFailedCount + "' previous failed for '"
                    + aURL + "'.");
                aCallback.onAuthCancelled(aContext, false);
                return;
            }

            var username;
            var password;
            var error = false;

            if (this.details[aURL].canceled) {
                error = true;
                this.logInfo("asyncPromptAuthNotifyCallback: User canceled entering a password in the past so we going to cancel this request also.");
                aCallback.onAuthCancelled(aContext, true);
            }
            else {
                this.logInfo("asyncPromptAuthNotifyCallback: Trying to detect username.");
                username = decodeURIComponent(aChannel.URI.username);
                if (username) {
                    username = username.trim();
                }

                if (username === "") {
                    // We do not have a username. We need to prompt for one.
                    // This should always be filled in. So for now we error.
                    this.logInfo("asyncPromptAuthNotifyCallback: username is empty. This is not allowed.");
                    aCallback.onAuthCancelled(aContext, false);
                    error = true;
                }
                this.logInfo("asyncPromptAuthNotifyCallback: username=" + username);

                if (!error) {
                    // Read response headers, to get the realm argument required for the HTTP Basic authentication method.
                    var realm = this.getRealm('Basic', aChannel);
                    if (realm) {
                        canUseBasicAuth = true;
                    }

                    // try to get password.
                    try {
                        this.logInfo("asyncPromptAuthNotifyCallback: asking password to user.");
                        password = this.getPassword(aChannel, username, aURL, realm, true, !(authInfo.flags & Ci.nsIAuthInformation.PREVIOUS_FAILED));
                    }
                    catch (err) {
                        this.logInfo("asyncPromptAuthNotifyCallback: getPassword exception. err:" + err);
                        aCallback.onAuthCancelled(aContext, true);
                        error = true;
                    }

                    if ((!password)) {
                        error = true;
                    }
                    else {
                        aChannel.URI.userPass = encodeURIComponent(username) + ':' + encodeURIComponent(password);
                    }
                }
            }

            // Return credentials we have obtained
            if (!error) {
                if (!(authInfo.flags & Ci.nsIAuthInformation.ONLY_PASSWORD)) {
                    this.logInfo("asyncPromptAuthNotifyCallback: authInfo wants username and password and possibly domainname.");
                    if (authInfo.flags & Ci.nsIAuthInformation.NEED_DOMAIN) {
                        this.logInfo("asyncPromptAuthNotifyCallback: authInfo also wants domainname.");
                        //						authInfo.domain = "";
                        if (username.indexOf("\\") > -1) {
                            authInfo.domain = username.substr(0, username.indexOf("\\"));
                            authInfo.username = username.substr(username.indexOf("\\") + 1);
                            this.logInfo("asyncPromptAuthNotifyCallback: We have a domainname part in the username (after \\). Going to use it. domain=" + authInfo.domain);
                        }
                        else if (username.indexOf("@") > -1) {
                            authInfo.username = username;
                            authInfo.domain = "";
                            this.logInfo("asyncPromptAuthNotifyCallback: We have a domainname part in the username (after @). Not setting it to authInfo.");
                        }
                        else {
                            this.logInfo("asyncPromptAuthNotifyCallback: We do not have a domainname part in the username. Specifying empty one.");
                            authInfo.username = username;
                        }
                    }
                    else {
                        authInfo.username = username;
                    }
                }
                else {
                    this.logInfo("asyncPromptAuthNotifyCallback: authInfo only wants a password.");
                }
                authInfo.password = password;
                if (this.showPassword) {
                    this.logInfo("asyncPromptAuthNotifyCallback: authInfo{ password:" + authInfo.password + ", username:" + authInfo.username + ", domain:" + authInfo.domain + "}");
                }
                else {
                    this.logInfo("asyncPromptAuthNotifyCallback: authInfo{ password:*******, username:" + authInfo.username + ", domain:" + authInfo.domain + "}");
                }
                try {
                    this.logInfo("asyncPromptAuthNotifyCallback: Sending authInfo to callback function.");
                    if (canUseBasicAuth == true) {
                        this.logInfo("asyncPromptAuthNotifyCallback: We can also use Basic authorization going to add header.");
                        var tok = authInfo.username + ':' + authInfo.password;
                        var basicAuthHash = btoa(tok);
                        try {
                            aChannel.setRequestHeader('Authorization', "Basic " + basicAuthHash, true);
                        }
                        catch (err) {
                            this.logInfo("asyncPromptAuthNotifyCallback: Error adding Basic authorization header. err:" + err);
                        }
                    }
                    aCallback.onAuthAvailable(aContext, authInfo);
                }
                catch (err) {
                    this.logInfo("asyncPromptAuthNotifyCallback: Error on calling onAuthAvailable of provided callback. ERROR:" + err);
                    aCallback.onAuthCancelled(aContext, false);
                }
            }
        }
        this.details[aURL].showing = false;
    },

    asyncPromptAuthCancelCallback: function _asyncPromptAuthCallBack(aReason, aURL, aUUID) {
        // Try to find the canceled request and remove from queue.
        var oldQueue = this.details[aURL].queue;
        this.details[aURL].queue = new Array();
        for (var index in oldQueue) {
            if (oldQueue[index].uuid == aUUID) {
                oldQueue[index].callback.onAuthCancelled(oldQueue[index].context, false);
            }
            else {
                this.details[aURL].queue.push(oldQueue[index]);
            }
        }
    },

    //nsICancelable asyncPromptAuth(in nsIChannel aChannel, in nsIAuthPromptCallback aCallback, in nsISupports aContext, in PRUint32 level, in nsIAuthInformation authInfo);
    asyncPromptAuth: function _asyncPromptAuth(aChannel, aCallback, aContext, level, authInfo) {
        if (!aCallback) {
            this.logInfo("asyncPromptAuth: callback is undefined. This is not allowed!!!");
            return null;
        }

        var channel = aChannel.QueryInterface(Ci.nsIHttpChannel);
        this.logInfo("asyncPromptAuth: level=" + level);
        this.logInfo("asyncPromptAuth: channel.status=" + channel.status);

        this.logInfo("asyncPromptAuth: channel.responseStatus=" + channel.responseStatus);
        this.logInfo("asyncPromptAuth: channel.responseStatusText=" + channel.responseStatusText);

        this.logInfo("asyncPromptAuth: authInfo.authenticationScheme=" + authInfo.authenticationScheme);
        this.logInfo("asyncPromptAuth: authInfo.realm=" + authInfo.realm);
        this.logInfo("asyncPromptAuth: authInfo.username=" + authInfo.username);

        if (this.showPassword) {
            this.logInfo("asyncPromptAuth: authInfo.password=" + authInfo.password);
        }
        else {
            this.logInfo("asyncPromptAuth: authInfo.password=************");
        }
        this.logInfo("asyncPromptAuth: authInfo.domain=" + authInfo.domain);

        var URL = decodeURIComponent(aChannel.URI.scheme + "://" + aChannel.URI.hostPort + aChannel.URI.path);
        if (this.showPassword) {
            this.logInfo("asyncPromptAuth: aChannel.URL=" + URL + ", username=" + decodeURIComponent(aChannel.URI.username) + ", password=" + decodeURIComponent(aChannel.URI.password));
        }
        else {
            this.logInfo("asyncPromptAuth: aChannel.URL=" + URL + ", username=" + decodeURIComponent(aChannel.URI.username) + ", password=********");
        }

        var uuid = this.globalFunctions.getUUID();

        if (!this.details[URL]) this.details[URL] = {
            showing: false,
            canceled: false,
            queue: new Array(),
            ntlmCount: 0,
            previousFailedCount: 0,
        };

        if (authInfo.flags & Ci.nsIAuthInformation.ONLY_PASSWORD) this.logInfo("asyncPromptAuth: authInfo.flags & ONLY_PASSWORD");
        if (authInfo.flags & Ci.nsIAuthInformation.AUTH_HOST) this.logInfo("asyncPromptAuth: authInfo.flags & AUTH_HOST");
        if (authInfo.flags & Ci.nsIAuthInformation.AUTH_PROXY) this.logInfo("asyncPromptAuth: authInfo.flags & AUTH_PROXY");
        if (authInfo.flags & Ci.nsIAuthInformation.NEED_DOMAIN) this.logInfo("asyncPromptAuth: authInfo.flags & NEED_DOMAIN");
        if (authInfo.flags & Ci.nsIAuthInformation.PREVIOUS_FAILED) {
            this.logInfo("asyncPromptAuth: authInfo.flags & PREVIOUS_FAILED");
            this.details[URL].previousFailedCount++;
        }
        else {
            this.details[URL].previousFailedCount = 0;
        }

        try {
            var offeredAuthentications = channel.getRequestHeader("Authorization");
            this.logInfo("asyncPromptAuth: Authorization:" + offeredAuthentications);
            if (offeredAuthentications.indexOf("NTLM ") > -1) {
                this.details[URL].ntlmCount++;
            }

        }
        catch (err) {
            this.logInfo("asyncPromptAuth: NO Authorization in request header!?");
        }


        this.details[URL].queue.push({
            uuid: uuid,
            channel: aChannel,
            callback: aCallback,
            context: aContext,
            level: level,
            authInfo: authInfo
        });
        this.logInfo("asyncPromptAuth: Added request to queue[" + URL + "]. There are now '" + this.details[URL].queue.length + "' request in queue.");

        var self = this;
        var notifyCallback = {
            notify: function asyncPromptAuth_notify() {
                self.asyncPromptAuthNotifyCallback(URL);
            }
        };
        this.timer.initWithCallback(notifyCallback, 0, Ci.nsITimer.TYPE_ONE_SHOT);

        var cancelCallback = {
            cancel: function asyncPromptAuth_cancel(aReason) {
                self.asyncPromptAuthCancelCallback(aReason, URL, uuid);
            }
        };
        return cancelCallback;
    },

    //boolean promptAuth(in nsIChannel aChannel, in PRUint32 level, in nsIAuthInformation authInfo);
    promptAuth: function _promptAuth(aChannel, level, authInfo) {

        var error = false;

        var URL = decodeURIComponent(aChannel.URI.scheme + aChannel.URI.hostPort + aChannel.URI.path);
        var password;
        var username;

        if (this.details[URL].canceled) {
            this.logInfo("promptAuth: User canceled entering a password in the past so we going to cancel this request also.");
            return false;
        }
        else {
            username = decodeURIComponent(aChannel.URI.username);
            if (username) {
                username = username.trim();
            }

            if (username == "") {
                // We do not have a username. We need to prompt for one.
                // This should always be filled in. So for now we error.
                this.logInfo("promptAuth: username is empty. This is not allowed.");
                return false;
            }
            this.logInfo("promptAuth: username=" + username);

            // Read response headers, to get the realm argument required for the HTTP Basic authentication method.
            let realm = this.getRealm('Basic', aChannel);
            password = this.getPassword(aChannel, username, URL, realm);
            if ((!password) || (password == null)) {
                this.logInfo("promptAuth: No password.");
                return false;
            }
        }

        if (!(authInfo.flags & Ci.nsIAuthInformation.ONLY_PASSWORD)) {
            if (authInfo.flags & Ci.nsIAuthInformation.NEED_DOMAIN) {
                if (this.username.indexOf("\\") > -1) {
                    authInfo.domain = username.substr(0, username.indexOf("\\"));
                    authInfo.username = username.substr(username.indexOf("\\") + 1);
                }
                else {
                    authInfo.domain = "";
                    authInfo.username = username;
                }
            }
            else {
                authInfo.username = username;
            }
        }
        authInfo.password = password;
        return true;
    },

    /**
     * Helper to retrieve an entry from the password manager.
     *
     * @param in  aUsername     The username to search
     * @param aHostName         The corresponding hostname
     * @param aRealm            The password realm (unused on branch)
     * @return                  An object of form { result: boolean, [optional] password: <found password> }
     *				result == false when password not found.
     */
    passwordManagerGet: function _passwordManagerGet(aUsername, aURL, aRealm) {
        if ((!aUsername) || aUsername.trim() == "") {
            this.logInfo("passwordManagerGet: username is undefined or empty.")
            return {
                result: false
            };
        }

        this.logInfo("passwordManagerGet: username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);

        try {
            var loginManager = Cc["@mozilla.org/login-manager;1"]
                .getService(Ci.nsILoginManager);

            var logins = loginManager.findLogins({}, aURL, null, aRealm);
            for (let loginInfo of logins) {
                if (loginInfo.username == aUsername) {
                    this.logInfo("passwordManagerGet found password for: username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                    return {
                        result: true,
                        password: loginInfo.password
                    };
                }
            }
        }
        catch (exc) {
            this.logInfo(exc);
        }
        return {
            result: false
        };
    },

    passwordManagerRemove: function _passwordManagerRemove(aUsername, aPassword, aURL, aRealm) {

        if ((!aUsername) || (!aURL) || (!aRealm)) {
            this.logInfo("passwordManagerRemove: username or hostname or realm is empty. Not allowed!!!");
            return;
        }

        try {
            var loginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
            var logins = loginManager.findLogins({}, aURL, null, aRealm);

            var newLoginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
            newLoginInfo.init(aURL, null, aRealm, aUsername, aPassword, "", "");

            if (logins.length > 0) {
                var modified = false;
                for (let loginInfo of logins) {
                    if (loginInfo.username === aUsername) {
                        this.logInfo("Login credentials updated:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                        loginManager.removeLogin(loginInfo);
                        modified = true;
                        break;
                    }
                }
                if (!modified) {
                    this.logInfo("Login credentials saved:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                }
            }
            else {
                this.logInfo("Login credentials saved:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
            }
        }
        catch (exc) {
            this.logInfo(exc);
        }
    },

    /**
     * Helper to insert/update an entry to the password manager.
     *
     * @param aUserName     The username
     * @param aPassword     The corresponding password
     * @param aURL     The corresponding hostname
     * @param aRealm        The password realm (unused on branch)
     */

    passwordManagerSave: function _passwordManagerSave(aUsername, aPassword, aURL, aRealm) {

        if ((!aUsername) || (!aURL) || (!aRealm)) {
            this.logInfo("passwordManagerSave: username or hostname or realm is empty. Not allowed!!!");
            return;
        }

        try {
            var loginManager = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
            var logins = loginManager.findLogins({}, aURL, null, aRealm);

            var newLoginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
            newLoginInfo.init(aURL, null, aRealm, aUsername, aPassword, "", "");

            if (logins.length > 0) {
                var modified = false;
                for (let loginInfo of logins) {
                    if (loginInfo.username == aUsername) {
                        this.logInfo("Login credentials updated:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                        loginManager.modifyLogin(loginInfo, newLoginInfo);
                        modified = true;
                        break;
                    }
                }
                if (!modified) {
                    this.logInfo("Login credentials saved:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                    loginManager.addLogin(newLoginInfo);
                }
            }
            else {
                this.logInfo("Login credentials saved:username=" + aUsername + ", aURL=" + aURL + ", aRealm=" + aRealm);
                loginManager.addLogin(newLoginInfo);
            }
        }
        catch (exc) {
            this.logInfo(exc);
        }
    },

    /**
     * Helper to retrieve a password from the usr via a prompt.
     *
     * @param in  aUsername     The username to search
     * @param in aURL           The corresponding hostname
     * @return                  An object of form { result: boolean, [optional] password: <found password>, save: boolean }
     *				result == false when password not found.
     */
    getCredentials: function _getCredentials(aUsername, aURL) {

        if ((!aUsername) || (!aURL)) {
            this.logInfo("getCredentials: Username or URL is empty. Not allowed!");
            return {
                result: false
            };
        }

        var watcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);

        var prompter = watcher.getNewPrompter(null);

        // Only show the save password box if we are supposed to.
        var savepasswordMsg = this.globalFunctions.getString("passwordmgr", "rememberPassword", null, "passwordmgr");

        var aTitle = "Microsoft Exchange EWS: Password request.";

        var aText = this.globalFunctions.getString("commonDialogs", "EnterPasswordFor", [aUsername, aURL], "global");

        var aPassword = {
            value: ""
        };
        var aSavePassword = {
            value: false
        };

        var result = prompter.promptPassword(aTitle,
            aText,
            aPassword,
            savepasswordMsg,
            aSavePassword);
        return {
            result: result,
            password: aPassword.value,
            save: aSavePassword.value
        };
    },

    /* Helper function to retrieve realm from WWW-Authenticate HTTP headers
     * realm is a string defining the location where the credentials are valid
     * It's defined by [RFC2617](https://tools.ietf.org/html/rfc2617)
     * */
    getRealm: function _getRealm(aChallengeType, aChannel) {
        let acceptedAuthentications = null;
        let realm = null;

        try {
            acceptedAuthentications = aChannel.getResponseHeader("WWW-Authenticate");
        }
        catch (err) {
            this.logInfo("getRealm: Error while looking for WWW-Authenticate HTTP response header: " + err);
        }

        if (acceptedAuthentications) {
            // Mozilla's nsHttpHeaderArray.h uses char '\n' to join multiple WWW-Authenticate HTTP response header
            acceptedAuthentications = acceptedAuthentications.split('\n');
            for (let authenticateHeader of acceptedAuthentications) {
                this.logInfo("getRealm: reading header: WWW-Authenticate:" + authenticateHeader);

                // Look only realm in header with the required challenge
                if (authenticateHeader.search(aChallengeType + ' ') == 0) {
                    // Look for first realm= position using regular expression, as realm instruction is case insensitive
                    let realmPosition = authenticateHeader.search('realm=', 'i');
                    if (realmPosition > -1) {
                        let firstQuotePosition = authenticateHeader.indexOf('"', realmPosition);
                        let secondQuotePosition = authenticateHeader.indexOf('"', firstQuotePosition);
                        realm = authenticateHeader.substring(firstQuotePosition + 1, secondQuotePosition);
                        this.logInfo("getRealm: Found a realm going to use it. realm=" + realm);
                    }
                }
            }
        }

        return realm;
    },

    logInfo: function _logInfo(aMsg, aDebugLevel) {
        var prefB = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);

        this.debug = this.globalFunctions.safeGetBoolPref(prefB, "extensions.1st-setup.authentication.debug", false, true);
        if (this.debug) {
            this.globalFunctions.LOG("mivExchangeAuthPrompt2: " + aMsg + " (" + this.globalFunctions.STACKshort() + ")");
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeAuthPrompt2) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeAuthPrompt2 = XPCOMUtils.generateNSGetFactory([mivExchangeAuthPrompt2]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeAuthPrompt2(cid);
}
