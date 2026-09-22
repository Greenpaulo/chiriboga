# Backlog Ticket: Layer 8.5 — Match-Local Public Outcome Feedback

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Implement match-local adaptation in `ai_corp.js` so the Corp AI dynamically adjusts its mixed bluff/bait strategies when a human opponent repeatedly challenges or ignores specific remote server postures in the current match.

## Requirements

1. **Public Outcome Tracking**:
   - Track public outcomes per posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen/scored.
   - Maintain bounded match-local weights (e.g., Beta-distribution priors) for shared scripts.
2. **Game-Local Lifecycle**:
   - Reset ALL opponent-response memory completely when a new game begins. Never persist player fingerprints across sessions.
3. **Safety & Bounds**:
   - Learn ONLY from public actions and Corp-known outcomes.
   - Every script must maintain a non-zero exploration floor (no single script weight can drop to 0%).
   - Never inspect hidden Runner cards.

## Things to consider:

Layer 8.5 Sample Size Drift in Match-Local Feedback:

In a typical Netrunner match, the Runner might only run a remote 3 to 6 times total. Beta-distribution priors can swing wildly on tiny sample sizes (e.g., guessing wrong twice in a row).

Mitigation: Ensure the adaptation weighting uses strong, conservative prior weights so that 1 or 2 runs modestly adjust probabilities rather than completely swinging the AI's posture selection.

## Required Card & Documentation Updates

- Document match-local feedback weight structures and public signals in `documentation/ai.md`.
- Update Layer 8.5 status in the main Corp AI roadmap.

## Acceptance Criteria

- [ ] Ignored light postures modestly increase their future selection frequency during the current match.
- [ ] Starting a new game completely resets all outcome memory to baseline priors.
- [ ] Changing hidden Runner cards produces 0 change in feedback weights.
- [ ] Agenda and trap profile distributions retain overlapping distributions.
