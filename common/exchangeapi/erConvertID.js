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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");

var EXPORTED_SYMBOLS = ["erConvertIDRequest"];

function erConvertIDRequest(aArgument, aCbOk, aCbError, aListener) {
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

    this.parent.debug = true;

    this.mailbox = aArgument.mailbox;
    this.serverUrl = aArgument.serverUrl;
    this.folderId = aArgument.folderId;

    this.isRunning = true;
    this.execute();
}

erConvertIDRequest.prototype = {

    execute: function _execute() {
        //		exchWebService.commonFunctions.LOG("erConvertIDRequest.Execute");
        // We are going to do a dummy FindItem. It will return the real primarySMTP

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:ConvertId xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("DestinationFormat", "EwsId");

        var alternateId = req.addChildTag("SourceIds", "nsMessages", null).addChildTag("AlternateId", "nsTypes", null);
        alternateId.setAttribute("Format", "HexEntryId");
        alternateId.setAttribute("Id", this.folderId);
        alternateId.setAttribute("Mailbox", this.mailbox);

        //exchWebService.commonFunctions.LOG(" ++ xml2jxon ++:"+this.parent.makeSoapMessage(req));

        //		exchWebService.commonFunctions.LOG("erConvertIDRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.xml2jxon = true;

        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erConvertIDRequest.onSendOk: " + String(aResp));

        var aContinue = true;
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:ConvertIdResponse/m:ResponseMessages/m:ConvertIdResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");

        if (rm.length > 0) {

            //          <m:AlternateId xsi:type="t:AlternateIdType" Format="EwsId" Id="AAMkADNjZmIwYzQyLTdjYmEtNGFlMi05ZGE5LTBlYzRkNzYzODRhOAAuAAAAAAC8WradQ3BFT7SAoV2yp+k8AQDcsp8GsIe7Q5tUJHDnpdbjAAAtr+rqAAA=" Mailbox="jane@example.com"/>

            var alternateId = rm[0].getAttributeByTag("m:AlternateId", "Id");
            var realMailbox = rm[0].getAttributeByTag("m:AlternateId", "Mailbox");
        }
        else {
            aMsg = this.parent.getSoapErrorMsg(aResp);
            if (aMsg) {
                aCode = this.parent.ER_ERROR_CONVERTID;
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
                this.mCbOk(alternateId, realMailbox);
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

exchWebService.commonFunctions.LOG("++==--++");
