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
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erUnsubscribeRequest"];

function erUnsubscribeRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.subscriptionId = aArgument.subscriptionId;
    this.listener = aListener;

    this.isRunning = true;
    this.execute();
}

erUnsubscribeRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erUnsubscribeRequest.execute 1"); 
        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:Unsubscribe xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.addChildTag("SubscriptionId", "nsMessages", this.subscriptionId);

        //exchWebService.commonFunctions.LOG("erUnsubscribeRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        // exchWebService.commonFunctions.LOG("erUnsubscribeRequest.onSendOk:"+String(aResp));
        // Get FolderID and ChangeKey
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = [];

        var rm = aResp.XPath("/s:Envelope/s:Body/m:UnsubscribeResponse/m:ResponseMessages/m:UnsubscribeResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");
        if (rm.length > 0) {
            aResult = rm;
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

        if (aError) {
            this.onSendError(aExchangeRequest, aCode, aMsg);
        }
        else {
            if (this.mCbOk) {
                this.properties = aResp;
                this.mCbOk(this, aResult);
            }
            this.isRunning = false;
        }
        rm = null;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
