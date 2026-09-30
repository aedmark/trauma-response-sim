# Changelog

All notable changes to the Trauma Response Simulator (formerly Unresolved Childhood Trauma Simulator) are documented here.

## Unreleased

### Fixed
- **Case Files no longer treats text from a content pack as HTML.** A shared pack could put markup (including a script) in a mechanism or ending name and have it run when that file was opened in Case Files; it now shows as plain text.
- **Importing a broken content pack now says what's wrong instead of failing mid-run.** The editor's import lists each problem (an event with no choices, an unknown tag, an effect written as text instead of a number). A saved pack with one of these problems is ignored in favour of the default content rather than breaking the game.

## [4.17.16] - 2026-09-08

### Changed
- **Renamed to Trauma Response Simulator (T.R.S, was U.C.T.S).** Drops "Unresolved Childhood" while keeping "Trauma" — feedback was that the full old name read as punching down on a real subject, and the goal here was to lose that without losing the bite or the accuracy: `fawn`/`flight`/`fight`/`freeze`/`secure` are, factually, trauma responses. Updated everywhere the old name or acronym appeared as product identity: page `<title>`s and headers in `index.html`/`editor.html`, the default content pack's `config.splash.title` (`content.js`), the in-game header text and share-card filename (`engine.js`), the splash-title fallback (`main.js`), and every mention in `README.md`/`AUTHORING.md`. Historical dated entries below are left as written — they're accurate to what shipped at the time.
- **Deliberately not renamed**, each for a different reason: the `uct_*` `localStorage` key prefixes (`content.js`, `main.js`, `engine.js`, `field-log.js`, `codex.js`) — renaming these would silently orphan every existing player's save (Extended Therapy unlock, Arcade high score, custom content pack, Field Log, Case Files); the `aedmark.itch.io/trs` share-card link and the `github.com/aedmark/trs` repo link (`index.html`, `engine.js`) — both point to real external locations that would need their own rename first, or the links just 404; and `ucts.zip`, which is a build artifact regenerated through the normal export process rather than hand-edited.

## [4.17.15] - 2026-09-07

### Added
- **A "⚠ Reset All Data" control, since a hard refresh does nothing to `localStorage` and there was previously no way to actually clear it from inside the app.** Two entry points — a link on the splash screen (reachable before a run even starts, for the "my save is stuck" case) and a persistent one in the in-game footer — both call the same `resetAllGameData()` in `main.js`. First confirm clears six keys in one pass: custom content pack, Case Files archive, Extended Therapy unlock, Arcade high score, saved player name, and Timed Events preference. A second, separate confirm asks specifically about the Field Log, worded to make clear it's a distinct, deliberate action — declining the first confirm skips the second entirely, and declining the second just leaves the Field Log alone while the rest of the reset still goes through. Either path ends in a page reload so the fresh state is immediately visible rather than requiring a manual refresh.
- Verified with a scripted Playwright pass covering all four combinations (splash vs. footer entry point, accept vs. decline at each of the two confirms) plus a fifth check that declining the very first dialog leaves all seven keys untouched — zero JS errors across any of it.

## [4.17.14] - 2026-09-07

### Added
- **Case Files, a persistent archive of every ending and coping mechanism the player has ever actually seen, independent of any single run.** Aimed at a specific problem: someone plays once, gets a cute-but-forgettable result, and closes the tab for good. 107 entries are tracked forever in `localStorage` — all 5 coping mechanisms, all 72 survival-ending variants (9 stat-shapes × 8 each), all 30 failure-ending variants (10 per stat) — starting sealed as a numbered, redacted file tab and flipping permanently to their real title and description the instant that specific variant is actually drawn in a run. It changes nothing about how a run plays; it's purely a record, so there's always something concrete still missing after the fifth or fifteenth playthrough. Reachable from a new 🗂 button in the header, the splash screen, and the end screen, all opening the same screen with a running "N / 107 files opened" count. Survival cases are numbered by array order ("Case #1"–"Case #9"), not labeled by the stat conditions that earn them, so nothing about the game's existing hidden-effects design leaks through the archive.
- New `js/codex.js` handles all of it: persistence, a content-pack signature (built from variant-pool sizes and the five mechanism keys) that auto-resets the archive if a loaded pack's shape no longer matches what old progress was keyed against, and the render/interaction logic for the screen itself. `engine.js` picked up three small hooks — `trackMechanism` records a mechanism the moment it unlocks, and `getSurvivalEnding`/`pickFailureEnding` now record the actual slot and variant index they already pick, rather than discarding that information after building the display text. No change to RNG draw order, stat math, or existing save data.
- Verified end-to-end with a scripted Playwright pass against the real page: fresh-install state shows 0/107 with every tab sealed, clicking a locked tab never leaks its title, direct discovery calls round-trip correctly through `localStorage` after a cache reload, a full seeded playthrough to an actual failure ending lit up exactly the matching failure-pool entry and mechanism badges, and a simulated pack-shape mismatch correctly wiped and re-keyed the archive — zero console or page errors across all of it.

## [4.17.13] - 2026-09-07

### Added
- **84 new choices closing `flight` and `fight` to parity with the rest of the pack, and giving every event a `secure` option.** A representation audit across all 196 events (662 tagged choices) found the five response types far from evenly used: `fawn` 152 (23%), `secure` 170 (26%), `freeze` 134 (20%), `fight` 107 (16%), `flight` 99 (15%). It was sharper at the event level than the percentages suggest — `flight` was completely absent from 97 of 196 events (half the pack) and `fight` from 89, while `secure` was missing from only 26, all three of those clustered in `WORK`/`HOME`/`SOCIAL` (`SELF`, `BODY`, and `PUBLIC` never lacked it). Rather than re-tag any existing choice — risking the "honest, not convenient" tagging rule `AUTHORING.md` already calls out — 33 new `flight` and 25 new `fight` choices were added (selected across events missing that tag, spread proportionally by zone) to bring both to 132, matching the pack's original 5-tag mean, and a `secure` choice was added to each of the 26 events that lacked one, so every event in the pack now offers it. New totals: `fawn` 152, `freeze` 134, `fight`/`flight` 132 each, `secure` 196, across 746 choices — 150 events now carry 4 choices (up from 74) and 4 carry 5 for the first time (the events that needed both a `flight`/`fight` and a `secure` addition); none dropped below their original count. Stat-effect magnitudes and the five mechanism mods were deliberately left untouched — this pass is about how often each response type shows up as an option, not the intentional cost/benefit asymmetry between them that `AUTHORING.md`'s design notes call the actual mechanic.
- Verified structurally (all 196 events still valid — 2-5 choices, every tag one of the five real mechanisms, no malformed fields) via `node --check` on all six zone files plus a full re-parse/re-tally of the pack, and by confirming the new totals independently.

## [4.17.12] - 2026-09-07

### Added
- **50 more choices, one per remaining fawn/freeze/secure-only event, closing out the `fight`/`flight` coverage pass started in 4.17.11.** That entry's 24 additions left 50 events (9 WORK, 10 HOME, 9 SOCIAL, 10 SELF, 5 BODY, 7 PUBLIC) still without either tag; each now has a 4th choice, split 27 `fight` / 23 `flight` by alternating per zone, using that event's own established scenario. Coverage moves from 80/76 to 107/99 of 662 tagged choices — still shy of `fawn`/`freeze`/`secure` (152/134/170) but blind-play unlock rates for the two are now 17-20%, up from 5-16%, versus 29-49% for the other three. No event in the pack is below its original 3 choices; 74 of 196 now carry 4 (up from 24). Verified structurally (196 events, zero duplicate titles/tags/zones, zero out-of-range effect magnitudes, zero duplicate log lines or choice text introduced) and by a full in-browser playthrough hitting one of the new 4-choice events.
- One pre-existing duplicate log line was noticed in passing (`"An unopened voicemail can hold a lot of imagined weight."`, shared by "The Missed Call From Mom" and "The Voicemail You Haven't Listened To") — predates this pass, left as-is pending a decision on which one should change.

## [4.17.11] - 2026-09-07

### Changed
- **Standard and Extended Therapy's starting stats rebalanced from `{repression: 40, mask: 80, child: 30}` to `{repression: 40, mask: 60, child: 60}`.** A Monte Carlo pass (3,000 simulated runs per strategy, using the live content pack and engine formulas) found Inner Child causing 55% of all losses under blind/random play in Standard and 74% in Extended Therapy, versus roughly 1% for Social Mask — the same fixed-buffer asymmetry the 4.17.3 Arcade fix diagnosed and corrected ("child starting with roughly half the runway repression and mask get"), just never carried over to the other two modes, which that entry explicitly left untouched. Giving Mask and Child the same starting buffer as Repression (60 each) brings blind-play deaths to a near-even split between Repression and Child (333 vs. 341 of 3,000 in Standard; 831 vs. 1,092 in Extended) without touching Repression's own tuning. Blind-random win rate rises accordingly (Standard 43%→77%, Extended 17%→31%) — expected and accepted, since the old rate was an artifact of one stat being nearly unloseable rather than a deliberately tuned difficulty target. `secure`-preferring play still wins essentially every run; `fawn`-only and `freeze`-only play still lose 94-96% of the time, mostly to Inner Child specifically — the core "avoidant repetition compounds against you" thesis is unaffected.
- README's stat table updated to match (`20/100/50` was stale from before 4.17.4; actual defaults are `40/80/30`, now `40/60/60`), and `AUTHORING.md`'s raw-JSON schema example updated to the same current values.

### Added
- **24 new choices, 4 per zone, adding a `fight` or `flight` tag to existing events that previously had neither.** A tag-coverage audit found `flight` and `fight` present in only ~33-35% of the pack's 196 events (64 and 68 of 588 tagged choices) versus 70-87% for `fawn`/`freeze`/`secure`, meaning those two coping mechanisms unlocked far less often under normal play (5-16% of runs vs. 24-49%) for no thematic reason. Rather than write wholly new events — several independently-drafted candidates turned out to already exist near-verbatim in the pack, which is about as comprehensive as 196 hand-written scenarios gets — a 4th choice was added to 24 events (selected from the 74 that had only `fawn`/`freeze`/`secure`) using each event's own established scenario, split evenly (12/12) between `fight` and `flight`. Coverage moves to 80/76 of 612 tagged choices. Every event in the pack still has 2-5 choices as the schema always allowed; this is simply the first time any event has used a 4th.

### Added
- **Survival Endings are now a pool of variants, same as Failure Endings.** Reaching, say, "Fragile Equilibrium" used to always show the exact same title and desc — noticeable across a lot of replays, especially with Run Seeds and Extended Therapy encouraging repeat runs. Each of the 6 existing survival endings got 8 variants (matching the failure-ending pool depth), and 3 brand-new endings were added for stat-shapes that previously fell through to the generic "Functional Enough" catch-all despite being distinct outcomes: `Raw Nerve` (very low Mask, moderate-to-high Inner Child — stopped performing without necessarily thriving), `Coasting on Empty` (moderate-to-high Mask, low Inner Child — still presentable, hollowed out underneath), and `The Long Fuse` (moderate Repression with healthy Mask/Inner Child — the large "holding it together, mostly" middle of the stat space that had no ending of its own). 9 endings × 8 variants = 72 total survival-ending texts, up from 6. `getSurvivalEnding()` in `engine.js` now picks a random variant from whichever ending's conditions matched, mirroring `pickFailureEnding()`; a pack with the old flat `{title, desc}` shape per ending still works, normalized into a one-variant pool.
- The Content Editor's Survival Endings section now edits these as a pool (add/remove variant, same UI pattern as Failure Endings) instead of a single title/desc pair, and `AUTHORING.md` documents the new shape and updates the raw JSON schema example.

## [4.17.8] - 2026-09-06

### Added
- **40 new events, 8 per zone** (124 → 164 total), targeting specific gaps the existing 124 didn't cover: money and bills in `HOME` (rent increases, overdrafts, forgotten subscriptions, a family loan request), dating apps and modern-social friction in `SOCIAL` (a match who stopped responding, a wedding you can't afford, doomscroll comparison), career anxiety in `WORK` (imposter syndrome, layoff rumors, salary transparency gone wrong), physical-anxiety scenarios `BODY` hadn't gotten to yet (insomnia, touch-avoidance flinching, screen-strain), and identity/self-narrative gaps in `SELF` (compulsively checking a banking app, comparing yourself to one specific person, the decision you've been avoiding for months). Same structure and voice as the existing 124 — three tagged choices plus a per-event wildcard — verified with a Node-side structural check (no duplicate titles, every tag one of the five valid mechanisms, every zone real, every choice count in the 2–5 range, effect magnitudes landing in the same ±5–20-typical/±30-outlier band as the rest of the pack).
- README's zone list caught up to actually mentioning `BODY`, added in 4.17.6 but never added to that sentence.

## [4.17.7] - 2026-09-06

### Added
- **A new survival ending, "Actually Okay,"** for the specific outcome the game's own best strategy was landing on without ever getting a distinct payoff. Leaning on `secure` — the one coping mechanism that heals instead of trades, per its own description — drives Repression down and Inner Child up without touching Social Mask, which naturally leaves Mask sitting well above the 70 ceiling the existing "Fragile Equilibrium" ending checks for. A run that ends low-Repression, high-Mask, high-Child (the actual shape of playing well) fell through every named ending and landed on the generic "Functional Enough" catch-all — the same line a mediocre run gets. The new ending (`repression <= 30`, `mask >= 60`, `child >= 60`) sits after Fragile Equilibrium so its existing 40–70/40–70 band is untouched, and only catches the higher range nothing previously named.

## [4.17.3] - 2026-09-05

### Changed
- **Arcade Mode now rolls its own starting stats every run**, instead of using the same fixed 40/80/30 as a standard playthrough. A balance pass (600 simulated runs across a blind-random and a perfect-information strategy) found the fixed stats gave Inner Child roughly half the buffer to its 0 floor that Repression gets to its 100 cap — median survival for uninformed play was 6 turns, 81% of it to Inner Child alone, well before the escalation mechanic even gets to turn 11. Each stat now rolls independently in its own range (`config.arcadeStartingStats`, editable per-pack), tuned so every stat gets a comparable buffer regardless of which direction it fails in. Standard and Extended Therapy runs are untouched.
- **Failure endings are now a pool of variants instead of one fixed line per stat.** "Total Disassociation," "Panic Attack," and "Social Exile" were the same title and description on every single loss — repetitive over a long session, and especially so in Arcade, which can end a run every few minutes. Each of the three now has 10 variants (`failureEndings.<stat>` is an array), picked at random when that stat breaks. A pack with the old single-object shape still works — treated as a one-variant pool.

## [4.17.2] - 2026-09-05

### Added
- **Ending description now prints on the exported share card**, alongside the title that was already there. `renderResultCanvas()` measures and wraps the description text same as everything else on the card, so the block stays vertically centered whether the ending is a one-liner or a full paragraph — stress-tested at 400+ characters with no clipping against the screen inset.
- **Coping mechanism badges are hoverable and tappable.** Each of the five mechanisms now carries a short description of what it actually does and costs (`content.js`'s `mechanisms[tag].desc`, editable per-pack from the Content Editor). Hovering a badge shows it via the native `title` tooltip; tapping/clicking toggles the same text into a readout line under the badge row, for touch devices where hover doesn't exist. Only one open at a time.

### Fixed
- **The splash screen's new Arcade Mode button (added in 4.17.1) rendered oversized and crowded the Run Seed row above it.** `#splash-start-btn { margin-top: 2rem; }` was written back when Start was the only button in that row; once Arcade Mode joined it as a flex sibling, that margin pushed only Start down while Arcade — carrying no margin of its own — stretched to fill the row's full height under the default `align-items: stretch`. The margin now lives on the shared `.splash-actions` wrapper instead of one button.

## [4.17.1] - 2026-09-05

### Added
- **Arcade Mode.** Unseeded and uncapped — no turn limit, no seed field, just play until a stat runs out. Difficulty escalates in steps rather than smoothly: every ten turns, event and mechanism stat effects scale up one tier, reusing the existing `hardModeMultiplier` config value as the step size rather than adding a second tuning knob. Tracks its own high score (turns survived) in `localStorage`, separate from Extended Therapy's New Game+ unlock. Reachable from the splash screen or, after any run, from the end screen.

## [4.17.0] - 2026-09-05

### Changed
- **Result card now matches the game's own case**, instead of floating as a plain dark rectangle. The image card is framed like the toy itself — cream plastic bezel, the rainbow corner ribbon, a dark LED screen inset for the actual ending/stats/mechanisms — plus denser spacing throughout (bigger type, thicker bars, tighter gaps) so a short result no longer leaves a large empty gap before the footer.
- The corner ribbon went through a few passes to get right: color order corrected to run red-nearest-corner-to-blue-farthest (matching the real `.app::before` ribbon's direction), the card's own bezel stroke moved to draw *before* the ribbon instead of after (it was painting over the corner and hiding the innermost band), and the stripes' position/thickness tuned by sampling actual rendered pixel colors along the top and left edges rather than eyeballing screenshots — confirmed symmetric (both edges transition through all five colors at matching distances) rather than merely close.
- The link on both share formats (text and image) now points to `aedmark.itch.io/trs` instead of the GitHub repo, since that's where someone would actually go to play.

## [4.16.0] - 2026-09-05

### Added
- **Player Name**, an optional field on the splash screen (default blank, remembered in `localStorage` for next time). When set, it shows up on both share formats: the text card's title line becomes "*Name*'s U.C.T.S — *Ending*", and the image card gets a "Played by *Name*" line under the game title. Purely cosmetic — never touches stats, endings, or the seeded RNG — and skipped entirely on both cards when left blank, same as before this existed.

## [4.15.0] - 2026-09-05

### Added
- **Share Result now includes an image**, alongside the existing text version. The end screen's Share Result button opens a panel with a rendered portrait result card (ending, stat bars in the pack's own colors and labels, seed, coping mechanisms) built fresh on a `<canvas>` — no DOM screenshot, no server — using a two-pass layout that centers the content block regardless of how long the ending or mechanism list runs. **Share / Save Image** hands that PNG straight to the device's native share sheet where `navigator.share` supports files, letting the phone's own OS-level share sheet decide what's available (Instagram, X, Threads, Messages, whatever's installed) instead of the game guessing with platform-specific buttons; on desktop, with no share sheet to hand off to, it just downloads the file.
- `README.md`'s "nothing leaves your browser" claim now carries the one honest exception this creates: sharing is opt-in and user-initiated, nothing else changed about the game's own data handling.

## [4.14.0] - 2026-09-04

### Added
- **Share Result (text).** The end screen has a Share Result button that builds a Wordle-style plain-text summary of the run — ending, seed, each stat as a block-character bar using the pack's own labels, coping mechanisms acquired — then copies it to the clipboard (with a brief confirmation) or, if clipboard access isn't available, reveals a pre-selected text box so it can always be copied by hand.

## [4.13.0] - 2026-09-04

### Changed
- **Mobile layout: gameplay first, stats compact and below.** On viewports under 640px, the event/choices section now renders ahead of the stat HUD (via a flex `order` swap — no DOM changes, so nothing above 640px is affected) instead of forcing players to scroll past three full-height meters before reaching the actual turn. The HUD itself also shrinks on mobile: tighter panel padding and gaps, thinner bars, smaller label text, and captions ("If it hits 100%, you explode.") dropped since that's already covered by the Help screen.

## [4.12.0] - 2026-09-04

### Added
- **Run Seeds.** Every run now has a seed — a short human-readable string that drives every random draw in that run (event selection, the wildcard's roll and effects, timed-choice timeouts) through a seeded PRNG instead of `Math.random()`. The splash screen has a Run Seed field: leave it blank for a fresh random seed, roll the 🎲 button for a new one without starting, or hit 📅 for a shared daily-challenge seed (`daily-YYYY-MM-DD`, same for everyone on a given date). The end screen shows the seed a run used and adds a **Replay Seed** button next to Restart, so a specific run — daily challenge or otherwise — can be re-run identically to compare results or actually beat it.
- **Timed Events**, opt-in via a checkbox on the splash screen (off by default, preference remembered for next time). When enabled, each turn has a pack-configurable chance (`config.timedEventChance`, default 20%) of putting a countdown bar under the event text; running it out auto-picks a random choice from that event and logs it as `[FROZE] ...`, always counting toward the `freeze` coping-mechanism track regardless of that choice's own tag. Duration defaults to `config.timedDuration` (8s) and both the editor's Config tab and an event's own raw-JSON `timed: {duration}` / `timed: false` can override or disable it per-event.

## [4.11.0] - 2026-09-04

### Changed
- **Retired the "±" legacy mode from the effect-input selector.** Having a fourth option that meant "none of the other three, just a plain signed number" sitting next to Add/Subtract/Set was more confusing than it was worth, especially once it was the *only* thing distinguishing old choices from new ones. All 900 stat effects (100 events × 3 choices × 3 stats) in the built-in pack were migrated from plain numbers to `{ op, value }` — mechanically verified lossless first: every resolved delta checked bit-for-bit identical to the original numbers before the switch, nothing else in any event touched. The editor now only ever shows `+` / `−` / `=`.
- Plain numbers are still accepted wherever a pack gets loaded (hand-edited JSON, or anything exported before this change) — the editor just normalizes one into Add/Subtract the instant that choice's card renders, so an older pack opens cleanly without ever surfacing the retired mode.

## [4.10.0] - 2026-09-04

### Added
- **Splash / title screen.** Shown once, before the first turn, covering the app until the player clicks Start — `config.splash: { title, intro }` in the content pack, editable from the editor's Config tab. Falls back to the game's own title and a generic prompt if a pack doesn't define one (or predates the field), so nothing regresses for existing packs. Only shows on the very first load — restarting a run, hitting a failure ending, or unlocking Extended Therapy doesn't bring it back.
- **Add/Subtract/Set effect inputs**, as an alternative to typing a signed number for a choice's stat effect. Each of a choice's three stat effects can now be a plain number (unchanged — every existing event still uses this) or `{ op: "add"|"subtract"|"set", value }`: Add/Subtract apply a magnitude in that direction, Set pins the stat to an exact 0–100 value regardless of what it currently is. All three resolve to an ordinary relative delta before mechanism mods or Extended Therapy's multiplier ever see it, so nothing downstream changed. The editor has a small `±`/`+`/`−`/`=` selector next to each stat input; switching modes converts just that one stat in place. This is additive only — no existing content was touched or needs to be.

## [4.9.0] - 2026-09-04

### Added
- **Every event now has its own wildcard.** The random fourth choice used to share one generic button ("??? Do something you can't predict.") and a pack-wide pool of five generic log lines across all 100 events — flat, and easy to miss the point of picking it. Each event now optionally defines its own `glitch: { text, log }`, written to react to that specific scenario rather than reading like a system message. All 100 shipped events got one. The editor has a new dashed-border "Wildcard" field on every event card for it.
- The `glitch` field is optional and per-event — a pack saved before this existed, or a newly added event nobody's written one for yet, falls back to the generic button text and the pack's `glitchLogs` pool exactly as before. The mechanic itself is unchanged: still a 15%-default chance, still fully randomized effects, still untagged (doesn't count toward coping mechanism unlocks).

## [4.8.0] - 2026-09-04

### Changed
- **Choice buttons no longer show a stat-direction hint.** Every choice used to carry a small "↑ Repression | ↓ Mask"-style line under the button text — a hidden magnitude, but a telegraphed direction. That's gone: picking a choice is now a genuine surprise, with only the button's own text (and, after the fact, the log line and the bars themselves) to go on. Also dropped the glitch choice's now-redundant "OUTCOME UNKNOWN" label, since that's true of every choice now, not just that one — it's still the only one whose effects are randomized fresh each time rather than authored.
- `README.md` and `AUTHORING.md` updated to match — both used to describe the ↑/↓ hint as part of how the game works, which is no longer true.

## [4.7.0] - 2026-09-03

### Added
- **Configurable stat bar names** (`config.statLabels`). The stats panel headings and the ↑/↓ choice hints ("↑ Repression", "↓ Mask") were literal strings in `index.html` and `engine.js`; they now read from the pack, with a new "Bar Display Names" row in the editor's Config section. Renaming a bar is cosmetic only — the underlying `repression`/`mask`/`child` keys, and everything wired to them (zone bias, ending conditions, mechanism mods), are unchanged. Optional field; a pack saved before this existed falls back to the original label text.
- **Configurable failure endings** (`failureEndings`). "Panic Attack", "Social Exile", and "Total Disassociation" — the title and description shown when a stat crosses its loss threshold — were hardcoded in `engine.js`, unlike survival endings, which have always been pack data. A heavily reskinned pack could reach the end of a run and still show unrelated default flavor text on a loss, which is also statistically the *most common* outcome for many packs. Each of the three now has an editable title/desc in a new "Failure Endings" section in the editor, between Coping Mechanisms and Survival Endings. Optional field, same backward-compatible fallback as above.

### Fixed
- **Editor event cards were unusable on narrow screens.** The title input shared one row with the zone dropdown and the Remove Event button, both fixed-width, so on mobile the title field was squeezed down to a sliver. The title now sits full-width on its own row above the zone/remove row.

### Changed
- `AUTHORING.md` documents both new fields (a "Failure Endings" section alongside "Survival Endings", a new Config table row for the bar names) and notes two things this pass surfaced while reviewing a user-submitted content pack: failure endings are worth writing deliberately since they often outnumber every survival ending combined, and a broad, low-specificity condition placed early in the Survival Endings list can silently starve narrower ones placed after it.

## [4.6.0] - 2026-09-02

### Changed
- **Contrast pass across both pages.** Several of the "quiet" text tiers introduced during the Tailwind removal — zone tags, captions, hints, timestamps, form labels, fine print, the Field Log's delete control, and both pages' danger-button text — measured below WCAG AA's 4.5:1 minimum against every dark background actually in use here (as low as 1.7:1 for the delete × and the danger buttons' resting red, worse than the CRT overlay makes any of this look in a screenshot). `#6b7280`, `#4b5563`, `#374151`-as-text, and `.editor-label`'s `#737373` are consolidated into `#9ca3af`, which measured 6.9–8.3:1 across `#000`/`#0a0a0a`/`#111`/`#0d0d0d`/`#161616`/`#1a1a1a`. Danger-button text (`Clear Log`, `Reset to Default`) moves from `#b91c1c` (2.7–3.3:1, failing even the large-text bar) to `#f87171` (6.3–7.6:1), which was already this app's hover-state red, so the palette didn't grow. Borders, backgrounds, and every already-legible tier (`#9ca3af`, `#d1d5db`, `#e5e7eb`, the stat colors) are untouched — this is a fix for the specific tiers that were actually failing, not a general brightening.

## [4.5.0] - 2026-09-02

### Fixed
- **Events could repeat within a single playthrough.** `pickWeightedEvent()` only ever excluded the *immediately previous* event from the draw pool, so nothing stopped the same event from resurfacing later in the same 10-turn run — just not back-to-back. The engine now tracks every event title already shown this playthrough and draws only from what's left, falling back to "anything but the last one shown" only once the whole pool is exhausted (relevant on a longer Extended Therapy run, where the fixed pack's events can run out before the turns do). Verified with 500 simulated 10-turn runs (zero repeats) and a 40-turn stress run past the pool size (zero back-to-back repeats once it starts reusing).

## [4.4.0] - 2026-09-02

### Changed
- **Tailwind is gone.** The CDN play-script (`<script src="https://cdn.tailwindcss.com">`) is removed from both `index.html` and `editor.html`, and every utility-class string — in the static markup and in the class strings `engine.js`, `field-log.js`, and `editor.js` build at runtime — is replaced with hand-authored, semantically named CSS in `css/style.css` and `css/editor.css`. The project's own pitch is "nothing leaves your browser, no build step"; a third-party CDN script silently pulling a full utility framework at runtime on every load never fit that, and doesn't now. Visual output is unchanged — the new CSS was written against Tailwind's actual palette values and breakpoints to match pixel-for-pixel, verified with a headless-browser pass across mobile and desktop viewports on both pages.
- `main.js`'s tab switching, `field-log.js`'s tag/zone picker state, and `engine.js`'s stat-bar/end-screen/glitch-button styling now toggle single semantic classes (`.active`, `.red-hot`/`.red-dim`, `.overlay-heading.win`/`.loss`, `.choice-btn.glitch`) instead of juggling three-to-five Tailwind classes per state change.
- Caught one real inconsistency along the way: the Inner Child bar's resting color was one shade off between the static markup (`pink-600`) and the engine's own dynamic update (`pink-700`). Standardized on `pink-700`, matching what the engine was already doing during play.

## [4.3.0] - 2026-09-02

### Changed
- **Mobile pass on `index.html`.** Every `md:`-gated text size was invisible on a phone \u2014 essentially all phones fall under Tailwind's 768px `md:` breakpoint, so text was permanently stuck at its smallest defined size regardless of screen. Base sizes are bumped across the board (stat labels, event text, choice buttons, Field Log) instead of relying on a breakpoint that never fired on the device most people are actually using. Fixed the same problem in the JS-templated event/choice markup in `engine.js`, which had its own hardcoded sizes the static HTML changes didn't reach.
- **Padding tightened on small screens.** Fixed `p-6`/`p-8` blocks (stats panel, gameplay area, help/end overlays) now scale down below the `sm:` breakpoint instead of eating the same fixed margin on a 375px screen as a desktop window.
- Header now wraps instead of squeezing; the "Objective: Survive N Turns" label hides below `sm:` since the turn counter already covers it and screen space is scarcer there.
- End screen's two buttons stack vertically on narrow screens instead of competing for width.
- `#field-note`'s textarea is `text-base` now instead of `text-sm` \u2014 iOS Safari auto-zooms the viewport on focusing any input under 16px, which was firing every time someone opened the Field Log to write an entry.
- `.mechanism-badge` bumped from a fixed 10px to 11px with slightly more padding.

## [4.2.0] - 2026-09-02

### Added
- **8 new events, 2 per zone** (28 total, up from 20): The Autocorrect Betrayal and The Performance Review Buzzword (Work); The Left-On-Read Text and The Different Voice on the Phone (Home); The Friend Who Remembers Everything and The RSVP You Regret (Social); The Unfinished Thing and The Accidental Self-Compliment (Self). Written through the QUEST mod chip's Room/Inventory framing \u2014 each scenario as a small, specific obstacle rather than a mood \u2014 while staying inside the existing schema and voice. Validated against `isValidContentPack`; no duplicate titles.

## [4.1.0] - 2026-09-02

### Added
- **A help panel (the "?" next to the title).** Explains the three stats, the turn loop, that a fourth unhinted option shows up sometimes, and what Extended Therapy is — without naming the five response tags or how Coping Mechanisms work mechanically. That stays something you find out by playing, on purpose.
- **Per-entry Field Log deletion.** Each logged entry now has a delete control next to its timestamp. The `id` generated for every entry since the Field Log shipped in 2.0.0 was previously write-only — nothing ever read it back. It does now.

### Changed
- **Field Log pattern reading no longer breaks ties silently.** `renderPattern()` used to sort tag counts and take the first result, which meant an exact tie was always resolved by object key order (`fawn` before `flight` before `fight`...), regardless of what you'd actually logged. Ties are now broken by recency — whichever response showed up most recently in the window wins — and if it's still a genuine tie, the reading says so by name instead of picking one silently.

### Fixed
- **Turn counter could briefly read past `maxTurns`** (e.g. `Turn: 11/10`) in the instant between the final choice resolving and the end screen covering it. Currently invisible in practice (`#end-screen` is opaque and fully covers the play area), but the counter now clamps to `maxTurns` at the display site itself, so it's correct independent of whatever the end-screen's CSS happens to be doing.

## [4.0.0] - 2026-09-01

### Changed
- **Split into discrete files.** The single 1760-line `index.html` is now `index.html` + `editor.html` + `css/style.css` + `css/editor.css` + `js/content.js` + `js/engine.js` + `js/field-log.js` + `js/main.js` + `js/editor.js`. `content.js` (the `DEFAULT_CONTENT` data and the storage layer) is the only code shared by both pages; the simulation engine and Field Log are game-only, and the editor logic is editor-only. Deploying or sharing this project now means copying the whole folder, not a single file.
- **The Editor is now its own page (`editor.html`), not a tab.** It no longer shares a JS runtime with the game — saving a pack writes to `localStorage` and shows a "▶ Play This Pack" link rather than restarting an in-page simulation. `index.html` picks up whatever pack is current on its own next load, automatically. It's also no longer linked from the game's nav — it's a dev-only tool now, reached by opening `editor.html` directly.
- Script loading uses plain `<script src>` tags in a fixed order, not ES modules — `type="module"` is blocked by CORS under `file://`, and the app needs to behave identically whether opened locally or hosted as static files (e.g. on Neocities).

### Fixed
- `getContent()` now documents (in `content.js`) that it returns `DEFAULT_CONTENT` by reference when no custom pack exists — callers must `deepClone()` before mutating it.
- The gameplay area could clip choices instead of showing them — `overflow-hidden` on the section holding the event text and choice buttons meant anything past the visible height was simply cut off, not scrollable. More choices per event (the editor now allows up to 5, plus the glitch choice) made this worse. Changed to `overflow-y-auto` so it scrolls instead.

## [3.0.0] - 2026-08-31

### Added
- **Content Engine** — the entire simulation (events, zones, coping mechanisms, glitch lines, survival endings, and every numeric knob) is now data in a single `DEFAULT_CONTENT` object, not hardcoded logic. A custom pack, once saved, fully overlays the defaults.
- **Editor tab** — a third mode alongside Simulation and Field Log. Write and edit events (zone, title, description, 2–5 choices each with response type, stat effects, and log line) through forms, no code required. Also edits zones (and their stat weighting), coping mechanism names/modifiers, survival endings (as reorderable condition rules: stat/operator/value), and every tunable number (starting stats, turn counts, glitch chance, unlock threshold, etc.).
- **Export / Import content packs** — download the active pack as JSON, or load one back in; a malformed or incomplete file is rejected with a clear message rather than corrupting the running game. Import loads into a review draft — nothing applies until you explicitly save.
- **Reset to Default** and **Discard Draft** controls, so experimenting in the editor is never a one-way door.

### Changed
- The five response identities (`fawn`/`flight`/`fight`/`freeze`/`secure`) remain fixed engine primitives — their display name and numeric effect are editable, their key identity is not, since both the simulation and the Field Log depend on it.
- Event rendering now assigns all user-authored text (titles, descriptions, choice text, field log entries) via `textContent` rather than HTML interpolation, since that text can now come from an imported file rather than only from code I wrote and reviewed.

### Fixed
- `getContent()` validates whatever it loads from storage and falls back to the default pack if it's missing required fields, so a corrupted or hand-edited save can't crash the simulation on boot.
- `pickWeightedEvent` no longer assumes the event pool has more than one entry — a content pack trimmed down to a single event no longer breaks turn progression.

## [2.0.0] - 2026-08-31

### Added
- **20 events across 4 zones** (Work / Home / Social / Self), replacing the original flat pool of 7.
- **Trauma-response tagging** — every choice is tagged `fawn`, `flight`, `fight`, `freeze`, or `secure`.
- **Coping Mechanisms** — leaning on the same response 3 times permanently unlocks a passive modifier on future choices of that type (bad responses compound worse, `secure` compounds better).
- **Card Shuffle glitch choice** — 15% chance per turn of a fourth, unlabeled option with fully randomized stat swings.
- **Adaptive event weighting** — event selection leans toward the zone tied to whichever stat is currently most endangered; no more back-to-back repeats.
- **Extended Therapy (New Game+)** — a 20-turn hard mode, unlocked permanently after a first survival, with all stat swings scaled 1.25x.
- **Five survival endings** (Powder Keg, Performer, Radically Undone, Fragile Equilibrium, Functional Enough) computed from final stat shape, replacing the single generic "You Survived."
- **Field Log** — a second, real-world mode alongside the fictional simulation. Log an actual moment, tag it with the same response vocabulary, and build a persistent local history. Includes a 7-day pattern view, a plain-language dominant-response reading, text export, and a confirm-gated clear. Entries never leave the browser — no backend, no network calls.

### Fixed
- Extended Therapy's unlock flag and the Field Log's storage both now degrade gracefully when `localStorage` is unavailable (e.g. sandboxed/embedded contexts), instead of throwing and silently breaking the win screen or the log.

## [1.0.0] - 2026-08-16
- Initial release: single-file browser game. Three stats (Repression, Social Mask, Inner Child), 7 events, 10-turn survival loop, CRT terminal aesthetic.
