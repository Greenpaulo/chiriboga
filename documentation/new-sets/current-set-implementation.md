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
| Implementation status | In progress |
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
holds 105 cards to implement and 15 duplicate reprints.

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

## Status summary

**0 complete, 6 outstanding** (`0 Pending`, `6 In progress`, `0 Blocked`).

## Batch queue

One batch per data pack. Card IDs are the pack range; the duplicate reprints
listed below sit inside these ranges and are not implemented. Every listed card
is a `scripts/scaffold_set.py` stub with TODO markers and dated ELO; none is
credited without tests.

| Batch | Card IDs | Status | Owner / started | Notes/blocker |
| ----: | -------- | ------ | --------------- | ------------- |
| 1 | 2001–2020 | In progress | parallel agent, branch `genesis/wla`, 2026-10-30 | What Lies Ahead (18): 2001 Whizzard: Master Gamer, 2002 Spinal Modem, 2004 Morning Star, 2005 Cortez Chip, 2006 Peacock, 2007 ZU.13 Key Master, 2008 The Helpful AI, 2009 Plascrete Carapace, 2010 Haas-Bioroid: Stronger Together, 2011 Mandatory Upgrades, 2012 Janus 1.0, 2013 Ash 2X3ZB9CY, 2014 Braintrust, 2015 Snowflake, 2016 Restructured Datapool, 2017 TMI, 2019 Caduceus, 2020 Dracō. Record: [genesis/wla.md](genesis/wla.md). |
| 2 | 2021–2040 | In progress | parallel agent, branch `genesis/ta`, 2026-10-30 | Trace Amount (18): 2021 Vamp, 2023 Satellite Uplink, 2024 e3 Feedback Implants, 2025 Compromised Employee, 2026 Notoriety, 2027 Snowball, 2028 Dyson Mem Chip, 2029 Encryption Protocol, 2030 Sherlock 1.0, 2031 Jinteki: Replicating Perfection, 2032 Fetal AI, 2034 Sensei, 2035 Big Brother, 2036 ChiLo City Grid, 2037 Power Grid Overload, 2038 Amazon Industrial Zone, 2039 Executive Retreat, 2040 Freelancer. Record: [genesis/ta.md](genesis/ta.md). |
| 3 | 2041–2060 | In progress | parallel agent, branch `genesis/ce`, 2026-10-30 | Cyber Exodus (17): 2041 Nerve Agent, 2042 Joshua B., 2043 Emergency Shutdown, 2044 Muresh Bodysuit, 2045 Snitch, 2046 Chaos Theory: Wünderkind, 2048 Dinosaurus, 2049 Personal Workshop, 2050 Public Sympathy, 2052 Viper, 2053 Edge of World, 2054 Sunset, 2055 Marked Accounts, 2057 Woodcutter, 2058 Commercialization, 2059 Private Contracts, 2060 Chimera. Record: [genesis/ce.md](genesis/ce.md). |
| 4 | 2061–2080 | In progress | parallel agent, branch `genesis/asis`, 2026-10-30 | A Study in Static (18): 2061 Disrupter, 2062 Force of Nature, 2064 Doppelgänger, 2065 Crescentus, 2066 Deus X, 2067 All-nighter, 2068 Inside Man, 2069 Underworld Contact, 2070 Green Level Clearance, 2071 Hourglass, 2072 Dedicated Server, 2073 Bullfrog, 2074 Uroboros, 2075 Net Police, 2076 Weyland Consortium: Because We Built It, 2077 Government Contracts, 2078 Tyrant, 2079 Oversight AI. Record: [genesis/asis.md](genesis/asis.md). |
| 5 | 2081–2100 | In progress | parallel agent, branch `genesis/hs`, 2026-10-30 | Humanity's Shadow (17): 2081 Surge, 2083 Andromeda: Dispossessed Ristie, 2085 HQ Interface, 2086 Pheromones, 2087 Quality Time, 2088 Replicator, 2089 Creeper, 2090 Kraken, 2091 Kati Jones, 2092 Eve Campaign, 2093 Rework, 2094 Whirlpool, 2096 Data Hound, 2097 Bernice Mai, 2098 Salvage, 2099 Simone Diego, 2100 Foxfire. Record: [genesis/hs.md](genesis/hs.md). |
| 6 | 2101–2120 | In progress | parallel agent, branch `genesis/fp`, 2026-10-30 | Future Proof (17): 2101 Retrieval Run, 2102 Darwin, 2103 Data Leak Reversal, 2104 Faerie, 2105 Mr. Li, 2106 Indexing, 2107 R&D Interface, 2108 Deep Thought, 2109 New Angeles City Hall, 2111 Ruhr Valley, 2113 Midori, 2114 NBN: The World is Yours*, 2116 Midseason Replacements, 2117 Flare, 2118 Dedicated Response Team, 2119 Burke Bugs, 2120 Corporate War. Record: [genesis/fp.md](genesis/fp.md). |

### Duplicate reprints (not implemented)

These 15 cards are already defined in another set and stay as
`// cardSet[<id>] = <title> - DUPLICATE` comments in `sets/genesis.js`. Before
Genesis can become playable they need `ACCEPTED_MISSING_DEFINITIONS` entries for
`genesis` in `scripts/card-status.js` (not added yet).

| ID | Title | Defined in |
| -: | ----- | ---------- |
| 2003 | Imp | `sets/systemupdate2021.js` (31007) |
| 2018 | Project Atlas | `sets/systemupdate2021.js` (31073) |
| 2022 | Liberated Account | `sets/systemupdate2021.js` (31010) |
| 2033 | Trick of Light | `sets/systemupdate2021.js` (31058) |
| 2047 | Test Run | `sets/systemupdate2021.js` (31028) |
| 2051 | Project Vitruvius | `sets/systemupdate2021.js` (31041) |
| 2056 | Pop-up Window | `sets/systemupdate2021.js` (31065) |
| 2063 | Scrubber | `sets/systemupdate2021.js` (31011) |
| 2080 | False Lead | `sets/uprising.js` (26129) |
| 2082 | Xanadu | `sets/systemupdate2021.js` (31012) |
| 2084 | Networking | `sets/systemupdate2021.js` (31020) |
| 2095 | Hokusai Grid | `sets/systemupdate2021.js` (31059) |
| 2110 | Eli 1.0 | `sets/systemupdate2021.js` (31043) |
| 2112 | Ronin | `sets/systemupdate2021.js` (31053) |
| 2115 | Project Beale | `sets/systemupdate2021.js` (31062) |

## Completion log

No batches completed yet.

| Batch | Card IDs | Completed | Agent | Focused tests | Notes |
| ----: | -------- | --------- | ----- | ------------- | ----- |

## Batch-review log

No independent reviews recorded.

| Batch | Card IDs | Reviewed | Verdict | Evidence |
| ----: | -------- | -------- | ------- | -------- |

## Optimisation queue

**0 Pending**, 0 In progress, 0 Blocked, 0 Awaiting review. Rows are
initialised when each implementation batch completes.

| Batch | Card IDs | Status | Owner / started | Findings/evidence |
| ----: | -------- | ------ | --------------- | ----------------- |

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

## Changing the active set

Archive this tracker and preserve a maintained set record under the operator
guide before selecting another explicitly queued set. Review and optimisation
do not block the implementation queue.
