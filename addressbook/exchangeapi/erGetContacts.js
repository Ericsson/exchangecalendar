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

var EXPORTED_SYMBOLS = ["erGetContactsRequest"];

const MAPI_PidTagBody = "4096";

function erGetContactsRequest(aArgument, aCbOk, aCbError, aListener) {
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

    this.isRunning = true;
    this.execute();
}

erGetContactsRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erGetContactsRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "AllProperties");
        itemShape.addChildTag("BodyType", "nsTypes", "Text");

        var additionalProperties = itemShape.addChildTag("AdditionalProperties", "nsTypes", null);


        this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
            .getService(Ci.mivExchangeStatistics);

        if (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("Exchange2007") == -1) {
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "contacts:HasPicture");
        }

        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:HasAttachments");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Attachments");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:EffectiveRights");

        if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2007") == -1)
            && (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2010_SP1") == -1)) {
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "contacts:Photo");
        }

        var extendedFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extendedFieldURI.setAttribute("DistinguishedPropertySetId", "Common");
        extendedFieldURI.setAttribute("PropertyId", MAPI_PidTagBody);
        extendedFieldURI.setAttribute("PropertyType", "String");
        itemids = null;
        itemids = null;

        var itemids = req.addChildTag("ItemIds", "nsMessages", null);
        for each(var item in this.ids) {
            var itemId = itemids.addChildTag("ItemId", "nsTypes", null);
            itemId.setAttribute("Id", item.Id);
            if (item.ChangeKey) {
                itemId.setAttribute("ChangeKey", item.ChangeKey);
            }
            itemId = null;
        }
        itemids = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erGetContactsRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
        itemShape = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erGetContactsRequest.onSendOk:"+aResp.toString());

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage/m:ResponseCode");

        var contacts = [];
        var tmpList = aResp.XPath("/s:Envelope/s:Body/m:GetItemResponse/m:ResponseMessages/m:GetItemResponseMessage/m:Items/*");
        for (var index in tmpList) {
            contacts.push(tmpList[index]);
        }
        tmpList = null;

        if (this.mCbOk) {
            this.mCbOk(this, contacts);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        exchWebService.commonFunctions.LOG("erGetContactsRequest.onSendError.aMsg:" + aMsg);
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
