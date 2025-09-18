const FILE_NAME = 'arc-pinned-tabs.html';
const DATE_SECONDS_IN_DAY = 86400; // required by user rules to avoid magic numbers
const EMPTY_GROUP_ID = -1;
const MIME_TYPE_HTML_UTF8 = 'text/html;charset=utf-8';
const DATA_URL_PREFIX = 'data:text/html;charset=utf-8,';
const PIN_FOLDER_CANDIDATE_KEYWORDS = ['Pinned', 'Pins', 'Pin', '固定', '已固定', 'Arc Pins'];

function assertNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid argument: ${fieldName} must be a non-empty string`);
    }
}

function htmlEscape(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function toUnixTimeSeconds(date) {
    if (!(date instanceof Date)) {
        throw new Error('Invalid argument: date must be a Date instance');
    }
    return Math.floor(date.getTime() / 1000);
}

async function getAllTabs() {
    return await chrome.tabs.query({});
}

async function getAllTabGroups() {
    if (!chrome.tabGroups || !chrome.tabGroups.query) {
        return [];
    }
    return await chrome.tabGroups.query({});
}

function groupTabsByGroupId(tabs) {
    const groupIdToTabs = new Map();
    for (const t of tabs) {
        const key = typeof t.groupId === 'number' && t.groupId >= 0 ? t.groupId : EMPTY_GROUP_ID;
        if (!groupIdToTabs.has(key)) {
            groupIdToTabs.set(key, []);
        }
        groupIdToTabs.get(key).push(t);
    }
    return groupIdToTabs;
}

function filterPinnedTabs(tabs) {
    return tabs.filter((t) => t.pinned === true);
}

function buildNetscapeBookmarksHtml(pinnedTabs, groups) {
    const groupIdToTitle = new Map();
    for (const g of groups) {
        groupIdToTitle.set(g.id, g.title || '');
    }

    const byGroup = groupTabsByGroupId(pinnedTabs);

    const lines = [];
    lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
    lines.push('<TITLE>Bookmarks</TITLE>');
    lines.push('<H1>Bookmarks</H1>');
    lines.push('<DL><p>');

    // Create a top-level folder "Arc Pinned Tabs"
    const now = toUnixTimeSeconds(new Date());
    lines.push(`<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">Arc Pinned Tabs</H3>`);
    lines.push('<DL><p>');

    // Group -1 means ungrouped
    const sortedGroupIds = Array.from(byGroup.keys()).sort((a, b) => a - b);
    for (const groupId of sortedGroupIds) {
        const tabsInGroup = byGroup.get(groupId) || [];
        if (tabsInGroup.length === 0) {
            continue;
        }
        const groupTitleRaw = groupId === EMPTY_GROUP_ID ? 'Ungrouped' : (groupIdToTitle.get(groupId) || 'Group');
        const groupTitle = htmlEscape(groupTitleRaw);
        lines.push(`<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${groupTitle}</H3>`);
        lines.push('<DL><p>');
        for (const t of tabsInGroup) {
            const url = typeof t.url === 'string' ? t.url : '';
            const title = typeof t.title === 'string' ? t.title : url;
            const href = htmlEscape(url);
            const text = htmlEscape(title);
            lines.push(`<DT><A HREF="${href}" ADD_DATE="${now}">${text}</A>`);
        }
        lines.push('</DL><p>');
    }

    lines.push('</DL><p>');
    lines.push('</DL><p>');
    return lines.join('\n');
}

// Bookmark helpers for Arc pin fallback
async function getBookmarksTree() {
    if (!chrome.bookmarks || !chrome.bookmarks.getTree) {
        return [];
    }
    return await chrome.bookmarks.getTree();
}

function isCandidatePinFolderTitle(title) {
    if (typeof title !== 'string') {
        return false;
    }
    const lower = title.toLowerCase();
    for (const k of PIN_FOLDER_CANDIDATE_KEYWORDS) {
        if (lower.includes(k.toLowerCase())) {
            return true;
        }
    }
    return false;
}

function collectLinksCount(node) {
    if (!node) {
        return 0;
    }
    if (node.url) {
        return 1;
    }
    if (!node.children || node.children.length === 0) {
        return 0;
    }
    let count = 0;
    for (const c of node.children) {
        count += collectLinksCount(c);
    }
    return count;
}

function findLikelyPinFolderFromBookmarksTree(tree) {
    // BFS over folders to find folder whose title matches keywords; choose the one with most links
    const queue = Array.isArray(tree) ? [...tree] : [];
    let best = null;
    let bestCount = -1;
    while (queue.length > 0) {
        const node = queue.shift();
        if (!node) {
            continue;
        }
        if (node.children && node.children.length > 0) {
            for (const c of node.children) {
                queue.push(c);
            }
        }
        if (node.url) {
            continue;
        }
        if (isCandidatePinFolderTitle(node.title)) {
            const count = collectLinksCount(node);
            if (count > bestCount) {
                best = node;
                bestCount = count;
            }
        }
    }
    return best;
}

function flattenPinFolderToGroups(pinFolderNode) {
    // Returns Map<title, Array<{url,title}>>; direct links go to 'Ungrouped'
    const groups = new Map();
    if (!pinFolderNode || !Array.isArray(pinFolderNode.children)) {
        return groups;
    }
    const UNGROUPED = 'Ungrouped';
    groups.set(UNGROUPED, []);
    for (const child of pinFolderNode.children) {
        if (child.url) {
            groups.get(UNGROUPED).push({ url: child.url, title: child.title || child.url });
            continue;
        }
        if (Array.isArray(child.children)) {
            const groupTitle = child.title && child.title.trim().length > 0 ? child.title : 'Group';
            if (!groups.has(groupTitle)) {
                groups.set(groupTitle, []);
            }
            for (const leaf of child.children) {
                if (leaf && leaf.url) {
                    groups.get(groupTitle).push({ url: leaf.url, title: leaf.title || leaf.url });
                }
            }
        }
    }
    if (groups.get(UNGROUPED).length === 0) {
        groups.delete(UNGROUPED);
    }
    return groups;
}

function buildHtmlFromBookmarkGroups(groupsMap) {
    const lines = [];
    lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
    lines.push('<TITLE>Bookmarks</TITLE>');
    lines.push('<H1>Bookmarks</H1>');
    lines.push('<DL><p>');
    const now = toUnixTimeSeconds(new Date());
    lines.push(`<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">Arc Pinned Tabs</H3>`);
    lines.push('<DL><p>');
    const groupTitles = Array.from(groupsMap.keys());
    for (const gTitle of groupTitles) {
        const esc = htmlEscape(gTitle);
        lines.push(`<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${esc}</H3>`);
        lines.push('<DL><p>');
        const items = groupsMap.get(gTitle) || [];
        for (const it of items) {
            const href = htmlEscape(it.url);
            const text = htmlEscape(it.title);
            lines.push(`<DT><A HREF="${href}" ADD_DATE="${now}">${text}</A>`);
        }
        lines.push('</DL><p>');
    }
    lines.push('</DL><p>');
    lines.push('</DL><p>');
    return lines.join('\n');
}

async function exportArcPinnedTabs() {
    const allTabs = await getAllTabs();
    const pinned = filterPinnedTabs(allTabs);
    const groups = await getAllTabGroups();
    let html = '';
    if (pinned.length > 0) {
        html = buildNetscapeBookmarksHtml(pinned, groups);
    } else {
        // Prefer native host export which reads StorableSidebar.json for accurate Arc pins
        const nativeResult = await tryNativeHostExport();
        if (nativeResult && nativeResult.downloaded) {
            return; // Native path already wrote files
        }
        // Fallback to bookmarks tree: find a likely pin folder and export
        const tree = await getBookmarksTree();
        const pinFolder = findLikelyPinFolderFromBookmarksTree(tree);
        if (pinFolder) {
            const groupsMap = flattenPinFolderToGroups(pinFolder);
            html = buildHtmlFromBookmarkGroups(groupsMap);
        } else {
            html = buildHtmlFromBookmarkGroups(new Map());
        }
    }

    let downloadUrl = '';
    try {
        if (typeof URL === 'object' && typeof URL.createObjectURL === 'function') {
            downloadUrl = URL.createObjectURL(new Blob([html], { type: MIME_TYPE_HTML_UTF8 }));
        } else {
            throw new Error('URL.createObjectURL is not available in this context');
        }
    } catch (err) {
        // Fallback: data URL works reliably in MV3 service workers (Arc included)
        downloadUrl = DATA_URL_PREFIX + encodeURIComponent(html);
    }

    await chrome.downloads.download({
        url: downloadUrl,
        filename: FILE_NAME,
        saveAs: true
    });
}

async function tryNativeHostExport() {
    if (!chrome.runtime || !chrome.runtime.connectNative) {
        return null;
    }
    try {
        const port = chrome.runtime.connectNative('com.ychp.arc.export_pins');
        const response = await new Promise((resolve, reject) => {
            let settled = false;
            port.onMessage.addListener((msg) => { if (!settled) { settled = true; resolve(msg); } });
            port.onDisconnect.addListener(() => { if (!settled) { settled = true; resolve(null); } });
            try { port.postMessage({ cmd: 'export' }); } catch (e) { reject(e); }
            setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 5000);
        });
        if (response && response.ok && Array.isArray(response.contents) && response.contents.length > 0) {
            for (const item of response.contents) {
                const fileName = typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : FILE_NAME;
                const html = typeof item.html === 'string' ? item.html : '';
                const blobUrl = (typeof URL === 'object' && typeof URL.createObjectURL === 'function')
                    ? URL.createObjectURL(new Blob([html], { type: MIME_TYPE_HTML_UTF8 }))
                    : DATA_URL_PREFIX + encodeURIComponent(html);
                await chrome.downloads.download({ url: blobUrl, filename: fileName, saveAs: true });
            }
            return { downloaded: true };
        }
    } catch (e) {
        // native host not installed or failed
    }
    return null;
}

chrome.action.onClicked.addListener(async () => {
    try {
        await exportArcPinnedTabs();
    } catch (e) {
        console.error('favorite-sync: failed to export Arc pinned tabs', e);
    }
});

