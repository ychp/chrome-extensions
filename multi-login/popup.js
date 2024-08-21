window.onload = function() {
    refresh()
}

const groupHeaders = document.querySelectorAll('.group-header')
groupHeaders.forEach(header => {
    header.addEventListener('click', (event) => show(header))
    const addBtns = header.querySelectorAll('#add-tab')
    addBtns.forEach(btn => {
        btn.addEventListener('click', (event) => addTab(event))
    })
})

const show = function(header) {
    const content = header.nextElementSibling
    content.classList.toggle('show')
}

const addTab = function(event, groupId) {
    event.stopPropagation(); // 阻止事件冒泡
    chrome.tabs.create({ url: "about:blank", active: false }, function(tab) {
        const tabId = tab.id
        const group = chrome.tabs.group({ tabIds: tabId, groupId })
        refresh()
        const headerId = '#header_' + groupId
        const groupHeader = document.querySelector(headerId)
        if (groupHeader) {
            show(groupHeader)
        }
    })
}


const addGroupBtns = document.querySelectorAll('#add-group')
addGroupBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
        chrome.tabs.create({ url: "about:blank", active: false }, function(tab) {
            const tabId = tab.id
            const group = chrome.tabs.group({ tabIds: tabId })
            group.then(groupId => {
                chrome.tabGroups.update(groupId, { title: 'session[' + groupId + ']' });
                refresh()
            })
        })
    })
})


const refresh = function() {
    const groupBody = document.querySelectorAll('.group-body')[0]
    groupBody.innerHTML = ''

    const sessionGroupArr = chrome.tabGroups.query({}, groups => {
        for (let group of groups) {
            if (group.title.startsWith("session[")) {
                chrome.tabs.query({ groupId: group.id }, tabs => {
                    appendGroupInfo(group, tabs)
                })
            }
        }
    })
}

const appendGroupInfo = function(group, tabs) {
    const groupBody = document.querySelectorAll('.group-body')[0]
    
    const oneGroup = document.createElement('div')
    oneGroup.className = 'group'

    const groupHeader = document.createElement('div')
    groupHeader.id = 'header_' + group.id
    groupHeader.className = 'group-header'
    groupHeader.addEventListener('click', (event) => show(groupHeader))
    groupHeader.innerHTML = group.title

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

    tabs.forEach(tab => {
        const li = document.createElement('li')
        li.id = tab.id
        li.innerHTML = tab.title ? tab.title : 'about:blank'
        ul.appendChild(li)
    });

    groupContent.appendChild(ul)
    oneGroup.appendChild(groupContent)
    groupBody.appendChild(oneGroup)
    
}

