chrome.app.runtime.onLaunched.addListener(function () {
    console.log("about to create chrome window");
    chrome.app.window.create('index.html', {
        'bounds': {
            'left': 0,
            'top': 0,
            'width': 1920,
            'height': 1080
        }
    });
    console.log("window successfully created");
});
