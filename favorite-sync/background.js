chrome.action.onClicked.addListener(async (tab) => {
    chrome.tabs.query({ }, function(tabs) {
        console.log(tabs)
    })
})

