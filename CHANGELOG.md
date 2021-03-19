# Change Log
All notable changes to this project will be documented in this file.

## [4.0.0] - 2018-09-30
### Changed
- Pull latest localization from Transifex
- Set maximum version restriction to Thunderbird 59

## [4.0.0-beta5] - 2018-01-28
### Added
- Code beautifiers are available for JavaScript, XML, XUL and RDF files
- Translations are now managed with the Transifex tools.
  You can participate with our [Transifex project](https://www.transifex.com/exchangecalendar/exchangecalendar/)
- New locales: cs-CZ, pl, sk
- Thunderbird Global Search preferences to explain that emailtag need them and won't work if disabled.

### Changed
- Use Makefile instead of custom build shell (#98)
- Update install.rdf, README with new community
- Builds now will disable automatic update checker to avoid issue with new forks
- XML requests sent to Exchange servers now set "utf-8" for Content-Type HTTP header.
- Logs now redirects to ExchangeCalendar Github community (#92)
- Code tree has been structured to distinguish parts of the module (#80)
  Current parts are now: addressbook, calendar, common and emailtag
  Namespaces were updated too to reflect the new code structure.

### Fixed
- Compatibilty with Lightning 5.4.2 and the new option to edit events and tasks from tabs (#60)
- Some events were hidden from month view due to TimeZone errors (#67)
- Hide password in logs if requested (#100)
- Hide password shown in dialog boxes (#103)

### Removed
- `email` root directory contained only empty codes.
- debug preferences were always enabled, they are now removed (#133)
  It was disabling cache and forced the Thunderbird Global Search Indexer to be enabled.

## [4.0.0-beta4] - 2017-07-03
### Added
- Turkish localization #43, #44, #46
- Missing release notes of 3.9 and 3.8 releases #35
- Support for shared task list #41

### Changed
- Clean up and improve compatibility of build scripts #38, #40

### Fixed
- File permissions #36
- HTML content editor #28, #29
- Activate Italian localization #46

## [4.0.0-beta3] - 2017-06-25
### Added
- Added Italian translation #22

### Changed
- Updated README.md #26, master

### Fixed
- Colorpick on calender creation doesn't work #19 
- Can't update tasks/events descriptions #5

## [4.0.0-beta2] - 2017-06-10
### Fixed
- Event/Item editor dialog:
  - Default toolbar now uses "Save and close" button as in vanilla Lightning #9
  - Attendees dialog is now managed by Lightning directly
  - Opening and working with Attachment dialog #12

### Known bugs
- Event/Item editor dialog:
  - Some times, the HTML editor for task content is frozen and nothing can be edited.
  A workaround is to close the task and open it again.


## [4.0.0-beta1] - 2017-05-29
First pre-release under new project and community.

This release should primarily address issues with Thunderbird 52 and Lightning 5.4.

## [3.9.0] - unknown release date
- Stable Release
- Support enabled for TB 50.*
- Tested on TB 45.5.1 Lightning 4.7.4
- We don't support TB/Lightning beta.
- bug: add new calendar or no password prompt

## [3.8.0] - unknown release date
- Support of Thunderbird 45.0
- Support to Office365 calendar new calendar. Note: New users has to Create calendar using office365 type.
- fix auto discovery for new hosted calendar
- fix cancelled not removed
- fix forward event
- d9f170f fix #459 #426 #466 #464 #462 remove extra info
- 1d4b8b4 fix #459 #426 #466 #464 #462
- 0d1a78a fix: #459
- 5e02727 (origin/master, origin/HEAD, master) rename folowup mail window
- ab836f9 task-fixed
- eaa1c2d (HEAD -> ec-3.8, tag: v3.8-beta3) bump-version
- a641199 (master) bump-version-tb-support
- 98c047c (origin/master, origin/HEAD) status-undefined-for-ipmnote
- c8af0bd strict-error
- 78377ee Merge branch 'master' into ec-3.8
- 8edfea3 js strict error
- 65f46a5 strict error
- 4f92738 js strict error

## [3.7.0] - unknown release date
- d1b2860 (origin/master, origin/HEAD, master) revert calendar-event-dialog
- df713f4 Merge pull request #458 from enozkan/patch-5
- 180e91a Update preferences.dtd for Turkish locale

## [3.6.0] - unknown release date
- a2a50be strict mode error fix
- 5db3c8d task sync and strict mode error fix
- 16d56bf translation for preference password fix
- 22850a8 preference password fix
- 1fcaf4c Merge pull request #423 from Dominique-2202/patch-2
- 6b16cad French translation calendar-summary-dialog.dtd
- ae091d5 Merge pull request #422 from Mechtilde/Translation
- d716986 German translation for calendar-summary-dialog.dtd
- 65c222a Merge pull request #415 from enozkan/patch-4
- 1fd65b1 Merge pull request #416 from Trim/erFindContactsOffset
- 23ca0b3 Merge pull request #417 from Trim/erFindCalendarItems
- e537089 Update calendar-summary-dialog.dtd for tr
- 7b4b9fb erFindContacts: give a copy of arrays to callback
- 2235634 erFindContacts: Use server offset instead of own computation
- b7dd3aa erFindContacts: remove trailing blanks and use contact logs instead of main logs
- 9a5b78d erFindContacts: Requests all contacts of address books
- 4681316 erFindCalendarItems: use slice method to clone javascript arrays
- 91ac17f erFindCalendarItems: don't cal too many times possibly big array
- b45a6f4 erFindCalendarItems: use LOG instead of dump
- 3f9de40 string not translatable #409
- 9a82408 its good to have xpi filename with 'v' preceeding the version

## [3.5.0] - unknown release date
- Fix Thunderbird hangs on startup
- Fix Be more defensive about terminating the loop: under some circumstances startYearDay (and I presume startYear) can be greater than endYear[Day] on entry to the loop.
- Fix Reword log, Bug #373 "Incorrect exhortationto MAIL THIS LINE TO ..."
- Fix Bug #371 "Cannot add custom reminder (alarm) to an event ..."
- Fix Lightning 4.0.2.1

## [3.4.0] - unknown release date
- New Support Extended to Lightning 4.0.0.1
- New Support Extended to Thunderbird 38.*
- New EWS Tagger - Feature
- New Task Email Follow Up - Feature
- New Language Support For exchange address Book
- New Mail folder Delegation - Feature
- New Automatically set lightning time zone
- New Plug in Builder for deb package

- Fix Reminder Problem 
- Fix #190 - Can not add manually add exchange address book
- Fix Calendar not refreshing during suspend/resume
- Fix Busy/Free information wasn’t available
- Fix Ignore domain request for email user names.
- Fix freezing on start up
- Fix Restoring cache
- Fix rtews.dtd typo fixed
- Fix Cant not add Google calendar
- Fix Avoid JS exception in auto completion.
- Fix Also fill out primary email address if local ID is present
- Fix Treat public DLs the same way as private ones in auto completion
- Fix Exchange Icon Update in preference
- Fix Missing Translation English language
- Fix Israel Timezone fix for Daylight savings time
- Fix Password Looping fix
- New Updated French,German Translation
- New Preference for mail properties syncing
- New Preference for Email Follow up

- Change Update suggestions only for stable release
- Change Minimum Refresh time is set to 60
- Change Enabled Cache by default or No disable option for cache
- Change Removed all calendar Refresh time
- Change Optimized syncing method
- Change Enable NTLM by default in Thunderbird
- Change Remove  old saved password if user doesn’t choose
- Change Block adding domain entry in autodiscovery window when email used
- Change Platform based CSS thanks to git-hub user  "@mariolorenz"
- Change Clear Logging.

## [3.3.2] - unknown release date
- Bug fix release

## [3.3.1] - unknown release date
- New     New Column for invite mail in message list pane
- New     Support for Thunderbird Nightly Aurora 38.0+
- New     Locale improved
- New     Delegating Calendar feature
- New     Auto-update from Git-hub releases
- New     High priority mails with auto tagging - important

- Changed Meetings that are canceled are  removed
- Changed New Event usability issue in lightning
- Changed Priority column with updated icons,startup preference
- Changed Cache Clear on Add on Update

- Fixed  Dismissing  reminder
- Fixed  Accept/Tentative/Reject button appearance
- Fixed  Fix Address Book freeze when attempting to view "Properties"
- Fixed  Tentative status does not get saved
- Fixed  Unable to forward event  in Thunderbird
- Fixed  Breaking other add on columns in message list pane
- Fixed  UX error when saving Out of Office 

## [3.2.0] - unknown release date
- changed add-on name to "Exchange EWS Provider" as it is shorter than including all the exchange versions it can connect to.
- Fixes bug where sometimes the date/time is shifted on Free/busy info in calendar of someone else.
- Added preference userAgent. User can now specify their own userAgent string to use in communication.
- Fixes Bug 277 - Cannot extend the time on a calendar event (Exchange2007)
- Improved Out Of Office text editor so it is fully HTML aware again.
- Improved memory usage. It shoud use less memory now. Please read bug 279 on https://www.1st-setup.nl/bugzilla
- Fixed Bug 287 - no folder details anymore in the ews settings of calendar
- Fixed a bug where it was not possible to create an exception.
- Update on French locale.
- Fixed Bug 291 - Modify instance of recurring meeting fails silently
- Added Access Control List functionality of Lightning to follow user rights and permissions.
- Russian translation is added.
- Fixed problem with new exchange versions of Office365 and Exchange2013.
- User can mark calendar as readonly. This state is preserved between restarts.
- Rich text editing of description (body) part for calendar items and task items.
- Fixed problem where offline cache became out of sync.
- You can click on links in the description text of invitation and read-only events/tasks

## [3.2.0-Beta20] - unknown release date
- Fixed Bug 276 - Duplicate entries, wrong hours and sometimes missing entries when viewving other calendars

## [3.2.0-Beta16] - unknown release date
- Fixed Bug 273 - Tmezone in US or Canada triggers XML error and results in HTTP 400 Bad Request.

## [3.2.0-Beta14] - unknown release date
- Received new German translation from Björn Töpper.
- Fixed some small outstanding bugs which will get mentioned when I release the final version.

## [3.2.0-Beta11] - unknown release date
- Bug 267 - Problem with upgrade from 3.1.2-bug175-3 to 3.2.0-Beta10

## [3.2.0-Beta10] - unknown release date
- Fixed problem where the add-on would not show events and task against an Exchange2013 server.
- Changed the title of the add-on to "Exchange 2007/2010/2013 Calendar, Tasks, Contacts and GAL Provider"
- Started work on improving the progress tooltip info.
- Fixes bug 162 Changing recurring meeting to Wednesdays, moved it to Thursday

## [3.2.0-Beta9] - unknown release date
- Introduced loading/showing image when one is available for a contact (addressbook). Only works starting from Exchange server 2010_SP2
- Fixes a bug where creation of new tasks and Event was not possible since Beta8.
- Finalized autocompletion. Depending on the connetion speed with the exchange server it can take some time to fill the autocomplete list.

## [3.2.0-Beta8] - unknown release date
- Introduced an icon which shows connection status to the exchange server.
- Introduced autocompletion. It works but could use some refinement.
- Improved CPU load when the add-on has problems connecting to the exchange server .

## [3.2.0-Beta6] - unknown release date
- Improved copying between exchange calendars and non exchange calendars.
- Fixed snooze/dismiss reminder problems for events and tasks.
- Improved UI scripts used in XUL.
- Fixes Bug 264 - Schema failure when dismissing a reminder
- Fixes Bug 261 - Number of jobs in Status Bar increasing
- Fixes Bug 255 - Complete state of tasks not working in today pane
- Fixes Bug 254 - NewEventInterfaces lists calendars twice
- Fixes Bug 253 - Import Calendar into Exchange Calendar / copy calendar items from one to another
- Fixes Bug 252 - Internal server error on reminder dismissal

## [3.2.0-Beta5] - unknown release date
- Fixed working with attachments lists in the different views/dialogs/panes
- Customized settings reminders on events and tasks according to what is possible in Exchange.
- Fixes Bug 255 - Complete state of tasks not working in today pane
- Fixes Bug 256 - Set custom reminder on task created in outlook without due or entry date not possible

## [3.2.0-Beta4] - unknown release date
- Split mivExchangeEvent object into mivExchangeEvent and mivExchangeBaseItem. As preparation for mivExchangeTodo.
- Improved the conversion from Exchange Timezone to Lightning timezone and from Lightning timezone to Exchange timezone.
- Added the Exchange task/todo detail fields. Lightning does not known about the by default.
- Fixes Bug 63 - Repeating tasks posted to Exchange Server have incorrect due date/time
- Fixes Bug 107 - Snooze state of tasks gets lost after restart
- Fixes Bug 194 - Tasks appear at wrong date
- Fixes Bug 215 - Snoozed task reminders continually pop up, dismissing task reminders takes 2 clicks of Dismiss
- Fixes Bug 235 - Try to set a task due date aways sets the current date time
- Fixes Bug 250 - No tasks with current 3.2.0 beta

## [3.2.0-Beta3] - unknown release date
- Fixes Bug 150 - Dismissing reminders asks to send update for meeting
- Fixes Bug 180 - NTLM and Kerberos fail
- Fixes bug 229 - Creating a custom repeating event - creates event on following day
- Fixes bug 238 - "All day Event" created for day prior to selected date 
- Fixes bug 241 - Autodiscover RedirectAddr not followed 
- Fixes bug 246 - Modifying recurring meeting resulted in "modification failed" errors 
- Moved exchangecalendar object into it's own interface.
- Create our own recurrenceInfo object/interface.

## [3.2.0-Beta2] - unknown release date
- Fixes bug 241 -  Autodiscover RedirectAddr not followed

## [3.2.0-Beta1] - unknown release date
- Added own ExchangeEvent Interface. With this creation of items from cache or exchange server should be faster.
- Converted handling of timezones to own interface. 
- Timezone of Lightning events are set to those of Exchange. As close as possible because the timezone databases between Exchange and Lighting are not the same.
- Added new SOAP Autodiscovery functionality which is supported since Exchange2010. It will use this when available.

## [3.1.102] - unknown release date
- Fixes bug 226: No more than 20 contacts are shown.

## [3.1.99] - unknown release date
- Fixes Bug 212 - version >= 3.x leaks memory
- Fixes Bug 211 - 3.1.2 breaks login (3.1.1 working)
- Fixes Bug 188 - Adding a new Exchange 2010 EWS Calendar via add-on goes into an infinite password prompt loop
- Fixes Bug 173 - Exchange 2007/2010 Calendar and Tasks Provider deletes Outlook Calendar entries
- Fixes Bug 164 - Can not Connect to server
- Fixes Bug 159 - Thunderbird freezes
- Fixes Bug 157 - Infinity Loope for Password/Username
- Fixes Bug 143 - The adding uses wrong folder and does not fetch contacts

## [3.1.2] - unknown release date
- Fixed bug 175: After 10 calendars the jobs will hang up
- Fixed bug 201: Number of Jobs displayed in status bar is negative
- Added new loadbalancer for request to Exchange servers. You can now control the simultaneous request to the exchange server.
- Created new interface for the global functions.
- Added extra info to progress indicator. It now also uses the new loadbalancer for the statistics.

## [3.1.1] - unknown release date
- Fixed bug 205 Extension overwrites URI for non-exchange calendars

## [3.1.0] - unknown release date
- Fixed part of bug51. When emailaddress of attendee is empty do not throw an error.
- Fixed: Bug where removal of last attachment was not possible.
- Enhancement: Startup of Thunderbird has been improved.
- Fixed problem when turning off and on offlineCache.

## [3.0.2] - unknown release date
- Minor bug fix.

## [3.0.1] - unknown release date
- Fixed bug 196: Version 3.0.0-rc3 seems to interfere with address autocompletion
- Fixed bug 204: Thunderbird hangs when creating a new item with attachment
- Added automatic update functionality. This will check the developer website for new versions and give the change to autmoatically install it. 

## [3.0.0] - unknown release date
- Removed all references to e4x
- Removed some bugs and stabilized the code.

## [3.0.0-rc4] - unknown release date
- Add Japanese translation.
- Added fix for new chunked message responses from Exchange server.

## [3.0.0-rc3] - unknown release date
- Optimized the code to improve speed.

## [3.0.0-rc2] - unknown release date
- Optimized the xml handling code so startup and other communications are faster.

## [3.0.0-rc1] - unknown release date
- Converted last part, editing of tasks, from e4x to xml2jxon.

## [3.0.0-beta4] - unknown release date
- Fixed problem where a reminder change (dismiss or new time) was not saved to exchange.

## [3.0.0-beta3] - unknown release date
- Fixed bug 182: Reoccuring Events keep popping up in reminder.

## [3.0.0-beta2] - unknown release date
- Fixed two parts which were not yet converted. Editing of tasks still to do.

## [3.0.0-beta] - unknown release date
- Complete rewrite of all xml handling stuff from using e4x to the new xmlToJxon object.

## [2.2.3] - unknown release date
- Fixed: bug 176 - Calendars whose names contains a slash can't be opened

## [2.2.2] - unknown release date
- Fixed: bug 160 - Meeting invitation received does not get added after accepting

## [2.2.1] - unknown release date
- Fixed bug when closing TB the offline cache would be emptyed.
- Fixed: Bug 161 - pb accessing calendars

## [2.2.0] - unknown release date
- Fixed complaint of ad-on checker.
- Fixed bug of cloning a calendar showed empty fields.

## [2.1.4] - unknown release date
- Fixed: "Unresponsive script" bug.

## [2.1.3] - unknown release date
- Fixed: Bug 52 - Incorrect sync: random calendar events missing, others duplicated

## [2.1.2] - unknown release date
-Fixed: Bug 118 - Kerberos authentication broken in 1.8.11

## [2.1.1] - unknown release date
- Fixed: Bug 151 - Email id property of exchange calendar becomes None on updating thunderbird to 13.0
- Fixed: Bug 153 - "allday" event -> invite someone -> password request -> communication stopped
- Improved: Disabled calendars are not started on TB startup.
- Fixed: The way a calendar startup after is has been created newly.

## [2.1.0] - unknown release date
- Fixed filtering of events
- Fixed saving of the EWS settings.
- Fixed calendarReset.
- Improved getItems function.

## [2.0.5] - unknown release date
- Added: Processing of getItemsFromOfflineCache into a seperate thread.
- Fixed: Problem when turning on offline cache this would only start after restarting TB. 

## [2.0.4] - unknown release date
- Fixed: bug with reminders in offline cache.
- Added: Extra dialog when answering an invitation.

## [2.0.2] - unknown release date
- Improved: Further improved Offline cache items retrieval.
- Fixed: Bug when receiving a HTTP 302 relative redirect. Because of a typo in the code it threw an exception. Possibly bug 51.

## [2.0.1] - unknown release date
- Improved: Offline cache items retrieval.

## [2.0.0] - unknown release date
- Added: Offline cache functionality. (When not connected or offline it goes into Read-Only mode)
- Added: Invitation forwarding functionality.

## [1.8.19] - unknown release date
- Fixes: problem where Out Of Office stopped working int TB12. Fix replaces the WYSIWYG editor into a flat text editor.
- Fixes: Several small bugs.

## [1.8.18] - unknown release date
- Addedd access to exchange contacts folders. (Currently READ-ONLY)
- Fixed: Problem with dismissing and snoozing alarms.
- Fixed: Problem on autodiscovery where sometimes a EWS URL select list was shown with duplicate entries.
- Fixed: Other small problems.
- Fixed: Bug 116 - Authentication fails after Thunderbird-restart
- Fixed: Bug 24 - Accepting or rejecting of invitations changes owner

## [1.8.16] - unknown release date
- Fixed: Bug 122 - New: I get "Event Invitation" email for my own meetings when I import them
- Fixed: Bug 91 - Recurring appointment causes immediate reminders for all future
- Fixed a lot of smaller bugs.

## [1.8.13] - unknown release date
- Fixed: Bug 120 - All my calendar appointments are not visible in Thunderbird
- Fixed: Bug 94 - Credentials (Username, Password) for calendars are not stored

## [1.8.12] - unknown release date
- Fixed: Bug 117 - tasks calendar shows calendar items
- Fixed: Problem where only Free/Busy information would be shown for defalt personal calendar.

## [1.8.6] - unknown release date
- Fixed: Bug 111 - No events are visible when user only has calendar permission to see Free/Busy info

## [1.8.5] - unknown release date
- Fixed: Bug 91 - Recurring appointment causes immediate reminders for all future occurrences
- Fixed: Bug 107 - Snooze state of tasks gets lost after restart
- Updated: Code for setting of alarms and snooze parameters changed completely.

## [1.8.4] - unknown release date
- Fixed: Bug 103 - aListener not defined in calExchangeCalendar
- Added: Global minimal memory cache size preferences.

## [1.8.3] - unknown release date
- fixed: Bug 102 - Extension continually asks for password

## [1.8.1] - unknown release date
- Fixed: Bug 99 - Tasks do not show up in the tasks pane/tab

## [1.8.0] - unknown release date
- Added: Full attachment functionality. 
- Fixed: Bug 97 - Last month's events are missing

## [1.7.18] - unknown release date
- Fixed: Bug it is not possible to accept or decline a meeting invitation

## [1.7.17] - unknown release date
- Fixed: Bug where a HTTP 302 redirect which was called as an error was not handled correctly.
- Fixed: Bug 31 - Unable to invite attendees
- Fixed: Bug 45 - Cannot display users own calendar
- Fixed: Bug 68 - MenuItems for creating new items are disabled
- Fixed: Bug 77 - Lightening fails to save Microsoft Live Meeting style events to the Exchange calendar
- Fixed: Bug 80 - request response HTTP 302 redirect is NOT redirected and communication stops
- Fixed: Bug 82 - Copying of events from google calendar does not work
- Fixed: Bug 83 - Can't add a calendar -> HTTP-ERROR 500
- Fixed: Bug 84 - checks performed on disabled calendars
- Fixed: Bug 85 - Can't open or save file attachments in a calendar meeting
- Fixed: Bug 86 - Invalid log path on Windows
- Added: When you try to access another person's calendar but do not have full read permissions it will switch and only tries to get Free/Busy/Tentative/OOF information.
- Added: The domainname is no longer a required field
- Added: German localization
- Added: Setting logging preferences can now be done from the TB preferences.
- Added: Exporting to ICS. Currently it only export what is has requested from the Exchange server. Default a period of one month ahead and one month back from currentdate.
- Changed: Changed default CalendarPollInterval to once every 60 seconds and InboxPollInterval to once every 180 seconds.

## [1.7.15] - unknown release date
- Fixed: Bug 59 - Exchange sends extra invitations when first one is accepted
- Fixed: Bug 32 - Unable to add event to calendar using iTIP buttons 
- Fixed: Bug 33 - Accept multiple-day appointment request via iTIP creates single-day event
- Fixed: Bug 61 - Error: reference to invalid character number when trying to pull in calendar
- Fixed: Bug 62 - Moving calendar item from one calendar to another fails
- Added: Functionality to clone an Exchange Calendar.
- Fixed: Bug 19 - Event stays shown after deletion
- Fixed: Bug 66 - No workflow (accept, reject, ...) buttons are shown in invitations
- Fixed: Bug 65 - read only of calendar
- Added: New debugging preferences and possibility to create a log/debug file.
- Added: Finer info/error control in communication object.

## [1.7.13] - unknown release date
- Added: Folder properties visible in EWS Settings dialog.
- Added: Mouse cursor wait indication when browsing folders.
- Added: Add a new calendar base on the information in a share calendar invitation from someone.
- Fixed: BUG 54 Shared Calendar w/notification: error when closing
- Fixed: BUG 55 Can't set reminder for a task
- Added: Opening and saving of attachments. (ReadOnly)
- Added: Check if lightning is installed and active. When not it will show a warning.
- Added: Functionality to migrate an Exchange Provider add-on calendar to this add-on.
- Added: User can change poll interval for calendar through EWS Settings.
- Fixed: Bug 56 - Not possible to acknowledge repeating meeting
- Fixed: Small bug when importing an invitation send from a Google Calendar. It does not contain timezone information.
- Fixed: Bug 38 - Invalid security certificate
- Added: Mouse cursor wait indicatie when checking server and username on creating an calendar or changing the server settings.


## [1.7.12] - unknown release date
- Added: Support for Seamonkey.
- Added: Access to public/shared folders without a mailbox. Only windows username, domain & password required.
- Added: You can use now a username consisting of a username part followed by ampersand (@) and full domainname and empty domain field or a username and domain field value.
- Fixed: BUG37. Alarm info on a master calendar item is not show correctly.
- Fixed: BUG41. Synching meetings with empty titles fails
- Added: French localization.
- Fixed: Bug 44 - Synchronizaton fails when a calendar item has no start date
- Fixed: Bug 39 - Accepting a meeting does not get updated in Lightning
- Added: Importing ICS file.
- Change: Changed namespacing on request of Mozilla.


## [1.7.11] - unknown release date
- Modified: Debug log lines show more usefull information.
- Fixed: BUG 30: Accept via iTIP button fails for requests sent to distribution lists
- Improved: The processing of meeting invitations is complete. Even the iTIP buttons work.

## [1.7.10a3] - unknown release date
- Fixed an Exchange server version problem in function GetMeetingRequestByUID. It did not work correctly on Exchange 2007

## [1.7.10a1] - unknown release date
- Fixed: BUG 28 "NL -> EN translation string" EN != "Settings voor calendar"
- Fixed: BUG 24 "Accepting or rejecting of invitations changes owner". Meeting invitations are not yet working as wanted when using iTIP buttons.

## [1.7.9] - unknown release date
- Fixed: Meeting requests and updates to these requests were not processed in the right way.

## [1.7.8] - unknown release date
- Fixed: BUG 25 Recuring event with reminder prevents calendar refresh
- Fixed: BUG 26 Deleting a single occurrence in a sequence has no effect
- Fixed: BUG 27 Today Pane Tasks fails to show newly created tasks

## [1.7.7] - unknown release date
- Fixed: BUG 24 "Accepting or rejecting of invitations changes owner"
- Fixed: Stabilized meeting invitations in global. Now works with distribution lists, other alias name, etc...

## [1.7.7a3] - unknown release date
- Fixed: BUG 23 "Request sent instead of Confirmation; wrong Timezone"
- Fixed: Trying to mark a task as completed gives an update error: "CompleteDate cannot be set to a date in the future."
- Fixed: Removing the completed task status through the checkbox in the task view produces an error.

## [1.7.7a2] - unknown release date
- Fixed: Could not respond to aa meeting invitation where the mailbox name was different in character Upper/Lowercase than the emailaddress in the invitation.

## [1.7.7a1] - unknown release date
- Fixed: Chagning/updating of an existing item where you are the organiser but also on the attendee list, created by outlook, gave an error.
- Added: The add-on now modifies the Exchange nextreminderdate on the Exchange server as the old Exchange provider add-on did. This is part of the merge of the add-ons.

## [1.7.6] - unknown release date
- Added: Progres indicator with tooltip. (closes BUG report 14)
- Solved: BUG 16 Cannot create event due to Time Zone error (reported by Sven)
- solved: BUG 17 Out of office retrieval of incorrect values (reported by Sven)
- Solved: When you are editing Out Of Office settings and had the externel reply window open and did a save the text for the external reply was changed by the internal reply message.
- Added: It is not possible anymore to add tasks to a calendar folder and calendaritems in a tasks folder. This would produce an error.
- Fixed: BUG 18 Changing the end or start date of an allday event produces an error. (reported by Sven)

## [1.7.5] - unknown release date
- Minor changes to keep the add-on working in version 10.0a2.
- Fixed: Problem where timezone information downloading did not work for exchange 2007.

## [1.7.4] - unknown release date
- Added: The snooze and dismiss states are saved on the exchange server so they survive a restart of TB. Was a problem when "show missed alarms" was on. (BUG 12 reported by pazz)
- Solved: Shut-down is faster.

## [1.7.3] - unknown release date
- Solved: BUG 11/ During creation of an allday event with a reminder or turning on the reminder on an existing allday event triggers an error and change is not saved.  (reported by gislair)

## [1.7.2] - unknown release date
- Solved: When the windows account got locked the password manager kept asking for a password. Now after tree failed attempts it will stop asking until a restart.
- Solved: Respong to a meeting request through the iTIP buttons generated an error and did not work.

## [1.7.1] - unknown release date
- Solved: When an organiser removed a meeting which was confirmed the update in your calendar was performed every 3 seconds.

## [1.7.0] - unknown release date
- Changed: Folder browser shows different icons for different folderclass property.
- Solved: Removing a meeting in a public folder did not work an give error.
- Solved: Buttons Save and cancel in the EWS settings dialog would drop of dialog window.
- Major version changed into 1 because the add-on is feature complete.

## [0.7.47] - unknown release date
- New: Selecting the right folder below the folderbase can now be done through a folder browser.

## [0.7.46] - unknown release date
- Improved: Creation, modification and deletion of repeating events.

## [0.7.45] - unknown release date
- Solved: Removing a repeating event did not allways work.

## [0.7.44] - unknown release date
- Solved: Creating an all day event did not work anymore.

## [0.7.42] - unknown release date
- Solved: Some alarms could not be removed.
- Solved: For repeating meetings multiple alarms were shown, with same titel and date, when option show missed alarms was on in Lightning settings.
- Added: Option to automatically remove responses to meetingrequest from your inbox when you are not the organiser.
- Solved: BUG10 reported by P.Palai.

## [0.7.41] - unknown release date
- Solved: Checking/searching for certain folderpath locations did not work.
- Solved: Manipulating occurrences in a repeating meeting did not always work.
- Solved: Changing the EWS settings did not refresh the calendar and therefore the changes were not visible.

## [0.7.40] - unknown release date
- Some small changed to make shared funcitonality available to the Exchange Contacts add-on
- Meetingrequest in a non personal folder we show als invitation request to the use. Now they are not shown anymore as invitation request.
- Added different job queues for synchronization and modify actions to the EWS server. During startup changes are show earlier.

## [0.7.39] - unknown release date
- User must choose to whom invitation updates are send.
- Added a new calender folder poller which will sync by default every 10 seconds.

## [0.7.38] - unknown release date
- Changes in meetings in personal calendars will be send always to all involved persons. 
- In a later version the extension will ask the user to specify what he wants (send updates or not)

## [0.7.37] - unknown release date
- Fixed problem where after an autodiscovery and server and mailbox check did not work.
- Removing a calendar will remove all settings and running processes.

## [0.7.36] - unknown release date
- Fixed a warning in the Mozilla tests.

## [0.7.35] - unknown release date
- Fixed bug (reported by Tudor Timisescu). Check for server and mailbox did not work anymore.

## [0.7.34] - unknown release date
- Added management of Out of Office settings.

## [0.7.33] - unknown release date
- Added three new options to the EWS preferences for each calendar.
- Completed list of "base folder" options.

## [0.7.32] - unknown release date
- EWS Timezome information added for Exchange2007(_SP1) servers
- Problems with allday event solved (see version 0.7.30)
- Tasks date and times are working now for different timezones.
- Version is stable for production use.

## [0.7.31] - unknown release date
- Fixed upgrade problem between versions 0.7.29 and 0.7.30

## [0.7.30] - unknown release date
- Timezone is added correctly. There is even a difference between a 2010 or 2007 version of Exchange.
- Starting mechanism is optimized.
- A calendar reset is done completely now.
- Known problem: If you add a alldayevent EWS will add an extra day infront of it. So 1 allday becomes two.

## [0.7.29] - unknown release date
- Added the posibility to change your reaction to an invitation request in the meetingresponse screen.

## [0.7.28] - unknown release date
- Addedd extra options to the EWS Settings.

## [0.7.27] - unknown release date
- Fixed bug 6. TB becomes unresponsive on paging back in week view.

## [0.7.26] - unknown release date
- Extra settings for each calendar (poll inbox)
- Inbox poller results are better processed.
- Settings are now saved in the right location within preferences..

## [0.7.22] - unknown release date
- Deleting of an occurrence from a string does work now.
- Alarms can be dismissed or gesnoozed. 
	This status is not saved between TB restarts.
	This is an in memory status maintained by TB.

## [0.7.21] - unknown release date
- iTIP processing improved.

## [0.7.20] - unknown release date
- Settings and alarm on recurring appointments is better handled.

## [0.7.19] - unknown release date
- Fixed BUG 4.
- Fixed BUG 5.
- So called observers are broken down in the right way.

## [0.7.18] - unknown release date
- Fixed BUG 3.
- Alarm changing improved.

## [0.7.17] - unknown release date
- Fixed BUG 2.

## [0.7.16] - unknown release date
- Task alarms are being set in the right way.
- Dismiss or snooze the alarm of a task is working now.

## [0.7.15] - unknown release date
- Removed all storage of passwords in Memory. All password are only stored by the default Thunderbird Password Manager.

## [0.7.14] - unknown release date
- Imporved iTIP processing.

## [0.7.13] - unknown release date
- Source code cleanup.
- Exception "nsIAuthPrompt2.asyncPromptAuth" solved.
- Failures during creating connections to server are better handled.

## [0.7.12] - unknown release date
- Changed text on buttons for MessageRespons screen.
- Fixed where it was not possible to create an alldayevent.
- Dismissing an alarm will work.

## [0.7.11] - unknown release date
- Improved iTIP processing.

## [0.7.10] - unknown release date
- Fixed problem for date/time conversions. Through this problem some appointments were show on the wrong date or time.
