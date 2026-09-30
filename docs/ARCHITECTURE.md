# Architecture

How the Trauma Response Simulator fits together, for a session that has never seen it. Why things are this way
lives in [DECISIONS.md](DECISIONS.md).

## The shape, in one paragraph

The browser opens `index.html`, which loads plain scripts in order: the default content (`js/content-*.js`,
`js/events/*.js`), then `js/content.js` (which merges them into `DEFAULT_CONTENT` and swaps in a saved custom pack if
one is valid), then Case Files, the engine, the Field Log and `js/main.js` (splash, modes, reset). Each turn the
engine picks a zone-weighted event, shows its choices, applies hidden stat effects plus any unlocked mechanism
modifier, and checks for an ending. Everything persists to `localStorage`. Nothing leaves the device except a share
image or text the player hands to the OS share sheet or clipboard themselves. `editor.html` edits the same content
pack and saves it under the same key.

## Code map

| Area | Where | Entry point | Talks to |
| --- | --- | --- | --- |
| Default content | `js/content-mechanisms.js`, `js/content-endings.js`, `js/events/*.js`, `js/content-events.js` | globals | `js/content.js` |
| Content pack load/save | `js/content.js` | `getContent()`, `contentPackProblems()` | `localStorage` |
| Run loop | `js/engine.js` | `startGame()`, `loadRandomEvent()`, `handleChoice()`, `checkGameEnd()` | content, Case Files, DOM |
| Seeded RNG | `js/engine.js` | `makeRng()` (`mulberry32` over `hashSeed`) | run loop |
| Share card/text | `js/engine.js` | `buildShareText()`, canvas helpers | Web Share API, clipboard |
| Case Files | `js/codex.js` | discovery record + screen | `localStorage` |
| Field Log | `js/field-log.js` | journal screen | `localStorage` |
| Splash, modes, reset | `js/main.js` | `showSplash()`, `resetAllGameData()` | everything above |
| Content editor | `editor.html`, `js/editor.js` | | `js/content.js` |
| SCI0 generators | `tools/gen-*.js`, `tools/lib/` | `node tools/gen-work-events.js` etc. | reads `js/`, writes the TRS_SCI checkout |

## Invariants

- Every random draw inside a run comes from the run's seeded RNG, so a seed replays identically. `Math.random` is
  used only to generate a fresh seed and Field Log IDs. Enforced by: `tools/smoke-test.js` (one seed, default pack).
- Stats are clamped to 0-100; a run ends when Repression reaches 100 or Mask/Child reach 0, or the turn limit
  passes. Enforced by: nothing automated.
- Effects are hidden from the player before choosing. Enforced by: nothing automated (D-003).
- `localStorage` key names never change (D-002).
- Case Files resets itself when a loaded pack's shape (pool sizes, mechanism keys) no longer matches its saved
  signature. Enforced by: `js/codex.js`.
- Case File index layout (survival 0-71, failure 72-101, mechanisms 102-106) matches the SCI port's
  `CaseFileTitles.sc`. Enforced by: `node tools/verify-casefile-indices.js` (needs the TRS_SCI checkout).

## Boundaries

| Boundary | Comes in as | Checked by | Rule |
| --- | --- | --- | --- |
| Imported / saved content pack | JSON from a file or `localStorage` | `contentPackProblems()` (P1-02) | Render text with `textContent` (P1-01) |
| Player name, seed, Field Log entry | form text | none | Rendered as text; stays in `localStorage` |

## Dependencies

None at runtime. `tools/` needs Node (standard library only; the smoke test needs Node 22+ and a local Chromium or
Chrome); `tools/check_docs.py` needs Python 3.

## State and caches

| What | Where (`localStorage` key) | Written by | Reset by |
| --- | --- | --- | --- |
| Custom content pack | `uct_custom_content_v1` | editor | Reset All Data; editor reset |
| Case Files | `uct_codex_v1` | `js/codex.js` | Reset All Data; pack-shape mismatch |
| Extended Therapy unlock | `uct_extended_unlocked` | engine | Reset All Data |
| Arcade high score | `uct_arcade_highscore` | engine | Reset All Data |
| Player name, Timed Events pref | `uct_player_name`, `uct_timed_pref` | `js/main.js` | Reset All Data |
| Field Log | `uct_field_log_v1` | `js/field-log.js` | Only the separate second confirm of Reset All Data, or per-entry delete |

## Claims vs. code

- The engine's default stat label is "Repression Level" (`DEFAULT_STAT_LABELS`); README calls it "Repression".
- Generator comments in `tools/` point at `docs/archive/SCI_PORT_HANDOFF_2026_09.md`, which describes the port as
  living inside this repo; it no longer does.
