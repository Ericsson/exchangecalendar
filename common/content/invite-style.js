Components.utils.import("resource:///modules/gloda/mimemsg.js");

function showIconsAsInviteColumn() {}
showIconsAsInviteColumn.prototype.execute = function () {
    var extrasObserver = {
        observe: function (aMsgFolder, aTopic, aData) {

            if (gDBView) {
                var columnHandler = {
                    getCellText: function (row, col) {},
                    getSortStringForRow: function (hdr) {
                        var Subject = hdr.mime2DecodedSubject;
                        var isInviteMail = hdr.getStringProperty("isInviteMail");

                        if (isInviteMail == "true") {
                            var res = Subject.match(/Accepted:/);
                            if (!res) {
                                res = Subject.match(/Declined:/);
                            }
                            else {
                                return "accepted";
                            }

                            if (!res) {
                                res = Subject.match(/Tentative:/);
                            }
                            else {
                                return "declined";
                            }
                            if (!res) {
                                res = Subject.match(/Canceled:/);
                            }
                            else {
                                return "tentative";
                            }

                            if (!res) {
                                res = Subject.match(/Updated:/);
                            }
                            else {
                                return "updated";
                            }

                            if (!res) {
                                res = Subject.match(/Event Invitation:/);
                            }
                            else {
                                return "updated";
                            }
                            return "invited";
                        }
                    },
                    isString: function () {
                        return true;
                    },
                    getImageSrc: function (row, col) {
                        var hdr = gDBView.getMsgHdrAt(row);
                        var Subject = hdr.mime2DecodedSubject;
                        var msgFolder = hdr.folder;
                        var isInviteMail = hdr.getStringProperty("isInviteMail");

                        if ((isInviteMail == "false") || (isInviteMail == "true")) {}
                        else {
                            var self = this;
                            setTimeout(function () {
                                tmpMailTools.fetchMail(hdr);
                            }, 0);
                            setTimeout(function (row, col) {
                                self.getImageSrc(row, col);
                            }, 5000);
                        }

                        /*		  if(   isInviteMail == ""  ){  
			 	    				   	MsgHdrToMimeMessage(hdr, null, function (hdr, aMimeMessage) {  
				    			              try {
				  	    			             let attachments = aMimeMessage.allUserAttachments || aMimeMessage.allAttachments;
				  	    			             if  ( attachments.length == 1){
				 	    			                   for (let [index, att] in Iterator(attachments))
				 	    			                   {
							 	    			             if ( att.name == "invite.ics" ){
							 	 	    					 	hdr.setStringProperty("isInviteMail","true");
							 	    			             }
				 	    			                   }
				 	    			            } 
				    			              } catch (err) {} 
			  	    				      }, true ,{examineEncryptedParts:true,}); // true means force the message into being downloaded... this might take some time! 	    				 
		 	    				  	} */ //Thunderbird crashes during new account.
                        if (isInviteMail == "true") {
                            var res = Subject.match(/Accepted:/);
                            if (!res) {
                                res = Subject.match(/Declined:/);
                            }
                            else {
                                return "chrome://exchangecommon-common/skin/images/accepted.png";
                            }

                            if (!res) {
                                res = Subject.match(/Tentative:/);
                            }
                            else {
                                return "chrome://exchangecommon-common/skin/images/declined.png";
                            }
                            if (!res) {
                                res = Subject.match(/Canceled:/);
                            }
                            else {
                                return "chrome://exchangecommon-common/skin/images/tentative.png";
                            }

                            if (!res) {
                                res = Subject.match(/Updated:/);
                            }
                            else {
                                return "chrome://exchangecommon-common/skin/images/updated.png";
                            }

                            if (!res) {
                                res = Subject.match(/Event Invitation:/);
                            }
                            else {
                                return "chrome://exchangecommon-common/skin/images/updated.png";
                            }
                            return "chrome://exchangecommon-common/skin/images/invited.png";
                        }
                    },
                    getSortLongForRow: function (hdr) {},
                    isEditable: function (row, col) {
                        return false;
                    },
                    getCellProperties: function (row, col, properties) {
                        return properties;
                    },
                    cycleCell: function (row, col) {},
                    getRowProperties: function (row, properties) {
                        return properties;
                    }
                };

                try {
                    columnHandler.old = gDBView.getColumnHandler("inviteCol");
                }
                catch (ex) {}

                gDBView.addColumnHandler("inviteCol", columnHandler);
            } //ifend

        }
    };

    var ObserverService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    ObserverService.addObserver(extrasObserver, "MsgCreateDBView", false);
};


function mailTools(aWindow, aDocument) {
    this._window = aWindow;
    this._document = aDocument;
    try {
        this.msgHdrs = [];
        this.working = null;
    }
    catch (e) {}
}

mailTools.prototype.getMailBody = function (aMsgHdr, aCallback) {
    if (this.working) {
        let callback = aCallback;
        let uri = aMsgHdr.folder.getUriForMsg(aMsgHdr);
        var messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance()
            .QueryInterface(Components.interfaces.nsIInputStream);
        var inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance()
            .QueryInterface(Components.interfaces.nsIScriptableInputStream);

        let messageService = messenger.messageServiceFromURI(uri);
        inputStream.init(messageStream);

        try {
            messageService.streamMessage(uri, messageStream, null, null, false, "");
        }
        catch (e) {
            this.working = false;
        }
        let body = "";
        inputStream.available();
        while (inputStream.available()) {
            body = body + inputStream.read(512);
        }
        inputStream.close();
        messageStream.close();
        callback(aMsgHdr, body);
        this.working = false;
    }
    return;
}

mailTools.prototype.markMailAsInvite = function (aMsgHdr, bodyPlain) {
    var self = this;
    var searchString = 'Content-Type: text/calendar;';
    let result = bodyPlain.match(/Content-Type: text\/calendar;/g);
    if (result == searchString) {
        //setting header string to identify invitation mail
        aMsgHdr.setStringProperty("isInviteMail", "true");
    }
    else {
        aMsgHdr.setStringProperty("isInviteMail", "false");
    }
    self.working = true;
    return;
}

mailTools.prototype.fetchMail = function (oneMsgHdr) {
    //dump("\nxxxx fetchMail To be Processed :  " + this.msgHdrs.length ); 

    if (this.msgHdrs.length > 10) {
        this.msgHdrs.shift();
        this.msgHdrs.push(oneMsgHdr);
        return;
    }
    else {
        this.msgHdrs.push(oneMsgHdr);
    }

    if (this.msgHdrs.length < 1) return;

    if (this.working != true) {
        while (this.msgHdrs.length > 0) {

            if (this.working == true) continue;
            this.working = true;

            var self = this;
            var aMsgHdr = this.msgHdrs.pop();
            let isInviteMail = aMsgHdr.getStringProperty("isInviteMail");
            if ((isInviteMail == "false") || (isInviteMail == "true")) {
                this.working = false;
                continue;
            }
            else {
                //call to analyze change body
                this.getMailBody(aMsgHdr, function (aMsgHdr, bodyPlain) {
                    self.markMailAsInvite(aMsgHdr, bodyPlain);
                });
            }
        }
    }
    return;
}

mailTools.prototype.onLoad = function () {
    var self = this;
    this.newMailListener = {
        msgAdded: function (aMsgHdr) {
            setTimeout(function () {
                self.fetchMail(aMsgHdr);
            }, 3000);
        }
    };

    var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
        .getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(this.newMailListener, notificationService.msgAdded);

}

var tmpShowIconsAsInviteColumn = new showIconsAsInviteColumn();
var tmpMailTools = new mailTools(window, document);

window.addEventListener("load", tmpMailTools.onLoad(), false);
window.addEventListener("load", tmpShowIconsAsInviteColumn.execute(), false);
