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

**0 complete, 16 outstanding** (`16 Pending`, `0 In progress`, `0 Blocked`).

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
| 1 | 26066–26069 | Pending | — | Anarch: Hoshiko Shiro (flip identity), Moshing, Devil Charm, Gachapon. Complex. |
| 2 | 26070–26073 | Pending | — | Anarch companions: Keiko, Odore, Mystic Maemi, Paladin Poemu (existing, unverified). Complex. |
| 3 | 26074–26078 | Pending | — | Criminal: Bravado, Boomerang, Mu Safecracker, Prognostic Q-Loop, Swift. Complex. |
| 4 | 26079–26082 | Pending | — | Criminal stealth: Afterimage, Makler, Penumbral Toolkit, The Back. Complex. |
| 5 | 26083–26087 | Pending | — | Shaper: Harmony AR Therapy, Aniccam, Simulchip, Cordyceps, Euler. Complex. |
| 6 | 26088–26092 | Pending | — | Shaper: Mantle, Penrose, Self-modifying Code, Cybertrooper Talut (three existing, unverified), Paule's Café. Complex. |
| 7 | 26093–26095 | Pending | — | Neutral Runner: Buffer Drive, Daily Casts, DreamNet (two existing, unverified). |
| 8 | 26096–26100 | Complete | Claude, 2026-10-23 | Haas-Bioroid: Megaprix Qualifier, Project Vacheron, Bass CH1R180G4, Cerebral Overwriter, Vaporframe Fabricator. Complex. |
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
| 8 | 26096–26100 | 2026-10-23 | Claude | `tests/uprising-batch8.test.js` | Megaprix/Vacheron variable points via `agendaPointsForPlayer`; new `interruptOnAddedToScoreArea` engine hook in `MoveCardTriggers` (Vacheron counters before the win check); core damage now counts every point; Bass score-burst/last-click AI; Cerebral Overwriter ambush AI; Vaporframe free installs through `_bestInstallOption`. |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

**0 Pending**, 0 In progress, 0 Blocked, 0 Awaiting review. Rows are
initialised when each implementation batch completes.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 8 | 26096–26100 | Pending | — | Corp scoring/protection and steal-risk estimates read printed points: Megaprix second-copy bonus and Vacheron 0-point steal not valued. Bass is not part of the fast-advance search (only exact one-click bursts or last click). Vaporframe free installs are ranked with paid-install inhibition, so cost-free outer ice is undervalued; no plan for its trash response as bait. Cerebral Overwriter fires whenever affordable (no credit-reserve trade-off); advancement limit fixed at 3. |

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
