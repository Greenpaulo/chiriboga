# P2 Corp card-policy randomness

**Roadmap item:** P2 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 970eba6 (2026-09-28)

## Goal
Complete the Corp AI's injectable randomness boundary in playable card
definitions so fixed seeds reproduce card-driven Corp decisions as well as
decisions made inside `CorpAI`.

## Current behaviour
`CorpAI._random` and `_shuffleCopy()` are injectable, but several playable
cards bypass them for Corp policy:

- Steve Cambridge (31014) uses `RandomRange` to choose which of two Runner
  cards the Corp removes from the game.
- Seamless Launch (30040) calls engine `Shuffle` to randomise advance targets.
- Longevity Serum (30043), Ballista (30062), and Biawak (35074, two hooks) use
  `Math.random` for Corp choices.
- Punitive Counterstrike (31078) uses `RandomRange` for the Corp's trace bid.
- Touch-ups (35067) calls engine `Shuffle` for its advance target and
  `RandomRange` for its card-type choice.

Other direct random calls in playable card definitions implement game rules,
such as random HQ access or shuffling R&D/Stack, and must remain engine
randomness. The two sites first noticed during D2 review were Ballista and
Touch-ups; the list above is the result of checking every direct
`Math.random`, `RandomRange`, and `Shuffle` call in the four playable sets.

## Design
- Add a bounded `CorpAI._randomIndex(n)` alongside `_shuffleCopy()` and route
  random indices and probability rolls through `corp.AI._randomIndex()` or
  `corp.AI._random()`.
- Replace policy-only in-place `Shuffle(choices)` calls with
  `corp.AI._shuffleCopy(choices)`, assigning the returned order.
- Add a ratchet that checks playable card AI policy without flagging engine
  randomness required by card mechanics.
- Preserve each existing range, probability, and one-roll-per-decision
  lifetime; do not tune the policies in this item.

## Safety and information boundary
The change only replaces randomness sources. It must not seed or redirect
deck shuffles, random accesses, random card selection required by card text,
or any other engine/gameplay randomness.

## Test scenarios
1. While each listed Corp policy decision is evaluated, make `Math.random`,
   `RandomRange`, and engine `Shuffle` throw; restore those stubs before any
   resulting card effect resolves. Each policy choice uses an injected source
   and stays in bounds.
2. Equal seeds and equal public states produce equal choices for every listed
   policy site, with the same number of rolls.
3. Separately resolve representative gameplay randomness in the same card
   sets after restoring the engine sources, and spy on those sources to verify
   the effect still uses engine randomness rather than `CorpAI._random`. In
   particular, Touch-ups' policy-only advance-target shuffle is isolated from
   its later `Shuffle(runner.stack)` card effect.
4. A source ratchet rejects any new direct global-randomness call in playable
   Corp card-policy code.

## Acceptance gate
Behaviour-identical source replacement: existing distributions and decision
lifetimes are preserved, and deterministic tests show fixed-seed parity. No
batch comparison or default-off option is required.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`. (None expected.)
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the complete randomness boundary.
- [ ] `node tests/run-all-tests.js` passes.
