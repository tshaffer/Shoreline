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


networkingStateMachine.prototype.InitializeNetworkingHSM = function () {

    console.log("InitializeNetworkingHSM invoked");

    // currentSync represents current-sync.xml 
    this.accountName = this.LookupMetadata(currentSyncSpecAsJson, "server", "account");
    var base = this.LookupMetadata(currentSyncSpecAsJson, "client", "base");
    var nextURL = GetURL(base, this.LookupMetadata(currentSyncSpecAsJson, "client", "next"));
    this.user = this.LookupMetadata(currentSyncSpecAsJson, "server", "user");
    this.password = this.LookupMetadata(currentSyncSpecAsJson, "server", "password");
    this.group = this.LookupMetadata(currentSyncSpecAsJson, "server", "group")
    this.timezone = this.LookupMetadata(currentSyncSpecAsJson, "client", "timezone");

    var timeBetweenNetConnects = this.LookupMetadata(currentSyncSpecAsJson, "client", "timeBetweenNetConnects");
    this.timeBetweenNetConnects = parseInt(timeBetweenNetConnects);
    this.currentTimeBetweenNetConnects = this.timeBetweenNetConnects;

    return this.stRetrievingSyncList;

}


networkingStateMachine.prototype.STNetworkSchedulerEventHandler = function (event, stateData) {

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

        var thisState = this;

        setTimeout(
            function () {
                var event = {};
                event["EventType"] = "WAIT_FOR_TIMEOUT_TIMER_EXPIRED";
                postMessage(event);
            },
            30000);

        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else if (event["EventType"] == "WAIT_FOR_TIMEOUT_TIMER_EXPIRED") {
        console.log(this.id + ": signal type = " + event["EventType"]);
        stateData.nextState = this.stateMachine.stRetrievingSyncList;
        return "TRANSITION";
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
    else if (event["EventType"] == "SYNCSPEC_PROCESSING_COMPLETE") {
        stateData.nextState = this.stateMachine.stWaitForTimeout;
        return "TRANSITION";
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
        console.log("### Received new sync list, textStatus = " + textStatus);
        // writeNewSync($(data)[0]);
        newSync = $(data)[0];
        newSyncSpecAsJson = XML2JSON(newSync);
        var syncsEqual = thisStateMachine.syncSpecsEqual(currentSyncSpecAsJson, newSyncSpecAsJson);
        if (!syncsEqual) {
            // TODO - transition to a different state to download the files?

            var filesInSyncSpec = parseSyncSpecAsJSON(newSyncSpecAsJson);
            var filesToDownload = getFilesToDownload(filesInSyncSpec);
            getFiles(filesToDownload, thisStateMachine.newContentDownloaded, newSyncSpecAsJson);
        }
        else {
            // indicate that the sync spec processing is complete
            var event = {};
            event["EventType"] = "SYNCSPEC_PROCESSING_COMPLETE";
            postMessage(event);
        }
    });
}


networkingStateMachine.prototype.syncSpecsEqual = function (currentSyncAsJson, newSyncAsJson) {

    // check files in sync specs
    if (currentSyncAsJson.sync.files.download.length != newSyncAsJson.sync.files.download.length) return false;

    // assume that if the sync specs are the same, the order of the files is the same
    var thisStateMachine = this;
    $.each(currentSyncAsJson.sync.files.download, function (index, currentDownloadItem) {
        var newDownloadItem = newSyncAsJson.sync.files.download[index];
        if (!thisStateMachine.downloadItemsEqual(currentDownloadItem, newDownloadItem)) return false;
    });

    // check meta sections (server, client)
    if (!this.metaSectionsEqual(currentSyncAsJson.sync.meta.server, newSyncAsJson.sync.meta.server)) return false;
    if (!this.metaSectionsEqual(currentSyncAsJson.sync.meta.client, newSyncAsJson.sync.meta.client)) return false;

    return true;
}


// TODO - do I need to check any additional fields?
networkingStateMachine.prototype.downloadItemsEqual = function (currentDownloadItem, newDownloadItem) {
    if ( (currentDownloadItem.hash.__text != newDownloadItem.hash.__text) ||
         (currentDownloadItem.link != newDownloadItem.link) ||
         (currentDownloadItem.name != newDownloadItem.name) ||
         (currentDownloadItem.size != newDownloadItem.size) ) return false;
    
         return true;
}


networkingStateMachine.prototype.metaSectionsEqual = function (currentMeta, newMeta) {

    if (this.metaSectionSize(currentMeta) != this.metaSectionSize(newMeta)) return false;

    var keys = [];
    for (var key in currentMeta) {
        if (currentMeta.hasOwnProperty(key)) {
            if (!(key in newMeta)) return false;
        }
    }

    return true;
}


networkingStateMachine.prototype.metaSectionSize = function (meta) {

    var size = 0, key;
    for (key in meta) {
        if (meta.hasOwnProperty(key)) size++;
    }
    return size;
};


networkingStateMachine.prototype.newContentDownloaded = function () {

    currentSync = newSync;
    writeCurrentSync(currentSync);

    currentSyncSpecAsJson = newSyncSpecAsJson;
    writeCurrentSyncAsJson(currentSyncSpecAsJson);

    // send internal message to prepare for restart - needed?

    // send internal message indicating that new content is available
    var event = {};
    event["EventType"] = "CONTENT_UPDATED";
    postMessage(event);

    // indicate that the sync spec processing is complete
    event["EventType"] = "SYNCSPEC_PROCESSING_COMPLETE";
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


