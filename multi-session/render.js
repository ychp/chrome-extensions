window.onload = function () {
    refresh(null)
}

// page render

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
    closeGroupBtn.className = 'btn'
    closeGroupBtn.innerHTML = 'X'
    closeGroupBtn.addEventListener('click', (event) => closeGroup(event, group.id))
    groupHeader.appendChild(closeGroupBtn)

    const addTabBtn = document.createElement('button')
    addTabBtn.id = group.id
    addTabBtn.className = 'btn'
    addTabBtn.innerHTML = 'Add New Tab'
    addTabBtn.addEventListener('click', (event) => addTab(event, group.id))
    groupHeader.appendChild(addTabBtn)

    oneGroup.appendChild(groupHeader)


    const groupContent = document.createElement('div')
    groupContent.className = 'group-content'

    const ul = document.createElement('ul')

    if (group.tabs) {
        group.tabs.forEach(tab => {
            const tabDiv = document.createElement('div')
            tabDiv.className = 'tab'
            tabDiv.id = tab.id
            tabDiv.innerHTML = '<span>' + (tab.title ? tab.title : 'about:blank') + '</span>'
            tabDiv.addEventListener('click', (event) => activeTab(event, tab.id))

            const closeTabBtn = document.createElement('button')
            closeTabBtn.id = tab.id
            closeTabBtn.className = 'btn'
            closeTabBtn.innerHTML = 'X'
            closeTabBtn.addEventListener('click', (event) => closeTab(event, tab.id))
            tabDiv.appendChild(closeTabBtn)
            groupContent.appendChild(tabDiv)
        })
    }

    oneGroup.appendChild(groupContent)
    groupBody.appendChild(oneGroup)

}

const show = function (header) {
    const content = header.nextElementSibling
    content.classList.toggle('show')
}