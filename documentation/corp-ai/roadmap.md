# Corp AI roadmap

One entry per item. Full specs live in the linked ticket (`ready` and later) or
spec file (`proposed`); how finished work behaves lives in
[architecture.md](architecture.md); rules live in [principles.md](principles.md).
Statuses, IDs and commands are defined in [../ai-planning.md](../ai-planning.md).

- `node scripts/roadmap.js next` lists items whose dependencies are all `done`.
- `node scripts/roadmap.js list` prints every item with its status.
- `tests/ai-roadmaps.test.js` fails if a status, link or dependency here
  disagrees with the tickets.

## Server security (L)

How vulnerable, valuable or urgent is each server?

Partly done layers: **Layer 7** (the tactical breach-loss interrupt is done;
consequence calibration, L7.1, is open) and **Layer 8** (baiting, shared
profiles and tag deterrence are done; L8.4 and L8.5 are required to complete
it, L8.2 is open, L8.6 is optional).

### L3.5.1 Value-weighted protection debt
- **Status:** ready
- **Depends on:** F4
- **Ticket:** [feature-layer-3-5-1-value-weighted-protection-debt.md](../backlog/feature-layer-3-5-1-value-weighted-protection-debt.md)
- **Goal:** Repeatedly skipped high-consequence servers gain urgency faster than empty ones, without new starvation.

### L3.5.2 Action-feasible protection target fallback
- **Status:** in-progress
- **Depends on:** none
- **Ticket:** [corp-not-protecting-archives-with-baker-backdoor.md](../bugs/code-review/corp-not-protecting-archives-with-baker-backdoor.md)
- **Goal:** An ineligible top-ranked server no longer blocks protection of the next viable one. Implemented; awaiting review. Interim until I1–I2.

### L4.1 Unified bypass capability allocation
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-4-1-unified-bypass-capability-allocation.md](../backlog/feature-layer-4-1-unified-bypass-capability-allocation.md)
- **Goal:** Allocate all public bypass tools across the whole run instead of per mechanic class.

### L5.1 Observed-deck threat priors
- **Status:** ready
- **Depends on:** F4
- **Ticket:** [feature-layer-5-1-bayesian-threat-priors.md](../backlog/feature-layer-5-1-bayesian-threat-priors.md)
- **Goal:** Replace fixed faction weights with priors updated from public deck evidence.

### L6.1 Payment-constraint allocation
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-6-1-payment-constraint-allocation.md](../backlog/feature-layer-6-1-payment-constraint-allocation.md)
- **Goal:** Allocate restricted credit sources (stealth, breaker-only, central-only) against actual payments instead of one scalar ceiling.

### L7.1 Consequence-calibrated central pressure
- **Status:** ready
- **Depends on:** F4
- **Ticket:** [feature-layer-7-1-consequence-calibration.md](../backlog/feature-layer-7-1-consequence-calibration.md)
- **Goal:** Weight central pressure by the actual consequence of the next breach. The tactical loss interrupt is already done (part of L7).

### L8.2 Deception legibility signals
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-8-2-remote-deception-profiles.md](../backlog/feature-layer-8-2-remote-deception-profiles.md)
- **Goal:** Base bluff legibility on generic public signals a human reads. The shared profiles themselves are done (see architecture).

### L8.4 Bounded posture epochs
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-8-4-bounded-posture-epochs.md](../backlog/feature-layer-8-4-bounded-posture-epochs.md)
- **Goal:** Replace lifetime bait/bluff postures with epoch-bounded ones that can be reconsidered at meaningful boundaries. Required to complete Layer 8.

### L8.5 Match-local public outcome feedback
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-8-5-match-local-public-outcome-feedback.md](../backlog/feature-layer-8-5-match-local-public-outcome-feedback.md)
- **Goal:** Adjust later posture weights from public outcomes within the current game. Required to complete Layer 8.

### L8.6 Outcome-calibrated bluff telemetry
- **Status:** parked
- **Depends on:** L8.5
- **Ticket:** [feature-layer-8-6-outcome-calibrated-bluff-telemetry.md](../backlog/feature-layer-8-6-outcome-calibrated-bluff-telemetry.md)
- **Goal:** Opt-in telemetry to tune bluff frequencies against humans. Optional.
- **Parked because:** it needs a meaningful sample of human games.

### L8.7 Layer 8 card hook audit
- **Status:** ready
- **Depends on:** none
- **Ticket:** [feature-layer-8-card-set-audit-and-set-adoption.md](../backlog/feature-layer-8-card-set-audit-and-set-adoption.md)
- **Goal:** Every access- or tag-punishing card in scope declares `AIPunishesAccess` or `AITagPunishment`.

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

## Foundations (F)

Shared infrastructure used by every area.

### F2 Guarded hypothetical evaluation: remaining migrations
- **Status:** ready
- **Depends on:** none
- **Ticket:** [corp_ai_finding_10_guarded_hypothetical.md](../backlog/corp_ai_finding_10_guarded_hypothetical.md)
- **Goal:** Route every remaining planning probe, including Baker's prospective-run probe, through one guarded helper.

### F3 Per-decision evaluation cache
- **Status:** ready
- **Depends on:** F2, F4
- **Ticket:** [corp_ai_finding_11_evaluate_once_per_decision.md](../backlog/corp_ai_finding_11_evaluate_once_per_decision.md)
- **Goal:** Evaluate each server once per decision without ever serving a stale or hypothetical result.

### F4 Seeded AI-vs-AI batch harness
- **Status:** ready
- **Depends on:** none
- **Ticket:** [corp_ai_finding_12_seeded_batch_harness.md](../backlog/corp_ai_finding_12_seeded_batch_harness.md)
- **Goal:** Repeatable seeded games with outcome and latency metrics; the evidence every calibration gate needs.

### Done

| ID | Item | Delivered by | Architecture |
|---|---|---|---|
| F1 | Injectable, seedable randomness | [finding 09](../backlog/done/corp_ai_finding_09_seeded_randomness.md) | [Foundations](architecture.md#foundations) |

## Install decisions (I)

What should the Corp install, where, and is that better than another action?
Shared design: [specs/install-decisions-design.md](specs/install-decisions-design.md).
The phases are deliberately sequential: I2 (ICE selection) is the first intentional
policy change, then one decision class at a time (roles, agendas, assets,
upgrades) before comparing installs with other actions.

### I0 Baseline capture and decision telemetry
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [I0-baseline-capture-and-telemetry.md](specs/I0-baseline-capture-and-telemetry.md)
- **Goal:** Record current install choices and outcomes before changing any policy.

### I1 Unified install candidate model
- **Status:** proposed
- **Depends on:** I0
- **Spec:** [I1-unified-install-candidate-model.md](specs/I1-unified-install-candidate-model.md)
- **Goal:** Replace concatenation priority with explicit, scored candidate records, initially preserving behaviour.

### I2 ICE selection by marginal security
- **Status:** proposed
- **Depends on:** I1
- **Spec:** [I2-ice-selection-by-marginal-security.md](specs/I2-ice-selection-by-marginal-security.md)
- **Goal:** Choose the `(ICE, server)` pair that most improves security, using the existing evaluator.

### I3 Remote role and root suitability
- **Status:** proposed
- **Depends on:** I2
- **Spec:** [I3-remote-role-and-root-suitability.md](specs/I3-remote-role-and-root-suitability.md)
- **Goal:** Decide what each remote is for before comparing root cards.

### I4 Agenda installation and scoring commitment
- **Status:** proposed
- **Depends on:** I3
- **Spec:** [I4-agenda-installation-and-scoring-commitment.md](specs/I4-agenda-installation-and-scoring-commitment.md)
- **Goal:** Commit an agenda only with a safe destination and a plausible scoring plan.

### I5 Asset, ambush and economy value
- **Status:** proposed
- **Depends on:** I4
- **Spec:** [I5-asset-ambush-and-economy-value.md](specs/I5-asset-ambush-and-economy-value.md)
- **Goal:** Compare root assets by expected board value instead of hook-chosen indices.

### I6 Upgrade selection by marginal effect
- **Status:** proposed
- **Depends on:** I5
- **Spec:** [I6-upgrade-selection-by-marginal-effect.md](specs/I6-upgrade-selection-by-marginal-effect.md)
- **Goal:** Place upgrades where they change the outcome on that server.

### I7 Install versus other Corp actions
- **Status:** proposed
- **Depends on:** I6
- **Spec:** [I7-install-versus-other-corp-actions.md](specs/I7-install-versus-other-corp-actions.md)
- **Goal:** Compare the best install with gaining credits, operations, advancing, rezzing and waiting.

### I8 Multi-click short-horizon planning
- **Status:** proposed
- **Depends on:** I7
- **Spec:** [I8-multi-click-short-horizon-planning.md](specs/I8-multi-click-short-horizon-planning.md)
- **Goal:** Evaluate installs as parts of short two- or three-action plans.

### I9 Calibration, simulation and simplification
- **Status:** proposed
- **Depends on:** I8, F4
- **Spec:** [I9-calibration-simulation-and-simplification.md](specs/I9-calibration-simulation-and-simplification.md)
- **Goal:** Tune bounded weights with seeded evidence and remove superseded legacy branches.

## Reactive commitment (R)

Is it better to hold or reorder a legal action for a future condition the Corp
can already see? Shared design:
[specs/reactive-commitment-design.md](specs/reactive-commitment-design.md).

### R1 Reserve and optionality model
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [R1-reserve-and-optionality.md](specs/R1-reserve-and-optionality.md)
- **Goal:** Hold a card, credits or an ability when its declared future use is worth more than spending it now.

### R2 Cross-trigger resolution ordering
- **Status:** proposed
- **Depends on:** none
- **Spec:** [R2-cross-trigger-resolution-ordering.md](specs/R2-cross-trigger-resolution-ordering.md)
- **Goal:** Order the Corp's own simultaneous triggers for their combined value.

## Principle debt (P)

Existing code that breaks a principle and must be migrated.

### P1 Retire legacy card-title special cases
- **Status:** ready
- **Depends on:** F3, I2
- **Ticket:** [corp_ai_finding_13_legacy_title_lists.md](../backlog/corp_ai_finding_13_legacy_title_lists.md)
- **Goal:** Replace the remaining title comparisons in `ai_corp.js` with hooks, row by row.
