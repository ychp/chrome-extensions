chrome.action.onClicked.addListener(async (tab) => {
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
        sortAndMoveTabs(tabs).then(sortedTabs => {
            console.log(sortedTabs);
        });
    });
});


const sortAndMoveTabs = function(tabs) {
    const sortedTabs = tabs.slice().sort((a, b) => {
        if (a.title < b.title) {
            return -1;
        }
        if (a.title > b.title) {
            return 1;
        }
        return 0;
    });

    const tabPromises = [];

    for (let i = 0; i < sortedTabs.length; i++) {
        tabPromises.push(chrome.tabs.move(sortedTabs[i].id, { index: i }));
    }

    return Promise.all(tabPromises).then(() => sortedTabs);
}