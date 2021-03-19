/*
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is property of Ericsson. 
 * All Rights Reserved.
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/erFindFolder.js");

Cu.import("resource://exchangecalendar/erGetDelegateRequest.js");
Cu.import("resource://exchangecalendar/erAddDelegateRequest.js");
Cu.import("resource://exchangecalendar/erRemoveDelegateRequest.js");
Cu.import("resource://exchangecalendar/erUpdateDelegateRequest.js");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://exchangecommoninterfaces/xml2json/xml2json.js");

function exchDelegateCalendarSettings(aDocument, aWindow) {
    this._document = aDocument;
    this._window = aWindow;
    this.globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
        .getService(Ci.mivFunctions);
    this.loadBalancer = Cc["@1st-setup.nl/exchange/loadbalancer;1"]
        .getService(Ci.mivExchangeLoadBalancer);
    this.delegatesList = [];
}

exchDelegateCalendarSettings.prototype = {
    onLoad: function _onLoad() {
        var calender_id = this._window.arguments[0].calendar.id;
        var prefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calender_id + ".");
        if (this.globalFunctions.safeGetCharPref(prefs, "ecFolderbase") !== 'calendar') {
            return;
        }

        this.refresh();
        this.getDelegator();
        this._window.sizeToContent();
    },

    addSharedUser: function _addSharedUser() {
        var email = this.validateEmail(this._document.getElementById("customshareduser"));
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var calendarEmailDomain = this.emailDomain(email);
            var displayName = email.replace('@' + calendarEmailDomain, "");
            var cboxitem = this._document.createElement("treeitem");
            var cboxrow = this._document.createElement("treerow");
            var tree = this._document.getElementById("shared");
            //add checkbox
            var cboxcell = this._document.createElement("treecell");

            cboxcell.setAttribute("value", "false");
            cboxcell.setAttribute("editable", true);
            cboxcell.setAttribute("name", "checkbox");
            cboxrow.appendChild(cboxcell);

            //add user
            cboxcell = this._document.createElement("treecell");
            cboxcell.setAttribute("label", displayName);
            cboxcell.setAttribute("name", "name");
            cboxcell.setAttribute("value", email);
            cboxcell.setAttribute("editable", false);
            cboxrow.appendChild(cboxcell);
            cboxitem.appendChild(cboxrow);
            tree.appendChild(cboxitem);

        }
    },

    getDelegator: function _getDelegator() {
        //Load Team calendar 
        ldapInit(this);
        var tree = this._document.getElementById("shared");
        //    this.emptyList(listBox);     
        /**Add already added calendar in delegator list**/
        var tmpPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry.");

        var thisCalId = this._window.arguments[0].calendar.id;
        var userArr = [];
        var calendarEmail = this.calendarEmail();
        var calendarEmailDomain = this.emailDomain(calendarEmail);
        var children = tmpPrefs.getChildList("");
        if (children.length > 0) {
            // read prefs get uuid and description.
            for (var index in children) {

                var pos = children[index].indexOf(".");
                var tmpUUID = children[index].substr(0, pos);
                var tmpField = children[index].substr(pos + 1);

                if (tmpField == "uri") {
                    if (thisCalId != tmpUUID) {
                        var prefs = Cc["@mozilla.org/preferences-service;1"]
                            .getService(Ci.nsIPrefService)
                            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + tmpUUID + ".");
                        if (this.globalFunctions.safeGetCharPref(prefs, "delegateOwner") == thisCalId) {
                            if (userArr.indexOf(primaryAddress) == -1) {
                                userArr.push(primaryAddress);

                                var cboxitem = this._document.createElement("treeitem");
                                var cboxrow = this._document.createElement("treerow");

                                //add checkbox
                                var cboxcell = this._document.createElement("treecell");

                                cboxcell.setAttribute("value", "true");
                                cboxcell.setAttribute("editable", true);
                                cboxcell.setAttribute("name", "checkbox");
                                cboxrow.appendChild(cboxcell);

                                //add user
                                cboxcell = this._document.createElement("treecell");
                                cboxcell.setAttribute("label", this.globalFunctions.safeGetCharPref(prefs, "name"));
                                cboxcell.setAttribute("name", "name");
                                cboxcell.setAttribute("value", this.globalFunctions.safeGetCharPref(prefs, "ecMailbox"));
                                cboxcell.setAttribute("editable", false);
                                cboxrow.appendChild(cboxcell);
                                cboxitem.appendChild(cboxrow);
                                tree.appendChild(cboxitem);

                            }
                        }
                    }
                }
            }
        }

        var searchQuery = "(or(PrimaryEmail,bw,@V)(and(IsMailList,=,FALSE)))";
        searchQuery = searchQuery.replace(/@V/g, encodeURIComponent(calendarEmailDomain));

        let abManager = Components.classes["@mozilla.org/abmanager;1"]
            .getService(Components.interfaces.nsIAbManager);
        let allAddressBooks = abManager.directories;

        while (allAddressBooks.hasMoreElements()) {

            let ab = allAddressBooks.getNext();
            if (ab instanceof Components.interfaces.nsIAbDirectory
                && !ab.isRemote) {
                if (ab.dirName == "Collected Addresses") {
                    let searchResult = abManager.getDirectory(ab.URI + "?" + searchQuery).childCards;
                    // alert(searchResult);
                    while (searchResult.hasMoreElements()) {
                        var abCard = searchResult.getNext()
                            .QueryInterface(Components.interfaces.nsIAbCard);

                        var displayName;
                        var primaryAddress;
                        primaryAddress = abCard.primaryEmail;
                        if (abCard.displayName == "") {
                            displayName = abCard.primaryEmail.replace('@' + calendarEmailDomain, "");
                        }
                        else {
                            displayName = abCard.displayName;
                        }
                        if (displayName) {
                            //this will fire off async ldap requests and populate
                            //  the right nodes on the card
                            if (this.emailDomain(primaryAddress) === calendarEmailDomain) {
                                if (primaryAddress && (primaryAddress != calendarEmail)) {

                                    if (userArr.indexOf(primaryAddress) == -1) {
                                        userArr.push(primaryAddress);
                                        /*   var cboxrow =   this._document.createElement("listitem"); 
													         	 cboxrow.setAttribute("type","checkbox"); 
													         	 cboxrow.setAttribute("checked",false);
													         	 cboxrow.setAttribute("id",primaryAddress);
													         	 cboxrow.setAttribute("label", displayName ); 
													         	 cboxrow.setAttribute("value", primaryAddress  ); 
													         	 cboxrow.setAttribute("hidden","false");
														         listBox.appendChild(cboxrow); */
                                        var cboxitem = this._document.createElement("treeitem");
                                        var cboxrow = this._document.createElement("treerow");

                                        //add checkbox
                                        var cboxcell = this._document.createElement("treecell");

                                        cboxcell.setAttribute("value", "false");
                                        cboxcell.setAttribute("editable", true);
                                        cboxcell.setAttribute("name", "checkbox");
                                        cboxrow.appendChild(cboxcell);

                                        //add user
                                        cboxcell = this._document.createElement("treecell");
                                        cboxcell.setAttribute("label", displayName);
                                        cboxcell.setAttribute("name", "name");
                                        cboxcell.setAttribute("value", primaryAddress);
                                        cboxcell.setAttribute("editable", false);
                                        cboxrow.appendChild(cboxcell);
                                        cboxitem.appendChild(cboxrow);
                                        tree.appendChild(cboxitem);

                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    calendarEmail: function _calendarEmail() {
        var calId = this._window.arguments[0].calendar.id;
        var calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");
        return this.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox");
    },

    emailDomain: function _emailDomain(email) {
        if (email) {
            return email.replace(/.*@/, "");;
        }
        return;

    },

    addToQueue: function _addToQueue(aRequest, aArgument, aCbOk, aCbError, aListener) {
        this.loadBalancer.addToQueue({
            calendar: this,
            ecRequest: aRequest,
            arguments: aArgument,
            cbOk: aCbOk,
            cbError: aCbError,
            listener: aListener
        });
    },

    getEmail: function _getEmail() {
        var email = this._document.getElementById("email").value;
        if (email) {
            var d1 = this.emailDomain(this.calendarEmail());
            var d2;
            var sValidEmail = /<(\S+@\S+\.\S+)>/;
            var reValidEmail = new RegExp(sValidEmail);
            var isEmail = null;
            try {
                isEmail = email.match(reValidEmail)[1];
                d2 = this.emailDomain(isEmail);
            }
            catch (e) {
                sValidEmail = /\S+@\S+\.\S+/;
                reValidEmail = new RegExp(sValidEmail);
                isEmail = email.match(reValidEmail)[0];
                d2 = this.emailDomain(isEmail);
            }
            finally {
                if (d1 == d2) {
                    dump("\nccc " + isEmail);
                    return isEmail;
                }
                return;

            }
        }
        return;
    },

    validateEmail: function _validateEmail(textbox) {
        var email = textbox.value;
        if (email) {
            var d1 = this.emailDomain(this.calendarEmail());
            var d2;
            var sValidEmail = /<(\S+@\S+\.\S+)>/;
            var reValidEmail = new RegExp(sValidEmail);
            var isEmail = null;
            try {
                isEmail = email.match(reValidEmail)[1];
                d2 = this.emailDomain(isEmail);
            }
            catch (e) {
                sValidEmail = /\S+@\S+\.\S+/;
                reValidEmail = new RegExp(sValidEmail);
                isEmail = email.match(reValidEmail)[0];
                d2 = this.emailDomain(isEmail);
            }
            finally {
                if (d1 == d2) {
                    dump("\nccc " + isEmail);
                    return isEmail;
                }
                return;

            }
        }
        return;
    },

    changeDelegatorCalendar: function _changeDelegatorCalendar(event) {

        var tree = this._document.getElementById("sharedcalendars");
        var tbo = tree.boxObject;
        tbo.QueryInterface(Components.interfaces.nsITreeBoxObject);
        // get the row, col and child element at the point
        var row = {},
            col = {},
            child = {};
        tbo.getCellAt(event.clientX, event.clientY, row, col, child);

        var _isContainer = (tree.view.isContainer(row.value) === 'true');

        if (_isContainer) {
            return;
        }
        var isSelected = (tree.view.getCellValue(row.value, tree.columns.getColumnAt(0)) === 'true');
        var emailAddress = tree.view.getCellValue(row.value, tree.columns.getColumnAt(1));
        var displayName = tree.view.getCellText(row.value, tree.columns.getColumnAt(1));

        var checkBox = {
            emailAddress: emailAddress,
            checked: isSelected,
            displayName: displayName
        };

        if (checkBox.checked) {
            var calName = checkBox.displayName;
            var email = checkBox.emailAddress;
            if (calName && email) {
                this.createCalendar(checkBox);
            }
        }
        else {
            this.deleteCalendar(checkBox);
        }

        this._window.sizeToContent();
    },

    deleteCalendar: function _deleteCalendar(checkBox) {
        var email = checkBox.emailAddress;

        var tmpPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry.");

        var thisCalId = this._window.arguments[0].calendar.id;

        var children = tmpPrefs.getChildList("");
        if (children.length > 0) {
            // read prefs get uuid and description. 
            for (var index in children) {

                var pos = children[index].indexOf(".");
                var tmpUUID = children[index].substr(0, pos);
                var tmpField = children[index].substr(pos + 1);

                if (tmpField == "uri") {
                    var prefs = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService)
                        .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + tmpUUID + ".");
                    if (email == this.globalFunctions.safeGetCharPref(prefs, "ecMailbox") && thisCalId == this.globalFunctions.safeGetCharPref(prefs, "delegateOwner")) {
                        var calManager = Cc["@mozilla.org/calendar/manager;1"]
                            .getService(Ci.calICalendarManager);

                        let calendars = calManager.getCalendars({});
                        for each(let calendar in calendars) {
                            if (tmpUUID == calendar.id) {
                                calManager.unregisterCalendar(calendar);
                                calManager.deleteCalendar(calendar);
                            }
                        }
                    }
                }
            }
        } //children.length   
    },

    createCalendar: function _createCalendar(checkBox) {
        this.globalFunctions.LOG("Going to create the calendar in prefs.js - " + checkBox.displayName + " " + checkBox.emailAddress);

        var useOfflineCache = false;
        var calendarName = checkBox.displayName;
        var reminderOption = true;
        var emailAddress = checkBox.emailAddress;

        // Calculate the new calendar.id
        var newCalId = this.globalFunctions.getUUID();
        // Save settings in dialog to new cal id.
        //tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByCalId(newCalId);

        //Old Calendar Preferences 
        var calId = this._window.arguments[0].calendar.id;
        var calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

        var exchWebServicesgServer = this.globalFunctions.safeGetCharPref(calPrefs, "ecServer");
        var exchWebServicesgUser = this.globalFunctions.safeGetCharPref(calPrefs, "ecUser");
        var exchWebServicesgDomain = this.globalFunctions.safeGetCharPref(calPrefs, "ecDomain");
        var exchWebServicesgFolderPath = this.globalFunctions.safeGetCharPref(calPrefs, "ecFolderpath");
        var exchWebServicesgFolderBase = this.globalFunctions.safeGetCharPref(calPrefs, "ecFolderbase");
        var exchWebServicesgMailbox = emailAddress;
        var exchWebServicesgFolderIdOfShare = "";
        var exchWebServicesgFolderId = "";
        var exchWebServicesgChangeKey = "";

        //Applying parent calendarsettings to new calendar similar to autodiscovery : tmpSettingsOverlay.exchWebServicesSaveExchangeSettingsByCalId(newCalId);
        //New Calendar Preferences
        var exchWebServicesCalPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + newCalId + ".");

        if (exchWebServicesCalPrefs) {
            exchWebServicesCalPrefs.setCharPref("ecServer", exchWebServicesgServer);
            exchWebServicesCalPrefs.setCharPref("ecUser", exchWebServicesgUser);
            exchWebServicesCalPrefs.setCharPref("ecDomain", exchWebServicesgDomain);
            exchWebServicesCalPrefs.setCharPref("ecFolderpath", exchWebServicesgFolderPath);
            exchWebServicesCalPrefs.setCharPref("ecFolderbase", exchWebServicesgFolderBase);
            exchWebServicesCalPrefs.setCharPref("ecMailbox", exchWebServicesgMailbox);

            exchWebServicesCalPrefs.setCharPref("name", calendarName);
            exchWebServicesCalPrefs.setCharPref("delegateOwner", calId);

        }

        if ((exchWebServicesgFolderPath == "/") && (exchWebServicesgFolderIdOfShare == "")) {
            exchWebServicesgFolderID = "";
            exchWebServicesgChangeKey = "";
        }
        exchWebServicesCalPrefs.setCharPref("ecFolderID", exchWebServicesgFolderID);
        exchWebServicesCalPrefs.setCharPref("ecChangeKey", exchWebServicesgChangeKey);

        // Need to save the useOfflineCache preference separetly because it is not part of the main.
        this.prefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + newCalId + ".");
        this.prefs.setBoolPref("useOfflineCache", useOfflineCache);
        this.prefs.setIntPref("exchangePrefVersion", 1);

        // We create a new URI for this calendar which will contain the calendar.id
        var ioService = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
        var tmpURI = ioService.newURI("https://auto/" + newCalId, null, null);

        var calManager = Cc["@mozilla.org/calendar/manager;1"]
            .getService(Ci.calICalendarManager);
        var newCal = calManager.createCalendar("exchangecalendar", tmpURI);

        newCal.id = newCalId;
        newCal.name = calendarName;

        var calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("calendar.registry." + newCalId + ".");

        calPrefs.setCharPref("name", calendarName);

        newCal.setProperty("color", "Yellow");
        if (!reminderOption) {
            newCal.setProperty("suppressAlarms", true);
        }

        var identity = "id1";
        newCal.setProperty("imip.identity.key", identity);
        newCal.setProperty("cache.enabled", false);

        Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService).savePrefFile(null);

        calManager.registerCalendar(newCal);
    },

    getDelegate: function _getDelegate() {

        this.onActionLoad();
        var listBox = this._document.getElementById("delegatee");
        this.emptyList(listBox);
        var self = this;
        var calendar = this._window.arguments[0].calendar;
        var calId = this._window.arguments[0].calendar.id;
        var calPrefs = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

        var tmpObject = new erGetDelegateRequest({
                delegatingItem: "calendar",
                mailbox: this.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
                user: this.globalFunctions.safeGetCharPref(calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(calPrefs, "ecUser"),
                serverUrl: this.globalFunctions.safeGetCharPref(calPrefs, "ecServer"),
            },
            function (erGetDelegateRequest, aResp) {
                self.erGetDelegateRequestOK(erGetDelegateRequest, aResp)
            },
            function (erGetDelegateRequest, aCode, aMsg) {
                self.erGetDelegateRequestError(erGetDelegateRequest, aCode, aMsg)
            },
            null);

        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    refresh: function _refresh() {
        this.getDelegate();
        this.updateDelegateView();
    },

    delayRefresh: function _delayRefresh() {
        setTimeout(this.getDelegate(), 5000);
        setTimeout(this.updateDelegateView(), 7000);
    },

    listSelectEvent: function _listSelectEvent() {

        if (this.delegatesList.length > 0) {
            var node = this._document.getElementById("delegatee").getSelectedItem(0);
            if (node) {
                var childNodes = node.childNodes;
                var listName = childNodes[0].getAttribute("label");
                var regex = /[^()]+/g;
                var email = listName.match(regex);
                var listEmail = childNodes[0].getAttribute("value");

                for (var index = 0; index < this.delegatesList.length; index++) {
                    if (this.delegatesList[index].PrimarySmtpAddress == listEmail) {
                        // this._document.getElementById('email').value = listEmail;  
                        if (this.delegatesList[index].ReceiveCopiesOfMeetingMessages == 'true') {
                            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("checked", "true");
                        }
                        else {
                            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("checked", "false");
                        }
                        if (this.delegatesList[index].ViewPrivateItems == 'true') {
                            this._document.getElementById('ViewPrivateItems').setAttribute("checked", "true");
                        }
                        else {
                            this._document.getElementById('ViewPrivateItems').setAttribute("checked", "false");
                        }
                        // this._document.getElementById('deliverMeetingRequestslist').value = '';
                        this._document.getElementById('delegateCalendarpermission').value = this.delegatesList[index].DelegatePermissions;
                    }
                }
            }

        }
        this._window.sizeToContent();
    },

    erGetDelegateRequestOK: function _erGetDelegateRequestOK(aGetDelegateRequest, aResp) {
        if (aResp.length > 0) {
            for (index = 0; index < aResp.length; index++) {
                this.delegatesList[index] = aResp[index];
            }
            this.updateDelegateView();
        }
    },

    erGetDelegateRequestError: function _erGetDelegateRequestError(aGetDelegateRequest, aCode, aMsg) {
        this.globalFunctions.LOG("erGetDelegateRequestError: " + aCode + ":" + aMsg);
    },

    updateDelegateView: function _updateDelegateView() {

        var listBox = this._document.getElementById("delegatee");
        this.emptyList(listBox);
        for (var index = 0; index < this.delegatesList.length; index++) {
            var row = this._document.createElement("listitem");
            var cell = this._document.createElement("listcell");
            cell.setAttribute("label", this.delegatesList[index].DisplayName + " (" + this.delegatesList[index].PrimarySmtpAddress + ")");
            cell.setAttribute("value", this.delegatesList[index].PrimarySmtpAddress);
            row.appendChild(cell);
            listBox.appendChild(row);
        }
    },

    removeDelegateCache: function _removeDelegateCache(email) {
        if (email) {
            for (var index = 0; index < this.delegatesList.length; index++) {
                if (email == this.delegatesList[index].PrimarySmtpAddress) {
                    this.delegatesList.splice(index, 1);
                }
            }
        }
        this.updateDelegateView();
    },

    addDelegateCache: function _addDelegateCache(delegate) {
        if (delegate) {
            var count = this.delegatesList.length;
            if (!count) {
                count = 0;
            }

            this.delegatesList[count] = delegate;
        }
        this.updateDelegateView();
        this.delayRefresh();
    },

    removeDelegate: function _removeDelegate() {
        this.onActionLoad();
        var email = this.getEmail();
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var self = this;
            var calendar = this._window.arguments[0].calendar;
            var calId = this._window.arguments[0].calendar.id;
            var calPrefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

            var tmpObject = new erRemoveDelegateRequest({
                    delegatingItem: "calendar",
                    DelegateEmail: email,
                    mailbox: this.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(calPrefs, "ecServer"),
                },
                function (erRemoveDelegateRequest, aResp) {
                    self.erRemoveDelegateRequestOK(erRemoveDelegateRequest, aResp)
                },
                function (erRemoveDelegateRequest, aCode, aMsg) {
                    self.erRemoveDelegateRequestError(erRemoveDelegateRequest, aCode, aMsg)
                },
                null);
        }
        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    erRemoveDelegateRequestOK: function _erRemoveDelegateRequestOK(aRemoveDelegateRequest, aResp) {
        for (var index = 0; index < aResp.length; index++) {
            this.removeDelegateCache(aResp[index].PrimarySmtpAddress);
        }
        this.delayRefresh();
    },
    erRemoveDelegateRequestError: function _erRemoveDelegateRequestError(aRemoveDelegateRequest, aCode, aMsg) {
        switch (aCode) {
        case -8:
            aCode = "inCorrect email address requested!";
            break;

        default:
            this._window.alert("erRemoveDelegateRequestError: " + aCode + ":" + aMsg);
            return;
        }

        this._window.alert(aCode);

    },

    onActionLoad: function _onActionLoad() {
        this._window.sizeToContent();
        this._document.getElementById("delegateCalendaractionadd").setAttribute("disabled", "true");
        this._document.getElementById("delegateCalendaractionupdate").setAttribute("disabled", "true");
        this._document.getElementById("delegateCalendaractiondelete").setAttribute("disabled", "true");
        //	  this._document.getElementById("delegateCalendaractionrefresh").setAttribute("disabled", "true");
    },

    onActionLoadEnd: function _onActionLoadEnd() {
        this._window.sizeToContent();
        //  this._document.getElementById("email").Value=""; 
        this._document.getElementById("delegateCalendaractionadd").removeAttribute("disabled");
        this._document.getElementById("delegateCalendaractionupdate").removeAttribute("disabled");
        this._document.getElementById("delegateCalendaractiondelete").removeAttribute("disabled");
        //  this._document.getElementById("delegateCalendaractionrefresh").removeAttribute("disabled");
    },

    emptyList: function emptyList(listId) {
        var myListBox = listId;
        var countrow = myListBox.itemCount;
        while (countrow-- > 0) {
            myListBox.removeItemAt(0);
        }
    },

    addDelegate: function _addDelegate() {
        this.onActionLoad();
        var email = this.getEmail();
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            if (this.delegatesList) {
                for (var index = 0; index < this.delegatesList.length; index++) {
                    var listEmail = this.delegatesList[index].PrimarySmtpAddress;
                    if (email == listEmail) {
                        this._window.alert('Already added! do Update');
                        this.onActionLoadEnd();
                        this._window.sizeToContent();
                        return;
                    }
                }
            }
            var self = this;
            var calendar = this._window.arguments[0].calendar;
            var calId = this._window.arguments[0].calendar.id;
            var calPrefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");
            var delegateProperties = {
                DelegatePermissions: this._document.getElementById('delegateCalendarpermission').selectedItem.value,
                ReceiveCopiesOfMeetingMessages: this._document.getElementById('ReceiveCopiesOfMeetingMessages').checked,
                ViewPrivateItems: this._document.getElementById('ViewPrivateItems').checked,
                DeliverMeetingRequests: this._document.getElementById('deliverMeetingRequestslist').value,
            };
            var tmpObject = new erAddDelegateRequest({
                    delegatingItem: "calendar",
                    delegateproperties: delegateProperties,
                    delegateemail: email,
                    mailbox: this.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(calPrefs, "ecServer"),
                },
                function (erAddDelegateRequest, aResp) {
                    self.erAddDelegateRequestOK(erAddDelegateRequest, aResp)
                },
                function (erAddDelegateRequest, aCode, aMsg) {
                    self.erAddDelegateRequestError(erAddDelegateRequest, aCode, aMsg)
                },
                null);
        }
        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    erAddDelegateRequestOK: function _erAddDelegateRequestOK(aAddDelegateRequest, aResp) {
        if (aResp.length > 0) {
            for (var index = 0; index < aResp.length; index++) {
                //dump("\n  "+ index + " Resp 1: " + aResp[index].SID );	
                //dump("\n  "+ index + " Resp 2: " + aResp[index].PrimarySmtpAddress );	
                //dump("\n  "+ index + " Resp 3: " + aResp[index].DisplayName );	
                //dump("\n  "+ index + " Resp 4: " + aResp[index].DelegatePermissions );	
                //dump("\n  "+ index + " Resp 5: " + aResp[index].ReceiveCopiesOfMeetingMessages );	
                //dump("\n  "+ index + " Resp 6: " + aResp[index].ViewPrivateItems ); 
                this.addDelegateCache(aResp[index]);
            }
        }
    },

    erAddDelegateRequestError: function _erAddDelegateRequestError(aAddDelegateRequest, aCode, aMsg) {
        switch (aCode) {
        case -8:
            aCode = "inCorrect email address requested!";
            break;

        default:
            this._window.alert("erAddDelegateRequestError : " + aCode + " : " + aMsg);
            return;
        }

        this._window.alert(aCode);
    },

    updateDelegate: function _updateDelegate() {

        this.onActionLoad();
        var email = this.getEmail();
        if (!email) {
            this._window.alert('Not Valid Email address! ');
            this.onActionLoadEnd();
            this._window.sizeToContent();
        }
        else {
            var self = this;
            var calendar = this._window.arguments[0].calendar;
            var calId = this._window.arguments[0].calendar.id;
            var calPrefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calId + ".");

            var delegateProperties = {
                DelegatePermissions: this._document.getElementById('delegateCalendarpermission').selectedItem.value,
                ReceiveCopiesOfMeetingMessages: this._document.getElementById('ReceiveCopiesOfMeetingMessages').checked,
                ViewPrivateItems: this._document.getElementById('ViewPrivateItems').checked,
                DeliverMeetingRequests: this._document.getElementById('deliverMeetingRequestslist').value,
            };

            var tmpObject = new erUpdateDelegateRequest({
                    delegatingItem: "calendar",
                    delegateproperties: delegateProperties,
                    delegateemail: email,
                    mailbox: this.globalFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
                    user: this.globalFunctions.safeGetCharPref(calPrefs, "ecDomain") + "\\" + this.globalFunctions.safeGetCharPref(calPrefs, "ecUser"),
                    serverUrl: this.globalFunctions.safeGetCharPref(calPrefs, "ecServer"),
                },
                function (erUpdateDelegateRequest, aResp) {
                    self.erUpdateDelegateRequestOK(erUpdateDelegateRequest, aResp)
                },
                function (erUpdateDelegateRequest, aCode, aMsg) {
                    self.erUpdateDelegateRequestError(erUpdateDelegateRequest, aCode, aMsg)
                },
                null);
        }

        this.onActionLoadEnd();
        this._window.sizeToContent();
    },

    erUpdateDelegateRequestOK: function _erUpdateDelegateRequestOK(aUpdateDelegateRequest, aResp) {
        if (aResp.length > 0) {
            var listBox = this._document.getElementById("delegatee");
            for (index = 0; index < aResp.length; index++) {
                //dump("\n  "+ index + " Resp 1: " + aResp[index].SID );	
                //dump("\n  "+ index + " Resp 2: " + aResp[index].PrimarySmtpAddress );	
                //dump("\n  "+ index + " Resp 3: " + aResp[index].DisplayName );	
                //dump("\n  "+ index + " Resp 4: " + aResp[index].DelegatePermissions );	
                //dump("\n  "+ index + " Resp 5: " + aResp[index].ReceiveCopiesOfMeetingMessages );	
                //dump("\n  "+ index + " Resp 6: " + aResp[index].ViewPrivateItems ); 
                this.removeDelegateCache(aResp[index].PrimarySmtpAddress);
                this.addDelegateCache(aResp[index]);
            }
        }
        this.delayRefresh();
    },

    erUpdateDelegateRequestError: function _erUpdateDelegateRequestError(aUpdateDelegateRequest, aCode, aMsg) {

        switch (aCode) {
        case -8:
            aCode = "inCorrect email address requested!";
            break;

        default:
            this._window.alert("erUpdateDelegateRequestError " + aCode + ":" + aMsg);
            return;
        }

        this._window.alert(aCode);

    },

    deliverMeetingRequestsSelectEvent: function _deliverMeetingRequestsSelectEvent() {
        if (this._document.getElementById('deliverMeetingRequestslist').selectedItem.value == 'DelegatesOnly') {
            this._document.getElementById('deliverMeetingRequestsDesc').value = 'Meeting requests are forwarded to the delegate and moved to the Deleted Items folder.';
        }
        else if (this._document.getElementById('deliverMeetingRequestslist').selectedItem.value == 'DelegatesAndMe') {
            this._document.getElementById('deliverMeetingRequestsDesc').value = 'Meeting requests are forwarded to the delegate.';
        }
        else if (this._document.getElementById('deliverMeetingRequestslist').selectedItem.value == 'DelegatesAndSendInformationToMe') {
            this._document.getElementById('deliverMeetingRequestsDesc').value = "Meeting requests are forwarded but the Accept, Tentative, and Decline buttons do not appear.";
        }
    },

    permissionsSelectEvent: function _permissionsSelectEvent() {

        if (this._document.getElementById('delegateCalendarpermission').selectedItem.value == 'Author') {
            // this._document.getElementById('deliverMeetingRequestslist').setAttribute("disabled", "false");
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("checked", "false");
            this._document.getElementById('delegateCalendarpermissiondiv').value = 'Read and create items in the Calendar folder.';
        }
        if (this._document.getElementById('delegateCalendarpermission').selectedItem.value == 'Editor') {
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("disabled", "false");
            this._document.getElementById('delegateCalendarpermissiondiv').value = 'Read, create, and modify items in the Calendar folder.';
            //  this._document.getElementById('deliverMeetingRequestslist').setAttribute("disabled", "false");
        }
        if (this._document.getElementById('delegateCalendarpermission').selectedItem.value == 'Reviewer') {
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("disabled", "true");
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("checked", "false");
            this._document.getElementById('delegateCalendarpermissiondiv').value = 'Read items in the Calendar folder.';
            //  this._document.getElementById('deliverMeetingRequestslist').setAttribute("disabled", "true");
        }
        if (this._document.getElementById('delegateCalendarpermission').selectedItem.value == 'None') {
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("disabled", "true");
            this._document.getElementById('ReceiveCopiesOfMeetingMessages').setAttribute("checked", "false");
            this._document.getElementById('delegateCalendarpermissiondiv').value = 'No access permissions to the Calendar folder.';
            //	this._document.getElementById('deliverMeetingRequestslist').setAttribute("disabled", "false");
        }
        this._window.sizeToContent();
    },


    doCancel: function _doCancel() {
        this._window.sizeToContent();
        this._window.close();
    },


};

var tmpDelegateCalendarSettings = new exchDelegateCalendarSettings(document, window);
