# Elevation missing-card batch

User-selected batch, separate from `current-set-implementation.md`.

| Batch | Cards | Status | Owner / started |
| --- | --- | --- | --- |
| 1 | 35057, 35058, 35059, 35060, 35065, 35066 | In progress | Codex / 2026-10-16 |

Scope: the six missing NBN definitions listed in README.md, plus shared consumers strictly required by them. This does not certify the rest of Elevation or alter set availability.

Focused verification: `node tests/elevation-missing-cards.test.js`.
Shared verification: card status, AI hook documentation, Eternal format, deck pool, identity changes, then `node tests/run-all-tests.js` on Node 20.19.0.

## Completion log

No completions yet.

## Optimisation queue

| Batch | Status | Notes |
| --- | --- | --- |
| 1 | Not requested | To be populated after implementation. |

## Implementation notes

Rules text and examples obtained with the batch-brief code using an in-memory Elevation scope; the active tracker was not modified. Published ELO lookup: 2026-10-16, https://trash-or-busto.herokuapp.com/ranking (1931, 1418, 1640, 1628, 1496, 1484 respectively).
