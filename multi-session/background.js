chrome.declarativeNetRequest.updateDynamicRuleset(1, { base: chrome.runtime.getURL('rules.json') }, () => {
    console.log('Dynamic ruleset registered');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
        return
    }
    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            return
        }
        const groupManage = item.groupManage
        if (!groupManage) {
            return
        }
        for (let groupId in groupManage) {
            groupManage[groupId].tabs.array.forEach(tabItem => {
                if (tabItem.id == tabId) {
                    chrome.tabs.update(tabId, { url: `${tab.url}?groupId=${groupId}` })
                } else {
                    chrome.tabs.update(tabId, { url: tab.url })
                }
            })
        }
    })

})
