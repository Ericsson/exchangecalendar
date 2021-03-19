var gLdapServerURL;
var gLdapConnection;
var gLdapOperation;

var gPrefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);
var gConsole = Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);
// global arrays (or arrays) to hold data of manager and direct reports
// will be of the form...
// [[signum1, displayname1, phone1, office1, title1][signum2, displayname2, phone2, office2, title2]]
// phone is concat of all known phone numbers
var reporteeDtls = [];
var managerDtls = [];

//array of attributes that will always be retrieved from AD
var mandatoryAttribs = ["objectClass", "cn", "mail"]
var managersignum;
var searchemail;
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var calWinId = window.arguments[0].calendar.id;

var calPreferences = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService)
    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl." + calWinId + ".");
var globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);
searchemail = globalFunctions.safeGetCharPref(calPreferences, "ecMailbox");
var calendarEmail = searchemail;

//mapping of AD attributes to address book elements
//for people:
var peopleAttribMapping = [
    ["givenName", "FirstName"],
    ["sn", "LastName"],
    ["displayName", "DisplayName"],
    ["mailNickname", "NickName"] //re-label to signum
    ,
    ["mail", "PrimaryEmail"],
    ["homePhone", "Relationship"] //new item added in ericssoncontactcard.xul
    ,
    ["telephoneNumber", "WorkPhone"],
    ["otherTelephone", "PagerNumber"] //re-label to ECN Number
    ,
    ["mobile", "CellularNumber"],
    ["title", "JobTitle"],
    ["department", "Department"],
    ["company", "Company"],
    ["streetAddress", "WorkAddress"],
    ["l", "WorkCity"] //city
    ,
    ["st", "WorkState"] //state
    ,
    ["postalCode", "WorkZipCode"],
    ["co", "WorkCountry"] //country
    ,
    ["physicalDeliveryOfficeName", "WebPage1"] //re-label Web Page to Office
    ,
    ["info", "Notes"],
    ["facsimileTelephoneNumber", "FaxNumber"]
];

var additionalPeopleAttribs = ["manager", "directReports"];

//define attribs to get for manger and direct reports
//the display attribs will be displayed
//the check attribs are to check to ensure everything is in order
var otherPeopleDisplayAttribs = ["displayName", "mail", "telephoneNumber", "mobile", "otherTelephone", "physicalDeliveryOfficeName", "title"];
var otherPeopleCheckAttribs = ["manager"];

//this is where it all starts
//identify AD server and initiate async connection
//use callback functions in ldapListener object to process data returned.


function ldapInit() {
    var adServer;
    var container = document.getElementById("teamcontainer");
    try {
        adServer = gPrefs.getCharPref("mail.identity.id1.directoryServer");
    }
    catch (e) {
        container.hidden = true;
    }
    finally {}

    var adURL = gPrefs.getCharPref(adServer + ".uri");
    var adBindDN = gPrefs.getCharPref(adServer + ".auth.dn");
    //gConsole.logStringMessage("AD URL: " + adURL + " Bind DN: " + adBindDN);

    gLdapServerURL = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(adURL, null, null).QueryInterface(Components.interfaces.nsILDAPURL);
    gLdapServerURL.dn = adBindDN;

    gLdapConnection = Components.classes["@mozilla.org/network/ldap-connection;1"].createInstance().QueryInterface(Components.interfaces.nsILDAPConnection);
    gLdapConnection.init(gLdapServerURL, gLdapServerURL.dn, new ldapListener(), null, Components.interfaces.nsILDAPConnection.VERSION3);

}

function ldapListener() {}

ldapListener.prototype.QueryInterface =
    function (iid) {
        if (iid.equals(Components.interfaces.nsISupports) || iid.equals(Components.interfaces.nsILDAPMessageListener)) {
            //gConsole.logStringMessage("Inside QueryInterface");
            return this;
        }
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }


ldapListener.prototype.onLDAPMessage = function (aMessage) {

    //gConsole.logStringMessage("Inside onLDAPMessage; Operation: " + aMessage.operation + " Type: " + aMessage.type);
    var mailID = searchemail;
    if (aMessage.type === Components.interfaces.nsILDAPMessage.RES_BIND) {
        //0x61 Result of a bind operation.
        //gConsole.logStringMessage("starting search...");
        searchUserByEmail(mailID);
    }
    else if (aMessage.type === Components.interfaces.nsILDAPMessage.RES_SEARCH_ENTRY) {
        //first check if this is a person, or a DL, or something else
        //this is why the mandatoryAttrib check is important in searchUser
        var objectClassValues = aMessage.getValues("objectClass", {});
        if (objectClassValues.indexOf("person") > -1) {
            //check if the data returned is for the person on the card
            let mailValues = aMessage.getValues("mail", {});
            if (mailValues.indexOf(mailID) > -1) {
                //yep is for the card, start populating card values
                //populateCard(aMessage);
                //aMessage should also have manager and reportee details
                //send out request to AD for manager and reportee...
                if (searchemail == calendarEmail) {
                    sendRequestForManagerInfo(aMessage);
                }
                sendRequestForReporteeInfo(aMessage);
            }
            else {
                //its either the manager or the reportees
                let retAttribs = aMessage.getAttributes({});
                if (retAttribs.indexOf("manager") > -1) {
                    //manager found!!
                    let retValues = aMessage.getValues("manager", {});
                    let retValue = retValues[0] //pick up the first entry; should be more than one in any case
                        //break the string down to get the signum
                    let mgrSignum = getSignumFromCNString(retValue);
                    //check if manager of the record recieved is same the one for the current contact card
                    if (mgrSignum === managersignum) {
                        //direct reportee found
                        processDirectReportData(aMessage);
                    }
                    else {
                        //manager found
                        if (searchemail == calendarEmail) {
                            processManagerData(aMessage);
                        }
                    }
                }
                else {
                    //reached Hans Vestberg
                    if (searchemail == calendarEmail) {
                        processManagerData(aMessage);
                    }
                }
            }
        }
        else if (objectClassValues.indexOf("group") > -1) {
            //this is a distributionlist
            // populateCard(aMessage);
        }
        else {
            //this is neither a person nor a list
            //lets just spit out the details
            // aMessageBreakup(amessage);
        }
    }
    else if (aMessage.type === Components.interfaces.nsILDAPMessage.RES_SEARCH_RESULT) {
        //gConsole.logStringMessage("Inside onLDAPMessage; Operation: " + aMessage.operation + " Type: " + aMessage.type);
        //aMessageBreakup(amessage);
        //tried messagebreakup... nothing is returned. We can safely ignore this... i hope!
    }
    else {
        //not sure what happened!!
        //log since we get a message other than one of the above
        gConsole.logStringMessage("Inside onLDAPMessage; Operation: " + aMessage.operation + " Type: " + aMessage.type);
    }
    return
}

//following function is basically used to breakdown the aMessage
//for debugging etc
function aMessageBreakup(aMessage) {
    var retValues = []
    var retAttribs = []
    retAttribs = aMessage.getAttributes({});
    gConsole.logStringMessage("numAttribs recd: " + retAttribs.length);
    for (let ctr = 0; ctr < retAttribs.length; ctr++) {
        gConsole.logStringMessage("Value at pos: " + ctr + " is: " + retAttribs[ctr]);
        retValues = aMessage.getValues(retAttribs[ctr], {});
        gConsole.logStringMessage("numValues: " + retValues.length);
        for (let ctr2 = 0; ctr2 < retValues.length; ctr2++) {
            gConsole.logStringMessage("Value at pos: " + ctr2 + " is: " + retValues[ctr2]);
        }
    }
}

ldapListener.prototype.onLDAPInit =
    function (aConn, aStatus) {
        if (aStatus === 0) {
            //all ok, procedding with bind operation
            kickOffBind()
        }
        else {
            //oops!! something wrong, log it and get out!
            gConsole.logStringMessage("Inside onLDAPInit. Status is:" + aStatus);
        }
        return;
    }


function getLDAPOperation() {
    gLdapOperation = Components.classes["@mozilla.org/network/ldap-operation;1"].createInstance().QueryInterface(Components.interfaces.nsILDAPOperation);
    gLdapOperation.init(gLdapConnection, new ldapListener(), null);
}


function kickOffBind() {
    try {
        getLDAPOperation();
        var passwd = getPassword();
        if (passwd !== "") {
            gLdapOperation.simpleBind(passwd);
        }
    }
    catch (e) {
        gConsole.logStringMessage("Error in Bind: " + e);
    }
    return;
}


function searchUser(searchString, wantedAttribs) {
    var maxEntriesWanted = 300;
    //ensure the mandatory attribs are in the list of wantedAttribs... this is important!!
    for (let ctr = 0; ctr < mandatoryAttribs.length; ctr++) {
        if (wantedAttribs.indexOf(mandatoryAttribs[ctr]) === -1) {
            //do nothing and return
            return;
        }
    }
    getLDAPOperation();
    if (gLdapOperation) {
        gLdapOperation.searchExt("DC=ericsson,DC=se", gLdapServerURL.scope, searchString, wantedAttribs, 0, maxEntriesWanted);
    }
}


//use this function to get details of the main entry on the contact card
function searchUserByEmail(mailID) {
    //start building a list of attrib to be retrieved.
    //do a slice as we do not want a shallow copy as we will be adding more elements to this
    var wantedAttribs = mandatoryAttribs.slice(0);
    for (let ctr = 0; ctr < peopleAttribMapping.length; ctr++) {
        let len = wantedAttribs.push(peopleAttribMapping[ctr][0]);
    }
    for (let ctr = 0; ctr < additionalPeopleAttribs.length; ctr++) {
        let len = wantedAttribs.push(additionalPeopleAttribs[ctr]);
    }

    var searchString = "(&(mail=" + mailID + "))";
    searchUser(searchString, wantedAttribs);
}


//use this function to get details of manager and direct reports of the main entry on the contact card
function searchUserBySignum(signum) {
    //start building a list of attrib to be retrieved.
    //do a slice as we do not want a shallow copy as we will be adding more elements to this
    var wantedAttribs = mandatoryAttribs.slice(0);
    for (let ctr = 0; ctr < otherPeopleDisplayAttribs.length; ctr++) {
        let len = wantedAttribs.push(otherPeopleDisplayAttribs[ctr]);
    }
    for (let ctr = 0; ctr < otherPeopleCheckAttribs.length; ctr++) {
        let len = wantedAttribs.push(otherPeopleCheckAttribs[ctr]);
    }
    var searchString = "(&(cn=" + signum + "))";
    searchUser(searchString, wantedAttribs);
}


function sendRequestForManagerInfo(aMessage) {
    //see if manager attrib is present
    var retAttribs = aMessage.getAttributes({});
    if (retAttribs.indexOf("manager") > -1) {
        //manager found!!
        let retValues = aMessage.getValues("manager", {});
        let retValue = retValues[0] //pick up the first entry; should be more than one in any case
            //break the string down to get the signum
        let mgrSignum = getSignumFromCNString(retValue);
        searchUserBySignum(mgrSignum);
        //gConsole.logStringMessage("Manager: " + mgrSignum);
    }
}


function sendRequestForReporteeInfo(aMessage) {
    //see if directReports attrib is present
    var retAttribs = aMessage.getAttributes({});
    if (retAttribs.indexOf("directReports") > -1) {
        //direct reports found!!
        let retValues = aMessage.getValues("directReports", {});
        for (let ctr = 0; ctr < retValues.length; ctr++) {
            let empSignum = getSignumFromCNString(retValues[ctr]);
            searchUserBySignum(empSignum);
            //gConsole.logStringMessage("Direct Report: " + empSignum);
        }
    }
}

function getSignumFromCNString(strEmp) {
    //used to convert string like CN=erahver,OU=CA,OU=User,OU=P001,OU=ID,OU=Data,DC=ericsson,DC=se into erahver
    var signum = "";
    let signumStart = strEmp.indexOf("CN=") + 3;
    if (signumStart > -1) {
        let signumEnd = strEmp.indexOf(",", signumStart);
        signum = strEmp.substr(signumStart, signumEnd - signumStart)
    }
    return signum;
}

//get the user password for the ericsson email account
//we are screwed if the server is no longer mail.internal.ericsson.com!!
function getPassword() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);
    var passwd = "";
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = acctMgr.accounts;
    if (versionChecker.compare(appInfo.version, "20.0") >= 0) {
        for (var i = 0; i < accounts.length; i++) {
            var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);

            passwd = account.incomingServer.password;
            return passwd;

        }
    }
    else {
        for (let i = 0; i < accounts.Count(); i++) {
            let account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);

            passwd = account.incomingServer.password;
            return passwd;

        }
    }
    return passwd;
}

//extract first value from aMessage corresponding to attrib
//Note: the _first_ value will be returned, do not use this function if aMessaage has more than one value for attrib
function getValueFromAttrib(aMessage, attrib) {
    //gConsole.logStringMessage("Attrib: " + attrib);
    var attribValue = ""
    try {
        var attribValues = aMessage.getValues(attrib, {})
        attribValue = attribValues[0];
    }
    catch (exp) {
        //could not find the attribute, use a blank string instead
        attribValue = ""
    }
    return attribValue
}


function processDirectReportData(aMessage) {
    // create local array of resource to look like inner array (below) and then push to global reporteeDtls
    // [[signum1, displayname1, phone1, office1, title1][signum2, displayname2, phone2, office2, title2]]
    // based on ["displayName", "mail", "telephoneNumber", "mobile", "otherTelephone", "physicalDeliveryOfficeName", "title"]

    var reporteeData = [];

    var signum = getValueFromAttrib(aMessage, "cn");
    reporteeData.push(signum);
    var displayName = getValueFromAttrib(aMessage, "displayName");
    reporteeData.push(displayName);
    var mail = getValueFromAttrib(aMessage, "mail");
    reporteeData.push(mail);
    var phone1 = getValueFromAttrib(aMessage, "telephoneNumber");
    var phone2 = getValueFromAttrib(aMessage, "mobile");
    var phone3 = getValueFromAttrib(aMessage, "otherTelephone");
    var phone = concatPhoneNumbers(phone1, phone2, phone3);
    reporteeData.push(phone);
    var office = getValueFromAttrib(aMessage, "physicalDeliveryOfficeName");
    reporteeData.push(office);
    var title = getValueFromAttrib(aMessage, "title");
    reporteeData.push(title);
    // dump("\nccccccccc reporteeData " + reporteeData );

    var tree = document.getElementById("team");
    var cboxitem = document.createElement("treeitem");
    cboxrow = document.createElement("treerow");

    //add checkbox
    var cboxcell = document.createElement("treecell");

    cboxcell.setAttribute("value", "false");
    cboxcell.setAttribute("editable", true);
    cboxcell.setAttribute("name", "checkbox");
    cboxrow.appendChild(cboxcell);

    //add user
    cboxcell = document.createElement("treecell");
    cboxcell.setAttribute("label", displayName);
    cboxcell.setAttribute("name", "name");
    cboxcell.setAttribute("value", mail);
    cboxcell.setAttribute("editable", false);
    cboxrow.appendChild(cboxcell);
    cboxitem.appendChild(cboxrow);
    tree.appendChild(cboxitem);


    reporteeDtls.push(reporteeData);
    // document.getElementById('reporteeTree').view = reporteesTreeView;
}

//simply add all numbers to an array and then covert it into a string
function concatPhoneNumbers(phone1, phone2, phone3) {
    var phonearray = [];
    var temp;
    if (phone1 != "") {
        temp = phonearray.push(phone1);
    }
    if (phone2 != "") {
        temp = phonearray.push(phone2);
    }
    if (phone3 != "") {
        temp = phonearray.push(phone3);
    }
    return phonearray.toString();
}

//identical to processDirectReportData
//should merge the two functions...
//...the main reason for not doing this now is because the xul/dom should have unique element ids
//...we can merge if we have the same ids for both the manager tree and the reportee tree
function processManagerData(aMessage) {
    var managerData = [];

    var signum = getValueFromAttrib(aMessage, "cn");
    managerData.push(signum);
    var displayName = getValueFromAttrib(aMessage, "displayName");
    managerData.push(displayName);
    var mail = getValueFromAttrib(aMessage, "mail");
    managerData.push(mail);
    var phone1 = getValueFromAttrib(aMessage, "telephoneNumber");
    var phone2 = getValueFromAttrib(aMessage, "mobile");
    var phone3 = getValueFromAttrib(aMessage, "otherTelephone");
    var phone = concatPhoneNumbers(phone1, phone2, phone3);
    managerData.push(phone);
    var office = getValueFromAttrib(aMessage, "physicalDeliveryOfficeName");
    managerData.push(office);
    var title = getValueFromAttrib(aMessage, "title");
    managerData.push(title);
    //  dump("\nccccccccc managerData " + managerData );

    document.getElementById("teamheader").setAttribute("label", "Team: " + displayName);


    var tree = document.getElementById("team");
    var cboxitem = document.createElement("treeitem");
    cboxrow = document.createElement("treerow");

    //add checkbox
    var cboxcell = document.createElement("treecell");

    cboxcell.setAttribute("value", "false");
    cboxcell.setAttribute("editable", true);
    cboxcell.setAttribute("name", "checkbox");
    cboxrow.appendChild(cboxcell);

    //add user
    cboxcell = document.createElement("treecell");
    cboxcell.setAttribute("label", displayName);
    cboxcell.setAttribute("name", "name");
    cboxcell.setAttribute("cycler", "true");
    cboxcell.setAttribute("tooltiptext", mail);
    cboxcell.setAttribute("value", mail);
    cboxcell.setAttribute("editable", false);
    cboxrow.appendChild(cboxcell);
    cboxitem.appendChild(cboxrow);
    tree.appendChild(cboxitem);


    managerDtls.push(managerData);
    managersignum = signum;
    searchemail = mail;
    searchUserByEmail(searchemail);
}

function stopFetching() {
    if (gLdapOperation) {
        try {
            gLdapOperation.abandon();
        }
        catch (e) {}
    }
    return true;
}
