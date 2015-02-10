function playerStateMachine() {

    HSM.call(this); //call super constructor.

    this.InitialPseudoStateHandler = InitializePlayerHSM;
    
    this.stTop = new HState(this, "Top");
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.stPlayer = new HState(this, "Player");
    this.stPlayer.HStateEventHandler = this.STPlayerEventHandler;
    this.stPlayer.superState = this.stTop

    this.stPlaying = new HState(this, "Playing")
    this.stPlaying.HStateEventHandler = this.STPlayingEventHandler;
    this.stPlaying.superState = this.stPlayer
    //this.stPlaying.RetrieveLiveDataFeed = RetrieveLiveDataFeed
    //this.stPlaying.UpdateTimeClockEvents = UpdateTimeClockEvents

    this.stWaiting = new HState(this, "Waiting")
    this.stWaiting.HStateEventHandler = this.STWaitingEventHandler
    this.stWaiting.superState = this.stPlayer

    this.stWaitingForSign = new HState(this, "WaitingForSign")
    this.stWaitingForSign.HStateEventHandler = this.STWaitingForSignEventHandler;
    this.stWaitingForSign.superState = this.stPlayer

    this.topState = this.stTop
}

//subclass extends superclass
playerStateMachine.prototype = Object.create(HSM.prototype);
playerStateMachine.prototype.constructor = playerStateMachine;

playerStateMachine.prototype.STPlayerEventHandler = function (event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }

    stateData.nextState = this.superState
    return "SUPER"
}


playerStateMachine.prototype.STPlayingEventHandler = function (event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {

        console.log(this.id + ": entry signal");

        bsp_StartPlayback();

        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }

    stateData.nextState = this.superState
    return "SUPER"
}

playerStateMachine.prototype.STWaitingEventHandler = function (event, stateData) {

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

    stateData.nextState = this.superState
    return "SUPER"
}


playerStateMachine.prototype.STWaitingForSignEventHandler = function (event, stateData) {

    stateData.nextState = null;

    if (event["EventType"] == "ENTRY_SIGNAL") {
        console.log(this.id + ": entry signal");
        return "HANDLED";
    }
    else if (event["EventType"] == "EXIT_SIGNAL") {
        console.log(this.id + ": exit signal");
    }
    else if (event["EventType"] == "signReadCompleted") {
        stateData.nextState = this.stateMachine.stPlaying;
        return "TRANSITION";
    }
    else {
        console.log(this.id + ": signal type = " + event["EventType"]);
    }

    stateData.nextState = this.superState;
    return "SUPER"
}


function InitializePlayerHSM() {

    console.log("InitializePlayerHSM invoked");

    Restart("");

    //activeScheduledPresentation = m.bsp.schedule.activeScheduledEvent
    //if type(activeScheduledPresentation) = "roAssociativeArray" then
    //    return m.stPlaying
    //else
    //    return m.stWaiting
    //endif

    //return this.stWaiting;
    //return this.stPlaying;
    return this.stWaitingForSign;
}



