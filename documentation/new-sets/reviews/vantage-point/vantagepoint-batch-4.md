# Vantage Point batch 4 independent review

**Verdict: Changes required.** Exact IDs: 36017–36020. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36017 Hiram | Hardware install/trash knowledge of R&D top → Runner known-top potential and run-before-draw policy. | Integration tests knowledge flag and unrelated trash decline; inspected actual `knownToRunner` potential consumer at `ai_runner.js:1929`. No real agenda-top priority and worthless-top decline/change-after-draw comparisons or human reveal verification. **Evidence incomplete.** |
| 36018 Aircheck | Four hosted credits/locked pool run event and optional second remote; credit checks/payments, run-event hypothetical budgeting and run-end cleanup queue. | Credit-lock suite and mechanics integration pass. Actual follow-up response forces a positive cached-potential remote with zero event credits without recalculating affordable route. This is an observed unguarded policy, not yet a proved game-losing state. **Evidence incomplete.** |
| 36019 Beta Build | Temporary cost-free non-virus tutor and run; `AIIcebreakerTutor` → bonus-breaker run planning; preferred program/server and install cleanup. | Inspected real tutor consumer and corrected local-array use; integration confirms restrictions/shuffle/install/uninstall/return hooks. No actual tutor selection finds urgent answer over high-ELO other type, insufficient MU/credits decline, or temporary-only return cost. **Evidence incomplete.** |
| 36020 Methuselah | Hardware fuel to run-only stealth economy; discard-worth consumer and cached-cost response; hosted-credit offset/installation. | Integration tests valid fuel and credits. Declared numeric economy-install hook has no consumer. **Necessary capability gap C4-1.** Fuel decisions/installation follow-up budgets need actual opposing route/value contrasts. |

## Supported finding

### C4-1 — 36020 economy-install hook has the wrong type and is ignored

`sets/vantagepoint.js:1727` defines `AIEconomyInstall: 2`, but both current Runner priority-economy preplanning (`ai_runner.js:1449`) and actual economy-install selection (`2724`) check `typeof ... == 'function'` before invoking it. The documented contract is `AIEconomyInstall()` (`documentation/ai.md:566`). There is no numeric fallback. Thus the explicitly declared economy-install priority never participates in either consumer; generic installation or preparation paths may still install the console, so this is not a claim that the card is never installed.

Repair criterion: conform to the real hook contract, decide useful fuel/credit installation priority using the full install cost and future fuel costs, and exercise actual CommandChoice states that install for a justified route/economy opportunity and decline for absent/unaffordable/necessary-hardware fuel.

## Remaining strategy/rules evidence

Aircheck's second-run forced maximum potential needs affordable-route and lethal-ice decline scenarios under the remaining hosted-credit budget, plus cross-event run cleanup against other run-end effects. Beta Build needs a real temporary tutor run selector, not only its hook returns. Hiram needs knowledge-boundary and real run choice tests following a hardware-triggered look, and human-facing reveal evidence. Methuselah needs hardware discard versus required install (including its console cost) and stealth-credit sharing with Corsair/Lampades.


## Additional audit on the isolated review snapshot

Continued on 2026-10-06 in `/private/tmp/chiriboga-vantagepoint-set-review`, saved WIP commit `bd733d65f3bb9aa104083edb335f7a137e94d3c3`. Production source and existing focused tests were revalidated against the original manifest; the original code snapshot remains unchanged. The dirty worktree contains review artifacts from independent reviewers and an image-directory symlink for verification. No production/test changes were made. Current source/probe hashes are in [the continuation manifest](probes/vantagepoint-early-revalidation.sha256).

The following evidence updates the initial audit table above. Run `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-strategy.cjs` for the preserved real planner/selector contrasts (18 observations), with `VERBOSE=1` only for scenario diagnostics. The initial observations probe and 40-command smoke were rerun under that same pinned binary. Integration, batch13, credit-lock and Tailgate regression tests passed again. Shared full-suite and smoke revalidation is coordinator-owned and recorded in the set report; this reviewer makes no browser-playthrough claim.

| ID | Added real-path evidence | Current card assessment |
|---|---|---|
| 36017 | Hiram's legitimate look makes the actual R&D potential positive and chooses run for a known agenda; for known Seamless Launch potential becomes zero and it chooses gain. The existing `PlayerCanLook` consumer permits `knownToRunner`; no hidden-card content was supplied to the planner before the look. | Knowledge-to-strategy consumer **supported**; browser disclosure and post-draw knowledge invalidation remain broader readiness limits. |
| 36018 | Real credit-lock suite passes normal cases, but a real route-consumer exception after the temporary mutation leaves the live credit pool 15→1. Positive-potential follow-up remains forced without a fresh affordable-route check. Shared Paywall/fund defect is separately reproduced by the coordinator. | **Changes required:** C4-3 and the set-level bad-publicity-fund finding. Secondary-run risk contrasts remain limited. |
| 36019 | Actual play choice without tutor `nextPrefs` selects different programs/servers by seed. Last-click, 4-credit state with stack Cleaver and a remembered game-winning HQ agenda chooses gain, although a correctly budgeted real route succeeds. | **Changes required:** C4-2 and C4-4. |
| 36020 | Actual selected fuel discards redundant Borrowed Goods and preserves useful Tailor when funds suffice. The real console command can still install through generic paths despite its ignored numeric economy hook. | **Changes required:** C4-1; the issue is the missing economy consumer, not a claim that installation never occurs. Useful/decline fuel paths are now supported. |

### C4-2 — 36019 drops the tutor's planned program and server

`ai_runner.js:2348` returns a tutor play preference containing only `cardToPlay`, explicitly omitting `nextPrefs`. Beta Build's separately defined `AIPreferredPlayChoice` is not consumed on this path. In the preserved full-engine selector probe, with HQ the planned server and both Buzzsaw and Cleaver legal stack targets, actual `SelectChoice` in `Playing Beta Build` selects Buzzsaw/HQ with seed 0, but Cleaver/Archives with seed .99. This breaks the planner's chosen answer/route; the selector is not stubbed.

Repair criterion: carry the selected legal program/host/server through to the actual event resolution, or invoke an actual choice consumer that reconstructs the same plan safely. Test an urgent needed breaker against another legal program and a competing server, plus illegal/changed-target fallback. Do not accept hook-return tests alone.

### C4-3 — 36018 hypothetical pool mutation leaks after a route exception

Aircheck's `AIRunEventModify` (`sets/vantagepoint.js:1544`) temporarily changes `runner.creditPool` to its printed play cost. `_commonRunCalculationChecksAsync` calls Restore only after awaiting the real run calculator (`ai_runner.js:1123–1127`); it has no `finally` safeguard. The probe injects a throwing getter on the public strength of a rezzed Ice Wall, retaining the actual route consumer. After the expected route exception, the live pool remains 1 rather than its original 15, and restore state remains on the event.

This is controlled exception-safety evidence, not a claim that this artificial strength getter occurs in ordinary gameplay. Shared principle 6 requires hypothetical changes to restore on exceptions. Repair criterion: guarded `finally` restoration of pool, card scratch state, hypothetical bonus breaker and calculator runEvent on both successful and throwing routes, with meaningful exception-path regression.

### C4-4 — 36019 is modelled as needing extra tutor-preparation clicks

The generic tutor budget at `ai_runner.js:1090–1093` subtracts the tutor play cost and two additional setup clicks in addition to the initiating-run click. Beta Build's printed resolution already installs the program ignoring costs and starts the run with the same one-click event. The continuation probe gives the Runner 6 agenda points, one remaining click, 4 credits, Beta Build in Grip, Cleaver in Stack and Ice Wall on HQ; the one HQ card is a publicly remembered Superconducting Hub. Actual CommandChoice chooses gain. A real run calculation with the correct one-click/three-credit event budget and bonus Cleaver returns a complete one-credit-break route, yielding a game-winning access.

Repair criterion: a run-initiating tutor must be budgeted as its real combined action, preserve temporary installation/return semantics, select the winning route on the last click, and decline when the combined play/break budget or MU is insufficient. Keep ordinary non-run tutor planning correct.

### Set-level cross-batch finding — Aircheck, Paywall and bad-publicity fund

See [the coordinator's real-helper reproduction](probes/vantagepoint-bad-publicity-fund.js) and [set review](vantagepoint-set-review.md). The fund is spendable outside the ordinary pool; the current shared `Credits`/`LoseCredits` helpers treat it as ordinary loseable credits, including under Aircheck's lock and on Corp credit-loss paths. This affects 36018 with 36052 and existing playable effects. The batch credit-lock test passing does not cover the corrected primary-rule expectation. Repair/re-review must retain the real helper and cross-batch paths.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 4` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.

## Remediation log

### 2026-10-14 — C4-1–C4-4, S1 and named evidence gaps

Implementation repair by Codex; **the independent Changes required verdict above
is preserved**. Current code revalidated the ignored numeric economy hook,
extra tutor setup budget, dropped exact tutor plan and exception-leaked pool.
The historical early-strategy probe aborts on a previously repaired other-batch
observation; current permanent reproductions established the selected defects.
The retained S1 helper probe reported four mismatches before repair and zero
mismatches afterward.

- **C4-1:** Methuselah conforms to the callable economy contract, includes the
  full installation investment, and protects useful hardware from fuel use.
  A guarded Runner-only run-start plan forecasts actual expendable fuel,
  lost Grip capacity and hosted stealth credits. Real console installation,
  run selection, trash/payment and finite Corsair resource contrasts are covered.
- **C4-2/C4-4:** Beta Build uses its real one-action budget, validates MU/host,
  carries exact planned card/host/server into play and safely reconstructs changed
  choices. Permanent actual command/play/install/break/steal reaches seven points
  on the last click; unaffordable/MU controls and return behavior are exercised.
  Ordinary separate tutors keep their preparation budget.
- **C4-3:** Nested finally guards restore run event, pool, source/fuel,
  hypothetical breaker and run context after a real calculator fault. Aircheck
  also recalculates its optional remote with remaining credits, fresh publicity
  and no initiating click; unaffordable/lethal/empty states decline.
- **S1:** Shared balance, loss, funding, allocation, run cleanup and display
  distinguish the outside fund from pool-equivalent Stimhack and ordinary pool
  credits. Corp loss cannot consume Runner credits. Human/AI Stimhack payments
  avoid Shackleton damage, and public Corp budgets retain the distinction.
- **Hiram/named gaps:** Explicit human Runner-only look decision, actual useful
  and worthless known-top choices, hidden substitutions, changed-top privacy
  and shuffle invalidation are covered. The existing immediate-win consumer
  receives only the legitimately known current top agenda.

Evidence: `tests/vantagepoint-batch4.test.js`, corrected/retained
`tests/credit-pool-lock.test.js`, existing set integration and affected shared
batch 2/3/13 and Corp-security regressions. The old lock test's expectation of
fund loss was corrected against the official rules and replaced with stronger
zero-loss/fund-retention assertions; the mechanics were not changed to match
that erroneous expectation.

See [implementation evidence](../../vantage-point-implementation-notes.md#batch-4-remediation-contract--2026-10-14)
for the matrix, exact consumer contracts and unrelated legacy GainCredits API
misuse recorded separately. Re-review must independently exercise the complete
four-card matrix, C4-1–C4-4/S1 and affected ordinary tutors/run events, batches
1–3/13, Paywall batch 11, source-sensitive payment and public Corp budgets.
No independent Pass, set-wide approval or playability change is claimed.


Final implementation verification: all **94/94** green regression files pass
under Node 20.19.0, including Corp decision fixtures and decision snapshots;
focused/shared/syntax checks and diff whitespace check pass. The range's brief
has no unfinished markers. The implementation tracker marks batch 4 Complete;
this is a repair handoff, preserving the independent verdict pending re-review.

## Independent remediation re-review — 2026-10-14

**Verdict: Changes required.** Reviewed exactly 36017–36020 (Vantage Point batch
4), C4-1–C4-4/S1 and their recorded necessary consumers/interactions. Reviewer:
Codex. Reviewed commit `cc05b81c06d9bd1ae21fb7aac080592e8b8958e1` **plus the
supplied dirty repairs**. This is the first independent review of those repairs,
not another implementation round. The earlier audit missed active event Stealth
sources and did not map terminal payment consumers completely; those escaped
audit gaps are made explicit below, rather than treated as new quality gates.

At start, modified files were `ai_corp.js`, `ai_runner.js`, `documentation/ai.md`,
the set backlog/tracker/implementation notes and this report, `init.js`,
`mechanics.js`, `phase.js`, `sets/vantagepoint.js`,
`tests/credit-pool-lock.test.js`, `utility.js`; the new
`tests/vantagepoint-batch4.test.js` was untracked. All were preserved. No queue
row was In progress. Reviewer edits are review evidence and the tracker handoff
only: no production code, existing tests, playability, commits or pushes.

[Snapshot hashes](probes/vantagepoint-batch4-rereview.sha256) identify reviewed
source, tests, documentation and probe. [Independent probe](probes/vantagepoint-batch4-rereview.cjs)
reuses only the permanent test's headless engine loader and adds **37 diagnostic
observations**, with [captured results](probes/vantagepoint-batch4-rereview-results.json).
Its observations deliberately retain defects; successful execution is not a
repair acceptance claim. Run from repository root:

```sh
node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch4-rereview.cjs
```

The repository ignores this probes directory; companion artifacts are preserved
locally there, consistent with the existing reports. Board states, consumers and
expected outcomes are also recorded here for durable repair handoff.

### Current acceptance matrix

The matrix was established before the independent scenarios, from current
mechanics and call sites, then reconciled with prior claims. It replaces the
older incomplete per-card summary for this snapshot. Existing batch4 assertions
were inspected and executed; ordinary accepted rows are retained. All identified
necessary consumers are covered below by evidence, a demonstrated defect, or an
explicit evidence limit. There are no unexamined Pending rows.

| Contract/card | Actual consumers and necessary boundaries | Evidence / current assessment |
|---|---|---|
| Hiram 36017: legitimate knowledge and ordinary choices | Install/trash dispatch → `_lookAtTopOfRnD`; `PlayerCanLook`, known-top potential, `AIWinningBreachAgenda`; movement/shuffle invalidation; human Runner-only decision | Permanent batch4 tests: identical hidden-top substitutions, agenda run vs operation gain, no replacement-top disclosure, shuffle invalidation, human private card choice. Independent `hiram-terminal-*`: known current top enters terminal discovery; unknown top does not. **Supported**, except shared terminal funding below. No browser rendering claim. |
| Hiram terminal funding | Ordinary `_winningRunBeforeOpportunity`, `_calculateRunPathPieceBegin`, live RC terminal reserve | `ordinary-costly-hiram-fund-*`: known seven-point steal with three publicity credits chooses gain; actual run/access legally wins. **C4-7 defect**. |
| Methuselah 36020: full installation investment | `AIWorthKeeping`, `AIEconomyInstall`, `AIWouldInstall` → priority economy and generic installation; actual installation → follow-up run | Permanent tests contrast three expendable hardware, absent/single/needed fuel, credits 3 vs 4, actual four-credit install then funded next run. Independent `meth-investment-vs-win` selects an existing immediate win over installation. **C4-1 original hook/installation repair supported.** |
| Methuselah: fuel selection, lost Grip and finite source | `_expendableHardware`, `AIRunStartCreditPlan` → common planner → live run-start selector/trash/hosted payment; RC restricted budgets; public Corp budget excludes private Grip forecast | Permanent actual run/fuel/payment and necessary-Tailor decline; one vs two Corsair barriers exhaust the same two credits; exception restores fuel position and credits. Independent `beta-meth-fuel-transition`: program using last MU makes Borrowed Goods necessary; hypothetical and live both preserve it. Existing batch2/13 finite Lampades/Corsair/source regressions pass. **Supported first-run funding**, remote consumer defect C4-6. |
| Beta Build 36019: combined action and exact choice | Free install/MU/host candidate discovery → `AITutorStartsRun` common route → command/card → exact `nextPrefs.playChoice`/fallback → install/run/break/steal → return | Permanent real last-click Cleaver/HQ win over decoder/other servers, cost 3 plus 1 break, one click, changed preference fallback, low credits/MU decline, and actual return; integration supplements virus/host/install ordering/uninstalled-target handling. **C4-2/C4-4 supported.** Separate tutors retain extra preparation branch; set/integration regressions pass. Host policy assertions are supplements to the real unhosted lifecycle, not a separate browser-hosting playthrough. |
| Guarded hypothetical state C4-3 | Common planner, event Modify/Restore, bonus-breaker Prepare/Restore, run-start fuel, saved calculator/context | Real throwing strength getter tests event/pool/source/Grip/breaker/runEvent/hypothetical-depth restoration; successful path also restores. Nested finally sites inspected. **Original C4-3 leak repaired.** |
| Aircheck 36018: initial run/payment | Event discovery/extra credits/locked pool → generic and required-Stealth route/payment; owning and opposing budgets | Credit-lock and live payment regressions support ordinary four-credit funding/locked pool and S1 helpers. Independent `aircheck-initial-corsair`, `stealth-source-*`, `lampades-access-*` demonstrate missing active-event Stealth sources: **C4-5**. `aircheck-ken-*` demonstrates a nonexistent fifth spendable credit: **C4-8**. |
| Aircheck optional remote | Success/run-end enumeration → fresh calculator → queued cleanup → MakeRun → live fuel/payment/access | Permanent remaining 0 vs 1, fresh publicity, lethal/empty decline and cleanup order supported. Independent `aircheck-fresh-fuel-*` demonstrates newly gained fuel omitted: **C4-6**. `aircheck-winning-*` and `aircheck-steal-cost-*` demonstrate terminal discovery/payment failures: **C4-7**. |
| S1 basic credit lifecycle | `Credits`, `AvailableCredits`, `GainCredits`, `LoseCredits`, `SpendCredits`, source-sensitive allocation, `_effectiveRunnerCreditPool`, cleanup/display | Corrected credit-lock expectations agree with primary rules; permanent Paywall/Corp loss/empty pool/Stimhack loss/locked pool, human and AI Shackleton payment, public active-run balance, renderer-error restoration pass. **Basic S1 repair supported**, forecast classification C4-8 and terminal accounting C4-7 remain. |
| S1 equivalent terminal consumers | `_accessPaymentPreservesWinningRun`; Rotary `_takeTagForAccess`/`AIRunBreachTags`; Baker `_redirectPlan`; RC `terminalStealCost`/`ValidPoint` | Independent pool vs fund Rotary/Baker contrasts and optional-reserve helper, plus inspected identical pool-only formulas: **C4-7 shared defect**. Actual optional-access allocator/Rotary/Baker full live continuations with these new source combinations are an explicit **remaining evidence gap**; existing pool-funded acceptance remains valid. |
| Opposing source evaluation | `_effectiveRunnerCreditPool`, `_restrictedPaymentPlanOutcome`, `_securityEvaluationContext`, actual source lists and RC | Permanent public/hidden-information, restricted-payment, finite-repeat and source-damage regressions pass. New full `_evaluateServerSecurity` probes see four generic credits with both sources but leave mandatory cost unpriced (`null`); **they do not establish correct event-funded restricted-route pricing**. Close that essential evidence gap with C4-5's repair. No unsupported opposing-choice defect is inferred from `isSecure: false`. |

### Interaction checklist

| Effects / shared calculation and consumers | Concrete contrasts, expected result and status |
|---|---|
| Aircheck + Corsair/Lampades: active Stealth discovery → route/preparation → required payment/ordinary break/access | Four event-hosted credits should allow a one-credit Corsair reduction plus one-credit break, or a one-credit Lampades trash; equivalent Methuselah credits currently work. Event variants are missing: **C4-5**. Sequential payments must share one finite source; owning, actual and opposing consumers require permanent evidence. |
| Equivalent Baker source list | Same `InstalledCards` restriction found and inspected. A direct Aircheck/Baker ability combination is **not applicable**: Aircheck starts central/remote runs, while Baker redirects its own Archives run. Revalidate shared source-helper changes against existing Baker regressions; do not invent an impossible combined action requirement. |
| Aircheck + Methuselah fresh run → start forecast/Grip loss/route/live fuel | Empty Aircheck + empty console + expendable Borrowed Goods vs no fuel, one-credit remote Ice Wall. Both ordinary and six-point states decline despite real trash → two credits → break for one; funded terminal continuation steals to seven. **C4-6**; missing lethal-after-fuel/necessary-fuel second-run acceptance is named with that repair. |
| Methuselah + Beta Build installed program/MU | Last MU consumed by Cleaver makes Borrowed Goods needed. Independent forecast and live selector both retain it and restore the hypothetical installation. **Supported** with permanent exact combined-event lifecycle and forecast restoration. |
| Hiram + hardware install/trash | Install/trash enumerators and generic engine consumers inspected; permanent private-look knowledge/action contrasts and independent known-top terminal dispatch support the chain. **Supported knowledge flow**; full rendered human install/trash is unperformed. Hiram's terminal publicity-funded steal is **C4-7**. |
| Aircheck remote ordinary vs winning target | Cached 5 for an advanced unknown remote vs 2 for a known one-point agenda; ordinary state can take the former. At six points the latter must win immediately; selector still takes former. Real alternative continuation wins. **C4-7a**. |
| Terminal access + Aircheck/publicity/Methuselah + Magistrate | Three-credit steal: 0 funds must decline; 3 unrestricted event/fund credits must permit it. Aircheck and ordinary Hiram/remote selectors decline both; actual funded steals reach seven. Rotary and Baker accept pool-funded but reject fund-funded contrasts. Optional-payment helper permits consuming a needed last hosted break credit. **C4-7b**; shared source allocation must preserve required Stealth, damage and steal reservations. |
| Aircheck + Ken pool gain; publicity/Stimhack/Paywall/Shackleton | Ken's gained pool credit stays locked; four hosted credits cannot fund five breaks. Common planner incorrectly finds that route. Publicity and Stimhack helper distinctions otherwise pass, including actual outside-payment damage. **C4-8**; no-pool-lock and source-damage comparisons require permanent repair acceptance. |

### Consolidated repair and acceptance list

**C4-5 — 36018's active event-hosted Stealth credits are undiscoverable to
required-Stealth consumers (escaped audit gap).**

Current source locations: Corsair `_stealthCreditCards` at
`sets/vantagepoint.js:356`, Lampades at `:554`, analogous Baker list at `:1534`;
Aircheck at `:1926`; `runcalculator.js:1046` and Corp restricted-route discovery
consume their answers. All lists inspect installed cards; resolving Aircheck is
active but uninstalled. With Aircheck active and four hosted credits,
`AvailableCredits` returns 4 but Corsair offers no reduction and Lampades offers
no one-credit trash at access with three power counters. Identical installed
Methuselah funding offers both. Initial Aircheck/Corsair/Ice Wall calculation
finds no route despite the printed two-credit reduction/break solution.

Impact: fails the event's Stealth role in both legality and planning; this is a
necessary coupled strategy, not an arbitrary card pair. Repair one coherent
active-source discovery/forecast contract across owning generic/restricted and
opposing public calculations, actual required selectors and allocations. Keep
inactive/empty sources excluded. Add permanent actual Aircheck play → Corsair
reduction/break and Lampades access/trash contrasts, remaining-credit exhaustion,
initial vs active/follow-up event state and non-mutating restoration. Generic
extra-credit scalars alone do not establish required source identity. Revalidate
Baker's reachable existing routes; no impossible Aircheck/Baker action required.

**C4-6 — 36018's second-run planner omits 36020's newly loaded fuel (unresolved
recorded remote affordability contract, now demonstrated).**

At `sets/vantagepoint.js:1989–2004`, the inline selector calls a separate RC with
current balances, bypassing the run-start forecast in
`ai_runner.js:1167–1175`. Board: successful first Aircheck run, no event credits,
empty Methuselah, expendable Borrowed Goods, installed Cleaver, one-credit Ice
Wall protecting a useful remote, no pool available. It selects no run with and
without fuel. The same real follow-up runs, trashes hardware, loads two credits
and breaks for one; at six agenda points the continuation reaches seven.

Repair: second-run candidate discovery/validation must apply the same actual
run-start contract, without an initiating click or event refill, with fresh
publicity and lost fuel counted against survival. Permanent ordinary/winning
contrasts: expendable vs needed/absent fuel, finite source, safe vs lethal after
sacrifice, credits gained/spent on the first run, and actual second-run selection
through cleanup/start/trash/break/access. Preserve all error restoration and
never expose private Grip fuel forecasts to the Corp.

**C4-7 — 36017/36018 and shared terminal consumers lack consistent winning-target
precedence and spendable-source steal accounting (escaped terminal audit gap;
S1 source classification exposes further affected paths).**

C4-7a location `sets/vantagepoint.js:1980–2006`: remote ranking uses only cached
potential even when a known safe immediate win exists. Probe contrasts six
points against zero points; only the winning state must override the ordinary
higher-potential remote. Actual alternate steal legally reaches seven. Add a
permanent real choice/cleanup/run/access winning continuation, ordinary control,
unsafe/unaffordable win decline and legal competing alternatives.

C4-7b locations `ai_runner.js:787–788, 1251–1287, 1312–1339`,
`runcalculator.js:920,1514–1517`, Rotary
`sets/vantagepoint.js:1400–1405,1461–1469`, Baker `:1705–1712`.
`terminalStealCost` is reserved from pool credits; other terminal consumers test
only remaining pool after route costs. Aircheck credits and publicity funds can
legally pay stealing costs, but cannot satisfy those tests. On six points with a
known one-point agenda and rezzed Magistrate's three-credit additional cost:
Aircheck declines with either 0 or 3 event credits; an ordinary visible remote
and Hiram-known R&D top each choose gain with either 0 or 3 fresh publicity.
All three funded live continuations legally steal to seven.

Consumer expansion performed in this review: Rotary `_takeTagForAccess` accepts
three pool credits but rejects three live fund credits for the same known
second R&D winning agenda; Baker `_redirectPlan` similarly accepts pool but
rejects fresh-fund payment with one hosted redirect credit. Static completed
route checks use the same pool-only assumption. With a known remote behind a
one-credit break, Methuselah 1, publicity 3 and steal cost 3,
`_accessPaymentPreservesWinningRun` permits spending the sole hosted credit,
even though that removes the follow-up winning route. Its initial feasibility
filter never recognizes the source-funded win.

Repair the **shared spendable-source and consequence-aware terminal payment
capability**, not isolated card exceptions. Reserve legal steal funding after
route payments, keeping source restrictions, expired/fresh budgets, required
Stealth, once-only damage/prevention, finite reruns and optional-cost preservation
consistent. Permanent acceptance must cover all named consumers: ordinary
winning discovery, generic/terminal RC validation and live recalculation, Hiram,
Aircheck remote, Rotary initial/completed/live decisions, Baker paid destination
route and optional-access preservation. Contrast pool, unrestricted hosted,
publicity and breaker-only credits; insufficient combined route+steal funds must
still decline. Include actual allocator/Rotary/Baker live continuations for the
new combinations, not only helper returns. Existing batch2/3/13 pool-funded,
finite-resource and survival/hidden-information evidence remains required.

**C4-8 — 36018 common run planning reclassifies actual pool income as outside
credits (S1 repair regression).**

`ai_runner.js:1177–1180` adds every `AIRunPoolCreditOffset` remainder to
`extraCredits`. Ken (`sets/systemupdate2021.js:811`) returns one for a first run
event, but his actual `automaticOnPlay` uses ordinary `GainCredits(runner,1)`.
Board: Ken, Aircheck in Grip, one pool credit to play it, Cleaver, five rezzed
unadvanced Ice Walls on HQ. The actual common calculator returns a route with
base pool 0 and outside credits 5; without Ken it correctly rejects four
credits. Actual main-phase play pays one, Ken gains one locked pool credit,
Aircheck hosts four, and available run funds remain 4. The fifth break is unfunded.

Repair source classification without reverting the correct publicity change or
double-counting hosted sources. Revalidate every current offset provider (Ken,
Cezve, Touchstone, Methuselah), ordinary and pool-locked event paths, generic and
restricted budgets, source-sensitive Shackleton consequences, and public Corp
budgets (never hidden event/Grip forecasts). Permanent regressions should use
actual command/event/payment for sufficient/failing routes, ordinary pool income
with no lock, and outside-income alternatives. Card-specific title branches or
one generic outside-credit scalar are not adequate substitutes.

C4-1–C4-4 original reproductions and basic S1 helpers are accepted. The remaining
work above is one consolidated handoff; all interaction entries reconcile to it.
No arbitrary combinations, optimal-play requirements or browser test requirement
were added. The precise shared dependency is terminal spendable-source
allocation; its repair belongs with these affected consumers rather than being
silently deferred to set review. No additional external architecture blocker was
established. The batch is reopened **Pending**, owner cleared.

### Verification and limits

Node **v20.19.0** matches `.nvmrc`. Commands/results:

- `node tests/vantagepoint-batch4.test.js`: passed; inspected permanent assertions
  and actual dispatch/lifecycle coverage as described above.
- Independent probe command above: 37 observations captured, including the bad
  decisions and legal seven-point continuations. No production selector is stubbed.
- `node tests/credit-pool-lock.test.js`, `node tests/payment-source-ui.test.js`:
  passed (4 source-UI cases).
- `node tests/vantagepoint-batch1.test.js`, `node tests/vantagepoint-batch2.test.js`,
  `node tests/vantagepoint-batch3.test.js`, `node tests/vantagepoint-batch13.test.js`:
  passed; previous scope-specific evidence retained, with C4-7's newly demonstrated
  source combinations explicitly unaccepted.
- `node tests/corp-server-security.test.js`: 172 cases passed;
  `node tests/corp-ai-hypothetical-guards.test.js`: 34 passed;
  `node tests/corp-ai-hypothetical-mutation.test.js`: no new mutation sites.
- Required shared checks passed: `node --check sets/vantagepoint.js`,
  `node tests/vantagepoint-integration.test.js`, `node tests/eternal-format.test.js`,
  `node tests/deckbuild-format-pool.test.js`,
  `node tests/decklauncher-identity-change.test.js`,
  `node tests/ai-hook-docs.test.js` (140 hooks; 38 legacy exceptions).
- `node tests/run-all-tests.js`: **94/94 files passed**, including
  `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`;
  known-red pending reproductions excluded by the standard runner. Retained
  [full-suite summary](probes/vantagepoint-batch4-rereview-suite.log).
- A mistyped additional command, `node tests/runner-payment-security.test.js`,
  failed with MODULE_NOT_FOUND because that test does not exist. The correct
  existing `payment-source-ui.test.js` was located and passed; this is an audit
  command error, not a failing regression. Initial `git diff --check` also caught
  a temporary blank line at the report EOF; corrected and final check passed.

[Null Signal's primary rules explanation](https://nullsignal.games/blog/the-return-of-bad-publicity-in-vantage-point/)
was independently checked: publicity is outside the pool, refreshed only at the
start of a run; Stimhack retains pool equivalence. This supports the corrected
old credit-lock expectation, not a weakened test to hide a defect.

No browser/full-match playthrough was performed. The rendered human look is
supported by actual private decision structure and inspected visibility rules,
not a screenshot. New opposing event-restricted pricing and actual optional
allocator/Rotary/Baker source-funded continuations remain the essential evidence
gaps named above; the report does not imply they passed. The implementation
notes' unrelated legacy `GainCredits` API misuse is retained as a separate issue,
not a batch reopening reason. Historical set-wide Changes required and other
batch snapshot verdicts remain unchanged. Repair with `implement-card-batch`,
then independently re-review this complete matrix and consolidated handoff.


## Remediation log (continued)

### 2026-10-15 — consolidated C4-5–C4-8 repair

Implementation repair only: the independent **Changes required** verdict and
all original observations/findings above remain intact.

- **C4-5:** active-source discovery now includes resolving Aircheck. Forecast
  activates its real finite Stealth wallet/lock without duplicating the scalar.
  Actual Corsair reduction/break and Lampades command/trash, empty/inactive and
  finite-barrier controls, opposing exact public route pricing and hidden-event
  privacy/restoration have permanent regressions.
- **C4-6:** the free remote uses the same run-start source/fuel contract as an
  ordinary run, with fresh publicity and current event credits. Actual free-run
  cleanup/start/trash/break/steal, ordinary and terminal contrasts, missing/needed
  fuel, lethal Grip sacrifice and exception restoration are covered.
- **C4-7:** safe winning remote priority and shared generic-payable terminal
  reserves repair ordinary/Hiram/Aircheck, Rotary's initial/completed/live
  decisions, Baker paid routes and optional-access preservation. Permanent tests
  execute pool/hosted/fund steals, actual Rotary tags and Baker redirects on both
  centrals, scarce/restricted declines, live depletion, optional allocator and
  terminal-payment damage. Finite continuations refresh funds and carry installed
  sources at their remaining balances; exhaustion/restoration contrasts cover
  that shared resource contract.
- **C4-8:** explicit Ken pool income cannot become outside funds under a lock.
  Provider tests compare Cezve/Touchstone/Methuselah forecasts with real event
  play and public budgets; Touchstone's real on-play gain keeps source identity.
  Useful four-break Aircheck command/card/play/payment succeeds and the fifth
  declines; ordinary event gain remains usable. The hand-overflow fallback no
  longer bypasses a rejected Run-event plan.

Permanent evidence: `tests/vantagepoint-batch4.test.js`, retained set integration,
credit-lock and affected batch 1/2/3/12/13, payment/security/hypothetical suites.
See [implementation evidence](../../vantage-point-implementation-notes.md#batch-4-consolidated-continuation-contract--2026-10-15).
No remaining implementation limitation is accepted. Independent re-review must
repeat the entire latest four-card matrix and interaction checklist, retain
C4-1–C4-4/S1 controls, and validate all C4-5–C4-8 consumers including shared
finite-source/terminal/optional-payment paths and affected batches 1–3/12/13.
Implementation completion does not establish a new reviewer verdict.


Repair verification (2026-10-15, Node 20.19.0): final full regression run
**94/94 files passed**, including Corp fixtures and decision snapshots. All
focused/shared checks listed in the implementation evidence pass, including
172 Corp-security cases, 34 hypothetical guards, unchanged mutation inventory,
142 documented hooks, required format/deck/identity/syntax and diff checks.
Tracker records implementation Complete; independent full-matrix/shared-consumer
re-review remains outstanding. The independent verdict above remains unchanged.
