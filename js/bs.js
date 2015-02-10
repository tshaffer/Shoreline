// member variables
var runSetup = false;

// variables
var _fileSystem;
var filesToDisplay = [];
var displayList = [];
var displayInProgress = false;

// BSP variables
var currentSync = null;
var autoSchedule = null;
var activePresentation = "";
var bsp_sign = null;
var bsp_playerHSM = null;

//xml to JSON singleton object
var converter;  

function XML2JSON(xml) {
    if (!converter) {
        converter = new X2JS();
    }
    return converter.xml2json(xml);
}


function fileSystemErrorHandler(e) {
    var msg = '';

    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    };

    console.log('Error: ' + msg);
    console.log('fileSystemErrorHandler invoked');
}

function readAutoSchedule(nextFunction) {
    readXmlFile("autoschedule.xml", nextFunction);
}


function Restart(presentationName) {

    if (presentationName == "") {
        // read the autoschedule.xml file and parse it to get the schedule object
        readAutoSchedule(restartWithAutoschedule);
    }
}


function restartWithAutoschedule(xmlDoc) {

    // get autoschedule, parse it to get the schedule and the active presentation
    autoSchedule = xmlDoc;
    var schedule = parseAutoSchedule(autoSchedule);
    var xmlFileName = "autoplay-" + schedule.autoplayPoolFile + ".xml";
    activePresentation = schedule.autoplayPoolFile;

    if (xmlFileName != "") {
        // retrieve the xml file associated with the active presentation and create a new sign from this specification
        readAutoplay(xmlFileName, createNewSign);
    }
}

function createNewSign(signXML) {

    var signAsJSON = XML2JSON(signXML);
    var signObj = new sign(signAsJSON);
    bsp_sign = signObj;

    debugger;
    var event = {};
    event["EventType"] = "signReadCompleted";
    bsp_playerHSM.Dispatch(event);
}

function retrieveSyncSpec() {

    console.log("retrieveSyncSpec invoked");

    $.ajax({
        url: "https://services.brightsignnetwork.com/bs/CheckForContent.ashx",
        type: 'GET',
        dataType: 'xml',
        headers: {
            "account": "ted",
            "password": "tedpwd",
            "group": "aws",
            "user": "teduser",
            "presentationName": "none",
            "DeviceID": "L4C49T000025",
            "DeviceModel": "XD1132",
            "DeviceFamily": "lynx",
            "DeviceFWVersion": "5.1.16",
            "DeviceSWVersion": "7.1.6",
            "CustomAutorunVersion": "7.1.0",
            "timezone": "PST",
            "localTime": "2014/12/09 15:35:37.936",
            "storage-size": "7631",
            "storage-fs": "fat32",
            "storage-current-used": "5"
        },
        error: function () { debugger; },
    })
    .success(function (data, textStatus, jqXHR) {
        console.log("get success");
        console.log(textStatus);
        writeCurrentSync($(data)[0]);
        parseSyncSpec($(data)[0]);
    });
}

function readCurrentSync(nextFunction) {
    readXmlFile("current-sync.xml", nextFunction);
}

function readXmlFile(fileToRetrieve, nextFunction) {

    // try to get the file from the file system
    _fileSystem.root.getFile(fileToRetrieve, {}, function (fileEntry) {

        // Get a File object representing the file, then use FileReader to read its contents.
        fileEntry.file(function (file) {
            var reader = new FileReader();

            reader.onloadend = function (e) {   // this.result
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(this.result, "text/xml");
                //init2(xmlDoc);
                nextFunction(xmlDoc);
            };

            reader.readAsText(file);

        }, function (e) {
            fileSystemErrorHandler(e);
        });

    }, function (e) {
        fileSystemErrorHandler(e);
    });
}

function writeCurrentSync(xml) {

    var xmlText = new XMLSerializer().serializeToString(xml);

    _fileSystem.root.getFile("current-sync.xml", { create: true }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {

            fileWriter.onwriteend = function (e) {
                console.log('Write completed: ' + "current-sync.xml");
            };

            fileWriter.onerror = function (e) {
                console.log('Write failed: ' + e.toString() + " on file " + fileToDownload.name);
            };

            // https://developer.mozilla.org/en-US/docs/Web/API/Blob#Blob_constructor_example_usage 
            var aDataParts = [xmlText];
            var blob = new Blob(aDataParts, { type: 'text/xml' });
            fileWriter.write(blob);

        }, errorHandler);

    }, errorHandler);
}

function parseSyncSpec(syncSpec) {

    var sync = syncSpec.childNodes[0]

    var meta = sync.children[0];
    var files = sync.children[1];

    var client = meta.children[0];
    var server = meta.children[1];

    var downloads = files.children;

    var downloadItems = [];

    $.each(downloads, function (index, download) {

        var downloadItem = {};

        $.each(download.children, function (index, downloadChild) {

            var value = downloadChild.innerHTML;

            switch (downloadChild.localName) {
                case 'name':
                    downloadItem.name = value;
                    break;
                case 'link':
                    downloadItem.link = value;
                    break;
                case 'size':
                    downloadItem.size = value;
                    break;
                case 'hash':
                    var method = downloadChild.attributes[0].name;
                    if (name == "method") {
                        if (nodeValue == "sha1") {
                            downloadItem.sha1 = value;
                        }
                    }
                    break;
            }
        });

        downloadItems.push(downloadItem);
    });

    downloadFiles(downloadItems);
}

function downloadFiles(downloadItems) {

    var filesToDownload = [];

    $.each(downloadItems, function (index, downloadItem) {
        // for now, only download specific file types (.jpg, .png, .mp4) and the following files
        //      autoschedule.xml
        //      autoplay-<presentation name>.xml
        if (downloadItem.name != undefined) {
            var fileName = downloadItem.name.toLowerCase();
            var n = fileName.lastIndexOf(".jpg");
            if (downloadItem.name.length == (n + 4)) {
                console.log("found downloadItem " + downloadItem.name);
                downloadItem.mimeType = "image/jpeg";
                filesToDownload.push(downloadItem);
            }
            else {
                n = fileName.lastIndexOf(".png");
                var startIndex = fileName.lastIndexOf("applicationwebserver")
                if (downloadItem.name.length == (n + 4) && (startIndex != 0)) {
                    console.log("found downloadItem " + downloadItem.name);
                    downloadItem.mimeType = "image/png";
                    filesToDownload.push(downloadItem);
                }
                else {
                    n = fileName.lastIndexOf(".mp4");
                    if (downloadItem.name.length == (n + 4)) {
                        console.log("found downloadItem " + downloadItem.name);
                        downloadItem.mimeType = "video/mp4";
                        filesToDownload.push(downloadItem);
                    }
                    else if (fileName == "autoschedule.xml") {
                        console.log("found downloadItem " + downloadItem.name);
                        downloadItem.mimeType = "text/xml";
                        filesToDownload.push(downloadItem);
                    }
                    else if (fileName.lastIndexOf("autoplay-") == 0) {
                        console.log("found downloadItem " + downloadItem.name);
                        downloadItem.mimeType = "text/xml";
                        filesToDownload.push(downloadItem);
                    }
                }
            }
        }
    });

    //fileToDisplay = filesToDownload[0];
    filesToDisplay = [];
    getFiles(filesToDownload);
}


function parseAutoSchedule(autoScheduleXml) {

    var schedule = {};

    var autoSchedule = autoScheduleXml.childNodes[0];
    var scheduledPresentation = autoSchedule.children[0];

    $.each(scheduledPresentation.children, function (index, scheduledPresentationChild) {
        if (scheduledPresentationChild.localName == "presentationToSchedule") {
            var presentationToScheduleChildren = scheduledPresentationChild.children;
            $.each(presentationToScheduleChildren, function (index, presentationToScheduleChild) {
                if (presentationToScheduleChild.localName == "name") {
                    var presentationName = presentationToScheduleChild.innerHTML;
                    schedule.autoplayPoolFile = presentationName;
                }
            });
        }
    });

    return schedule;
}

function readAutoplay(fileName, nextFunction) {
    readXmlFile(fileName, nextFunction);
}


function bsp_StartPlayback() {

    var sign = bsp_sign;

    debugger;

    // kick off playback

}


$(document).ready(function () {


    function init() {

        // set script version strings

        // logging output?

        // any information required similar to roDeviceInfo

        // edid?

        // InitRemoteSnapshots

        // any system software version compatibility issues?

        // RunBSP();
    }

    function RunBSP() {
    
        // newBSP();

        // read registry settings

        // create / initialize global variables

        // control port
        // storage hotplug
        // networking hotplug
        // disk monitor
        // video mode
        // blc
        // button panels (bp's)

        // set lwsEnabled
        // if lwsEnabled
        //      set lws handlers
        
        // create directories
        //      pool
        //      feedPool
        //      feed_cache
        //      snapshots

        // create assetPools

        // look for local-sync.xml
        // if it exists,
        //      initialize assetCollection, assetPoolFiles
        // usb update content initialization

        // look for current-sync.xml
        // if it exists,
        //      set data transfer type used for content, text feeds, health, mediaFeeds, and logs to wired or wireless
        //      ** create networkingStateMachine
        //      initializeAssetCollection, assetPoolFiles
        //      ** call init() on networkingStateMachine

        // determine and set file paths for global files

        // initialize logging parameters

        // setup logging

        // InitializeNonPrintableKeyboardCodeList

        // protect the current assets (from deletion)

        // limit pool sizes

        // setup BrightSign Application Server

        // create GPIO state machines and associated data structures

        // create BP state machines and associated data structures

        // *** create player state machine, initialize

        // check BLCs status (init as well?)

        // go into event loop
    }

    function newBSP() {

        // registry variables?
    }

    function tmpRestart() {
        // initialize lots of variables

        // if there's no presentation name,
        //      get autoSchedule file - calls XMLAutoschedule(xmlFileName) to get schedule object
        //      sets m.schedule
        //      sets presentationName
        // else
        //      sets autoPlayFileName$ from presentationName$
        //      sets m.activePresentation$
        
        // if there's a BrightAuthor xmlFile,
        //      read it and parse it (xml)
        //      invoke newSign
        // else
        //      set idle screen color
        
        // if there's an active sign,
        //      stop and invalidate all the existing video and audio players

        // create gpio state machines
        // create, initialize, and configure required BP state machines and BP's

        // initialize user variable web server

        // initialize script plugins

        // initialize device web page
    }

    function XMLAutoschedule(xmlFileName) {
        // read autoschedule.xml file
        // invoke newSchedule on autoscheduleXML file to get a schedule
        // if an active schedule is found, sets m.activePresentation$, schedule.autoplayPoolFile$
        // returns a schedule object
    }

    function newSign() {
        // read all parameters from xml file
        // initialize certain items

        // read zones - for each zone
        //      create zonesHSM object
        //      create hsm for the zone
        //      add zoneHSM to the sign

    }

    function newZoneHSM() {
        // get zone type
        // based on zone type, create the appropriate type of zone
        //      newVideoOrImagesZoneHSM

        // invoke newPlaylist

        // return zoneHSM
    }

    function newVideoOrImagesZoneHSM() {
        // invokes newVideoZoneHSM
    }

    function newVideoZoneHSM() {
        // create newHSM
        // invokes newZoneCommon to set common parameters

    }

    // code

    function onInitializeFileSystem(fileSystem) {
        _fileSystem = fileSystem;
        console.log('onInitializeFileSystem: opened file system: ' + _fileSystem.name);

        // proceed with initialization
        init1();
    };

    function initializeFileSystem() {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(
            window.PERSISTENT, 10 * 1024 * 1024,
            onInitializeFileSystem,
            fileSystemErrorHandler
        );
    }



    console.log("entering bs.js");

    var startAppButton = document.querySelector('#startApp');
    $('#startApp')[0].innerHTML = "Press to begin";

    startAppButton.addEventListener('click', function (e) {
        console.log("startAppButton pressed, invoke init0");
        init0();
    });

    init0();

    function init0() {
        initializeFileSystem();
    }

    function init1() {
        // file system initialization is complete - proceed with initialization

        if (runSetup) {
            retrieveSyncSpec();
        }
        else {
            // not running setup - normal runtime
            launchRuntime();
        }
    }

    function launchRuntime() {

        // perform any necessary initialization

        // get current sync (only support networking currently)
        readCurrentSync(launchRuntime1);
    }

    function launchRuntime1(xmlDoc) {

        currentSync = xmlDoc;

        //  create networking state machine and initialize it
        var networkingHSM = new networkingStateMachine();
        networkingHSM.Initialize();

        // Create player state machine
        bsp_playerHSM = new playerStateMachine();
        bsp_playerHSM.Initialize();
    }

    function errorHandler() {
        debugger;
    }

    function getFiles(filesToRetrieve) {
        if (filesToRetrieve.length > 0) {
            var fileToRetrieve = filesToRetrieve.shift();
            readFile(fileToRetrieve, filesToRetrieve);
        }
        else {
            displayContent();
        }
    }

    function readFile(fileToRetrieve, filesToRetrieve) {

        // check to see if this file already exists in the file system
        _fileSystem.root.getFile(fileToRetrieve.name, {}, function (fileEntry) {

            // Get a File object representing the file,
            // then use FileReader to read its contents.
            fileEntry.file(function (file) {
                var reader = new FileReader();

                reader.onloadend = function (e) {   // this.result
                    var byteArray = new Uint8Array(this.result);
                    fileToRetrieve.blob = new Blob([byteArray], { type: fileToRetrieve.mimeType });
                    fileToRetrieve.blobURL = window.URL.createObjectURL(fileToRetrieve.blob);

                    filesToDisplay.push(fileToRetrieve);
                    getFiles(filesToRetrieve);
                };

                reader.readAsArrayBuffer(file);

            }, function (e) {
                fileSystemErrorHandler(e);
                downloadFile(fileToRetrieve, filesToRetrieve);
            });

        }, function (e) {
            fileSystemErrorHandler(e);
            downloadFile(fileToRetrieve, filesToRetrieve);
        });
    }

    function downloadFile(fileToDownload, filesToRetrieve) {

        // file does not exist; download it and write it once it is downloaded

        // see http://www.html5rocks.com/en/tutorials/file/xhr2/ for a way to avoid arraybuffer
        var oReq = new XMLHttpRequest();
        oReq.open("GET", fileToDownload.link, true);
        oReq.responseType = "arraybuffer";

        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {

                var byteArray = new Uint8Array(arrayBuffer);
                fileToDownload.blob = new Blob([byteArray], { type: fileToDownload.mimeType });
                fileToDownload.blobURL = window.URL.createObjectURL(fileToDownload.blob);

                _fileSystem.root.getFile(fileToDownload.name, { create: true }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {

                        fileWriter.onwriteend = function (e) {
                            console.log('Write completed: ' + fileToDownload.name);
                            filesToDisplay.push(fileToDownload);
                            getFiles(filesToRetrieve);
                        };

                        fileWriter.onerror = function (e) {
                            console.log('Write failed: ' + e.toString() + " on file " + fileToDownload.name);
                        };

                        fileWriter.write(fileToDownload.blob);

                    }, errorHandler);

                }, errorHandler);
            }
        };

        oReq.send(null);
    }

    function displayItem(index) {

        if (displayList[index].mimeType == "video/mp4") {
            $('#imageZone').hide();
            $('#videoZone').show();
            $("#videoZone").attr('src', displayList[index].blobURL);
            $('#videoZone')[0].load();
            $('#videoZone')[0].play();

            $("#videoZone").on("ended", function (e) {
                console.log("video ended");
                index = index + 1;
                if (index >= displayList.length) {
                    index = 0;
                }

                displayItem(index);
            });
        }
        else {
            $('#videoZone').hide();
            $('#imageZone').show();
            $("#imageZone").attr('src', displayList[index].blobURL);

            setTimeout(
                function () {
                    index = index + 1;
                    if (index >= displayList.length) {
                        index = 0;
                    }

                    displayItem(index);
                },
                2000);
        }
    }

    function displayContent() {
        var index = 0;

        //Returns format of: filesystem:chrome-extension://nlipipdnicabdffnohdhhliiajoonmgm/persistent/xxxxxxxxxxxx.png
        //<img src="filesystem:chrome-extension://nlipipdnicabdffnohdhhliiajoonmgm/persistent/xxxxxxxxxxxx.png">

        //var url = "filesystem:chrome-extension://colflmholehgbhkebgghaopnobppmcoe_0/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe_0/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe/persistent/" + filesToDisplay[index];
        //var url = "chrome-extension://colflmholehgbhkebgghaopnobppmcoe/" + filesToDisplay[index];
        //$("#imageInZone").attr('src', url);

        //$("#imageInZone").attr('src', poop);

        //$("#imageZone").attr('src', filesToDisplay[index].blobURL);

        //var index = 1;
        //if (index >= filesToDisplay.length) {
        //    index = 0;
        //}

        //var url = "./" + filesToDisplay[index].blobURL;

        setTimeout(
            function () {
                console.log("time to check for a new sync spec");
                retrieveSyncSpec();
            },
            30000);

        // copy objects from the populated list to the display list
        displayList = [];
        $.each(filesToDisplay, function (index, fileToDisplay) {
            displayList.push(fileToDisplay);
        });

        if (!displayInProgress) {
            displayInProgress = true;
            displayItem(0);
        }
    }
});
