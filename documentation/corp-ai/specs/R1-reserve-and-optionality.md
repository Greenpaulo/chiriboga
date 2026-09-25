# R1 Reserve and optionality

**Roadmap item:** R1 · **Depends on:** none · **Sets:** elevation (Measured Response, LEO Construction, Mercia B4LL4RD, Bumi 1.0); Nebula Talent Management is not yet defined (see `documentation/card-status.md`)
**Read first:** `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/reactive-commitment-design.md`

## Goal
Let the Corp AI recognize when holding a resource now, for a specific future
condition it can already see in public state, is worth more than its immediate
use, across turn-planning, mid-run reactive, and persistent-threshold timings.

## Current behaviour
`_sufficientEconomy()`, `_protectionScore()`, `_rankedInstallOptions()` and
per-card `AIWouldTrigger()` hooks all evaluate the current moment; none has a
concept of a card being worth more unspent, conditional on a visible future
event. The three grounding decks (Nebula's hold-one-operation flip-back, LEO's
post-ICE sacrifice of Mercia B4LL4RD or Bumi 1.0, Zwicky's Measured Response
threshold) depend on exactly that.
See [architecture.md: not yet modelled, holding and trigger ordering](../architecture.md#not-yet-modelled-holding-and-trigger-ordering).

## Design
Grounding declarations:

- **Nebula Talent Management** (turn-planning): the identity ability flips a
  game-state toggle and playing an operation each turn is required to flip
  back; the gameplan is to hold one operation at all times to flip back if the
  Runner successfully runs HQ or R&D.
- **LEO Construction: Labor Solutions** (mid-run reactive): the identity
  ability trashes an installed bioroid; once the Runner passes all ICE, trashing
  Mercia B4LL4RD or Bumi 1.0 in the remote ends the run. The sacrifice is only
  correct after ICE has been passed and before access resolves.
- **Measured Response** (persistent-threshold, Black Ops operation, confirmed in
  `sets/elevation.js`): playable only when
  `threatLevel = max(AgendaPoints(corp), AgendaPoints(runner)) >= 4` and the
  Runner made a successful run on their last turn; deals 4 meat damage unless
  the Runner pays to prevent it. The card and the credits to play it are worth
  holding once the threshold is close.

Work:

- Implement `AIReservedValue`/`AIReservedAbilityValue` and wire Nebula's flip
  condition, LEO's post-ICE-pre-access sacrifice window, and Zwicky's
  `threatLevel`-gated hold as the first three real declarations.
- Integrate reservations into the click-decision loop (and, once it exists, I7
  "Install versus other Corp actions") as an explicit, scored alternative to
  spending, not merely the absence of a better option.
- Reuse the existing credit-reservation infrastructure from the security area
  (legacy Layer 3.5) for threshold-timed credit holds, rather than building a
  second, parallel reservation-tracking mechanism.
- Mid-run reactive reservations fire through the existing
  `responseOnApproachServer`/access-window trigger machinery already used by
  Manegarm Skunkworks and Anoetic Void, not a new engine phase.
- Every reservation carries a deterministic `expiryCondition` so it cannot
  silently persist once its condition becomes unreachable.

## Safety and information boundary
- `triggerCondition` and `expiryCondition` read only public state (Corp's own
  hand/board/identity, public Runner state), never hidden Runner cards.
- A reservation never blocks a tactically authoritative action: a game-winning
  score, the emergency interrupt (legacy Layer 7.1), or a forced action always
  overrides it.
- No reservation may be established or consumed by inspecting or assuming
  specific hidden Runner cards.

## Test scenarios
1. With an operation in hand and no game-critical need for the click, the AI
   holds it and takes a lower-value immediate action instead, specifically
   because playing it now would remove the option to flip back defensively.
2. The same operation is played immediately when doing so completes a
   game-winning line this turn; tactical safety outranks the reservation.
3. A bioroid held for the LEO sacrifice is trashed via the identity ability in
   the run-state window after all rezzed ICE on the server has been passed and
   before access resolves; not earlier (wastes the tax already extracted) and
   not later (too late to force a re-run).
4. With no run against the guarded server this turn, no reservation-driven
   sacrifice fires.
5. Below the `threatLevel` threshold, Measured Response's play resources are
   not reserved; once the threshold is met and the card is in hand, the AI
   declines an otherwise-marginal spend that would leave it unable to play
   Measured Response the following turn.
6. With Measured Response already played, discarded, or no eligible Runner run
   having occurred, no reservation is held.
7. A turn-planning reservation (Nebula) and a mid-run reactive reservation
   (LEO) evaluated in the same game state do not interfere with or block each
   other.
8. Hidden Runner Grip/Stack substitution never changes a reservation decision.

## Acceptance gate
Deterministic fixtures show the AI holding a resource specifically because of a
declared future condition, with an explainable reason from the hook that
produced it; tactical safety overrides remain authoritative in every fixture;
seeded simulations show no material increase in the AI stalling with unused
resources at game end.

## Things to consider
- R1 has no hard dependency, but it integrates with I7 once I7 exists:
  reservations should become a scored alternative inside I7's install-versus-
  action comparison rather than a separate priority list.
- Sets: the legacy text states a set only for Measured Response. A grep of
  `sets/` during this restructure found LEO Construction, Mercia B4LL4RD and
  Bumi 1.0 in `sets/elevation.js` and no Nebula Talent Management definition
  in any set file; confirm, and decide whether Nebula is in scope, when
  raising.
- Reservation is limited to a single, already-visible future condition; it must
  not grow into multi-turn win-line planning (design note non-goal).

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
