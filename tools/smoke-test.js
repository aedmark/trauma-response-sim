#!/usr/bin/env node
// Browser smoke test with no dependencies: serves the repo, drives headless
// Chromium/Chrome over the DevTools protocol (Node 22+'s built-in WebSocket),
// and checks the paths a player takes. Exits 1 on any failure.
//
//     node tools/smoke-test.js
//     CHROME=/path/to/chrome node tools/smoke-test.js
//
// Checks: page loads without errors; a seeded run reaches an ending; the same
// seed replays the same events; Case Files records the run; pack text shown in
// Case Files is not parsed as HTML; a malformed saved pack falls back to the
// default; Reset All Data clears game data but keeps the Field Log when the
// second confirm is declined.
'use strict';
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const {spawn, execFileSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};

function findChrome() {
    if (process.env.CHROME) return process.env.CHROME;
    for (const name of ['chromium', 'google-chrome-stable', 'google-chrome', 'chromium-browser']) {
        try {
            return execFileSync('which', [name], {encoding: 'utf8'}).trim();
        } catch (e) {
        }
    }
    throw new Error('No Chromium or Chrome found; set CHROME to its path.');
}

function serve() {
    const server = http.createServer((req, res) => {
        const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream'});
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launch(chrome) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'trs-smoke-'));
    const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', 'about:blank'], {stdio: 'ignore'});
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find(t => t.type === 'page');
    return {proc, profile, wsUrl: page.webSocketDebuggerUrl};
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

class Cdp {
    constructor(ws) {
        this.ws = ws;
        this.id = 0;
        this.pending = new Map();
        this.listeners = [];
        ws.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.pending.has(msg.id)) {
                const {resolve, reject} = this.pending.get(msg.id);
                this.pending.delete(msg.id);
                msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
            } else if (msg.method) {
                this.listeners.forEach(fn => fn(msg));
            }
        };
    }

    send(method, params = {}) {
        const id = ++this.id;
        this.ws.send(JSON.stringify({id, method, params}));
        return new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
    }

    once(method) {
        return new Promise(resolve => {
            const fn = msg => {
                if (msg.method !== method) return;
                this.listeners = this.listeners.filter(f => f !== fn);
                resolve(msg.params);
            };
            this.listeners.push(fn);
        });
    }

    async eval(expression) {
        const r = await this.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
        if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
        return r.result.value;
    }
}

async function main() {
    const server = await serve();
    const base = `http://127.0.0.1:${server.address().port}/index.html`;
    const {proc, profile, wsUrl} = await launch(findChrome());
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const cdp = new Cdp(ws);

    const pageErrors = [];
    const dialogAnswers = [];
    cdp.listeners.push(msg => {
        if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') pageErrors.push(msg.params.args.map(a => a.value).join(' '));
        if (msg.method === 'Page.javascriptDialogOpening') {
            cdp.send('Page.handleJavaScriptDialog', {accept: dialogAnswers.length ? dialogAnswers.shift() : false});
        }
    });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function load(url) {
        const loaded = cdp.once('Page.loadEventFired');
        if (url) await cdp.send('Page.navigate', {url});
        await loaded;
    }

    let failures = 0;
    async function check(name, fn) {
        const before = pageErrors.length;
        try {
            const detail = await fn();
            if (pageErrors.length > before) throw new Error('page error: ' + pageErrors.slice(before).join(' | '));
            console.log(`ok   ${name}${detail ? ` (${detail})` : ''}`);
        } catch (e) {
            failures++;
            console.log(`FAIL ${name}: ${e.message}`);
        }
    }

    // Plays with the first choice each turn; returns the event titles seen.
    const playRun = `(async () => {
        const titles = [];
        for (let i = 0; i < 100 && document.getElementById('end-screen').classList.contains('hidden'); i++) {
            titles.push(document.getElementById('event-title-el').textContent);
            document.querySelector('#choices-container .choice-btn:not(.glitch)').click();
        }
        return {titles, ending: document.getElementById('end-title').textContent,
                ended: !document.getElementById('end-screen').classList.contains('hidden')};
    })()`;

    await load(base);
    await cdp.eval(`localStorage.clear()`);
    await load(base);

    await check('page loads to the splash screen', async () => {
        const visible = await cdp.eval(`!document.getElementById('splash-screen').classList.contains('hidden')`);
        if (!visible) throw new Error('splash screen not shown');
    });

    let firstRun;
    await check('a seeded run reaches an ending', async () => {
        await cdp.eval(`document.getElementById('splash-timed-toggle').checked = false;
            document.getElementById('splash-seed-input').value = 'smoke-1';
            document.getElementById('splash-start-btn').click()`);
        firstRun = await cdp.eval(playRun);
        if (!firstRun.ended || !firstRun.ending) throw new Error(`no ending after ${firstRun.titles.length} turns`);
        return `${firstRun.titles.length} turns, "${firstRun.ending}"`;
    });

    await check('the same seed replays the same events', async () => {
        await cdp.eval(`startGame(false, 'smoke-1')`);
        const again = await cdp.eval(playRun);
        if (JSON.stringify(again.titles) !== JSON.stringify(firstRun.titles)) throw new Error('event order differs');
    });

    await check('Case Files records the run', async () => {
        await cdp.eval(`openCodex()`);
        const progress = await cdp.eval(`document.getElementById('codex-progress').textContent`);
        if (!/^[1-9]\d* \//.test(progress)) throw new Error(`progress reads "${progress}"`);
        await cdp.eval(`closeCodex()`);
        return progress;
    });

    await check('pack text in Case Files is shown as text, not HTML', async () => {
        const name = '<img src=x onerror="window.__xss=1">';
        await cdp.eval(`(() => {
            const pack = deepClone(getContent());
            pack.mechanisms.fawn.name = ${JSON.stringify(name)};
            pack.mechanisms.fawn.desc = '<b id="xss-desc">bold</b>';
            saveContent(pack);
            recordMechanismDiscovered('fawn');
            openCodex();
            [...document.querySelectorAll('#codex-body .codex-tab')].find(b => b.textContent === ${JSON.stringify(name)}).click();
        })()`);
        await sleep(200);
        const r = await cdp.eval(`({xss: window.__xss, img: !!document.querySelector('#codex-detail img'),
            b: !!document.getElementById('xss-desc'), text: document.getElementById('codex-detail').textContent})`);
        if (r.xss || r.img || r.b) throw new Error('pack text was parsed as HTML');
        if (!r.text.includes('<img')) throw new Error(`detail text is "${r.text}"`);
        await cdp.eval(`closeCodex(); resetContent()`);
    });

    await check('a malformed saved pack falls back to the default', async () => {
        await cdp.eval(`(() => {
            const pack = deepClone(DEFAULT_CONTENT);
            pack.events[0].choices[0].effects.mask = {op: 'add', value: '10'};
            localStorage.setItem(CONTENT_KEY, JSON.stringify(pack));
        })()`);
        await load(base);
        const usesDefault = await cdp.eval(`getContent() === DEFAULT_CONTENT`);
        if (!usesDefault) throw new Error('malformed pack was loaded');
        const problems = await cdp.eval(`contentPackProblems(JSON.parse(localStorage.getItem(CONTENT_KEY)))`);
        if (problems.length !== 1) throw new Error(`expected one problem, got ${JSON.stringify(problems)}`);
    });

    await check('Reset All Data keeps the Field Log when the second confirm is declined', async () => {
        await cdp.eval(`localStorage.setItem(FIELD_LOG_KEY, '[{"id":"smoke","note":"kept"}]');
            localStorage.setItem(NG_PLUS_KEY, '1'); setStoredPlayerName('Smoke')`);
        dialogAnswers.push(true, false);
        const reloaded = cdp.once('Page.loadEventFired');
        await cdp.eval(`setTimeout(resetAllGameData, 0)`);
        await reloaded;
        const r = await cdp.eval(`({game: GAME_DATA_KEYS.filter(k => localStorage.getItem(k) !== null),
            field: localStorage.getItem(FIELD_LOG_KEY)})`);
        if (r.game.length) throw new Error(`still set: ${r.game.join(', ')}`);
        if (!r.field) throw new Error('Field Log was deleted');
    });

    ws.close();
    const exited = new Promise(r => proc.once('exit', r));
    proc.kill();
    await exited;
    server.close();
    // Chrome's helper processes can still be writing the profile; leftovers in the temp dir are harmless.
    try {
        fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
    } catch (e) {
    }
    console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
    process.exit(failures ? 1 : 0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
