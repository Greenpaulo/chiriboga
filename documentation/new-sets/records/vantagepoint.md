# Vantage Point Maintenance Record

This is the maintained Vantage Point record for completed implementation,
independent review and optimisation. New implementation work follows the set
marked `In progress` in the [implementation backlog](../card-implementation-backlog.md)
and the [active tracker](../current-set-implementation.md), currently Uprising.

User-facing prompts and operating instructions are in
`documentation/new-sets/card-set-agent-operator-guide.md`.

Do not run multiple agents against this tracker or its definition file at the
same time. `Complete` records implementation, not independent strategic review.
Use `$review-card-batch <set> <batch>` to audit completed batches; the reviewer
links snapshot-specific reports in a separate batch-review log and queues
findings for `optimise-card-batch`. Baseline gameplay, baseline AI and integration
defects are required repairs, tracked separately from historical completion;
deeper strategic improvements remain optional. Review verdicts alone do not
reopen implementation or change playability. See the operator guide for
arguments and recovery.

## Set record

| Field                         | Value                                    |
| ----------------------------- | ---------------------------------------- |
| Status                        | Implemented                              |
| Implementation status         | Implemented                              |
| Set name                      | Vantage Point                            |
| Registry key                  | `vantagepoint`                           |
| Pack code                     | `vp`                                     |
| Definition file               | `sets/vantagepoint.js`                   |
| Metadata file                 | `carddata/carddata.json`                 |
| Card range                    | `36001–36066`                            |
| Registry state during batches | follows `documentation/card-sets.md` (Vantage Point: playable; hidden and untested are false) |
| Focused integration test      | `tests/vantagepoint-integration.test.js` |
| Implementation notes          | `documentation/new-sets/vantage-point-implementation-notes.md` |
| Review directory              | `documentation/new-sets/reviews/vantage-point` |

Use this record for Vantage Point maintenance; select new implementation work
from the active tracker.

## Batch selection rule

1. Resume the first batch marked `In progress`, if one exists.
2. Otherwise claim the first `Pending` batch.
3. Never skip a `Blocked` batch silently. If it is the first outstanding batch,
   report its blocker unless the user explicitly authorizes another batch.
4. Implement exactly one batch per skill invocation.

Allowed statuses are `Pending`, `In progress`, `Blocked` and `Complete`.

## Status summary

**13 complete, 0 outstanding** (`0 Pending`, `0 In progress`, `0 Blocked`).

Implementation is complete. Optimisation status is tracked separately below.

Agents must refresh these counts whenever a batch status changes.

## Batch queue

Implementation status only; review findings must not reopen these rows.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 36001–36004 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 2 | 36005–36008 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 3 | 36009–36016 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 4 | 36017–36020 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 5 | 36021–36025 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 6 | 36026–36030 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 7 | 36031–36035 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 8 | 36036–36040 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 9 | 36041–36045 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 10 | 36046–36050 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 11 | 36051–36055 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 12 | 36056–36060 | Complete | — | Implemented; outstanding review findings are in the optimisation queue below. |
| 13 | 36061–36066 | Complete | Codex / 2026-10-06 | Implemented and repaired; independent evidence retained in the review log. Revalidate after relevant shared changes. |

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
|     8 | 36036–36040 | 2026-09-24 | Codex       | `vantagepoint-integration.test.js`; `subroutine-visual.test.js`; all `tests/*.test.js` | Implemented Méliès U, Lotus Haze, Esca, ezaM and Knowledge Seeker; added purge continuations and persistent route-wide ICE-strength modelling |
|     9 | 36041–36045 | 2026-09-25 | Codex       | `vantagepoint-integration.test.js`; `corp-install-destination.test.js`; `corp-server-security.test.js`; `mycoweb-rez-discount.test.js`; all `tests/*.test.js` | Implemented Lionsmane, Vicsek, Cultivate, Unleash and The Red Room; added Corp install-destination restrictions, post-rez continuations and installed global ETR planning |
|    10 | 36046–36050 | 2026-09-25 | Codex       | `vantagepoint-integration.test.js`; `play-and-steal-cost.test.js`; all `tests/*.test.js` | Implemented Editorial Division, Witch Hunt, Magistrate Revontulet, Nihilo Agent and Grubber; added post-prevention bad-publicity responses and continuations |

|    11 | 36051–36055 | 2026-10-05 | Codex       | `vantagepoint-integration.test.js`; `vantagepoint-batch11-engine.test.js`; `subroutine-visual.test.js`; all `tests/*.test.js` | Implemented Lethe, Paywall, Flood the Market, Scapegoat and Hype Machine; added bypass responses, hosted-card uninstall sequencing, full-break/bypass run effects and declarative advancement search; 45 test files pass on Node 20.19.0; Node 8 hook incompatibilities recorded in implementation notes |

|    12 | 36056–36060 | 2026-10-05 | Codex       | `vantagepoint-integration.test.js`; `vantagepoint-batch12.test.js`; `corp-server-security.test.js`; all `tests/*.test.js` | Implemented Sacrifice Zone Expansion, Luana Campos, Event Horizon, Flywheel and Tocsin; added uninstall interrupts, hosted bad-publicity counters, HQ expend abilities, paid-window AI selection and public run/security models; 46 test files pass on Node 20.19.0 |

| 12 | 36056–36060 | 2026-10-05 | Codex | `tests/vantagepoint-batch12.test.js`, `tests/corp-server-security.test.js` | Strategic rework: alternatives verified through real selectors/planners; finite Horizon continuations, income/scoring budgets, protected Luana placement, useful draws and defensive tutor priorities; full 46-file suite passes |

| 13 | 36061–36066 | 2026-10-06 | Codex | `tests/vantagepoint-batch13.test.js`; `tests/vantagepoint-integration.test.js`; `tests/corp-server-security.test.js`; `tests/credit-pool-lock.test.js`; all `tests/*.test.js` | Initial completion claim, superseded by the reopened queue row: implemented Shackleton Grid and Let Them Dream, retaining Myōshu, Reanimation Protocol, Vulture Fund and Flagship. Source-aware payment responses, alternative Runner funding policies, prevention/finite-run state, strategic upgrade placement, search and owner-sensitive points; all 50 test files pass on Node 20.19.0. |

| 13 | 36061–36066 | 2026-10-06 | Codex | `tests/vantagepoint-batch13.test.js`; `tests/corp-server-security.test.js`; full `node tests/run-all-tests.js` | Repaired the reopened Corsair/Shackleton public-security gap using complete restricted-payment routes. Same-board opposing planner tests cover lethal/survivable damage, prevention, source exhaustion, finite reruns, click preparation, funded hidden ICE and read-only/private-information constraints. All 50 files pass, including Corp decision fixtures and decision snapshots. |

## Batch-review log

Independent review evidence is separate from implementation completion history.
Verdicts apply to the linked snapshot-specific reports; repairs require re-review.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |
| 1 | 36001–36004 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-1.md) |
| 2 | 36005–36008 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-2.md) |
| 3 | 36009–36016 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-3.md) |
| 4 | 36017–36020 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-4.md) |
| 5 | 36021–36025 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-5.md) |
| 6 | 36026–36030 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-6.md) |
| 7 | 36031–36035 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-7.md) |
| 8 | 36036–36040 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-8.md) |
| 9 | 36041–36045 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-9.md) |
| 10 | 36046–36050 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-10.md) |
| 11 | 36051–36055 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-11.md) |
| 12 | 36056–36060 | 2026-10-06 | Changes required | [Report](../reviews/vantage-point/vantagepoint-batch-12.md) |
| 13 | 36061–36066 | 2026-10-06 | Pass | [Report](../reviews/vantage-point/vantagepoint-batch-13.md) |

## Optimisation queue

**12 Pending, 0 In progress, 0 Blocked, 0 Awaiting review, 1 Pass.**

Select/resume work with `$optimise-card-batch Vantage Point <batch>`; without a
batch, resume In progress, otherwise the first Pending. Do not silently skip a
first outstanding Blocked entry. A repair ends Awaiting review; independent
`review-card-batch` assigns Pass or queues further work. Implementation and
playability remain separate. Revalidate historic Pass evidence against current
consumers before reusing it.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 1 | 36001–36004 | Pending | — | Changes required: Successful-run dispatch/reward crashes; winning agenda target missed. See [independent review](../reviews/vantage-point/vantagepoint-batch-1.md). |
| 2 | 36005–36008 | Pending | — | Changes required: Stick and Poke draw omitted from survivable routes; remaining contrasts recorded. See [independent review](../reviews/vantage-point/vantagepoint-batch-2.md). |
| 3 | 36009–36016 | Pending | — | Changes required: Reward and play-choice crashes; ignored identity/tag/tactical choices. See [independent review](../reviews/vantage-point/vantagepoint-batch-3.md). |
| 4 | 36017–36020 | Pending | — | Changes required: Ignored economy hook; Beta Build target/click budgets; Aircheck safety and shared credit loss. See [independent review](../reviews/vantage-point/vantagepoint-batch-4.md). |
| 5 | 36021–36025 | Pending | — | Changes required: Economy/hosting decisions require repair. See [independent review](../reviews/vantage-point/vantagepoint-batch-5.md). |
| 6 | 36026–36030 | Pending | — | Changes required: Click steal cost and central defense choices require repair. See [independent review](../reviews/vantage-point/vantagepoint-batch-6.md). |
| 7 | 36031–36035 | Pending | — | Changes required: Pass restriction and paid-defense/tactical choices require repair. See [independent review](../reviews/vantage-point/vantagepoint-batch-7.md). |
| 8 | 36036–36040 | Pending | — | Changes required: Identity, damage, target ordering and upgrade-placement decisions require repair. See [independent review](../reviews/vantage-point/vantagepoint-batch-8.md). |
| 9 | 36041–36045 | Pending | — | Changes required: Tutor and post-rez choices miss immediate kill alternatives. See [independent review](../reviews/vantage-point/vantagepoint-batch-9.md). |
| 10 | 36046–36050 | Pending | — | Changes required: Magistrate useful rez windows ignored. See [independent review](../reviews/vantage-point/vantagepoint-batch-10.md). |
| 11 | 36051–36055 | Pending | — | Changes required: Scapegoat loses critical breaker; shared bad-publicity credit-loss defect. See [independent review](../reviews/vantage-point/vantagepoint-batch-11.md). |
| 12 | 36056–36060 | Pending | — | Changes required: Meat damage modelled as net; prevention/security consequences. See [independent review](../reviews/vantage-point/vantagepoint-batch-12.md). |
| 13 | 36061–36066 | Pass | — | Current recorded Pass; revalidate affected consumers after shared repairs. [Report](../reviews/vantage-point/vantagepoint-batch-13.md). |

## Optimisation log

Append dated repair evidence here; independent review verdicts stay in the
batch-review log. No optimisation passes recorded under the new workflow yet.

## Workflow migration — 2026-10-16

All 13 original implementation completions are retained. The twelve review
repair rows moved to the optimisation queue; no defect or review verdict was
closed by this migration. Vantage Point is playable by explicit user decision
under the two-stage workflow. The [pre-migration tracker](../history/vantagepoint-2026-10-16-before-workflow-split.md)
preserves the previous queue and status. This is not a new rules/strategy sign-off.

## Set-wide review status

**Changes required** — [full set report](../reviews/vantage-point/vantagepoint-set-review.md).
Reviewed all 66 cards in the recorded 13 batches: 12 batches require repairs,
1 passed, 0 inconclusive. A failing batch may also retain named evidence
gaps; both defects and missing essential coverage must be resolved before Pass.
The original review recorded 50 passing regression files. Its initial headless
claim was superseded by the [2026-10-08 correction](../reviews/vantage-point/README.md#pr-23-corrections--2026-10-08):
four games passed and four failed with recorded engine errors. Those findings
remain open; availability is a separate user decision.

The [pre-review implementation snapshot](../history/vantagepoint-2026-10-06.md)
preserves the original full completion log. The
[post-review snapshot](../history/vantagepoint-2026-10-06-reviewed.md) preserves this
historical repair queue and review log. Keep completion history append-only. Use
`optimise-card-batch` for repairs and independent batch/set review for sign-off.
The review verdict does not block playability or the next implementation set.

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

Transition after implementation completes; review and optimisation may remain
outstanding. Follow the operator guide's **Change to the next implementation
set** procedure. Preserve a dated immutable history snapshot and a maintained
`records/<registry-key>.md` copy with both queues, complete logs, verification
commands, notes and review links. Link both from the backlog before replacing
this tracker. Continue optimisation in that record after the next set becomes
active. Never overwrite old snapshots or invent batch boundaries.
