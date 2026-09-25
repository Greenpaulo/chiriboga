# I8 Multi-click short-horizon planning

**Roadmap item:** I8 · **Depends on:** I7 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Evaluate install decisions as parts of short plans rather than isolated clicks,
so that the Corp stops committing root cards to sequences its remaining clicks
or credits cannot complete.

## Current behaviour
Install and action choices are made one click at a time, with no plan
representation carrying costs, reserved credits or terminal value between
clicks.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Example plans:

```text
gain credit -> install and retain rez capacity
install ICE -> install agenda -> advance
install scoring upgrade -> install agenda
install economy asset -> activate it
protect HVT server -> reinforce another insecure central
```

Work:

- Add a shallow plan representation containing actions, costs, required state,
  reserved credits, and terminal value.
- Begin with deterministic two-action plans; expand to three actions only after
  performance and correctness are measured.
- Replan after every resolved action or meaningful state change.
- Never assume hidden future draws.
- Avoid committing a root card when the remaining clicks or credits cannot
  complete the minimum safe plan.

## Safety and information boundary
Planning never assumes hidden future draws, never triggers card effects,
consumes counters or rolls deception posture early, and must not double-spend
reserved rez credits. Fixed seeds and identical public states produce identical
plans.

## Test scenarios
1. The AI installs an agenda only when its remaining actions can complete the
   intended advancement or protection sequence.
2. A plan is abandoned and recalculated when an effect changes credits, clicks,
   or the target server.
3. Reserved rez credits are not double-spent by two planned defenses.
4. Planning does not trigger card effects, consume counters, or roll deception
   posture early.
5. Fixed seeds and identical public states produce identical plans.

## Acceptance gate
Short planning reduces obviously incomplete install sequences without causing
unacceptable main-phase latency or stale-plan behaviour.

## Things to consider
- Hidden cost collisions (design note edge case 2): install cost depends on the
  current ICE count, so each later step must budget against a projected credit
  pool (`projectedCredits`) that subtracts earlier steps' immediate costs.
- Plans must not grow into multi-turn planning on unknown draws, which is an
  explicit non-goal.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
