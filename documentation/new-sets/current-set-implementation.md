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
| Focused integration test | `tests/downfall-integration.test.js` |
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

**7 complete, 6 outstanding** (`6 Pending`, `0 In progress`, `0 Blocked`).

## Batch queue

The boundaries follow faction and complexity: four cards for the existing
Anarch economy/console/Trojan plus the complex Stargate breach replacement;
then Anarch virus resources, Criminal equipment, Shaper and Corp factions.
No existing range is credited without tests.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 26001–26004 | Complete | Codex / 2026-10-16 | Isolation, Demolisher, Chisel and Stargate: mechanics and real baseline AI consumers; all 95 regression files pass. |
| 2 | 26005–26009 | Complete | PR #66 / reconciled 2026-10-20 | Utae, Climactic Showdown, Fencer Fueno, The Nihilist and Trickster Taka; real-engine mechanics and Runner/Corp AI choices. |
| 3 | 26010–26014 | Complete | Claude / 2026-10-16 | Implemented on a branch from `main` in parallel with batch 1; see implementation notes. |
| 4 | 26015–26018 | Complete | PR #66 / reconciled 2026-10-20 | Masterwork, Bukhgalter, Baklan and The Class Act; mechanics and Runner AI; install-cost probes restore state even on exceptions. |
| 5 | 26019–26023 | Complete | PR #66 / reconciled 2026-10-20 | Lat, In the Groove, Khusyuk, Spec Work and Supercorridor; mechanics and Runner AI. |
| 6 | 26024–26030 | Complete | PR #66 / reconciled 2026-10-20 | Gauss, Pelangi, Rezeki, The Artist, Direct Access, Rejig and Whistleblower; mechanics and Runner AI. |
| 7 | 26031–26035 | Complete | PR #66 / reconciled 2026-10-20 | MirrorMorph, Architect Deployment Test, Calvin B4L3Y, Nanoetching Matrix and Hagen; mechanics and Corp AI. |
| 8 | 26036–26040 | Pending | — | Preserve and validate existing implementations. |
| 9 | 26041–26046 | Pending | — | Preserve and validate existing implementations. |
| 10 | 26047–26051 | Pending | — | Preserve and validate existing implementations. |
| 11 | 26052–26056 | Pending | — | Preserve and validate existing implementations. |
| 12 | 26057–26061 | Pending | — | Preserve and validate existing implementations. |
| 13 | 26062–26065 | Pending | — | Preserve and validate existing implementations. |

## Completion log

| Batch | Card IDs | Completed | Agent | Focused tests | Notes |
| ----: | -------- | --------- | ----- | ------------- | ----- |
| 1 | 26001–26004 | 2026-10-16 | Codex | `tests/downfall-integration.test.js`; `tests/agent-scripts.test.js`; full `node tests/run-all-tests.js` | Gameplay and baseline AI complete. Additional trash-cost sequencing, effect-controller attribution, hidden-ICE model guard and scoped economy targeting. All 95 files pass on Node 20.19.0, including Corp fixtures and snapshots. |
| 2 | 26005–26009 | 2026-10-20 (reconciled) | Codex | `tests/downfall-batch2.test.js` | PR #66 implementation verified against current code and focused regressions; see batch 2 notes. |
| 3 | 26010–26014 | 2026-10-16 | Claude | `tests/downfall-batch3.test.js`; full `node tests/run-all-tests.js` (95 files, Node 20.19.0) | Implemented Az McCaffrey, Always Have a Backup Plan, Blueberry!™ Diesel, Flip Switch and Lucky Charm; added a `responseOnTraceInitiated` window in `Trace` and the Runner AI `AITriggerToRemoveTags` consumer. |
| 4 | 26015–26018 | 2026-10-20 (reconciled) | Codex | `tests/downfall-batch4.test.js` | PR #66 implementation verified against current code and focused regressions; see batch 4 notes. |
| 5 | 26019–26023 | 2026-10-20 (reconciled) | Codex | `tests/downfall-batch5.test.js` | PR #66 implementation verified against current code and focused regressions; see batch 5 notes. |
| 6 | 26024–26030 | 2026-10-20 (reconciled) | Codex | `tests/downfall-batch6.test.js` | PR #66 implementation verified against current code and focused regressions; see batch 6 notes. |
| 7 | 26031–26035 | 2026-10-20 (reconciled) | Codex | `tests/downfall-batch7.test.js` | PR #66 implementation verified against current code and focused regressions; see batch 7 notes. |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

**7 Pending** (optional strategy work), 0 In progress, 0 Blocked.

Implementation is complete for batches 1–7; no independent batch review is recorded.
PR-comment remediation is not an independent strategic review.
Preserve subsequent review verdicts and ownership.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 1 | 26001–26004 | Pending | — | Optional strategy: Isolation's resource sacrifice versus other income; console competition; Chisel host/repeated-run plans; Stargate revealed target value, ordinary agenda steals, other breach replacements and Archives follow-up. [Notes](downfall-implementation-notes.md#focused-evidence-and-optimisation). |
| 2 | 26005–26009 | Pending | — | Optional strategy: Server/trash value for Showdown, Utae break sequencing, hosted-credit/tag trade-offs and Nihilist counter spending. [Notes](downfall-implementation-notes.md#batch-2--2600526009). |
| 3 | 26010–26014 | Pending | — | Deeper strategy: AI does not seek out Backup Plan; no Flip Switch jack-out policy and its trace decision ignores Corp boost credits; Lucky Charm not valued at install or sequenced after an HQ run; Blueberry bottom choice only spots redundant cards. See [notes](downfall-implementation-notes.md#deeper-strategy-optimisation-queue). |
| 4 | 26015–26018 | Pending | — | Optional strategy: Bukhgalter full-break refund in run costing, Masterwork install trade-offs, Baklan thresholds and Class Act bottoming. [Notes](downfall-implementation-notes.md#batch-4--2601526018). |
| 5 | 26019–26023 | Pending | — | Optional strategy: End-turn matching, In the Groove install order/draw choices, Khusyuk access value and Spec Work retention value. [Notes](downfall-implementation-notes.md#batch-5--2601926023). |
| 6 | 26024–26030 | Pending | — | Optional strategy: Pelangi counter conservation/type choice, Artist install timing, Direct Access valuation, Rejig target value and Whistleblower timing. [Notes](downfall-implementation-notes.md#batch-6--2602426030). |
| 7 | 26031–26035 | Pending | — | Optional strategy: MirrorMorph action ordering, Architect Deployment Test install value, draw/credit asset timing and Hagen program-trash value. [Notes](downfall-implementation-notes.md#batch-7--2603126035). |

## Optimisation log

No optimisation recorded.

## Set-wide review status

Not requested.

## Required shared verification

```sh
node --check sets/downfall.js
node tests/downfall-integration.test.js
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
