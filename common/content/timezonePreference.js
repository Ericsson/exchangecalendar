var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

var prefs = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService);
var globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);

function autoTimezone(aState) {

    if (aState == true) {
        prefs.setCharPref("calendar.timezone.local", "");
        infoPopup(document.title, "Timezone is changed to to system.");
        document.getElementById("calendar-timezone-menulist").setAttribute("disabled", "true");
    }
    else {
        infoPopup(document.title, "System timezone is not set.");
        document.getElementById("calendar-timezone-menulist").removeAttribute("disabled");
    }
}

function infoPopup(title, msg) {
    var image = "chrome://exchangecommon-common/skin/images/notify-icon.png";
    var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
    getService(Components.interfaces.nsIWindowWatcher).
    openWindow(null, 'chrome://global/content/alerts/alert.xul',
        '_blank', 'chrome,titlebar=no,popup=yes', null);
    win.arguments = [image, title, msg, true, ''];
}

function checkUserTimezoneMenu() {
    var resetTimezone = globalFunctions.safeGetBoolPref(prefs, "calendar.timezone.local.auto");
    if (resetTimezone == true) {
        document.getElementById("calendar-timezone-menulist").setAttribute("disabled", "true");
    }
    else {
        document.getElementById("calendar-timezone-menulist").removeAttribute("disabled");
    }
}

//temporarily disable this feature in b3.4beta2 because it caused stuck queue jobs
//window.addEventListener("load",function(){ checkUserTimezoneMenu(); },false);
