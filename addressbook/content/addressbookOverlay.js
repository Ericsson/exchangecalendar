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
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource:///modules/mailServices.js");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangeaddress/exchangeAbFunctions.js");
Cu.import("resource://exchangecommon/erGetAttachments.js");

function exchAddressbookOverlay(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchAddressbookOverlay.prototype = {

    deletePrevStatus: null,

    doAddExchangeAccount: function _doAddExchangeAccount() {
        // TODO: We should open a dialog and ask for ActiveDirectory details.
        //	var newName = getUUID();

        var input = {
            selectedDirectory: null,
            answer: "",
            newAccountObject: null
        };
        this._window.openDialog("chrome://exchangecontacts/content/exchangeContactSettings.xul",
            "createexchangeaccount",
            "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
            input);

        if (input.answer == "saved") {
            var newUUID = exchWebService.commonAbFunctions.addAccount(input.newAccountObject);


            this.prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecontacts@extensions.1st-setup.nl.account." + newUUID + ".");

            this.prefs.setIntPref("pollinterval", input.newAccountObject.pollinterval);
            this.prefs.setBoolPref("globalAddressList", input.newAccountObject.addGlobalAddressList);


            var theParentDirectory = MailServices.ab.getDirectory("exchWebService-contactRoot-directory://")
                .QueryInterface(Ci.nsIAbDirectory);

            var targetURI = "exchWebService-contactRoot-directory://" + newUUID;
            var theChildDirectory = MailServices.ab.getDirectory(targetURI)
                .QueryInterface(Ci.nsIAbDirectory);

            MailServices.ab.notifyDirectoryItemAdded(theParentDirectory, theChildDirectory);
        }
    },

    doDeleteExchangeAccount: function _doDeleteExchangeAccount() {
        exchWebService.commonAbFunctions.logInfo("1. doDeleteExchangeAccount\n");

        var theParentDirectory = MailServices.ab.getDirectory("exchWebService-contactRoot-directory://")
            .QueryInterface(Ci.nsIAbDirectory);

        var theChildDirectory = MailServices.ab.getDirectory(GetSelectedDirectory())
            .QueryInterface(Ci.nsIAbDirectory);

        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        if (promptService.confirm(null, this.globalFunctions.getString("ExchangeContacts", "promtpDeleteDirectoryTitle", [], "exchangecontacts"),
                this.globalFunctions.getString("ExchangeContacts", "promptDeleteDirectoryText", [theChildDirectory.dirName], "exchangecontacts"))) {
            exchWebService.commonAbFunctions.deleteAccount(theChildDirectory.uuid);

            MailServices.ab.notifyDirectoryItemDeleted(theParentDirectory, theChildDirectory);
        }

        exchWebService.commonAbFunctions.logInfo("2. doDeleteExchangeAccount\n");
    },

    onDirTreeSelect: function _onDirTreeSelect() {
        var selectedDir = GetSelectedDirectory();

        if ((selectedDir) && (selectedDir == "exchWebService-contactRoot-directory://")) {

            this._document.getElementById("button-deleteexchangeaccount").hidden = true;
            this._document.getElementById("button-addexchangeaccount").hidden = false;

            this._document.getElementById("button-newcard").disabled = true;
            this._document.getElementById("menu_newContact").disabled = true;


            //this._document.getElementById("cmd_delete").setAttribute('disabled','true');
            this._document.getElementById("button_delete").setAttribute('disabled', 'true');
            this._document.getElementById("cmd_properties").setAttribute('disabled', 'true');
            this._document.getElementById("button-editcard").setAttribute('disabled', 'true');

            this._document.getElementById("cmd_deleteexchange").setAttribute('disabled', 'true');

            this._document.getElementById("menu_deleteexchangecontact").setAttribute('disabled', 'true');

        }
        else {
            if ((selectedDir) && (selectedDir.indexOf("exchWebService-contactFolder-directory://") > -1)) {

                this._document.getElementById("button-deleteexchangeaccount").hidden = false;
                this._document.getElementById("button-addexchangeaccount").hidden = true;

                //this._document.getElementById("cmd_delete").setAttribute('disabled','true');
                this._document.getElementById("button_delete").setAttribute('disabled', 'true');

                this._document.getElementById("cmd_deleteexchange").setAttribute('disabled', 'false');

                this._document.getElementById("button-newcard").disabled = false;
                this._document.getElementById("menu_newContact").disabled = false;

                this._document.getElementById("menu_deleteexchangecontact").setAttribute('disabled', 'false');

            }
            else {

                this._document.getElementById("button-deleteexchangeaccount").hidden = true;
                this._document.getElementById("button-addexchangeaccount").hidden = false;

                this._document.getElementById("button-newcard").disabled = false;
                this._document.getElementById("menu_newContact").disabled = false;

                this._document.getElementById("cmd_deleteexchange").setAttribute('disabled', 'true');

                this._document.getElementById("menu_deleteexchangecontact").setAttribute('disabled', 'true');

            }
            this._document.getElementById("cmd_properties").setAttribute('disabled', 'false');
            this._document.getElementById("button-editcard").setAttribute('disabled', 'false');
        }

        exchWebService.commonAbFunctions.logInfo("ondirTreeSelect selectedDir:" + selectedDir + "\n");
    },

    onRightClick: function _onRightClick() {
        var selectedDir = GetSelectedDirectory();

        if ((selectedDir) && (selectedDir == "exchWebService-contactRoot-directory://")) {
            this._document.getElementById("dirTreeContext-properties").disabled = true;
            this._document.getElementById("dirTreeContext-newcard").hidden = true;
            this._document.getElementById("dirTreeContext-newlist").hidden = true;

            this._document.getElementById("dirTreeContext-delete").hidden = false;
            this._document.getElementById("dirTreeContext_deleteexchangecontact").hidden = true;
        }
        else {
            if ((selectedDir) && (selectedDir.indexOf("exchWebService-contactFolder-directory://") > -1)) {
                this._document.getElementById("dirTreeContext-properties").disabled = false;
                this._document.getElementById("dirTreeContext-newcard").hidden = true;
                this._document.getElementById("dirTreeContext-newlist").hidden = true;

                this._document.getElementById("dirTreeContext-delete").hidden = true;
                this._document.getElementById("dirTreeContext_deleteexchangecontact").hidden = false;
            }
            else {
                this._document.getElementById("dirTreeContext-properties").disabled = false;
                this._document.getElementById("dirTreeContext-newcard").hidden = false;
                this._document.getElementById("dirTreeContext-newlist").hidden = true;

                this._document.getElementById("dirTreeContext-delete").hidden = false;
                this._document.getElementById("dirTreeContext_deleteexchangecontact").hidden = true;
            }
        }
    },

    photoDisplayHandlerInline: function _photoDisplayHandler(aCard, aImg) {
        //dump("exchAddressbookOverlay.photoDisplayHandlerInline: aImg:"+aImg.id+"\n");
        if ((aCard) && (aCard.getProperty("PhotoData"))) {
            aImg.setAttribute("src", "data:image/jpeg;base64," + aCard.getProperty("PhotoData"));
            return true;
        }
        else {
            return false;
        }
    },


    photoDisplayHandlerExternal: function _photoDisplayHandlerExternal(aCard, aImg) {
        if ((aCard) && (aCard.getProperty("PhotoData"))) {
            this.downloadAttachment(aImg, aCard);
            aImg.setAttribute("src", "chrome://exchangecontacts/content/loading-from-server.png");
            return true;
        }
        else {
            return false;
        }
    },

    onLoad: function _onLoad() {
        var self = this;

        this.select = function () {
            self.onDirTreeSelect()
        }
        this.focus = function () {
            self.onDirTreeSelect()
        }
        this.addrbookSelect = function () {
            self.onDirTreeSelect()
        }
        this.popupshown = function () {
            self.onRightClick()
        }

        this._document.getElementById("dirTree").addEventListener("select", this.select, true);
        this._document.getElementById("dirTree").addEventListener("focus", this.focus, true);
        this._document.getElementById("dirTree").addEventListener("addrbook-select", this.addrbookSelect, true);

        this._document.getElementById("dirTreeContext").addEventListener("popupshown", this.popupshown, true);

        registerPhotoDisplayHandler("exchangeContactPhotoInline", function (aCard, aImg) {
            return self.photoDisplayHandlerInline(aCard, aImg);
        });
        registerPhotoDisplayHandler("exchangeContactPhotoExternal", function (aCard, aImg) {
            return self.photoDisplayHandlerExternal(aCard, aImg);
        });
        this.globalFunctions.LOG("exchAddressbookOverlay.onLoad");
    },

    unLoad: function _unLoad() {
        var self = this;
        this._document.getElementById("dirTree").removeEventListener("select", this.select, false);
        this._document.getElementById("dirTree").removeEventListener("focus", this.focus, false);
        this._document.getElementById("dirTree").removeEventListener("addrbook-select", this.addrbookSelect, false);

        this._document.getElementById("dirTreeContext").removeEventListener("popupshown", this.popupshown, false);
    },

    downloadAttachment: function _downloadAttachment(aImg, aCard) {
        this.globalFunctions.LOG("exchAddressbookOverlay.downloadAttachment");
        if (!aImg) {
            return;
        }

        var self = this;

        var tmpObject = new erGetAttachmentsRequest({
                user: aCard.getProperty("exchangeUser"),
                serverUrl: aCard.getProperty("exchangeServerUrl"),
                img: aImg,
                attachmentIds: [aCard.getProperty("PhotoData")]
            },
            function (aExchangeRequest, aAttachments) {
                self.onDownloadAttachmentOk(aExchangeRequest, aAttachments);
            },
            function (aExchangeRequest, aCode, aMsg) {
                self.onDownloadAttachmentError(aExchangeRequest, aCode, aMsg);
            });

    },

    onDownloadAttachmentOk: function _onDownloadAttachmentOk(aExchangeRequest, aAttachments) {
        this.globalFunctions.LOG("exchAddressbookOverlay.onDownloadAttachmentOk:" + aAttachments.length);

        if (aAttachments.length > 0) {
            aExchangeRequest.argument.img.setAttribute("src", "data:image/jpeg;base64," + aAttachments[0].content);
        }
    },

    onDownloadAttachmentError: function _onDownloadAttachmentError(aExchangeRequest, aCode, aMsg) {
        this.globalFunctions.LOG("exchAddressbookOverlay.onDownloadAttachmentError: aCode:" + aCode + ", aMsg:" + aMsg);
        aExchangeRequest.argument.img.setAttribute("src", "chrome://exchangecontacts/content/error-loading-from-server.png");
    },

}

var tmpAddressbookOverlay = new exchAddressbookOverlay(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpAddressbookOverlay.onLoad();
}, true);
window.addEventListener("unload", function () {
    window.removeEventListener("unload", arguments.callee, false);
    tmpAddressbookOverlay.unLoad();
}, true);
