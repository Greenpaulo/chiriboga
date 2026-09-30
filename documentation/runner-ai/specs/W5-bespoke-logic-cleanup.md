# W5 Bespoke keep logic cleanup

**Roadmap item:** W5 · **Depends on:** W4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Once W1–W4 land, remove hand-written `AIWorthKeeping` logic that duplicates a
shared need, and give the remaining uncovered cards real hooks.

## Current behaviour
Many cards declare an intent hook and also hand-write an `AIWorthKeeping` that
repeats the same economy or draw check (for example
`if (Credits(runner) < 5) return true;`, verbatim in Fermenter, Creative
Commission and Telework Contract). The current list is generated in
`documentation/card-status.md` ("Intent hook and `AIWorthKeeping`"). Lampades,
Sell Out and Tailgate have no `AIWorthKeeping`. See
[architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- For each card whose hand-written `AIWorthKeeping` duplicates a need-matching
  pattern, confirm the new tier reproduces its behaviour, then simplify or
  remove the redundant check.
- Add real `AIWorthKeeping` to Lampades, Sell Out and Tailgate. They fall
  outside what the economy, draw and lockout needs cover, so each needs its own
  hook: Lampades (keep), Sell Out (keep when there is a
  disposable resource to trash, mirroring its own `Enumerate` and
  `AIWouldPlay`) and Tailgate (keep; HQ is almost always protected).
- Cards still only covered by the fallback tier remain visible in the generated
  coverage section of `documentation/card-status.md`; no hand-kept list is
  needed.

## Safety and information boundary
No additional constraints beyond the principles files.

## Test scenarios
1. Each simplified card keeps exactly the same in-game keep behaviour before
   and after its redundant check is removed.
2. Lampades, Sell Out and Tailgate behave correctly in the scenarios in
   `tests/vantagepoint-integration.test.js` and are now kept by their own hooks.

## Acceptance gate
No card carries hand-written keep logic that a generic need already covers.

## Things to consider
Adding the three Vantage Point hooks does not depend on W1–W4 and could be
raised as its own small ticket now.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
