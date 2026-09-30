# Testing

How to verify a change, what each check proves, and what it cannot. Results live in HANDOFF's "Current state".

Two committed checks cover content and the main player paths (P2-01, P2-02). Both are standard library only. Releases
before 4.17.17 were verified with one-off scripts described in [CHANGELOG.md](CHANGELOG.md).

## The checks

| Check | Command | Proves | Does not prove | Needs |
| --- | --- | --- | --- | --- |
| Content | `node tools/check-content.js` | Default pack and `dlc/` pass the game's validator; default pack has 2-5 tagged choices per event, unique titles, known zones | Balance, tone, or that endings are reachable | Node |
| Smoke | `node tools/smoke-test.js` | Page loads without errors; a seeded run ends; seeds replay; Case Files records and escapes pack text; bad saved pack falls back; Reset All Data spares the Field Log | Firefox, Safari, phones, share sheet, timed events, editor UI, `file://` | Node 22+, Chromium or Chrome (`CHROME=` to override); about 5 s |
| Syntax | `node --check js/<file>.js` (each changed file) | The file parses | That it runs or loads in order | Node |
| Docs | `python3 tools/check_docs.py` | Links, roadmap/decision IDs, no placeholders | That the docs are true | Python 3 |
| Case File indices | `node tools/verify-casefile-indices.js` | JS endings/mechanisms order matches the SCI port's `CaseFileTitles.sc` | Anything about the browser game | TRS_SCI checkout (`TRS_SCI_DIR`) |
| Manual play | serve and play (below) | The change works in one browser | Other browsers, phones | A browser |

## Running the game

```bash
python3 -m http.server 8934
```

Then open http://localhost:8934/ (or use the `static-server` preview in `.claude/launch.json`). Also try `file://`
for anything touching loading or storage, since that is a supported way to play.

- **Clean state:** use ⚠ Reset All Data, or a fresh private window. Leftover `localStorage` (a custom pack, Case
  Files progress, the Extended Therapy unlock) changes what you see.
- **Reproducible runs:** set a seed on the splash screen; the same seed replays the same run.

## Change-to-check matrix

| Changed area | Minimum checks |
| --- | --- |
| Documentation only | `python3 tools/check_docs.py` |
| Any game code | `node tools/check-content.js` and `node tools/smoke-test.js` |
| Event or ending content | `node --check` on the file; play a seeded run; if endings/mechanisms changed shape, `verify-casefile-indices.js` |
| Engine or UI | `node --check`; manual play through to an ending; check the console for errors |
| Storage or reset | manual play from clean state, then reload and confirm what persisted |
| Editor or pack import | round-trip a pack through the editor, then play with it |
| SCI generators | run the generator against a TRS_SCI checkout and compile there (see the archived port handoff) |

## Known pitfalls

- Pack edits made in the editor persist in `localStorage` and override the default content; reset before judging
  default content.
- Case Files wipes itself when pack shape changes; that is intended, not a bug.
- The smoke test plays by clicking the first non-glitch choice each turn, with timed events off. A change to event
  order or the RNG changes its ending and turn count; only a missing ending or a replay mismatch is a failure.
- The smoke test sometimes leaves a `trs-smoke-*` profile in the system temp dir (Chrome still writing on exit).
