# F6 Headless AI performance

## Resolution

Implemented from `f2054ee`.

- Added an evaluation-local security context that prices each ICE once across
  rez plans and reuses stable active-card, run-calculator, subtype, strength,
  breaker, subroutine and bypass results. Plan membership, affordability,
  restricted credits and reasons remain per plan. The three-ICE reproduction
  now makes 3 pricing calls instead of 9 without changing its selected plan or
  logged omission reason.
- Added `RunCalculator._baseStrength()`: base/global-modified card strength is
  computed once per active calculation, while `point.card_str_mods` continues
  to add path-specific changes. Direct `IceAI()` and `IceAct()` calls outside
  a calculation read current strength instead of reusing the completed
  calculation's cache.
- `_securityBoardKey()` now obtains each counter-modifier trigger list once per
  fingerprint instead of rediscovering it for every card and counter type.
  `ChoicesActiveTriggers()` similarly caches the structural candidates for
  `modify*` callbacks, invalidating when cards are created or a modifier card
  moves, while checking activity and `availableWhenInactive` live on every
  call. Dynamic response hooks deliberately retain the uncached path.
- The user approved widening the original security-only scope to headless
  performance, then explicitly replaced the provisional sub-10-second stopping
  point with "as fast as safely practical". Work continued through successive
  profiles until the next state-check shortcut made the batch slower and was
  reverted. Plan enumeration, decisions, reasons and benchmark deck lists did
  not change.
- **Baseline:** `node scripts/ai-game.js --seeds 1-20 --jobs 8` used the
  command's default Duel PD vs Tao pair and averaged 42,188.0 ms. The approved
  plan records every baseline hash and per-seed time. Baseline seed 1 took
  17,090 ms under CPU profiling; 50.85% of samples were below
  `_evaluateServerSecurityUncached()` and 49.22% below `_icePlanOutcome()`.
- **Intermediate:** after only the local security context, all 20 hashes were
  unchanged and the mean was 19,628.4 ms, a 53.5% reduction. The next profile
  put uncached security at 12.67%, while `Directions()`/`Strength()` had become
  the material repeated path.
- **Final:** the fixed eight-job command averaged **2,254.8 ms**, a **94.7%**
  reduction, with an 8.5-second batch wall time. Per-seed times were `1 2490;
  2 4023; 3 1067; 4 1621; 5 1404; 6 5447; 7 4128; 8 910; 9 2342; 10
  1959; 11 2559; 12 754; 13 5826; 14 1209; 15 661; 16 1935; 17 1579;
  18 1599; 19 2190; 20 1393` ms. Every seed retained the baseline `logHash`.
  At the measured throughput, a 2,400-game gate is roughly 17 minutes rather
  than hours (before F4's collector overhead).
- With F3 disabled, seeds 1–3 retained hashes `7fd342dbe6a8`,
  `56b2c48622d9`, `4f89d7cde989` and averaged 2,661.0 ms, down from 57,188.0
  ms. Cross-deck seed 1 also retained `5f85d9269838` for BTL vs Kit (828 ms)
  and `03b8c00f468a` for NEH vs Zahya (845 ms).
- The final profiled seed 1 retained `7fd342dbe6a8` and took 1,417 ms. The
  leading self-time is now distributed across `CheckInstalled()`,
  `ChoicesActiveTriggers()`, `ActiveTriggerCandidates()`, `InstalledCards()`
  and `CheckActive()`, rather than security-plan pricing. Seed-1 instrumentation
  fell from 645,778 to 5,582 `AllCards()` calls, 706,089 to 65,893
  `InstalledCards()` calls, and 27,658,420 to 550,880 `CheckCallback()` calls.
  A direct installed-zone shortcut regressed the 20-seed mean and was reverted;
  deeper gains now require a separately designed state/indexing change.
- The pending reproduction's selected-plan, logged-reason and pricing-count
  assertions moved unchanged to `tests/f6-headless-ai-performance.test.js`.
  Promotion changed only the wrapper's test-directory resolution so it works
  from both `tests/pending/` and `tests/`. Focused security tests, corp
  decision fixtures, decision snapshots and all 41 test files pass. Current
  behaviour is documented in [Server security evaluation](../../corp-ai/architecture.md#server-security-evaluation)
  and [Foundations](../../corp-ai/architecture.md#foundations).

## Implementation plan

Proposed at `f2054ee`, 2026-10-01. **Approved 2026-10-01; widened by the user
to minimize headless-game runtime, with no arbitrary stopping target.**

- **Validation:** The ticket remains correctly classified as an ungated,
  behaviour-identical optimization: unchanged choices, ordered reasons and
  seeded `logHash` values are objective invariants, not strategic preferences.
  The current call graph still sends every affordable rez-plan leaf through
  `_icePlanOutcome()`, which repeats plan-independent breaker, break-cost and
  bypass work. The pending three-ICE reproduction preserves the selected
  two-layer plan and its `Inner wall omitted from best affordable rez plan`
  reason, but fails at `f2054ee` because `_matchingBreakerForIce()` runs 9
  times instead of the required 3. The fresh seed-1 profile attributes 50.85%
  of samples to `_evaluateServerSecurityUncached()`, 49.22% to
  `_icePlanOutcome()` and 10.67% to `_securityBoardKey()`. Instrumented seed 1 made 498 uncached evaluations,
  1,017 plan outcomes, 1,112 matching-breaker and bypass-cost calls, and 8,866
  security-run-calculator constructions. `_securityIceAI()` still uses the
  plan-independent `max(AvailableCredits(corp), RezCost(iceCard))`; the other
  inputs named by the ticket are also stable within one uncached evaluation.
- **Baseline:** `node scripts/ai-game.js --seeds 1-20` produced a 42,188.0 ms
  mean. Per-seed `logHash`/ms values were: `1 7fd342dbe6a8 24857; 2
  56b2c48622d9 87627; 3 4f89d7cde989 4203; 4 fedafba0991e 26077; 5
  201cd37461e8 10503; 6 c504bed75b5f 257105; 7 24a3f956b0e5 56484; 8
  93cfa34e8aa7 3966; 9 af9195130924 22702; 10 7b6fa79b7ca5 26302; 11
  785e911f1037 36806; 12 784c33f9748c 4071; 13 8b31364b5385 191006; 14
  bccc45b25ca9 4859; 15 c91315de3ea6 1885; 16 8aaf3a151fec 11463; 17
  03ba60fc8fa1 8704; 18 16a6374c3a88 19398; 19 eb791a05260f 26240; 20
  588ff994e0d2 19502`. With the F3 cache disabled, seeds 1-3 retained hashes
  `7fd342dbe6a8`, `56b2c48622d9`, `4f89d7cde989` and took 35,118, 131,762 and
  4,684 ms (57,188.0 ms mean). A separately profiled seed 1 retained hash
  `7fd342dbe6a8` and took 17,090 ms. Contrasting seed-1 baselines are BTL vs
  Kit: `5f85d9269838`, 3,329 ms; and NEH vs Zahya: `03b8c00f468a`, 6,247 ms.
  The fixed comparison command is `node scripts/ai-game.js --seeds 1-20
  --jobs 8`. Decks are not changed to make the benchmark easier.
- **Approach:** Work in measured stages on this ticket and stop as soon as the
  fixed workload passes. First add an evaluation-local context built by
  `_evaluateServerSecurityUncached()`. It will hoist the outermost-bypass scan
  and lazily memoize each ICE's plan-independent pricing bundle (route index,
  matching breaker, full and mandatory break costs, targeted bypass cost and
  one-shot-bypass availability). Pass that context into `_icePlanOutcome()`
  and `_oneShotIceBypassTarget()` while preserving their existing behaviour
  for other callers. Keep plan membership, outermost-relevant selection, rez
  affordability and target-restricted hosted-credit allocation per plan. The
  memo remains local so hypotheticals and later evaluations cannot reuse it.
  Next reuse evaluation-local run-calculator, active-card, subtype, strength
  and card-property results where every input is proved stable. Re-run hashes,
  timing and a profile after each stage, then optimize only the next measured
  call tree while changes remain behaviour-identical and materially improve
  the fixed batch. Shared caches require explicit invalidation or an equivalent
  immutable snapshot. Do not prune/cap rez plans or change game/AI decisions. Preserve
  reason construction and ordering initially; defer identical materialization
  only if a later profile justifies it. Rejected alternatives: changing the
  benchmark decks would destroy comparability, and parallel tickets/branches
  would add integration and re-baselining overhead to cumulative changes.
- **Tests:** Keep the pending reproduction's choice, reason and expected count
  unchanged, then move it to `tests/` when it passes. Run the focused security
  suite, decision fixtures and snapshots; compare all 20 post-change hashes
  and per-seed timings against the baseline; compare cache-disabled seeds 1-3;
  re-run the two contrasting seed-1 deck pairs with identical hashes; and
  re-profile seed 1. Finally run `node tests/run-all-tests.js`.
- **Risk:** This changes a shared security evaluator used by protection,
  installation and economy decisions. The main risks are accidentally caching
  a plan-dependent value, changing one-shot/outermost bypass selection, or
  invoking card hooks in a different observable order. Lazy per-ICE entries
  avoid evaluating ICE no affordable plan considers; exact snapshots, hashes,
  logged reasons and focused bypass/hosted-credit tests guard the remaining
  surface. Later stages may touch shared engine scans with many callers, so
  they proceed only from the preceding profile and require the full suite
  after each material stage. No card-facing AI hook contract changes.
- **Docs:** Update the per-decision security section and helper reference in
  `documentation/corp-ai/architecture.md`, record full baseline/post-change
  measurements and the next hotspot in the Resolution, and leave
  `documentation/ai.md` unchanged because no card hook changes.

**Roadmap item:** F6 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** f2054ee (2026-10-01)
**Reproduction:** `tests/pending/f6-headless-ai-performance.test.js` — fails
at `f2054ee`, 2026-10-01: 9 pricing passes instead of 3, after the expected
choice and logged reason pass. Its assertions moved unchanged to
`tests/f6-headless-ai-performance.test.js`; the wrapper's path resolution was
adapted for its promoted location. It passes with
`node tests/f6-headless-ai-performance.test.js`.

## Goal
Minimize the fixed 20-seed, eight-job headless AI-vs-AI runtime without
changing any decision or log hash, so F4 gates are practical. Begin with the
repeated server-security work identified by the profile, then follow measured
hotspots until further changes stop producing safe, material batch gains.

## Current behaviour
Historical baseline measured at `cd95844` with `node scripts/ai-game.js` and
`node --cpu-prof`, after F3, on Duel PD vs Tao (re-profile before implementation):
- A game takes 27 s on average (20 seeds, 8 in parallel), down from 58 s
  before F3. A 2,400-game gate therefore takes about 2¼ hours.
- About 51% of the time is still spent in `_evaluateServerSecurityUncached()`.
  Nearly all of it is in `considerPlans`, which enumerates the affordable
  subsets of the server's unrezzed ICE as rez plans and prices each with
  `_icePlanOutcome()`.
- `_icePlanOutcome()` reprices every eligible ICE in every plan, through
  `_iceBypassCost()`, `_estimateBreakCost()`, `_matchingBreakerForIce()` and
  `_securityRunCalculator()`. So a piece of ICE on a server with n unrezzed
  ICE is priced up to 2^n times in one evaluation, though its break and bypass
  cost does not depend on which other ICE the plan rezzes. There can be up to
  2^n affordable plans.
- The three bypass helpers `_icePlanOutcome()` calls at the top of each plan
  (`_outermostIceBypassAvailable()`, `_outermostRelevantIce()`,
  `_oneShotIceBypassTarget()`) run once per plan too, so up to 2^n times per
  evaluation. `_outermostIceBypassAvailable(server)` takes no plan
  information at all, so its result cannot vary between plans, but it still
  rescans `ActiveCards(runner)` every call. `_oneShotIceBypassTarget()` is
  the most expensive of the three: a nested loop over every ICE times every
  active Runner card, and it calls `_matchingBreakerForIce()` /
  `_estimateBreakCost()` again internally for its own candidate search,
  separately from the main loop's identical work for the same card.
- The fresh `f2054ee` baseline is 42.188 seconds per game. Its seed-1 profile
  still puts 50.85% in `_evaluateServerSecurityUncached()`, but eliminating the
  whole security path would not by itself supply the required 76.3% reduction.
  Outside and beneath that path, the largest sampled self-time is in
  `ChoicesActiveTriggers()`, `InstalledCards()`, `CheckCallback()` and
  `AllCards()`. F6 therefore continues into those measured costs if the local
  security stages do not reach the target.

## Design
- This item builds on the F3 security cache, which is already implemented
  (`cd95844`). It does not depend on F3's remaining F4 collector and gate
  work, so F3 is no longer a roadmap dependency for F6.
- Within one `_evaluateServerSecurityUncached()` call, compute each ICE's
  plan-independent inputs once: required subroutines, matching breaker, break
  cost (full and mandatory-only), and bypass cost at its route index. Then
  let `considerPlans` combine them per plan.
- First confirm which inputs really are plan-independent.
  `_outermostIceBypassAvailable(server)` is one: its signature takes no plan
  information, so it can be computed once per
  `_evaluateServerSecurityUncached()` call (or once per cache miss) instead
  of once per plan. `_outermostRelevantIce()` and `_oneShotIceBypassTarget()`
  do read `eligibleIce` and so genuinely stay per plan — but
  `_oneShotIceBypassTarget()`'s own per-card check (which active Runner card,
  if any, can bypass this specific ICE) does not depend on the plan either,
  only on the card, and could be memoized the same way as the main per-ICE
  inputs. Whether the selected ICE can be funded together, including from
  target-restricted hosted credits, stays per plan regardless.
- Check every argument each memoized helper receives inside the plan loop
  before memoizing it. If an input varies per plan, key the memo on it or
  leave that input un-memoized; memoize only what is provably
  plan-independent. `RunCalculator.IceAI()` takes a `maxCorpCred` argument,
  but the current `_securityIceAI()` wrapper deliberately passes
  `max(AvailableCredits(corp), RezCost(iceCard))`, not a per-plan remaining
  credit figure. Confirm that this wrapper and its other inputs remain stable
  for the whole evaluation before memoizing its result.
- Do the lowest-risk changes first and re-run a few seeds after each:
  defer the `reasons` string building, hoist `_outermostIceBypassAvailable()`
  out of the plan loop, then add the per-ICE memo and the per-card bypass
  memo.
- Keep security memos local to the call. They must not outlive the evaluation
  or be shared with hypotheticals.
- After each stage, re-profile rather than assuming the old hotspot remains.
  Shared-helper work is allowed only when the profile justifies it, the fixed
  batch materially improves, and its cache lifetime/invalidation preserves
  exact behaviour.

## Safety and information boundary
Behaviour-identical. The same public inputs, no new information and no
randomness.

## Test scenarios
1. Every existing security regression case, corp decision fixture and
   decision snapshot is unchanged.
2. On a server with three unrezzed ICE, the new per-ICE pricing bundle is
   computed once per ICE per evaluation, not once per plan. Add a call counter
   at that boundary and assert the count; do not count the lower-level
   `_estimateBreakCost()` calls, because selecting the cheapest matching
   breaker legitimately invokes it for multiple candidates.
3. With the F3 cache off, `scripts/ai-game.js` gives an identical `logHash`
   before and after the change on the same seeds. A smaller seed set is
   enough for this check, because games are slower with the cache off.
4. BTL vs Kit and NEH vs Zahya retain their recorded seed-1 hashes, showing
   the improvement is not tailored to the acceptance deck pair.

## Acceptance gate
N/A — deterministic fix (principle 4): identical decision snapshots and seeded
`logHash` values are the behaviour oracle; helper call counts and elapsed time
are the performance oracle. This ships without an option.
- Before changing any code, record a baseline on a clean commit:
  `node scripts/ai-game.js --seeds 1-20` (`logHash` and time per seed) and a
  `node --cpu-prof` profile of seed 1. Record both in the Resolution. The
  checks below compare against this baseline.
- Decision snapshots are identical to the recorded baseline, with no deltas.
- `node scripts/ai-game.js --seeds 1-20 --jobs 8` gives identical `logHash`
  for every seed before and after. Report the actual mean and batch wall time,
  and retain only measured improvements.
- Identical `logHash` also holds with the F3 cache off, on the smaller seed
  set from scenario 3.

## Things to consider
- Profile again before designing. The next hot spot after the per-plan
  repricing may be the run calculator itself (`_securityRunCalculator()`).
  In the profile, compare self time and call counts for `IceAI`,
  `Directions`, `ActiveCards`, `Strength` and
  `AIIceEncounterSaveState`/`AIIceEncounterRestoreState`. `IceAI` rebuilds
  `ActiveCards(runner)` and saves, modifies and restores encounter state on
  every call, so if it dominates, per-ICE memoization should pay off. If
  `Directions` dominates, the lever is calling the calculator fewer times
  (fewer plans), which is out of scope here.
- Never prune or cap rez-plan enumeration. `_securityBoardKey()`, the run
  calculator and shared engine scans may change only if a fresh profile shows
  they are the next blocker and the design preserves identical results.
- F4 gate runtime is the reason for this item; F4 now depends on F6.
- `_securityBoardKey()` builds a string from every card on the board (HQ,
  R&D, Archives, every remote server) on every call to
  `_evaluateServerSecurity()`, including cache hits — the cache has to
  compute the key before it can check for one. F3 measured about 1,700 of
  2,200 calls in one seed as hits; each of those still pays this cost, and it
  isn't counted inside `_evaluateServerSecurityUncached()` in this ticket's
  profile. Worth including in the next profile before assuming all the
  non-`considerPlans` time is elsewhere. A cheaper version (a board-version
  counter bumped at each mutation site instead of rebuilding the string)
  would be O(1), but trades away a property the current approach gets for
  free only for mutations represented in `_securityBoardKey()`: those change
  the rebuilt string, but an unrepresented mutation can still serve a stale
  hit. A forgotten counter bump has the same risk. `_securityCacheVerify` and
  the depth guard are safeguards against that failure, not complete coverage.
  Treat as a real option, not a free one.
- `_icePlanOutcome()`'s `.reasons.push(GetTitle(iceCard) + ...)` builds
  strings unconditionally on every ICE, every plan — including the majority
  of plans `_icePlanIsBetter()` immediately discards. Cheap to defer until a
  plan is actually kept, or skip entirely when nothing downstream reads
  `reasons` for that call, matching the existing pattern of gating
  `debugSecurityLog`'s call in `Phase_Main`.
- Two test files (`flipped-identity.test.js`,
  `vantagepoint-integration.test.js`) fail on a missing local card-art image
  asset. This is pre-existing (see the F3 code review) and unrelated to this
  item, so do not try to fix it here.

## Acceptance criteria
- [x] Every behavioural scenario above is covered by a deterministic test that asserts the logged reason as well as the choice; the performance scenario asserts the per-ICE pricing call count.
- [x] Decision snapshots are identical to the recorded baseline except for listed, justified deltas (none expected).
- [x] The Resolution records the pre-change baseline (`logHash` and time per seed, plus the seed 1 profile), the post-change figures, and the re-profile result showing what dominates next.
- [x] The fixed 20-seed, eight-job batch is materially faster with all hashes unchanged; contrasting deck-pair hashes are also unchanged.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.
