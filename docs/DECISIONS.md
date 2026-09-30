# Decisions

Short, append-only record of choices a future session might otherwise re-litigate. Newest at the bottom. To reverse
a decision, add a new entry that supersedes it; the old one keeps its text and only its status changes.

Format:

```
## D-NNN Title  (YYYY-MM-DD, status: proposed | accepted | rejected | superseded by D-MMM)
**Context:** **Decision:** **Alternatives:** **Consequences:** **Review trigger:** (optional)
```

The SCI0 port's own decisions (engine target, permanent cuts, DOSBox-X as test target) are in
[archive/SCI_PORT_HANDOFF_2026_09.md](archive/SCI_PORT_HANDOFF_2026_09.md), "Decisions already made".

---

## D-001 Static site, no build step, no dependencies  (2026-08-16, status: accepted, recorded 2026-09-30)
**Context:** Inherited from the first commit; README promises "open `index.html`, that's the whole install".
**Decision:** Plain HTML/CSS/JS in classic scripts; must run from `file://` and any static host.
**Alternatives:** A bundler or framework: adds a build and a dependency tree for no player-visible gain.
**Consequences:** Globals and script order matter; no module isolation; no npm test tooling in the repo.

## D-002 Keep the `uct_*` storage keys after the rename  (2026-09-08, status: accepted, recorded 2026-09-30)
**Context:** 4.17.16 renamed U.C.T.S. to T.R.S.
**Decision:** Storage keys keep the old prefix.
**Alternatives:** Rename with a migration: risk for no visible benefit.
**Consequences:** Old acronym stays in code; see CHANGELOG 4.17.16 for the full list of deliberate non-renames.

## D-003 Choice effects stay hidden  (status: accepted, recorded 2026-09-30)
**Context:** Core design, stated in README ("no hint, no preview").
**Decision:** Never show a choice's effects or tag before it is picked, including in Case Files.
**Consequences:** Survival cases are numbered, not labelled by condition.

## D-004 The Field Log is sincere and local-only  (status: accepted, recorded 2026-09-30)
**Context:** README and the app both say it is a self-tracking tool, not therapy.
**Decision:** No jokes in Field Log text; its crisis notice stays; its data is cleared only by a separate confirm.
**Consequences:** Reset All Data asks twice.

## Open questions

- **Q-001** Should the SCI0 generators in `tools/` move to the TRS_SCI repo, leaving this repo browser-only?
  (asked 2026-09-30 by the docs retrofit; blocks nothing; recommendation: move them, since they write only there)
