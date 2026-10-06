# Vantage Point batch 2 independent review

**Current verdict: Changes required.** The initial review verdict was Inconclusive; the continued audit below establishes a missing necessary run-planning effect. Exact IDs: 36005–36008. Implementation was Complete at review start; this review does not equate that status with readiness.

Latest independent re-review: [2026-10-06 fourth remediation snapshot](#fourth-independent-remediation-re-review--2026-10-06). **Changes required:** C2-1–C2-4 remain supported, and the original C2-5 board now takes the win. New C2-6 shows retained-Grip preferences rejecting a survivable immediate winning route before potentials are refreshed. Historical findings and snapshots below are preserved.

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
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
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

Reproduction: run `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-draw-route.cjs`.
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

- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-access.cjs`: four current-selector contrasts passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-strategy.cjs`: current destination/reveal and lethal/survivable observations passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-draw-route.cjs`: asserted and reproduced the current false rejection. A passing observation probe is not a repair acceptance test.

The remaining missing coverage is listed above and must be completed for a Pass.
This review establishes a supported defect, so reopen batch 2 without rewriting
its original completion history.

## Independent current-snapshot re-review — 2026-10-06

**Verdict: Changes required.** Reviewer: Codex. Set: Vantage Point (`vantagepoint`), batch 2, exact IDs **36005, 36006, 36007, 36008**. Reviewed commit: `76cc502d566d0611562aed21535a693e41ec268e`. Worktree was clean at review start; no active owner was recorded for this batch. Batch 2 was already Pending following the historical review. This audit changes only review evidence and tracker documentation, with no production-code, existing-test or playability changes.

The current source/test/probe content hashes are retained in [the re-review manifest](probes/vantagepoint-batch2-rereview.sha256). The [new probe](probes/vantagepoint-batch2-rereview.cjs) and [its ten scenario results](probes/vantagepoint-batch2-rereview-results.json) supplement the three historical batch-2 probes, all rerun against this snapshot. Assertions in observation probes intentionally describe existing behavior; their passing status does **not** mean the implementation satisfies repair acceptance.

### Current per-card assessment

| Card | Role and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| 36005 Lampades | Limited access trashing: legal `abilities[0].Enumerate` → `ChoicesTriggerableAbilities` → `CommandChoice` access branch → `AIAccessTriggerPriority` and stored card preference; recursive source payment spends hosted stealth credits and a power counter. `AIReducesTrashCost` also feeds approach cost estimation. | Historical access probe rerun: trigger with available stealth/power, normal trash with either exhausted, trigger when ordinary trash unavailable. Integration checks payment, counters and ineligible agendas. **Evidence incomplete:** no demonstrated allocation against a subsequent urgent Corsair run or source ordering among restricted stealth sources. No new supported Lampades defect claimed. |
| 36006 Hackerspace | Setup resource: `AIWorthKeeping` feeds generic install/keep; `ChoicesCardInstall` exposes eligible hosts, destination-aware `InstallCost` discounts them; active `modifyMaxHandSize` feeds `MaxHandSize`, draw/discard and route end-of-turn budgets. | New real command and install selectors choose paid ordinary Nurse installation despite free hosting that also completes the Companion/Connection pair. Zero-credit control selects the sole free hosted option. Post-install legal zone comparisons give hand sizes 5 versus 7. **Changes required, C2-2.** Setup versus holding two credits and durable hand-space planning still needs acceptance coverage. |
| 36007 Nurse Hạnh | Passive draw on grouped reveal: `runBreachServer.Init` → `AutomaticTriggers` → real `Draw`. Public facedown count feeds `AIWorthKeeping`, `AIDrawInstall` and Archives-specific `AIInstallBeforeRun`; command selection consumes them. | Installs with two facedown cards, draws instead with zero/one; zero-credit hosted installation remains legal. Actual breach with zero/one/two facedown cards draws zero/zero/two, respectively, moves real Stack cards and turns the group faceup. **Useful/decline and live trigger supported; full strategic evidence incomplete:** expensive/unsafe Archives, exhausted Stack, last-click and overdraw alternatives remain unproven. Also affected by C2-2. |
| 36008 Stick and Poke | First-encounter resource: live damage-then-draw subroutine, once-per-turn resets/encounter cleanup; `AIModifyIceAI` feeds Runner routes and Corp classification. `AIInstallBeforeRun` and `AIWorthKeeping` drive preparation/install decisions. | Empty Grip route declines and one-card harmless route accepts. Historical two-ICE draw route still falsely rejects; same-board Corp assessment reports no hard lockout/zero mandatory cost while Runner rejects. New command chooses installation on an otherwise survivable Tithe route, including a publicly known winning steal; post-install empty-Stack route is lethal. **Changes required, C2-1 and C2-3.** |

### C2-1 revalidated — 36008 finite, ordered draw remains absent from routes

The historical counterexample still holds at the current commit. One Grip card, one Stack card, no breakers, rezzed outer ezaM and inner Tithe: Runner accepts the ordinary route and rejects the route with installed Stick and Poke. The first damage consumes the Grip card, its subsequent draw replenishes it, and Tithe's one damage is survivable. The model at `sets/vantagepoint.js:819–821` inserts only `netDamage`; `runcalculator.js:844–855` tests accumulated damage against a fixed budget without this intervening replenishment. On the same public board, actual Corp `_evaluateServerSecurity` gives `hasHardLockout: false` and `totalMandatoryBreakCost: 0`; this contrast does not establish that all Corp draw/budget cases are correct.

Retain the original C2-1 acceptance criteria: ordered finite draw, empty Stack/Grip, prevention, break/bypass, first-use state and both planners' survivability. Consume public Stack size, never hidden card contents/order. This remains a necessary missing planner capability, not a harmless conservative approximation.

### C2-2 — 36006/36007 install preference discards the discount and hand-size benefit

Board: installed Hackerspace hosts Stick and Poke; Nurse Hạnh is in Grip; Runner has **one credit**, four clicks, no tags, no installed threats to the host, and two facedown Archives cards. Legal install options are Nurse onto Hackerspace for **0**, or ordinary Nurse for **1**. Actual `CommandChoice(['install','draw','gain'])` chooses Nurse installation; actual `SelectChoice(ChoicesCardInstall(nurse))` then chooses **ordinary**, spending the last credit and leaving maximum hand size at **5**. Hosting costs no additional click and would give maximum hand size **7**. This is a concrete dominated choice on this board; it need not imply that hosting is always best under other threats.

Location: `ai_runner.js:2627–2632` hardcodes `hostToInstallTo: null` after choosing a draw install. The pre-run path also hardcodes an ordinary destination at `ai_runner.js:2461–2466` and checks ordinary cost earlier at `2443`, so repairs must audit relevant consumers rather than only the draw branch. The zero-credit control succeeds because the real legal list has only the hosted option; it does not validate destination ranking when alternatives exist.

Impact: wastes scarce credits and fails to obtain Hackerspace's defining paired-host benefit. Repair/acceptance: preserve a strategically selected legal destination from command through selection and cost budgeting; prove the free paired-host choice with one credit, hosted-only affordability with zero, ordinary installs when hosting is ineligible or strategically unsafe, and installation versus other urgent actions. Use a reusable destination-aware consumer, with no card-title special case. Add permanent real-selector regression coverage.

### C2-3 — 36008 preparation destroys a survivable, including winning, steal route

Board: Runner has Stick and Poke plus one other Grip card, **empty Stack**, ten credits, four clicks, no breakers/prevention. A remote contains publicly known Superconducting Hub (one agenda point) behind rezzed Tithe. Running immediately suffers Tithe's one damage and survives with one Grip card. With Runner at **six points**, that known steal wins now; an otherwise identical zero-point control confirms the general unsafe-preparation case.

Actual `CommandChoice(['install','run','gain'])` chooses to install **Stick and Poke** in both cases. Installing consumes one click and removes its card from Grip. The added subroutine then consumes the last remaining Grip card, draws nothing from the empty Stack, and Tithe flatlines the Runner. The real post-install calculator rejects the complete route. This establishes unsafe preparation and a forfeited immediate winning opportunity; it does not claim the AI subsequently initiates the lethal run.

Location: unconditional `AIInstallBeforeRun` at `sets/vantagepoint.js:828–829`; `ai_runner.js:2427–2466` checks the original route's clicks/credits and legality, explicitly ignores the lost Grip card, and does not recalculate the installed effect. `AIWorthKeeping` also unconditionally keeps this card. Impact: preparation can make the intended run impossible, displacing a guaranteed winning steal.

Repair/acceptance: reject preparation that invalidates the intended run after paying installation clicks/credits and removing the Grip card; account for newly introduced damage/draw and finite Stack before returning the install preference. Show the actual command/card/server sequence runs directly for this six-point board, declines unsafe installation in the nonwinning control, and installs in justified useful states. Cover prevention, available draw, first-use and last-click cases without leaking hypothetical state or reading hidden Stack contents.

### Verification and evidence limits

Pinned runtime: Node **v20.19.0**, matching `.nvmrc`. All commands below passed:

- `node scripts/batch-brief.js 2` — confirmed tracker allocation, public printed rules and already Pending status.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-access.cjs` — four access-selector observations.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-strategy.cjs` — destination/reveal and lethal/survivable observations.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-draw-route.cjs` — existing false rejection reproduced.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-rereview.cjs` — ten new current-behavior decision, actual breach and opposing-planner observations. An initial headless setup attempt lacked the normal `suppressCreditDrawSound` global; initialized that UI flag and reran successfully, without stubbing gameplay or decisions.
- `node --check sets/vantagepoint.js`.
- `node tests/vantagepoint-integration.test.js`.
- `node tests/vantagepoint-batch13.test.js`.
- `node tests/corp-server-security.test.js` — 145 cases.
- `node tests/credit-pool-lock.test.js` and `node tests/tailgate-hq-access-not-granted.test.js`.
- `node tests/eternal-format.test.js`, `node tests/deckbuild-format-pool.test.js`, `node tests/decklauncher-identity-change.test.js`.
- `node tests/ai-hook-docs.test.js` — 128 hooks, 40 existing legacy exceptions.
- `node tests/corp-decision-fixtures.test.js` — 15 fixtures; `node tests/decision-snapshots.test.js` — 11 snapshot tests.
- `node tests/run-all-tests.js` — **51 files passed**, including both required decision suites, excluding known-red pending reproductions.
- `git diff --check` — passed after report/tracker changes.

The new probes load actual engine/AI consumers and only inert browser rendering/audio. Equivalent post-install states compare resource consequences; they are not full install UI playthroughs. No browser game, whole-match measurement or new tuning claim was made. Source traces found no hidden opponent-card reads in the batch hooks: Nurse inspects public facedown counts, Lampades the currently accessed card and own installed sources, Stick and Poke public encounter state. Exhaustive mutation/privacy contrasts and the outstanding per-card acceptance scenarios remain required before a Pass.

Batch 2 remains **Pending**, owner **—**; summary counts stay **2 complete, 11 outstanding**. Repairs proceed through `implement-card-batch`, followed by independent re-review. This report does not renew the separate set-wide verdict.

## Remediation log

### 2026-10-06 — Codex, batch 2 repair

- **C2-1:** repaired finite ordered damage/draw in `RunCalculator`, live inserted
  subroutine masking and Corp complete-route selection. Permanent opposing-planner
  contrasts cover the reported ezaM/Tithe route, empty Grip/Stack, used state,
  break/bypass, free finite prevention, hidden Stack identity independence, finite
  Event Horizon reruns and payment damage after replenishment. Real prevention
  dispatch verifies that prevented damage still continues to the actual draw.
- **C2-2:** added reusable destination ranking and retained the selected legal
  host through real command/card/host selection and cost budgeting. Regressions
  prove free paired hosting with one credit, hosted-only affordability with zero,
  ordinary ineligible hosting, actual +2 maximum hand size, worthwhile paired
  setup versus holding a lone discount, and exhausted/blocked draw opportunities.
- **C2-3:** preparation rechecks the intended complete route after install cost,
  click and Grip removal with passive installed effects. Real selectors run
  directly to the known winning agenda on the reviewed empty-Stack board; the
  nonwinning control declines unsafe installation. Useful paired installation,
  last-click decline and exception-safe state restoration are covered.
- **Named evidence gaps:** Lampades now has actual access and recursive payment
  evidence with exhausted counters/sources, cheap ordinary trash, subsequent
  Corsair competition and preservation of flexible funding. Nurse has actual
  breach dispatch plus useful Archives server selection and expensive/unsafe,
  exhausted Stack, click and overdraw declines. Existing mechanics assertions
  remain supplementary rather than substitutes for decisions.

Permanent evidence: `tests/vantagepoint-batch2.test.js`; implementation rationale
and affected consumers: [batch 2 notes](../../vantage-point-implementation-notes.md#batch-2-remediation--c2-1-c2-2-c2-3-2026-10-06).
The original observation probes, manifests and recorded results are preserved;
their assertions of bad behavior are not converted into green expectations.
The historical pending Corsair offset probe still fails all four cases because
its removed hook/unrestricted-pool expectations are obsolete; evidence is now
also recorded in its bug ticket. Its expectations and pending status are intact.

**Independent re-review required:** all four cards, C2-1–C2-3 and the named
strategic contrasts; batch 1's Corsair/Tailor and batches 12–13's finite route,
source-payment and prevention consumers; existing draw/pre-run install users.
This remediation log does not change the independent verdict or set-wide status.

Verification: Node 20.19.0; focused batch 2/integration, affected batch 1/11/12/13,
Corp security (145 cases), credit-pool and hook-documentation tests pass.
All required syntax/format/deck/identity checks and `git diff --check` pass.
Final `node tests/run-all-tests.js`: **52 test files passed**, including Corp
decision fixtures and decision snapshots, excluding known-red pending tests.
Batch 2 is Complete in the implementation tracker; independent re-review is
still required. No new limitation is accepted; batch 3 is next for repair.

### 2026-10-06 — Codex, C2-4 decisive funding remediation

- **Reproduction:** reran the retained independent repair probe before edits;
  all five observations passed, including the positive-savings access payment
  that loses the public winning Corsair route. The new permanent regression
  failed at the actual access command (`trigger` rather than `trash`). Historical
  probe assertions and review verdicts are retained unchanged.
- **Repair:** Lampades uses one shared least-flexible-first hosted allocation for
  access priority and live recursive payment. Runner's reusable public complete
  route evaluator compares proposed payment with the currently feasible winning
  steals, accounting for run/steal clicks, pool costs and finite hosted funding.
  Ordinary access trash mirrors the actual payment consumer; outside-credit
  preservation selects pool payment when necessary. If neither trash preserves
  the winning opportunity, the actual access command leaves the card.
- **Acceptance:** `tests/vantagepoint-batch2.test.js` exercises real access
  command/card/payment, scarce/plentiful stealth, positive/free ordinary trash,
  unaffordable ordinary trash, expensive steal costs, access-only funding,
  nonwinning/hidden agendas and expired clicks. Real payment and complete routes
  confirm the selected branch preserves the necessary two stealth credits.
  Throwing hidden identity getters, exact cache checks and an exception after
  hypothetical source debit cover privacy and restoration.
- **Existing findings:** C2-1–C2-3 and all four cards' named evidence are rerun in
  the permanent batch suite; no additional card mechanics or ELO edits are needed.
- **Independent re-review scope:** C2-4 access allocation and actual payment;
  all four cards' retained strategic acceptance; other access trash/trigger
  users, batch 1 Corsair/Tailor, and batches 11–13 finite routes, restricted
  funding and outside-credit prevention consumers. No independent approval or
  changed reviewer verdict is claimed. No new limitation is accepted.

See [implementation and consumer evidence](../../vantage-point-implementation-notes.md#batch-2-decisive-access-funding-repair--c2-4-2026-10-06).

Verification: Node 20.19.0; focused batch 2/integration and affected batch
1/11/12/13, Corp-security (145 cases), credit-pool and hook-doc tests passed.
Required syntax/format/deck/identity checks and `git diff --check` passed.
Final `node tests/run-all-tests.js`: **52 files passed**, including Corp decision
fixtures and decision snapshots; known-red pending tests excluded. Card-status
regeneration and the no-unfinished-marker brief passed. Implementation tracker
records batch 2 Complete; batch 3 is next. Independent re-review is outstanding.

### 2026-10-06 — Codex, C2-4 actual access payment contract repair

- **Repair list/evidence:** C2-4 requires the real access payment reason and
  legal trash-only source allocation. The retained actual-payment probe
  reproduced both defects before edits (15 diagnostic observations). Replacing
  the permanent test's substitute payment with real phase enumeration and
  `phases.runAccessingCard.Resolve.trash` failed at the resulting winning route.
  C2-1–C2-3 remain supported by the rerun permanent all-card acceptance; their
  mechanics, destinations, preparation and opposing route tests still pass.
- **Change:** Runner `AIPreserveOutsideCredits`, `_accessTrashPayment` and the
  access command selector now use `"paying trash costs"`, matching the actual
  phase, `SpendCredits`, `CreditPoolCanBeUsed` and legal recurring-credit sources.
  Azimat is included in hypothetical ordinary-trash funding. The separate Corp
  click-to-trash `"trashing"` contract is unchanged. No card metadata, ELO,
  gameplay mechanics or planner tuning needed alteration.
- **Permanent acceptance:** `tests/vantagepoint-batch2.test.js` now enumerates
  real legal access commands and resolves ordinary trash through the real phase.
  Trigger cases select the actual card, invoke the phase's trigger resolver,
  select ability parameters and resolve that choice. Scarce stealth pays three
  pool credits, preserving both stealth credits and the complete winning route;
  plentiful stealth uses Lampades and still preserves two. With one pool credit,
  Azimat pays two trash credits and preserves both pool and stealth. Temporary
  credits, free trash, unsafe/unaffordable trash, no Lampades, real additional
  steal-click costs, hidden/nonwinning targets and expired clicks provide
  contrasting outcomes. A reason-sensitive pool lock rejects unsafe trash;
  Azimat still funds safe trash while the pool is locked. Existing exception,
  privacy and cache-restoration assertions remain.
- **Verification:** Node 20.19.0; focused batch 2/integration, affected batch
  1/11/12/13, Corp security (145 cases), credit-pool lock and hook-doc suites pass.
  Syntax/format/deck/identity checks, status regeneration, no-unfinished-marker
  brief, empty-effect audit and `git diff --check` pass. Final
  `node tests/run-all-tests.js`: **52 files passed**, including Corp decision
  fixtures and decision snapshots; known-red pending reproductions excluded.
- **Re-review scope:** C2-4 actual legal access selection/payment and Azimat;
  retained C2-1–C2-3 acceptance for all four batch cards; shared ordinary access
  trash, source-sensitive payment/prevention and locked-pool consumers, including
  batches 1 and 11–13. Historical independent findings/verdict remain intact.
  No new limitation is accepted; independent batch review is still required.

See [actual payment notes](../../vantage-point-implementation-notes.md#batch-2-actual-access-payment-contract-repair--c2-4-2026-10-06).

### 2026-10-06 — Codex, C2-5 ordinary winning-run precedence

- Reproduced C2-5 in a permanent expected-outcome regression before the repair:
  real ordinary command/server choice selected Nurse's Archives draw over a
  publicly known last-click winning steal. C2-1–C2-4 remain independently
  resolved in the latest report; all their existing acceptance tests are retained.
- Added the existing public winning-route check to ordinary run selection before
  potential/preparation. Kept route evaluation in prospective run context until
  affordability is settled, restoring it in `finally`; run-only sources and
  last-click route budgets now apply. No draw-bonus adjustment, title list,
  hypothetical installation or live resource payment.
- Permanent batch 2 tests add twelve real command/server contrasts (five immediate
  wins and seven useful-draw alternatives), two actual restricted-funding/steal
  payment contrasts and supplemental exception/resource-restoration evidence.
  See [implementation notes](../../vantage-point-implementation-notes.md#batch-2-ordinary-winning-run-precedence-repair--c2-5-2026-10-06).
- Verification: Node 20.19.0; focused batch 2/integration, affected batch 1/11/12/13,
  Corp-security/payment/hook-doc suites and required syntax/format/deck/identity
  checks pass. Full `node tests/run-all-tests.js`: 52 files pass, including Corp
  decision fixtures and decision snapshots. Card-status regeneration, batch brief
  (no unfinished markers for all four cards) and `git diff --check` pass.
- Required independent re-review: C2-5 ordinary win precedence and controls,
  C2-1–C2-4 retention, batch 1 expiring-play precedence, and affected complete
  route/payment consumers in batches 11/12/13. Historical observation probes
  and their snapshot results remain unchanged; the C2-5 bad-behavior assertion
  is diagnostic history, not a green expected-outcome test. Independent findings
  and Changes required verdict are preserved.

## Independent remediation re-review — 2026-10-06

**Verdict: Changes required.** Reviewer: Codex independent batch reviewer.
Vantage Point (`vantagepoint`), batch 2, exact IDs **36005, 36006, 36007,
36008**. Reviewed base commit: `76cc502d566d0611562aed21535a693e41ec268e`,
with the uncommitted remediation present. This verdict describes the dirty source
snapshot in [the new manifest](probes/vantagepoint-batch2-independent-repair.sha256),
not the base commit alone. Historical reviews and remediation claims above are
retained. C2-1–C2-3 have passing repair evidence; **C2-4 is newly demonstrated**.

At review start, modified files were `ai_corp.js`, `ai_runner.js`,
`runcalculator.js`, `utility.js`, `sets/vantagepoint.js`, `documentation/ai.md`,
`tests/ai-hook-docs.test.js`, `tests/vantagepoint-integration.test.js`, the
Corsair/Lampades bug ticket, implementation backlog, tracker, batch 2 report and
implementation notes. Untracked files were `tests/vantagepoint-batch2.test.js`
and the earlier batch2-rereview probe/results/manifest. These were preserved.
There was no active batch claim or collaborating agent editing these files.
This review adds evidence and updates the report/tracker only; it makes no
production-code, existing-test, commit, push or playability changes.

### Per-card current evidence

| Card | Strategic role and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| Lampades 36005 | Finite stealth-only access trash; actual `Run Accessing` command → `ChoicesTriggerableAbilities`/`SelectChoice` → ability resolution → recursive `SpendHostedCredits`; `AIReducesTrashCost` supports access valuation. | Permanent tests cover useful ability, exhausted source/counter, ordinary cheap trash and flexible-source preservation. New independent real command/card/payment and complete-route contrasts show that **positive ordinary-trash savings override a necessary winning-run stealth reserve**, C2-4. **Changes required.** |
| Hackerspace 36006 | Economical setup, destination discount and paired hand capacity; `_preferredInstallChoice`, draw/pre-run/generic install preferences, `_commonCardToInstallChecks`, `InstallCost`, `MaxHandSize` and keep/discard hooks. | Permanent real command/card/host tests select free paired hosting with one credit and hosted-only affordability with zero; ordinary ineligible install, lone-discount decline, funded overfull-Grip paired setup and actual hand size seven. Independent hosted/unhosted ranking contrasts exclude tagged resource hosts. **C2-2 resolved; sufficient current batch evidence.** |
| Nurse Hạnh 36007 | Useful grouped Archives reveal draw; real breach dispatch and `Draw`; draw/pre-run install selectors and public `AIRunExtraPotential`; ordered `AIRunBreachDraw` consumed by Runner and Corp routes. | Permanent useful install and actual Archives server choice versus insufficient reveal, exhausted Stack, last click, excess hand size and blocked route; real zero/one/two reveal groups draw zero/zero/two. Independent actual command/card/host selection succeeds with concealed Archives getters that throw on title/type access; exposed tagged-host case declines setup and destination ranking selects ordinary. **Sufficient current batch evidence.** |
| Stick and Poke 36008 | Mandatory first-encounter damage then draw; live insertion/broken masking and cleanup; `AIModifyIceAI` and `AIRunOrderedDraw` feed complete opposing routes; worth-keeping and post-install safety consumers. | Permanent opposing planners accept ezaM/Tithe with one Grip/one Stack, reject empty Grip/Stack, handle used state, break/bypass, finite free prevention, live damage continuation, hidden Stack identity, finite Event Horizon reruns and later Shackleton payment damage. Actual selectors run directly on the six-point unsafe-setup board, decline the nonwinning unsafe setup, select useful paired setup and decline last-click installation; exception/restoration checks pass. **C2-1 and C2-3 resolved; sufficient current batch evidence.** |

The new regression assertions were inspected, not treated as proof merely
because they pass. They use real engine/AI files; only browser rendering/audio
are inert. Free net prevention is a synthetic, contract-valid finite source with
a real engine response, not an assertion that existing paid prevention is free.
Both the original rule sequence and finite resources explain the expected route
results. The source review also traced the changed shared installation consumers,
ordered damage validation, payment-policy overlays and finite rerun accounting.
Existing batch 1/11/12/13, Corp-security and payment tests pass against those
consumers. No new title special case or hidden opponent read was found in the
reviewed batch hooks. Documentation matches the new hook call sites.

### C2-4 — 36005 access savings consume the only stealth funding for a known winning steal

**Reproduction:**
`node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-independent-repair.cjs`.
The retained [five results](probes/vantagepoint-batch2-independent-repair-results.json)
include the scarce/plentiful/cheap-trash controls and hosting/privacy contrasts.
Assertions intentionally record the defective current decision, not repair
acceptance.

Concrete board: Runner has six agenda points, ten pool credits, three remaining
clicks, seven ordinary event cards in Grip (no hardware to replenish Methuselah),
installed Lampades with one power counter, Corsair, and Methuselah with **two
hosted stealth credits**. The current HQ access is Luana Campos, printed rez
cost **1**, normal trash cost **3**. A remote holds a publicly known
Superconducting Hub, worth the winning point, behind rezzed Funhouse, strength
**4**. With no other breaker or strength reduction, Corsair needs two stealth
payments to bring Funhouse to strength zero.

Actual access `CommandChoice(['trash','trigger','n'])` chooses **trigger**;
actual `SelectChoice(ChoicesTriggerableAbilities(runner, 'access'))` selects
Lampades. Resolving its real ability spends one hosted credit and its last power
counter. The complete route before that payment is feasible. The ordinary-trash
resource alternative (pool ten → seven, stealth remains two) also has a complete
route. After actual Lampades payment (pool remains ten, stealth two → one), the
same complete route is **null**. Pool credits cannot replace Corsair's required
stealth payment, and the own Grip supplies no replenishing hardware.

Expected: preserve the two stealth credits and either pay the affordable ordinary
trash cost or leave this nonwinning access. Both alternatives preserve a known
winning steal; saving two pool credits cannot justify eliminating that outcome.
The three-stealth-credit control legitimately triggers Lampades and retains a
complete route. The free ordinary-trash control chooses trash. These controls
show why comparing ordinary trash cost with printed cost alone is insufficient.

Locations: `sets/vantagepoint.js:658–665`, `AIAccessTriggerPriority`, returns
priority 3 solely when ordinary trash is unavailable or more expensive;
`ai_runner.js:1650–1708`, access priority dispatch, chooses it ahead of ordinary
trash. Recursive source flexibility ordering cannot help when there is only one
shared stealth source. The permanent test's subsequent Corsair contrast uses
**ordinary trash cost zero**, so it does not cover the positive-savings case.

Impact: a discretionary access trash destroys the resource basis of a known
winning steal. This is a demonstrated tactical funding defect, not a request
for mathematically optimal multi-turn planning.

Repair/acceptance: make the access decision retain the necessary finite stealth
reserve for publicly known decisive follow-up routes. Use reusable public
resource/route evaluation rather than a named-card exception; account for the
normal-trash pool cost and the ability's actual source allocation. Preserve all
hypothetical state and do not inspect hidden Corp or Stack identities. Add a
permanent real command/card/payment regression for this **positive-savings**
board, an affordable ordinary-trash/decline alternative, and the plentiful-stealth
control where triggering remains justified. Revalidate the existing free-trash,
exhausted counter/source and flexible-payment cases. Re-review independently.

### Verification and scope limits

Node **v20.19.0**, matching `.nvmrc`. All executed verification passed:

- `node scripts/batch-brief.js 2` — exact allocation and printed rules.
- `node tests/vantagepoint-batch2.test.js` — inspected permanent strategic acceptance.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-independent-repair.cjs` — **five** additional observations, including C2-4.
- `node --check sets/vantagepoint.js`.
- `node tests/vantagepoint-integration.test.js`.
- `node tests/vantagepoint-batch1.test.js`.
- `node tests/vantagepoint-batch11-engine.test.js`.
- `node tests/vantagepoint-batch12.test.js`.
- `node tests/vantagepoint-batch13.test.js`.
- `node tests/corp-server-security.test.js` — **145 cases**.
- `node tests/credit-pool-lock.test.js`.
- `node tests/ai-hook-docs.test.js` — **132 hooks**, **39 legacy exceptions**.
- `node tests/eternal-format.test.js`.
- `node tests/deckbuild-format-pool.test.js`.
- `node tests/decklauncher-identity-change.test.js` — **3 cases**.
- `node tests/run-all-tests.js` — **52 files passed**, including Corp decision fixtures and decision snapshots; known-red pending reproductions excluded.
- `git diff --check` — passed before and after review documentation updates.

No verification failure is being hidden by the overall Changes required verdict.
The new probe initially lacked a prospective active-server context for
Methuselah's run-only credits; corrected the scenario to supply the actual target
run context, as the permanent Corsair route contrasts do. An attempted subsequent
whole command assertion did not select the intended remote and was not used as
proof of follow-up command behavior. The retained counterexample establishes
actual access command/card/payment choices and supported complete-route resource
consequences; it does not assert a later full game/UI sequence or measured match
win rate. The tagged-host supplementary ranking assertion is helper evidence;
the untagged case exercises actual command and install selection.

A necessary remaining capability is source-sensitive preservation of decisive
follow-up funding during access. It is not accepted as a harmless architecture
limitation. This finding leaves the other cards' current named evidence intact,
but prevents a batch Pass. Historical observation probes are retained and not
rewritten into acceptance tests; their obsolete bad-behavior assertions were not
rerun as green regressions.

Batch 2 is reopened **Pending**, owner **—**. Tracker counts return to **2
complete, 11 outstanding**. Repairs go through `implement-card-batch`, then
independent re-review. The separate historical set-wide verdict is unchanged.

## Second independent remediation re-review — 2026-10-06

**Verdict: Changes required.** Reviewer: Codex independent batch reviewer.
Vantage Point (`vantagepoint`), batch **2**, exact IDs **36005, 36006, 36007,
36008**. Base commit `76cc502d566d0611562aed21535a693e41ec268e`; this review
applies to the dirty source/test snapshot in the
[SHA-256 manifest](probes/vantagepoint-batch2-payment-rereview.sha256).
Historical reviews and implementation completion records remain intact.

At start, modified files were `ai_corp.js`, `ai_runner.js`, `runcalculator.js`,
`utility.js`, `sets/vantagepoint.js`, `documentation/ai.md`,
`tests/ai-hook-docs.test.js`, `tests/vantagepoint-integration.test.js`, the
Corsair/Lampades bug ticket, implementation backlog, tracker, batch 2 report and
implementation notes. Untracked files were `tests/vantagepoint-batch2.test.js`
and the earlier batch2-rereview and batch2-independent-repair probes, results
and manifests. All pre-existing edits were preserved. No active batch owner was
recorded; no sub-agents were used. Source and focused-test hashes remained stable
through the audit and full suite. Process enumeration was unavailable in the
sandbox, so concurrent external activity was checked by content stability rather
than a process listing. This review changes evidence/report/tracker only.

### Per-card current assessment

| Card | Strategic role and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| Lampades 36005 | Finite stealth-only trash, legal access abilities → access command/card selectors → `TriggerAbility` → ability/payment; ordinary trash via `runAccessingCard.Resolve.trash` → `SpendCredits`; trash-cost valuation and winning-route reserve. | New real phase probe proves scarce funding fails after selecting ordinary trash; plentiful stealth, free trash, temporary credits and unaffordable-trash decline are justified controls. Actual click-cost agenda and no-Lampades controls expose the same shared defect. Azimat's actual legal allocation is ignored by the model. **Changes required; C2-4 remains open.** |
| Hackerspace 36006 | Destination discount, paired hand capacity and budgeted setup via `AIWorthKeeping`, `AIInstallBeforeInstall`, `_commonCardToInstallChecks`, `_preferredInstallChoice`, legal installs, `InstallCost`, `MaxHandSize`. | Inspected and reran permanent real commands: lone one-credit discount declines two-credit setup; funded overfull-Grip pair selects setup before resources; eligible free paired hosting versus ordinary ineligible install. New probe selects Nurse/Hackerspace with zero pool, confirms seven-card capacity, and declines tagged setup. **C2-2 remains resolved; sufficient current evidence.** |
| Nurse Hạnh 36007 | Grouped public Archives reveal draw; draw/pre-run installation and server potential; breach dispatch → `Draw`; `AIRunBreachDraw` feeds ordered opposing routes. | Permanent zero/one/two reveal groups draw zero/zero/two; useful actual Archives selection versus exhausted Stack; scarce credits, last click, overdraw and blocked-route declines. New zero-credit command/card/host probe succeeds without reading concealed Archives title/type; tagged control declines. **Sufficient current evidence.** |
| Stick and Poke 36008 | Mandatory first-encounter damage then finite draw, inserted live subroutine/broken masking/cleanup; `AIModifyIceAI`, ordered damage resources, both complete-route planners, useful install valuation and `_runAfterInstall`. | Independent ezaM/Tithe routes agree across both planners: one Grip/one Stack survives, empty Grip or empty Stack fails; state remains unchanged. Permanent real winning/nonwinning unsafe preparation declines, useful paired install, last-click decline, break/bypass, finite prevention, used state, Horizon reruns and later Shackleton payment order all pass. **C2-1/C2-3 remain resolved; sufficient current evidence.** |

Assertions and consumers were inspected, not accepted merely because the tests
pass. The mandatory damage precedes draw, and a later draw cannot undo flatline.
Hosting a zero-cost Nurse completes a useful pair without consuming scarce pool
credits. A lone discount cannot repay Hackerspace setup. The winning steal must
take precedence over discretionary trash savings. These explain the contrasting
expected choices. Relevant AI principles, both sides' architecture, hook
documentation and encounter/breach/credit engine patterns were checked. No new
hidden-card read, title special case or leaked hypothetical mutation was found
in the reviewed batch paths. The payment documentation promises preservation
which the real consumer does not deliver.

### C2-4 still open — real trash payment bypasses the new reserve policy

**Card:** 36005 Lampades; also affects ordinary access trash without Lampades.
**Reproduce:**
`node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-payment-rereview.cjs`.
The [15 retained observations](probes/vantagepoint-batch2-payment-rereview-results.json)
use real phase enumeration, command/card selection, phase resolution and planners.
Defect assertions deliberately record the current bad behavior; their passing
output is not repair acceptance. No planner/selector/payment function is stubbed.

**Board:** six Runner points, ten pool credits, three clicks, seven event cards
in Grip, installed Corsair, Methuselah with **two** stealth credits, Lampades
with one power counter. A public Superconducting Hub behind rezzed Funhouse is
a winning steal requiring both stealth credits. HQ access is Luana Campos,
printed rez one and trash three. There is no hardware in Grip to replenish the
console. The new reserve correctly declines Lampades. Real `CommandChoice`
selects **trash**, but `runAccessingCard.Resolve.trash` spends **both stealth
credits plus one pool credit**, leaving pool nine, stealth zero. The complete
winning route becomes null. Paying three pool credits leaves pool seven and
stealth two and preserves the winning route, as the existing permanent scenario
also demonstrates when it uses its substitute reason string.

**Cause/locations:** `phase.js:1621`–`1625` passes **`"paying trash costs"** to
`SpendCredits`, consistent with legal enumeration at `phase.js:1592`.
`ai_runner.js:83` only activates reserve preservation for **`"trashing"**.
The selector at `ai_runner.js:1772`–`1773` evaluates that different string, so
it predicts a pool allocation that the actual phase never requests.
`mechanics.js:1361` consumes the actual reason when invoking the policy.
`tests/vantagepoint-batch2.test.js:208` directly calls `SpendCredits` with
`"trashing"`, avoiding the actual phase and concealing the mismatch.

**Independent controls:** three stealth credits correctly choose the real
Lampades trigger and retain two; zero normal trash cost or three current
temporary credits preserve the route; one pool credit with trash three correctly
declines both unsafe options. Removing Lampades still produces the bad ordinary
payment. Replacing Hub with public Méliès City Luxury Line and allowing two
remaining clicks reproduces the loss; one remaining click correctly removes the
winning-steal reserve because its additional steal click cannot be paid.

**Related allocator defect:** `_accessTrashPayment` at `ai_runner.js:1262`
tests `source.canUseCredits("trashing", accessingCard)`. Actual Azimat
(`sets/elevation.js:1030`) accepts **`"paying trash costs"** only. With the same
winning board, **one pool credit, trash cost two, and two Azimat credits**, the
real command incorrectly selects **leave**: the hypothetical allocator ignores
Azimat and predicts loss of Methuselah funding. Resolving the legally enumerated
ordinary-trash alternative through the real phase spends Azimat's two credits,
leaves Methuselah's two and pool one untouched, and retains the winning route.
This is a demonstrated useful-target decline, not just missing test evidence.

**Impact:** the repaired preference still loses an immediately available public
win during real play, and can decline safely funded trash. The shared reason
contract affects existing access cards/funding sources, beyond this batch.

**Repair/acceptance:** align the reserve policy, hypothetical allocation and
selector with the real engine's trash payment reason; inspect all actual
callers/source contracts rather than changing a single comparison to fit the
probe. Add permanent regression coverage that invokes
`phases.runAccessingCard.Resolve.trash`, with real legal enumeration and actual
command/card selection. Scarce stealth must pay safe pool funding or decline;
the resulting complete winning route must remain feasible. Azimat must be
recognized and spent when its legal trash-only credits preserve scarce stealth.
Retain plentiful/temporary/free/unsafe/expired-click controls and verify no
Lampades ordinary trash, source-sensitive damage and locked-pool consumers.
This is a batch repair, not a deeper architecture blocker.

### Verification and limits

Runtime **Node v20.19.0**, matching `.nvmrc`. All commands passed:

- `node scripts/batch-brief.js 2` — exact range, metadata, no unfinished markers.
- `node tests/vantagepoint-batch2.test.js` and
  `node tests/vantagepoint-integration.test.js` — focused acceptance/mechanics.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-payment-rereview.cjs`
  — 15 independent observations, including the supported failures above.
- `node tests/vantagepoint-batch1.test.js`,
  `node tests/vantagepoint-batch11-engine.test.js`,
  `node tests/vantagepoint-batch12.test.js`,
  `node tests/vantagepoint-batch13.test.js` — affected shared consumers.
- `node tests/corp-server-security.test.js` — 145 regression cases;
  `node tests/credit-pool-lock.test.js`;
  `node tests/ai-hook-docs.test.js` — 132 hooks, 39 legacy exceptions.
- `node --check sets/vantagepoint.js`;
  `node tests/eternal-format.test.js`;
  `node tests/deckbuild-format-pool.test.js`;
  `node tests/decklauncher-identity-change.test.js`; `git diff --check`.
- `node tests/run-all-tests.js` — **52 test files passed**, including
  `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`;
  known-red pending reproductions excluded. No suite failure occurred.
- `shasum -a 256 -c /tmp/vantagepoint-batch2-review-start.sha256` — reviewed
  core source and focused tests unchanged during execution; retained manifest
  identifies this snapshot and the new evidence.

The green suite misses the real-phase payment contract; it cannot override the
reproduction. Historical bad-behavior probes were preserved, not rewritten or
rerun as acceptance. Other three cards have sufficient named evidence at this
snapshot. Synthetic free prevention evidence establishes the finite public hook
contract, not support for unmodeled legacy paid prevention. This is a batch and
affected-consumer review, not renewed full-set approval or a measured win-rate
claim. No additional optional improvement or missing ruling blocks this verdict.

Batch 2 is reopened **Pending**, owner **—**; tracker now records **2 complete,
11 outstanding**. Implementation history stays append-only. Use
`implement-card-batch` for C2-4 repair and then independent re-review.


## Third independent remediation re-review — 2026-10-06

**Verdict: Changes required.** Reviewer: Codex, independent review in a fresh
conversation. Exact cards: **36005 Lampades, 36006 Hackerspace, 36007 Nurse Hạnh,
36008 Stick and Poke**. Reviewed HEAD:
`76cc502d566d0611562aed21535a693e41ec268e`, including the dirty implementation
snapshot. No other agent was active. No production code, existing tests,
playability flags, commits or pushes were changed during this review.

At entry, modified tracked files were `ai_corp.js`, `ai_runner.js`,
`runcalculator.js`, `utility.js`, `sets/vantagepoint.js`, `documentation/ai.md`,
`tests/ai-hook-docs.test.js`, `tests/vantagepoint-integration.test.js`,
`documentation/bugs/corsair-stealth-offset-suppressed-by-lampades.md`,
`documentation/new-sets/card-implementation-backlog.md`, the active tracker,
this report and the implementation notes. Untracked files were the permanent
`tests/vantagepoint-batch2.test.js` and the nine batch2 independent-repair,
payment-rereview and rereview probe/result/manifest artifacts. All were preserved.
This review adds its own probe/result/manifest and updates this report and tracker.

Snapshot hashes of the reviewed production consumers, relevant tests, hook
documentation and independent evidence are retained in the
[SHA-256 manifest](probes/vantagepoint-batch2-third-rereview.sha256).
The [independent probe](probes/vantagepoint-batch2-third-rereview.cjs) and its
[27 recorded observations](probes/vantagepoint-batch2-third-rereview-results.json)
load real engine, command/card/server selectors, payment resolution and opposing
planners. Only browser rendering/audio are inert. The new probe derives the
payment scenarios from the previous review without altering historical evidence,
changes the old defect expectations to repair expectations in this new artifact,
and adds resource boundaries and a five-board immediate-win contrast. C2-5's
assertion explicitly records the observed defect; a passing probe is not a
passing strategic verdict.

### Current per-card assessment

| Card | Strategic role and actual consumers | Contrasting evidence and verdict |
| --- | --- | --- |
| 36005 Lampades | Finite access trash paid only from eligible stealth; legal phase `Enumerate.trigger` → access command → card/ability selection → `_stealthPaymentPlan`/recursive `SpendHostedCredits` → trash. Ordinary trash takes the real phase `Resolve.trash` → `SpendCredits`; winning-route reserve and `AIReducesTrashCost` consume public resource/target data. | Independent actual-phase scarce/plentiful stealth, free/positive trash, temporary credits, unaffordable ordinary trash, no-Lampades control, real steal-click deadline, nonwinning board, Azimat and trash-cost boundaries now preserve the feasible known win. Permanent tests also cover hidden targets, pool locks, flexible source ordering, exhausted power/stealth and exception/cache restoration. **C2-4 resolved; sufficient current card evidence.** |
| 36006 Hackerspace | Budgeted setup, discounted eligible hosting and paired hand capacity; `AIWorthKeeping`/`AIWastefulToInstall`, `AIInstallBeforeInstall`, `_commonCardToInstallChecks`, `_preferredInstallChoice`, legal destination selection, `InstallCost` and `MaxHandSize`. | Permanent real setup selects funded overfull-Grip pairing and declines lone uneconomic setup; host selection preserves free paired installation and ordinary ineligible installation. Independent zero-pool hosted Nurse choice produces hand size seven; tagged control declines. **C2-2 remains resolved; sufficient current card evidence.** |
| 36007 Nurse Hạnh | Passive grouped Archives draw; `runBreachServer.Init` → reveal callback → real `Draw`. Public facedown/Stack counts and hosted capacity feed draw/pre-run install safety; `AIRunExtraPotential` feeds actual run/server ranking; `AIRunBreachDraw` feeds both complete resource planners. | Permanent useful/decline installation covers zero/one/two facedown cards, empty/short Stack, last click, overdraw and blocked route; actual reveal moves zero/zero/two cards. Installed useful draw affects real server selection; exhausted Stack removes it. Independent hidden Archives/zero-credit hosting passes. **New C2-5: installed usable draw overrides a known last-click winning steal; Changes required.** |
| 36008 Stick and Poke | Mandatory first-encounter damage then finite draw, live insertion/broken masking/cleanup and turn resets; `AIModifyIceAI`, `AIEncounterEffects`, `AIRunOrderedDraw`, ordered `DamageResources`, Corp complete-route security, keep/preparation and `_runAfterInstall`. | Independent zero-pool opposing planners agree: one Grip/one Stack survives ezaM/Tithe, empty Grip or Stack does not; no live resources or first-use state change. Permanent real useful paired setup versus unsafe winning/nonwinning preparation, last-click decline, used state, break/bypass, actual prevention continuation, finite reruns, later payment damage, hidden Stack and exception restoration all pass. **C2-1/C2-3 remain resolved; sufficient current card evidence.** |

### C2-4 resolved through actual phase payment

The original scarce case now selects ordinary trash, spends three pool credits
(ten → seven), leaves both Methuselah credits and Lampades power intact, and
retains the complete winning route. Three stealth credits instead permit the
useful Lampades trigger (three → two), saving pool credits. With one pool credit,
two Azimat credits and a two-credit ordinary trash cost, the selector chooses
legal ordinary trash; real phase payment exhausts Azimat, retains the pool and
both stealth credits, and retains the winning route. Actual no-Lampades and
Méliès City Luxury Line click-cost controls also preserve their funded wins.

Temporary credits that fully fund ordinary trash are used; partial temporary
funding can deliberately give way to pool-only payment to retain the stealth
reserve. The additional zero-pool board has no pre-existing funded winning route,
so Lampades follows ordinary printed-cost savings rather than reserving credits
for a nonexistent immediate win. This distinction is asserted using the actual
baseline complete route, not merely the agenda's identity or score total.
Source eligibility in `_accessTrashPayment` and `AIPreserveOutsideCredits` now
matches `phase.js`'s `"paying trash costs"` reason, including Azimat. No claim is
made that historical failure results now pass unchanged; their observations are
preserved as evidence of the original defect.

### C2-5 — 36007 draw potential overrides an immediate winning steal

**Reproduce:**
`node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-third-rereview.cjs`.
See the five `Nurse last-click known winning steal` observations in the result
JSON, with the installed case and four controls.

**Board:** Runner has six agenda points, one click, five credits, an empty Grip,
four Stack cards and installed Nurse Hạnh. A remote contains a publicly known
Superconducting Hub worth one point, with no ICE or steal cost. Archives has two
facedown Hedge Funds and no ICE; HQ/R&D are empty. Hidden Archives identity is
not an input to the decision. Both servers are legal run targets. The real
complete route to the remote exists and the agenda costs zero credits/clicks to
steal, so running there wins this turn. Running Archives draws two cards and
uses the final click without winning.

**Observed:** actual `CommandChoice(['run', 'draw', 'gain'])` selects `run`, then
the actual legal run `SelectChoice` selects **Archives**. Its stored potential is
**2.4** (public facedown count contribution 0.4 + Nurse's draw bonus 2), compared
with **2** for the known winning one-point agenda. Controls with Nurse in Grip,
no Nurse, empty Stack or already faceup Archives all select the winning remote.
The same real route remains feasible in every case. This is a demonstrated bad
decision, not an absent test or a hypothetical activation.

**Locations:** `sets/vantagepoint.js:803` (`AIRunExtraPotential`),
`ai_runner.js:2138` (Archives base potential), `ai_runner.js:2177` (known remote
agenda points plus one), `ai_runner.js:2235` (passive potential consumer),
`ai_runner.js:2463` (generic potential ordering). `_winningRunBeforeOpportunity`
at `ai_runner.js:1155` already performs a complete-route/steal-cost/publicity check
for an earlier discretionary-play consumer; generic run ranking does not apply
an equivalent immediate-outcome tier before the Nurse bonus.

**Expected and impact:** take the known winning steal before discretionary draw.
A soft passive benefit must not override a supported immediate game outcome
(shared AI principle 4). Here the preference gives the Corp another turn despite
a guaranteed available win. Reducing Nurse's bonus would only fit this board;
the missing necessary consumer is a generic immediate-winning-run precedence
check in the ordinary run/server decision path.

**Repair/acceptance:** rank legally available, fully affordable public immediate
winning steals above passive draw/setup potential, with real route payments,
remaining clicks, steal costs and prohibitions. Reuse/factor the existing public
winning-route capability if appropriate; do not add a Nurse title check or tune
its draw bonus solely to this fixture. Add a permanent real command/server
regression for this last-click board and the four controls. Include a useful
draw-only board, a public winning agenda behind an infeasible route, a stealing
prohibition or unaffordable steal cost, hidden agendas and route/preparation
restoration. Preserve C2-1–C2-4 acceptance and rerun independent review.
This is a bounded shared Runner selector repair, not a reason to block the batch
on a new long-term planner. Batch 2 is reopened **Pending** with no active owner.

### Verification and limits

Node runtime: **v20.19.0**, matching `.nvmrc`. All commands below passed:

- `node scripts/batch-brief.js 2` — exact IDs, printed text and completed status.
- `node tests/vantagepoint-batch2.test.js` — strategic acceptance passed; assertions inspected, including live legal access payment rather than a substitute reason.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-third-rereview.cjs` — 27 observations, including supported C2-5 defect and its controls.
- `node --check sets/vantagepoint.js`.
- `node tests/vantagepoint-integration.test.js`.
- `node tests/eternal-format.test.js`.
- `node tests/deckbuild-format-pool.test.js`.
- `node tests/decklauncher-identity-change.test.js`.
- Affected focused tests, each invoked with `node tests/<file>`: `vantagepoint-batch1.test.js`, `vantagepoint-batch11-engine.test.js`, `vantagepoint-batch12.test.js`, `vantagepoint-batch13.test.js`, `corp-server-security.test.js`, `credit-pool-lock.test.js`, `payment-source-ui.test.js`, `ai-hook-docs.test.js` — eight files passed.
- `node tests/run-all-tests.js` — **52 test files passed**, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`; known-red pending directories are outside this green suite.
- `git diff --check` — passed before and after review documentation updates.

There are no regression-suite failures to classify. The green suite does not
cover the C2-5 counterexample. Reviewed hooks and tested hypotheticals preserve
public information boundaries and restore their state; the permanent exception
and hidden-property cases are useful evidence, not a repository-wide mutation or
privacy proof. Free net prevention is tested through an explicit public finite
fixture, not a promise to model legacy paid prevention without its cost. The
remaining necessary gap is ordinary-run immediate-win precedence. This review
covers exactly batch 2 and its affected shared consumers; it neither renews other
batches' snapshot approvals nor replaces final set-wide review.


## Fourth independent remediation re-review — 2026-10-06

**Verdict: Changes required.** Reviewer: Codex, independent fresh-conversation
review. Exact cards: **36005 Lampades, 36006 Hackerspace, 36007 Nurse Hạnh,
36008 Stick and Poke**. Reviewed commit:
`76cc502d566d0611562aed21535a693e41ec268e`, including the existing dirty
implementation. Batch 2 was Complete and awaiting this review. The live agent
list contained only this reviewer; no queue row had an active implementation
claim. Production code, existing tests, playability flags, commits and pushes
were untouched. Pre-existing modifications and evidence were preserved.

The [entry worktree inventory](probes/vantagepoint-batch2-fourth-rereview-worktree.txt)
records the dirty source, tests and documentation plus retained untracked probes.
It was captured before review documentation edits, after creating this review's
probe/result pair. Snapshot hashes of production dependencies, all 52 regression
files, hook/principle/architecture documentation and independent evidence are in
[the SHA-256 manifest](probes/vantagepoint-batch2-fourth-rereview.sha256).

The [new independent probe](probes/vantagepoint-batch2-fourth-rereview.cjs)
derives actual phase-payment, hosted selection and opposing-planner cases from
the previous review. It changes the old C2-5 bad-choice assertion to expect the
repair in this new artifact, preserving the historical probe/results. Five new
retained-Grip boards exercise actual `CommandChoice` → legal run enumeration →
`SelectChoice`, then independently calculate complete routes using the real
calculator with the survivable public Grip budget. Each repeats the genuine
selector on the unchanged board to test cache dependence. Its
[32 observations](probes/vantagepoint-batch2-fourth-rereview-results.json)
include explicit assertions of the new defect; passing this probe is therefore
not a passing strategic verdict. Browser rendering/audio alone are inert.

### Current per-card assessment

| Card | Role and actual consumers | Contrasting evidence and verdict |
| --- | --- | --- |
| 36005 Lampades | Finite access trash; real access enumeration → `AIAccessTriggerPriority` → command/card/ability → recursive hosted payment → trash. `AIReducesTrashCost`, `_accessPaymentPreservesWinningRun`, ordinary `Resolve.trash`/`SpendCredits` and shared source reserve policy. | Independent actual-phase scarce/plentiful stealth, zero/positive trash, temporary-credit boundaries, unaffordable ordinary trash, nonwinning board, expired steal-click budget, no-Lampades and Azimat controls pass and preserve funded wins. Inspected permanent tests additionally cover hidden targets, locks, flexible sources, exhausted power/stealth and exception/cache restoration. **C2-4 remains resolved; sufficient evidence for this card.** |
| 36006 Hackerspace | Funded setup, legal discounted hosting and paired hand size; keep/wasteful/setup hooks → common install checks → `_preferredInstallChoice` → command/card/host; real `InstallCost`/`MaxHandSize`. | Independent zero-pool paired hosted Nurse choice yields hand size seven; tagged board declines. Permanent setup action versus lone uneconomic setup, actual hosted versus ordinary destination, click/credit budgets and duplicate/ineligible controls pass. **C2-2 remains resolved; sufficient evidence for this card.** |
| 36007 Nurse Hạnh | Grouped Archives reveal → automatic callback → actual draw; public counts feed keep/pre-run/draw installation, finite breach draw and run potential; ordinary winning-run check precedes potential ranking. | Permanent installation useful/decline, blocked/overdraw/last-click/short-Stack, actual zero/one/two-card reveal and draw-only server choices pass. Independent original C2-5 and four controls now select the immediate win. **C2-6: that tier still rejects survivable winning routes requiring a retained Grip card, letting Archives draw win the ranking. Changes required.** |
| 36008 Stick and Poke | Mandatory first encounter net damage then finite draw; live insertion/broken masking/cleanup/reset → ordered resource calculator; public opposing security and safe installation consumers. | Independent one-Grip/one-Stack ezaM/Tithe route is feasible to Runner and insecure to Corp; empty Grip or Stack declines, without resource/first-use mutation. Permanent real useful paired setup versus unsafe winning/nonwinning preparation, last click, used state, break/bypass, actual prevention continuation, finite reruns, later payment damage and exception restoration pass. **C2-1/C2-3 remain resolved; sufficient evidence for this card.** |

### C2-5 repair retained, with C2-6 discovered at the damage boundary

The original five-board independent contrast now selects the known winning
remote with Nurse installed, in Grip, absent, with exhausted Stack and with
faceup Archives. Inspected permanent command/server assertions additionally
cover draw-only, infeasible route, unaffordable steal, expired steal-click cost,
steal/breach prohibition, hidden agenda and actual Corsair/Methuselah funding.
The repair is generic, uses public agendas and legal ordinary runs, restores
prospective encounter context, and retains a complete chosen route in the
normal cache. The earlier batch 1 expiring-play consumer's tests also pass.
These establish repair of the original counterexample, but not all supported
immediate wins: the following necessary gap remains.

### C2-6 — 36007 retained-Grip preference rejects a survivable winning route

**Reproduce:**
`node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-fourth-rereview.cjs`.
See `retained Grip versus survivable winning steal` observations.

**Board:** Runner has six agenda points, one click, zero credits, installed Nurse
Hạnh and exactly one Creative Commission in Grip. Stack has four cards. A remote
contains a publicly known one-point Superconducting Hub behind rezzed Tithe;
there is no steal cost, breach replacement or steal prohibition. Archives has
two facedown cards and no ICE; HQ/R&D are empty. Tithe's first subroutine deals
one net damage, and its second gives the Corp a credit. The Runner can take the
damage, reach zero Grip without flatlining, access and steal the agenda to win.
No breaker, credit spending, install or future draw is required. `Damage` at
`mechanics.js:1108` flatlines only when damage **exceeds** Grip length; the real
complete calculator confirms loss/peak **1/1** with one Grip card.

**Observed:** real command selection chooses `run`, then legal server selection
chooses **Archives**. The same failure occurs with four credits. With five
credits, Creative Commission ceases to be worth keeping and the selector takes
the winning remote. Adding one expendable duplicate Nurse to Grip at zero
credits also yields the win. At zero credits/two clicks, it still prefers
Archives first despite an available immediate win; the one-click board is the
conclusive lost winning turn. Planning leaves cards, credits, clicks and run
context unchanged.

Repeating command/server choice on each unchanged board takes the winning
remote, including the boards that initially chose Archives. The first generic
ranking has populated target potential **2**, so the subsequent tactical check
no longer applies the retained-card deduction. This is a demonstrated decision
based on stale/absent soft cache data, rather than an unavailable route or a
missing test alone.

**Locations/root cause:** `ai_runner.js:1627` populates `cardsWorthKeeping`.
`_winningRunBeforeOpportunity` (`ai_runner.js:1154`, complete calculation at
`:1170`) is invoked before ordinary potential refresh (`:2103`), as well as from
the expiring-play consumer (`:2086`). Its shared
`_calculateRunPathPieceBegin` (`:713`, deduction at `:720`) subtracts retained
Grip cards when cached potential is below two. On a fresh AI, that potential is
zero; Creative Commission is retained below five credits, so the damage budget
is zero and the otherwise survivable Tithe route is rejected. Normal soft
ranking then takes Nurse's draw opportunity. Prospective run context removed
the last-click full-hand preference, but this separate retention preference
still overrides the immediate outcome. This also affects the helper's earlier
expiring-play consumer; passing its current regressions is not proof against
this new boundary.

**Expected/impact:** take the public funded immediate winning steal, even when
it consumes a strategically useful Grip card. Retention value and stale server
potential cannot override an immediate supported game win (shared principle 4).
On the one-click board the choice spends the final action on draw and gives the
Corp another turn instead of winning.

**Repair/acceptance:** give the immediate-win route check a survivable damage
budget independent of soft keep preferences and cached potential, through a
guarded or explicit evaluation context. Preserve ordered damage-before-draw,
finite Stack/prevention, clicks, credit/steal costs and public restrictions; do
not solve this by tuning Nurse's bonus or adding title checks. Add permanent
real command/server regressions for the fresh-AI zero/four-credit one-Grip
boards, five-credit and expendable-card controls, repeated unchanged-board
choices and genuinely lethal/unaffordable/restricted targets. Exercise the
expiring-play shared consumer too. Preserve live state and current C2-1–C2-5
acceptance. This is a bounded tactical-budget repair, not a deeper architecture
blocker. Batch 2 is reopened **Pending**, with no active owner.

### Verification and evidence limits

Node **v20.19.0** matches `.nvmrc`. All final commands below passed:

- `node scripts/batch-brief.js 2` — correct four IDs and implementation claims.
- `node tests/vantagepoint-batch2.test.js` — strategic acceptance passed; inspected actual command/card/host/server, access-payment and opposing-planner assertions.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-fourth-rereview.cjs` — 32 observations; three initial bad choices and unchanged-board winning repeats retained as C2-6 evidence.
- `node --check sets/vantagepoint.js`.
- `node tests/vantagepoint-integration.test.js`.
- `node tests/eternal-format.test.js`.
- `node tests/deckbuild-format-pool.test.js`.
- `node tests/decklauncher-identity-change.test.js`.
- Affected focused commands `node tests/<file>`: `vantagepoint-batch1.test.js`, `vantagepoint-batch11-engine.test.js`, `vantagepoint-batch12.test.js`, `vantagepoint-batch13.test.js`, `corp-server-security.test.js`, `credit-pool-lock.test.js`, `payment-source-ui.test.js`, `ai-hook-docs.test.js` — all eight passed; Corp security reports 145 cases.
- `node tests/run-all-tests.js` — **52 test files passed**, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`; known-red pending reproductions excluded.
- `git diff --check` — passed before and after review documentation edits.

No final verification failure needs classification. The green suite lacks the
new retained-Grip counterexample. The independent probe demonstrates real
selectors and supported complete routes, not a full game replay; damage legality
is corroborated by the actual Tithe definition and engine flatline condition.
Existing hidden-property and exception tests plus independent public-count
probes support these consumers' information/restoration contracts, not a
repository-wide proof. No rules ambiguity prevented this verdict. No additional
necessary defect is established for the other three cards. Current necessary
limitation is the tactical helper's soft damage-retention budget. Exactly batch
2 and affected shared consumers were reviewed; other snapshot approvals and the
historical set-wide verdict are not renewed.
