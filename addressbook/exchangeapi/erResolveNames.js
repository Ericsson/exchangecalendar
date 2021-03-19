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
 * -- Exchange 2007/2010 Contacts.
 * -- For Thunderbird.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=xx
 * email: exchangecontacts@extensions.1st-setup.nl
 *
 *
 * ***** BEGIN LICENSE BLOCK *****/
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");
Cu.import("resource://exchangecommon/ecFunctions.js");

var EXPORTED_SYMBOLS = ["erResolveNames"];

function erResolveNames(aArgument, aCbOk, aCbError, aListener) {
    this.mCbOk = aCbOk;
    this.mCbError = aCbError;

    var self = this;

    this.parent = new ExchangeRequest(aArgument,
        function (aExchangeRequest, aResp) {
            self.onSendOk(aExchangeRequest, aResp);
        },
        function (aExchangeRequest, aCode, aMsg) {
            self.onSendError(aExchangeRequest, aCode, aMsg);
        },
        aListener);

    this.argument = aArgument;
    this.mailbox = aArgument.mailbox;
    this.serverUrl = aArgument.serverUrl;
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;

    this.ids = aArgument.ids;
    this.searchScope = aArgument.searchScope;
    this.GALQuery = aArgument.GALQuery;

    this.isRunning = true;
    this.execute();
}

erResolveNames.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erResolveNames.execute\n");

        // http://msdn.microsoft.com/en-us/library/exchange/aa565329%28v=exchg.140%29.aspx
        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ResolveNames xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("ReturnFullContactData", "true");
        if (this.searchScope) {
            req.setAttribute("SearchScope", this.searchScope);
        }
        else {
            req.setAttribute("SearchScope", "ContactsActiveDirectory");
        }

        this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
            .getService(Ci.mivExchangeStatistics);

        if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2007") == -1)
            && (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2010_SP1") == -1)) {
            req.setAttribute("ContactDataShape", "AllProperties");
        }

        //		var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        //		req.addChildTagObject(parentFolder);

        if ((this.ids.routingType) && (this.ids.routingType == "SMTP")) {
            req.addChildTag("UnresolvedEntry", "nsMessages", this.ids.emailAddress);
        }
        else {
            req.addChildTag("UnresolvedEntry", "nsMessages", this.ids.name);
        }

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erResolveNames.execute:"+String(this.parent.makeSoapMessage(req)));

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erResolveNames.onSendOk:"+String(aResp));

        var rm = aResp.XPath("/s:Envelope/s:Body/m:ResolveNamesResponse/m:ResponseMessages/m:ResolveNamesResponseMessage[@ResponseClass='Success' or @ResponseClass='Warning']");

        var allResolutions = new Array();
        if (rm.length == 0) {

            rm = aResp.XPath("/s:Envelope/s:Body/m:ResolveNamesResponse/m:ResponseMessages/m:ResolveNamesResponseMessage[@ResponseClass='Error' and m:ResponseCode = 'ErrorNameResolutionNoResults']");
            if (rm.length > 0) {
                this.onSendError(aExchangeRequest, 0, "ErrorNameResolutionNoResults");
            }
            else {
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
            }
            return;
        }
        else {
            var resolutionsSets = rm[0].getTags("m:ResolutionSet");

            for each(var resolutionsSet in resolutionsSets) {

                var totalItemsInView = resolutionsSet.getAttribute("TotalItemsInView", 0);
                var includesLastItem = resolutionsSet.getAttribute("IncludesLastItemInRange", "false");

                var resList = resolutionsSet.XPath("/t:Resolution");
                for each(var resolution in resList) {
                    allResolutions.push(resolution);
                }

            }
            resolutionsSets = null;
        }
        rm = null;

        if (this.mCbOk) {
            this.mCbOk(this, allResolutions);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        //exchWebService.commonFunctions.LOG("erResolveNames.onSendError: aCode"+aCode+", aMsg:"+aMsg);
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
