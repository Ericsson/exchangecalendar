## Introduction

Exchange Calendar is an add-on for [Thunderbird](https://mozilla.org/thunderbird)
and [Seamonkey](https://www.seamonkey-project.org/).

It extends the [Lightning](https://addons.mozilla.org/thunderbird/addon/lightning/) add-on to provide
[Microsoft Exchange](http://microsoft.com/exchange) support.

Exchange Calendar extension can:
  * Synchronize calendars, tasks, and contacts with a Microsoft Exchange server.
  * Create, edit and update events and tasks.
  * Display contacts from your address books and the global address list
    (they are only readable, they are usable with address autocompletion).
  * Manage the Exchange « out of office » feature.

This extension requires:
  * Thunderbird between versions 52 and **[up to 59](https://github.com/ExchangeCalendar/exchangecalendar/issues/277)**.
    * See the [releases page](https://github.com/ExchangeCalendar/exchangecalendar/releases)
  for preview builds of ExchangeCalendar version 5 with Thunderbird 60 support.
  * Lightning extension corresponding to the Thunderbird release.
  * The targeted Exchange server has to provide an Exchange Web Service (EWS).

ExchangeCalendar is developed by a community of interested developers. 
Support is best effort and cannot be guaranteed. Contributions are welcome.

### Installation

Download a pre-built release from our 
[releases page](https://github.com/ExchangeCalendar/exchangecalendar/releases)
or build your own release as shown below.

## Development status

There is no active development at this time.

### Thunderbird 68 compatibility

Currently not implemented. See issue [#277](https://github.com/ExchangeCalendar/exchangecalendar/issues/277).

A [financial bounty](https://www.bountysource.com/issues/74122217-compatibility-with-thunderbird-67-and-newer-versions) 
is available for anyone who implements this support. For details and 
rules see the linked page.

## Contributing

This add-on was originally created by Michel Verbraak. It is open source and based 
on the work of many 
[contributors](https://github.com/ExchangeCalendar/exchangecalendar/graphs/contributors).

### Report issues

Please report any issues that have not previously been reported
[here](https://github.com/ExchangeCalendar/exchangecalendar/issues).

The more information you can provide about an issue, the easier it becomes to
reproduce and fix. Examples of helpful information are:
  * Thunderbird version
  * Lightning version
  * List of running Thunderbird add-ons
  * Log output

### Patch the code

To help us to maintain the code, we will be thankful to follow these main
guidelines:

* Use indentation with 4 spaces
* Avoid too long lines, try to break long lines into smaller ones
* Avoid to write "spaghetti" code with too many if/else imbrications
* Try to keep code simple to help us maintain it on long term

Note that our `Makefile` has a `beautify` target which will try to beautify
all JavaScript (requires `jsbeautifier` Debian package) and XML code
(requires `tidy` package) to help maintain a clean code.

When your patches are ready, you are welcome to do pull requests on our
repository.

Please help us to review your code by making multiple small pull
requests instead of big ones modifying big parts of the code.

### Translate

You are welcome to provide translation updates on our Transifex project:
https://www.transifex.com/ExchangeCalendar/exchangecalendar

## Build instructions

To manually build the add-on, you have to:
```bash
# clone this project
git clone https://github.com/ExchangeCalendar/exchangecalendar.git
cd exchangecalendar
# build it
make build
```
Then an `xpi` file is created in the project folder.
This file is directly installable from the add-on page of Thunderbird.

If it doesn't work, please check you have these tools installed (example for
Debian):
```bash
sudo apt install git-core zip
```

## License

This software is provided on a best-effort basis without any warranty.
Please see the [license](http://www.gnu.org/licenses/gpl.html)
for details.

Some of the icons and images used are from the Fugue Icons Collection made
by [Yusuke Kamiyamane](http://p.yusukekamiyamane.com/).
