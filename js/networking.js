function networkingStateMachine() {

    HSM.call(this); //call super constructor.

    this.InitialPseudoStateHandler = InitializeNetworkingHSM;

    this.stTop = new HState(this, "Top");
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.stNetworkScheduler = new HState(this, "NetworkScheduler");
    this.stNetworkScheduler.HStateEventHandler = STNetworkSchedulerEventHandler;
    this.stNetworkScheduler.superState = this.stTop;

    this.stWaitForTimeout = new HState(this, "WaitForTimeout");
    this.stWaitForTimeout.HStateEventHandler = STWaitForTimeoutEventHandler;
    this.stWaitForTimeout.superState = this.stNetworkScheduler;

    this.stRetrievingSyncList = new HState(this, "RetrievingSyncList");
    this.stRetrievingSyncList.StartSync = StartSync;
    this.stRetrievingSyncList.SyncSpecXferEvent = SyncSpecXferEvent;
    this.stRetrievingSyncList.HStateEventHandler = STRetrievingSyncListEventHandler;
    this.stRetrievingSyncList.superState = this.stNetworkScheduler;

    this.stDownloadingSyncFiles = new HState(this, "DownloadingSyncFiles");
    this.stDownloadingSyncFiles.StartSyncListDownload = StartSyncListDownload;
    this.stDownloadingSyncFiles.HStateEventHandler = STDownloadingSyncFilesEventHandler;
    this.stDownloadingSyncFiles.superState = this.stNetworkScheduler;

    this.topState = this.stTop;
}

//subclass extends superclass
networkingStateMachine.prototype = Object.create(HSM.prototype);
networkingStateMachine.prototype.constructor = networkingStateMachine;

function STNetworkSchedulerEventHandler(event, stateData) {
    stateData.nextState = this.superState
    return "SUPER"
}

function STWaitForTimeoutEventHandler(event, stateData) {
    stateData.nextState = this.superState
    return "SUPER"
}

function STRetrievingSyncListEventHandler(event, stateData) {
    stateData.nextState = this.superState
    return "SUPER"
}

function StartSync() {
}

function SyncSpecXferEvent() {
}

function STDownloadingSyncFilesEventHandler(event, stateData) {
    stateData.nextState = this.superState
    return "SUPER"
}

function StartSyncListDownload() {
}

function InitializeNetworkingHSM() {
    console.log("InitializeNetworkingHSM invoked");
}
