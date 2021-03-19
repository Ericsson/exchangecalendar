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

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erCreateAttachmentRequest"];

function erCreateAttachmentRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.parentItemId = aArgument.parentItemId;
    this.parentItemChangeKey = aArgument.parentItemChangeKey;

    this.createAttachments = aArgument.attachmentsUpdates.create;

    this.isRunning = true;
    this.execute();
}

erCreateAttachmentRequest.prototype = {

    readFile: function _readFile(aFile) {
        exchWebService.commonFunctions.LOG("erCreateAttachmentRequest.readFile: Going to read file:" + aFile.path);
        var data = "";
        var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
        createInstance(Ci.nsIFileInputStream);
        fstream.init(aFile, -1, 0, 0);

        var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].
        createInstance(Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream(fstream);

        var bytesRead = 0;
        var bytesToRead = bstream.available();
        while (bytesToRead > 0) {
            var bytes = bstream.readBytes(bytesToRead);
            bytesRead += bytesToRead;
            data += btoa(bytes);
            bytesToRead = bstream.available();
        }

        bstream.close();

        return {
            content: data,
            size: bytesRead
        };
    },

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erCreateAttachmentRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:CreateAttachment xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var parentItemId = req.addChildTag("ParentItemId", "nsMessages", null);
        parentItemId.setAttribute("Id", this.parentItemId);
        parentItemId.setAttribute("ChangeKey", this.parentItemChangeKey);

        var attachments = req.addChildTag("Attachments", "nsMessages", null);

        this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
            .getService(Ci.mivExchangeStatistics);

        for (var index in this.createAttachments) {
            var fileData = this.readFile(this.createAttachments[index].uri.QueryInterface(Ci.nsIFileURL).file);

            var attachment = exchWebService.commonFunctions.xmlToJxon('<nsTypes:FileAttachment xmlns:nsTypes="' + nsTypesStr + '"/>');
            attachment.addChildTag("Name", "nsTypes", this.createAttachments[index].uri.QueryInterface(Ci.nsIFileURL).file.leafName);
            if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2010") > -1) || (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2013") > -1)) {
                attachment.addChildTag("Size", "nsTypes", fileData.size);
            }
            attachment.addChildTag("Content", "nsTypes", fileData.content);

            attachments.addChildTagObject(attachment);
            attachment = null;

        }

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erCreateAttachmentRequest.execute>"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
        attachments = null;
        parentItemId = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erCreateAttachmentRequest.onSendOk: "+String(aResp)+"\n");

        // The response could contain the result of creating multiple attachments. One could be ok and another not. So check all.

        var weHaveAnError = false;
        var createAttachmentResponseMessages = aResp.XPath("/s:Envelope/s:Body/m:CreateAttachmentResponse/m:ResponseMessages/m:CreateAttachmentResponseMessage");
        var errorCount = 0;
        var okCount = 0;

        for each(var createAttachmentResponseMessage in createAttachmentResponseMessages) {
            if (createAttachmentResponseMessage.getAttribute("ResponseClass") != "Success") {
                weHaveAnError = true;
                errorCount++;
            }
            else {
                okCount++;
            }
        }
        oofSettingsResponse = null;

        exchWebService.commonFunctions.LOG("erCreateAttachmentRequest.onSendOk: errorCount:" + errorCount + ", okCount:" + okCount);

        if (weHaveAnError) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on creating attachments:(" + errorCount + " errors and " + okCount + " ok) " + String(aResp));
            return;
        }
        else {
            var aAttachments = aResp.XPath("/s:Envelope/s:Body/m:CreateAttachmentResponse/m:ResponseMessages/m:CreateAttachmentResponseMessage/m:Attachments/*");

            if (aAttachments.length > 0) {
                var attachmentId = aAttachments[0].getAttributeByTag("t:AttachmentId", "Id");
                var RootItemId = aAttachments[0].getAttributeByTag("t:AttachmentId", "RootItemId");
                var RootItemChangeKey = aAttachments[0].getAttributeByTag("t:AttachmentId", "RootItemChangeKey");
            }
            else {
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_CREATING_ITEM_UNKNOWN, "Error. Valid createattachment request but receive no update details:" + String(aResp));
                aAttachments = null;
                return;
            }
            aAttachments = null;
        }

        if (this.mCbOk) {
            this.mCbOk(this, attachmentId, RootItemId, RootItemChangeKey);
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
