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
| [Central pressure and breach-loss risk](#central-pressure-and-breach-loss-risk) | HQ/R&D urgency, game-losing breach interrupts, rez timing | L7, L7.1 (tactical part) |
| [Emergency protection and purge](#emergency-protection-and-purge) | Recovery when HQ has no ICE; when to purge | L7.2, L7.3 |
| [Baits, bluffs and deterrence](#baits-bluffs-and-deterrence) | Trap postures, agenda bluff profiles, tag deterrence | L8.1–L8.3 |
| [Install planning today](#install-planning-today) | How install options are generated and chosen | I-items |
| [Not yet modelled: holding and trigger ordering](#not-yet-modelled-holding-and-trigger-ordering) | Gaps the R-items address | R1, R2 |
| [Foundations](#foundations) | Randomness, hypotheticals, caching, simulation | F1–F4 |
| [Known limits](#known-limits) | What the security model does not cover | — |
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

`_protectionScore(server, options)` combines installed protection,
deterministic security, structural bypass risk, hidden-threat estimates,
central pressure, deterrence, successful-run history and special server context
into one bounded urgency score.

`_rankedServersToProtect()` keeps the full ordered target list and computes one
security result per real server. Within a Corp turn, protection installs rotate
through insecure servers not yet protected that turn before adding another
layer to one already handled (`_protectionInstallsThisTurn`). At the end of the
Runner's turn, skipped insecure servers gain a bounded, flat protection-debt
adjustment (`_serverProtectionDebt`); protected or secure servers reset. The HVT
guarantee stays authoritative: if a generic remote or new-server slot would win
while an HVT is installed, protection is redirected to the HVT's server.

**Action-feasible fallback (L3.5.2, interim).** `_serverToProtect()` accepts an
optional eligibility predicate. ICE-install generation passes
`_shouldInstallIceLayer()` through it, so a higher-ranked server that cannot
accept another layer under the economy policy no longer suppresses the next
viable server. `_serverHasStakes()` lets a necessary extra layer bypass the
poor-economy reserve when Archives holds a visible agenda, is an active
backdoor, or is under current public or recent run pressure; R&D does not read
its hidden contents for this. This is a bridge: I1–I2 replace it with joint
`(ICE, server)` candidates, keeping the server ranking for diagnostics.

## Type shifts, bypasses and redirects

`_effectiveIceSubtypes(iceCard, server, iceIndex)` combines the Corp-owned run
calculator with active `modifySubTypes` and `AIModifyIceAI` hooks and a
hosted-card wording fallback, including outermost-encounter handling (Rielle
"Kit" Peddler), so breaker matching uses effective subtypes. `_iceIsBypassed()`
reads engine bypass flags.

Targeted paid bypasses use `AIBypassesIce`; reusable single-encounter and
outermost-only bypasses use `AIBypassesOneIce` and `AIBypassesOutermostIce`.
While one of those public bypasses is live, single-ICE agenda remotes take a
bounded protection penalty; multi-ICE servers keep their inner layer. Server
redirects use `AIRedirectsRun` plus a wording fallback (the former Sneakdoor
Beta title check is gone). Cards updated: Femme Fatale and Sneakdoor Beta
(`systemupdate2021.js`), Fransofia Ward and Maintenance Access (`elevation.js`).

**Out-of-run redirects.** A redirect paid by a run-only credit source must be
detected during Corp planning. Baker's `AIRedirectsRun` evaluates its stealth
credit sources in the prospective Archives-run context and restores the real
`attackedServer` in `try/finally` (card-local today; item F2 migrates it to a
shared guarded helper).

## Public threat memory

Cards that can defeat a single layer while hidden in the Grip declare an
`AIHiddenThreat` profile. `_estimateRunnerBypassRisk(server)` uses the Runner's
faction as a deckbuilding prior, discounts rather than excludes out-of-faction
threats, subtracts copies revealed in the Heap, and combines the remaining
expected copies with public Grip and Stack sizes. The result is a bounded
protection penalty for one-ICE servers only, exposed as `publicThreatRisk`; it
never changes deterministic security or run cost. Cards updated: Inside Job and
Forged Activation Orders (`systemupdate2021.js`).

## Runner effective credit ceiling

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

Installed Runner cards expose `AICentralPressure(server)`: immediate extra
access, persistent non-access pressure (milling, burn) and bounded growth.
`_centralServerThreat()` turns these into a server-specific penalty of at most
eight points. `_classifyRunnerMacroThreat()` reports whether the visible board
is balanced, HQ-focused, R&D-focused or split, and flags non-interactive
pressure; its `focus` is diagnostic only, so it is not counted twice. Hidden run
events are excluded (they belong to public threat memory). Cards updated:
Docklands Pass and Conduit (`systemgateway.js`), Devadatta Drone
(`elevation.js`).

**Tactical breach-loss interrupt (the implemented part of L7.1).**
`_centralBreachLossRisk()` computes the fair, order-agnostic probability that
the next breach gives the Runner enough agenda points to win. At 35% or more,
`_criticalBreachDefenseAction()` may interrupt a non-winning advancement plan,
preferring an affordable ICE that materially reduces the risk, then an
effective purge, then guarded emergency ICE acquisition. A game-winning Corp
score is exempt. `AICentralPressureAfterPurge(server)` lets scaling cards such
as Conduit describe their post-purge pressure.

**Rez consistency.** `_icePreventsGameWinningBreach()` compares security with an
approached ICE rezzed (after paying) and absent. If rezzing changes a possibly
game-winning breach into a prevented one, `_iceWorthRezzing()` rezzes it before
considering cross-server reservations, so an unrezzed hard lock is never counted
as security and then left unrezzed. `_iceWorthRezzing()` reserves credits for
ICE elsewhere only when that server has higher stakes and a with/without
comparison shows the saved rez changes it from breachable to secure.

## Emergency protection and purge

**Emergency acquisition (L7.2).** `_emergencyProtectionRecovery()` acts only
when the top-ranked server is insecure with an adjusted score of `-3` or worse,
has no unrezzed ICE waiting for funds, HQ has no ICE, economy is sufficient and
at least two clicks remain. It prefers an affordable card declaring
`AIEmergencyDraw` (Spin Doctor declares `2`), then the basic draw. While HQ
holds several agendas and is breachable, emergency drawing for another server is
vetoed; game-winning scores keep priority.

**Ordinary purge (L7.3).** `_ordinaryPurgeOutcome()` purges only when a guarded
post-purge comparison opens an immediate agenda score or turns a server holding
an agenda or remote HVT from breachable to secure. The model clears virus
counters and temporarily removes cards declaring `AIDisabledByPurge`; if a
public card declares `AIPreventsPurgeTrash`, those cards conservatively stay.
Evaluation runs inside `_withHypothetical()`.
*Rejected design:* a weighted server-value threshold, because its coefficients
were uncalibrated and hid the three-click opportunity cost.

## Baits, bluffs and deterrence

**Baiting (L8.1).** Facedown access-punishing cards expose
`AIPunishesAccess(server)`. `_calculateBaitFrequency()` uses bounded
exposure-versus-punishment odds, so severe traps take a light-defence posture
less often. `_shouldBaitServer()` rolls once per installed trap and server
through `_random` and caches the result. No trap posture is allowed when
breaching that root could win the game. Cards updated: Urtica Cipher
(`systemgateway.js`), Snare! (`systemupdate2021.js`).

**Agenda and trap profiles (L8.2 base).** `_remoteDeceptionProfile(card)` gives
each eligible hidden agenda or trap an independent profile: target ICE depth of
one to three, opening advancement of one or two counters, and immediate or
one-turn-delayed advancement. The profile feeds scoring-remote selection
(`_deceptionInstallDistance()`), how many layers are added, and early
advancement (`_deceptionAdvancementTarget()`). Profiles never create naked
agenda servers and are disabled when a breach could win.

**Tag deterrence (L8.3).** `_tagPunishmentDeterrence()` gives bounded
protection relief when the Runner is tagged and the Corp holds an affordable
card declaring `AITagPunishment`; it never changes deterministic security.

**Current gaps:** postures are cached for the card's lifetime (L8.4) and public
outcomes do not feed back into later postures (L8.5).

## Install planning today

The security work answers *where another layer is needed*; install planning
does not yet compare concrete options by their outcome.

- **ICE.** `_iceInstallOptions(serverToInstallTo, cards, priorityOnly)` lists
  affordable ICE in input order, then unaffordable ICE when low-priority options
  are allowed, filtered by optional `AIWorthwhileIce(server, "install")` hooks.
  It does not compare each ICE's marginal effect on security. The older
  `_iceInstallScore()` (printed strength, rez cost, one title case, breaker
  coverage) is reachable through `_bestIceToInstall()` but not used by the
  current install path, and does not consult `_evaluateServerSecurity()`.
- **Root destinations** are influenced indirectly through shared protection
  scores: `_emptyProtectedRemotes()`, `_isAScoringServer()`,
  `_scoringServers()`, `_scoringWindow()`, `_bestProtectedRemote()` and
  `_bestServerToUpgrade()` all compare `_protectionScore()` values.
- **Agendas and HVTs.** `_isHVT(card)` covers agendas, Ambush and Hostile cards,
  offered to scoring servers and ranked by advancement requirement versus
  scoring window and by `_deceptionInstallDistance()`. `_isAScoringServer()`
  compares a remote with HQ, so when HQ is also weak a breachable remote can
  qualify.
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

- Every evaluator (`_sufficientEconomy()`, `_protectionScore()`,
  `_rankedInstallOptions()` and each card's `AIWouldTrigger()`) asks whether an
  action is good now. None represents "worth more held, for a future condition
  visible in public state", which decks such as Nebula Talent Management, LEO
  Construction and Zwicky Supermodernism rely on.
- The engine already lets the active player order their simultaneous triggers
  (`ValidateTriggerList` in `phase.js`), but each card's `AIWouldTrigger()`
  reasons only about itself, so pairs such as Manegarm Skunkworks and Anoetic
  Void are not ordered for combined value.

## Foundations

- **Randomness (F1, done).** `CorpAI._random` defaults to `Math.random`;
  tests and harnesses inject a seeded function. Persistent postures cache their
  roll with the card or server; transient tie-breaks are cached for one
  `Choice` (`_decisionRandomState`); `_shuffleCopy()` shuffles a copy through the
  injected source.
- **Guarded hypotheticals (F2, partial).** `_withHypothetical(apply, evaluate,
  restore)` restores state in `finally`; ordinary purge evaluation uses it. Some
  planning probes still mutate and restore manually (item F2).
- **Per-decision cache (F3, not built).** Local duplication is removed (one
  security result per server per ranked pass; one protection score per
  candidate in `_bestProtectedRemote()`), but independent planners can still
  request overlapping evaluations.
- **Batch harness (F4, not built).** `GameEnded(winner)` is an empty stub; the
  pieces for seeded AI-vs-AI runs exist but are not joined up.

## Known limits

Security is a per-ICE heuristic, not a complete run simulation. It does not yet
model cumulative damage across encounters, optional effects that disable later
breakers, shared strength-reducer counters across several ICE, or exact
allocation of restricted credit sources across payments (L6.1).
`AIImplementBreaker` pricing probes support the standard `ImplementIcebreaker`
activation path; other breaker mechanisms need their own capability hooks.

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
