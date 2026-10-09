# L8.4 Bounded posture epochs

**Roadmap item:** L8.4 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 3c25455 (2026-10-09)

## Implementation plan

Proposed at `3c25455`, 2026-10-09. **Awaiting approval.**

- **Validation:** Current behaviour re-grounded at `3c25455`: confirmed
  unchanged. The three `WeakMap`s are created in the `CorpAI` constructor and
  never cleared; `_shouldBaitServer()` and `_shouldBluffAgendaServer()` run
  `_runnerMayWinIfServerBreached()` (and the agenda's own winning-score check)
  before reading the cache; `_remoteDeceptionProfile()` has no guard. Posture
  consumers: `_deceptionPostureActive()` → `_deceptionProtectionTarget()` →
  `_NoMoreProtectionForThisServer()`, and `_deceptionAdvancementTarget()`
  (advancement limit in `Phase_Main`); `_deceptionInstallDistance()` reads only
  the profile. Classification: strategic preference (when to reconsider a
  bluff is not fixed by the rules), so F4-gated; scenarios 1, 2, 4, 5, 7, 8 and
  the horizon part of 6 are deterministic invariants of the option and are
  tested as such. Disagreements:
  1. **`bluffSingleVariableCorrelation` cannot be measured by F4 today.** The
     collector extension point (`scripts/ai-batch/metrics.js`) produces
     per-game numbers, aggregates means and bootstraps paired
     candidate−baseline differences; `--max` is a per-game hard check. A
     Spearman correlation pooled over every decision in the batch, with an
     absolute ceiling on the candidate's interval upper bound, needs a new
     batch-level collector hook (`finishBatch(gameValues)`, bootstrap by
     resampling games) and a gate flag (proposed `--ceiling <metric>=<n>`).
     This is shared F4 work (L8.2 and L8.5 need it too); the plan adds it here
     as its first consumer.
  2. **The Grip-size bug is an unrecorded gate dependency.** The ticket says to
     fix [agenda-bluff-probability-tracks-runner-grip-size](../bugs/agenda-bluff-probability-tracks-runner-grip-size.md)
     before measuring, but it is still open in `bugs/` with no reproduction,
     and L8.4 lists only F4. With epochs every reevaluation re-draws that
     Grip-dependent probability, so the correlation ceiling would measure the
     bug, not this item. Proposal: implement and test L8.4 now, run the gate
     only after that bug is fixed, and record it as an `## Additional blocker`
     at hand-off if it is still open.
  3. **`_remoteDeceptionProfile()` stays lifetime.** It picks a shape (ICE
     depth, opening advances, delay), not whether a card is postured, and
     install ranking calls it for cards still in HQ. Re-rolling depth after ICE
     was placed for it, or delay after `AITurnsInstalled` passed it, only moves
     the target. The Goal ("locked to the posture") is met by bounding the
     bait and bluff decisions. Scenario 8 still covers it.

  The old gate was not in "Writing a gate" form; it is rewritten below with
  its metrics and thresholds unchanged, plus one added standard guard,
  `pointsScored` (0.2), because a bluff posture changes agenda advancement
  cadence. The second hard check ("an expired commitment is reevaluated at the
  next decision that requires a posture") is the same condition as
  `postureLockedPastHorizon` and is merged into it.
- **Approach:** add `postureEpochs: false` to `CorpAI.DEFAULT_OPTIONS`. Off:
  today's code paths, untouched. On: `_shouldBaitServer()` and
  `_shouldBluffAgendaServer()` keep their guards first, then call one shared
  helper (working name `_epochPosture(kind, server, card, probability)`) that
  keeps a per-server record `{card, epochId, selectedScript,
  commitmentHorizon, reevaluationReasons, probability, roll, boundary}` in a
  new `WeakMap`.
  - **Epoch id:** a Corp-turn counter incremented in
    `_prepareProtectionPrioritiesForCorpTurn()` (already called by `phase.js`
    at each Corp turn start). The first roll happens at the first posture query
    after install.
  - **Commitment horizon:** expiry = roll turn + 2 or 3 Corp turns, drawn from
    `_random()` at roll time (a fixed cadence would itself be learnable).
  - **Reevaluation reasons:** `horizonExpired`; `challenged` (a run on the
    server since the roll, recorded by a new `_notePostureChallenge(server)`
    called from `phase.js` at run initiation, beside the existing
    `_recordSuccessfulRunForProtection` hook); `runnerPressure` (Runner credit
    band `floor(credits / 5)` or installed-breaker count changed since the
    roll); `stakes` (root advancement differs from what the posture's own
    cadence placed); `matchPoint` (either side is now one score or steal from
    winning, using `AgendaPointsToWin()`).
  - **At most one reevaluation per Corp turn:** a record is reconsidered only
    at the first posture query of a Corp turn whose epoch id is newer than the
    record's and for which a reason holds. Within an epoch, and on the
    Runner's turn, the stored result is reused with no `_random()` call. A
    reevaluation re-rolls at the current probability, so it may retain the old
    script. Grip size, HQ size, Corp credits and cache clears are not reasons
    (scenarios 4 and 7).
  - **Telemetry:** a harness-only `__posture` hook (no-op when absent, like
    `__rez`) receives `{kind, epochId, reason, postured, isAgenda, profile,
    publicVars}` for each roll, reuse and guard stop.
  - **Rejected:** clearing the old caches every Corp turn (rerolls each turn,
    so the posture flickers and correlation exposure multiplies); tying epochs
    to F3's `_withSecurityCache()` lifetime (scenario 7 forbids it; F3's cache
    is per decision, epochs are per Corp turn).
- **Tests:** new `tests/corp-posture-epochs.test.js` on the
  `corp-server-security` harness with an injected counting `_random`, one test
  per scenario 1–8, each asserting the logged `reevaluationReasons` and the
  choice. Scenario 5 plays two seeded headless games
  (`scripts/ai-batch/headless.js`) and compares the `__posture` sequence. The
  two match-point regression tests in `tests/corp-server-security.test.js` run
  a second time with the option on. Unit tests for the three collectors and the
  batch-metric/`--ceiling` extension in `tests/ai-batch.test.js`.
- **Risk:** with the option off, every snapshot and corp-decision fixture must
  stay unchanged (full suite). With it on, the posture feeds
  `_NoMoreProtectionForThisServer()` (protection allocation, L3.5.1) and the
  advancement limit, so a flip can change ICE placement and advancement on
  postured servers; the gate guards `winRate`, `pointsStolen` and
  `pointsScored`. The `phase.js` hook is one guarded call. The harness change
  must keep existing reports comparable (new hook optional, existing
  collectors unchanged).
- **Docs:** `documentation/ai.md`: no new card-facing hook (recorded
  explicitly). `documentation/corp-ai/architecture.md` "Baits, bluffs and
  deterrence" and `documentation/corp-ai/principles.md` §3 ("Persistent
  postures cache their roll with the card or server") describe epochs.
  `documentation/ai-batch-harness.md` documents `finishBatch` and `--ceiling`.
  Roadmap L8.4 set to `in-progress`.

## Goal
Preserve one stable bait or bluff decision during an AI planning window without permanently committing an installed card to a stale posture. Today a trap or agenda stays locked to the posture it rolled on install for the rest of the game.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). Verified details: three lifetime caches, all `WeakMap`s created in the `CorpAI` constructor and never cleared during a game:

- `_shouldBaitServer(server)` rolls once per server and trap card and stores `{card, probability, roll, bait}` in `_serverBaitDecisions`;
- `_shouldBluffAgendaServer(server)` rolls once per server and agenda and stores `{card, probability, roll, bluff}` in `_agendaBluffDecisions`;
- `_remoteDeceptionProfile(card)` rolls depth, opening advancement and delay once per card into `_cardDeceptionProfiles`.

Nothing reevaluates them. Both roll functions check `_runnerMayWinIfServerBreached(server)` (and, for agendas, whether scoring it wins for the Corp) *before* reading the cache, so the winning-breach guard already applies immediately on every call. L3.5.1 relies on the resulting `_NoMoreProtectionForThisServer()` exclusion, whose lifetime this item bounds.

## Design
- Replace the lifetime records with a posture record containing an epoch id, the selected public script, a commitment horizon, and reevaluation reasons (for example `epochId`, `selectedScript`, `commitmentHorizon`, `reevaluationReasons`), behind `this.options.postureEpochs` (default `false`; off keeps the lifetime caches).
- Roll once on install or at the start of a Corp planning epoch.
- Reevaluate only after a meaningful boundary: the Runner turn ends, the server is challenged, credits or public Runner pressure materially change, advancement changes the server's stakes, or either player reaches match point.
- Repeated evaluator calls inside the same epoch reuse the existing result without consuming extra randomness.
- A reevaluation may retain the old posture.
- Document posture-epoch signatures and reevaluation boundaries in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Keep `_random` injectable.
- Never reroll because `_NoMoreProtectionForThisServer()` or another scorer happened to run again.
- Match-winning safety overrides remain authoritative: never bait or bluff when a breach wins the game.
- Hidden Runner card identities remain forbidden.

## Test scenarios
1. Repeated calls in one epoch consume no extra randomness.
2. A new Corp turn permits at most one reevaluation.
3. A material threat change can abandon a bait.
4. Irrelevant state changes do not reroll.
5. Seeded games reproduce the same epoch sequence.
6. An installed card does not remain locked to a posture after its commitment horizon expires.
7. Clearing F3's per-decision cache (once F3 exists) does not start a new epoch.
8. With the option off, the three caches behave exactly as today.

Regression guard (existing behaviour, not acceptance for this item): reaching match point immediately disables an unsafe agenda or trap posture. This already holds because the guard runs before the cache, and the tests 'bait posture is disabled when breaching the same root could win the game' and 'agenda bluff supports variable ice depth and never risks the winning steal' in `tests/corp-server-security.test.js` must keep passing with the option on.

## Acceptance gate
F4 gate. Option `postureEpochs` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals.
Collectors: `postureDecisionsPerEpoch` (adds `postureDecisionsPerEpoch.violations`: posture rolls beyond one per eligible card per epoch), `postureLockedPastHorizon` (adds `postureLockedPastHorizon.count`: posture reuses at a Corp decision after the commitment horizon expired without a reevaluation), `bluffSingleVariableCorrelation` (adds the batch metric `bluffSingleVariableCorrelation.max`, defined under Things to consider; needs the batch-level extension in the plan).
Starts: none (if the `--quick` run shows no changed game, add boards from real logs with an installed trap or advanceable agenda).

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Ceiling | `bluffSingleVariableCorrelation.max` | lower | candidate interval upper bound at most 0.10 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Hard check | `postureDecisionsPerEpoch.violations` | — | at most 0 in every candidate game |
| Hard check | `postureLockedPastHorizon.count` | — | at most 0 in every candidate game |

No Improve row: the item only has to bound posture lifetime without regressions while keeping postures unlearnable.

Gate command: `node scripts/ai-batch.js gate --corp-option postureEpochs=true
--collector postureDecisionsPerEpoch --collector postureLockedPastHorizon
--collector bluffSingleVariableCorrelation
--ceiling bluffSingleVariableCorrelation.max=0.10 --guard winRate=0.02
--guard pointsStolen=0.2 --guard pointsScored=0.2
--max postureDecisionsPerEpoch.violations=0 --max postureLockedPastHorizon.count=0`

## Things to consider
- The F3 ticket notes that its per-decision evaluation cache pairs with posture epochs. Both define decision lifetimes, so decide explicitly how they interact rather than letting a cache clear trigger a posture reroll (scenario 7).
- **`bluffSingleVariableCorrelation`** (shared by L8.2, L8.4 and L8.5;
  whichever lands first adds it). For every bait or agenda-bluff decision that
  reached a random posture roll, including each epoch reevaluation, record
  `postured` 0/1 and, for postured decisions, `isAgenda` 0/1. Record profile
  rolls separately as `profileRolled` plus the selected ICE depth, advancement
  and delay; `_remoteDeceptionProfile()` chooses a shape, not whether a card is
  postured, and install ranking may call it before installation. Each record
  includes the public variables at decision time: turn number, Corp credits,
  Runner credits, Runner Grip size, HQ size, the server's root card count and
  ICE count, the deepest central's ICE count, and both players' agenda points.
  The metric is the largest absolute Spearman correlation over each applicable
  outcome/variable pair in the batch, with a bootstrap 95% CI. Decisions
  stopped by a safety guard are excluded, because guards may depend on state.
- The shipped agenda-bluff probability already fails this rule for Grip size: [`documentation/bugs/agenda-bluff-probability-tracks-runner-grip-size.md`](../bugs/agenda-bluff-probability-tracks-runner-grip-size.md). Fix it before measuring the baseline, or the baseline carries the defect.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] Collector `postureDecisionsPerEpoch` is built and tested.
- [ ] Collector `postureLockedPastHorizon` is built and tested.
- [ ] Collector `bluffSingleVariableCorrelation` (unless L8.5 or L8.2 already added it) is built and tested, with the batch-level metric and `--ceiling` gate check it needs.
- [ ] The gate setup is ready: a `--quick` run of the gate command reports at least one game changed by the option.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
