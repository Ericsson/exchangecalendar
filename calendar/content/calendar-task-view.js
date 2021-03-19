/*
 * Owner:Ericsson
 */
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://exchangecommon/ecFunctions.js");
Cu.import("resource:///modules/gloda/public.js")
Cu.import("resource:///modules/MailUtils.js");
Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calXMLUtils.jsm");

const globalFunctions = Cc["@1st-setup.nl/global/functions;1"]
    .getService(Ci.mivFunctions);
const gMessenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);

function displayElement(id, flag) {
    setBooleanAttribute(id, "hidden", !flag);
    return flag;
}

function taskHtmlDetailsView(event) {

    function msgHdrToNeckoURL(aMsgHdr, gMessenger) {
        var uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
        var neckoURL = {};
        var msgService = gMessenger.messageServiceFromURI(uri);
        msgService.GetUrlForUri(uri, neckoURL, null);
        return neckoURL.value;
    }

    function showMail(url) {
        if (!url) {
            return;
        }
        ele.hidden = true;
        ele2.hidden = false;
        ele2.setAttribute("src", "about:blank");
        ele2.setAttribute("src", url);
    }

    function IsImapMessage(messageUri) {
        return (/^imap-message:/.test(messageUri));
    }

    if (event) {
        taskDetailsView.onSelect(event);
        var item = document.getElementById("calendar-task-tree").currentTask;
        if (displayElement("calendar-task-details-container", item != null)
            && displayElement("calendar-task-view-splitter", item != null)) {
            if (item.calendar.type == "exchangecalendar") {
                //Html manipulations
                var ele = document.getElementById("calendar-task-details-description");
                var ele2 = document.getElementById("exchService-task-details-description");

                //remove existing task view 
                //ele.parentNode.removeChild(ele);
                if (item.itemClass == "IPM.Task") {
                    ele2.hidden = true;
                    ele.hidden = false;
                }
                else if (item.itemClass == "IPM.Note") {
                    //imap://mail.internal.ericsson.com:993/fetch%3EUID%3E/INBOX%3E9459
                    //globalFunctions.LOG("MessageId " + item.messageId );  
                    var queryListener = {
                        /* called when new items are returned by the database query or freshly indexed */
                        onItemsAdded: function queryListener_onItemsAdded(aItems, aCollection) {},
                        /* called when items that are already in our collection get re-indexed */
                        onItemsModified: function queryListener_onItemsModified(aItems, aCollection) {},
                        /* called when items that are in our collection are purged from the system */
                        onItemsRemoved: function queryListener_onItemsRemoved(aItems, aCollection) {},
                        /* called when our database query completes */
                        onQueryCompleted: function queryListener_onQueryCompleted(aCollection) {
                            try {
                                for (var j = 0; j < aCollection.items.length; j++) {
                                    var msgUri = aCollection.items[j].folderMessageURI;
                                    var msgHdr = gMessenger.msgHdrFromURI(msgUri);

                                    if (IsImapMessage(msgUri)) {
                                        var url = msgHdrToNeckoURL(msgHdr, gMessenger).spec;
                                        showMail(url);
                                    }
                                }
                            }
                            catch (e) {
                                dump("\nexception " + e);
                            }
                        }
                    };
                    var messageId = item.messageId.replace('<', '').replace('>', '');
                    if (messageId) {
                        var query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
                        query.headerMessageID(messageId);
                        var collection = query.getCollection(queryListener);
                    }
                }
            }
            else {
                document.getElementById("exchService-task-details-description").hidden = true;
                document.getElementById("calendar-task-details-description").hidden = false;
            }
        }
    }
}
