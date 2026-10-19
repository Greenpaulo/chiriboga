# Corp AI roadmap

One entry per item. Full specs live in the linked ticket (`ready` and later) or
spec file (`proposed`); how finished work behaves lives in
[architecture.md](architecture.md); rules live in [principles.md](principles.md).
Statuses, IDs and commands are defined in [../ai-planning.md](../ai-planning.md).

Before picking up L8.2, L8.5, I2, I3, I9 or their F11/F12 measurement support, read
the [deception gate reconciliation](deception-gates.md).
That section separates recorded source gates from proposed revisions;
reconcile any proposal in the source ticket/spec before implementation and
before viewing candidate gate results. The roadmap table below owns the current sequence.

- `node scripts/roadmap.js next` lists items whose dependencies are all `done`.
- `node scripts/roadmap.js list` prints every item with its status.
- `node scripts/roadmap.js gates` lists items with an acceptance gate by what is
  left to do; see [../judging-ai-changes.md](../judging-ai-changes.md).
- `node scripts/roadmap.js blockers` lists tickets held by unfinished
  dependencies; add `--fix` to refresh their generated headers.
- `tests/ai-roadmaps.test.js` fails if a status, link, dependency or generated
  blocker header disagrees with the tickets.

## Current implementation order

Updated 2026-10-19. This is the preferred sequence for the deception/install
track; item dependencies below remain the formal blockers. Completed merge work
is recorded in the done tables and the historical merge plan.

| Order | Item | Status | Next step / adoption evidence |
|---|---|---|---|
| — | [L8.5](../backlog/done/feature-layer-8-5-match-local-public-outcome-feedback.md) | done (merged) | Revised full gate passed; merge complete |
| — | [F11](../backlog/done/F11-paired-batch-metric-guards.md) | done | Paired pooled guards and improvement checks delivered |
| — | [F12](../backlog/done/F12-realized-defense-measurement.md) | done (merged) | Shared collector and identity evidence delivered; L8.2 records fresh usable controls after its passive-label correction |
| — | [L8.2](../backlog/done/feature-layer-8-2-remote-deception-profiles.md) | not adopted (merged) | Main merged into the I2 branch; observer/collector repairs and failure evidence retained, policy removed |
| — | [I2](../backlog/done/I2-ice-selection-by-marginal-security.md) | done (merged) | Marginal ICE ranking adopted; `iceMarginalSecurity` on; remaining R&D concern belongs to I2.2 |
| 1 | [L8.9](../backlog/code-review/L8.9-observable-defense-parity.md) | in code review | Review passive install/lifecycle tooling, findings and completed control calibration; I3/I5 reuse instructions and I3.1 shell-plan coverage recorded; no installation restriction |
| 2 | [I2.2](../backlog/I2.2-rnd-protection-lateness-investigation.md) | ready | Investigate late R&D protection before I3 design freeze; record the trade-off or a separately gated repair |
| 3 | [I3](specs/I3-remote-role-and-root-suitability.md), then remaining install track | proposed | Reuse L8.9's measurement tools and findings; re-ground the spec and resolve [I2.2](../backlog/I2.2-rnd-protection-lateness-investigation.md) before freezing the design; fresh control and separate policy gates |

F11, F12 and I2 are done; I2 is merged. L8.2 was not adopted (full gate failed;
policy removed), while its observer/collector repairs remain. L8.9 is in code
review as a measurement-only delivery. Reviewing it before I3 is a sequencing
preference rather than an additional formal dependency.

[I2.2](../backlog/I2.2-rnd-protection-lateness-investigation.md) is ready and owns
the remaining R&D investigation before I3 design freeze; it is follow-up work,
not an outstanding I2 acceptance criterion. I3 and I5 should reuse L8.9's tooling
and findings, with fresh matching controls for their own policies.

The preliminary [L8.9 tell measurement](measurements/L8.9-aac6ea9-residual-tell.md)
and later controls were collected on I2's recorded review revision. Preserve
that provenance and refresh affected controls where the merged prerequisite
changes measured behavior. Do not adopt a later policy using mismatched controls.
[L9.0.1](../backlog/done/L9.0.1-adopt-honest-lockout.md) failed its global-adoption gate and was not adopted.
[L9.0.2](specs/L9.0.2-consumer-specific-honest-security.md) proposes separate consumer gates; refresh affected controls after any adoption. Complete L8.7's
card audit and L8.10 mechanics/diagnostics before I5 (its formal dependency).
L8.8 remains separately gated after I2; it is not an I2 prerequisite.

## Server security (L)

How vulnerable, valuable or urgent is each server?

**Layer 7**: the tactical breach-loss interrupt is done, and L7.1 is complete
with its calibrated policy not adopted after a failed gate;
the shared breach-consequence signal and supporting fixes remain.
**Layer 8** is partly done (baiting, shared profiles and tag deterrence are
done, including L8.4 bounded epochs and L8.5 public outcome feedback;
L8.2's policy was not adopted, while its observer/collector work remains;
L8.6 is optional). L9 covers run-simulation effects the per-ICE heuristic cannot
price yet.

### L3.5.1 Value-weighted protection debt
- **Status:** ready
- **Depends on:** F4, L7.1
- **Ticket:** [feature-layer-3-5-1-value-weighted-protection-debt.md](../backlog/feature-layer-3-5-1-value-weighted-protection-debt.md)
- **Goal:** Repeatedly skipped high-consequence servers gain urgency faster than empty ones, without new starvation.

### L3.5.2 Action-feasible protection target fallback
- **Status:** in-progress
- **Depends on:** none
- **Ticket:** [corp-not-protecting-archives-with-baker-backdoor.md](../bugs/remediation/corp-not-protecting-archives-with-baker-backdoor.md)
- **Goal:** An ineligible top-ranked server no longer blocks protection of the next viable one. The original fallback is implemented, but a later Baker play-test still fails when Touchstone is empty during Corp planning; remediation is required before review. Interim until I1–I2.

### L4.1 Unified bypass capability allocation
- **Status:** ready
- **Depends on:** F2
- **Ticket:** [feature-layer-4-1-unified-bypass-capability-allocation.md](../backlog/feature-layer-4-1-unified-bypass-capability-allocation.md)
- **Goal:** Allocate all public bypass tools across the whole run instead of per mechanic class.

### L5.1 Observed-deck threat priors
- **Status:** ready
- **Depends on:** F4
- **Ticket:** [feature-layer-5-1-bayesian-threat-priors.md](../backlog/feature-layer-5-1-bayesian-threat-priors.md)
- **Goal:** Replace fixed faction weights with priors updated from public deck evidence.

### L6.1 Payment-constraint allocation
- **Status:** ready
- **Depends on:** L4.1
- **Ticket:** [feature-layer-6-1-payment-constraint-allocation.md](../backlog/feature-layer-6-1-payment-constraint-allocation.md)
- **Goal:** Allocate restricted credit sources (stealth, breaker-only, central-only) against actual payments instead of one scalar ceiling.

### L7.1.1 Horizon-aware central consequence
- **Status:** parked
- **Depends on:** F4, L7.1
- **Spec:** [L7.1.1-horizon-aware-central-consequence.md](specs/L7.1.1-horizon-aware-central-consequence.md)
- **Goal:** Find out why L7.1's consequence-weighted central penalty failed its gate (more central steals), then test a horizon-aware exposure behind a default-off option.
- **Parked because:** its first step is done and refuted the premise. L7.1 failed because HQ's protection score is also the bar for remote scoring, not because of the horizon (see the spec's Failure analysis). I2 carries the lesson; revive only as a new item about remote-scoring eligibility, with fresh evidence.

### L8.6 Outcome-calibrated bluff telemetry
- **Status:** parked
- **Depends on:** L8.4, L8.5
- **Ticket:** [feature-layer-8-6-outcome-calibrated-bluff-telemetry.md](../backlog/feature-layer-8-6-outcome-calibrated-bluff-telemetry.md)
- **Goal:** Opt-in telemetry to tune bluff frequencies against humans. Optional.
- **Parked because:** it needs a meaningful sample of human games.

### L8.7 Layer 8 card hook audit
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-8-card-set-audit-and-set-adoption.md](../backlog/feature-layer-8-card-set-audit-and-set-adoption.md)
- **Goal:** Every access- or tag-punishing card in scope declares `AIPunishesAccess` or `AITagPunishment`.

### L8.8 Marginal deception value
- **Status:** proposed
- **Depends on:** I2, F2, F4, F11, L8.4, L8.7
- **Spec:** [L8.8-marginal-deception-value.md](specs/L8.8-marginal-deception-value.md)
- **Goal:** Separately gate a shared marginal concealment value in adopted I2 ICE ranking, keeping private trap payoff distinct and agenda/trap substitution intact. Later consumers adopt through their own gates; this is not an I2 prerequisite.

### L8.9 Observable-defense measurement and attribution
- **Status:** in-progress
- **Depends on:** I2, F4, F11, F12, L8.4
- **Ticket:** [L8.9-observable-defense-parity.md](../backlog/code-review/L8.9-observable-defense-parity.md)
- **Goal:** Deliver passive install/lifecycle attribution, saved-report tools and baseline-specific calibration; installation/hold policy belongs to the I tickets. The proposed bare-trap restriction was withdrawn without implementation.

### L8.10 Trap mechanics and play-value diagnostics
- **Status:** proposed
- **Depends on:** L8.7, I1, F2, F4
- **Spec:** [L8.10-trap-play-value.md](specs/L8.10-trap-play-value.md)
- **Goal:** Declare trap mechanics and measure play/access opportunities without changing decisions. Supplies I5's evidence; I5 owns any later payoff conversion and adoption. Independent of L8.8's concealment research.

### L9.0.2 Consumer-specific honest security adoption
- **Status:** proposed
- **Depends on:** L9.0, L9.1, F4
- **Spec:** [L9.0.2-consumer-specific-honest-security.md](specs/L9.0.2-consumer-specific-honest-security.md)
- **Goal:** Independently gate local honest-verdict consumers against one fresh control; follow the rejected L9.0.1 experiment without inferring combined effects.

### L10 Sampled breach capability research
- **Status:** parked
- **Depends on:** L9.0, L9.1, L5.1, F2, F4
- **Spec:** [L10-sampled-breach-probability.md](specs/L10-sampled-breach-probability.md)
- **Goal:** Investigate hidden-state breach capability before considering any risk consumer.
- **Parked because:** the hidden-state/route model is undefined and the original draft confused feasibility with actual next-turn breaches. Requires a rewritten model, isolated sampling RNG and suitable validation; not an I4 prerequisite.

### L9 Run-simulation fidelity
- **Status:** proposed
- **Depends on:** none
- **Spec:** [L9-run-simulation-fidelity.md](specs/L9-run-simulation-fidelity.md)
- **Goal:** Model what the per-ICE heuristic misses: cumulative damage, optional effects that remove later breakers, and shared strength-reducer counters.

### Done

| ID | Item | Delivered by | Architecture |
|---|---|---|---|
| L1 | Tactical ICE and breaker math | Legacy roadmap work | [Server security evaluation](architecture.md#server-security-evaluation) |
| L1.1 | Shared unrezzed-ICE rez budget | [finding 02](../backlog/done/corp_ai_finding_02_unrezzed_ice_budget.md) | [Server security evaluation](architecture.md#server-security-evaluation) |
| L2 | Global and root security | Legacy roadmap work | [Server security evaluation](architecture.md#server-security-evaluation) |
| L2.1 | Finite global ETR capacity | [finding 01](../backlog/done/corp_ai_finding_01_global_etr_lockout.md) | [Server security evaluation](architecture.md#server-security-evaluation) |
| L3 | Non-standard tools and efficiency | Legacy roadmap work | [Server security evaluation](architecture.md#server-security-evaluation) |
| L3.5 | Multi-server protection allocation | Legacy roadmap work | [Protection allocation](architecture.md#protection-allocation) |
| L4 | Type shifts, bypasses and redirects | Legacy roadmap work | [Type shifts, bypasses and redirects](architecture.md#type-shifts-bypasses-and-redirects) |
| L5 | Public threat memory | Legacy roadmap work | [Public threat memory](architecture.md#public-threat-memory) |
| L6 | Runner effective credit ceiling | Legacy roadmap work | [Runner effective credit ceiling](architecture.md#runner-effective-credit-ceiling) |
| L7 | Central threat, breach-loss interrupt and rez consistency | Legacy roadmap work | [Central pressure and breach-loss risk](architecture.md#central-pressure-and-breach-loss-risk) |
| L7.2 | Emergency protection acquisition | Legacy roadmap work | [Emergency protection and purge](architecture.md#emergency-protection-and-purge) |
| L7.3 | Outcome-based ordinary purge | [finding 03](../backlog/done/corp_ai_finding_03_purge_random_roll.md) | [Emergency protection and purge](architecture.md#emergency-protection-and-purge) |
| L8.1 | Baiting with access-punishing traps | Legacy roadmap work | [Baits, bluffs and deterrence](architecture.md#baits-bluffs-and-deterrence) |
| L8.3 | Tag-punishment deterrence | Legacy roadmap work | [Baits, bluffs and deterrence](architecture.md#baits-bluffs-and-deterrence) |
| L7.1 | Consequence-calibrated central pressure | [feature-layer-7-1-consequence-calibration](../backlog/done/feature-layer-7-1-consequence-calibration.md) | [central pressure and breach-loss risk](architecture.md#central-pressure-and-breach-loss-risk) |
| L8.4 | Bounded posture epochs | [feature-layer-8-4-bounded-posture-epochs](../backlog/done/feature-layer-8-4-bounded-posture-epochs.md) | [architecture: baits, bluffs and deterrence](architecture.md#baits-bluffs-and-deterrence) |
| L9.0 | Lockout honesty | [L9.0-lockout-honesty](../backlog/done/L9.0-lockout-honesty.md) | [server security evaluation](architecture.md#server-security-evaluation) |
| L9.1 | Unpriceable breakers | [L9.1-unpriceable-breakers](../backlog/done/L9.1-unpriceable-breakers.md) | [Corp architecture](architecture.md#server-security-evaluation) |
| L8.5 | Match-local public outcome feedback | [feature-layer-8-5-match-local-public-outcome-feedback](../backlog/done/feature-layer-8-5-match-local-public-outcome-feedback.md) | [architecture: baits, bluffs and deterrence](architecture.md#baits-bluffs-and-deterrence) |
| L9.0.1 | Adopt honest lockout | [L9.0.1-adopt-honest-lockout](../backlog/done/L9.0.1-adopt-honest-lockout.md) | [server security evaluation](architecture.md#server-security-evaluation) |
| L8.2 | Deception legibility signals | [feature-layer-8-2-remote-deception-profiles](../backlog/done/feature-layer-8-2-remote-deception-profiles.md) | [architecture: baits, bluffs and deterrence](architecture.md#baits-bluffs-and-deterrence) |

## Foundations (F)

Shared infrastructure used by every area.

### F5 Mulligan weight calibration
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [F5-mulligan-weight-calibration.md](specs/F5-mulligan-weight-calibration.md)
- **Goal:** Calibrate the opening-hand score weights and mulligan margin with seeded games, behind a default-off option.

### F7 Indexed card-state and trigger discovery
- **Status:** proposed
- **Depends on:** F2, F4
- **Spec:** [F7-indexed-card-state-and-trigger-discovery.md](specs/F7-indexed-card-state-and-trigger-discovery.md)
- **Goal:** Replace repeated whole-board installed, active and trigger-provider scans with verified engine-owned indexes while preserving exact query results, ordering and seeded behaviour.

### F8 Balanced deck-pool screening
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [F8-balanced-deck-pool-screening.md](specs/F8-balanced-deck-pool-screening.md)
- **Goal:** Choose the F4 deck pool by screening candidate pairs for Corp win rates near even, with a stated selection rule and re-screening policy.

### F9 AI work budget and fair timing
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [F9-ai-work-budget-and-fair-timing.md](specs/F9-ai-work-budget-and-fair-timing.md)
- **Goal:** Guard every gate with a deterministic count of the work each AI decision does, track it across baselines to catch slowdown creep, and add `gate --fresh` for fair wall-clock comparisons.

### F13 Seeded stall diagnostics and failed-batch reporting
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [F13-seeded-stall-diagnostics.md](specs/F13-seeded-stall-diagnostics.md)
- **Goal:** Diagnose the observer-independent BTL/Kit seed-257 null-command stall and keep failed-only batch reports printable. Found during F12 control calibration; no seed-specific policy workaround.

### Done

| ID | Item | Delivered by | Architecture |
|---|---|---|---|
| F1 | Injectable, seedable randomness | [finding 09](../backlog/done/corp_ai_finding_09_seeded_randomness.md) | [Foundations](architecture.md#foundations) |
| F6 | Headless AI performance | [F6-headless-ai-performance](../backlog/done/F6-headless-ai-performance.md) | [Server security evaluation](architecture.md#server-security-evaluation) |
| F2 | Guarded hypothetical evaluation: remaining migrations | [corp_ai_finding_10_guarded_hypothetical](../backlog/done/corp_ai_finding_10_guarded_hypothetical.md) | [architecture: foundations](architecture.md#foundations) |
| F4 | Seeded AI-vs-AI batch harness | [corp_ai_finding_12_seeded_batch_harness](../backlog/done/corp_ai_finding_12_seeded_batch_harness.md) | [architecture.md](architecture.md#foundations) |
| F10 | Real-board start library for gates | [F10-real-board-start-library](../backlog/done/F10-real-board-start-library.md) | [architecture: foundations](architecture.md#foundations) |
| F3 | Per-decision evaluation cache | [corp_ai_finding_11_evaluate_once_per_decision](../backlog/done/corp_ai_finding_11_evaluate_once_per_decision.md) | [architecture: foundations](architecture.md#foundations) |
| F11 | Paired batch-metric guards | [F11-paired-batch-metric-guards](../backlog/done/F11-paired-batch-metric-guards.md) | [architecture: Foundations](architecture.md#foundations) |
| F12 | Realized defense measurement | [F12-realized-defense-measurement](../backlog/done/F12-realized-defense-measurement.md) | [architecture: Foundations](architecture.md#foundations) |

## Install decisions (I)

What should the Corp install, where, and is that better than another action?
Shared design: [specs/install-decisions-design.md](specs/install-decisions-design.md).
The [regression ownership table](specs/install-decisions-design.md#corrected-regression-baseline-and-ownership)
maps the five default-off recovery gates to these layers and L3.5.1/L7.1,
including the remaining empty-Archives reward-valuation gap. Future I-layer
baselines must capture the corrected policy rather than the old unconditional
behaviors.
I0 → I1 → I2 → I3 run in order: I2 (ICE selection) is the first intentional
policy change and I3 decides what each remote is for. I4 (agendas) and I5
(assets, after L8.10 mechanics/diagnostics) then run in parallel; I6 (upgrades)
follows I3 and I4. I7.1 compares ICE installs with credits and draw as soon as I2 is done; I7.2 compares root
installs, operations and advancing once I4–I6 are done. I8 needs both I7s, and
I9 comes last.

### I2.1 Empty-Archives reward valuation
- **Status:** proposed
- **Depends on:** I2, F4
- **Spec:** [I2.1-empty-archives-reward-valuation.md](specs/I2.1-empty-archives-reward-valuation.md)
- **Goal:** Value public non-agenda rewards from successful empty-Archives runs as a bounded I2 score component, so Archives is protected only when those rewards outweigh the ICE.

### I2.2 R&D protection lateness investigation
- **Status:** ready
- **Depends on:** I2, F4
- **Ticket:** [I2.2-rnd-protection-lateness-investigation.md](../backlog/I2.2-rnd-protection-lateness-investigation.md)
- **Goal:** Attribute I2's late R&D protection and higher R&D theft before I3 design freeze; record an evidence-backed trade-off decision or raise a concrete separately gated repair.

### I3 Remote role and root suitability
- **Status:** proposed
- **Depends on:** I2, F4, L8.4
- **Spec:** [I3-remote-role-and-root-suitability.md](specs/I3-remote-role-and-root-suitability.md)
- **Goal:** Keep a persistent scoring remote, chosen by projected breach hazard, and charge other installs the scoring value they displace. Reuse L8.9's placement/allocation/lifetime tools and test legitimate bare asset-spam remotes.

### I3.1 Deck game-plan profile
- **Status:** proposed
- **Depends on:** I3, F4
- **Spec:** [I3.1-deck-game-plan-profile.md](specs/I3.1-deck-game-plan-profile.md)
- **Goal:** Record explainable starting-deck composition and mechanic evidence, including shell/asset-spam, glacier and hybrid contrasts, without changing decisions. Does not block I3/I5; later consumers need their own evidence and gate.

### I4 Agenda installation and scoring commitment
- **Status:** proposed
- **Depends on:** I3, F4
- **Spec:** [I4-agenda-installation-and-scoring-commitment.md](specs/I4-agenda-installation-and-scoring-commitment.md)
- **Goal:** Install an agenda where expected points beat holding it, then advance it to a score without the global reserve stalling the plan.

### I5 Asset, ambush and economy value
- **Status:** proposed
- **Depends on:** I3, L8.10, F4
- **Spec:** [I5-asset-ambush-and-economy-value.md](specs/I5-asset-ambush-and-economy-value.md)
- **Goal:** Compare root assets by expected board value instead of hook-chosen indices. Reuse L8.9's per-deck/route observations; assess shell deployment and holding coverage without a universal ICE requirement.

### I6 Upgrade selection by marginal effect
- **Status:** proposed
- **Depends on:** I3, I4, F4
- **Spec:** [I6-upgrade-selection-by-marginal-effect.md](specs/I6-upgrade-selection-by-marginal-effect.md)
- **Goal:** Place upgrades where they change the outcome on that server.

### I7.1 ICE install versus credit and draw
- **Status:** proposed
- **Depends on:** I2, F2, F4
- **Spec:** [I7.1-ice-versus-credit-and-draw.md](specs/I7.1-ice-versus-credit-and-draw.md)
- **Goal:** Choose between the best executable ICE install, gaining credits and drawing on one scale.

### I7.2 Root install, operation and advance versus other actions
- **Status:** proposed
- **Depends on:** I4, I5, I6, F4
- **Spec:** [I7.2-root-operation-and-advance-versus-other-actions.md](specs/I7.2-root-operation-and-advance-versus-other-actions.md)
- **Goal:** Compare root installs, operations, advancing, purge and waiting on the same scale.

### I8 Multi-click short-horizon planning
- **Status:** proposed
- **Depends on:** I7.1, I7.2, F2, F4
- **Spec:** [I8-multi-click-short-horizon-planning.md](specs/I8-multi-click-short-horizon-planning.md)
- **Goal:** Evaluate installs as parts of short two- or three-action plans.

### I9 Calibration, simulation and simplification
- **Status:** proposed
- **Depends on:** I8, F4
- **Spec:** [I9-calibration-simulation-and-simplification.md](specs/I9-calibration-simulation-and-simplification.md)
- **Goal:** Tune bounded weights with seeded evidence and remove superseded legacy branches.

### Done

| ID | Item | Delivered by | Architecture |
|---|---|---|---|
| I0 | Baseline capture and decision telemetry | [I0-baseline-capture-and-telemetry](../backlog/done/I0-baseline-capture-and-telemetry.md) | [architecture: install planning today](architecture.md#install-planning-today) |
| I1 | Unified install candidate model | [I1-unified-install-candidate-model](../backlog/done/I1-unified-install-candidate-model.md) | [architecture: install planning today](architecture.md#install-planning-today) |
| I2 | ICE selection by marginal security | [I2-ice-selection-by-marginal-security](../backlog/done/I2-ice-selection-by-marginal-security.md) | [server security evaluation](architecture.md#server-security-evaluation) |

## Reactive commitment (R)

Is it better to hold or reorder a legal action for a future condition the Corp
can already see? Shared design:
[specs/reactive-commitment-design.md](specs/reactive-commitment-design.md).

### R1.1 Reservation hook and threshold hold
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [R1.1-reservation-hook-and-threshold-hold.md](specs/R1.1-reservation-hook-and-threshold-hold.md)
- **Goal:** Add the reservation hook and record; hold Measured Response and its play cost from threat level 4 through an extended AIReserveCredits.

### R1.2 LEO sacrifice in the last paid-ability window
- **Status:** proposed
- **Depends on:** F4, R1.1
- **Spec:** [R1.2-leo-paid-ability-window.md](specs/R1.2-leo-paid-ability-window.md)
- **Goal:** Hold LEO's ability until the last Run 4.5 window and use it only when worth a bioroid, counting approach triggers still to come; starts with the LEO bug fix.

### R1.3 Nebula turn-planning hold
- **Status:** parked
- **Depends on:** F4, R1.1
- **Spec:** [R1.3-nebula-turn-planning-hold.md](specs/R1.3-nebula-turn-planning-hold.md)
- **Goal:** Keep an operation in HQ so Nebula can re-flip after the Runner runs HQ or R&D.
- **Parked because:** Nebula Talent Management: Making Stars (35057) has no card definition yet.

### R2 Cross-trigger resolution ordering
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [R2-cross-trigger-resolution-ordering.md](specs/R2-cross-trigger-resolution-ordering.md)
- **Goal:** Order the Corp's own simultaneous triggers from their declared preferences.

## Principle debt (P)

Existing code that breaks a principle and must be migrated.

### P1 Retire legacy card-title special cases
- **Status:** ready
- **Depends on:** none
- **Ticket:** [corp_ai_finding_13_legacy_title_lists.md](../backlog/corp_ai_finding_13_legacy_title_lists.md)
- **Goal:** Replace the 64 allowlisted title uses in `ai_corp.js` with hooks; I1/I2/I5-owned rows migrate inside those items; a ratchet test blocks new ones.

### P2 Route Corp card-policy randomness through the injected source
- **Status:** proposed
- **Depends on:** none
- **Spec:** [P2-corp-card-policy-randomness.md](specs/P2-corp-card-policy-randomness.md)
- **Goal:** Route every playable card's Corp AI policy randomness through `CorpAI._random` while leaving gameplay randomness unchanged.
