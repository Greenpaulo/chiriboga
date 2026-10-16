# Vantage Point batch 1 independent review

**Current verdict: Pass** — [second independent remediation re-review](#second-independent-remediation-re-review--2026-10-06), on the explicitly hashed working-tree snapshot. Earlier findings and verdicts below are retained as history.

**Original verdict: Changes required.** Exact IDs: 36001–36004. Implementation was Complete at review start; this review does not equate that status with readiness.

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


## Additional audit on the isolated review snapshot

Continued on 2026-10-06 in `/private/tmp/chiriboga-vantagepoint-set-review`, saved WIP commit `bd733d65f3bb9aa104083edb335f7a137e94d3c3`. Production source and existing focused tests were revalidated against the original manifest; the original code snapshot remains unchanged. The dirty worktree contains review artifacts from independent reviewers and an image-directory symlink for verification. No production/test changes were made. Current source/probe hashes are in [the continuation manifest](probes/vantagepoint-early-revalidation.sha256).

The following evidence updates the initial audit table above. Run `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-strategy.cjs` for the preserved real planner/selector contrasts (18 observations), with `VERBOSE=1` only for scenario diagnostics. The initial observations probe and 40-command smoke were rerun under that same pinned binary. Integration, batch13, credit-lock and Tailgate regression tests passed again. Shared full-suite and smoke revalidation is coordinator-owned and recorded in the set report; this reviewer makes no browser-playthrough claim.

| ID | Added real-path evidence | Current card assessment |
|---|---|---|
| 36001 | Actual automatic callback failure remains; inline target selector also trashes two rezzed PAD Campaigns while preserving a public known, fully advanced Superconducting Hub with Corp at 6 points. | **Changes required:** CR1 and CR3, both backed by probes. |
| 36002 | Actual success dispatch still throws undefined helper; unsuccessful/no-subroutine mechanics covered by inspected integration assertions. | **Changes required:** CR2. Deliberate harmless-subroutine policy still needs repair-era acceptance scenarios. |
| 36003 | Real complete-run planner fails to pass Ice Wall with Corsair/no stealth/1 pool credit without Tailor, and succeeds with Tailor. Actual Corp security changes secure→insecure consistently. Real install command also contrasts 1 versus 10 available credits. | Passive debuff and defensive modelling **supported**; recurring income's contribution to route budget and install-versus-urgent-action evidence remain limited. |
| 36004 | The same real planner/security contrast proves useful zero-strength breaking. Inspected batch13 assertions exercise live RunCalculator and Corp security across required stealth, pool alternative, lethal damage, exhaustion across two barriers, finite repeated runs, hidden Grip guards and unfunded hidden ice. | Core route/security support **verified** on these contrasting cases; remaining install/economy policy must stay visible in repair/re-review coverage. |

### CR3 — 36001 ignores a public known winning agenda when selecting trash targets

In the continuation probe, Corp has three scored 2-point Above the Law agendas (6 points). Installed targets are a fully advanced Superconducting Hub known to the Runner from an earlier reveal/access, and two rezzed PAD Campaigns. With Chain Reaction's play prerequisites explicitly set to isolate this second defect, its actual `Resolve` selector (`sets/vantagepoint.js:64`) selects both PADs because every rezzed card outranks every unrezzed card. The agenda would win if scored next turn; public knowledge is available, so prioritizing it requires no hidden-card read. `Trash` is only replaced by an observation sink after target selection; the selector itself is real.

Repair criterion: a publicly known score-ready winning agenda must displace generic economy targets. Retain imperfect information for truly unknown facedown cards. Test the actual selector with an urgent public target, ordinary economy/ice targets, and Runner-side sacrifice cost.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 1` for the allocated batch: metadata/ranges inspected.
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

### 2026-10-06 — Codex

Reproduced **CR1, CR2, CR3** with the preserved observation/strategy probes on
current code before editing. Fixed central-success context, converted Take a
Dive's reward into a mandatory phase-safe trigger using `BadPublicity`, and
prioritized a publicly known winning agenda in Chain Reaction. Added expiring
play selection and sacrifice-aware decline, retaining hidden-information limits.

Addressed named evidence gaps with permanent
`tests/vantagepoint-batch1.test.js`: real command/card/server selections,
partial/expired opportunities, nested prevention and run-end cleanup, Tithe's
harmless reward subroutine with competing safety/payment budgets, Tailor and
Corsair installs versus scarce credits, urgent last-click winning access, and
opposing route/security consequences. Tailor's missing income model required
`AIRunBreakCreditGain`, consumed by `SrBreak` with once-per-turn branch state,
affordability before reward, income-aware pruning and finite rerun exhaustion.
All changes preserve card ELO and the set's playability status.

Independent re-review must reassess **CR1–CR3 and all four cards' strategic
coverage**, plus the shared `SrBreak`, pruning, finite-repeat and funding-policy
consumers. Revalidate batch 13 restricted-source/prevention evidence against the
new shared calculator. Historical observation probes deliberately assert old
bad behavior and remain provenance, not green repair tests. Original findings
and **Changes required** verdict above are retained. Final verification results
are recorded in the tracker completion log after the full run.

Final repair verification: **51 test files pass** under Node 20.19.0, including
Corp decision fixtures, decision snapshots and batch 13. Focused batch 1,
integration, hook-doc, syntax, Eternal, deckbuild pool, launcher identity and
diff checks pass. Card-status regeneration leaves generated statuses unchanged;
the batch brief reports no unfinished markers. Real payment tests additionally
confirm first-break income versus subsequent breaks, and the Corp sacrifice
uses actual public threat selection. No pending reproduction expectation or
historical review verdict was changed. No new accepted limitation.


## Independent remediation re-review — 2026-10-06

**Current verdict: Changes required.** Reviewer: Codex, independent review in a
fresh conversation. Exact allocation: **36001, 36002, 36003, 36004**. Reviewed
HEAD: `09326cf5c8cb1127e3c320d7a8704e3224f7d615`, **including the uncommitted
remediation**, not HEAD alone. At review start these tracked paths were dirty:
`documentation/ai.md`, `documentation/new-sets/card-implementation-backlog.md`,
`documentation/new-sets/current-set-implementation.md`, this report,
`documentation/new-sets/vantage-point-implementation-notes.md`, `runcalculator.js`,
`sets/vantagepoint.js`, `tests/vantagepoint-integration.test.js`; the permanent
`tests/vantagepoint-batch1.test.js` was untracked. No active implementation claim
was present. This review preserves those edits and changes only review evidence
and tracker status. No production code, existing tests, commits or playability
flags were changed.

The [re-review manifest](probes/vantagepoint-batch1-rereview.sha256) identifies the
reviewed source, shared consumers, permanent tests and new probe/results by
SHA-256. Earlier manifests and findings above remain historical evidence. The
[independent probe](probes/vantagepoint-batch1-rereview.cjs) uses the permanent
acceptance harness's real engine/AI initialization, with new contrasting boards;
only browser/audio rendering is inert. Its assertions deliberately preserve the
observed defects, **not passing repair criteria**. Recorded output is in
[results](probes/vantagepoint-batch1-rereview-results.json).

### Per-card reassessment

| ID | Role and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| 36001 Chain Reaction | Expiring three-central denial; automatic success dispatch → `Enumerate` → `FullCheckPlay` / `AIPlayWhenCan` / `AIWouldPlay` → inline Corp target ranking → `Trash` continuation → Corp `_bestTrashOption` and sacrifice decision. | Inspected/reran permanent partial/all-central, duplicate-copy and turn-reset tests; actual success dispatch enables play. Known winning agenda beats ordinary economy in the real target selector; hidden agenda-points getter is not read. Ordinary denial is declined to preserve the sole matching fracter, accepted with no sacrifice, and declined after expiry. Public sacrifice threat selection is covered. **CR1 and CR3 repaired; new CR4 demonstrated. Changes required.** |
| 36002 Take a Dive | HQ/R&D run-event selection through `AIRunEventExtraPotential`, event payment and complete-run calculator; subroutine firing → mandatory successful-run trigger → `BadPublicity` prevention/response phase → real run-end removal. | Permanent real-phase successful/fired versus no-fired/failed cases, nested prevention, return to successful-run phase and removal pass. Command selection uses the event on the funded Tithe route, leaves its harmless credit subroutine unbroken, and declines with scarce hand/payment resources, no ICE or pure ETR. Source traces legal HQ/R&D options and normal server preference; known Crisium suppresses the bonus. **CR2 repaired; sufficient inspected headless mechanics/strategy evidence. Pass.** |
| 36003 The Tungsten Tailor | Unique passive strength debuff through `Strength` / `IceAI` and Corp `AIReducesIceStrength`; income through `SrBreak` / `AIRunBreakCreditGain`, path budgets and finite continuations; economy install through normal Runner selection. | Permanent live payments prove first-break rebate, no second rebate and no prepayment. Runner/Corsair security agree on two barriers with unused versus used Tailor; branch state is read-only and a repeated run needs extra payment. One versus ten credits contrasts holding/installing; a known last-click winning run beats installing. Independent Corroder contrast exposes **TT1**, a missing necessary opposing consumer. **Changes required.** |
| 36004 Corsair | Normal fracter install/hold and prospective bonus-breaker consumers; `AIImplementBreaker` → legal paid breaks or bounded stealth strength reduction → route plan → encounter selector; `AIRunRestrictedCredits` → Corp restricted-payment route planner. | Permanent scarce versus funded install decisions, Tailor/no-Tailor zero-strength route and payment tests pass. Inspected/reran batch13 same-board Runner/Corp cases cover required stealth versus pool alternatives, lethal/survivable damage, prevention, shared source exhaustion across barriers, finite reruns/click preparation, funded hidden ICE, and forbidden Grip/Runner-private-state reads. Runtime source traces strength gate, source eligibility, hosted payment, repeated -3 reduction and encounter cleanup. **Pass on inspected decision/payment evidence; TT1 belongs to Tailor's broader opposing consumer.** |

### CR4 — 36001 expiring priority displaces an immediate winning steal

**Board:** Runner has six agenda points, ten credits and one click, after the
three successful central runs needed to play Chain Reaction. An unprotected
remote contains a publicly known Superconducting Hub. Two other remotes contain
rezzed PAD Campaigns. Runner has no installed cards to sacrifice. Chain Reaction
is the only grip card. All decisions use the actual `RunnerAI.CommandChoice`
with legal `play`, `run`, `gain` alternatives.

**Observed:** With Chain Reaction, the selector returns `play` and prefers that
event. With the same board and the event removed, it returns `run` on the winning
agenda remote. The first action spends the final click on trashing cards; the
second wins by stealing. This is a supported tactical defect, not an argument
that ordinary denial is generally bad.

**Location/cause:** `sets/vantagepoint.js:158` supplies `AIPlayWhenCan: 2`;
`AIWouldPlay` at line 159 approves positive ordinary denial without checking the
competing win. `ai_runner.js:1880` consumes expiring opportunities and returns
before run assessment. The new priority therefore bypasses immediate-winning-run
selection even though the ordinary run planner already finds the win.

**Impact:** Misses a certain immediate win and gives the Corp another turn.
**Repair/acceptance:** Preserve immediate winning steals before discretionary
expiring denial, using current legal, affordable run evidence and public
information. Test the real command/card/server path on this last-click board,
plus ordinary useful denial, justified sacrifice-aware decline and urgent
known winning-Corp-agenda denial. Do not solve this with a card-title condition
or remove the useful expiring-play policy indiscriminately.

### TT1 — 36003 income omitted from ordinary Corp security routes

**Board:** Runner has one click, one pool credit, an unused installed Tailor and
an installed Corroder. HQ has two rezzed Ice Walls, each reduced to zero strength.
There are no stealth/hosted/bad-publicity credits. Each barrier needs one paid
break. The first credit is available before breaking; Tailor then returns one
pool credit, funding the second barrier.

**Observed:** Runner's actual complete-run calculator finds the route. Corp's
actual `_evaluateServerSecurity(HQ)` reports **secure**, with mandatory break
cost **2**. Replacing Corroder with Corsair on the same board makes Corp report
**insecure**, cost **1**, agreeing with Runner. For both breakers, marking Tailor
used or setting the pool to zero makes Runner decline and Corp report secure.
These controls establish both the once-only clock and first-payment requirement.

**Location/cause:** `sets/vantagepoint.js:326` and `runcalculator.js:209` model
income correctly in the shared calculator. However,
`ai_corp.js:2950` runs `_restrictedPaymentPlanOutcome` only if an active card
exposes `AIRunRestrictedCredits`. With ordinary Corroder, `_icePlanOutcome`
(`ai_corp.js:3001`) instead sums independent per-ICE costs and never consumes
`AIRunBreakCreditGain`. Corsair's presence accidentally enables Tailor's income
support. A passing opposing-planner test with Corsair alone cannot cover this
ordinary-breaker route.

**Impact:** False deterministic security can underprotect servers or authorize
unsafe agenda placement; the Runner can breach a server called secure. This is
a missing necessary consumer, not a calibrated soft deterrence preference.
**Repair/acceptance:** Account for public break income in ordinary Corp routes
without requiring an unrelated restricted-credit hook. Preserve payment-before-
rebate, once-per-turn use across encounters and finite repeats, affordability,
prevention and hidden-information boundaries. Test actual Runner and Corp
planners with ordinary and restricted-credit breakers on matching unused/used,
zero/one-credit and multi-encounter boards. Repair the dependency within this
batch; no demonstrated reason currently requires marking the batch Blocked.

### Verification and limits

All commands below were independently executed on **Node v20.19.0**, matching
`.nvmrc`:

- `node scripts/batch-brief.js 1`: batch/rules resolved; no unfinished markers.
- `node tests/vantagepoint-batch1.test.js`: passed; assertions and stubs inspected.
- `node tests/vantagepoint-batch13.test.js`: passed; affected restricted-payment,
  source exhaustion, prevention, finite-repeat and security assertions inspected.
- `node tests/vantagepoint-integration.test.js`: passed; hook-level mocks remain
  supplementary to the permanent real engine tests.
- `node tests/run-all-tests.js`: **51 test files passed**, including Corp decision
  fixtures and decision snapshots. Known-red pending reproductions are excluded.
- `node --check sets/vantagepoint.js`: passed.
- `node tests/eternal-format.test.js`: passed.
- `node tests/deckbuild-format-pool.test.js`: passed.
- `node tests/decklauncher-identity-change.test.js`: three cases passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch1-rereview.cjs`:
  passed observations reproducing CR4 and TT1 plus used/no-prepayment controls.
- `git diff --check`: passed.

No suite failure was observed; the two counterexamples are outside existing
regression coverage. Reviewed shared rebate consumers include `SrBreak`,
affordability, negative pool loss, income-aware pruning/path ordering, alternate
funding policies, finite-continuation used-source propagation and opposing
security dispatch. The necessary limitation is precise: the ordinary Corp
per-ICE planner has no consumer for route-wide break income. No browser match,
rendering verification, full-game simulation or optimality claim is made.
Earlier old-behavior probes were retained as provenance and were not treated as
green acceptance tests. No pending reproduction expectations were changed.

Batch 1 is reopened as **Pending**, owner cleared, with CR4 and TT1 linked in the
tracker. Completion/remediation history remains intact. Repairs go through
`implement-card-batch`, then another independent review. This audit does not
renew the full-set verdict or sign off another batch; batch13's affected focused
regressions were revalidated only for this review's shared-consumer scope.


## Remediation log (continued)

### 2026-10-06 — CR4 and TT1 repair, Codex

Reproduced both findings using the retained re-review probe before editing.
Permanent regressions were added to `tests/vantagepoint-batch1.test.js` and each
failed on its respective original behavior before the fix.

- **CR4:** Runner opportunity selection now consults
  `_winningRunBeforeOpportunity` before returning an expiring play. This uses
  legally offered ordinary-run servers, publicly known installed agendas,
  current complete routes, steal prohibitions and remaining resources for the
  actual steal cost. It checks credits after route rebates rather than requiring
  the later steal payment up front. No card-title check or new tuning was added.
  Tests exercise command/server selection through real legal server options,
  ordinary denial versus immediate winning steals, blocked routes, hidden
  agenda-points read guards, forbidden steals, unaffordable credit/click costs,
  and a first-break Tailor rebate funding a later winning steal. If the rebate
  is exhausted and that steal is unaffordable, the event instead denies the
  Corp's known score-ready winning agenda.
- **TT1:** Corp `_restrictedPaymentPlanOutcome` now invokes the complete shared
  calculator for active `AIRunBreakCreditGain` sources as well as restricted
  payments. Corroder and Corsair receive the same income-aware public route
  model. Tests contrast both breakers, unused/used income and zero/one starting
  credits; no rebate can prepay the first break. Corp queries are guarded against
  reading the Runner-private planner. Additional real opposing-planner tests
  carry spent income through finite reruns, rejecting one credit and accepting
  two credits with exactly enough clicks. Live resources remain unchanged.

Updated the hook/consumer contracts in `documentation/ai.md` and both current
AI architecture documents. Card metadata, ELO and playability are unchanged;
existing worktree changes and all historical review artifacts are preserved.
The old observation probe/results remain provenance and are expected to fail
their bad-behavior assertions after repairs; the permanent green tests assert
correct decisions instead.

Verification on **Node 20.19.0**: batch1, batch13, integration, 145 Corp security
regression cases and AI hook documentation pass. `node tests/run-all-tests.js`
passes **51 test files**, including Corp decision fixtures and decision
snapshots. Syntax checks for both changed AI files and the set, Eternal format,
deckbuild format pool, three launcher identity cases and `git diff --check`
pass. `node scripts/card-status.js` produces no generated-status diff; batch 1
still has no unfinished markers. No new accepted limitation or pending-test
expectation change.

Batch 1 is **Complete for implementation**, pending independent re-review of
CR4/TT1, all four cards' retained strategic acceptance and the shared Runner
opportunity and Corp route-planner consumers. Batch13's focused shared-resource
suite was revalidated; this does not renew its independent snapshot-specific
review. The reviewer verdict and findings above remain unchanged until that
independent review. Batch 2 is the next outstanding implementation repair.


## Second independent remediation re-review — 2026-10-06

**Verdict: Pass.** Reviewer: Codex, independent reviewer in a fresh conversation.
Exact card IDs: **36001, 36002, 36003, 36004** (Vantage Point batch 1).
Reviewed HEAD: `09326cf5c8cb1127e3c320d7a8704e3224f7d615`, **including the
uncommitted remediation**. Implementation status was Complete, with no active
implementation claim. At entry the tracked dirty paths were `ai_corp.js`,
`ai_runner.js`, `documentation/ai.md`, `documentation/corp-ai/architecture.md`,
`documentation/new-sets/card-implementation-backlog.md`,
`documentation/new-sets/current-set-implementation.md`, this report,
`documentation/new-sets/vantage-point-implementation-notes.md`,
`documentation/runner-ai/architecture.md`, `runcalculator.js`,
`sets/vantagepoint.js`, and `tests/vantagepoint-integration.test.js`.
The first re-review probe, results and manifest, and
`tests/vantagepoint-batch1.test.js`, were untracked. All pre-existing edits were
preserved. This review changes documentation and adds review evidence only;
production code, existing tests, playability, commits and pushes are untouched.

The [second re-review manifest](probes/vantagepoint-batch1-second-rereview.sha256)
records content hashes for reviewed card definitions, shared consumers, engine
files loaded by the independent harness, focused tests, documentation, and the
new probe/results. Pass applies to these source/test contents, not to HEAD alone
or subsequently changed consumers. Historical manifests remain intact.

### Per-card strategic assessment

| ID | Strategic role and actual consumers | Contrasting evidence and verdict |
|---|---|---|
| 36001 Chain Reaction | Expiring three-central denial: real success dispatch → grip-copy flags / `Enumerate` → `FullCheckPlay`, `AIPlayWhenCan`, `AIWouldPlay` → Runner command/card selection → public Corp-target ranking → trash continuation / Corp `_bestTrashOption`. `_winningRunBeforeOpportunity` protects immediate winning steals. | Permanent acceptance exercises partial/all central history, duplicate copies, both turn resets, known winning-agenda target selection versus PADs, hidden-property guards, sole-fracter sacrifice decline and useful no-sacrifice play. Actual command/server decisions choose affordable winning access over denial; blocked, forbidden, hidden and unaffordable credit/click-cost cases retain useful denial. Rebate-funded access passes. Independent probe adds simultaneous winning threats: one pool credit cannot pay a two-credit steal, so deny the Corp score; one bad-publicity credit makes the steal affordable, so run and win. Real `CheckSteal` confirms access legality. **Pass; CR1, CR3, CR4 resolved.** |
| 36002 Take a Dive | HQ/R&D run event: `AIRunEventExtraPotential` → normal event payment / complete-run calculator → actual subroutine-firing tracking → mandatory successful-run reward → `BadPublicity` nested prevention → real run-end removal. | Permanent real-phase tests distinguish successful fired/no-fired and failed fired runs, prevention and return to the successful-run phase, and event removal. Real command choice plays a funded Tithe route, leaving its harmless gain-credit subroutine unbroken; scarce payment/hand budgets decline. Empty or ETR-only routes do not induce event play. Source trace confirms only public rezzed ICE models support the reward bonus, with known Crisium suppression. **Pass; CR2 resolved.** |
| 36003 The Tungsten Tailor | Passive strength reduction through live `Strength` / calculator ICE modelling / Corp `AIReducesIceStrength`; once-per-turn pool income through `SrBreak`, `AIRunBreakCreditGain`, branch persistents, pruning and finite continuations; normal economy-install selection. | Permanent tests contrast held/installed, scarce/funded install, urgent last-click access, actual first/second break payments, zero-credit inability to prepay, unused/used income, Corroder/Corsair agreement, private-state guards and finite reruns. Independent three-wall routes contrast printed strength 0/1/2 and pool 1/2/3: only nonpositive effective strength earns one rebate; both planners agree that costs are two or three credits respectively. Planning leaves resources, turn usage and live server context untouched. **Pass; TT1 resolved.** |
| 36004 Corsair | Fracter install/hold and prospective-breaker selection → `AIImplementBreaker` → bounded stealth reductions / normal break payments → encounter decisions; `AIRunRestrictedCredits` feeds opposing complete route assessment. | Permanent tests contrast scarce/funded installation and Tailor/no-Tailor route access. Batch13 regressions retain restricted versus ordinary funding, shared source exhaustion, lethal/survivable damage, prevention, finite reruns and information-boundary cases. Independent live ability sequence uses a restricted-only stealth source to reduce a strength-three barrier, leaves pool credit intact for breaking, exhausts the source, pays the ordinary break from pool, and clears the debuff at encounter end. **Pass.** |

### Independent evidence and consumer audit

Run `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch1-second-rereview.cjs`.
The [preserved probe](probes/vantagepoint-batch1-second-rereview.cjs) copies only
initialization helpers from the previous independent harness and adds new boards;
it does not stub the selector or planner being reviewed. Engine/AI implementations
are loaded from the current worktree. Browser/audio/rendering are inert.
[Recorded results](probes/vantagepoint-batch1-second-rereview-results.json):
**12 scenarios passed**. These assert justified decisions and payment outcomes,
unlike historical probes that asserted the former defects.

Reviewed `_winningRunBeforeOpportunity` and its opportunity-selection call site:
legal current-run options, public agenda points, breach prevention, guarded
prospective steal restrictions/costs, complete routes and remaining credits/clicks
precede the expiring play. Bad publicity enters the existing pool-offset budget;
restricted breaker-only credits do not become promised steal resources. The
prospective server is restored in `finally`. No new card-title policy is present.

Reviewed `SrBreak` and `ImplementIcebreaker`: first-payment affordability precedes
reward branches; effective ICE strength includes route modifiers; each source
has branch-local once-only usage. The income pruning allowance uses the current
credit-loss metric. Completed paths remain ordered with the cheapest last.
Finite continuations inherit consumed income sources and alternate funding
branches preserve the state. Corp `_restrictedPaymentPlanOutcome` now activates
for public break-income sources as well as restricted sources, so ordinary
breakers receive this complete route model. It uses public installed resources
and Grip size, restoring prospective run context. Hook contracts in
`documentation/ai.md` and both current architecture documents agree with these
consumers. Shared/side principles and relevant engine trigger contracts were
checked against code. No consequential unresolved rules ambiguity required an
external ruling.

### Verification

Node `v20.19.0` matches `.nvmrc`. Every command below passed:

- `node scripts/batch-brief.js 1`: correct allocation, Complete, no unfinished markers.
- `node tests/vantagepoint-batch1.test.js`: acceptance passed; assertions inspected.
- `node tests/vantagepoint-batch13.test.js`: shared restricted-resource regressions passed.
- `node tests/corp-server-security.test.js`: 145 regression cases passed.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/vantagepoint-integration.test.js`: passed.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch1-second-rereview.cjs`: 12 independent scenarios passed.
- `node --check sets/vantagepoint.js`: passed.
- `node tests/eternal-format.test.js`: passed.
- `node tests/deckbuild-format-pool.test.js`: passed.
- `node tests/decklauncher-identity-change.test.js`: three cases passed.
- `node tests/ai-hook-docs.test.js`: 128 hooks checked, 40 legacy exceptions remaining.
- `node tests/run-all-tests.js`: **51 test files passed**, including Corp decision fixtures and decision snapshots. No unit-only exclusion; known-red pending subdirectories are outside the runner's top-level green suite.
- `git diff --check`: passed, including final review documentation.

### Limits and handoff

No supported necessary AI defect remains for this batch on the reviewed snapshot;
no new architecture limitation is accepted. Evidence is headless decision,
planner, dispatch and live-payment evidence, not browser interaction or a
full-match strength measurement. Hidden or central agendas are not represented
as certain publicly known immediate steals by the new opportunity guard.
Historical observation probes can still fail their obsolete bad-behavior
assertions; they are retained provenance, not green acceptance tests.

Batch 1 remains **Complete**, with independent **Pass** recorded in the tracker.
Batch13 regressions pass against the changed shared consumers; this does not
renew batch13's independent snapshot verdict or sign off another batch.
The full-set Changes required verdict, other batches and shared finding S1 remain
outstanding. Repair work continues through `implement-card-batch`, followed by
independent reviews and the separate final set review.
