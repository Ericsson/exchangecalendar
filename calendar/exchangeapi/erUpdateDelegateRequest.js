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

var EXPORTED_SYMBOLS = ["erUpdateDelegateRequest"];

function erUpdateDelegateRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.delegateemail = aArgument.delegateemail;
    this.delegateproperties = aArgument.delegateproperties;
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

erUpdateDelegateRequest.prototype = {

    execute: function _execute() {
        exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:UpdateDelegate xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var mailBox = req.addChildTag("Mailbox", "nsMessages", null);
        mailBox.addChildTag("EmailAddress", "nsTypes", this.mailbox);

        var delegateusers = req.addChildTag("DelegateUsers", "nsMessages", null);
        var delegateuser = delegateusers.addChildTag("DelegateUser", "nsTypes", null);
        var userid = delegateuser.addChildTag("UserId", "nsTypes", null);
        userid.addChildTag("PrimarySmtpAddress", "nsTypes", this.delegateemail);

        var delegatepermissions = delegateuser.addChildTag("DelegatePermissions", "nsTypes", null);
        delegatepermissions.addChildTag(this.permission, "nsTypes", this.delegateproperties.DelegatePermissions);
        delegateuser.addChildTag("ReceiveCopiesOfMeetingMessages", "nsTypes", this.delegateproperties.ReceiveCopiesOfMeetingMessages);
        delegateuser.addChildTag("ViewPrivateItems", "nsTypes", this.delegateproperties.ViewPrivateItems);
        req.addChildTag("DeliverMeetingRequests", "nsMessages", this.delegateproperties.DeliverMeetingRequests);

        exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.execute2 " + req + "\n");

        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.onSendOk: " + aResp + "\n");

        var rm = aResp.XPath("/s:Envelope/s:Body/m:UpdateDelegateResponse/m:ResponseMessages/m:DelegateUserResponseMessageType[@ResponseClass='Success']");
        if (rm.length == 0) {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on sending meeting respons.");
            return;
        }

        var responseCode = rm[0].getTagValue("m:ResponseCode");
        if (responseCode != "NoError") {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, "Error on sending meeting respons:" + responseCode);
            return;
        }

        var dmr = aResp.XPath("/s:Envelope/s:Body/m:UpdateDelegateResponse");
        var DeliverMeetingRequests = dmr[0].getTagValue("m:DeliverMeetingRequests");
        //	exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.onSendOk: DeliverMeetingRequests  " + DeliverMeetingRequests);


        var delegates = [];
        if (rm.length > 0) {
            for (index = 0; index < rm.length; index++) {
                //exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.onSendOk:  " + index + " : " +  rm[index] + " \n");  
                var delegateUser = rm[index].getTag("m:DelegateUser");
                if (delegateUser) {
                    delegates[index] = {
                        SID: delegateUser.getTag("t:UserId").getTagValue("t:SID"),
                        PrimarySmtpAddress: delegateUser.getTag("t:UserId").getTagValue("t:PrimarySmtpAddress"),
                        DisplayName: delegateUser.getTag("t:UserId").getTagValue("t:DisplayName"),
                        /*adding local permission so we receive no response for that */
                        DelegatePermissions: this.delegateproperties.DelegatePermissions,
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
        exchWebService.commonFunctions.LOG("erUpdateDelegateRequest.onSendError: " + aMsg + "\n");
        this.isRunning = false;
        if (this.mCbError) {
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
    <UpdateDelegate xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
                    xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
      <Mailbox>
        <t:EmailAddress>user1@example.com</t:EmailAddress>
      </Mailbox>
      <DelegateUsers>
        <t:DelegateUser>
          <t:UserId>
            <t:PrimarySmtpAddress>user2@example.com</t:PrimarySmtpAddress>
          </t:UserId>
          <t:DelegatePermissions>
            <t:TasksFolderPermissionLevel>None</t:TasksFolderPermissionLevel>
          </t:DelegatePermissions>
          <t:ViewPrivateItems>true</t:ViewPrivateItems>
        </t:DelegateUser>
        <t:DelegateUser>
          <t:UserId>
            <t:PrimarySmtpAddress>user3@example.com</t:PrimarySmtpAddress>
          </t:UserId>
          <t:DelegatePermissions>
            <t:JournalFolderPermissionLevel>Reviewer</t:JournalFolderPermissionLevel>
          </t:DelegatePermissions>
        </t:DelegateUser>
      </DelegateUsers>
      <DeliverMeetingRequests>DelegatesAndSendInformationToMe</DeliverMeetingRequests>
    </UpdateDelegate>
  </soap:Body>
</soap:Envelope>
*
**/
