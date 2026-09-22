# Backlog Ticket: Layer 8.6 — Outcome-Calibrated Bluff Telemetry

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Add an opt-in, anonymous local telemetry system in `ai_corp.js` to collect long-run bluff and bait performance data against human players for off-line calibration.

## Requirements

1. **Telemetry Logging**:
   - Capture posture probability, roll bucket, visible server shape, match-local feedback weights, whether run was initiated, and access outcomes.
2. **Strict Privacy & Safety Constraints**:
   - Disabled by default (opt-in only).
   - NEVER record hidden Runner card identities, player IDs, or free-text inputs.
   - Telemetry must be strictly passive: it MUST NOT alter in-game AI decisions or game state.

## Required Card & Documentation Updates

- Document telemetry logging flags and schema in `documentation/ai.md`.
- Update Layer 8.6 status in the main Corp AI roadmap.

## Acceptance Criteria

- [ ] Telemetry logging produces 0 side effects on AI decision-making.
- [ ] No hidden Runner zone information is captured in logs.
- [ ] Injectable randomness produces identical deterministic outputs regardless of whether telemetry is enabled or disabled.
