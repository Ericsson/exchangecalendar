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

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/erAutoDiscover.js");
Cu.import("resource://exchangecommon/erPrimarySMTPCheck.js");
Cu.import("resource://exchangecommon/erGetFolder.js");

if (!exchWebService) var exchWebService = {};

exchWebService.manageEWSAccounts = {

    _detailsChecked: false,
    _detailsChanged: false,
    selectedAccount: {},

    accountManager: Cc["@1st-setup.nl/exchange/accountmanager;1"]
        .getService(Ci.mivExchangeAccountManager),

    globalFunctions: Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions),

    set detailsChecked(aValue) {
        this._detailsChecked = aValue;

        this.checkRequired();
    },

    set detailsChanged(aValue) {
        this._detailsChanged = aValue;
        if (aValue) {
            document.getElementById("exchWebService_manageEWSAccounts_save_button").hidden = false;
        }
        else {
            document.getElementById("exchWebService_manageEWSAccounts_save_button").hidden = true;
        }
    },

    detailsOk: false,

    checkRequired: function _checkRequired() {
        let canAdvance = true;
        let vbox = document.getElementById('exchWebService-account-settings');
        if (vbox) {
            let eList = vbox.getElementsByAttribute('required', 'true');
            for (let i = 0; i < eList.length && canAdvance; ++i) {

                if (!eList[i].hidden) {
                    canAdvance = (eList[i].value != "");
                }
            }

            if (canAdvance) {
                if (document.getElementById("exchWebService_autodiscover").checked) {
                    document.getElementById("exchWebService_autodiscovercheckbutton").hidden = false;
                    document.getElementById("exchWebService_servercheckbutton").hidden = true;
                }
                else {
                    document.getElementById("exchWebService_autodiscovercheckbutton").hidden = true;
                    document.getElementById("exchWebService_servercheckbutton").hidden = false;
                }
            }
            else {
                document.getElementById("exchWebService_autodiscovercheckbutton").hidden = true;
                document.getElementById("exchWebService_servercheckbutton").hidden = true;
            }
        }

        if (window) {
            window.sizeToContent();
        }
    },

    logInfo: function _logInfo(aMsg) {
        this.globalFunctions.LOG(aMsg);
    },

    onLoad: function _onLoad() {
        // Load the exchWebService_manageEWSAccounts_accounts_listbox
        var listbox = document.getElementById("exchWebService-manageEWSAccounts-accounts-listbox");
        if (listbox) {
            while (listbox.itemCount > 0) {
                listbox.removeItemAt(0);
            }
        }

        var accounts = this.accountManager.getAccounts();

        for (var index in accounts) {
            if (listbox) {
                var newItem = listbox.appendItem(accounts[index].name.value, accounts[index].id);
            }
        }
    },

    showDetails: function _showDetails(aAccount) {
        document.getElementById("exchWebService_autodiscover").disabled = false;

        document.getElementById("exchWebService_manageEWSAccounts_account_name").value = aAccount.name.value;
        document.getElementById("exchWebService_manageEWSAccounts_account_name").disabled = false;

        document.getElementById("exchWebService_server").value = aAccount.server.value;
        document.getElementById("exchWebService_server").disabled = false;

        document.getElementById("exchWebService_mailbox").value = aAccount.mailbox.value;
        document.getElementById("exchWebService_mailbox").disabled = false;

        document.getElementById("exchWebService_windowsuser").value = aAccount.user.value;
        document.getElementById("exchWebService_windowsuser").disabled = false;
    },

    disableDetails: function _showDetails(aAccount) {
        document.getElementById("exchWebService_autodiscover").disabled = true;

        document.getElementById("exchWebService_manageEWSAccounts_account_name").value = "";
        document.getElementById("exchWebService_manageEWSAccounts_account_name").disabled = true;

        document.getElementById("exchWebService_server").value = "";
        document.getElementById("exchWebService_server").disabled = true;

        document.getElementById("exchWebService_mailbox").value = "";
        document.getElementById("exchWebService_mailbox").disabled = true;

        document.getElementById("exchWebService_windowsuser").value = "";
        document.getElementById("exchWebService_windowsuser").disabled = true;

        this.detailsChanged = false;
        this.detailsChecked = true;
    },

    onSelect: function _onSelect() {
        var item = document.getElementById("exchWebService-manageEWSAccounts-accounts-listbox").selectedItem;

        this.selectedAccount = {};
        if (item == null) {
            this.disableDetails();
            document.getElementById("exchWebService_manageEWSAccounts_removeAccount_button").disabled = true;
            return;
        }

        var tmpResult = this.accountManager.getAccountById(item.value);

        if (!tmpResult.result) return;
        this.selectedAccount = tmpResult.account;

        this.showDetails(this.selectedAccount);

        document.getElementById("exchWebService_server_status").status = 0;
        document.getElementById("exchWebService_mailbox_status").status = 0;

        document.getElementById("exchWebService_manageEWSAccounts_removeAccount_button").disabled = false;
    },

    onClose: function _onClose() {
        return true;
    },

    addNewAccount: function _addNewAccount() {
        this.selectedAccount = {
            id: this.globalFunctions.getUUID(),
            name: {
                type: "string",
                value: "new Account"
            },
            server: {
                type: "string",
                value: ""
            },
            user: {
                type: "string",
                value: ""
            },
            mailbox: {
                type: "string",
                value: ""
            }
        };
        this.accountManager.saveAccount(this.selectedAccount);
        var listbox = document.getElementById("exchWebService-manageEWSAccounts-accounts-listbox");
        if (listbox) {
            var newItem = listbox.appendItem(this.selectedAccount.name.value, this.selectedAccount.id);
            listbox.selectedItem = newItem;
        }
    },

    removeAccount: function _removeAccount() {
        this.accountManager.removeAccount(this.selectedAccount);

        var listbox = document.getElementById("exchWebService-manageEWSAccounts-accounts-listbox");
        if (listbox) {
            var oldIndex = listbox.selectedIndex;
            listbox.selectedIndex = -1;
            listbox.removeItemAt(oldIndex);

            if (listbox.itemCount == 0) {
                this.disableDetails();
                document.getElementById("exchWebService_manageEWSAccounts_removeAccount_button").disabled = true;
            }
            else {
                if (oldIndex == listbox.itemCount) {
                    oldIndex--;
                }
                listbox.selectedIndex = oldIndex;
            }
        }

    },

    saveAccount: function _saveAccount() {
        this.detailsChanged = false;
        this.accountManager.saveAccount(this.selectedAccount);
        document.getElementById("exchWebService-manageEWSAccounts-accounts-listbox").selectedItem.label = this.selectedAccount.name.value;
    },

    doAutodiscoverChanged: function _doAutodiscoverChanged(aCheckBox) {
        if (aCheckBox.checked) {
            document.getElementById("exchWebService_mailboxrow").hidden = false;
            document.getElementById("exchWebService_mailboxrow").setAttribute("required", "true");
            document.getElementById("exchWebService_serverrow").hidden = true;
        }
        else {
            document.getElementById("exchWebService_mailboxrow").hidden = true;
            document.getElementById("exchWebService_mailboxrow").setAttribute("required", "false");
            document.getElementById("exchWebService_serverrow").hidden = false;
        }
        this.detailsChecked = false;
    },

    doNameChanged: function _doNameChanged(aTextBox) {
        this.detailsChanged = true;
        this.selectedAccount.name.value = aTextBox.value;
    },

    doServerChanged: function _doServerChanged(aTextBox) {
        document.getElementById("exchWebService_server_status").status = 0;
        this.detailsChecked = false;
        this.selectedAccount.server.value = aTextBox.value;
        if (aTextBox.value != "") {
            var serverExists = this.accountManager.getAccountByServer(this.selectedAccount.server.value);
            if ((serverExists != null) && (serverExists.id != this.selectedAccount.id)) {
                // We allready have an account with the same server. warn and remove save button.
                this.detailsChanged = false;
                return;
            }
        }
        this.detailsChanged = true;
    },

    doMailboxChanged: function _doMailboxChanged(aTextBox) {
        document.getElementById("exchWebService_mailbox_status").status = 0;
        this.detailsChecked = false;
        this.detailsChanged = true;
        this.selectedAccount.mailbox.value = aTextBox.value;
    },

    doUserChanged: function _doUserChanged(aTextBox) {
        this.detailsChecked = false;
        this.detailsChanged = true;
        this.selectedAccount.user.value = aTextBox.value;
    },

    doAutodiscoverCheck: function _doAutodiscoverCheck() {
        document.getElementById("exchWebService_autodiscovercheckbutton").disabled = true;

        try {
            window.setCursor("wait");
            var user = document.getElementById("exchWebService_windowsuser").value;
            var mailbox = document.getElementById("exchWebService_mailbox").value;
            var tmpObject = new erAutoDiscoverRequest({
                    user: user,
                    mailbox: mailbox
                },
                this.autodiscoveryOK,
                this.autodiscoveryError, null);
        }
        catch (err) {
            window.setCursor("auto");
            this.globalFunctions.ERROR("Warning: Could not create erAutoDiscoverRequest. Err=" + err + "\n");
        }
    },

    autodiscoveryOK: function _autodiscoveryOK(ewsUrls, DisplayName, SMTPAddress) {
        this.globalFunctions.LOG("ecAutodiscoveryOK");
        var selectedEWSUrl = {
            value: undefined
        };
        var userCancel = false;

        if (ewsUrls) {
            if (ewsUrls.length() > 1) {
                // We have got multiple ews urls returned. Let the use choose.

                window.openDialog("chrome://exchangecommon/content/selectEWSUrl.xul",
                    "selectfrommultipleews",
                    "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=no",
                    ewsUrls, selectedEWSUrl);

                if ((!selectedEWSUrl.value) || (selectedEWSUrl.value == "")) {
                    this.globalFunctions.LOG("  ++++ Selection canceled by user");
                    userCancel = true;
                }
            }
            else {
                // We only have one url. Use it.
                selectedEWSUrl.value = ewsUrls.text();
            }

        }

        if (!userCancel) {
            document.getElementById("exchWebService_server").value = selectedEWSUrl.value;
            document.getElementById("exchWebService_serverrow").hidden = false;
            document.getElementById("exchWebService_mailboxrow").hidden = false;

            gexchWebServicesDetailsChecked = true;
            document.getElementById("exchWebService_autodiscovercheckbutton").disabled = false;
            document.getElementById("exchWebService_autodiscover").checked = false;
        }
        else {
            document.getElementById("exchWebService_autodiscovercheckbutton").disabled = false;
        }

        window.setCursor("auto");
        this.detailsChecked = true;
        document.getElementById("exchWebService_server_status").status = 2;
        document.getElementById("exchWebService_mailbox_status").status = 2;
    },

    autodiscoveryError: function _autodiscoveryError(aExchangeRequest, aCode, aMsg) {
        this.globalFunctions.LOG("ecAutodiscoveryError. aCode:" + aCode + ", aMsg:" + aMsg);
        switch (aCode) {
        case -20:
        case -30:
            break;
        case -6:
        case -9:
        case -10:
        case -14:
        case -15:
        case -16:
        case -17:
        case -18:
            alert(this.globalFunctions.getString("calExchangeCalendar", "ecErrorAutodiscoveryURLInvalid", [document.getElementById("exchWebService_mailbox").value], "exchangecommon"));
            break;
        default:
            alert(this.globalFunctions.getString("calExchangeCalendar", "ecErrorAutodiscovery", [aMsg, aCode], "exchangecommon"));
        }

        document.getElementById("exchWebService_autodiscovercheckbutton").disabled = false;
        window.setCursor("auto");
        this.detailsChecked = false;
        document.getElementById("exchWebService_mailbox_status").status = 1;
    },

    doCheckServer: function _doCheckServer() {
        document.getElementById("exchWebService_servercheckbutton").disabled = true;


        try {
            window.setCursor("wait");
            var user = document.getElementById("exchWebService_windowsuser").value;
            var tmpObject = new erGetFolderRequest({
                user: user,
                mailbox: "",
                folderBase: "publicfoldersroot",
                folderPath: "/",
                serverUrl: document.getElementById("exchWebService_server").value
            }, this.checkServerOK, this.checkServerError)
        }
        catch (err) {
            window.setCursor("auto");
            this.globalFunctions.ERROR("Warning: Error during creation of erGetFolderRequest. Err=" + err + "\n");
        }
    },

    checkServerOK: function _checkServerOK(folderID, changeKey, folderClass) {

        document.getElementById("exchWebService_servercheckbutton").disabled = false;
        window.setCursor("auto");
        this.detailsChecked = true;
        document.getElementById("exchWebService_server_status").status = 2;
    },

    checkServerError: function _checkServerError(aExchangeRequest, aCode, aMsg) {
        this.globalFunctions.LOG("exchWebServicesCheckServerError");
        switch (aCode) {
        case -20:
        case -30:
            break;
        case -6:
            alert(this.globalFunctions.getString("calExchangeCalendar", "ecErrorServerCheckURLInvalid", [document.getElementById("exchWebService_server").value], "exchangecommon"));
            break;
        default:
            alert(this.globalFunctions.getString("calExchangeCalendar", "ecErrorServerCheck", [aMsg, aCode], "exchangecommon"));
        }
        document.getElementById("exchWebService_servercheckbutton").disabled = false;

        window.setCursor("auto");
        this.detailsChecked = false;
        document.getElementById("exchWebService_server_status").status = 1;
    },
}
