#!/usr/bin/env node
// Dev-time sanity check, not part of the build: confirms
// tools/gen-casefile-descriptions.js's index layout (survival 0-71,
// failure 72-101, mechanisms 102-106) still lines up with
// TRS_SCI/src/CaseFileTitles.sc's own hand-written switch, by computing
// the same title order from js/content-endings.js +
// js/content-mechanisms.js and diffing against what's actually in that
// file. Run this any time either content-*.js source changes shape.
'use strict';
const fs = require('fs');
const path = require('path');
const { sciSrcDir } = require('./lib/sci-paths');

const repoRoot = path.resolve(__dirname, '..');

const endingsSrc = fs.readFileSync(path.join(repoRoot, 'js/content-endings.js'), 'utf8');
const { CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS } = new Function(
	endingsSrc + '\nreturn {CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS};'
)();
const mechanismsSrc = fs.readFileSync(path.join(repoRoot, 'js/content-mechanisms.js'), 'utf8');
const CONTENT_MECHANISMS = new Function(mechanismsSrc + '\nreturn CONTENT_MECHANISMS;')();

const FAILURE_STAT_ORDER = ['repression', 'mask', 'child'];
const MECH_TAG_ORDER = ['fawn', 'flight', 'fight', 'freeze', 'secure'];

const expectedTitles = [];
CONTENT_ENDINGS.forEach(pool => pool.variants.forEach(v => expectedTitles.push(v.title)));
FAILURE_STAT_ORDER.forEach(stat => CONTENT_FAILURE_ENDINGS[stat].forEach(v => expectedTitles.push(v.title)));
MECH_TAG_ORDER.forEach(tag => expectedTitles.push(CONTENT_MECHANISMS[tag].name));

const titlesSrc = fs.readFileSync(path.join(sciSrcDir, 'CaseFileTitles.sc'), 'utf8');
const actualTitles = [];
const caseRe = /\(case (\d+) return\("((?:[^"\\]|\\.)*)"\)\)/g;
let m;
while ((m = caseRe.exec(titlesSrc))) {
	actualTitles[Number(m[1])] = m[2];
}

let mismatches = 0;
for (let i = 0; i < expectedTitles.length; i++) {
	// CaseFileTitles.sc transliterates the same way gen-endings.js/
	// gen-casefile-descriptions.js's own descText()/endingText() do --
	// straight-quote the source before comparing.
	const expected = expectedTitles[i].replace(/[—–]/g, '-').replace(/['']/g, "'").replace(/[""]/g, '"');
	const actual = actualTitles[i];
	if (actual === undefined) {
		console.error(`index ${i}: MISSING from CaseFileTitles.sc (expected "${expected}")`);
		mismatches++;
	} else if (actual !== expected) {
		console.error(`index ${i}: mismatch -- CaseFileTitles.sc has "${actual}", source data has "${expected}"`);
		mismatches++;
	}
}
if (actualTitles.length > expectedTitles.length) {
	for (let i = expectedTitles.length; i < actualTitles.length; i++) {
		if (actualTitles[i] !== undefined) {
			console.error(`index ${i}: CaseFileTitles.sc has an extra case ("${actualTitles[i]}") beyond the ${expectedTitles.length} expected`);
			mismatches++;
		}
	}
}

if (mismatches) {
	console.error(`\n${mismatches} mismatch(es) found -- CaseFileTitles.sc and the generated CaseFileDescriptions.sc are NOT in index lockstep.`);
	process.exit(1);
} else {
	console.log(`OK: all ${expectedTitles.length} indices match between CaseFileTitles.sc and the content-*.js source data.`);
}
