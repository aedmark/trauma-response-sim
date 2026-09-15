// Shared generator for T.R.S. zone-event content pipelines (WORK, HOME, and
// whatever zone comes next). Reads a zone's original browser-game event
// data (js/events/<zone>.js) and generates SCI0 source implementing each
// event as its own ROOM, using PrintChoices (TRS_SCI/src/printchoices.sc)
// for the choice dialog and ApplyChoiceEffects/ApplyGlitch
// (TRS_SCI/src/mechanisms.sc) for stat effects.
//
// One room per event (see game.sh and SESSION_HANDOFF.md for the full
// history): this replaces an earlier design where each zone was a
// dispatcher script Load()ing/DisposeScript()ing shared "chunk" scripts of
// ~8-9 events each. That worked well enough to get far into a run, but hit
// a wall that splitting chunks smaller (this file used to have a
// CHUNK_COUNT knob, 4 -> 8 at one point) could reduce but never eliminate:
// real SCI0 heap fragmentation, confirmed via debug instrumentation -- the
// identical Load-chunk/use-it/DisposeScript cycle sometimes fully
// reclaimed its memory and sometimes didn't, for reasons that didn't
// correlate cleanly with chunk size or call order. One room per event
// sidesteps it entirely: the engine's own native room-transition cleanup
// replaces every hand-rolled Load/DisposeScript pair, and only ONE room's
// content is ever resident at a time.
//
// Extracted from the original WORK-only generator so new zones don't
// duplicate ~230 lines of logic. Each zone gets its own thin entry script
// (tools/gen-<zone>-events.js) that just calls generateZoneEvents(opts).
'use strict';
const fs = require('fs');
const path = require('path');
const { sciString } = require('./sci-string');
const { sciSrcDir } = require('./sci-paths');

const DESC_WIDTH = 290; // DText width (px) passed to PrintChoices; kernel TextSize() wraps within it, so widening is safe as long as it stays under the 320px screen (DText starts at x=4)

const TAG_CONSTANTS = { fawn: 'TAG_FAWN', flight: 'TAG_FLIGHT', fight: 'TAG_FIGHT', freeze: 'TAG_FREEZE', secure: 'TAG_SECURE' };

function signedDelta(effect) {
	return effect.op === 'add' ? effect.value : -effect.value;
}

function genEventRoom(opts, roomNum, globalIndex, event) {
	const { zoneLabel, genScriptName, srcJsRelPath } = opts;
	const desc = sciString(event.desc);
	const title = sciString(event.title);
	const glitchText = sciString(event.glitch.text);
	const glitchLog = sciString(event.glitch.log);
	// All of the event's authored choices (3-5, matching the original) --
	// PrintChoices itself now paginates at CHOICES_PER_PAGE (game.sh)
	// instead of the generator capping how many exist at all.
	const choices = event.choices;

	// No pre-wrapping here -- PrintChoices' own SizeButtonToWidth
	// (printchoices.sc) wraps button text at render time using the actual
	// font metrics via TextSize(), the same mechanism the description text
	// has always used, instead of a fixed character-per-line guess that
	// ignored the button's real rendered width.
	const choiceParams = choices
		.map((c, i) => `\t\t"${sciString(c.text)}" ${i}`)
		.join('\n');

	const cases = choices
		.map((c, i) => {
			const rep = signedDelta(c.effects.rep);
			const mask = signedDelta(c.effects.mask);
			const child = signedDelta(c.effects.child);
			const tag = TAG_CONSTANTS[c.tag];
			return `\t\t(case ${i}\n\t\t\tApplyChoiceEffects(${rep} ${mask} ${child} ${tag})\n\t\t\tPrint("${sciString(c.log)}")\n\t\t)`;
		})
		.join('\n');

	return `/******************************************************************************
 T.R.S. → SCI0 port
 ******************************************************************************
 rm${roomNum}.sc
 GENERATED FILE — do not hand-edit. Produced by tools/${genScriptName} from
 ${srcJsRelPath} (${zoneLabel} event ${globalIndex}).

 One room per event -- this room IS the event: shows its PrintChoices
 dialog, applies the effects, then hands off via EndTurn() to the next
 room. No custom RoomScript needed (ego is hidden/program-controlled).
 ******************************************************************************/
(include "sci.sh")
(include "game.sh")
/******************************************************************************/
(script ${roomNum})
/******************************************************************************/
(use "main")
(use "controls")
(use "cycle")
(use "game")
(use "feature")
(use "obj")
(use "inv")
(use "printchoices")
(use "mechanisms")
/******************************************************************************/
(instance public rm${roomNum} of Rm
	(properties
		picture 1
		north 0
		east 0
		south 0
		west 0
	)
	(method (init)
		(var choice, glitchText)
		(super:init())
		SetUpEgo()
		(send gEgo:init())
		ProgramControl()
		(send gEgo:hide())
		= glitchText NULL
		(if(< Random(0 99) GLITCH_CHANCE_PCT)
			= glitchText "${glitchText}"
		)
		= choice PrintChoices(
			"${desc}"
			"${title}"
			${DESC_WIDTH}
			glitchText
${choiceParams}
		)
		(if(== choice GLITCH_CHOICE)
			ApplyGlitch("${glitchLog}")
		)(else
			(switch(choice)
${cases}
			)
		)
		EndTurn()
	)
)
/******************************************************************************/
`;
}

/**
 * @param {object} opts
 * @param {string} opts.repoRoot - absolute path to the repo root
 * @param {string} opts.srcJsRelPath - path to js/events/<zone>.js, relative to repoRoot
 * @param {string} opts.srcJsGlobal - the global CONTENT_EVENTS_<ZONE> array name in that file
 * @param {string} opts.genScriptName - this zone's tools/gen-<zone>-events.js, for generated-file headers
 * @param {string} opts.zoneLabel - human label for comments, e.g. "WORK" / "HOME"
 * @param {number} opts.roomBase - first room number for this zone (must match game.sh's <ZONE>_ROOM_BASE exactly)
 */
function generateZoneEvents(opts) {
	const srcJsPath = path.join(opts.repoRoot, opts.srcJsRelPath);
	const outDir = sciSrcDir;

	const src = fs.readFileSync(srcJsPath, 'utf8');
	const events = new Function(src + `\nreturn ${opts.srcJsGlobal};`)();

	events.forEach((event, i) => {
		const roomNum = opts.roomBase + i;
		const out = genEventRoom(opts, roomNum, i, event);
		const outPath = path.join(outDir, `rm${roomNum}.sc`);
		fs.writeFileSync(outPath, out);
		console.log(`Wrote ${opts.zoneLabel} event ${i} (${out.length} bytes) to TRS_SCI/src/rm${roomNum}.sc`);
	});

	console.log(`\n${opts.zoneLabel}: ${events.length} events -> rooms ${opts.roomBase}-${opts.roomBase + events.length - 1}`);

	return { eventCount: events.length, roomRange: [opts.roomBase, opts.roomBase + events.length - 1] };
}

module.exports = { generateZoneEvents };
