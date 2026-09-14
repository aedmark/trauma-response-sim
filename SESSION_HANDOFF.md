# Session handoff: T.R.S. → SCI0 port

Paste this into a fresh context window to resume. This is a cleaned-up
rewrite (previous version had grown to 3500+ lines of blow-by-blow
debugging history) written at a real milestone: the full six-zone port,
the heap-exhaustion architecture rewrite, the Case Files viewer, and all
the smaller systems are built and confirmed working. The old file's full
history (every bug found and how, every dead end tried) is still in git
history (`git log -- SESSION_HANDOFF.md`) if a specific past incident
ever needs re-reading in detail — this version keeps only what's still
true and still useful going forward.

**Also done since the rewrite above**: comments across the `.sc` source
(and the generator templates in `tools/`) were trimmed for shipping --
they'd accumulated a lot of debugging-narrative detail (references to
this file, "confirmed via the user's own playtest," etc.) that was
useful mid-production but is noise now. What/how/why is kept, the
narrative isn't. `TRS_SCI/src/game.sh` and the hand-written core scripts
(`CaseFiles.sc`, `mechanisms.sc`, `printchoices.sc`, `rm001.sc`,
`rm002.sc`, `CaseFileAccess.sc`, `CaseFileTitles.sc`) were edited
directly; the 196 generated event rooms and the 3 generated Case File
description scripts were fixed at the generator level
(`tools/lib/zone-events.js`, `tools/gen-casefile-descriptions.js`) and
regenerated, not hand-edited. All 247 `.sc` files still pass a
structural sanity check (balanced parens outside strings, paired
quotes) after the pass.

## What this is

Porting "Trauma Response Simulator" (T.R.S.), a browser stat-management
choice game living in `/home/gordonk/WebstormProjects/trauma-response-sim`
(see its `README.md`/`AUTHORING.md`/`js/` for the full original design),
to **Sierra's SCI0 engine** (King's Quest IV / Space Quest III era,
1988-90, 320x200 EGA) as a genuine, real, compilable game — not a
stylistic reskin. Interaction is menu/dialog choice lists (Sierra's
dialogue-tree convention), not the classic text parser. Tone is
in-universe pastiche, played completely straight, as if Sierra genuinely
shipped this in 1990.

## Current state — what's actually built and confirmed working

**All six zones of the original browser game are ported**: WORK (34
events), HOME (32), SOCIAL (33), SELF (33), BODY (32), PUBLIC (32) — 196
events total. Each event is its own SCI0 room (see Architecture below),
reached via `mechanisms.sc`'s `GoToNextEvent()`, which weights zone
selection toward whichever of Repression/Mask/Child is currently worst
(matching the original's `weakZoneWeight`) and avoids repeating an event
already seen in the current run (`gSeenEvent[196]`, reset per-run,
bounded retry loop rather than the original's exact 3-tier fallback —
see `game.sh` for why that simplification is safe).

**Turn loop**: each event room's `init()` shows a `PrintChoices` dialog
(all of the event's authored choices, 3-5 matching the original exactly
— see "Full choice counts restored" below — plus a ~15% chance extra
"glitch" wildcard choice with fully randomized, untagged effects),
applies the choice's effects via `mechanisms.sc`'s `ApplyChoiceEffects`
(which also layers in any unlocked coping-mechanism modifier), then
calls `EndTurn()` — increments the turn counter, clamps stats to
[0,100], and either ends the run (any stat hits its failure bound, or
`gTurn` exceeds `gMaxTurns`) or picks the next event.

**Full choice counts restored — compiled, playtested, confirmed
working.** `MAX_CHOICES=3`
(a heap-safety scope cut from before the one-room-per-event rewrite) was
removed — checked the original source first rather than assuming: 42 of
196 events have exactly 3 choices, 150 have 4, 4 have 5 (the cap was
silencing a choice on 154/196 events, 78.6%). Two other cuts flagged in
the same category — zone-weighting "scaled to integers" and the
no-repeat pool's simplified fallback — turned out to already be
faithful once checked against `js/engine.js` directly (the zone-weight
ratio already exactly matches `weakZoneWeight`'s 2.5:1, and the
retry-based no-repeat pool is rejection sampling from the same
distribution the original's explicit filter computes); neither was
touched. `PrintChoices` (`printchoices.sc`) now paginates at
`CHOICES_PER_PAGE`(3) choices per screen: a "More options..."
(`MORE_CHOICES` sentinel) button on every page but the last, and a
"Back" (`BACK_CHOICES` sentinel) button on every page but the first --
the user specifically asked for the ability to return to an earlier
page rather than being locked into forward-only paging. No single
screen ever shows more than 4 buttons (3 choices + one nav/glitch
button) across any real event's actual data (verified: max is 5 choices
→ 2 pages, and page 2's worst case is Back + 2 remaining choices +
glitch = 4) — see Architecture below for why (dialog height, not heap,
was the real constraint) and Open Items for what still needs a real
playtest pass.

**Coping mechanisms**: 5 tags (fawn/flight/fight/freeze/secure, matching
`js/content-mechanisms.js`), each unlocking permanently after 3 uses of
that tag in one run (`UNLOCK_THRESHOLD`), after which every further
choice of that tag also applies a passive stat modifier on top of its
own effect, for the rest of the run (and future runs, once unlocked —
mechanism unlock state itself does NOT reset per-run, only the
progress-toward-unlock counters do).

**Endings — full variant port, not the original one-per-condition scope
cut**: 9 survival-condition pools × 8 variants each, 3 failure-condition
pools (by which stat bottomed out) × 10 variants each = 102 total ending
variants, each tracked individually in Case Files (matches the original
browser game's actual "collect every ending you've ever seen" mechanic).
Picked and printed by `rm002.sc`'s `printEnding()`/`printSurvivalEnding()`
via one `PrintSurvivalEndingN()`/`PrintFailureEndingN()` procedure per
pool (`tools/gen-endings.js`-generated).

**Case Files** — the persistent, cross-run discovery record (matches
`README.md`'s own description) — is fully built out: a category menu
(Survival Endings / Failure Endings / Coping Mechanisms, matching the
original's own `js/codex.js` grouping) opens a scrollable per-category
list; selecting a discovered entry and clicking "View" shows its full
title+description, a sealed entry shows "Sealed. Not yet discovered."
Persists cross-session to `TRS_SCI/TRSCASE.DAT`. Reachable via the
"Case Files" menu item (`` `^f ``) or by clicking the filing cabinet in
the ending room. **Confirmed fully working end to end**, including a
real "Out of heap space" bug on its "View" feature that took two rounds
to actually fix (see Architecture → Load/Dispose discipline below for
the current, confirmed-working shape of it).

**Extended Therapy (New Game+)**: matches the original's real, existing
feature under that name (not invented for this port) — survive one
standard run and it unlocks permanently (tracked as a hidden 108th Case
Files slot); every future run then offers a Standard (10 turns) vs.
Extended Therapy (20 turns, every stat swing scaled ×1.25, including
mechanism modifiers and the glitch wildcard) choice at `rm001.sc`'s
`init()`. Confirmed working end to end, including a full 20-turn run.

**Player portrait — now selectable, 4 options.** Shown inside the
`PrintChoices` dialog itself (a `DIcon`, not a room-background draw) via
`mechanisms.sc`'s `GetPortraitMood()`/`PortraitViewForIndex()`, 4 mood
loops per option (neutral/repression/mask/child, switching away from
neutral once the worst stat's danger value crosses
`PORTRAIT_NEUTRAL_THRESHOLD`=60). `PORTRAIT_VIEW_0..3` (801-804, game.sh)
— one full mood set per option, `gPortraitChoice` (Main.sc) holds which
one, chosen fresh every run via `PromptPortraitChoice()`
(printchoices.sc) at the same point `rm001.sc` asks the Extended Therapy
question. Placeholder art is fixed at 80x60, which is too tall to stack
4-high on the 200px screen the way `PrintChoices` stacks text buttons —
the picker instead lays 2 options per page out horizontally, paginated
with the same More/Back buttons `PrintChoices` uses. **Confirmed working
by the user.** Real art (beyond placeholders) not yet done.

**Case Files review for returning players**: `rm001.sc`'s per-run setup
now also offers "review your case files before starting a new session?"
(Yes/No, `TEXT_UI` entries 16-19) gated on `gNgPlusUnlocked` — the same
signal already used for the Extended Therapy choice, i.e. "has survived
a run before," not "has ever launched the game." Reuses
`ShowCaseFiles()`/`ShowCaseFileCategory()` verbatim, same two-stage
Load/Dispose sequence menubar.sc's menu item and rm002.sc's filing
cabinet already used.

**Player name (optional) and Reset All Data — confirmed working.**
Matches the original's "remembered for next time" name field and
"⚠ Reset All Data" control. `mechanisms.sc` owns `SetPlayerName`/
`GetPlayerName` (persisted to their own `TRSNAME.DAT`, lazily loaded on
first access rather than a boot-time call from `Main.sc` — deliberately,
to avoid a brand-new circular `(use ...)` pair with `Main.sc` that
couldn't be test-compiled ahead of time). `rm001.sc` prompts for a name
only when none is stored yet (not every run) via `PromptPlayerName`
(`PlayerNamePrompt.sc`); `rm002.sc` prints "Played by X" on the ending
screen, skipped if blank. `menubar.sc`'s new "Reset Data" File-menu item
(confirm-gated like Restart/Quit already were) calls `CaseFiles.sc`'s
new `ResetAllData()` (zeroes all 108 Case Files slots, which also covers
the Extended Therapy unlock since it rides the same array) and blanks
the player name. `PromptPlayerName` is deliberately its own Load/Dispose-
scoped script, not living in the always-resident `printchoices.sc` where
it was first written — see the heap-fragmentation entry right below for
why that distinction turned out to matter a lot more than it looked.

**Case Files "View" heap-fragmentation guard — real regression this
session, fully root-caused and fixed, confirmed by the user on a fresh
save.** The original guard (below) was already in place and had been
reported working. Adding the player-name feature reopened it: a single
10-round run on a brand-new save started reliably crashing with a raw
"Out of heap space" fault trying to view *any* Case File — even Coping
Mechanisms, a ~1.8KB file, which ruled out "description text too big" as
the cause on its own. Root causes, found in order (each one a real fix,
not a threshold tweak):
1. `PromptPlayerName` (a full `Dialog`+`DText`+`DEdit`+`DButton` build)
   had been added to `printchoices.sc`, which is permanently resident —
   so its code size cost heap for the entire session, not just the one
   moment (once, ever, until Reset Data) it's actually needed. Moved to
   its own Load/Dispose-scoped `PlayerNamePrompt.sc`.
2. The original guard's `CASEFILE_VIEW_MIN_HEAP` (4096) was checked
   against real hardware readings and found to mean nothing next to
   reality: `CaseFileDescriptionsSurvival.sc` — all 72 survival variants
   in one script — compiled to **7.24KB**, comfortably bigger than any
   single contiguous free block this dialect's fragmentation reliably
   leaves after real play, regardless of what the threshold said. Fixed
   the same way the ending-print scripts already were: `tools/gen-
   casefile-descriptions.js` now emits one script per POOL (`CaseFile
   DescriptionsSurvival0-8.sc`, `Failure0-2.sc`, ~2KB each) instead of
   one per whole category. `CaseFileCategory.sc`'s "View" handler picks
   the right one via `localIndex / CASEFILE_SURVIVAL_POOL_SIZE` (or
   `_FAILURE_POOL_SIZE`, game.sh).
3. Even after (2), a fresh save still crashed — this time before "View"
   was even clickable, opening the category *list*. The per-pool
   dispatch `switch` from fix (2) had been written directly inside
   `CaseFileCategory.sc`, which — same mistake as (1) — stays resident
   for the *entire* time a category list is open (loaded once by the
   caller, disposed only when the list closes), so a 12-branch dispatch
   switch living there permanently inflated that whole-session
   footprint. Moved to its own `CaseFileDescriptionDispatch.sc`,
   Load/Dispose-scoped tightly around just the instant of a View click.
4. Still not quite enough margin: `CaseFileCategory.sc`'s own
   script-level `buf` array was declared `[3424]` when the file's own
   comment already said it only ever needs `2304` (`72*32`, the biggest
   category) — 1120 bytes of pure waste on every single load, for
   nothing. Shrunk to fit exactly.

Diagnosis method worth remembering: **Alt+M (`Main.sc`'s built-in
`MemoryInfo` debug hotkey) doesn't work once a modal dialog has input
focus** — it's genuinely useless for reading heap state mid-crash inside
a `Dialog:doit()` loop, which is exactly when you need it most. Real fix
was temporary inline `Format()`+`Print()` calls dropped directly into
the suspect code path (heap numbers shown as a plain message box, which
fires in the normal flow with no keypress needed) at each checkpoint —
this is what actually pinpointed all four causes above, in successive
rounds, rather than guessing at threshold numbers. All temporary debug
prints have been removed now that this is confirmed fixed.
`CASEFILE_VIEW_MIN_HEAP` (4096) is unchanged and still just a guard
against genuine cross-run/cross-session fragmentation (the original
report's actual repro, 10-turn then 20-turn run back to back) — that
part was never disproven, just insufficient on its own against the
regressions above.

**Stat display**: the status line (always visible, including over an
open dialog) shows live percentages — `T.R.S.    REP: 40 % | MASK: 60 % |
CHILD: 60 %`. (Bar-graph gauge visuals were tried and reverted twice —
see Findings below for the actual dialect-level bug that kept breaking
them — the numeric-percent format is the final, shipped form.)

**Clickable office objects** (ending room, `rm002.sc`): the filing
cabinet opens Case Files, the computer starts a fresh run
(`newRoom(INITROOMS_SCRIPT)` + a manual per-run stat/mechanism reset in
`rm001.sc`'s `init()` — deliberately not a full kernel `RestartGame()`).
Both hit-tested via hand-estimated screenshot rectangles
(`CABINET_X1/Y1/X2/Y2`, `COMPUTER_X1/Y1/X2/Y2` in `game.sh`) — confirmed
working, rectangles never needed adjustment.

**Background music**: a General MIDI driver (`gm.drv`) is wired up and a
real MIDI file has been imported into sound resource 3 (`n003=BGM`),
looping continuously via `rm001.sc`. **Still has an open, unresolved
audio-fidelity issue** — see Open Items below.

## Architecture reference

**One room per event** — the single biggest structural fact about this
codebase. There is no more per-zone dispatcher+chunk system; each of the
196 events is its own SCI0 room, numbers 200-395:

| Zone | Room range | Event count |
|---|---|---|
| WORK | 200-233 | 34 |
| HOME | 234-265 | 32 |
| SOCIAL | 266-298 | 33 |
| SELF | 299-331 | 33 |
| BODY | 332-363 | 32 |
| PUBLIC | 364-395 | 32 |

A room number is `<ZONE>_ROOM_BASE + localIndex` (`game.sh`). This
replaced an earlier dispatcher-script-plus-loaded-chunk design after a
genuine, confirmed SCI0 heap-fragmentation problem (the same
load/use/dispose cycle sometimes fully reclaimed memory and sometimes
didn't, uncorrelated with anything in the game's own code — see Findings
below for the general lesson). The engine's own native room-transition
cleanup now handles all of that automatically; only one room's content
is ever resident at a time.

**Load/Dispose discipline** — every script in this codebase is one of
two kinds, and mixing them up is the single most common source of real
bugs this project has hit:
- **Permanently resident** (loaded once, never disposed): `Main.sc`(0),
  `Controls.sc`, other stock always-on scripts, `PrintChoices.sc`(100),
  `Mechanisms.sc`(106). These are small and called every turn/frequently
  enough that Load/Dispose churn isn't worth it.
- **Load/Dispose-scoped** (loaded right before use, disposed right
  after, every call site): `CaseFiles.sc`(107), `CaseFileAccess.sc`(136),
  `CaseFileTitles.sc`(137), `CaseFileDescriptionsMechanisms.sc`(140),
  `CaseFileCategory.sc`(141), `PlayerNamePrompt.sc`(142),
  `CaseFileDescriptionsSurvival0-8.sc`(143-151),
  `CaseFileDescriptionsFailure0-2.sc`(152-154),
  `CaseFileDescriptionDispatch.sc`(155), all 12 `EndingSurvivalN`/
  `EndingFailureN` scripts (162-173). Survival/Failure descriptions are
  one script per POOL, not one per whole category, and the pool-dispatch
  logic itself lives in its own tiny script rather than inline in
  `CaseFileCategory.sc` -- see the heap-fragmentation entry above
  ("Case Files 'View' heap-fragmentation guard") for why both of those
  splits turned out to matter, not just be tidy. `CaseFiles.sc`
  (the category menu + persistence) and `CaseFileCategory.sc` (the
  actual per-category browsing/View screen) are never resident at the
  same time -- `ShowCaseFiles()` returns which category was picked
  instead of dispatching internally, so callers (`menubar.sc`,
  `rm002.sc`) Dispose one before Loading the other. These are only
  needed in brief, infrequent moments
  (opening Case Files, printing one ending) and would otherwise sit as
  dead weight in the 64KB heap for the whole session.
  **Confirmed working, including the lesson that mattered most**: even
  with everything above split correctly, a "View" click still hit "Out
  of heap space" until the number of Load/Dispose cycles per click (not
  just their size) was cut down -- this dialect's Load/DisposeScript
  cycling doesn't reliably reclaim memory (same root cause as the
  original one-room-per-event rewrite). `ShowCaseFileCategory()`
  (`CaseFileCategory.sc`) now does exactly ONE cycle per "View" click
  (whichever description script matches the open category) instead of
  three, by caching the discovered-flag and title text from its own
  list-building loop instead of re-fetching them via
  `CaseFileAccess`/`CaseFileTitles` reloads. **Confirmed fixed by the
  user.** Worth remembering for any future Load/Dispose-heavy feature:
  minimize the *count* of cycles, not just their size.

  **`(use "x")` only resolves symbols at compile time — it has zero
  runtime effect.** A script gets auto-loaded into the heap the first
  time any of its public procedures is called from a script that isn't
  already resident, but nothing ever auto-unloads it. Any new call site
  into a Load/Dispose-scoped script needs its own explicit
  `Load(rsSCRIPT X)`/`DisposeScript(X)` pair — there is no way to get
  this for free, and forgetting it is the single most common way heap
  problems have recurred throughout this project.

**Case Files flat index scheme** (`game.sh`, `CASEFILE_COUNT`=108):
- `0-71`: 9 survival pools × 8 variants (pool N = indices `N*8..N*8+7`)
- `72-101`: 3 failure pools × 10 variants, repression/mask/child order
  (pool N = indices `72+N*10..72+N*10+9`)
- `102-106`: the 5 coping mechanisms, `TAG_FAWN..TAG_SECURE` order,
  offset by `CASEFILE_MECH_BASE`(102)
- `107`: Extended Therapy unlock flag (`CASEFILE_NGPLUS`) — not a real
  case file, rides on this same array purely because it's the one
  proven persistence mechanism in this codebase. `VIEWABLE_CASEFILE_COUNT`
  (107) keeps the viewer from showing it as a bogus 108th entry.
- Backed by 108 separate scalar globals (`gCF0..gCF107` in `Main.sc`),
  **not an array** — a global array declared in `Main.sc` isn't visible
  from another script the way scalars are (see Findings below).
  `GetCaseFile`/`SetCaseFile` (`CaseFileAccess.sc`) give array-like
  access over them.

**Key files**:
- `Main.sc`(0) — globals (`gRepression`/`gMask`/`gChild` start at
  40/60/60; `gTurn`/`gMaxTurns`; `gHardMode`/`gNgPlusUnlocked`;
  `gCF0..gCF107`; the 5 mechanism count/unlocked pairs), the status
  line, boot-time `LoadCaseFiles()`.
- `mechanisms.sc`(106, always resident) — `ApplyChoiceEffects`/
  `ApplyGlitch` (mechanism unlock + modifier logic), `PickZone`/
  `ZoneStatBias`/`GoToNextEvent`/`ResetSeenEvents`/`EndTurn` (turn loop
  and zone/event selection), `GetPortraitMood`.
- `printchoices.sc`(100, always resident) — `PrintChoices`, the vertical
  stacked-`DButton` dialog every event uses instead of stock `Print()`'s
  broken-for-long-text horizontal button row. Paginates internally at
  `CHOICES_PER_PAGE` (3) choices per screen for events with more than
  that many ("More options..." leads forward, "Back" leads back, neither
  shown on the page where it wouldn't apply) — this is why events can
  have 3-5 real choices without a dialog-height risk: every page tops
  out at 4 buttons (3 choices + one nav/glitch button) regardless of an
  event's total choice count, the same ceiling already proven safe.
  Callers (the 196 generated event rooms) are unaware of
  pagination at all — same call shape, same return contract (a real
  choice index or `GLITCH_CHOICE`) as before.

**Fixed UI text lives in a TEXT resource, not string literals — confirmed
working.** `TEXT_UI` (resource 0, `game.sh`), read via the kernel
`GetFarText(resNum textId buffer)` call. This is real, period-accurate
SCI0 practice (SCI Companion's own docs: text resources "reduce the size
of your compiled scripts... heap space is at a premium in SCI0"), applied
narrowly: only `CaseFiles.sc`'s category menu, `CaseFileCategory.sc`'s
prompt/View/Close/sealed-message text, and `rm001.sc`'s Extended Therapy
mode-choice dialog — the small, fixed, hand-typed-once set of UI chrome.
Deliberately **not** applied to the 196 generated events or the 107 Case
File descriptions/titles: TEXT resources have no external source file,
only SCI Companion's own GUI text editor (one string at a time, no batch
import) — moving programmatically generated content there would
permanently break the `tools/gen-*.js` regeneration pipeline for a few
thousand strings. `Print()`'s stock implementation (`Controls.sc`)
already natively supports `Print(resNum textId ...)` in place of
`Print("literal" ...)` when the first param is `<u 1000` — used directly
where `Print()` was already the call; everywhere else (custom `Dialog`/
`DText`/`DButton` building, `PrintChoices`) calls `GetFarText()` into a
small local buffer first, then uses that buffer. `Load(rsTEXT TEXT_UI)`
is never paired with a dispose (see Findings below for why
`DisposeScript()` specifically must not be used here) — left resident
once touched, same as `Main.sc`'s own `Load(rsVIEW PORTRAIT_VIEW)`. The
16 entries are populated in SCI Companion's Text Editor and this is
confirmed compiling and working end to end.
- `CaseFiles.sc`(107, persistence + category menu) + `CaseFileCategory.sc`
  (141, the per-category browsing/View screen) + `CaseFileAccess.sc`(136)
  + `CaseFileTitles.sc`(137) + `CaseFileDescriptionsSurvival0-8.sc`
  (143-151, one per survival pool) + `CaseFileDescriptionsFailure0-2.sc`
  (152-154, one per stat) + `CaseFileDescriptionsMechanisms.sc`(140,
  single file — only 5 entries, nowhere near the scale that needed the
  other two split) + `CaseFileDescriptionDispatch.sc`(155, picks/loads
  the right one of the above for a given flat index) — split across this
  many files purely for heap-residency reasons (see Load/Dispose
  discipline above).
- `PlayerNamePrompt.sc`(142) — optional name-entry dialog, Load/Dispose-
  scoped around the one time per session (if any) it's actually shown.
- `EndingSurvival0-8.sc`(162-170) / `EndingFailure0-2.sc`(171-173) — one
  file per ending pool, generated.
- `rm001.sc`(1) — per-run reset, Extended Therapy mode-choice dialog,
  bootstraps the first turn via `EndTurn()`. Never revisited mid-run.
- `rm002.sc`(2) — the ending room: prints the ending, filing
  cabinet/computer hotspots.
- `rm200`-`rm395` — the 196 generated event rooms.
- `game.sh` / `game.ini` — constants and the resource manifest,
  respectively. Every new script needs an entry in **both**.

**Content pipeline** (`tools/`): `tools/lib/zone-events.js` is the
shared generator library (event-room emission, `sciString()`-based ASCII
safety/escaping); `tools/gen-<zone>-events.js` ×6 are thin per-zone
entry points; `tools/gen-endings.js` generates the ending-pool scripts;
`tools/gen-casefile-descriptions.js` generates the Case File description
scripts — one file per survival/failure POOL plus one single file for
mechanisms (12 files total, not 3 — see "Case Files 'View' heap-
fragmentation guard" above for why); `tools/verify-casefile-indices.js` is a dev-time
check that the generated descriptions stay in index lockstep with
`CaseFileTitles.sc`'s hand-written titles. All are idempotent — re-run
after editing the relevant `js/content*.js` source.

## Decisions already made (don't re-litigate these)

- **Target**: late-SCI0 (Police Quest II / Larry 2-3 era UI conventions),
  built with **SCI Companion 3** (github.com/icefallgames/SCICompanion).
- **Scope**: full 1:1 port of all six zones (this was originally scoped
  as a WORK-only vertical slice; expanded to completion once the core
  mechanic was proven).
- **Seeded runs**: SCI0-side seeds only; not required to match seeds from
  the browser version (the original's mulberry32 RNG is 32-bit and
  doesn't port cleanly to SCI0's 16-bit arithmetic).
- **Permanently cut, not deferred**: runtime-loadable content packs /
  `editor.html` (SCI0 compiles everything at build time), Share Result
  PNG / mobile share sheet (no such OS concept on DOS), ScummVM as a test
  target (its SCI engine can't parse this project's compiled resources —
  confirmed a ScummVM-side limitation, not our output; use DOSBox-X), the
  original's `arcade` mode (infinite turns/escalating multiplier —
  separate from Extended Therapy, never in scope).

## Environment / toolchain

- **Game repo**: `/home/gordonk/WebstormProjects/trauma-response-sim/` —
  the original browser game (`js/`, `css/`, `index.html`) and the SCI0
  port (`TRS_SCI/`) live in the same repo. `TRS_SCI/src/` has the `.sc`
  source + compiled `.sco`; `game.ini` is the resource manifest;
  `SCIV.EXE` is the real period-accurate SCI0 interpreter;
  `resource.map`/`resource.001` are the compiled game output.
  `TRS_SCI/art/` is the user's own working art/audio source (gitignored,
  not build source). Any `.zip` directly under `TRS_SCI/` is a
  regenerated distribution build (gitignored).
- **SCI Companion IDE source**: `/home/gordonk/WebstormProjects/SCICompanion/`
  (own git repo, forked at github.com/aedmark/SCICompanion — NOT the
  same repo as the game; this is the IDE/compiler's own C++ source, kept
  separate deliberately). This path has moved twice this project
  (`TRS_SCI/SCICompanion-SRC/` → `~/CLionProjects/SCICompanion/` → here)
  — if a future session finds source at an old path, it's stale; this is
  the current one.
- **Editing**: done directly on the Linux host with normal file tools.
- **Compiling now works natively under Wine — the VM is no longer
  required.** The "compiler hangs indefinitely under Wine" limitation
  this bullet used to describe was root-caused and fixed: an infinite
  repaint loop in Prof-UIS's `ExtTabControl::OnEraseBkgnd` (an
  unconditional `SetFont()` call re-triggering its own redraw every
  frame — Wine's tab control doesn't tolerate this the way real Windows
  does), plus a separate `SHAppBarMessage` docking-layout issue and a
  round of C++17 modernization needed just to build on a current MSVC at
  all. Fixes are upstreamed as icefallgames/SCICompanion#29 (compile
  fix), #30 (see Findings below for a second, unrelated Wine bug this
  session also found and fixed: the brush/pen tool always painting
  black), and #32 (file dialogs not remembering the last browsed folder
  — also Findings below). A batch of new, cross-referencing scripts
  often still needs 2-3 rounds of "Compile All" + "Rebuild Resources"
  before everything settles — expected, not a bug, as long as errors
  are shrinking/changing each round.
- **Testing compiled output**: **DOSBox-X**, run natively on the Linux
  host (`paru -S dosbox-x`):
  ```
  dosbox-x -c "MOUNT C \"<path to TRS_SCI>\"" -c "C:" -c "SCIV.EXE"
  ```
  ScummVM does not work as a test target (see Decisions above). **Real
  Windows XP hardware (via NTVDM, launching the `.exe` from inside the
  WinXP desktop) doesn't either**: user tested on a period Dell Latitude
  and got music playing but a completely black screen, no picture at
  all. `resource.cfg` targets genuine real-mode EGA (`videoDrv =
  EGA320.DRV`, `mode = real`, INT 10h mode 0Dh) -- NTVDM's EGA graphics
  emulation is well known to be broken/unsupported (its VGA mode 13h
  support is comparatively solid), while sound is a fully separate
  subsystem that works fine. Not a project bug: the same compiled
  resources render correctly in both SCI Companion's own DOSBox
  integration and standalone DOSBox-X, repeatedly, and a real palette/art
  problem would show as garbled colors, not a clean black screen. If
  real period hardware is ever wanted as a test target, run DOSBox/
  DOSBox-X on the WinXP machine itself (sidesteps NTVDM's video emulation
  entirely) rather than launching the compiled game directly, or boot
  that hardware into genuine real-mode DOS instead of through WinXP.
- **MIDI/audio setup, three separate places, each configured
  independently** (a real, confirmed source of "sounds different"
  reports — see Open Items):
  1. Linux-host DOSBox-X: `~/.config/dosbox-x/dosbox-x-*.conf`'s
     `[midi]` section. Fixed this session — was `mididevice = default`
     with no synthesizer actually listening on ALSA (confirmed via
     `aconnect -l`). Now `mididevice = fluidsynth` +
     `fluid.soundfont = /usr/share/soundfonts/FluidR3_GM.sf2`.
  2. `TRS_SCI/dosbox.conf` — the config SCI Companion's own "Run Game"
     button uses inside the VM. Had no `[midi]` section at all (plain
     vanilla DOSBox config, no `fluidsynth` option available). Added:
     `mpu401=intelligent`, `mididevice=win32`, `midiconfig=` — forces the
     Windows MIDI mapper explicitly rather than an ambiguous "default"
     inside a VM with no real MIDI hardware.
  3. SCI Companion's own Sound Editor preview — a third, separate
     playback path with its own quirk (see Open Items).

## Findings / gotchas worth not re-discovering

- **`DisposeScript()` is script-specific, despite `Load()` being generic
  across resource types — and different resource types have independent
  numbering namespaces that CAN collide.** Real, live-tested bug: adding
  `TEXT_UI` (a new `TEXT` resource, number 0) and calling
  `Load(rsTEXT TEXT_UI)` / `DisposeScript(TEXT_UI)` around each use
  crashed the compiled game with SCI0's generic "Oops!" runtime-fault
  trap the moment any of those call sites ran. Root cause: `DisposeScript`'s
  own kernel doc is explicit -- "Unloads a **script** from memory,
  including all its classes, instances, variables, etc.," parameter
  `scriptNum` -- it only ever means a script number, with no resource-type
  parameter to disambiguate. `TEXT_UI`'s resource number (0) happened to
  collide with `MAIN_SCRIPT`'s script number (also 0, since View/Pic/
  Sound/Script/Text resources each have their own independent numbering
  starting from 0) -- so `DisposeScript(TEXT_UI)` was actually disposing
  **Main.sc itself** mid-run, taking every global variable and `gEgo`/
  `gRoom` down with it. **Fix**: never call `DisposeScript()` on anything
  but an actual script number. Non-script resources loaded via
  `Load(rsType num)` are apparently just never explicitly unloaded in
  this codebase's own established practice -- confirmed by checking:
  `Main.sc`'s own `Load(rsVIEW PORTRAIT_VIEW)` (called at boot and every
  `newRoom()`) has never been paired with any dispose call anywhere in
  this project, and evidently doesn't need one for a resource this small.
  If a future resource type genuinely needs to be released, don't assume
  `DisposeScript()` is the generic mechanism -- verify a resource-type-
  aware kernel call actually exists first.
- **An SCI0 sound resource isn't just an imported MIDI file — it's MIDI
  data plus a per-channel, per-device map.** Each of the 16 MIDI
  channels stores its own driver-device index, required voice count, and
  a per-device enable bitmask (confirmed via `docs/SCI0-research-
  findings.md`'s byte-level breakdown and SCI Companion's own
  `Help/_sources/sounds.txt`). Critically, **the Sound Editor's preview
  button does NOT apply this per-device filtering** — confirmed by the
  user switching the selected device and hearing no change at all. Only
  a real compiled-game launch through actual DOSBox honors the
  per-channel enable bitmask. Practical consequence: you cannot audibly
  A/B-test per-device track data via Preview — the only reliable check
  is visually confirming each track's checkbox in the Toolbox pane is
  checked *for the specific device in use* (General MIDI/`gm.drv` in
  this project), not relying on how Preview sounds.
- **Scripts auto-load on call but never auto-unload** — see Architecture
  → Load/Dispose discipline above. The root cause of nearly every real
  heap bug this project has hit.
- **Global arrays declared in `Main.sc` aren't visible from other
  scripts via `(use "main")` the way scalars are** — only individual
  scalar globals export correctly. A script-LOCAL array (declared once
  near the top of the *same* script that uses it, via a `(local
  arr[N])` block right after its `(use ...)` list) works fine and is the
  established pattern for large buffers (`CaseFiles.sc`'s `buf[3424]`,
  `mechanisms.sc`'s `gSeenEvent[196]`).
- **A per-call procedure `(var arr[N])` local has a much smaller size
  ceiling than the general 64KB heap** — confirmed via a real runtime
  crash ("you did something we didn't expect") at 3424 bytes that
  compiled fine but failed only at runtime. The same array declared as a
  script-level `(local ...)` instead (identical usage syntax, just moved
  out of the procedure's own `(var ...)` list) works. Use script-level
  locals for any buffer above a few hundred bytes. (Stock `Print()`'s
  own `msgBuf[1013]` per-call local is proof ~1KB is fine as a per-call
  local — the ceiling is somewhere between roughly 1KB and 3.4KB, never
  pinned down more precisely than that.)
- **A `DSelector`'s `state` bits 1 and 2 are independent and mean very
  different things.** Bit 1 makes it the dialog's initially-focused
  control (arrow keys/Page Up-Down reach it) with no other effect. Bit 2
  makes `Dialog:handleEvent`'s base loop treat ANY claimed event
  (including just scrolling) as "done, close the modal loop" — correct
  for a `DButton` (which legitimately wants both, default `state=3`),
  wrong for a browse-only scrolling list. Use `state(1)` only for a pure
  browse/scroll selector.
- **`DSelector` has no concept of "N entries, then stop"** — its
  `advance()` just keeps scrolling as long as the next slot's first byte
  is non-zero. A local buffer isn't zero-initialized by default (leftover
  stack garbage); explicitly zero the whole buffer before writing real
  entries into it, or scrolling past the last entry renders garbage as
  more rows.
- **`fOPENFAIL`/`fOPENCREATE` are swapped from what their names
  suggest** in this SCI0 dialect (confirmed via SCI Companion's own
  bundled kernel docs and `sci.sh`'s `#ifdef SCI_0` block) —
  `fOPENCREATE` is actually "open existing, fail if not possible" (the
  safe read flag), `fOPENFAIL` actually triggers create/reset-style
  behavior that can silently wipe a file immediately before the next
  line tries to read it back. This caused a real, very confusing,
  multi-round persistence bug (writes always looked correct on disk,
  reads never worked) before being traced to this exact swap.
- **There's no way to embed a literal `"` inside a `""`-delimited SCI0
  string.** Transliterate to a single quote instead if the source text
  needs one (the project's own `tools/lib/sci-string.js` does this
  automatically for generated content).
- **A non-ASCII byte in a string literal isn't a missing-glyph
  placeholder — it's read as a raw control byte** and corrupts
  rendering (confirmed: an em dash ate an entire word). `sciString()`
  transliterates common typographic Unicode (em/en dash, curly quotes,
  ellipsis) and throws on anything else unmapped.
- **No confirmed precedent anywhere in this codebase for chained
  `(if...)(else...)` 3+ branches deep**, nor for `switch` on anything but
  a plain variable (never a function-call expression directly). Prefer a
  flat sequence of independent single-branch `if`s with early
  `return`/`break`, or assign to a local first before switching on it.
  Also no precedent for `and`-chains longer than 4 terms — split into
  nested 2-term chains instead of extending further.
- **`paramTotal` counts every argument the caller passed, including ones
  already bound to named parameters before a trailing rest-array
  parameter.** Subtract the named-parameter count from `paramTotal`
  before using it as a rest-array loop bound (see `DisposeLoad.sc`'s own
  `(= paramTotal (- paramTotal 2))` for 2 named params, or
  `PrintChoices`'s `(- paramTotal 4)` for 4).
- **A new script file needs both the `.sc` on disk AND a matching
  `game.ini` `[Script]` entry** — but that combination alone hasn't
  always been sufficient for the file to show up in SCI Companion's own
  Scripts panel. When it doesn't, the fix is creating the script via SCI
  Companion's own **"New empty script"** button rather than assuming the
  file is broken or the entry is wrong.
- **A brand-new circular `(use ...)` pair between two scripts that have
  never bootstrapped each other before may need a manual bootstrap**:
  temporarily comment out the new call/symbol on one side, compile that
  script alone (F8), compile the other side alone (now resolves against
  the freshly updated `.sco`), restore the commented line, then Compile
  All. This codebase's `Main.sc`↔`CaseFiles.sc` pair has needed this more
  than once. Where avoidable (a new feature would create a *brand-new*
  circular pair), prefer restructuring to avoid it entirely — several
  features in this project (player portrait, stat gauges, the Case Files
  category menu) were deliberately built to reuse already-stable
  dependency chains instead.
- **`RESOURCE.MAP`/`resource.001` are append-only by design** — every
  compile appends fresh bytecode rather than overwriting; the engine
  always uses the newest matching entry. A resource browser showing many
  duplicate-looking entries per script number is cosmetic clutter, not a
  bug — "Rebuild Resources" repacks it down once compiling is actually
  succeeding.
- **Samba denies "open for execute" on files lacking the Unix `+x` bit**
  even though it serves them fine for read/copy — any `.exe`/`.com`/
  `.dll` under the shared tree needs `chmod +x` on the Linux side.
- **`ufw`'s default deny-incoming policy silently blocks DHCP broadcasts**
  on libvirt's virtual bridge, causing a VM to fall back to an APIPA
  address with no indication why. Fix: `sudo ufw allow in on virbr0`.
- **Modern Windows 10 refuses passwordless/guest SMB** — set a real
  Samba password (`smbpasswd -a <user>`), don't bother with no-auth.
- **SCI Companion (the IDE, not the game) had two separate real Wine
  bugs this session, both upstreamed as PRs against
  icefallgames/SCICompanion**: (1) the compile-hang above (#29), and (2)
  the raster/cel editor's brush tool always painting black regardless of
  selected color (#30) — root cause was `TransparentBlt`-ing a 1bpp
  pattern bitmap and relying on the destination DC's `SetTextColor()`
  being substituted in during the blit (real, documented Win32 behavior,
  but Wine's GDI doesn't reproduce it); fixed by reading the pattern
  bitmap's own bits and calling `SetPixelV` directly instead of
  depending on that platform-specific blit behavior. General lesson:
  when something works on the SCI Companion IDE side of things but not
  under Wine, look for a real, narrow Win32/GDI behavior the app is
  (correctly) relying on that Wine's reimplementation doesn't fully
  replicate — every such bug found so far has had exactly this shape,
  not a vague "Wine is broken" cause.
- **File dialogs (in the IDE) not remembering the last folder used, in
  the same Wine session or across restarts, on every single Open/Save
  dialog in the app — root-caused, fixed, confirmed by the user, and
  upstreamed as icefallgames/SCICompanion#32.** First theory —
  `OFN_NOCHANGEDIR` (present on all 20 `CFileDialog` call sites,
  apparently copy-pasted everywhere; a documented no-op on real Windows
  since XP/2000, so removing it was zero-risk) — **disproven**: removed
  from all 20 call sites, user confirmed zero change, amnesia persisted
  across the board. Real cause: Wine's `comdlg32` just doesn't implement
  the "remember last folder" behavior real Windows relies on (no flag
  controls this — it isn't something the app can turn back on). Fix:
  the app now tracks it itself. `SCICompanionLib/Src/Util/
  PersistentFileDialog.h/.cpp` (new files, registered in the vcxproj —
  new source files always need an explicit `<ClCompile>`/`<ClInclude>`
  entry or they silently don't build; forgetting this produces
  unresolved-external linker errors for the new class even though the
  header compiles fine, and if VS already has the project loaded when
  the vcxproj is edited on disk it may not notice the new file until the
  project is explicitly reloaded) adds `CPersistentFileDialog`, a
  drop-in `CFileDialog` subclass that reads/writes a persisted
  "LastBrowsedFolder" app setting (via the same `GetProfileString`/
  `WriteProfileString` mechanism already used elsewhere in this
  codebase, e.g. `CCrystalTextView.cpp`'s find/print settings) on
  construction/successful `DoModal()`. Swapped in at all 18 of the 20
  call sites that didn't already have an intentional, context-specific
  initial directory (`ScriptDocument.cpp` and `GamePropertiesDialog.cpp`
  both deliberately default into the *current game's* folder, not "last
  browsed" — left alone, correctly). **Confirmed by the user**: Save,
  Save As, and Import-style dialogs all now remember the last folder
  correctly.
  `File > Open Game` (`ID_FILE_OPEN`) needed a second round: the first
  attempt tried temporarily pointing the process's current directory at
  the persisted folder before calling `__super::OnFileOpen()`, on the
  theory that stock `DoPromptFileName()` falls back to the process's CWD
  for its initial folder — user tested, **disproven**, still amnesiac.
  Root cause: `CWinApp::OnFileOpen()`/`CDocManager::DoPromptFileName()`
  own their `CFileDialog` internally and never expose `lpstrInitialDir`
  to a caller at all, so that path was always going to depend entirely
  on Wine's broken `comdlg32` memory no matter what the calling process's
  CWD was — the CWD fallback that theory relied on isn't how modern
  Explorer-style common dialogs actually pick their starting folder.
  Also discovered along the way: there's no `STRINGTABLE` entry for the
  game doc template (`IDR_MAINFRAME`), so that stock dialog was never
  showing a game-specific filter anyway — just the union of every other
  registered resource type's filters, plus "All Files," with the user
  expected to manually navigate to `resource.map`. Final fix: stopped
  delegating to `CWinApp::OnFileOpen()` entirely.
  `SCICompanionApp::OnFileOpen()` now shows its own
  `CPersistentFileDialog` filtered specifically to `resource.map`, and
  calls the app's own `OpenDocumentFile()` directly on success — same
  mechanism as the other 18 sites, and arguably a UX improvement over
  the generic reused dialog. **Confirmed by the user.** The "last
  folder" setting for this path also updates via the existing
  `AddToRecentFileList()` override, which fires with the game folder on
  every successful open (including via the Recent Files menu, which
  doesn't go through any dialog at all).

## Open items — what's actually left

1. **Background music timbre mismatch — accepted as-is, not pursuing
   further.** The Sound Editor Preview vs. real-game mismatch (see
   Findings above for the actual mechanism) was never fully root-caused
   down to a specific missing track-enable checkbox, but the user
   confirmed the music as it plays in-game now is fine. Not an open
   task; noted here only so a future session doesn't reopen it
   unprompted.
2. ~~Full choice counts (item above, "Full choice counts restored")~~ —
   **done.** Compiled and playtested by the user: 3-choice, 4-choice, and
   both 5-choice events ("The Typo", "The Performance Review Buzzword" —
   WORK zone, the two with actual prior dialog-overflow history) all
   confirmed working, including the glitch roll landing correctly on the
   final page and "Back" from page 2 correctly rebuilding page 1 with
   effects still applying right after. No event overflowed the per-page
   ceiling — `CHOICES_PER_PAGE` (game.sh) stayed at 3, the lower-to-2
   fallback was never needed.
3. **Nothing else is currently known-broken.** Everything else in
   "Current state" above is confirmed working by the user's own
   playtesting. If picking this project back up cold, a good sanity
   check is simply: does a standard run complete, does Extended
   Therapy unlock and work, does Case Files show discovered/sealed
   correctly and let you view a description, do both office hotspots
   work, does the portrait picker show and let you pick, does the game
   prompt for a name on a fresh save and remember it after, does Reset
   Data actually clear Case Files/NG+/the name — all confirmed at least
   once, but a regression from an unrelated future change is always
   possible.
4. ~~SCI Companion IDE file dialogs not remembering the last folder~~ —
   **done.** Confirmed fixed by the user under Wine (all 18 general
   dialogs, plus `File > Open Game` after a second-round fix), upstreamed
   as icefallgames/SCICompanion#32. See Findings above for the full
   root-cause story if a similar Wine/comdlg32 issue ever comes up again.
5. ~~Case Files "View" heap-exhaustion regression~~ — **done**, see
   "Case Files 'View' heap-fragmentation guard" above for the full
   four-cause story. Confirmed fixed on the repro that was actually
   hit this session: a fresh save, one 10-round run, straight into Case
   Files. **Not separately re-confirmed**: the *original* bug report's
   own repro (a 10-turn run then a 20-turn run back to back, same
   session) — worth another real pass if this area gets touched again,
   since that's a heavier cumulative-fragmentation scenario than what
   was actually retested here, even though the margin recovered this
   session (per the debug readings taken mid-fix) looks meaningfully
   healthier than before.

## Future ideas (not started, no urgency)

- **Real portrait art for the 4 selectable options** — see "Player
  portrait" above; the picker itself is built and confirmed working,
  currently with 80x60 placeholder art for all 4 options. User is
  handling this art pass solo. Each option needs the full 4-mood set
  (neutral/repression/mask/child), matching the existing `portrait_*.bmp`
  pattern in `TRS_SCI/art/`. Cel/view mapping (`game.sh`,
  `PortraitViewForIndex()` in `mechanisms.sc`):

  | Portrait option | View # |
  |---|---|
  | 1 (`gPortraitChoice`=0) | 801 |
  | 2 (=1) | 802 |
  | 3 (=2) | 803 |
  | 4 (=3) | 804 |

  Each of those 4 views needs the same 4 loops (one static 80x60 cel
  per loop — shown as a `DIcon`, never animated, so no need for more
  than one cel per loop):

  | Loop # | Mood |
  |---|---|
  | 0 | Neutral |
  | 1 | Repression |
  | 2 | Mask |
  | 3 | Child |

  16 images total (4 options × 4 moods). Which mood shows at runtime is
  already handled by `GetPortraitMood()` (whichever stat is currently
  worst, once its danger value crosses `PORTRAIT_NEUTRAL_THRESHOLD`=60)
  — nothing to do on the art side but fill in all 4 moods per option.
