# Engine: The Class Act draws before its interrupt and hides its bottoming choices

**Outcome:** adopted

## Resolution

Implemented from `3caa75d`, 2026-10-27.

`Draw` now resolves applicable `responseOnWouldDraw` interrupts before moving
cards, then resumes the original draw once. Modifiers run once, first-draw
accounting includes draws made before installation and reserves the occurrence
before nested draws, post-draw observers receive the actual cards, and the
completion callback follows those observers in its supplied context. Zero
modified draws complete the callback without consuming the first draw;
positive empty-stack draws still count. Draws with no applicable interrupt
retain their immediate numeric return; suspended draws return `undefined` and
use the existing completion callback. Corp deck-out behavior is retained.

Class Act now bottoms a real looked-at stack card before the draw instead of
swapping cards afterward. Its ordinary card options use the shared graphical
grid, and a generic phase-scoped private look grants only the Runner access to
those choices. Leaving the decision clears the grid and resize cache. No
persistent known/revealed flags are added. Baseline AI bottoming priorities are
preserved, with duplicate candidates evaluated among the looked-at cards as
well as installed cards and grip. No AI hook contract changed and no strategic
option/gate is needed: the acceptance oracle is rules, timing and visibility.

### Draw-path audit

Audited every production `Draw`/`BasicActionDraw` occurrence in all set files,
`mechanics.js`, `utility.js`, `phase.js`, `command.js` and `init.js`, plus direct
stack/grip mutations and the callers' surrounding continuation code. This
includes nonplayable and deprecated sets, as requested by the completeness
clarification. All gameplay draw instructions use the shared draw function;
there was no separate card-effect draw primitive to migrate.

- Basic click draws already use completion callbacks. Mulligan now advances
  its phase through the draw callback. No production caller consumes a numeric
  draw result except `BasicActionDraw` forwarding it; its contract is updated.
- Event, paid-ability and triggered draws during runs, either player's turn,
  install/trash/damage resolution and end-of-discard draw-four all use the
  interrupt-capable path. Existing callbacks (including Earthrise Hotel's empty
  check, the identity
  draw-then-sabotage effect and draw-then-lose-click events) remain the
  continuation mechanism. Sound suppression and display
  refreshes after a draw request do not move cards or advance the phase.
- Side Hustle and Nurse Hạnh formerly drew inside automatic hooks whose callers
  can immediately open another window. Their automatic hooks now only record
  synchronous state; payout/drawing runs in the existing install/run-begin or
  breach response window. Exile, Wyldside, DreamNet and Joy Ride also stop
  treating potentially interactive draws as automatic responses. DreamNet's
  trailing credit and Wyldside's click loss now follow the draw callback;
  Levy AR Lab Access's removal and Professional Contacts' completion log do too.
- Gourmand's accessed card ends its access immediately when trashed, as required
  by the existing zone-change rule in `MoveCard`; its trailing `ResolveAccess`
  is then a no-op and does not advance a phase. The real-engine regression
  checks that this access ending coexists with the interrupted draw.
- The debug draw shortcut now calls `Draw` for either side rather than directly
  mutating arrays. Initial five-card setup remains a setup transfer before
  installed resources are active. Search/reveal-and-add effects (including
  MuslihaT and Ping) are transfers, not draws, and retain their behavior.

### Verification and documentation

- Original pending reproduction: 0/4 before the fix, 4/4 afterward; moved
  byte-for-byte to `tests/class-act-pre-draw-card-display.test.js`.
- `node tests/downfall-batch4.test.js`: 37 real-engine cases passed, including
  private visibility/cleanup, modifiers and callback identities/order/context,
  nested draws, first/later draws, installation after a draw, both turns,
  draw-four on both discard phases, zero/short/empty stacks, normal/Corp draws,
  debug draws, baseline AI and Side Hustle/Nurse/Exile/DreamNet/Gourmand paths.
- `node tests/vantagepoint-integration.test.js`: passed with the Nurse response
  lifecycle covered. `node tests/agent-scripts.test.js`: passed for the checksum
  fallback and existing workflow checks.
- Broader editing checkpoint: `node tests/run-all-tests.js --fast` passed,
  exit 0, 119 files (`/tmp/class-act-fast.log`, `/tmp/class-act-fast.exit`).
- Browser: isolated headless Brave via Playwright, actual local PHP game engine
  at 1440×1000. Readable T400 Memory Diamond and Sure Gamble faces appeared in
  the shared grid while grip was empty; an actual pointer click on T400 put it
  at stack index 0, drew Sure Gamble and cleared private look/grid cache. No page
  errors. Switching the viewer to Corp produced no card faces, no private look
  permission and an empty private grid cache. Evidence: `/tmp/class-act-choice.png` and
  `/tmp/class-act-after-choice.png`.
- Final validation: `node scripts/ticket.js check documentation/bugs/code-review/class-act-pre-draw-card-display.md`
  passed with exit 0: 122 full test files passed, unchanged reproduction verified
  by its recorded checksum, and reproduction passed. Output and exit status:
  `/tmp/class-act-ticket-check.log`, `/tmp/class-act-ticket-check.exit`.
  The final suite criterion was ticked after collecting this result; the
  check's sole warning recorded that then-unticked criterion. This result-note
  update changes no tested source, tests or workflow metadata.

Updated engine patterns and Downfall implementation notes. Current Runner
architecture does not describe this card's old timing, so no architecture or
AI-hook documentation change was needed.

Departure from the plan: the supplied reproduction was untracked at pickup,
so its original version cannot be recovered from Git history. Recorded its
SHA-256 before moving it and added a narrowly scoped ticket-check fallback
which requires an exact whole-file byte match when Git history is unavailable;
changed assertions and even changed line endings fail. Git history remains
preferred. Documented that workflow and covered the fallback in the existing
agent-script suite. No commits made.

Out-of-scope finding: Side Hustle's existing payout trashes itself with
`MoveCard`, bypassing the normal trash-response pipeline. This ticket preserves
that existing behavior while moving its draw out of the automatic hook; a
separate card-rules audit should address its trash-trigger semantics.

## Implementation plan

Proposed at `3caa75d`, 2026-10-27. **Approved 2026-10-27.**

- **Validation:** Re-ran `node tests/pending/class-act-pre-draw-card-display.test.js` at the starting commit: all four cases fail for the recorded reasons (exit 1). The current `Draw` moves/logs cards before opening `responseOnCardsDrawn`; Class Act then swaps a drawn card with the stack top. Its explicit `choice.button` values bypass the shared graphical card grid, and `GetTitle(..., true)` hides the unviewable stack card. Both inferred root-cause claims hold. The existing batch-4 short-stack case explicitly suppresses the mandatory bottoming choice, and its AI test directly invokes the obsolete post-draw response; these need correction. No disagreement with the ticket's diagnosis or intended rules behavior.
- **Classification:** Objective rules/information/UI fix, not strategic tuning. Keep the existing baseline bottoming priorities; adapt their inputs to the pre-draw state, including duplicate unique cards among the looked-at candidates. No strategic acceptance gate or new AI hook contract is proposed.
- **Approach:** Add a reusable pre-draw interrupt response window in `mechanics.js` using the existing trigger-phase continuation machinery. Apply draw modifiers once, resolve interrupts before any card movement, then resume the draw, its post-draw observers and its callback exactly once. Audit all `Draw`/`BasicActionDraw` callers before editing, including immediate follow-up phase changes (for example `Mulligan`), callback context, numeric return assumptions, nested draws and turn-event accounting. Preserve synchronous behavior when no interrupt suspends the draw; document the suspended-call return contract and migrate any dependent callers to completion callbacks. Keep Corp deck-out behavior and ordinary draw ordering covered.
- **Card/UI:** Replace Class Act's post-draw swap in `sets/downfall.js` with a mandatory selection from the actual top modified-draw-count + 1 cards, capped by stack size. Move the selected card to stack index 0 before resuming. Use ordinary card choices, without button overrides, through the existing `MakeChoice`/viewing grid. Scope private viewing to the Runner and the looked-at cards for the choice, using phase-local state where practical; never publicly reveal cards or grant lasting stack visibility. Inspect the shared rendering/visibility path before deciding whether a small generic helper is needed; avoid card-specific engine/UI checks.
- **Draw-path completeness:** Audit every source of Runner draws across all set files, basic actions, triggered abilities, setup/mulligan and shared helpers, including draws during runs, the Corp turn and nested trigger resolution. Search direct stack-to-grip mutations as well as named draw calls: classify each against its actual instruction, since adding/searching a card into grip is not necessarily drawing. Route any genuine draw bypass through the interrupt-capable draw path; preserve non-draw transfers. Record the audit and test representative callers with different continuation patterns, including callers that execute more code immediately after requesting a draw.
- **Tests:** Preserve and move the pending reproduction to `tests/` with its assertions unchanged. Extend the existing batch-4/draw behavior coverage for both top and other-card selection, first/later draws and installation after a draw, both players' turns, installation-turn draw-four, modifiers, zero/short/empty stacks, exact observer/callback identities and ordering, callback context, normal/Corp draws and baseline Runner AI selection. Correct the green test that currently skips the short-stack interrupt and replace direct post-draw-hook testing with the real pre-draw decision. Verify the graphical interaction in a browser in addition to the headless dispatch checks; record any unavailable browser tooling explicitly rather than claiming that headless checks establish rendered behavior.
- **Risk:** `Draw` has many callers; deferred completion can otherwise advance a phase too early or duplicate callbacks. Turn-event counting must recognize earlier draws even when Class Act was installed later. Short stacks still need bottoming before drawing, since it can change draw order. Temporary visibility must not expose additional stack cards, Corp-facing labels or post-choice card faces. Use affected focused tests while editing, then one final full `node scripts/ticket.js check <ticket-in-code-review>` after documentation and workflow movement are ready; do not run a separate final fast suite.
- **Docs:** Correct the obsolete post-draw-equivalence explanation in `documentation/new-sets/downfall-implementation-notes.md`, document the pre-draw continuation/visibility contract where engine patterns are described, and update `documentation/ai.md` if an AI hook contract changes. Update any affected current Runner architecture description if needed. Record implementation evidence and remaining limitations here, move via `ticket.js move` to `code-review/`, and do not commit.

**Source log:** `documentation/debug-logs/bug_raised/class_act_doesnt_trigger_pre_draw_and_doesnt_reveal_the_cards.txt`
**Reproduction:** `tests/pending/class-act-pre-draw-card-display.test.js` — failed at `3caa75d`, 2026-10-27; moved unchanged to `tests/class-act-pre-draw-card-display.test.js`, passing command: `node tests/class-act-pre-draw-card-display.test.js`.
**Reproduction SHA-256:** `1b923c4f190383a7c4a0521d6479623a560f12e05392053a11d49737d7164e9d`

## Summary

The Class Act currently draws cards into the grip, then offers a post-draw swap instead of resolving its interrupt before drawing. Its bottoming options are rendered as text buttons, including an unidentified “hidden card”, rather than the existing selectable card display. The Runner must first look at the top X cards of the stack, select one displayed card to move to the bottom, and only then complete the pending draw. Looking is private to the Runner; the card does not instruct a public reveal. This is an engine/card implementation and UI defect, not an AI strategy issue.

## Evidence

Source-log lines (unchanged by archiving):

- 106: `Runner installed The Class Act`
- 114–116: `Runner spent one click` / `Runner drew a card` / `The Class Act: Add 1 card to the bottom of your stack triggered`
- 122 and 131: the field dump includes installed resource 26018 and `runner.rig.resources[1].installedThisTurn=true;`.

The log shows the draw preceding the trigger. It ends at the choice, so it cannot establish the rendered card faces by itself; the reproduction supplies the display evidence.

Rules oracle: local `Null_Signal_Games_Netrunner_Comprehensive_Rules_v26.03.pdf`, §§9.9.1 and 9.9.4 (interrupts modify an imminent instruction), §9.12.2b (the Ritual example explicitly has The Class Act look and bottom first), and §§1.21.2, 1.21.6 (private looking and its duration). See the [official rules](https://rules.nullsignal.games/) and [rules PDF hub](https://nullsignal.games/rules/comp-rules/).

## Reproduction

Uses the real engine, card definition, trigger/decision phases and `MakeChoice`, with browser/renderer dependencies stubbed as in `tests/downfall-batch4.test.js`. A human Runner has The Class Act installed, no cards in grip, no previous draw this turn and a known four-card stack. This is a minimal reconstruction of the reported draw, not a replay of the entire logged board.

Four cases fail, with exit status 1:

1. Drawing one card: at the bottoming choice, grip length is already 1, expected 0.
2. Drawing three cards: at the choice, grip length is already 3, expected 0.
3. Text choices: `Bottom of stack: hidden card` does not identify the looked-at Sure Gamble.
4. Graphical choices: the selection grid is empty instead of containing T400 Memory Diamond and Sure Gamble.

The timing cases also require the original stack to remain intact until selection. The graphical case first checks a positive control: ordinary card options using the same cards do populate the existing grid. It then dispatches the actual Class Act options, which do not. This checks UI dispatch, not browser pixel rendering.

## Root cause

- [Verified] `Draw` has already moved the requested cards to grip when the Class Act choice is reached — the two timing cases in the reproduction.
- [Verified] Class Act's human text choices contain an unidentified looked-at card — the text case in the reproduction; `GetTitle(..., true)` respects `PlayerCanLook`, which does not grant access to this stack card.
- [Verified] Actual Class Act choices bypass the shared graphical card grid while equivalent ordinary card choices reach it — the graphical case in the reproduction.
- [Inferred] `cardSet[26018].responseOnCardsDrawn` is the wrong integration point: `Draw` opens that response window after moving/logging the draw. Its `Resolve` attempts to compensate by swapping a drawn card with the next stack card. This cannot implement the required pre-draw state or ordering for other draw consumers.
- [Inferred] Assigning `choice.button` to every Class Act option makes `MakeChoice` return through its button-only path before building `viewingGrid`. The existing grid's `FaceUpNoTint` renders card faces, but the Class Act options never reach it.

## Proposed fix

Provide a general resumable pre-draw interrupt path in `Draw`. Resolve Class Act's private look and mandatory bottoming choice before moving any drawn cards; then resume the original draw and its normal post-draw responses/callback exactly once. Replace the post-draw swap with a genuine interrupt. Audit `Draw` callers, numeric return-value assumptions, `modifyDraw`, turn-event counting and other `responseOnCardsDrawn` consumers before choosing the continuation contract.

Use ordinary card options and the existing shared card display/selection path used by Mutual Favor and Beta Build (`ChoicesArrayCards`/card choices, `MakeChoice`, `viewingGrid`, `Render`). Display precisely the looked-at cards and select one of those displayed cards to move to stack index 0. Preserve private visibility and clear temporary viewing state on completion; do not publicly reveal cards or leave the rest of the stack visible. Keep useful text-mode labels too. Do not solve the display bug with title-only buttons, and do not retain the post-draw workaround or special-case card titles in shared engine/UI code.

Correct the inaccurate “equivalent choice afterwards” description in `documentation/new-sets/downfall-implementation-notes.md` and the existing batch-4 tests that accept that implementation. Preserve baseline Runner AI bottoming support through the genuine pre-draw choice; strategy optimisation is separate.

## Acceptance gate

N/A — deterministic fix (principle 4): the card text and interrupt rules require the look/bottom choice before drawing; private looking and the requested shared card selection display provide fixed information/UI oracles.

## Acceptance criteria

- [x] The reproduction passes and has moved into `tests/`, expectation unchanged (or is integrated into the existing behaviour suite with equivalent assertions and an updated reproduction reference).
- [x] All looked-at cards remain in the stack until the Runner selects one displayed card; it moves to the bottom before the draw completes. Cover both selecting the original top card and another looked-at card.
- [x] The graphical UI uses the same card display as Mutual Favor/Beta Build, with readable card faces and one-card selection; verify the rendered interaction in a browser in addition to headless dispatch checks.
- [x] Visibility is private to the Runner, restricted to the looked-at cards and cleaned up after selection; text labels identify choices correctly.
- [x] Cover first versus subsequent draws, installation after an earlier draw, both players' turns, the installation-turn draw-four, draw modifiers, zero/short/empty stacks, and post-draw observer/callback ordering and card identities.
- [x] Existing draw callers and Runner AI work with the interrupt continuation; normal and Corp draws retain correct behaviour.
- [x] Correct the existing implementation notes and batch-4 expectations; document any new or changed AI hooks in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related

No gameplay fix is included in this triage. No existing ticket covering this mechanism was found across `documentation/bugs/` and `documentation/backlog/`, including completed tickets. Related implementation: `sets/downfall.js` card 26018; coverage: `tests/downfall-batch4.test.js`; implementation notes: Downfall batch 4. Open implementation question: which reusable pre-draw continuation contract fits all existing `Draw` callers and modifiers without changing response ordering elsewhere?
