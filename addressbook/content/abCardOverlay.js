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

var photoHandlerInline = {
    onLoad: function _onLoad(aCard, aDocument) {
        return true;
    },

    onShow: function _onShow(aCard, aDocument, aTargetID) {
        if ((aCard) && (aCard.getProperty("PhotoData", ""))) {
            aDocument.getElementById(aTargetID).setAttribute("src", "data:image/jpeg;base64," + aCard.getProperty("PhotoData", ""));
            return true;
        }
        else {
            return false;
        }
    },

    onSave: function _onLoad(aCard, aDocument) {
        return true;
    },
}

var photoHandlerExternal = {
    onLoad: function _onLoad(aCard, aDocument) {
        return true;
    },

    onShow: function _onShow(aCard, aDocument, aTargetID) {
        if ((aCard) && (aCard.getProperty("PhotoData", ""))) {
            this.downloadAttachment(aDocument.getElementById(aTargetID), aCard);
            aDocument.getElementById(aTargetID).setAttribute("src", "chrome://exchangecontacts/content/loading-from-server.png");
            return true;
        }
        else {
            return false;
        }
    },

    onSave: function _onLoad(aCard, aDocument) {
        return true;
    },

    downloadAttachment: function _downloadAttachment(aImg, aCard) {
        //dump("photoHandlerExternal.downloadAttachment\n");
        if (!aImg) {
            return;
        }

        var self = this;

        var tmpObject = new erGetAttachmentsRequest({
                user: aCard.getProperty("exchangeUser", ""),
                serverUrl: aCard.getProperty("exchangeServerUrl", ""),
                img: aImg,
                attachmentIds: [aCard.getProperty("PhotoData", "")]
            },
            function (aExchangeRequest, aAttachments) {
                self.onDownloadAttachmentOk(aExchangeRequest, aAttachments);
            },
            function (aExchangeRequest, aCode, aMsg) {
                self.onDownloadAttachmentError(aExchangeRequest, aCode, aMsg);
            });

    },

    onDownloadAttachmentOk: function _onDownloadAttachmentOk(aExchangeRequest, aAttachments) {
        //dump("photoHandlerExternal.onDownloadAttachmentOk:"+aAttachments.length+"\n");

        if (aAttachments.length > 0) {
            aExchangeRequest.argument.img.setAttribute("src", "data:image/jpeg;base64," + aAttachments[0].content);
        }
    },

    onDownloadAttachmentError: function _onDownloadAttachmentError(aExchangeRequest, aCode, aMsg) {
        //dump("photoHandlerExternal.onDownloadAttachmentError: aCode:"+aCode+", aMsg:"+aMsg+"\n");
        aExchangeRequest.argument.img.setAttribute("src", "chrome://exchangecontacts/content/error-loading-from-server.png");
    },

}

function exchAbCardOverlay(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchAbCardOverlay.prototype = {

    onLoad: function _onLoad() {
        var self = this;

        registerPhotoHandler("exchangeContactPhotoInline", photoHandlerInline);
        registerPhotoHandler("exchangeContactPhotoExternal", photoHandlerExternal);
    },

}

var tmpAbCardOverlay = new exchAbCardOverlay(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpAbCardOverlay.onLoad();
}, true);
