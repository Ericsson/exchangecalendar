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
 * Author: Deepak Kumar
 * email: deepk2u@gmail.com
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

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erForewardItemRequest"];

function erForewardItemRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.serverUrl = aArgument.serverUrl;
    this.listener = aListener;
    this.mailbox = aArgument.mailbox;

    this.isRunning = true;
    this.execute();
}

erForewardItemRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erForewardItemRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:CreateItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("MessageDisposition", "SendAndSaveCopy");

        var forwardItem = req.addChildTag("Items", "nsMessages", null).addChildTag("ForwardItem", "nsTypes", null);
        var toRecipients = forwardItem.addChildTag("ToRecipients", "nsTypes", null);

        for each(let emailId in this.argument.attendees) {
            var email = new String(emailId);
            var start = email.indexOf('<');
            if (start < 0) {
                toRecipients.addChildTag("Mailbox", "nsTypes", null).addChildTag("EmailAddress", "nsTypes", email);
            }
            else {
                email = email.substr(start + 1);
                var end = email.indexOf('>');
                toRecipients.addChildTag("Mailbox", "nsTypes", null).addChildTag("EmailAddress", "nsTypes", email.substr(0, end));
            }
        }

        var referenceItemId = forwardItem.addChildTag("ReferenceItemId", "nsTypes", null);
        referenceItemId.setAttribute("Id", this.argument.item.id);
        referenceItemId.setAttribute("ChangeKey", this.argument.item.changeKey);

        forwardItem.addChildTag("NewBodyContent", "nsTypes", this.argument.item.body).setAttribute("BodyType", "HTML");

        this.parent.xml2jxon = true;

        //dump("erForewardItemRequest.execute>"+String(this.parent.makeSoapMessage(req))+"\n");

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erForewardItemRequest.onSendOk: "+String(aResp)+"\n");
        var rm = aResp.XPath("/s:Envelope/s:Body/m:CreateItemResponse/m:ResponseMessages/m:CreateItemResponseMessage/m:ResponseCode");

        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
            return;
        }

        var responseCode = rm[0].value;
        rm = null;

        var response;
        if (responseCode != "NoError") {
            var messageText = aResp.XPath("/s:Envelope/s:Body/m:CreateItemResponse/m:ResponseMessages/m:CreateItemResponseMessage/m:MessageText");
            if (messageText.length == 0) {
                messageText = "(unknown)";
            }
            else {
                messageText = messageText[0].value;
            }
            response = "Event forwarding not successful!:" + messageText + "(" + responseCode + ")";
            //this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Event forewarding not successful!:"+messageText+"("+responseCode+")" );
            messageText = null;
        }
        else {
            response = "Event forwarding successful!";
        }

        if (this.mCbOk) {
            this.mCbOk(this, response);
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
