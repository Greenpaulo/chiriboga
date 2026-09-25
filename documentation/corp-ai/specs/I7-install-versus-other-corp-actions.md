# I7 Install versus other Corp actions

**Roadmap item:** I7 · **Depends on:** I2, I3, I4, I5, I6 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Compare the best install with gaining credits, playing operations, advancing,
rezzing, triggering abilities, or waiting, so that main-phase decisions can
explain why installation beats the best non-install alternative.

## Current behaviour
`Phase_Main` considers purge and tag-trash before ordinary install selection,
and install options are chosen from priority buckets rather than compared with
non-install actions on one scale. A bounded critical-protection fallback lets
the Corp install/rez declared immediate draw or draw while preserving a click
to install protection when the top server is critically insecure and HQ holds
no ICE.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- Normalize high-level Corp actions into comparable tactical values or bounded
  priority bands.
- Include purge and tag-trash explicitly in the comparison. Ordinary purge has
  a conservative outcome contract (open an immediate score or secure a staked
  server), which should be consumed rather than replaced by an unrelated
  install-score bonus.
- Include the immediate opportunity cost of a Corp click and spent credits.
- Recognize when gaining one or more credits unlocks a much stronger install
  and defense line.
- Preserve forced and game-winning actions as hard priorities.
- Prevent low-value installation merely to relieve hand pressure when a better
  discard or economy line exists.

## Safety and information boundary
Forced and game-winning actions remain hard priorities. Hand-size pressure
affects opportunity cost but never erases tactical safety. The
critical-protection fallback's agenda-flood, economy, last-click and
imperfect-information guards must be preserved.

## Test scenarios
1. Gain-credit-then-install is preferred when the extra credit changes an ICE
   from unusable to decisive.
2. A playable economy operation outranks a negative-return economy asset.
3. A guaranteed score outranks speculative protection or economy.
4. Installing unaffordable ICE does not outrank funding already installed
   critical defense without explicit future value.
5. Hand-size pressure affects opportunity cost but does not erase tactical
   safety.
6. Gaining a credit is compared against the best executable `(ICE, server)`
   candidate, not against an abstract need to protect a server for which the
   hand has no viable response.
7. Protecting the second-ranked server can outrank gaining a credit when the
   first-ranked server is currently infeasible and the second install has
   material defensive value.

## Acceptance gate
Main-phase decisions can explain why installation beats the best non-install
alternative in representative tactical fixtures.

## Things to consider
- Purge and tag-trash ordering: `Phase_Main` currently evaluates them before
  install selection. Folding them into the comparison must keep ordinary
  purge's outcome contract intact rather than approximating it with an install
  bonus.
- Critical-protection acquisition fallback: it is a bounded safety fallback,
  not a replacement for this comparison. I7 must compare it against tutors,
  operations and other short plans while preserving its guards.
- Protection debt versus strategic sacrifice (design note edge case 3): I7
  tactical overrides act as a hard short-circuit; if
  `ScoreWinProbability >= 1.0`, central protection debt checks are suppressed
  in favour of the winning sequence.
- R1 (reserve and optionality) integrates reservations into this comparison as
  an explicit, scored alternative to spending once I7 exists.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
