# L6.1 Payment-constraint allocation

**Roadmap item:** L6.1 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Replace the scalar Runner credit ceiling with a payment allocator when a route combines restrictions such as stealth requirements, breaker-specific recurring credits and paid bypass abilities, so the Corp stops counting restricted credits as if they could pay for anything.

## Current behaviour
`_effectiveRunnerCreditPool(server)` returns a public-information breakdown (base pool, temporary run credits, eligible hosted/recurring credits, Bad Publicity credits, click-to-credit potential) that `_evaluateServerSecurity()` sums into one number for affordability lockouts. Hosted credits are included when `canUseCredits("using", card)` permits a public installed breaker or bypass tool, but they are not allocated against individual per-ICE payments. See [architecture: Runner effective credit ceiling](../corp-ai/architecture.md#runner-effective-credit-ceiling).

## Design
- Return credit-source objects with an amount and an eligibility predicate.
- Allocate each source against the actual per-ICE payments: spend the most restricted sources first (for example stealth or breaker-only) and preserve unrestricted pool credits for later encounters.
- Keep the credit-source predicates declarative and the allocation greedy (most restrictive first) to avoid performance hits during multi-ICE route evaluation.
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

## Acceptance gate
Adopt when constrained allocation never reports a cheaper route than the legal payment engine and existing Layer 6 ceiling cases remain stable.

## Things to consider
- Combining stealth credits, central-only recurring credits, breaker-specific credits and paid bypasses in one route optimization can become a miniature knapsack/matching problem. The greedy, declarative approach above is the mitigation; check it against the legal payment engine rather than assuming it is optimal.
- Related open bug: [`documentation/bugs/corsair-stealth-offset-suppressed-by-lampades.md`](../bugs/corsair-stealth-offset-suppressed-by-lampades.md) (Corsair's stealth-credit offset is hidden from credit planning). Stealth credit composition is one of this item's scenarios, so resolve or account for that bug before relying on stealth sources here.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
