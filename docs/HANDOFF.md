# Session Handoff

Read this first when resuming work. Rewrite "Current state" when it changes materially; the session log is
append-only. Keep "Current state" under about 80 lines.

Protocol: [AGENTS.md](../AGENTS.md). Plan: [ROADMAP.md](../ROADMAP.md). Architecture: [ARCHITECTURE.md](ARCHITECTURE.md).
Decisions: [DECISIONS.md](DECISIONS.md). Tests: [TESTING.md](TESTING.md). Security: [SECURITY.md](SECURITY.md).
Changes: [CHANGELOG.md](CHANGELOG.md). Older material: [archive/](archive/README.md).

---

## Current state

_Last updated: 2026-10-07, session 3, on `main` after 0a39b2c; the 3x manual work is uncommitted._

**Where things stand:** the browser game is at 4.17.16 plus unreleased fixes (see CHANGELOG): pack text is no longer
parsed as HTML in Case Files, and packs are validated deeply on import and load. The repo has two committed,
dependency-free game checks. A 3x What / How / Why manual now has a validated JSON source and generated standalone
HTML view; its generator, schema, tests, and upstream license are integrated under `tools/` and `docs/`. The SCI0
port lives in its own repo; this repo keeps only its generators in `tools/`.

**Verified** (latest: 2026-10-07, Linux; game checks last run 2026-09-30 with Node 22.23.3 and system Chromium)

| Check | Result |
| --- | --- |
| `node tools/check-content.js` | **2/2 ok** (default pack: 196 events; fawn 152, flight 132, fight 132, freeze 134, secure 196) |
| `node tools/smoke-test.js`, three runs | **7/7, 7/7, 7/7** |
| `python3 tools/check_docs.py` | **0 errors, 0 warnings** |
| `python3 tools/manual.py check docs/trs.manual.json` | **4 sections, 13 entries, 0 warnings** |
| `python3 tools/test_manual.py -v` | **6/6 passed** |
| 3x manual build | **`docs/manual.html`, 44,645 bytes, 0 warnings** |

**Not verified**
- Visual browser review of `docs/manual.html`; the in-app browser's URL policy blocked the local `file://` page.
- The editor's import error message (`js/editor.js`) was not exercised in a browser; only `node --check`.
- Firefox, Safari, phones, `file://`, timed events, share sheet.

**Gotchas for the next session**
- `3x-documentation-scheme/` is the maintainer-supplied reference checkout and a nested Git repository; it remains
  unmodified and untracked. The project-owned copies used by the manual are listed in the repository map.
- `docs/Itch-SCI.md` was deleted in the working tree by the maintainer before session 1; left as is.
- `tools/` generators throw unless a TRS_SCI checkout exists at `TRS_SCI_DIR` (default `~/RiderProjects/TRS_SCI`).

## Next steps (in order)

1. Maintainer: review and commit; decide the version number for the Unreleased CHANGELOG section.
2. Q-001: decide where the SCI generators live.

## Open questions for maintainers

- Q-001 Move `tools/` generators to TRS_SCI? (blocks nothing)

## Session log

Newest first. Past 10 entries, move the oldest to `docs/archive/`.

### Session 3: 2026-10-07: apply the 3x documentation scheme

**Contributor:** Codex
**Goal:** Apply the supplied 3x What / How / Why documentation template to this project.
**Done:** added `docs/trs.manual.json` with 13 evidence-linked entries and generated `docs/manual.html`; integrated
the manual into AGENTS, README, the documentation map, testing guidance, and D-005. Copied the reusable schema,
generator, license notice, and focused tests into project-owned paths; left the supplied nested repository untouched.
**Decisions:** D-005 keeps the manual as a generated synthesis; focused Markdown remains authoritative.
**Verified:** manual validation and build, the 6 focused generator tests, and the project documentation check; full
results are in Current state.
**Not verified:** local browser policy blocked visual review of the generated HTML; no game code changed, so no
play-through.
**Next session should start with:** maintainer review, then Q-001.

### Session 2: 2026-09-30: fix the issues found in session 1

**Contributor:** Claude Code (Opus 5.5)
**Goal:** P1-01, P1-02, P2-01, P2-02.
**Done:** all four.
**Changed:** `js/codex.js` (text-only detail and headings), `js/content.js` (`contentPackProblems()`; used by
`isValidContentPack()`), `js/editor.js` (import lists problems), new `tools/check-content.js` and
`tools/smoke-test.js`; AUTHORING, TESTING, SECURITY, ARCHITECTURE, CHANGELOG updated.
**Decisions:** smoke test drives Chromium over the DevTools protocol instead of Playwright to keep D-001 (no npm
dependencies); not a new D-entry.
**Verified:** see Current state. Mutation checks: old `codex.js` fails the escaping check; a string effect value
and a bad tag in `work.js` make `check-content.js` exit 1.
**Not verified:** editor import UI in a browser.
**Problems / surprises:** Chrome sometimes still holds its temp profile on exit; cleanup made best-effort.
**Next session should start with:** Q-001, after the maintainer commits.

### Session 1: 2026-09-30: adopt the agent documentation template

**Contributor:** Claude Code (Opus 5.5)
**Goal:** adopt `docs/agent-template` and retrofit existing docs.
**Done:** AGENTS/CLAUDE/ROADMAP and `docs/` set created; `SESSION_HANDOFF.md` archived as
`docs/archive/SCI_PORT_HANDOFF_2026_09.md`; `CHANGELOG.md` moved to `docs/`; template deleted.
**Decisions:** D-001 to D-004 recorded as pre-existing.
**Verified:** `python3 tools/check_docs.py`: 0 errors, 0 warnings.
**Not verified:** no game code changed, so no play-through.
**Corrections:** the old handoff described the SCI port as living in this repo; `tools/lib/sci-paths.js` shows it
moved to its own repo.
**Next session should start with:** P1-01.
