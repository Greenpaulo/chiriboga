# Runner AI principles

Runner-specific rules. The rules shared by both AIs (hooks not titles,
read-only planning, tactical safety, randomness, no unsafe mutation,
explainability, calibration, scope) are in
[../ai-principles.md](../ai-principles.md); read that first. Change this file
only by explicit decision, and record why.

## 1. The Runner's information boundary

- Never read what a human Runner could not see: the identity, subtypes or
  strength of unrezzed ICE; facedown installed Corp cards; the contents or order
  of HQ, R&D or facedown Archives cards; or the Corp AI's private state.
- Public information may be used: rezzed ICE and faceup Corp cards, scored
  agendas, Corp credits, bad publicity, pile sizes, faceup Archives cards and
  public run history.
- Information the Runner has legitimately seen, such as cards accessed or
  exposed, may be remembered and used for as long as it plausibly stays true.
- The Runner knows its own Grip, Heap and installed cards, but not the order of
  its Stack unless an effect revealed it.
- Estimates of unknown Corp cards (for example unrezzed ICE) must come from
  public information and priors, not from the hidden card itself.

## 2. Tactical safety examples

Never discard the only available answer to an urgent, game-relevant situation
(for example the only breaker that can open a locked-out server) in favour of a
generically higher-scoring card; never pass up a game-winning steal for a
stylistic preference.

## 3. Runner principle debt

Existing code that breaks a shared principle is tracked as `D` items in
[roadmap.md](roadmap.md).
