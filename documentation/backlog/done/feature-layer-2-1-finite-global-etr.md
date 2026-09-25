# Backlog Ticket: Layer 2.1 — Finite Global ETR Capacity

> **Closed as delivered (2026-09-25).** Layer 2.1 was implemented and reviewed
> under [finding 01](corp_ai_finding_01_global_etr_lockout.md) (commit `c143116`).
> Every acceptance criterion below is covered by tests in
> `tests/corp-server-security.test.js`: "one Nisei counter adds one repeated
> route cost without a global lockout", "global ETR capacity covering every
> projected run is a hard lockout", "Nisei policy gives no credit where a breach
> cannot win and ignores hidden Grip" and "Nisei activation and security
> evaluation share the global ETR policy hook". Roadmap item: L2.1 (done).

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Model global end-the-run counters (e.g., _Nisei MK II_) as finite run taxes rather than permanent server lockouts in `ai_corp.js`.

## Requirements

1. **Engine Hook**: Cards must expose `AIGlobalETRUses(server)`, which is shared by their live `Enumerate` policy and `_globalETRUses(server)`.
2. **Security Evaluator Logic**:
   - Capacity at least equal to the Runner's projected run attempts must act as a hard lockout.
   - Capacity smaller than projected attempts adds one repeated mandatory route cost per use.
3. **Safety & Imperfect Information**:
   - Logic must be deterministic from public state and safe outside an active run.
   - Do NOT inspect hidden Runner card identities.
   - Conditional cards must return `0` on servers where their live policy would preserve the counter.

## Required Card & Documentation Updates

- Check and update relevant cards in `/sets/systemgateway.js`, `/sets/systemupdate2021.js`, and `/sets/elevation.js`.
- Update `documentation/ai.md` with the new `AIGlobalETRUses` hook schema, signatures, and out-of-run constraints.
- Update the status of Layer 2.1 in the main Corp AI roadmap doc.

## Acceptance Criteria

- [x] 1 counter against 4 clicks adds 1 route cost without locking the server.
- [x] Capacity covering every projected run acts as a hard lockout.
- [x] _Nisei MK II_ gives no security credit when a breach cannot win.
- [x] Evaluator and card activation decisions consume the exact same hook.
