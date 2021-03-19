var Cu = Components.utils;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function exchCalendarEventDialog(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
}

exchCalendarEventDialog.prototype = {

    /*
     * setup menu window and button toolbars when editing an Exchange item
     */
    onLoad: function _onLoad() {
        let args = this._window.arguments[0];
        let item = args.calendarEvent;

        // We can't update toolbar from iframe
        if ((item.calendar) && (item.calendar.type == "exchangecalendar")) {

            let eventToolbar = this._document.getElementById("event-toolbar");

            // If the standard add url button was enabled, hidde it and show exchangecalendar attachment
            let currentSet = eventToolbar.getAttribute("currentset");
            if (currentSet.indexOf("button-url") === 1
                && currentSet.indexOf("exchWebService-add-attachment-button") === -1) {
                currentSet = currentSet.replace("button-url", "exchWebService-add-attachment-button");
            }

            // Switch toolbar buttons display
            this._document.getElementById("button-url").hidden = true;
            this._document.getElementById("exchWebService-add-attachment-button").hidden = false;

            // Switch window menu display
            this._document.getElementById("options-attachments-menu").collapsed = true;
            this._document.getElementById("exchWebService-options-attachments").collapsed = false;

        }
        else {
            // Switch toolbar buttons display
            this._document.getElementById("button-url").hidden = false;
            this._document.getElementById("exchWebService-add-attachment-button").hidden = true;

            // Switch window menu display
            this._document.getElementById("options-attachments-menu").collapsed = false;
            this._document.getElementById("exchWebService-options-attachments").collapsed = true;
        }
    },
}

var ewsCalendarEventDialog = new exchCalendarEventDialog(document, window);
window.addEventListener("load", function () {
    ewsCalendarEventDialog.onLoad();
}, false);
