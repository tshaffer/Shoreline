function sign(signAsJSON) {

    var BrightAuthor = signAsJSON.BrightAuthor;

    // capture and check attributes

    this.zones = [];
    var signZones = this.zones;

    $.each(BrightAuthor.zones, function (index, zoneAsJSON) {
        signZones.push(new zoneStateMachine(zoneAsJSON));
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

    transitions = this.transitions;
    $.each(playlistAsJSON.states.transition, function (index, transitionAsJSON) {
        transitions.push(new transition(transitionAsJSON, zone.stateTable));
    });
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

    this.superState = this.stateMachine.stTop;
}

//subclass extends superclass
state.prototype = Object.create(HState.prototype);
state.prototype.constructor = state;


function imageItem(imageItemAsJSON) {

    this.fileName = imageItemAsJSON.file._name;
    this.slideDelayInterval = imageItemAsJSON.slideDelayInterval;
    this.slideTransition = imageItemAsJSON.slideTransition;
    this.transitionDuration = imageItemAsJSON.transitionDuration;

    var thisImageItem = this;

    // find the display item in memory
    $.each(filesToDisplay, function (index, fileToDisplay) {
        if (thisImageItem.fileName == fileToDisplay.name) {
            thisImageItem.fileToDisplay = fileToDisplay;
        }
    });
    //this.HStateEventHandler = STDisplayingImageEventHandler
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

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        displayImage(this);
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


