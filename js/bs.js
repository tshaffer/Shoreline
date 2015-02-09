$(document).ready(function () {

    // member variables
    var runSetup = true;

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

    function newPlayerStateMachine() {

        // ** PlayerStateMachine = newHSM()
        // **   create states, handlers
    }

    function InitializePlayerStateMachine() {
        // ** bsp.Restart("")
    }

    function Restart() {
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

    // variables
    var _fileSystem;
    var filesToDisplay = [];
    var displayList = [];
    var displayInProgress = false;

    // code

    console.log("entering bs.js");

    function onInitializeFileSystem(fileSystem) {
        _fileSystem = fileSystem;
        console.log('Opened file system: ' + _fileSystem.name);
        //debugger;
    };

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

    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    window.requestFileSystem(
        window.PERSISTENT, 10 * 1024 * 1024,
        onInitializeFileSystem,
        fileSystemErrorHandler
    );

    var startAppButton = document.querySelector('#startApp');
    $('#startApp')[0].innerHTML = "Press to begin";

    startAppButton.addEventListener('click', function (e) {
        console.log("startAppButton pressed");
        if (runSetup) {
            retrieveSyncSpec();
        }
        else {
        }
    });

    function retrieveSyncSpec() {

        console.log("retrieveSyncSpec invoked");

        $.ajax({
            url: "https://services.brightsignnetwork.com/bs/CheckForContent.ashx",
            type: 'GET',
            dataType: 'xml',
            headers: {
                "account":"ted",
                "password":"tedpwd",
                "group":"aws",
                "user":"teduser",
                "presentationName":"none",
                "DeviceID":"L4C49T000025",
                "DeviceModel":"XD1132",
                "DeviceFamily":"lynx",
                "DeviceFWVersion":"5.1.16",
                "DeviceSWVersion":"7.1.6",
                "CustomAutorunVersion":"7.1.0",
                "timezone":"PST",
                "localTime":"2014/12/09 15:35:37.936",
                "storage-size":"7631",
                "storage-fs":"fat32",
                "storage-current-used":"5"
            },
            error: function () { debugger; },
        })
        .success(function (data, textStatus, jqXHR) {
            console.log("get success");
            console.log(textStatus);
            parseSyncSpec($(data)[0])
        });
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

            $.each(download.children, function(index, downloadChild) {

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
            // for now, only download specific file types (.jpg, .png, .mp4)
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
                    }
                }
            }
        });

        //fileToDisplay = filesToDownload[0];
        filesToDisplay = [];
        getFiles(filesToDownload);
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
