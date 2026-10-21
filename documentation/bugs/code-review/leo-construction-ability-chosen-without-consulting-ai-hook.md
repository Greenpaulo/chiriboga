# Corp AI: LEO Construction ability chosen without consulting its AI hook

**Outcome:** adopted

## Resolution

Implemented from 28b5dac (2026-10-21).

The shared run-paid-ability selector now honors the existing `AIWouldTrigger()` veto in Run 2.1, 3.1, 4.3 and 4.5. It records the exact offered card and ability, preserves default behavior for unhooked cards, and prevents an earlier `AITriggerInPaidWindow()` request from bypassing a veto. Explicit paid-window requests retain their earlier priority; ordinary triggers still follow the existing rez checks. Non-run dispatch and simultaneous responses are unchanged. The selector logs veto, acceptance and default reasons.

This is the objective routing repair approved in conversation. No changes were made to LEO's hook, sacrifice thresholds, timing or bioroid-selection policy. The original proposal also requested strategic changes; those were deliberately deferred. The existing R1.2 spec now makes clear that this repair does not supply a preferred sacrifice target.

The original pending reproduction `tests/pending/leo-construction-ai-hook.test.js` first failed at the starting commit: actual `trigger`, expected `n`, in both Run 2.1 and Run 4.5 with only LEO legally offered and its hook returning false. It moved byte-for-byte to `tests/leo-construction-ai-hook.test.js`; `node tests/leo-construction-ai-hook.test.js` passes. Its complete pre-fix snapshot digest is recorded below. Because this test was newly written and is not in Git history, `scripts/ticket.js` now accepts that snapshot only when the historical pending version is unavailable; matching requires every byte to be unchanged, and malformed or mismatched digests fail. Five focused cases cover that workflow fallback; historical expectation comparison is unchanged. This small workflow addition avoids skipping reproduction verification without making a prohibited commit.

`tests/corp-run-paid-abilities.test.js` adds 20 real-engine routing cases, including all four windows, no-hook compatibility, accepted and declined hooks, exact ability matching, veto/declaration interaction, declaration priority, rez priority and unchanged non-run dispatch. Playable-set hook consumers were inspected: most defensive upgrade hooks are callback/rez hooks and are not offered as paid abilities. LEO is the relevant identity consumer; Event Horizon retains explicit paid-window priority. No card definition changed.

Focused validation passed on Node v20.19.0: the two LEO reproduction cases, 20 routing cases, 72 fixture assertions across 18 decision fixtures, 13 snapshot tests, 197 server-security regressions, hook documentation and agent-script checks. Final validation: `node scripts/ticket.js check documentation/bugs/code-review/leo-construction-ability-chosen-without-consulting-ai-hook.md` passed with exit status 0; all 114 full test files passed. The unchanged reproduction snapshot also passed, with no skipped comparison warning. Output: `/tmp/leo-ticket-check.log`; exit status: `/tmp/leo-ticket-check.exit`. Subsequent edits only recorded this result, corrected incoming ticket links and clarified snapshot documentation.

Architecture: [paid ability selection and remaining timing/target limits](../../corp-ai/architecture.md#not-yet-modelled-holding-and-trigger-ordering). Hook documentation in `documentation/ai.md` describes the extended run-window dispatch.

**Comparison:** completed by the owner, 2026-10-21. Baseline `28b5dac`, candidate current uncommitted routing repair. Both used `tests/fixtures/ai-batch/deck-pool-startup-format-2.json`, `--pairs leo-tao,leo-mulishaT --seeds 1-200 --jobs 4`; 400 games per version, no failures. Reports: `/tmp/leo-before.json` and `/tmp/leo-after.json`. Comparison command: `node scripts/ai-batch.js --compare /tmp/leo-before.json /tmp/leo-after.json`. Report code hashes: baseline `f155bd0e6c0fb6b0`, candidate `8c43fdff8fc7bc41`; both input reports were inspected locally. This is outcome evidence for the objective repair, not a strategic option gate.

| Metric | Baseline | Candidate | Paired difference, 95% interval |
|---|---|---|---|
| Corp win rate, pooled | 7.8% | 31.8% | +24.0 percentage points [+19.3, +28.8] |
| Corp win rate, leo-mulishaT | 10.5% | 32.5% | marginal intervals [6.5, 15.0] and [26.0, 39.0]; no per-pair paired interval reported |
| Corp win rate, leo-tao | 5.0% | 31.0% | marginal intervals [2.0, 8.0] and [24.5, 37.5]; no per-pair paired interval reported |
| Points scored | 1.953 | 3.905 | +1.953 [+1.635, +2.263] |
| Points stolen | 7.228 | 6.065 | -1.162 [-1.387, -0.932] |
| Game length | 14.713 | 18.655 | +3.943 [+3.125, +4.765] |
| Corp mean decision latency, ms | 3.063 | 3.658 | +0.595 [+0.345, +0.863] |
| Corp p95 decision latency, ms | 14.330 | 17.285 | +2.955 [+1.302, +4.618] |
| Runner mean decision latency, ms | 0.300 | 0.443 | +0.143 [+0.118, +0.169] |
| Batch wall time, seconds | 110.338 | 186.476 | +69.0%; separate sequential runs, no timing confidence interval |

357/400 paired games changed. Archives points stolen increased by 0.080 [0.020, 0.150], while HQ and R&D points stolen decreased. The pooled outcome gain is clear on this sample; strategic timing and sacrifice-target work remain deferred. The owner flagged performance as unresolved despite that gain.

**Performance investigation (2026-10-21):** aggregate game duration divided by aggregate turns increased from 73.54 to 98.30 ms/turn (+33.7%), alongside 26.8% longer games. These are descriptive workload ratios, not controlled latency estimates. A CPU-profiled replay of `leo-tao`, seed 1, using the documented replay CLI found approximately 38% of sampled elapsed time beneath `_evaluateServerSecurity()`. The largest entry caller was `_protectionScore()` (~924 ms of ~5 s profiled elapsed); LEO's hook accounted for ~89 ms (~1.8%) and the new run selector ~93 ms (~1.9%, inclusive of the hook). Replay includes full logging and profiler overhead, so these percentages are preliminary evidence from one game, not estimates for the 400-game batch. Profile: `/tmp/leo-routing-profile/leo-tao-seed1.cpuprofile`; replay output: `/tmp/leo-routing-profile/replay.log`. This does not support attributing the batch slowdown primarily to direct hook-routing overhead. More expensive surviving-board evaluation is a plausible explanation, not yet isolated. No performance fix or performance acceptance is claimed, and no additional gameplay source was changed after the owner's comparison.

## Implementation plan

Proposed at `28b5dac`, 2026-10-21. **Approved 2026-10-21.** Scope confirmed in conversation: implement the routing fix, then measure both LEO decks before deciding on additional strategic work. The owner will run the comparison.

- **Validation:** A real headless engine board reproduces the routing defect in both Run 2.1 and Run 4.5: the phases' actual trigger enumerators offer only LEO, its existing hook returns false, and `_choiceInner()` chooses `trigger`. `node tests/pending/leo-construction-ai-hook.test.js` fails on those exact choices. This replaces the requested manual Custom Game/debug-log fixture with a repeatable engine-backed reproduction; no trigger availability is stubbed. The target-selection fallback is confirmed by inspection of `TriggerAbility()` and `_choiceInner()`, but is outside the narrowed reproduction.
- **Classification and scope:** Honoring an offered card's explicit false veto is an objective hook-routing invariant, not evidence that LEO's existing heuristic is optimal. Narrow this ticket to routing the existing hook and selecting the accepted offered ability. Do not change LEO's thresholds, sacrifice target policy or timing. The proposed blanket last-window rule and cheapest-target policy rank legal plays and need strategic evidence; a cheaper card may supply more useful future protection. Timing is already R1.2's responsibility. Keep cheapest-target evaluation separate from this ungated routing repair. Defer raising additional strategic work until the owner has compared both LEO decks before and after the fix.
- **Approach:** Add a shared run-paid-ability selector in `ai_corp.js`, used for Run 2.1, 3.1, 4.3 and 4.5. Inspect legal offered abilities, skip a card when its existing `AIWouldTrigger()` returns false, retain the current default for cards without that hook, and set a preference for the exact accepted card and ability. Extend internal preference matching so multiple abilities on one card cannot select a different ability. Preserve existing rez priority and explicitly handle the interaction with the earlier `AITriggerInPaidWindow()` dispatch so it cannot bypass a veto. Do not apply this to mandatory responses or non-run windows. Log accepted, declined and unhooked fallback reasons. Reject title checks and bare-command filtering that loses the chosen ability.
- **Tests:** Move the unchanged pending routing reproduction to `tests/` after it passes. Add focused cases for all four run windows, a hook returning true, a card without the hook, all candidates declined, a declined candidate preceding an accepted one, multiple abilities on the same card, and interaction with `AITriggerInPaidWindow()`. Assert reasons as well as choices. Keep target-selection expectations out of this objective regression. Run affected focused checks, then one final full `ticket.js check` after documentation and workflow movement are ready.
- **Risk:** The shared run-window dispatcher affects other paid abilities. Inspect all playable-set consumers of both hooks, preserve existing non-run uses, and cover no-hook compatibility, rez precedence and exact ability preference consumption. No hook signature changes or new strategic scoring are proposed; this makes an existing veto effective in additional paid windows and must be documented as such.
- **Docs:** Update `documentation/ai.md` for the run-paid-window use of `AIWouldTrigger()` and its interaction with `AITriggerInPaidWindow()`. Update and link `documentation/corp-ai/architecture.md#not-yet-modelled-holding-and-trigger-ordering`. Keep R1.2's strategic timing work separate; clarify its assumption about target selection and wait for the owner's comparison before proposing additional strategic work. On completion add the Resolution, move this ticket to `code-review/` with the workflow script, and leave changes uncommitted.

**Reproduction SHA-256:** `ceb14e0690f6fec55cea6f309d08520e7b401d4132bba0e992924db0ff303980`

**Source:** code inspection while auditing the former R1 spec (now R1.1 to R1.3) (no debug log)
**Reproduction:** `tests/pending/leo-construction-ai-hook.test.js` — `node tests/pending/leo-construction-ai-hook.test.js` (fails at `28b5dac`, 2026-10-21: Run 2.1 and Run 4.5 choose `trigger`, expected `n`). Promoted unchanged to `tests/leo-construction-ai-hook.test.js`; `node tests/leo-construction-ai-hook.test.js` passes. The real phase enumerators offer only LEO and its existing hook returns false. Earlier scratch fixture evidence at `376f32c`, 2026-09-25, is retained below.

## Summary
LEO Construction: Labor Solutions' identity ability ("Once per turn, trash 1
rezzed bioroid card in the root of or protecting the attacked server: end the
run") is a paid ability in `abilities[]`, offered through the `trigger` command
in every run paid-ability window. Its `AIWouldTrigger()` decides whether the
sacrifice is worth it, but the Corp AI never calls it for this ability: the run
window handlers pick `trigger` whenever it is offered, and the bioroid is
picked by index. The Corp is therefore expected to trash a bioroid and end the
run at the first run window where the ability is offered, usually on approach
to the outermost ICE, before the ICE has taxed the Runner, even when the hook
would decline, and to trash whichever bioroid is listed first (ICE before
root) rather than the cheapest.

## Evidence
- `sets/elevation.js`, LEO Construction: the ability's `Enumerate` needs only
  a run in progress, `usedThisTurn` false, and a rezzed bioroid in the attacked
  server's ICE or root. `AIWouldTrigger()` computes the cheapest bioroid and
  returns false for, among others, a remote with no agenda whose cheapest
  bioroid costs more than 2, or a server `_evaluateServerSecurity()` reports
  secure. Nothing reads the cheapest bioroid it computes.
- `ai_corp.js`, `Phase_Approaching()` (Run 2.1): after the rez checks,
  "for now assume trigger is always desired" returns `trigger` whenever it is in
  the option list.
- `ai_corp.js`, `Phase_Movement()` (Run 4.5): consults `AIWouldTrigger()` only
  for rezzing root upgrades, then "if trigger is an option, use it by default".
- `ai_corp.js`, `_choiceInner()`: Run 3.1 and Run 4.3 have no handler; the
  bioroid selection (`executingCommand == "trigger"`, choice type `select`) has
  no mid-action handler either. Both reach the "I don't have code to handle this
  situation" fallback, which returns index 0.
- `AIWouldTrigger()` is otherwise only called for upgrades in the attacked root
  (`Phase_Movement()`) and for end-of-turn rezzes (`Phase_EOT()`).
- `tests/corp-server-security.test.js` covers LEO only by calling
  `AIWouldTrigger()` directly.

## Reproduction
A scratch fixture (not committed) built with `CorpTestField(35035, ...)`, one
remote holding a rezzed Bumi 1.0 (rez cost 3) and an Otto Campaign (no
agenda), `attackedServer` set to that remote, `IDENTIFIER: Run 2.1` then
`Run 4.5` with `approachIce=0`, and `OPTIONS: trigger, n`. Its `SETUP` checked
that `AIWouldTrigger()` returns false. Both runs chose `trigger`, expected `n`.

This shows the decision function, but the harness offers `trigger` as a bare
string, so it does not prove that LEO's ability is the one offered in a live
run. The committed reproduction needs:

1. A pending fixture in `tests/fixtures/corp-decisions-pending/`, extracted
   from a live debug log (`node tests/extract-fixture.js <log> <n> <slug>
   --expect n --pending`), of the Corp's Run 2.1 or Run 4.5 decision where
   `trigger` offers only LEO's ability and the hook would decline. To get the
   log: Custom Game with the LEO Glacier precon as Corp; rez Bumi 1.0 on a
   remote holding a non-agenda card; have the Runner run it; the log should
   show "LEO Construction trashes Bumi 1.0 to end the run" on approach to the
   outermost ICE.
2. A pending test in `tests/pending/` for the bioroid selection: a rezzed
   Mercia B4LL4RD (rez cost 2) in the root and a rezzed Bumi 1.0 protecting the
   same server, where the hook fires; expected: the Corp trashes Mercia, not
   the first-listed Bumi.

## Root cause
- [Verified] `Phase_Approaching()` and `Phase_Movement()` choose `trigger`
  while LEO's `AIWouldTrigger()` returns false (real-engine pending reproduction
  above at `28b5dac`, 2026-10-21; phase enumeration offers only LEO).
- [Inferred] The ability's bioroid selection falls to the index-0 fallback in
  `_choiceInner()`, and ICE is enumerated before root cards.
- [Inferred] In a live run the first window offering the ability is usually
  Run 2.1 for the outermost ICE.

## Proposed fix
Before choosing `trigger` in a run paid-ability window, ask the offered
abilities' cards: choose `trigger` only for an ability whose card's
`AIWouldTrigger()` (when defined) returns true, and set the preferred ability
and target so the selection steps follow the hook (LEO: the cheapest bioroid
it already computes). Keep cards without the hook on today's default, so other
abilities are unchanged. Make LEO's hook decline before the last Run 4.5
window (Run 4.5 with `approachIce < 1`): ending the run earlier gives up the
tax the remaining ICE would charge. No title checks in `ai_corp.js`.

Rejected: a LEO title check in `Phase_Movement()` (breaks the hooks-over-titles
principle).

## Acceptance gate
N/A — deterministic fix (principle 4): in a run paid-ability window, an offered card's existing `AIWouldTrigger()` false veto must be honored, and the selected ability must be the accepted offered ability. This classification covers only the narrowed routing repair in the approved implementation plan. Timing, sacrifice valuation and changes to the hook's heuristic require a separate strategic gate.

## Acceptance criteria
- [x] A real-engine pending reproduction first establishes that only LEO is legally offered and the hook declines, while Run 2.1 and Run 4.5 still choose `trigger` before the fix.
- [x] The routing reproduction passes and has moved into the green suite (`tests/fixtures/corp-decisions/` or `tests/`), expectations unchanged.
- [x] A test shows an ability on a card without `AIWouldTrigger()` is still chosen as today.
- [x] The existing veto is honored in all four run paid-ability windows; an accepted candidate selects its exact offered ability, including when another candidate is declined.
- [x] LEO's sacrifice thresholds, target policy and timing are unchanged; the existing R1.2 spec records that target selection is still outstanding, and additional work awaits the owner's comparison.
- [x] Every new test asserts the logged reason as well as the choice.
- [x] New or changed AI hooks are documented in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Valuing the sacrifice against approach triggers still to come (Manegarm
  Skunkworks, Anoetic Void) and holding LEO as a mid-run reservation is roadmap
  item R1.2 (`documentation/corp-ai/specs/R1.2-leo-paid-ability-window.md`),
  which depends on this fix.
- Ordering the Corp's own Run 4.6.2 approach triggers is R2.
