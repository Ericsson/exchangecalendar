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

var EXPORTED_SYMBOLS = ["erUpdateFolderPermissionRequest"];

function erUpdateFolderPermissionRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.permissionSet = [];
    this.permissionSet = aArgument.permissionSet;

    this.isRunning = true;
    this.execute();
}

erUpdateFolderPermissionRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erUpdateFolderPermissionRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:UpdateFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        var folderChange = req.addChildTag("FolderChanges", "nsMessages", null).addChildTag("FolderChange", "nsTypes", null);

        var fid = folderChange.addChildTag("FolderId", "nsTypes", null)
        fid.setAttribute("Id", this.argument.folderId);
        fid.setAttribute("ChangeKey", this.argument.changeKey);

        var updates = folderChange.addChildTag("Updates", "nsTypes", null);
        var sff = updates.addChildTag("SetFolderField", "nsTypes", null);
        sff.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:PermissionSet");

        var perms = sff.addChildTag("Folder", "nsTypes", null).addChildTag("PermissionSet", "nsTypes", null)
            .addChildTag("Permissions", "nsTypes", null);
        for (var i = 0; i < this.permissionSet.length; i++) {
            var perm = perms.addChildTag("Permission", "nsTypes", null);
            if (this.permissionSet[i].sid == null) //if distinguished user
            {
                perm.addChildTag("UserId", "nsTypes", null).addChildTag("DistinguishedUser", "nsTypes", this.permissionSet[i].emailId);
            }
            else {
                perm.addChildTag("UserId", "nsTypes", null).addChildTag("PrimarySmtpAddress", "nsTypes", this.permissionSet[i].emailId);
            }

            if (this.permissionSet[i].permissionLevel == "Custom") {
                perm.addChildTag("CanCreateItems", "nsTypes", this.permissionSet[i].permissions.canCreateItems);
                perm.addChildTag("CanCreateSubFolders", "nsTypes", this.permissionSet[i].permissions.canCreateSubFolders);
                perm.addChildTag("IsFolderOwner", "nsTypes", this.permissionSet[i].permissions.isFolderOwner);
                perm.addChildTag("IsFolderVisible", "nsTypes", this.permissionSet[i].permissions.isFolderVisible);
                perm.addChildTag("IsFolderContact", "nsTypes", this.permissionSet[i].permissions.isFolderContact);
                perm.addChildTag("EditItems", "nsTypes", this.permissionSet[i].permissions.editItems);
                perm.addChildTag("DeleteItems", "nsTypes", this.permissionSet[i].permissions.deleteItems);
                perm.addChildTag("ReadItems", "nsTypes", this.permissionSet[i].permissions.readItems);
            }
            perm.addChildTag("PermissionLevel", "nsTypes", this.permissionSet[i].permissionLevel);
        }
        //exchWebService.commonFunctions.LOG("erUpdateFolderPermissionRequest.execute2 " + req + "\n" ); 

        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        //exchWebService.commonFunctions.LOG("erUpdateFolderPermissionRequest.onSendOk: " + aResp +"\n");  
        var rm = aResp.XPath("/s:Envelope/s:Body/m:UpdateFolderResponse/m:ResponseMessages/m:UpdateFolderResponseMessage[@ResponseClass='Success']");
        if (rm.length == 0) {
            var tmp = aResp.XPath("/s:Envelope/s:Body/m:UpdateFolderResponse/m:ResponseMessages/m:UpdateFolderResponseMessage[@ResponseClass='Error']");
            var responseCode = tmp[0].getTagValue("m:ResponseCode");
            var messageText = tmp[0].getTagValue("m:MessageText");
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, messageText);
            return;
        }

        var responseCode = rm[0].getTagValue("m:ResponseCode");
        var messageText = rm[0].getTagValue("m:MessageText");
        if (responseCode != "NoError") {
            this.onSendError(aExchangeRequest, this.parent.ER_ERROR_SOAP_ERROR, messageText + ": " + responseCode);
            return;
        }

        var folderID = null;
        var changeKey = null;

        if (rm.length > 0) {
            var Folder = rm[0].XPath("/m:Folders/t:Folder");
            if (Folder.length > 0) {
                folderID = Folder[0].getAttributeByTag("t:FolderId", "Id");
                changeKey = Folder[0].getAttributeByTag("t:FolderId", "ChangeKey");
            }
        }

        rm = null;
        if (this.mCbOk) {
            this.mCbOk(this, folderID, changeKey);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        exchWebService.commonFunctions.LOG("erUpdateFolderPermissionRequest.onSendError: " + aMsg + "\n");
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
