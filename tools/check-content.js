#!/usr/bin/env node
// Checks the default content pack and every pack in dlc/ with the game's own
// validator (contentPackProblems in js/content.js), plus stricter rules the
// default pack keeps: 2-5 choices per event, every choice tagged, unique titles,
// every event in a known zone. Exits 1 on any problem.
//
//     node tools/check-content.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const scripts = [
    'js/content-mechanisms.js', 'js/content-endings.js',
    'js/events/work.js', 'js/events/home.js', 'js/events/social.js',
    'js/events/self.js', 'js/events/body.js', 'js/events/public.js',
    'js/content-events.js', 'js/content.js',
];

// The game's scripts are classic scripts sharing top-level bindings, so run
// them as one script and hand back what this check needs.
const source = scripts.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n')
    + '\n;({DEFAULT_CONTENT, contentPackProblems, MECHANISM_TAGS});';
const {DEFAULT_CONTENT, contentPackProblems, MECHANISM_TAGS} =
    vm.runInNewContext(source, {localStorage: {getItem: () => null, setItem() {}, removeItem() {}}});

function defaultPackRules(pack) {
    const problems = [];
    const zones = new Set(pack.zones.map(z => z.key));
    const titles = new Set();
    pack.events.forEach(evt => {
        if (titles.has(evt.title)) problems.push(`Event "${evt.title}" title is used twice.`);
        titles.add(evt.title);
        if (!zones.has(evt.zone)) problems.push(`Event "${evt.title}" is in unknown zone "${evt.zone}".`);
        const n = evt.choices.length;
        if (n < 2 || n > 5) problems.push(`Event "${evt.title}" has ${n} choices (expected 2-5).`);
        evt.choices.forEach((c, j) => {
            if (!MECHANISM_TAGS.includes(c.tag)) problems.push(`Event "${evt.title}", choice ${j + 1} is untagged.`);
            if (!c.text || !c.log) problems.push(`Event "${evt.title}", choice ${j + 1} is missing text or log.`);
        });
    });
    return problems;
}

let failed = false;
function report(name, problems, summary) {
    if (problems.length) {
        failed = true;
        console.log(`FAIL ${name}`);
        problems.forEach(p => console.log(`  - ${p}`));
    } else {
        console.log(`ok   ${name}${summary ? ` (${summary})` : ''}`);
    }
}

const pack = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
const tally = {};
pack.events.forEach(e => e.choices.forEach(c => { tally[c.tag] = (tally[c.tag] || 0) + 1; }));
report('default pack', [...contentPackProblems(pack), ...defaultPackRules(pack)],
    `${pack.events.length} events; ` + MECHANISM_TAGS.map(t => `${t} ${tally[t] || 0}`).join(', '));

const dlcDir = path.join(root, 'dlc');
for (const file of fs.readdirSync(dlcDir).filter(f => f.endsWith('.json')).sort()) {
    let problems;
    try {
        problems = contentPackProblems(JSON.parse(fs.readFileSync(path.join(dlcDir, file), 'utf8')));
    } catch (e) {
        problems = [`not valid JSON: ${e.message}`];
    }
    report(`dlc/${file}`, problems);
}

process.exit(failed ? 1 : 0);
