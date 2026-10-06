# Vantage Point batch 1 independent review

**Verdict: Changes required.** Exact IDs: 36001–36004. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36001 Chain Reaction | Three-central payoff; inactive `responseOnRunSuccessful` → legal `Enumerate`; Runner `AIWouldPlay` then `Resolve` ranks Corp trash choices, Corp choice ranks Runner install costs. | Actual automatic dispatch for HQ/R&D/Archives leaves all flags false, so no legal action. **Defect CR1.** Resolution sequencing is covered only with manually supplied flags/arguments. Target ranking ignores crucial facedown advanced cards and Runner loss; contrasting strategy evidence remains incomplete. |
| 36002 Take a Dive | Run event candidate through `AIRunEventExtraPotential` → run calculator → successful-run effect after a fired subroutine. | Actual success dispatcher throws on reward branch. **Defect CR2.** Integration covers failure/no-subroutine/removal with a fake helper; no proved real selector policy for deliberately letting a harmless subroutine fire rather than breaking it. |
| 36003 The Tungsten Tailor | Passive strength debuff and once-per-turn income; `Strength`/Run Calculator, Corp `AIReducesIceStrength`, Runner economy-install selector. | Integration checks debuff and first-break/turn reset; real CommandChoice with 1 credit gains credits, 10 credits installs. No decisive route/alternative test proves income value or timing. **Evidence incomplete.** |
| 36004 Corsair | Fracter; bounded stealth reduction `AIImplementBreaker` → Run Calculator; `AIRunRestrictedCredits` plus Corp pool/route modelling. | Integration bounded repeated stealth use and batch13 restricted-credit checks pass. Source traces runtime reduction, break strength gate, source eligibility and encounter cleanup. Real choice/urgent barrier route contrasts beyond existing tests and consumable cross-source sharing are incomplete. **Evidence incomplete.** |

## Supported findings

### CR1 — 36001 cannot become playable through real successful-run dispatch

`sets/vantagepoint.js:35` marks `responseOnRunSuccessful` automatic and expects a `server` argument. `phase.js:332` calls automatic response Resolve with **no arguments**. In the full-engine probe, a Chain Reaction in grip receives three successful-central callbacks with `attackedServer` respectively HQ, R&D and Archives; `Enumerate()` still returns zero choices. The integration test directly supplies `server` and therefore bypasses the actual contract. This prevents the event's central payoff for both AI and human players.

Repair criterion: use the real dispatch context or a hook that receives the server; dispatch actual success for all three centrals and assert event legality, partial-history decline and turn resets, including copies in grip. Preserve printed restriction.

### CR2 — 36002 bad-publicity reward throws at runtime

`sets/vantagepoint.js:216` calls `AddBadPublicity(1)`. No such function exists in the loaded engine. The real helper is `BadPublicity` (`mechanics.js:1590`) and supports prevention/continuation. A resolving Take a Dive with its run active and a recorded fired subroutine throws `ReferenceError` when the actual successful-run dispatcher runs. The integration test defines a mock `AddBadPublicity`, masking the failure.

Repair criterion: use the supported helper with correct prevention/continuation timing; successful run with a subroutine adds bad publicity without phase/cleanup corruption, while failed and no-subroutine runs do not. Verify remove-from-game on the real run-end path.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 1` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.
