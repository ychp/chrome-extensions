// group operation
const saveGroup = (group) => {
    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            item = {}
        }
        const groupManage = item.groupManage
        if (!groupManage) {
            groupManage = {}
        }
        groupManage[group.id] = group
        item.groupManage = groupManage
        chrome.storage.local.set(
            item,
            () => refresh(null)
        )
    })
}

const closeGroup = function (event, groupId) {
    event.stopPropagation(); // 阻止事件冒泡
    if (!groupId) {
        return
    }
    chrome.tabs.query({ groupId: groupId }, (tabs) => {
        const tabIds = tabs.map(tab => tab.id)
        chrome.tabs.remove(tabIds)
        removeGroup(groupId)
    })
}


const addGroupBtns = document.querySelectorAll('#add-group')
addGroupBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
        chrome.tabs.create({ url: "about:blank", active: false }, function (tab) {
            const tabId = tab.id
            const group = chrome.tabs.group({ tabIds: tabId })
            group.then(groupId => {
                chrome.tabGroups.update(groupId, { title: '[' + groupId + ']' });
                const groupInfo = { id: groupId, title: '[' + groupId + ']', tabs: [tab] }
                saveGroup(groupInfo)
            })
        })
    })
})

const removeErrorGroup = function () {
    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            item = {}
        }
        for (key in item.groupManage) {
            const group = item.groupManage[key]
            if (!group.id || !group.tabs || group.tabs.length === 0) {
                delete item.groupManage[key]
            }
        }
        chrome.storage.local.set(item)
    })
}


const removeGroup = function (groupId) {
    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            item = {}
        }
        if (item.groupManage[groupId]) {
            delete item.groupManage[groupId]
        }
        chrome.storage.local.set(item, () => refresh(null))
    })
}
