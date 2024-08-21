
window.onload = function () {
    refresh(null)
}

const groupHeaders = document.querySelectorAll('.group-header')
groupHeaders.forEach(header => {
    header.addEventListener('click', (event) => show(header))
    const addBtns = header.querySelectorAll('#add-tab')
    addBtns.forEach(btn => {
        btn.addEventListener('click', (event) => addTab(event))
    })
})

const show = function (header) {
    const content = header.nextElementSibling
    content.classList.toggle('show')
}

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


const refresh = function (groupId) {
    removeErrorGroup()
    const groupBody = document.querySelectorAll('.group-body')[0]
    groupBody.innerHTML = ''

    chrome.storage.local.get({ groupManage: {} }, (item) => {
        if (!item) {
            return
        }
        const groupManage = item.groupManage
        if (!groupManage) {
            return
        }
        for (key in groupManage) {
            const group = groupManage[key]
            appendGroupInfo(group)
        }
        if (groupId) {
            const headerId = '#header_' + groupId
            const groupHeader = document.querySelector(headerId)
            if (groupHeader) {
                show(groupHeader)
            }
        }
    })
}

const appendGroupInfo = function (group) {
    if (!group) {
        return
    }
    const groupBody = document.querySelectorAll('.group-body')[0]

    const oneGroup = document.createElement('div')
    oneGroup.className = 'group'

    const groupHeader = document.createElement('div')
    groupHeader.id = 'header_' + group.id
    groupHeader.className = 'group-header'
    groupHeader.addEventListener('click', (event) => show(groupHeader))
    groupHeader.innerHTML = group.title


    const closeGroupBtn = document.createElement('button')
    closeGroupBtn.id = group.id
    closeGroupBtn.style = 'float: right; height: 25px;'
    closeGroupBtn.innerHTML = 'X'
    closeGroupBtn.addEventListener('click', (event) => closeGroup(event, group.id))
    groupHeader.appendChild(closeGroupBtn)

    const addTabBtn = document.createElement('button')
    addTabBtn.id = group.id
    addTabBtn.style = 'float: right; height: 25px;'
    addTabBtn.innerHTML = 'Add New Tab'
    addTabBtn.addEventListener('click', (event) => addTab(event, group.id))
    groupHeader.appendChild(addTabBtn)

    oneGroup.appendChild(groupHeader)


    const groupContent = document.createElement('div')
    groupContent.className = 'group-content'

    const ul = document.createElement('ul')

    if (group.tabs) {
        group.tabs.forEach(tab => {
            const li = document.createElement('li')
            li.id = tab.id
            li.innerHTML = tab.title ? tab.title : 'about:blank'
            ul.appendChild(li)
        })
    }

    groupContent.appendChild(ul)
    oneGroup.appendChild(groupContent)
    groupBody.appendChild(oneGroup)

}


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