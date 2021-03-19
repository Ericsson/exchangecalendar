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
var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");
Cu.import("resource://exchangecommon/ecFunctions.js");

var EXPORTED_SYMBOLS = ["erFindContactsRequest"];

function erFindContactsRequest(aArgument, aCbOk, aCbError, aListener) {
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

    // Arrays containing results of the possible multiple requests
    this.contacts = [];
    this.distlists = [];

    this.isRunning = true;

    // First request is done with an offset of 0 (actually we don't know the number of contacts)
    this.execute(0);
}

erFindContactsRequest.prototype = {

    execute: function _execute(offset) {
        //exchWebService.commonAbFunctions.logInfo("erFindContactsRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:FindItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("Traversal", "Shallow");

        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "IdOnly");

        // The IndexedPageItemView allows to request a certain range of contacts in the address book
        var view = exchWebService.commonFunctions.xmlToJxon('<nsMessages:IndexedPageItemView />');
        view.setAttribute("MaxEntriesReturned", "300"); // Maximum number of entries to receive
        view.setAttribute("Offset", offset); // Offset from the BasePoint (Beginning or End)
        view.setAttribute("BasePoint", "Beginning");
        req.addChildTagObject(view);
        view = null;

        var additionalProperties = itemShape.addChildTag("AdditionalProperties", "nsTypes", null);
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Subject");
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName");

        var restr = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Restriction xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var or = restr.addChildTag("Or", "nsTypes", null);
        var isEqualTo1 = or.addChildTag("IsEqualTo", "nsTypes", null);
        isEqualTo1.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ItemClass");
        isEqualTo1.addChildTag("FieldURIOrConstant", "nsTypes", null).addChildTag("Constant", "nsTypes", null).setAttribute("Value", "IPM.Contact");

        var isEqualTo2 = or.addChildTag("IsEqualTo", "nsTypes", null);
        isEqualTo2.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:ItemClass");
        isEqualTo2.addChildTag("FieldURIOrConstant", "nsTypes", null).addChildTag("Constant", "nsTypes", null).setAttribute("Value", "IPM.DistList");

        req.addChildTagObject(restr);
        restr = null;

        var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        this.parent.xml2jxon = true;

        //exchWebService.commonAbFunctions.logInfo("erFindContactsRequest.execute:"+String(this.parent.makeSoapMessage(req)));

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonAbFunctions.logInfo("erFindContactsRequest.onSendOk:" + String(aResp));

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage/m:ResponseCode");

        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Respons does not contain expected field");
            return;
        }

        var responseCode = rm[0].value;

        if (responseCode == "NoError") {

            var rootFolder = aResp.XPath("/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage/m:RootFolder");
            if (rootFolder.length == 0) {
                this.onSendError(aExchangeRequest, this.parent.ER_ERROR_RESPONS_NOT_VALID, "Did not find a rootfolder element.");
                return;
            }

            for each(var contact in rootFolder[0].XPath("/t:Items/t:Contact")) {
                exchWebService.commonAbFunctions.logInfo("erFindContactsRequest.contacts: id:" + contact.getAttributeByTag("t:ItemId", "Id") + ", changekey:" + contact.getAttributeByTag("t:ItemId", "ChangeKey"));
                this.contacts.push({
                    Id: contact.getAttributeByTag("t:ItemId", "Id"),
                    ChangeKey: contact.getAttributeByTag("t:ItemId", "ChangeKey"),
                    name: contact.getTagValue("t:Subject"),
                    displayName: contact.getTagValue("t:DisplayName")
                });
            }

            for each(var distlist in rootFolder[0].XPath("/t:Items/t:DistributionList")) {
                this.distlists.push({
                    Id: distlist.getAttributeByTag("t:ItemId", "Id"),
                    ChangeKey: distlist.getAttributeByTag("t:ItemId", "ChangeKey"),
                    name: distlist.getTagValue("t:Subject"),
                    displayName: distlist.getTagValue("t:DisplayName")
                });
            }

            // RootFolder attributes received after a FindItem request:
            // https://msdn.microsoft.com/EN-US/library/office/aa493859%28v=exchg.150%29.aspx
            var totalItemsInView = rootFolder[0].getAttribute("TotalItemsInView", 0);
            var includesLastItemInRange = rootFolder[0].getAttribute("IncludesLastItemInRange", "true");
            var offset = rootFolder[0].getAttribute("IndexedPagingOffset", 0);

            exchWebService.commonAbFunctions.logInfo("erFindContactsRequest.onSendOk Retrieved: " + (this.distlists.length + this.contacts.length) + " contacts and distlists on a total of " + totalItemsInView + " items available in the view.");

            if (includesLastItemInRange == "true") {
                if (this.mCbOk) {
                    this.mCbOk(this, this.contacts.slice(), this.distlists.slice());
                }
                this.isRunning = false;
                this.contacts = [];
                this.distlists = [];
            }
            else {
                this.execute(offset);
            }
        }
        else {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, responseCode);
        }
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
