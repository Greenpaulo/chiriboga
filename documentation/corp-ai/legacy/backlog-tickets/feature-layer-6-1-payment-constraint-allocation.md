# Backlog Ticket: Layer 6.1 — Payment-Constraint Allocation

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Replace the scalar credit ceiling in `_effectiveRunnerCreditPool()` with a credit-source payment allocator in `ai_corp.js` when routes combine stealth requirements, breaker-specific recurring credits, and paid bypasses.

## Requirements

1. **Credit Source Allocation**:
   - Return credit-source objects with an amount and an eligibility predicate.
   - Allocate sources against actual per-ICE payments: spend restricted sources first (e.g., stealth, breaker-only) and preserve unrestricted pool credits for later encounters.
2. **Safety & Information Constraints**:
   - Use only active public cards and declared hooks; never infer economy events from Grip contents.
   - Do NOT mutate counters or run state while planning.
   - Never allocate one hosted credit twice.

## Things to consider:

Layer 6.1 (Payment-Constraint Allocation Complexity):

Combining stealth credits, central-only recurring credits, breaker-specific credits, and paid bypasses in a single route optimization can quickly become a miniature knapsack/matching problem.

Mitigation: Keep the credit-source predicates declarative and greedy (spending the most restrictive credits first) to avoid performance hits during multi-ICE route evaluations.

## Required Card & Documentation Updates

- Update `documentation/ai.md` with any schema changes for credit-eligibility predicates.
- Update the status of Layer 6.1 in the main Corp AI roadmap doc.

## Acceptance Criteria

- [ ] Breaker-only credits cannot pay for bypass abilities.
- [ ] Stealth breakers receive their required stealth credit composition.
- [ ] Central-only credits apply strictly to central server encounters.
- [ ] Single recurring credits cannot be double-counted across two separate encounters.
