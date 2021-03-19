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
 * -- Exchange 2007/2010 Contacts.
 * -- For Thunderbird.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=xx
 * email: exchangecontacts@extensions.1st-setup.nl
 *
 *
 * ***** BEGIN LICENSE BLOCK *****/
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource:///modules/iteratorUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangeaddress/exchangeAbFunctions.js");


function exchangeAbDirFactory() {}

exchangeAbDirFactory.prototype = {

    classID: components.ID("{e6f8074c-0236-4f51-b8e2-9c528727b4ee}"),
    contractID: "@mozilla.org/addressbook/directory-factory;1?name=exchWebService-contactRoot-directory",
    classDescription: "Exchange 2007/2010 Contacts DirFactory",

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAbDirFactory]),

    getDirectories: function _getDirectories(aDirName, aURI, aPrefName) {
        exchWebService.commonAbFunctions.logInfo("getDirectories aDirName:" + aDirName + ", aUri:" + aURI + ", aPrefName:" + aPrefName + "\n");

        var accounts = exchWebService.commonAbFunctions.getAccounts();

        let result = [];
        var dir;

        // Add the root directory.
        var parentDir = MailServices.ab.getDirectory(aURI);
        result.push(parentDir);

        return exchWebService.commonFunctions.CreateSimpleEnumerator(result);
    },

    deleteDirectory: function (aDirectory) {
        // Currently unsupported.  Alert the user and bail out.
        exchWebService.commonAbFunctions.logInfo("deleteDirectory uri");
        exchWebService.commonAbFunctions.logInfo("Attempted to delete an EDS directory, which is currently"
            + " an unsupported action.");
        throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    },
}

function NSGetFactory(cid) {

    exchWebService.commonAbFunctions.logInfo("NSGetFactory for exchangeAbDirFactory 1");
    try {
        if (!NSGetFactory.exchWebService_ab1) {
            exchWebService.commonAbFunctions.logInfo("NSGetFactory for exchangeAbDirFactory 1a");

            NSGetFactory.exchWebService_ab1 = XPCOMUtils.generateNSGetFactory([exchangeAbDirFactory]);
        }

    }
    catch (e) {
        Components.utils.reportError(e);
        exchWebService.commonAbFunctions.logInfo(e);
        throw e;
    }

    exchWebService.commonAbFunctions.logInfo("NSGetFactory for exchangeAbDirFactory 2");
    return NSGetFactory.exchWebService_ab1(cid);
}

exchWebService.commonAbFunctions.logInfo("exchangeAbDirFactory: init.");
