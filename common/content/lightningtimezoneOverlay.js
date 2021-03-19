var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


function lightningTimzone(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

    this.prefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService);
}

lightningTimzone.prototype = {
    onload: function _onload() {
        this.resetTimezone = this.globalFunctions.safeGetBoolPref(this.prefs, "calendar.timezone.local.auto");
        var timezone = this.globalFunctions.safeGetCharPref(this.prefs, "calendar.timezone.local");
        if (timezone) {
            try {
                if (this.resetTimezone == true) {
                    var self = this;
                    setTimeout(function () {
                            self.prefs.setCharPref("calendar.timezone.local", "");
                            self.infoPopup("Timezone Information", "System timezone changed and set to lightning automatically!");
                            self.globalFunctions.LOG("lightningTimzone : Timzone Changed");
                        },
                        120000);
                }
            }
            catch (e) {
                this.prefs.setCharPref("calendar.timezone.local", timezone);
            }
        }

        this.onTimezoneChange();
    },

    onTimezoneChange: function _onTimezoneChange() {

        var oldOffset;
        var currentOffset;
        var self = this;

        function change2() {
            var resetTimezone = self.globalFunctions.safeGetBoolPref(self.prefs, "calendar.timezone.local.auto");
            if (resetTimezone == true) {
                var nowdate = new Date();
                currentOffset = nowdate.getTimezoneOffset();

                if (oldOffset != currentOffset && oldOffset != undefined && currentOffset != undefined) {
                    self.prefs.setCharPref("calendar.timezone.local", "");
                    self.globalFunctions.LOG("lightningTimzone : Timzone Changed");
                }
                oldOffset = currentOffset;
            }
        }

        function change() {
            change2();
        }
        setInterval(change, 3600000); //interval = 1000*60*60*1 Hour(s)			
    },

    infoPopup: function _infoPopup(title, msg) {
        var image = "chrome://exchangecommon-common/skin/images/notify-icon.png";
        var win = Components.classes['@mozilla.org/embedcomp/window-watcher;1'].
        getService(Components.interfaces.nsIWindowWatcher).
        openWindow(null, 'chrome://global/content/alerts/alert.xul',
            '_blank', 'chrome,titlebar=no,popup=yes', null);
        win.arguments = [image, title, msg, true, ''];
    },

}

var tmpLightningTimezone = new lightningTimzone(document, window);

//temporarily disable this feature in b3.4beta2 because it caused stuck queue jobs 
//window.addEventListener("load",function(){tmpLightningTimezone.onload();},false);
