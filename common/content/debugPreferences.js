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
 * ## Exchange 2007/2010 Calendar and Tasks Provider.
 * ## For Thunderbird with the Lightning add-on.
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

Cu.import("resource://exchangecommon/ecFunctions.js");

if (!exchWebService) var exchWebService = {};

exchWebService.debugPreferences = {


    browseDebugFile: function _browseDebugFile() {
        const nsIFilePicker = Ci.nsIFilePicker;
        var fp = Cc["@mozilla.org/filepicker;1"]
            .createInstance(nsIFilePicker);

        var title = "Open log file";

        fp.init(window, title, nsIFilePicker.modeSave);

        var ret = fp.show();

        if (ret == nsIFilePicker.returnOK) {
            exchWebService.commonFunctions.LOG("[[" + fp.file.path + "]]");
            document.getElementById("extensions.1st-setup.debug.file").value = fp.file.path;
            //		exchWebService.commonFunctions.LOG("[["+fp.fileURL.spec.replace("file://", "")+"]]");
            //            document.getElementById("extensions.1st-setup.debug.file").value = fp.fileURL.spec.replace("file://", "");
            this.readLogLocation();
        }

    },

    onLoad: function _onLoad() {
        this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox1"), !document.getElementById("extensions.1st-setup.debug.log").value);
        this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox2"), !document.getElementById("extensions.1st-setup.debug.log").value);
    },

    disableChildren: function _disableChildren(aObject, aStatus) {
        var children = aObject.children;
        for (var i = 0; i < children.length; i++) {
            children[i].disabled = aStatus;
            this.disableChildren(children[i], aStatus);
        }
    },

    debugLogChanged: function _debugLogChanged(aCheckBox) {
        if (aCheckBox.checked) {
            this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox1"), false);
            this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox2"), false);
        }
        else {
            this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox1"), true);
            this.disableChildren(document.getElementById("exchangeWebService_debug_groupbox2"), true);
        }
    },

    readLogLocation: function _readLogLocation() {
        var logUrl = document.getElementById("exchangeWebService_preference_debug_file_filefield");
        logUrl.value = document.getElementById("extensions.1st-setup.debug.file").value;
        return undefined;
    },

}
