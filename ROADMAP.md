# Roadmap

Item IDs are permanent: `P<phase>-<nn>`. Never renumber; append new items at the end of their phase.
`[ ]` open · `[~]` in progress (who holds it, since when, and what is left) · `[x]` done · `[-]` dropped (say why,
and the decision). An item held `[~]` by someone else is theirs until they or a maintainer release it.

A finished item says what was done, the decision if any, the evidence, and the date. A new item says where it came
from and the date. Bugs are items too, filed under the phase they belong to.

Work shipped before this roadmap existed (through 4.17.16) is recorded in [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Phase 1: Robustness

Goal: an imported or shared content pack can never break or script the page.

- [x] P1-01 Escape content-pack text rendered through `innerHTML` in Case Files. `js/codex.js` now builds the detail
  and headings with `textContent`. Evidence: `tools/smoke-test.js` "pack text in Case Files" check fails against the
  old `codex.js` and passes with the fix (2026-09-30). Found by code reading during the docs retrofit.
- [x] P1-02 Deepen pack validation. New `contentPackProblems()` (`js/content.js`) reports what would break a run
  (non-object events, no choices, unknown tags, non-numeric effects/config/mods); the editor's import lists the
  problems, and a malformed saved pack falls back to the default. Cosmetic gaps are still allowed. Evidence:
  `tools/check-content.js` and the smoke test's fallback check (2026-09-30).

## Phase 2: Verification

Goal: the checks that have been run by hand can be rerun by anyone.

- [x] P2-01 `node tools/check-content.js`: runs the game's validator on the default pack and `dlc/`, plus the
  default pack's own rules (2-5 choices, every choice tagged, unique titles, known zones). Tallies match CHANGELOG
  4.17.13; breaking an effect value and a tag in `work.js` made it exit 1 (2026-09-30).
- [x] P2-02 `node tools/smoke-test.js`: dependency-free headless Chromium run over the DevTools protocol (seeded
  run, seed replay, Case Files, pack-text escaping, malformed-pack fallback, Reset All Data). No npm dependency, per
  D-001. 7/7 checks, three consecutive runs (2026-09-30).
