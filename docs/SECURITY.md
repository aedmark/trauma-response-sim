# Security

The game has no server, accounts, or network calls; the risks are in what it renders and stores locally. This is not
a claim that it is vulnerability-free.

## Report a vulnerability

Open a private report on the GitHub repository (github.com/aedmark/trs) or contact the maintainer through the
itch.io page. Include the pack or steps that reproduce it.

## Assets and boundaries

| Asset or boundary | Threat | Protection | Status |
| --- | --- | --- | --- |
| Imported / shared content packs (`dlc/`, editor import) | Script injection through pack text | Text rendered with `textContent` | Holds; checked by `tools/smoke-test.js` (P1-01) |
| Content pack shape | Malformed pack breaks a run | `contentPackProblems()` on import and load | Run-breaking problems only; cosmetic gaps allowed (P1-02) |
| Field Log entries | Private, real personal notes | Stay in `localStorage`; never transmitted; separate delete confirm | Holds |
| Share image/text | Leaking more than intended | Built only from run numbers, seed, and optional name; sent only on tap | Holds |

## Secure development rules

- Treat every content-pack string as untrusted; use `textContent` or escape before any `innerHTML`.
- Add no network calls, analytics, or third-party scripts (D-001).
