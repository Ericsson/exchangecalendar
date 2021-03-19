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
 * -- Exchange 2007/2010 Calendar and Tasks Provider.
 * -- For Thunderbird with the Lightning add-on.
 *
 * This work is a combination of the Storage calendar, part of the default Lightning add-on, and 
 * the "Exchange Data Provider for Lightning" add-on currently, october 2011, maintained by Simon Schubert.
 * Primarily made because the "Exchange Data Provider for Lightning" add-on is a continuation 
 * of old code and this one is build up from the ground. It still uses some parts from the 
 * "Exchange Data Provider for Lightning" project.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calAlarmUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");
Cu.import("resource://calendar/modules/calAuthUtils.jsm");

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource://exchangecommon/ecExchangeRequest.js");
Cu.import("resource://exchangecommon/soapFunctions.js");

var EXPORTED_SYMBOLS = ["erFindFollowupItemsRequest"];

function erFindFollowupItemsRequest(aArgument, aCbOk, aCbError, aListener) {
    this.mCbOk = aCbOk;
    this.mCbError = aCbError;

    var self = this;

    this.parent = new ExchangeRequest(aArgument,
        function (aExchangeRequest, aResp) {
            self.onSendOk(aExchangeRequest, aResp);
        },
        function (aExchangeRequest, aCode, aMsg) {
            self.onSendError(aExchangeRequest, aCode, aMsg);
        },
        aListener);

    this.argument = aArgument;
    this.mailbox = aArgument.mailbox;
    this.serverUrl = aArgument.serverUrl;
    this.folderID = aArgument.folderID;
    this.folderBase = aArgument.folderBase;
    this.changeKey = aArgument.changeKey;
    this.listener = aListener;
    this.itemFilter = aArgument.itemFilter;

    this.isRunning = true;
    this.execute();
}

erFindFollowupItemsRequest.prototype = {

    execute: function _execute() {
        //	exchWebService.commonFunctions.LOG("erGetFollowupItemsRequest.execute\n");

        var req = exchWebService.commonFunctions.xmlToJxon('<nsMessages:FindItem xmlns:nsMessages="' + nsMessagesStr + '" xmlns:nsTypes="' + nsTypesStr + '"/>');
        req.setAttribute("Traversal", "Shallow");
        var itemShape = req.addChildTag("ItemShape", "nsMessages", null);
        itemShape.addChildTag("BaseShape", "nsTypes", "IdOnly");
        itemShape = null;

        var Restriction = req.addChildTag("Restriction", "nsMessages", null);
        var Or = Restriction.addChildTag("Or", "nsTypes", null);

        for each(var i in ["1", "2"]) {
            var IsEqualTo = Or.addChildTag("IsEqualTo", "nsTypes", null);
            var ExtendedFieldURI = IsEqualTo.addChildTag("ExtendedFieldURI", "nsTypes", null);
            ExtendedFieldURI.setAttribute("PropertyTag", "0x1090");
            ExtendedFieldURI.setAttribute("PropertyType", "Integer");
            var FieldURIOrConstant = IsEqualTo.addChildTag("FieldURIOrConstant", "nsTypes", null);
            var Constant = FieldURIOrConstant.addChildTag("Constant", "nsTypes", null);
            Constant.setAttribute("Value", i);
        }

        var parentFolder = makeParentFolderIds2("ParentFolderIds", this.argument);
        req.addChildTagObject(parentFolder);
        parentFolder = null;

        this.parent.xml2jxon = true;

        // exchWebService.commonFunctions.LOG("erFindFollowupItemsRequest.execute:"+String(req));
        this.parent.sendRequest(this.parent.makeSoapMessage(req), this.serverUrl);
        req = null;
    },

    onSendOk: function _onSendOk(aExchangeRequest, aResp) {
        // exchWebService.commonFunctions.LOG("erFindFollowupItemsRequest.onSendOk:"+String(aResp)+"\n");

        var ids = [];

        var rm = aResp.XPath("/s:Envelope/s:Body/m:FindItemResponse/m:ResponseMessages/m:FindItemResponseMessage[@ResponseClass='Success' and m:ResponseCode='NoError']/m:RootFolder/t:Items/t:Message");

        for each(var e in rm) {
            ids.push({
                Id: e.getAttributeByTag("t:ItemId", "Id"),
                ChangeKey: e.getAttributeByTag("t:ItemId", "ChangeKey")
            });
        }
        rm = null;

        if (this.mCbOk) {
            this.mCbOk(this, ids);
        }
        this.isRunning = false;
    },

    onSendError: function _onSendError(aExchangeRequest, aCode, aMsg) {
        this.isRunning = false;
        if (this.mCbError) {
            this.mCbError(this, aCode, aMsg);
        }
    },
};
