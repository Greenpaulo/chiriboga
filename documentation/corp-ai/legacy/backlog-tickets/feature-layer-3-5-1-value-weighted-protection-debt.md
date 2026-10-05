# Backlog Ticket: Layer 3.5.1 — Value-Weighted Protection Debt

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Implement `_protectionDebtIncrement(entry)` in `ai_corp.js` so that repeatedly skipped high-consequence servers gain protection urgency faster than ordinary empty servers without causing starvation.

## Requirements

1. **Dynamic Increment Calculation**:
   - Compute base increment + bounded public-information consequence bonus.
   - Signals to evaluate: agenda points exposed by a breach, advanced agendas in remotes, game-winning breach threats, and active Archives backdoors.
2. **Constraints**:
   - Same-turn protection rotation remains authoritative; weighting affects ONLY cross-turn debt.
   - Both per-turn increment and total accumulated debt must be capped.
   - Every continuously insecure server must have a maximum waiting time.
   - Secure, protected, removed, or repurposed servers must clear or decay debt immediately.
   - Do NOT inspect hidden Runner cards.

## Telemetry & Logging

- Add opt-in logging for protection decisions recording: raw score, security result, current debt, debt increment, adjusted score, chosen server, and available ICE.

## Required Card & Documentation Updates

- Update `documentation/ai.md` if any new public state estimators are exposed.
- Update the status of Layer 3.5.1 in the main Corp AI roadmap doc once verified.

## Acceptance Criteria

- [ ] Equal-risk insecure servers still rotate within the same turn.
- [ ] An agenda-rich HQ or game-winning remote accumulates debt faster than an empty remote.
- [ ] Low-value insecure servers are still selected within the maximum wait cap.
- [ ] Installing protection or becoming secure resets debt; destroying a remote clears stale debt.
