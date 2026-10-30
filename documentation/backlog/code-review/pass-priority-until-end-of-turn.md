# Pass priority until end of turn, with a persistent Resume Priority control

**Outcome:** adopted

**Raised:** 2026-10-08 · **Scope:** human-player UI and paid-ability response handling

**Verified against code:** `0a43d00` (re-checked at pickup; inspection plus `tests/pass-priority.test.js`)

## Resolution

Implemented from `0a43d00`.

**Classification:** no AI choice changes. The feature is human-only UI; `PassPriorityShouldAutoPass` is false whenever the active player has an AI, so AI-only games take the same path as before. No acceptance gate applies.

**What changed**

- `command.js` (`// BEGIN PassPriority` block): turn-scoped state `passPriority = {player, turn}`, plus `PassPriorityWindowEligible`, `PassPriorityActive`, `PassPriorityShouldAutoPass`, `PassPriorityOffered`, `PassPriorityEnable`, `PassPriorityResume`, `PassPriorityReset` and `RenderPassPriorityControl`. `EnumeratePhase()` adds **Auto-pass priority** after Continue when the human holds priority in an eligible window that has something to pass on. The button is not offered in tutorials or mentor games, where Auto skip is also hidden or the actions are scripted.
- Eligibility is an explicit list of phase objects: the ordinary paid-ability windows built from `standardResponse`, `noRezResponse` or `corpScorableResponse` (Corp 1.1, 2.1, 2.2*, 3.2; Runner 1.1, 1.3*, 2.2; Run 2.1, 3.1, 4.3, 4.5). A window is passed only when every offered command is `n`, `trigger`, `rez` or `score`. That keeps the stop for jack out (Runner in Run 4.3) and any other command. Two more stops are kept: the Runner in Run 3.1 (breaker decisions during the encounter) and a rez option for the approached ice (Corp in Run 2.1). `TriggeredResponsePhase` pseudophases are separate objects, so triggered-effect choices are never passed. These include Read-Write Share's hosting prompts. Action phases, subroutine, access and decision phases are never in the list.
- `init.js` `Main()`: when passing applies, it calls `ExecuteChosen("n")`, the same path as clicking Continue. Each opportunity is submitted once. Priority still alternates through `standardResponse.Resolve.n`, and the main loop's existing `setTimeout(mainLoopDelay)` step yields to the browser between passes. No extra delay was added.
- Resets: `ChangePhase` at the turn boundary, on non-`skipInit` entry to the actual `corpStartDraw` / `runnerStartResponse` phase objects (decision phases inheriting their identifiers do not reset passing); `StartGame`; the rewind handler after the state is restored; and at the start of `PlayerWin`. `PassPriorityActive` also requires `passPriority.turn === playerTurn`, so the setting cannot leak into another turn or to the other player.
- Auto skip: `PassPriorityEnable` zeroes `autoContinueTimer` and hides `#timerbar`. `PassPriorityResume` turns `autoContinue` off and zeroes the timer, so the resumed window really stops. The window's stale footer is replaced synchronously by `ExecuteChosen`, so the timer cannot click it again.
- `engine.php` / `engine_text.html`: a separate `#passpriority` container (`role="status"`, `aria-live="polite"`) outside `#footer`, so footer re-renders never move or remove it. `style.css`: fixed bottom-right, left of the history strip. The control overlays the full-height board at the bottom right only while passing is active; no canvas space is reserved. **Auto-passing priority** is shown above the **Resume Priority** `<button>`, with a tooltip and `:focus-visible` outline. During card zoom, both bottom panels remain above the canvas for pointer access; reading previews fit and stay above their visible rectangles. The control re-renders only when its state changes, so keyboard focus is not lost.

**Departures from the ticket**

- The ticket says passing declines optional rez where the window permits it. The approached-ice rez in Run 2.1 is treated as a consequential run decision instead and keeps its stop; asset and upgrade rez in the same window are still declined. This is the conservative reading. Paul to confirm.
- The Runner's encounter window (Run 3.1) is excluded entirely, because breaker use happens there. The Corp's paid abilities in that window are still passed.
- Owner correction (2026-10-28): reserve no space for the control. Removed the permanent 145 px canvas reduction, which raised the Grip clipping boundary and left a gap above the footer. Resume Priority is a content-sized bottom-right overlay visible only while passing is active. The original browser checks below did not establish preservation of the overall board layout.

**Plan gate:** the change touches more than three source files and `ChangePhase`, which would normally need an approved plan. It was implemented directly on the delegating instruction. The `ChangePhase` change is one guarded reset line at the existing turn-boundary check, and every other edit is additive.

**Tests:** `tests/pass-priority.test.js` (13 cases) covers phase eligibility (all windows, plus jack out, encounter, approached ice, triggered pseudophase, action phase and AI players), the normal response-loop progression with Read-Write Share hosting a card, opponent actions, Main passing once per opportunity, turn lifetime on the human's and the opponent's turn, game end, Resume plus Auto skip, and AI-only games. PR remediation adds real Rime rez enumeration, `StartGame`, the registered rewind handler after restoration, and decision phases inheriting turn-start identifiers. Mutation checks confirmed the ICE, new-game and rewind regressions fail when their relevant repair/reset is removed.

**PR review remediation (2026-10-28):** accepted the ICE finding: only an offered approached ICE rez preserves the stop; Rime offered as an optional non-approached rez allows offering and continuing passing. Adapted the layout/reset pre-merge finding with the reserved rail and executable reset tests. Browser verification used Brave/Playwright with the real graphical renderer at 1440×1000, 800×600, 390×844, 320×568 and 844×390: opponent-action enumeration, real `DecisionPhase`/`MakeChoice` rendering, canvas/control/footer separation, resizing, Tab focus, visible focus outline and Enter activation of Resume Priority all passed without page errors. Continue and Pass until end of turn also fit within the real footer with Read-Write Share installed at desktop, phone and landscape sizes. The landscape screenshot was visually inspected. This also exposed and repaired the inherited-identifier reset: decision prompts at turn start now retain passing.

**Owner hand-readability follow-up (2026-10-28):** increased the viewing player’s hand card scale and fan spacing/offsets by 10%, for Runner and Corp. Shared base-scale calculation keeps cascade extents and hover targets consistent and restores ordinary scale when cards leave hand. Opponent hands, dragged cards and the 150% reading-preview target retain their existing sizes. Focused zoom/preview/hand regressions passed on Node 20.19.0; `node tests/run-all-tests.js --fast` passed (132 files, exit 0); `git diff --check` passed. No full-game browser check performed for this follow-up.

**Owner priority-size restoration (2026-10-28):** restored the pre-compaction Resume Priority panel styling, default button sizing and Auto-passing priority status line. Kept both panels beneath zoomed cards, the full-height board and larger card previews. Focused pass-priority and zoom regressions passed on Node 20.19.0; `git diff --check` passed.

**Owner card-readability follow-up (2026-10-28):** the owner had been using 150% browser zoom to read cards. Increased the enlarged-card target to 450 × 628.5 CSS px at 100% browser zoom, retaining the existing viewport caps, ordinary card sizes and drag override. Clamped scale-animation speed to remain positive at larger targets on zoomed-out boards. Expanded the existing zoom regression to exercise the actual scale/animation block at board zoom 1, 2 and 4, narrow/landscape viewport caps, hidden/viewable cards and dragging. Focused regression passed on Node 20.19.0; `node tests/run-all-tests.js --fast` passed (132 files, exit 0); `git diff --check` passed. No full-game browser check performed for this follow-up.

**Owner zoom/size correction (2026-10-28):** removed the footer zoom-layer override and lowered the priority control below the zoomed canvas. Removed the redundant active-status line and outer panel styling; Resume Priority uses compact padding and type. Updated the existing zoom-layer regression to enforce both panels below zoomed cards. Focused zoom/pass-priority regressions passed; `node tests/run-all-tests.js --fast` passed (132 files, exit 0, Node 20.19.0); `git diff --check` passed. A headless Brave check using actual rendered control markup and repository CSS at 1440, 800, 390 and 320 px viewport widths confirmed both stacking relationships and control bounds of roughly 135–137 × 22–26 px. This was a CSS/control check, not a full-game browser replay.

**Owner wording clarification (2026-10-28):** renamed the offered button to **Auto-pass priority** and initially active status to **Auto-passing priority**, retaining **Resume Priority** (the status line was subsequently restored at the owner’s request). The tooltip explicitly says optional priority windows are passed for the rest of this turn and required choices still pause. Focused pass-priority tests passed (13 cases, Node 20.19.0).

**Owner layout correction validation (2026-10-28):** Node 20.19.0: `node tests/pass-priority.test.js` passed (13 cases); `node tests/run-all-tests.js --fast` passed (132 files, exit 0); `git diff --check` passed. No new browser verification performed for this correction.

**PR zoom review remediation (2026-10-29):** keep footer and Resume Priority controls above the canvas for pointer access, and fit/reposition reading previews above the actual visible bottom-control rectangles with a 4 px gap. This affects only previews; the board keeps its full viewport. Bounds use each frame’s actual rotation, including intermediate angles, and convert the available screen area into stage coordinates for both viewers. The viewing Runner’s Grip uses its original spacing; stationary, unzoomed hand presses retain their hand scale until real dragging crosses the movement threshold. Focused zoom and pass-priority regressions passed; mutation checks failed for both the former destination-only fit and omitted control avoidance. Graphical Brave/Playwright checks passed for Runner and Corp at 1440×1000, 390×844 and 844×390, checking 40 animation frames per case, screen/control separation, button hit testing and actual Resume Priority clicks, without page errors. Final `node tests/run-all-tests.js --fast` passed (132 files, exit 0, Node 20.19.0); `git diff --check` passed.

**Validation:** `node scripts/ticket.js check documentation/backlog/code-review/pass-priority-until-end-of-turn.md` passed at handoff (116 full test files). PR remediation: focused regression (13 cases), reset/ICE mutation checks, and graphical browser checks passed on Node 20.19.0; `node tests/run-all-tests.js --fast` passed (132 files, exit 0), including corp decision fixtures and decision snapshots. `git diff --check` passed.

## Problem

Cards with broadly available paid abilities repeatedly stop progression at response windows. Read-Write Share is the motivating example: once it has hosted cards, its trash ability remains available throughout many Runner and Corp timing windows. The player must repeatedly click Continue even when they have no intention of using it. The reported roughly 20 clicks per combined Runner/Corp turn sequence is a user observation, not a measured count.

The ability's availability is legitimate; restricting its gameplay timing would not solve the UI problem correctly.

## Current code evidence

- [Read-Write Share](../../../sets/vantagepoint.js) (`cardSet[36022]`): the trash ability's `Enumerate` returns a choice whenever `hostedCards.length >= 1`. The install and Runner-turn-begins prompts are separate response hooks.
- [phase.js](../../../phase.js): `phaseTemplates.standardResponse.Enumerate.trigger` uses `ChoicesTriggerableAbilities(activePlayer)`. Its `Resolve.n` handles passing, opponent opportunities, and advancing the phase. `noRezResponse` and the scoring response template build on this behavior.
- [command.js](../../../command.js): `EnumeratePhase()` builds legal options and renders Continue. It offers the existing Auto skip control when Continue is the only button but other card options exist.
- [utility.js](../../../utility.js): `AutoContinueButtonHTML()` toggles the existing global `autoContinue` setting.
- [cardrenderer/cardrenderer.js](../../../cardrenderer/cardrenderer.js): the visible timer bar drives Auto skip and clicks Continue after `autoContinueLimit`, currently one second in [init.js](../../../init.js).
- [phase.js](../../../phase.js): `ChangePhase()` updates `playerTurn` on entry to `Corp 1.1` / `Runner 1.1`. A change of active player within a response window is not a turn boundary.
- [engine.php](../../../engine.php) defines `#footer`; command rendering replaces its contents repeatedly. The persistent Resume Priority control needs a separate container.

## Agreed UI

1. Keep **Continue** as passing the current opportunity.
2. Add **Auto-pass priority** beside Continue in eligible human paid-ability response windows.
3. Clicking it enables passing for that human player for the remainder of the current turn and passes the current opportunity.
4. While enabled, show a persistent **Resume Priority** button in the bottom-right area below the Runner stack, separate from the bottom-right options panel. Show supporting text: **Auto-passing priority**. Owner restored the original panel size and status line after switching from 150% browser zoom.
5. Clicking Resume Priority restores normal stops at the next available legal opportunity. It cannot recover an opportunity already passed.
6. At the end of the current turn, passing resets automatically and the button disappears. This means the current Corp or Runner turn, including when the human is the non-turn player; it does not mean until the human's next turn.

Owner clarification (2026-10-28): reserve no layout space. Show the control at the bottom right only while passing is active, preserving the existing full-height board and fixed options panel. Keep it visible when the opponent is acting and while other decisions are displayed. Verify placement on smaller viewports and when resizing. The label, active-state text, keyboard access and visible focus should make the state understandable without relying on color.

## Behavioral boundaries

- Automatically pass only ordinary paid-ability response opportunities. Identify eligible phases explicitly by their timing behavior; the existence of an `n` command or a Continue button alone is insufficient.
- Passing intentionally declines paid abilities and, where that response window permits them, optional rez/scoring opportunities for the human. Explain this in the control's tooltip/help text.
- Continue to stop for triggered-effect choices, including Read-Write Share's hosting prompts, and for action-phase choices, breaker/subroutine decisions, access decisions, jack-out choices, and any other consequential decision outside the eligible response windows.
- Leave legal ability enumeration and card rules intact. Submit the normal Continue action through the existing response loop so opponent actions and required timing steps still occur. Do not jump directly to the next phase or alter AI choices.
- Keep the state scoped to the human player and current turn. Reset it on a new game, rewind/state restoration, and game end; it must not leak into another turn or player.
- Coordinate this feature with existing Auto skip. Resume Priority must restore actual stops, including disabling/resetting any existing auto-skip behavior that would otherwise immediately pass the resumed window. Do not allow competing timers to submit stale or duplicate actions.
- Automatic progression must yield to browser input/rendering so Resume Priority can be clicked while the game progresses. Do not add a one-second pause at every skipped response window; that would retain the existing pacing problem.

## Scope

Implement turn-scoped passing and the persistent resume control. Per-ability stop settings, a new card ability panel, and a clickable timing tracker are separate possible follow-ups, not part of this ticket. No change to Read-Write Share's rules or AI card hooks is required.

## Acceptance criteria and validation

- [x] With Read-Write Share installed and hosting a card, Auto-pass priority removes repeated manual Continue clicks in eligible response windows for the remainder of that turn.
- [x] Read-Write Share's hosting prompts still appear, as do action, breaker/subroutine, access, and jack-out decisions while passing is enabled.
- [x] The opponent receives normal opportunities and can act; their actions do not clear the human's setting or cause skipped rules steps.
- [x] Resume Priority remains below the Runner stack and separate from the options panel across opponent actions, decision rendering, and resizing; it can be activated by keyboard.
- [x] Resume Priority restores stops at the next legal opportunity without an old Auto skip timer immediately continuing it.
- [x] Passing resets at the next turn boundary, new game, rewind/state restoration, and game end. Cover activation on both the human's and opponent's turn.
- [x] Automatic passes execute once per valid opportunity, remain responsive to input, and leave AI-only games unchanged.
- [x] Add focused regression coverage for phase eligibility, turn lifetime, normal response-loop progression, and timer/resume interactions. Manually verify layout and responsiveness in the graphical UI.
- [x] Run the focused tests and then `node tests/run-all-tests.js`, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.

Before implementation, re-check derived response phases and command execution against the then-current code, particularly encounter/breaker windows and mixed windows containing jack-out decisions. The phase eligibility boundary must preserve those decisions rather than applying a blanket Continue shortcut.
