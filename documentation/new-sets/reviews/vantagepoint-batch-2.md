# Vantage Point batch 2 independent review

**Verdict: Inconclusive.** Exact IDs: 36005–36008. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36005 Lampades | Access trashing via `AIAccessTriggerPriority` → Runner Run Accessing; `AIReducesTrashCost` valuation; finite counters/eligible stealth sources. | Integration checks counters, split payment, no printed cost and eligibility. Actual source traces priority and payment callbacks, but no real access selector contrasted with normal trash, preservation for a better target or next barrier stealth use. **Evidence incomplete.** |
| 36006 Hackerspace | Hosted discount and hand size; `ChoicesCardInstall`, destination-aware `InstallCost`, `MaxHandSize`, keep/discard consumer. | Real legal install enumeration for Nurse Hạnh offers Hackerspace then ordinary install; discount scope and paired subtypes pass integration. No real installation command proves economical setup versus holding 2 credits/remaining clicks or hand-space benefit. **Evidence incomplete.** |
| 36007 Nurse Hạnh | Draw from grouped facedown Archives reveal; breach `automaticOnArchivesCardsTurnedFaceUp` → `Draw`; `AIDrawInstall`/`AIInstallBeforeRun` and public count keep policy. | Group size and draw hook tested; inspected actual breach engine that turns the group faceup once. Broad command smoke declines installation in initial board. Missing useful Archives draw route versus no-reveal/wasted-install case and overdraw/flatline alternatives. **Evidence incomplete.** |
| 36008 Stick and Poke | Optional installation adds mandatory first-encounter damage/draw; actual encounter callback inserts first subroutine; `AIModifyIceAI` → both route/security descriptions; cleanup after inactivity. | Integration covers inserted ordering, damage continuation after prevention, once-per-turn and inactive cleanup. Source models damage conservatively while omitting draw; no actual planner lethal-empty-grip/valuable-draw/decline-install contrasts demonstrate safety. **Evidence incomplete.** |

## Missing evidence, not supported defects

All four cards were inspected and existing focused mechanics assertions passed, but necessary real decision-path contrasting states were not established. The broad command smoke choosing draw for these cards is not an endorsement of their strategy. There is no supported basis to reopen this batch as defective, and no supported basis to call it passing.

Settle this review with actual access-selector states for Lampades (normal trash versus finite stealth/counter use), setup/discount/hand-space command choices for Hackerspace, Archives reveal opportunity choices for Nurse Hạnh, and Stick and Poke route/install scenarios including an empty grip flatline threat. Cross-test the Lampades/Corsair competition using the current restricted-credit architecture, rather than the stale pending offset test.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 2` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.
