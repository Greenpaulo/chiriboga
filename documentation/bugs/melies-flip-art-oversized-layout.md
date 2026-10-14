# CSS: Méliès U flip faces are oversized, crop art and space out the board

**Source log:** `documentation/debug-logs/bug_raised/css_bug_after_melies_identity_flips.txt`
**Reproduction:** `tests/pending/melies-flip-art-oversized-layout.test.js` — `node tests/pending/melies-flip-art-oversized-layout.test.js` (fails at `2dc504d`, 2026-10-14)

## Summary
When Méliès U: Only the Brightest (36036) flips to a department side, the art renders zoomed so only ~a quarter shows inside the card template, and R&D, ice and remotes space out as if an invisible oversized image pushed them apart. This happens on flip, not on hover-zoom. The three department assets (`images/36036-0/1/2.webp`) are 750x1050 while standard card art is 300x420, and the renderer measures layout and masks at fixed scale assuming standard size — so the flipped identity both overflows its frame and inflates the field layout.

## Evidence
- Log line 138: `Méliès U: Only the Brightest flipped to Tenure Floors` (the flip moment).
- Asset sizes (VP8 headers + `file`): `36036-0/1/2.webp` are 750x1050; `36036.jpg` is 300x420; `35023-0.jpg` (Dewi flip side) is 300x420.
- Reporter: "the art seems to zoom far too much so only a quarter of it is shown in the boundary of the card template, and the entire UI and all the cards around it i.e. R&D, ICE and remote servers space out like the art has overlapped the template (but invisible) and pushed the other cards away".

## Reproduction
`tests/pending/melies-flip-art-oversized-layout.test.js` asserts each flip face is 300x420 (webp VP8 header parse) plus a control that `36036.jpg` is standard size, and checks the 750x1050 texture against the fixed `defaultMaskDimensions` (280x243) mask window (~35% visible). Current output: `4 case(s) failed` — 3 size assertions plus the mask-coverage assertion; control passes.

## Root cause
- [Verified] Flip faces are 750x1050 vs 300x420 standard — pending test (binary header parse + `file`).
- [Verified] `Card.Extents()` measures `sprite.getBounds()` at fixed 0.5 scale and `Cascade` sizes `HQWidth`/`totalServersWidth`/`largestServerHeight`/`fieldZoom` (init.js) from those extents — code read, function names recorded.
- [Verified] Card masks and screen-fit assume standard art: `defaultMaskDimensions = {x:-140,y:-203,w:280,h:243}`, "assumes image dimensions 300x419" (cardrenderer.js).
- [Inferred] At 0.5 scale the flip texture's extents (375x525) vs standard (150x210) inflate the HQ cascade and field-zoom (spacing out R&D/ice/remotes) while the fixed 280x243 mask crops the art to ~35% — matches the reported symptom exactly. Not yet observed live in a browser session.
- [Inferred] Likely also affects the deckbuilder/lightbox paths using the same `imageFile` (untested here).

## Proposed fix
Normalize the art or the pipeline, not one board: resize `36036-0/1/2.webp` to 300x420 to match every other card face (cheapest, matches Dewi's 35023-0.jpg precedent), or make `_showIdentityFace`/texture loading scale-normalize flip art. Touchpoints: `images/36036-*.webp`, `_departmentImageFile`/`_showIdentityFace` (sets/vantagepoint.js), `Extents`/masks (cardrenderer/cardrenderer.js). Rejected: per-card layout exceptions or zoom-state hacks — the assets should conform to the renderer's standard size.

## Acceptance gate
N/A — deterministic fix (principle 4): the Méliès U department faces render at standard card-art size and the board layout is unchanged by the flip.

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged.
- [ ] A browser/manual check confirms the flip face fills the template and R&D/ice/remotes don't shift on flip.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Separate, real AI bug from the same log kept as-is: `documentation/bugs/melies-secret-department-choice-ignored.md` (Corp AI ignores the secret department choice; its pending test fails `0 !== 1`). Not a hallucination — verified by `node tests/pending/melies-secret-department-choice-ignored.test.js`.
