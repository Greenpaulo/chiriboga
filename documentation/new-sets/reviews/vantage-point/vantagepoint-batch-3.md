# Vantage Point batch 3 independent review

**Verdict: Changes required.** Exact IDs: 36009–36016. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36009 Vic | Click/credit draw and tag removal; legal ability → Runner draw-trigger branch/`AIWouldTrigger`. | Real CommandChoice selects Vic ability at 1 and 10 credits on small grip. Integration covers once-per-turn/reset/payment. Missing tagged, no-credit, full-grip and urgent-win action competition. **Evidence incomplete.** |
| 36010 Kompromat | Successful run either derezzes ice or grants bad publicity; run event selection and Corp inline derez-cost policy. | Real bad-publicity resolution throws undefined helper. **Defect C3-1.** Corp fixed rezCost≤3 preference lacks security/remaining-credit contrasts. |
| 36011 Sell Out | Sacrifice resource for net 3 credits/draw; `FullCheckPlay`/`_wastefulToPlay`/preferred-target consumer. | Real `_wastefulToPlay` with legal installed resource throws due wrong hook signature. **Defect C3-2.** Even corrected signature needs depleted/valuable resource alternatives. |
| 36012 Tailgate | Discounted HQ multiaccess; `PlayCost`, `AIAdditionalAccess`, HQ-value/run-event selection → breach. | Dedicated regression reproduces actual no-argument success contract and passes. Integration checks discount and own-run tracking. No real HQ multiaccess winning-steal versus expensive/no-value/Crisium decline scenarios. **Evidence incomplete.** |
| 36013 Borrowed Goods | MU at tag cost; install preference/keep MU check → automatic tag. | Actual last-click zero-pool command with MU need chooses gain, not unsafe installation; integration tag branches pass. Other draw-first smoke states are inconclusive. Need tagged/untagged tag-liability and urgent program install contrasts. **Evidence incomplete.** |
| 36014 Rotary | Optional tag for central extra access; Runner breach choice and additional-access models, Corp trash ability exposed via `corpAbilities`. | Actual SelectChoice chooses use=true or false solely by seed on identical zero-click board. **Necessary strategy gap C3-3.** Integration tests unconditional extra-access model and legal Corp ability, not both AI decisions. |
| 36015 Baker | Archives route redirect to HQ/R&D for stealth; `AIRunAbilityExtraPotential`/`AIRedirectsRun` → route planning; inline destination maximum cached potential. | Source verifies prospective run-only source context restored in finally; integration passes stealth payment/redirect hooks. Missing real run choice/decline/single-credit alternative and option to retain desirable Archives breach rather than forced redirect. **Evidence incomplete.** |
| 36016 Underdome Irregulars | End-action draw/tag removal conditional on rez; draw-install selector and remembered public rez history. | Actual last-click, 1-credit, no-rez command installs the resource, then its end-phase branch must trash it. **Defect C3-4.** No useful rez-state/maximum-hand-size/draw-versus-tag-removal competing outcome scenario. |

## Supported findings

### C3-1 — 36010 reward branch crashes

`sets/vantagepoint.js:930` calls nonexistent `AddBadPublicity`. Full-engine run-end choice resolution on a successful run without rezzed ice throws `ReferenceError`. `BadPublicity` is the supported engine helper (`mechanics.js:1590`); the integration test's fake `AddBadPublicity` conceals the failure. Repair and verify prevention, completion and remove-from-game sequencing through the real phase flow for both derez and bad-publicity branches.

### C3-2 — 36011 preferred-choice contract crashes Runner decisions

`sets/vantagepoint.js:980` declares `AIPreferredPlayChoice(card, choices)` although documented/current consumers pass `choices` as the sole argument (`ai_runner.js:175`, `2450`, `2827`). A legal installed Underdome makes Sell Out playable; the real `_wastefulToPlay(sellOut, sellOut.Enumerate())` consumer throws reading `choices.length`. Repair to the current contract and exercise full CommandChoice/select/resolution, including decline if sacrificing a necessary resource outweighs economy/draw.

### C3-3 — 36014 optional tag has no strategic decision consumer

On the identical central-breach board with zero clicks and an untagged Runner, the real `SelectChoice` selects take-tag with seed 0 and decline with seed 0.99. `AITriggerWhenCan` on this card is a Corp action consumer flag, not a Runner optional-breach preference. The card returns both choices without preference and the Runner selector falls through to random choice. Both extra-access hooks always claim +1 access independently of this random decision. This is a demonstrated missing necessary capability, not a claim that a tag is always wrong.

Repair criterion: make central bonus valuation and actual optional choice consistent; choose useful access, decline when tag liability is prohibitive (remaining clicks/credits, tagged resource threat, kill), and honour game-winning access. Demonstrate these through real selector/planner states and Corp Rotary-trash versus immediate tactics.

### C3-4 — 36016 wastes the last click and credit on guaranteed self-trash

Full-engine `CommandChoice(['install','gain'])`, with one remaining click, one credit, Underdome in grip, no ice rezzed this turn and no intervening run possible, chooses install. `AIDrawInstall()` at `sets/vantagepoint.js:1384` always returns 1. At action-phase end the false `iceRezzedThisTurn` branch at `1374` trashes it, producing no benefit; gaining a credit strictly dominates. The reproduction has no trash-trigger synergy.

Repair criterion: real command decline in the no-rez last-click case; useful install after a remembered ice rez; reasoned install before an achievable rez opportunity, plus tag/draw choice and overdraw costs.


## Additional audit on the isolated review snapshot

Continued on 2026-10-06 in `/private/tmp/chiriboga-vantagepoint-set-review`, saved WIP commit `bd733d65f3bb9aa104083edb335f7a137e94d3c3`. Production source and existing focused tests were revalidated against the original manifest; the original code snapshot remains unchanged. The dirty worktree contains review artifacts from independent reviewers and an image-directory symlink for verification. No production/test changes were made. Current source/probe hashes are in [the continuation manifest](probes/vantagepoint-early-revalidation.sha256).

The following evidence updates the initial audit table above. Run `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-strategy.cjs` for the preserved real planner/selector contrasts (18 observations), with `VERBOSE=1` only for scenario diagnostics. The initial observations probe and 40-command smoke were rerun under that same pinned binary. Integration, batch13, credit-lock and Tailgate regression tests passed again. Shared full-suite and smoke revalidation is coordinator-owned and recorded in the set report; this reviewer makes no browser-playthrough claim.

| ID | Added real-path evidence | Current card assessment |
|---|---|---|
| 36009 | Real command triggers Vic for an untagged empty grip with 1 credit, declines with 0, but uses the standard removal action at tags=1/credits=2/empty grip. | **Changes required:** new C3-5. |
| 36010 | Real run-end reward callback crash reproduced; inline cheap-ice derez policy inspected. | **Changes required:** C3-1. Security-aware derez/bad-publicity choice needs repair acceptance evidence. |
| 36011 | Actual `_wastefulToPlay` contract crash reproduced. | **Changes required:** C3-2. Valuable-versus-depleted resource target selection remains for repair/re-review. |
| 36012 | Real command chooses Tailgate for HQ with five unknown cards at 10 credits; at 2 credits it chooses a normal run instead. Actual no-argument success-dispatch regression passes. | Multiaccess opportunity/affordability and actual gameplay trigger **supported**; known success-prevention and decisive-steal variants remain limited. |
| 36013 | Real generic install decision declines MU hardware when 2 MU are spare and installs when only 1 is spare. Existing last-click/zero-pool state declines; runtime tag branches pass integration. | MU-oriented opportunity/decline **supported**, but tag-risk/kill/resource-loss decisions need acceptance coverage; no claim of strategic completeness. |
| 36014 | Actual optional-breach selector switches take-tag/decline purely by random seed on one unchanged board. | **Changes required:** C3-3; access model and choice are inconsistent. |
| 36015 | Real command chooses Baker's ability to bypass Ice Wall-protected HQ when only one run-only stealth credit is available; once used, it instead chooses an ordinary legal run. Actual shared calculator/ability consumer retained. | Useful alternate route, once-per-turn decline and source-context behaviour **supported**; choosing to preserve a better Archives breach remains limited. |
| 36016 | Last-click no-rez install gives no payoff and destroys the resource; inspected end-phase selector chooses draw versus tag removal and remembers public rez before installation. | **Changes required:** C3-4; useful-state installation/effect evidence remains in focused integration. |

### C3-5 — 36009 cheaper tag removal with draw is bypassed by the basic action

On the actual Runner command path, with Vic as identity, 1 tag, 2 credits, an empty Grip and 4 clicks, `CommandChoice(['trigger','remove','draw','gain'])` chooses `remove`. The identity ability is legal (once unused, one click and one credit), removes the same tag, draws a useful card and preserves one additional credit. The basic two-credit removal is strictly dominated in this state. `ai_runner.js:1520` returns the basic remove action before the generic draw-trigger/`AIWouldTrigger` consumer can consider Vic; the card's tagged preference cannot reach that branch.

Repair criterion: exercise actual command selection for Vic tag removal versus the basic action, used/unused and affordable/unaffordable ability, draw-space/overdraw costs, and competing game-winning run. Route the decision through a supported tag-removal-ability consumer rather than a title special case.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 3` for the allocated batch: metadata/ranges inspected.
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

### 2026-10-14 — Codex implementation repair

- **C3-1:** Historical `AddBadPublicity` call was already replaced by
  `BadPublicity` in the supplied code. Added actual success dispatch,
  publicity/prevention/completion/removal and derez regressions. Replaced the
  fixed cheap-ICE choice with restored public security/loss comparisons;
  unfunded versus affordable re-rez changes the Corp's choice.
- **C3-2:** Reproduced the one-argument contract crash and repaired it. A new
  two-resource regression then reproduced a second consumer gap: economy plays
  chose the useful resource after selecting the right event. The actual legal
  `Playing` decision now consumes the preferred-choice hook. Useful resources
  and hosted children are preserved; doomed Underdome supplies net economy/draw.
- **C3-3:** Added deterministic real optional-breach choice and matching access
  valuation, complete-route cleanup checks and final breach tag modelling.
  Scarce/funded/taxed boards, actual known extra winning steal, restricted
  payment forks and Corp console-denial versus immediate kill pass.
- **C3-4:** Conditional install valuation declines last-click guaranteed
  self-trash, unfunded public rez opportunities and mandatory overdraw; useful
  remembered-rez and achievable public opportunity boards select installation.
  Real end-phase removal/reset/self-trash evidence is retained.
- **C3-5:** Reproduced the dominated basic removal command. A documented legal
  tag-removal ability consumer selects both card and ability before basic cleanup,
  retaining immediate-win precedence. Actual costs/draw/removal and
  used/unaffordable/overdraw/empty-Stack/winning-run contrasts pass.
- **Essential evidence gaps:** Added Tailgate affordability/Crisium/decisive HQ
  access, Borrowed Goods MU/tag-clock/install resolution, and Baker live redirect
  versus retaining Archives. The latter initially reproduced a self-inflated
  Archives cache comparison; ordinary breach values now exclude active bonuses.

Permanent regressions: `tests/vantagepoint-batch3.test.js` plus updated justified
integration expectations. Detailed per-card consumers and evidence are in
[implementation notes](../../vantage-point-implementation-notes.md#batch-3-strategic-remediation--2026-10-14).
The original review verdict and findings above remain intact. Required independent
re-review: C3-1–C3-5 and every named per-card evidence gap, plus affected shared
consumers in batches 1, 2, 4, 12 and 13 and Forged Activation Orders. No browser
or full-match performance claim is made by this repair.

Verification on the final repair: `node tests/vantagepoint-batch3.test.js`,
`node tests/vantagepoint-integration.test.js`, `node tests/ai-hook-docs.test.js`,
`node tests/corp-ai-hypothetical-mutation.test.js`, all required syntax/format/
deck/identity/diff checks and `node tests/run-all-tests.js` pass. The full suite
passes **93 test files**, including `tests/corp-decision-fixtures.test.js` and
`tests/decision-snapshots.test.js`; known-red pending tests remain excluded.
Batch brief reports no unfinished markers for all eight cards; metadata/ELO
and the range's absence of empty effects/subroutine arrays were checked.
This records implementation completion, not independent review approval.

### 2026-10-14 — Codex continuation repair after independent re-review

Repair list and evidence: **C3-4 continuation**, **C3-6**, **C3-7**, plus all
latest named essential evidence gaps. The retained diagnostic observations
reproduced all three findings before editing; the original recorded result
still matches its SHA-256 manifest. Supplied uncommitted repairs were preserved.

- **C3-4:** Wait for an observed rez rather than buying from cached potential.
  Real cold/remembered-rez install transitions and an actual funded pressure
  run → paid rez → unsuccessful end → install → end-phase draw support the
  alternative sequence. Existing reset, hand-space/tag and Sell Out cases remain.
- **C3-6:** Project the next-turn clock and distinguish affordable terminal
  bonus access from ordinary cleanup. Public source composition and Corp-owned
  order-agnostic agenda combinations reach actual pressure/loss consumers.
  Stale/fresh clocks, last-click certain HQ loss, costly steal, no-extra-card,
  hidden-order/private-identity substitution, taxed-route/finite/payment and
  console-denial versus kill contrasts are permanent regressions.
- **C3-7:** One complete paid continuation model supports planned/live choices,
  real guaranteed-win ability selection, destination damage/prevention, steal
  budgets, source reservation/allocation and finite ordinary destination reruns.
  Both public destinations reach Corp consequence/protection/upgrade/stakes/
  Archives valuation; public route checks retain fuel and survival constraints.
  Fatal/survivable/prevented, fresh/depleted, safe R&D/better Archives,
  unfunded/funded steals, current-used/next-turn reset and restoration pass.
- **Remaining named evidence:** Actual multi-ICE Kompromat ranking/resolution,
  Goods → cleanup → needed program with full costs/scarce decline, Rotary
  install → run → optional access and Docklands/costly winning composition,
  and actual run-only Touchstone-before-flexible-Mantle payment selection.

Detailed consumer/contrasting evidence is recorded in
[continuation implementation notes](../../vantage-point-implementation-notes.md#batch-3-continuation-remediation--2026-10-14).
Permanent acceptance lives in `tests/vantagepoint-batch3.test.js`; the historical
observation probe is diagnostic, not a green repair test. The integration
harness's exact Baker valuation/restoration assertions moved to that full-engine
harness, preserving their expected values. No pending reproduction was found.

The composed Baker/Rotary test additionally verifies conditional access value
and tag budgets through the complete paid route and actual live breach choice,
using the planner's existing access metric. Replay fixtures load real public
route helpers and preserve all expected decisions; active-run context guards pass.

Final focused/shared checks and `node tests/run-all-tests.js` pass all **93 test
files**, including Corp decision fixtures and decision snapshots. Metadata/ELO
and unfinished/empty-effect checks pass. Independent
re-review must cover the entire latest matrix and retained findings, affected
batches 1/2/4/12/13, legacy redirect and Corp consequence/protection consumers.
This remediation log leaves the independent verdict below intact.

### 2026-10-14 — Codex terminal composition repair after second re-review

**C3-7 remaining repair list:** discover the known Rotary bonus before ordinary
route validation; validate guaranteed access, paid redirect, survival, finite
reruns and steal resources together; assert actual terminal resolution and
resource/ordinary-route declines; retain all accepted matrix evidence.

The new permanent HQ regression failed before editing (`gain`, expected
`trigger`), reproducing the second-review finding. Baker now requests Rotary's
candidate-only hook mode, then validates accepted complete-route access against
central size/order and access limits. Default hook consumers still require the
ordinary route. The same verified Baker plan drives terminal command/ability,
ordinary ranking and live redirect/payment; real Rotary and steal resolution
finish the HQ/R&D last-click wins.

Permanent costly-steal and Shackleton/Corsair composition tests additionally
exposed `CopyPoint` losing reserved credits and reapplying origin payment damage
when adding optional tags. The necessary shared fix preserves the completed
point's reservation, payment policy and damage source. Exact/scarce pool,
funded/unfunded steal clicks and Grip=3/4 contrasts assert the expected outcomes.
See [implementation notes](../../vantage-point-implementation-notes.md#batch-3-terminal-composition-remediation--2026-10-14)
and `composedTerminalAcceptance` in `tests/vantagepoint-batch3.test.js` for the
full decision matrix, including actual seven-point resolution, Docklands,
live depletion, damage/prevention, finite reruns, unknown cards, access limits,
Archives alternatives and ordinary Rotary safety. Existing private-information,
multiple payment source and exception/cache controls are retained.

Focused batch1/2/3/12/13, integration, 172 Corp security cases, hypothetical
mutation, credit-pool lock and Tailgate checks pass. Independent re-review must
revalidate the **entire second-review matrix and C3-7 composed criteria** plus
affected shared terminal-budget/payment/finite-run/public-security consumers,
including previously passing batches 1, 2 and 13. The independent findings and
**Changes required** verdict below remain intact; implementation is not approval.

Final verification for the terminal composition repair: **93/93 files pass**
under `node tests/run-all-tests.js`, including Corp decision fixtures and
snapshots. Required syntax/integration/format/deck/identity/diff and hook-doc
checks pass, card-status is regenerated and all eight cards have no unfinished
markers or empty effects. The initial full run overlapped source edits and hit
an ai-batch cache-reuse assertion; the stable rerun passes. Batch 3 is Complete
for implementation, with the independent re-review scope above still required.

## Independent remediation re-review — 2026-10-14

**Verdict: Changes required.** Reviewer: Codex independent reviewer. Exact IDs:
36009, 36010, 36011, 36012, 36013, 36014, 36015, 36016. Reviewed commit:
`3beaba67a73ed74c1a8c349ec2b997bcbb77d797`, plus the supplied uncommitted
implementation repairs. This section supersedes the historical verdict for the
current snapshot, preserving all original findings and remediation history above.

At entry, modified files were `ai_runner.js`, `runcalculator.js`,
`sets/vantagepoint.js`, `documentation/ai.md`, the implementation tracker,
backlog, notes and this batch report, and `tests/vantagepoint-integration.test.js`;
`tests/vantagepoint-batch3.test.js` was untracked. Those edits were preserved.
No production code or existing test was edited, and no commit, push or
playability change was made. No concurrent agent or active batch owner was
recorded. Review-created files are this section, the tracker update and the
three probe artifacts linked below.

Reviewed source, permanent test and independent probe/result hashes:
[SHA-256 manifest](probes/vantagepoint-batch3-rereview.sha256).
[Independent probe](probes/vantagepoint-batch3-rereview.cjs) and
[57 recorded observations](probes/vantagepoint-batch3-rereview-results.json).
The probe reuses the permanent test's real-engine harness, adding independent
contrasts; only rendering/audio are inert. Diagnostic assertions deliberately
retain demonstrated bad choices; a successful probe run is not repair acceptance.
The Baker failure injection tests restoration, not strategic selection.
The three new probe artifacts are local files ignored by the existing Git
configuration; retain them explicitly with this handoff when archiving or
committing the review. No evidence files were removed.

### Coverage matrix and per-card assessment

The matrix was established before independent scenarios, then reconciled with
current consumers and the historical handoff. All identified rows were inspected;
explicitly unresolved evidence below prevents approval. Existing evidence was
retained after inspecting assertions and current consumers; old October 6 probes
asserting obsolete crashes were not used as current acceptance.

| Card / strategic role | Necessary contracts and actual consumers | Contrasting evidence and current status |
|---|---|---|
| 36009 Vic: efficient cleanup/draw | legal trigger → command tag branch → preferred card/ability → click/credit/draw/removal; untagged draw selector; turn reset | Permanent batch3 lines 187–218 cover cheaper cleanup, actual trigger resolution, used/unfunded, full Grip/empty Stack and immediate winning remote. Existing integration checks reset; original independent untagged draw evidence reconciles with unchanged draw hook. **Supported C3-5**, no demonstrated remaining defect. |
| 36010 Kompromat: successful-run denial/income | legal ICE-protected server/event choice; success/end dispatch; Corp security/loss hypotheticals; publicity prevention/removal | Independent real command plays at 5 credits, declines at 2 credits with an ICE break still to fund, and declines under Crisium. Permanent reward/prevention and funded/unfunded derez assertions execute engine paths. Security compares all legal rezzed targets and restores publicity/rez state through the shared guard. **Supported C3-1**; multi-ICE tactical derez ranking remains an explicit evidence gap. |
| 36011 Sell Out: sacrifice depleted economy | play/wasteful/economy/draw branches → current Playing target hook → Trash/Draw | Permanent lines 236–257 choose doomed Underdome instead of useful zero-cost Stick and Poke, decline a necessary resource or useful hosted child, and resolve net +3 credits/draw. Current one-argument contract reaches every caller. Shared real Playing probes select legal intended targets for FAO and Beta Build. **Supported C3-2**; Underdome expendability after the final-click boundary remains valid. |
| 36012 Tailgate: discounted HQ multiaccess | PlayCost; HQ access value/run-event ranking; actual play/run; success/breach/end | Permanent/integration tests cover discounts, no-argument success, exact three-card winning HQ and reset. Independent funded/scarce/Crisium choices agree. Full-HQ winning example actually steals to seven points. **Supported** within current HQ valuation; no claim of optimal multiaccess probability. |
| 36013 Borrowed Goods: MU with installation tag | keep/MU install preference; install-before-install helper; install tag response | Permanent and independent needed/spare MU, tagged/untagged, safe cleanup and last-click zero-pool contrasts agree; actual legal install adds no duplicate tag. **Base installation supported. Preparation evidence unresolved:** independent program-in-hand probes all chose gain, so they do not establish useful Goods → program follow-through with cleanup and program costs. Record a realistic useful preparation state and a scarce-budget decline; this is an evidence gap, not a demonstrated bad choice. |
| 36014 Rotary: optional central access | AIAdditionalAccess/HQ valuation; live optional breach; guaranteed-agenda candidate/immediate-win selector; AIRunBreachTags → CalculatePieceEnd; payment forks/finite continuation | Permanent scarce/funded/taxed/known-winning choice and actual tagged steal assertions pass. Independent privacy substitutions and final Horizon continuation yield one tag; restricted-payment/cache controls pass. **Runner C3-3 repaired for tested paths**. Multiple access sources and costly extra winning agenda remain evidence gaps; never imply unconditional extra access. |
| 36014 Rotary: setup and opposing response | install-before-run → guarded run-after-install; AICentralPressure → central access/threat/loss; AIRunBreachTags in Corp route; Corp trigger after tactics | Permanent actual Corp denial versus Neurospike kill passes; source ordering retains score/defense priority. **Defect C3-6:** stale Corp-turn clicks suppress pressure, and terminal access is omitted. Setup code recalculates post-install legality, but no dedicated useful-install versus exhausted-bonus decision contrast exists: explicit evidence gap. |
| 36015 Baker: funded safe alternate breach | run-ability ranking; live redirect/destination and Stealth-source selection; AIRedirectsRun → Corp backdoor/consequence/protection | Permanent/independent useful, used and fuel-empty contrasts; permanent spent-on-Archives and retain-winning-Archives controls; source exception restores prospective server/depth. **Defect C3-7:** Archives-only route validation permits lethal destination effects; Corp sees only HQ destination. Multiple legal Stealth-source allocation has inspected policy but lacks a real contrasting selector regression. |
| 36016 Underdome: conditional end-phase benefit | cached-run opportunity → draw/install preferences; public rez/reset memory; end-phase draw/tag selector; AIOkToTrash → Sell Out | Permanent/independent last-click no-rez decline, remembered-rez install, overdraw decline, reset/self-trash and removal choice pass. **C3-4 partially repaired:** prospective-rez installation does not carry a supported follow-up plan; actual install → gain → self-trash demonstrated below. |
| Shared safety/information/restoration | immediate-win budgets/live recalculation; finite defenses; restricted payments; Playing target hook; Corp protection/loss and hypothetical guard | Changed callers traced; affected batch1/2/12/13 tests and 172 Corp security cases pass. Inspecting existing assertions establishes terminal costs/tags, ordered damage/draw, finite reruns and hidden-information/restoration controls. Independent hidden central replacements leave Rotary access unchanged; Baker throw restores server/depth. **Supported retained shared controls**, subject to C3-6/C3-7 and explicitly named composition gaps. |

Targets are not applicable to Vic's self-only ability or Borrowed Goods' tag
response; information about hidden cards is not needed for their own resource
choices. Tailgate has a fixed HQ target; its target contract is affordability and
success/breach legality. The passive MU/access/redirect effects were reviewed
through actual planning consumers, not artificial activation tests.

### Consolidated required repairs and acceptance

#### C3-4 continuation — 36016 installation and future-rez planning disagree

The original guaranteed last-click self-trash case is repaired. The prospective
case is not: with two clicks, one pool credit, Underdome in Grip, no installed
breaker, a publicly known unrezzed Ice Wall on HQ and rezzed Ice Walls on R&D
and Archives, the real command selects **install**. Actual installation leaves
one click/zero credits. The next real command chooses **gain**, no rez occurs,
and the actual end-phase branch trashes Underdome. Gaining twice preserves two
more credits and the resource in Grip on the same deterministic policy path.

`sets/vantagepoint.js:1666` `_usefulThisTurn` treats positive cached potential and
a Corp-affordable ICE as a supported opportunity without checking what the
Runner will actually do after installation. Its consumers are both the install
veto and draw-install selector. The stored positive potential is not evidence
of a selected follow-up action. A failed run could legitimately provoke a rez;
there is no rule requiring successful completion to obtain the benefit. The
finding is the **actual install/next-command disagreement**, not that a failed
run can never be useful. The independent pool=1/pool=2 breaker controls also
select install and expose the need to account for the complete sequence.

Required repair: decline an unsupported setup or represent and select a justified
post-install rez opportunity, including sacrifice runs if supported by the
architecture. Permanent regressions must run the command → install → next
command transition; contrast remembered rez, no-rez final click, affordable
pressure run, insufficient follow-up budget, no matching breaker, and safe
hand-space/tag payoff. Preserve turn/reset and Sell Out final-click expendability.
This is an unresolved original future-opportunity acceptance criterion.

#### C3-6 — 36014 opposing access budget omits next-turn and terminal opportunities

Two same-contract failures are demonstrated:

1. On the Corp turn with installed Rotary, five pool credits, at least two HQ
   cards and Runner tracker=0, `_projectedRunnerClicks()` returns **4**, but
   `_centralPressureSummary(HQ).additionalAccess` is **0**. Merely changing the
   stale tracker to 4 produces **1**. `_publicTagAccess` at
   `sets/vantagepoint.js:1443` uses `runner.clickTracker - 1`, so normal exhausted
   Corp-turn state erases the public extra-access threat.
2. Runner has six points, zero credits, and is breaching a two-card HQ containing
   a known one-point agenda. Actual Rotary SelectChoice takes the tag and covers
   both cards. On that same board the Corp loss model counts **one access**;
   the separate pre-run probe reports loss probability **0.5**, although taking
   the bonus guarantees the winning agenda and post-win cleanup is irrelevant.
   `_publicTagAccess` requires cleanup resources for all outcomes, while the
   Runner `_takeTagForAccess` has a terminal exception.

Affected consumers: `AICentralPressure` → `_centralPressureSummary`,
`_centralAccessCount`, `_centralWinProbability`, `_centralBreachLossRisk`,
`_breachConsequence`, `_centralServerThreat`, defense/rez planning; also
`AIRunBreachTags`' Corp branch and final route validation. Threat bounds must be
public, order-agnostic for R&D and distinct from deterministic affordability.
Do not fix by calling Runner-private valuation or reading R&D order.

Required repair: use the appropriate projected/live clock and model credible
terminal bonus access separately from ordinary cleanup-constrained access.
Permanent contrasts must cover exhausted Corp tracker versus fresh next turn,
last-click winning two-card HQ versus nonwinning liability, ordinary taxed route
versus surviving terminal route, funded/unfunded steal costs and no extra card.
Revalidate finite Horizon and restricted-payment continuations, Corp denial
versus immediate kill/score/defense, and private-card/order substitutions.
Add dedicated Rotary install-before-run benefit/decline evidence, including the
install click/three credits and subsequent optional-access resources. This
extends the original C3-3 opposing-planner acceptance; the stale-clock consumer
was an escaped audit gap, not a newly imposed optimality requirement.

#### C3-7 — 36015 paid redirects lack destination safety and complete opposing destinations

**Runner:** zero pool, empty Grip, installed Baker and one Touchstone credit,
five unknown HQ cards with rezzed Hokusai Grid, one R&D card and empty Archives.
Actual CommandChoice selects Baker's **trigger**. Its live redirect chooses
**HQ**. Real payment changes the attacked server, Hokusai's successful-run
response is legal, and actual unprevented net damage ends in **Corp wins**
before access. R&D or retaining Archives avoids this death. A second probe
starts with five Grip cards, caches potentials, then empties Grip before the
live redirect; the same fatal HQ choice shows newly spent state is also ignored.
The intervening Grip change is a live-selector contrast, not a full playthrough.

`sets/vantagepoint.js:1514` live destination selection compares only cached
breach potentials. `AIRunAbilityExtraPotential` at 1583 advertises HQ/R&D value
while the selected ability's run path is calculated on Archives; destination
successful-run damage, access/steal costs and the mandatory one-credit Stealth
payment are not represented as a complete redirect continuation. The existing
spent-fuel test handles one case but does not establish the whole contract.
Touchstone is paid while Archives is attacked; Shackleton on the destination
therefore does **not** damage this redirect payment. The earlier probe bearing
that name is a destination-choice observation, not a demonstrated damage defect.

**Corp:** public Baker plus one Touchstone credit, six Runner points, empty
Archives/HQ and an agenda in ICE-protected R&D. `_breachConsequence(Archives)`
returns weight **0** and `backdoorTo: HQ`. Moving the same agenda/ICE to HQ
returns weight **1**. `ai_corp.js:258` `_archivesIsBackdoorToHQ` asks only about
HQ; consequence (574), upgrade placement (671), protection (4288), empty-Archives
valuation (4593) and server-stakes classification (5204) inherit that limitation.
Baker explicitly redirects to either central, so the ignored destination is a
missing necessary capability. Inspection of every helper call found no separate
R&D backdoor consumer that could compensate.

Required repair: represent a funded redirect with the destination's approach,
success/breach effects and steal requirements, and use that same result for
planned opportunity and the live choice. Keep useful Archives on ties or when
redirecting is unsafe. Propagate both public destinations into relevant Corp
consequence/protection consumers without claiming ordinary destination ICE must
be traversed. Verify a constrained credit source can survive Archives and pay
once, then reserve necessary access/steal resources; choose expendable run-only
fuel before flexible fuel through the actual payment selector.

Permanent contrasts: fatal/survivable/prevented Hokusai destination, HQ versus
safe R&D and better Archives, cold versus newly depleted Grip/credits/fuel,
funded/unfunded winning steal, used/unused Baker, and both central destinations
on the Corp model. Include privacy/R&D-order substitution and exceptions/cache
restoration; revalidate every listed Corp consumer and existing terminal,
restricted-payment and finite-defense tests. This is an escaped audit gap in
Baker's agreed tactical-safety/resource/opposing-response contract.

### Remaining evidence gaps and limits

The consolidated list above includes every demonstrated necessary defect. The
matrix additionally names unresolved evidence: multi-ICE Kompromat tactical
choice; useful Borrowed Goods → program preparation with full costs; Rotary
setup, multiple extra-access sources and costly winning-agenda composition;
Baker multiple-source payment selection. Preserve these criteria together for
repair and re-review. Do not reopen on the basis of the all-gain Goods probes
alone; those supplied boards did not establish a necessary install choice.

No essential ruling was unavailable: printed batch metadata, Hokusai text and
the local engine damage/payment sequence establish the consequential rules.
There is no browser/manual-match evidence or performance-calibration claim.
Current architecture uses heuristics for uncertain central value; requiring
exact optimal probabilities is outside this audit. Complete paid redirect
continuations and public terminal access are the precise missing capabilities,
not accepted vague limitations. All identified consumers were inspected, with
unsupported scenarios explicitly recorded rather than silently marked passed.

### Verification on Node v20.19.0

- `node scripts/batch-brief.js 3`: eight IDs/rules and no unfinished markers.
- `node tests/vantagepoint-batch3.test.js`: passed; assertions/current consumers inspected.
- `node tests/vantagepoint-integration.test.js`: passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch3-rereview.cjs`: **57 observations**, including diagnostic defects and supported controls; not 57 repair assertions.
- Focused affected suites: `node tests/vantagepoint-batch1.test.js`, `node tests/vantagepoint-batch2.test.js`, `node tests/vantagepoint-batch12.test.js`, `node tests/vantagepoint-batch13.test.js`, `node tests/corp-server-security.test.js` (**172 cases**), `node tests/corp-ai-hypothetical-mutation.test.js`, `node tests/credit-pool-lock.test.js`, `node tests/tailgate-hq-access-not-granted.test.js`: all passed.
- Required shared checks: `node --check sets/vantagepoint.js`, `node tests/eternal-format.test.js`, `node tests/deckbuild-format-pool.test.js`, `node tests/decklauncher-identity-change.test.js`, `git diff --check`: passed.
- `node tests/run-all-tests.js`: **all 93 test files passed**, including Corp decision fixtures and decision snapshots; known-red pending tests excluded by the runner. No failing regression or unrelated failure was observed.

Batch 3 is reopened **Pending**, owner cleared, with this consolidated handoff.
Completion history is preserved. Repairs go through `implement-card-batch`,
followed by one independent re-review of all repairs and remaining evidence
criteria; no set-wide approval is implied.


## Second independent remediation re-review — 2026-10-14

**Verdict: Changes required.** Reviewer: Codex independent reviewer. Exact IDs:
36009, 36010, 36011, 36012, 36013, 36014, 36015, 36016. Reviewed commit:
`3beaba67a73ed74c1a8c349ec2b997bcbb77d797` plus supplied uncommitted repairs.
This section supersedes the prior verdict for this snapshot, preserving the
historical findings, matrices and remediation log.

At entry, modified files were `ai_corp.js`, `ai_runner.js`,
`runcalculator.js`, `sets/vantagepoint.js`, `documentation/ai.md`,
the tracker, backlog, implementation notes, this report,
`tests/corp-decision-fixtures.test.js` and
`tests/vantagepoint-integration.test.js`;
`tests/vantagepoint-batch3.test.js` was untracked. All supplied edits were
preserved. The tracker had no active owner and the session had no other agent.
No production code or existing test was edited; no commit, push, or playability
change was made. Review edits are this report, the tracker/backlog handoff and
the new probe artifacts.

[Reviewed SHA-256 manifest](probes/vantagepoint-batch3-second-rereview.sha256),
[independent probe](probes/vantagepoint-batch3-second-rereview.cjs), and
[28 diagnostic observations](probes/vantagepoint-batch3-second-rereview-results.json).
The probe copies only the permanent test's real-engine harness and adds
independent scenarios; rendering/audio are inert. Observations include bad
decisions and controls and are **not** 28 passing repair assertions. It never
stubs the selector/calculator under review. The legal winning replay deliberately
chooses a legal Baker ability/redirect after recording the AI's declined
command, then uses the real Rotary selector, tag resolution and steal resolution.
The new probe artifacts are ignored by repository configuration: preserve them
explicitly when handing off/archiving. Historical evidence is untouched.

### Consolidated coverage matrix and per-card assessment

This matrix was established before the independent probes and reconciles the
prior full matrix, historical evidence, actual diff and all affected call sites.
All identified necessary consumers were inspected. The prior named essential
evidence gaps now have permanent real-selector/planner evidence. The unresolved
row is the composed terminal-access path below, not an unrelated new scope.

| Card / role | Necessary contracts and actual consumers | Evidence / current status |
|---|---|---|
| 36009 Vic: efficient cleanup/draw | legal trigger → early tag branch → selected card/ability → click/credit/draw/removal; draw selector; turn reset; winning precedence | Batch3 `main` executes cleanup and checks used/unfunded/full Grip/empty Stack and immediate win. Integration/reset and retained prior untagged draw evidence match unchanged callers. **Supported C3-5.** Self-only targets; no hidden-card dependency. |
| 36010 Kompromat: run denial/public income | legal ICE-protected event/server; success/end/prevention; all legal derez targets → restored Corp security/loss comparison | Permanent actual reward/removal/prevention, failed run and funded/unfunded defense pass. `repairedAcceptance` multi-ICE chooses the affordable Ice Wall and preserves Palisade; with zero Corp credits it keeps both and accepts publicity. Retained prior actual command funded/scarce/Crisium contrasts remain applicable. **Supported C3-1; tactical multi-ICE evidence gap closed.** |
| 36011 Sell Out: sacrifice depleted economy | play/wasteful/economy/draw → actual Playing target → trash/draw; hosted-card preservation | `main` selects doomed Underdome rather than useful Stick and Poke, resolves net +3/two draws and declines valuable resource/useful hosted child. Prior real FAO/Beta Build target observations reconciled with unchanged shared Playing policy; batch4 integration remains green. **Supported C3-2.** |
| 36012 Tailgate: discounted HQ coverage | PlayCost; HQ-value/event ranking; actual play/run; success/breach/end reset | `main` funded/scarce/Crisium choices, actual three-card winning HQ steal, integration discount/reset and no-argument success regression pass. **Supported.** Fixed HQ target; uncertain HQ potential remains a heuristic. |
| 36013 Borrowed Goods: MU with tag liability | keep/MU install; pre-install setup; automatic tag; cleanup and program follow-through | `main` needed/spare MU, tagged/untagged and scarce last-click contrasts; `repairedAcceptance` actually installs Goods → basic cleanup → Cleaver with all three clicks/five credits and full MU accounted, while pool=2 declines. **Supported; setup evidence gap closed.** |
| 36014 Rotary: optional access and setup | actual breach choice; base/additional access; known winning candidate; final-route tags and per-card accepted access; install-before-run and immediate-win command | Permanent useful/decline, taxed route, zero-cleanup known win, source forks, setup at five versus four credits, Docklands/costly agenda and finite continuation pass. **Supported standalone C3-3 and named setup/composition evidence gaps. Defect remains when terminal discovery is composed with Baker; see C3-7 below.** |
| 36014 Rotary: opposing pressure/denial | projected/live clocks → public terminal affordability → pressure/access/loss/consequence/threat/defense; route tags; Corp denial after tactics | Permanent stale/fresh clock, funded/unfunded credit/click steals, no-extra-card/order/private substitutions and denial versus real kill pass. Independent actual public consumers give access=2/loss=1/consequence=1 on last-click terminal HQ, including Corp-turn projection. Shared security/payment/finite tests pass. **Supported C3-6.** Public terminal opportunities are bounds, not knowledge of access order. |
| 36015 Baker: paid safe destination | run ability potential and full plan; early terminal command; ordinary ability costing; live target/source; origin payment/destination damage/prevention/steals/finite reruns | Permanent useful/used/no-fuel, fatal/surviving/prevented destination, newly depleted Grip, useful Archives, steal clicks, run-only-first actual payment, source reservation and throw/cache restoration pass. Independent origin Shackleton/Corsair route declines at Grip=3 and accepts at 4/5 with exactly four meat damage. **Base C3-7 repair supported; terminal bonus discovery remains defective.** |
| 36015 Baker: opposing capability | public funded/surviving redirect to both centrals → consequence, upgrade placement, protection (including minimum-Archives callers), Archives value, stakes | Permanent both-destination and finite/public survival/reset controls pass. Independent all listed helper queries run for HQ and R&D, with throwing private Grip properties, unchanged fuel/context, and zero-fuel reversal. Source inspection covers all generic redirect consumers and legacy Sneakdoor/Maintenance hooks. **Supported opposing C3-7 repair.** Placement is heuristic; no optimal-upgrade claim. |
| 36016 Underdome: observed-rez payoff | install veto/draw preference; public rez/reset; end-phase draw versus cleanup; Sell Out expendability | Actual no-rez final-click/scarce/no-breaker declines, remembered rez install → effect, full-hand/tag choices/reset/self-trash pass. Actual pressure run → paid rez → unsuccessful run end → installation → end-phase draw establishes supported sequencing. **Supported C3-4 continuation.** |
| Shared safety/restoration | terminal precedence/resources; final optional tags; finite defense; source forks; Playing target; public information and hypothetical/cache guards | All relevant permanent/shared tests pass. Independent private-property-throw and no-fuel contrasts cover changed Corp redirect consumers. Prior privacy/restoration evidence is retained after checking current calls. **Supported controls, with the terminal-discovery defect affecting Baker/Rotary composition.** |

Each per-card row includes opportunity/decline, timing/resources, targets where
applicable and information/restoration. Targets are not applicable to Vic's
self-only ability, Goods' automatic tag or Underdome's self-effects. Their own
public/owned resources suffice. Temporary mutations in changed planning paths
are guarded; the exception tests exercise restoration. No consequential ruling
is unavailable: printed metadata, legal engine enumeration, payment timing,
tag/steal costs and local damage resolution establish the expected outcomes.

### Consolidated repair status and remaining C3-7 acceptance

**Accepted on this snapshot:** C3-1, C3-2, C3-3 standalone, C3-4 continuation,
C3-5 and C3-6. The previously named multi-ICE Kompromat, Goods setup, Rotary
setup/multiple-source costly access and Baker multiple-source payment evidence
gaps are closed by inspected permanent real-path assertions. C3-7's destination
safety, finite reruns, source reservation, opposing destinations and restoration
are accepted, while its guaranteed-terminal composition remains open.

**C3-7 unresolved acceptance / escaped composition gap — 36014 + 36015.**
With Baker and Rotary installed, one Touchstone credit, one remaining click,
zero pool, six Runner points, empty Archives/R&D and two HQ cards (one legally
known one-point Superconducting Hub), a rezzed Ice Wall protects HQ. Baker can
run empty Archives, pay the Stealth credit and skip HQ ICE; Rotary's tag covers
both HQ cards and guarantees the free winning steal. No cleanup is needed
after winning.

The actual command is **gain**, and `Baker.AIRunAbilityPlan` returns null.
At the live Archives approach, the planner chooses **retain Archives** on
the zero-pool case. Choosing the legal Baker ability and HQ redirect instead
lets the actual Rotary selector take the tag; actual tag and steal resolution
ends at **seven Runner points**, zero clicks/pool/fuel and one tag. Equivalent
R&D-second-card, pool=2, funded additional-steal-click and Docklands-three-card
variants demonstrate the same incomplete terminal discovery. A single known
HQ agenda without needing Rotary correctly selects Baker's winning ability.
Unknown agenda, already-used Baker, no fuel and fatal Hokusai controls do not
advertise terminal plans. A costly extra steal without a spare click likewise
does not advertise a terminal plan; an ordinary nonterminal run may remain useful.

Root contract and locations:
- `sets/vantagepoint.js:1683` calls
  `runner.AI._publicBreachAgendaCandidates(server)` before calculating the
  paid route. `ai_runner.js:1241` gets Rotary's known agenda through
  `AIWinningBreachAgenda`.
- `sets/vantagepoint.js:1436` requires `_takeTagForAccess`, which at 1377
  validates the **ordinary destination route**, including HQ/R&D ICE that
  Baker skips. The necessary extra winning agenda is therefore filtered out.
- `_redirectPlan` then treats the paid route as nonterminal; its cleanup
  tag limit rejects Rotary's known-winning final tag when there is no cleanup
  click. `AIRunBreachTags` can recognize the winning extra card, but terminal
  status has already been lost.
- The early guaranteed-win selector at `ai_runner.js:1810`, ordinary
  run-ability costing at 2565, Baker opportunity/AIWouldTrigger and live
  destination selection all consume this incomplete result. The live Rotary
  choice after the redirect can succeed, exposing disagreement between
  preparation and resolution. Both central destinations are affected.

This is within the prior C3-7 funded terminal route / shared composition contract.
The repair added nonterminal Baker/Rotary composition coverage, but that matrix
dependency did not cover **terminal candidate discovery before route validation**.
It is an escaped composition gap, not a request for new optimization.

**One remaining necessary repair:** discover legally known guaranteed agenda
candidates for the actual composed breach without first requiring an ordinary
destination route; validate the candidate, optional access, mandatory redirect
payment, survival, additional steal costs and final resources together on the
paid route. Feed that same verified result to early winning command selection,
ordinary run-ability ranking, live redirect/payment and actual bonus choice.
Retain ordinary route safety for ordinary Rotary uses. Do not read unknown
central identities or turn merely probable access into a guaranteed terminal goal.

Permanent regressions must exercise:
1. HQ two-card and R&D known second-card winning Baker→Rotary routes behind
   unbreakable destination ICE: select **trigger**, pay once, choose the winning
   destination, take the tag and actually steal to seven with zero cleanup budget.
2. Docklands plus Rotary covering a three-card HQ; free and additional-click
   winning steals with sufficient/insufficient remaining clicks. Reserve steal
   credits exactly once and contrast sufficient/insufficient pool.
3. Newly spent Grip/credits/fuel at the live redirect; fatal/surviving/prevented
   destination, unknown agenda/no-fuel/used ability, finite destination rerun
   requiring ordinary ICE, and valuable Archives retention.
4. Ordinary Rotary/terminal-run and shared public pressure/security consumers,
   including both Corp backdoor destinations, payment-source selection,
   restricted-payment branches, finite tags/resources, privacy and exception/cache
   restoration. Preserve the accepted C3-1–C3-6 and C3-7 base evidence together.

No other essential matrix row remains unsupported. Revalidate this consolidated
handoff together after repairs; do not restart from a single new counterexample.

### Verification and limits

Runtime: `node --version` = **v20.19.0**, matching `.nvmrc`.

- `node scripts/batch-brief.js 3`: eight cards, rules and no unfinished markers.
- `node tests/vantagepoint-batch3.test.js`: passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch3-second-rereview.cjs`: completed, **28 observations**; diagnostic failures retained in JSON.
- `node tests/vantagepoint-integration.test.js`: passed.
- `node tests/vantagepoint-batch1.test.js`, `node tests/vantagepoint-batch2.test.js`, `node tests/vantagepoint-batch12.test.js`, `node tests/vantagepoint-batch13.test.js`: passed.
- `node tests/corp-server-security.test.js`: **172 cases passed**.
- `node tests/corp-ai-hypothetical-mutation.test.js`: passed, nine listed pre-existing sites and none new.
- `node tests/credit-pool-lock.test.js`, `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node --check sets/vantagepoint.js`, `node tests/eternal-format.test.js`, `node tests/deckbuild-format-pool.test.js`, `node tests/decklauncher-identity-change.test.js`, `git diff --check`: passed.
- `node tests/run-all-tests.js`: **93 test files passed**, including Corp decision fixtures and decision snapshots; known-red pending reproductions excluded. No unrelated failure observed.

There is no browser/manual-match or performance-calibration claim. Uncertain
central value and generic protection/upgrade ranking remain current heuristics.
Corp architecture prose still describes only HQ backdoors and should be refreshed
with the eventual repair documentation; that stale prose is not a second
demonstrated strategic defect or an additional approval gate. This bounded audit
covers all identified necessary consumers, with the one terminal-composition
defect explicit; it does not claim optimal play or absence of undiscovered bugs.

Batch 3 is reopened **Pending**, owner cleared. Completion history remains
append-only. Repair through `implement-card-batch`, then independently re-review
the accepted matrix plus the remaining consolidated C3-7 criteria. Set-wide
readiness and playability are unchanged.

## Third independent remediation re-review — 2026-10-14

**Verdict: Pass.** Reviewer: Codex independent reviewer. Exact IDs: 36009,
36010, 36011, 36012, 36013, 36014, 36015, 36016 (Vantage Point batch 3).
Reviewed commit: `dbdff507a1b5e14182e6830d5f5b6f7d06c4d13b`.
Entry worktree was clean; no other agent was active. This section supersedes the
second-review verdict for this snapshot and preserves all historical findings,
matrices, implementation claims and review evidence. Review changes comprise
this report, the tracker/backlog review records and new local probe artifacts.
No production code or existing tests were edited; no commit, push or playability
change was made.

[Reviewed SHA-256 manifest](probes/vantagepoint-batch3-third-rereview.sha256),
[independent probe](probes/vantagepoint-batch3-third-rereview.cjs), and
[34 diagnostic observations](probes/vantagepoint-batch3-third-rereview-results.json).
Probe artifacts are ignored by repository configuration; preserve these files
alongside the report when archiving or transferring review evidence.

### Scope, retained evidence and changed consumers

Re-review scope was established from the second review's complete matrix and
four-item remaining C3-7 acceptance list before running scenarios. C3-1–C3-6,
C3-7 base support and the closed preparation/payment gaps were retained subject
to checking their current assertions and affected consumers. The prior manifest
matches current `ai_corp.js`, engine phase/mechanics/checks/utility files,
integration, fixture/snapshot and affected batch1/2/12/13/security/payment tests.
Five files differ: `ai_runner.js`, `runcalculator.js`, `sets/vantagepoint.js`,
the permanent batch3 test and `documentation/ai.md`. Their relevant changes
require revalidation of terminal discovery, route copies and composed access;
they do not invalidate unrelated accepted contracts.

Current call-site search establishes that only Baker requests candidate-only
mode. Ordinary `_publicWinningAgenda` and `_winningRunBeforeOpportunity` retain
the default route validation. Baker's `_redirectPlan` validates guaranteed
coverage from the completed point's accepted access before advertising a win.
Its verified plan reaches early command/card/ability selection, ordinary
run-ability costing, live redirect and payment. Rotary's live breach selector
rechecks the paid route using live resources. Calculator policy branches and
finite continuations propagate terminal costs; `CopyPoint` preserves reservations,
payment policy, restricted payments and the point's damage accounting.
Its separate bypass callers in System Update 2021 and Elevation were inspected:
they append persistent bypasses/effects to copied encounter points and do not
replace the restored reservation/payment fields. Relevant AI principles,
Runner/Corp architecture, hook contracts and engine trigger guidance were
reconciled with the call sites. Corp architecture now describes both backdoor
destinations; the prior stale-prose limitation is resolved.

### Consolidated coverage matrix and per-card assessment

Permanent evidence below refers to `main`, `repairedAcceptance` and
`composedTerminalAcceptance` in `tests/vantagepoint-batch3.test.js`. Their
assertions were inspected and the complete focused file was rerun. Historical
unchanged real-selector evidence is retained as described above; direct hook
returns supplement actual decisions and resolution.

| Card / strategic role | Necessary contracts and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| 36009 Vic: efficient draw/tag cleanup | legal trigger → early tag command → card/ability → click/credit/draw/removal; draw preference; once-per-turn reset; terminal precedence | Permanent actual cleanup, used/unfunded/full Grip/empty Stack and immediate winning alternative; integration reset and retained untagged draw contrasts. **Supported C3-5.** |
| 36010 Kompromat: protected-server reward | legal play/event/server ranking → successful run/end reward → publicity prevention/removal; Corp all-target security/loss hypotheticals | Funded/scarce/Crisium event contrasts retained; actual reward/prevention/removal/failed-run paths and multi-ICE derez ranking pass. One credit derezzes affordable Ice Wall while retaining Palisade; zero credits accepts publicity. **Supported C3-1.** |
| 36011 Sell Out: expendable-resource economy/draw | play legality/wasteful/economy/draw → Playing target hook → trash/draw; hosted-resource preservation | Actual doomed Underdome selection over useful Stick and Poke, net three credits/two draws; necessary resource/useful child declines. Shared Playing target callers and integration remain supported. **Supported C3-2.** |
| 36012 Tailgate: discounted HQ coverage | PlayCost → run-event/HQ valuation → actual run/success/breach/end reset | Funded/scarce/Crisium command contrasts; actual winning three-card HQ steal; discount/reset and no-argument success-dispatch regression. **Supported.** |
| 36013 Borrowed Goods: MU preparation with tag liability | MU/keep/install and pre-install preference → tag → cleanup/program follow-through | Needed/spare MU and tagged/untagged/final-click contrasts; actual Goods → cleanup → Cleaver with three clicks/five credits versus two-credit decline. **Supported; prior setup gap remains closed.** |
| 36014 Rotary: conditional access and setup | ordinary candidate discovery; completed-route access/tag record; live breach choice; setup/run costing; terminal command and steal | Useful/decline/taxed/known-win choices; five/four-credit setup; Docklands/costly bonus access; actual both-central Baker → tag → seven-point steal; ordinary locked-route candidate remains null. **Supported C3-3 and composed C3-7.** |
| 36014 Rotary: opposing pressure/denial | projected/live clocks → terminal affordability → pressure/access/loss/consequence/threat/security; Corp trash after tactics | Permanent clocks/credit-click steal affordability/order/privacy and denial-versus-kill controls; independent last-click pressure=1/access=2/loss=1/consequence=1 on Runner and projected Corp turns. **Supported C3-6.** |
| 36015 Baker: funded alternate breach | run-ability discovery/ranking → complete paid origin/destination plan → live target/Stealth source → breach/steal; survival/prevention/finite reruns | Useful/used/no-fuel and valuable Archives contrasts; multiple source payment/throw restoration; actual HQ/R&D terminal choices and payment; live spent Grip/pool/fuel declines. Independent origin damage accepts Grip=4/5 and declines 3 with exactly four meat damage. **Supported full C3-7.** |
| 36015 Baker: opposing capability | public both-central surviving routes → backdoor/consequence/protection/upgrade placement/Archives value/stakes | Independent HQ/R&D consumers unchanged under throwing private Grip properties, restore counters/context, reverse with zero fuel. Permanent survival/finite/reset and 172 security cases pass. **Supported C3-7 opposing consumers.** |
| 36016 Underdome: observed-rez end-phase payoff | install/draw veto → public rez/reset memory → draw/cleanup/self-trash; Sell Out expendability | No-rez last-click/scarce/no-breaker declines; actual run → paid rez → unsuccessful end → install → end-phase draw; full-hand/tag/reset alternatives. **Supported C3-4 continuation.** |
| Shared information/restoration and budgets | default versus candidate-only discovery; command/live recalculation; CopyPoint/policy forks/finite runs; Playing target; public Corp planners and guards | Permanent restricted-credit, terminal budget, finite prevention/draw, private-information and exception/cache assertions; independent both-central privacy and funded/scarce finite compositions. **Supported.** |

All identified necessary consumers have evidence; no essential row remains
unresolved. Self-only Vic/Goods/Underdome effects have no independent target
selection contract. Opportunity/decline, timing/resources and public-information
or owned-resource boundaries are covered in their respective rows. No new
rules ambiguity or architecture dependency is accepted.

### Interaction checklist and consolidated acceptance closure

| Participating effects / shared calculation and consumers | Concrete contrast and expected outcome | Evidence / status |
|---|---|---|
| Baker + Rotary, ordinary useful access: candidate/preparation → run ability → redirect/source → live bonus | Funded skipped-ICE access with cleanup is useful; scarce cleanup declines the nonterminal optional tag. Ordinary destination ICE must remain relevant to an ordinary Rotary run. | Permanent base composition and default-hook null behind locked destination ICE; retained ordinary controls. **Supported.** |
| Baker + Rotary, immediate win: discovery → terminal selector → complete paid route → live bonus/steal | One click/zero pool/one Stealth credit; known winning card covered in two-card HQ or second-card R&D behind unbreakable ICE. Trigger Baker, pay once, take one tag and steal to seven. Unknown/probable access cannot advertise a guaranteed win. | Independent both destinations at pools 0/2, retained replay, permanent actual ability/destination/payment/tag/steal and unknown/three-card/access-limit declines. **Supported.** |
| Docklands + Rotary + Baker, access count and terminal steal budget | Three-card HQ is guaranteed only with both bonuses; spare steal click and exact credits accept; insufficient clicks/credits decline terminal plan. | Permanent Docklands three-card/free/costly steals, actual resolution and exact/scarce pool; independent Docklands and click contrasts. **Supported.** |
| Shackleton + Corsair + Baker + Rotary, origin payment and survival: policy calculators/CopyPoint/terminal/live selectors | Spending origin Stealth must charge four meat damage once even after optional-tag copying. Grip=3 declines, 4 survives; reservation/payment policy survives pool/outside forks. | Independent Grip=3/4/5; permanent composed Grip=3/4, exact/scarce steals and affected batch1/2/13 payment tests. **Supported.** |
| Destination Hokusai/prevention + Baker + Rotary, arrival survival and live resource changes | Empty Grip without prevention declines; one card or finite prevention supports arrival. Newly spent Grip/pool/fuel invalidates the live plan. | Permanent fatal/surviving/prevented destination and all three live depletion controls; prior actual damage/prevention engine evidence retained. **Supported.** |
| Event Horizon + Baker + Rotary, ordinary rerun/terminal reservation/final tag | Unbreakable remaining destination ICE blocks rerun. With only Horizon as defense, two clicks/two steal credits permit the final breach; one click or one credit does not. Extra tag occurs only at the final breach, reserve stays exactly two. | Permanent locked-rerun contrast plus six new independent HQ/R&D funded/scarce scenarios invoking the real command and calculator; state unchanged. **Supported.** |
| Rotary/Baker + opposing public planners, access clocks and both destinations | Last-click terminal coverage remains pressure without cleanup; hidden Grip substitutions do not change consequence/protection/stakes/placement. Removing fuel removes the backdoor. | Independent public-consumer measurements, throwing private properties and zero-fuel reversal; permanent clock/order/steal affordability and security tests. **Supported.** |
| Underdome + observed rez/Sell Out, timing and expendability | Pressure run first; install only after observed rez. A no-rez final-click resource is expendable; a live draw/cleanup resource or useful hosted child is retained. | Permanent actual paid-rez/install/end sequence and Sell Out target/decline tests. **Supported.** |

**Consolidated repair status:** C3-1–C3-6 and C3-7 base/composed criteria are
accepted together. The four second-review repair items are closed: actual
both-central terminal resolution; Docklands and exact click/credit steals;
live-resource/survival/finite/Archives contrasts; ordinary/public/payment/privacy
and restoration consumers. All prior essential evidence gaps remain closed.
No demonstrated necessary defect, essential missing evidence or newly imposed
requirement remains. No repair handoff or batch reopening is needed.

The independent probe reuses the previously audited real-engine harness and
second-review scenarios because their affected source changed. It adds explicit
checks on key diagnostic outputs plus funded/scarce finite-rerun compositions.
Its 34 observations are mixed decision/outcome/consumer measurements, not a
claim of 34 complete games. The new finite scenarios assert real command/plan,
exact reserve, final tag and read-only state; actual terminal resolution is
established separately by permanent HQ/R&D/costly-steal cases and the retained
independent replay. An initial probe setup used the wrong fixture property for
steal cost; it was corrected to the engine's `stealCost` before recording results.
No production defect was inferred from that setup error.

### Verification and bounded limits

Runtime: `node --version` = **v20.19.0**, matching `.nvmrc`.

- `node scripts/batch-brief.js 3`: correct eight-card scope, no unfinished markers.
- `node tests/vantagepoint-batch3.test.js`: passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch3-third-rereview.cjs`: completed, 34 observations; added acceptance assertions pass.
- `node tests/vantagepoint-integration.test.js`: passed.
- `node tests/vantagepoint-batch1.test.js`, `node tests/vantagepoint-batch2.test.js`, `node tests/vantagepoint-batch12.test.js`, `node tests/vantagepoint-batch13.test.js`: passed.
- `node tests/corp-server-security.test.js`: 172 cases passed.
- `node tests/corp-ai-hypothetical-mutation.test.js`: passed, nine listed pre-existing sites, none new.
- `node tests/credit-pool-lock.test.js`, `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node --check sets/vantagepoint.js`, `node tests/eternal-format.test.js`, `node tests/deckbuild-format-pool.test.js`, `node tests/decklauncher-identity-change.test.js`, `node tests/ai-hook-docs.test.js`: passed.
- `node tests/run-all-tests.js`: **93/93 test files passed**, including Corp decision fixtures and decision snapshots; known-red pending reproductions excluded. No failures observed.
- `git diff --check`: passed after review-record updates.

Uncertain central valuation and generic protection/placement remain supported
architecture heuristics, without an optimal-play claim. No browser/manual match
or performance-calibration claim is made. This is a bounded review of every
identified necessary batch contract and affected shared consumer, preserving
accepted evidence; it does not assert absence of undiscovered bugs.

Batch 3 remains **Complete** and now has a current independent Pass. Completion
history stays append-only. Tracker counts remain four Complete/nine Pending.
Batch 4 remains the next implementation repair; set-wide readiness and
playability are unchanged.
