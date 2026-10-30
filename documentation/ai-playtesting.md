# Improving the AI through playtesting

Owner direction recorded 2026-10-28. Choose strategic AI work from weaknesses
seen in Paul's games, and let Paul decide which behaviour to keep through
on/off flags. This replaces automatic adoption or rejection from AI-vs-AI
pass/fail results. Correctness tests and code review still apply.

## Choose work from games

1. Play with a recorded set of flags. Keep that combination stable while
   assessing a particular change; record any change during a game.
2. Save the debug log and describe the decision that seemed wrong and the
   alternative you expected. Enable decision snapshots for useful replayable
   boards where practical; a final board dump alone needs reconstruction.
3. Investigate before calling it a bug. A difficult draw, a reasonable risk,
   a rules error and a missing strategic choice need different responses.
   A repeatable decision does not prove a better alternative exists.
4. Check existing tickets and roadmap ownership. Add evidence to the item that
   owns the decision; revise a stale design before implementing it. Do not add
   an independent heuristic fix that competes with an existing plan.
5. Build a faithful reproduction, record assumptions, and separate observed
   facts from explanations and proposed improvements. Include a contrasting
   position where the proposed change should not apply.

The roadmap holds possible solutions, dependencies and completed work. It is
not an instruction to build every remaining feature in order. A completed
prerequisite makes work possible; playtest evidence determines its priority.

## Build and try a change

Strategic changes remain gated behind named AI flags. New behaviour starts
off unless Paul explicitly requests otherwise. Give each flag a short comment
about the behaviour it changes, in language useful while playing. Split
independent decisions into separate flags when they need separate assessment.

Run focused tests while editing and the required final validation from
[tests/README.md](../tests/README.md) and the ticket/card workflow. Tests still
check legal play, information boundaries, tactical safety, state restoration
and regressions. Move a pending reproduction into the green suite only after
it passes; never weaken its expectation just to get a pass. If evidence shows
the strategic expectation was mistaken, document that and revise the proposal.

Paul switches flags on and off while playing, and decides when he is happy
with the resulting play. There is no required game count, win-rate improvement
or numerical pass/fail threshold for this owner-playtesting route. Record the
flags, useful logs, improvements, remaining weaknesses and Paul's decision.
Trying a flag is not permanent adoption. Agents must not infer adoption from
one successful reproduction, a merge, an automated report or a temporary
change to local defaults. Follow an explicit owner instruction about defaults.

Reviewed implementation may be merged with playtesting still open. Record
implementation completion separately from whether Paul is trying, keeping,
leaving off or revisiting the behaviour. Paul opens PRs and merges manually;
CodeRabbit reviews on GitHub. Ordinary rules/legality fixes still use their
objective test oracle rather than a strategic playtesting gate.

## Record the gate in a ticket

Keep the exact headings `## Acceptance gate` and `## Acceptance criteria`.
For this route, use:

```markdown
## Acceptance gate
Human gate. Option `<optionName>` (<Corp | Runner> AI), new behaviour off
unless the owner requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: <behaviour to improve, and contrasting behaviour to preserve>.
Adoption: Paul decides after playtesting; record the tested flags and decision.
```

Acceptance criteria require the switch, applicable deterministic tests, the
required suite and review, plus a handoff describing what Paul should look
for. An owner adoption decision may remain pending after implementation merges;
record it separately rather than claiming that a batch gate passed.

## Use automated games as evidence

Keep the batch runner, replay tools, collectors and old reports. Use targeted
runs when they answer a concrete question or test changes to that machinery.
Run statistical adoption comparisons when Paul asks for one; their numerical
thresholds apply to that comparison. Do not schedule full adoption batches,
build collectors solely to satisfy an old gate, remove a useful flag after an
old failure, or turn a default on solely because an AI-vs-AI comparison passed.

Older tickets and skills describe compulsory batch gates or quantified human
gates. For strategic work using this owner-playtesting route, this direction
takes precedence. Preserve old measurements as historical evidence. Refresh
an affected ticket's gate and criteria when picking it up; do not mass-rewrite
unrelated specs or discard useful earlier evidence.

The CLI gate summaries and `ticket.js check` still contain assumptions about
passed gates and default flags. They have not been migrated by this
documentation change. Record genuine owner decisions and report an incompatible
check explicitly; do not fabricate numerical evidence or mark a gate passed to
satisfy tooling. Deterministic validation failures still need fixing.

### Why batch results and playtests disagree (found 2026-10-30)

AI-vs-AI batches measure the Corp against the Runner AI, and the Runner AI
leaves a fresh, unadvanced remote card alone about nine turns in ten even
when it could easily breach the remote (I4 calibration data). A human checks
it almost every time. So batches reward Corp behaviour that humans punish:
I10's first readiness fallback raised the smoke-run Corp win rate from 31.9%
to 46.7% while losing three agendas in one owner game, and I4's steal-risk
table, built from the same Runner, rates undefended agenda installs as nearly
safe. Until [T2](runner-ai/specs/T2-check-fresh-remote-installs.md) changes
the Runner and the Corp's steal-risk tables are rebuilt, treat any batch gain
that comes from installing agendas or assets into weak remotes as suspect.

## Current Corp investigation

Paul's reported preferred combination in this discussion had
`openingHqThenRdIce`, `emptyArchivesRunPressure`, `postureEpochs`,
`matchLocalPostureFeedback`, `iceMarginalSecurity`, `agendaCommitmentPlan` and
`agendaExposureTable` on; `secureScoringServerGate`,
`serverAtRiskInstallOverride`, `committedAgendaReserveBypass`,
`valuelessServerDebtReset` and `agendaDestinationPlan` off. This records a
playtest preference, not a frozen configuration or a claim about today's file.
Record the actual options on each new log.

On 2026-10-29, while addressing PR #77, Paul explicitly requested keeping
`openingHqThenRdIce`, `emptyArchivesRunPressure`, `agendaCommitmentPlan` and
`agendaExposureTable` enabled in `CorpAI.DEFAULT_OPTIONS` for his current
games. This is an owner-authorized playtest setup, not permanent adoption or
a passed historical batch gate. Tests assert these current defaults; new
strategic options still start off unless Paul requests otherwise.

On 2026-10-30 Paul chose [I10](backlog/I10-scoring-plan.md) (scoring plan) in
place of I3 and asked for version 1 and version 2 behind separate options for
sequential playtests: `scoringPlan` first, then `scoringPlanCardSteps`, plus
`economyAssetsWhenRich`. All three start off. After the first `scoringPlan`
playtest he asked for `scoringPlanDigForIce` as a further separate option
(also off) to add later.

The [agenda-stall ticket](bugs/corp-agenda-held-while-secure-remote-available.md)
and [I3](backlog/I3-remote-role-and-root-suitability.md) now share the evidence
from `corp_wont_play_an_agenda.txt`. I4 owns agenda install/hold and advancement;
I3 owns keeping or making a scoring remote available; I5 owns broader asset
value. Investigate these together rather than adding a separate placement rule.
The reconstruction shows blocked choices, not that replacing the asset is
always best. I4's destination flag stays a separate decision: the owner also
reported undefended last-click installs when trying it.
