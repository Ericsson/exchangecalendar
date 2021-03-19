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
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

function exchAddressingWidgetOverlay(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchAddressingWidgetOverlay.prototype = {
    onLoad: function _onLoad() {
        // Add the exchangeAutoComplete option.
        if (this._document.getElementById("addressCol2#1")) {
            var autocompletesearch = this._document.getElementById("addressCol2#1").getAttribute("autocompletesearch");
            if (autocompletesearch.indexOf("exchangeAutoCompleteSearch") == -1) {
                this._document.getElementById("addressCol2#1").setAttribute("autocompletesearch", autocompletesearch + " exchangeAutoCompleteSearch");
            }
        }
    },
}


var tmpAddressingWidgetOverlay = new exchAddressingWidgetOverlay(document, window);
window.addEventListener("load", function () {
    window.removeEventListener("load", arguments.callee, false);
    tmpAddressingWidgetOverlay.onLoad();
}, true);
