function sign(signAsJSON) {
    debugger;

    var BrightAuthor = signAsJSON.BrightAuthor;

    // capture and check attributes

    this.zones = [];
    var signZones = this.zones;

    $.each(BrightAuthor.zones, function (index, zoneAsJSON) {
        signZones.push(new zone(zoneAsJSON));
    });

    debugger;
}

function zone(zoneAsJSON) {

    this.name = zoneAsJSON.name;
    this.x = zoneAsJSON.x;
    this.y = zoneAsJSON.y;
    this.width = zoneAsJSON.width;
    this.height = zoneAsJSON.height;
    this.type = zoneAsJSON.type;
    this.id = zoneAsJSON.id;
    this.playlist = new playlist(zoneAsJSON.playlist);
}

function playlist(playlistAsJSON) {

    this.name = playlistAsJSON.name;
    this.type = playlistAsJSON.type;

    this.initialState = playlistAsJSON.states.initialState;

    this.states = [];

    var playlistStates = this.states;
    $.each(playlistAsJSON.states.state, function (index, stateAsJSON) {
        playlistStates.push(new state(stateAsJSON));
    });

    this.transitions = [];

    transitions = this.transitions;
    $.each(playlistAsJSON.states.transition, function (index, transitionAsJSON) {
        transitions.push(new transition(transitionAsJSON));
    });
}

function state(stateAsJSON) {

    this.name = stateAsJSON.name;

    if (typeof stateAsJSON.imageItem == "object") {
        this.imageItem = new imageItem(stateAsJSON.imageItem);
    }
}

function imageItem(imageItemAsJSON) {

    this.fileName = imageItemAsJSON.file._name;
    this.slideDelayInterval = imageItemAsJSON.slideDelayInterval;
    this.slideTransition = imageItemAsJSON.slideTransition;
    this.transitionDuration = imageItemAsJSON.transitionDuration;
}

function transition(transitionAsJSON) {

    this.sourceMediaState = transitionAsJSON.sourceMediaState;
    this.targetMediaState = transitionAsJSON.targetMediaState;
    this.assignInputToUserVariable = transitionAsJSON.assignInputToUserVariable;
    this.assignWildcardToUserVariable = transitionAsJSON.assignWildcardToUserVariable;
}
