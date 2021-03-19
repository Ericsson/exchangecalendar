/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html  
 * 
 * ***** BEGIN LICENSE BLOCK *****/

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erSubscribeRequest"];

function erSubscribeRequest(aArgument, aCbOk, aCbError, aListener) {
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

    this.parent.debug = false;
    this.argument = aArgument;

    this.serverUrl = aArgument.serverUrl;
    this.folderIds = aArgument.folderIds;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.eventTypes = aArgument.eventTypes;
    this.timeout = aArgument.timeout;
    this.listener = aListener;

    this.isRunning = true;
    this.execute();
}

erSubscribeRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erSubscribeRequest.execute 1");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Subscribe xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var pr = req.addChildTag("PullSubscriptionRequest", "nsMessages", null);

        if (this.folderBase) {
            var parentFolder = makeParentFolderIds2("FolderIds", this.argument);
            pr.addChildTagObject(parentFolder);
            parentFolder = null;
        }
        else {
            var parentFolder = pr.addChildTag("FolderIds", "nsTypes", null);
            for (var i = 0; i < this.folderIds.length; i++) {
                parentFolder.addChildTag("FolderId", "nsTypes", null).setAttribute("Id", this.folderIds[i].id);
            }
            parentFolder = null;
        }

        var eventTypes = pr.addChildTag("EventTypes", "nsTypes", null);
        for (var i = 0; i < this.eventTypes.length; i++) {
            eventTypes.addChildTag("EventType", "nsTypes", this.eventTypes[i]);
        }

        if (this.timeout) {
            pr.addChildTag("Timeout", "nsTypes", this.timeout);
        }
        else {
            pr.addChildTag("Timeout", "nsTypes", "1440");
        }

        //   exchWebService.commonFunctions.LOG(" ++ xml2jxon ++:"+this.parent.makeSoapMessage(req));

        //	exchWebService.commonFunctions.LOG("erSubscribeRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //	exchWebService.commonFunctions.LOG("erSubscribeRequest.onSendOk:"+String(aResp));
        // Get FolderID and ChangeKey
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;
        var subscriptionId = undefined;
        var watermark = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:SubscribeResponse/m:ResponseMessages/m:SubscribeResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {
            subscriptionId = rm[0].getTagValue("m:SubscriptionId");
            watermark = rm[0].getTagValue("m:Watermark");
        }
        else {
            aMsg = this.parent.getSoapErrorMsg(aResp);
            if (aMsg) {
                aCode = this.parent.ER_ERROR_FINDFOLDER_FOLDERID_DETAILS;
                aError = true;
            }
            else {
                aCode = this.parent.ER_ERROR_SOAP_RESPONSECODE_NOTFOUND;
                aError = true;
                aMsg = "Wrong response received.";
            }
        }

        rm = null;

        if (aError) {
            this.onSendError(aExchangeRequest, aCode, aMsg);
        }
        else {
            if (this.mCbOk) {
                this.properties = aResp;
                this.mCbOk(this, subscriptionId, watermark);
            }
            this.isRunning = false;
        }

    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
