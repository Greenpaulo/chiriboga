# Backlog Ticket: Layer 8.2 — Refine Remote Deception Profiles & Legibility Signals

## Scope

Refine and expand `_remoteDeceptionProfile(card)` in `ai_corp.js` to ensure agenda bluffs reliably mimic trap behaviors across server card count, central vs. remote framing, and advancement sequencing without creating suicide agenda installs.

## Requirements

1. **Deception Profile Matrix**:
   - Ensure eligible hidden agendas and traps independently select target ICE depth (1, 2, or 3), opening advancement targets (1 or 2 counters), and delayed advancement (0 or 1 turn).
   - Ensure tactical scoring-window value remains the primary signal—deception profiles MUST NOT create naked agenda servers or attempt bluffs when a breach gives the Runner match point.
2. **Generic Legibility Signals**:
   - Base bluff legibility on public signals a human reads (installed server card counts, recent protection posture) rather than card-specific title checks.

## Things to consider:

Layer 3.5.1 vs. Layer 8.2 (Bluffing vs. Protection Debt):

The Tension: Layer 3.5.1 increases protection debt on high-value, insecure servers (like an advanced remote or HQ agenda flood). However, Layer 8.2 (Bluffing) deliberately leaves an agenda under-protected or delayed to simulate a trap.

Mitigation: Ensure Layer 8's deception profiles explicitly register an exemption or suppression flag against Layer 3.5.1's debt increment so the Corp doesn't immediately panic-protect a server it intentionally set up as a bluff.

## Required Card & Documentation Updates

- Document `_remoteDeceptionProfile` parameters and safety overrides in `documentation/ai.md`.
- Update Layer 8.2 status in the Corp AI roadmap.

## Acceptance Criteria

- [ ] Agenda bluffs vary across 1, 2, and 3-ICE server depths rather than stopping deterministically at 1 ICE.
- [ ] Agenda deception is immediately suppressed when a central or remote breach could win the game for the Runner.
- [ ] Traps and agendas draw from identical, overlapping profile distributions.
- [ ] Active deception profiles on an under-protected remote correctly suppress or exempt Layer 3.5.1 protection debt increments while the bluff is active.
