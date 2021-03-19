/*
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is property of Ericsson. 
 * All Rights Reserved.
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");

Cu.import("resource://exchangecommon/erUpdateFolderPermission.js");
Cu.import("resource://exchangecommon/erFindInboxFolder.js");
Cu.import("resource://exchangecommon/erGetFolderPermission.js");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

function exchDelegateCalendarSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;
    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
    this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
        .getService(Ci.mivExchangeLoadBalancer);
    this.calId = null;
    this.calPrefs = null;
    this.delegatesList = [];
    this.folderName = "";

    this.folderId = null;
    this.changeKey = null;
}

exchDelegateCalendarSettings.prototype = {

    findAccountFromFolder: function _findAccountFromFolder(theFolder) {
        if (!theFolder)
            return null;
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
        var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
            .getService(Components.interfaces.nsIVersionComparator);
        var passwd = "";
        var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        var accounts = acctMgr.accounts;
        if (versionChecker.compare(appInfo.version, "20.0") >= 0) {
            for (var i = 0; i < accounts.length; i++) {
                var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);

                var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder  
                if (rootFolder.hasSubFolders) {
                    var subFolders = rootFolder.subFolders; // nsIMsgFolder  
                    while (subFolders.hasMoreElements()) {
                        if (theFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                            return account.QueryInterface(Components.interfaces.nsIMsgAccount);
                    }
                }

            }
        }
        else {
            for (let i = 0; i < accounts.Count(); i++) {
                let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);

                let rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder  
                if (rootFolder.hasSubFolders) {
                    let subFolders = rootFolder.subFolders; // nsIMsgFolder  
                    while (subFolders.hasMoreElements()) {
                        if (theFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                            return account.QueryInterface(Components.interfaces.nsIMsgAccount);
                    }
                }

            }
        }
        return null;
    },

    getCalendar: function _getCalendar() {
        let folder = window.arguments[0].folder;

        ///Get Selected Folder Account manager 
        var account = this.findAccountFromFolder(folder);
        var accountEmail = "";
        if (account == null) return;
        try {
            var identities = account.identities;
            for (var index = 0; index < identities.length; index++) {
                var identity = identities.queryElementAt(index, Ci.nsIMsgIdentity);
                accountEmail = identity.email;
                /*if (!this.name) {
                	dump("aclEntry: index:"+index+", identitie:"+identity+"\n");
                }*/
            }
        }
        catch (e) {}

        ///Get Calendar manager
        var calManager = Cc["@mozilla.org/calendar/manager;1"]
            .getService(Ci.calICalendarManager);
        var cals = calManager.getCalendars({});

        for (var i = 0; i < cals.length; i++) {
            var cal = cals[i];
            if (cal.mailbox == accountEmail) {
                this.calId = cal.id;
                break;
            }
        }
    },

    onLoad: function _onLoad() {
        this.getCalendar();
        if (this.calId != null) {
            try {
                this.calPrefs = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + this.calId + ".");
            }
            catch (e) {}
            this.refresh();
        }
        if (this.calId == null) {
            this._document.getElementById("delegationPanel").hidden = true;
            this._document.getElementById("fmessage").hidden = false;
        }
        else {
            this._document.getElementById("delegationPanel").hidden = false;
            this._document.getElementById("fmessage").hidden = true;
        }
    },

    getFolderPermissionOK: function _getFolderPermissionOK(erGetFolderPermissionRequest, folderID, changeKey, folderName, delegatee, perms) {

        this.folderId = folderID;
        this.changeKey = changeKey;
        if (delegatee.length > 0) {
            this.delegatesList = delegatee;
        }
        this.updateDelegateView();
    },

    removeDelegateCache: function _removeDelegateCache(email) {
        if (email) {
            for (var index = 0; index < this.delegatesList.length; index++) {
                if (email == this.delegatesList[index].emailId) {
                    this.delegatesList.splice(index, 1);
                }
            }
        }
    },

    addDelegateCache: function _addDelegateCache(delegate) {
        if (delegate) {
            var count = this.delegatesList.length;
            if (!count) {
                count = 0;
            }

            this.delegatesList[count] = delegate;
        }
    },

    getFolderPermissionError: function _getFolderPermissionError(erGetFolderPermissionRequest, aCode, aMsg) {
        this.globalFunctions.LOG("delegateFolder~getFolderPermissionError: aCode -  " + aCode + ", aMsg - " + aMsg);
    },

    erUpdateFolderPermissionRequestOK: function _erUpdateFolderPermissionRequestOK(erUpdateFolderPermissionRequest, folderId, changeKey) {
        this.folderId = folderId;
        this.changeKey = changeKey;
        this.globalFunctions.LOG("delegateFolder~erUpdateFolderPermissionRequestOK: Updated Sucessfully!");
        this.infoPopup(this._document.title, "Permission given for user.");
        this.refresh();
    },

    erUpdateFolderPermissionRequestError: function _erUpdateFolderPermissionRequestError(erUpdateFolderPermissionRequest, aCode, aMsg) {
        this.globalFunctions.LOG("delegateFolder~erUpdateFolderPermissionRequestError: aCode -  " + aCode + ", aMsg - " + aMsg);
        this.infoPopup(this._document.title, "Error:- " + aMsg + " (" + aCode + ")");
    },

    addSharedUser: function _addSharedUser() {},

    calendarEmail: function _calendarEmail() {
        return this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox");
    },

    emailDomain: function _emailDomain(email) {
        if (email) {
            return email.replace(/.*@/, "");;
        }
        return;

    },

    addToQueue: function _addToQueue(aRequest, aArgument, aCbOk, aCbError, aListener) {
        this.loadBalancer.addToQueue({
            calendar: this,
            ecRequest: aRequest,
            arguments: aArgument,
            cbOk: aCbOk,
            cbError: aCbError,
            listener: aListener
        });
    },

    getEmail: function _getEmail() {
        var email = this._document.getElementById("email").value;
        if (email) {
            var d1 = this.emailDomain(this.calendarEmail());
            var d2;
            var sValidEmail = /<(\S+@\S+\.\S+)>/;
            var reValidEmail = new RegExp(sValidEmail);
            var isEmail = null;
            try {
                isEmail = email.match(reValidEmail)[1];
                d2 = this.emailDomain(isEmail);
            }
            catch (e) {
                sValidEmail = /\S+@\S+\.\S+/;
                reValidEmail = new RegExp(sValidEmail);
                isEmail = email.match(reValidEmail)[0];
                d2 = this.emailDomain(isEmail);
            }
            finally {
                if (d1 == d2) {
                    return isEmail;
                }
                return;

            }
        }
        return;
    },

    validateEmail: function _validateEmail(textbox) {
        var email = textbox.value;
        if (email) {
            var d1 = this.emailDomain(this.calendarEmail());
            var d2;
            var sValidEmail = /<(\S+@\S+\.\S+)>/;
            var reValidEmail = new RegExp(sValidEmail);
            var isEmail = null;
            try {
                isEmail = email.match(reValidEmail)[1];
                d2 = this.emailDomain(isEmail);
            }
            catch (e) {
                sValidEmail = /\S+@\S+\.\S+/;
                reValidEmail = new RegExp(sValidEmail);
                isEmail = email.match(reValidEmail)[0];
                d2 = this.emailDomain(isEmail);
            }
            finally {
                if (d1 == d2) {
                    return isEmail;
                }
                return;

            }
        }
        return;
    },

    getDelegate: function _getDelegate() {
        var self = this;
        this.onActionLoad();
        //Get Folders in Inbox includes hidden
        var tmpObject = new erFindInboxFolderRequest({
                user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser"),
                mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox"),
                serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer"),
                folderBase: "msgfolderroot",
                folderPath: "",
                actionStart: Date.now()
            },
            function (erFindInboxFolderRequest, folders) {
                self.checkFolderPathOk(erFindInboxFolderRequest, folders);
            },
            function (erFindInboxFolderRequest, aCode, aMsg) {
                self.checkFolderPathError(erFindInboxFolderRequest, aCode, aMsg);
            },
            null);
        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    checkFolderPathOk: function _checkFolderPathOk(erFindInboxFolderRequest, folders) {
        var self = this;
        for (var i = 0; i < folders.length; i++) {
            if (folders[i].name == window.arguments[0].name) {
                this.folderId = folders[i].id;
                this.folderName = folders[i].name;
                this.changeKey = folders[i].changeKey;

                //Get Total users and permissions
                var tmpObject = new erGetFolderPermissionRequest({
                        user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser"),
                        mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox"),
                        serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer"),
                        folderID: this.folderId,
                        changeKey: this.changeKey,
                        actionStart: Date.now()
                    },
                    function (erGetFolderPermissionRequest, folderID, changeKey, folderName, delegatee, permissions) {
                        self.getFolderPermissionOK(erGetFolderPermissionRequest, folderID, changeKey, folderName, delegatee, permissions);
                    },
                    function (erGetFolderPermissionRequest, aCode, aMsg) {
                        self.getFolderPermissionError(erGetFolderPermissionRequest, aCode, aMsg);
                    },
                    null);
                break;
            }
        }
    },

    checkFolderPathError: function _checkFolderPathError(erFindInboxFolderRequest, aCode, aMsg) {
        this.globalFunctions.LOG("delegateFolder~checkFolderPathError: aCode -  " + aCode + ", aMsg - " + aMsg);
    },

    refresh: function _refresh() {
        this.getDelegate();
    },

    selectedUserEmail: function _selectedUserEmail() {
        try {
            var node = this._document.getElementById("delegatee").getSelectedItem(0);
            var childNodes = node.childNodes;
            var listName = childNodes[0].getAttribute("label");
            var regex = /[^()]+/g;
            var email = listName.match(regex);
            var listEmail = childNodes[0].getAttribute("value");
        }
        catch (e) {}

        return listEmail;
    },

    showUserPermission: function _resetUserPermission(aEmail) {
        if (!aEmail) {
            aEmail = this.selectedUserEmail();
        }
        if (!aEmail) {
            aEmail = this.getEmail();
        }

        if (!aEmail) {
            return;
        }

        for (var index = 0; index < this.delegatesList.length; index++) {
            if (this.delegatesList[index].emailId == aEmail) {
                this._document.getElementById('menuPermissionLevel').value = this.delegatesList[index].permissionLevel;
                this.updatePermissionDetails(this.delegatesList[index].permissions);
                break;
            }
        }
        this._window.sizeToContent();
    },

    updateDelegateView: function _updateDelegateView() {
        var listBox = this._document.getElementById("delegatee");
        this.emptyList(listBox);
        for (var index = 0; index < this.delegatesList.length; index++) {
            var row = this._document.createElement("listitem");
            var celluser = this._document.createElement("listcell");
            celluser.setAttribute("label", this.delegatesList[index].name + " (" + this.delegatesList[index].emailId + ")");
            celluser.setAttribute("value", this.delegatesList[index].emailId);
            row.appendChild(celluser);
            var cellperm = this._document.createElement("listcell");
            cellperm.setAttribute("label", this.delegatesList[index].permissionLevel);
            cellperm.setAttribute("value", this.delegatesList[index].permissionLevel);
            row.appendChild(cellperm);
            listBox.appendChild(row);
        }
        this.updatePermissionDetails(this.delegatesList[index].permissions)
    },

    getCustomPermissions: function _getCustomPermissions() {
        try {
            var cancreateitems = this._document.getElementById("cancreateitems").value;
            var cancreatesubfolders = this._document.getElementById("cancreatesubfolders").value;
            var isfolderowner = this._document.getElementById("isfolderowner").value;
            var isfoldervisible = this._document.getElementById("isfoldervisible").value;
            var isfoldercontact = this._document.getElementById("isfoldercontact").value;
            var edititems = this._document.getElementById("edititems").value;
            var deleteitems = this._document.getElementById("deleteitems").value;
            var readitems = this._document.getElementById("readitems").value;
        }
        catch (e) {}
        return {
            "canCreateItems": cancreateitems,
            "canCreateSubFolders": cancreatesubfolders,
            "isFolderOwner": isfolderowner,
            "isFolderVisible": isfoldervisible,
            "isFolderContact": isfoldercontact,
            "editItems": edititems,
            "deleteItems": deleteitems,
            "readItems": readitems
        };
    },

    removeDelegate: function _removeDelegate() {
        var self = this;
        this.onActionLoad();
        var email = this.selectedUserEmail();
        if (!email) {
            email = this.getEmail();
        }
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var existing = false;

            var newDelegatesList = this.cloneList();
            for (var i = 0; i < this.delegatesList.length; i++) {
                if (this.delegatesList[i].emailId) {
                    if (email == this.delegatesList[i].emailId) {
                        existing = true;
                        newDelegatesList.splice(i, 1);
                        continue;
                    }
                }
            }

            var tmpObject = new erUpdateFolderPermissionRequest({
                    permissionSet: newDelegatesList,
                    folderId: this.folderId,
                    changeKey: this.changeKey,
                    mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer"),
                },
                function (erUpdateFolderPermissionRequest, folderId, changeKey) {
                    self.erUpdateFolderPermissionRequestOK(erUpdateFolderPermissionRequest, folderId, changeKey)
                },
                function (erUpdateFolderPermissionRequest, aCode, aMsg) {
                    self.erUpdateFolderPermissionRequestError(erUpdateFolderPermissionRequest, aCode, aMsg)
                },
                null);

        }
        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    onActionLoad: function _onActionLoad() {
        this._window.sizeToContent();
        this._document.getElementById("delegateCalendaractionadd").setAttribute("disabled", "true");
        this._document.getElementById("delegateCalendaractionupdate").setAttribute("disabled", "true");
        this._document.getElementById("delegateCalendaractiondelete").setAttribute("disabled", "true");
    },

    onActionLoadEnd: function _onActionLoadEnd() {
        this._window.sizeToContent();
        this._document.getElementById("delegateCalendaractionadd").removeAttribute("disabled");
        this._document.getElementById("delegateCalendaractionupdate").removeAttribute("disabled");
        this._document.getElementById("delegateCalendaractiondelete").removeAttribute("disabled");
    },

    emptyList: function emptyList(listId) {
        var myListBox = listId;
        var countrow = myListBox.itemCount;
        while (countrow-- > 0) {
            myListBox.removeItemAt(0);
        }
    },

    addDelegate: function _addDelegate() {
        var self = this;

        this.onActionLoad();
        var email = this.getEmail();
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var existing = false;
            var newDelegatesList = this.cloneList();

            for (var i = 0; i < this.delegatesList.length; i++) {
                if (this.delegatesList[i].emailId) {
                    if (email == this.delegatesList[i].emailId) {
                        existing = true;
                        continue;
                    }
                }
            }

            if (existing != true) {
                var len = newDelegatesList.length;
                newDelegatesList[len] = {
                    "emailId": email,
                    "permissionLevel": this._document.getElementById('menuPermissionLevel').selectedItem.value,
                    "sid": "",
                    "permissions": {}
                };

                newDelegatesList[len].permissionLevel = this._document.getElementById('menuPermissionLevel').selectedItem.value;

                if (newDelegatesList[len].permissionLevel == "Custom") {
                    newDelegatesList[len].permissions = this.getCustomPermissions();
                }
                existing = null;
            }
            else {
                this._window.alert('Already added! do Update');
                this.onActionLoadEnd();
                this._window.sizeToContent();
                return;
            }

            var tmpObject = new erUpdateFolderPermissionRequest({
                    permissionSet: newDelegatesList,
                    folderId: this.folderId,
                    changeKey: this.changeKey,
                    mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer"),
                },
                function (erUpdateFolderPermissionRequest, folderId, changeKey) {
                    self.erUpdateFolderPermissionRequestOK(erUpdateFolderPermissionRequest, folderId, changeKey)
                },
                function (erUpdateFolderPermissionRequest, aCode, aMsg) {
                    self.erUpdateFolderPermissionRequestError(erUpdateFolderPermissionRequest, aCode, aMsg)
                },
                null);

        }
        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    cloneList: function _cloneList() {
        return this.delegatesList.slice(0);
    },

    setPermissionCustom: function _setPermissionCustom() {
        this._document.getElementById('menuPermissionLevel').value = "Custom";
    },

    updateDelegate: function _updateDelegate() {
        var self = this;
        this.onActionLoad();
        var email = this.selectedUserEmail();
        if (!email) {
            email = this.getEmail();
        }
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var permissionSet = [];
            var existing = false;
            var newDelegatesList = this.cloneList();
            for (var i = 0; i < this.delegatesList.length; i++) {
                if (this.delegatesList[i].emailId) {
                    if (email == this.delegatesList[i].emailId) {
                        existing = true;
                        newDelegatesList[i].permissionLevel = this._document.getElementById('menuPermissionLevel').selectedItem.value;

                        if (newDelegatesList[i].permissionLevel == "Custom") {
                            newDelegatesList[i].permissions = this.getCustomPermissions();
                        }

                        continue;
                    }
                }
            }

            if (existing != true) {
                /* permissionSet.push({"primarysmtpaddress":this.getEmail(),
	   				 	"permissionlevel":this._document.getElementById('menuPermissionLevel').selectedItem.value});
    				*/
                existing = null;
                this._window.alert('Already not added! do add');
                this.onActionLoadEnd();
                this._window.sizeToContent();
                return;
            }

            var tmpObject = new erUpdateFolderPermissionRequest({
                    permissionSet: newDelegatesList,
                    folderId: this.folderId,
                    changeKey: this.changeKey,
                    mailbox: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(this.calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(this.calPrefs, "ecServer"),
                },
                function (erUpdateFolderPermissionRequest, folderId, changeKey) {
                    self.erUpdateFolderPermissionRequestOK(erUpdateFolderPermissionRequest, folderId, changeKey)
                },
                function (erUpdateFolderPermissionRequest, aCode, aMsg) {
                    self.erUpdateFolderPermissionRequestError(erUpdateFolderPermissionRequest, aCode, aMsg)
                },
                null);

        }

        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    permissionsSelectEvent: function _permissionsSelectEvent(selectedValue) {
        if (!selectedValue) return;
        switch (selectedValue) {
        case "Author":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "Owned",
                "deleteItems": "Owned",
                "readItems": "FullDetails"
            });
            break;
        case "Editor":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "All",
                "deleteItems": "All",
                "readItems": "FullDetails"
            });
            break;
        case "Reviewer":
            this.updatePermissionDetails({
                "canCreateItems": false,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "None",
                "deleteItems": "None",
                "readItems": "FullDetails"
            });
            break;
        case "None":
            this.updatePermissionDetails({
                "canCreateItems": false,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": false,
                "isFolderContact": false,
                "editItems": "None",
                "deleteItems": "None",
                "readItems": "None"
            });
            break;
        case "Owner":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": true,
                "isFolderOwner": true,
                "isFolderVisible": true,
                "isFolderContact": true,
                "editItems": "All",
                "deleteItems": "All",
                "readItems": "FullDetails"
            });
            break;
        case "PublishingEditor":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": true,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "All",
                "deleteItems": "All",
                "readItems": "FullDetails"
            });
            break;
        case "PublishingAuthor":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": true,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "Owned",
                "deleteItems": "Owned",
                "readItems": "FullDetails"
            });
            break;
        case "NoneditingAuthor":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "None",
                "deleteItems": "Owned",
                "readItems": "FullDetails"
            });
            break;
        case "Contributor":
            this.updatePermissionDetails({
                "canCreateItems": true,
                "canCreateSubFolders": false,
                "isFolderOwner": false,
                "isFolderVisible": true,
                "isFolderContact": false,
                "editItems": "None",
                "deleteItems": "None",
                "readItems": "None"
            });
            break;
        default:
        }
    },

    updatePermissionDetails: function _updatePermissionDetails(aPermission) {
        if (!aPermission) {
            return;
        }
        this._document.getElementById("cancreateitems").value = aPermission.canCreateItems;
        this._document.getElementById("cancreatesubfolders").value = aPermission.canCreateSubFolders;
        this._document.getElementById("isfolderowner").value = aPermission.isFolderOwner;
        this._document.getElementById("isfoldervisible").value = aPermission.isFolderVisible;
        this._document.getElementById("isfoldercontact").value = aPermission.isFolderContact;
        this._document.getElementById("edititems").value = aPermission.editItems;
        this._document.getElementById("deleteitems").value = aPermission.deleteItems;
        this._document.getElementById("readitems").value = aPermission.readItems;
    },

    doCancel: function _doCancel() {
        this._window.sizeToContent();
        this._window.close();
    },

    infoPopup: function _infoPopup(title, msg) {
        var image = "chrome://exchangecommon-common/skin/images/notify-icon.png";
        var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
        getService(Components.interfaces.nsIWindowWatcher).
        openWindow(null, 'chrome://global/content/alerts/alert.xul',
            '_blank', 'chrome,titlebar=no,popup=yes', null);
        win.arguments = [image, title, msg, true, ''];
    },
};


var tmpDelegateFolderSettings = new exchDelegateCalendarSettings(document, window);
window.addEventListener("load", function () {
    document.getElementById("folderPropertiesDialog").addEventListener("load", tmpDelegateFolderSettings.onLoad(), false);
}, false);
