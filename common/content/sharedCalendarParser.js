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
 * Borrowed from the enigMail project.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("chrome://exchangecommon/content/msgHdrUtils.js");
Cu.import("resource:///modules/gloda/utils.js");

if (!exchWebService) var exchWebService = {};

exchWebService.hdrView = {

    theHeaders: null,

    msgHdrViewLoad: function _msgHdrViewLoad(event) {
        exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: this.msgHdrViewLoad");

        var listener = {
            onBeforeShowHeaderPane: function _listener_onBeforeShowHeaderPane() {
                exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: _listener_onBeforeShowHeaderPane");
            },

            onStartHeaders: function _listener_onStartHeaders() {
                exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: _listener_onStartHeaders");

                exchWebService.hdrView.statusBarHide();
            },

            onEndHeaders: function _listener_onEndHeaders() {
                exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: _listener_onEndHeaders");
                exchWebService.hdrView.statusBarHide();

                msgHdrGetHeaders(gFolderDisplay.selectedMessage, function (aHeaders) {

                    if ((exchWebService.check4Lightning) && (exchWebService.check4Lightning.lightningIsInstalled != 2)) {
                        return;
                    }

                    exchWebService.hdrView.theHeaders = null;

                    if ((aHeaders.has("x-sharing-remote-uid"))
                        && (aHeaders.has("x-sharing-local-type"))
                        && (aHeaders.has("x-sharing-remote-name"))) {
                        if (aHeaders.get("x-sharing-local-type") == "IPF.Appointment") {
                            exchWebService.commonFunctions.LOG("This message has a x-sharing-remote-uid header; its value is " + aHeaders.get("x-sharing-remote-uid"));
                            document.getElementById("exchWebServiceSharedCalendarLabel").value = GlodaUtils.deMime(aHeaders.get("x-sharing-remote-name"));
                            exchWebService.hdrView.theHeaders = aHeaders;
                            exchWebService.hdrView.statusBarShow();
                        }
                    }
                    else {
                        exchWebService.commonFunctions.LOG("NO x-sharing-remote-uid header");
                    }
                });
            },

        };

        gMessageListeners.push(listener);

        // Next part is to hide the bar when the user changes to another folder and
        // a new message is not selected. Otherwise it will stay visible.
        listener.tbHideMessageHeaderPane = HideMessageHeaderPane;
        HideMessageHeaderPane = function exchWebServiceHideMessageHeaderPane() {
            exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: exchWebServiceHideMessageHeaderPane");
            try {
                exchWebService.hdrView.statusBarHide();
            }
            catch (ex) {};
            listener.tbHideMessageHeaderPane.apply(null, arguments);
        };

    },

    hdrViewUnload: function _hdrViewUnload() {
        exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: this.hdrViewUnLoad");
        this.statusBarHide();
    },

    statusBarHide: function _statusBarHide() {
        var exchWebServiceSharedCalendarBox = document.getElementById("exchWebServiceSharedCalendarBox");
        try {
            exchWebServiceSharedCalendarBox.setAttribute("collapsed", "true")
                //Enigmail.msg.setAttachmentReveal(null);
        }
        catch (ex) {}
    },

    statusBarShow: function _statusBarShow() {
        var exchWebServiceSharedCalendarBox = document.getElementById("exchWebServiceSharedCalendarBox");
        try {
            exchWebServiceSharedCalendarBox.removeAttribute("collapsed");
        }
        catch (ex) {
            exchWebService.commonFunctions.LOG("ERROR:" + ex);
        }
    },


    doAddSharedCalendar: function _doAddSharedCalendar() {
        exchWebService.commonFunctions.LOG("exchWebService.sharedCalendarParser.js: this.doAddSharedCalendar");
        if (this.theHeaders) {
            exchWebService.commonFunctions.LOG("  uid:" + this.theHeaders.get("x-sharing-remote-uid"));
            exchWebService.commonFunctions.LOG(" name:" + GlodaUtils.deMime(this.theHeaders.get("x-sharing-remote-name")));

        }
    },
}

// Currently turned of because not yet ready for version 1.7.13
//addEventListener('messagepane-loaded', exchWebService.hdrView.msgHdrViewLoad, true);
//addEventListener('messagepane-unloaded', exchWebService.hdrView.hdrViewUnload, true);
