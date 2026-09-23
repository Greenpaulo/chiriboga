# Code Review: `41a10b0` — Corp AI finding 4 (mulligan evaluation)

**Repo:** Greenpaulo/chiriboga
**Commit:** [`41a10b0`](https://github.com/Greenpaulo/chiriboga/commit/41a10b00b8e1b582ab40d826451a056d0c1a1b19)
**Ticket:** `documentation/backlog/code-review/corp_ai_finding_04_mulligan_evaluation.md`

## Verdict

Approve. This replaces the old `Phase_Mulligan` — which had genuinely duplicated logic (`playableIceCount`/`handCards` computed twice, conditions 2 and 3 overlapping) — with a real expected-value model. The math is correct and the deviation from the original ticket's acceptance criteria is justified in the resolution notes, not silently dropped.

## Against the ticket's acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Strong-economy/one-ICE hand not auto-mulliganed when EV beats a fresh five | ✅ | Covered directly by the `strongHand` case in `tests/corp-mulligan.test.js`. |
| Redundant conditions 2 and `< 2` removed, behavior unchanged where they overlapped with condition 3 | ✅ (superseded) | The whole heuristic was replaced rather than patched, so "unchanged where overlapped" doesn't strictly apply anymore — but that's the right call given the diagnosis, not a miss. |
| Deterministic under a fixed seed | ✅ | No RNG anywhere — `_expectedOpeningHandCountValue` is a closed-form hypergeometric sum, not a Monte Carlo estimate. |
| Harness run before/after shows mulligan rate and hand quality measured | ⚠️ Deliberately descoped | The resolution section explains why: since HQ cards return to a known population (`HQ + R&D`) on a mulligan, the redraw EV is computed analytically rather than estimated by simulation, so the harness isn't a correctness dependency here. It's kept as a "calibration follow-up" instead of a blocker. This is a reasonable call, but it is a real deviation from the acceptance criteria as originally written — worth flagging explicitly rather than letting the ticket read as fully closed. |

## Math check

- `_combinationCount` — standard multiplicative nCk with `k = min(k, n-k)`. Correct, and floating-point error is negligible at these deck sizes (~45 cards, draws ~5).
- `_expectedOpeningHandCountValue` — bounds `minimum = max(0, draws - (population - matches))` and `maximum = min(draws, matches)` are exactly the hypergeometric support. Correct.
- `_expectedOpeningHandScore`'s ice-value term, `(summary.iceValue * draws) / cards.length`, is valid by linearity of expectation: each card's individual `iceValue` is included in a random draw with probability `draws/population`, so scaling the pool total is exact — no need to enumerate combinations for this part specifically.
- Redraw pool = `handCards.concat(corp.RnD.cards)` correctly models "mulliganed hand shuffles back into R&D, then redraw," matching the resolution note.

## Other findings

1. **Possible double-count.** In `_openingHandSummary`, `economyCount` increments unconditionally after the ice/agenda `if`/`else if` chain, so a card that is both `cardType === "ice"` and flagged `AIEconomyCard`/Transaction/Advertisement would count toward both `iceCount` and `economyCount`. Likely never happens given this game's card types, but a short comment noting the assumed mutual exclusivity (or an explicit guard) would make the intent clear to the next person touching this.
2. **Magic-number tuning arrays.** `[0, 1.5, 2.5]`, `[0, 1.25, 2.25, 2.75]`, and `[0, 0, 1.5, 4.5, 8, 12]` encode balance weights inline. Since the ticket already earmarks the batch harness for calibrating these later, naming them now (`ICE_COUNT_VALUE`, `ECONOMY_COUNT_VALUE`, `AGENDA_PENALTY`) would make that future calibration pass a one-line diff instead of a function hunt.
3. **No direct unit tests for the probability primitives.** `_combinationCount` and `_expectedOpeningHandCountValue` are only exercised indirectly through the two end-to-end `Phase_Mulligan` scenarios. A couple of cheap direct assertions (e.g. `_combinationCount(5,2) === 10`) would catch a regression in the hypergeometric math specifically, rather than only surfacing as "the final decision changed."
4. **Verification section claims tests passed** (`corp-mulligan.test.js`, `corp-decision-fixtures.test.js`, etc.) — I read the diff, not the repo state, so I can't independently confirm the run; noting it as asserted-but-unverified by me.

## Not blocking, for later

Performance is fine at current deck sizes, but if this scoring approach gets reused for the planned `Phase 10: Opening-Hand Evaluation` on the install-decision roadmap with larger populations, recomputing `_combinationCount` fresh inside the expectation loop (rather than building one Pascal's-triangle row) would be worth revisiting then — not now.
