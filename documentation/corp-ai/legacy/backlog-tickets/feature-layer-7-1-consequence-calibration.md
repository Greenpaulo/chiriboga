# Backlog Ticket: Layer 7.1 — Consequence-Calibrated Central Pressure (Phase 2)

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Complete the remaining non-tactical consequence weighting for central server pressure in `ai_corp.js` (building on top of the already implemented tactical loss interrupt).

## Requirements

1. **Consequence Weighting Engine**:
   - Scale `AICentralPressure` by actual breach consequence: agenda points needed to win, HQ agenda density, R&D size, and known top-cards.
   - Zero-counter scaling cards (e.g., _Conduit_) provide bounded growth pressure without claiming current multi-access.
2. **Safety & Information Boundary**:
   - Corp may use its own HQ/R&D knowledge, but must NEVER inspect hidden Runner cards in Grip or Stack.
   - Do not double-count existing HQ agenda-flood adjustments or Layer 3.5 protection debt.

## Required Card & Documentation Updates

- Update `documentation/ai.md` with post-purge and scaling hook behavior (`AICentralPressureAfterPurge`).
- Mark Layer 7.1 as fully completed in the main Corp AI roadmap doc.

## Acceptance Criteria

- [ ] One extra HQ access carries higher protection weight when HQ is agenda-dense.
- [ ] R&D multi-access becomes critical when a breach could win the game.
- [ ] Exhausted, limited-use hardware contributes 0 current access pressure.
- [ ] Changing hidden Runner Grip/Stack identities produces 0 change in central threat calculations.
