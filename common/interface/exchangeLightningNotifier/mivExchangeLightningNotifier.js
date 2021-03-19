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
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/
 *
 * This interface/service is used for loadBalancing Request to Exchange
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
//Cu.import("resource://calendar/modules/calProviderUtils.jsm");

function mivExchangeLightningNotifier() {
    this.mObservers = new cal.ObserverBag(Ci.calIObserver);

    this.queue = [];

    this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this.timerRunning = false;

    this.observerService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.lightningnotifier.';

var mivExchangeLightningNotifierGUID = "3b2d58f7-9528-44cf-8cd7-865dc209590c";

mivExchangeLightningNotifier.prototype = {

    // methods from nsISupport
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeLightningNotifier,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo
    classDescription: "Load balancer in sending observer notify request to Lightning.",
    classID: components.ID("{" + mivExchangeLightningNotifierGUID + "}"),
    contractID: "@1st-setup.nl/exchange/lightningnotifier;1",
    flags: Ci.nsIClassInfo.SINGLETON,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods

    // Internal methods.
    notify: function _notify() {
        this.processQueue();
    },

    addToNotifyQueue: function _addToNotifyQueue(aCalendar, aCmd, aArg) {
        this.queue.push({
            calendar: aCalendar,
            cmd: aCmd,
            arg: aArg
        });

        if (!this.timerRunning) {
            this.timerRunning = true;
            //dump("mivExchangeLightningNotifier: Start timer\n");
            this.timer.initWithCallback(this, 500, this.timer.TYPE_REPEATING_SLACK);
        }
    },

    processQueue: function _processQueue() {
        //dump("mivExchangeLightningNotifier: processQueue\n");
        this.mObservers.notify("onStartBatch");

        for (var counter = 0;
            ((counter < 100) && (this.queue.length > 0)); counter++) {
            var notification = this.queue.shift();
            notification.calendar.notifyObservers.notify(notification.cmd, notification.arg);
            //this.mObservers.notify(notification.cmd, notification.arg);
        }
        this.mObservers.notify("onEndBatch");

        if (this.queue.length == 0) {
            //dump("mivExchangeLightningNotifier: stop timer\n");
            this.timer.cancel();
            this.timerRunning = false;
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeLightningNotifier) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeLightningNotifier = XPCOMUtils.generateNSGetFactory([mivExchangeLightningNotifier]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeLightningNotifier(cid);
}
