# Trauma Response Simulator

A turn-based, dark-comedy browser game (T.R.S.) in which every choice is secretly one of five trauma responses, plus
a separate, sincere Field Log journal. Plain static HTML/CSS/JavaScript: no build step, no server, no dependencies,
all state in the player's `localStorage`. The repository also holds Node generator scripts (`tools/`) that turn this
game's content into source for the SCI0 port, which lives in its own repository (github.com/aedmark/TRS_SCI).

This is the canonical instruction file for coding agents. `CLAUDE.md` imports it; do not duplicate these rules in
tool-specific files. Project facts belong in the documents linked below, not in an agent's private memory.

## Start here

1. Read `docs/HANDOFF.md` for the current state, active work, and gotchas.
2. Read the relevant roadmap item and the parts of `docs/ARCHITECTURE.md` and `docs/TESTING.md` that apply.
3. Inspect `git status` and recent history. Do not overwrite work you did not create.
4. Verify important inherited claims before relying on them. Use the fastest relevant check first.
5. State the intended scope briefly, then work on one independently reviewable change at a time.

If the request conflicts with these instructions or the working tree contains overlapping edits, stop and ask the
maintainer.

## While working

- Reference roadmap IDs where one exists. Do not invent an ID for an incidental, self-contained fix.
- Keep changes scoped. Do not mix opportunistic refactors with requested work.
- Preserve user changes. Never reset, clean, or rewrite history without explicit permission.
- Record a decision in `docs/DECISIONS.md` when reasonable maintainers could revisit the choice later.
- Update documentation in the same change when behaviour, content-pack schema, commands, or structure change.
  Content-pack fields are documented for authors in `AUTHORING.md`.
- Distinguish observed facts from inference. Include the command, date, or browser behind volatile claims.
- Treat imported content packs (`dlc/`, the editor's import) as untrusted input: render their text with
  `textContent`, never `innerHTML` (see `docs/SECURITY.md`).
- Add newly discovered work to `ROADMAP.md` only when it is genuinely out of scope for the current change.

## Finishing a change

1. Run the checks appropriate to the change, following `docs/TESTING.md`. Record failures and anything not run.
2. Review the diff for unrelated edits, stale names, and documentation drift.
3. Update `docs/HANDOFF.md` if work will continue in another session or if the repository's current state changed.
4. Update the roadmap, decisions, architecture, security notes, and changelog only when their update trigger applies
   (see `docs/README.md`).
5. Run `python3 tools/check_docs.py` and report the result.

Do not manufacture ceremony: typo-only or mechanical changes do not need a decision, changelog entry, or handoff
rewrite unless they alter a claim those documents make.

## Working agreement

Solo project, direct-to-main. The maintainer commits and pushes; an agent commits only when asked and never pushes,
publishes (itch.io, GitHub releases), or adds a dependency without explicit permission.

- Default branch: `main`.
- Commit format: short imperative summary. (History so far uses one-word messages such as "SCI-Version".)
- Version scheme: `MAJOR.MINOR.PATCH`, source of truth is the newest heading in `docs/CHANGELOG.md` (currently
  4.17.16). The version is not stamped into the code.

Never force-push, rewrite shared history, or publish without explicit permission.

## Maintainer preferences

- **Writing:** plain, specific, dryly funny in player-facing text; the Field Log's text is sincere, never a joke.
  Game content style rules are in `AUTHORING.md`.
- **Code comments:** explain what and why; no debugging narrative or session history in comments.
- **Asking vs. doing:** ask before anything that changes save compatibility, removes content, or touches the
  separate TRS_SCI repository.
- **Reporting:** say what was verified and how (e.g. a scripted Playwright pass), and what was not.

## Protected areas

| Path or thing | Rule | Why |
| --- | --- | --- |
| `uct_*` `localStorage` keys | Never rename | Renaming orphans every existing player's saves (D-002) |
| `aedmark.itch.io/trs`, `github.com/aedmark/trs` links | Change only after the real target moves | Otherwise the links 404 |
| `dlc/` | Do not edit | Third-party content packs, credited to their authors |
| Field Log wording and its "not therapy" notice | Do not weaken or joke about | Real journal for real people (D-004) |
| `docs/archive/` | Append only | Historical record |

## Names and terms

| Canonical term | Meaning | Formerly / not to be confused with |
| --- | --- | --- |
| Trauma Response Simulator, T.R.S. | The product | Unresolved Childhood Trauma Simulator, U.C.T.S. (renamed 4.17.16) |
| Content pack | The one JSON structure holding events, endings, zones, stat names and knobs | "DLC" (the folder name for shared packs) |
| Mechanism / coping mechanism | One of `fawn`, `flight`, `fight`, `freeze`, `secure`; unlocks after 3 uses in a run | "tag" (the field name on a choice) |
| Case Files | Persistent cross-run archive of seen endings and mechanisms | `codex` (the code and storage name) |
| Extended Therapy | New Game+: double turns, scaled effects | Arcade mode (separate endless mode) |
| Field Log | The sincere journal mode | The simulation |
| SCI0 port | The DOS/Sierra-engine version, in the TRS_SCI repo | This repo's `tools/`, which only generate its sources |

## Repository map

| Path | Purpose |
| --- | --- |
| `index.html` | The game; loads `js/` in dependency order |
| `editor.html` | Visual content-pack editor |
| `js/` | Game engine, content, Case Files, Field Log, editor |
| `js/events/` | The 196 default events, one file per zone |
| `css/` | Styles for the game and the editor |
| `dlc/` | Shared third-party content packs |
| `tools/` | SCI0-port generators and checks (Node), plus `check_docs.py` |
| `AUTHORING.md` | Content-pack authoring guide and schema |
| `AGENTS.md` | Canonical agent instructions |
| `ROADMAP.md` | Planned work with stable IDs |
| `docs/README.md` | Documentation map and update triggers |
| `docs/HANDOFF.md` | Current state, next steps, gotchas, and session history |
| `docs/ARCHITECTURE.md` | Components, invariants, state, and failure modes |
| `docs/DECISIONS.md` | Append-only decisions; open questions |
| `docs/TESTING.md` | How changes are verified and what is not |
| `docs/SECURITY.md` | Trust boundaries and reporting |
| `docs/CHANGELOG.md` | Release notes |
| `docs/archive/` | Historical material no longer current |
| `tools/check_docs.py` | Documentation consistency checks |

## Engineering conventions

- Vanilla ES2015+ in classic `<script>` tags sharing globals; no modules, bundler, framework, or npm dependencies
  for the game. Script order in `index.html`/`editor.html` matters.
- Must work from `file://` and from any static host. Nothing may require a server or network access.
- All randomness in a run goes through the seeded RNG so seeds replay identically (see ARCHITECTURE).
- Content lives in the content pack, not in engine code; a new engine feature that has text or tunables gets pack
  fields and `AUTHORING.md`/editor support.
- `tools/` scripts run on Node and write into the TRS_SCI checkout (`TRS_SCI_DIR`, default
  `~/RiderProjects/TRS_SCI`); their output is committed there, not here.

## Environments

| Environment | Can access | Cannot access / caveats |
| --- | --- | --- |
| Local development (Linux, fish shell) | Python 3, Node, a browser; the TRS_SCI checkout if present | No CI; checks run by hand (`docs/TESTING.md`) |

## Run and verify

- Run: open `index.html`, or `python3 -m http.server 8934` (the `static-server` entry in `.claude/launch.json`).
- Fast checks: `node tools/check-content.js`, `node tools/smoke-test.js`, `python3 tools/check_docs.py`.
- Detailed guidance: `docs/TESTING.md`.
