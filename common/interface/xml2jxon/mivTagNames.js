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

const nsSoapStr = "http://schemas.xmlsoap.org/soap/envelope/";
const nsTypesStr = "http://schemas.microsoft.com/exchange/services/2006/types";
const nsMessagesStr = "http://schemas.microsoft.com/exchange/services/2006/messages";
const nsAutodiscoverResponseStr1 = "http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006";
const nsAutodiscoverResponseStr2 = "http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a";
const nsAutodiscover2010Str = "http://schemas.microsoft.com/exchange/2010/Autodiscover";
const nsWSAStr = "http://www.w3.org/2005/08/addressing";
const nsXSIStr = "http://www.w3.org/2001/XMLSchema-instance";
const nsErrors = "http://schemas.microsoft.com/exchange/services/2006/errors";

function mivTagNames() {
    this.tagNames = new Array();
}

var mivTagNamesGUID = "b7309b24-96c6-4393-9ae4-05f3e7e8a4ac";

mivTagNames.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Ci.mivTagNames, Ci.nsIClassInfo, Ci.nsISupports]),
    classDescription: "XML TagNames manager.",
    classID: components.ID("{" + mivTagNamesGUID + "}"),
    contractID: "@1st-setup.nl/conversion/tagnames;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivTagNames, Ci.nsIClassInfo, Ci.nsISupports];
        count.value = ifaces.length;
        return ifaces;
    },
    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },
    getTagName: function _getTagName(aIndex) {
        if (aIndex >= this.tagNames.length) return "";
        return this.tagNames[aIndex];
    },
    addTagName: function _addTagName(aValue) {
        for (let index in this.tagNames) {
            if (this.tagNames[index] == aValue) {
                return index;
            }
        }
        this.tagNames.push(aValue);
        return (this.tagNames.length - 1);
    },
}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivTagNames) {
            // Load main script from lightning that we need.
            NSGetFactory.mivTagNames = XPCOMUtils.generateNSGetFactory([mivTagNames]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivTagNames(cid);
}
