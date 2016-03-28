##Exchange EWS Provider
=====================
Thank you for checking out Ericsson's Exchange EWS Provider. Ericsson and the Ericsson QA team are grateful for the help and hard work of many [contributors][contributors] like yourself.

Current Release Vs. Download trend is something like [this](https://rawgit.com/muthusuba/github-tools/master/downloads-trend.html?user=Ericsson&repo=exchangecalendar)


Getting involved as a contributor
------------------------------------------
We love working with contributors for Exchange EWS Provider, but it does require a few skills. You will need to know some Javascript, XUL, some CSS and a basic familiarity with GitHub.

If you know some Javascript, it's worth having a look at the Object Oriented Programming to understand the basic concepts of class based coding and especially for xul window objects. 

If you need to brush-up on programming, but are eager to start contributing immediately, please consider helping us find bugs in Github [Exchange EWS Provider][Exchange EWS Provider] or find bugs in the Issues tested by the [EricssonQA][EricssonQA] team. To brush up on Javascript skills before engaging with us, Dive Into Javascript [mozilla][mozilla] is an excellent resource. W3schools also has [notes on Javascript][w3schools] available through their website.  The programming concepts you will need to know include functions, working with classes, and some object-oriented programming basics. To brush up on XUL, Mozilla [XUL][XUL] is an easy and simple place to learn XUL, More of XUL are dynamically configured and cross-plateform.

Special thanks to all our [contributors][contributors]

[w3schools]:  http://www.w3schools.com/js/
[mozilla]:  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
[EricssonQA]:  https://github.com/Ericsson/exchangecalendar/
[Exchange EWS Provider]:  https://github.com/Ericsson/exchangecalendar/issues
[XUL]:  https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School
[contributors]: https://github.com/Ericsson/exchangecalendar/contributors

Questions are always welcome
----------------------------
While we take pains to keep our documentation updated, the best source of information is those of us who work on the project. We also have the [wiki][wiki] pages to answer your general questions about contributing to Exchange EWS Provider.

[wiki]:   https://github.com/Ericsson/exchangecalendar/wiki
 
Getting set up
-------------
It's easy to get set up: just 2 pieces of software to install and in few command lines you'll be running the addon!

### Install Thunderbird
If you don't already have it installed, please install latest version
https://support.mozilla.org/en-US/kb/installing-thunderbird

### Install Lightning
If you don't already have it installed, please install latest version
https://support.mozilla.org/en-US/kb/installing-lightning-thunderbird

### Cloning the test repository with Git
After you have installed [Git] you will need to clone the project to your hard drive. From your workspace directory run this command which will copy (clone) the project to your hard drive

    git clone --recursive git://github.com/Ericsson/exchangecalendar.git
[Git]: http://en.wikipedia.org/wiki/Git_%28software%29

### Installing developement tools
You will need to install Dom Inspector, Javascript Debugger and some other development tools. Fortunately `Thunderbird addons` makes it easy to install all of these: 
  
Now using bash we'll compile the addon we need (which are written in wiki)

    cd ./exchangecalendar; chmod +x ./build.sh; ./build.sh -u;

Now you can install the Exchange EWS Provider addon

Writing Code
-------------
If you want to get involved and add more code, then there's just a few things
we'd like to ask you to do:

1. Use the similar code format for all new developement and window objects 
2. Follow mozilla's simple [Coding Style Guide][Coding Style Guide] recommendations
3. Fork this project with your own GitHub account
4. Make sure all tests are passing and submit a pull request with your changes

[Coding Style Guide]: https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Coding_Style
 
License
-------
This software is licensed under the [GNU GPL] Version 3 
[GNU GPL]: http://www.gnu.org/licenses/gpl.html 

Readme template file courtesy: [mozwebqa-test-templates][mozwebqa-test-templates]
[mozwebqa-test-templates]: https://github.com/mozilla/mozwebqa-test-templates
