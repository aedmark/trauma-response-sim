#!/usr/bin/env node
// Generates the TRS_SCI/src/CaseFileDescriptions*.sc files (Case Files
// viewer's "View" detail text) from the same source data and flat index
// scheme as tools/gen-endings.js:
//   0-71 survival (9 pools x 8), 72-101 failure (3 x 10), 102-106 mechanisms.
// Must stay in index lockstep with CaseFileTitles.sc -- run
// `node tools/verify-casefile-indices.js` after regenerating.
//
// Survival and Failure are chunked one file per POOL (matching
// EndingSurvival0-8.sc/EndingFailure0-2.sc's own split), not one file per
// whole category: a single combined Survival file (all 72 variants) compiled
// to 7.24KB, comfortably bigger than any contiguous free block this
// dialect's heap fragmentation reliably leaves after real play -- confirmed
// live, "Out of heap space" on a View click even with CaseFileCategory.sc's
// own MemoryInfo(miLARGESTPTR) guard reporting enough total headroom, just
// not in one contiguous piece. Mechanisms (5 entries total) stays a single
// file -- nowhere near that scale. Each file exports a differently-named
// procedure (CaseFileDescriptionSurvivalN/FailureN/Mechanisms) rather than
// same-named ones across files -- no precedent in this codebase for the
// same public procedure name defined in multiple scripts used together.
'use strict';
const fs = require('fs');
const path = require('path');
const { sciString } = require('./lib/sci-string');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'TRS_SCI/src');

const endingsSrc = fs.readFileSync(path.join(repoRoot, 'js/content-endings.js'), 'utf8');
const { CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS } = new Function(
	endingsSrc + '\nreturn {CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS};'
)();

const mechanismsSrc = fs.readFileSync(path.join(repoRoot, 'js/content-mechanisms.js'), 'utf8');
const CONTENT_MECHANISMS = new Function(mechanismsSrc + '\nreturn CONTENT_MECHANISMS;')();

const SURVIVAL_VARIANTS_PER_POOL = 8;
const FAILURE_VARIANTS_PER_POOL = 10;
const SURVIVAL_BASE = 0;
const FAILURE_BASE = SURVIVAL_BASE + CONTENT_ENDINGS.length * SURVIVAL_VARIANTS_PER_POOL; // 72
const MECH_BASE = FAILURE_BASE + 3 * FAILURE_VARIANTS_PER_POOL; // 102
const FAILURE_STAT_ORDER = ['repression', 'mask', 'child'];
const MECH_TAG_ORDER = ['fawn', 'flight', 'fight', 'freeze', 'secure'];

if (CONTENT_ENDINGS.length !== 9) {
	throw new Error(`expected 9 survival pools, found ${CONTENT_ENDINGS.length}`);
}
for (const pool of CONTENT_ENDINGS) {
	if (pool.variants.length !== SURVIVAL_VARIANTS_PER_POOL) {
		throw new Error(`survival pool "${pool.variants[0].title}" has ${pool.variants.length} variants, expected ${SURVIVAL_VARIANTS_PER_POOL}`);
	}
}
for (const stat of FAILURE_STAT_ORDER) {
	if (CONTENT_FAILURE_ENDINGS[stat].length !== FAILURE_VARIANTS_PER_POOL) {
		throw new Error(`failure pool "${stat}" has ${CONTENT_FAILURE_ENDINGS[stat].length} variants, expected ${FAILURE_VARIANTS_PER_POOL}`);
	}
}
if (MECH_TAG_ORDER.some(tag => !CONTENT_MECHANISMS[tag])) {
	throw new Error(`CONTENT_MECHANISMS is missing one of ${MECH_TAG_ORDER.join(',')}`);
}

// Same "straight double quote -> single quote" transliteration
// gen-endings.js's own endingText() uses -- sciString() correctly rejects
// embedded literal `"` outright (no way to escape one inside a
// ""-delimited SCI0 string), and at least one desc has one.
function descText(s) {
	return sciString(s.replace(/"/g, "'"));
}

function writeCategoryFile({ filename, scriptConst, procName, cases, categoryLabel, rangeLabel }) {
	const src = `/******************************************************************************\n` +
		` T.R.S. → SCI0 port\n` +
		` ******************************************************************************\n` +
		` ${filename}\n` +
		` GENERATED FILE — do not hand-edit. Produced by\n` +
		` tools/gen-casefile-descriptions.js from js/content-endings.js and\n` +
		` js/content-mechanisms.js.\n\n` +
		` ${categoryLabel} descriptions for the Case Files viewer's "View" detail\n` +
		` screen, flat indices ${rangeLabel} (game.sh's index scheme).\n` +
		` Load/DisposeScript-scoped -- only needed while this category's\n` +
		` screen is open.\n` +
		` ******************************************************************************/\n` +
		`(include "sci.sh")\n(include "game.sh")\n` +
		`/******************************************************************************/\n` +
		`(script ${scriptConst})\n` +
		`/******************************************************************************/\n` +
		`(procedure public (${procName} index)\n` +
		`\t(switch(index)\n${cases.join('\n')}\n\t)\n` +
		`\treturn("")\n)\n` +
		`/******************************************************************************/\n`;
	fs.writeFileSync(path.join(outDir, filename), src);
	console.log(`Wrote ${cases.length} descriptions (${src.length} bytes) to TRS_SCI/src/${filename}`);
}

// --- Survival (0-71), one file per pool ---
CONTENT_ENDINGS.forEach((pool, poolIndex) => {
	const base = SURVIVAL_BASE + poolIndex * SURVIVAL_VARIANTS_PER_POOL;
	const cases = pool.variants.map((v, i) =>
		`\t\t(case ${base + i} return("${descText(v.desc)}"))`
	);
	writeCategoryFile({
		filename: `CaseFileDescriptionsSurvival${poolIndex}.sc`,
		scriptConst: `CASEFILEDESCRIPTIONS_SURVIVAL${poolIndex}_SCRIPT`,
		procName: `CaseFileDescriptionSurvival${poolIndex}`,
		cases,
		categoryLabel: `Survival ending (pool ${poolIndex})`,
		rangeLabel: `${base}-${base + SURVIVAL_VARIANTS_PER_POOL - 1}`,
	});
});

// --- Failure (72-101), one file per pool ---
FAILURE_STAT_ORDER.forEach((stat, statIndex) => {
	const base = FAILURE_BASE + statIndex * FAILURE_VARIANTS_PER_POOL;
	const cases = CONTENT_FAILURE_ENDINGS[stat].map((v, i) =>
		`\t\t(case ${base + i} return("${descText(v.desc)}"))`
	);
	writeCategoryFile({
		filename: `CaseFileDescriptionsFailure${statIndex}.sc`,
		scriptConst: `CASEFILEDESCRIPTIONS_FAILURE${statIndex}_SCRIPT`,
		procName: `CaseFileDescriptionFailure${statIndex}`,
		cases,
		categoryLabel: `Failure ending (${stat})`,
		rangeLabel: `${base}-${base + FAILURE_VARIANTS_PER_POOL - 1}`,
	});
});

// --- Coping mechanisms (102-106) ---
const mechCases = MECH_TAG_ORDER.map((tag, i) =>
	`\t\t(case ${MECH_BASE + i} return("${descText(CONTENT_MECHANISMS[tag].desc)}"))`
);
writeCategoryFile({
	filename: 'CaseFileDescriptionsMechanisms.sc',
	scriptConst: 'CASEFILEDESCRIPTIONS_MECHANISMS_SCRIPT',
	procName: 'CaseFileDescriptionMechanisms',
	cases: mechCases,
	categoryLabel: 'Coping mechanism',
	rangeLabel: `${MECH_BASE}-${MECH_BASE + MECH_TAG_ORDER.length - 1}`,
});
