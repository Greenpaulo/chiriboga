# Corp AI: Install Decision Architecture Roadmap

## Status

This is a proposed successor to `documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`. None of the phases in this document are implemented unless their status is changed explicitly after code, documentation, and regression tests have been completed.

The server-security roadmap answers:

> How vulnerable, valuable, or urgent is each server?

This roadmap answers the next decision:

> Given that evaluation, what should the Corp install, where should it install it, and is installing it better than another available action?

The two systems should remain separate but composable. Server security and public Runner threat evaluation supply inputs to install planning; install planning must not duplicate or weaken their information-boundary rules.

---

## Scope

This roadmap covers Corp decisions involving:

- which ICE to install and on which server;
- which agenda, asset, ambush, or upgrade to install in a server root;
- whether a remote should be used for scoring, economy, bait, bluffing, defense, or disposable value;
- whether installing is preferable to gaining credits, playing an operation, advancing, rezzing, or waiting;
- sequencing related actions across the remaining Corp clicks and, eventually, across turns;
- preserving enough credits to rez and use the installed cards;
- producing inspectable reasons for install decisions and deterministic tests for them.

Initial card-hook work should use the same scoped sets as the security roadmap unless a future implementation prompt explicitly expands the scope:

- `sets/systemgateway.js`
- `sets/systemupdate2021.js`
- `sets/elevation.js`

Whenever a phase introduces or changes a card-facing AI hook, update `documentation/ai.md` in the same change. Document its signature, semantics, valid information sources, out-of-run safety constraints, and at least one card-definition example.

---

## Findings from the Current Implementation

### 1. Server security now affects where protection is installed

The completed security roadmap materially improves server selection:

- `_evaluateServerSecurity(server)` determines deterministic security using public Runner capabilities, mandatory break costs, effective credits, bypasses, root defenses, and global ETR effects.
- `_protectionScore(server, options)` incorporates installed protection, deterministic security, structural bypass risk, hidden-threat estimates, central pressure, deterrence, successful-run history, and special server context.
- `_rankedServersToProtect()` and `_serverToProtect()` use those scores, same-turn allocation, and cross-turn protection debt to choose which server receives protection next.
- A brittle single-ICE server can therefore become more urgent, and consecutive protection installs can rotate through multiple insecure servers.

This answers **where another layer is needed** much better than the legacy AI did.

### 2. The security result does not yet select the best ICE

`_iceInstallOptions(serverToInstallTo, cards, priorityOnly)` currently enumerates:

1. affordable ICE in input-card order; then
2. unaffordable ICE in input-card order when low-priority options are permitted.

It filters situational ICE through optional `card.AIWorthwhileIce(server, "install")` hooks, but it does not compare the marginal defensive result of each ICE. The nearby install path explicitly notes that it makes no effort to sort the candidates.

An older `_iceInstallScore()` considers printed strength, rez cost, one title-specific placement adjustment, and whether a compatible breaker is installed. `_bestIceToInstall()` can sort using that score, but it is not called by the current install-option path. Even if connected, that score does not use `_evaluateServerSecurity()` and therefore cannot distinguish, for example:

- an ICE that creates a hard lockout from one that merely adds nominal strength;
- an ICE whose subtype is already efficiently covered from one that exposes a missing breaker type;
- an outermost layer that remains vulnerable to a known bypass from a layer that restores route security;
- cheap effective ICE from expensive ICE that the Corp cannot realistically rez alongside existing layers.

The current flow is therefore approximately:

```text
evaluate threats and server security
               |
               v
choose the server needing protection
               |
               v
list suitable ICE, affordable first
               |
               v
choose according to generated/input option order
```

It is not yet a comparison of the resulting server after each candidate ICE is installed.

### 3. Security influences root destinations, but mostly indirectly

The improved `_protectionScore()` is reused by several legacy root-placement helpers, so the completed security work can change root destinations:

- `_emptyProtectedRemotes()` requires an ICE-protected empty remote and orders candidates by `_protectionScore()`.
- `_isAScoringServer()` compares a remote's protection score with HQ or, under agenda pressure, Archives.
- `_scoringServers()` builds the set of eligible agenda/HVT destinations from those remotes.
- `_scoringWindow()` uses relative protection, clicks, and Corp/Runner credits.
- `_bestProtectedRemote()` and `_bestServerToUpgrade()` also compare protection scores.

Consequently, threat evaluation may change which remote looks strongest, which remote qualifies for scoring, where an agenda or ambush is offered, and where some upgrades are directed.

This is useful integration, but it is a side effect of shared protection scores rather than a unified install planner.

### 4. Agenda and HVT selection remains largely role-specific legacy logic

`_isHVT(card)` treats agendas, Ambush cards, and Hostile cards as high-value targets. Normal install generation offers HVTs to scoring servers. Those options are primarily ranked by:

- the difference between the card's advancement requirement and the server's scoring window; and
- `_deceptionInstallDistance()`, which represents the selected agenda/trap posture.

The deception system can vary desired ICE depth and advancement cadence after a root card is involved. It does not provide a general comparison between installing an agenda, installing an ambush, installing economy, or declining to commit a root card.

There is also no universal requirement that a prospective scoring server be deterministically secure. `_isAScoringServer()` normally uses relative protection against HQ. If HQ is also weak, a breachable remote can potentially qualify because it is comparatively no worse. Already-installed agendas, scoring upgrades, and ambushes also cause a remote to be recognized as a scoring server so that the AI continues supporting it; that recognition should not be confused with proof that installing the original card there was safe.

### 5. Asset choice depends heavily on individual hooks and ordered categories

Assets with `AIWorthInstalling(emptyProtectedRemotes)` can choose an existing remote by index, request a new remote, or reject installation. Because the supplied remote list is ordered by protection score, the new security work can indirectly affect the hook's destination.

However, the general planner does not calculate:

- expected economic return before the asset is trashed;
- whether the asset repays its install, rez, click, and opportunity costs;
- whether an exposed asset is intentionally disposable;
- whether attracting a run is desirable for an ambush but harmful for economy;
- whether an asset should consume the best available scoring remote;
- whether installing nothing is superior to exposing the card now.

Generic non-HVT assets are generally steered away from the strongest empty remote, preserving it for scoring, but this is a placement convention rather than a value comparison.

### 6. Upgrade placement uses broad hooks, not marginal server outcomes

Upgrade installation uses helpers such as `_bestServerToUpgrade()`, `_shouldUpgradeServerWithCard()`, and `_upgradeInstallPreferences()`, together with hooks and flags including:

- `AIIsScoringUpgrade`
- `AIDefensiveValue(server)`
- `AILimitPerServer(server)`
- uniqueness and Region restrictions

These can filter invalid or low-value placements and direct an upgrade toward a comparatively weak server. They do not generally compare the server before and after each upgrade or measure whether one upgrade prevents the relevant breach more effectively than another.

### 7. Install options are generated in priority buckets, not through one value model

`_rankedInstallOptions()` is named as a ranking function, but much of its effective priority comes from concatenation order among independently generated option groups. `_bestInstallOption()` then selects the first generated preference matching a legal engine option.

This architecture makes local rules easy to add, but it prevents meaningful comparison across categories such as:

```text
ICE on HQ
versus
agenda in a remote
versus
economy asset
versus
defensive upgrade
versus
gain a credit and wait
```

The underlying missing abstraction is a scored **install candidate**, including the card, destination, intended role, immediate value, future obligations, risks, and reasons.

### 8. Critical protection now has a narrow acquisition fallback

The completed security roadmap now bridges one urgent failure mode into action
planning: when the highest-ranked server is critically insecure and HQ contains
no ICE, the Corp may install/rez declared immediate draw or spend clicks drawing
while preserving a click to install protection. This is deliberately a bounded
safety fallback, not a replacement for the unified action comparison proposed
in Phases 7-8. Future install planning must preserve its agenda-flood, economy,
last-click, and imperfect-information guards while comparing it against tutors,
operations, and other short plans.

---

## Guiding Principles

### 1. Preserve imperfect information

Install planning must obey all information boundaries in the security roadmap.

- Never inspect the identities or properties of cards in the Runner's hidden Grip or Stack.
- Use only public installed cards, identities, revealed Heap information, counters, public credits, public run history, and bounded public-information threat estimates.
- Do not change a decision merely because hidden Runner cards were substituted with different hidden cards.
- Corp knowledge of its own HQ, R&D, Archives, installed cards, and future obligations may be used normally.

### 2. Prefer mechanic hooks over card-title policy

Card-specific mechanics should be exposed through declarative hooks. The central planner should reason about returned capabilities or values, not growing lists of titles.

Existing title special cases should not be copied into the new scoring architecture. Where practical and in scope, migrate them to hooks when the phase consuming that behavior is implemented.

### 3. Compare marginal outcomes

The relevant question is not whether a card has a positive generic value. It is:

> How much better is the resulting board after this card is installed in this destination, compared with the current board and competing actions?

ICE and defensive upgrades should be scored primarily by changes in security and breach consequences, not printed rez cost as a proxy for strength.

### 4. Separate capability, affordability, and commitment

The planner must distinguish:

- whether a card could provide the desired effect;
- whether the Corp can pay to install it now;
- whether the Corp can afford to rez and use it when required;
- whether spending those credits prevents other necessary defenses or scoring actions.

Installing unrezzable protection must not be credited as if it were active, but delayed investment can still have bounded bluff or future value.

### 5. Keep tactical safety authoritative

No role, bluff, or stylistic preference may override immediate game-losing risks. Examples include installing a stealable winning agenda, consuming credits needed to defend a game-winning breach, or abandoning a forced scoring opportunity.

### 6. Make decisions explainable and deterministic under a fixed seed

Every ranked candidate should retain a structured score breakdown and human-readable reasons. Randomness may be used for deliberate deception or ties, but must be injectable, bounded, and reproducible.

### 7. Avoid planning by unsafe state mutation

Hypothetical installs must not leak changes into live game state, cached postures, protection debt, counters, card locations, or randomness. Prefer an evaluation overlay or snapshot/restore helper. If temporary mutation is initially unavoidable, use a single guarded helper with `try/finally` restoration and regression tests for every mutated collection or field.

---

## Proposed Architecture

### Install candidate record

Introduce a normalized candidate shape along these lines:

```js
{
  card: card,
  server: server,              // null means a new remote where legal
  kind: "ice" | "root",
  role: "protection" | "scoring" | "economy" | "trap" |
        "defensive" | "bluff" | "disposable",
  score: 0,
  scoreBreakdown: {},
  reasons: [],
  legal: true,
  rejectionReasons: [],
  immediateCost: 0,
  reservedCost: 0,
  securityBefore: null,
  securityAfter: null,
  protectionDelta: 0,
  plan: []
}
```

Names and exact fields may change during implementation, but every option should be comparable and diagnosable without mutating the actual game.

### Core helpers

Candidate APIs to refine during Phase 1:

```js
_enumerateInstallCandidates(cards, context);
_evaluateInstallCandidate(card, server, context);
_rankedInstallCandidates(cards, context);
_hypotheticalServerAfterInstall(card, server);
_installRoleForCard(card, server, context);
```

`_rankedInstallOptions()` may remain as a compatibility wrapper while callers migrate. Engine-facing preferences should still resolve back to the existing `{cardToInstall, serverToInstallTo}` form.

### Score discipline

Avoid one unexplained aggregate formula. Score components should be bounded and named, for example:

```js
{
  tacticalSafety: 8,
  securityGain: 5,
  scoringValue: 0,
  economyValue: 2,
  deceptionValue: 0.5,
  installCost: -1,
  reserveCost: -3,
  opportunityCost: -2
}
```

Hard rejection rules should remain separate from soft score penalties. An illegal Region placement or unsafe match-winning agenda exposure should not merely receive a lower numerical score.

---

## Implementation Roadmap

### Phase 0: Baseline Capture and Decision Telemetry — `[PROPOSED]`

**Goal:** Establish current behavior and a measurable baseline before changing priorities.

**Work:**

- Add opt-in structured logging around `_rankedInstallOptions()` and `_bestInstallOption()`.
- Record candidate card, destination, generated category/reason, affordability, chosen option, current server protection score, and deterministic security result.
- Record the immediate outcome of important root commitments: agenda scored/stolen, trap fired, asset used/trash-before-payoff, upgrade used, or server abandoned.
- Create deterministic fixtures for representative hands and boards across the scoped sets.

**Safety constraints:** Logging must not inspect hidden Runner card identities, alter decisions, consume randomness, or remain enabled by default.

**Acceptance gate:** Fixed test states produce stable snapshots of the current candidate order and selected option, sufficient to identify intended and unintended changes in later phases.

### Phase 1: Unified Install Candidate Model — `[PROPOSED]`

**Goal:** Replace implicit concatenation priority with explicit, inspectable candidate records while initially preserving behavior.

**Work:**

- Normalize all legal ICE and root install choices into one candidate structure.
- Preserve present priority groups through temporary compatibility score bands.
- Add structured reasons and rejection reasons.
- Make `_bestInstallOption()` consume the ranked candidate list.
- Remove duplicate `(card, server)` candidates or merge their reasons deterministically.
- Keep generated preferences compatible with card-driven install effects and non-HQ card sources.

**Deterministic regression scenarios:**

1. Existing priority-only calls still exclude unaffordable ICE and unsafe new-server root installs.
2. Free install/rez effects preserve their less-inhibited behavior.
3. The same legal option is not emitted twice because two legacy categories selected it.
4. Candidate ranking is stable when unrelated cards are reordered outside the relevant option group.
5. No hypothetical evaluation changes card locations, server contents, counters, protection debt, or cached deception decisions.

**Acceptance gate:** Existing focused AI tests pass, baseline fixtures retain intended selections, and every returned install preference has a score breakdown and reason.

### Phase 2: ICE Selection by Marginal Security — `[PROPOSED]`

**Goal:** Use the completed server-security engine to decide which ICE provides the best protection on each candidate server.

**Proposed evaluation:**

1. Evaluate the target server before installation.
2. Evaluate a hypothetical server with the candidate ICE as the new outermost layer.
3. Compare deterministic security, hard lockout, mandatory break cost, total break/avoidance cost, bypass exposure, structural risk, and protection value.
4. Account for install cost, rez affordability, existing unrezzed ICE obligations, and credits that must be reserved for other critical servers.
5. Weight the improvement by server value and the consequence of a breach, while keeping same-turn multi-server allocation authoritative.

**Important distinctions:**

- Creating a hard lockout is not equivalent to adding printed strength.
- Increasing optional punishment is useful but must not masquerade as deterministic security.
- Subtype diversity matters only through actual public Runner capabilities and effective subtype shifts.
- Adding a second layer may be valuable against outermost or one-ICE bypass even when raw break cost changes little.
- Expensive unrezzed ICE should not receive full value when the Corp cannot afford the route's rez obligations.
- ICE-specific `AIWorthwhileIce` hooks remain valid for mechanics the generic evaluator cannot infer, but should reject or modify candidates rather than establish their entire ordering.
- When a server has an active bait or bluff posture, ICE selection must respect that posture's bounded target depth and credible-light-defense signal. Marginal security still ranks candidates within the allowed posture; it must not silently choose an ICE whose cost or visible strength makes the intended deception deterministic or implausible. Tactical safety overrides the posture whenever the lighter choice could enable a game-winning breach.

**Deterministic regression scenarios:**

1. Against a publicly installed Fracter only, otherwise comparable Code Gate or Sentry ICE outranks an efficiently broken Barrier.
2. An affordable ETR ICE that creates a hard lockout outranks higher printed-strength ICE that leaves the route open.
3. A second affordable layer outranks deepening another server when it neutralizes public outermost-bypass risk on a valuable remote, subject to multi-server safety.
4. ICE that cannot be rezzed within the projected defense budget does not receive active-security credit.
5. An ICE with only optional punishment increases deterrent/tax value but does not claim a mandatory lockout.
6. Effective subtype changes and targeted bypass hooks affect hypothetical results exactly as they affect installed ICE.
7. Candidate evaluation is unchanged when hidden Runner Grip cards are substituted.
8. A bait-postured remote receives an ICE choice consistent with its bounded light-defense script, while the same candidates are ranked purely by marginal security after the posture ends.

**Acceptance gate:** In deterministic fixtures, the selected ICE maximizes the intended bounded marginal-security value, and seeded simulations reduce preventable breaches without producing chronic Corp insolvency.

### Phase 3: Remote Role and Root Suitability Model — `[PROPOSED]`

**Goal:** Decide what a remote is for before comparing root cards.

**Initial roles:**

- `scoring`: agenda advancement and scoring;
- `economy`: assets expected to repay their costs;
- `trap`: real access punishment intended to attract a run;
- `defensive`: cards whose primary purpose is protecting another root card or access;
- `bluff`: controlled deception without an immediately matching payload;
- `disposable`: value remains acceptable if contested quickly;
- `uncommitted`: protected space held for a future purpose.

**Work:**

- Add `_remoteRole(server, context)` and `_rootSuitability(card, server, role, context)` or equivalent helpers.
- Distinguish a server's current observed role from a proposed role after installation.
- Prevent accidental role conflicts, such as ordinary economy consuming the only credible scoring remote or random assets entering a scoring server.
- Treat role changes as explicit candidates with opportunity costs rather than silent side effects.
- Integrate existing bait and deception profiles as bounded inputs, not dominant policy.

**Deterministic regression scenarios:**

1. A low-payoff economy asset does not consume the only safe scoring remote when a viable disposable destination exists.
2. An Ambush can prefer a more tempting server than an agenda without claiming that the server is secure.
3. A scoring upgrade preserves or creates a scoring role only when its mechanics and future plan support that use.
4. Repurposing a remote clears or revises stale deception assumptions safely.
5. A server's role is inferred only from Corp-visible information.

**Acceptance gate:** Every root install candidate declares a role, incompatible role/card combinations are rejected or penalized explicitly, and no existing deception safety rule is weakened.

### Phase 4: Agenda Installation and Scoring Commitment — `[PROPOSED]`

**Goal:** Decide whether a specific agenda should be committed now, to which server, and with what completion plan.

**Work:**

- Replace purely relative scoring-server qualification with explicit safety and consequence checks.
- Use agenda points, advancement requirement, remaining clicks, available advancement effects, fast-advance tools, future credit requirements, and breach consequences.
- Require a plausible scoring sequence or an explicitly bounded bluff posture.
- Reserve credits and clicks needed to complete or defend the plan.
- Preserve emergency agenda-flood handling, but label and score its additional risk rather than treating it as ordinary scoring.
- Give game-winning scores and game-losing steals authoritative tactical treatment.

**Known issue to address:** A remote should not qualify for agenda installation merely because HQ is equally weak. Relative protection remains useful, but deterministic security, expected breach cost, agenda value, and time exposed must be considered directly.

**Deterministic regression scenarios:**

1. An insecure remote is rejected for a game-losing agenda even when HQ has a lower protection score.
2. A deterministically secure remote with a matching advancement window accepts the agenda.
3. A fast-advance line chooses the agenda it can complete rather than a higher-value agenda it must expose.
4. Agenda flood permits a controlled higher-risk install only when alternatives such as scoring, operation play, or safe discard are worse.
5. Match-winning scoring lines override ordinary economy and deception preferences.
6. Agenda bluff profiles never create a naked agenda server and never risk the winning steal.

**Acceptance gate:** Deterministic tests cover safe scoring, forced risk, fast advancement, agenda flood, match point, and deception; seeded games reduce avoidable agenda steals without suppressing viable scoring.

### Phase 5: Asset, Ambush, and Economy Value — `[PROPOSED]`

**Goal:** Compare root assets by expected board value instead of relying primarily on hook-selected remote indices.

**Proposed value components:**

- install, rez, activation, click, and opportunity costs;
- turns or activations required to repay those costs;
- expected usable lifetime given public pressure and server security;
- trash cost and Runner economic pressure;
- immediate value if contested;
- access-punishment severity and probability of attracting a run;
- synergy with advancement, tags, damage, other installed cards, or Corp plans;
- value of preserving stronger remotes for scoring.

**Hooks:** Existing `AIWorthInstalling()` behavior should be adapted rather than removed immediately. A future declarative hook may return a mechanic/value profile instead of a destination index, but its design should be established from multiple real cards in the scoped sets before standardization.

**Deterministic regression scenarios:**

1. An economy asset with no plausible payoff before access is delayed or assigned only disposable value.
2. An immediately profitable asset may be installed in a weaker remote when its return justifies the risk.
3. A severe Ambush receives trap value but does not count as deterministic protection.
4. Bait frequency and candidate value remain stable across repeated evaluator calls in one planning window.
5. A normal asset does not displace an agenda or required scoring upgrade from the intended scoring server.
6. Card hooks can reject mechanically pointless installs without hardcoding their titles in the planner.

**Acceptance gate:** Scoped asset fixtures produce explainable payoff/risk decisions, and simulations improve realized asset value without eliminating credible traps or starving scoring remotes.

### Phase 6: Upgrade Selection by Marginal Effect — `[PROPOSED]`

**Goal:** Choose an upgrade and destination by measuring what it changes on that server.

**Work:**

- Evaluate security and access consequences before and after hypothetical upgrade installation.
- Model breach prevention, access taxes, additional advancement value, scoring acceleration, and card-specific server restrictions through hooks.
- Enforce uniqueness, Region, and per-server limits as hard legality constraints.
- Reserve rez and ability costs where required.
- Compare installing the upgrade before versus after the protected agenda or asset when information exposure and click order matter.

**Deterministic regression scenarios:**

1. A breach-preventing upgrade goes to the server where it changes the breach outcome, not simply the weakest raw score.
2. A scoring upgrade is rejected from a server with no plausible scoring plan.
3. Region and uniqueness conflicts are never softened into score penalties.
4. An unaffordable defensive upgrade is not credited as active defense.
5. An access-tax upgrade can still receive bounded value when it does not establish security.

**Acceptance gate:** Upgrade choices are based on bounded marginal outcomes, all placement constraints remain correct, and new hooks are documented in `documentation/ai.md`.

### Phase 7: Install Versus Other Corp Actions — `[PROPOSED]`

**Goal:** Compare the best install with gaining credits, playing operations, advancing, rezzing, triggering abilities, or waiting.

**Work:**

- Normalize high-level Corp actions into comparable tactical values or bounded priority bands.
- Include the immediate opportunity cost of a Corp click and spent credits.
- Recognize when gaining one or more credits unlocks a much stronger install and defense line.
- Preserve forced and game-winning actions as hard priorities.
- Prevent low-value installation merely to relieve hand pressure when a better discard or economy line exists.

**Deterministic regression scenarios:**

1. Gain-credit-then-install is preferred when the extra credit changes an ICE from unusable to decisive.
2. A playable economy operation outranks a negative-return economy asset.
3. A guaranteed score outranks speculative protection or economy.
4. Installing unaffordable ICE does not outrank funding already installed critical defense without explicit future value.
5. Hand-size pressure affects opportunity cost but does not erase tactical safety.

**Acceptance gate:** Main-phase decisions can explain why installation beats the best non-install alternative in representative tactical fixtures.

### Phase 8: Multi-Click and Short-Horizon Planning — `[PROPOSED]`

**Goal:** Evaluate install decisions as parts of short plans rather than isolated clicks.

**Example plans:**

```text
gain credit -> install and retain rez capacity
install ICE -> install agenda -> advance
install scoring upgrade -> install agenda
install economy asset -> activate it
protect HVT server -> reinforce another insecure central
```

**Work:**

- Add a shallow plan representation containing actions, costs, required state, reserved credits, and terminal value.
- Begin with deterministic two-action plans; expand to three actions only after performance and correctness are measured.
- Replan after every resolved action or meaningful state change.
- Never assume hidden future draws.
- Avoid committing a root card when the remaining clicks or credits cannot complete the minimum safe plan.

**Deterministic regression scenarios:**

1. The AI installs an agenda only when its remaining actions can complete the intended advancement or protection sequence.
2. A plan is abandoned and recalculated when an effect changes credits, clicks, or the target server.
3. Reserved rez credits are not double-spent by two planned defenses.
4. Planning does not trigger card effects, consume counters, or roll deception posture early.
5. Fixed seeds and identical public states produce identical plans.

**Acceptance gate:** Short planning reduces obviously incomplete install sequences without causing unacceptable main-phase latency or stale-plan behavior.

### Phase 9: Calibration, Simulation, and Policy Simplification — `[PROPOSED]`

**Goal:** Tune bounded weights using reproducible evidence and remove superseded legacy branches.

**Metrics:**

- agenda points scored and stolen by installation context;
- game-winning breaches enabled or prevented;
- time from agenda install to score or steal;
- asset install/rez/click cost versus realized return;
- trap trigger and runner-engagement rates;
- deception exploitability by observable public-state variable, including turn, credits, server shape, and installed-card context;
- ICE install count, rez rate, marginal break-cost gain, and stranded unrezzed cost;
- central versus remote protection share;
- Corp insolvency caused by install commitments;
- number of abandoned or immediately obsolete install plans;
- average decision latency.

**Work:**

- Compare fixed-seed baselines before and after every scoring-policy change.
- Run broader randomized matches only after deterministic regression tests pass.
- Audit bait/bluff outcomes for learnable single-variable correlations across many seeds and games; install-level role and card selection must not leak a deterministic signal even when the underlying posture roll is balanced.
- Keep coefficients bounded and documented beside their semantic score component.
- Remove compatibility score bands and dead legacy ordering only after the replacement demonstrates equivalent coverage.
- Keep a clear fallback path until candidate scoring outperforms baseline without major regressions.

**Acceptance gate:** The unified policy improves scoring, asset return, or breach prevention in seeded comparisons without material regressions in economy, action latency, deception safety, or imperfect-information compliance. No bait/bluff decision may show an exploitable correlation with a single observable game-state variable beyond its documented bounded inputs and confidence threshold.

---

## Cross-Cutting Test Plan

Create a focused install-decision test file, expected initially as:

```text
tests/corp-install-decisions.test.js
```

Keep server-security mechanics in `tests/corp-server-security.test.js`; install tests may rely on those public interfaces but should not duplicate their complete implementation coverage.

Minimum fixture matrix:

| Dimension       | Required cases                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Server          | naked HQ, naked R&D, Archives backdoor, empty remote, scoring remote, economy remote, trap remote                  |
| Security        | hard lockout, soft credit lockout, affordable breach, no matching breaker, public bypass, hidden-threat risk only  |
| Corp economy    | cannot install, can install but not rez, can rez one candidate, rich enough for route, credits reserved elsewhere  |
| Root card       | agenda, economy asset, Ambush, disposable asset, scoring upgrade, defensive upgrade                                |
| Game state      | opening, agenda flood, normal midgame, Corp match point, Runner match point, last click, multiple insecure servers |
| Runner pressure | balanced, HQ pressure, R&D pressure, non-interactive pressure, compatible breaker, missing breaker subtype         |

All fixtures that purport to test imperfect information should run at least twice with different hidden Runner Grip/Stack contents and assert identical choices.

---

## Compatibility and Migration Strategy

1. Do not rewrite `_rankedInstallOptions()` wholesale in the first implementation.
2. Introduce normalized candidates behind a compatibility wrapper.
3. Preserve existing card hooks and translate their results into candidate constraints or score components.
4. Migrate one decision class at a time: ICE, roles, agendas, assets, upgrades, then action sequencing.
5. Keep legacy selection available as a fallback during calibration.
6. Remove obsolete branches only when deterministic fixtures and seeded simulations show that the replacement covers their purpose.

Card hooks should remain narrow descriptions of card mechanics or tactical suitability. They should not each recreate the global server-selection algorithm.

---

## Explicit Non-Goals for the Initial Phases

- A complete adversarial game-tree search.
- Reading or predicting exact hidden Runner cards.
- Perfect multi-turn planning based on unknown draws.
- Replacing the completed server-security calculator.
- Rebalancing every card set before the scoped sets are validated.
- Using machine-learned opponent fingerprinting or persistent cross-game player profiles.
- Treating all numerical value estimates as exact economic truth; bounded heuristics with regression evidence are sufficient.

---

## Suggested First Implementation Prompt

Begin with **Phase 0 and Phase 1 only**.

The implementation should:

1. inspect all current producers and consumers of `_rankedInstallOptions()` and `_bestInstallOption()`;
2. introduce a normalized install-candidate record and deterministic deduplication;
3. preserve current choices through compatibility priority bands;
4. attach structured reasons, rejection reasons, and relevant server-security diagnostics;
5. add `tests/corp-install-decisions.test.js` baseline fixtures;
6. avoid changing card selection policy until the baseline is observable;
7. update `documentation/ai.md` only if a card-facing hook contract changes;
8. update this roadmap with implemented notes and any discovered follow-up work.

After that foundation is merged, implement **Phase 2: ICE Selection by Marginal Security** as the first intentional policy change. Root-role and root-card work should follow on the same candidate framework rather than adding another independent priority list.

---

## Definition of Done for Any Phase

A phase is complete only when:

- the scoped behavior is implemented in `ai_corp.js` and relevant card definitions;
- deterministic regression tests cover success, failure, affordability, and imperfect-information boundaries;
- existing security and AI tests still pass;
- any new or changed card-facing hooks are documented in `documentation/ai.md`;
- this roadmap records implemented notes, cards updated, remaining limitations, and calibration follow-ups;
- hypothetical evaluation is proven not to mutate live game state;
- logs or score breakdowns make the selected choice explainable;
- no speculative follow-up is mislabeled as completed behavior.
