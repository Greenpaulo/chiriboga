# I2 ICE selection by marginal security

**Roadmap item:** I2 · **Depends on:** I1, F2, F4, L7.1, L9.0, L9.1, F11, F12 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`, [deception gate reconciliation](../deception-gates.md)
**Verified against code:** e33a91b (2026-10-12)

Prerequisites I1, F2, F4, L7.1 and L9.0 are done. L9.1 is implemented
but remains in `documentation/backlog/code-review/`; I2 cannot move to
code-review until L9.1 is `done`. F11 separately owns the missing paired
batch-metric guard support and must also be `done` before I2 hand-off.

## Goal

Use F12's shared [realized-defense measurement](../../ai-batch-harness.md#realized-defense-measurement-f12)
definitions, readiness rules and control calibration; do not build a competing
collector. I2 retains ownership of its security objective and regression margins.

Choose the `(ICE, server)` pair that most improves security, weighted by what a
breach would cost, using the existing security evaluator rather than input-card
order. This is the first intentional policy change on the I1 candidate
framework.

## Current behaviour

For ordinary protection, `_iceInstallOptions()` lists affordable ICE in
input-card order, then low-priority ICE when `priorityOnly` is false, for the
one server `_serverToProtect(false, false, targetIsEligible)` picks; the
predicate (L3.5.2's interim bridge) now calls `_iceLayerPolicy()`, whose
`allowed` result `_shouldInstallIceLayer()` also wraps. The low-priority group
includes ICE rejected by `AIWorthwhileIce(server, "install")`, not just ICE
too expensive to rez; `_iceInCardsCommon()` still applies its combined
install/existing-unrezzed-cost admission check. No ICE is compared with
another by its effect. A separate path offers ICE for a new remote.

I1's `_installCandidateRecords()` preserves legacy ordering and records
unoffered `(ICE, server)` pairs as ineligible diagnostics; it does not yet
score their marginal security. `_hypotheticalServerAfterInstall()` already
exists: it subtracts install cost, adds the outermost layer and restores
credits and the original array through `_withHypothetical()`, or evaluates a
detached `AIHypothetical` remote without registering it.

`postureEpochs` defaults to `true`. Bait/bluff commitments are reevaluated at
the first posture query of a later Corp turn after a meaningful boundary,
and may retain the same script. `_remoteDeceptionProfile()` still caches the
profile shape for the card's lifetime; the active posture is not lifetime-bound.

L9.0 adds observation-only `honestIsSecure`, `honestLockout` and honest cost
fields alongside the compatibility verdict; it does not switch existing
decisions to them. L9.1's implementation now reports unknown breaker prices
as `null` cost fields and prevents them from fabricating secure verdicts in
either model. Unknown cost must not become numeric security gain through
JavaScript coercion in I2's new scorer.

The final `serverAtRisk` admission override in `_shouldInstallIceLayer()` is
now behind `serverAtRiskInstallOverride`, default `false`. Earlier uses of
`serverAtRisk` and downstream affordability checks remain. I2 owns the
replacement decision: whether an extra layer buys enough security to justify
its install/rez cost, including the opportunity cost to scoring. Do not
silently restore the old final OR term while removing the eligibility bridge.

Archives admission also depends on `_nothingWorthProtecting()`. With
`emptyArchivesRunPressure=false`, empty Archives without a backdoor into HQ
is excluded even when public rewards or recent runs produce pressure. I2's
proposal to enumerate every ranked server must preserve that baseline with
its option off; any change to this exclusion must be explicit, reasoned and
measured with its option on. The pressure machinery remains in ranking.

Two pieces of hypothetical ICE scoring already exist:

- `_criticalBreachDefenseAction()` scores post-install risk for each ICE on
  the at-risk central: it subtracts the install cost from `corp.creditPool`,
  pushes the ICE onto `server.ice`, reads `_centralBreachLossRisk()` and
  restores through `_withHypothetical()` (F2), installing the best ICE when the loss probability
  (at least `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD`) falls by
  `CORP_AI_CRITICAL_BREACH_MINIMUM_IMPROVEMENT`.
- The older, uncalled `_iceInstallScore()`/`_bestIceToInstall()` pair was
  deleted by F2 as dead code (2026-10-02).

See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design

1. Evaluate I1 candidates for every strategically relevant server
   `_rankedServersToProtect()` lists, instead of one server chosen in advance.
   Listing alone does not make a pair `eligible`: preserve legality,
   install affordability, empty-Archives admission and posture constraints.
2. Evaluate each candidate through I1's existing
   `_hypotheticalServerAfterInstall()` with the ICE as the new outermost layer, including the detached
   server for a new remote.
3. Score with the design note's `securityGain` (lockout, break cost, bypass),
   `futureValue`, `installCost` and `reserveCost` components. Rez affordability
   uses the evaluator's shared unrezzed-ICE budget (L1.1); ICE outside that
   budget earns no `lockout` or `breakCost`.
   **Use the honest verdict for I2's marginal score behind
   `iceMarginalSecurity`**: `honestLockout` for hard lockout,
   `honestIsSecure` without hard lockout for soft resource lockout (including
   click limits), and `honestMandatoryBreakCost` for mandatory cost gain.
   This explicitly specializes the shared design's compatibility-field
   formula; it is not a global adoption of L9.0.1. Compute cost deltas only
   from finite, known before/after values; handle lockout separately and
   record unknown/non-finite costs rather than coercing them into a gain.
   Keep compatibility fields and all unrelated consumers unchanged.
4. **Consequence comes from the evaluator and stays inside I2's ranking.**
   For remotes and Archives, `consequenceWeight` is
   `0.25 + 0.75 × _breachConsequence(server).weight`, the breach-consequence
   signal L7.1 owns and L3.5.1 also consumes; read it unchanged outside
   an active bait/bluff posture. For HQ and R&D it is 1 (unweighted);
   weighting the centrals needs its own gated option. The weight multiplies
   only I2's candidate score: it must never feed `_protectionScore()` or any
   value another decision compares against. **An active bait/bluff posture
   uses a common `consequenceWeight = 1` for both agendas and traps**, within
   the same profile-conditioned ICE-count envelope defined below. This
   deliberately replaces the previous draft's true-weight rule for postured
   servers: private root type or agenda points must not separate ordinary
   ICE ranking, layer admission or allocation between otherwise equivalent
   postured boards with equivalent costs and defensive mechanics. Other I2
   components must obey the same substitution
   invariant; neutralizing this multiplier alone is insufficient if another
   private-root signal recreates the distinction. Keep the true consequence
   available separately for tactical safety and diagnostics, never feed the
   common weight back into the evaluator. A winning-breach safety override
   remains authoritative. Outside an active posture, use true consequences;
   the all-server realized-count guard measures that remaining risk.
   *(2026-10-09, from L7.1's failure
   analysis in `specs/L7.1.1-horizon-aware-central-consequence.md`: weighting
   HQ's protection score moved the remote-scoring bar in `_isAScoringServer()`
   and `_scoringWindow()` and caused the whole regression, `centralStolen.points`
   +0.048 [+0.011, +0.085]; weighting only the ICE-target ranking was neutral,
   +0.007 [−0.021, +0.036], and gave no improvement on the centrals.)*
5. **Generalise the critical-breach check, do not duplicate it.**
   `_criticalBreachDefenseAction()` reads `lossRiskAfter` from I2's candidate
   evaluation (computed through the shared helper) instead of its own
   push/pop loop; its thresholds and behaviour stay the same.
   Compute `lossRiskAfter` through the existing `_centralBreachLossRisk()`
   path, separately from the honest fields used for ordinary marginal scores;
   sharing the hypothetical install does not change this safety oracle.
6. (Done by F2: `_iceInstallScore()` and `_bestIceToInstall()` are deleted.)
7. Same-turn multi-server allocation stays authoritative: a server already in
   `_protectionInstallsThisTurn` keeps its current treatment.
8. Retire `_serverToProtect(..., targetIsEligible)` from ordinary ICE-install
   generation (design note migration step 7); the server ranking stays for
   diagnostics.
9. Compare marginal layer value with retained rez capacity and scoring costs.
   The [regression handoff](../../corp-ai-regression/gated-fix-handoff.md)
   establishes a cost to the old blanket at-risk override on the tested pool;
   it does not establish that all extra layers are bad. Empty-Archives reward
   valuation remains a separate gap, recorded in the shared design's
   regression ownership table; do not equate recent runs with install value.

Distinctions the score must respect:

- A hard lockout is not printed strength.
- Optional punishment raises deterrent value (`deterrence`) but never
  `lockout`.
- Subtype diversity counts only through public Runner capabilities and
  effective subtype shifts.
- A second layer can matter against outermost or one-ICE bypass even when raw
  break cost barely changes.
- `AIWorthwhileIce` hooks may reject or modify candidates but not set their
  whole ordering.
- On a server with an active bait or bluff posture, ordinary candidates must
  satisfy `server.ice.length + 1 <= targetIce`, where `targetIce` is the
  authoritative profile's existing 1/2/3-layer limit returned through
  `_deceptionProtectionTarget()`. At or above that limit, offer no ordinary
  extra layer; do not remove existing ICE. This is an ICE-count envelope,
  not a cap on printed strength or expected break cost. I2 never rerolls or
  independently caches a posture: read the authoritative posture before
  hypothetical evaluation and follow it after epoch reevaluation. A neutral
  script removes this posture-specific cap; other eligibility rules remain.
  The lifetime profile shape is not a lifetime posture commitment. Tactical
  safety overrides the cap when a lighter choice could enable a winning breach.

**Observable defense scope.** Retire the previous draft's undefined
“visible-strength envelope”; I2 does not introduce a strength cap. All ICE
count and rezzed/unrezzed status are public. For rezzed or otherwise revealed
ICE, identity, printed rez cost, subtypes and public strength modifiers can be
observed; these are separate attributes, not one scalar strength measure.
New ICE is installed unrezzed, so its hidden printed cost, subtypes and
strength are not public observations. Candidate evaluation may use the
Corp's own ICE properties, but the realized-count guard measures count only.
Future constraints or guards for revealed ICE attributes need their own
explicit definition and calibration before implementation.

**Root-sensitive component audit (scenario 16).** I2 migrates ICE ranking,
not root scoring. Test the complete candidate record and final allocation,
not just the consequence multiplier:

| Component or decision path | Root-sensitive input to audit | Active-posture rule |
|---|---|---|
| `securityGain`, including lockout, break cost and bypass | Root defensive effects, stakes-dependent evaluator branches, true breach consequence | Use honest security and common consequence weight; private root class/agenda points add no ordinary bonus. Keep genuine defensive mechanics fixed in equivalence tests; true stakes remain separate for safety. |
| `futureValue` | Root-specific delayed scoring value, trap attraction, ability to fund a later rez | Use only candidate ICE, public Runner capabilities, actual common budget and shared profile; no agenda/trap-specific future payoff. Bound remains 0 to 1. |
| `installCost` | Server depth and any applicable install mechanics | Use actual equal costs, with no root-class surcharge or discount invented by the planner. |
| `reserveCost` and affordability/admission | `_reserveCreditsForCard()` / `AIReserveCredits`, existing rez obligations, `_sufficientEconomy()`'s root costs | Preserve real obligations; no guessed reserve based on agenda/trap class or points. Equivalence requires equal declared obligations. Test unequal obligations separately and record the resulting mechanically justified differences. |
| `deceptionValue`, if emitted | Profile distance and root-class-specific deception payoff | Keep the shared design's 0-to-1 placeholder symmetric in the shared profile and observable shape; do not add a private-type bonus. |
| `scoringValue` and role-displacement `opportunityCost` | Agenda points, completion plans and inferred root roles | These belong to I4 and I3 respectively and are absent from I2's ordinary ICE score. No implicit fast-advance, scoring-window or root-role bonus is introduced here. Existing forced/winning bands remain authoritative. |
| Hooks, admission, allocation and tie-breaks | `AIWorthwhileIce`, root-sensitive legacy filters, server urgency, protection debt, `compatibilityOrder` | Audit callers as well as numeric components. With equivalent mechanics/costs and a fixed profile/random stream, no root-class/point-based priority survives outside the safety branch. |

The substitution invariant is conditional on equivalent mechanics, costs and
reserve obligations; swapping in a mechanically different trap is not that
oracle. Preserve those legitimate differences rather than spending reserved
credits to manufacture equality. The realized-count guards retain all cases,
including non-equivalent roots and safety overrides, to measure the residual
tell. Log which input caused any permitted difference.

**Title cases.** Own the rows tagged I2 in the P1 ticket
(`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`): Palisade
in `_iceInstallScore()` is the only currently tagged I2 row, already completed
when F2 deleted the function. Do not invent additional title migrations.

## Safety and information boundary

Hypothetical outermost-layer evaluation uses only public Runner capabilities
and must not mutate live server contents or credits. Candidate evaluation must
be unchanged when hidden Runner Grip cards are substituted. Unrezzable ICE must
not receive active-security credit.

## Test scenarios

1. Against a publicly installed Fracter only, otherwise comparable Code Gate or
   Sentry ICE outranks an efficiently broken Barrier.
2. An affordable ETR ICE that creates a hard lockout outranks higher
   printed-strength ICE that leaves the route open.
3. A second affordable layer outranks deepening another server when it
   neutralizes public outermost-bypass risk on a valuable remote, subject to
   multi-server safety.
4. ICE that cannot be rezzed within the projected defense budget does not
   receive active-security credit (L1.1's shared budget, not a reimplementation).
5. An ICE with only optional punishment increases deterrent value but does not
   claim a lockout.
6. Effective subtype changes and targeted bypass hooks affect hypothetical
   results exactly as they affect installed ICE.
7. Candidate evaluation is unchanged when hidden Runner Grip cards are
   substituted.
8. Bait- and bluff-postured remotes receive ICE choices within the current
   epoch's exact ICE-count cap, using the same consequence
   weight and ordinary ranking for equivalent agenda/trap boards. Repeated ranking and hypothetical probes neither
   reroll nor cache a posture independently. After an authoritative epoch
   reevaluation, ranking follows the new envelope, including ordinary ranking
   for a neutral script; the lifetime profile shape remains unchanged.
   Test 1-, 2- and 3-layer limits just below, at and above each cap, including
   a winning-breach counterexample where safety overrides it.
9. The Baker-backdoor fixture
   (`corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`) still installs
   on Archives with the bridge removed.
10. If the highest-urgency server has no ICE in hand that materially improves
    its outcome, a useful candidate on another insecure server is chosen, with
    the bridge removed.
11. Outside active bait/bluff postures, with the same two ICE and two equally insecure servers, the ICE goes to the
    server with the higher `breachConsequence`; changing only that signal
    changes the choice.
12. `_criticalBreachDefenseAction()` picks the same ICE as before on its
    existing tests while reading I2's candidate evaluation.
13. With the legacy at-risk override off, contrast an additional layer that
    prevents a high-consequence breach with one that consumes scoring resources
    without sufficient benefit. Record the competing costs and outcomes.
14. Empty Archives without agendas or an HQ backdoor stays excluded in the
    recovered fallback despite public run rewards. If I2 changes that policy,
    test meaningful reward prevention against pointless extra defense and
    measure the change separately; agenda and backdoor stakes remain eligible.
15. Unknown breaker pricing (`null` mandatory cost) is not treated as zero or
    Infinity to invent a break-cost improvement or a lockout. Preserve L9.1's
    known-cost/unknown-price distinction in the recorded score components.

16. Swap an agenda for a trap on otherwise equivalent actively postured
    boards, holding public state, profile, ICE, defensive mechanics, actual
    costs, declared reserves and random stream fixed. Assert every component
    and path in the root-sensitive audit table, rejection reasons, ordinary
    admission, allocation and final choice; vary agenda points independently.
    Include `futureValue` and any emitted `deceptionValue`, and prove I2 emits
    no `scoringValue` or role-displacement opportunity score. Separate genuine
    reserve/defense differences and the true-stakes safety override case.
17. Script realized-count observations with unpostured and postured roots,
    known/revealed and unrevealed roots, zero ICE, preinstalled start-board
    roots, root replacement, multiple roots and winning-breach overrides.
    Repeated evaluation must not add observations or roll a new posture.

18. A click-breakable bioroid and a missing-breaker route with an affordable
    projected acquisition do not earn a hard-lockout gain solely because
    compatibility `hasHardLockout` is true. I2 uses honest resource costs and
    click limits, preserves unknown prices and changes no compatibility
    verdict consumer with its option off.

## Acceptance gate

F4 gate. Option `iceMarginalSecurity` (Corp AI), off in the baseline and on
in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals. Both arms keep all five legacy regression
gates off and prerequisite options identical. `postureEpochs=true` is the
default in both arms, so the single gate command preserves epochs without
explicit overrides or a two-report workaround. Capture a fresh matching
corrected control with epochs and all listed collectors; the earlier I0
control predates this default and cannot serve as the matching baseline.
I0 supplies the pool and insolvency collector; its successful-run
observations remain available for diagnosis. Follow the merge plan's
[control refresh and sequencing guidance](../deception-gates.md):
the implementing agent chooses and records the order before any I2 gate
run, including `--quick`, using current adoption status and readiness.
Prefer L8.2 adoption before I2's final gate when practical; if proceeding
first, record the reason and the control policy in advance. Record effective
`deceptionLegibility` and all prerequisite options in both arms. If I2 gates
first, explicitly label its evidence as predating legibility; L8.2 must then
use the adopted I2 policy as its control. Any decision-changing prerequisite
landing during evaluation invalidates the later item's control and gate;
refresh both rather than sharing an older parallel-development baseline.
This sequencing preference is not an additional L8.2 dependency for I2.
Collectors: `strandedUnrezzedIceCost`, `corpInsolventTurns`,
`bluffSingleVariableCorrelation`, `realizedIceByRootType` (delivered by F12, contract below),
`installOutcomes` (diagnostic trap triggers)
(`corpInsolventTurns` added by I0, defined in
`documentation/ai-batch-harness.md`; `strandedUnrezzedIceCost` is planned by
this item, and its exported path must be verified when it lands). Each
declares its better direction.
Starts: none initially. If `--quick` changes no game or has insufficient
agenda/trap observations, build real-game-derived
start boards, record their provenance and add a separate gate command before
hand-off; all commands must pass.

`strandedUnrezzedIceCost.credits` counts credits spent installing ICE never
rezzed before game end. Its +1-credit guard and the existing improvement are
unchanged. Core tolerances retain the shared design's preregistered
3-percentage-point/0.25-point exceptions to today's 2-point/0.2-point defaults.
Retain the +25% mean-latency check using fresh same-machine paired runs, not
cached timing. The security-selection policy remains strategic and gated.

**Reconciled statistic.** L8.4's settled check compares measured batch maxima
(candidate 0.229 ≤ control 0.329), with both arms' intervals reported for
context. It is not a paired confidence-bound non-inferiority result and must
not be retroactively changed. I2 instead proposes a separately specified
paired-interval rule with a positive regression margin. It adds uncertainty
checking but permits a small increase, so it is not a strict strengthening
of exact measured-value “no worse”. It is also not an absolute 0.10 ceiling.
F11, baseline-only calibration and preregistration must precede adoption.
L8.2/L8.5 source gates and I9's absolute combined-policy target still require
their own reconciliation; this spec does not settle or amend them.

**Correlation guard setup is required.** The existing collector exports
`bluffSingleVariableCorrelation.max`, the batch-level largest absolute
Spearman correlation across posture/profile outcomes and public variables.
At this stamp, `scripts/ai-batch/metrics.js:compareReports()` handles paired
differences only for per-game metrics; `scripts/ai-batch.js` supports this
batch metric only through an absolute `--ceiling`. Paired-difference mode for
it does **not** exist yet. F11 owns its implementation and tests; I2 only
consumes the delivered support. Resampling must join matching successful
game pairs, recompute each arm's pooled `finishBatch()` per draw and form
candidate minus control intervals, with usable samples in both arms.

**Realized defense coverage (F12-owned collector).** Consume
[F12](../../backlog/code-review/F12-realized-defense-measurement.md), extracted on 2026-10-13 before L8.2;
I2 retains its policy guards and consumer-specific calibration. Use
`realizedIceByRootType` using passive harness snapshots at the start of each
Runner turn, after Corp installs and responses finish. Include every remote
with an agenda or access-punishing trap, whether postured or not, including
roots present on start boards. Record actual ICE count and harness-only true
root type, root commitment identity, public/revealed status, active posture
and safety-override status. Observing a posture must not call a helper that
rolls one. Define traps through `Ambush`/`AIPunishesAccess`, not title lists.
For multi-root servers retain per-root observations with a multi-root label;
state that repeated roots/turns are clustered within games, not independent.

Export `realizedIceByRootType.allCountCorrelation` and
`realizedIceByRootType.posturedCountCorrelation`: absolute Spearman rho of
agenda-versus-trap type against actual ICE count, pooled over unrevealed
roots in all relevant remotes and the actively postured subset respectively.
Report sample/game counts and agenda/trap count distributions, including a
separate revealed-root breakdown. Keep safety overrides in the main metrics
and identify them diagnostically; do not remove difficult cases to pass.
Missing either root type or otherwise undefined correlation fails closed.
These metrics test a count-based tell, not ICE identity, rezzed strength or
multivariable inference. The existing posture-roll guard does not establish
that realized ICE count is unpredictive.

**Tolerance calibration before freezing the adoption gate.** The three correlation guards
below use **0.02 absolute rho as a provisional planning value**, not a frozen
or empirically justified tolerance. After F11 and F12 are
available, collect epoch-enabled control-only reports with identical policy,
pool and collectors on preregistered disjoint seed cohorts. Use independent
game resampling within deck pairs for these calibration differences; never
call different seeds matching pairs or bypass gate report validation. Record
point differences, 95% intervals and widths, usable counts, cohort sizes and
commands. Identical-policy/same-seed comparisons check implementation
identity and produce zero differences; they do not estimate sampling noise.

Compare calibration interval upper bounds and widths with the proposed
margin. Total width greater than 0.02 is a precision warning, not proof that
a paired guard cannot pass: actual paired differences exploit common seeds.
Prefer increasing games or obtaining representative samples to loosening the
acceptable behavioral regression. Any revised tolerance needs an explicit
policy rationale and updated rows/command before the gate or inspecting
candidate results. Freeze that tolerance and the sample size before adoption
runs; never relax them after seeing candidate evidence. If calibration cannot
support a meaningful guard, I2 cannot run an adoption gate or move to
code-review. Once frozen, pass
only when each candidate-minus-control interval upper bound is below its
margin, using F11's strict oriented guard.

`installOutcomes.trapTriggers` is **diagnostic only**: a drop versus control
does not independently block the gate. Record it for interpreting deception
and trap attraction; it must not substitute for or excuse a failed guard.

**Failure disposition.** Failure of the all-server realized-count guard,
postured-count guard or posture-roll guard blocks adoption exactly like any
other gate failure. Follow `ai-planning.md`'s failed-gate lifecycle: close
that implementation attempt as **not adopted**, remove the failed option
and policy branch, and park I2 or replace it with a newly scoped item backed
by the evidence. Keep useful passive collectors. The Resolution must name
the failing guard, control/candidate values, paired interval, frozen margin
and this disposition. A follow-up owned by L8.2 or I9 may investigate the
tell, but cannot waive the failed guard or authorize I2 adoption. Missing
samples are incomplete setup, not evidence that the policy passed.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolen` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.03 |
| Guard | `pointsScored` | higher | regression at most 0.25 |
| Guard | `pointsStolen` | lower | regression at most 0.25 |
| Guard | `gameLength` | lower | regression at most 1.5 |
| Guard | `corpInsolventTurns` | lower | regression at most 0.5 |
| Guard | `strandedUnrezzedIceCost.credits` | lower | regression at most 1 |
| Guard | `bluffSingleVariableCorrelation.max` | lower | regression at most 0.02 absolute rho against matching control (provisional until calibration) |
| Guard | `realizedIceByRootType.allCountCorrelation` | lower | candidate-minus-control 95% interval upper bound strictly below 0.02 absolute rho (provisional until calibration) |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | candidate-minus-control 95% interval upper bound strictly below 0.02 absolute rho (provisional until calibration) |

Planned gate command (after F11 and the new collectors exist and the
calibration above freezes the tolerances; it cannot pass on today's harness):
`node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --collector strandedUnrezzedIceCost --collector corpInsolventTurns --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.25 --guard pointsStolen=0.25 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.02 --guard realizedIceByRootType.posturedCountCorrelation=0.02 --better realizedIceByRootType.allCountCorrelation=lower --better realizedIceByRootType.posturedCountCorrelation=lower --better gameLength=lower`

## Things to consider

- If correlation worsens, more varied ICE choices on traps are a follow-up
  hypothesis to test within the same posture cap, watching
  `installOutcomes.trapTriggers` against the matching control. The current
  correlation collector measures posture/profile rolls and their public
  context, not realized ICE identity or visible strength; passing it alone
  does not prove those observable defense choices conceal card type. After
  an adoption-gate failure, test a revised policy through a new ticket rather
  than tuning this failed attempt against its observed gate results.
- `deceptionValue` remains the shared design's bounded symmetric placeholder.
  [L8.8 Marginal deception value](L8.8-marginal-deception-value.md) owns a
  separately gated follow-up after I2 adoption: shared concealment deltas stay
  symmetric, while private trap payoff stays outside ordinary postured ICE
  ranking. Its proposed `_deceptionUpside()` does not exist yet. L8.8 is not
  an I2 dependency and does not waive this item's invariants or guards.
- **Owned open gap: empty-Archives reward valuation.** I2 planning must decide
  whether its marginal-value comparison can cover the public reward prevented
  by protection. Before hand-off, implement and validate that scoped policy,
  or file and link a separate follow-up ticket with a roadmap owner and an
  acceptance gate. Merely retaining the shared-design note is insufficient.
  Keep the recovered exclusion while the policy remains unvalidated.
- L4.1 (unified bypass allocation) changes the evaluator results that
  scenarios 3 and 6 rest on. Assert orderings, not numbers, and if L4.1 lands
  first build those fixtures on its hook format.
- I2's explicit honest-field adoption applies only to its new marginal score
  behind its own option. Global adoption by existing scoring, rez and
  protection consumers remains L9.0.1's independently gated policy.
- Protection debt versus a winning line (design note edge case 3): central ICE
  scored by consequence must stay below the band-3 fast-advance-to-win
  candidate.
- Performance: every hypothetical pair costs an evaluator call. F3's cache
  is now implemented and enabled; it can reuse real-board evaluations but
  deliberately bypasses hypothetical results. It is not a dependency, and
  the fresh-run latency check still applies.

## Acceptance criteria

- [ ] The Resolution explicitly disposes of the empty-Archives reward-valuation gap: either it links implemented behavior, focused counterexamples and gate evidence, or it links a filed follow-up ticket with remaining scope, roadmap ownership and an acceptance gate. Update the shared design's gap status and reference; "investigate later" without a ticket does not satisfy this criterion.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice; scenarios 8 and 16 cover the exact depth cap and every root-sensitive component/path in the audit table.
- [ ] Ordinary ICE-install generation no longer calls `_serverToProtect(..., targetIsEligible)`; the L3.5.2 regressions (scenarios 9 and 10) pass without it.
- [ ] `_criticalBreachDefenseAction()` consumes I2's candidate evaluation without changing its breach-risk oracle; ordinary marginal scores explicitly use honest verdict fields and cover scenario 18.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The `strandedUnrezzedIceCost` collector and its `credits` metric are added and verified against scripted install/rez outcomes.
- [ ] I0's `corpInsolventTurns` collector is verified and back-filled without changing baseline decisions.
- [ ] L9.1 and F11 are `done` before I2 moves to code-review; implementation without completed review does not satisfy either dependency.
- [ ] The existing `bluffSingleVariableCorrelation` collector is validated for epoch observations and I2 uses F11's delivered paired batch guards; an absolute ceiling is not substituted.
- [ ] F12's `realizedIceByRootType` is consumed and validated against scenario 17, with usable agenda/trap observations, repeatable game-clustered pooled statistics and both realized-count guards passing. A green posture-roll guard alone does not prove realized ICE count is unpredictive, and green count guards do not prove ICE identity/strength or multivariable unpredictability.
- [ ] Before adoption tolerances are frozen, control-only calibration evidence records intervals and widths, usable counts, commands and chosen sample size for all three correlation metrics; tolerances are justified and frozen before any candidate adoption evidence.
- [ ] The implementing agent records the L8.2/I2 ordering decision and its reason before the first gate run; the Resolution records whether evidence predates or includes adopted L8.2, effective options in both arms, and any control/gate refresh after decision-changing prerequisite merges.
- [ ] If any deception guard fails, the Resolution records the failed-gate disposition above; handing the tell to L8.2/I9 never substitutes for passing I2's guards.
- [ ] The Resolution records `bluffSingleVariableCorrelation.max` for the fresh epoch-enabled matching control and candidate, both arms' 95% intervals, the paired difference and its 95% interval, and the calibrated, preregistered absolute-rho tolerance used. It also records both realized-count metrics, their paired intervals, tolerances and sample counts.
- [ ] The existing `installOutcomes` collector is verified against scripted trap-use outcomes, and the Resolution records diagnostic `installOutcomes.trapTriggers` for both arms.
- [ ] The gate's `--quick` run changes at least one game and reaches usable correlation observations. If the pool is thin, use real-game-derived start boards with recorded provenance, focused coverage and a separate passing gate command; no-change or absent-sample runs are not a pass.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
