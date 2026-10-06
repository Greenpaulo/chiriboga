# Vantage Point batch 2 independent review

**Current verdict: Changes required.** The initial review verdict was Inconclusive; the continued audit below establishes a missing necessary run-planning effect. Exact IDs: 36005–36008. Implementation was Complete at review start; this review does not equate that status with readiness.

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

## Continued independent review — 2026-10-06

Coordinator resumed on `cards/vantage-point-set-review` at `bd733d6`, an isolated
worktree of the saved review WIP. Production source and green tests are identical
to `45833a1`; the earlier evidence limits above describe the first pass and are
superseded where the following probes supply evidence. All existing source/test
hashes still match. The untracked `ai_corp_original.js` backup from the original
manifest is absent in the resumed worktree; it is not loaded by these probes.

| Card | Added actual-consumer evidence | Continued assessment |
|---|---|---|
| Lampades 36005 | `vantagepoint-batch2-access.cjs` executes actual Runner command choice on access: with a legal stealth credit and sufficient power it chooses trigger; without stealth or power it chooses ordinary trash; when ordinary trash is unavailable it uses the legal ability. | Useful/decline and finite source/counter gates supported. Allocation against an urgent subsequent Corsair run still needs explicit strategy coverage before Pass. |
| Hackerspace 36006 | `vantagepoint-batch2-strategy.cjs` uses actual command, legal install enumeration, install cost and install selector. Nurse Hạnh has both hosted cost 0 and ordinary cost 1 choices; the draw-install preference hardcodes `hostToInstallTo: null` and selects the paid install when both choices exist. | Observed destination preference ignores the discount. A stronger tactical counterexample and setup/hand-size opportunity contrasts remain required; avoid claiming every hosted installation is strategically preferable. |
| Nurse Hạnh 36007 | Same real command probe installs with two facedown Archives cards, but draws instead with zero or one. With Hackerspace it identifies a legal zero-credit install, and with one credit ordinary installation is available. | Contrasting useful versus insufficient-reveal states and affordability established. Grouped reveal/draw and prevention/cleanup mechanics remain supported by inspected focused tests. |
| Stick and Poke 36008 | Same real route consumer rejects an empty-grip/no-breaker first encounter and accepts it with one card. Additional `vantagepoint-batch2-draw-route.cjs` demonstrates the omitted replenishment on a two-ICE route. | **Changes required, C2-1.** Necessary card draw effect is absent from future encounter resources. |

### C2-1 — 36008 draw omitted between encounters makes a survivable run impossible in planning

Locations: `sets/vantagepoint.js:737–792` (live injected subroutine and
`AIModifyIceAI`), `runcalculator.js` damage budgets and route effect accumulation.
The hook explicitly adds `netDamage` and omits the following draw because there
is no draw token. This is a precise missing planner capability, not merely missing
hook documentation.

Reproduction: run `node documentation/new-sets/reviews/probes/vantagepoint-batch2-draw-route.cjs`.
The real engine instances real ezaM on outer HQ and Tithe on inner HQ. Both are
rezzed; Runner has no breakers, one Grip card, one Stack card, ten pool credits
and four clicks. The ordinary route is complete: ezaM has no damage/ETR and Tithe
deals one net damage. Installing Stick and Poke makes the real calculator return
null: it adds one initial damage to Tithe's damage without replenishing Grip.

Expected actual rules sequence: the first injected subroutine deals one net
damage, then draws the remaining Stack card; the Grip returns to one before
Tithe deals its one net damage, so the Runner survives and can breach HQ. This
is a false rejection of a funded route; the draw has strategic consequences even
though the card's net first-encounter hand change is zero. A route with no initial
Grip card must still reject the first damage, and a route with no draw available
must not invent replenishment.

Acceptance: represent finite public draw capacity and its timing on actual
routes, including break/bypass of the inserted subroutine, first-use state,
empty Stack, prevention and hidden-card safety; verify the opposing Corp model
agrees where this effect changes survivability. Re-run actual useful/decline
installation decisions with scarce credits, clicks and mandatory end-of-turn
hand space. Do not silently accept the absence of a draw consumer as strong
support.

Additional executed commands, pinned Node 20.19.0:

- `node documentation/new-sets/reviews/probes/vantagepoint-batch2-access.cjs`: four current-selector contrasts passed.
- `node documentation/new-sets/reviews/probes/vantagepoint-batch2-strategy.cjs`: current destination/reveal and lethal/survivable observations passed.
- `node documentation/new-sets/reviews/probes/vantagepoint-batch2-draw-route.cjs`: asserted and reproduced the current false rejection. A passing observation probe is not a repair acceptance test.

The remaining missing coverage is listed above and must be completed for a Pass.
This review establishes a supported defect, so reopen batch 2 without rewriting
its original completion history.
