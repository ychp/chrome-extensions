#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const UNIX_EPOCH_2001_OFFSET_SECONDS = 978307200; // 2001-01-01 to 1970-01-01

function readJson(filePath) {
    if (typeof filePath !== 'string' || filePath.length === 0) {
        throw new Error('Invalid argument: filePath must be non-empty string');
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

function htmlEscape(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text || '').replace(/[&<>"']/g, (m) => map[m]);
}

function toUnixSecondsFromAppleEpoch(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
        return Math.floor(Date.now() / 1000);
    }
    return Math.floor(value + UNIX_EPOCH_2001_OFFSET_SECONDS);
}

function coerceArray(v) {
    return Array.isArray(v) ? v : [];
}

function normalizeContainers(sidebar) {
    const containers = coerceArray(sidebar && sidebar.containers);
    return containers.filter(Boolean);
}

function buildIdToNodeMapFromItems(items) {
    const idToNode = new Map();
    // items is a flat array alternating: id, object
    for (let i = 0; i < items.length - 1; i += 2) {
        const id = items[i];
        const obj = items[i + 1];
        if (typeof id === 'string' && obj && typeof obj === 'object') {
            idToNode.set(id, obj);
        }
    }
    return idToNode;
}

function buildForestRoots(idToNode) {
    // Roots are nodes whose parentID is missing or not found
    const roots = [];
    const allIds = new Set(idToNode.keys());
    for (const [id, node] of idToNode.entries()) {
        const parentId = node.parentID;
        if (!parentId || !allIds.has(parentId)) {
            roots.push(id);
        }
    }
    return roots;
}

function isFolderLike(node) {
    if (!node) { return false; }
    if (Array.isArray(node.childrenIds) && node.childrenIds.length > 0) { return true; }
    // Some folders may have no children at the moment
    if (!node.url && !((node.data || {}).tab || {}).savedURL) { return true; }
    return false;
}

function getNodeTitle(node) {
    if (!node) { return ''; }
    if (typeof node.title === 'string' && node.title.trim().length > 0) {
        return node.title.trim();
    }
    const t = node.data && node.data.tab && node.data.tab.savedTitle;
    if (typeof t === 'string' && t.trim().length > 0) { return t.trim(); }
    const u = node.data && node.data.tab && node.data.tab.savedURL;
    if (typeof u === 'string') { return u; }
    return '';
}

function getNodeUrl(node) {
    if (!node) { return ''; }
    if (typeof node.url === 'string') { return node.url; }
    const u = node.data && node.data.tab && node.data.tab.savedURL;
    return typeof u === 'string' ? u : '';
}

function getNodeAddDate(node) {
    const v = node && (node.createdAt || (node.data && node.data.tab && node.data.tab.timeLastActiveAt));
    return toUnixSecondsFromAppleEpoch(typeof v === 'number' ? v : Math.floor(Date.now() / 1000) - UNIX_EPOCH_2001_OFFSET_SECONDS);
}

function buildHtmlFromTree(idToNode, rootIds, spaceName) {
    const lines = [];
    const now = Math.floor(Date.now() / 1000);
    lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
    lines.push('<TITLE>Bookmarks</TITLE>');
    const safeSpaceTitle = spaceName && spaceName.trim().length > 0 ? spaceName.trim() : 'Arc Pinned Tabs';
    lines.push(`<H1>${htmlEscape(safeSpaceTitle)}</H1>`);
    lines.push('<DL><p>');

    function writeFolderStart(title) {
        lines.push(`<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${htmlEscape(title)}</H3>`);
        lines.push('<DL><p>');
    }
    function writeFolderEnd() { lines.push('</DL><p>'); }
    function writeLink(url, title, addDate) {
        const escUrl = htmlEscape(url);
        const escTitle = htmlEscape(title);
        const ts = addDate || now;
        lines.push(`<DT><A HREF="${escUrl}" ADD_DATE="${ts}">${escTitle}</A>`);
    }

    function dfs(nodeId) {
        const node = idToNode.get(nodeId);
        if (!node) { return; }
        if (isFolderLike(node)) {
            const folderTitle = getNodeTitle(node) || 'Folder';
            writeFolderStart(folderTitle);
            const children = coerceArray(node.childrenIds);
            for (const cid of children) { dfs(cid); }
            writeFolderEnd();
            return;
        }
        const url = getNodeUrl(node);
        if (url) {
            writeLink(url, getNodeTitle(node) || url, getNodeAddDate(node));
        }
    }

    for (const rid of rootIds) { dfs(rid); }

    lines.push('</DL><p>');
    return lines.join('\n');
}

function sanitizeFileName(name) {
    const base = (name || 'Arc Pinned Tabs').replace(/[\\/:*?"<>|]+/g, ' ').trim();
    return base.length > 0 ? base : 'Arc Pinned Tabs';
}

function writeSpaceToFile(outputDir, spaceName, html) {
    const fileName = `${sanitizeFileName(spaceName)}.html`;
    const fullPath = path.join(outputDir, fileName);
    fs.writeFileSync(fullPath, html, 'utf8');
    return fullPath;
}

function exportSpacesToHtmlStrings(inputPath) {
    const data = readJson(inputPath);
    const containers = normalizeContainers(data.sidebar || {});
    const results = [];
    for (const container of containers) {
        const items = coerceArray(container.items);
        if (items.length === 0) { continue; }
        const idToNode = buildIdToNodeMapFromItems(items);
        const roots = buildForestRoots(idToNode);
        const spaceName = container.name || 'Arc Space';
        const html = buildHtmlFromTree(idToNode, roots, spaceName);
        results.push({ spaceName, html });
    }
    return results;
}

function main() {
    const input = process.argv[2] || path.join(process.env.HOME, 'Library', 'Application Support', 'Arc', 'StorableSidebar.json');
    const outDir = process.argv[3] || process.cwd();
    const results = exportSpacesToHtmlStrings(input);
    if (results.length === 0) {
        throw new Error('No containers found in StorableSidebar.json');
    }
    const outputs = [];
    for (const r of results) {
        const outPath = writeSpaceToFile(outDir, r.spaceName, r.html);
        outputs.push(outPath);
    }

    for (const p of outputs) {
        process.stdout.write(p + '\n');
    }
}

if (require.main === module) {
    try { main(); } catch (e) { console.error('arc-export failed:', e && e.stack || e); process.exit(1); }
}

module.exports = { exportSpacesToHtmlStrings };


