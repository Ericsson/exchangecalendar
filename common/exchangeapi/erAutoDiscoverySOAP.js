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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");

var EXPORTED_SYMBOLS = ["erAutoDiscoverySOAPRequest"];

function erAutoDiscoverySOAPRequest(aArgument, aCbOk, aCbError, aListener) {
    this.mCbOk = aCbOk;
    this.mCbError = aCbError;
    this.mArgument = aArgument;

    var self = this;

    this.parent = new ExchangeRequest(aArgument,
        function (aExchangeRequest, aResp) {
            self.onSendOk(aExchangeRequest, aResp);
        },
        function (aExchangeRequest, aCode, aMsg) {
            self.onSendError(aExchangeRequest, aCode, aMsg);
        },
        aListener);

    this.mailbox = aArgument.mailbox;

    this.isRunning = true;
    this.execute();
}

erAutoDiscoverySOAPRequest.prototype = {

    execute: function _execute() {
        // This autodiscover is of the type SOAP (http://msdn.microsoft.com/en-us/library/exchange/dd877096%28v=exchg.140%29.aspx)
        // This is compatible with exchange 2010.

        //		exchWebService.commonFunctions.LOG("sendAutodiscover\n");
        var email = this.mailbox;
        var parts = email.split("@");
        var domain = parts[1];
        exchWebService.commonFunctions.LOG("autodiscoverSOAP email:" + email + ", domain:" + domain + "\n");

        var myAuthPrompt2 = Cc["@1st-setup.nl/exchange/authprompt2;1"].getService(Ci.mivExchangeAuthPrompt2);
        myAuthPrompt2.removeUserCanceled("https://" + domain + "/autodiscover/autodiscover.svc");
        myAuthPrompt2.removeUserCanceled("https://autodiscover." + domain + "/autodiscover/autodiscover.svc");
        myAuthPrompt2.removeUserCanceled("http://autodiscover." + domain + "/autodiscover/autodiscover.svc");
        myAuthPrompt2.removePasswordCache(null, "https://" + domain + "/autodiscover/autodiscover.svc");
        myAuthPrompt2.removePasswordCache(null, "https://autodiscover." + domain + "/autodiscover/autodiscover.svc");
        myAuthPrompt2.removePasswordCache(null, "http://autodiscover." + domain + "/autodiscover/autodiscover.svc");

        this.parent.urllist = [
            "https://" + domain + "/autodiscover/autodiscover.svc",
            "https://autodiscover." + domain + "/autodiscover/autodiscover.svc",
            "http://autodiscover." + domain + "/autodiscover/autodiscover.svc"
        ];

        var msg = exchWebService.commonFunctions.xmlToJxon('<nsSoap:Envelope xmlns:a="' + nsAutodiscover2010Str + '" xmlns:wsa="' + nsWSAStr + '" xmlns:xsi="' + nsXSIStr + '" xmlns:nsSoap="' + nsSoapStr + '"/>');
        var header = msg.addChildTag("Header", "nsSoap", null);
        header.addChildTag("RequestedServerVersion", "a", "Exchange2010");
        header.addChildTag("Action", "wsa", "http://schemas.microsoft.com/exchange/2010/Autodiscover/Autodiscover/GetUserSettings");
        header.addChildTag("To", "wsa", "https://" + domain + "/autodiscover/autodiscover.svc");
        header = null;

        var body = msg.addChildTag("Body", "nsSoap", null);
        var getUserSettingsRequest = body.addChildTag("GetUserSettingsRequestMessage", "a", null);
        body = null;

        var request = getUserSettingsRequest.addChildTag("Request", "a", null);
        request.addChildTag("Users", "a", null).addChildTag("User", "a", null).addChildTag("Mailbox", "a", email);

        var requestedSettings = request.addChildTag("RequestedSettings", "a", null);
        requestedSettings.addChildTag("Setting", "a", "UserDisplayName");
        requestedSettings.addChildTag("Setting", "a", "UserDN");
        requestedSettings.addChildTag("Setting", "a", "InternalEwsUrl");
        requestedSettings.addChildTag("Setting", "a", "ExternalEwsUrl");
        requestedSettings.addChildTag("Setting", "a", "AlternateMailboxes");
        requestedSettings.addChildTag("Setting", "a", "EwsSupportedSchemas");
        requestedSettings.addChildTag("Setting", "a", "AutoDiscoverSMTPAddress");
        requestedSettings = null;

        exchWebService.commonFunctions.LOG("sendAutodiscoverySOAP.execute:" + msg.toString() + "\n");
        this.parent.xml2jxon = true;
        this.parent.sendRequest(xml_tag + msg.toString());
        msg = null;
        request = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("sendAutodiscoverySOAP.onSendOk:" + String(aResp));
        var DisplayName = "";
        var SMTPaddress = "";
        var redirectAddr = null;
        var ewsUrls = new Array();
        var aError = true;
        var aCode = -1;
        var aMsg = String(aResp);

        // Check if we received and RedirectAddress errorcode.
        var rm = aResp.XPath("/s:Envelope/s:Body/_default_:GetUserSettingsResponseMessage/_default_:Response[_default_:ErrorCode='NoError']/_default_:UserResponses/_default_:UserResponse[_default_:ErrorCode='RedirectAddress']");
        if (rm.length > 0) {
            redirectAddr = rm[0].getTagValue("_default_:RedirectTarget", null);
            if ((this.mCbOk) && (redirectAddr)) {
                //this.isRunning = false;
                this.mCbOk(ewsUrls, DisplayName, SMTPaddress, redirectAddr);
            }
            if (aError) {
                this.onSendError(aExchangeRequest, aCode, aMsg);
            }
            this.isRunning = false;
            rm = null;
            return;
        }
        rm = null;

        var rm = aResp.XPath("/s:Envelope/s:Body/_default_:GetUserSettingsResponseMessage/_default_:Response[_default_:ErrorCode='NoError']/_default_:UserResponses/_default_:UserResponse[_default_:ErrorCode='NoError']/_default_:UserSettings/_default_:UserSetting");

        if (rm.length > 0) {
            for each(var userSetting in rm) {
                var name = userSetting.getTagValue("_default_:Name", "");
                switch (name) {
                case "UserDisplayName":
                    DisplayName = userSetting.getTagValue("_default_:Value", "");
                    exchWebService.commonFunctions.LOG("autodiscoverySOAPOk UserDisplayName:" + DisplayName);
                    break;
                case "AutoDiscoverSMTPAddress":
                    SMTPaddress = userSetting.getTagValue("_default_:Value", "");
                    exchWebService.commonFunctions.LOG("autodiscoverySOAPOk SMTPaddress:" + SMTPaddress);
                    break;
                case "InternalEwsUrl":
                case "ExternalEwsUrl":
                    exchWebService.commonFunctions.LOG("autodiscoverySOAPOk EwsUrl:" + userSetting.getTagValue("_default_:Value", ""));
                    ewsUrls.push(userSetting.getTag("_default_:Value"));
                    break;
                }
            }
            aError = false;
        }
        else {
            exchWebService.commonFunctions.LOG("autodiscoverySOAPOk but no settings returned.");
            aCode = this.parent.ER_ERROR_AUTODISCOVER_GET_EWSULR;
        }
        rm = null;

        // Try to get the SMTP address if it is available
        if ((!aError) && (SMTPaddress == "")) {
            exchWebService.commonFunctions.LOG("autodiscoverySOAPOk but AutoDiscoverSMTPAddress is not available.");
            aCode = this.parent.ER_ERROR_AUTODISCOVER_GET_EWSULR;
            aError = true;
        }

        if ((!aError) && (ewsUrls.length == 0)) {
            aMsg = "autodiscoverySOAPOk error getting ewsUrls from:" + this.parent.currentUrl;
            aCode = this.parent.ER_ERROR_AUTODISCOVER_GET_EWSULR;
            aError = true;
        }

        if (aError) {
            this.onSendError(aExchangeRequest, aCode, aMsg);
        }
        else {
            if (this.mCbOk) {
                this.mCbOk(ewsUrls, DisplayName, SMTPaddress, redirectAddr);
            }
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        exchWebService.commonFunctions.LOG("sendAutodiscoverySOAP.onSendError: aCode:" + aCode + ", aMsg:" + aMsg);
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
