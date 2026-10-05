# F7 Indexed card-state and trigger discovery

**Roadmap item:** F7 · **Depends on:** F2, F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-planning.md` (Acceptance gates), `documentation/corp-ai/architecture.md` (Foundations)
**Verified against code:** 8633547 (2026-10-01)

## Goal
Replace repeated whole-board reconstruction in installed-card, active-card and
trigger-provider queries with engine-owned indexes whose answers and ordering
are continuously verifiable against the current traversal. This is a
behaviour-identical performance layer for large F4 batches, not an AI policy
change and not a prerequisite for F4.

## Current behaviour
F6 reduced the fixed 20-seed, eight-job Duel PD vs Tao mean from 42.188 seconds
to 2.255 seconds without changing a seeded hash. Its final profile no longer
had one dominant security-evaluation path: leading self-time was distributed
across `CheckInstalled()`, `ChoicesActiveTriggers()`,
`ActiveTriggerCandidates()`, `InstalledCards()` and `CheckActive()`.

Those helpers still reconstruct or rediscover state repeatedly:

- `CheckInstalled()` compares `card.cardLocation` with every central install
  array and, when those do not match, walks `corp.remoteServers`. Hosted cards
  are treated as installed unless `notInstalled` is set.
- `InstalledCards()` concatenates every central root and ICE array, every
  remote root and ICE array, and all three Runner rig arrays on each call. It
  then adds one level of hosted cards, including cross-player hosted cards,
  while excluding hosted cards marked `notInstalled`.
- `ActiveCards()` calls `InstalledCards()` for both sides, filters Corp cards
  by rez state, and adds identities, score areas and resolving cards with the
  existing `activeForOpponent` rules.
- `ChoicesActiveTriggers()` still calls `CheckCallback()` for the candidates
  it receives. F6 added `ActiveTriggerCandidates()` as a narrow structural
  cache for `modify*` providers, invalidated by `InstanceCard()`, modifier-card
  movement in `MoveCardTriggers()`, and debug card creation. Callback activity
  and `availableWhenInactive` remain live checks; response callbacks still use
  the uncached `AllCards()` path because several cards add response properties
  dynamically at runtime.

On F6's instrumented seed 1, the improvements reduced calls from 645,778 to
5,582 for `AllCards()`, 706,089 to 65,893 for `InstalledCards()`, and
27,658,420 to 550,880 for `CheckCallback()`. A direct installed-zone shortcut
made the real 20-seed batch slower and was reverted. The remaining opportunity
therefore needs a coherent state/index design and representative F4 evidence,
not more local conditionals.

## Design
- **Measure across the committed pool first.** Use F4's deck pool and timing
  output to record per-deck-pair game time, aggregate throughput and CPU
  profiles. Do not assume the Duel PD vs Tao residual profile generalises.
- **Inventory every mutation path.** Before selecting a data structure, trace
  card creation, `MoveCard()` / `MoveCardTriggers()`, hosting and unhosting,
  install and uninstall, server creation and removal, rez and derez,
  `removedFromGame`, resolving/installing areas, rewind restoration, test-field
  setup and debug-created cards. F2 is a dependency because AI hypotheticals
  that splice or replace zones manually must be migrated or explicitly rebuild
  the index before an engine-owned index can be authoritative.
- **Preserve query contracts.** Introduce one engine-owned state-index object,
  rebuilt at game setup and rewind, then updated at the central mutation
  boundaries. It may provide O(1) installed membership and ordered installed
  and active views by player. Returned arrays must preserve the exact ordering,
  hosted-card depth, cross-player ownership, `notInstalled`, identity,
  score-area, resolving-card and `activeForOpponent` semantics of the existing
  helpers. Callers must not be able to mutate the index through a returned
  array.
- **Treat activity as mutable state.** Corp activity changes on rez/derez
  without a zone move. Either update the active view at those boundaries or
  derive activity from the indexed installed view and live rez state. Do not
  reuse an active result across a hypothetical or callback that can change
  activity.
- **Index trigger providers separately from trigger eligibility.** Card
  instancing can register structurally declared callbacks by name. Movement,
  activity, ability suppression and `availableWhenInactive` are still checked
  live. Runtime callback attachment must use an explicit registration or
  invalidation path before response callbacks can leave the current scan;
  otherwise those callback families remain uncached. Lingering effects remain
  a separate live source.
- **Build a verification mode before switching callers.** In tests and
  profiling games, compute both the indexed and legacy result for
  `CheckInstalled()`, `InstalledCards()`, `ActiveCards()` and indexed trigger
  candidates. Throw on a difference in membership, ownership or order. Migrate
  one helper family at a time and keep the legacy traversal available to the
  verifier until the full mutation matrix passes.
- **Keep only measured stages.** After each helper family moves to the index,
  run deterministic tests, seeded hashes and the F4 performance comparison.
  Revert a stage that does not improve the representative batch or whose
  maintenance/invalidation cost outweighs its measured gain.

## Safety and information boundary
- This is a shared engine optimization. It must not change which cards exist,
  whether a card is installed or active, trigger eligibility, simultaneous
  trigger ordering, or any AI-visible information.
- Preserve current hidden-information boundaries: indexes may organize engine
  state internally but must not expose cards to a caller that the corresponding
  existing helper would not return.
- Never update only the headless harness. Browser games, rewind, debug tools,
  tests and AI-vs-AI games must use the same indexed implementation.
- A missing invalidation is a correctness bug. Verification mismatches fail
  loudly; they must not silently fall back only in tests.

## Test scenarios
1. For every ordinary Corp and Runner zone, indexed and legacy
   `CheckInstalled()`, `InstalledCards()` and `ActiveCards()` results have
   identical card identities and order.
2. Moving a card through hand/deck, installing, hosting, rehosting,
   uninstalling, trashing and removal from the game updates every relevant
   query immediately. Cross-player hosted cards and `notInstalled` hosted cards
   retain their current semantics.
3. Rez and derez change Corp active membership without changing installed
   membership. Runner installed cards, identities, score areas, resolving cards
   and `activeForOpponent` cards match the legacy active view.
4. Creating and removing remote servers does not leave stale installed
   membership or change canonical traversal order.
5. Rewind restoration, test-field setup and debug card creation rebuild or
   update indexes before the next query.
6. Declared modifier callbacks, callbacks available while inactive, suppressed
   abilities and lingering effects produce the same ordered trigger list as
   today.
7. A callback attached and later restored dynamically is either discovered
   through its explicit registration/invalidation path or remains on the
   legacy scan; it is never omitted by an index.
8. Guarded F2 hypotheticals can move, rez/derez and restore cards without
   leaking hypothetical membership into the real board.
9. Decision snapshots and every seeded F4 game hash are identical before and
   after each retained stage.

## Acceptance gate
N/A — deterministic fix (principle 4): indexed and legacy query results,
including card identity and order, must be identical in verification mode;
decision snapshots and seeded `logHash` values are the behavioural oracle.
Performance is an additional shipping requirement, not permission to change a
decision.

## Things to consider
- R2 owns player choice and ordering for simultaneous triggers. F7 must retain
  the current engine order and must not pre-empt R2 by introducing a new one.
- JavaScript `Set` insertion order is not automatically the engine's canonical
  zone order after rehosting or rewind. An index needs an explicit ordering
  contract rather than relying accidentally on insertion history.
- The F6 modifier-candidate cache is a useful prototype and compatibility
  layer. Replace it only after the new provider index covers its invalidation
  and live-eligibility guarantees.
- Persistent worker processes are separate from card-state indexing. Use F4's
  large-batch wall-time evidence before proposing worker reuse or VM reset
  machinery.

## Acceptance criteria
- [ ] Every test scenario above is covered by deterministic tests; verification mode exercises the real engine helpers rather than test-only replicas.
- [ ] The Resolution inventories all mutation paths and records how each updates or rebuilds the index.
- [ ] Verification mode reports no membership or ordering mismatch across the full test suite and the committed F4 deck pool.
- [ ] Decision snapshots and all paired seeded `logHash` values are identical to baseline.
- [ ] Three interleaved baseline/candidate runs of the full F4 workload show at least 10% higher median aggregate games per second, with no deck pair's median game time regressing by more than 5%; record commands and raw results in the Resolution.
- [ ] `documentation/corp-ai/architecture.md` describes the indexed state model, invalidation boundaries and verification mode.
- [ ] `node tests/run-all-tests.js` passes.
