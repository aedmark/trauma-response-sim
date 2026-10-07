# Documentation map

Each fact has one authoritative home; other documents link to it instead of copying it.

## Audiences and ownership

| Document | Primary audience | Owns | Does not own |
| --- | --- | --- | --- |
| `../README.md` | Players and newcomers | What the game is, how to run it | Internal workflow or session state |
| `../AUTHORING.md` | Content-pack authors | Pack fields, schema, content style | Engine internals |
| `../AGENTS.md` | Coding agents and the maintainer | Working rules and repository conventions | Feature history or design rationale |
| `../ROADMAP.md` | The maintainer | Planned scope and status | Implementation notes |
| `HANDOFF.md` | The next work session | Current state and next steps | Permanent design rules |
| `ARCHITECTURE.md` | Developers | Code map, invariants, state | Chronological history |
| `DECISIONS.md` | Future decision-makers | Rationale for durable choices | Routine implementation detail |
| `TESTING.md` | Contributors | How to verify, and what is not verified | Results (those live in HANDOFF) |
| `SECURITY.md` | Contributors, reporters | Trust boundaries and reporting | Architecture detail |
| `CHANGELOG.md` | Players | Released changes | Session logs |
| `trs.manual.json`, `manual.html` | Newcomers and maintainers | Evidence-linked What / How / Why synthesis and its generated view | Authoritative topic detail or chronological history |
| `Itch.md` | The itch.io page | Store-page copy for the browser game | Everything else |
| `SCI0-research-findings.md`, `sci0-control-screen-hotspots.md` | SCI0-port work | Research notes kept from the port | Current port state (TRS_SCI repo) |
| `archive/` | Anyone checking history | Retired documents | Anything current |

## Update triggers

Update documents because a relevant fact changed, not merely because a session ended.

| Change | Required documentation |
| --- | --- |
| Player-visible behaviour | CHANGELOG; README if it describes the feature |
| Content-pack field or schema | AUTHORING, the editor, ARCHITECTURE if the engine contract changed |
| New file, `localStorage` key, or data flow | ARCHITECTURE |
| Durable tradeoff or reversal | DECISIONS; mark the old decision superseded |
| Verification command or known limitation | TESTING |
| Trust boundary or untrusted-input handling | SECURITY |
| Behavior, architecture, or rationale covered by the 3x manual | `trs.manual.json`; rebuild `manual.html` |
| Work pauses with context another session needs | HANDOFF |
| New planned work | ROADMAP, with origin and done-when |

## Style and evidence

- Use exact commands and repository-relative paths.
- Date volatile observations and name the browser or environment when it matters.
- Link to the source of truth instead of restating it.
- Preserve 3x entry IDs when titles change, cite evidence for implementation claims, and label inferred rationale.
