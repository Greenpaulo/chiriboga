# Subroutine overlay measurement (`subvis`)

Measures the click-overlay positions (`visual: { y, h }`) for ice
subroutines from the 300x420 card images, and audits them against the
authored values in `sets/*.js`.
## Why this exists

The subroutine click overlay (and the "broken" marker) is positioned from
a hand-authored `visual: { y, h }` on each subroutine, consumed in
`cardrenderer/cardrenderer.js` as `sub_y = -209 + visual.y` with
`h = 16 x printed lines`. Template-guessed values put the overlay above or
below the printed text (the Hagen/Afshar/Trebuchet bug: 35-67px too high).
`tests/subroutine-visual.test.js` guards the values; this tool re-measures
them from the card images when adding or fixing cards.

## Usage (from repo root)

- `node scripts/subvis/audit.js` audits every ice card with subroutines.
- `node scripts/subvis/audit.js 26035 30046` audits specific card codes.
- `node scripts/subvis/audit.js --preset ffg` forces old-FFG-frame tuning.
- `THR=155 node scripts/subvis/detect.js img.bmp` measures one BMP image.
- `node scripts/subvis/zoom.js img.bmp y0 y1 x0 x1 [thr]` dumps ASCII art
  of a pixel region for manual verification.

`audit.js` converts `images/<code>.jpg` to temp BMPs via `sips` (macOS),
runs the detector, and flags cards whose authored `visual` differs from
measured by more than 4px or whose printed line count differs.
## Workflow for a new or fixed card

1. `node scripts/subvis/audit.js <CODE>` prints the measured proposal.
2. Verify with the zoom view, e.g. dump the text box and compare the
   proposed `y` (centre) and line bands against the actual pixels.
3. Paste the verified `visual: { y, h }` into the subroutine object in
   `sets/*.js` (with the other AI hooks at the bottom of the object).
4. Run `node tests/subroutine-visual.test.js`, then the full suite
   `node tests/run-all-tests.js`.

## Detector tuning

`detect.js` reads env vars (defaults = modern NISEI frame, Gateway on):

- `BASE`/`TEXT_END` (text-box rows): 44/214 modern, 50/198 old FFG.
- `THR` (ink luma threshold): 110 modern, 155 old FFG.
- `IX0`/`IX1` (icon gutter x-range): 54/68 modern, 54/74 old FFG.
- `RUNLEN`/`IMAXSTART` (icon bar length/min start): 10/60 modern, 8/70 FFG.
- `JOIN` (max gap joining continuation lines): 17.5 modern, 16 FFG.

`coreset.js` and `creationandcontrol.js` need the FFG tuning, e.g.
`THR=155 BASE=50 TEXT_END=198 IX0=54 IX1=74 RUNLEN=8 IMAXSTART=70 JOIN=16`.

## Do NOT trust blindly

Always eyeball flagged cards with `zoom.js`. Known traps: the
artist-credit strip joining the last subroutine, faint/thin text lines,
3+ line subroutines with wide gaps, alternate arts, other resolutions.

## Re-running the full process (entry point)

`scripts/measure-subroutine-visual.js` is the stable entry point; it
forwards to `scripts/subvis/audit.js` (implementation). From the repo root:

- `node scripts/measure-subroutine-visual.js` — audit every ice card.
- `node scripts/measure-subroutine-visual.js 26035 30046` — specific cards.
- `node scripts/measure-subroutine-visual.js --preset ffg` — force old-frame
  tuning for every card (otherwise auto-selected per set file).
- `node scripts/subvis/zoom.js <bmp> <y0> <y1> <x0> <x1> [thr]` — verify a
  flag against the pixels before editing `sets/*.js`.
- `node tests/subroutine-visual.test.js` — regression guard; then the full
  suite with `node tests/run-all-tests.js`.

Converted BMPs are cached in `scripts/subvis/.work/` (git-ignored); delete
that directory to force fresh `sips` conversions. Requires `images/*.jpg`
(see `scripts/download_images.py`) and macOS `sips`.

## Limitations (read before trusting output)

- The detector is a heuristic aid, not ground truth: icon-glyph variants,
  faint/thin text, 3+ line subroutines with wide gaps, the artist-credit
  strip joining the last subroutine, alternate arts, and non-300x420 images
  can all shift or miscount lines.
- New frames, promos, or alternate arts need re-tuned presets; add them to
  `PRESETS`/`FFG_FILES` in `audit.js` and document them here.
- Every flag must be eyeballed with `zoom.js` before writing values into
  `sets/*.js`.
