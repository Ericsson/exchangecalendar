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

function jobObject(aJob, aServer, aLoadBalancer) {
    this.job = aJob;
    this.server = aServer;
    this.startTime = new Date().getTime();
    this.exchangeRequest = null;
    this.loadBalancer = aLoadBalancer;
    this.state = this.QUEUED;
    this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this.uuid = this.loadBalancer.globalFunctions.getUUID();

}

jobObject.prototype = {
    QUEUED: 0,
    RUNNING: 1,
    DONE: 2,
    ERROR: 3,
    notify: function setTimeout_notify(aTimer) {
        //dump(this.server+":loadBalancer: starting Job\n");

        var self = this;
        try {
            this.loadBalancer.logInfo(this.uuid + ":" + this.server + ":jobObject:notify: starting exchangeRequest.");

            this.exchangeRequest = new this.job.ecRequest(this.job.arguments,
                function myOk(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
                    self.onRequestOk(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, this.job);
                },
                function myError(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
                    self.onRequestError(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, this.job);
                }, this.job.listener);
            this.state = this.RUNNING;
        }
        catch (err) {
            dump(this.uuid + ":" + this.server + ":jobObject.notify Error:" + err + "\n");
            this.state = this.ERROR;
            this.exchangeRequest = null;
        }
    },

    onRequestOk: function _onRequestOk(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, job) {
        //dump(this.server+":jobObject.onRequestOk\n");
        this.loadBalancer.logInfo(this.uuid + ":" + this.server + ":jobObject:onRequestOk.");
        try {
            arg1.argument.cbOk(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
        }
        catch (err) {
            dump(this.uuid + ":" + this.server + ":jobObject.onRequestOk Error:" + err + "\n");
        }
        if (!this.exchangeRequest.isRunning) {
            this.loadBalancer.logInfo(this.uuid + ":" + this.server + ":jobObject:onRequestOk: isRunning=" + this.exchangeRequest.isRunning);
        }
    },

    onRequestError: function _onRequestError(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, job) {
        //dump(this.server+":jobObject.onRequestError\n");
        this.loadBalancer.logInfo(this.uuid + ":" + this.server + ":jobObject:onRequestError. arg2:" + arg2 + ", arg3:" + arg3);
        try {
            arg1.argument.cbError(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9);
        }
        catch (err) {
            dump(this.uuid + ":" + this.server + ":onRequestError Error:" + err + "\n");
        }
    },

    clear: function _clear() {
        this.loadBalancer.logInfo(this.uuid + ":" + this.server + ":jobObject:clear.");
        this.exchangeRequest = null;
        this.timer.cancel();
        this.timer = null;
        this.state = this.DONE;
        this.loadBalancer = null;
        this.job = null;
        this.server = null
    },

}

function serverQueue(aServer, aLoadBalancer) {
    this.observerService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);

    this.server = aServer;
    this.loadBalancer = aLoadBalancer;
    this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    this.timerStopped = true;
    this.uuid = this.loadBalancer.globalFunctions.getUUID();
    this.calendars = [];
    this.calendarIndex = 0;
    this.jobs = {};
    this.calendarNames = {};
    this.jobCount = 0;
    this.runningJobs = [];
    this.jobsRunning = 0;
}

serverQueue.prototype = {
    matchesServer: function _matchesServer(aServer) {
        return (aServer.toLowerCase() == this.server.toLowerCase());
    },

    clearQueueForCalendar: function _clearQueueForCalendar(aCalendar) {
        if (this.jobs[aCalendar.id]) {
            this.jobCount = this.jobCount - this.jobs[aCalendar.id].length;
            delete this.jobs[aCalendar.id];
            this.observerService.notifyObservers(aCalendar, "onExchangeProgressChange", null);
        }
    },

    stopRunningJobsForCalendar: function _stopRunningJobsForCalendar(aCalendar) {
        if (this.jobs[aCalendar.id]) {
            for (var index in this.runningJobs) {
                // only stop for current calendar
                try {
                    if ((this.runningJobs[index].exchangeRequest) && (this.runningJobs[index].exchangeRequest.isRunning) && (this.runningJobs[index].calendar) && (this.runningJobs[index].calendar.id == aCalendar.id)) {
                        this.runningJobs[index].exchangeRequest.stopRequest();
                    }
                }
                catch (err) {
                    this.loadBalancer.globalFunctions.LOG("serverQueue:" + this.server + ":stopRunningJobsForCalendar Error:" + err + " (" + this.globalFunctions.STACKshort() + ")", -1);
                }
            }
        }
    },

    addJob: function _addJob(aJob) {
        // Check if we already have this calendar id;
        if (!this.jobs[aJob.calendar.id]) {
            this.calendars.push(aJob.calendar.id);
            this.jobs[aJob.calendar.id] = [];
            this.calendarNames[aJob.calendar.id] = aJob.calendar.name;
        }

        this.jobs[aJob.calendar.id].push(aJob);
        this.jobCount++;

        if (this.timerStopped) {
            this.loadBalancer.logInfo("serverQueue:" + this.server + ": Timer started.", 1);
            this.timerStopped = false;
            this.timer.initWithCallback(this, 10, this.timer.TYPE_REPEATING_SLACK);
        }

        this.loadBalancer.logInfo("serverQueue:" + this.server + ": Added job to queue for server '" + this.server + "' for calendar '" + aJob.calendar.name + "'. We now have:" + this.jobs[aJob.calendar.id].length + " jobs.", 2);
        this.observerService.notifyObservers(aJob.calendar, "onExchangeProgressChange", null);
    },

    get maxJobs() {
        return 1; // Currently going for default one at a time to the same server because the xmlhttprequest cannot handle more simultaniously.
        //return this.globalFunctions.safeGetIntPref(null, PREF_MAINPART+"maxJobs", 3, true);
    },

    get sleepBetweenJobs() {
        return 50; // Currently going for default zero because it works.
        //return this.globalFunctions.safeGetIntPref(null, PREF_MAINPART+"sleepBetweenJobs", 2, true);
    },

    notify: function _notify(aTimer) {
        //dump(this.server+":loadBalancer: starting Job\n");
        try {
            // Cleanup jobs wich have finished
            var newJobList = [];
            for (var index in this.runningJobs) {
                if ((this.runningJobs[index].exchangeRequest) && (!this.runningJobs[index].exchangeRequest.isRunning)) {
                    // Job stopped.
                    this.loadBalancer.logInfo("serverQueue:" + this.server + ": Removing stopped job.", 1);
                    this.jobsRunning--;
                    this.runningJobs[index].clear();
                }
                else {
                    newJobList.push(this.runningJobs[index]);
                    if (this.runningJobs[index].state == jobObject.RUNNING) {
                        var timeNow = new Date().getTime();
                        var timeDiff = timeNow - this.runningJobs[index].startTime;
                        if (timeDiff > 300000) {
                            dump("We have a job which is running longer than 5 minutes:" + this.runningJobs[index].job.ecRequest + "\n");
                            if (this.runningJobs[index].exchangeRequest["runs"]) {
                                dump("  ## runs=" + this.runningJobs[index].exchangeRequest["runs"] + "  ##\n");
                            }
                            //dump("We have a job which is running longer than 5 minutes\n"); 
                            this.runningJobs[index].startTime = new Date().getTime();
                        }
                    }
                }
            }
            this.runningJobs = newJobList;

            //this.loadBalancer.logInfo("serverQueue:"+this.server+": Notify: this.runningJobs:"+this.runningJobs.length+".",2);

            if ((this.runningJobs.length < this.maxJobs) && (this.jobCount > 0)) {

                // Try to find next calendar with a job.
                var oldCalendarIndex = this.calendarIndex;
                do {
                    this.calendarIndex++;
                    if (this.calendarIndex >= this.calendars.length) {
                        this.calendarIndex = 0;
                    }
                } while ((this.jobs[this.calendars[this.calendarIndex]].length == 0) && (this.calendarIndex != oldCalendarIndex));

                if (this.jobs[this.calendars[this.calendarIndex]].length > 0) {
                    var job = this.jobs[this.calendars[this.calendarIndex]].shift();
                    if (job === undefined) {
                        dump("%%%%%%%%%%%%%%%%% job === undefined &&&&&&&&&&&&&&&&&&&&\n");
                    }
                    this.jobCount--;

                    this.observerService.notifyObservers(job.calendar, "onExchangeProgressChange", null);

                    job.arguments["cbOk"] = job.cbOk;
                    job.arguments["cbError"] = job.cbError;
                    job.arguments["job"] = job;
                    job.arguments["calendar"] = job.calendar;
                    var newJob = new jobObject(job, this.server, this.loadBalancer);
                    this.runningJobs.push(newJob);

                    this.jobsRunning++;
                    this.loadBalancer.logInfo("serverQueue:" + this.server + ":Starting job for calendar '" + job.calendar.name + "'. We now have:" + this.jobs[job.calendar.id].length + " jobs in queue and " + this.runningJobs.length + " jobs running.", 2);

                    //dump(server+":loadBalancer: starting timeout for Job\n");
                    newJob.timer.initWithCallback(newJob, this.sleepBetweenJobs, Ci.nsITimer.TYPE_ONE_SHOT);
                    this.loadBalancer.logInfo("serverQueue:" + this.server + ": Started timer for new job.", 1);
                }
                else {
                    dump("serverQueue:" + this.server + ": Strange. this.jobCount == " + this.jobCount + " but could not find calendar with jobs.\n");
                }
            }

            if ((this.jobCount == 0) && (this.runningJobs.length == 0)) {
                this.loadBalancer.logInfo("serverQueue:" + this.server + ": Stopping server queue timer.", 1);
                this.timer.cancel();
                this.timerStopped = true;
                this.loadBalancer.logInfo("serverQueue:" + this.server + ": Timer stopped.", 1);
            }
        }
        catch (err) {
            dump("serverQueue: notify: err:" + err + "\n");
        }
    },
}

function mivExchangeLoadBalancer() {
    this.serverQueues = [];

    this.observerService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);

    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);

}

var PREF_MAINPART = 'extensions.1st-setup.exchangecalendar.loadbalancer.';

var mivExchangeLoadBalancerGUID = "2db8c940-1927-11e2-892e-0800200c9a55";

mivExchangeLoadBalancer.prototype = {

    // methods from nsISupport
    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeLoadBalancer,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo
    classDescription: "Load balancer for requests to Exchange server.",
    classID: components.ID("{" + mivExchangeLoadBalancerGUID + "}"),
    contractID: "@1st-setup.nl/exchange/loadbalancer;1",
    flags: Ci.nsIClassInfo.SINGLETON,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // External methods

    addToQueue: function _addToQueue(aJob) {
        if (!aJob.arguments) {
            this.logInfo("addToQueue: arguments is not defined!!!????:" + this.globalFunctions.STACK());
            return;
        }

        var queueToUse = undefined;
        for each(var serverq in this.serverQueues) {
            if (serverq.matchesServer(aJob.arguments.serverUrl)) {
                queueToUse = serverq;
                break;
            }
        }

        if (queueToUse === undefined) {
            queueToUse = new serverQueue(aJob.arguments.serverUrl, this);
            this.serverQueues.push(queueToUse);
        }

        queueToUse.addJob(aJob);
    },

    get jobList() {
        return this.serverQueues;
    },

    clearQueueForCalendar: function _clearQueueForCalendar(aServer, aCalendar) {
        var queueToUse = undefined;
        for each(var serverq in this.serverQueues) {
            if (serverq.matchesServer(aServer)) {
                serverq.clearQueueForCalendar(aCalendar);
                break;
            }
        }
    },

    stopRunningJobsForCalendar: function _stopRunningJobsForCalendar(aServer, aCalendar) {
        var queueToUse = undefined;
        for each(var serverq in this.serverQueues) {
            if (serverq.matchesServer(aServer)) {
                serverq.stopRunningJobsForCalendar(aCalendar);
                break;
            }
        }

    },

    logInfo: function _logInfo(message, aDebugLevel) {

        if (!aDebugLevel) {
            var debugLevel = 1;
        }
        else {
            var debugLevel = aDebugLevel;
        }

        this.storedDebugLevel = this.globalFunctions.safeGetIntPref(null, PREF_MAINPART + "debuglevel", 0, true);
        if (debugLevel <= this.storedDebugLevel) {
            this.globalFunctions.LOG("[exchangeLoadBalancer] " + message + " (" + this.globalFunctions.STACKshort() + ")");
        }
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeLoadBalancer) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeLoadBalancer = XPCOMUtils.generateNSGetFactory([mivExchangeLoadBalancer]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeLoadBalancer(cid);
}
