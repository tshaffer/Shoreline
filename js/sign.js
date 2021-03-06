﻿function sign(signAsJSON) {

    var BrightAuthor = signAsJSON.BrightAuthor;
    var meta = BrightAuthor.meta;

    // get html sites
    bsp_htmlSites = {};

    if (typeof meta.htmlSites == "object") {

        if (typeof meta.htmlSites.localHTMLSite == "object") {
            $.each(meta.htmlSites.localHTMLSite, function (index, localHTMLSite) {

                var htmlSite = {};

                htmlSite.name = localHTMLSite.name;
                htmlSite.prefix = localHTMLSite.prefix;
                htmlSite.filePath = localHTMLSite.filePath;
                htmlSite.contentIsLocal = true;

                bsp_htmlSites[htmlSite.name] = htmlSite;
            });
        }

        if (typeof meta.htmlSites.remoteHTMLSite == "object") {
            $.each(meta.htmlSites.remoteHTMLSite, function (index, remoteHTMLSite) {

                var htmlSite = {};

                htmlSite.name = remoteHTMLSite.name;
                htmlSite.url = remoteHTMLSite.url.parameterValue.parameterValueItemText.value;
                htmlSite.contentIsLocal = false;

                bsp_htmlSites[htmlSite.name] = htmlSite;
            });
        }
    }

    // capture and check attributes

    this.zones = [];
    var signZones = this.zones;

    $.each(BrightAuthor.zones, function (index, zoneAsJSON) {
        var hsm = new zoneStateMachine(zoneAsJSON);
        registerStateMachine(hsm);
        signZones.push(hsm);
    });

}

function zoneStateMachine(zoneAsJSON) {

    HSM.call(this); //call super constructor.

    this.stTop = new HState(this, "Top");
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.topState = this.stTop;

    //zoneHSM.InitializeVideoZoneObjects = InitializeVideoZoneObjects
    //zoneHSM.ConstructorHandler = VideoZoneConstructor
    //zoneHSM.InitialPseudostateHandler = VideoZoneGetInitialState

    this.ConstructorHandler = VideoOrImagesZoneConstructor
    this.InitialPseudoStateHandler = VideoOrImagesZoneGetInitialState

    this.name = zoneAsJSON.name;
    this.x = zoneAsJSON.x;
    this.y = zoneAsJSON.y;
    this.width = zoneAsJSON.width;
    this.height = zoneAsJSON.height;
    this.type = zoneAsJSON.type;
    this.id = zoneAsJSON.id;
    this.playlist = new playlist(this, zoneAsJSON.playlist);
}

//subclass extends superclass
zoneStateMachine.prototype = Object.create(HSM.prototype);
zoneStateMachine.prototype.constructor = zoneStateMachine;

function playlist(zone, playlistAsJSON) {

    this.name = playlistAsJSON.name;
    this.type = playlistAsJSON.type;

// get the states for the playlist

    this.initialState = playlistAsJSON.states.initialState;
    zone.stateTable = {};
    var zoneStateTable = zone.stateTable;

    $.each(playlistAsJSON.states.state, function (index, stateAsJSON) {
        var newState = new state(zone, stateAsJSON);
        zoneStateTable[newState.id] = newState;
    });

    // find the initial state for the playlist
    for (var stateName in zone.stateTable) {
        if (zone.stateTable.hasOwnProperty(stateName)) {
            console.log("stateName is " + stateName);
            var bsState = zone.stateTable[stateName];
            if (bsState.id == this.initialState) {
                this.firstState = bsState;
            }
        }
    }

// get the transitions for the playlist
    this.transitions = [];

    if (playlistAsJSON.states.transition != undefined) {
        transitions = this.transitions;
        $.each(playlistAsJSON.states.transition, function (index, transitionAsJSON) {
            transitions.push(new transition(transitionAsJSON, zone.stateTable));
        });
    }
}

function state(zone, stateAsJSON) {

    HState.call(this); //call super constructor. TODO - calls no parameter constructor - is there any way to get it to call the one with parameters?
    this.stateMachine = zone;
    this.obj = zone;
    this.id = stateAsJSON.name;
    this.name = stateAsJSON.name;

    if (typeof stateAsJSON.imageItem == "object") {
        this.imageItem = new imageItem(stateAsJSON.imageItem);
        this.HStateEventHandler = STDisplayingImageEventHandler;
    }
    else if (typeof stateAsJSON.videoItem == "object") {
        this.videoItem = new videoItem(stateAsJSON.videoItem);
        this.HStateEventHandler = STVideoPlayingEventHandler;
    }
    else if (typeof stateAsJSON.html5Item == "object") {
        this.html5Item = new html5Item(stateAsJSON.html5Item);
        this.HStateEventHandler = STHTML5PlayingEventHandler;
    }

    this.superState = this.stateMachine.stTop;
}

//subclass extends superclass
state.prototype = Object.create(HState.prototype);
state.prototype.constructor = state;


state.prototype.launchTimer = function () {

    var dt = (new Date).toLocaleString();
    console.log("********** launchTimer at " + dt + " for state " + this.id);

    var thisState = this;
    this.timeout = setTimeout(
        function () {
            var dt = (new Date).toLocaleString();
            console.log("********** received timer event at " + dt + " for state " + thisState.id);
            var event = {};
            event["EventType"] = "timeoutEvent";
            postMessage(event);
        },
        parseInt(this.timeoutValue) * 1000);
}


state.prototype.mediaItemEventHandler = function (event, stateData) {

    var eventType = event["EventType"];

    switch (eventType) {
        case 'timeoutEvent':
            if (typeof this.timeoutEvent == "object") {
                // TODO - how do I know that it's the right timeout event? shouldn't be that hard.
                return this.executeTransition(this.timeoutEvent, stateData, "");
            }
            break;
    }

    stateData.nextState = this.superState;
    return "SUPER";
}


state.prototype.executeTransition = function (transition, stateData, payload) {

    var nextStateName = "init";

    while (nextStateName != "") {
        
        // before transitioning to next state, ensure that the transition is allowed
        var nextState = this.getNextStateName(transition);
        nextStateName = nextState.nextStateName;
        var actualTarget = nextState.actualTarget;

        if (nextStateName != "") {
            nextState = this.stateMachine.stateTable[nextStateName];
            break;
        }
    }

    stateData.nextState = this.stateMachine.stateTable[nextStateName];
    stateData.nextState.payload = "";

    return "TRANSITION";
}


state.prototype.getNextStateName = function (transition) {

    var nextState = {};

    nextStateName = transition.targetMediaStateName;

    nextState.nextStateName = nextStateName;
    nextState.actualTarget = transition;
    return nextState
}


function imageItem(imageItemAsJSON) {

    this.fileName = imageItemAsJSON.file._name;
    this.slideDelayInterval = imageItemAsJSON.slideDelayInterval;
    this.slideTransition = imageItemAsJSON.slideTransition;
    this.transitionDuration = imageItemAsJSON.transitionDuration;

    var thisImageItem = this;

    // HACK find the blob data in the sync spec
    $.each(currentSyncSpecAsJson.sync.files.download, function (index, downloadItem) {
        if (downloadItem.name == thisImageItem.fileName) {
            thisImageItem.blob = downloadItem.blob;
            thisImageItem.blobURL = downloadItem.blobURL;
        }
    });
}


function videoItem(videoItemAsJSON) {

    this.fileName = videoItemAsJSON.file._name;
    this.automaticallyLoop = videoItemAsJSON.automaticallyLoop;

    var thisVideoItem = this;

    // HACK find the blob data in the sync spec
    $.each(currentSyncSpecAsJson.sync.files.download, function (index, downloadItem) {
        if (downloadItem.name == thisVideoItem.fileName) {
            thisVideoItem.blob = downloadItem.blob;
            thisVideoItem.blobURL = downloadItem.blobURL;
        }
    });
}


function html5Item(html5ItemAsJSON) {

    this.htmlSiteName = html5ItemAsJSON.htmlSiteName;

    // get the associated html site
    var htmlSite = bsp_htmlSites[this.htmlSiteName];

    this.name = htmlSite.name;
    this.contentIsLocal = htmlSite.contentIsLocal;

    if (this.contentIsLocal) {
        this.prefix = htmlSite.prefix;
        this.filePath = htmlSite.filePath;

        var thisHTML5Item = this;

        var fullHtml5FilePath = thisHTML5Item.prefix + thisHTML5Item.filePath;

        // HACK find the blob data in the sync spec
        $.each(currentSyncSpecAsJson.sync.files.download, function (index, downloadItem) {
            if (downloadItem.name == fullHtml5FilePath) {
                thisHTML5Item.blob = downloadItem.blob;
                thisHTML5Item.blobURL = downloadItem.blobURL;
            }
        });
    }
    else {
        this.url = htmlSite.url;
    }


}

function transition(transitionAsJSON, stateTable) {

    this.sourceMediaStateName = transitionAsJSON.sourceMediaState;

    // get source state for this transition
    var bsState = stateTable[this.sourceMediaStateName]

    this.targetMediaStateName = transitionAsJSON.targetMediaState;
    this.userEventName = transitionAsJSON.userEvent.name;
    this.assignInputToUserVariable = transitionAsJSON.assignInputToUserVariable;
    this.assignWildcardToUserVariable = transitionAsJSON.assignWildcardToUserVariable;

    if (this.userEventName == "timeout") {
        bsState.timeoutValue = transitionAsJSON.userEvent.parameters.parameter;
        bsState.timeoutEvent = this;
    }
    else if (this.userEventName == "mediaEnd") {
        bsState.mediaEndEvent = this;
    }
}

function VideoOrImagesZoneConstructor() {
    console.log("VideoOrImagesZoneConstructor invoked");

    // 'this' is the zone (HSM)
    this.activeState = this.playlist.firstState;
    //InitializeVideoOrImagesZoneObjects();
}

function VideoOrImagesZoneGetInitialState() {
    console.log("VideoOrImagesZoneGetInitialState invoked");
    return this.activeState;
}

//function InitializeVideoOrImagesZoneObjects() {
// 'this' is not valid the way this is currently setup
//}

STDisplayingImageEventHandler = function (event, stateData) {

    stateData.nextState = null;

    var eventType = event["EventType"];

    if (eventType == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        this.active = true;
        this.displayImage();
        this.launchTimer();
        return "HANDLED";
    }
    else if (eventType == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else if (event["EventType"] == "CONTENT_UPDATED") {
        deregisterStateMachine(this.stateMachine);
        console.log(this.id + ": CONTENT_UPDATED received - mark state invalid");
        this.active = false;
        console.log(this.id + ": clearTimeout");
        clearTimeout(this.timeout);
    }
    else if (eventType != "EMPTY_SIGNAL" && eventType != "INIT_SIGNAL") {
        console.log(this.id + ": received event " + event["EventType"]);
        if (this.active) {
            console.log(this.id + ": state is active - invoke mediaItemEventHandler");
            return this.mediaItemEventHandler(event, stateData);
        }
        else {
            console.log(this.id + ": state is inactive - don't invoke mediaItemEventHandler");
            return "HANDLED";
        }
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


STVideoPlayingEventHandler = function (event, stateData) {

    stateData.nextState = null;

    var eventType = event["EventType"];

    if (eventType == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        this.active = true;
        this.launchVideo();
        return "HANDLED";
    }
    else if (eventType == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else if (event["EventType"] == "CONTENT_UPDATED") {
        deregisterStateMachine(this.stateMachine);
        console.log(this.id + ": CONTENT_UPDATED received - mark state invalid");
        this.active = false;
        console.log(this.id + ": pause video");
        $('#videoZone')[0].pause();
    }
    else if (eventType == "mediaEndEvent") {
        console.log(this.id + ": mediaEndEvent signal");
        if (this.active) {
            console.log(this.id + ": state is active - invoke executeTransition");
            return this.executeTransition(this.mediaEndEvent, stateData, "");
        }
        else {
            console.log(this.id + ": state is inactive - don't invoke executeTransition");
            return "HANDLED";
        }
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


STHTML5PlayingEventHandler = function (event, stateData) {

    stateData.nextState = null;

    var eventType = event["EventType"];

    if (eventType == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        //this.showIFrame();
        this.showWebView();
        return "HANDLED";
    }
    else if (eventType == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else if (event["EventType"] == "CONTENT_UPDATED") {
        deregisterStateMachine(this.stateMachine);
        console.log(this.id + ": CONTENT_UPDATED received - mark state invalid");
        this.active = false;
        console.log(this.id + ": pause video");
    }

    stateData.nextState = this.superState;
    return "SUPER";
}


state.prototype.displayImage = function () {
    $('#videoZone').hide();
    $('#webViewZone').hide();
    $('#imageZone').show();
    $("#imageZone").attr('src', this.imageItem.blobURL);
}


state.prototype.launchVideo = function () {

    $('#imageZone').hide();
    $('#webViewZone').hide();
    $('#videoZone').show();
    // the URL below (this.videoItem.fileToDisplay.blobURL) works in browser
    // blob:chrome-extension%3A//flolljmnbhomhldolemkccahigofcfoo/362d0026-2df3-49cb-907e-5453760925ed
    $("#videoZone").attr('src', this.videoItem.blobURL);
    $('#videoZone')[0].load();
    $('#videoZone')[0].play();

    var thisState = this;

    $("#videoZone").on("ended", function (e) {
        console.log("--------------------------------------------------------------------- video ended");
        var event = {};
        event["EventType"] = "mediaEndEvent";
        postMessage(event);
    });
}


state.prototype.showWebView = function () {
    $('#imageZone').hide();
    $('#videoZone').hide();
    if (this.html5Item.contentIsLocal) {
        $("#webViewZone").attr('src', this.html5Item.blobURL);
    }
    else {
        $("#webViewZone").attr('src', this.html5Item.url);
    }
    $('#webViewZone').show();
}


state.prototype.showIFrame = function () {
    $('#imageZone').hide();
    $('#videoZone').hide();
    $("#iframeZone").attr('src', this.html5Item.blobURL);
    $('#iframeZone').show();
}





