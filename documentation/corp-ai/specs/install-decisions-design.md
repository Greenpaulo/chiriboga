# Install decisions: shared design

**Verified against code:** 376f32c (2026-09-25)

Shared design for every `I` item. Each item's spec names only what is specific
to that phase; this note holds the question, principles, architecture, score
discipline, gate conventions, test plan, migration strategy and definition of
done they share.

## Question and scope

The server-security area (`L` items) answers:

> How vulnerable, valuable, or urgent is each server?

The install area answers the next decision:

> Given that evaluation, what should the Corp install, where should it install
> it, and is installing it better than another available action?

The two systems remain separate but composable. Server security and public
Runner threat evaluation supply inputs to install planning; install planning
must not duplicate or weaken their information-boundary rules. Shared
deterministic-RNG, hypothetical-evaluation, decision-cache and batch-harness
infrastructure belongs to the `F` items.

The area covers Corp decisions involving:

- which ICE to install and on which server;
- which agenda, asset, ambush, or upgrade to install in a server root;
- whether a remote should be used for scoring, economy, bait, bluffing, defense,
  or disposable value;
- whether installing is preferable to gaining credits, playing an operation,
  advancing, rezzing, or waiting;
- sequencing related actions across the remaining Corp clicks and, eventually,
  across turns;
- preserving enough credits to rez and use the installed cards;
- producing inspectable reasons for install decisions and deterministic tests
  for them.

Card-hook work covers the playable sets listed in `documentation/card-sets.md`
(at this writing `systemgateway`, `systemupdate2021`, `elevation` and
`vantagepoint`) unless an item states a different scope. Re-read that file when
raising an item; the scope follows it, not this sentence.

Whenever an item introduces or changes a card-facing AI hook, update
`documentation/ai.md` in the same change: signature, semantics, valid
information sources, out-of-run safety constraints, and at least one
card-definition example.

## Measurement handoff from L8.9

[L8.9](../../backlog/L8.9-observable-defense-parity.md) delivers passive installation,
defense and lifecycle tools; it owns no admission/holding rule. I3/I4/I5 retain
those decisions. Before changing installation policy, use the
[tool recipe](../../ai-batch-harness.md#using-install-observations-in-the-i-tickets)
with current matching reports and record per-deck/route placement, later defense,
root survival and relevant payoff/score outcomes. The I3/I5 specs carry explicit
reuse and coverage criteria. Previously calibrated noise allowances are evidence
for their measured baseline, not automatic tolerances after policy changes.

A shell/asset-spam plan is a necessary counterexample to “zero ICE means a bad
install”: many bare disposable roots can coexist with a protected scoring room.
I3.1 owns starting-deck composition/mechanic evidence for such plans, without
blocking I3/I5 or introducing an automatic archetype switch. Current L8.9 data
has limited ordinary-asset/type, remote-topology and HQ holding coverage; extend
passive observation with identity tests when a consumer's claim needs that data.

## Corrected regression baseline and ownership

The [2026-10-05 recovery](../../corp-ai-regression/gated-fix-handoff.md)
gates five existing policies, all default-off. Future install work must start
from this corrected policy, not assume the old strict behaviors remain
unconditional. Preserve all five settings in baseline/candidate comparisons
unless a named experiment explicitly tests a gate. Hold prerequisite I-layer
options identical in both arms and capture/back-fill the corresponding control;
an old I0 report with different effective options is not a matching control.

The current F4 `gate` command clears all explicit option overrides in its
baseline arm; it does not retain prerequisite override flags there. A single
gate command is therefore valid only when the pinned build's defaults already
provide the required common configuration, with the tested option default-off.
Verify both reports' effective settings. Otherwise prepare two owner-run
reports with identical prerequisite settings and compare them with the same
metric checks, or add an explicitly designed harness capability before using
the gate. Do not pass prerequisite `--corp-option` flags and assume both arms
receive them.

| Disabled policy | Roadmap owner / coverage |
|---|---|
| `secureScoringServerGate` | I4 owns safe agenda destinations and scoring plans; I3/I6 consume scoring-server suitability. The PR 19 winning-steal concern is tracked in I4. |
| `serverAtRiskInstallOverride` | I2 owns whether another ICE layer buys useful security; I7.1 compares that install with credits/draw, and I7.2/I8 account for competing scoring plans. |
| `committedAgendaReserveBypass` | I4 owns completion/commitment; I7.2 compares advancement with defense/economy; I8 sequences costs across clicks. |
| `emptyArchivesRunPressure` | I2 owns protection-install admission, and L3.5.1 consumes the same valueless predicate for aging. L7.1 supplies agenda/backdoor breach consequences, but does not yet design valuation of non-agenda rewards from empty Archives runs. That reward/admission calibration remains an explicit gap, owned by [I2.1](I2.1-empty-archives-reward-valuation.md) (I2 keeps the exclusion). |
| `valuelessServerDebtReset` | L3.5.1 owns aging/reset semantics. Its individual regression evidence is inconclusive; it was gated to reproduce the combined recovered build. |

I0 must record the corrected default and effective options before collecting
the install-series baseline; I1's compatibility path must preserve that policy.
I0's baseline (done 2026-10-09, all five options `false` in its recorded
options) is the F4 report
[`tests/fixtures/ai-batch/baselines/core-v1-64507f63a8bb962a.json`](../../../tests/fixtures/ai-batch/baselines/core-v1-64507f63a8bb962a.json)
with the I0 collectors, and the install-decision snapshots
[`tests/fixtures/corp-install-baseline.json`](../../../tests/fixtures/corp-install-baseline.json);
see [ai-batch-harness.md](../../ai-batch-harness.md#install-series-collectors-and-baselines-i0).
I9 must compare its combined policy against the corrected baseline, not inherit
old-tip strength claims. Do not turn a legacy gate on just to satisfy an old
fixture: those fixtures now explicitly request the historical policy.

**Archives gap status: open. Accountable item: I2.** During I2 planning,
first trace the spending and the public reward prevented,
then decide whether I2 can cover the valuation or needs a separately scoped
policy. Before I2 moves to code-review, its Resolution must either link the
implemented valuation and validation evidence, or link a filed follow-up
ticket stating the remaining scope, roadmap ownership and acceptance gate.
An unlinked note saying "investigate later" does not meet this requirement.
I9 must audit that disposition before retiring the legacy install fallback;
a still-open follow-up remains visible and the unvalidated policy stays off.
A successful run or a reward hook alone is not a demonstrated reason to spend
on defense. Do not silently expand L7.1's agenda-consequence signal into a
reward valuation or treat I2's enumeration of ranked servers as permission to
bypass the recovered empty-Archives exclusion.

This is an audit of the gated policies and their consumers, not a fresh
verification stamp for every install spec. Re-ground each dependent spec in
full before raising or implementing it; targeted branch corrections below do
not certify unrelated design assumptions or acceptance gates.

## Item order

| Item | Depends on |
| --- | --- |
| I0 | F4 |
| I1 | I0 |
| I2 | I1, F2, F4, L7.1 |
| I3 | I2, F4, L8.4 |
| I4, I5 | I3, F4 |
| I6 | I3, I4, F4 |
| I7.1 | I2, F2, F4 |
| I7.2 | I4, I5, I6, F4 |
| I8 | I7.1, I7.2, F2, F4 |
| I9 | I8, F4 |

F4 appears on every gated item because `documentation/ai-planning.md` requires
it; it is otherwise implied through I0. I4 and I5 can
proceed in parallel once I3 has defined roles; I6 needs both roles (I3) and
agenda plans (I4). I7 is split: I7.1 compares ICE with credit and draw and
needs only I2; I7.2 compares root installs, operations and advancement with
other actions and needs I4, I5 and I6. The R1 items (reserve and optionality)
are not dependencies of either I7 item: they add "hold" as one more
alternative inside the same comparison when they land.

## Principles

The general principles (imperfect information, hooks over titles, tactical
safety, explainable and deterministic decisions, no unsafe state mutation) are
in `documentation/ai-principles.md` and `documentation/corp-ai/principles.md`.
Three principles are specific to install planning.

### Do not copy title cases into the new scoring

Existing title special cases must not be copied into the new scoring
architecture. Where practical and in scope, migrate them to hooks when the
phase that consumes that behaviour lands. The inventory is the P1 ticket
(`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`); each I
spec owns the rows tagged with its ID there and lists them by reference.

### Compare marginal outcomes

The relevant question is not whether a card has a positive generic value. It
is:

> How much better is the resulting board after this card is installed in this
> destination, compared with the current board and competing actions?

ICE and defensive upgrades are scored primarily by changes in security and
breach consequences, not printed rez cost as a proxy for strength.

### Separate capability, affordability, and commitment

The planner must distinguish:

- whether a card could provide the desired effect;
- whether the Corp can pay to install it now;
- whether the Corp can afford to rez and use it when required;
- whether spending those credits prevents other necessary defenses or scoring
  actions.

Installing unrezzable protection must not be credited as if it were active, but
delayed investment can still have bounded bluff or future value.

## Proposed architecture

### Install candidate record

A normalized candidate shape along these lines:

```js
{
  card: card,
  server: server,              // null means a new remote where legal
  kind: "ice" | "root",
  role: "protection" | "scoring" | "economy" | "trap" |
        "defensive" | "bluff" | "disposable",
  band: 1,                     // see "Score discipline"
  compatibilityOrder: 0,       // I1 legacy position; removed by I9
  score: 0,
  scoreBreakdown: {},
  reasons: [],
  legal: true,
  eligible: true,              // false: recorded for diagnostics only
  rejectionReasons: [],
  immediateCost: 0,
  reservedCost: 0,
  securityBefore: null,
  securityAfter: null,
  protectionDelta: 0,
  plan: []
}
```

Names and exact fields may change during implementation, but every option must
be comparable and diagnosable without mutating the actual game.

Install planning must not be reduced to one globally chosen server. A server
can be the most urgent in the abstract while every ICE available for it is
illegal, unaffordable, redundant, or strategically weaker than a concrete
install on the next server. Candidate generation and ranking preserve both the
card and destination dimensions until feasibility and marginal outcome have
been evaluated.

### Core helpers

Candidate APIs to refine in I1:

```js
_enumerateInstallCandidates(cards, context);
_evaluateInstallCandidate(card, server, context);
_rankedInstallCandidates(cards, context);
_hypotheticalServerAfterInstall(card, server, evaluate);
_installRoleForCard(card, server, context);
```

`_rankedInstallOptions()` may remain as a compatibility wrapper while callers
migrate. Engine-facing preferences still resolve back to the existing
`{cardToInstall, serverToInstallTo}` form.

### Hypothetical evaluation

Every "what if this card were installed" probe goes through the existing
`_withHypothetical(apply, evaluate, restore)` helper in `ai_corp.js`, which
restores in `finally`. `_hypotheticalServerAfterInstall()` is the single place
that builds a hypothetical server; nothing else mutates `server.ice`,
`server.root`, `corp.remoteServers` or `corp.creditPool` for planning.
Hypothetical installs must not leak into live game state, cached postures,
protection debt, counters, card locations or randomness, and every collection
or field the helper mutates has a regression test proving it is restored,
including when evaluation throws.

Existing probes this replaces or must agree with (verify by name before
starting):

- `_criticalBreachDefenseAction()` already scores post-install risk per ICE: it
  subtracts the install cost from `corp.creditPool`, pushes the ICE onto
  `risk.server.ice`, calls `_centralBreachLossRisk()` and restores through
  `_withHypothetical()` (F2). I2 makes the critical check read I2's candidate
  evaluation instead of running a second one.
- The uncalled `_iceInstallScore()`/`_bestIceToInstall()` pair was deleted by
  F2.
- `Phase_Main`'s "just need a tiny bit more cash" probe adds credits through
  `_withHypothetical()` and compares install-option counts (F2 fixed the
  mechanics); I7.1 replaces the decision.
- `_ordinaryPurgeOutcome()` already uses `_withHypothetical()` and is the model
  to follow.

**New remotes (`server == null`).** The helper evaluates a detached server
created with `NewServer(name, false)` (the side-effect-free factory in
`utility.js`) and flagged `AIHypothetical: true`, with the candidate placed in
its `ice` or `root` array. It is never pushed onto `corp.remoteServers`, so
protection debt aging, `_emptyProtectedRemotes()`, deception caches, snapshot
labels and card hooks that iterate the remote list cannot see it. Install cost
for a new remote is zero. I1 audits `_evaluateServerSecurity()` and its callees
for reads of `corp.remoteServers` or lookups by remote index, and adds an
equivalence test: evaluating a detached remote holding ICE X gives the same
security result as a real empty remote holding ICE X. Any callee that needs the
remote to be registered is fixed to take the server as an argument rather than
the helper pushing it.

**Existing servers.** The helper pushes the candidate onto `server.ice` (as the
new outermost layer) or `server.root` inside `_withHypothetical()` and removes
it in `restore`. While the evaluator reads live Corp credits for rez
affordability, the install cost is subtracted from `corp.creditPool` inside the
same call, as `_criticalBreachDefenseAction()` does today.

Results computed inside a hypothetical must never populate F3's per-decision
cache.

**Performance (not a dependency).** Joint `(card, server)` evaluation multiplies
`_evaluateServerSecurity()` calls. F3's per-decision cache will reduce the
non-hypothetical "before" evaluations; until then each gated item reports
`decisionLatencyMs` and keeps it within the guard tolerance below.

### Score discipline

**Scale.** Scores are in credit-equivalents: 1.0 is one Corp credit now, and a
Corp click is `CLICK_VALUE = 1.0`. Every component is bounded, named and
recorded in `scoreBreakdown`; the score is their sum. Coefficients are initial
values; I9 may tune them inside the stated bounds, and changing a bound needs a
spec update.

**Bands.** Ranking is by `band` (descending), then `score` (descending), then
`compatibilityOrder` (the legacy position, as a stable tie-break):

| Band | Holds | Scored? |
| --- | --- | --- |
| 3 forced / game-winning | Forced actions; a win this turn, including the existing "could be installed and fast-advanced to win" candidate | No, fixed order |
| 2 tactical safety | Preventing a game-losing breach, including `_criticalBreachDefenseAction()`'s interrupt | No, fixed order |
| 1 ordinary | Everything else | Yes, one scale |
| 0 compatibility | I1's legacy groups not yet migrated to a score | By `compatibilityOrder` only |

Hard constraints (illegal Region or uniqueness placement, a game-losing
exposure) are not scores: they set `legal`/`eligible` to false with a
rejection reason. Until I7.1 and I7.2 compare classes, each class that has been
migrated to band 1 is ranked only against its own class, and classes keep their
legacy relative order.

**Components.**

| Component | Bound | Definition |
| --- | --- | --- |
| `securityGain` | 0 to 8 | `8 × securityDelta × consequenceWeight` (I2, I6) |
| `securityDelta` | 0 to 1 | `0.6 × lockout + 0.25 × breakCost + 0.15 × bypass` |
| `lockout` | 0, 0.7 or 1 | 1 if the server goes from not secure to a hard lockout, 0.7 to a soft credit lockout, per `_evaluateServerSecurity()` after the L1.1 rez budget. I2 specializes this to `honestLockout`/`honestIsSecure`, including soft click/resource limits, behind its own option; other consumers retain their specified verdict |
| `breakCost` | 0 to 1 | increase in `totalMandatoryBreakCost` divided by `max(1, runnerCredits)`, capped at 1. I2 uses finite known `honestMandatoryBreakCost` deltas instead; unknown/non-finite costs earn no numeric delta and lockout is scored separately |
| `bypass` | 0 to 1 | decrease in `structuralRisk + publicThreatRisk`, capped at 1 |
| `consequenceWeight` | 0.25 to 1 | Remotes and Archives: `0.25 + 0.75 × breachConsequence`, where `breachConsequence` (0 to 1) is `_breachConsequence(server).weight`, the evaluator signal L7.1 owns (L3.5.1 also consumes it). Active bait/bluff remotes: common weight 1 for agenda and trap, constrained by the current-epoch `targetIce` count cap and I2's ordinary-ranking substitution invariant for equivalent mechanics, costs and reserves (true stakes remain authoritative for safety). HQ and R&D: 1 unless a separately gated option weights them. Used only inside candidate scores, never in `_protectionScore()` (L7.1's failure analysis); install planning adds no further weighting beyond the explicit I2 posture exception |
| `futureValue` | 0 to 1 | delayed or bluff value of ICE that cannot be rezzed in the projected budget (it earns no `lockout` or `breakCost`) |
| `scoringValue` | 0 to 8 | I4: `2 × agendaPoints × planCompletion`, where `planCompletion` is 1 when the completion plan finishes with no exposed Runner turn, 0.5 with one, and 0 otherwise |
| `economyValue` | -4 to 8 | I5: expected return over expected lifetime minus install, rez and activation costs (clicks at `CLICK_VALUE`) |
| `trapValue` | 0 to 4 | I5: punishment severity times the probability of attracting a run; never feeds `securityGain` |
| `deceptionValue` | 0 to 1 | bounded symmetric placeholder from the existing deception profiles (`_deceptionInstallDistance()`, `_remoteDeceptionProfile()`). [L8.8](L8.8-marginal-deception-value.md) separately proposes a shared marginal concealment input after I2 adoption; private trap payoff remains with `trapValue`, and overlapping `futureValue` must be removed on adoption. No helper or evaluated-payoff model exists yet |
| `installCost` | -8 to 0 | `-min(8, actualInstallCost)`; `actualInstallCost` is also recorded separately in `scoreBreakdown` for diagnostics, but only this bounded component enters the score |
| `reserveCost` | -6 to 0 | credits that must stay available for existing rez obligations (the L1.1 shared unrezzed-ICE budget) and for post-rez spending that cards declare with `AIReserveCredits` (read through `_reserveCreditsForCard()`), counted only when spending now pushes the Corp below them |
| `opportunityCost` | -4 to 0 | clicks beyond the first at `CLICK_VALUE`, plus I3's value of a role the install displaces (for example the only scoring remote). Under the [scoring-risk model](#scoring-risk-model-2026-10-16) I3 instead charges the lost scoring EV in points at `POINT_VALUE`; remote roles live on the server (`server.AIRemoteRole`), separate from this record's install `role` |

The only product is `securityDelta × consequenceWeight`, because security is
worth something in proportion to what is at stake; everything else adds.
`consequenceWeight` never reaches zero so an empty server still gains bounded
value from a lockout.

#### Breach-probability input

Superseded by the [scoring-risk model](#scoring-risk-model-2026-10-16),
which adopts breach likelihood as a graded measurement (M2) keyed on margin
rather than on the `isSecure` verdict. The constraints recorded here still
apply: observation-only first, stock-Runner-AI caveat, and severity owned by
L7.1's `_breachConsequence` while likelihood is owned by M2.

### Scoring-risk model (2026-10-16)

**Why.** The Corp has twice been made weaker by turning a security
measurement into a shared yes/no gate:
[`fa1182c`](../../corp-ai-regression/findings.md#causal-test-on-the-harness-tip)
("never score into an insecure remote") and the
[L9.0.1 gate failure](../../backlog/done/L9.0.1-adopt-honest-lockout.md#resolution).
The owner's 2026-10-14 playtests (one tester, not a measurement) saw both
failure modes at once: agendas held in HQ for long periods, and agendas
installed into weak remotes and then left there unadvanced. Both are
exposure-time problems. "Is this server secure?" is the wrong question for
scoring; the question is **"what do I expect to lose by waiting, compared with
what I expect to lose by installing now?"** Every option carries risk. The Corp
should take calculated risks: score fast, keep reusing a remote the Runner is
locked out of, and count the scoring tools in hand and on the board, the way a
human does with Seamless Launch or SanSan City Grid. This section is the shared
plan that I2, I3 and I4 implement; it follows
[Corp principle 6](../principles.md#6-shared-measurements-consumer-owned-decisions).

**Unit.** Agenda decisions are compared in **expected agenda points** over a
short horizon `H` (default 2 Runner turns, owned here; I4 may extend an
agenda's window to its M3 exposure, and I2's reliability check may shorten it
to 1 if next-turn predictions fail): expected Corp points scored minus expected Runner points
stolen. Within one class (I2's ICE pairs, I4's agenda destinations including
"hold") no conversion is needed. Where points must be traded against credits
(an ICE's install and rez cost, I7's cross-class comparison) use one named
coefficient `POINT_VALUE` (credit-equivalents per agenda point), stated once
here, initially derived from the cost of advancing a typical agenda and
tuned only by I9. I2 phase A sets its initial value as the pool mean of (advancement requirement × 2 + 1) / agenda points; if that under-values ICE, the gate will show it. This one coefficient replaces, for the consumers that adopt
this model, the unmeasured `securityDelta` weights (0.6/0.25/0.15), the
0.7 soft-lockout step, the ×8 scale and `planCompletion`'s 1/0.5/0 steps.
Bands 3 and 2 (game-winning, game-losing) are unchanged and are not scored.

**Measurements (shared, graded, observation-only first).** Each is a number
in real units, published alongside today's fields; none replaces `isSecure`
or changes an existing consumer.

| ID | Measurement | Definition | Owner |
|---|---|---|---|
| M1 | `breachMargin(server)` | Runner's projected public credits (and clicks) minus the honest mandatory cost to get into the server, including approach-time root costs (M4). Negative means the Runner cannot get in; `-Infinity` for an honest hard lockout; `null` when unknown | I2 phase A |
| M2 | `breachHazard(server, runnerTurnsAhead)` | Probability of a successful run on that server in one Runner turn, looked up from a checked-in calibration table keyed on margin bucket × server kind (agenda remote, other remote, HQ, R&D, Archives). For later turns, re-evaluate M1 against projected Runner income rather than assuming independence. Monotone in margin; thin buckets merge with their neighbours. A postured remote uses the agenda-remote row whatever its true contents, so agendas and traps are valued alike | I2 phase A |
| M3 | `exposureTurns(agenda, server)` | Runner turns the agenda sits installed before an executable completion plan scores it, planned turn by turn with `_potentialAdvancement()`, keeping back the rez cost M2 assumed for that server's own ICE. Graded hooks today: `AIFastAdvanceCounters`, `AIAdvancementLimit`, `AIAdvanceCreditGain` (only Vantage Point cards declare the first and last). `AIFastAdvance` only orders operation play and `AIIsScoringUpgrade` is a boolean tag on five unrelated upgrades, so neither measures scoring. Title cases (Seamless Launch, Psychographics, Biotic Labor, Trick of Light, Built to Last, Oaktown Renovation, SanSan City Grid in `_advancementLimit()`) migrate to graded hooks as the I4 spec defines | I4 |
| M4 | approach-time defence hook | A root card declares the cost it imposes when the Runner approaches the server (Runner credits/clicks, e.g. Manegarm Skunkworks), or a Corp-paid end-the-run with its Corp cost and condition (e.g. Anoetic Void, 2 credits and 2 HQ cards). Feeds M1's honest cost only; today both cards have only `AIDefensiveValue` and are invisible to `_evaluateServerSecurity()` | I2 phase A |
| M5 | `hqStealHazard` | Probability an agenda in HQ is stolen per Runner turn: M2 for HQ times min(1, public accesses per breach ÷ HQ size), the chance of accessing *this* agenda; hand-size discard risk is a separate loss | I4 |

The calibration table comes from extending `securityCalibration` (today it
buckets by verdict only: `current`/`honest`, `all`/`agendaRemote`) to record
M1 and server kind per server-turn, run on the F4 pool, with provenance
(pool hash, seeds, commit) stored beside the table. Before any consumer reads
M2, check its predictions against realised breaches on held-out seeds (a
reliability table by bucket).

**Decisions (each consumer behind its own option and gate).**

- **I4, agenda commitment.** For each agenda in HQ, compare every destination
  (existing remotes, a new remote) and *hold*:
  `EV(install in s) = points × P(score) − points × P(stolen during M3)`, with
  `P(stolen) = 1 − Π(1 − M2 per exposed turn)`;
  `EV(hold) = −points × P(stolen from HQ while held, M5) − discard loss +
  deferred value`, where deferred value is (1 − M5) × next turn's best
  `EV(install)` over `H − 1`, counted only when this turn schedules a concrete
  improvement and for at most 2 Corp turns running (one-step lookahead,
  Runner income projected). Choose the best; a remote that is "not secure" can win this
  comparison. Once committed, advancing the agenda outranks other ordinary
  actions unless defending it improves EV more: this is where "score fast"
  lives. It needs the plan to be exempt from the global rez reserve
  (`_sufficientEconomy()`), which today skips the advance block in about 30%
  of Corp actions taken while an agenda sits unfinished (I4 spec); the plan
  keeps its own server's reserve instead. Repeat scoring needs no special rule: after a score the remote's M2
  is still low, so the next agenda chooses it again.
- **I2, ICE selection.** Value an `(ICE, server)` pair by the reduction in
  expected points stolen it buys: points expected through the server within
  the horizon (current stakes plus I3's expected future agendas for a scoring
  remote; agenda density for HQ/R&D) × the drop in M2, minus install and rez
  cost at `POINT_VALUE`. Maintaining a locked scoring remote as the Runner's
  economy grows then ranks highly without a separate rule.
- **I3, remote roles.** The scoring remote is the one with the best projected
  M2 after affordable investment; its role persists across scores. An economy
  install that would occupy it pays the lost scoring EV as opportunity cost.

**Hard constraints stay boolean.** A game-winning score (band 3) and a
game-losing steal remain tactical rules, not EV terms. I4 must state how a
game-losing steal veto is compared with a game-losing HQ steal while holding,
because refusing to install can also lose.

**Order and validation.**

1. I2 phase A: M1, M2 (calibration run and table), M4, observation-only, with
   before/after-commit log-hash parity as L9.0 did (phase A has no option to
   switch).
2. Reliability check of M2 on held-out seeds.
3. I2 consumer, then I3, then I4, each behind its own option and gate. I4 is
   the item expected to move win rate; its gate improves `winRate` and
   `pointsScored` with guards on `pointsStolen` and remote theft.

**Known risks.**

- M2 describes the stock Runner AI (aggressive, runs constantly). A human may
  breach more or less often; playtest before changing defaults.
- M2 is measured under today's Corp policy. Once agendas move, the Runner AI's
  targeting may shift; recalibrate after each adoption (I9).
- A server-turn breach is a successful run, not necessarily a steal (M2 may
  overstate steal risk where accesses miss).
- One-step lookahead could defer indefinitely; the I4 guard (scheduled
  improvement, at most 2 Corp turns) must be tested.
- With `H` = 2, an agenda needing more Runner turns than `H` to score earns
  no score inside the horizon; I4 extends that agenda's window to its M3.
- Deception (L8) stays a separate bounded input; bluff value is not part of
  this EV.

## Acceptance gates

Every item that changes what the Corp does (I2 to I9) is gated under
`documentation/ai-planning.md` ("Acceptance gates") and lists F4 in
**Depends on**. For the install items that means:

- The change ships behind a `CorpAI` option (`this.options.<camelCaseName>`,
  default `false`, per the AI options convention there), named in the
  Resolution; it is switched on only after the gate evidence is recorded.
  Each spec suggests a name.
- Evidence: the F4 command, the committed deck-pool file, deck pairs, the seed
  list, games per pair (default 200), metrics, baseline versus candidate, and
  the threshold met. Seeds are paired; each metric reports the mean difference
  (candidate minus baseline) and a bootstrap 95% confidence interval, pooled
  across deck pairs.
- The baseline is I0's committed report. A collector added after I0 is
  observation-only, so the item back-fills it by re-running the baseline
  configuration (same seeds, option off) and committing the extended report.
- An improvement gate passes when the interval's lower bound for the
  improvement is above zero and no guarded metric regresses beyond tolerance.
  A non-inferiority gate needs only the guards.

**Standard guard tolerances** (this is what "material regression" means in any
I spec):

| Metric | Guard |
| --- | --- |
| `winRate` | interval lower bound at least -0.03 (3 percentage points) |
| `pointsScored` | lower bound at least -0.25 points per game |
| `pointsStolen` | upper bound at most +0.25 points per game |
| `gameLength` | upper bound at most +1.5 turns |
| `decisionLatencyMs` | mean upper bound at most +25% of the baseline mean |
| `corpInsolventTurns` | upper bound at most +0.5 turns per game |

A behaviour-identical refactor (I1) instead requires decision snapshots
identical to the recorded baseline except listed, justified deltas.

## Cross-cutting test plan

Create a focused install-decision test file, expected initially as
`tests/corp-install-decisions.test.js`. Keep server-security mechanics in
`tests/corp-server-security.test.js`, headless board fixtures in
`tests/fixtures/corp-decisions/` (run by `tests/corp-decision-fixtures.test.js`)
and destination legality in `tests/corp-install-destination.test.js`. Install
tests may rely on the security evaluator's public interfaces but should not
duplicate its coverage.

Minimum fixture matrix:

| Dimension | Required cases |
| --- | --- |
| Server | naked HQ, naked R&D, Archives backdoor, empty remote, scoring remote, economy remote, trap remote |
| Security | hard lockout, soft credit lockout, affordable breach, no matching breaker, public bypass, hidden-threat risk only |
| Corp economy | cannot install, can install but not rez, can rez one candidate, rich enough for route, credits reserved elsewhere |
| Root card | agenda, economy asset, Ambush, disposable asset, scoring upgrade, defensive upgrade |
| Game state | opening, agenda flood, normal midgame, Corp match point, Runner match point, last click, multiple insecure servers |
| Runner pressure | balanced, HQ pressure, R&D pressure, non-interactive pressure, compatible breaker, missing breaker subtype |

The server/economy cross-product must specifically include:

- a Baker-backdoored Archives competing with R&D that has existing unrezzed ICE
  (already green through L3.5.2:
  `corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`);
- multiple insecure servers where only the lower-ranked server has an
  affordable and materially effective ICE candidate;
- a highest-ranked server with legal but strategically ineffective ICE choices;
- a state where gaining one credit unlocks decisive protection for the first
  server, contrasted with a state where protecting the second server now is
  better than waiting.

All fixtures that purport to test imperfect information run at least twice
with different hidden Runner Grip/Stack contents and assert identical choices.
Fixtures assert orderings and selections, not numeric scores, so that
evaluator items (for example L4.1's bypass allocation) can land without
rewriting them.

## Compatibility and migration strategy

1. Do not rewrite `_rankedInstallOptions()` wholesale in the first
   implementation.
2. Introduce normalized candidates behind a compatibility wrapper (I1).
3. Preserve existing card hooks and translate their results into candidate
   constraints or score components.
4. Migrate one decision class at a time, in the item order above: ICE (I2),
   roles (I3), agendas (I4) and assets (I5), upgrades (I6), then action
   comparison (I7.1, I7.2) and sequencing (I8).
5. Keep legacy selection available as a fallback, behind each item's AI
   option, until its gate passes.
6. Remove obsolete branches only under I9's "equivalent coverage" rule.
7. `_serverToProtect(..., targetIsEligible)` is L3.5.2's interim compatibility
   bridge. Retiring its use in ordinary ICE-install generation is an I2
   acceptance criterion; the underlying server ranking stays for diagnostics
   and consumers that genuinely need a server-only answer.

Card hooks remain narrow descriptions of card mechanics or tactical
suitability. They must not each recreate the global server-selection algorithm.

## Explicit non-goals for the initial items

- A complete adversarial game-tree search.
- Reading or predicting exact hidden Runner cards.
- Perfect multi-turn planning based on unknown draws.
- Replacing the completed server-security calculator.
- Rebalancing every card set before the scoped sets are validated.
- Using machine-learned opponent fingerprinting or persistent cross-game player
  profiles.
- Treating all numerical value estimates as exact economic truth; bounded
  heuristics with regression evidence are sufficient.

## Things to consider: edge cases and mitigations

### 1. The "derelict remote" problem (I3, I5)

- **Scenario:** The Corp installs a temporary economy asset (e.g. _Pad
  Campaign_ or _Mumba Temple_) into a remote with 1 ICE. Later the asset is
  trashed or used up, leaving an empty remote with 1 ICE.
- **Danger:** I3 might categorize this server as `disposable` or
  `uncommitted`, while I4 treats it as a non-scoring server. The Corp might
  repeatedly spin up new remotes for agendas instead of recycling its existing
  1-ICE server.
- **Mitigation:** `_remoteRole(server)` dynamically evaluates an empty server's
  upgraded potential rather than being permanently locked to its historical
  role.

### 2. Hidden cost collisions in multi-click planning (I8)

- **Scenario:** A 2-click plan evaluates `Click 1: Install ICE on HQ` ->
  `Click 2: Install Agenda in Remote 1`.
- **Danger:** Click 1 incurs an install credit cost equal to the current ICE
  count on HQ. If Click 2 also considers installing another card or triggering
  an ability whose cost depends on available credits, its credit budget must
  reflect `Credits - ImmediateCost(Click 1)`.
- **Mitigation:** The candidate evaluation pipeline explicitly tracks a
  projected credit pool (`projectedCredits`) across multi-action sequences so
  it does not double-count available funds.

### 3. Protection debt versus a winning line (I2, I4, I7.2)

- **Today:** two exemptions exist. `_criticalBreachDefenseAction(optionList,
  almostDoneAgenda)` returns -1 when an installed, fully advanceable agenda
  would reach `AgendaPointsToWin()`, so the critical-central interrupt never
  pre-empts that score; and `_rankedInstallOptions()` emits its "could be
  installed and fast-advanced to win" candidate before every other group.
- **Danger:** `Phase_Main` calls `_criticalBreachDefenseAction()` before any
  install, and `almostDoneAgenda` is found only among installed cards. A
  winning agenda still in HQ that could be installed and fast-advanced this
  turn is therefore not exempt, and a critical central risk can take the click
  instead. Separately, once I2 scores central ICE by consequence, it must not
  be allowed to outrank the fast-advance-to-win candidate inside install
  ranking.
- **Mitigation:** the fast-advance-to-win candidate is band 3 (above tactical
  safety), so it outranks protection in I1's ranking by construction; I7.2
  makes `Phase_Main` consult band 3 before the critical interrupt, with a
  scenario for the in-hand winning line.

## Definition of done for any item

An item is complete only when:

- the scoped behaviour is implemented in `ai_corp.js` and relevant card
  definitions;
- deterministic regression tests cover success, failure, affordability, and
  imperfect-information boundaries;
- existing security and AI tests still pass;
- any new or changed card-facing hooks are documented in `documentation/ai.md`;
- no title special case was added to the new scoring, and the P1 rows tagged
  with the item's ID are migrated, deleted, or recorded as isolated legacy;
- for a scoring-policy change, fixed-seed F4 results were compared against the
  committed baseline before and after the change, and the gate evidence is in
  the Resolution before the AI option defaults to on;
- `documentation/corp-ai/architecture.md` describes the implemented behaviour,
  cards updated, remaining limitations, and calibration follow-ups;
- hypothetical evaluation is proven not to mutate live game state;
- logs or score breakdowns make the selected choice explainable;
- no speculative follow-up is mislabeled as completed behaviour.
