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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erDeleteAttachmentRequest"];

function erDeleteAttachmentRequest(aArgument, aCbOk, aCbError, aListener) {
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

    this.deleteAttachments = aArgument.attachmentsUpdates.delete;

    this.isRunning = true;
    this.execute();
}

erDeleteAttachmentRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erDeleteAttachmentRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:DeleteAttachment xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var attachmentIds = req.addChildTag("AttachmentIds", "nsMessages", null);

        for (var index in this.deleteAttachments) {
            attachmentIds.addChildTag("AttachmentId", "nsTypes", null).setAttribute("Id", this.deleteAttachments[index].getParameter("X-AttachmentId"));
        }

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erDeleteAttachmentRequest.execute>"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erDeleteAttachmentRequest.onSendOk: "+String(aResp)+"\n");
        // The response could contain the result of creating multiple attachments. One could be ok and another not. So check all.

        var weHaveAnError = false;
        var deleteAttachmentResponseMessages = aResp.XPath("/s:Envelope/s:Body/m:DeleteAttachmentResponse/m:ResponseMessages/m:DeleteAttachmentResponseMessage");
        var errorCount = 0;
        var okCount = 0;

        for each(var deleteAttachmentResponseMessage in deleteAttachmentResponseMessages) {
            if (deleteAttachmentResponseMessage.getAttribute("ResponseClass") != "Success") {
                weHaveAnError = true;
                errorCount++;
            }
            else {
                okCount++;
            }
        }

        exchWebService.commonFunctions.LOG("erDeleteAttachmentRequest.onSendOk: errorCount:" + errorCount + ", okCount:" + okCount);

        if (weHaveAnError) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on deleting attachments:(" + errorCount + " errors and " + okCount + " ok) " + String(aResp));
            deleteAttachmentResponseMessages = null;
            return;
        }
        else {
            if (deleteAttachmentResponseMessages.length > 0) {
                var RootItemId = deleteAttachmentResponseMessages[0].getAttributeByTag("m:RootItemId", "RootItemId");
                var RootItemChangeKey = deleteAttachmentResponseMessages[0].getAttributeByTag("m:RootItemId", "RootItemChangeKey");
            }
            else {
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_CREATING_ITEM_UNKNOWN, "Error. Unknown item deletion:" + String(aResp));
                deleteAttachmentResponseMessages = null;
                return;
            }
        }
        deleteAttachmentResponseMessages = null;

        if (this.mCbOk) {
            this.mCbOk(this, RootItemId, RootItemChangeKey);
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
