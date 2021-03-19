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

function mivNameSpaces() {
    this.nameSpaces = new Array();

    this.addNameSpace("s", nsSoapStr);
    this.addNameSpace("m", nsMessagesStr);
    this.addNameSpace("t", nsTypesStr);
    this.addNameSpace("a1", nsAutodiscoverResponseStr1);
    this.addNameSpace("a2", nsAutodiscoverResponseStr2);
}

var mivNameSpacesGUID = "c58005d7-70c2-4f2e-935a-af11333f8964";

mivNameSpaces.prototype = {

    // methods from nsISupport

    /* void QueryInterface(
      in nsIIDRef uuid,
      [iid_is(uuid),retval] out nsQIResult result
    );	 */
    QueryInterface: XPCOMUtils.generateQI([Ci.mivNameSpaces,
        Ci.nsIClassInfo,
        Ci.nsISupports
    ]),

    // Attributes from nsIClassInfo

    classDescription: "XML NameSpace manager.",
    classID: components.ID("{" + mivNameSpacesGUID + "}"),
    contractID: "@1st-setup.nl/conversion/namespaces;1",
    flags: Ci.nsIClassInfo.SINGLETON || Ci.nsIClassInfo.THREADSAFE,
    implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

    // void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
    getInterfaces: function _getInterfaces(count) {
        var ifaces = [Ci.mivNameSpaces,
            Ci.nsIClassInfo,
            Ci.nsISupports
        ];
        count.value = ifaces.length;
        return ifaces;
    },

    getHelperForLanguage: function _getHelperForLanguage(language) {
        return null;
    },
    // External methods

    getNameSpace: function _getNameSpace(aIndex) {
        if (aIndex >= this.nameSpaces.length) return null;

        return this.nameSpaces[aIndex].value;
    },

    addNameSpace: function _addNameSpace(aAlias, aValue) {
        var tmpAlias = aAlias;
        if ((tmpAlias == "") || (tmpAlias === undefined)) {
            tmpAlias = "_default_";
        }

        // find if we already have this namespace and value.
        for (var index in this.nameSpaces) {
            if (this.nameSpaces[index].alias == tmpAlias) {
                if (this.nameSpaces[index].value == aValue) {
                    return index;
                }
            }
        }

        this.nameSpaces.push({
            alias: tmpAlias,
            value: aValue
        });
        return (this.nameSpaces.length - 1);
    },

    findNameSpaceByAlias: function _findNameSpaceByAlias(aAlias) {
        for each(var record in this.nameSpaces) {
                if (record.alias == aAlias) {
                    return record.value;
                }
            }
            // When not found return null;
        return null;
    },

}

function NSGetFactory(cid) {

    try {
        if (!NSGetFactory.mivNameSpaces) {
            // Load main script from lightning that we need.
            NSGetFactory.mivNameSpaces = XPCOMUtils.generateNSGetFactory([mivNameSpaces]);

        }

    }
    catch (e) {
        Components.utils.reportError(e);
        dump(e);
        throw e;
    }

    return NSGetFactory.mivNameSpaces(cid);
}
