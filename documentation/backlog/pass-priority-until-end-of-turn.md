# Pass priority until end of turn, with a persistent Resume Priority control

**Raised:** 2026-10-08 · **Scope:** human-player UI and paid-ability response handling

**Verified against code:** `5112bf38d93a1cbd3908a7a2acdc27dbe21cf38f` (inspection; no runtime reproduction added)

## Problem

Cards with broadly available paid abilities repeatedly stop progression at response windows. Read-Write Share is the motivating example: once it has hosted cards, its trash ability remains available throughout many Runner and Corp timing windows. The player must repeatedly click Continue even when they have no intention of using it. The reported roughly 20 clicks per combined Runner/Corp turn sequence is a user observation, not a measured count.

The ability's availability is legitimate; restricting its gameplay timing would not solve the UI problem correctly.

## Current code evidence

- [Read-Write Share](../../sets/vantagepoint.js) (`cardSet[36022]`): the trash ability's `Enumerate` returns a choice whenever `hostedCards.length >= 1`. The install and Runner-turn-begins prompts are separate response hooks.
- [phase.js](../../phase.js): `phaseTemplates.standardResponse.Enumerate.trigger` uses `ChoicesTriggerableAbilities(activePlayer)`. Its `Resolve.n` handles passing, opponent opportunities, and advancing the phase. `noRezResponse` and the scoring response template build on this behavior.
- [command.js](../../command.js): `EnumeratePhase()` builds legal options and renders Continue. It offers the existing Auto skip control when Continue is the only button but other card options exist.
- [utility.js](../../utility.js): `AutoContinueButtonHTML()` toggles the existing global `autoContinue` setting.
- [cardrenderer/cardrenderer.js](../../cardrenderer/cardrenderer.js): the visible timer bar drives Auto skip and clicks Continue after `autoContinueLimit`, currently one second in [init.js](../../init.js).
- [phase.js](../../phase.js): `ChangePhase()` updates `playerTurn` on entry to `Corp 1.1` / `Runner 1.1`. A change of active player within a response window is not a turn boundary.
- [engine.php](../../engine.php) defines `#footer`; command rendering replaces its contents repeatedly. The persistent Resume Priority control needs a separate container.

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

- [ ] With Read-Write Share installed and hosting a card, Pass until end of turn removes repeated manual Continue clicks in eligible response windows for the remainder of that turn.
- [ ] Read-Write Share's hosting prompts still appear, as do action, breaker/subroutine, access, and jack-out decisions while passing is enabled.
- [ ] The opponent receives normal opportunities and can act; their actions do not clear the human's setting or cause skipped rules steps.
- [ ] Resume Priority remains below the Runner stack and separate from the options panel across opponent actions, decision rendering, and resizing; it can be activated by keyboard.
- [ ] Resume Priority restores stops at the next legal opportunity without an old Auto skip timer immediately continuing it.
- [ ] Passing resets at the next turn boundary, new game, rewind/state restoration, and game end. Cover activation on both the human's and opponent's turn.
- [ ] Automatic passes execute once per valid opportunity, remain responsive to input, and leave AI-only games unchanged.
- [ ] Add focused regression coverage for phase eligibility, turn lifetime, normal response-loop progression, and timer/resume interactions. Manually verify layout and responsiveness in the graphical UI.
- [ ] Run the focused tests and then `node tests/run-all-tests.js`, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.

Before implementation, re-check derived response phases and command execution against the then-current code, particularly encounter/breaker windows and mixed windows containing jack-out decisions. The phase eligibility boundary must preserve those decisions rather than applying a blanket Continue shortcut.
