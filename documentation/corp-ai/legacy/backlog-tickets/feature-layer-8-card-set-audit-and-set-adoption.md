# Backlog Ticket: Layer 8 — Card Hook Audit & Set Adoption

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Audit cards in `/sets/systemgateway.js`, `/sets/systemupdate2021.js`, and `/sets/elevation.js` to ensure all relevant access-punishment traps and tag-punishment operations declare the Layer 8 AI hooks.

## Requirements

1. **Access Punishment (`AIPunishesAccess`)**: Verify facedown ambush cards (e.g., _Urtica Cipher_, _Snare!_, _Project Junebug_) declare `AIPunishesAccess(server)` with accurate severity values.
2. **Tag Punishment (`AITagPunishment`)**: Verify operations/assets that punish tags declare `AITagPunishment`.
3. **Documentation**: Ensure signatures and return semantics for `AIPunishesAccess` and `AITagPunishment` are fully documented in `documentation/ai.md`.

## Acceptance Criteria

- [ ] All set cards with access-punishment or tag-punishment mechanics expose their respective AI hooks.
- [ ] No card titles are hardcoded in `ai_corp.js` for baiting or tag deterrence.
- [ ] `documentation/ai.md` reflects current hook schemas.
