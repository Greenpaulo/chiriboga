# Current Card-Set Implementation

Implementation and independent optimisation/review are separate. Follow the
batch-selection and transition rules in [the operator guide](card-set-agent-operator-guide.md).
Downfall's maintained [set record](records/downfall.md) and immutable
[transition snapshot](history/downfall-2026-10-23-implementation-transition.md)
preserve both queues, logs and outstanding findings; Vantage Point's are in
[its set record](records/vantagepoint.md).

## Active set

| Field | Value |
| ----- | ----- |
| Status | Active |
| Implementation status | In progress |
| Set name | Uprising |
| Registry key | `uprising` |
| Pack code | `ur` |
| Definition file | `sets/uprising.js` |
| Metadata file | `carddata/carddata.json` |
| Card range | `26066–26130` |
| Registry state during batches | in-progress; hidden: true, untested: true |
| Focused integration test | `tests/uprising-integration.test.js` |
| Implementation notes | `documentation/new-sets/uprising-implementation-notes.md` |
| Review directory | `documentation/new-sets/reviews/uprising` |

## Batch selection rule

Resume the first In progress batch, otherwise claim the first Pending batch.
Never skip a first outstanding Blocked batch without explicit authorization.
Implement exactly one batch per invocation. Preserve existing implementations,
but verify their gameplay and baseline AI before marking Complete. When all
batches pass integration, mark Implemented and playable; review is independent.
The next invocation selects the next Pending set in the backlog, or requests a
selection if none is queued.

## Status summary

**1 complete, 15 outstanding** (`15 Pending`, `0 In progress`, `0 Blocked`).

## Batch queue

Boundaries follow faction, then complexity (4–5 cards where a batch has an
identity, hosting, run/encounter redirects or a new shared mechanic; 3 for the
short neutral tails). Six cards already had definitions (26073, 26088, 26090,
26091, 26094, 26095); none is credited without tests. The other 59 are
`scripts/scaffold_set.py` stubs with TODO markers and dated ELO. See the
[setup notes](uprising-implementation-notes.md) for per-batch risks, including
the shared Lockdown mechanic first needed in batch 9.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 26066–26069 | Complete | Claude, 2026-10-23 | Anarch: Hoshiko Shiro (flip identity), Moshing, Devil Charm, Gachapon. Complex. |
| 2 | 26070–26073 | Complete | Claude, 2026-10-23 | Anarch companions: Keiko, Odore, Mystic Maemi, Paladin Poemu (existing, unverified). Complex. |
| 3 | 26074–26078 | Complete | Claude, 2026-10-23 | Criminal: Bravado, Boomerang, Mu Safecracker, Prognostic Q-Loop, Swift. Complex. |
| 4 | 26079–26082 | Complete | Claude, 2026-10-23 | Criminal stealth: Afterimage, Makler, Penumbral Toolkit, The Back. Complex. |
| 5 | 26083–26087 | Complete | Claude, 2026-10-23 | Shaper: Harmony AR Therapy, Aniccam, Simulchip, Cordyceps, Euler. Complex. |
| 6 | 26088–26092 | Pending | — | Shaper: Mantle, Penrose, Self-modifying Code, Cybertrooper Talut (three existing, unverified), Paule's Café. Complex. |
| 7 | 26093–26095 | Pending | — | Neutral Runner: Buffer Drive, Daily Casts, DreamNet (two existing, unverified). |
| 8 | 26096–26100 | Pending | — | Haas-Bioroid: Megaprix Qualifier, Project Vacheron, Bass CH1R180G4, Cerebral Overwriter, Vaporframe Fabricator. Complex. |
| 9 | 26101–26105 | Pending | — | Haas-Bioroid: Drafter, Týr, NEXT Activation Command (first Lockdown), Scapenet, Tranquility Home Grid. Complex. |
| 10 | 26106–26108 | Pending | — | Jinteki: Flower Sermon, Prāna Condenser, Engram Flush. Complex. |
| 11 | 26109–26112 | Pending | — | Jinteki Psi/install: Konjin, Hyoubu Precog Manifold, Kakurenbo, La Costa Grid. Complex. |
| 12 | 26113–26116 | Pending | — | NBN: GameNET (identity), Bellona, F2P, Gold Farmer. Complex. |
| 13 | 26117–26119 | Pending | — | NBN: Digital Rights Management, SYNC Rerouting, Ganked!. Complex. |
| 14 | 26120–26123 | Pending | — | Weyland: Earth Station (flip identity), Transport Monopoly, Wall to Wall, Akhet. Complex. |
| 15 | 26124–26127 | Pending | — | Weyland: Colossus, Winchester, Argus Crackdown, Cayambe Grid. Complex. |
| 16 | 26128–26130 | Pending | — | Neutral Corp: Cyberdex Sandbox, False Lead, NAPD Cordon. |

## Completion log

| Batch | Card IDs | Completed | Agent | Focused tests | Notes |
| ----: | -------- | --------- | ----- | ------------- | ----- |
| 1 | 26066–26069 | 2026-10-23 | Claude | `tests/uprising-batch1.test.js` | Hoshiko access-driven flip; Moshing multi-select grip cost; Devil Charm encounter removal with a run-long lingering -6 and a Run Calculator `strengthMod` persistent (shared `IceAct` change); Gachapon set-aside dig with discounted install. Baseline AI through economy/draw play, encounter-window preference, `AIDrawTrigger`. |
| 2 | 26070–26073 | 2026-10-23 | Claude | `tests/uprising-batch2.test.js` | Keiko, Odore, Mystic Maemi, Paladin Poemu (rewritten); engine records `runnerCompanionUse` and passes spent hosted `sources` to `responseOnCreditsSpent`. See notes. |
| 3 | 26074–26078 | 2026-10-23 | Claude | `tests/uprising-batch3.test.js` (11 real-engine scenarios) | Bravado (distinct passed ice, pays on any run end), Boomerang (chosen ice, trash break 2, delayed heap-to-stack recursion), Mu Safecracker (stealth-only payment, +1 HQ/R&D access), Prognostic Q-Loop (first-run look, once-per-turn reveal/install), Swift (+1 MU, first run event click). No shared engine/AI changes. |
| 4 | 26079–26082 | 2026-10-23 | Claude | `tests/uprising-batch4.test.js` | Afterimage stealth-only pump/bypass (restricted credits via encounter-option `restrictedCredits`), Makler, Penumbral Toolkit, The Back (new `automaticOnAbilityUsed` trigger, `HasTrashAbility` helper). See notes. |
| 5 | 26083–26087 | 2026-10-23 | Claude | `tests/uprising-batch5.test.js` | Harmony AR Therapy, Aniccam, Simulchip, Cordyceps, Euler with baseline AI. Shared: `Trash()` records the `runnerEventTrashed`/`runnerInstalledProgramTrashed` turn events; played events trashed after resolving open `responseOnPlayedEventTrashed`; a Runner `AITriggerInPaidWindow()` consumer. See the [notes](uprising-implementation-notes.md#batch-5--2026-10-23). |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

**1 Pending**, 0 In progress, 0 Blocked, 0 Awaiting review. Rows are
initialised when each implementation batch completes.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 1 | 26066–26069 | Pending | — | Hoshiko: run planning ignores the flip incentive/penalty. Moshing: plays only with three cards not worth keeping. Devil Charm: Corp security counts the single use on every ice; install heuristic is strength-only. Gachapon: digs only for a missing basic breaker type. See notes. |
| 2 | 26070–26073 | Pending | — | Poemu/Maemi do not plan to spend the stash before 3 credits; Maemi keep/trash ignores stash value vs grip; Keiko priority ignores companion usage. See notes. |
| 3 | 26074–26078 | Pending | — | Deeper strategy: Bravado as pure economy when no run is otherwise wanted; Boomerang trash not priced (may be spent where a cheap breaker would do) and target choice vs. future runs; Mu Safecracker always pays, ignoring later stealth-credit needs, and access estimate ignores credits spent breaking earlier in the run; Q-Loop knowledge can survive a stack shuffle that leaves the same card on top, and blind reveals are never used; Swift click gain absent from run-event click planning. See implementation notes. |
| 4 | 26079–26082 | Pending | — | Corsair's `AIRunRestrictedCredits` still counts run-only stealth sources (Toolkit, Touchstone, Methuselah) that also report `AIRunPoolCreditOffset`, so with Corsair installed pre-run stealth budgets can double count; Makler's full-break 1[c] and Afterimage's once-per-turn bypass across finite reruns are not priced; Corp security does not price Afterimage's 2-credit bypass; The Back counts only abilities resolved through `TriggerAbility` (not optional hardware responses or hosted-credit spending) and picks heap cards by ELO. |
| 5 | 26083–26087 | Pending | — | Deeper strategy only: Simulchip never pays the program-trash cost and is not used during runs (e.g. to recover a breaker trashed by a subroutine); Cordyceps only weakens the central just run, with unrezzed ice valued at the default threat estimate; Harmony AR Therapy ranks recovered cards by ELO, without deck-plan or Aniccam synergy; Aniccam has no event-count install valuation; Euler's install-turn free breaks are not anticipated when planning install-then-run. |

## Optimisation log

No optimisation recorded.

| Date | Batch / IDs | Finding / scope | Repairs and evidence | Remaining review scope |
| ---- | ----------- | --------------- | -------------------- | ---------------------- |

## Set-wide review status

Not requested.

## Required shared verification

```sh
node --check sets/uprising.js
node tests/uprising-integration.test.js
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
