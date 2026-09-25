# Corp AI architecture

How the implemented Corp AI (`ai_corp.js`) works today. Plans live in
[roadmap.md](roadmap.md); rules every change obeys live in
[principles.md](principles.md). The code is the source of truth: when this file
and the code disagree, fix this file.

Every backticked function, method or hook name here must exist in the code;
`tests/ai-roadmaps.test.js` checks this. The behaviour descriptions were
carried over from the legacy roadmaps' implementation notes (2026-09-25) and
are updated by `implement-ticket` whenever an item is completed.

Read only the section you need:

| Section | Covers | Roadmap items |
|---|---|---|
| [Decision flow](#decision-flow) | How the pieces connect | — |
| [Server security evaluation](#server-security-evaluation) | Is a server deterministically secure, and at what cost | L1, L1.1, L2, L2.1, L3 |
| [Protection allocation](#protection-allocation) | Which server receives protection next | L3.5, L3.5.2 |
| [Type shifts, bypasses and redirects](#type-shifts-bypasses-and-redirects) | Mechanics that change which breaker matches or skip ICE | L4 |
| [Public threat memory](#public-threat-memory) | Hidden-card threats estimated from public information | L5 |
| [Runner effective credit ceiling](#runner-effective-credit-ceiling) | The Runner's usable credits for a route | L6 |
| [Central pressure and breach-loss risk](#central-pressure-and-breach-loss-risk) | HQ/R&D urgency, game-losing breach interrupts, rez timing | L7 (L7.1 open) |
| [Emergency protection and purge](#emergency-protection-and-purge) | Recovery when HQ has no ICE; when to purge | L7.2, L7.3 |
| [Baits, bluffs and deterrence](#baits-bluffs-and-deterrence) | Trap postures, agenda bluff profiles, tag deterrence | L8.1–L8.3 |
| [Install planning today](#install-planning-today) | How install options are generated and chosen | I-items |
| [Not yet modelled: holding and trigger ordering](#not-yet-modelled-holding-and-trigger-ordering) | Gaps the R-items address | R1.1–R1.3, R2 |
| [Foundations](#foundations) | Randomness, hypotheticals, caching, simulation | F1–F5 |
| [Known limits](#known-limits) | What the security model does not cover | L9, L6.1 |
| [Helper reference](#helper-reference) | Key methods at a glance | — |

## Decision flow

`Choice()` dispatches each engine decision to a phase handler such as
`Phase_Main`. Most main-phase planning reads the same inputs:

```text
public board + Corp knowledge
        │
        ▼
_evaluateServerSecurity(server)      deterministic security per server
        │
        ▼
_protectionScore(server, options)    bounded urgency: security + soft signals
        │
        ▼
_rankedServersToProtect()            ordered targets, rotation, protection debt
        │
        ├─▶ install planning   (_rankedInstallOptions, _bestInstallOption)
        ├─▶ rez decisions      (_iceWorthRezzing)
        ├─▶ scoring servers    (_isAScoringServer, _scoringWindow)
        └─▶ critical defence   (_criticalBreachDefenseAction, _emergencyProtectionRecovery)
```

`Phase_Main` considers purge and tag-trash before ordinary install selection.

## Server security evaluation

**Purpose.** Replace static ICE counting with a capability-based simulation of
the Runner's rig, credits, board and threats, so the Corp judges real scoring
windows and lockouts the way an experienced player would. The key distinction
is between effects the Runner *must* pay to avoid (end the run, lethal damage),
which decide security, and optional punishment, which only taxes. Counting the
Corp's full credit pool once per unrezzed layer overstated security, which is
why rez funding is shared across a route (L1.1). Card behaviour comes from
declarative hooks so the evaluator works for past and future sets without
title special cases.

`_evaluateServerSecurity(server)` is the primary entry point. It returns
whether the server is secure, break costs, the effective `runnerCredits` and its
`runnerCreditPool` breakdown, risks, deterrence and human-readable `reasons`.

**Breaker matching and break cost.** Active installed breakers and identities
are matched against ICE subtypes through `AIMatchingBreakerInstalled` and
`BreakerMatchesIce`, for human and AI Runners alike. Paid breakers are compared
by estimated cost, read from their `AIImplementBreaker` hooks, with card-text
patterns as a fallback; pump and break batches round to whole activations.
Hosted counter contributions are evaluated separately. Public installed-breaker
counts are prepared on a fresh Corp-owned calculator.

**Subroutine classification.** The Corp's own ICE, including unrezzed ICE, is
classified through a Corp-owned calculator and `AIImplementIce`.
Resource-denial effects add to `totalBreakCost` (the cost of avoiding all
punishment). `totalMandatoryBreakCost` counts only breaks needed to avoid
end-the-run or lethal damage, and only that cost is compared with the Runner's
credits to declare security. Optional tags or program trash never establish a
lockout; negligible effects (`misc_minor`, `loseCredits`, `payCredits`) are
ignored. `_effectiveIceStrength()` applies active strength reducers and virus
counters.

**Shared unrezzed-ICE rez budget (L1.1).** A route with several unrezzed ICE
does not count the Corp's whole credit pool once per layer. The evaluator
compares affordable subsets of unrezzed ICE and keeps the plan with the
strongest deterministic result (hard lockout, then mandatory cost, then total
avoidance cost, then lower rez spend), so a weak outer layer can be skipped to
fund a decisive inner one. Rezzed ICE are always included; omitted layers are
recorded in `reasons`. `_canFundRezPlan()` combines the base pool with hosted
credit sources, using `canUseCredits("rezzing", ice)` and a max-flow allocation
so restricted credits are never spent on an ineligible layer or counted twice.
Evaluation spends nothing and leaves all state unchanged.

**Root defences, global ETR and lethality (L2, L2.1).** `_hasDefensiveUpgrade()`
reads `AIPreventBreach` on root and active Corp cards. Trace- or psi-dependent
prevention (for example Ash or Caprice Nisei, neither currently implemented)
must not receive an unconditional hook. `_globalETRUses(server)` counts the
global end-the-run uses the Corp will actually spend on a server, from
`AIGlobalETRUses(server)`, which cards share with their live activation policy
(Nisei MK II). Capacity covering every projected run
(`_projectedRunnerRuns(server)`) is a hard lockout; smaller capacity adds one
repeated mandatory route cost per use. `_iceIsLethal()` treats damage as lethal
only when it exceeds the Runner's grip, and the mandatory estimate breaks only
enough damage subroutines to survive.

**Non-standard tools (L3).** `_hostedBreakerForIce()` uses the shared
classification for complete free coverage from hosted breakers; partial
contributions reduce the remaining paid breaks, and insufficient counters never
disable the host ICE. Runner identities that bypass a single Barrier subroutine
(for example Quetzal) are modelled. Declarative hooks (`AIReducesIceStrength`,
`AIHostedBreakContribution`, `AIMatchingBreakerInstalled`) are the primary
path; text-pattern fallbacks apply only to cards without a hook.

Tests: `tests/corp-server-security.test.js`.

## Protection allocation

**Purpose.** The security evaluator says *whether* a server is safe;
allocation decides *which* server gets the next install when several are
unsafe. Accurate evaluation of a server that never gets chosen is wasted: this
was the root cause of the original "HQ left with zero ICE" bug, where HQ was
correctly judged insecure but something else always ranked as more urgent.
Rotation fixes starvation within a turn; bounded protection debt fixes it
across turns. The action-feasible fallback (L3.5.2) came from the Baker
regression, where an unprotectable top-ranked server blocked protection of the
next one.

`_protectionScore(server, options)` combines installed protection,
deterministic security, structural bypass risk, hidden-threat estimates,
central pressure, deterrence, successful-run history and special server context
into one bounded urgency score.

`_rankedServersToProtect()` keeps the full ordered target list and computes one
security result per real server. Within a Corp turn, protection installs rotate
through insecure servers not yet protected that turn before adding another
layer to one already handled (`_protectionInstallsThisTurn`). At the start of
each Corp turn after the first ("Corp 1.2", `_prepareProtectionPrioritiesForCorpTurn()`
calling `_ageProtectionPriorities()`), skipped insecure servers gain a bounded,
flat protection-debt adjustment (`_serverProtectionDebt`); protected or secure
servers reset. The HVT
guarantee stays authoritative: if a generic remote or new-server slot would win
while an HVT is installed, protection is redirected to the HVT's server.

*Rejected design:* treating R&D as worth protecting because an agenda happens
to be near its top (proposed during the Baker/Archives fix). It would use R&D
order, which the Corp may not know (`principles.md` §1).

**Action-feasible fallback (L3.5.2, interim).** `_serverToProtect()` accepts an
optional eligibility predicate. ICE-install generation passes
`_shouldInstallIceLayer()` through it, so a higher-ranked server that cannot
accept another layer under the economy policy no longer suppresses the next
viable server. `_serverHasStakes()` lets a necessary extra layer bypass the
poor-economy reserve when Archives holds a visible agenda, is an active
backdoor, or is under current public or recent run pressure; R&D does not read
its hidden contents for this. Callers that genuinely need a server-only answer
keep the existing ranking and fallback. This is a bridge: I1–I2 replace it with joint
`(ICE, server)` candidates, keeping the server ranking for diagnostics.

## Type shifts, bypasses and redirects

**Purpose.** Mechanics that change which breaker matches (subtype shifts),
skip one ICE (targeted or outermost bypasses) or skip a whole server (run
redirects) can make a well-defended server open. They replace former card-title
fast paths with hook-based evaluation. A single-ICE server is structurally
weaker than a layered one against outermost bypasses, which is why single-ICE
agenda remotes take a penalty while such a bypass is live.

`_effectiveIceSubtypes(iceCard, server, iceIndex)` combines the Corp-owned run
calculator with active `modifySubTypes` and `AIModifyIceAI` hooks and a
hosted-card wording fallback, including outermost-encounter handling (Rielle
"Kit" Peddler), so breaker matching uses effective subtypes. `_iceIsBypassed()`
reads engine bypass flags.

Targeted paid bypasses use `AIBypassesIce`; reusable single-encounter and
outermost-only bypasses use `AIBypassesOneIce` and `AIBypassesOutermostIce`
(the evaluator reads `AIBypassesOutermostIce`, but no card declares it yet).
While one of those public bypasses is live, single-ICE agenda remotes take a
bounded protection penalty; multi-ICE servers keep their inner layer. Server
redirects use `AIRedirectsRun` plus a wording fallback (the former Sneakdoor
Beta title check is gone); the Corp asks only about Archives-to-HQ redirects
(`_archivesIsBackdoorToHQ()`). Cards updated: Femme Fatale and Sneakdoor Beta
(`systemupdate2021.js`), Fransofia Ward and Maintenance Access (`elevation.js`).
Egret, Chromatophores and Rielle "Kit" Peddler already exposed enough subtype
hooks and needed no change.

**Out-of-run redirects.** A redirect paid by a run-only credit source must be
detected during Corp planning. Baker's `AIRedirectsRun` evaluates its stealth
credit sources in the prospective Archives-run context and restores the real
`attackedServer` in `try/finally` (card-local today; item F2 migrates it to a
shared guarded helper).

## Public threat memory

**Purpose.** Model threats from cards the Runner may be holding (for example
run events that bypass a layer) without cheating. The Corp reasons like a
player: the Runner's faction suggests what they are likely to play, cards
already in the Heap are no longer a threat, and a large hand is more likely to
contain one than a near-empty hand. The estimate is a soft urgency signal only
and never changes deterministic security.

Cards that can defeat a single layer while hidden in the Grip declare an
`AIHiddenThreat` profile. `_estimateRunnerBypassRisk(server)` uses the Runner's
faction as a deckbuilding prior, discounts rather than excludes out-of-faction
threats, subtracts copies revealed in the Heap, and combines the remaining
expected copies with public Grip and Stack sizes. The result is a bounded
protection penalty for one-ICE servers only, exposed as `publicThreatRisk`; it
never changes deterministic security or run cost. Cards updated: Inside Job and
Forged Activation Orders (`systemupdate2021.js`). Spear Phishing is not
implemented in any set.

## Runner effective credit ceiling

**Purpose.** Prevent false confidence when the Runner's credit pool is low but
their real economy is rich: recurring and hosted credits, bad publicity credits
and clicks they can turn into credits all pay for breaking.

`_effectiveRunnerCreditPool(server)` returns `{baseCredits, temporaryCredits,
recurringCredits, badPublicityCredits, clickCredits, total}`:

- hosted and recurring credits count only when `canUseCredits("using", card)`
  permits a public installed breaker or bypass tool; route-sensitive hooks see a
  temporarily supplied `attackedServer`, which is then restored;
- `AIRunPoolCreditOffset(server, null)` adds public server-specific credits (the
  hidden run-event argument is always `null` for the Corp); a source exposing
  both interfaces counts once, at the larger value;
- click credits come from `_projectedRunnerClicks()`, reserving one click to
  start the run; during an active run there are no click credits and Bad
  Publicity is not counted twice.

`_evaluateServerSecurity()` uses this ceiling for affordability lockouts.

## Central pressure and breach-loss risk

**Purpose.** HQ and R&D need different treatment from remotes depending on the
game. Multi-access cards make each central run more dangerous, and some Runner
decks win through the centrals (multi-access, milling, burn) rather than
remotes, so the Corp must not over-invest in remotes while its centrals
collapse. The tactical interrupt exists because the most important defence
question is whether the *next* breach can lose the game.

Installed Runner cards expose `AICentralPressure(server)`: immediate extra
access, persistent non-access pressure (milling, burn) and bounded growth.
`_centralServerThreat()` turns these into a server-specific penalty of at most
eight points. `_classifyRunnerMacroThreat()` reports whether the visible board
is balanced, HQ-focused, R&D-focused or split, and flags non-interactive
pressure; its `focus` is diagnostic only (only tests call it today), so it is
not counted twice; I3 is planned to consume it. Hidden run
events are excluded (they belong to public threat memory). Cards updated:
Docklands Pass and Conduit (`systemgateway.js`), Devadatta Drone
(`elevation.js`). Legwork and The Maker's Eye are hidden events, so treating
them as board threats would break the information boundary.

**Tactical breach-loss interrupt (part of L7).**
`_centralBreachLossRisk()` computes the fair, order-agnostic probability that
the next breach gives the Runner enough agenda points to win. At 35% or more,
`_criticalBreachDefenseAction()` may interrupt a non-winning advancement plan,
preferring an affordable ICE that materially reduces the risk, then an
effective purge, then guarded emergency ICE acquisition. A game-winning score
of an installed agenda is exempt; a winning agenda still in HQ is not (bug
ticket
[winning-hq-agenda-preempted-by-critical-breach-interrupt.md](../bugs/winning-hq-agenda-preempted-by-critical-breach-interrupt.md)). `AICentralPressureAfterPurge(server)` lets scaling cards such
as Conduit describe their post-purge pressure. Nothing yet weights central
pressure by what a breach would expose; L7.1 adds that and owns the shared
breach-consequence signal (a planned breachConsequence accessor) that L3.5.1
and I2 consume.

**Rez consistency.** `_icePreventsGameWinningBreach()` compares security with an
approached ICE rezzed (after paying) and absent. If rezzing changes a possibly
game-winning breach into a prevented one, `_iceWorthRezzing()` rezzes it before
considering cross-server reservations, so an unrezzed hard lock is never counted
as security and then left unrezzed. ICE that only taxes and does not stop the
breach gets no such override. `_iceWorthRezzing()` reserves credits for
ICE elsewhere only when that server has higher stakes and a with/without
comparison shows the saved rez changes it from breachable to secure. Higher
server value alone is not enough, and same-server ICE ordering keeps its
protection-value tie-break. Breach-loss risks below the 35% threshold leave
ordinary advancement unchanged.

## Emergency protection and purge

**Purpose.** Two gaps found in play. With no ICE for HQ, the planner kept
gaining credits even though credits alone could not change the breach outcome,
and a full HQ suppressed drawing; emergency acquisition gives it a way to find
protection. A basic purge costs the Corp's whole turn, so it should happen only
when it changes an outcome (opens a score or secures a server), not whenever
virus counters exist.

**Emergency acquisition (L7.2).** `_emergencyProtectionRecovery()` acts only
when the top-ranked server is insecure with an adjusted score of `-3` or worse,
has no unrezzed ICE waiting for funds, HQ has no ICE, economy is sufficient and
at least two clicks remain. It prefers an affordable card declaring
`AIEmergencyDraw` (Spin Doctor declares `2`), then the basic draw. While HQ
holds several agendas and is breachable, emergency drawing for another server is
vetoed, but if HQ itself is the critical target drawing remains allowed,
because finding protection is the only recovery. Game-winning scores keep
priority. Ordinary scoring and advancement keep their normal priority unless
the tactical breach-loss evaluator finds at least a 35% next-breach game-loss
risk that no direct install or purge resolves; once invoked, emergency
acquisition outranks optional economy and credit gain. It never inspects Corp
R&D or hidden Runner cards. Future install planning (I7.1, I7.2) must keep these
guards.

**Ordinary purge (L7.3).** `_ordinaryPurgeOutcome()` purges only when a guarded
post-purge comparison opens an immediate agenda score or turns a server holding
an agenda or remote HVT from breachable to secure; a merely non-empty R&D or
Archives is not enough. The model clears virus
counters and temporarily removes cards declaring `AIDisabledByPurge`; if a
public card declares `AIPreventsPurgeTrash`, those cards conservatively stay.
The model matches production `InstalledCards()`/`ActiveCards()` semantics, so
purge-triggered trash (Clot, Physarum Entangler) is covered, not only cards
with counters. Evaluation runs inside `_withHypothetical()`, which restores
counter values, exact installed-array positions and `notInstalled` state, even
when evaluation throws.
*Rejected design:* a weighted server-value threshold, because its coefficients
were uncalibrated and hid the three-click opportunity cost.

## Baits, bluffs and deterrence

**Purpose.** Leave a server lightly defended to bait the Runner into a trap
(for example Urtica Cipher) without being obvious, and conversely protect an
agenda so it looks like a trap. The Corp AI plays against a human, not the
Runner AI, so success cannot be judged by deterministic tests of single
decisions: what matters is long-run unpredictability against a player trying to
learn the AI's patterns (see `principles.md` §5).

- **Baiting** uses a poker-style bluff frequency: a severe trap needs to be
  baited *less* often to stay credible, because guessing wrong costs the Runner
  more. The randomness is necessary; only its threshold is computed.
- **Bluffing** is harder and riskier: it means acting against the Corp's
  otherwise best install pattern purely to create a false signal, so it must
  rely on the same generic signals a human reads (server card count,
  remote-versus-central framing, protection posture), never on one card.
- **Tag deterrence** is a real threat, not a bluff, so it needs no randomness:
  a tagged Runner facing a live tag punishment is genuinely at more risk.

**Status:** Layer 8 is only partly done. Baiting (L8.1), the shared agenda/trap
profiles and tag deterrence (L8.3) are implemented. Bounded posture epochs
(L8.4) and match-local outcome feedback (L8.5) are required to complete it;
legibility signals (L8.2) remain open; telemetry (L8.6) is optional and parked.

**Baiting (L8.1).** Facedown access-punishing cards expose
`AIPunishesAccess(server)`. `_calculateBaitFrequency()` uses bounded
exposure-versus-punishment odds, so severe traps take a light-defence posture
less often. `_shouldBaitServer()` rolls once per installed trap and server
through `_random` and caches the result. No trap posture is allowed when
breaching that root could win the game; the same winning-breach guard applies
to agenda bluffs and tag deterrence. Cards declaring `AIPunishesAccess`
include Urtica Cipher (`systemgateway.js`), Snare! (`systemupdate2021.js`) and
Esca (`vantagepoint.js`).

**Agenda and trap profiles (L8.2 base).** `_remoteDeceptionProfile(card)` gives
each eligible hidden agenda or trap an independent profile: target ICE depth of
one to three, opening advancement of one or two counters, and immediate or
one-turn-delayed advancement. The profile feeds scoring-remote selection
(`_deceptionInstallDistance()`), how many layers are added, and early
advancement (`_deceptionAdvancementTarget()`). Profiles never create naked
agenda servers and are disabled when a breach could win.

**Tag deterrence (L8.3).** `_tagPunishmentDeterrence()` gives bounded
protection relief when the Runner is tagged and the Corp holds an affordable
card declaring `AITagPunishment` (for example Retribution in `systemgateway.js`
and Unleash in `vantagepoint.js`); it never changes deterministic security.

**Current gaps:** postures are cached for the card's lifetime (L8.4) and public
outcomes do not feed back into later postures (L8.5).

## Install planning today

**Purpose of the planned work.** The security work answers how vulnerable or
urgent each server is; the install items (I0–I9) answer the next question: what
to install, where, and whether installing beats another action. Their shared
design is in `specs/install-decisions-design.md`. This section describes the
code as it is today.

The security work answers *where another layer is needed*; install planning
does not yet compare concrete options by their outcome.

- **ICE.** `_iceInstallOptions(serverToInstallTo, cards, priorityOnly)` lists
  affordable ICE in input order, then unaffordable ICE when low-priority options
  are allowed, filtered by optional `AIWorthwhileIce(server, "install")` hooks.
  It does not compare each ICE's marginal effect on security. The older
  `_iceInstallScore()` (printed strength, rez cost, one title case, breaker
  coverage) is used only by `_bestIceToInstall()`, which has no callers, and
  does not consult `_evaluateServerSecurity()`.
- **Root destinations** are influenced indirectly through shared protection
  scores: `_emptyProtectedRemotes()`, `_isAScoringServer()`,
  `_scoringServers()`, `_scoringWindow()`, `_bestProtectedRemote()` and
  `_bestServerToUpgrade()` all compare `_protectionScore()` values.
- **Agendas and HVTs.** `_isHVT(card)` covers agendas, Ambush and Hostile cards,
  offered to scoring servers and ranked by advancement requirement versus
  scoring window and by `_deceptionInstallDistance()`. `_isAScoringServer()`
  first rejects any remote `_evaluateServerSecurity()` does not judge secure;
  the relative test against HQ (or, under agenda pressure, Archives) only
  narrows the secure remotes. What is still missing is the Runner's income over
  the exposure turns and a completion plan before install (I4).
- **Assets** choose a destination through `AIWorthInstalling(emptyProtectedRemotes)`
  (an index, a new remote, or rejection). Payback, lifetime and opportunity cost
  are not calculated; ordinary assets are steered away from the strongest empty
  remote by convention.
- **Upgrades** use `_bestServerToUpgrade()`, `_shouldUpgradeServerWithCard()`,
  `_upgradeInstallPreferences()` and hooks such as `AIIsScoringUpgrade`,
  `AIDefensiveValue(server)` and `AILimitPerServer(server)`, without
  before/after comparison.
- **Ranking.** `_rankedInstallOptions()` gets most of its priority from the
  order in which independent option groups are concatenated;
  `_bestInstallOption()` picks the first preference matching a legal engine
  option. There is no common scored candidate across ICE, roots and non-install
  actions.

## Not yet modelled: holding and trigger ordering

- Credit holds exist only for installed cards: `_sufficientEconomy()` sums
  `AIReserveCredits` through `_reserveCreditsForCard()`; `_iceWorthRezzing()`
  saves credits for the attacked server's root and central-card declarations
  and for a higher-value server's ICE. Nothing holds an HQ card, an identity
  ability or credits for a card in hand (R1.1–R1.3).
- `Phase_Approaching()` and `Phase_Movement()` choose LEO's paid ability
  whenever `trigger` is offered, without calling its `AIWouldTrigger()`, and
  the bioroid is picked by index (bug ticket
  [leo-construction-ability-chosen-without-consulting-ai-hook.md](../bugs/leo-construction-ability-chosen-without-consulting-ai-hook.md); R1.2).
- Each player orders their own simultaneous triggers (`ValidateTriggerList()`
  is in `utility.js`, not `phase.js`). The Corp AI has no Run 4.6.2 handler, so
  `_choiceInner()` falls back to index 0, which is `ActiveCards()` install
  order (R2).

## Foundations

**Purpose.** Infrastructure that no single policy area owns. Injectable
randomness makes decisions reproducible in tests and simulations; guarded
hypotheticals let planners ask "what if" without corrupting the live game; a
per-decision cache avoids re-evaluating the same server many times in one
decision; a seeded batch harness provides the evidence every calibration gate
needs.

- **Randomness (F1, done).** `CorpAI._random` defaults to `Math.random`;
  tests and harnesses inject a seeded function. Persistent postures cache their
  roll with the card or server; transient tie-breaks are cached for one
  `Choice` (`_decisionRandomState`); `_shuffleCopy()` shuffles a copy through the
  injected source.
- **Guarded hypotheticals (F2, partial).** `_withHypothetical(apply, evaluate,
  restore)` restores state in `finally`; only `_ordinaryPurgeOutcome()` uses it
  today. The other planning probes still mutate and restore manually (item F2).
- **Per-decision cache (F3, not built).** Local duplication is removed (one
  security result per server per ranked pass; one protection score per
  candidate in `_bestProtectedRemote()`), but independent planners can still
  request overlapping evaluations.
- **Batch harness (F4, not built).** `GameEnded(winner)` is an empty stub and
  nothing calls it; `DecisionSnapshots.totalMs` measures the recorder's own
  cost, not decision latency. The pieces for seeded AI-vs-AI runs exist but are
  not joined up. Mulligan weights are uncalibrated until F5.

## Known limits

Security is a per-ICE heuristic, not a complete run simulation. It does not yet
model cumulative damage across encounters, optional effects that disable later
breakers, or shared strength-reducer counters across several ICE (L9), or exact
allocation of restricted credit sources across payments (L6.1).
`AIImplementBreaker` pricing probes support the standard `ImplementIcebreaker`
activation path; breakers using another mechanism are priced as unable to
break, which makes servers look secure when they are not. That is L9's first
priority (bug ticket
[sang-kancil-and-principia-priced-as-unbreakable.md](../bugs/sang-kancil-and-principia-priced-as-unbreakable.md)).
The security tests load the real AI classes and card definitions with
deterministic engine helpers; they do not replace playing the game in the
browser.

## Helper reference

Card-facing hook contracts are in `documentation/ai.md`. Key Corp AI methods:

| Method | Role |
|---|---|
| `_evaluateServerSecurity(server)` | Deterministic security, costs, credit breakdown, risks and reasons |
| `_protectionScore(server, options)` | Bounded urgency score combining security and soft signals |
| `_rankedServersToProtect()` | Ordered protection targets with rotation and debt |
| `_serverToProtect()` | Single target, with an optional eligibility predicate |
| `_effectiveRunnerCreditPool(server)` | Public, route-specific Runner credit ceiling |
| `_effectiveIceStrength(iceCard)` | ICE strength after active reducers and virus counters |
| `_matchingBreakerForIce(ice)` | Matching breaker via hooks, hosted cards or subtype fallback |
| `_centralServerThreat(server)` | Bounded central-pressure penalty |
| `_centralBreachLossRisk(server)` | Probability the next breach wins the game for the Runner |
| `_classifyRunnerMacroThreat()` | Visible central focus and non-interactive pressure |
| `_calculateBaitFrequency(server)` | Severity-weighted bait probability |
| `_remoteDeceptionProfile(card)` | Shared agenda/trap depth and advancement profile |
| `_tagPunishmentDeterrence(server)` | Bounded relief from a live tag punishment |
| `_withHypothetical(apply, evaluate, restore)` | Exception-safe hypothetical evaluation |
