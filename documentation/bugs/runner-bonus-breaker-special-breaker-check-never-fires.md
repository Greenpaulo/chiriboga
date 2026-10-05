# Runner AI: bonus-breaker ranking never recognises special breakers

**Source:** code inspection while documenting the Runner AI (no debug log)
**Reproduction:** none yet: found by reading the code at `be61a78`, 2026-09-25; writing a failing test is the first acceptance criterion.

## Summary
When the Runner AI ranks installable "bonus" breakers for an unaffordable
server, it checks `uniqueAffordableBreakers[k].AISpecialBreaker`. The entries
in that array are wrapper objects whose card is in `.card` (the same line
calls `_breakerMatchesIce(uniqueAffordableBreakers[k].card, iceCard)`), so the
special-breaker check reads a property that never exists and never fires.
Special breakers (for example Trojans such as Botulus or Tranquilizer) are
therefore only considered when their subtype matches the ICE.

## Evidence
`ai_runner.js`, in `_internalChoiceDetermination` (bonus-breaker ranking):

```js
if (this._breakerMatchesIce(uniqueAffordableBreakers[k].card, iceCard) || uniqueAffordableBreakers[k].AISpecialBreaker) {
```

## Root cause
- [Inferred] The check should read `uniqueAffordableBreakers[k].card.AISpecialBreaker`, matching the neighbouring `.card` access.

## Proposed fix
Read `AISpecialBreaker` from `.card`. Check other uses of the wrapper array
for the same mistake.

## Acceptance criteria
- [ ] A failing test shows a special breaker in hand is not ranked as a bonus breaker for ICE it can host on or break.
- [ ] The test passes after the fix and has moved into `tests/`.
- [ ] `documentation/runner-ai/architecture.md` no longer lists this as a known limit.
- [ ] `node tests/run-all-tests.js` passes.
