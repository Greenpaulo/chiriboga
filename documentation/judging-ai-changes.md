# Judging whether an AI change plays better

This guide is for you, the project owner. It explains what a **gate** is, why
the roadmap now uses them, what you do at each step, and how to read the
results. The agent-facing rules are in
[ai-planning.md](ai-planning.md#acceptance-gates); you should not need to read
those.

## The problem gates solve

Most AI roadmap items aim to make the AI **play better**: weight protection by
what a server holds, choose ICE by how much security it adds, hold Measured
Response for the right moment. Our tests cannot show that on their own.

A test checks one fixed situation: "on this board, the Corp puts this ICE on
R&D." It proves the AI makes that move. It cannot prove the AI wins more,
because a change that fixes one situation can quietly make ten others worse.
Nobody notices until games start going wrong.

Before gates, every ticket's "done" meant "the tests pass". An agent could tick
every box on a "play better" ticket and close it without the Corp playing any
better. Several tickets had goals such as "reduce preventable breaches" with no
way to measure them at all.

A gate fixes this by deciding **in advance** what "better" means as numbers
measured over many games, and by keeping the change switched off until those
numbers are met.

## What a gate is

A gate is the pass/fail test that decides whether a finished change is
**switched on**. Each gated ticket has an `## Acceptance gate` section that
says:

- **what is measured**: for example agenda points stolen per game, Corp win
  rate, high-value servers breached;
- **which direction counts as better**: fewer steals, more wins;
- **how much**: a number, for example "points stolen must not rise by more
  than 0.2 per game".

Every gate is written in one fixed form, described in
[ai-planning.md: Writing a gate](ai-planning.md#writing-a-gate): a table of
improvement rows, standard regression guards (win rate and points) and any
hard checks, plus the exact command that runs it. Here is L3.5.1's gate,
slightly simplified:

> - Improvement: high-consequence breaches per game go down.
> - Guard: points stolen per game rise by at most 0.2.
> - Guard: Corp win rate drops by at most 2 percentage points.
> - Hard check: no server ever waits longer than the maximum for protection.

The **improvement** is what the change is for. The **guards** stop it from
buying that improvement by making something else worse. The change passes only
if every line holds.

## How the games are played: F4

"Measured over many games" needs a machine to play them. That machine is
**F4**, the seeded AI-vs-AI batch harness
([ticket](backlog/corp_ai_finding_12_seeded_batch_harness.md)). It is a Node
script, `scripts/ai-batch.js`, that plays the Corp AI against the Runner AI
with no screen and writes a report.

- **It costs no AI tokens to run.** The game's AIs are ordinary JavaScript
  rules, not a language model. Running a gate is like running the test suite:
  free, it just takes time.
- **It plays the same games twice.** Every game starts from a **seed**, a
  number that fixes the deck shuffles and every random choice. F4 plays each
  seed once with the change off (the **baseline**) and once with it on (the
  **candidate**). The two games differ only by your change, so a difference in
  the result is caused by the change, not by luck of the draw.
- **It plays a lot of games.** By default that is 200 games for each deck pair
  in a fixed, committed **deck pool** (seven Corp-vs-Runner precon pairs, all
  from System Gateway, System Update 2021 and Elevation). With that many
  games, the luck averages out.
- **It is quick.** A game takes about 2 seconds, so a full gate (baseline and
  candidate, 2,800 games) takes roughly 15 to 20 minutes on 8 processes.
- **It reports a range, not just an average.** For each metric it prints the
  average difference between candidate and baseline, and a **95% confidence
  range**: the span the true difference very probably lies in. A gate uses the
  range, not the average. "Win rate drops by at most 2 points" means the
  worst end of the range must be no lower than −2 points. That protects you
  from a lucky run that looks good but isn't.

How to run it, change the decks and read a report is in the
[harness guide](ai-batch-harness.md).

## The life of a gated change

| Step | Who | What happens | What you see |
|---|---|---|---|
| 1. Build | Codex (`implement-ticket`) | The change is written behind an **AI option**, a named switch such as `weightedProtectionDebt`, which defaults to **off**. With it off, the game plays exactly as before; the ticket's own tests switch it on. Codex also builds what the gate measures with (any collectors and start boards it names), each an acceptance criterion, and proves the gate is ready: a `--quick` run of the gate command reports at least one game changed by the option. | A normal fix hand-off, with the gate-ready criterion ticked |
| 2. Run the gate | Codex, in the same session | Codex builds the exact `**Gate command:**` from the ticket's gate and runs it as one blocking command (about 15–20 minutes; the games cost no tokens, and the output is a few lines). If it cannot finish in the session, Codex hands off with `**Gate:** pending F4` and you run the command in a terminal; see the [harness guide](ai-batch-harness.md#running-a-gate). | A `**Gate:**` line in the ticket's Resolution: `passed`, `pending F4` or `failed`, with the command used |
| 3. Switch on | Codex | Only if the gate **passed**: the option's default is changed to on. | The option's default in `ai_corp.js` or `ai_runner.js` |
| 4. Review | Claude chat (`review-ticket`) | Checks that the option is off unless the gate passed, and that the recorded evidence matches the gate as written: same metrics, same thresholds, enough games. Missing or mismatched evidence blocks the review. | The review section |
| 5. Decide | **You** | Read the `**Gate:**` line and the comparison output, then accept the review or send it back. | — |

So you never flip the switch by hand, but nothing reaches players switched on
unless the numbers say so and you accept the review.

A change reviewed while F4 is missing can still be merged, **switched off**.
Its ticket goes back to the open backlog with `**Gate:** pending F4`, stays
`in-progress` on the roadmap, and receives the generated `## Blocker` header.
Once F4 is marked done on the roadmap, run
`node scripts/roadmap.js blockers --fix` to remove that header; the gate is
then run and step 3 onwards happens.

### Not every item is an on/off comparison

`node scripts/roadmap.js gates` labels each gated item with its kind:

- **Switched on only if an on/off comparison passes.** The kind described
  above. Most I, R and L items are this kind.
- **Decisions must match the recorded snapshots, except changes the ticket
  lists.** For refactors and plumbing (F2, F3, I1, P1, L4.1, L6.1, L9): they
  must not change how the AI plays, or only in the few places the ticket names.
  They are judged against recorded decisions, not win rates, and have no
  option.
- **Other seeded-game (F4) check.** I0 records the first baseline everything
  else compares against. I9 compares the whole install series at once.
- **Judged on human game data.** L8.6 needs records from games against people,
  so it is parked until that data exists.

## Knowing which tickets need a gate

Run:

```
node scripts/roadmap.js gates
```

It prints whether F4 is built, then every gated item grouped by what is left
to do:

- **Built, option off, gate waiting to be run**: your to-do list once F4
  exists. Each one needs its gate run.
- **Gate failed**: the change stays off; read the ticket to decide whether to
  rework it or drop it.
- **Being built**, **Not built yet**, **Gate passed**: for information.

Each line shows the item's kind and its option name.
`tests/ai-roadmaps.test.js` also fails if an item judged by seeded games does
not depend on F4, so `roadmap.js next` never offers one before its gate could
be run.

## Reading a result

A `**Gate:**` line in a ticket's Resolution looks like one of these:

```
**Gate:** pending F4 — `weightedProtectionDebt` defaults to false
**Gate:** passed — `weightedProtectionDebt`; node scripts/ai-batch.js gate --corp-option weightedProtectionDebt=true --improve highConsequenceBreaches --guard pointsStolen=0.2 --guard winRate=0.02
**Gate:** failed — `weightedProtectionDebt`; pointsStolen guard exceeded
```

The comparison output lists every metric, then one PASS/FAIL line for each
metric the gate names (numbers here are made up):

```
2800 paired games, 412 changed by the options
  metric                               baseline  candidate  difference  95% interval
  highConsequenceBreaches.count           1.840      1.520      -0.320  [-0.410, -0.230] (lower is better)
  pointsStolen                            4.100      4.160      +0.060  [-0.050, +0.170] (lower is better)
  winRate                                 0.460      0.470      +0.010  [-0.010, +0.030] (higher is better)
  PASS changed option effect
  PASS improve highConsequenceBreaches.count
  PASS guard pointsStolen tolerance 0.2
  PASS guard winRate tolerance 0.02
Gate: passed
```

The difference is always candidate minus baseline. The PASS/FAIL lines apply
the metric's direction for you. To read it yourself, look at the interval:

- For an improvement, the whole range must sit on the better side of zero.
  Here the breach range is entirely negative, so breaches went down.
- For a guard, the worst end of the range must stay inside the tolerance.
  Here the steals range tops out at +0.17, under the +0.2 allowed.

If any line fails, the gate fails, even if the average looks fine.
`FAIL changed option effect` means the option changed no game at all, so the
run says nothing about it; the ticket needs start boards that reach the
situation it changes.

## When to use your own judgement

Gates are evidence, not a verdict you must obey. Be sceptical when:

- **The thresholds are first guesses.** Numbers like "+0.2 points" and "−2
  points of win rate" were set by agents without data. When I0 records the
  first baseline you will see how much results vary naturally. Tighten or
  loosen thresholds then, in the ticket, before running its gate, and never
  after seeing the result.
- **Better against our Runner AI may not be better against you.** The Corp is
  measured against the project's own Runner AI. If that Runner has a blind
  spot, the Corp can learn to exploit it without improving against a human.
  Playing a few games yourself with a newly switched-on option is still
  worthwhile.
- **Something looks off.** A pass with a huge improvement, or a change that
  alters metrics it shouldn't touch, deserves a look at the games. The report
  stores every seed, so any game can be replayed.

## Where things stand

The AI and fix stack that predates these gates has a separate, one-time
[retrospective validation runbook](legacy-ai-stack-validation.md). Its branch
boundaries stay unmerged until F4 can compare the behavior-bearing historical
layers; the project owner runs the long commands and an agent prepares and
checks the reports. That audit does not replace I0 or any option's normal gate.

As of 2026-10-02:

- **F4 is built.** `node scripts/ai-batch.js gate ...` runs any gate from the
  terminal; see the [harness guide](ai-batch-harness.md). The first
  all-options-off baseline is committed under
  `tests/fixtures/ai-batch/baselines/`.
- **Gated items pending F4** can now have their gates run. `node
  scripts/roadmap.js gates` lists them under "Built, option off, gate waiting
  to be run". An item reviewed before F4 existed could not build its
  collectors or start boards, so `implement-ticket` builds those first.
- **Thresholds are still first guesses.** The committed baseline shows how much
  each metric varies naturally between deck pairs. Check a gate's numbers
  against it before running that gate.

## Words used here

| Word | Meaning |
|---|---|
| Gate | The ticket's pass/fail rule for switching a change on |
| AI option | A named on/off switch for one change, off by default (`CorpAI.DEFAULT_OPTIONS`, `RunnerAI.DEFAULT_OPTIONS`) |
| Baseline | Games played with the option off |
| Candidate | The same games played with the option on |
| Seed | A number that fixes every shuffle and random choice in a game, so it can be replayed exactly |
| Deck pool | The committed list of Corp-vs-Runner deck pairs every gate uses (`tests/fixtures/ai-batch/deck-pool.json`) |
| Metric / collector | A number recorded per game; F4 has core metrics, and items add their own collectors |
| 95% range | The span the true difference very probably lies in, given the games played |
| Improvement / guard | What the change must make better / what it must not make worse beyond a tolerance |
