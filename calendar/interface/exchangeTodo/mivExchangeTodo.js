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

Cu.import("resource://exchangecommon/ecExchangeRequest.js");

Cu.import("resource://calendar/modules/calProviderUtils.jsm");

Cu.import("resource://exchangecommoninterfaces/exchangeBaseItem/mivExchangeBaseItem.js");

Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

var exchGlobalFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);

var exchTimeZones = Cc["@1st-setup.nl/exchange/timezones;1"]
    .getService(Ci.mivExchangeTimeZones);

var EXPORTED_SYMBOLS = ["mivExchangeTodo"];

function mivExchangeTodo() {

    this.initialize();

    this.initExchangeBaseItem();

    //dump("mivExchangeTodo: init");

}

var mivExchangeTodoGUID = "95dac4fd-58c7-44f9-80ad-1448558fc460";

mivExchangeTodo.prototype = {

    __proto__: mivExchangeBaseItem.prototype,

    QueryInterface: XPCOMUtils.generateQI([Ci.mivExchangeTodo,
        Ci.mivExchangeBaseItem,
        Ci.calIInternalShallowCopy,
        Ci.calITodo,
        Ci.calIItemBase,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    _className: "mivExchangeTodo",
    _mainTag: "Task",

    classDescription: "Exchange calendar todo/task.",

    classID: components.ID("{" + mivExchangeTodoGUID + "}"),
    contractID: "@1st-setup.nl/exchange/calendartodo;1",
    flags: 0,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivExchangeTodo,
            Ci.mivExchangeBaseItem,
            Ci.calIInternalShallowCopy,
            Ci.calITodo,
            Ci.calIItemBase,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];

        count.value = ifaces.length;
        return ifaces;
    },

    initialize: function _initialize() {
        this._calEvent = null;
        this._calEvent = Cc["@mozilla.org/calendar/todo;1"]
            .createInstance(Ci.calITodo);
    },

    cloneFrom: function _cloneFrom(aItem) {
        //dump(" mivExchangeTodo: cloneFrom1\n");
        try {
            this.baseCloneFrom(aItem);
            if (aItem._entryDate) this._entryDate = aItem._entryDate;
            if (aItem._dueDate) this._dueDate = aItem._dueDate;
            if (aItem._completedDate) this._completedDate = aItem._completedDate;

            this._percentComplete = aItem._percentComplete;
            this._isCompleted = aItem._isCompleted;
            if (aItem._duration) this._duration = aItem._duration.clone();
            this._owner = aItem._owner;
            this._totalWork = aItem._totalWork;
            this._actualWork = aItem._actualWork;
            this._mileage = aItem._mileage;
            this._billingInformation = aItem._billingInformation;
            this._companies = [];
            if (aItem._companies) {
                for each(var company in aItem._companies) {
                    this._companies.push(company);
                }
            }
            this._status = null;
            if (aItem._status) this._status = aItem._status;
        }
        catch (err) {
            dump(" @@@@@@@@@@@@@ mivExchangeTodo: cloneFrom Error:" + err + "\n");
        }
        //dump(" mivExchangeTodo: cloneFrom2\n");
    },

    clone: function _clone() {
        try {
            //dump("mivExchangeTodo: clone 1: title:"+this.title+", contractId:"+this.contractID+"\n");

            var result = new mivExchangeTodo();

            result.baseClone(this);

            if (this._newStartDate !== undefined) result.startDate = this.startDate.clone();
            if (this._newEndDate !== undefined) result.endDate = this.endDate.clone();

            if (this._newStatus) {
                const statusMap = {
                    "NotStarted": "NONE",
                    "InProgress": "IN-PROCESS",
                    "Completed": "COMPLETED",
                    "WaitingOnOthers": "NEEDS-ACTION",
                    "Deferred": "CANCELLED",
                    null: "NONE"
                };

                result.status = statusMap[this._newStatus];
            }

            if (this._newEntryDate !== undefined) {
                if (this.entryDate) {
                    result.entryDate = this.entryDate.clone();
                }
                else {
                    result.entryDate = null;
                }
            }

            if (this._newDueDate !== undefined) {
                if (this.dueDate) {
                    result.dueDate = this.dueDate.clone();
                }
                else {
                    result.dueDate = null;
                }
            }
            if (this._newCompletedDate !== undefined) {
                if (this.completedDate) {
                    result.completedDate = this.completedDate.clone();
                }
                else {
                    result.completedDate = null;
                }
            }
            if (this._newPercentComplete) result.percentComplete = this._newPercentComplete;
            if (this._newDuration) result.duration = this._newDuration;
            if (this._newTotalWork) result.totalWork = this._newTotalWork;
            if (this._newActualWork) result.actualWork = this._newActualWork;
            if (this._newMileage) result.mileage = this._newMileage;
            if (this._newBillingInformation) result.billingInformation = this._newBillingInformation;
            if (this._newCompanies) result.companies = this.companies;
            if (this._newIsCompleted !== null) result.isCompleted = this._newIsCompleted;
        }
        catch (err) {
            dump("mivExchangeTodo: Clone: error:" + err + "\n");
        }
        //dump("mivExchangeTodo: clone 2: title:"+this.title+", contractId:"+this.contractID+"\n");
        return result;
    },


    //attribute calIDateTime entryDate;
    get entryDate() {
        //dump("get entryDate 2: title:"+this.title+", this._calEvent.entryDate:"+this._calEvent.entryDate+"\n");
        if (this._newEntryDate !== undefined) {
            return this._newEntryDate;
        }

        if (this._entryDate !== undefined) {
            return this._entryDate;
        }

        return this._calEvent.entryDate;
    },

    set entryDate(aValue) {
        //dump("set entryDate 1: title:"+this.title+", aValue:"+aValue+"\n");
        //dump("set entryDate x:"+exchGlobalFunctions.STACK()+"\n");
        if (aValue) {
            if ((!this.entryDate) || ((aValue.compare(this.entryDate) != 0) || (!this._newEntryDate) || (aValue.compare(this._newEntryDate) != 0))) {
                //if ((!this.entryDate) || (aValue.compare(this.entryDate) != 0)) {
                //dump("set entryDate 2: title:"+this.title+", aValue:"+aValue+"\n");
                this._newEntryDate = aValue.clone();
                this._calEvent.entryDate = aValue.clone();
            }
        }
        else {
            if (this.entryDate !== null) {
                //dump("this._newEntryDate becomes '"+aValue+"'\n");
                this._newEntryDate = aValue;
                this._calEvent.entryDate = aValue;
            }
        }
        //dump("set entryDate 3: title:"+this.title+", this._newEntryDate:"+this._newEntryDate+", this._calEvent.entryDate:"+this._calEvent.entryDate+"\n");
    },

    //attribute calIDateTime dueDate;
    get dueDate() {
        //dump("get dueDate 2: title:"+this.title+", this._calEvent.dueDate:"+this._calEvent.dueDate+"\n");
        if (this._newDueDate !== undefined) {
            return this._newDueDate;
        }

        if (this._dueDate !== undefined) {
            return this._dueDate;
        }

        return this._calEvent.dueDate;
    },

    set dueDate(aValue) {
        //dump("set dueDate 1: title:"+this.title+", aValue:"+aValue+", this.dueDate="+this.dueDate+", this._newDueDate="+this._newDueDate+"\n");
        if (aValue) {
            if ((!this.dueDate) || ((aValue.compare(this.dueDate) != 0) || (!this._newDueDate) || (aValue.compare(this._newDueDate) != 0))) {
                //dump("set dueDate 2: title:"+this.title+", aValue:"+aValue+"\n");
                this._newDueDate = aValue.clone();
                this._calEvent.dueDate = aValue.clone();
            }
        }
        else {
            if (this.dueDate !== null) {
                this._newDueDate = aValue;
                this._calEvent.dueDate = aValue;
            }
        }
        //dump("set dueDate 3: title:"+this.title+", this._newDueDate:"+this._newDueDate+", this._calEvent.dueDate:"+this._calEvent.dueDate+"\n");
    },

    //attribute calIDateTime completedDate;
    get completedDate() {
        //dump("get completedDate 2: title:"+this.title+", completedDate=="+this._calEvent.completedDate+"\n");
        if (this._newCompletedDate !== undefined) {
            return this._newCompletedDate;
        }

        if (this._completedDate !== undefined) {
            return this._completedDate;
        }

        return this._calEvent.completedDate;
    },

    set completedDate(aValue) {
        //dump("set completedDate: title:"+this.title+", aValue:"+aValue+"\n");
        if (aValue) {
            //			if ((!this._newCompletedDate) || (aValue.compare(this._newCompletedDate) != 0)) {
            if ((!this.completedDate) || (aValue.compare(this.completedDate) != 0)) {
                this._newCompletedDate = aValue.clone();
                this._calEvent.completedDate = aValue.clone();
            }
        }
        else {
            if (this.completedDate !== null) {
                this._newCompletedDate = aValue;
                this._calEvent.completedDate = aValue;
            }
        }
    },

    //attribute short percentComplete;
    get percentComplete() {
        if (this._newPercentComplete !== undefined) {
            //dump("get percentComplete 1: title:"+this.title+", this._newPercentComplete:"+this._newPercentComplete+"\n");
            return this._newPercentComplete;
        }

        if (this._percentComplete !== undefined) {
            //dump("get percentComplete 1: title:"+this.title+", this._percentComplete:"+this._percentComplete+"\n");
            return this._percentComplete;
        }

        //dump("get percentComplete 1: title:"+this.title+", this._calEvent.percentComplete:"+this._calEvent.percentComplete+"\n");
        return this._calEvent.percentComplete;
    },

    set percentComplete(aValue) {
        //dump("set percentComplete: title:"+this.title+", aValue:"+aValue+", this.percentComplete:"+this.percentComplete+"\n");
        if (aValue != this.percentComplete) {
            this._newPercentComplete = aValue;
            this._calEvent.percentComplete = aValue;
        }
    },

    get isCompleted() {
        if (this._newIsCompleted !== undefined) {
            return this._newIsCompleted;
        }

        if (this._isCompleted !== undefined) {
            return this._isCompleted;
        }

        return this._calEvent.isCompleted;
    },

    set isCompleted(aValue) {
        if (aValue != this.isCompleted) {
            this._newIsCompleted = aValue;
        }
        this._calEvent.isCompleted = aValue;
    },

    //attribute long totalWork;
    get totalWork() {
        if (this._newTotalWork !== undefined) {
            return this._newTotalWork;
        }

        return this._totalWork;
    },

    set totalWork(aValue) {
        if (aValue != this.totalWork) {
            this._newTotalWork = aValue;
            this._totalWork = aValue;
        }
    },

    //attribute long totalWork;
    get actualWork() {
        if (this._newActualWork !== undefined) {
            return this._newActualWork;
        }

        return this._actualWork;
    },

    set actualWork(aValue) {
        if (aValue != this.actualWork) {
            this._newActualWork = aValue;
            this._actualWork = aValue;
        }
    },

    //attribute AUTF8String mileage;
    get mileage() {
        if (this._newMileage !== undefined) {
            return this._newMileage;
        }

        return this._mileage;
    },

    set mileage(aValue) {
        if (aValue != this.mileage) {
            this._newMileage = aValue;
            this._mileage = aValue;
        }
    },

    //attribute AUTF8String billingInformation;
    get billingInformation() {
        if (this._newBillingInformation !== undefined) {
            return this._newBillingInformation;
        }

        return this._billingInformation;
    },

    set billingInformation(aValue) {
        if (aValue != this.billingInformation) {
            this._newBillingInformation = aValue;
            this._billingInformation = aValue;
        }
    },

    //void getCompanies(out PRUint32 count, [array, size_is(count), retval] out AUTF8String aCompanies);
    get companies() {
        var tmpCompanies = this.getCompanies({});
        var result = "";
        for (var index in tmpCompanies) {
            if (result != "") {
                result += ", ";
            }
            result += tmpCompanies[index];
        }

        return result;
    },

    set companies(aValue) {
        // Replace ", " (comma + space) by only comma.
        var tmpStr = aValue;

        while (tmpStr.indexOf(", ") >= 0) {
            tmpStr = tmpStr.replace(/, /g, ",");
        }

        var newArray = tmpStr.split(",");
        var newResult = "";
        for (var index in newArray) {
            if (newResult != "") {
                newResult += ", ";
            }
            newResult += newArray[index];
        }

        if (this.companies != newResult) {
            this.clearCompanies();
            for (var index in newArray) {
                this.addCompany(newArray[index]);
            }
        }

    },

    getCompanies: function _getCompanies(aCount) {
        if (this._newCompanies) {
            aCount.value = this._newCompanies.length;
            return this._newCompanies;
        }

        if (!this._companies) {
            aCount.value = 0;
            return [];
        }

        aCount.value = this._companies.length;
        return this._companies;
    },

    //void addCompany(in AUTF8String aCompany);
    addCompany: function _addCompany(aCompany) {
        if (!this._newCompanies) {
            this._newCompanies = [];
        }

        this._newCompanies.push(aCompany);
    },

    //void clearCompanies();
    clearCompanies: function _clearCompanies() {
        this._newCompanies = [];
    },

    get duration() {
        if (this._newDuration !== undefined) {
            return this._newDuration;
        }

        if (this._duration !== undefined) {
            return this._duration;
        }

        return this._calEvent.duration;
    },

    set duration(aValue) {
        if (aValue.toString() != this.duration.toString()) {
            this._newDuration = aValue;
            this._calEvent.duration = aValue;
        }
    },

    // status of the event
    //attribute AUTF8String status;
    get status() {
        const statusMap = {
            "NotStarted": "NONE",
            "InProgress": "IN-PROCESS",
            "Completed": "COMPLETED",
            "WaitingOnOthers": "NEEDS-ACTION",
            "Deferred": "CANCELLED",
            null: "NONE"
        };

        if (this._newStatus !== undefined) {
            //dump("mivExchangeTodo: get status: title:"+this.title+", this._newStatus:"+this._newStatus+", return:"+statusMap[this._newStatus]+"\n");
            return statusMap[this._newStatus];
        }

        if (this._status !== undefined) {
            //dump("mivExchangeTodo: get status: title:"+this.title+", this._status:"+this._status+", return:"+statusMap[this._status]+"\n");
            return statusMap[this._status];
        }

        //dump("mivExchangeTodo: get status: title:"+this.title+", this._calEvent.status:"+this._calEvent.status+", return:"+this._calEvent.status+"\n");
        return this._calEvent.status;
    },

    set status(aValue) {
        //dump("mivExchangeTodo: set status: title:"+this.title+", aValue:"+aValue+", this.status:"+this.status+"\n");
        if (aValue != this.status) {

            const statuses = {
                "NONE": "NotStarted",
                "IN-PROCESS": "InProgress",
                "COMPLETED": "Completed",
                "NEEDS-ACTION": "WaitingOnOthers",
                "CANCELLED": "Deferred",
                null: "NotStarted"
            };

            this._newStatus = statuses[aValue];
            this._calEvent.status = aValue;
            this._calEvent.setProperty("STATUS", aValue);
        }
    },

    //readonly attribute AUTF8String owner;
    get owner() {
        return this._owner;
    },

    get updateXML() {
        this._nonPersonalDataChanged = false;

        const statusMapInt = {
            "NotStarted": "0",
            "InProgress": "1",
            "Completed": "2",
            "WaitingOnOthers": "3",
            "Deferred": "4",
            null: "0"
        };

        var updates = exchGlobalFunctions.xmlToJxon('<t:Updates xmlns:m="' + nsMessagesStr + '" xmlns:t="' + nsTypesStr + '"/>');

        if (this._newTitle !== undefined) {
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "Subject", this._newTitle);
        }
        if (this._newPrivacy) {
            this.addSetItemField(updates, "Sensitivity", this._newPrivacy);
        }

        /*		if (this._newBody !== undefined) {
        			this._nonPersonalDataChanged = true;
        			this.addSetItemField(updates, "Body", this._newBody, { BodyType: "Text" });
        		}*/

        if (this.bodyType == "HTML") {
            if (this._newBody2 !== undefined) {
                this._nonPersonalDataChanged = true;
                if (this._newBody2 === null) {
                    this.addDeleteItemField(updates, "Body");
                }
                else {
                    this.addSetItemField(updates, "Body", this._newBody2, {
                        BodyType: "HTML"
                    });
                }
            }
        }
        else {
            if (this._newBody !== undefined) {
                this._nonPersonalDataChanged = true;
                if (this._newBody === null) {
                    this.addDeleteItemField(updates, "Body");
                }
                else {
                    this.addSetItemField(updates, "Body", this._newBody, {
                        BodyType: "Text"
                    });
                }
            }
        }

        if ((this._newPercentComplete) || ((this._newIsCompleted) && (this._newIsCompleted === true))) {
            this._nonPersonalDataChanged = true;
            switch (this.itemClass) {
            case "IPM.Note":
                //Email Todo
                let percentComplete = this.percentComplete / 100.0;
                this.addSetItemField(updates, "ExtendedFieldURI", percentComplete, {
                    "DistinguishedPropertySetId": "Task",
                    "PropertyId": "33026",
                    "PropertyType": "Double"
                });
                break;
            default:
                this.addSetItemField(updates, "PercentComplete", this.percentComplete);
            }
        }

        if ((this._newStatus) || (this._newIsCompleted !== undefined)) {
            this._nonPersonalDataChanged = true;

            if (this._newStatus) {
                switch (this.itemClass) {
                case "IPM.Note":
                    //Email Todo
                    if (this._newIsCompleted === true) {
                        let percentComplete = 1;
                        this.addSetItemField(updates, "ExtendedFieldURI", percentComplete, {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33026",
                            "PropertyType": "Double"
                        });
                        this.addSetItemField(updates, "ExtendedFieldURI", "1", {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33052",
                            "PropertyType": "Boolean"
                        });
                    }
                    else {
                        let percentComplete;
                        if (this._newStatus == "InProgress") {
                            percentComplete = this.percentComplete / 100.0;

                        }
                        else {
                            percentComplete = 0;
                        }
                        this.addSetItemField(updates, "ExtendedFieldURI", percentComplete, {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33026",
                            "PropertyType": "Double"
                        });
                        this.addSetItemField(updates, "ExtendedFieldURI", "0", {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33052",
                            "PropertyType": "Boolean"
                        });
                    }
                    this.addSetItemField(updates, "ExtendedFieldURI", statusMapInt[this._newStatus], {
                        "DistinguishedPropertySetId": "Task",
                        "PropertyId": "33025",
                        "PropertyType": "Integer"
                    });
                    break;
                default:
                    this.addSetItemField(updates, "Status", this._newStatus);
                }
            }
            else {
                if (this._newIsCompleted === false) {
                    switch (this.itemClass) {
                    case "IPM.Note":
                        //Email Todo
                        let percentComplete = 0;
                        this.addSetItemField(updates, "ExtendedFieldURI", percentComplete, {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33026",
                            "PropertyType": "Double"
                        });
                        this.addSetItemField(updates, "ExtendedFieldURI", statusMapInt["NotStarted"], {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33025",
                            "PropertyType": "Integer"
                        });
                        this.addSetItemField(updates, "ExtendedFieldURI", "0", {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33052",
                            "PropertyType": "Boolean"
                        });
                        break;
                    default:
                        this.addSetItemField(updates, "Status", "NotStarted");
                    }
                }
                else {
                    switch (this.itemClass) {
                    case "IPM.Note":
                        //Email Todo
                        this.addSetItemField(updates, "ExtendedFieldURI", statusMapInt["Completed"], {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33025",
                            "PropertyType": "Integer"
                        });
                        this.addSetItemField(updates, "ExtendedFieldURI", "1", {
                            "DistinguishedPropertySetId": "Task",
                            "PropertyId": "33052",
                            "PropertyType": "Boolean"
                        });
                        break;
                    default:
                        this.addSetItemField(updates, "Status", "Completed");
                    }
                }
            }
        }

        if (this._newTotalWork) {
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "TotalWork", this._newTotalWork);
        }

        if (this._newActualWork) {
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "ActualWork", this._newActualWork);
        }

        if (this._newMileage !== undefined) {
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "Mileage", this._newMileage);
        }

        if (this._newBillingInformation !== undefined) {
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "BillingInformation", this._newBillingInformation);
        }

        // Categories
        this.getCategories({});
        if (this._changesCategories) {
            var categoriesXML = Cc["@1st-setup.nl/conversion/xml2jxon;1"]
                .createInstance(Ci.mivIxml2jxon);
            var categories = this.getCategories({});
            var first = true;
            for each(var category in categories) {
                if (first) {
                    first = false;
                    categoriesXML.processXMLString("<t:String>" + category + "</t:String>", 0, null);
                }
                else {
                    categoriesXML.addSibblingTag("String", "t", category);
                }
            }
            if (categories.length > 0) {
                this.addSetItemField(updates, "Categories", categoriesXML);
            }
            else {
                if (this._categories.length > 0) {
                    this.addDeleteItemField(updates, "Categories");
                }
            }
        }

        // Companies
        if (this._newCompanies) {
            var companiesXML = Cc["@1st-setup.nl/conversion/xml2jxon;1"]
                .createInstance(Ci.mivIxml2jxon);
            var companies = this.getCompanies({});
            //var companies = this.companies;
            var first = true;
            for each(var company in companies) {
                if (first) {
                    first = false;
                    companiesXML.processXMLString("<t:String>" + company + "</t:String>", 0, null);
                }
                else {
                    companiesXML.addSibblingTag("String", "t", company);
                }
            }
            if (companies.length > 0) {
                this.addSetItemField(updates, "Companies", companiesXML);
            }
            else {
                if (this._companies.length > 0) {
                    this.addDeleteItemField(updates, "Companies");
                }
            }
        }

        if (this._newPriority) {
            this.addSetItemField(updates, "Importance", this._newPriority);
        }


        // Recurrence rule. Michel
        var recurrenceInfoChanged;
        if (this._recurrenceInfo) {
            // We had recurrenceInfo. Lets see if it changed.
            //dump("We had recurrenceInfo. Lets see if it changed.");
            if (this._newRecurrenceInfo !== undefined) {
                // It was changed or removed
                if (this._newRecurrenceInfo === null) {
                    // It was removed
                    //dump("We had recurrenceInfo. And it is removed.");
                    recurrenceInfoChanged = false;
                    this._nonPersonalDataChanged = true;
                    this.addDeleteItemField(updates, "Recurrence");
                }
                else {
                    // See if something changed
                    //dump("We had recurrenceInfo. And it was changed.");
                    recurrenceInfoChanged = true;
                }
            }
            else {
                // It could be that the content of the recurrenceInfo was changed
                if (this._recurrenceInfo.toString() != this.recurrenceInfo.toString()) {
                    //dump("We had recurrenceInfo. And it was changed. 2.\n");
                    recurrenceInfoChanged = true;
                }
            }
        }
        else {
            // We did not have recurrence info. Check if we have now
            //dump("We did not have recurrenceInfo. See if it was added.");
            if (this._newRecurrenceInfo) {
                //dump("We did not have recurrenceInfo. But we do have now.");
                recurrenceInfoChanged = true;
            }
        }

        if (recurrenceInfoChanged) {
            var recurrenceXML = this.makeRecurrenceRule();
            this._nonPersonalDataChanged = true;
            this.addSetItemField(updates, "Recurrence", recurrenceXML, null, true);

            // Next is to trigger sending the start and end dates when we have a changed reccurrence.
            if ((!this._newEntryDate) && (this.entryDate)) this._newEntryDate = this.entryDate.clone();
            if ((!this._newDueDate) && (this.dueDate)) this._newDueDate = this.dueDate.clone();

        }

        this.entryDate;
        if (this._newEntryDate) {
            var tmpStart = this._newEntryDate.clone();
            if (this._newEntryDate.isDate) {
                tmpStart.isDate = false;
                /*				var tmpDuration = cal.createDuration();
                				tmpDuration.minutes = -60;
                				tmpStart.addDuration(tmpDuration);*/

                // We make a non-UTC datetime value for exchGlobalFunctions.
                // EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
                //				var exchStart = cal.toRFC3339(tmpStart).substr(0, 19)+"Z"; //cal.toRFC3339(tmpStart).length-6);
                var exchStart = cal.toRFC3339(tmpStart).substr(0, 19); //cal.toRFC3339(tmpStart).length-6);
            }
            else {
                // We set in bias advanced to UCT datetime values for exchGlobalFunctions.
                //				var exchStart = cal.toRFC3339(tmpStart).substr(0, 19)+"Z";
                var exchStart = cal.toRFC3339(tmpStart).substr(0, 19);
            }
            this._nonPersonalDataChanged = true;
            switch (this.itemClass) {
            case "IPM.Note":
                //Email Todo
                this.addSetItemField(updates, "ExtendedFieldURI", exchStart, {
                    "DistinguishedPropertySetId": "Common",
                    "PropertyId": "34070",
                    "PropertyType": "SystemTime"
                });
                break;
            default:
                this.addSetItemField(updates, "StartDate", exchStart);
            }
        }
        else {
            if (((this._entryDate)) || (this._entryDate === undefined)) {
                this._nonPersonalDataChanged = true;
                switch (this.itemClass) {
                case "IPM.Note":
                    //Email Todo
                    break;
                default:
                    this.addDeleteItemField(updates, "StartDate");
                }
            }
        }

        this.dueDate;
        if (this._newDueDate) {
            var tmpEnd = this._newDueDate.clone();

            if (this._newDueDate.isDate) {
                tmpEnd.isDate = false;
                /*				var tmpDuration = cal.createDuration();
                				tmpDuration.minutes = -61;
                				tmpEnd.addDuration(tmpDuration);*/

                // We make a non-UTC datetime value for exchGlobalFunctions.
                // EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
                //				var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19)+"Z"; //cal.toRFC3339(tmpEnd).length-6);
                var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19);
            }
            else {
                // We set in bias advanced to UCT datetime values for exchGlobalFunctions.
                //				var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19)+"Z";
                var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19);
            }
            this._nonPersonalDataChanged = true;
            switch (this.itemClass) {
            case "IPM.Note":
                //Email Todo
                this.addSetItemField(updates, "ExtendedFieldURI", exchEnd, {
                    "DistinguishedPropertySetId": "Common",
                    "PropertyId": "34071",
                    "PropertyType": "SystemTime"
                });
                break;
            default:
                this.addSetItemField(updates, "DueDate", exchEnd);
            }
        }
        else {
            if (((this._dueDate) && (this._newDueDate === null)) || (this._dueDate === undefined)) {
                this._nonPersonalDataChanged = true;
                switch (this.itemClass) {
                case "IPM.Note":
                    //Email Todo
                    break;
                default:
                    this.addDeleteItemField(updates, "DueDate");
                }
            }
        }

        this.completedDate;
        if ((this._newCompletedDate) && ((this._newIsCompleted) && (this._newIsCompleted === true))) {
            //			var tmpEnd = this._newCompletedDate.clone();
            var tmpEnd = this.completedDate.clone();

            if (this.completedDate.isDate) {
                tmpEnd.isDate = false;
                /*				var tmpDuration = cal.createDuration();
                				tmpDuration.minutes = -61;
                				tmpEnd.addDuration(tmpDuration);*/

                // We make a non-UTC datetime value for exchGlobalFunctions.
                // EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
                //				var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19)+"Z"; //cal.toRFC3339(tmpEnd).length-6);
                var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19);
            }
            else {
                // We set in bias advanced to UCT datetime values for exchGlobalFunctions.
                //				var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19)+"Z";
                var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19);
            }
            this._nonPersonalDataChanged = true;
            switch (this.itemClass) {
            case "IPM.Note":
                //Email Todo
                this.addSetItemField(updates, "ExtendedFieldURI", exchEnd, {
                    "DistinguishedPropertySetId": "Task",
                    "PropertyId": "33039",
                    "PropertyType": "SystemTime"
                });
                break;
            default:
                this.addSetItemField(updates, "CompleteDate", exchEnd);
            }
        }
        else {
            if (((this._completedDate) && (this._newCompletedDate === null)) || (this._completedDate === undefined) || ((this._newIsCompleted) && (this._newIsCompleted === false))) {
                this._nonPersonalDataChanged = true;
                switch (this.itemClass) {
                case "IPM.Note":
                    //Email Todo
                    //this.addSetItemField(updates,"ExtendedFieldURI",exchEnd,{"DistinguishedPropertySetId":"Task","PropertyId":"33039","PropertyType":"SystemTime"});
                    break;
                default:
                    this.addDeleteItemField(updates, "CompleteDate");
                }
            }
        }

        if (this._newLegacyFreeBusyStatus) {
            this.addSetItemField(updates, "LegacyFreeBusyStatus", this._newLegacyFreeBusyStatus);
        }

        // Alarms and snoozes
        this.checkAlarmChange(updates);

        //  dump("\nupdates:"+updates.toString()+"\n");
        return updates;
    },

    preLoad: function _preLoad() {
        switch (this.itemClass) {
        case "IPM.Note":
            var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '34070']");
            if (tmpObject.length > 0) {
                this._entryDate = this.tryToSetDateValue(xml2json.getTagValue(tmpObject[0], "t:Value", null), this._calEvent.entryDate);
            }
            break;
        default:
            this._entryDate = this.tryToSetDateValue(this.getTagValue("t:StartDate", null), this._calEvent.entryDate);
        }

        if (this._entryDate) {
            /*				this._entryDate.hour = 0;
            			this._entryDate.minute = 0;
            			this._entryDate.second = 0;
            			this._entryDate.isDate = false;
            */
            if ((this._entryDate.hour === 0) && (this._entryDate.minute === 0) && (this.dueDate) && (this.dueDate.hour === 0) && (this.dueDate.minute === 0)) {
                // When a new task is created in outlook it will have entryDate en dueDate times set to 00:00.
                // We change this to the start of the working day..
                var dayStart = exchGlobalFunctions.safeGetIntPref(null, "calendar.view.daystarthour", 8);
                this._entryDate.hour = dayStart;
                this._dueDate.hour = dayStart;
                this._calEvent.dueDate = this._dueDate.clone();
            }

            var timezone = exchTimeZones.getCalTimeZoneByExchangeTimeZone(this.getTag("t:StartTimeZone"), "", this._entryDate);
            if (timezone) {
                this._entryDate = this._entryDate.getInTimezone(timezone);
            }
            this._calEvent.entryDate = this._entryDate.clone();
        }

        switch (this.itemClass) {
        case "IPM.Note":
            var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '34071']");
            if (tmpObject.length > 0) {
                this._dueDate = this.tryToSetDateValue(xml2json.getTagValue(tmpObject[0], "t:Value", null), this._calEvent.dueDate);
            }
            break;
        default:
            this._dueDate = this.tryToSetDateValue(this.getTagValue("t:DueDate", null), this._calEvent.dueDate);
        }

        if (this._dueDate) {
            var timezone = exchTimeZones.getCalTimeZoneByExchangeTimeZone(this.getTag("t:StartTimeZone"), "", this._dueDate);
            if (timezone) {
                this._dueDate = this._dueDate.getInTimezone(timezone);
            }
            this._calEvent.dueDate = this._dueDate.clone();
        }
    },

    postLoad: function _postLoad() {

        switch (this.itemClass) {
        case "IPM.Note":
            var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '33039']");
            if (tmpObject.length > 0) {
                this._completedDate = this.tryToSetDateValue(xml2json.getTagValue(tmpObject[0], "t:Value", null), this._calEvent.completedDate);
            }
            break;
        default:
            this._completedDate = this.tryToSetDateValue(this.getTagValue("t:CompleteDate", null), this._calEvent.completedDate);
        }

        if (this._completedDate) {
            var timezone = exchTimeZones.getCalTimeZoneByExchangeTimeZone(this.getTag("t:StartTimeZone"), "", this._completedDate);
            if (timezone) {
                this._completedDate = this._completedDate.getInTimezone(timezone);
            }
            this._calEvent.completedDate = this._completedDate.clone();
        }

        switch (this.itemClass) {
        case "IPM.Note":
            var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '33026']");
            if (tmpObject.length > 0) {
                this._percentComplete = xml2json.getTagValue(tmpObject[0], "t:Value", this._calEvent.percentComplete);
                this._percentComplete = this._percentComplete * 100;
            }
            break;
        default:
            this._percentComplete = this.getTagValue("t:PercentComplete", this._calEvent.percentComplete);
        }
        if (this._percentComplete) {
            this._calEvent.percentComplete = this._percentComplete;
        }

        const statusMap = {
            "NotStarted": "NONE",
            "InProgress": "IN-PROCESS",
            "Completed": "COMPLETED",
            "WaitingOnOthers": "NEEDS-ACTION",
            "Deferred": "CANCELLED",
            null: "NONE"
        };

        switch (this.itemClass) {
        case "IPM.Note":
            var tmpObject = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '33025']");
            if (tmpObject.length > 0) {
                var statusInt = xml2json.getTagValue(tmpObject[0], "t:Value", null);
                var noteStatus;
                if (statusInt === "2") {
                    noteStatus = "Completed";
                }
                else if (statusInt === "1") {
                    noteStatus = "InProgress";
                }
                else if (statusInt === "3") {
                    noteStatus = "WaitingOnOthers";
                }
                else if (statusInt === "4") {
                    noteStatus = "Deferred";
                }
                else if (statusInt === "0") {
                    noteStatus = "NotStarted";
                }
                else {
                    noteStatus = "NotStarted";
                }
            }
            else {
                noteStatus = "NotStarted";
            }

            if (noteStatus != "Completed") {
                var tmpObject_2 = this.XPath("/t:ExtendedProperty[t:ExtendedFieldURI/@PropertyId = '33052']");
                if (tmpObject_2.length > 0) {
                    let noteCompleted = xml2json.getTagValue(tmpObject_2[0], "t:Value", null);
                    if (noteCompleted === true) {
                        noteStatus = "Completed";
                    }
                }
            }

            this._status = noteStatus;
            break;
        default:
            this._status = this.getTagValue("t:Status", "NotStarted");
        }

        this._calEvent.status = statusMap[this._status];

        this._calEvent.setProperty("STATUS", statusMap[this._status]);
        this._isCompleted = (this._status == "Completed");

        this._calEvent.isCompleted = this._isCompleted;
        //dump("postLoad: title:"+this.title+", this._percentComplete:"+this._percentComplete+", isCompleted:"+this.isCompleted+", getProperty:"+this._calEvent.getProperty("STATUS")+", this.status:"+this.status+", entryDate:"+this.entryDate+"\n");

        this._totalWork = this.getTagValue("t:TotalWork", 0);

        this._actualWork = this.getTagValue("t:ActualWork", 0);

        this._mileage = this.getTagValue("t:Mileage", "");

        this._billingInformation = this.getTagValue("t:BillingInformation", "");

        this._companies = [];
        if (this._exchangeData) {
            var tmpStr = xml2json.XPath(this.exchangeData, "/t:Companies/t:String");
            for each(var string in tmpStr) {
                this._companies.push(xml2json.getValue(string));
            }
            tmpStr = null;
        }

        if ((!this._duration) && (!this._newEndDate) && (!this._newStartDate)) {
            this._duration = this.getTagValue("t:Duration", null);
            if (this._duration) {
                //dump("get duration: title:"+this.title+", value:"+cal.createDuration(this._duration));
                this._duration = cal.createDuration(this._duration);
            }
        }

        if (!this._owner) {
            this._owner = this.getTagValue("t:Owner", "(unknown)");
        }


    },

};

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivExchangeTodo) {
            // Load main script from lightning that we need.
            NSGetFactory.mivExchangeTodo = XPCOMUtils.generateNSGetFactory([mivExchangeTodo]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivExchangeTodo(cid);
}
