// member variables
var runSetup = false;

// variables
var _fileSystem;
var filesToDisplay = [];
var displayList = [];
var displayInProgress = false;

// BSP variables
var currentSync = null;
var currentSyncSpecAsJson = null;
var newSync = null;
var autoSchedule = null;
var activePresentation = "";
var bsp_sign = null;
var bsp_playerHSM = null;

var registeredStateMachines = [];

//xml to JSON singleton object
var converter;  

function registerStateMachine(hsm) {
    registeredStateMachines.push(hsm);
}


function deregisterStateMachine(hsmToDeregister) {
 
    var hsmIndex = -1;
    $.each(registeredStateMachines, function (index, hsm) {
        if (typeof hsm.id != "undefined" && hsm.id == hsmToDeregister.id) {
            hsmIndex = index;
        }
    });

    if (hsmIndex >= 0) {
        registeredStateMachines.splice(hsmIndex, 1);
    }
}


function postMessage(event) {
    $.each(registeredStateMachines, function (index, hsm) {
        hsm.Dispatch(event);
    });
}
    

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

    console.log("createNewSign invoked");

    var signAsJSON = XML2JSON(signXML);
    var signObj = new sign(signAsJSON);
    bsp_sign = signObj;

    console.log("createNewSign completed");

    var event = {};
    event["EventType"] = "signReadCompleted";
    postMessage(event);
}

function retrieveSyncSpec() {

    debugger;

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
        //writeCurrentSync($(data)[0]);
        var syncSpecAsJson = XML2JSON($(data)[0]);
        var filesInSyncSpec = parseSyncSpecAsJSON($(data)[0]);
        var filesToDownload = getFilesToDownload(filesInSyncSpec);
        console.log("clear filesToDisplay");
        filesToDisplay = [];
        getFiles(filesToDownload, displayContent, syncSpecAsJson);

    });
}


function readCurrentSyncAsJson(nextFunction) {

    var fileToRetrieve = "current-sync.json";

    // try to get the file from the file system
    _fileSystem.root.getFile(fileToRetrieve, {}, function (fileEntry) {

        // Get a File object representing the file, then use FileReader to read its contents.
        fileEntry.file(function (file) {
            var reader = new FileReader();

            reader.onloadend = function (e) {   // this.result
                currentSyncSpecAsJson = JSON.parse(this.result);
                nextFunction();
            };

            reader.readAsText(file);

        }, function (e) {
            fileSystemErrorHandler(e);
        });

    }, function (e) {
        fileSystemErrorHandler(e);
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


function errorHandler() {
    debugger;
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


function writeCurrentSyncAsJson(syncSpecAsJson) {

    var syncSpecAsStr = JSON.stringify(syncSpecAsJson);

    _fileSystem.root.getFile("current-sync.json", { create: true }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {

            fileWriter.onwriteend = function (e) {
                console.log('Write completed: ' + "current-sync.json");
            };

            fileWriter.onerror = function (e) {
                console.log('Write failed: ' + e.toString() + " on file " + "current - sync.json");
            };

            // https://developer.mozilla.org/en-US/docs/Web/API/Blob#Blob_constructor_example_usage 
            var aDataParts = [syncSpecAsStr];
            var blob = new Blob(aDataParts, { type: 'text/json' });
            fileWriter.write(blob);

        }, errorHandler);

    }, errorHandler);

}

function parseSyncSpecAsJSON(syncSpec) {

    var filesInSyncSpec = [];

    $.each(syncSpec.sync.files.download, function (index, downloadItem) {

        var fileInSyncSpec = {};
        fileInSyncSpec.name = downloadItem.name;
        fileInSyncSpec.link = downloadItem.link;
        fileInSyncSpec.size = downloadItem.size;
        fileInSyncSpec.sha1 = downloadItem.hash.__text;

        filesInSyncSpec.push(fileInSyncSpec);
    });

    return filesInSyncSpec;
}


function displayItem(index) {

    debugger;

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

    debugger;

    var index = 0;

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


function getFiles(filesToRetrieve, nextFunction, syncSpecAsJson) {
    if (filesToRetrieve.length > 0) {
        var fileToRetrieve = filesToRetrieve.shift();
        readFile(fileToRetrieve, filesToRetrieve, nextFunction, syncSpecAsJson);
    }
    else {
        if (nextFunction != null) {
            nextFunction();
        }
    }
}

function readFile(fileToRetrieve, filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson) {

    if (fileToRetrieve.name == "autoschedule.xml") {
        downloadFile(fileToRetrieve, filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson);
        return;
    }

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

                console.log("file " + fileToRetrieve.name + " successfully read.");

                filesToDisplay.push(fileToRetrieve);
                saveBlobInfo(syncSpecAsJson, fileToRetrieve);
                getFiles(filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson);
            };

            reader.readAsArrayBuffer(file);

        }, function (e) {
            fileSystemErrorHandler(e);
            downloadFile(fileToRetrieve, filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson);
        });

    }, function (e) {
        fileSystemErrorHandler(e);
        downloadFile(fileToRetrieve, filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson);
    });
}


// TODO HACK
function saveBlobInfo(syncSpecAsJson, file) {

    $.each(syncSpecAsJson.sync.files.download, function (index, downloadItem) {
        if (downloadItem.name == file.name) {
            downloadItem.blob = file.blob;
            downloadItem.blobURL = file.blobURL;
        }
    });
}


function downloadFile(fileToDownload, filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson) {

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
                        saveBlobInfo(syncSpecAsJson, fileToDownload);
                        getFiles(filesToRetrieve, functionToCallAfterAllFilesGot, syncSpecAsJson);
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


function getFilesToDownload(downloadItems) {

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

    return filesToDownload;
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

    // kick off playback
    var numZones = sign.zones.length;
    if (numZones > 0) {

        // construct the zones
        $.each(sign.zones, function (index, zone) {
            if (zone.playlist != null) {
                console.log("### Constructor zone");
                zone.Constructor();
            }
        });

        // launch the zones
        $.each(sign.zones, function (index, zone) {
            if (zone.playlist != null) {
                console.log("### Launch playback");
                zone.Initialize();
            }
        });
    }
}


$(document).ready(function () {

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
            launchRuntime0();
        }
    }

    function launchRuntime0() {

        // get current sync (only support networking currently)
        readCurrentSync(launchRuntime1);
    }

    function launchRuntime1(xmlDoc) {

        currentSync = xmlDoc;
        currentSyncSpecAsJson = XML2JSON(currentSync);

        var filesInSyncSpec = parseSyncSpecAsJSON(currentSyncSpecAsJson);
        var filesToDownload = getFilesToDownload(filesInSyncSpec);
        getFiles(filesToDownload, launchRuntime2, currentSyncSpecAsJson);
    }

    function launchRuntime2() {

        debugger;

        //  create networking state machine and initialize it
        var networkingHSM = new networkingStateMachine();
        registerStateMachine(networkingHSM);
        networkingHSM.Initialize();

        // Create player state machine
        bsp_playerHSM = new playerStateMachine();
        registerStateMachine(bsp_playerHSM);
        bsp_playerHSM.Initialize();
    }

});
