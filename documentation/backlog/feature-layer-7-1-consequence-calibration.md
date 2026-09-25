# L7.1 Consequence-calibrated central pressure

**Roadmap item:** L7.1 · **Depends on:** F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Scale the mechanic-level central-pressure penalty by the actual consequence of the next central breach, rather than treating every extra access as equally dangerous. This completes the non-lethal consequence weighting that remains after the tactical loss interrupt.

## Current behaviour
Public Runner cards expose `AICentralPressure(server)` (and `AICentralPressureAfterPurge(server)` for purge-dependent cards); `_centralServerThreat()` turns this into a bounded, eight-point maximum per-server penalty that does not weight by consequence. The tactical part is implemented: `_centralBreachLossRisk()` computes the order-agnostic probability that the next breach wins the game, and at 35% or more `_criticalBreachDefenseAction()` may interrupt non-winning advancement. See [architecture: central pressure and breach-loss risk](../corp-ai/architecture.md#central-pressure-and-breach-loss-risk).

## Design
- Combine `AICentralPressure` with public state: agenda points needed to win, HQ size and Corp-known agenda density, R&D size, already-seen top cards, and remaining uses/counters.
- Keep the hook mechanical; consequence weighting belongs in the evaluator.
- A zero-counter scaling engine (for example Conduit) may contribute bounded growth pressure but must not claim current multi-access.
- Cover the remaining calibration: non-lethal central pressure, known-top-card information, exhausted limited-use hardware, and seeded-game tuning of the tactical thresholds.
- Keep `documentation/ai.md` accurate for `AICentralPressure` and `AICentralPressureAfterPurge` scaling behaviour if their semantics change.

## Safety and information boundary
- The Corp may use its own HQ and R&D knowledge, but must never inspect hidden Runner cards in Grip or Stack.
- Known top cards may be used only where a game effect has revealed those positions to the Corp.
- Do not double-count the existing HQ agenda-flood adjustment, successful-run history, or L3.5 protection debt.

## Test scenarios
1. One extra HQ access is more urgent when HQ is agenda-rich.
2. R&D multi-access becomes critical when a breach could win.
3. Exhausted limited-use hardware contributes zero current access pressure.
4. Zero-counter scaling pressure stays below live multi-access.
5. Changing hidden Runner Grip/Stack identities changes nothing.

## Acceptance gate
Adopt only after seeded games (F4) reduce agenda points lost from centrals without materially suppressing viable remote scoring or causing persistent over-protection of exhausted central tools.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
