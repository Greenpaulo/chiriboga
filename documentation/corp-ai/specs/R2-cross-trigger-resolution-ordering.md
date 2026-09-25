# R2 Cross-trigger resolution ordering

**Roadmap item:** R2 · **Depends on:** F4 · **Sets:** systemgateway (Manegarm Skunkworks, Anoetic Void)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/reactive-commitment-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
When the Corp has more than one of its own triggers pending in the same
resolution window, choose the order from the cards' declared preferences
rather than taking whichever the engine lists first.

## Current behaviour
- The engine lets each player order their own simultaneous triggers. In a
  `globalTriggers` phase (`phase.js`) the player whose turn it is resolves
  first, then the other player; the pending list is rebuilt from
  `ChoicesActiveTriggers()` and re-checked by `ValidateTriggerList()`
  (`utility.js`) before each choice, and `n` is offered only once no trigger
  is left, so every pending trigger resolves.
- The Corp AI has no handler for the Run 4.6.2 approach-server window. With
  one pending trigger the choice is automatic; with more, `_choiceInner()`
  reaches the "I don't have code to handle this situation" fallback and returns
  index 0, which is `ActiveCards()` order (rezzed installed cards in install
  order, then score area, then identity). The order is therefore whichever card
  was installed first.
- In the playable sets only two cards use `responseOnApproachServer`, both in
  `sets/systemgateway.js`:
  - **Manegarm Skunkworks:** "Whenever the Runner approaches this server, end
    the run unless they either spend two clicks or pay 5 credits." The trigger
    is mandatory once rezzed; its `AIWouldTrigger()` is consulted only when
    `Phase_Movement()` decides whether to rez it.
  - **Anoetic Void:** "you may pay 2 credits and trash 2 cards from HQ. If you
    do, end the run." Its `Resolve` asks its `AIWouldTrigger()`, which declines
    when `corp.AI._isAmbush()` finds an ambush in the server, when the server
    has fewer than two cards, or when HQ lacks two non-agenda cards.
- With the correct Manegarm text, resolving Manegarm first weakly dominates:
  the Runner pays the tax and Void then ends the run, or the Runner declines
  and the run ends without Void's cost. A hardcoded "Manegarm first" rule would
  pass every scenario built from these two cards alone, so the scenarios below
  include synthetic cards whose declarations must decide.
- `sets/tutorial.js` uses card 30042 from System Gateway; it has no separate
  Manegarm definition.
See [architecture.md: not yet modelled, holding and trigger ordering](../architecture.md#not-yet-modelled-holding-and-trigger-ordering).

## Design
- **Hook-in point.** In `_choiceInner()`, before the fallback: when
  `currentPhase.identifier == "Run 4.6.2"`, the choice is a `select` among
  pending triggers (entries with `.card`), and more than one is a Corp card,
  call a new `_orderedTriggerChoice(optionList)`. Other trigger windows keep
  today's behaviour; they can adopt the same helper later.
- **Hook.** `card.AITriggerSequenceValue(otherCard, context)` returns a number
  in credit-equivalents: positive means this card prefers to resolve before
  `otherCard`, negative after, 0 or no hook means no opinion. `context` is
  `{window: currentPhase.identifier, server: attackedServer}`. Non-finite
  results count as 0; results are clamped to [-10, 10].
- **Combining opinions.** For each pending Corp trigger `t`, score
  `sum over other pending o of (t.AITriggerSequenceValue(o) -
  o.AITriggerSequenceValue(t))`. Choose the highest score; ties (including all
  zero) go to the lowest index, the current default. The engine asks again
  after each resolution with the list re-validated, so the order is built one
  pick at a time and conflicting or cyclic opinions still give one
  deterministic answer. The log gives each candidate's score and the winning
  reason.
- **Declarations.** Each card states only what it knows about itself:
  Manegarm prefers to resolve before any other trigger, valued at the tax the
  Runner can currently pay (public clicks and credits; 0 when the Runner can
  pay neither, since the run then ends regardless). Anoetic Void prefers to
  resolve after any other trigger when its `AIWouldTrigger()` is true, valued
  at its own cost (2 credits and 2 HQ cards), since an earlier trigger can
  only add a tax or end the run without that cost; no opinion when it would
  decline.
- Behind a Corp AI option, default off.

## Safety and information boundary
- Only reorders the Corp's own already-pending, already-legal triggers; never
  adds, removes or suppresses one. Whether Void fires stays its own
  `AIWouldTrigger()`.
- No change when one Corp trigger is pending.
- Never reads hidden Runner cards.

## Test scenarios
Synthetic cards are defined only in the test file, since no other playable
card uses `responseOnApproachServer`.

1. Manegarm Skunkworks and Anoetic Void on the same server, Runner
   approaching: Manegarm resolves first, run with **both install orders**
   (Void installed first is the case the default gets wrong).
2. Anoetic Void alone: no change from today.
3. Two synthetic approach-trigger cards with no hook: the default order is
   kept in both install orders.
4. Manegarm and a synthetic card that declares a larger preference to resolve
   before any other trigger (for example, one that gains credits per Runner
   click left): the synthetic card resolves first. This fails a hardcoded
   Manegarm-first rule.
5. Manegarm, Anoetic Void and a synthetic card with conflicting opinions: the
   chosen sequence follows the combination rule and is the same on every run.
6. Across Runner credits {0, 4, 5, 9, 10, 20} and clicks {0, 1, 2, 3}, the
   order chosen for Manegarm and Anoetic Void is at least as good for the Corp
   as either fixed order (tax extracted, run ended, Corp cost), including when
   Void's `_isAmbush()` check declines.
7. Scenarios 1 to 6 give the same order under two different Runner Grip/Stack
   substitutions of equal size.

## Acceptance gate
Gated, guard-only: the ordering cannot lose value in the covered cases, so the
gate checks that nothing else regresses. Deck pairs from F4's committed pool:
LEO Glacier as Corp (the precon with both cards) against at least three Runner
precons, plus one control Corp deck with at most one approach trigger; 200
games per pair, paired seeds.

- Guards: `winRate` no drop beyond 2 percentage points; `decisionLatencyMs`
  no increase beyond 5%.
- Control pair: every metric identical to baseline.
- Collector added: `approachTriggerReorders` (Run 4.6.2 choices where the
  pick differed from index 0), which must be above zero on the LEO Glacier
  pairs to show the path ran.

## Things to consider
- Check that when Manegarm ends the run, the still-pending Void trigger is
  dropped (`EndTheRun()` leads to `RunUnsuccessful()` and a phase change)
  rather than resolved.
- LEO's Run 4.5 sacrifice (R1.2) happens before this window and reads these
  cards' declared outcome; R2 does not reorder across windows.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The collector listed in the gate is added through F4's collector extension point.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
