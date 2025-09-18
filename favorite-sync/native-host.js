#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const LOG_PATH = path.join(__dirname, 'native-host.log');

function log(line) {
    try { fs.appendFileSync(LOG_PATH, new Date().toISOString() + ' ' + line + '\n'); } catch (_) {}
}

function readMessage() {
    const header = Buffer.alloc(4);
    const bytesRead = fs.readSync(0, header, 0, 4, null);
    if (bytesRead === 0) { return null; }
    if (bytesRead !== 4) { throw new Error('Invalid header length'); }
    const len = header.readUInt32LE(0);
    if (len === 0) { return null; }
    const body = Buffer.alloc(len);
    let off = 0;
    while (off < len) {
        const n = fs.readSync(0, body, off, len - off, null);
        if (n <= 0) { throw new Error('Unexpected EOF'); }
        off += n;
    }
    return JSON.parse(body.toString('utf8'));
}

function writeMessage(obj) {
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length, 0);
    fs.writeSync(1, header);
    fs.writeSync(1, body);
}

async function main() {
    try {
        log('host started');
        const req = readMessage();
        if (!req) { return; }
        log('request: ' + JSON.stringify(req).slice(0, 200));
        const DIR = path.resolve(__dirname);
        const input = path.join(process.env.HOME, 'Library', 'Application Support', 'Arc', 'StorableSidebar.json');
        const outDir = DIR;
        // Run exporter as a module to avoid spawning extra processes
        const { exportSpacesToHtmlStrings } = require('./arc-export.js');
        const results = exportSpacesToHtmlStrings(input);
        const contents = results.map(r => ({ name: (r.spaceName || 'Arc Space') + '.html', html: r.html }));
        log('prepared in-memory files: ' + contents.map(c => c.name).join(', '));
        writeMessage({ ok: true, contents });
    } catch (e) {
        log('error: ' + String(e && e.stack || e));
        try { writeMessage({ ok: false, error: String(e && e.stack || e) }); } catch (_) {}
    }
}

main();


