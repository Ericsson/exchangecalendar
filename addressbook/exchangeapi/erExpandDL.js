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

var EXPORTED_SYMBOLS = ["erExpandDLRequest"];

function erExpandDLRequest(aArgument, aCbOk, aCbError, aListener) {
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

    this.emailAddress = aArgument.emailAddress;
    this.itemId = aArgument.itemId;

    this.isRunning = true;
    this.execute();
}

erExpandDLRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erExpandDLRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ExpandDL xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var mailBox = req.addChildTag("Mailbox", "nsMessages", null);

        if (this.emailAddress) {
            mailBox.addChildTag("EmailAddress", "nsTypes", this.emailAddress);
        }
        if (this.itemId) {
            var itemId = mailBox.addChildTag("ItemId", "nsTypes", null);
            itemId.setAttribute("Id", this.itemId.id);
            if (this.itemId.changeKey) {
                itemId.setAttribute("ChangeKey", this.itemId.changeKey);
            }
        }

        this.parent.xml2jxon = true;

        exchWebService.commonFunctions.LOG("erExpandDLRequest.execute:" + String(this.parent.makeSoapMessage(req)));

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erExpandDLRequest.onSendOk:" + String(aResp));

        var rm = aResp.XPath("/s:Envelope/s:Body/m:ExpandDLResponse/m:ResponseMessages/m:ExpandDLResponseMessage[@ResponseClass='Success' and m:ResponseCode = 'NoError']");

        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
            return;
        }

        var dlExpansion = rm[0].getTags("m:DLExpansion");
        rm = null;

        var allMailboxes = new Array();
        for each(var expansion in dlExpansion) {

            var totalItemsInView = expansion.getAttribute("TotalItemsInView", 0);
            var includesLastItem = expansion.getAttribute("IncludesLastItemInRange", "false");

            var mailboxes = expansion.getTags("t:Mailbox");
            for each(var mailbox in mailboxes) {
                allMailboxes.push(mailbox);
            }
            mailboxes = null;

        }
        dlExpansion = null;

        if (this.mCbOk) {
            this.mCbOk(this, allMailboxes);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
