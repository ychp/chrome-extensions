chrome.action.onClicked.addListener(async (tab) => {
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
        sortAndMoveTabs(tabs)
    })
})


const sortAndMoveTabs = function(tabs) {
    const sortedTabs = tabs.slice().sort((a, b) => {
        let preTitle = a.title
        preTitle = preTitle.toLowerCase()
        let nextTitle = b.title
        nextTitle = nextTitle.toLowerCase()
        return sortStrings(preTitle, nextTitle)
    })

    const tabPromises = []

    for (let i = 0; i < sortedTabs.length; i++) {
        tabPromises.push(chrome.tabs.move(sortedTabs[i].id, { index: i }))
    }

    return Promise.all(tabPromises).then(() => sortedTabs)
}


const sortStrings = function(preStr, nextStr) {
    // 比较两个字符串的第一个字符
    if (preStr[0] < nextStr[0]) {
        return -1;
    }
    if (preStr[0] > nextStr[0]) {
        return 1;
    }

    // 如果第一个字符相同，继续比较下一个字符
    return sortStrings(preStr.slice(1), nextStr.slice(1));
}