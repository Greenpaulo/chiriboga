# F6 Cheaper security evaluation

**Roadmap item:** F6 · **Depends on:** F3 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 58f3a4d (2026-09-25)

## Goal
Make each server-security evaluation cheaper without changing any decision,
so that seeded games, and therefore every F4 gate, run faster. F3 removed the
repeated evaluations. What remains is the evaluations that must be computed
(first-time, hypothetical and changed-board), and each one is expensive.

## Current behaviour
Measured with `node scripts/ai-game.js` and `node --cpu-prof`, after F3, on
Duel PD vs Tao:
- A game takes 27 s on average (20 seeds, 8 in parallel), down from 58 s
  before F3. A 2,400-game gate therefore takes about 2¼ hours.
- About 51% of the time is still spent in `_evaluateServerSecurityUncached()`.
  Nearly all of it is in `considerPlans`, which enumerates every subset of the
  server's unrezzed ICE as a rez plan and prices each with
  `_icePlanOutcome()`.
- `_icePlanOutcome()` reprices every eligible ICE in every plan, through
  `_iceBypassCost()`, `_estimateBreakCost()`, `_matchingBreakerForIce()` and
  `_securityRunCalculator()`. So a piece of ICE on a server with n unrezzed
  ICE is priced up to 2^n times in one evaluation, though its break and bypass
  cost does not depend on which other ICE the plan rezzes.
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

## Design
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
  inputs. Shared rez budget and credits spent earlier on the route stay per
  plan regardless.
- Keep the memo local to the call. It must not outlive the evaluation or be
  shared with hypotheticals.

## Safety and information boundary
Behaviour-identical. The same public inputs, no new information and no
randomness.

## Test scenarios
1. Every existing security regression case, corp decision fixture and
   decision snapshot is unchanged.
2. On a server with three unrezzed ICE, the break-cost helper runs once per
   ICE per evaluation, not once per plan.
3. With the F3 cache off, `scripts/ai-game.js` gives an identical `logHash`
   before and after the change on the same seeds.

## Acceptance gate
Behaviour-identical performance change, so it ships without an option.
- Decision snapshots are identical to the recorded baseline, with no deltas.
- `node scripts/ai-game.js --seeds 1-20` gives identical `logHash` for every
  seed before and after, and the mean game time falls by at least 30%.

## Things to consider
- Profile again before designing. The next hot spot after the per-plan
  repricing may be the run calculator itself (`_securityRunCalculator()`).
- F4 gate runtime is the reason for this item. If gates run fast enough
  without it, it can wait.
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
  free: a missed mutation site just changes the rebuilt string anyway, where
  a forgotten counter bump would silently serve a stale hit — exactly the
  failure `_securityCacheVerify` and the depth guard already exist to catch.
  Treat as a real option, not a free one.
- `_icePlanOutcome()`'s `.reasons.push(GetTitle(iceCard) + ...)` builds
  strings unconditionally on every ICE, every plan — including the majority
  of plans `_icePlanIsBetter()` immediately discards. Cheap to defer until a
  plan is actually kept, or skip entirely when nothing downstream reads
  `reasons` for that call, matching the existing pattern of gating
  `debugSecurityLog`'s call in `Phase_Main`.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for listed, justified deltas (none expected).
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
