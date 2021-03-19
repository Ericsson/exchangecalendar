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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://exchangecommon/ecExchangeRequest.js");

function exchWebService_permissionsPropertiesView(aProperties) {

    this.properties = aProperties;

};

exchWebService_permissionsPropertiesView.prototype = {

    treeBox: null,

    get rowCount() {
        return this.properties.length;
    },
    setTree: function (treeBox) {
        this.treeBox = treeBox;
    },

    getCellText: function (idx, column) {
        switch (column.id) {
        case "exchWebService_permissonTree_userId":
            if (this.properties[idx].UserId) {
                if (this.properties[idx].UserId.DistinguishedUser) {
                    return this.properties[idx].UserId.DistinguishedUser;
                }
                if (this.properties[idx].UserId.DisplayName) {
                    return this.properties[idx].UserId.DisplayName;
                }
            }

            return "Unknown";

            break;
        case "exchWebService_permissonTree_email":
            if (this.properties[idx].UserId) {
                if (this.properties[idx].UserId.PrimarySmtpAddress) {
                    return this.properties[idx].UserId.PrimarySmtpAddress;
                }
            }

            return "";

            break;
        }
        return "";
    },

    isContainer: function (idx) {
        return false;
    },
    isContainerOpen: function (idx) {
        return false;
    },
    isContainerEmpty: function (idx) {
        return false;
    },
    isSeparator: function (idx) {
        return false;
    },
    isSorted: function () {
        return false;
    },
    isEditable: function (idx, column) {
        return false;
    },

    getParentIndex: function _getParentIndex(idx) {
        return -1;
    },

    getLevel: function _getLevel(idx) {
        return 0;
    },

    hasNextSibling: function _hasNextSibling(idx, after) {
        if (idx < this.properties.length - 1) return true;

        return false;
    },

    openFolder: function (idx) {},

    toggleOpenState: function _toggleOpenState(idx) {},

    getImageSrc: function (idx, column) {},

    getProgressMode: function (idx, column) {},
    getCellValue: function (idx, column) {},
    cycleHeader: function (col, elem) {},
    selectionChanged: function () {},
    cycleCell: function (idx, column) {},
    performAction: function (action) {},
    performActionOnCell: function (action, index, column) {},
    getRowProperties: function (idx, prop) {},
    getCellProperties: function (idx, column, prop) {},
    getColumnProperties: function (column, element, prop) {},

    getPermissions: function _getPermissions(aIndex) {
        return this.properties[aIndex];
    },

};

function exchExchangeSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchExchangeSettings.prototype = {

    permissionsPropertiesTreeView: null,

    doOnSelectUserId: function _doOnSelectUserId(aTree) {
        var treeIndex = aTree.currentIndex;

        var permissions = this.permissionsPropertiesTreeView.getPermissions(treeIndex);

        if (permissions) {
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-CanCreateItems").value = permissions.CanCreateItems;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-CanCreateSubFolders").value = permissions.CanCreateSubFolders;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-IsFolderOwner").value = permissions.IsFolderOwner;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-IsFolderVisible").value = permissions.IsFolderVisible;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-IsFolderContact").value = permissions.IsFolderContact;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-EditItems").value = permissions.EditItems;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-DeleteItems").value = permissions.DeleteItems;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-ReadItems").value = permissions.ReadItems;
            this._document.getElementById("exchWebServices-UserId-EffectiveRights-CalendarPermissionLevel").value = permissions.CalendarPermissionLevel;
        }
    },

    checkRequired: function _checkRequired() {
        let canAdvance = true;
        let vbox = this._document.getElementById('exchWebService-exchange-settings');
        if (vbox) {
            let eList = vbox.getElementsByAttribute('required', 'true');
            for (let i = 0; i < eList.length && canAdvance; ++i) {
                canAdvance = (eList[i].value != "");
            }

            if (canAdvance) {
                this._document.getElementById("exchWebService_ExchangeSettings_dialog").buttons = "accept,cancel";
            }
            else {
                this._document.getElementById("exchWebService_ExchangeSettings_dialog").buttons = "cancel";
            }
        }

        this._window.sizeToContent();

    },

    permissionObject: function _permissionObject(aPermission) {
        for each(var item in aPermission.XPath('/*')) {
            if (item.tagName == "UserId") {
                for each(var userProp in item.XPath('/*')) {
                    if (!this[item.tagName]) {
                        this[item.tagName] = {};
                    }
                    this[item.tagName][userProp.tagName] = userProp.value;
                }
            }
            else {
                this[item.tagName] = item.value;
            }
        }
    },

    showFolderProprties: function _showFolderProprties(aProperties) {
        this.globalFunctions.LOG("showFolderProprties:" + aProperties.toString());
        var serverVersionInfo = aProperties.XPath('/s:Header/ServerVersionInfo')[0];
        this._document.getElementById("exchWebServices-ServerVersionInfo").value = serverVersionInfo.getAttribute('Version') + " (" + serverVersionInfo.getAttribute('MajorVersion') + "." + serverVersionInfo.getAttribute('MinorVersion') + "." + serverVersionInfo.getAttribute('MajorBuildNumber') + "." + serverVersionInfo.getAttribute('MinorBuildNumber') + ")";

        var propType = "calendar";
        var calendarFolder = aProperties.XPath('/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage/m:Folders/t:CalendarFolder');
        if (calendarFolder.length > 0) {
            var calendarFolder = calendarFolder[0];
            var calendarPermissions = calendarFolder.XPath('/t:PermissionSet/t:CalendarPermissions/t:CalendarPermission');
        }
        else {
            var calendarFolder = aProperties.XPath('/s:Body/m:GetFolderResponse/m:ResponseMessages/m:GetFolderResponseMessage/m:Folders/t:TasksFolder')[0];
            var calendarPermissions = calendarFolder.XPath('/t:PermissionSet/*/t:Permission');
            propType = "task";
        }

        this._document.getElementById("exchWebServices-CalendarFolder-DisplayName").value = calendarFolder.getTagValue('t:DisplayName');
        this._document.getElementById("exchWebServices-CalendarFolder-TotalCount").value = calendarFolder.getTagValue('t:TotalCount');
        this._document.getElementById("exchWebServices-CalendarFolder-ChildFolderCount").value = calendarFolder.getTagValue('t:ChildFolderCount');

        var effectiveRights = calendarFolder.XPath('t:EffectiveRights')[0];
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-CreateAssociated").value = effectiveRights.getTagValue('t:CreateAssociated');
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-CreateContents").value = effectiveRights.getTagValue('t:CreateContents');
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-CreateHierarchy").value = effectiveRights.getTagValue('t:CreateHierarchy');
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-Delete").value = effectiveRights.getTagValue('t:Delete');
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-Modify").value = effectiveRights.getTagValue('t:Modify');
        this._document.getElementById("exchWebServices-CalendarFolder-EffectiveRights-Read").value = effectiveRights.getTagValue('t:Read');

        // PermissionSet
        var permissions = new Array;
        for each(var permission in calendarPermissions) {
            permissions.push(new this.permissionObject(permission));
        }

        try {
            this.permissionsPropertiesTreeView = new exchWebService_permissionsPropertiesView(permissions);
        }
        catch (err) {
            this.globalFunctions.LOG("ERROR:" + err);
        }

        this._document.getElementById('exchWebServicesPermissionsTree').treeBoxObject.view = this.permissionsPropertiesTreeView;
    },

    onLoad: function _onLoad() {
        var calId = this._window.arguments[0].calendar.id;
        this._document.getElementById("exchWebService_ExchangeSettings-title").value = this._window.arguments[0].calendar.name;
        tmpSettingsOverlay.exchWebServicesLoadExchangeSettingsByCalId(calId);

        // Load meeting request settings.
        var exchWebServicesCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");
        this._document.getElementById("exchWebService-poll-calendar-interval").value = this.globalFunctions.safeGetIntPref(exchWebServicesCalPrefs, "ecCalendarPollInterval", 60);
        this._document.getElementById("exchWebService-autoprocessingproperties-deletecancelleditems").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecautoprocessingdeletecancelleditems", true);
        this._document.getElementById("exchWebService-autoprocessingproperties-markeventtentative").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecautoprocessingmarkeventtentative", false);

        this._document.getElementById("exchWebService-syncMailItems-Interval").value = this.globalFunctions.safeGetIntPref(exchWebServicesCalPrefs, "syncMailItems.Interval", 15);
        this._document.getElementById("exchWebService-syncMailItems-active").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "mailsync.active", false);
        this._document.getElementById("exchWebService-followup-deactivtate").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "followup.task.deactivate", false);


        if (this.globalFunctions.safeGetCharPref(exchWebServicesCalPrefs, "ecFolderbase", "") == "calendar") {
            this._document.getElementById("exchWebService-mail-properties-calendar").hidden = false;
            this._document.getElementById("exchWebService-mail-properties-task").hidden = true;
        }
        else {
            this._document.getElementById("exchWebService-mail-properties-calendar").hidden = true;
            this._document.getElementById("exchWebService-mail-properties-task").hidden = false;
        }

        /*
        		this._document.getElementById("exchWebService-poll-inbox").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecPollInbox", true);
        		this._document.getElementById("exchWebService-poll-inbox-interval").value = this.globalFunctions.safeGetIntPref(exchWebServicesCalPrefs, "ecPollInboxInterval", 180);
        		this._document.getElementById("exchWebService-autorespond-meetingrequest").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecAutoRespondMeetingRequest", false); 
        		this._document.getElementById("exchWebService-autorespond-answer").value = this.globalFunctions.safeGetCharPref(exchWebServicesCalPrefs, "ecAutoRespondAnswer", "TENTATIVE"); 

        		this._document.getElementById("exchWebService-autoremove-invitation_cancellation1").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecAutoRemoveInvitationCancellation1", false); 
        		this._document.getElementById("exchWebService-autoremove-invitation_cancellation2").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecAutoRemoveInvitationCancellation2", false); 

        		this._document.getElementById("exchWebService-autoremove-invitation_response1").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecAutoRemoveInvitationResponse1", true); 

        		this._document.getElementById("exchWebService-doautorespond-meetingrequest-message").checked = this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecSendAutoRespondMeetingRequestMessage", false); 
        		this._document.getElementById("exchWebService-autorespond-meetingrequest-message").value = this.globalFunctions.safeGetCharPref(exchWebServicesCalPrefs, "ecAutoRespondMeetingRequestMessage", ""); 
        */
        this.checkFolderSettings();

        this._document.getElementById("exchWebService_folderbaserow").hidden = (tmpSettingsOverlay.exchWebServicesgFolderIdOfShare != "");
        this._document.getElementById("exchWebService_folderpathrow").hidden = (tmpSettingsOverlay.exchWebServicesgFolderIdOfShare != "");
        this._document.getElementById("exchWebServices-SharedFolderID").hidden = true;

        if (this._window.arguments[0].calendar.getProperty("exchWebService.getFolderProperties")) {
            var folderProperties = Cc["@1st-setup.nl/conversion/xml2jxon;1"]
                .createInstance(Ci.mivIxml2jxon);
            folderProperties.processXMLString(this._window.arguments[0].calendar.getProperty("exchWebService.getFolderProperties"), 0, null);
            this.showFolderProprties(folderProperties);
        }
        else {
            this._document.getElementById("exchWebService-folderproperties-xml").value = "not found";
            this._document.getElementById("exchWebService_folderbaserow").hidden = true;
            this._document.getElementById("exchWebService_folderpathrow").hidden = true;
            this._document.getElementById("exchWebServices-UserAvailability").hidden = false;
        }

        if (this._window) {
            this._window.sizeToContent();
        }
    },

    onSave: function _onSave() {
        var calId = this._window.arguments[0].calendar.id;
        var aCalendar = this._window.arguments[0].calendar;
        tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByCalId(calId);

        // Save meeting request settings.
        var exchWebServicesCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

        this.checkFolderSettings();

        if (this._document.getElementById("exchWebService-autoprocessingproperties-deletecancelleditems").checked != this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecautoprocessingdeletecancelleditems", null)) {
            exchWebServicesCalPrefs.setBoolPref("ecautoprocessingdeletecancelleditems", this._document.getElementById("exchWebService-autoprocessingproperties-deletecancelleditems").checked);
        }
        if (this._document.getElementById("exchWebService-autoprocessingproperties-markeventtentative").checked != this.globalFunctions.safeGetBoolPref(exchWebServicesCalPrefs, "ecautoprocessingmarkeventtentative", null)) {
            exchWebServicesCalPrefs.setBoolPref("ecautoprocessingmarkeventtentative", this._document.getElementById("exchWebService-autoprocessingproperties-markeventtentative").checked);
        }

        this.doAutoProcessing();

        if (this.globalFunctions.safeGetCharPref(exchWebServicesCalPrefs, "ecFolderbase", "") == "calendar") {
            exchWebServicesCalPrefs.setIntPref("syncMailItems.Interval", this._document.getElementById("exchWebService-syncMailItems-Interval").value);
            exchWebServicesCalPrefs.setBoolPref("mailsync.active", this._document.getElementById("exchWebService-syncMailItems-active").checked);
        }
        else {
            //Add items  releted to Task here these will be taken only when task calendar changes
            exchWebServicesCalPrefs.setBoolPref("followup.task.deactivate", this._document.getElementById("exchWebService-followup-deactivtate").checked);
        }

        //exchWebServicesCalPrefs.setBoolPref("ecPollInbox", this._document.getElementById("exchWebService-poll-inbox").checked); 

        exchWebServicesCalPrefs.setIntPref("ecCalendarPollInterval", this._document.getElementById("exchWebService-poll-calendar-interval").value);
        //exchWebServicesCalPrefs.setIntPref("ecPollInboxInterval", this._document.getElementById("exchWebService-poll-inbox-interval").value); 
        //exchWebServicesCalPrefs.setBoolPref("ecAutoRespondMeetingRequest", this._document.getElementById("exchWebService-autorespond-meetingrequest").checked); 
        //exchWebServicesCalPrefs.setCharPref("ecAutoRespondAnswer", this._document.getElementById("exchWebService-autorespond-answer").value); 

        //exchWebServicesCalPrefs.setBoolPref("ecAutoRemoveInvitationCancellation1", this._document.getElementById("exchWebService-autoremove-invitation_cancellation1").checked); 
        //exchWebServicesCalPrefs.setBoolPref("ecAutoRemoveInvitationCancellation2", this._document.getElementById("exchWebService-autoremove-invitation_cancellation2").checked); 

        //exchWebServicesCalPrefs.setBoolPref("ecAutoRemoveInvitationResponse1", this._document.getElementById("exchWebService-autoremove-invitation_response1").checked); 

        //exchWebServicesCalPrefs.setBoolPref("ecSendAutoRespondMeetingRequestMessage", this._document.getElementById("exchWebService-doautorespond-meetingrequest-message").checked); 
        //exchWebServicesCalPrefs.setCharPref("ecAutoRespondMeetingRequestMessage", this._document.getElementById("exchWebService-autorespond-meetingrequest-message").value); 

        this._window.arguments[0].answer = "saved";

        var observerService = Cc["@mozilla.org/observer-service;1"]
            .getService(Ci.nsIObserverService);

        observerService.notifyObservers(this, "onCalReset", calId);

        Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService).savePrefFile(null);
        return true;
    },

    checkFolderSettings: function _checkFolderSettings() {
        /*		if ((this._document.getElementById("exchWebService_folderbase").value != "calendar") ||
        		    (this._document.getElementById("exchWebService_folderpath").value != "/") ||
        		    (!this._window.arguments[0].calendar.getProperty("exchWebService.getFolderProperties"))) {
        			// Disable inbox polling.
        			this._document.getElementById("exchWebService-poll-inbox").checked = false;
        			this._document.getElementById("vbox-exchWebService-meetingrequestsettings").hidden = true;
        			this._document.getElementById("vbox-exchWebService-nomeetingrequestsettings").hidden = false;
        		}
        		else {
        			this._document.getElementById("vbox-exchWebService-meetingrequestsettings").hidden = false;
        			this._document.getElementById("vbox-exchWebService-nomeetingrequestsettings").hidden = true;
        		}

        		this._document.getElementById("exchWebService-poll-inbox-interval").disabled = (!this._document.getElementById("exchWebService-poll-inbox").checked);

        		this._document.getElementById("exchWebService-autorespond-answer").disabled = (!this._document.getElementById("exchWebService-autorespond-meetingrequest").checked);
        		this._document.getElementById("exchWebService-doautorespond-meetingrequest-message").disabled = (!this._document.getElementById("exchWebService-autorespond-meetingrequest").checked);
        		this._document.getElementById("exchWebService-autorespond-meetingrequest-message").disabled = (!this._document.getElementById("exchWebService-autorespond-meetingrequest").checked);
        */
        this._window.sizeToContent();
    },

    doAutoProcessing: function _doAutoProcessing() {
        this._window.sizeToContent();
    },

    doTabChanged: function _doTabChanged(aTabs) {
        this.checkFolderSettings();
    },

    doPollInboxChanged: function _doPollInboxChanged(aCheckbox) {
        this.checkFolderSettings();
    },

    doAutoRespondChanged: function doAutoRespondChanged(aCheckbox) {
        this.checkFolderSettings();
    },

}

var tmpExchangeSettings = new exchExchangeSettings(document, window);
