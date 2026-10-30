# Current Card-Set Implementation

Implementation and independent optimisation/review are separate. Follow the
batch-selection and transition rules in [the operator guide](card-set-agent-operator-guide.md).
Uprising's maintained [set record](records/uprising.md) and immutable
[transition snapshot](history/uprising-2026-10-30-implementation-transition.md)
preserve both queues, logs and outstanding findings; Downfall's and Vantage
Point's are in [records/downfall.md](records/downfall.md) and
[records/vantagepoint.md](records/vantagepoint.md).

## Active set

| Field | Value |
| ----- | ----- |
| Status | Active |
| Implementation status | Implemented |
| Set name | Genesis Cycle |
| Registry key | `genesis` |
| Pack code | `wla` |
| Definition file | `sets/genesis.js` |
| Metadata file | `carddata/carddata.json` |
| Card range | `2001–2120` |
| Registry state during batches | in-progress; hidden: true, untested: true, Eternal only |
| Focused integration test | `tests/genesis-<pack>.test.js`, one per pack batch |
| Implementation notes | `documentation/new-sets/genesis/<pack>.md`, one per pack batch |
| Review directory | `documentation/new-sets/reviews/genesis` |

The set combines six packs: `wla`, `ta`, `ce`, `asis`, `hs`, `fp` (registry code
`gen`). **Pack code** names only the first because `scripts/batch-brief.js` reads
a single code. Metadata codes are zero-padded (`02001` for card 2001). The range
holds 103 cards to implement and 17 duplicate reprints.

## Batch selection rule

Resume the first In progress batch, otherwise claim the first Pending batch.
Never skip a first outstanding Blocked batch without explicit authorization.
Implement exactly one batch per invocation. Preserve existing implementations,
but verify their gameplay and baseline AI before marking Complete. When all
batches pass integration, mark Implemented and playable; review is independent.
The next invocation selects the next Pending set in the backlog, or requests a
selection if none is queued.

**Parallel exception (owner decision, 2026-10-30).** All six pack batches run at
the same time, each in its own git worktree on branch `genesis/<pack>`. This
overrides the operator guide's rule against concurrent implementation on one
set. Each pack agent edits only its own cards in `sets/genesis.js`, its record
`documentation/new-sets/genesis/<pack>.md` and its test
`tests/genesis-<pack>.test.js`, plus the smallest shared engine/AI helpers its
cards strictly need. Pack agents do not edit this tracker,
`card-implementation-backlog.md`, `documentation/card-sets.md` or `config.js`;
the coordinator updates them. Branches merge into `sets/genesis-cycle` in pack
order (wla, ta, ce, asis, hs, fp); later merges resolve conflicts in shared
helpers against the earlier ones.

Packs wla, ce, ta, hs and asis were merged in that order on 2026-10-30. The
parallel run then ended; fp (batch 6) continues alone as an ordinary
In progress batch, and the tracker files above are editable again.

## Status summary

**6 complete, 0 outstanding** (`0 Pending`, `0 In progress`, `0 Blocked`).
All 103 intended definitions and 17 mapped duplicate reprints are integrated
into `sets/genesis-cycle`. Implementation and §8 integration checks are
complete; independent review/optimisation remain separate. Genesis is now
playable, visible and tested; Paul enabled Genesis for Eternal on 2026-10-30.

## Batch queue

One batch per data pack. Card IDs are the pack range; the duplicate reprints
listed below sit inside these ranges and reuse existing definitions. All
non-duplicate cards now have gameplay, baseline AI and focused test evidence.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 2001–2020 | Complete | parallel agent, branch `genesis/wla`, merged 2026-10-30 | What Lies Ahead (18): 2001 Whizzard: Master Gamer, 2002 Spinal Modem, 2004 Morning Star, 2005 Cortez Chip, 2006 Peacock, 2007 ZU.13 Key Master, 2008 The Helpful AI, 2009 Plascrete Carapace, 2010 Haas-Bioroid: Stronger Together, 2011 Mandatory Upgrades, 2012 Janus 1.0, 2013 Ash 2X3ZB9CY, 2014 Braintrust, 2015 Snowflake, 2016 Restructured Datapool, 2017 TMI, 2019 Caduceus, 2020 Dracō. Record: [genesis/wla.md](genesis/wla.md). |
| 2 | 2021–2040 | Complete | parallel agent, branch `genesis/ta`, merged 2026-10-30 | Trace Amount (18): 2021 Vamp, 2023 Satellite Uplink, 2024 e3 Feedback Implants, 2025 Compromised Employee, 2026 Notoriety, 2027 Snowball, 2028 Dyson Mem Chip, 2029 Encryption Protocol, 2030 Sherlock 1.0, 2031 Jinteki: Replicating Perfection, 2032 Fetal AI, 2034 Sensei, 2035 Big Brother, 2036 ChiLo City Grid, 2037 Power Grid Overload, 2038 Amazon Industrial Zone, 2039 Executive Retreat, 2040 Freelancer. Record: [genesis/ta.md](genesis/ta.md). |
| 3 | 2041–2060 | Complete | parallel agent, branch `genesis/ce`, merged 2026-10-30 | Cyber Exodus (16): 2041 Nerve Agent, 2042 Joshua B., 2044 Muresh Bodysuit, 2045 Snitch, 2046 Chaos Theory: Wünderkind, 2048 Dinosaurus, 2049 Personal Workshop, 2050 Public Sympathy, 2052 Viper, 2053 Edge of World, 2054 Sunset, 2055 Marked Accounts, 2057 Woodcutter, 2058 Commercialization, 2059 Private Contracts, 2060 Chimera. Record: [genesis/ce.md](genesis/ce.md). |
| 4 | 2061–2080 | Complete | parallel agent, branch `genesis/asis`, merged 2026-10-30 | A Study in Static (18): 2061 Disrupter, 2062 Force of Nature, 2064 Doppelgänger, 2065 Crescentus, 2066 Deus X, 2067 All-nighter, 2068 Inside Man, 2069 Underworld Contact, 2070 Green Level Clearance, 2071 Hourglass, 2072 Dedicated Server, 2073 Bullfrog, 2074 Uroboros, 2075 Net Police, 2076 Weyland Consortium: Because We Built It, 2077 Government Contracts, 2078 Tyrant, 2079 Oversight AI. Record: [genesis/asis.md](genesis/asis.md). |
| 5 | 2081–2100 | Complete | parallel agent, branch `genesis/hs`, merged 2026-10-30 | Humanity's Shadow (17): 2081 Surge, 2083 Andromeda: Dispossessed Ristie, 2085 HQ Interface, 2086 Pheromones, 2087 Quality Time, 2088 Replicator, 2089 Creeper, 2090 Kraken, 2091 Kati Jones, 2092 Eve Campaign, 2093 Rework, 2094 Whirlpool, 2096 Data Hound, 2097 Bernice Mai, 2098 Salvage, 2099 Simone Diego, 2100 Foxfire. Record: [genesis/hs.md](genesis/hs.md). |
| 6 | 2101–2120 | Complete | Codex, `genesis/fp`, 2026-10-30 | Future Proof (16) completed from 6ef6b2c, merged through 8965ce1. Gameplay, baseline AI and 41 focused cases; shared event, run-cost, trace and jack-out helpers reused. Record: [genesis/fp.md](genesis/fp.md). |

### Duplicate reprints (not implemented)

These 17 cards are already defined in another set and stay as
`// cardSet[<id>] = <title> - DUPLICATE` comments in `sets/genesis.js`. Their IDs are recorded in
`ACCEPTED_MISSING_DEFINITIONS.genesis` in `scripts/card-status.js`; this
accepts only the 17 intentional duplicate omissions.

| ID | Title | Defined in |
| -: | ----- | ---------- |
| 2003 | Imp | `sets/systemupdate2021.js` (31007) |
| 2018 | Project Atlas | `sets/systemupdate2021.js` (31073) |
| 2022 | Liberated Account | `sets/systemupdate2021.js` (31010) |
| 2033 | Trick of Light | `sets/systemupdate2021.js` (31058) |
| 2047 | Test Run | `sets/systemupdate2021.js` (31028) |
| 2043 | Emergency Shutdown | `sets/systemupdate2021.js` (31016) |
| 2051 | Project Vitruvius | `sets/systemupdate2021.js` (31041) |
| 2056 | Pop-up Window | `sets/systemupdate2021.js` (31065) |
| 2063 | Scrubber | `sets/systemupdate2021.js` (31011) |
| 2080 | False Lead | `sets/uprising.js` (26129) |
| 2082 | Xanadu | `sets/systemupdate2021.js` (31012) |
| 2084 | Networking | `sets/systemupdate2021.js` (31020) |
| 2095 | Hokusai Grid | `sets/systemupdate2021.js` (31059) |
| 2101 | Retrieval Run | `sets/systemupdate2021.js` (31004) |
| 2110 | Eli 1.0 | `sets/systemupdate2021.js` (31043) |
| 2112 | Ronin | `sets/systemupdate2021.js` (31053) |
| 2115 | Project Beale | `sets/systemupdate2021.js` (31062) |

## Completion log

| Batch | Card IDs | Completed | Agent | Focused tests | Notes |
| ----: | -------- | --------- | ----- | ------------- | ----- |
| 1 | 2001–2020 | 2026-10-30 | parallel agent, `genesis/wla` | `tests/genesis-wla.test.js` (17 cases) | Merged cf53716. At merge, ZU.13 moved from a per-instance `InitInstance` getter to `variableMemoryCost`, shared with Creeper. |
| 3 | 2041–2060 | 2026-10-30 | parallel agent, `genesis/ce` | `tests/genesis-ce.test.js` | Merged 4b23e26. Found the Emergency Shutdown reprint missed by the scaffolder (fixed in b371a54). |
| 2 | 2021–2040 | 2026-10-30 | parallel agent, `genesis/ta` | `tests/genesis-ta.test.js` (30 cases) | Merged 0a4b996. Kept ce's `Expose` callback and ta's `responseOnTraceSuccessful` (passes the trace margin). |
| 5 | 2081–2100 | 2026-10-30 | parallel agent, `genesis/hs` | `tests/genesis-hs.test.js` (30 cases) | Merged 395bc63; fast suite passed (142 files). |
| 4 | 2061–2080 | 2026-10-30 | parallel agent, `genesis/asis` | `tests/genesis-asis.test.js` (21 cases) | Merged 0f8f0da; fast suite passed (143 files). |
| 6 | 2101–2120 | 2026-10-30 | Codex, `genesis/fp` | `tests/genesis-fp.test.js` (41 cases) | Completed Runner verification and eight Corp cards; mandatory encounter-end timing repaired for Faerie. Merged 8965ce1 into `sets/genesis-cycle`. |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

**6 Pending**, 0 In progress, 0 Blocked, 0 Awaiting review. Rows are
initialised when each implementation batch completes. Each pack record lists
its full deferred-optimisation notes.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |
| 1 | 2001–2020 | Pending | — | Cortez Chip's additional cost is modelled as +2 rez cost (rez-cost reductions wrongly offset it); Spinal Modem's core damage resolves before the trace's own success effect. See [genesis/wla.md](genesis/wla.md). |
| 2 | 2021–2040 | Pending | — | The run planner doesn't plan for e3, Notoriety or Replicating Perfection; the Corp AI doesn't raise trace strength for Sherlock or ChiLo. See [genesis/ta.md](genesis/ta.md). |
| 3 | 2041–2060 | Pending | — | See the deferred list in [genesis/ce.md](genesis/ce.md). |
| 4 | 2061–2080 | Pending | — | The AI never rezzes Tyrant without advancement counters; Deus X trashing is not a run-planner cost; Uroboros and Bullfrog traces and psi games are not priced in the run calculator. See [genesis/asis.md](genesis/asis.md). |
| 5 | 2081–2100 | Pending | — | "May jack out" cards in other sets bypass Whirlpool's lock; losing link after installing Creeper doesn't force an MU trash; the Runner AI uses default trace bidding. See [genesis/hs.md](genesis/hs.md). |
| 6 | 2101–2120 | Pending | — | Darwin growth/purge planning; DLR tag-float timing; Indexing follow-up-run budget; Midori replacement ranking; trace-bid alternatives; Midseason punishment combos; Corporate War delay risk; DRT concealed-rez/access sequencing. See [genesis/fp.md](genesis/fp.md). |

## Optimisation log

No optimisation recorded.

| Date | Batch / IDs | Finding / scope | Repairs and evidence | Remaining review scope |
| ---- | ----------- | --------------- | -------------------- | ---------------------- |

## Set-wide review status

Not requested.

## Required shared verification

```sh
node --check sets/genesis.js
node tests/genesis-<pack>.test.js   # each merged pack
node tests/eternal-format.test.js
node tests/deckbuild-format-pool.test.js
node tests/card-status.test.js
git diff --check
```

Run focused batch tests, regenerate card status, and run
`node tests/run-all-tests.js` on `.nvmrc` Node after the pack merges, including
Corp decision fixtures and decision snapshots. Known-red pending reproductions
are excluded.

## Set-completion integration (2026-10-30)

All six pack tests passed, together with the shared verification commands
above, AI-hook documentation and decklauncher identity-change checks. §8 audit
confirmed 120 metadata cards: 103 unique definitions with matching titles,
local JPG images and numeric ELO, plus 17 mapped reprints. No scaffold or empty
effect remains. Woodcutter, Tyrant and Salvage have intentionally empty printed
subroutine arrays, populated from advancement counters. Format-pool regression
generates legal Runner/Corp decks for every eligible identity in every legal
format, including Genesis in Eternal. Syntax checks cover all edited JS;
`git diff --check` passes. No PHP changed; no browser playtest claimed.

Paul enabled Genesis for Eternal on 2026-10-30. `documentation/card-sets.md`
marks it playable and `config.js` sets `hidden: false`, `untested: false`.
Eternal already includes the `gen` set code. All implementation batches are complete,
independent review is Not requested, and all six optimisation rows are Pending.

Final validation: `node tests/run-all-tests.js` on Node 20.19.0 passed all
**146 full test files** (exit 0), including Corp decision fixtures, snapshots
and integration tests. Repeated after enabling Genesis; all 146 files passed
on the enabled configuration. Availability, format-pool, decklauncher and
card-status checks also passed. The initial run found four failures; after focused
repairs and passing affected regressions, the corrected full run passed. Logs:
`/tmp/genesis-enabled-suite.log`, exit status
`/tmp/genesis-enabled-suite.exit`. No next set is queued; stop after this batch.

## Changing the active set

Archive this tracker and preserve a maintained set record under the operator
guide before selecting another explicitly queued set. Review and optimisation
do not block the implementation queue.
