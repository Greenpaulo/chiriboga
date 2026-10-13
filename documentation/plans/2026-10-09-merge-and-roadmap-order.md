# Merge and roadmap order (2026-10-09)

A working plan for the branches open on 2026-10-09 and the Corp AI install
track that follows. It is a snapshot: once these branches merge, trust
`node scripts/roadmap.js next` and the roadmaps over this file.

## 1. Merge order

Status reconciled against GitHub on 2026-10-11 and updated from the owner’s
confirmation on 2026-10-12: PRs #40, #42 and #43 are merged; L9.0 and L8.4
are done. All merge-order rows below are complete.
The original ordering is retained below for context. Do not merge
`scratch/l7-1-failure-analysis`.

| # | Branch | Commit | What it is | Before merging |
|---|---|---|---|---|
| 1 | `bug/agenda-bluff-probability-tracks-runner-grip-size` | `40eec12` | Removes the Grip-size term from bluff probability | Merged (PR #35); bug ticket moved to done |
| 2 | `roadmap/D3-close-runner-information-leaks` | `197f1c2` | Runner AI information-boundary fixes | Merged (PR #36); D3 ticket moved to done |
| 3 | `roadmap/feature-layer-7-1-consequence-calibration` | `840a19e` | L7.1: gate failed, option removed; keeps `_breachConsequence()`, hook fixes, collectors. Also moves F3 to done | Merged (PR #37); L7.1 ticket moved to done (failed option removed) |
| 4 | `roadmap/L7.1.1-failure-analysis` | `19d76e4` | Why L7.1 failed; I2 spec updated with the lesson; L7.1.1 parked (doc only). Based on #3 | Merged (PR #39); L7.1.1 remains parked |
| 5 | `roadmap/I0-baseline-capture-and-telemetry` | `eddf683` | I0: install telemetry, collectors, F4 baseline | Merged (PR #34); I0 ticket moved to done |
| 6 | `roadmap/I1-unified-install-candidate-model` | `2db37e7` | I1: install candidate records, no choice changes. Based on #5 | Merged (PR #38); I1 ticket moved to done |
| 7 | `roadmap/L9.0-lockout-honesty-spec` | PR #40 | L9.0, L9.0.1 and L9.1 specs; I2 depends on L9.0 and L9.1; CodeRabbit fix to L9.0.1 scenario 1 (doc only) | Merged (PR #40); spec changes also included in #42 |
| 7a | `roadmap/L9.0-lockout-honesty` | PR #42 | L9.0 implemented (observation only, done). Contains #5 and #7 | Merged (PR #42); L9.0 is done |
| 8 | `roadmap/feature-layer-8-4-bounded-posture-epochs` | `aaa8f65` | L8.4 `postureEpochs` option, default on | Merged (PR #43), confirmed by owner; revised full gate passed; ticket moved to done. Correlation 0.229 ≤ baseline 0.329; all performance guards and epoch hard checks passed |
| 9 | `docs/merge-and-roadmap-order` | — | This file | Merged (PR #41) |

The merged Scrounge fix (PR #32) also still had its ticket in code-review;
it has now been moved to done. All six ticket moves used
`node scripts/ticket.js move <ticket> done`, updating roadmap links and
removing cleared generated blockers. L7.1 is complete with its failed option
removed, not adopted. L9.0 is done following the merge of PR #42.

**L8.4 update (2026-10-12).** The owner confirmed code review passed and
PR #43 is merged. The
1,400-paired-game run changed 320 games, with no failed games. L8.4's approved
correlation requirement is measured candidate no worse than measured baseline,
replacing its absolute ceiling: 0.229 [0.163, 0.307] versus
0.329 [0.253, 0.413], PASS. Both epoch hard checks were zero and all three
performance guards passed. `postureEpochs` now defaults to on; an explicit
`false` retains lifetime caching. The ticket is in
`documentation/backlog/done/feature-layer-8-4-bounded-posture-epochs.md`.
Absolute deception thresholds and their consistency across L8.2/L8.5/I9 remain
separate roadmap work involving ICE allocation (I2) and remote roles (I3).

**Line endings.** `ai_corp.js` mixes CRLF and LF. Before committing a change
to it, compare `git diff --stat` with `git diff --ignore-cr-at-eol --stat`;
they must match.

## 2. What the 2026-10-09 findings changed

- **L7.1 failed for a different reason than expected.** The weighting raised
  HQ's protection score, and that score is also the bar a remote must clear to
  count as a scoring server, so the Corp scored in remotes less and the Runner
  stole more from R&D late. Weighting only the ICE-target ranking was neutral.
  Details: the "Failure analysis" section of
  `documentation/corp-ai/specs/L7.1.1-horizon-aware-central-consequence.md`
  (branch #4).
- **L7.1.1's horizon idea is not supported** by that evidence; it is parked
  (branch #4). I2's spec and the install design note now keep
  `consequenceWeight` inside I2's ranking, with HQ and R&D unweighted.
- **The security evaluator is sound but over-reports lockouts.** Provisional
  figures suggest about nine in ten "secure" verdicts mean only "no matching
  breaker is installed yet", and bioroid click-breaks are not modelled.
  Provisional breach rates were 8% for servers judged secure (insecure: 23%).
  The evaluation artefact, code revision and sample-selection method for these
  figures are not recorded here; verify them before relying on the figures for
  roadmap sequencing. I2 would mostly be measuring these false lockouts, so
  L9.0 comes first.

## 3. Roadmap order after the merges

| Step | Item | Gate | Why this order |
|---|---|---|---|
| 0 | ~~L8.4 merge~~ — done (PR #43 merged) | Revised full gate passed | Bounded posture epochs are merged; Sang Kancil/Principia and L9.1 are also done as of 2026-10-13 |
| 1 | ~~Update the I2 spec with the L7.1 findings; park L7.1.1~~ | Doc only | Merged in PR #39; L7.1.1 remains parked |
| 2 | ~~L9.0 Lockout honesty~~ — done (PR #42 merged) | None (observation only) | Adds an honest verdict next to today's, plus the `securityCalibration` collector. No decision changes. Supplies I2's honest fields; L9.1 is also required |
| 3 | ~~Sang Kancil/Principia and L9.1~~ — done | Bug regression; L9.1 has no F4 gate | Both tickets are now in done; L9.1 satisfies this I2 prerequisite. Historical implementation notes are retained in §5 |
| 4 | **L8.5** Match-local public outcome feedback | F4; re-ground and reconcile its source gate first | Next policy ticket: owns public history and bounded posture feedback. Must be done before L8.2; validate the proposed gate change before implementation |
| 5 | **L8.2** Deception legibility signals | Separate F4 gate; re-ground design and gate feasibility first | Reads L8.5's Corp-action record. Prefer adopting it before I2's final gate so I2 is measured with legibility enabled; this is a sequencing preference, not a formal I2 dependency |
| 6 | **F11** Paired batch-metric guards | Harness tests; no policy-adoption gate | Formal I2 prerequisite: must be done before I2 hand-off. Can be completed earlier alongside L8.5/L8.2; supplies reusable paired guards, not consumer tolerances |
| 7 | **I2** ICE selection by marginal security | F4; proposed correlation guards below | Depends on I1, F2, F4, L7.1, L9.0, L9.1 and F11. Planned order gates it against adopted L8.2 with a fresh matching control; calibrate and freeze guard tolerances before candidate results |
| 7a | **L9.0.1** Adopt honest lockout | Separate F4 gate | Lets existing scoring, rez and protection decisions use the honest verdict. Can proceed alongside this sequence; refresh controls after any decision-changing adoption |
| 7b | **L8.9** Observable-defense parity investigation | Passive identity checks; no policy adoption | After I2 supplies realized-defense observations, attribute placement/allocation/lifecycle differences. Prefer its findings before I3 freezes suitability; it is not a formal I3 prerequisite |
| 8 | **I3**, then the remaining install track | Per spec; proposed I3 correlation guard below | I3 requires I2, F4 and L8.4. I5 additionally requires L8.10 mechanics/diagnostics. This working order finishes L8.2 before I3 as a sequencing preference |

I2 depends on L9.1 in both the roadmap and its spec (included in PR #42). L9.0's
honest fields alone do not correct unpriceable installed breakers; I2 must
wait for L9.1's correction before scoring candidates.

**L8.5 → L8.2 (status refreshed 2026-10-13).** The roadmap lists L8.5 as in-progress (code-review),
depending only on F4. L8.2 depends on F4 and L8.5; its generated blocker means
L8.5 must be **done** before L8.2 can proceed. Neither depends on I2 and I2
depends on neither. L8.5 is more than a history collector: it also changes
posture selection through bounded match-local feedback, so it needs its own
gate. L8.4 is now merged, satisfying this plan's sequencing preference;
L8.5 has no formal L8.4 dependency.

Parallel development does not permit a shared stale gate baseline. Before
each gate, capture a fresh matching control on the revision being evaluated,
with prerequisite options identical in both arms and only the item's option
changed. Reconcile this with each spec's I0-baseline wording when re-grounding.
If another decision-changing item lands during evaluation, refresh the later
item's control and gate. Prefer landing L8.2 before I2's final gate when
practical, so I2's allocation change is measured with legibility already
enabled; otherwise record that I2's evidence predates legibility and evaluate
L8.2 against the adopted I2 policy. Gate L9.0.1 separately on the same basis.

### Deception gate reconciliation before implementation

The table distinguishes requirements currently recorded in tickets/specs from
the proposed direction for this plan. Updating this file does not amend those
gates; reconcile them in the source ticket/spec before implementation and
before viewing candidate gate results.

| Item | Option | Current recorded check | Plan direction |
|---|---|---|---|
| L8.4 | `postureEpochs` | Measured `bluffSingleVariableCorrelation.max` candidate ≤ baseline; passed 0.229 ≤ 0.329 | Settled for L8.4; retain its recorded gate and evidence |
| L8.5 | `matchLocalPostureFeedback` | Correlation is report-only; deterministic information integrity/reachability, hard adaptation bounds and performance guards | Owner-approved redesign after the original full gate failed (2026-10-12); source ticket retains original values, intervals and failure chronology |
| L8.2 | `deceptionLegibility` | Candidate bootstrap 95% CI upper bound ≤ 0.10; shape total-variation distance ≤ 0.05 | Retain 0.10 pending re-grounding and feasibility evidence; do not assume profile parity removes the allocation tell |
| I2 | `iceMarginalSecurity` | Updated source spec proposes paired 95% difference guards for posture correlation and realized ICE-count correlations (all unrevealed agenda/trap remotes and active-posture subset); 0.02 absolute-rho margins provisional pending control-only calibration | Different from L8.4's measured-value rule: adds uncertainty checks but permits a small increase; F11 provides harness support. Freeze justified tolerances before candidate results; retain improvement/performance checks and refresh the matching control |
| I3 | `remoteRoles` | No explicit correlation guard | Add a no-worse-than-matching-control correlation guard alongside the existing non-inferiority checks |
| I9 | Combined install policy | At least 2,000 bait/bluff decisions; CI upper bound ≤ 0.20 for non-input variables; documented-input bucket rates within 0.05 of formula; extend collector to roles | Proposed destination: absolute 0.10 on the combined policy. Reconcile scope and bounded-input exceptions before adopting it; this is stricter than the current spec |

For proposed no-worse checks, specify the statistic before the gate: L8.4
compares **measured batch maxima**, not a confidence bound on the paired
difference. Report both arms' 95% intervals and do not describe that
measured-value check as proof of statistical non-inferiority. Any stronger
paired-interval rule needs its own preregistered threshold and harness support.
The exported metric is `bluffSingleVariableCorrelation.max`.

Re-ground L8.2 and L8.5 through `.agents/skills/reground-spec/SKILL.md`.
L8.2 still carries `376f32c (2026-09-25)`; L8.5 was re-grounded at
`04fbe4c (2026-10-12)`. Its plan and gate revision were then approved:
measured candidate correlation maximum must be no worse than a fresh matching
baseline, with both intervals reported for context. In particular:

- Replace L8.2's open Grip-size-bug claim/link with the merged fix in
  `documentation/bugs/done/agenda-bluff-probability-tracks-runner-grip-size.md`.
  Current `_shouldBluffAgendaServer()` has no Grip-size probability term.
- Bind L8.2's “at most once per posture” top-up state and reset rule to
  L8.4's actual posture record/reevaluation lifecycle. Test horizon expiry,
  challenges, public pressure/stakes changes, install invalidation and safety
  guards; a top-up must not accidentally trigger repeated resets or rerolls.
- Use L8.4's existing correlation collector rather than adding it again.
  Check outcome/variable coverage: profile shapes and posture/card-class
  outcomes are distinct, and I9's planned role coverage is not present yet.
- Validate L8.2's relative-depth design against the metric: it deliberately
  makes target ICE depend on deepest-central ICE, which the collector tests.
  Shared agenda/trap shapes do not imply every outcome/variable correlation
  is below 0.10. If that ceiling is unsupported, document the conflict and
  revise the design or preregister a no-worse gate before implementation;
  keep the absolute combined-policy target as unresolved work for I9.

**I2 reconciliation update (2026-10-12).** The source spec is re-grounded
against `e33a91b`: scenario 8 now follows authoritative posture epochs.
Active agenda/trap postures share ordinary ranking and a common consequence
weight; true stakes remain available to safety. Realized ICE-count collectors
are planned alongside the existing posture-roll collector, with coverage
limits stated. [F11](../backlog/F11-paired-batch-metric-guards.md) is raised
for reusable paired batch guards and is an I2 dependency. These are documented
requirements, not implemented behavior or gate evidence. The provisional
margins need control-only feasibility/calibration evidence before freezing;
L8.4's settled measured-value evidence and the other source gates remain
unchanged. Preserve the L7.1 rule: consequence weighting belongs only in
I2 ranking, never in HQ/R&D protection scores used as remote-scoring bars.

**Source synchronization audit (2026-10-12).** L8.4's settled gate and I2's
proposed paired guards are reflected in their source documents. L8.2 retains
the table's current ceiling, with re-grounding/feasibility work pending.
L8.5's original no-worse requirement was approved before candidate results.
After its full run failed that check, the owner approved a gate redesign:
correlation is diagnostic, with deterministic information integrity/reachability,
hard adaptation bounds and unchanged performance guards. The source ticket
records the original failed command, measurements and post-result timing. I3's additional correlation guard and I9's
tighter combined-policy ceiling remain unadopted proposals.
Each affected open ticket/spec now links this section from **Read first**;
the Corp roadmap also directs pickup here. Reconciliation notes distinguish proposals from current requirements. The
discoverability update itself changed no threshold; the later explicit L8.5
approval changed its correlation statistic/threshold. The subsequent
post-result L8.5 redesign is separately recorded above and in its ticket.

**Separate deception valuation follow-up (2026-10-12).**
[L8.8](../corp-ai/specs/L8.8-marginal-deception-value.md) is proposed after
adopted I2, not added to I2's prerequisites. It separates a shared marginal
concealment input from private mechanical trap payoff, with its own F4 gate.
I2 retains its symmetric placeholder. Record L8.2 ordering and refresh matching
controls for any later adoption; this proposal does not change the source
items' existing gates or establish benefit against tell-learning humans.

**Prospective-spec review (2026-10-13).** The retained ideas remain specs
(proposed or explicitly parked), not raised tickets or adopted policies:

- [L8.9](../corp-ai/specs/L8.9-observable-defense-parity.md) is now an
  observation-only investigation after I2, rather than a bundle of speculative
  parity fixes. I2 retains collector ownership and its source gate. Prefer
  attribution before I3 freezes placement; any repair needs its own spec/gate.
- [L8.10](../corp-ai/specs/L8.10-trap-play-value.md) consolidates the trap drafts
  into mechanics and passive play/access diagnostics. It depends on L8.7, I1,
  F2 and F4 and can proceed alongside the earlier track. Schedule the L8.7
  playable-card audit and L8.10 before I5; I5 now formally depends on L8.10
  and owns any payoff conversion/adoption. Neither blocks I2 or I3, nor depends
  on L8.8's unresolved shared-concealment model. Reuse existing reservations.
- I3's tempting-server example and I5's future trap consumer need scoped tell
  checks and fresh matching controls. Exact equality of all visible play across
  changed games is not required; private trap payoff still cannot leak into
  equivalent active-posture ordinary ICE ranking. Their recorded gates remain
  unchanged until explicitly reconciled in their source specs before results.
- [I3.1](../corp-ai/specs/I3.1-deck-game-plan-profile.md) is lower-priority,
  observation-only work after I3. It is not a prerequisite for I4/I5 or the
  remaining install track, and has no decision consumer in scope.
- [L10](../corp-ai/specs/L10-sampled-breach-probability.md) is linked as parked
  research. Hidden-state capability and actual next-turn breach occurrence
  need different models/validation. It adds no dependency to the install
  sequence; do not implement or raise it without rewriting the model.

The three observation items require hash/RNG identity checks, not strategic
improvement gates. Their measurements may motivate separately gated policy;
none changes L8.4's settled gate or grants adoption to an I-layer consumer.

Not yet an item: the evaluator's Runner credit ceiling appears too low
(provisional: 19 of 115 sampled breaches of "secure" servers). The evaluation
artefact, code revision and sample-selection method for this count are not
recorded here. Verify the count and confirm the cause before raising an item.

## 4. Other open decisions

- Vantage Point stays out of the F4 deck pool until its set review passes
  (PR #28).
- After these branches merge: one PR to normalise `ai_corp.js` line endings and
  add `.gitattributes`.
- Prune the stale `bisect-*`, `bench-*`, tmp and agent worktrees (about 50).
  The worktrees for this session's branches are detached, so they no longer
  block `git checkout`.

## 5. Completed: L9.1 with the Sang Kancil and Principia bug

Status refreshed on 2026-10-13: both tickets are in `done/`. L9.1's resolution
and review evidence are in
[L9.1-unpriceable-breakers.md](../backlog/done/L9.1-unpriceable-breakers.md).
The Sang Kancil/Principia card fix was implemented in `3803c98`; its completed
review is in [the bug ticket](../bugs/done/sang-kancil-and-principia-priced-as-unbreakable.md).
The following implementation order is retained as historical context, not a
request to repeat the work or raise L9.1 again.
Sang Kancil and Principia were the only unpriceable breakers in the playable
sets before the card fix. L9.1 now protects the generic unknown-price case,
with no change to the recorded decision snapshots or fixtures.

1. Branch from `main`: PR #42 has merged and L9.0 is done, satisfying
   L9.1’s L9.0 dependency.
2. Bug first: `documentation/bugs/done/sang-kancil-and-principia-priced-as-unbreakable.md`
   (implement-ticket). Write its pending reproduction, then give both cards a
   real `AIImplementBreaker` and delete the dead `AIImplementIcebreaker` (and its
   `LEGACY_UNDOCUMENTED` entry). Check printed install cost and strength against
   card data; the comment headers disagree with the objects.
3. Then L9.1: re-ground and raise (`node scripts/roadmap.js raise L9.1`), then
   implement-ticket. Raised ticket: `documentation/backlog/done/L9.1-unpriceable-breakers.md`.
   Its Current behaviour item 4 notes that L9.0's honest path has the same gap:
   an unpriced matching breaker yields `honestLockout`.
4. Reuse L9.0's hook: `AIBreakCost` (`documentation/ai.md` §5.3) is read on ICE
   today; L9.1 extends it to Runner breakers. Do not add a second hook.
5. Line endings: editing tools may rewrite `ai_corp.js` to LF. Check that
   `git diff --stat` matches `git diff --ignore-cr-at-eol --stat` after every
   edit.
6. Known gap left open by L9.0: Bumi 1.0 has no Runner-side
   `AIImplementBreaker`, so the Runner AI cannot click-break it. Recorded in the
   L9.0 ticket; not part of L9.1.
