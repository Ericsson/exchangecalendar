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

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

//Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/erForewardItem.js");


//if (! exchWebService) var exchWebService = {};

function exchForewardEvent(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchForewardEvent.prototype = {

    //exchWebService.forewardEvent = {
    currentView: function _currentView() {
        return this._document.getElementById("view-deck").selectedPanel;
    },

    onForEve: function _onForEve() {
        var item = this.currentView().getSelectedItems({})[0];
        var calendar = item.calendar;
        var args = new Object();
        args.startTime = item.startDate;
        args.endTime = item.endDate;
        args.organizer = item.organizer;
        args.item = item;
        args.attendees = item.organizer;
        args.calendar = calendar;
        args.onOk = this.callOnRightClick;
        args.opener = "exchWebService-onForEve";

        dump("\nxxxxxxx args" + JSON.stringify(args));

        this._window.openDialog("chrome://calendar/content/calendar-event-dialog-attendees.xul", "_blank", "chrome,titlebar,modal,resizable", args);

    },

    callOnRightClick: function (attendee, organizer, startTime, endTime) {
        var item = tmpForewardEvent.currentView().getSelectedItems({})[0];
        var calendar = item.calendar;
        var calId = calendar.id;
        var calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");
        var tmpObject = new erForewardItemRequest({
                user: tmpForewardEvent.globalFunctions.safeGetCharPref(calPrefs, "ecDomain") + "\\" + tmpForewardEvent.globalFunctions.safeGetCharPref(calPrefs, "ecUser"),
                mailbox: tmpForewardEvent.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
                serverUrl: tmpForewardEvent.globalFunctions.safeGetCharPref(calPrefs, "ecServer"),
                item: item,
                attendees: attendee,
                changeKey: item.changeKey,
                description: item.getProperty("description")
            },
            tmpForewardEvent.erForewardItemRequestOK, tmpForewardEvent.erForewardItemRequestError);
        return true;
    },

    erForewardItemRequestOK: function _erForewardItemRequestOK(aForewardItemRequest, aResp) {
        if (aResp) {
            var title = "Forwarding Event";
            var msg = aResp;
            var image = "chrome://exchangecommon-common/skin/images/notify-icon.png";
            var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
            getService(Components.interfaces.nsIWindowWatcher).
            openWindow(null, 'chrome://global/content/alerts/alert.xul',
                '_blank', 'chrome,titlebar=no,popup=yes', null);
            win.arguments = [image, title, msg, true, ''];

        }
    },

    erForewardItemRequestError: function _erForewardItemRequestError(aForewardItemRequest, aCode, aMsg) {
        alert(aCode + ":" + aMsg);
    },

    checkAllowForwardItem: function _checkAllowForwardItem() {
        var item = this.currentView().getSelectedItems({})[0];
        if ((item.calendar.type == "exchangecalendar") && (item.responseObjects.ForwardItem)) {
            this._document.getElementById("calendar-item-forward").hidden = false;
        }
        else {
            this._document.getElementById("calendar-item-forward").hidden = true;
        }
    },

}

var tmpForewardEvent = new exchForewardEvent(document, window);
