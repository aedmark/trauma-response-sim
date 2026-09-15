#!/usr/bin/env node
// Generates TRS_SCI/src/endingcontent*.sc from the original browser game's
// js/content-endings.js -- the full ending-variant pools (9 survival pools
// x 8 variants + 3 failure pools x 10 variants = 102 total), replacing the
// SCI0 port's earlier one-variant-per-pool scope cut.
//
// Each PrintSurvivalEndingN()/PrintFailureEndingN() procedure picks a
// random variant, prints its title+desc, and marks the corresponding flat
// Case Files slot -- see game.sh for the full index scheme
// (CASEFILE_COUNT/CASEFILE_MECH_BASE/CASEFILE_NGPLUS) and
// SESSION_HANDOFF.md for why the announcement's title is duplicated inline
// per case rather than looked up from a shared helper (this codebase's own
// established "duplicate short strings, don't share across scripts"
// precedent -- avoids a new cross-script (use ...) pair with casefiles.sc
// for no real benefit).
//
// rm002.sc calls these directly; it does NOT need any new title-lookup
// call -- CaseFiles.sc's own CaseFileTitle() switch is extended separately
// (by hand, following this same generator's SURVIVAL_BASES/FAILURE_BASES
// layout) to cover all 102 variants for the Case Files viewer, matching
// how it already covers the 5 mechanism titles.
'use strict';
const fs = require('fs');
const path = require('path');
const { sciString } = require('./lib/sci-string');
const { sciSrcDir } = require('./lib/sci-paths');

const repoRoot = path.resolve(__dirname, '..');
const srcJsPath = path.join(repoRoot, 'js/content-endings.js');
const outDir = sciSrcDir;

const src = fs.readFileSync(srcJsPath, 'utf8');
const { CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS } = new Function(
	src + '\nreturn {CONTENT_FAILURE_ENDINGS, CONTENT_ENDINGS};'
)();

// Flat Case Files index bases -- MUST match game.sh's CASEFILE_MECH_BASE
// (102) and CASEFILE_NGPLUS (107) exactly. Survival pools 0-8 get 8 slots
// each (0-71); failure pools get 10 slots each, in repression/mask/child
// order (72-101).
const SURVIVAL_VARIANTS_PER_POOL = 8;
const FAILURE_VARIANTS_PER_POOL = 10;
const SURVIVAL_BASE = 0;
const FAILURE_BASE = SURVIVAL_BASE + CONTENT_ENDINGS.length * SURVIVAL_VARIANTS_PER_POOL; // 72
const FAILURE_STAT_ORDER = ['repression', 'mask', 'child'];

if (CONTENT_ENDINGS.length !== 9) {
	throw new Error(`expected 9 survival pools, found ${CONTENT_ENDINGS.length} -- update SURVIVAL_VARIANTS_PER_POOL/game.sh's index scheme if this is intentional`);
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

// sciString() correctly, deliberately rejects embedded literal double
// quotes -- there's no way to escape one inside a ""-delimited SCI0
// string (confirmed the hard way earlier in this project, see
// SESSION_HANDOFF.md's mechanisms.sc entry). One ending description has
// exactly one such case ("...how \"fine\" you are..."). Rather than
// editing js/content-endings.js (shared with the browser version, whose
// HTML rendering has no such restriction) or softening sciString's own
// check for every caller, transliterate straight double quotes to single
// quotes here, specific to this generator -- preserves the emphasis/
// scare-quote intent (unlike just dropping them, mechanisms.sc's original
// manual fix for a similar case) while staying SCI0-safe.
function endingText(s) {
	return sciString(s.replace(/"/g, "'"));
}

function genVariantCase(variantIndex, flatIndex, title, desc) {
	const t = endingText(title);
	const d = endingText(desc);
	return `\t\t(case ${variantIndex}\n` +
		`\t\t\tPrint("${d}" #title "${t}")\n` +
		`\t\t\t(if(MarkCaseFile(${flatIndex}))\n` +
		`\t\t\t\tPrint("Case Files: ${t}, filed." #title "New Case File")\n` +
		`\t\t\t)\n` +
		`\t\t)`;
}

function genSurvivalProc(poolIndex, pool) {
	const base = SURVIVAL_BASE + poolIndex * SURVIVAL_VARIANTS_PER_POOL;
	const cases = pool.variants
		.map((v, i) => genVariantCase(i, base + i, v.title, v.desc))
		.join('\n');
	return `(procedure public (PrintSurvivalEnding${poolIndex})\n` +
		`\t(var variantIndex)\n` +
		`\t= variantIndex Random(0 ${SURVIVAL_VARIANTS_PER_POOL - 1})\n` +
		`\t(switch(variantIndex)\n${cases}\n\t)\n)`;
}

function genFailureProc(statIndex, stat) {
	const base = FAILURE_BASE + statIndex * FAILURE_VARIANTS_PER_POOL;
	const variants = CONTENT_FAILURE_ENDINGS[stat];
	const cases = variants
		.map((v, i) => genVariantCase(i, base + i, v.title, v.desc))
		.join('\n');
	return `(procedure public (PrintFailureEnding${statIndex})\n` +
		`\t(var variantIndex)\n` +
		`\t= variantIndex Random(0 ${FAILURE_VARIANTS_PER_POOL - 1})\n` +
		`\t(switch(variantIndex)\n${cases}\n\t)\n)`;
}

function fileHeader(filename, scriptConst, description) {
	return `/******************************************************************************\n` +
		` T.R.S. → SCI0 port\n` +
		` ******************************************************************************\n` +
		` ${filename}\n` +
		` GENERATED FILE — do not hand-edit. Produced by tools/gen-endings.js from\n` +
		` js/content-endings.js. Re-run that script after editing the source data.\n\n` +
		` ${description}\n` +
		` ******************************************************************************/\n` +
		`(include "sci.sh")\n(include "game.sh")\n` +
		`/******************************************************************************/\n` +
		`(script ${scriptConst})\n` +
		`/******************************************************************************/\n` +
		`(use "main")\n(use "controls")\n(use "casefiles")\n` +
		`/******************************************************************************/\n`;
}

// One file per POOL, not bundled 4-5-at-a-time like the original
// endingcontent1/2/3.sc split -- real heap-exhaustion bug, confirmed via
// debug instrumentation (see SESSION_HANDOFF.md): rm002.sc's
// printEnding()/printSurvivalEnding() only ever calls exactly ONE
// PrintSurvivalEndingN()/PrintFailureEndingN() per ending shown, picked by
// a stat-threshold check, but the old bundling meant Load()ing that one
// procedure dragged in 4-5 OTHER pools' worth of dead bytecode too (each
// bundle was ~9.1-11.9KB -- bigger than the WORK-zone chunks were before
// THEIR bundling got split for the exact same reason). On top of that,
// MarkCaseFile() (called from inside the variant case, while this chunk
// is still resident) does its OWN nested Load/DisposeScript of
// CASEFILEACCESS_SCRIPT -- a real run confirmed reaching turn 10 cleanly
// (per-turn heap holding steady around 7000-9000 free) and then hitting
// "Out of heap space" right after the ending card printed, once the run
// naturally ended and this code path finally got exercised for the first
// time under the new, smaller per-turn heap budget. One file per pool
// means loading an ending now costs roughly 1/5th to 1/4th as much.
function poolFileName(kind, index) {
	return `ending${kind}${index}`;
}
function poolScriptConst(kind, index) {
	return `ENDING${kind.toUpperCase()}${index}_SCRIPT`;
}

const survivalFiles = [];
CONTENT_ENDINGS.forEach((pool, i) => {
	const filename = poolFileName('survival', i);
	const scriptConst = poolScriptConst('survival', i);
	const base = SURVIVAL_BASE + i * SURVIVAL_VARIANTS_PER_POOL;
	const src = fileHeader(`${filename}.sc`, scriptConst, `Survival ending pool ${i} (8 variants), matching CONTENT_ENDINGS[${i}] in js/content-endings.js. Flat Case Files indices ${base}-${base + SURVIVAL_VARIANTS_PER_POOL - 1} -- see game.sh.`) +
		genSurvivalProc(i, pool) +
		'\n/******************************************************************************/\n';
	fs.writeFileSync(path.join(outDir, `${filename}.sc`), src);
	console.log(`Wrote survival ending ${i} (${src.length} bytes) to TRS_SCI/src/${filename}.sc`);
	survivalFiles.push({ filename, scriptConst, index: i });
});

const failureFiles = [];
FAILURE_STAT_ORDER.forEach((stat, i) => {
	const filename = poolFileName('failure', i);
	const scriptConst = poolScriptConst('failure', i);
	const base = FAILURE_BASE + i * FAILURE_VARIANTS_PER_POOL;
	const src = fileHeader(`${filename}.sc`, scriptConst, `Failure ending pool (${stat}, 10 variants), matching CONTENT_FAILURE_ENDINGS.${stat} in js/content-endings.js. Flat Case Files indices ${base}-${base + FAILURE_VARIANTS_PER_POOL - 1} -- see game.sh.`) +
		genFailureProc(i, stat) +
		'\n/******************************************************************************/\n';
	fs.writeFileSync(path.join(outDir, `${filename}.sc`), src);
	console.log(`Wrote failure ending ${i} (${stat}, ${src.length} bytes) to TRS_SCI/src/${filename}.sc`);
	failureFiles.push({ filename, scriptConst, index: i, stat });
});

console.log(`\ngame.sh #defines needed:`);
[...survivalFiles, ...failureFiles].forEach(f => console.log(`  (define ${f.scriptConst}\t<pick a free number>)`));

console.log(`\nFlat index layout:`);
CONTENT_ENDINGS.forEach((pool, i) => {
	const base = SURVIVAL_BASE + i * SURVIVAL_VARIANTS_PER_POOL;
	console.log(`  PrintSurvivalEnding${i}: indices ${base}-${base + SURVIVAL_VARIANTS_PER_POOL - 1}`);
});
FAILURE_STAT_ORDER.forEach((stat, i) => {
	const base = FAILURE_BASE + i * FAILURE_VARIANTS_PER_POOL;
	console.log(`  PrintFailureEnding${i} (${stat}): indices ${base}-${base + FAILURE_VARIANTS_PER_POOL - 1}`);
});
console.log(`  Next free index (CASEFILE_MECH_BASE): ${FAILURE_BASE + 3 * FAILURE_VARIANTS_PER_POOL}`);
