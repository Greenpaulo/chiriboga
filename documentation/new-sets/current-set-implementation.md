# Current Card-Set Implementation

This is the canonical handoff and progress log for the one card set currently
being implemented in batches. The `implement-card-batch` skill (`.agents/skills/implement-card-batch/SKILL.md`) reads this file to learn
which set and batch to work on; they must not hardcode a set name themselves.

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

## Active set

| Field                         | Value                                    |
| ----------------------------- | ---------------------------------------- |
| Status                        | Active                                   |
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

If `Status` is `Inactive`, an agent must not infer or start a set. It should
report that no current set has been selected.

## Batch selection rule

1. Resume the first batch marked `In progress`, if one exists.
2. Otherwise claim the first `Pending` batch.
3. Never skip a `Blocked` batch silently. If it is the first outstanding batch,
   report its blocker unless the user explicitly authorizes another batch.
4. Implement exactly one batch per skill invocation.
5. If all batches are `Complete` and implementation integration checks pass,
   mark the set `Implemented` and `playable` independently of review. The next
   invocation archives this tracker and selects the next queued set under the
   operator guide's transition procedure, then implements its first batch.
   Review/optimisation never holds this queue open. If no next set is recorded,
   report that a set selection is needed; do not choose one arbitrarily.

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

| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13 and Corp-security/payment tests; full `node tests/run-all-tests.js` | Repaired C2-1–C2-3: ordered finite damage/draw, destination-aware hosted installation and post-install route safety. Actual command/card/host/server, breach, recursive payment, prevention, finite rerun, privacy and restoration contrasts cover every card. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required syntax/format/deck/identity/hook-doc/diff checks pass. Independent batch 2 and affected shared-consumer re-review required. |
| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-4: public complete-route reserve evaluation shares the actual Lampades allocation and ordinary trash payment policy. Real command/card/payment contrasts cover scarce/plentiful stealth, positive/free trash, unaffordable trash, steal costs, flexible sources, hidden/nonwinning targets, expired clicks and exception/cache restoration. C2-1–C2-3 remain supported. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required syntax/format/deck/identity/hook-doc/diff checks pass. Independent re-review required. |
| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-4 actual phase payment: reserve policy, ordinary allocator and selector share the engine trash reason and recognize Azimat. Real legal command/card/ability/phase resolution preserves winning stealth reserves; temporary/free/unsafe/no-Lampades/steal-click/locked-pool contrasts and C2-1–C2-3 pass. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent re-review required. |
| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-5: ordinary run/server immediate-win precedence, complete prospective run context, real win/draw/restriction/resource contrasts and exception restoration. C2-1–C2-4 retained. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent batch 2 and affected shared-consumer re-review required. |
| 2 | 36005–36008 | 2026-10-07 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-6: guarded immediate-win survival budget ignores soft Grip retention and cached potential. Real fresh/repeated command/card/server tests cover scarce credits/clicks, expendable controls, expiring denial, lethal/illegal/unaffordable/hidden declines, finite ordered draw and exception restoration. C2-1–C2-5 retained. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent re-review required. |
| 2 | 36005–36008 | 2026-10-07 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, security/payment tests; full `node tests/run-all-tests.js` | C2-7: immediate winning steals ignore post-run tag cleanup under the existing tactical guard. Cold/repeated scarce/funded boards and legal expiring-play alternatives select the win; real AI Funhouse tags and access steal reach seven points. Lethal/ETR/steal-cost and nonwinning contrasts, exception/state cleanup and real ordinary tag rejection pass. C2-1–C2-6 retained; all 52 files and required checks pass. Independent re-review required. |
| 2 | 36005–36008 | 2026-10-14 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/13 and security/payment tests; full `node tests/run-all-tests.js` | C2-8 ordered conditional tags, finite reruns/payment forks and opposing security; C2-9 terminal precedence, reserves/actual payment, optional-trash and live recalculation; C2-10 funded useful Lampades setup and restored install counters. C2-1–C2-7 retained. All 52 files and required checks pass; independent matrix/shared-consumer re-review required. |

## Batch-review log

Independent review evidence is separate from implementation completion history.
Verdicts apply to the linked snapshot-specific reports; repairs require re-review.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |
| 1 | 36001–36004 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-1.md) |
| 2 | 36005–36008 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-2.md) |
| 3 | 36009–36016 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-3.md) |
| 4 | 36017–36020 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-4.md) |
| 5 | 36021–36025 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-5.md) |
| 6 | 36026–36030 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-6.md) |
| 7 | 36031–36035 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-7.md) |
| 8 | 36036–36040 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-8.md) |
| 9 | 36041–36045 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-9.md) |
| 10 | 36046–36050 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-10.md) |
| 11 | 36051–36055 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-11.md) |
| 12 | 36056–36060 | 2026-10-06 | Changes required | [Report](reviews/vantage-point/vantagepoint-batch-12.md) |
| 13 | 36061–36066 | 2026-10-06 | Pass | [Report](reviews/vantage-point/vantagepoint-batch-13.md) |

| 2 | 36005–36008 | 2026-10-06 | Changes required (current-snapshot re-review) | [Report: C2-1 revalidated, C2-2 and C2-3 reproduced](reviews/vantage-point/vantagepoint-batch-2.md#independent-current-snapshot-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (remediation re-review) | [Report: C2-1–C2-3 resolved; C2-4 decisive stealth reserve](reviews/vantage-point/vantagepoint-batch-2.md#independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (second remediation re-review) | [Report: actual-phase payment contract and Azimat allocation](reviews/vantage-point/vantagepoint-batch-2.md#second-independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (third remediation re-review) | [Report: C2-1–C2-4 resolved; C2-5 immediate win displaced by Archives draw](reviews/vantage-point/vantagepoint-batch-2.md#third-independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (fourth remediation re-review) | [Report: C2-1–C2-5 retained; C2-6 survivable win rejected by Grip retention](reviews/vantage-point/vantagepoint-batch-2.md#fourth-independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-07 | Changes required (fifth remediation re-review) | [Report: C2-1–C2-6 resolved; C2-7 tagged immediate win rejected](reviews/vantage-point/vantagepoint-batch-2.md#fifth-independent-remediation-re-review--2026-10-07) |
| 2 | 36005–36008 | 2026-10-07 | Changes required (sixth re-review; consolidated audit) | [Report: coverage matrix, C2-8–C2-10 and one repair handoff](reviews/vantage-point/vantagepoint-batch-2.md#sixth-independent-remediation-re-review--2026-10-07) |
| 2 | 36005–36008 | 2026-10-14 | Pass (seventh remediation re-review; strategic audit) | [Report: full matrix and C2-1–C2-10 accepted; 50/52 suite with unrelated documentation failures](reviews/vantage-point/vantagepoint-batch-2.md#seventh-independent-remediation-re-review--2026-10-14) |

## Optimisation queue

**11 Pending, 0 In progress, 0 Blocked, 1 Awaiting review, 1 Pass.**

Select/resume work with `$optimise-card-batch Vantage Point <batch>`; without a
batch, resume In progress, otherwise the first Pending. Do not silently skip a
first outstanding Blocked entry. A repair ends Awaiting review; independent
`review-card-batch` assigns Pass or queues further work. Implementation and
playability remain separate. Revalidate historic Pass evidence against current
consumers before reusing it.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 1 | 36001–36004 | Pending | — | Changes required: Successful-run dispatch/reward crashes; winning agenda target missed. See [independent review](reviews/vantage-point/vantagepoint-batch-1.md). |
| 2 | 36005–36008 | Awaiting review | Codex / 2026-10-16 | Repairs C2-1–C2-10 retained after independent extraction onto main, excluding the expensive Corp break-income route trigger. Historical Pass applies to the earlier snapshot; independent re-review is required. See [review history](reviews/vantage-point/vantagepoint-batch-2.md) and [unstack record](unstack-2026-10-16.md). |
| 3 | 36009–36016 | Pending | — | Changes required: Reward and play-choice crashes; ignored identity/tag/tactical choices. See [independent review](reviews/vantage-point/vantagepoint-batch-3.md). |
| 4 | 36017–36020 | Pending | — | Changes required: Ignored economy hook; Beta Build target/click budgets; Aircheck safety and shared credit loss. See [independent review](reviews/vantage-point/vantagepoint-batch-4.md). |
| 5 | 36021–36025 | Pending | — | Changes required: Economy/hosting decisions require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-5.md). |
| 6 | 36026–36030 | Pending | — | Changes required: Click steal cost and central defense choices require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-6.md). |
| 7 | 36031–36035 | Pending | — | Changes required: Pass restriction and paid-defense/tactical choices require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-7.md). |
| 8 | 36036–36040 | Pending | — | Changes required: Identity, damage, target ordering and upgrade-placement decisions require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-8.md). |
| 9 | 36041–36045 | Pending | — | Changes required: Tutor and post-rez choices miss immediate kill alternatives. See [independent review](reviews/vantage-point/vantagepoint-batch-9.md). |
| 10 | 36046–36050 | Pending | — | Changes required: Magistrate useful rez windows ignored. See [independent review](reviews/vantage-point/vantagepoint-batch-10.md). |
| 11 | 36051–36055 | Pending | — | Changes required: Scapegoat loses critical breaker; shared bad-publicity credit-loss defect. See [independent review](reviews/vantage-point/vantagepoint-batch-11.md). |
| 12 | 36056–36060 | Pending | — | Changes required: Meat damage modelled as net; prevention/security consequences. See [independent review](reviews/vantage-point/vantagepoint-batch-12.md). |
| 13 | 36061–36066 | Pass | — | Current recorded Pass; revalidate affected consumers after shared repairs. [Report](reviews/vantage-point/vantagepoint-batch-13.md). |

## Optimisation log

Append dated repair evidence here; independent review verdicts stay in the
batch-review log. No optimisation passes recorded under the new workflow yet.

Batch 2 repairs and original acceptance evidence are retained in the completion
and batch-review logs above. The extracted branch awaits independent re-review;
its earlier Pass is not carried forward to the merged snapshot.

## Workflow migration — 2026-10-16

All 13 original implementation completions are retained. The twelve review
repair rows moved to the optimisation queue; no defect or review verdict was
closed by this migration. Vantage Point is playable by explicit user decision
under the two-stage workflow. The [pre-migration tracker](history/vantagepoint-2026-10-16-before-workflow-split.md)
preserves the previous queue and status. This is not a new rules/strategy sign-off.

## Set-wide review status

**Changes required** — [full set report](reviews/vantage-point/vantagepoint-set-review.md).
Reviewed all 66 cards in the recorded 13 batches: 12 batches require repairs,
1 passed, 0 inconclusive. A failing batch may also retain named evidence
gaps; both defects and missing essential coverage must be resolved before Pass.
The original review recorded 50 passing regression files. Its initial headless
claim was superseded by the [2026-10-08 correction](reviews/vantage-point/README.md#pr-23-corrections--2026-10-08):
four games passed and four failed with recorded engine errors. Those findings
remain open; availability is a separate user decision.

The [pre-review implementation snapshot](history/vantagepoint-2026-10-06.md)
preserves the original full completion log. The
[post-review snapshot](history/vantagepoint-2026-10-06-reviewed.md) preserves this
historical repair queue and review log. Keep completion history append-only
and archive this tracker before selecting another set (Downfall is queued next). Use
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

## Independent branch state — 2026-10-16

This branch contains batch 2 and required shared prerequisites. Earlier
batch completion/review claims do not carry over automatically. The reports
and completion entries above describe their recorded original snapshots;
independent re-review is required after this extraction. Batch 1 remediation
remains parked in the optimisation queue.
The [four exact pre-unstack tracker snapshots](history/unstack-2026-10-16/README.md)
preserve the original cumulative state. See the [extraction record](unstack-2026-10-16.md).
