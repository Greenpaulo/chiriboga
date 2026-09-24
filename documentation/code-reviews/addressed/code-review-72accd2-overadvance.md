# Code Review: `72accd2` — Corp AI findings 5, 6, 7 (`AIOverAdvance` hook)

**Repo:** Greenpaulo/chiriboga
**Commit:** [`72accd2`](https://github.com/Greenpaulo/chiriboga/commit/72accd26a9caa63a36137959e7c136f05879bc98)
**Tickets:** `documentation/backlog/done/corp_ai_finding_05_over_advance_win_exemption.md`, `..._06_ice_over_advance_typo.md`, `..._07_aioveradvance_contract.md`

> Note on coverage: these three ticket files were edited in place (moved to `done/`, `Status`/`Resolution` sections appended), not added fresh, so GitHub's diff only shows the changed hunks plus a couple of context lines — I didn't see each ticket's full original "Problem" text. The full **Resolution** sections are visible and complete, and that's what this review is checked against.

## Verdict

Approve. All three findings share one root cause — an overloaded, badly-typed `AIOverAdvance` hook — and this commit fixes the underlying contract once rather than patching each symptom separately. That's the right shape for a 3-ticket batch like this.

## What changed, and why it's correct

**Finding 7 (contract) settles first, and everything else follows from it.** `AIOverAdvance` stays a boolean, paired with a required `AIAdvancementLimit()` function for the actual target. `Project Ingatan` and `Sericulture Expansion` in `sets/elevation.js` are migrated from the old `AIOverAdvance: function() { return 2; }` numeric-hook style to `AIOverAdvance: true` + `AIAdvancementLimit() { return AdvancementRequirement(this) + 2; }`. This is a real behavior fix, not just a rename: `AdvancementRequirement(this) + 2` adapts to advancement-requirement modifiers, where the old hardcoded `2` didn't track the card's actual requirement at all.

**Finding 6 (ice typo) is fixed by removing the clause, not by fixing the typo literally.** The old code read `installedCards[i].advancement.AIOverAdvance` — note `.advancement` is a number, so `.AIOverAdvance` on it was always `undefined`. The obvious "fix" would be `installedCards[i].AIOverAdvance`, but the resolution correctly identifies that this would be wrong: per the finding 7 contract, `AIOverAdvance` is agenda-only and was never meant to bypass an ICE's advancement cap. Same logic applies to the other advance-selection site and to `_bestAdvanceOption`, all three now consistently gated by `Counters(card, "advancement") < advancementLimit` (via the new `_cardNeedsAdvancement` helper in the first two cases) with no `AIOverAdvance` escape hatch. Good instinct not to paper over a typo with a fix that would've reintroduced the same category of bug under a different name.

**Finding 5 (win exemption) is a genuine gameplay bug fix.** Previously, an `AIOverAdvance` agenda always waited for its full advancement limit before scoring — including when scoring immediately would already win the game. Now:
```js
var scoreWinsGame = AgendaPoints(corp) + (cardToScore.agendaPoints || 0) >= AgendaPointsToWin();
if (cardToScore.AIOverAdvance && !scoreWinsGame) { ... hold ... }
```
Using `AgendaPointsToWin()` instead of a hardcoded 7 is the right call if that function can vary with modifiers — this is explicitly called out as deliberate in the finding's resolution text, and it means the fix won't silently break under a points-to-win modifier card.

## Consistency fix, incidentally

Three separate advance-checks previously each did their own ad-hoc property access (`typeof card.advancement === "undefined"`, plain `card.advancement <`, the broken `.advancement.AIOverAdvance`). All three now go through `Counters(card, "advancement")`, and two of them through the new shared `_cardNeedsAdvancement(card, server)` helper. That's a solid side-effect of this pass — one source of truth for "does this card still need advancing" instead of three.

## Minor points

1. **Some redundancy between the two new/existing helpers.** `_advancementStillRequired` returns `limit - counters`; the new `_cardNeedsAdvancement` returns `counters < limit`. Both derive from the same two subexpressions — `_cardNeedsAdvancement` could be `return this._advancementStillRequired(card, server) > 0;` to avoid computing the limit twice in call sites that need both. Not urgent, just a small DRY opportunity now that both exist side by side.
2. **`_cardNeedsAdvancement`'s `server` param is unused by its only caller.** `_bestAdvanceOption` calls it without a `server` arg, so the parameter only matters if something else calls it directly later. Fine as-is, just flagging it's currently dead weight in that one call path (matches the pre-existing behavior, so not a regression).
3. **Worth a quick repo-wide check, not from this diff alone:** this commit only shows two cards (`35038`, `35049`) migrated off the old function-style `AIOverAdvance`. If any other card set still declares `AIOverAdvance` as a function returning a number, the boolean contract change in `ai_corp.js` would silently stop respecting it (a truthy function reference is still truthy, so the score-hold logic wouldn't break, but the old numeric return value would just be ignored rather than erroring — a quiet behavior change rather than a crash). Worth a repo grep for `AIOverAdvance:\s*function` outside this diff to confirm the migration is complete.

## Test coverage

`tests/corp-overadvance.test.js` covers the meaningful cases well:
- non-winning `AIOverAdvance` agenda holds (`-1`)
- winning agenda bypasses the hold and scores immediately (`0`)
- non-winning agenda still scores once it hits its own configured limit (`0`)
- both real migrated cards assert the boolean flag *and* the correct `AIAdvancementLimit()` value (5, matching "requirement + 2")
- `_cardNeedsAdvancement`/`_bestAdvanceOption` directly guard against `AIOverAdvance` overriding an ICE's cap — this is the regression test that specifically protects finding 6's fix from being silently reverted

This maps directly onto the acceptance criteria visible in finding 7's diff context ("both cards advanced to the intended counter count," "`ai.md` matches what cards declare," "a test asserts the cap actually stops advancement") — all three are satisfied.
