// tabs operation
const addTab = function (event, groupId) {
    if (!groupId) {
        return
    }
    event.stopPropagation(); // 阻止事件冒泡
    chrome.tabs.create({ url: "about:blank", active: false }, function (tab) {
        const tabId = tab.id
        const group = chrome.tabs.group({ tabIds: tabId, groupId })
        appendTab(groupId, tab)
    })
}

const closeTab = function (event, tabId) {
    event.stopPropagation(); // 阻止事件冒泡
    if (!tabId) {
        return
    }

    chrome.tabs.get(tabId, (tab) => {
        if (!tab) {
            return
        }
        const groupId = tab.groupId
        // 刷新stroge中的数据
        chrome.storage.local.get({ groupManage: {} }, (item) => {
            if (!item) {
                item = {}
            }
            const groupManage = item.groupManage
            if (groupManage[groupId]) {
                if (groupManage[groupId].tabs) {
                    groupManage[groupId].tabs = groupManage[groupId].tabs.filter(tab => tab.id !== tabId)   
                }
            }
            if (!groupManage[groupId].tabs || groupManage[groupId].tabs.length == 0) {
                delete groupManage[groupId]
            }
            item.groupManage = groupManage
            chrome.storage.local.set(item, () => refresh(groupId))
        })
        // 关闭标签
        const tabIds = tab.id
        chrome.tabs.remove(tabIds)
    })
}

const appendTab = (groupId, tab) => {
    if (!groupId) {
        return
    }
    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            item = {}
        }
        const group = item.groupManage[groupId]
        group.tabs.push(tab)
        item.groupManage[groupId] = group
        chrome.storage.local.set(
            item,
            () => refresh(groupId))
    })
}

const activeTab = function (event, tabId) {
    if (!tabId) {
        return
    }
    chrome.tabs.update(tabId, { active: true })
}

