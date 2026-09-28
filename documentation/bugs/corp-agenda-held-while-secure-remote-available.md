# Corp AI: never installs an agenda into an empty, secure remote because `_isAScoringServer()` requires it to outscore HQ

**Source log:** `documentation/debug-logs/bug_raised/corp_didnt_play_agendas_into_remote_when_it_was_secure.txt` (`Version reference: Wed Sep 23 2026 12:02:31`)
**Reproduction:** `tests/fixtures/corp-decisions-pending/corp-agenda-held-while-secure-remote-available.txt` — `node tests/corp-decision-fixtures.test.js --pending corp-agenda-held-while-secure-remote-available.txt` (fails at branch `25Sept-fixes` tarball, 2026-09-28; short SHA not recorded)

## Summary
Weyland holds Hostile Takeover with an empty remote that its own evaluator marks `secure:true`, yet installs nothing into it for three turns and only gains credits or draws. It ends with two Hostile Takeovers, 9 credits and a forced discard. Expected: install the agenda into the secure remote. The stall reinforces itself, because a larger hand raises HQ's score and makes the remote look weaker still.

## Evidence
- L149: `Remote 1:{score:6.8,secure:true}`, `R&D:{score:7.60,secure:true}`, `HQ:{score:9.10,secure:true}`.
- L150-154: `Scoring windows for empty servers: []`, `No obvious install options`, `I am feeling poor`, `Nothing good to do...`, then `Corp gained one credit`.
- L158: hand `[Trick of Light,Government Subsidy,Hostile Takeover,Government Subsidy,Spin Doctor]`.
- L126: HQ 10.10 at 6 cards; L180-207: three more gain-credit clicks with empty scoring windows.
- L211-213: `Corp discarded [hidden card]`; hand now holds two Hostile Takeovers.

Actor: Corp AI.

## Reproduction
Weyland; hand `[Trick of Light, Gov. Subsidy x2, Hostile Takeover, Spin Doctor]`; unrezzed Ballista on HQ and R&D; unrezzed Ice Wall on empty Remote 0; Runner has no programs, so every server is secure. Asserts `install` / Remote 0 / Hostile Takeover. Current output: `Phase_Main -> gain, expected install`, with `Scoring windows for empty servers: []`.

## Root cause
- [Verified] The remote is rejected by the relative bar in `_isAScoringServer()`. Instrumented run: `protScore=3.5 minProt=9.5 secure=true hand=5` (reproduction).
- [Verified] HQ's score rises with hand size: same board with a one-card hand gives `minProt=5.5`, with five cards `9.5` (difference 4 = the `HQ.cards.length` term in `_protectionScore()`).
- [Verified] Hand size is not sufficient to explain the failure: at one card the remote (3.5) still fails against 5.5, because HQ's Ballista scores above the remote's Ice Wall although both are secure.
- [Verified] Skipping the relative bar for secure candidates makes the reproduction pass and leaves all 15 green fixtures passing.
- [Verified] That change fails `tests/corp-server-security.test.js` "a secure remote still uses the relative scoring-server comparison", which requires rejecting a secure remote that scores below HQ.
- [Inferred] The self-reinforcing loop over several turns: not installing keeps cards in hand, which raises HQ's score. The score half is verified above; the behavioural loop is read from the log only.
- [Inferred] The Archives-overflow branch (`_agendasInHand() > MaxHandSize - 1`) did not apply here (at most 2 agendas in hand).

## Proposed fix
Once a candidate remote passes the `isSecure` floor, the Runner cannot currently breach it, so ranking it against another server's score adds no safety and can leave the agenda in hand indefinitely. Proposed: apply the HQ/Archives comparison only to candidates that are not secure, and keep choosing among secure empty remotes by the existing `emptyProtectedRemotes[0]` order. Change is confined to `_isAScoringServer()`.
Rejected: removing the hand term (the reproduction still fails at one card); a tuned constant (violates `ai-principles.md`).
Decision needed: this reverses the deliberate expectation in the existing security test above, added with the earlier ticket `done/corp-installs-agendas-into-a-never-secure-remote.md`. If the owner wants the relative bar kept for some secure cases, an alternative is to apply it only when HQ is itself insecure; that needs its own reproduction.
Other decisions that could shift: whether `_scoringWindow()` should stop using HQ's hand-inflated score; unrezzed ICE overstates security (finding A2), so trusting `isSecure` alone leans on that.

## Acceptance criteria
- [ ] The reproduction passes and moves to `tests/fixtures/corp-decisions/`, expectation unchanged.
- [ ] The test "a secure remote still uses the relative scoring-server comparison" is rewritten deliberately, with the reasoning recorded in review, not weakened to pass.
- [ ] Variation: remote holding the same Ballista as HQ, and an 8-card hand, both still install.
- [ ] Control: an insecure remote is still refused; `corp-no-agenda-into-insecure-remote` stays green.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`; the "relative test" sentence in `documentation/corp-ai/architecture.md` (Install planning) is updated.
- [ ] `node tests/run-all-tests.js` passes (baseline: 3 unrelated failures: `ai-roadmaps`, `flipped-identity`, `vantagepoint-integration`).

## Implementation plan
**Awaiting approval.** Plan gate: shared scoring heuristic in `ai_corp.js`, and changes the expectation of an existing green test.
1. Confirm the reproduction fails for the stated reason (done at triage).
2. In `_isAScoringServer()`, guard the `protScore < minProt` return with `!security.isSecure`.
3. Rewrite the conflicting security test to assert a secure remote is accepted regardless of relative score, keeping the insecure-remote test unchanged.
4. Add the variation fixtures; update `architecture.md`; run the full suite.

## Out of scope / related
- Hand-size term in HQ's score as used by protection ranking and `_scoringWindow()`.
- Unrezzed-ICE overstatement of security (finding A2).