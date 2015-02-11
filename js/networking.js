function networkingStateMachine() {

    HSM.call(this); //call super constructor.

    this.InitialPseudoStateHandler = this.InitializeNetworkingHSM;

    this.stTop = new HState(this, "Top");
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.stNetworkScheduler = new HState(this, "NetworkScheduler");
    this.stNetworkScheduler.HStateEventHandler = this.STNetworkSchedulerEventHandler;
    this.stNetworkScheduler.superState = this.stTop;

    this.stWaitForTimeout = new HState(this, "WaitForTimeout");
    this.stWaitForTimeout.HStateEventHandler = this.STWaitForTimeoutEventHandler;
    this.stWaitForTimeout.superState = this.stNetworkScheduler;

    this.stRetrievingSyncList = new HState(this, "RetrievingSyncList");
    this.stRetrievingSyncList.StartSync = this.StartSync;
    this.stRetrievingSyncList.SyncSpecXferEvent = this.SyncSpecXferEvent;
    this.stRetrievingSyncList.HStateEventHandler = this.STRetrievingSyncListEventHandler;
    this.stRetrievingSyncList.superState = this.stNetworkScheduler;

    this.stDownloadingSyncFiles = new HState(this, "DownloadingSyncFiles");
    this.stDownloadingSyncFiles.StartSyncListDownload = this.StartSyncListDownload;
    this.stDownloadingSyncFiles.HStateEventHandler = this.STDownloadingSyncFilesEventHandler;
    this.stDownloadingSyncFiles.superState = this.stNetworkScheduler;

    this.topState = this.stTop;
}

//subclass extends superclass
networkingStateMachine.prototype = Object.create(HSM.prototype);
networkingStateMachine.prototype.constructor = networkingStateMachine;


networkingStateMachine.prototype.STNetworkSchedulerEventHandler = function(event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else {
        console.log(this.id + ": signal type = " + event["EventType"]);
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


networkingStateMachine.prototype.STWaitForTimeoutEventHandler = function(event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else {
        console.log(this.id + ": signal type = " + event["EventType"]);
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


networkingStateMachine.prototype.STRetrievingSyncListEventHandler = function(event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        this.StartSync();
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else {
        console.log(this.id + ": signal type = " + event["EventType"]);
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


networkingStateMachine.prototype.StartSync = function () {

    console.log("### start_sync")

    // TODO - need a way to determine whether or not a sync spec download is in progress or not

    // We've read in our current sync. Talk to the server to get
    // the next sync. Note that we use the current-sync.xml because
    // we need to tell the server what we are _currently_ running not
    // what we might be running at some point in the future.

    var base = this.stateMachine.LookupMetadata(currentSyncSpecAsJson, "client", "base");
    var nextURL = GetURL(base, this.stateMachine.LookupMetadata(currentSyncSpecAsJson, "client", "next"));
    console.log("### Looking for new sync list from " + nextURL);

    // TODO - temporary
    var presentationName = "none";

    var thisStateMachine = this.stateMachine;
    debugger;
    $.ajax({
        url: nextURL,
        type: 'GET',
        dataType: 'xml',
        headers: {
            "account": this.stateMachine.accountName,
            "password": this.stateMachine.password,
            "group": this.stateMachine.group,
            "user": this.stateMachine.user,
            "presentationName": presentationName,
            "DeviceID": "L4C49T000025",
            "DeviceModel": "XD1132",
            "DeviceFamily": "lynx",
            "DeviceFWVersion": "5.1.16",
            "DeviceSWVersion": "7.1.6",
            "CustomAutorunVersion": "7.1.0",
            "timezone": this.stateMachine.timezone,
            // TODO - retrieve this and format it properly
            "localTime": "2014/12/09 15:35:37.936",
            "storage-size": "7631",
            "storage-fs": "fat32",
            "storage-current-used": "5"
        },
        error: function () { debugger; },
    })
    .success(function (data, textStatus, jqXHR) {
        console.log("status in retrieveSyncSpec: textStatus");
        // writeNewSync($(data)[0]);
        debugger;
        newSync = $(data)[0];
        var syncsEqual = thisStateMachine.syncSpecsEqual(currentSync, newSync);
        if (!syncsEqual) {
            // TODO - transition to a different state to download the files?
            newSyncSpecAsJson = XML2JSON(newSync);

            var filesInSyncSpec = parseSyncSpecAsJSON(newSyncSpecAsJson);
            var filesToDownload = getFilesToDownload(filesInSyncSpec);
            getFiles(filesToDownload, thisStateMachine.newContentDownloaded, newSyncSpecAsJson);
        }
    });
}

networkingStateMachine.prototype.syncSpecsEqual = function (currentSync, newSync) {
    return false;
}


networkingStateMachine.prototype.newContentDownloaded = function () {

    currentSync = newSync;
    currentSyncSpecAsJson = newSyncSpecAsJson;
    writeCurrentSync(currentSync);

    // send internal message to prepare for restart
    // send internal message indicating that new content is available
    var event = {};
    event["EventType"] = "CONTENT_UPDATED";
    postMessage(event);
}


networkingStateMachine.prototype.SyncSpecXferEvent = function () {
}


networkingStateMachine.prototype.STDownloadingSyncFilesEventHandler = function (event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else {
        console.log(this.id + ": signal type = " + event["EventType"]);
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


networkingStateMachine.prototype.StartSyncListDownload = function () {
}


networkingStateMachine.prototype.InitializeNetworkingHSM = function () {

    console.log("InitializeNetworkingHSM invoked");

    // currentSync represents current-sync.xml 
    this.accountName = this.LookupMetadata(currentSyncSpecAsJson, "server", "account");
    var base = this.LookupMetadata(currentSyncSpecAsJson, "client", "base");
    var nextURL = GetURL(base, this.LookupMetadata(currentSyncSpecAsJson, "client", "next"));
    this.user = this.LookupMetadata(currentSyncSpecAsJson, "server", "user");
    this.password = this.LookupMetadata(currentSyncSpecAsJson, "server", "password");
    this.group = this.LookupMetadata(currentSyncSpecAsJson, "server", "group")

    //if (user != "" || password != "") {
    //    this.setUserAndPassword = true;
    //}
    //else {
    //    this.setUserAndPassword = false;
    //}

    this.timezone = this.LookupMetadata(currentSyncSpecAsJson, "client", "timezone");

    var timeBetweenNetConnects = this.LookupMetadata(currentSyncSpecAsJson, "client", "timeBetweenNetConnects");
    this.timeBetweenNetConnects = parseInt(timeBetweenNetConnects);
    this.currentTimeBetweenNetConnects = this.timeBetweenNetConnects;

    // need to create networkTimerDownload periodic timer

    return this.stRetrievingSyncList;

}

networkingStateMachine.prototype.LookupMetadata = function(syncSpec, section, field) {

    return syncSpec.sync.meta[section][field];
}


function GetURL(base, urlFromSyncSpec) {

    var url = "";

    var index = urlFromSyncSpec.lastIndexOf(":");
    if (index >= 0) {
        url = urlFromSyncSpec;
    }
    else if (urlFromSyncSpec == "") {
        url = "";
    }
    else {
        url = base + urlFromSyncSpec;
    }

    return url;
}


