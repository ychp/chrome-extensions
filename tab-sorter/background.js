chrome.action.onClicked.addListener(async (tab) => {
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
        sortAndMoveTabsByConfig(tabs)
    })
})



const sortAndMoveTabsByConfig = function(tabs) {
    chrome.storage.sync.get(
        { type: 'dicAsc' },
        (items) => {
            sortAndMoveTabs(tabs, items.type)
        }
    )
}

const sortAndMoveTabs = function(tabs, sortType) {
    const sortedTabs = tabs.slice().sort((a, b) => {
        let preTitle = a.title
        preTitle = preTitle.toLowerCase()
        let nextTitle = b.title
        nextTitle = nextTitle.toLowerCase()
        return sortTabs(preTitle, nextTitle, sortType)
    })

    const tabPromises = []

    for (let i = 0; i < sortedTabs.length; i++) {
        tabPromises.push(chrome.tabs.move(sortedTabs[i].id, { index: i }))
    }

    return Promise.all(tabPromises).then(() => sortedTabs)
}


const sortTabs = function(preStr, nextStr, sortType) {
    if (sortType == 'dicAsc') {
        return sortByDicAsc(preStr, nextStr)
    }

    if (sortType == 'dicDesc') {
        return -sortByDicAsc(preStr, nextStr)
    }

    return 0
}



const sortByDicAsc = function(preStr, nextStr) {
    // 比较两个字符串的第一个字符
    if (preStr[0] < nextStr[0]) {
        return -1
    }
    if (preStr[0] > nextStr[0]) {
        return 1
    }

    // 如果第一个字符相同，继续比较下一个字符
    return sortByDicAsc(preStr.slice(1), nextStr.slice(1))
}