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

/*Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");*/

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erGetFolderPermissionRequest"];

function erGetFolderPermissionRequest(aArgument, aCbOk, aCbError, aListener) {
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
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;

    /*	while ((aArgument.folderPath.length > 0) && (aArgument.folderPath.indexOf("/") == 0)) {
    		aArgument.folderPath = aArgument.folderPath.substr(1);
    	}*/

    this.isRunning = true;
    this.execute();
}

erGetFolderPermissionRequest.prototype = {

    execute: function _execute() {
        //exchWebService.commonFunctions.LOG("erGetFolderPermissionRequest.execute 1");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:GetFolder xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');

        var fs = req.addChildTag("FolderShape", "nsMessages", null);
        fs.addChildTag("BaseShape", "nsTypes", "IdOnly");
        var ap = fs.addChildTag("AdditionalProperties", "nsTypes", null);
        ap.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:PermissionSet");
        ap.addChildTag("FieldURI", "nsTypes", null).setAttribute("FieldURI", "folder:DisplayName");

        var parentFolder = makeParentFolderIds2("FolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        //exchWebService.commonFunctions.LOG(" ++ xml2jxon ++:"+this.parent.makeSoapMessage(req));

        //exchWebService.commonFunctions.LOG("erGetFolderPermissionRequest.execute:"+String(this.parent.makeSoapMessage(req)));
        this.parent.xml2jxon = true;
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;

    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        exchWebService.commonFunctions.LOG("erGetFolderPermissionRequest.onSendOk:" + String(aResp));
        // Get FolderID and ChangeKey
        var aError = false;
        var aCode = 0;
        var aMsg = "";
        var aResult = undefined;

        var rm = aResp.XPath("/s:Envelope/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']");
        var delegatees = [];
        var permissions = [];
        var folderID;
        var changeKey;
        var folderName;

        if (rm.length > 0) {
            var Folder = rm[0].XPath("/m:Folders/t:Folder");

            if (Folder.length > 0) {

                folderID = Folder[0].getAttributeByTag("t:FolderId", "Id");
                changeKey = Folder[0].getAttributeByTag("t:FolderId", "ChangeKey");
                folderName = Folder[0].getTagValue("t:DisplayName");

                //Get Permissions
                var permission = Folder[0].XPath("/t:PermissionSet/t:Permissions/t:Permission");

                for (var i = 0; i < permission.length; i++) {
                    var userId = permission[i].XPath("/t:UserId");
                    var email = userId[0].getTagValue("t:PrimarySmtpAddress");
                    var sid = userId[0].getTagValue("t:SID");
                    var displayName = userId[0].getTagValue("t:DisplayName");

                    if (email === undefined) {
                        displayName = userId[0].getTagValue("t:DistinguishedUser");
                        email = displayName;
                        sid = null;
                    }

                    var canCreateItems = permission[i].getTagValue("t:CanCreateItems");
                    var canCreateSubFolders = permission[i].getTagValue("t:CanCreateSubFolders");
                    var isFolderOwner = permission[i].getTagValue("t:IsFolderOwner");
                    var isFolderVisible = permission[i].getTagValue("t:IsFolderVisible");
                    var isFolderContact = permission[i].getTagValue("t:IsFolderContact");
                    var editItems = permission[i].getTagValue("t:EditItems");
                    var deleteItems = permission[i].getTagValue("t:DeleteItems");
                    var readItems = permission[i].getTagValue("t:ReadItems");
                    var permissionLevel = permission[i].getTagValue("t:PermissionLevel");


                    var perm = {
                        canCreateItems: canCreateItems,
                        canCreateSubFolders: canCreateSubFolders,
                        isFolderOwner: isFolderOwner,
                        isFolderVisible: isFolderVisible,
                        isFolderContact: isFolderContact,
                        editItems: editItems,
                        deleteItems: deleteItems,
                        readItems: readItems,
                        permissionLevel: permissionLevel,
                    };

                    var user = {
                        name: displayName,
                        emailId: email,
                        sid: sid,
                        permissionLevel: permissionLevel,
                        permissions: {
                            canCreateItems: canCreateItems,
                            canCreateSubFolders: canCreateSubFolders,
                            isFolderOwner: isFolderOwner,
                            isFolderVisible: isFolderVisible,
                            isFolderContact: isFolderContact,
                            editItems: editItems,
                            deleteItems: deleteItems,
                            readItems: readItems,
                        },
                    };

                    delegatees.push(user);
                    permissions.push(perm);
                    user = null;
                    perm = null;
                }



            }
            else {
                aMsg = "Did not find any Folder parts.";
                aCode = this.parent.ER_ERROR_FINDFOLDER_FOLDERID_DETAILS;
                aError = true;
            }

            Folder = null;
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
                this.mCbOk(this, folderID, changeKey, folderName, delegatees, permissions);
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
