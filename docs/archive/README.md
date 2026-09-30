# Archive

History moved out of the live docs. Nothing here is current; everything here was true when it was written.
Search it before re-trying something that sounds new.

- `SCI_PORT_HANDOFF_2026_09.md`: the SCI0 port's session handoff (architecture, SCI Companion/Wine/DOSBox-X
  findings, heap-exhaustion history), written while the port lived in this repo. Moved 2026-09-30; the port now
  lives in github.com/aedmark/TRS_SCI. The generator comments in `tools/` still point into it.
- **Session logs:** when HANDOFF's session log passes 10 entries, move the oldest whole to
  `SESSION_LOG_YYYY_MM.md`. `tools/check_docs.py` reads these files too.
- **Anything else:** one file per thing, with a line at the top saying when and why it was moved.

Leave a one-line pointer where the text used to be.
