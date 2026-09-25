# I8 Multi-click short-horizon planning

**Roadmap item:** I8 · **Depends on:** I7.1, I7.2, F2, F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Evaluate install decisions as parts of short plans rather than isolated clicks,
so that the Corp stops committing root cards to sequences its remaining clicks
or credits cannot complete.

## Current behaviour
Install and action choices are made one click at a time. The only plan-like
state is the agenda commitment: `_returnPreference()` marks an installed agenda
`AIScoringPlanCommitted` and `_installedAgendaCanBeCompleted()` reads it (I4
turns it into a plan record). Nothing carries costs, reserved credits or
terminal value between clicks of different kinds.
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
  reserved credits, and terminal value (the I7.1/I7.2 value of the resulting
  board).
- Evaluate each step through `_withHypothetical()` with a projected credit pool
  (`projectedCredits`, design note edge case 2); F2's migration of the
  remaining unguarded probes is required so no step can leak state.
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
Improvement gate: candidate `this.options.shortHorizonPlans` on against I0's
baseline (with I2 to I7.2 options on in both arms), with the standard guards
(design note) and:

- Improvement: root commitments that I0's `installOutcomes` collector records
  as `abandoned` fall per game (candidate minus baseline upper bound below 0).
- Guards: `decisionLatencyMs` mean upper bound at most +50% of the baseline
  mean (planning is allowed more than the standard +25%), and the worst single
  decision at most 500 ms; `stallTurns` upper bound at most +0.5 turns per
  game.

## Things to consider
- Plans must not grow into multi-turn planning on unknown draws, which is an
  explicit non-goal.
- F3's per-decision cache would cut plan cost; it is a performance aid, not a
  dependency, and must never cache a hypothetical step.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
