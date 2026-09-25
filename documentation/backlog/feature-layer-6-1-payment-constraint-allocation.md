# L6.1 Payment-constraint allocation

**Roadmap item:** L6.1 · **Depends on:** L4.1 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Replace the scalar Runner credit ceiling with a payment allocator when a route combines restrictions such as stealth requirements, breaker-specific recurring credits and paid bypass abilities, so the Corp stops counting restricted credits as if they could pay for anything.

## Current behaviour
See [architecture: Runner effective credit ceiling](../corp-ai/architecture.md#runner-effective-credit-ceiling). Verified details:

- `_effectiveRunnerCreditPool(server)` returns `{baseCredits, temporaryCredits, recurringCredits, badPublicityCredits, clickCredits, total}`. A hosted source counts in full when its `canUseCredits("using", target)` permits *any one* public installed breaker or bypass tool (the check stops at the first match), and `AIRunPoolCreditOffset(server, null)` adds public server-specific credits, taking the larger value when a source exposes both.
- `_evaluateServerSecurity()` compares mandatory route cost with `total`, and `_iceIsBypassed()` compares a bypass cost with `total`. No source is allocated against an individual payment, so one breaker-only credit can appear to pay a bypass and one recurring credit can appear to pay two encounters.
- The Corp side already solves the same problem for rez costs: `_canFundRezPlan()` runs a small max-flow so a restricted source funds only eligible ICE and is never counted twice.
- Stealth credits reach planning only through Corsair's `AIRunPoolCreditOffset`, which the open bug below currently suppresses when Lampades was installed first.

## Design
- Return credit-source objects with an amount and an eligibility predicate (from `canUseCredits` and declared hooks).
- Build payment demands per route: breaker costs from the security evaluator and bypass costs from L4.1's allocator, each tagged with the card that pays it.
- **Bypass payment is owned here.** L4.1 decides which bypass is used where and emits its cost as a demand; this item decides which sources may pay it. That is why this item depends on L4.1.
- Allocate sources to demands with the same bipartite max-flow approach as `_canFundRezPlan()` (generalise it into one shared helper rather than writing a second allocator). The previous proposal, a greedy "most restricted source first", can fail when two restricted sources overlap; the max-flow is exact for this shape and is already fast enough for multi-ICE routes.
- Document any schema changes for credit-eligibility predicates in `documentation/ai.md`.

## Safety and information boundary
- Use only active public cards and declared hooks; never infer economy events from Grip contents.
- Do not mutate counters or run state while planning.
- Never allocate one hosted credit twice.

## Test scenarios
1. A breaker-only credit cannot pay a bypass.
2. A stealth breaker receives its required stealth credit composition.
3. One recurring credit cannot cover two encounters.
4. Central-only credits apply only to centrals.
5. Unrestricted credits fill any remaining payment.
6. Two restricted sources with overlapping eligibility fund two demands that a most-restricted-first greedy order would fail to fund.
7. For every scenario above, the allocator reports a route payable exactly when an exhaustive legal assignment (each source's `canUseCredits` checked against each demand) can pay it.

## Acceptance gate
Not F4-gated: correctness has a deterministic oracle (scenario 7). Adopt when:

- the allocator never reports a route cheaper, or payable when it is not, compared with the exhaustive legal assignment;
- existing Layer 6 ceiling cases in `tests/corp-server-security.test.js` pass unchanged;
- decision snapshots (`tests/decision-snapshots.test.js`, `tests/corp-decision-fixtures.test.js`) are identical to the recorded baseline except for listed deltas, each justified by a restricted-credit difference.

## Things to consider
- Combining stealth credits, central-only recurring credits, breaker-specific credits and paid bypasses in one route still requires choosing the route (which breaker, which bypass) before allocating payment; route choice stays with the evaluator and L4.1.
- **Blocking bug:** [`documentation/bugs/corsair-stealth-offset-suppressed-by-lampades.md`](../bugs/corsair-stealth-offset-suppressed-by-lampades.md). Scenario 2 depends on stealth credits reaching planning, which that bug breaks. Do not start this ticket until the bug is fixed (see the criteria).

## Acceptance criteria
- [ ] Before work starts, `documentation/bugs/corsair-stealth-offset-suppressed-by-lampades.md` is fixed and its reproduction has moved into the green suite. If it is not, stop and report rather than working around it.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for deltas listed and justified in the Resolution.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
