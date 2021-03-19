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
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/erBrowseFolder.js");

if (!exchWebService) var exchWebService = {};

function exchWebService_browseTreeView(aProperties) {

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this.globalFunctions.LOG("browseTreeView 1");

    this.ecProperties = {};
    this.ecProperties["user"] = aProperties.user;
    this.ecProperties["mailbox"] = aProperties.mailbox;
    this.ecProperties["folderBase"] = aProperties.folderBase;
    this.ecProperties["serverUrl"] = aProperties.serverUrl;
    this.ecProperties["folderID"] = aProperties.folderID;
    this.ecProperties["changeKey"] = aProperties.changeKey;

    this.ecProperties["foldername"] = "/";
    this.ecProperties["level"] = 0;
    this.ecProperties["isContainer"] = true;
    this.ecProperties["isContainerOpen"] = false;
    this.ecProperties["isContainerEmpty"] = false;
    this.ecProperties["children"] = [];
    this.ecProperties["folderClass"] = aProperties.folderBase;

    this.folders = new Array();
    this.folders.push(this.ecProperties);

    this.getChildFolders(this.ecProperties);

    this.globalFunctions.LOG("browseTreeView 2");

};

exchWebService_browseTreeView.prototype = {

    treeBox: null,

    get rowCount() {
        return this.folders.length;
    },
    setTree: function (treeBox) {
        this.treeBox = treeBox;
    },

    getCellText: function (idx, column) {
        switch (column.id) {
        case "exchWebService_foldername":
            return this.folders[idx].foldername;
            break;
        case "exchWebService_folderclass":
            return this.folders[idx].folderClass;
            break;
        }
    },

    isContainer: function (idx) {
        return this.folders[idx].isContainer;
    },
    isContainerOpen: function (idx) {
        return this.folders[idx].isContainerOpen;
    },
    isContainerEmpty: function (idx) {
        return this.folders[idx].isContainerEmpty;
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
        //		if (this.isContainer(idx)) return -1;  
        for (var t = idx - 1; t >= 0; t--) {
            if (this.isContainer(t)) return t;
        }
        return -1;
    },

    getLevel: function _getLevel(idx) {
        return this.folders[idx].level;
    },

    hasNextSibling: function _hasNextSibling(idx, after) {
        var thisLevel = this.getLevel(idx);
        for (var t = after + 1; t < this.folders.length; t++) {
            var nextLevel = this.getLevel(t);
            if (nextLevel == thisLevel) return true;
            if (nextLevel < thisLevel) break;
        }
        return false;
    },

    openFolder: function (idx) {
        var insertedRows = 0;
        var index = idx + 1;
        for each(var child in this.folders[idx].children) {
            this.folders.splice(index, 0, child); // Add one

            if ((child.isContainer) && (child.isContainerOpen)) {
                // We have to add the children of this child. and so on.
                var childRowCount = this.openFolder(index);
                insertedRows = insertedRows + childRowCount;
                index = index + childRowCount;
            }
            insertedRows++;
            index++;
        }
        this.folders[idx].isContainerOpen = true;
        return insertedRows;
    },

    toggleOpenState: function _toggleOpenState(idx) {
        if (this.folders[idx].isContainer) {
            if (this.folders[idx].isContainerOpen) {
                // Closing the container.
                var removedRows = 0;
                var index = idx + 1;
                while ((index < this.folders.length) && (this.folders[index].level > this.folders[idx].level)) {
                    this.folders.splice(index, 1); // Remove one
                    removedRows++;
                }
                this.folders[idx].isContainerOpen = false;
                this.treeBox.rowCountChanged(idx + 1, -removedRows);
            }
            else {
                // Opening the container.
                if (this.folders[idx].children.length > 0) {
                    var insertedRows = this.openFolder(idx);
                    this.treeBox.rowCountChanged(idx + 1, insertedRows);
                }
                else {
                    this.folders[idx].isContainerOpen = true;
                    this.getChildFolders(this.folders[idx]);
                }
            }
        }
        this.treeBox.invalidateRow(idx);

    },

    getImageSrc: function (idx, column) {
        if (column.id == "exchWebService_foldername") {
            switch (this.folders[idx].folderClass) {
            case "IPF.Appointment":
                return "chrome://exchangecommon-common/skin/images/calendar-month.png";
                break;
            case "IPF.Note":
                return "chrome://exchangecommon-common/skin/images/mail.png";
                break;
            case "IPF.Contact":
                return "chrome://exchangecommon-common/skin/images/address-book.png";
                break;
            case "IPF.Configuration":
                return "chrome://exchangecommon-common/skin/images/wrench-screwdriver.png";
                break;
            case "IPF.Note.OutlookHomepage":
            case "IPF.Note.SocialConnector.FeedItems":
                return "chrome://exchangecommon-common/skin/images/feed.png";
                break;
            case "IPF.Task":
                return "chrome://exchangecommon-common/skin/images/task.png";
                break;
            case "IPF.StickyNote":
                return "chrome://exchangecommon-common/skin/images/sticky-notes.png";
                break;
            case "IPF.Journal":
                return "chrome://exchangecommon-common/skin/images/blog.png";
                break;

            }

            if (this.folders[idx].isContainerOpen) {
                return "chrome://exchangecommon-common/skin/images/folder-open.png";
            }

            return "chrome://exchangecommon-common/skin/images/folder.png";
        }
    },

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

    getItemIndex: function _getItemIndex(aItem) {
        var index = 0;
        while ((index < this.folders.length) && (this.folders[index].folderID != aItem.folderID)) {
            index++;
        }

        if ((index < this.folders.length) && (this.folders[index].folderID == aItem.folderID)) {
            return index;
        }

        return -1;
    },

    getChildFolders: function _getChildFolders(aParent) {
        var self = this;
        this.globalFunctions.LOG("getChildFolders");

        window.setCursor("wait");

        var tmpObject = new erBrowseFolderRequest(aParent,
            function (erBrowseFolderRequest, childFolders) {
                self.browseFolderOk(erBrowseFolderRequest, childFolders);
            },
            function (erBrowseFolderRequest, aCode, aMsg) {
                self.browseFolderError(erBrowseFolderRequest, aCode, aMsg);
            });
    },

    addChild: function _addChild(aParent, aChild) {
        this.globalFunctions.LOG("addChild:" + aChild.foldername);

        if ((aParent.isContainer) && (aParent.isContainerOpen)) {
            // Set index of child and update index of following items
            var parentIndex = this.getItemIndex(aParent);
            if (parentIndex > -1) {
                this.folders.splice(parentIndex + aParent.children.length + 1, 0, aChild);
                this.treeBox.rowCountChanged(parentIndex + aParent.children.length + 1, 1);
            }
        }

        aChild.parent = aParent;
        aParent.children.push(aChild);

    },

    browseFolderOk: function _browseFolderOk(erBrowseFolderRequest, childFolders) {
        var parentIndex = this.getItemIndex(erBrowseFolderRequest.argument);
        if (parentIndex > -1) {
            var parent = this.folders[parentIndex];
            for each(var folder in childFolders) {
                this.addChild(parent, folder);
            }
        }
        window.setCursor("auto");
    },

    browseFolderError: function _browseFolderError(erUpdateItemRequest, aCode, aMsg) {
        this.globalFunctions.LOG("browseFolderError");
        window.setCursor("auto");
    },

    getFullPathByIndex: function _getFullPathByIndex(aIndex) {
        var result = "";
        var currentNode = this.folders[aIndex];
        while (currentNode) {
            if (result != "") {
                if (currentNode.foldername != "/") {
                    result = this.globalFunctions.encodeFolderSpecialChars(currentNode.foldername) + "/" + result;
                }
                else {
                    // We reached the top root.
                    result = currentNode.foldername + result;
                }
            }
            else {
                if (currentNode.foldername != "/") {
                    result = this.globalFunctions.encodeFolderSpecialChars(currentNode.foldername);
                }
                else {
                    result = currentNode.foldername;
                }
            }
            currentNode = currentNode.parent;
        }

        return result;
    },

    getFullPathByItem: function _getFullPathByItem(aItem) {
        var index = this.getItemIndex(aItem);
        if (index > -1) {
            return this.getFullPathByIndex(index);
        }
        else {
            return "";
        }
    },

    // TODO: finish this so we can open up the right node. Remember we are running async.
    setFullPath: function _setFullPath(aPath) {
        var paths = aPath.split("/");
        var pathindex = 0;

        var folderIndex = 0;
        var startFolder = this.folders[0];
        while ((folderIndex < startFolder.children.length) && (pathindex < paths.length)) {
            if (startFolder.children[folderIndex].foldername == paths[pathindex]) {
                var itemIndex = this.getItemIndex(startFolder);
                if (itemIndex > -1) {
                    this.toggleOpenState();
                }
                startFolder = startFolder.children[folderIndex];
                folderIndex = 0;
                index++;
            }
            else {
                folderIndex++;
            }
        }
    },
};


function exchBrowseFolder(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchBrowseFolder.prototype = {

    folderBrowserTreeView: null,

    onAccept: function _onAccept() {
        this._window.arguments[0].answer = "select";

        var treeIndex = this._document.getElementById('exchWebService_foldertree').currentIndex;
        this._window.arguments[0].fullPath = this.folderBrowserTreeView.getFullPathByIndex(treeIndex);
        this._window.arguments[0].selectedFolder = this.folderBrowserTreeView.folders[treeIndex];

        this.globalFunctions.LOG("onAccept");

        return true;
    },

    onLoad: function _onLoad() {
        this.globalFunctions.LOG("onLoad");
        var parentFolder = this._window.arguments[0].parentFolder;
        this.globalFunctions.LOG("parentFolder.user:" + parentFolder.user);

        try {
            this.folderBrowserTreeView = new exchWebService_browseTreeView(parentFolder);
        }
        catch (err) {
            this.globalFunctions.LOG("ERROR:" + err);
        }

        this._document.getElementById('exchWebService_foldertree').treeBoxObject.view = this.folderBrowserTreeView;
    },

    doOnSelect: function _doOnSelect() {
        var treeIndex = this._document.getElementById('exchWebService_foldertree').currentIndex;

        this._document.getElementById('exchWebService_currentSelectedPath').value = this.folderBrowserTreeView.getFullPathByIndex(treeIndex);
    },
}

var tmpBrowseFolder = new exchBrowseFolder(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpBrowseFolder.onLoad();
}, true);
