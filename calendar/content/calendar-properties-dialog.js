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

function exchChangeCalendarProperties(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchChangeCalendarProperties.prototype = {

    onLoad: function _onLoad() {
        var aCalendar = this._window.arguments[0].calendar;
        if (aCalendar.type == "exchangecalendar") {
            this._document.getElementById("calendar-cache-row").setAttribute("collapsed", true);
            if (aCalendar.getProperty("exchWebService.useOfflineCache")) {
                this._document.getElementById("exchange-cache").checked = aCalendar.getProperty("exchWebService.useOfflineCache");

            }
            this._document.getElementById("calendar-refreshInterval-row").hidden = true;
        }
        else {
            this._document.getElementById("calendar-refreshInterval-row").hidden = false;

            this._document.getElementById("exchange-cache-row").setAttribute("collapsed", true);
        }
    },

    changeCachePref: function _changeCachePref() {
        var aCalendar = this._window.arguments[0].calendar;
        if (this._document.getElementById("exchange-cache").checked) {
            aCalendar.setProperty("exchWebService.useOfflineCache", true);
        }
        else {
            aCalendar.setProperty("exchWebService.useOfflineCache", false);
        }
    },
}

var tmpChangeCalendarProperties = new exchChangeCalendarProperties(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpChangeCalendarProperties.onLoad();
}, true);
