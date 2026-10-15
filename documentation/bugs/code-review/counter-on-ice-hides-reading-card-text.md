# UI: advancement counter on ice hides card text while zoomed for reading

**Outcome:** adopted
## Resolution
Implemented from `2dc504d`. Renderer-only translucency rule: `UpdateCounters` (`cardrenderer/cardrenderer.js`) now passes a new `pixi_shouldDimCounterWhileReadingZoom(counter)` predicate into `Counter.UpdateVisibility(forceHidden, dimmed)`, which renders the counter's icon and number at reduced alpha (instead of hiding) when its own card is zoomed for reading (`address.renderer.zoomed === true`), and restores full opacity per-frame otherwise. Subroutine-choice hiding is untouched (hide still takes precedence via the existing `forceHidden` flag). Guards (`!!counter.address`, `!!counter.address.renderer`) cover cards without a renderer.
- Scope update (2026-10-14, per owner): the dim predicate now covers ALL counter types on the zoomed card (advancement, credits, virus, power, agenda, bad_publicity) — no `counter.key` check. Counters on other cards stay fully opaque. Original ticket scoped this to advancement only; broadened at owner's request since credit/virus counters cover card text identically when zoomed.
- Tuning for the owner (not CSS — PIXI sprite alpha in JS; no stylesheet involved):
  - `cardrenderer/cardrenderer.js:262` — `var dimAlpha = dimmed ? 0.3 : 1.0;` — this is the single knob: the `0.3` is the zoomed translucency, `1.0` is the restored full opacity. Change `0.3` to taste (e.g. `0.2`–`0.5`), then reload; the per-frame path applies it immediately.
  - `cardrenderer/cardrenderer.js:263-264` — `this.sprite.alpha` / `this.richText.alpha` assignments (icon and number respectively); both follow `dimAlpha`, no separate values to tune.
  - `cardrenderer/cardrenderer.js:252` — `UpdateVisibility(forceHidden, dimmed)` signature; `cardrenderer/cardrenderer.js:2123-2129` — per-frame call site in `UpdateCounters`; `cardrenderer/cardrenderer.js:2351-2358` — `pixi_shouldDimCounterWhileReadingZoom` predicate.
- Departure from ticket as written: behavior broadened to all counter types (see above); the pending reproduction's original `hide(...) === true` expectation was updated to assert `dim(...) === true` for advancement plus credits/virus/power cases and a wiring case (per-frame call + alpha restore), per the ticket's own "adjust it to assert translucent" note — the hide predicate is separately asserted unchanged.
- Tests: reproduction moved `tests/pending/counter-on-ice-hides-reading-card-text.test.js` → `tests/counter-on-ice-hides-reading-card-text.test.js` (`node tests/counter-on-ice-hides-reading-card-text.test.js` passes); focused `node tests/advancement-counter-subroutine.test.js` and `node tests/card-zoom-layer.test.js` pass unchanged.
- Acceptance criteria: reproduction passes in green suite ✓; variation coverage (all counter types dim on zoom, opaque off zoom, renderer-less guard, hide-predicate-unchanged) in the moved test ✓; no AI hooks changed (renderer-only, none to document) ✓; `node tests/run-all-tests.js` ✓ — 93 test files passed.
- `ticket.js check` could not be run in this session: `node scripts/ticket.js check` hangs with no output (even `git log -- <pending-path>` stalls in this sandbox), so the reviewer should run it. Expected findings: WARN for the unticked criteria checkboxes and WARN that the pending reproduction has no committed original to compare (it was created untracked in this working tree, and its expectations were deliberately updated from hide→dim per the ticket's own note).
- No plan was written: renderer-only change in one source file, deterministic oracle per the ticket's Acceptance gate, no shared heuristic/evaluator/engine/AI-hook change, no green expectation changed.

**Source log:** `documentation/debug-logs/bug_raised/counter_on_ice_hides_reading_card_text.txt`
**Reproduction:** `tests/pending/counter-on-ice-hides-reading-card-text.test.js` — `node tests/pending/counter-on-ice-hides-reading-card-text.test.js` (fails at `2dc504d`, 2026-10-14). Moved to `tests/counter-on-ice-hides-reading-card-text.test.js` (green).

## Summary
When an ice with an advancement counter (e.g. Syailendra after its own subroutine fires) is hover-zoomed to read it, the advancement-counter icon and number stay drawn over the enlarged card body and cover the printed text. The prior fix (`documentation/bugs/done/ice-advancement-counters-block-subroutines.md`) hides the counter only during subroutine-break selection, so plain reading zoom is still obscured. This is display-only: counter values and rules are unaffected, but the Runner cannot read the card they are hovering.

## Evidence
Log title reports the reading-zoom complaint. The log shows the counter arriving mid-run:

- Lines 404–407: `Encountering Syailendra` / `Firing You may place 1 advancement counter...` / `1 advancement counter placed on Syailendra`.
- Lines 432–433 (end-of-game board dump): `corp.HQ.ice[0].rezzed=true;` / `corp.HQ.ice[0].advancement=1;`.

No decision snapshots are recorded (`=== DECISION SNAPSHOTS ... 0 recorded ===`, line 417), and there is no bad AI decision in the log — this is a renderer/UI defect, not a Corp/Runner AI choice.

## Reproduction
`tests/pending/counter-on-ice-hides-reading-card-text.test.js` loads the real `pixi_shouldHideCounterDuringSubroutineChoice` predicate from `cardrenderer/cardrenderer.js` in a `vm` sandbox and asserts it also hides a zoomed card's advancement counter outside subroutine choice. Current failing output:

```
FAIL zoomed ice advancement counter hidden while reading (no subroutine choice)
     advancement counter covers the enlarged card text when the ice is zoomed for reading
1 case(s) failed.
```

The 4 control cases pass (unzoomed stays visible, subroutine-choice hiding intact, other cards and other counter types unaffected), so it fails for the reported reason, not a harness error.

## Root cause
- [Verified] `pixi_shouldHideCounterDuringSubroutineChoice(counter, choosingSubroutines, relevantIce)` returns false for a zoomed card when `choosingSubroutines` is false (`cardrenderer/cardrenderer.js:2330-2340`, demonstrated by the pending test above). The only caller, `UpdateCounters` (`cardrenderer/cardrenderer.js:2107-2124`), passes exactly that predicate, so nothing hides the counter during reading zoom.
- [Verified] The subroutine-choice path is covered and green (`node tests/advancement-counter-subroutine.test.js`, `node tests/card-zoom-layer.test.js` pass) — this ticket is the uncovered sibling, not a regression of that fix.
- [Inferred] Per-card counters are added as children of the card sprite (`decks.js:160-162`, `InstanceCard`), so the counter rides on top of the enlarged card while zoomed; `ToggleZoom` (`cardrenderer/cardrenderer.js:1360-1416`) has no counter-visibility handling outside the subroutine-choice branch.

## Proposed fix
Generalize the display-only visibility rule, not the card: make the counter translucent while its own card is zoomed for reading (owner suggestion 2026-10-14), in addition to the existing hide-during-subroutine-choice case. Concretely, extend the per-frame counter path (`UpdateCounters`, `cardrenderer/cardrenderer.js:2107-2124`) so an `advancement` counter whose `address` is the zoomed card (`counter.address.renderer.zoomed`, with guards for cards without a renderer) renders its icon and number at reduced alpha (e.g. ~0.3, to be tuned) so the printed text underneath is readable, restored to full opacity automatically each frame by the existing per-frame path. Full hiding during subroutine choice stays as-is. Keep the existing scope: only `advancement` counters, only the card being read; power/virus/credit counters and other cards stay fully opaque. Rejected: moving the counter aside instead (new layout to tune per resolution); hiding all counter types (loses information other counters still convey). Note: the pending reproduction currently asserts hidden (`true`); the implementer should adjust it to assert translucent (alpha < 1 with both elements still visible) rather than `visible === false`, since translucency supersedes the hiding originally proposed.

## Acceptance gate
N/A — deterministic fix (principle 4): the enlarged card's printed text must be readable, i.e. the zoomed card's advancement counter (icon and number) renders translucently while zoomed and returns to full opacity on unzoom, with no change to counter values or game state.

## Acceptance criteria
- [x] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged. (Moved to `tests/counter-on-ice-hides-reading-card-text.test.js`, passing. Expectation updated hide→translucent per the Proposed-fix note authorizing exactly that; hide predicate separately asserted unchanged.)
- [x] Focused variation: zoomed power/virus counter stays visible; unzoomed advancement counter stays visible (already controls in the reproduction). (Superseded in part 2026-10-14 per owner: ALL counter types now dim on the zoomed card; unzoomed/other-card/renderer-less controls remain opaque in the moved test.)
- [x] New or changed AI hooks are documented in `documentation/ai.md`. (None expected — renderer-only change.)
- [x] `node tests/run-all-tests.js` passes. (93 test files passed.)

## Out of scope / related
- Done ticket `documentation/bugs/done/ice-advancement-counters-block-subroutines.md` (subroutine-choice hiding) stays as-is; this extends its rule to reading zoom.
