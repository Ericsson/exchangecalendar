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
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://exchangecommon/erGetAttachments.js");

function exchAttachments(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchAttachments.prototype = {
    _initialized: false,

    addAttachmentDialog: function _addAttachmentDialog() {
        const nsIFilePicker = Ci.nsIFilePicker;
        var fp = Cc["@mozilla.org/filepicker;1"]
            .createInstance(nsIFilePicker);

        var title = "Select attachment";

        fp.init(this._window, title, nsIFilePicker.modeOpen);

        var ret = fp.show();

        if (ret == nsIFilePicker.returnOK) {
            this.globalFunctions.LOG("[[" + fp.fileURL.spec + "]]");

            // Create attachment for item.
            var newAttachment = createAttachment();
            newAttachment.uri = fp.fileURL.clone();
            this.addAttachment(newAttachment);
        }

    },

    addAttachment: function _addAttachment(aAttachment, isFirst) {
        if ((isFirst === undefined) || (isFirst === null)) isFirst = false;

        // We currently only support uri attachments
        var ext2file = {
            exe: "document-binary.png",
            xls: "document-excel.png",
            xlsx: "document-excel.png",
            csv: "document-excel-csv.png",
            fls: "document-flash-movie.png",
            gif: "document-image.png",
            jpg: "document-image.png",
            jpeg: "document-image.png",
            png: "document-image.png",
            pdf: "document-pdf.png",
            ps: "document-photoshop.png",
            php: "document-php.png",
            txt: "document-text.png",
            tex: "document-tex.png",
            doc: "document-word.png",
            docx: "document-word.png",
            ppt: "document-powerpoint.png",
            pptx: "document-powerpoint.png",
            pfx: "certificate.png",
            crt: "certificate.png",
            pkcs12: "certificate.png",
        };

        this.globalFunctions.LOG("exchWebService.attachments.addAttachment");
        if (aAttachment.uri) {
            let documentLink = this._document.getElementById("attachment-link");
            let item = documentLink.appendChild(createXULElement("listitem"));
            item.setAttribute("crop", "end");
            item.setAttribute("class", "listitem-iconic");

            var extension = "";
            var stringForExtension = "";

            let getParams = this.globalFunctions.splitUriGetParams(aAttachment.uri);
            if (getParams) {
                // Set listitem attributes
                var fileSize = getParams.size;
                var sizeStr = "b";
                if (fileSize > (10 * 1024)) {
                    fileSize = fileSize / 1024;
                    sizeStr = "Kb";
                }
                if (fileSize > (10 * 1024)) {
                    fileSize = fileSize / 1024;
                    sizeStr = "Mb";
                }
                if (fileSize > (10 * 1024)) {
                    fileSize = fileSize / 1024;
                    sizeStr = "Gb";
                }
                if (sizeStr != "b") {
                    item.setAttribute("label", getParams.name + " (" + Number(fileSize).toFixed(1) + " " + sizeStr + ")");
                }
                else {
                    if (fileSize == "") {
                        item.setAttribute("label", getParams.name);
                    }
                    else {
                        item.setAttribute("label", getParams.name + " (" + fileSize + ")");
                    }
                }

                stringForExtension = getParams.name;

            }
            else {
                this.globalFunctions.LOG("DID NOT FIND VALID get FIELDS FOR ATTACHMENT");
                if (aAttachment.uri.spec.indexOf("file://") > -1) {
                    this.globalFunctions.LOG("Attachment is a local file:" + aAttachment.uri.spec);
                    // We have a local file url
                    item.setAttribute("label", decodeURIComponent(aAttachment.uri.path));
                    stringForExtension = decodeURIComponent(aAttachment.uri.path);
                }
                else {
                    this.globalFunctions.LOG("It is not a valid local file spec");
                    return;
                }
            }

            var counter = stringForExtension.length;
            while ((counter > 0) && (stringForExtension.substr(counter - 1, 1) != ".")) {
                extension = stringForExtension.substr(counter - 1, 1) + extension;
                counter--;
            }
            this.globalFunctions.LOG(" == extension:" + extension);

            if (ext2file[extension]) {
                item.setAttribute("image", "chrome://exchangecommon-common/skin/images/" + ext2file[extension]);
            }
            else {
                item.setAttribute("image", "chrome://exchangecommon-common/skin/images/document--exclamation.png");
            }

            // full attachment object is stored here
            item.attachment = aAttachment;
            try {
                gAttachMap[aAttachment.hashId] = aAttachment;
            }
            catch (er) {}

            // Update the number of rows and save our attachment globally
            if (documentLink.itemCount < 3) {
                documentLink.rows = documentLink.itemCount;
            }
            else {
                documentLink.rows = 3;
            }

            this.showAttachmentListbox();

        }

    },

    deleteAttachment: function deleteAttachment() {
        var documentLink = this._document.getElementById("attachment-link");
        if ((documentLink.selectedItem) && (documentLink.selectedItem.attachment)) {
            delete gAttachMap[documentLink.selectedItem.attachment.hashId];
            documentLink.removeItemAt(documentLink.selectedIndex);
        }
    },

    showAttachmentListbox: function _showAttachmentListbox() {
        if (this.attachmentListboxVisible) return;

        this.attachmentListboxVisible = true;

        // calendar-event-dialog (show our attachment view)
        try {
            this._document.getElementById("exchWebService-attachments-row").removeAttribute("collapsed");
        }
        catch (ex) {}
        // calendar-summary-dialog (show our attachment view)
        try {
            this._document.getElementById("exchWebService-attachment-summary-space").hidden = false;
            this._document.getElementById("exchWebService-attachment-summary-caption").hidden = false;
            this._document.getElementById("exchWebService-attachment-summary-box").hidden = false;
            this._document.getElementById("item-description-box").hidden = false;

        }
        catch (ex) {}

        this._window.sizeToContent();
    },

    removeItemsFromListbox: function _removeItemsFromListbox() {
        var documentLink = this._document.getElementById("attachment-link");
        while (documentLink.itemCount > 0) {
            this.globalFunctions.LOG(" == Removing item from listbox");
            documentLink.removeItemAt(0);
        }
    },

    /**
     * Receives asynchronous messages from the parent context that contains the iframe.
     *
     * @param {MessageEvent} aEvent  Contains the message being received
     */
    receiveMessage: function _receiveMessage(aEvent) {
        let validOrigin = gTabmail ? "chrome://messenger" : "chrome://calendar";
        if (aEvent.origin !== validOrigin) {
            return;
        }
        switch (aEvent.data.command) {
        case "exchWebService_addAttachmentDialog":
            this.addAttachmentDialog();
            break;
        }
    },

    onLoad: function _onLoad() {
        if (this._initialized) {
            return;
        }

        var self = this;

        if (this._document.getElementById("calendar-task-tree")) {
            this.globalFunctions.LOG("  -- calendar-task-tree --");
            this._document.getElementById("calendar-task-tree").addEventListener("select", function () {
                self.onSelectTask();
            }, true);
            return;
        }

        var args = this._window.arguments[0];
        var item = args.calendarEvent;

        this.attachmentListboxVisible = false;

        // We can't update toolbar from iframe
        if ((item.calendar) && (item.calendar.type == "exchangecalendar")) {
            this.globalFunctions.LOG("  -- It is an Exchange Calendar event:" + item.title);

            if (this._document.getElementById("event-grid-attachment-row")) {
                this._document.getElementById("event-grid-attachment-row").setAttribute("collapsed", true);
            }

            // Modify context menu for the attachment list inside the "Attachment" panel
            let attachmentListbox = this._document.getElementById("attachment-link");

            attachmentListbox.setAttribute("context", "exchWebService-attachment-popup");
            attachmentListbox.setAttribute("onkeypress", function (aEvent) {
                self.onKeyPress(aEvent);
            });
            attachmentListbox.setAttribute("onclick", function (aEvent) {
                self.onSelect(aEvent);
            });
            attachmentListbox.setAttribute("ondblclick", function (aEvent) {
                self.onDblClick(aEvent);
            });

            this.addAttachmentsFromItem(item);
        }
        else {
            if (this._document.getElementById("event-grid-attachment-row")) {
                this._document.getElementById("event-grid-attachment-row").setAttribute("collapsed", false);
            }

            // Modify context menu for the attachment list inside the "Attachment" panel
            let attachmentListbox = this._document.getElementById("attachment-link");

            attachmentListbox.setAttribute("context", "attachment-popup");
            attachmentListbox.setAttribute("onkeypress", "attachmentLinkKeyPress(event)");
            attachmentListbox.setAttribute("onclick", "attachmentClick(event);");
            attachmentListbox.setAttribute("ondblclick", "attachmentDblClick(event)");
        }

        // Add message listener to be able to receive message from parent window or tab
        window.addEventListener("message", function (aEvent) {
            self.receiveMessage(aEvent);
        }, false);

        this._initialized = true;
    },

    addAttachmentsFromItem: function _addAttachmentsFromItem(aItem) {
        try {
            this.removeItemsFromListbox();
        }
        catch (ex) {
            this.globalFunctions.LOG("exchWebService.attachments.addAttachmentsFromItem: foutje:" + ex);
        }
        this.globalFunctions.LOG("exchWebService.attachments.addAttachmentsFromItem: title:" + aItem.title);
        var attachments = aItem.getAttachments({});
        if (attachments.length > 0) {
            this.globalFunctions.LOG("  -- We have attachments:" + attachments.length + " (" + this.globalFunctions.STACKshort() + ")");
            var first = true;
            for (var index in attachments) {
                this.globalFunctions.LOG("  -- processing attachment: " + index);
                //dump("aAttachment.uri:"+attachments[index].uri.spec+"\n");
                if (attachments[index].uri.spec.indexOf("isinline=true") == -1) {
                    this.addAttachment(attachments[index], first);
                    if (first) {
                        first = false;
                    }
                }
            }

            this.globalFunctions.LOG("  -- processed attachment.");
        }
        else {
            this.globalFunctions.LOG("No attachments");
        }
    },

    onKeyPress: function _onKeyPress(aEvent) {
        this.globalFunctions.LOG("exchWebService.attachments.onKeyPress");
        const kKE = Components.interfaces.nsIDOMKeyEvent;
        switch (aEvent.keyCode) {
        case kKE.DOM_VK_BACK_SPACE:
        case kKE.DOM_VK_DELETE:
            if (this._document.getElementById("calendar-task-details-attachment-rows")) break;

            this.globalFunctions.LOG("exchWebService.attachments.onKeyPress: Delete");
            this.deleteAttachment();
            break;
        case 13:
        case kKE.DOM_VK_ENTER:
            this.globalFunctions.LOG("exchWebService.attachments.onKeyPress: Enter");
            this.openAttachment();
            break;
        default:
            this.globalFunctions.LOG("exchWebService.attachments.onKeyPress: unknown:" + aEvent.keyCode);

        }
    },

    onDblClick: function _onDblClick(aEvent) {
        this.globalFunctions.LOG("exchWebService.attachments.onDblClick");
        this.openAttachment();
    },

    onSelectTask: function _onSelectTask() {
        this.globalFunctions.LOG("exchWebService.attachments.onSelectTask");

        var taskTree = this._document.getElementById("calendar-task-tree");
        var item = taskTree.currentTask;
        var displayElement = function (id, flag) {
            setBooleanAttribute(id, "hidden", !flag);
            return flag;
        }
        if (displayElement("calendar-task-details-container", item != null)
            && displayElement("calendar-task-view-splitter", item != null)) {

            if ((item.calendar) && (item.calendar.type == "exchangecalendar")) {
                // calendar-task-view (hide existing attachment view)
                //this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: it is an Exchange task 1.");
                try {
                    this._document.getElementById("calendar-task-details-attachment-rows").setAttribute("hidden", "true");
                    this._document.getElementById("calendar-task-details-attachment-rows").removeAttribute("flex");
                    this._document.getElementById("calendar-task-details-attachment-rows").setAttribute("width", "0px");
                }
                catch (ex) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: Foutje:");
                }

                //this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: it is an Exchange task 2.");

                try {
                    this._document.getElementById("exchWebService-attachments-row").setAttribute("collapsed", "false");
                }
                catch (ex) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: Foutje Y:");
                }

                try {
                    this.addAttachmentsFromItem(item);
                }
                catch (ex) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: Foutje2:" + ex);
                }
                //this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: it is an Exchange task 3.");
            }
            else {
                try {
                    this._document.getElementById("calendar-task-details-attachment-rows").setAttribute("hidden", "false");
                    this._document.getElementById("calendar-task-details-attachment-rows").setAttribute("flex", "1");
                    this._document.getElementById("calendar-task-details-attachment-rows").removeAttribute("width");
                }
                catch (ex) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: Foutje X:");
                }

                try {
                    this._document.getElementById("exchWebService-attachments-row").setAttribute("collapsed", "true");
                }
                catch (ex) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelectTask: Foutje Y:");
                }
                this.attachmentListboxVisible = false;
            }
        }
    },

    onSelect: function _onSelect(aEvent) {
        this.globalFunctions.LOG("exchWebService.attachments.onSelect");

        let documentLink = this._document.getElementById("attachment-link");

        var isReadOnly = "true";
        if ((this._document.getElementById("calendar-event-dialog")) || (this._document.getElementById("calendar-task-dialog"))) {
            isReadOnly = "false";
        }

        var calendar = getCurrentCalendar();
        if (calendar.readOnly) {
            isReadOnly = "true";
        }

        if ((documentLink.selectedItem) && (documentLink.selectedItem.attachment)) {
            var attURI = documentLink.selectedItem.attachment.uri;
            if (attURI.spec.indexOf("file://") == 0) {
                this.globalFunctions.LOG("exchWebService.attachments.onSelect: localfile");
                this._document.getElementById("exchWebService-attachment-popup-open").setAttribute("disabled", "false");
                this._document.getElementById("exchWebService_openAttachment").setAttribute("disabled", "false");
                this._document.getElementById("exchWebService-attachment-popup-save").setAttribute("disabled", "true");
                this._document.getElementById("exchWebService_saveAttachment").setAttribute("disabled", "true");
                this._document.getElementById("exchWebService-attachment-popup-delete").setAttribute("disabled", isReadOnly);
                this._document.getElementById("exchWebService_deleteAttachment").setAttribute("disabled", isReadOnly);
            }
            else {
                if (attURI.spec.indexOf("http") == 0) {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelect: remotefile");
                    this._document.getElementById("exchWebService-attachment-popup-open").setAttribute("disabled", "false");
                    this._document.getElementById("exchWebService_openAttachment").setAttribute("disabled", "false");
                    this._document.getElementById("exchWebService-attachment-popup-save").setAttribute("disabled", "false");
                    this._document.getElementById("exchWebService_saveAttachment").setAttribute("disabled", "false");
                    this._document.getElementById("exchWebService-attachment-popup-delete").setAttribute("disabled", isReadOnly);
                    this._document.getElementById("exchWebService_deleteAttachment").setAttribute("disabled", isReadOnly);
                }
                else {
                    this.globalFunctions.LOG("exchWebService.attachments.onSelect: Unknown attachment URI. Cannot open:" + attURI.spec);
                    this._document.getElementById("exchWebService-attachment-popup-open").setAttribute("disabled", "true");
                    this._document.getElementById("exchWebService-attachment-popup-save").setAttribute("disabled", "true");
                }
            }
        }
    },

    openAttachment: function _openAttachment() {
        this.globalFunctions.LOG("exchWebService.attachments.openAttachment");
        let documentLink = this._document.getElementById("attachment-link");

        if (documentLink.selectedItem.attachment) {
            var attURI = documentLink.selectedItem.attachment.uri;
            if (attURI.spec.indexOf("file://") == 0) {
                this.openLocalAttachment(documentLink.selectedItem.attachment);
            }
            else {
                if (attURI.spec.indexOf("http") == 0) {
                    this.downloadAttachment(documentLink.selectedItem.attachment, false);
                }
                else {
                    this.globalFunctions.LOG("exchWebService.attachments.openAttachment: Unknown attachment URI. Cannot open:" + attURI.spec);
                }
            }
        }
    },

    saveAttachment: function _saveAttachment() {
        this.globalFunctions.LOG("exchWebService.attachments.saveAttachment");
        let documentLink = this._document.getElementById("attachment-link");
        this.downloadAttachment(documentLink.selectedItem.attachment, true);
    },

    openLocalAttachment: function _openLocalAttachment(aAttachment) {
        this.globalFunctions.LOG("exchWebService.attachments.openLocalAttachment");
        if (!aAttachment) {
            return;
        }

        var URL = aAttachment.uri;

        this.globalFunctions.LOG(" == Going to open:" + URL.prePath + URL.path);

        var externalLoader = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
            .getService(Ci.nsIExternalProtocolService);

        try {
            externalLoader.loadUrl(URL);
        }
        catch (ex) {
            this.globalFunctions.LOG(" == ERROR:" + ex);
        }
    },

    downloadAttachment: function _downloadAttachment(aAttachment, doSave) {
        this.globalFunctions.LOG("exchWebService.attachments.downloadAttachment");
        if (!aAttachment) {
            return;
        }

        var self = this;

        let getParams = this.globalFunctions.splitUriGetParams(aAttachment.uri);

        var prefs = "extensions.exchangecalendar@extensions.1st-setup.nl." + getParams.calendarid + ".";

        var serverUrl = this.globalFunctions.safeGetCharPref(null, prefs + "ecServer", "");
        var username = this.globalFunctions.safeGetCharPref(null, prefs + "ecUser", "");
        var domain = this.globalFunctions.safeGetCharPref(null, prefs + "ecDomain", "");
        if (username.indexOf("@") == -1) {
            if (domain != "") {
                username = domain + "\\" + username;
            }
        }

        var tmpObject = new erGetAttachmentsRequest({
            user: username,
            serverUrl: serverUrl,
            attachmentIds: [getParams.id],
            doSave: doSave
        }, self.onDownloadAttachmentOk, self.onDownloadAttachmentError);

    },

    onDownloadAttachmentOk: function _onDownloadAttachmentOk(aExchangeRequest, aAttachments) {
        var globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
            .getService(Ci.mivFunctions);

        globalFunctions.LOG("exchWebService.attachments.onDownloadAttachmentOk:" + aAttachments.length);

        if (aAttachments.length > 0) {
            for (var index in aAttachments) {
                globalFunctions.LOG(" == Going to decode:" + aAttachments[index].name);
                globalFunctions.LOG(" == content:" + aAttachments[index].content.length + " bytes");
                var fileData = window.atob(aAttachments[index].content);
                globalFunctions.LOG(" == Decoded:" + aAttachments[index].name);

                if (aExchangeRequest.argument.doSave) {
                    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
                    fp.init(window, "Save", Ci.nsIFilePicker.modeSave);
                    fp.defaultString = aAttachments[index].name;
                    var result = fp.show();
                    if (result == Ci.nsIFilePicker.returnCancel) {
                        // User canceled. // Maybe we should have an option for only this attachment or all. Now for all.

                        return;
                    }
                    var file = fp.file;
                }
                else {
                    var file = Cc["@mozilla.org/file/directory_service;1"].
                    getService(Ci.nsIProperties).
                    get("TmpD", Ci.nsIFile);
                    file.append(aAttachments[index].name);
                }
                //file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);  
                // do whatever you need to the created file  
                globalFunctions.LOG(" == new tmp filename:" + file.path);

                var stream = Cc["@mozilla.org/network/safe-file-output-stream;1"].
                createInstance(Ci.nsIFileOutputStream);
                stream.init(file, 0x04 | 0x08 | 0x20, 384, 0); // readwrite, create, truncate  

                globalFunctions.LOG(" == writing file:" + file.path);
                globalFunctions.LOG(" == writing:" + fileData.length + " bytes");
                stream.write(fileData, fileData.length);
                if (stream instanceof Ci.nsISafeOutputStream) {
                    stream.finish();
                }
                else {
                    stream.close();
                }

                // Dispose of the converted data in memory;
                //delete fileData;

                globalFunctions.LOG(" == written file:" + file.path);
                globalFunctions.LOG(" == written:" + fileData.length + " bytes");

                if (!aExchangeRequest.argument.doSave) {
                    // file is nsIFile  
                    var ios = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);
                    var URL = ios.newFileURI(file);

                    globalFunctions.LOG(" == Going to open:" + URL.prePath + URL.path);

                    var externalLoader = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                        .getService(Ci.nsIExternalProtocolService);

                    try {
                        externalLoader.loadUrl(URL);
                    }
                    catch (ex) {
                        globalFunctions.LOG(" == ERROR:" + ex);
                    }
                }
            }
        }
    },

    onDownloadAttachmentError: function _onDownloadAttachmentError(aExchangeRequest, aCode, aMsg) {
        var globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
            .getService(Ci.mivFunctions);
        globalFunctions.LOG("exchWebService.attachments.onDownloadAttachmentError: aCode:" + aCode + ", aMsg:" + aMsg);
    },

}

var tmpAttachment = new exchAttachments(document, window);
window.addEventListener("load", function _onLoad() {
    tmpAttachment.onLoad();
}, false);
