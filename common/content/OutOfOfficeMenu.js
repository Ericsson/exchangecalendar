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
 * Author: Deepak Kumar
 * email: deepk2u@gmail.com
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

Cu.import("resource://exchangecommon/ecFunctions.js");

//if (! exchWebService) var exchWebService = {};

function exchToolsMenu(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchToolsMenu.prototype = {

    //exchWebService.outOfOfficeMenu = {

    isLoaded: false,

    showHide: function _showHide() {
        var myCal = getSelectedCalendar();
        var calType = myCal.type;
        var menuItem = this._document.getElementById("exchangecalendar-OutOfOfficeMenu");
        if (myCal && calType == "exchangecalendar") {
            menuItem.setAttribute("hidden", false);
        }
        else {
            menuItem.setAttribute("hidden", true);
        }
    },

    showHideonTools: function _showHideonTools() {
        var myCal = getSelectedCalendar();
        var calType = myCal.type;
        var menuItem = this._document.getElementById("exchangecalendar-tools-OutOfOfficeMenu");
        if (myCal && calType == "exchangecalendar") {
            menuItem.setAttribute("hidden", false);
        }
        else {
            menuItem.setAttribute("hidden", true);
        }
    },

    openOutofOfficeDialog: function _openOutofOfficeDialog() {
        var myCal = getSelectedCalendar();
        var aResult = "";
        aResult = {
            calendar: myCal,
            answer: ""
        };
        this._window.openDialog("chrome://exchangecommon/content/oofSettings.xul",
            "oofSettings",
            "chrome,titlebar,toolbar,centerscreen,dialog,modal=yes,resizable=yes",
            aResult);

    },

    onLoad: function _onLoad() {
        if (!this.isLoaded) {
            this.isLoaded = true;
            //			window.removeEventListener("load", exchWebService.outOfOfficeMenu.onLoad, true);
            var self = this;
            this._document.getElementById("taskPopup").addEventListener("popupshowing", function () {
                self.showHideonTools();
            }, true);
            this._document.getElementById("menu_Event_Task_Popup").addEventListener("popupshowing", function () {
                self.showHide();
            }, true);
        }
    },

    showAboutMemory: function _showAboutMemory(aVerbose) {
        openContentTab(aVerbose ? "about:memory?verbose" : "about:memory", "tab", "www.1st-setup.nl");
    },

}

var tmpToolsMenu = new exchToolsMenu(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpToolsMenu.onLoad();
}, true);

//window.addEventListener("load", exchWebService.outOfOfficeMenu.onLoad, true);

/*exchWebService.aboutMemory = {

	show: function _show()
	{
		openContentTab("about:memory", "tab", "www.1st-setup.nl");
	},
}*/
