# Fast-forward routine Archives accesses

**Outcome:** adopted

**Starting commit:** `8ceda83`
**Reproduction:** `tests/pending/archives-fast-access.test.js` — `node tests/pending/archives-fast-access.test.js` fails at `8ceda83`, 2026-10-27, with “bulk Archives access must not zoom routine non-agendas”.
**Reproduction SHA-256:** `4ab4818596a485b21e53ded4c515ac11638fe84bc6dd51d9d79a4c548916882d`

## Resolution

Implemented from `8ceda83`.

- Kept the existing bulk action label **Access All** and added a tooltip explaining when it stops. Individual access is still available.
- `phases.runAccessingCard.IsRoutineArchivesAccess()` limits silent presentation and short timer scheduling to human bulk access to non-agendas in the Archives pile. Routine cards neither zoom nor update the history thumbnail, avoiding flashes; normal access events, knowledge and access-complete bookkeeping remain intact.
- Agendas, installed root cards, cards with their own access effects, optional access responses and available access abilities retain normal presentation. Global automatic counters run silently; presentation is checked again after those automatic effects in case they enable an access ability. This matters for cards which count all accesses: merely having such a counter must not make the whole pile pop up.
- `ResolveChoice()` uses zero-delay asynchronous timers only for routine bulk access selection/continuation steps. It does not change global game speed, narration preferences or interrupt timing.
- Bulk state resets on normal completion, run cleanup and new-breach initialization, covering early run endings as well.
- No gameplay access, AI choice or hook contract changed. The user's pre-existing `ai_corp.js` change was left untouched.
- Moved the unchanged reproduction to `tests/archives-fast-access.test.js`; `node tests/archives-fast-access.test.js` passes (5 cases). Added `tests/archives-fast-access-flow.test.js` for the distinct real-engine/scheduler setup; its 10 cases cover a 26-card breach with an agenda in the middle, counters, effects, responses, optional abilities (including one enabled by an automatic effect), root trash choices, timing and cleanup.
- Focused validation: the two new suites, `tests/carnivore-archives-access.test.js` (3), `tests/downfall-batch4.test.js` (37) and `tests/match-local-posture-feedback.test.js` (25) passed on Node v20.19.0. The steal-cost regression also passed. Final full validation is recorded below.
- Full validation: `node scripts/ticket.js check documentation/backlog/code-review/archives-fast-access.md` exited **1** on 2026-10-27. The unchanged reproduction comparison and reproduction execution passed; **118 of 124** suite files passed. Six existing AI suites failed: `breach-hazard-table.test.js`, `corp-decision-fixtures.test.js`, `corp-install-decisions.test.js`, `corp-server-security.test.js`, `decision-snapshots.test.js` and `downfall-batch12.test.js`. Output: `/tmp/chiriboga-archives-fast-access-validation.log`; separately recorded exit status: `/tmp/chiriboga-archives-fast-access-validation.status`.
- Isolation evidence: copied the current JavaScript sources and tests into `/tmp/chiriboga-archives-baseline-2s7_2han`, restored only `phase.js` and `command.js` from `8ceda83`, and reran those six files: **all six still failed**. Restoring committed `ai_corp.js` in that temporary copy made **all six pass**. The original working tree was not modified during either baseline check. The existing change turns on five AI options (`openingHqThenRdIce`, `emptyArchivesRunPressure`, `agendaCommitmentPlan`, `agendaExposureTable`, `agendaDestinationPlan`); the failures are independent of the UI work. Baseline exit statuses and failure summaries are in that directory's `results.json` and `committed-results.json`.
- The final full-pass criterion remains unchecked because of those existing AI failures. No expectation was weakened, no user change was reverted, and no second full suite was scheduled for unrelated failures. Both new Archives suites passed in the full run. Browser visual inspection was not performed; regressions assert that routine cards never call `ToggleZoom` or update thumbnails.
- Plan refinement: no `utility.js` change was needed; the existing access-all and access-complete functions remain in use. Normal presentation is deliberately conservative when optional responses might need attention.

## Implementation plan

Proposed at `8ceda83`, 2026-10-27. **Approved 2026-10-27.**

- **Validation:** [Verified] `AccessAllInArchives()` already sets `autoAccessing`, and the access flow retains agenda and ability choices. `phases.runAccessingCard.Init()` nevertheless unconditionally zooms every accessed card. The reproduction exercises that real phase initializer and fails on a routine operation while individual access, agendas, root cards and HQ retain normal presentation. [Verified] `ResolveChoice()` schedules every next step using `mainLoopDelay` (normally 350 ms). Bulk mode still visits multiple steps per card. No gameplay access may be omitted: both automatic and optional access effects must continue to resolve.
- **Approach:** improve the existing bulk action and label it **Fast access**. Suppress routine non-agenda card zooms only during bulk access to the Archives pile. Keep normal presentation for agendas, installed root cards, access responses and available abilities. Run the existing access lifecycle, including access-complete triggers and public observation, for every card. Shorten the scheduled delay only for routine bulk Archives access/continuation steps; retain asynchronous scheduling and normal timing for interrupts and choices. Scope expected source changes to `phase.js`, `command.js` and, if useful for sharing the predicate, `utility.js`. Preserve individual card access and the existing access order. Reset bulk behavior at breach completion through the existing reset. Do not modify `ai_corp.js`.
- **Rejected alternative:** filtering the access list to agendas or marking other cards accessed without resolving them would bypass access effects and access-complete bookkeeping. Hiding zooms alone would leave the per-card timer delays.
- **Tests:** move the unchanged presentation reproduction into `tests/` after it passes. Add focused coverage for optional access abilities, automatic/response triggers, installed root cards, access-complete effects, short scheduling for routine steps, normal scheduling outside bulk Archives access, and completion of a 20+ card breach including an agenda. Check that an exception or early run ending cannot leave fast behavior active for an unrelated access. Run affected focused tests, then one final full `node scripts/ticket.js check <ticket>` after documentation and movement to `code-review/` are ready.
- **Risk:** `ResolveChoice()` serves the entire game. Delay changes must have an explicit bulk-Archives predicate and must yield through timers rather than recursively resolve phases. Do not change global game speed, narration preferences, AI decisions, trigger contracts, or access legality. Conservative presentation is acceptable when an access effect may require attention.
- **Docs:** record final behavior and evidence in this ticket. No AI hooks or strategic choices change.

## Request

In a late game with 20+ cards in Archives, showing every card individually is tedious. Provide a convenient way to focus on agendas and other meaningful access decisions.

## Acceptance gate

N/A — UI-only change; no AI choice changes. Preserve the same legal accesses, trigger resolution and decisions as ordinary access.

## Acceptance criteria

- [x] A discoverable bulk action fast-forwards routine non-agendas in Archives without opening each card or waiting at normal per-action speed.
- [x] Agendas remain visible and retain normal steal decisions and costs.
- [x] Automatic effects, optional access responses, access abilities and access-complete effects still resolve normally.
- [x] Installed cards in the Archives root retain normal access presentation and trash/ability decisions.
- [x] Individual access and other servers retain existing presentation and timing.
- [x] Bulk behavior ends with the breach and cannot affect a later unrelated access.
- [x] The unchanged reproduction passes in the green suite; focused regressions cover timing, interruptions and a large breach.
- [ ] Final full ticket validation passes.
