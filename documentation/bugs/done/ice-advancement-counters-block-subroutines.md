# ICE advancement counters obscure subroutines while breaking them

**Source:** Bug 6 in `documentation/bugs/bugs2.md`  
**Files:** `cardrenderer/cardrenderer.js`, `tests/advancement-counter-subroutine.test.js`  
**Status:** Fixed and regression-tested on 21 September 2026.

---

## 1. Summary

When the Runner encountered an advanced piece of ICE and chose subroutines to break, the advancement-counter icon and number remained drawn over the enlarged card. Because card counters are positioned over the body of a card, the overlay could cover the printed subroutine text and make the break choices difficult to read.

The renderer now temporarily hides the advancement counter on the ICE whose subroutines are being selected. It restores the counter as soon as that selection ends. This is a display-only fix: the advancement-counter value and all game rules remain unchanged.

---

## 2. Root cause

Every card counter is rendered as an icon and text attached to the card sprite. `CardRenderer.UpdateCounters()` runs every frame so counter overlays stay upright while cards rotate, but it previously applied the same visibility rule in every UI state: a counter was visible whenever its value was non-zero.

During subroutine selection, the encountered ICE is enlarged and the clickable subroutine overlays are placed against the printed subroutine rows. Its advancement counter remained visible in the center of that same card, leaving the counter artwork above the text the Runner needed to inspect.

This was not a subroutine-enumeration or breaking error. The legal choices were still created; the persistent counter overlay made them hard to read.

---

## 3. Fix

Added a mode-aware visibility check to the per-frame counter update. It hides a counter only when all three conditions are true:

1. The current choices are exclusively subroutine choices.
2. The counter belongs to the ICE relevant to the current approach or encounter.
3. The counter is an advancement counter.

`Counter.UpdateVisibility()` centralizes normal zero-value visibility and the temporary override. Because it runs every frame, the icon and number disappear for the duration of subroutine selection and return immediately afterward according to their ordinary visibility rule.

The scope is deliberately narrow. Advancement counters on other cards remain visible, and power, virus, credit, and other counter types on the encountered ICE are not affected.

---

## 4. Acceptance criteria

- [x] An advancement counter on the encountered ICE is hidden while the Runner chooses subroutines to break.
- [x] Both the counter icon and its number are hidden, leaving the printed subroutine text and selection overlays readable.
- [x] The advancement counter returns when subroutine selection ends.
- [x] Advancement counters on other cards are not hidden.
- [x] Other counter types on the encountered ICE are not hidden.
- [x] Counter values and gameplay state are not changed by the display fix.
- [x] Focused renderer regression coverage is added.
- [x] The existing card zoom-layer regression still passes.
- [x] JavaScript syntax and `git diff --check` pass.

---

## 5. Regression coverage

Added `tests/advancement-counter-subroutine.test.js`. It exercises the renderer's real visibility predicate and verifies:

1. The relevant ICE's advancement counter is hidden during subroutine selection.
2. It is no longer hidden once selection ends.
3. Another card's advancement counter remains visible.
4. A different counter type on the relevant ICE remains visible.
5. The per-frame renderer applies the visibility rule.

---

## 6. Verification

- `node tests/advancement-counter-subroutine.test.js`: **5 regression cases passed**.
- `node tests/card-zoom-layer.test.js`: **5 regression cases passed**.
- All `tests/*.test.js` regression files pass.
- `node --check cardrenderer/cardrenderer.js`: passes.
- `git diff --check`: passes.

---

## 7. Implementation record (2026-09-21)

Separated counter visibility from counter-value animation and applied the subroutine-selection override from the renderer's existing per-frame counter update. The implementation does not remove or alter advancement counters; it only suppresses their two visual elements while the Runner is making the affected choice.
