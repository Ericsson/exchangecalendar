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

var Cu = Components.utils;

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var EXPORTED_SYMBOLS = ["erGetAttachmentsRequest"];

function erGetAttachmentsRequest(aArgument, aCbOk, aCbError, aListener) {
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
    exchWebService.commonFunctions.LOG(" == serverUrl:" + aArgument.serverUrl);
    this.attachmentIds = aArgument.attachmentIds;

    this.isRunning = true;
    this.execute();
}

erGetAttachmentsRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erGetAttachmentsRequest.execute");

        //var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetAttachment xmlns:nsMessages="'+nsMessagesStr+'" xmlns:nsTypes="'+nsTypesStr+'"/>');
        var root = xml2json.newJSON();
        xml2json.parseXML(root, '<nsMessages:GetAttachment xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var req = root[telements][0];

        var attachmentShape = xml2json.addTag(req, "AttachmentShape", "nsMessages", null);
        xml2json.addTag(attachmentShape, "IncludeMimeContent", "nsTypes", "true");
        //var additionalProperties = xml2json.addTag(attachmentShape, "AdditionalProperties", "nsTypes", null);
        //var fieldURI = xml2json.addTag(additionalProperties, "FieldURI", "nsTypes", null);
        //xml2json.setAttribute(fieldURI, "FieldURI" , "attachment:contentId");

        //var itemids = exchWebService.commonFunctions.xmlToJxon('<nsMessages:AttachmentIds xmlns:nsMessages="'+nsMessagesStr+'" xmlns:nsTypes="'+nsTypesStr+'"/>');
        var itemids = xml2json.addTag(req, "AttachmentIds", "nsMessages", null);
        for (var index in this.attachmentIds) {
            let attachmentId = xml2json.addTag(itemids, "AttachmentId", "nsTypes", null);
            xml2json.setAttribute(attachmentId, "Id", this.attachmentIds[index]);
        }

        //req.addChildTagObject(itemids);
        itemids = null;

        this.parent.xml2json = true;

        //dump("erGetAttachmentsRequest.execute:"+this.parent.makeSoapMessage2(req)+"\n\n");
        this.parent.sendRequest(this.parent.makeSoapMessage2(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //dump("erGetAttachmentsRequest.onSendOk: "+xml2json.toString(aResp)+"\n\n");

        //var rm = aResp.XPath("/s:Envelope/s:Body/m:GetAttachmentResponse/m:ResponseMessages/m:GetAttachmentResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']/m:Attachments/*");
        var rm = xml2json.XPath(aResp, "/s:Envelope/s:Body/m:GetAttachmentResponse/m:ResponseMessages/m:GetAttachmentResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']/m:Attachments/*");

        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on getting Attachment.");
            rm = null;
            return;
        }

        var attachments = [];
        for each(var e in rm) {
            attachments.push({
                id: xml2json.getAttributeByTag(e, "t:AttachmentId", "Id"),
                name: xml2json.getTagValue(e, "t:Name"),
                content: xml2json.getTagValue(e, "t:Content"),
                contentId: xml2json.getTagValue(e, "t:ContentId"),
                contentType: xml2json.getTagValue(e, "t:ContentType"),
                attachment: e
            });
        }
        rm = null;

        if (this.mCbOk) {
            this.mCbOk(this, attachments);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        dump("erGetAttachmentsRequest.onSendError: aCode:" + aCode + ", aMsg:" + aMsg + "\n\n");
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
