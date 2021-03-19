/* Enhanced priority display */

var Cu = Components.utils;
var Cc = Components.classes;
var Ci = Components.interfaces;
Components.utils.import("resource://app/modules/gloda/public.js");
Components.utils.import("resource://app/modules/gloda/explattr.js");
Components.utils.import("resource:///modules/iteratorUtils.jsm");

var importantTag;

function getImportantTag() {
    var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
        .getService(Components.interfaces.nsIMsgTagService);
    var tagArray = tagService.getAllTags({});
    for (var i = 0; i < tagArray.length; ++i) {
        var taginfo = tagArray[i];
        if (taginfo.tag === "Important") {
            importantTag = taginfo.key;
            return;
        }
    }
}

function tag(hdr) {
    if (importantTag) {
        toggleMessageTagPostEwsUpdate(importantTag, "addKeywordsToMessages", hdr);
    }
}

function gCP(pref) {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService);
    return prefService.getBranch("extensions.extras.").getCharPref(pref);
}

function gBP(pref) {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService);
    return prefService.getBranch("extensions.extras.").getBoolPref(pref);
}

function toggleMessageTagPostEwsUpdate(key, addKey, hdr) {
    var messages = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
    var msg = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
    var selectedMessages = gFolderDisplay.selectedMessages;
    var toggler = addKey ? "addKeywordsToMessages" : "removeKeywordsFromMessages";
    var prevHdrFolder = null;
    // this crudely handles cross-folder virtual folders with selected messages
    // that spans folders, by coalescing consecutive msgs in the selection
    // that happen to be in the same folder. nsMsgSearchDBView does this
    // better, but nsIMsgDBView doesn't handle commands with arguments,
    // and (un)tag takes a key argument.
    for (var i = 0; i < selectedMessages.length; ++i) {
        var msgHdr = hdr;

        if (msgHdr.label) {
            // Since we touch all these messages anyway, migrate the label now.
            // If we don't, the thread tree won't always show the correct tag state,
            // because resetting a label doesn't update the tree anymore...
            msg.clear();
            msg.appendElement(msgHdr, false);
            msgHdr.folder.addKeywordsToMessages(msg, "$label" + msgHdr.label);
            msgHdr.label = 0;
            // remove legacy label
        }
        if (prevHdrFolder != msgHdr.folder) {
            if (prevHdrFolder)
                prevHdrFolder[toggler](messages, key);
            messages.clear();
            prevHdrFolder = msgHdr.folder;
        }
        messages.appendElement(msgHdr, false);
    }
    if (prevHdrFolder)
        prevHdrFolder[toggler](messages, key);
}

function enhancePriority() {
    this._document = document;
    this._window = window;
}

enhancePriority.prototype = {

    execute: function _execute() {

        var extrasObserver = {
            observe: function (aMsgFolder, aTopic, aData) {
                if (gDBView) {
                    var columnHandler = {
                        getCellText: function (row, col) {
                            if (gBP("Iconify"))
                                return "";
                            return gDBView.cellTextForColumn(row, "priorityCol");
                        },

                        getSortStringForRow: function (hdr) {
                            if (columnHandler.old)
                                return columnHandler.old.getSortStringForRow(hdr);
                            return null;
                        },

                        isString: function () {
                            return !gBP("Iconify");
                        },

                        _atoms: {},
                        _getAtom: function (aName) {
                            if (!this._atoms[aName]) {
                                var as = Cc["@mozilla.org/atom-service;1"].
                                getService(Ci.nsIAtomService);
                                this._atoms[aName] = as.getAtom(aName);
                            }
                            return this._atoms[aName];
                        },

                        setProperty: function (prop, value) {
                            if (prop) {
                                prop.AppendElement(this._getAtom(value));
                                return "";
                            }
                            else {
                                return " " + value;
                            }
                        },

                        getExtensionProperties: function (row, props, which) {},

                        getCellProperties: function (row, col, props) {


                        },

                        isEditable: function (row, col) {
                            return false;
                        },
                        cycleCell: function (row, col) {},

                        getRowProperties: function (row, props) {
                            var properties = "";

                            var hdr = gDBView.getMsgHdrAt(row);
                            var priority = hdr.getStringProperty("priority");
                            var doHigh = gBP("ShadeHigh");
                            var doLow = gBP("ShadeLow");
                            var property;

                            switch (priority) {
                            case "6":
                                if (doHigh)
                                    property = gCP("HighestColor");
                                if (gBP("tagImportant")) {
                                    tag(hdr);
                                }
                                break;
                            case "5":
                                if (doHigh)
                                    property = gCP("HighestColor");
                                if (gBP("tagImportant")) {
                                    tag(hdr);
                                }
                                break;
                            case "3":
                                if (doLow)
                                    property = gCP("LowestColor");
                                break;
                            case "2":
                                if (doLow)
                                    property = gCP("LowestColor");
                                break;
                            }
                            if (property) {
                                property = 'lcolor-' + property.substr(1);
                                properties += this.setProperty(props, property);
                            }

                            if (columnHandler.old)
                                properties += (columnHandler.old.getRowProperties(row, props));
                            return properties;
                        },

                        getImageSrc: function (row, col) {
                            if (!gBP("Iconify"))
                                return null;
                            var hdr = gDBView.getMsgHdrAt(row);

                            var priority = hdr.getStringProperty("priority");
                            switch (priority) {
                            case "6":
                                return gCP("HighestIcon");
                            case "5":
                                return gCP("HighIcon");
                            case "3":
                                return gCP("LowIcon");
                            case "2":
                                return gCP("LowestIcon");
                            default:
                                if (columnHandler.old)
                                    return columnHandler.old.getImageSrc(row, col);
                            }
                        },

                        getSortLongForRow: function (hdr) {
                            if (columnHandler.old)
                                return columnHandler.old.getSortLongForRow(hdr);
                            return null;
                        }
                    }; //end-columnHandler

                    try {
                        columnHandler.old = gDBView.getColumnHandler("priorityCol");
                    }
                    catch (ex) {}

                    gDBView.addColumnHandler("priorityCol", columnHandler);

                } //ifend
            }
        };
        var ObserverService = Cc["@mozilla.org/observer-service;1"]
            .getService(Ci.nsIObserverService);
        ObserverService.addObserver(extrasObserver, "MsgCreateDBView", false);
    },

    onload: function _onload() {
        getImportantTag(); //get important tag
    },

};
var tmpEnhancePriority = new enhancePriority(window, document);
window.addEventListener("load", tmpEnhancePriority.onload(), false);
window.addEventListener("load", tmpEnhancePriority.execute(), false);
