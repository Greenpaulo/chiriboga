# Corp AI: Reserve, Optionality & Cross-Trigger Sequencing Roadmap

## Status

This is a proposed companion to `corp_ai_improvement_roadmap.md` (server security,
Layers 1-8) and `corp_ai_install_decision_roadmap.md` (install/action selection,
Phases 0-9). It does not replace or supersede either. None of the phases below are
implemented; mark them otherwise only after code, documentation, and regression
tests have landed, following the same discipline used in both existing documents.

**Origin:** found through manual review of four representative decklists (Nebula
Talent Management / fast-advance, PT Untaian / asset-spam and bluff, LEO
Construction Labor Solutions / glacier-tax, Zwicky Supermodernism / rush and
conditional kill) checked directly against the current `ai_corp.js` implementation
and against both existing roadmap documents. Two decision patterns recurred across
these otherwise-unrelated archetypes and, as of this writing, are not covered even
as a `[PROPOSED]` phase in either existing document.

## Relationship to the existing roadmaps

Both patterns below are decisions about **when**, not **what** or **where**:

- The security roadmap (Layers 1-8) answers *how vulnerable, valuable, or urgent is
  each server or threat*.
- The install-decision roadmap (Phases 0-9) answers *what should the Corp install,
  and is that better than another available action, right now*.
- This document answers a question neither currently owns: *is it better to defer
  or reorder a legal action than to take it immediately, given a specific future
  condition the Corp can already see coming*.

This document inherits the imperfect-information and hook-over-title-policy
principles established in both existing roadmaps without restating them in full.
In particular:

- Nothing here may read the Runner's hidden Grip or Stack, or change a decision
  when hidden Runner cards are substituted for different hidden cards.
- Card-specific behavior is exposed through declarative hooks, not growing title
  lists, matching every hook already in `ai_corp.js` (`AIWorthwhileIce`,
  `AIWorthInstalling`, `AIPunishesAccess`, `AICentralPressure`, etc.).
- Tactical safety (game-winning scores, game-losing breach prevention, the Layer
  7.1 emergency interrupt) remains authoritative over anything proposed here.

---

## Findings from the current implementation

### 1. Every existing evaluator is asked "is this good right now," never "is this
better held"

`_sufficientEconomy()`, `_protectionScore()`, `_rankedInstallOptions()`, and every
per-card `AIWouldTrigger()` hook evaluate the current moment. None of them have a
concept of "this card is worth more unspent, conditional on a future event I can
already identify from public state." Three real decks depend on exactly that:

- **Nebula Talent Management** (identity ability flips a game-state toggle;
  playing an operation each turn is required to flip back). The published gameplan
  explicitly instructs: *"hold on to one operation at all times, so you can flip
  back in case the Runner successfully runs HQ or R&D."* This is a turn-planning
  reservation: hold a card across the turn boundary for a condition that may or
  may not occur next turn.
- **LEO Construction Labor Solutions** (`LEO Construction: Labor Solutions` identity
  ability trashes an installed bioroid). The published gameplan: *"Once the runner
  passes all your ice, you may end the run by trashing your own Mercia B4LL4RD or
  Bumi 1.0 in the remote. They have to run it again."* This is a mid-run reactive
  reservation: the sacrifice is only correct in the specific run-state window after
  ICE has been passed and before access resolves — earlier wastes the tax those
  cards forced, later is too late.
- **Zwicky Supermodernism** (Measured Response, a Black Ops operation). Confirmed
  directly from `sets/elevation.js`: playable only when
  `threatLevel = max(AgendaPoints(corp), AgendaPoints(runner)) >= 4` and the Runner
  made a successful run on their last turn; deals 4 meat damage unless the Runner
  pays to prevent it. This is a persistent-threshold reservation: the card and the
  credits to play it are worth holding once the threshold is close, regardless of
  what else the Corp could otherwise spend them on that turn.

These three are the same underlying pattern at three different trigger
granularities, not three unrelated card interactions.

### 2. Simultaneous corp-controlled triggers are not compared against each other

Confirmed directly from `sets/systemgateway.js`: `Manegarm Skunkworks` and
`Anoetic Void` both trigger on `responseOnApproachServer`. Manegarm taxes the
Runner (click-click or 5c, Runner's choice) without ending the run; Anoetic Void
optionally ends the run outright for 2c + trashing 2 cards from HQ, and its own
`AIWouldTrigger()` already declines to fire if the server holds an ambush the Corp
would rather let the Runner walk into (checked via `corp.AI._isAmbush()`). The
LEO Construction gameplan names the combined interaction directly ("SkunkVoid"):
*"you can order the effects in such a way that the Runner first has to pay for
Manegarm Skunkworks's tax, then you end the run with Anoetic Void afterwards."*

The engine's generic trigger-list machinery
(`ValidateTriggerList`/`Resolve.trigger` in `phase.js`) already lets the active
player choose the order in which their own simultaneous triggers resolve — this is
standard, already-implemented game-rules infrastructure, not something that needs
building. What's missing is any logic that reasons about the *pair*: each card's
`AIWouldTrigger()` only ever reasons about itself in isolation, so nothing
currently prefers "Manegarm before Void" over "Void before Manegarm" or an
engine-default order, even though one ordering strictly dominates the other.

---

## Explicit non-goals

- A general combo-detection engine that infers arbitrary multi-card synergies
  without a card declaring a hook. Every mechanic here stays declarative, per the
  existing project convention.
- Multi-turn planning of a specific win line several turns out (e.g., planning a
  kill combo three turns in advance). That remains the install-decision roadmap's
  explicit non-goal and stays out of scope here too — Phase R1 below only reasons
  about holding a resource across a single, already-visible future condition, not
  simulating multiple future turns.
- Reordering triggers across different resolution windows (e.g., a run-approach
  trigger versus a later access trigger). This document covers same-window
  ordering only.
- Any opponent-modeling beyond what Layer 5/5.1 already do. Reservation and
  sequencing decisions read only the Corp's own hand/board/identity and public
  Runner state already exposed by the existing evaluators.

---

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
card.AIReservedValue(context);       // cards (hand or installed)
identity.AIReservedAbilityValue(context); // identity abilities
```

Each declares, given current public state: is this worth holding right now, what
condition is it waiting on, and what bounded value does holding it represent. Same
declarative shape as every existing hook — Nebula's identity, Measured Response,
and Mercia B4LL4RD/Bumi 1.0 each implement this independently; nothing in the
central resolver hardcodes any of their titles.

### Trigger-ordering hook

```js
card.AITriggerSequenceValue(otherPendingTriggerCards, context);
```

Given the set of the Corp's other currently-pending triggers in the same
resolution window, a card declares how its own value changes depending on
resolving before or after a specific other trigger. Consulted only when more than
one Corp-controlled trigger is legally pending in the same window; a no-op
otherwise.

---

## Implementation roadmap

### Phase R1: Reserve & Optionality Model — `[PROPOSED]`

**Goal:** Let the Corp AI recognize when holding a resource now, for a specific
future condition it can already see in public state, is worth more than its
immediate use — across turn-planning, mid-run reactive, and persistent-threshold
timings.

**Work:**

- Implement `AIReservedValue`/`AIReservedAbilityValue` and wire Nebula's flip
  condition, LEO's post-ICE-pre-access sacrifice window, and Zwicky's
  `threatLevel`-gated hold as the first three real declarations.
- Integrate reservations into the click-decision loop (and, once it exists, the
  install-decision roadmap's Phase 7 "Install Versus Other Corp Actions") as an
  explicit, scored alternative to spending — not merely the absence of a better
  option.
- Reuse the existing credit-reservation infrastructure from the security
  roadmap's Layer 3.5 for threshold-timed credit holds, rather than building a
  second, parallel reservation-tracking mechanism.
- Mid-run reactive reservations should fire through the existing
  `responseOnApproachServer`/access-window trigger machinery already used by
  Manegarm Skunkworks and Anoetic Void, not a new engine phase.
- Every reservation must carry a deterministic `expiryCondition` so it cannot
  silently persist once its condition becomes unreachable.

**Safety constraints:**

- `triggerCondition` and `expiryCondition` read only public state (Corp's own
  hand/board/identity, public Runner state); never hidden Runner cards.
- A reservation never blocks a tactically authoritative action — a game-winning
  score, the Layer 7.1 emergency interrupt, or a forced action always overrides it.
- No reservation may be established or consumed by inspecting or assuming
  specific hidden Runner cards.

**Deterministic regression scenarios:**

1. With an operation in hand and no game-critical need for the click, the AI
   holds it and takes a lower-value immediate action instead, specifically
   because playing it now would remove the option to flip back defensively.
2. The same operation is played immediately when doing so completes a
   game-winning line this turn — tactical safety outranks the reservation.
3. A bioroid held for the LEO sacrifice is trashed via the identity ability in
   the run-state window after all rezzed ICE on the server has been passed and
   before access resolves — not earlier (wastes the tax already extracted) and
   not later (too late to force a re-run).
4. With no run against the guarded server this turn, no reservation-driven
   sacrifice fires.
5. Below the `threatLevel` threshold, Measured Response's play resources are not
   reserved; once the threshold is met and the card is in hand, the AI declines
   an otherwise-marginal spend that would leave it unable to play Measured
   Response the following turn.
6. With Measured Response already played, discarded, or no eligible Runner run
   having occurred, no reservation is held.
7. A turn-planning reservation (Nebula) and a mid-run reactive reservation (LEO)
   evaluated in the same game state do not interfere with or block each other.
8. Hidden Runner Grip/Stack substitution never changes a reservation decision.

**Acceptance gate:** Deterministic fixtures show the AI holding a resource
specifically because of a declared future condition, with an explainable reason
from the hook that produced it; tactical safety overrides remain authoritative in
every fixture; seeded simulations show no material increase in the AI stalling
with unused resources at game end.

### Phase R2: Cross-Trigger Resolution Ordering — `[PROPOSED]`

**Goal:** When the Corp controls more than one of its own simultaneously-pending
triggers in the same resolution window, choose the order that maximizes their
combined value, rather than resolving them in whatever order the engine enumerates
or each trigger's isolated `AIWouldTrigger()` produces.

**Work:**

- Implement `AITriggerSequenceValue()` and declare it on Manegarm Skunkworks and
  Anoetic Void as the first real pair.
- When the engine's trigger-list resolver offers the Corp AI a choice among more
  than one legally pending trigger, and more than one is Corp-controlled, consult
  `AITriggerSequenceValue` pairwise across the pending set before falling back to
  current default ordering.
- Scope this to same-window ordering only; do not extend it toward multi-turn or
  cross-window planning.

**Safety constraints:**

- Only ever reorders the Corp's own already-triggered, already-legal abilities.
  Never fabricates a trigger and never changes which triggers are eligible to fire
  — that remains each card's own `AIWouldTrigger()`.
- Must not change behavior when exactly one Corp trigger is pending (a no-op in
  the common case).
- Never inspects hidden Runner cards to decide ordering.

**Deterministic regression scenarios:**

1. With Manegarm Skunkworks and Anoetic Void both installed on the same server
   and the Runner approaching it, the Corp resolves Manegarm's tax before
   Anoetic Void's end-the-run effect, extracting both the tax and the ETR.
2. With Anoetic Void alone on the server, ordering logic is a no-op — resolution
   proceeds exactly as it does today.
3. With Manegarm Skunkworks paired against a card that declares no
   `AITriggerSequenceValue` opinion, the current default resolution order is
   preserved.
4. Hidden Runner Grip/Stack substitution never changes the chosen order.
5. Across a representative range of Runner credit totals, the Corp's chosen
   order produces an outcome at least as good as either fixed ordering, including
   cases where Anoetic Void's own `_isAmbush()`-driven decline to fire interacts
   with the order chosen.

**Acceptance gate:** Deterministic fixtures show the Corp choosing the
value-maximizing order whenever more than one of its own triggers is pending and
value is order-dependent per their declarations; single-trigger and
order-independent cases are provably unchanged from current behavior.

---

## Cross-cutting test plan

Suggested new file: `tests/corp-reactive-commitment.test.js`. Keep server-security
and install-decision mechanics in their existing test files; this file should rely
on their public interfaces without duplicating their coverage.

Minimum fixture matrix:

| Dimension | Required cases |
| --- | --- |
| Reservation timing | turn-planning, mid-run reactive, persistent-threshold |
| Reservation vs. tactical safety | reservation held, reservation overridden by a game-winning or game-losing tactical need |
| Trigger pair | order-dependent pair, order-independent pair, single pending trigger |
| Imperfect information | identical decisions across at least two different hidden Runner Grip/Stack substitutions, for every scenario above |

All fixtures should assert an explainable reason string from the relevant hook,
matching the diagnostic convention already used by `_evaluateServerSecurity()` and
`_protectionScore()`.

## Definition of done for either phase

A phase is complete only when:

- the scoped behavior is implemented in `ai_corp.js` and the three (Phase R1) or
  two (Phase R2) grounding card/identity definitions;
- deterministic regression tests cover success, failure, tactical-override, and
  imperfect-information boundaries;
- existing security, install-decision, and AI tests still pass;
- new card-facing hooks are documented in `documentation/ai.md`;
- this document records implemented notes, cards updated, and remaining
  limitations, following the same convention as both existing roadmaps;
- no speculative follow-up is mislabeled as completed behavior.
