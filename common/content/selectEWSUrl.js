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

Cu.import("resource://exchangecommon/ecFunctions.js");

if (!exchWebService) var exchWebService = {};

exchWebService.selectEWSurl = {

    onAccept: function _onAccept() {
        window.arguments[1].value = document.getElementById("exchWebService_selectEWSurl_urllist").selectedItem.value;
        return true;
    },

    onLoad: function _onLoad() {
        var ewsUrls = window.arguments[0];
        var firstItem = false;
        var results = new Array();

        for (var index in ewsUrls) {
            // Check if this one is not in the list.
            exchWebService.commonFunctions.LOG("onLoad: index:" + index + ", ewsUrls=" + ewsUrls[index].value);
            var inList = false;
            for (var index2 in results) {
                if (ewsUrls[index].value == results[index2]) {
                    inList = true;
                    break;
                }
            }
            if (!inList) {
                results.push(ewsUrls[index].value);
            }
        }

        for (var i = 0; i < results.length; i++) {
            var newItem = document.getElementById("exchWebService_selectEWSurl_urllist").appendItem(results[i].toString(), results[i].toString(), results[i].toString());

            if (!firstItem) {
                document.getElementById("exchWebService_selectEWSurl_urllist").selectedItem = newItem;
                firstItem = true;
            }
        }
    },
}
