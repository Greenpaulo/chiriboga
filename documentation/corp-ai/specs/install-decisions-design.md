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
  `risk.server.ice`, calls `_centralBreachLossRisk()` and restores in a manual
  `try/finally`. I2 moves this onto the shared helper and makes the critical
  check read I2's candidate evaluation instead of running a second one.
- `_iceInstallScore()` pushes a fake `{ice: [ice], root: []}` remote onto
  `corp.remoteServers` with no guard; it is reachable only through
  `_bestIceToInstall()`, which nothing calls. I2 deletes both.
- `Phase_Main`'s "just need a tiny bit more cash" probe adds credits, compares
  two `_rankedInstallOptions()` arrays with `<` (string coercion, works only by
  accident) and rolls back without a guard. F2 fixes the mechanics; I7.1
  replaces the decision.
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
| `lockout` | 0, 0.7 or 1 | 1 if the server goes from not secure to a hard lockout, 0.7 to a soft credit lockout, per `_evaluateServerSecurity()` after the L1.1 rez budget |
| `breakCost` | 0 to 1 | increase in `totalMandatoryBreakCost` divided by `max(1, runnerCredits)`, capped at 1 |
| `bypass` | 0 to 1 | decrease in `structuralRisk + publicThreatRisk`, capped at 1 |
| `consequenceWeight` | 0.25 to 1 | `0.25 + 0.75 × breachConsequence`, where `breachConsequence` (0 to 1) is `_breachConsequence(server).weight`, the evaluator signal L7.1 owns (L3.5.1 also consumes it); install planning adds no weighting of its own |
| `futureValue` | 0 to 1 | delayed or bluff value of ICE that cannot be rezzed in the projected budget (it earns no `lockout` or `breakCost`) |
| `scoringValue` | 0 to 8 | I4: `2 × agendaPoints × planCompletion`, where `planCompletion` is 1 when the completion plan finishes with no exposed Runner turn, 0.5 with one, and 0 otherwise |
| `economyValue` | -4 to 8 | I5: expected return over expected lifetime minus install, rez and activation costs (clicks at `CLICK_VALUE`) |
| `trapValue` | 0 to 4 | I5: punishment severity times the probability of attracting a run; never feeds `securityGain` |
| `deceptionValue` | 0 to 1 | bounded input from the existing deception profiles (`_deceptionInstallDistance()`, `_remoteDeceptionProfile()`) |
| `installCost` | minus credits | the install cost actually paid |
| `reserveCost` | -6 to 0 | credits that must stay available for existing rez obligations (the L1.1 shared unrezzed-ICE budget) and for post-rez spending that cards declare with `AIReserveCredits` (read through `_reserveCreditsForCard()`), counted only when spending now pushes the Corp below them |
| `opportunityCost` | -4 to 0 | clicks beyond the first at `CLICK_VALUE`, plus I3's value of a role the install displaces (for example the only scoring remote) |

The only product is `securityDelta × consequenceWeight`, because security is
worth something in proportion to what is at stake; everything else adds.
`consequenceWeight` never reaches zero so an empty server still gains bounded
value from a lockout.

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
