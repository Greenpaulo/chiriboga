# Elevation missing-card batch

User-selected batch, separate from `current-set-implementation.md`.

| Batch | Cards | Status | Owner / started |
| --- | --- | --- | --- |
| 1 | 35057, 35058, 35059, 35060, 35065, 35066 | Implemented; final verification pending | Codex / 2026-10-16 |

Scope: the six missing NBN definitions listed in README.md, plus shared consumers strictly required by them. This does not certify the rest of Elevation or alter set availability.

Focused verification: `node tests/elevation-missing-cards.test.js` and `node tests/elevation-missing-cards-engine.test.js`.
Shared verification: card status, AI hook documentation, Eternal format, deck pool, identity changes, then `node tests/run-all-tests.js` on Node 20.19.0.

## Completion log

| Date | Agent | Evidence | Handoff |
| --- | --- | --- | --- |
| 2026-10-16 | Codex | Both Elevation focused tests, AI hook docs, card status, format/deck/identity checks passed. | All six cards implemented with baseline AI. Final full-suite result unverified; polling stopped at the user’s request. |

## Optimisation queue

| Batch | Status | Notes |
| --- | --- | --- |
| 1 | Pending | Compare tag retention with economy/kill/scoring plays; improve Synapse free-install destinations and follow-up rez budgets; plan Reporting tutors against next-turn costs and Nebula flip opportunities; compare Next Big Thing shuffles with agenda flood and competing clicks; rank IP Enforcement destinations by security rather than ICE count. |

## Implementation notes

Rules text and examples obtained with the batch-brief code using an in-memory Elevation scope; the active tracker was not modified. Published ELO lookup: 2026-10-16, https://trash-or-busto.herokuapp.com/ranking (1931, 1418, 1640, 1628, 1496, 1484 respectively).

- Nebula tracks the first operation across flips, resets each turn, and switches between its front art and `images/35057-0.jpg` reverse art when it flips. Its first-operation refund is finite in the real advancement search.
- Synapse consumes its opportunity on the first actual tag removal, even with no install target or when declined. Revealed installs remain known to the Runner and ignore all installation costs. The shared `RemoveTags` continuation preserves subsequent effects and decisions; Bahia Bands, The Basalt Spire, Nihilo Agent and Qt Inc. were adapted where necessary.
- Embedded Reporting uses scoring-time requirement/counter snapshots (Comprehensive Rules v26.03 §10.13.2). SanSan's modifier is captured before the agenda leaves its server. Human searches can decline without spending or fail to find a card while still spending/shuffling.
- Next Big Thing's Corp-only click ability is discoverable from either score area without activating its other abilities there. Drawing waits for draw responses before the any-number HQ shuffle choice.
- IP Enforcement pays tags before the play trigger/effect, uses printed agenda points, installs without cancellation, removes old hosted counters after install payment (§1.13.13), and places its advancement counter only after installation completes if the Runner remains tagged. Its null printed credit cost is represented as zero; the additional tag cost supplies X.
- Bigger Picture removes tags before transferring credits and gains exactly the result of `LoseCredits`, including a capped/blocked loss. Both modes and zero-tag removal are supported.
- Engine evidence uses actual `Play`, `Install`, `Score`, `Draw`, `Reveal`, tag-removal responses and paid-ability phase transitions. VM evidence exercises real Corp command/target selectors, install and tutor selection, and read-only advancement search. No browser walkthrough is claimed.

Verification notes: the first full run overlapped source edits and consequently failed its replay/cache-key consistency check; a second stable-source full run was started, but its result was not checked after the user requested an immediate handoff. The user may verify with `node tests/run-all-tests.js` on Node 20.19.0. Local image assets are linked from the main checkout into this temporary worktree. Shared VM test stubs were updated to model Draw/RemoveTags continuations and scoring's advancement-requirement dependency without relaxing their assertions.

Handoff: worktree `/private/tmp/chiriboga-elevation-last-few`, branch `cards/elevation-implementation-last-few-cards`. No additional commits or pushes were made. The active set tracker was not changed. Gameplay and baseline AI are implemented; final regression verification remains pending, and no full-suite pass is claimed.
