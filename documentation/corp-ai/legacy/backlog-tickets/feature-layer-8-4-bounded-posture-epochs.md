# Backlog Ticket: Layer 8.4 — Bounded Posture Epochs

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Replace lifetime posture booleans with epoch-bounded posture records in `ai_corp.js` so that installed trap/agenda cards are not permanently locked to a stale bait or bluff decision across the game.

## Requirements

1. **Posture Record Architecture**:
   - Maintain a posture record containing `epochId`, `selectedScript`, `commitmentHorizon`, and `reevaluationReasons`.
   - Roll posture once on install or at the start of a Corp planning epoch.
2. **Reevaluation Triggers**:
   - Reevaluate posture ONLY after meaningful boundaries: Runner turn ends, server is challenged, credits/Runner pressure materially shift, advancement changes stakes, or either player reaches match point.
   - Repeated evaluator calls inside the same epoch MUST reuse the cached result without consuming extra randomness.
3. **Safety & Match Guards**:
   - Keep `_random` injectable.
   - Match-winning safety overrides remain authoritative (never bait/bluff if breach wins game).
   - Do NOT inspect hidden Runner card identities.

## Required Card & Documentation Updates

- Update `documentation/ai.md` with posture epoch signatures and reevaluation boundaries.
- Update Layer 8.4 status in the main Corp AI roadmap.

## Acceptance Criteria

- [ ] Repeated calls in a single epoch consume 0 additional randomness.
- [ ] A new Corp turn permits at most 1 posture reevaluation.
- [ ] Reaching match point immediately disables unsafe agenda/trap postures.
- [ ] Installed cards do not remain locked to a posture after their commitment horizon expires.
