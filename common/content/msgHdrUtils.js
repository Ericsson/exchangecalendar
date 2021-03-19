/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mail utility functions for GMail Conversation View
 *
 * The Initial Developer of the Original Code is
 * Jonathan Protzenko
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * @fileoverview A whole bunch of utility functions that will abstract away
 *  various low-level nsIMsgDbHdr operations. The idea is to save time by not
 *  having to lookup how to do simple actions.
 * @author Jonathan Protzenko
 */

var EXPORTED_SYMBOLS = [
    // Low-level XPCOM boring stuff
    'msgHdrToMessageBody', 'msgHdrToNeckoURL', 'msgHdrGetTags', 'msgUriToMsgHdr',
    'msgHdrGetUri', 'msgHdrFromNeckoUrl', 'msgHdrSetTags',
    // Quickly identify a message
    'msgHdrIsDraft', 'msgHdrIsSent', 'msgHdrIsArchive', 'msgHdrIsInbox',
    'msgHdrIsRss', 'msgHdrIsNntp', 'msgHdrIsJunk',
    // Actions on a set of message headers
    'msgHdrsMarkAsRead', 'msgHdrsArchive', 'msgHdrsDelete',
    // Doesn't really belong here
    'getMail3Pane',
    // Higher-level functions
    'msgHdrGetHeaders',
]

const {
    classes: Cc,
    interfaces: Ci,
    utils: Cu,
    results: Cr
} = Components;

// from mailnews/base/public/nsMsgFolderFlags.idl
const nsMsgFolderFlags_SentMail = 0x00000200;
const nsMsgFolderFlags_Drafts = 0x00000400;
const nsMsgFolderFlags_Archive = 0x00004000;
const nsMsgFolderFlags_Inbox = 0x00001000;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); // for defineLazyServiceGetter
Cu.import("resource:///modules/gloda/mimemsg.js");
Cu.import("resource:///modules/gloda/utils.js");
Cu.import("resource:///modules/iteratorUtils.jsm"); // for toXPCOMArray
Cu.import("resource:///modules/mailServices.js");

// Adding a messenger lazy getter to the MailServices even though it's not a service
XPCOMUtils.defineLazyGetter(MailServices, "messenger", function () {
    return Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
});

/**
 * Get a given message header's uri.
 * @param {nsIMsgDbHdr} aMsg The message
 * @return {String}
 */
function msgHdrGetUri(aMsg)
aMsg.folder.getUriForMsg(aMsg)

/**
 * Get a msgHdr from a message URI (msgHdr.URI).
 * @param {String} aUri The URI of the message
 * @return {nsIMsgDbHdr}
 */
function msgUriToMsgHdr(aUri) {
    try {
        let messageService = MailServices.messenger.messageServiceFromURI(aUri);
        return messageService.messageURIToMsgHdr(aUri);
    }
    catch (e) {
        dump("Unable to get " + aUri + " — returning null instead");
        return null;
    }
}

/**
 * Tells if the message is in the account's inbox
 * @param {nsIMsgDbHdr} msgHdr The message header to examine
 * @return {bool}
 */
function msgHdrIsInbox(msgHdr)
msgHdr.folder.getFlag(nsMsgFolderFlags_Inbox)

/**
 * Tells if the message is a draft message
 * @param {nsIMsgDbHdr} msgHdr The message header to examine
 * @return {bool}
 */
function msgHdrIsDraft(msgHdr)
msgHdr.folder.getFlag(nsMsgFolderFlags_Drafts)

/**
 * Tells if the message is a sent message
 * @param {nsIMsgDbHdr} msgHdr The message header to examine
 * @return {bool}
 */
function msgHdrIsSent(msgHdr)
msgHdr.folder.getFlag(nsMsgFolderFlags_SentMail)

/**
 * Tells if the message is an archived message
 * @param {nsIMsgDbHdr} msgHdr The message header to examine
 * @return {bool}
 */
function msgHdrIsArchive(msgHdr)
msgHdr.folder.getFlag(nsMsgFolderFlags_Archive)

/**
 * Get a nsIMsgDbHdr from a Necko URL.
 * @param {String} The URL
 * @return {nsIMsgDbHdr} The message header.
 */
function msgHdrFromNeckoUrl(aUrl)
aUrl.QueryInterface(Ci.nsIMsgMessageUrl).messageHeader

/**
 * Get a string containing the body of a messsage.
 * @param {nsIMsgDbHdr} aMessageHeader The message header
 * @param {bool} aStripHtml Keep html?
 * @return {string}
 */
function msgHdrToMessageBody(aMessageHeader, aStripHtml, aLength) {
    let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
    let listener = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance(Ci.nsISyncStreamListener);
    let uri = aMessageHeader.folder.getUriForMsg(aMessageHeader);
    messenger.messageServiceFromURI(uri).streamMessage(uri, listener, null, null, false, "");
    let folder = aMessageHeader.folder;
    /*
     * AUTF8String getMsgTextFromStream(in nsIInputStream aStream, in ACString aCharset,
                                        in unsigned long aBytesToRead, in unsigned long aMaxOutputLen, 
                                        in boolean aCompressQuotes, in boolean aStripHTMLTags,
                                        out ACString aContentType);
    */
    return folder.getMsgTextFromStream(
        listener.inputStream, aMessageHeader.Charset, 2 * aLength, aLength, false, aStripHtml, {});
}

/**
 * Get a nsIURI from a nsIMsgDBHdr
 * @param {nsIMsgDbHdr} aMsgHdr The message header
 * @return {nsIURI}
 */
function msgHdrToNeckoURL(aMsgHdr) {
    let uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
    let neckoURL = {};
    let msgService = MailServices.messenger.messageServiceFromURI(uri);
    msgService.GetUrlForUri(uri, neckoURL, null);
    return neckoURL.value;
}

/**
 * Given a msgHdr, return a list of tag objects. This function
 * just does the messy work of understanding how tags are
 * stored in nsIMsgDBHdrs.
 *
 * @param {nsIMsgDbHdr} aMsgHdr the msgHdr whose tags we want
 * @return {nsIMsgTag array} a list of tag objects
 */
function msgHdrGetTags(aMsgHdr) {
    let keywords = aMsgHdr.getStringProperty("keywords");
    let keywordList = keywords.split(' ');
    let keywordMap = {};
    for (let [, keyword] in Iterator(keywordList)) {
        keywordMap[keyword] = true;
    }

    let tagArray = MailServices.tags.getAllTags({});
    let tags = [];
    for (let [iTag, tag] in Iterator(tagArray)) {
        let tag = tagArray[iTag];
        if (tag.key in keywordMap)
            tags.push(tag);
    }
    return tags;
}

/**
 * Set the tags for a given msgHdr.
 *
 * @param {nsIMsgDBHdr} aMsgHdr
 * @param {nsIMsgTag array} aTags
 */
function msgHdrSetTags(aMsgHdr, aTags) {
    let oldTagList = msgHdrGetTags(aMsgHdr);
    let oldTags = {}; // hashmap
    for (let tag of oldTagList)
        oldTags[tag.key] = null;

    let newTags = {};
    let newTagList = aTags;
    for (let tag of newTagList)
        newTags[tag.key] = null;

    let toAdd = newTagList.filter(tag => !(tag.key in oldTags));
    let toRemove = oldTagList.filter(tag => !(tag.key in newTags));

    let folder = aMsgHdr.folder;
    let msgHdr = toXPCOMArray([aMsgHdr], Ci.nsIMutableArray);
    folder.addKeywordsToMessages(msgHdr, toAdd.join(" "));
    folder.removeKeywordsFromMessages(msgHdr, toRemove.join(" "));
    aMsgHdr.folder.msgDatabase = null;
}

/**
 * Mark an array of msgHdrs read (or unread)
 * @param {nsIMsgDbHdr array} msgHdrs The message headers
 * @param {bool} read True to mark them read, false to mark them unread
 */
function msgHdrsMarkAsRead(msgHdrs, read) {
    let pending = {};
    for each(let msgHdr in msgHdrs) {
        if (msgHdr.isRead == read)
            continue;
        if (!pending[msgHdr.folder.URI]) {
            pending[msgHdr.folder.URI] = {
                folder: msgHdr.folder,
                msgs: Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray)
            };
        }
        pending[msgHdr.folder.URI].msgs.appendElement(msgHdr, false);
    }
    for each(let {
        folder,
        msgs
    } in pending) {
        folder.markMessagesRead(msgs, read);
        folder.msgDatabase = null; /* don't leak */
    }
}

/**
 * Delete a set of messages.
 * @param {nsIMsgDbHdr array} msgHdrs The message headers
 */
function msgHdrsDelete(msgHdrs) {
    let pending = {};
    for each(let msgHdr in msgHdrs) {
        if (!pending[msgHdr.folder.URI]) {
            pending[msgHdr.folder.URI] = {
                folder: msgHdr.folder,
                msgs: Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray)
            };
        }
        pending[msgHdr.folder.URI].msgs.appendElement(msgHdr, false);
    }
    for each(let {
        folder,
        msgs
    } in pending) {
        folder.deleteMessages(msgs, getMail3Pane().msgWindow, false, false, null, true);
        folder.msgDatabase = null; /* don't leak */
    }
}

/**
 * Get the main Thunderbird window. Used heavily to get a reference to globals
 *  that are defined in mail/base/content/.
 * @return The window object for the main window.
 */
function getMail3Pane() {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator)
        .getMostRecentWindow("mail:3pane");
}

/**
 * Archive a set of messages
 * @param {nsIMsgDbHdr array} msgHdrs The message headers
 */
function msgHdrsArchive(msgHdrs) {
    /* See
     * http://mxr.mozilla.org/comm-central/source/suite/mailnews/mailWindowOverlay.js#1337
     *
     * The window is here because otherwise we don't have access to
     * BatchMessageMover.
     * */
    let mail3PaneWindow = getMail3Pane();
    let batchMover = new mail3PaneWindow.BatchMessageMover();
    batchMover.archiveMessages(msgHdrs.filter(
        function (x) !msgHdrIsArchive(x) && getMail3Pane().getIdentityForHeader(x).archiveEnabled
    ));
}

/**
 * Tell if a message is an RSS feed iteme
 * @param {nsIMsgDbHdr} msgHdr The message header
 * @return {Bool}
 */
function msgHdrIsRss(msgHdr)
(msgHdr.folder.server instanceof Ci.nsIRssIncomingServer)

/**
 * Tell if a message is a NNTP message
 * @param {nsIMsgDbHdr} msgHdr The message header
 * @return {Bool}
 */
function msgHdrIsNntp(msgHdr)
(msgHdr.folder.server instanceof Ci.nsINntpIncomingServer)

/**
 * Tell if a message has been marked as junk.
 * @param {nsIMsgDbHdr} msgHdr The message header
 * @return {Bool}
 */
function msgHdrIsJunk(aMsgHdr)
aMsgHdr.getStringProperty("junkscore") == Ci.nsIJunkMailPlugin.IS_SPAM_SCORE

/**
 * Recycling the HeaderHandlerBase from mimemsg.js
 */
function HeaderHandler(aHeaders) {
    this.headers = aHeaders;
}

HeaderHandler.prototype = {
    __proto__: MimeMessage.prototype.__proto__, // == HeaderHandlerBase
};

/**
 * Creates a stream listener that will call k once done, passing it the string
 * that has been read.
 */
function createStreamListener(k) {
    return {
        _data: "",
        _stream: null,

        QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener, Ci.nsIRequestObserver]),

        // nsIRequestObserver
        onStartRequest: function (aRequest, aContext) {},
        onStopRequest: function (aRequest, aContext, aStatusCode) {
            k(this._data);
        },

        // nsIStreamListener
        onDataAvailable: function (aRequest, aContext, aInputStream, aOffset, aCount) {
            if (this._stream == null) {
                this._stream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
                this._stream.init(aInputStream);
            }
            this._data += this._stream.read(aCount);
        }
    };
}

/**
 * @param aMsgHdr The message header whose headers you want
 * @param k A function that takes a HeaderHandler object (see mimemsg.js).
 *  Such an object has a get function, a has function. It has a header property,
 *  whose keys are lowercased header names, and whose values are list of
 *  strings corresponding to the multiple entries found for that header.
 */
function msgHdrGetHeaders(aMsgHdr, k) {
    let uri = msgHdrGetUri(aMsgHdr);
    let messageService = MailServices.messenger.messageServiceFromURI(uri);

    let fallback = function ()
    MsgHdrToMimeMessage(aMsgHdr, null, function (aMsgHdr, aMimeMsg) {
        k(aMimeMsg);
    }, true, {
        partsOnDemand: true,
    });

    if ("streamHeaders" in messageService) {
        try {
            messageService.streamHeaders(uri, createStreamListener(function (aRawString) {
                let re = /\r?\n\s+/g;
                let str = aRawString.replace(re, " ");
                let lines = str.split(/\r?\n/);
                let obj = {};
                for each(let [, line] in Iterator(lines)) {
                    let i = line.indexOf(":");
                    if (i < 0)
                        continue;
                    let k = line.substring(0, i).toLowerCase();
                    let v = line.substring(i + 1).trim();
                    if (!(k in obj))
                        obj[k] = [];
                    obj[k].push(v);
                }
                k(new HeaderHandler(obj));
            }), null, true);
        }
        catch (e) {
            fallback();
        }
    }
    else {
        fallback();
    }
}
