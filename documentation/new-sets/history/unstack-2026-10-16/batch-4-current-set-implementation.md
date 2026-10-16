# Current Card-Set Implementation

This is the canonical handoff and progress log for the one card set currently
being implemented in batches. The `implement-card-batch` skill (`.agents/skills/implement-card-batch/SKILL.md`) reads this file to learn
which set and batch to work on; they must not hardcode a set name themselves.

User-facing prompts and operating instructions are in
`documentation/new-sets/card-set-agent-operator-guide.md`.

Do not run multiple agents against this tracker or its definition file at the
same time. `Complete` records implementation, not independent strategic review.
Use `$review-card-batch <set> <batch>` to audit completed batches; the reviewer
links snapshot-specific reports in a separate batch-review log and reopens
confirmed gaps for repair. See the operator guide for arguments and recovery.

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
| Registry state during batches | follows `documentation/card-sets.md` (Vantage Point: in-progress, hidden and untested) |
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
5. If all batches are `Complete`, report that the set-wide review is next.

Allowed statuses are `Pending`, `In progress`, `Blocked` and `Complete`.

## Status summary

**5 complete, 8 outstanding** (`8 Pending`, `0 In progress`, `0 Blocked`).

Agents must refresh these counts whenever a batch status changes.

## Batch queue

| Batch | Card IDs    | Status   | Owner / started          | Notes/blocker                                                              |
| ----: | ----------- | -------- | ------------------------ | -------------------------------------------------------------------------- |
| 1 | 36001–36004 | Complete | Codex / 2026-10-06 | Independent re-review Pass: CR1–CR4 and TT1 resolved; all four cards have contrasting strategic evidence, including affected shared consumers. All 51 regression files and 12 new independent scenarios pass. See [review and remediation](reviews/vantage-point/vantagepoint-batch-1.md). |
| 2 | 36005–36008 | Complete | Codex / 2026-10-14 | Independent seventh re-review Pass: consolidated C2-1–C2-10 accepted with 80 independent observations and shared-consumer regressions. Full suite 50/52; pre-existing roadmap-documentation failures recorded. See [current review](reviews/vantage-point/vantagepoint-batch-2.md#seventh-independent-remediation-re-review--2026-10-14). |
| 3 | 36009–36016 | Complete | Codex / 2026-10-14 | Independent third re-review Pass: full C3-1–C3-7 matrix and shared interactions accepted, including actual both-central Baker→Rotary wins and exact finite-rerun steal reserves. 34 independent observations; all 93 regression files pass. See [current review](reviews/vantage-point/vantagepoint-batch-3.md#third-independent-remediation-re-review--2026-10-14). |
| 4 | 36017–36020 | Complete | Codex / 2026-10-15 | C4-5–C4-8 implementation repair: active Stealth sources, fresh follow-up fuel, shared terminal/finite-source reserves and pool-income classification. All 94 files and shared checks pass. Independent complete-matrix/shared-consumer re-review remains required; see [preserved findings and remediation](reviews/vantage-point/vantagepoint-batch-4.md#remediation-log-continued). |
| 5 | 36021–36025 | Pending | — | Changes required: Economy/hosting decisions require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-5.md). |
| 6 | 36026–36030 | Pending | — | Changes required: Click steal cost and central defense choices require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-6.md). |
| 7 | 36031–36035 | Pending | — | Changes required: Pass restriction and paid-defense/tactical choices require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-7.md). |
| 8 | 36036–36040 | Pending | — | Changes required: Identity, damage, target ordering and upgrade-placement decisions require repair. See [independent review](reviews/vantage-point/vantagepoint-batch-8.md). |
| 9 | 36041–36045 | Pending | — | Changes required: Tutor and post-rez choices miss immediate kill alternatives. See [independent review](reviews/vantage-point/vantagepoint-batch-9.md). |
| 10 | 36046–36050 | Pending | — | Changes required: Magistrate useful rez windows ignored. See [independent review](reviews/vantage-point/vantagepoint-batch-10.md). |
| 11 | 36051–36055 | Pending | — | Changes required: Scapegoat loses critical breaker; shared bad-publicity credit-loss defect. See [independent review](reviews/vantage-point/vantagepoint-batch-11.md). |
| 12 | 36056–36060 | Pending | — | Changes required: Meat damage modelled as net; prevention/security consequences. See [independent review](reviews/vantage-point/vantagepoint-batch-12.md). |
|    13 | 36061–36066 | Complete | Codex / 2026-10-06 | Repaired Corp restricted-credit route assessment; both planners agree on survivability, source exhaustion and finite-repeat/prevention budgets. All 50 test files pass. See [repair evidence](vantage-point-implementation-notes.md#batch-13-corp-restricted-payment-repair-2026-10-06). Separate set-wide review is next. |

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

| 1 | 36001–36004 | 2026-10-06 | Codex | `tests/vantagepoint-batch1.test.js`; `tests/vantagepoint-integration.test.js`; `tests/vantagepoint-batch13.test.js`; full `node tests/run-all-tests.js` | Repaired CR1–CR3 successful-run dispatch, publicity prevention and known winning-agenda targets; sacrifice-aware expiring play, harmless-subroutine event choices, real pool rebate and opposing once-per-turn/finite-repeat income modelling. All 51 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; all required syntax/format/deck/identity/diff checks pass. Separate batch 1 and affected shared-consumer re-review required. |

| 1 | 36001–36004 | 2026-10-06 | Codex | `tests/vantagepoint-batch1.test.js`; `tests/vantagepoint-batch13.test.js`; `tests/corp-server-security.test.js`; full `node tests/run-all-tests.js` | CR4: affordable publicly known winning steals precede discretionary expiring plays; route rebates can fund later steal costs. TT1: public break income activates complete Corp route planning with ordinary or restricted breakers. Real command/card/server and opposing route tests cover declines, resource clocks, privacy and finite repeats. All 51 files pass on Node 20.19.0; syntax/format/deck/identity/hook-doc/diff checks pass. Independent re-review remains required. |

| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13 and Corp-security/payment tests; full `node tests/run-all-tests.js` | Repaired C2-1–C2-3: ordered finite damage/draw, destination-aware hosted installation and post-install route safety. Actual command/card/host/server, breach, recursive payment, prevention, finite rerun, privacy and restoration contrasts cover every card. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required syntax/format/deck/identity/hook-doc/diff checks pass. Independent batch 2 and affected shared-consumer re-review required. |

| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-4: public complete-route reserve evaluation shares the actual Lampades allocation and ordinary trash payment policy. Real command/card/payment contrasts cover scarce/plentiful stealth, positive/free trash, unaffordable trash, steal costs, flexible sources, hidden/nonwinning targets, expired clicks and exception/cache restoration. C2-1–C2-3 remain supported. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required syntax/format/deck/identity/hook-doc/diff checks pass. Independent re-review required. |

| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-4 actual phase payment: reserve policy, ordinary allocator and selector share the engine trash reason and recognize Azimat. Real legal command/card/ability/phase resolution preserves winning stealth reserves; temporary/free/unsafe/no-Lampades/steal-click/locked-pool contrasts and C2-1–C2-3 pass. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent re-review required. |

| 2 | 36005–36008 | 2026-10-06 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-5: ordinary run/server immediate-win precedence, complete prospective run context, real win/draw/restriction/resource contrasts and exception restoration. C2-1–C2-4 retained. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent batch 2 and affected shared-consumer re-review required. |


| 2 | 36005–36008 | 2026-10-07 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, Corp-security/payment tests; full `node tests/run-all-tests.js` | C2-6: guarded immediate-win survival budget ignores soft Grip retention and cached potential. Real fresh/repeated command/card/server tests cover scarce credits/clicks, expendable controls, expiring denial, lethal/illegal/unaffordable/hidden declines, finite ordered draw and exception restoration. C2-1–C2-5 retained. All 52 files pass on Node 20.19.0, including Corp decision fixtures and decision snapshots; required checks pass. Independent re-review required. |

| 2 | 36005–36008 | 2026-10-07 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/11/12/13, security/payment tests; full `node tests/run-all-tests.js` | C2-7: immediate winning steals ignore post-run tag cleanup under the existing tactical guard. Cold/repeated scarce/funded boards and legal expiring-play alternatives select the win; real AI Funhouse tags and access steal reach seven points. Lethal/ETR/steal-cost and nonwinning contrasts, exception/state cleanup and real ordinary tag rejection pass. C2-1–C2-6 retained; all 52 files and required checks pass. Independent re-review required. |

| 2 | 36005–36008 | 2026-10-14 | Codex | `tests/vantagepoint-batch2.test.js`; `tests/vantagepoint-integration.test.js`; affected batch 1/13 and security/payment tests; full `node tests/run-all-tests.js` | C2-8 ordered conditional tags, finite reruns/payment forks and opposing security; C2-9 terminal precedence, reserves/actual payment, optional-trash and live recalculation; C2-10 funded useful Lampades setup and restored install counters. C2-1–C2-7 retained. All 52 files and required checks pass; independent matrix/shared-consumer re-review required. |

| 3 | 36009–36016 | 2026-10-14 | Codex | `tests/vantagepoint-batch3.test.js`; `tests/vantagepoint-integration.test.js`; full `node tests/run-all-tests.js` | C3-1–C3-5: real reward/prevention flow, safe sacrifice and actual play targets, Vic ability cleanup, budgeted Rotary bonus access/terminal steals, MU/tag-clock choices, ordinary-breach-aware Baker redirect and conditional Underdome installation. All 93 files pass, including Corp decision fixtures and decision snapshots; required syntax/format/deck/identity/hook-doc/diff checks pass. Independent batch 3 and affected shared-consumer re-review required. |

| 3 | 36009–36016 | 2026-10-14 | Codex | `tests/vantagepoint-batch3.test.js`; `tests/vantagepoint-integration.test.js`; Corp security/hypothetical/fixture/snapshot tests; full `node tests/run-all-tests.js` | C3-4 observed-rez sequencing; C3-6 projected/live clocks and affordable terminal access; C3-7 complete paid redirects, winning ability selection and both public central destinations. Named multi-ICE, MU/program, console setup/composition and source-allocation gaps covered. All 93 files, including Corp decision fixtures and decision snapshots, and required shared checks pass. Independent latest-matrix/shared-consumer re-review required; verdict and playability unchanged. |

| 3 | 36009–36016 | 2026-10-14 | Codex | `tests/vantagepoint-batch3.test.js`; integration; affected batch1/2/12/13 and public security/payment tests; full `node tests/run-all-tests.js` | C3-7 terminal Baker/Rotary discovery validates the complete paid route and guaranteed access; actual HQ/R&D seven-point wins, Docklands/costly steals and live-resource declines. CopyPoint preserves steal reservations and origin/destination payment damage. Accepted C3-1–C3-6/base C3-7 controls retained. All 93 files, including Corp fixtures/snapshots, and required checks pass. Independent entire latest-matrix/shared-consumer re-review required; no new limitation or verdict/playability change. |

| 4 | 36017–36020 | 2026-10-14 | Codex | `tests/vantagepoint-batch4.test.js`; `tests/credit-pool-lock.test.js`; set integration; affected batch 2/3/13 and Corp-security regressions; full `node tests/run-all-tests.js` | C4-1–C4-4/S1: callable full-cost economy/fuel forecast, exact one-action tutor plan and actual last-click winning steal, safe remaining-credit remote, guarded restoration, private known-top look/shuffle invalidation and distinct publicity/Stimhack funding. All 94 files pass, including Corp fixtures and decision snapshots; required shared checks pass. Independent complete-matrix/shared-consumer re-review required. |

| 4 | 36017–36020 | 2026-10-15 | Codex | `tests/vantagepoint-batch4.test.js`; set integration; affected batch 1/2/3/12/13, credit/payment/security/hypothetical suites; full `node tests/run-all-tests.js` | C4-5–C4-8: actual active-event Stealth discovery, shared zero-click fuel forecasting, winning remote precedence, generic terminal reserves and finite source carryover, actual Rotary/Baker/optional-payment wins and source damage, explicit Ken pool income/Touchstone hosted gain. All 94 files pass, including Corp fixtures and decision snapshots; required shared checks pass. Independent full matrix/shared-consumer re-review required; no new limitation or verdict/playability change. |

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
| 1 | 36001–36004 | 2026-10-06 | Changes required (remediation re-review) | [Report: CR4 and TT1](reviews/vantage-point/vantagepoint-batch-1.md#independent-remediation-re-review--2026-10-06) |
| 1 | 36001–36004 | 2026-10-06 | Pass (second remediation re-review) | [Report: CR1–CR4 and TT1 resolved](reviews/vantage-point/vantagepoint-batch-1.md#second-independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (current-snapshot re-review) | [Report: C2-1 revalidated, C2-2 and C2-3 reproduced](reviews/vantage-point/vantagepoint-batch-2.md#independent-current-snapshot-re-review--2026-10-06) |

| 2 | 36005–36008 | 2026-10-06 | Changes required (remediation re-review) | [Report: C2-1–C2-3 resolved; C2-4 decisive stealth reserve](reviews/vantage-point/vantagepoint-batch-2.md#independent-remediation-re-review--2026-10-06) |
| 2 | 36005–36008 | 2026-10-06 | Changes required (second remediation re-review) | [Report: actual-phase payment contract and Azimat allocation](reviews/vantage-point/vantagepoint-batch-2.md#second-independent-remediation-re-review--2026-10-06) |

| 2 | 36005–36008 | 2026-10-06 | Changes required (third remediation re-review) | [Report: C2-1–C2-4 resolved; C2-5 immediate win displaced by Archives draw](reviews/vantage-point/vantagepoint-batch-2.md#third-independent-remediation-re-review--2026-10-06) |

| 2 | 36005–36008 | 2026-10-06 | Changes required (fourth remediation re-review) | [Report: C2-1–C2-5 retained; C2-6 survivable win rejected by Grip retention](reviews/vantage-point/vantagepoint-batch-2.md#fourth-independent-remediation-re-review--2026-10-06) |

| 2 | 36005–36008 | 2026-10-07 | Changes required (fifth remediation re-review) | [Report: C2-1–C2-6 resolved; C2-7 tagged immediate win rejected](reviews/vantage-point/vantagepoint-batch-2.md#fifth-independent-remediation-re-review--2026-10-07) |

| 2 | 36005–36008 | 2026-10-07 | Changes required (sixth re-review; consolidated audit) | [Report: coverage matrix, C2-8–C2-10 and one repair handoff](reviews/vantage-point/vantagepoint-batch-2.md#sixth-independent-remediation-re-review--2026-10-07) |

| 2 | 36005–36008 | 2026-10-14 | Pass (seventh remediation re-review; strategic audit) | [Report: full matrix and C2-1–C2-10 accepted; 50/52 suite with unrelated documentation failures](reviews/vantage-point/vantagepoint-batch-2.md#seventh-independent-remediation-re-review--2026-10-14) |

| 3 | 36009–36016 | 2026-10-14 | Changes required (independent remediation re-review) | [Report: C3-4/C3-6/C3-7, matrix and consolidated handoff; 57 observations, 93 green files](reviews/vantage-point/vantagepoint-batch-3.md#independent-remediation-re-review--2026-10-14) |
| 3 | 36009–36016 | 2026-10-14 | Changes required (second remediation re-review) | [Report: retained acceptance and remaining composed C3-7 terminal path](reviews/vantage-point/vantagepoint-batch-3.md#second-independent-remediation-re-review--2026-10-14) |

| 3 | 36009–36016 | 2026-10-14 | Pass (third remediation re-review; complete matrix/shared consumers) | [Report: C3-1–C3-7 accepted, 34 observations and 93 green files](reviews/vantage-point/vantagepoint-batch-3.md#third-independent-remediation-re-review--2026-10-14) |

| 4 | 36017–36020 | 2026-10-14 | Changes required (independent remediation re-review) | [Report: C4-1–C4-4 accepted; complete matrix, C4-5–C4-8 and 37 observations; all 94 files pass](reviews/vantage-point/vantagepoint-batch-4.md#independent-remediation-re-review--2026-10-14) |

## Set-wide review status

**Changes required** — [full set report](reviews/vantage-point/vantagepoint-set-review.md).
Reviewed all 66 cards in the recorded 13 batches: 12 batches require repairs,
1 passed, 0 inconclusive. A failing batch may also retain named evidence
gaps; both defects and missing essential coverage must be resolved before Pass.
All 50 regression test files passed and eight headless games completed without
engine errors; these results do not supersede the demonstrated rules/AI defects.

Batch 1 subsequently passed independent remediation re-review on 2026-10-06.
Batch 2's third independent remediation re-review resolved C2-1–C2-4, including
actual access-phase payment and Azimat, but demonstrated C2-5: Nurse Hạnh's
Archives draw bonus displaces a known last-click winning steal. All 52 regression
files pass, alongside 27 independent observations that retain the new defect.
Batch 2 C2-5 implementation repair subsequently completed with ordinary-run
immediate-win precedence and prospective run-context/funding regressions; all
52 files pass. Fourth independent batch 2 re-review now confirms the original
C2-5 counterexample is repaired, but demonstrates C2-6: retained-Grip preferences
reject a survivable immediate winning route before potentials are refreshed.
That independent review reopened batch 2 Pending; its historical 32 observations
explicitly retain the bad choices as defect evidence. C2-6 implementation repair
completed on 2026-10-07 with a guarded tactical survival budget and permanent real
selector contrasts. All 52 regression files and required shared checks pass;
batch 2 is Complete for implementation, with independent re-review still required.
Fifth independent batch 2 re-review on 2026-10-07 confirms C2-1–C2-6, but
demonstrates C2-7: post-run tag-cleanup budgets reject a legal immediate winning
steal behind Funhouse, including the expiring-play consumer. All 52 regression
files pass; 37 independent observations retain the new defect and actual legal
tag/steal resolution. Batch 2 was reopened Pending with owner cleared; eleven
batches then remained, with batch 2 next.

C2-7 implementation repair subsequently completed on 2026-10-07: guarded
winning-steal routes ignore post-win tag cleanup, while real survival and
legality remain enforced. Permanent ordinary/expiring command/card/server
contrasts and actual AI Funhouse tags/steal pass; C2-1–C2-6 remain supported.
All 52 regression files and required checks pass. Batch 2 is Complete for
implementation; independent batch 2 and affected shared-consumer re-review
remain required. Ten batches remain for implementation repairs; batch 3 is next.
The historical set-wide verdict above is not renewed by
implementation completion or shared-consumer regressions.

The [pre-review implementation snapshot](history/vantagepoint-2026-10-06.md)
preserves the original full completion log. The
[post-review snapshot](history/vantagepoint-2026-10-06-reviewed.md) preserves this
repair queue and review log. Keep completion history append-only through repairs
and archive the updated tracker again before selecting another set. Use
`implement-card-batch` for repairs and independent batch/set review for sign-off.

Sixth independent batch 2 re-review on 2026-10-07 applied the revised skill's
coverage matrix and consolidated the required repairs: C2-8 route-carried tag
consequences, C2-9 terminal-goal semantics across reserves, initial removal,
optional access costs and live recalculation, and C2-10 useful Lampades
preparation. Original C2-1–C2-7 controls remain supported; 70 independent
observations include diagnostic defects and all 52 regression files pass.
Batch 2 is reopened Pending with owner cleared; two batches are Complete and
11 remain. Batch 2 is next for the consolidated repair handoff, followed by
independent matrix-based re-review. See the
[sixth review](reviews/vantage-point/vantagepoint-batch-2.md#sixth-independent-remediation-re-review--2026-10-07).

Consolidated batch 2 remediation completed on 2026-10-14 in the temporary
remediation worktree. C2-8/C2-9/C2-10 and retained controls pass all 52 regression
files; batch 2 is Complete for implementation. Independent sixth-review matrix
and shared-consumer re-review remain required; no reviewer verdict was changed.
Three batches are Complete and ten Pending; batch 3 is next.

Seventh independent batch 2 re-review on 2026-10-14 accepts the consolidated
C2-1–C2-10 matrix on the supplied remediation snapshot: **Pass** for the strategic
batch audit, with 80 independent observations and all relevant focused/shared
checks passing. Full regression verification is 50/52: `agent-scripts.test.js`
and `ai-roadmaps.test.js` fail on pre-existing staged Corp roadmap documentation;
no green-suite claim is made. See the [seventh review](reviews/vantage-point/vantagepoint-batch-2.md#seventh-independent-remediation-re-review--2026-10-14).
Batch 2 remains Complete, three batches are Complete and ten Pending, and batch 3
is next for implementation repair. Other snapshot-specific batch verdicts and
the historical set-wide Changes required verdict are not renewed.

Batch 3 remediation completed on 2026-10-14. C3-1–C3-5 and named per-card
strategic evidence pass the permanent full-engine tests and all 93 regression
files, including Corp decision fixtures and decision snapshots. Four batches
are Complete for implementation and nine Pending; batch 4 is next. Independent
batch 3 and affected shared-consumer re-review remain required, and no historical
reviewer verdict or set-wide readiness verdict is changed.

Second independent batch 3 re-review on 2026-10-14: **Changes required**.
C3-1–C3-6, C3-7 base repairs and prior named evidence gaps are accepted;
Baker/Rotary terminal candidate discovery still declines a guaranteed winning
paid redirect. All 93 regression files pass; 28 independent diagnostic
observations include an actual seven-point continuation.
[Current consolidated report](reviews/vantage-point/vantagepoint-batch-3.md#second-independent-remediation-re-review--2026-10-14).
Batch 3 is Pending with owner cleared; three batches Complete and ten Pending.
Repair batch 3 next; historical implementation/review evidence is preserved.

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

1. Archive the entire tracker, including batch boundaries, completion log,
   batch-review log (if present) and set-wide review state, under
   `documentation/new-sets/history/<registry-key>-<YYYY-MM-DD>.md`. Adjust relative
   Markdown links and label the snapshot with its date and review status. Never
   overwrite an existing snapshot; add a suffix when archiving twice on one date.
   Keep the linked implementation notes and review reports in place.
2. Link the archive and final review report from
   `documentation/new-sets/card-implementation-backlog.md`, preserving the final
   completion summary, unresolved findings and explicitly accepted limitations.
3. Replace every value in **Active set**, the status summary, batch queue,
   completion log and verification commands. Reset the set-wide review status
   and remove the previous set’s live review/archive links after preserving them.
4. Verify the new batches cover every intended card exactly once without gaps
   or overlaps.
5. Update the **Implementation notes** row to the new set's notes file.
6. Leave the generic `implement-card-batch` skill unchanged.

Independent batch 3 re-review on 2026-10-14 accepted the original crash/target
and Vic cleanup repairs but retained C3-4 prospective-rez follow-through and
demonstrated C3-6 Rotary opposing clock/terminal-access omissions and C3-7 Baker
lethal destination selection plus missing Corp R&D backdoor consequences.
The [consolidated matrix and handoff](reviews/vantage-point/vantagepoint-batch-3.md#independent-remediation-re-review--2026-10-14)
records 57 independent observations and all 93 regression files passing.
Batch 3 is Pending with owner cleared; three batches are Complete and ten
remain. Batch 3 is next for repairs; implementation completion history remains
append-only and no playability or set-wide verdict changes.


Batch 3 continuation remediation completed on 2026-10-14: C3-4/C3-6/C3-7 and
the consolidated audit's named essential evidence gaps have permanent real
selector/planner acceptance. All 93 regression files pass, including Corp
fixtures and decision snapshots; all required shared checks pass. Four batches
are Complete for implementation, nine Pending, and batch 4 (36017–36020) is next.
Independent batch 3 full-matrix and affected shared-consumer re-review remains
required. See [continuation notes](vantage-point-implementation-notes.md#batch-3-continuation-remediation--2026-10-14)
and the [preserved review/remediation log](reviews/vantage-point/vantagepoint-batch-3.md#remediation-log).
No independent reviewer verdict, set-wide verdict or playability flag was changed.


Batch 3 terminal composition remediation completed on 2026-10-14: remaining
C3-7 now has permanent actual command/ability/payment/destination/Rotary/steal
acceptance on HQ and R&D, with scarce-resource, finite-run, safety and Archives
alternatives. Shared CopyPoint fixes preserve reserved steal credits and avoid
reapplying origin damage when optional tags copy the point. The final stable
`node tests/run-all-tests.js` passes all 93 files, including Corp decision
fixtures and decision snapshots; required focused/shared checks pass. Four
batches Complete, nine Pending; batch 4 (36017–36020) is next.
See [terminal composition notes](vantage-point-implementation-notes.md#batch-3-terminal-composition-remediation--2026-10-14).
Independent full second-review matrix and affected shared-consumer re-review
remain required; historical review verdicts and playability are unchanged.


Batch 4 remediation completed on 2026-10-14: C4-1–C4-4/S1 and named per-card
strategic gaps have permanent actual selector/planner and live-resolution
acceptance. All 94 regression files and required shared checks pass. Five
batches are Complete for implementation and eight Pending; batch 5 (36021–36025)
is next. Independent batch 4 complete-matrix and affected shared-consumer
re-review remains required; no reviewer verdict or playability flag changed.
See [batch 4 implementation evidence](vantage-point-implementation-notes.md#batch-4-remediation-contract--2026-10-14)
and the [preserved review/remediation log](reviews/vantage-point/vantagepoint-batch-4.md#remediation-log).

Independent batch 4 remediation re-review on 2026-10-14: **Changes required**.
The original C4-1–C4-4 repairs and basic S1 helper/lifecycle behavior are accepted.
The [complete matrix and consolidated handoff](reviews/vantage-point/vantagepoint-batch-4.md#independent-remediation-re-review--2026-10-14)
records C4-5 active event Stealth-source discovery, C4-6 fresh second-run fuel,
C4-7 shared terminal funding/precedence and C4-8 locked pool income classification,
including affected ordinary/Hiram/Rotary/Baker/optional-payment consumers.
37 independent diagnostic observations include legal seven-point continuations;
all 94 regression files, Corp fixtures/snapshots and required shared checks pass.
Batch 4 is reopened Pending with owner cleared; four batches Complete and nine
Pending. Repair batch 4 next through `implement-card-batch`, then re-review the
complete current matrix. Completion history, other snapshot verdicts, set-wide
readiness and playability are unchanged.


Batch 4 consolidated continuation remediation completed on 2026-10-15:
C4-5–C4-8 and retained C4-1–C4-4/S1 controls have permanent real selector,
calculator and payment/steal evidence. The final `node tests/run-all-tests.js`
passes **94/94 files**, including Corp decision fixtures and decision snapshots;
all required focused/shared, syntax, hook-documentation, format/deck/identity
and diff checks pass. Five batches Complete, eight Pending; batch 5
(36021–36025) is next. See [implementation evidence](vantage-point-implementation-notes.md#batch-4-consolidated-continuation-contract--2026-10-15)
and [preserved independent findings/remediation](reviews/vantage-point/vantagepoint-batch-4.md#remediation-log-continued).
Independent complete latest batch 4 matrix and affected shared-consumer re-review
remain required. Historical reviewer/set-wide verdicts and playability are unchanged.
