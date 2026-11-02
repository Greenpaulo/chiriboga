# Runner AI: exhausted-stack caution falls back to credits without a recovery plan

**Source log:** `documentation/debug-logs/bug_raised/runner_with_no_stack_does_nothing_except_gain_creds.txt`
**Reproduction:** `tests/pending/runner-empty-stack-phantom-preparation.test.js` — `node tests/pending/runner-empty-stack-phantom-preparation.test.js` (fails at `f1ce65d`, 2026-10-29)

## Summary

The Runner spends four consecutive turns gaining credits with no cards in its
grip or stack, reaching 28 credits while the Corp continues scoring. It has
Buzzsaw and enough credits to break Mycoweb, but unknown ICE and an advanced
facedown root card are modelled as potentially lethal. Paul's reported strategic
failure is that the AI keeps waiting for safety without comparing the remaining
chance of a risky run against the consequences of continued inaction. The
reconstruction also proves a narrower defect: foresight invents obtainable grip
cards despite the empty stack. Correcting that estimate alone does not resolve
the reported strategic behaviour.

## Evidence

Source line numbers refer to the archived log, unchanged from the input:

- Lines 2676–2701: Runner starts with 12 credits and zero cards; takes four credits.
- Lines 2721–2737: Runner has 16 credits and zero cards; twice logs
  `AI: Gotta do some prep`, then `AI: Don't want to run right now` and gains credits.
- Lines 2773–2800: starts with 20 credits and zero cards; takes four more credits.
- Lines 2820–2847: starts with 24 credits and zero cards; repeats
  `AI: Don't need more credits right now`, `AI: Ok not economy, something else?`,
  then gains credits anyway.
- Lines 2864–2932: board dump has empty stack and grip, unrezzed unknown Mycoweb on R&D,
  rezzed Lionsmane on HQ and unknown Semak-samun on Remote 0. No Corp decision snapshots
  were recorded (line 2862); this is a Runner AI decision.

## Reproduction

The standalone pending test loads the real engine, playable card definitions
(including Downfall), Runner AI and run calculator. It embeds the final board
dump, reconstructing the first click of the last logged Runner turn at 24
Runner credits and 6 Corp credits. Fresh AI caches and fixed jitter are assumed.
The dump is from the following Corp turn and includes its mandatory draw;
that hidden card is retained, rather than guessing its earlier position.

Five controls pass: the reconstructed command is `gain` with no legal `draw`
and no immediate R&D path; adding three actual grip cards permits R&D; empty
grip still permits the harmless Archives route; unknown R&D ICE is modelled as
a sentry; and revealing/rezzing R&D Mycoweb allows Buzzsaw to break it safely. The failing assertion requires
foresight to reject the damaging R&D route when no additional cards are
obtainable. Current output (exit 1):

```text
FAIL: empty stack cannot supply the two cards needed to survive R&D after prep: foresight accepts a two-net-damage R&D route with empty grip/stack and no card recovery
Runner empty-stack preparation: 5 passed, 1 failed
```

No shared harness or production code changed; pending tests are outside green
suite discovery. Fast/full suites are not required for this triage.
`node --check tests/pending/runner-empty-stack-phantom-preparation.test.js`
and `node tests/ai-roadmaps.test.js` pass.

## Root cause

- [Verified] The reconstructed command chooses `gain`, omits `draw`, and rejects
  an immediate R&D route. Foresight nonetheless returns a complete R&D route
  with empty grip/stack. The pending reproduction demonstrates these outcomes.
- [Verified] Actual grip cards make that route possible; the safe Archives
  route remains possible without cards. The reproduction's contrasting cases
  demonstrate that this is a damage-budget issue, not universal run rejection. Further controls verify
  that unknown R&D ICE is modelled as a sentry, whereas known/rezzed Mycoweb
  has an affordable, safe Buzzsaw route.
- [Inferred] `_commonRunCalculationChecksAsync(..., foresight=true)` always
  adds 3 to `damageOffset`, 3 credits and one preparation click, without
  checking whether any cards can be obtained. `_calculateRunPathPieceBegin`
  turns that into `runner.grip.length + damageOffset` damage capacity.
- [Verified] R&D's ICE is unknown to the Runner. `RunCalculator.IceAI` models
  that unknown ICE as a sentry rather than its actual Code Gate subtype. The
  pending test verifies that model and that making Mycoweb known/rezzed instead
  admits a safe route with the installed Buzzsaw. Investigation found that
  route costs 8 credits, against the Runner's 24.
- [Inferred] The two hypothetical R&D net-damage effects come from the unknown
  ICE model, not Mycoweb copying Lionsmane. The initial triage explanation
  overlooked installed Buzzsaw and misread R&D's ICE visibility; these are
  corrected here. Remote 0 also contains unknown ICE; Remote 1's unknown
  advanced root card invokes the calculator's speculative damage budget.
- [Inferred] In `_internalChoiceDetermination`, an inaccessible server with
  potential above 2 can clear the entire server list when this impossible
  foresight succeeds, explaining the logged `Gotta do some prep`. That exact
  earlier-turn branch has not been replayed; the final board does not log it.
- [Inferred] The final credit fallback is also consistent with a modelled lockout:
  immediate HQ, R&D and both remote routes were unavailable in investigation;
  Archives was safe but low value. Removing phantom preparation need not
  change the final command or unlock this particular game.

## Proposed fix

Address two related pieces, recording their evidence separately:

1. Correct hypothetical grip growth in `_commonRunCalculationChecksAsync`:
   bound it by achievable public card acquisition and preparation actions.
   Check `_internalChoiceDetermination` so impossible preparation cannot suppress
   feasible alternatives. Preserve valid credit preparation and genuine recovery.
2. Behind `runnerLastChanceRisk`, assess whether further preparation can actually
   improve access before falling back to another credit. Where meaningful recovery
   is exhausted and delay allows the opponent to win, compare the remaining
   risky opportunities with waiting; consider a useful run instead of treating
   speculative damage as a permanent veto. Choose among opportunities using
   Runner-visible information, remaining win prospects and known hazards.

Distinguish certain lethal damage from uncertainty about unknown ICE or a trap.
Do not globally disable survival checks, force a run whenever the stack is empty,
inspect hidden cards, or add card-title checks or thresholds fitted to this board.
Waiting can still be correct when additional credits enable a route, recovery
is available, the Corp will deck out first, or no run offers a useful chance.
The exact opportunity and urgency evaluation remains an implementation design
question; the current reproduction does not prove which unknown server is best.

## Acceptance gate

Human gate. Option `runnerLastChanceRisk` (Runner AI), new behaviour off
unless the owner requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: taking a useful remaining risk when preparation cannot improve access
and inaction loses, while preserving useful preparation, legitimate waiting
and avoidance of known lethal routes.
Adoption: Paul decides after playtesting; record the tested flags and decision.

The phantom-card correction separately has a deterministic oracle (principle 4):
a hypothetical run must not gain damage capacity from unobtainable cards.
Passing that regression alone does not complete the strategic work.

## Acceptance criteria

- [ ] The phantom-preparation reproduction passes and moves to `tests/`, its
      damage-capacity expectation unchanged. Its `gain` control describes the
      baseline, not the required outcome when the strategic option is enabled.
- [ ] Add a focused strategic decision reproduction before implementation:
      on a reconstructed exhausted-stack board, demonstrate the baseline credit
      fallback and test a useful risk under the candidate option. State urgency,
      available recovery and public-information assumptions explicitly.
- [ ] Ship strategic behaviour behind `runnerLastChanceRisk`, initially off;
      keep deterministic modelling correctness separate from risk preference.
- [ ] Cover contrasting cases: productive credit preparation, obtainable cards
      or recovery, a favourable Corp deck-out race, and known lethal damage.
- [ ] Handoff names tested flags, remaining-risk decisions to assess and
      contrasting cases. Record implementation completion separately from
      Paul's pending or explicit adoption decision.
- [ ] Cover short stacks, exhausted versus available draw effects, valid
      recovery with an empty stack, and preparation click constraints.
- [ ] Cover a high-potential inaccessible server with impossible preparation
      alongside a feasible alternative; preserve legal damage-free runs and
      achievable credit-only preparation.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

No existing ticket found for Runner foresight inventing cards. The separate
`runner-bonus-breaker-special-breaker-check-never-fires.md` concerns breaker
ranking; `backlog/done/L9.0-lockout-honesty.md` concerns Corp estimates.
The repeated Bling automatic/Enumerate warning is separate and not diagnosed
here. Open questions: when did recovery first become exhausted, which remaining
run offered the best public-information chance, and how urgent was acting versus
waiting for Corp deck-out? The log shows four credit-only turns, not a completed
loss or literally infinite play. Paul's assessment is that this behaviour
amounts to conceding rather than taking the final risk; the strategic gate
must assess that failure rather than declaring the game actually locked out.
