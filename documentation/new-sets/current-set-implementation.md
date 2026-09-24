# Current Card-Set Implementation

This is the canonical handoff and progress log for the one card set currently
being implemented in batches. The generic agent runbooks read this file to learn
which set and batch to work on; they must not hardcode a set name themselves.

User-facing prompts and operating instructions are in
`documentation/new-sets/card-set-agent-operator-guide.md`.

Do not run multiple agents against this tracker or its definition file at the
same time.

## Active set

| Field                         | Value                                    |
| ----------------------------- | ---------------------------------------- |
| Status                        | Active                                   |
| Set name                      | Vantage Point                            |
| Registry key                  | `vantagepoint`                           |
| Pack code                     | `vp`                                     |
| Definition file               | `sets/vantagepoint.js`                   |
| Metadata file                 | `carddata/carddata.json`                 |
| Card range                    | `36001–36066`                            |
| Registry state during batches | `hidden: true`, `untested: true`         |
| Focused integration test      | `tests/vantagepoint-integration.test.js` |

If `Status` is `Inactive`, an agent must not infer or start a set. It should
report that no current set has been selected.

## Batch selection rule

1. Resume the first batch marked `In progress`, if one exists.
2. Otherwise claim the first `Pending` batch.
3. Never skip a `Blocked` batch silently. If it is the first outstanding batch,
   report its blocker unless the user explicitly authorizes another batch.
4. Implement exactly one batch per runbook invocation.
5. If all batches are `Complete`, report that the set-wide review is next.

Allowed statuses are `Pending`, `In progress`, `Blocked` and `Complete`.

## Status summary

**7 complete, 6 outstanding** (`6 Pending`, `0 In progress`, `0 Blocked`).

Agents must refresh these counts whenever a batch status changes.

## Batch queue

| Batch | Card IDs    | Status   | Owner / started          | Notes/blocker                                                              |
| ----: | ----------- | -------- | ------------------------ | -------------------------------------------------------------------------- |
|     1 | 36001–36004 | Complete | Antigravity / 2026-09-18 | Reviewed and repaired by Codex; behavioral and full regression suites pass |
|     2 | 36005–36008 | Complete | Codex / 2026-09-18       | Mechanics, AI and focused/full regressions pass                            |
|     3 | 36009–36016 | Complete | Codex / 2026-09-18       | Mechanics, AI and focused/full regressions pass                            |
|     4 | 36017–36020 | Complete | Codex / 2026-09-24       | Mechanics, AI and focused/full regressions pass                            |
|     5 | 36021–36025 | Complete | Codex / 2026-09-24       | Mechanics, AI and focused/full regressions pass                            |
|     6 | 36026–36030 | Complete | Codex / 2026-09-24       | Mechanics, AI and focused/full regressions pass                            |
|     7 | 36031–36035 | Complete | Codex / 2026-09-24       | Mechanics, AI and focused/full regressions pass                            |
|     8 | 36036–36040 | Pending  | —                        | —                                                                          |
|     9 | 36041–36045 | Pending  | —                        | —                                                                          |
|    10 | 36046–36050 | Pending  | —                        | —                                                                          |
|    11 | 36051–36055 | Pending  | —                        | —                                                                          |
|    12 | 36056–36060 | Pending  | —                        | —                                                                          |
|    13 | 36061–36066 | Pending  | —                        | —                                                                          |

When claiming a batch, record the agent/extension name and current date in
`Owner / started`. When blocked, put the actionable reason in `Notes/blocker`.

## Completion log

This table is append-only evidence of completed batches. A batch is not complete
until its queue row and this log have both been updated after all tests pass.
Do not remove an older entry if later work revisits one of its cards.

| Batch | Card IDs    | Completed  | Agent       | Focused tests                                             | Notes                                                                                                                                                                             |
| ----: | ----------- | ---------- | ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | 36001–36004 | 2026-09-18 | Antigravity | `vantagepoint-integration.test.js`                        | Implemented Chain Reaction, Take a Dive, The Tungsten Tailor, Corsair; added subroutine resolution & central run tracking in `phase.js`                                           |
|     1 | 36001–36004 | 2026-09-18 | Codex       | `vantagepoint-integration.test.js`; all `tests/*.test.js` | Repaired turn tracking, trash sequencing, uniqueness and stealth payment/AI modelling; added behavioral coverage                                                                  |
|     2 | 36005–36008 | 2026-09-18 | Codex       | `vantagepoint-integration.test.js`; all `tests/*.test.js` | Implemented Lampades, Hackerspace, Nurse Hạnh and Stick and Poke; added grouped Archives faceup and zero-damage continuation support                                              |
|     3 | 36009–36016 | 2026-09-18 | Codex       | `vantagepoint-integration.test.js`; all `tests/*.test.js` | Implemented Vic, Kompromat, Sell Out, Tailgate, Borrowed Goods, Rotary, Baker and Underdome Irregulars; added Corp-controlled Runner abilities and a pre-approach response window |
|     4 | 36017–36020 | 2026-09-24 | Codex       | `vantagepoint-integration.test.js`; `credit-pool-lock.test.js`; all `tests/*.test.js` | Implemented Hiram, Aircheck, Beta Build and Methuselah; added credit-pool locking and post-run cleanup hooks plus payment/tutor compatibility repairs |
|     5 | 36021–36025 | 2026-09-24 | Codex       | `vantagepoint-integration.test.js`; `forfeit-restriction.test.js`; all `tests/*.test.js` | Implemented Touchstone, Read-Write Share, Sipa, Stowaway and Word on the Street; added non-forfeitable score-area cards and legal forfeit filtering |
|     6 | 36026–36030 | 2026-09-24 | Codex       | `vantagepoint-integration.test.js`; `play-and-steal-cost.test.js`; all `tests/*.test.js` | Implemented Méliès City Luxury Line, Synchrocyclotron, Ansel 2.0, Reverb and Sleipnir; added shared play-click and additional steal-cost handling |
|     7 | 36031–36035 | 2026-09-24 | Codex       | `vantagepoint-integration.test.js`; `subroutine-visual.test.js`; all `tests/*.test.js` | Implemented Vertigo, Caveat Emptor, realloc(), Retirement Plan and Perfect Recall; added Corp declarative operation priorities and click-aware ICE-specific run modelling |

## Required shared verification

Run focused batch tests plus all commands below:

```sh
node --check sets/vantagepoint.js
node tests/vantagepoint-integration.test.js
node tests/eternal-format.test.js
node tests/deckbuild-format-pool.test.js
node tests/decklauncher-identity-change.test.js
git diff --check
```

If shared engine files change, run their relevant regression suites too.

## Changing the active set

Only change this section when the current set has completed its separate
set-wide review or the user explicitly changes priorities.

Before replacing the active set:

1. Preserve its final completion summary and accepted limitations in
   `documentation/new-sets/card-implementation-backlog.md`.
2. Replace every value in **Active set**, the status summary, batch queue,
   completion log and verification commands.
3. Verify the new batches cover every intended card exactly once without gaps
   or overlaps.
4. Leave the generic Codex and external-agent runbooks unchanged.
