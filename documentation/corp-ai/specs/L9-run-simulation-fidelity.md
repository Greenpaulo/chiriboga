# L9 Run-simulation fidelity

**Roadmap item:** L9 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Close the known gaps between the per-ICE security heuristic and a real run, starting with the one that makes the Corp over-confident. A matching breaker whose price the evaluator cannot read is treated as unable to break, so the server is reported secure when the Runner can get in. The other gaps (cumulative damage, optional effects that remove later breakers, shared strength-reducer counters) all err the other way, making the Corp under-confident. Restricted credit allocation is owned by L6.1, not here.

## Current behaviour
See [architecture: known limits](../architecture.md#known-limits) and [server security evaluation](../architecture.md#server-security-evaluation). Each limit, verified in the code:

1. **Unpriceable breakers (over-confident).** `_breakerActivationCost()` prices a breaker by replacing `rc.ImplementIcebreaker` on a Corp-owned calculator and calling the breaker's `AIImplementBreaker`. If the breaker has no `AIImplementBreaker`, it falls back to `cardText` patterns, and without a pump pattern an ICE stronger than the breaker costs `Infinity`. An `AIImplementBreaker` that never calls `rc.ImplementIcebreaker` also leaves the cost at `Infinity`. `_estimateBreakCost()` then reports an unbreakable ICE and `_evaluateServerSecurity()` a hard lockout. Checked with the security-test harness: a Runner with 30 credits and Sang Kancil or Principia (`elevation.js`; neither has `AIImplementBreaker` or `cardText`) against a matching strength-4 ETR ICE gets `isSecure: true` with an `Infinity` mandatory cost. The two cards are tracked as a bug (below); the general gap is this item's.
2. **Cumulative damage (under-confident).** `_requiredSubroutineIndices()` (mandatory mode) and `_iceIsLethal()` compare each ICE's damage with the full `runner.grip.length`. Two ICE that each deal 3 net damage to a 5-card Grip are each non-lethal, so no damage break is required, although the route as a whole is lethal.
3. **Optional effects that disable later breakers (under-confident).** Optional program-trash subroutines never count as mandatory, and the inner ICE are priced with the full rig. A route where letting an outer "trash a program" subroutine fire removes the only breaker for an inner ETR ICE is priced as if the breaker survives, without the cost of protecting it.
4. **Shared strength-reducer counters (under-confident).** `_effectiveIceStrength()` adds every reducer's full `AIReducesIceStrength(iceCard)` value, or all of a virus card's counters, to *each* ICE independently, so two virus counters lower two ICE by 2 each.
5. **Restricted credits.** Owned by L6.1 (payment-constraint allocation); listed here only so the limits section has one owner per row.

## Design
- **Priority: unpriceable breakers.** Separate "no matching breaker" from "matching breaker, price unknown". `_breakerActivationCost()` reports whether it priced the breaker. An unpriced matching breaker never produces a hard lockout: it is priced by a deliberately optimistic fallback (one credit per subroutine plus one credit per strength point of gap), and `reasons` records "unpriced breaker <title>" so the gap is visible in logs. Add a declarative hook, `AIBreakCost(iceCard, subroutineCount, server)`, returning `{credits, clicks, counters}`, for breakers whose mechanism does not go through `ImplementIcebreaker` (click-to-break, counter-spending, conditional costs), consulted before the probe. This slice can be raised on its own (as L9.1) ahead of the rest.
- **Route state.** Carry a small route state through `_evaluateServerSecurity()`'s per-ICE loop: Grip size after damage taken so far (limit 2), breakers still installed (limit 3), and reducer counters still unspent (limit 4). For limits 3 and 4 the Runner chooses the cheaper option (pay to break the trash subroutine, or run the inner ICE without that breaker; spend counters where they save most), using the same finite-use allocation idea as L4.1.
- Keep the evaluation read-only (no counters, credits or run state changed) and inside the existing hypothetical guards.
- Document `AIBreakCost` in `documentation/ai.md`.

## Safety and information boundary
- Only public, installed Runner cards and public pile sizes; never Grip identities.
- The optimistic fallback in limit 1 must never make a server look *more* secure than today.
- Limits 2–4 make the Corp more confident, so each must be proved against an oracle before it is adopted.

## Test scenarios
1. (Priority) A Runner with enough credits and a matching breaker that has no readable price does not make the server secure; the reason names the breaker. The same holds for a breaker whose `AIImplementBreaker` never calls `rc.ImplementIcebreaker`.
2. A breaker declaring `AIBreakCost` is priced from the hook, and a server it can afford is not secure.
3. Two ICE each dealing 3 net damage to a 5-card Grip require at least one damage break in the mandatory route; one such ICE alone requires none.
4. An outer optional "trash a program" subroutine in front of an inner ETR ICE: the mandatory route cost is the cheaper of breaking the trash subroutine or running the inner ICE without the trashed breaker, and never less than today's estimate when the breaker is not at risk.
5. A reducer with 2 virus counters and two ICE: the total strength reduction across the route is at most 2, spent where it lowers the route cost most.
6. Changing hidden Runner Grip cards changes nothing.
7. Evaluation leaves all counters, credits and run state unchanged, including when a hook throws.
8. For scenarios 3–5, the reported mandatory cost equals the cheapest cost found by exhaustive enumeration of the Runner's choices in the test.

## Acceptance gate
Not F4-gated: each limit has a deterministic oracle (scenario 8, and scenario 1's no-lockout rule). Adopt each slice when:

- its scenarios pass, and every existing test in `tests/corp-server-security.test.js` passes unchanged;
- decision snapshots (`tests/decision-snapshots.test.js`, `tests/corp-decision-fixtures.test.js`) are identical to the recorded baseline except for listed deltas, each justified by one of the limits above.

## Things to consider
- Limit 1 is live in the playable sets today; limits 2–4 only make the Corp spend more on protection than it needs to. Implement limit 1 first even if the rest waits.
- Route state (limits 2–4) turns a per-ICE sum into a small search. Keep it bounded (it can reuse the rez-plan subset loop's structure) and watch `decisionLatencyMs` once F4 exists.
- The Runner AI's `RunCalculator` has the same dependency on `AIImplementBreaker`; the card fixes belong in the bug ticket, not here.
- Related bug: [`documentation/bugs/sang-kancil-and-principia-priced-as-unbreakable.md`](../../bugs/sang-kancil-and-principia-priced-as-unbreakable.md).

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for deltas listed and justified in the Resolution.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour, and its known-limits section names the item that closed each limit.
- [ ] `node tests/run-all-tests.js` passes.
