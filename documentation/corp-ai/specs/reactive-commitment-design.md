# Reactive commitment: shared design

Shared design for every `R` item. The area was identified by manually reviewing
four representative decklists (Nebula Talent Management fast-advance, PT
Untaian asset-spam and bluff, LEO Construction Labor Solutions glacier-tax,
Zwicky Supermodernism rush and conditional kill) against `ai_corp.js`, where
two decision patterns recurred that no existing item covered.

## Question and relationship to other areas

Both patterns are decisions about **when**, not **what** or **where**:

- The server-security area (`L` items) answers *how vulnerable, valuable, or
  urgent is each server or threat*.
- The install area (`I` items) answers *what should the Corp install, and is
  that better than another available action, right now*.
- This area answers a question neither owns: *is it better to defer or reorder
  a legal action than to take it immediately, given a specific future condition
  the Corp can already see coming*.

The two patterns are:

- **Reservation:** holding a card, credits or an identity ability because it is
  worth more unspent, conditional on a future event identifiable from public
  state. It appears at three trigger granularities: turn-planning (hold across
  the turn boundary), mid-run reactive (a specific run-state window), and
  persistent-threshold (hold once a game-state threshold is close).
- **Trigger ordering:** choosing the order of the Corp's own simultaneously
  pending triggers in one resolution window when one order strictly dominates.

## Principles

The inherited principles (imperfect information, hooks over title policy,
tactical safety) are in `documentation/corp-ai/principles.md`. For this area in
particular, tactical safety covers game-winning scores, game-losing breach
prevention and the security area's emergency interrupt (legacy Layer 7.1), all
of which remain authoritative over reservations and ordering.

## Explicit non-goals

- A general combo-detection engine that infers arbitrary multi-card synergies
  without a card declaring a hook. Every mechanic stays declarative.
- Multi-turn planning of a specific win line several turns out (e.g. planning a
  kill combo three turns in advance). That is also an install-area non-goal; R1
  only reasons about holding a resource across a single, already-visible future
  condition, not simulating multiple future turns.
- Reordering triggers across different resolution windows (e.g. a run-approach
  trigger versus a later access trigger). This area covers same-window ordering
  only.
- Any opponent modelling beyond what the security area's public threat
  estimates (legacy Layer 5/5.1) already do. Reservation and sequencing
  decisions read only the Corp's own hand/board/identity and public Runner
  state already exposed by the existing evaluators.

## Proposed architecture

### Reservation record

```js
{
  card: card,                 // or identity, for identity-ability reservations
  timing: "turn" | "run" | "threshold",
  triggerCondition: fn(context) => boolean,
  reservedValue: 0,
  immediateValueIfSpentNow: 0,
  expiryCondition: fn(context) => boolean,
  reasons: []
}
```

### Card/identity hook

```js
card.AIReservedValue(context);            // cards (hand or installed)
identity.AIReservedAbilityValue(context); // identity abilities
```

Each declares, given current public state: is this worth holding right now,
what condition is it waiting on, and what bounded value holding it represents.
Same declarative shape as existing hooks; each grounding card implements it
independently and nothing in the central resolver hardcodes their titles.

### Trigger-ordering hook

```js
card.AITriggerSequenceValue(otherPendingTriggerCards, context);
```

Given the set of the Corp's other currently pending triggers in the same
resolution window, a card declares how its own value changes depending on
resolving before or after a specific other trigger. Consulted only when more
than one Corp-controlled trigger is legally pending in the same window; a no-op
otherwise.

## Cross-cutting test plan

Suggested new file: `tests/corp-reactive-commitment.test.js`. Keep
server-security and install-decision mechanics in their existing test files;
this file relies on their public interfaces without duplicating their coverage.

Minimum fixture matrix:

| Dimension | Required cases |
| --- | --- |
| Reservation timing | turn-planning, mid-run reactive, persistent-threshold |
| Reservation vs. tactical safety | reservation held, reservation overridden by a game-winning or game-losing tactical need |
| Trigger pair | order-dependent pair, order-independent pair, single pending trigger |
| Imperfect information | identical decisions across at least two different hidden Runner Grip/Stack substitutions, for every scenario above |

All fixtures assert an explainable reason string from the relevant hook,
matching the diagnostic convention already used by `_evaluateServerSecurity()`
and `_protectionScore()`.

## Definition of done for any item

An item is complete only when:

- the scoped behaviour is implemented in `ai_corp.js` and the three (R1) or two
  (R2) grounding card/identity definitions;
- deterministic regression tests cover success, failure, tactical-override, and
  imperfect-information boundaries;
- existing security, install-decision, and AI tests still pass;
- new card-facing hooks are documented in `documentation/ai.md`;
- `documentation/corp-ai/architecture.md` records the implemented behaviour,
  cards updated, and remaining limitations;
- no speculative follow-up is mislabeled as completed behaviour.
