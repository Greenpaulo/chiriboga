# R2 Cross-trigger resolution ordering

**Roadmap item:** R2 · **Depends on:** none · **Sets:** systemgateway (Manegarm Skunkworks, Anoetic Void)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/reactive-commitment-design.md`

## Goal
When the Corp controls more than one of its own simultaneously pending
triggers in the same resolution window, choose the order that maximizes their
combined value, rather than resolving them in whatever order the engine
enumerates or each trigger's isolated `AIWouldTrigger()` produces.

## Current behaviour
The engine's trigger-list machinery (`ValidateTriggerList`/`Resolve.trigger`
in `phase.js`) already lets the active player order their own simultaneous
triggers, but each card's `AIWouldTrigger()` reasons only about itself.
Manegarm Skunkworks (tax without ending the run) and Anoetic Void (optional ETR
for 2c plus trashing 2 cards from HQ, declined via `corp.AI._isAmbush()` when
the server holds a wanted ambush) both trigger on `responseOnApproachServer`,
and nothing prefers tax-then-ETR over the reverse.
See [architecture.md: not yet modelled, holding and trigger ordering](../architecture.md#not-yet-modelled-holding-and-trigger-ordering).

## Design
- Implement `AITriggerSequenceValue()` and declare it on Manegarm Skunkworks
  and Anoetic Void as the first real pair (the "SkunkVoid" interaction: the
  Runner first pays Manegarm's tax, then Anoetic Void ends the run).
- When the engine's trigger-list resolver offers the Corp AI a choice among
  more than one legally pending trigger, and more than one is Corp-controlled,
  consult `AITriggerSequenceValue` pairwise across the pending set before
  falling back to current default ordering.
- Scope this to same-window ordering only; do not extend it toward multi-turn
  or cross-window planning.

## Safety and information boundary
- Only ever reorders the Corp's own already-triggered, already-legal abilities.
  Never fabricates a trigger and never changes which triggers are eligible to
  fire; that remains each card's own `AIWouldTrigger()`.
- Must not change behaviour when exactly one Corp trigger is pending (a no-op
  in the common case).
- Never inspects hidden Runner cards to decide ordering.

## Test scenarios
1. With Manegarm Skunkworks and Anoetic Void both installed on the same server
   and the Runner approaching it, the Corp resolves Manegarm's tax before
   Anoetic Void's end-the-run effect, extracting both the tax and the ETR.
2. With Anoetic Void alone on the server, ordering logic is a no-op;
   resolution proceeds exactly as it does today.
3. With Manegarm Skunkworks paired against a card that declares no
   `AITriggerSequenceValue` opinion, the current default resolution order is
   preserved.
4. Hidden Runner Grip/Stack substitution never changes the chosen order.
5. Across a representative range of Runner credit totals, the Corp's chosen
   order produces an outcome at least as good as either fixed ordering,
   including cases where Anoetic Void's own `_isAmbush()`-driven decline to
   fire interacts with the order chosen.

## Acceptance gate
Deterministic fixtures show the Corp choosing the value-maximizing order
whenever more than one of its own triggers is pending and value is
order-dependent per their declarations; single-trigger and order-independent
cases are provably unchanged from current behaviour.

## Things to consider
- Manegarm's tax is the Runner's choice (click-click or 5c), so the value of
  resolving it first depends on public Runner credits and clicks; scenario 5
  covers the range.
- Manegarm Skunkworks is also defined in `sets/tutorial.js`; confirm whether
  that definition should carry the hook.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
