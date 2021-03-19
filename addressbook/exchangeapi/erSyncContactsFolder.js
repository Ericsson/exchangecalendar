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

var EXPORTED_SYMBOLS = ["erSyncContactsFolderRequest"];

const MAPI_PidTagBody = "4096";

function erSyncContactsFolderRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.syncState = aArgument.syncState;

    if (!aArgument.syncState) {
        this.getSyncState = true;
    }
    else {
        this.getSyncState = false;
    }

    this.creations = {
        contacts: [],
        distlists: []
    };
    this.updates = {
        contacts: [],
        distlists: []
    };
    this.deletions = {
        contacts: [],
        distlists: []
    };

    this.isRunning = true;
    this.execute(aArgument.syncState);
}

erSyncContactsFolderRequest.prototype = {

    execute: function _execute(aSyncState) {
        //		exchWebService.commonFunctions.LOG("erSyncContactsFolderRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:SyncFolderItems xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "AllProperties");
        itemShape.addChildTag("BodyType", "nsTypes", "Text");

        var additionalProperties = itemShape.addChildTag("AdditionalProperties", "nsTypes", null);
        additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "item:Subject");
        //		additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName"); // Not allowed for this request

        this.exchangeStatistics = Cc["@1st-setup.nl/exchange/statistics;1"]
            .getService(Ci.mivExchangeStatistics);

        if ((this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2007") == -1)
            && (this.exchangeStatistics.getServerVersion(this.serverUrl).indexOf("2010_SP1") == -1)) {
            additionalProperties.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "contacts:Photo");
        }

        var extendedFieldURI = additionalProperties.addChildTag("ExtendedFieldURI", "nsTypes", null);
        extendedFieldURI.setAttribute("DistinguishedPropertySetId", "Common");
        extendedFieldURI.setAttribute("PropertyId", MAPI_PidTagBody);
        extendedFieldURI.setAttribute("PropertyType", "String");

        var parentFolder = makeParentFolderIds2("SyncFolderId", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        if (aSyncState) {
            req.addChildTag("SyncState", "nsMessages", aSyncState);
        }

        req.addChildTag("MaxChangesReturned", "nsMessages", "512");

        this.parent.xml2jxon = true;

        //exchWebService.commonFunctions.LOG("erSyncContactsFolderRequest.execute:"+String(this.parent.makeSoapMessage(req))+"\n");
        var soapStr = this.parent.makeSoapMessage(req);
        req = null;
        this.parent.sendRequest(soapStr, this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erSyncContactsFolderRequest.onSendOk:"+String(aResp)+"\n");

        var rm = aResp.XPath("/s:Envelope/s:Body/m:SyncFolderItemsResponse/m:ResponseMessages/m:SyncFolderItemsResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {
            var syncState = rm[0].getTagValue("m:SyncState");

            var lastItemInRange = rm[0].getTagValue("m:IncludesLastItemInRange");

            for each(var creation in rm[0].XPath("/m:Changes/t:Create")) {
                for each(var contact in creation.XPath("/t:Contact")) {
                    //this.creations.contacts.push(contact);
                    this.creations.contacts.push({
                        Id: contact.getAttributeByTag("t:ItemId", "Id"),
                        ChangeKey: contact.getAttributeByTag("t:ItemId", "ChangeKey"),
                        name: contact.getTagValue("t:Subject"),
                        displayName: contact.getTagValue("t:DisplayName")
                    });
                }
                for each(var distlist in creation.XPath("/t:DistributionList")) {
                    //this.creations.distlists.push(distlist);
                    this.creations.distlists.push({
                        Id: distlist.getAttributeByTag("t:ItemId", "Id"),
                        ChangeKey: distlist.getAttributeByTag("t:ItemId", "ChangeKey"),
                        name: distlist.getTagValue("t:Subject"),
                        displayName: distlist.getTagValue("t:DisplayName")
                    });
                }
            }

            for each(var update in rm[0].XPath("/m:Changes/t:Update")) {
                for each(var contact in update.XPath("/t:Contact")) {
                    //this.updates.contacts.push(contact);
                    this.updates.contacts.push({
                        Id: contact.getAttributeByTag("t:ItemId", "Id"),
                        ChangeKey: contact.getAttributeByTag("t:ItemId", "ChangeKey"),
                        name: contact.getTagValue("t:Subject"),
                        displayName: contact.getTagValue("t:DisplayName")
                    });
                }
                for each(var distlist in update.XPath("/t:DistributionList")) {
                    //this.updates.distlists.push(distlist);
                    this.updates.distlists.push({
                        Id: distlist.getAttributeByTag("t:ItemId", "Id"),
                        ChangeKey: distlist.getAttributeByTag("t:ItemId", "ChangeKey"),
                        name: distlist.getTagValue("t:Subject"),
                        displayName: distlist.getTagValue("t:DisplayName")
                    });
                }
            }

            for each(var deleted in rm[0].XPath("/m:Changes/t:Delete")) {
                this.deletions.contacts.push(deleted);
            }

            rm = null;

            if (lastItemInRange == "false") {
                this.execute(syncState);
                return;
            }
            else {
                if (this.mCbOk) {
                    this.mCbOk(this, this.creations, this.updates, this.deletions, syncState);
                }
                this.isRunning = false;
            }
        }
        else {
            rm = null;
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SYNCFOLDERITEMS_UNKNOWN, "Error during erSyncContactsFolderRequest");
            return;
        }

    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        //exchWebService.commonFunctions.LOG("onSendError aMsg:"+aMsg+"\n");
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
