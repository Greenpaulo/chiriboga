# Backlog Ticket: Layer 5.1 — Observed-Deck Bayesian Priors

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Replace fixed faction/import risk weights in `_estimateRunnerBypassRisk()` with posterior probabilities learned from public deck evidence (revealed Heap cards, installed cards, spent influence, deck size).

## Requirements

1. **Bayesian Logic**:
   - Update threat expectations based on revealed public evidence.
   - Retain `AIHiddenThreat` as the core card-level contract.
   - Fall back to fixed priors when evidence is sparse or no archetype table exists.
2. **Strict Imperfect Information**:
   - Never inspect Grip or Stack card identities, saved decklists, or Runner-AI private caches.
   - Only count public pile sizes and face-up cards.

## Required Card & Documentation Updates

- Document posterior calculation rules and valid public sources in `documentation/ai.md`.
- Update status in the main Corp AI roadmap doc.

## Acceptance Criteria

- [ ] Hidden Grip/Stack substitutions produce zero change in calculated risk.
- [ ] Revealing an in-faction threat increases posterior risk before the copy enters the Heap.
- [ ] Reaching maximum expected copies in the Heap drops threat probability to 0.
