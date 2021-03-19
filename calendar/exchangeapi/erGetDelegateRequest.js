/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html 
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

var EXPORTED_SYMBOLS = ["erGetDelegateRequest"];

function erGetDelegateRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.delegatingItem = aArgument.delegatingItem;

    this.permission = "";
    switch (this.delegatingItem) {
    case "calendar":
        this.permission = "CalendarFolderPermissionLevel";
        break;
    case "tasks":
        this.permission = "TasksFolderPermissionLevel";
        break;
    case "inbox":
        this.permission = "InboxFolderPermissionLevel";
        break;
    case "contacts":
        this.permission = "ContactsFolderPermissionLevel";
        break;
    case "notes":
        this.permission = "NotesFolderPermissionLevel";
        break;
    case "journal":
        this.permission = "JournalFolderPermissionLevel";
        break;
    default:
    }

    this.isRunning = true;
    this.execute();
}

erGetDelegateRequest.prototype = {

    execute: function _execute() {
        exchWebService.commonFunctions.LOG("erGetDelegateRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetDelegate xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("IncludePermissions", "true");
        var mailBox = req.addChildTag("Mailbox", "nsMessages", null);
        mailBox.addChildTag("EmailAddress", "nsTypes", this.mailbox);
        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erGetDelegateRequest.onSendOk: " + "\n");

        var rm = aResp.XPath("/s:Envelope/s:Body/m:GetDelegateResponse/m:ResponseMessages/m:DelegateUserResponseMessageType[@ResponseClass='Success']");
        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on sending meeting respons.");
            return;
        }

        var responseCode = rm[0].getTagValue("m:ResponseCode");
        if (responseCode != "NoError") {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on sending meeting respons:" + responseCode);
            return;
        }
        var dmr = aResp.XPath("/s:Envelope/s:Body/m:GetDelegateResponse");
        var DeliverMeetingRequests = dmr[0].getTagValue("m:DeliverMeetingRequests");
        //	exchWebService.commonFunctions.LOG("erGetDelegateRequest.onSendOk: DeliverMeetingRequests  " + DeliverMeetingRequests);

        var delegates = [];
        if (rm.length > 0) {
            for (index = 0; index < rm.length; index++) {
                //exchWebService.commonFunctions.LOG("erGetDelegateRequest.onSendOk:  " + index + " : " +  rm[index] + " \n");  

                var delegateUser = rm[index].getTag("m:DelegateUser");
                if (delegateUser) {
                    delegates[index] = {
                        SID: delegateUser.getTag("t:UserId").getTagValue("t:SID"),
                        PrimarySmtpAddress: delegateUser.getTag("t:UserId").getTagValue("t:PrimarySmtpAddress"),
                        DisplayName: delegateUser.getTag("t:UserId").getTagValue("t:DisplayName"),
                        DelegatePermissions: delegateUser.getTag("t:DelegatePermissions").getTagValue("t:" + this.permission),
                        ReceiveCopiesOfMeetingMessages: delegateUser.getTagValue("t:ReceiveCopiesOfMeetingMessages"),
                        ViewPrivateItems: delegateUser.getTagValue("t:ViewPrivateItems"),
                        DeliverMeetingRequests: DeliverMeetingRequests,
                    };
                }
            }
        }

        rm = null;
        if (this.mCbOk) {
            this.mCbOk(this, delegates);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        exchWebService.commonFunctions.LOG("erGetDelegateRequest.onSendError: " + aMsg + "\n");
        this.isRunning = false;
        if (this.mCbError) {
            exchWebService.commonFunctions.LOG("erGetDelegateRequest.onSendError: Callback Active  \n");
            this.mCbError(this, aCode, aMsg);
        }
    },
};

/*
 
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2007_SP1"/>
  </soap:Header>
  <soap:Body>
    <GetDelegate xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
                 xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
                 IncludePermissions="true">
      <Mailbox>
        <t:EmailAddress>user3@example.com</t:EmailAddress>
      </Mailbox>
    </GetDelegate>
  </soap:Body>
</soap:Envelope>

*
**/

/*
 * <?xml version="1.0" encoding="utf-8"?>
 * <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header><h:ServerVersionInfo MajorVersion="14" MinorVersion="3" MajorBuildNumber="174" MinorBuildNumber="1" Version="Exchange2010_SP2" xmlns:h="http://schemas.microsoft.com/exchange/services/2006/types" xmlns="http://schemas.microsoft.com/exchange/services/2006/types" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"/></s:Header><s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
 * <m:GetDelegateResponse ResponseClass="Success" xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"><m:ResponseCode>NoError</m:ResponseCode>
 * <m:ResponseMessages> 
 * <m:DelegateUserResponseMessageType ResponseClass="Success"><m:ResponseCode>NoError</m:ResponseCode> 			 * 
 * <m:DelegateUser>
 * 	<t:UserId>
 * 	<t:SID>S-1-5-21-1538607324-3213881460-940295383-542321</t:SID>
 * 	<t:PrimarySmtpAddress>p.raveendra.babu@ericsson.com</t:PrimarySmtpAddress>
 * 	<t:DisplayName>P Raveendra Babu</t:DisplayName>
 * 	</t:UserId>
 * <t:DelegatePermissions><t:CalendarFolderPermissionLevel>Author</t:CalendarFolderPermissionLevel></t:DelegatePermissions>
 * <t:ReceiveCopiesOfMeetingMessages>false</t:ReceiveCopiesOfMeetingMessages>
 * <t:ViewPrivateItems>false</t:ViewPrivateItems>
 * </m:DelegateUser>
 * </m:DelegateUserResponseMessageType>
 * 
 * <m:DelegateUserResponseMessageType ResponseClass="Success"><m:ResponseCode>NoError</m:ResponseCode>
 * <m:DelegateUser>
 * 	<t:UserId>
 * 	<t:SID>S-1-5-21-1538607324-3213881460-940295383-21415</t:SID>
 * 	<t:PrimarySmtpAddress>anant.kumar.a.singh@ericsson.com</t:PrimarySmtpAddress>
 * 	<t:DisplayName>Anant Kumar Singh A</t:DisplayName>
 * 	</t:UserId>
 * <t:DelegatePermissions><t:CalendarFolderPermissionLevel>Author</t:CalendarFolderPermissionLevel>
 * </t:DelegatePermissions><t:ReceiveCopiesOfMeetingMessages>false</t:ReceiveCopiesOfMeetingMessages>
 * <t:ViewPrivateItems>false</t:ViewPrivateItems>
 * </m:DelegateUser>
 * 
 * </m:DelegateUserResponseMessageType>
 * </m:ResponseMessages>
 * <m:DeliverMeetingRequests>DelegatesAndMe</m:DeliverMeetingRequests></m:GetDelegateResponse></s:Body></s:Envelope>
 * */
