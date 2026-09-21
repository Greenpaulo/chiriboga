# Debug menu does not close when clicking outside the popup

**Source:** Bug 5 in `documentation/bugs/bugs2.md`  
**Files:** `engine.php`, `init.js`, `tests/debug-menu-dismiss.test.js`  
**Status:** Fixed and regression-tested on 21 September 2026.

---

## 1. Summary

The in-game debug menu could be dismissed with its **X** button, but clicking the shaded area outside the popup did nothing. At increased browser zoom, the **X** could be pushed off-screen, forcing the player to zoom out before they could close the menu.

The debug modal now handles clicks on its backdrop. It closes only when the backdrop itself is the event target, so clicks within the popup—including buttons, the card selector, and other controls—continue to work without dismissing it.

---

## 2. Root cause

`#debug-modal` had markup for the overlay and an explicit close control:

```html
<div id="debug-modal" class="modal">
  <div class="solo-menu">
    <span class="menu-close" onclick="$('#debug-modal').css('display','none');">✕</span>
```

However, neither the overlay nor `init.js` had a click handler for backdrop dismissal. The full-screen `.modal` element received the outside click, but no code changed its display state.

Closing the modal for every bubbled click would be incorrect because clicks on the popup's controls also bubble to the overlay. The handler therefore has to distinguish a direct backdrop click from a click originating inside `.solo-menu`.

---

## 3. Fix

Added `debugCloseOnBackdrop(event)` to the debug menu action handlers in `init.js`:

```js
function debugCloseOnBackdrop(event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.style.display = 'none';
  }
}
```

`#debug-modal` invokes this handler from its click event. When the user clicks the backdrop, `event.target` and `event.currentTarget` are both the modal overlay and it closes. For a click within `.solo-menu`, `event.target` is the inner element, the condition is false, and the popup stays open.

The existing **X** close button is unchanged.

---

## 4. Acceptance criteria

- [x] Clicking the shaded backdrop outside the debug popup closes the debug menu.
- [x] The menu can still be dismissed by clicking outside when browser zoom pushes the **X** off-screen.
- [x] Clicking inside the debug popup does not close it.
- [x] Debug-menu buttons and form controls can still be used without the backdrop handler dismissing the popup.
- [x] The existing **X** close button remains available and unchanged.
- [x] A regression test covers both backdrop and inner-popup clicks and confirms that the modal is wired to the handler.
- [x] JavaScript and PHP syntax checks pass.
- [x] `git diff --check` passes.

---

## 5. Regression coverage

Added `tests/debug-menu-dismiss.test.js`. It executes the real handler from `init.js` and verifies:

1. A direct click on the debug modal backdrop changes its display state from `flex` to `none`.
2. A bubbled click whose target is inside the popup leaves the display state as `flex`.
3. The `#debug-modal` markup invokes the backdrop handler.

---

## 6. Verification

- `node tests/debug-menu-dismiss.test.js`: **3 regression cases passed**.
- All 12 `tests/*.test.js` regression files pass.
- `node -c init.js`: passes.
- `php -l engine.php`: passes with no syntax errors.
- `git diff --check`: passes.

---

## 7. Implementation record (2026-09-21)

Added the target/current-target guard and connected it to the debug modal overlay. This is intentionally scoped to the debug menu; no dismissal behavior was changed for the main game menu, deck-info dialog, loading overlay, or hostile-takeover dialog.
