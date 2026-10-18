# Current Card-Set Implementation

Implementation and independent optimisation/review are separate. Follow the
batch-selection and transition rules in [the operator guide](card-set-agent-operator-guide.md).
Vantage Point's maintained [set record](records/vantagepoint.md) and immutable
[transition snapshot](history/vantagepoint-2026-10-16-implementation-transition.md)
preserve both queues, logs and outstanding findings.

## Active set

| Field | Value |
| ----- | ----- |
| Status | Active |
| Implementation status | In progress |
| Set name | Downfall |
| Registry key | `downfall` |
| Pack code | `df` |
| Definition file | `sets/downfall.js` |
| Metadata file | `carddata/carddata.json` |
| Card range | `26001–26065` |
| Registry state during batches | in-progress; hidden: true, untested: true |
| Focused integration test | `tests/downfall-batch8.test.js` |
| Implementation notes | `documentation/new-sets/downfall-implementation-notes.md` |
| Review directory | `documentation/new-sets/reviews/downfall` |

## Batch selection rule

Resume the first In progress batch, otherwise claim the first Pending batch.
Never skip a first outstanding Blocked batch without explicit authorization.
Implement exactly one batch per invocation. Preserve existing implementations,
but verify their gameplay and baseline AI before marking Complete. When all
batches pass integration, mark Implemented and playable; review is independent.
The next invocation selects the next Pending set in the backlog, or requests a
selection if none is queued.

## Status summary

**1 complete, 12 outstanding** (`12 Pending`, `0 In progress`, `0 Blocked`).

## Batch queue

The boundaries follow faction and complexity: four cards for the existing
Anarch economy/console/Trojan plus the complex Stargate breach replacement;
then Anarch virus resources, Criminal equipment, Shaper and Corp factions.
No existing range is credited without tests.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 26001–26004 | Pending | — | Completed separately; not included on this branch. |
| 2 | 26005–26009 | Pending | — | Preserve and validate existing implementations. |
| 3 | 26010–26014 | Pending | — | Preserve and validate existing implementations. |
| 4 | 26015–26018 | Pending | — | Preserve and validate existing implementations. |
| 5 | 26019–26023 | Pending | — | Preserve and validate existing implementations. |
| 6 | 26024–26030 | Pending | — | Preserve and validate existing implementations. |
| 7 | 26031–26035 | Pending | — | Preserve and validate existing implementations. |
| 8 | 26036–26040 | Complete | Codex / 2026-10-16 | Gameplay and baseline AI verified; focused/shared checks and all 95 full-suite test files pass (2026-10-18). |
| 9 | 26041–26046 | Pending | — | Preserve and validate existing implementations. |
| 10 | 26047–26051 | Pending | — | Preserve and validate existing implementations. |
| 11 | 26052–26056 | Pending | — | Preserve and validate existing implementations. |
| 12 | 26057–26061 | Pending | — | Preserve and validate existing implementations. |
| 13 | 26062–26065 | Pending | — | Preserve and validate existing implementations. |

## Completion log

| Batch | Card IDs | Completed | Agent | Focused tests | Notes |
| ----: | -------- | --------- | ----- | ------------- | ----- |
| 8 | 26036–26040 | 2026-10-18 | Codex | `tests/downfall-batch8.test.js`; shared format, helper and hook checks; full suite (95 files) | Operations, run-entry costs, reveal income and agenda swaps with baseline AI; see implementation notes. |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

Batch 1 is maintained separately; its completion is not claimed here.
Preserve subsequent review verdicts and ownership.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 8 | 26036–26040 | Pending | — | Compare operation mode sequences, Cold Site setup budget, Hyoubu spare-click value and Yagi-Uda swap/overadvancement plans; see implementation notes. |

## Optimisation log

No optimisation recorded.

## Set-wide review status

Not requested.

## Required shared verification

```sh
node --check sets/downfall.js
node tests/downfall-batch8.test.js
node tests/eternal-format.test.js
node tests/deckbuild-format-pool.test.js
node tests/decklauncher-identity-change.test.js
git diff --check
```

Run focused batch tests, regenerate card status, and run
`node tests/run-all-tests.js` on `.nvmrc` Node, including Corp decision fixtures
and decision snapshots. Known-red pending reproductions are excluded.

## Changing the active set

Archive this tracker and preserve a maintained set record under the operator
guide before selecting another explicitly queued set. Review and optimisation
do not block the implementation queue.
