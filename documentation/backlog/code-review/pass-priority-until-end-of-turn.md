# Pass priority until end of turn, with a persistent Resume Priority control

**Outcome:** adopted

**Raised:** 2026-10-08 · **Scope:** human-player UI and paid-ability response handling

**Verified against code:** `0a43d00` (re-checked at pickup; inspection plus `tests/pass-priority.test.js`)

## Resolution

Implemented from `0a43d00`.

**Classification:** no AI choice changes. The feature is human-only UI; `PassPriorityShouldAutoPass` is false whenever the active player has an AI, so AI-only games take the same path as before. No acceptance gate applies.

**What changed**

- `command.js` (`// BEGIN PassPriority` block): turn-scoped state `passPriority = {player, turn}`, plus `PassPriorityWindowEligible`, `PassPriorityActive`, `PassPriorityShouldAutoPass`, `PassPriorityOffered`, `PassPriorityEnable`, `PassPriorityResume`, `PassPriorityReset` and `RenderPassPriorityControl`. `EnumeratePhase()` adds **Pass until end of turn** after Continue when the human holds priority in an eligible window that has something to pass on. The button is not offered in tutorials or mentor games, where Auto skip is also hidden or the actions are scripted.
- Eligibility is an explicit list of phase objects: the ordinary paid-ability windows built from `standardResponse`, `noRezResponse` or `corpScorableResponse` (Corp 1.1, 2.1, 2.2*, 3.2; Runner 1.1, 1.3*, 2.2; Run 2.1, 3.1, 4.3, 4.5). A window is passed only when every offered command is `n`, `trigger`, `rez` or `score`. That keeps the stop for jack out (Runner in Run 4.3) and any other command. Two more stops are kept: the Runner in Run 3.1 (breaker decisions during the encounter) and a rez option for the approached ice (Corp in Run 2.1). `TriggeredResponsePhase` pseudophases are separate objects, so triggered-effect choices are never passed. These include Read-Write Share's hosting prompts. Action phases, subroutine, access and decision phases are never in the list.
- `init.js` `Main()`: when passing applies, it calls `ExecuteChosen("n")`, the same path as clicking Continue. Each opportunity is submitted once. Priority still alternates through `standardResponse.Resolve.n`, and the main loop's existing `setTimeout(mainLoopDelay)` step yields to the browser between passes. No extra delay was added.
- Resets: `ChangePhase` at the turn boundary, at the same point as `turnEventCounts` (non-`skipInit` entry to `Corp 1.1` / `Runner 1.1`); `StartGame`; the rewind handler after the state is restored; and at the start of `PlayerWin`. `PassPriorityActive` also requires `passPriority.turn === playerTurn`, so the setting cannot leak into another turn or to the other player.
- Auto skip: `PassPriorityEnable` zeroes `autoContinueTimer` and hides `#timerbar`. `PassPriorityResume` turns `autoContinue` off and zeroes the timer, so the resumed window really stops. The window's stale footer is replaced synchronously by `ExecuteChosen`, so the timer cannot click it again.
- `engine.php` / `engine_text.html`: a separate `#passpriority` container (`role="status"`, `aria-live="polite"`) outside `#footer`, so footer re-renders never move or remove it. `style.css`: fixed bottom-right, left of the history strip, `z-index` above the board. Below 720 px wide it sits above the bottom-left options panel. **Passing until end of turn** is shown as text and **Resume Priority** is a real `<button>` with a tooltip and `:focus-visible` outline. The control re-renders only when its state changes, so keyboard focus is not lost.

**Departures from the ticket**

- The ticket says passing declines optional rez where the window permits it. The approached-ice rez in Run 2.1 is treated as a consequential run decision instead and keeps its stop; asset and upgrade rez in the same window are still declined. This is the conservative reading. Paul to confirm.
- The Runner's encounter window (Run 3.1) is excluded entirely, because breaker use happens there. The Corp's paid abilities in that window are still passed.
- The control is a fixed corner element rather than a slot reserved in the canvas layout. Its exact relation to the Runner stack depends on the canvas layout, which was not run in a browser here. Manual layout verification is still open (see below).

**Plan gate:** the change touches more than three source files and `ChangePhase`, which would normally need an approved plan. It was implemented directly on the delegating instruction. The `ChangePhase` change is one guarded reset line at the existing turn-boundary check, and every other edit is additive.

**Tests:** `tests/pass-priority.test.js` (new, 9 cases) covers phase eligibility (all windows, plus jack out, encounter, approached ice, triggered pseudophase, action phase and AI players), the normal response-loop progression with Read-Write Share hosting a card, opponent actions, Main passing once per opportunity, turn lifetime on the human's and the opponent's turn, game end, Resume plus Auto skip, and AI-only games.

**Open:** manual check in the graphical UI of the placement relative to the Runner stack and options panel, resizing and small viewports, and the width of the footer with both buttons. The rewind and new-game resets are covered by inspection only.

**Validation:** `node scripts/ticket.js check documentation/backlog/code-review/pass-priority-until-end-of-turn.md` passed at handoff (116 full test files). The criteria left unticked need manual graphical-UI layout checks, or have rewind and new-game resets verified by inspection only.

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
2. Add **Pass until end of turn** beside Continue in eligible human paid-ability response windows.
3. Clicking it enables passing for that human player for the remainder of the current turn and passes the current opportunity.
4. While enabled, show a persistent **Resume Priority** button in the bottom-right area below the Runner stack, separate from the bottom-right options panel. Show supporting text: **Passing until end of turn**.
5. Clicking Resume Priority restores normal stops at the next available legal opportunity. It cannot recover an opportunity already passed.
6. At the end of the current turn, passing resets automatically and the button disappears. This means the current Corp or Runner turn, including when the human is the non-turn player; it does not mean until the human's next turn.

Reserve layout space so the control neither overlaps the stack nor covers or moves the options panel. Keep it visible when the opponent is acting and while other decisions are displayed. Verify placement on smaller viewports and when resizing. The label, active-state text, keyboard access and visible focus should make the state understandable without relying on color.

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

- [x] With Read-Write Share installed and hosting a card, Pass until end of turn removes repeated manual Continue clicks in eligible response windows for the remainder of that turn.
- [x] Read-Write Share's hosting prompts still appear, as do action, breaker/subroutine, access, and jack-out decisions while passing is enabled.
- [x] The opponent receives normal opportunities and can act; their actions do not clear the human's setting or cause skipped rules steps.
- [ ] Resume Priority remains below the Runner stack and separate from the options panel across opponent actions, decision rendering, and resizing; it can be activated by keyboard.
- [x] Resume Priority restores stops at the next legal opportunity without an old Auto skip timer immediately continuing it.
- [ ] Passing resets at the next turn boundary, new game, rewind/state restoration, and game end. Cover activation on both the human's and opponent's turn.
- [x] Automatic passes execute once per valid opportunity, remain responsive to input, and leave AI-only games unchanged.
- [ ] Add focused regression coverage for phase eligibility, turn lifetime, normal response-loop progression, and timer/resume interactions. Manually verify layout and responsiveness in the graphical UI.
- [x] Run the focused tests and then `node tests/run-all-tests.js`, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.

Before implementation, re-check derived response phases and command execution against the then-current code, particularly encounter/breaker windows and mixed windows containing jack-out decisions. The phase eligibility boundary must preserve those decisions rather than applying a blanket Continue shortcut.
