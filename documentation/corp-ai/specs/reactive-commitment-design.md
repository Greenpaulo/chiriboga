# Reactive commitment: shared design

**Verified against code:** 376f32c (2026-09-25)

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
  state. It appears at three trigger granularities, one item each:
  persistent-threshold (R1.1, Measured Response: hold once a game-state
  threshold is reached), mid-run reactive (R1.2, LEO Construction: hold an
  ability until a specific run window), and turn-planning (R1.3, Nebula Talent
  Management: hold a card across the turn boundary).
- **Trigger ordering (R2):** choosing the order of the Corp's own
  simultaneously pending triggers in one resolution window.

Grounding cards, as the code and card data define them:

- **Measured Response** (`sets/elevation.js`, play cost 5): playable only when
  the threat level is at least 4 and the Runner made a successful run during
  their last turn; 4 meat damage unless the Runner pays 8 credits.
- **LEO Construction: Labor Solutions** (`sets/elevation.js`): a once-per-turn
  paid ability, "trash 1 rezzed bioroid card in the root of or protecting the
  attacked server: end the run". Its right moment is the last Run 4.5
  paid-ability window, after the last ICE and before the Run 4.6.2
  approach-server triggers.
- **Nebula Talent Management: Making Stars** (not yet defined): the front side
  flips at the end of an action phase in which an operation was played; the
  flip side gains a click on the first operation each turn and flips back when
  the Runner runs HQ or R&D successfully.
- **Manegarm Skunkworks** (`sets/systemgateway.js`): whenever the Runner
  approaches its server, end the run unless they spend two clicks or pay 5
  credits.
- **Anoetic Void** (`sets/systemgateway.js`): whenever the Runner approaches
  its server, the Corp may pay 2 credits and trash 2 cards from HQ to end the
  run.

## Principles

The inherited principles (imperfect information, hooks over title policy,
tactical safety) are in `documentation/ai-principles.md` and `documentation/corp-ai/principles.md`. For this area in
particular, tactical safety covers game-winning scores, game-losing breach
prevention and the security area's emergency interrupt, all of which remain
authoritative over reservations and ordering.

## Explicit non-goals

- A general combo-detection engine that infers arbitrary multi-card synergies
  without a card declaring a hook. Every mechanic stays declarative.
- Multi-turn planning of a specific win line several turns out (e.g. planning a
  kill combo three turns in advance). That is also an install-area non-goal;
  reservations only reason about holding a resource across a single,
  already-visible future condition, not simulating multiple future turns. A
  once-per-turn ability is not held back for a later run in the same turn.
- Reordering triggers across different resolution windows. R2 covers
  same-window ordering only. One cross-window consideration is allowed: a
  mid-run reservation decided in a paid-ability window (R1.2, LEO at Run 4.5)
  may account for the Corp's approach-server triggers still to come on the same
  server in the same run, through their declared `AIApproachWouldEndRun()`. It
  never reorders or suppresses them.
- Any opponent modelling beyond what the security area's public threat
  estimates already do. Reservation and sequencing decisions read only the
  Corp's own hand/board/identity and public Runner state already exposed by the
  existing evaluators.

## Proposed architecture

### Reservation hook and record

One hook for every card, identities included:

```js
card.AIReservedValue(context) // -> null | record
```

`context` is `{purpose, phase}`: `purpose` names the asking decision
(`"economy"`, `"discard"`, `"play"`, `"ability"`), `phase` is
`currentPhase.identifier`. The hook must be deterministic and read-only, and
read only public state and the Corp's own cards. Returning a record means the
declared future condition is currently visible; returning `null` means no
hold.

```js
{
  value: 5,              // credit-equivalents, finite, >= 0; clamped to [0, 10]
  timing: "threshold",   // "turn" | "run" | "threshold"
  reason: "threat level 4: keep Measured Response and 5c",
  expiryCondition: function (context) { return false; }, // true once the condition cannot occur
  holds: [card]          // optional: Corp cards to keep; defaults to the declaring card
}
```

- **Units.** `value` is what holding is worth, in credit-equivalents, the unit
  of `AIReserveCredits` and of credits. The card does not estimate its
  alternatives: `immediateValueIfSpentNow` is computed by the resolver, and only
  once I7.2 provides a scored candidate model for main-phase actions. Until
  then a record is a constraint (the held cards are not played, discarded or
  trashed by choice, and held credits are not spent on discretionary actions),
  and `value` ranks records against each other when not all can be honoured.
- **Credits.** Credit holds use `AIReserveCredits(server, context)`, extended
  in R1.1 with `context.purpose` (`"economy"` or `"rez"`) and summed for HQ
  cards that have an active record. A card holding credits declares both hooks
  and derives the credits from its own record. There is no second
  credit-reservation mechanism.
- **Persistence.** `corp.AI._reservations` maps each declaring card to
  `{record, sinceTurn}`; it is the only store. It is refreshed once per Corp
  `Choice` that consults it and at Corp turn start
  (`_prepareProtectionPrioritiesForCorpTurn()`).
- **Expiry.** At each refresh: drop records whose card has left HQ, the board
  or the identity slot; evaluate each surviving record's `expiryCondition` and
  drop it with a logged `reservation expired: <reason>` when true; then re-ask
  the hook and drop records that come back `null`.
- **Overrides.** Game-winning scores, critical breach defence, the emergency
  recovery plan, rezzes that prevent a game-winning breach and forced
  single-option decisions ignore every record. A record never stops its own
  card being played.

### Trigger-ordering hook

```js
card.AITriggerSequenceValue(otherCard, context) // -> number
```

Credit-equivalents, clamped to [-10, 10]: positive means this card prefers to
resolve before `otherCard`, negative after, 0 or no hook means no opinion.
`context` is `{window, server}`. A card states only what it knows about its own
effect. For each pending Corp trigger `t`, the resolver scores `sum over other
pending o of (t.AITriggerSequenceValue(o) - o.AITriggerSequenceValue(t))` and
picks the highest; ties go to the engine's default (lowest index). The engine
re-asks after each resolution, so three or more triggers, and conflicting or
cyclic opinions, give one deterministic order built a pick at a time. Consulted
only when more than one Corp trigger is pending in the same window.

## Cross-cutting test plan

Suggested new file: `tests/corp-reactive-commitment.test.js`. Keep
server-security and install-decision mechanics in their existing test files;
this file relies on their public interfaces without duplicating their coverage.
Synthetic test cards are allowed, defined only in the test file, where a
scenario needs a declaration no playable card makes (R2 needs them: only
Manegarm Skunkworks and Anoetic Void use `responseOnApproachServer` in the
playable sets).

Minimum fixture matrix:

| Dimension | Required cases |
| --- | --- |
| Reservation timing | persistent-threshold (R1.1), mid-run reactive (R1.2), turn-planning (R1.3) |
| Reservation vs. tactical safety | reservation held, reservation overridden by a game-winning or game-losing tactical need |
| Reservation expiry | record dropped when its card leaves, and when its `expiryCondition` becomes true |
| Trigger pair | order-dependent pair in both install orders, a pair a hardcoded order gets wrong, order-independent pair, single pending trigger |
| Imperfect information | identical decisions across at least two different hidden Runner Grip/Stack substitutions, for every scenario above |

Every fixture asserts an explainable reason string from the hook or resolver
that produced the decision, matching the diagnostic convention already used by
`_evaluateServerSecurity()` and `_protectionScore()`. Each spec carries this as
its first acceptance criterion.

## Acceptance gates

Every `R` item changes play, so each is gated as
`documentation/ai-planning.md` ("Acceptance gates") describes: it depends on
F4, ships behind an AI option that defaults to off, and names its metrics,
collectors and thresholds. The items need these Corp decks in F4's committed
deck pool: Zwicky Supermodernism (R1.1), LEO Glacier (R1.2, R2) and Nebula
Fast Advance (R1.3).

## Definition of done for any item

An item is complete only when:

- the scoped behaviour is implemented in `ai_corp.js` and the item's grounding
  card definitions (R1.1: Measured Response; R1.2: LEO Construction, Manegarm
  Skunkworks and Anoetic Void for `AIApproachWouldEndRun()`; R1.3: Nebula
  Talent Management; R2: Manegarm Skunkworks and Anoetic Void);
- deterministic regression tests cover success, failure, tactical-override, and
  imperfect-information boundaries;
- existing security, install-decision, and AI tests still pass;
- new card-facing hooks are documented in `documentation/ai.md`;
- `documentation/corp-ai/architecture.md` records the implemented behaviour,
  cards updated, and remaining limitations;
- the gate evidence is recorded before the option is switched on;
- no speculative follow-up is mislabeled as completed behaviour.
