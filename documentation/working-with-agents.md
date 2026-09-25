# Working with coding agents: what changed and why

Notes from one day (25 September 2026) of reworking how this project is run
with coding agents. It records what changed, the reasoning behind each change,
and the general lessons worth carrying into other projects. For the day-to-day
commands, see [workflow.md](workflow.md).

## Where we started

The project already had a good instinct for process: a folder-per-status ticket
board, debug logs turned into tickets, one model writing code and another
reviewing it, decision fixtures built from real games, and an AGENTS.md rule
that documentation might be wrong.

What it lacked was a way for those habits to hold without you enforcing them by
hand. The work in each chat depended on the prompt you typed. Rules lived in
prose that agents could skim past. Documents repeated each other and drifted.
And Codex usage was running into its limits.

## The core idea

Coding agents are fast, literal and forgetful, and they trust whatever they
read. A human developer notices that a roadmap contradicts a ticket, remembers
last week's decision, and skims past stale history. An agent does none of that
reliably; it acts on whatever is in front of it.

So the shift is from **prompting** agents to **building a system around them**.
The repository itself has to carry three things:

1. **The process**, as skills the agent loads when a task matches.
2. **The memory**, as documents organised so each fact has one home.
3. **The verification**, as tests and hooks that fail when the process or the
   documents drift.

Once those live in the repo, any agent, in any fresh chat, behaves the same
way, and you spend your time on decisions rather than on repeating
instructions.

## Six practices, and what we did for each

### 1. Encode procedures as skills, not prompts

A skill is a folder with a `SKILL.md`: a name, a one-line description, and
step-by-step instructions. The agent sees only the name and description until a
task matches, then loads the full steps. We wrote four, in `.agents/skills/`
(where Codex looks):

| Skill | What it standardises |
|---|---|
| `triage-log` | Debug log → ticket, with a reproduction that fails today |
| `implement-ticket` | Reproduce → validate → plan (if risky) → fix → hand off |
| `review-ticket` | Mechanical checks by script, then independent judgement |
| `implement-card-batch` | One card batch, replacing two near-identical runbooks |

**Why it's better:** the same task gets the same procedure every time, with no
copy-pasting. Detail costs nothing on unrelated tasks (unlike AGENTS.md, which
is loaded into every session). Skills are versioned with the code. And the
format is shared across tools, so the same files work in Codex and Claude Code.

### 2. Make "done" executable

Every bug ticket now starts with a **failing reproduction**: a test in
`tests/pending/` or a pending decision fixture. The fix is complete only when
that test passes and has moved into the passing suite **with its assertions
unchanged**. `scripts/ticket.js check` verifies this mechanically. In testing it
caught an implementer that weakened an assertion even though the test still
passed.

**Why it's better:** an agent can say anything in its final message. It cannot
make a failing test pass without fixing the problem, and it cannot quietly
change the test without the check noticing. We also tagged each root-cause
claim as [Verified] (shown by a test) or [Inferred] (from reading), so the next
agent knows which claims to re-check. That addresses the old pattern of tickets
needing "corrected diagnosis" sections.

### 3. Turn rules into checks

Anything a rule says that a script can verify became a test, so the suite (and
the Codex Stop hook, which runs it before an agent may finish) enforces it:

| Rule that used to be prose | Now enforced by |
|---|---|
| Document every AI hook in `ai.md` | `tests/ai-hook-docs.test.js` (found 40 undocumented, kept as a shrink-only list) |
| Run the tests before handing off | `.codex/hooks.json` Stop hook |
| Tests should not flood the agent's context | `run-all-tests.js` fails any passing test that prints more than 5 lines |
| Roadmap status matches the tickets | `tests/ai-roadmaps.test.js` |
| Architecture docs describe real code | Same test: every code name cited must exist |
| Card status is current | `tests/card-status.test.js` |
| `config.js` flags match playability decisions | Same test |
| Skills are well formed | `tests/agent-skills.test.js` |

**Why it's better:** prose rules drift. The hook rule was broken within days of
being written. A check runs on every change, costs nothing, and gives the agent
an exact error message saying what to fix. The limit is honest: a test can check
structure and facts, not whether a paragraph is still true. That part stays with
the implementer and reviewer.

### 4. One fact, one place: split documents by how often they change

The old roadmaps mixed three kinds of content in one file: stable rules,
descriptions of what was already built, and plans. Their specs were also copied
into backlog tickets. The result had already drifted: a layer was implemented
and reviewed under one ticket while the roadmap still called it a follow-up and
its own ticket stayed open, so an agent could have built it twice.

The new structure (in `documentation/corp-ai/` and `documentation/runner-ai/`,
with shared `ai-principles.md` and `ai-planning.md`):

| Document | Holds | Changes when |
|---|---|---|
| `principles.md` | Rules | Rarely, by decision |
| `architecture.md` | How the code works now | The code changes |
| `roadmap.md` | One short entry per item, fixed status | Priorities change |
| `specs/`, tickets | The full spec of one item | While refining or implementing it |

**Why it's better:** an agent picking up one item reads the principles, that
item's spec and one architecture section. For Corp Layer 4.1 that fell from
about 13,600 tokens (the whole roadmap) to about 3,000. For Install Phase 2 it
fell from about 24,000 to about 6,500. Nothing is duplicated, so nothing
contradicts. Status comes from a fixed vocabulary of five, so
`node scripts/roadmap.js next` can answer "what should I work on?" and the test
can catch drift. The originals are kept in each area's `legacy/` folder, with a
README mapping every old section to its new home, so you can compare.

### 5. Generate what can be measured

Hand-written counts go stale fastest. The Runner roadmap said 194 Runner cards
with 90 never kept; the code today has 232 and 105. The card backlog hand-counted
definitions per set. Both are now **generated** by `scripts/card-status.js` into
`documentation/card-status.md`, and a test fails if the file is out of date.

**Why it's better:** the document cannot lie, because it's rebuilt from the
code, and plans can quote it instead of typing numbers that rot.

### 6. Decisions stay human, recorded once

Some things can't be measured. Creation and Control has every card defined and
no placeholders, yet it isn't implemented. So playability is **your decision**,
recorded in `documentation/card-sets.md`. The code has to follow it (the test
fails if `config.js` disagrees), and tickets default to "the playable sets".
Likewise, `implement-ticket` stops and writes a plan for your approval when a
change is risky: it touches shared heuristics or widely used engine functions,
changes a contract or a test expectation, or disagrees with the ticket.

**Why it's better:** agents do the work; you make the calls. You review the
**plan**, where decisions are made, instead of reading every line of the diff
afterwards.

## Token efficiency: where the usage actually went

Codex's local session logs showed 260 million input tokens against 1.2 million
output. **Cost comes from context, not from writing code**: every tool call
re-sends the whole conversation, so anything read or printed early is paid for
again on every later step. The five longest sessions used 31% of everything.

The biggest sources, and what we changed:

| Source | Share | Change |
|---|---|---|
| Test output | 26% | Passing tests are silent; the suite prints about 6 tokens instead of about 3,000. One test printing 125 PASS lines accounted for roughly an eighth of all usage. |
| Reading `ai_corp.js` (62k tokens) and set files | 28% | `scripts/show.js` prints exactly one card or function; AGENTS.md says to search and read small windows |
| Card metadata in batches (2 MB file) | 14% of batch sessions | `scripts/batch-brief.js` prints a whole batch in about 600 tokens, with similar implemented cards to copy |
| Card images | 4% overall | Skills and AGENTS.md say not to open them |

The other big lever is **splitting work by cost**:

- **Claude chat** (free, reads the repo on GitHub) does reading and writing:
  triage drafts, plans, reviews.
- **Codex** (limited) does only what needs execution: confirming reproductions
  and changing code.
- **Scripts** (free, deterministic) do the mechanical checks.

Habits matter too: one ticket per chat, point at file paths instead of pasting
logs, and don't lower the reasoning level to save tokens. Reasoning and output
were under 0.5% of usage.

## How a piece of work flows now

```text
debug log ─▶ triage (Claude chat drafts; Codex confirms the failing test)
                │
                ▼
          ticket in bugs/ ─▶ $implement-ticket (Codex; stops for a plan if risky)
                                   │
                                   ▼
                    node scripts/ticket.js check  (free, mechanical)
                                   │
                                   ▼
                    review (Claude chat, from the pushed diff)
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
                done/                        remediation/ ─▶ implement again

Roadmap work:  node scripts/roadmap.js next ─▶ raise <ID> ─▶ same flow as above
Card batches:  $implement-card-batch (starts from batch-brief.js)
```

Every step updates the documents it touches: the ticket's folder is its
status, `ticket.js move` keeps roadmap links valid, `implement-ticket` updates
`architecture.md`, and `review-ticket` marks the roadmap item done. The suite
fails if any of these is skipped.

## Lessons worth carrying to other projects

1. **Documentation for agents is not documentation for humans.** Humans
   benefit from narrative and history; agents need one current answer per
   question, small enough to load, with history moved out of the way. The good
   news is that the agent-friendly version usually reads better for people
   too.
2. **If a script can check it, don't leave it in prose.** Every rule we
   converted found existing violations straight away (40 undocumented hooks,
   stale counts, config flags contradicting reality).
3. **Verify, don't trust, including AI output.** The AGENTS.md rule to validate
   documentation paid off repeatedly. It also applied to the agents helping
   today: a research agent claimed Claude Code ignores AGENTS.md and can't use
   symlinked skills, and the official docs said the opposite. My own scripts had
   four bugs that only showed up when checked against real data.
4. **Measure before optimising.** The assumption that output or reasoning cost
   the most was wrong; the logs showed context re-sending dominated, and the
   single worst offender was a chatty test.
5. **Keep humans on decisions, agents on execution.** Plan approval, playability
   and scope are yours; everything repeatable is scripted or delegated.
6. **Build in small, reviewable steps.** Each change today was committed on its
   own with the suite green, which made it easy to see what each one did.

## Open items

- Run Vantage Point batch 11 with `$implement-card-batch` and compare its token
  usage with earlier batches, to see whether the batch brief and quiet tests
  worked.
- Trust the Codex Stop hook the first time Codex asks (or with `/hooks`).
- Check whether Claude chat can see the `.agents/` folder through its GitHub
  access; if not, paste the skill file into the chat.
- Ready to implement: the Corsair/Lampades stealth-credit bug, the Runner
  information leaks (D3), the special-breaker check, Kit's hook, and the Runner
  trash-cost behaviour. The Runner AI has not been worked on yet; D3 is the
  natural place to start.
- Possible next guardrails: a check that fails when `ai_corp.js` or
  `ai_runner.js` gains a new card-title comparison, and a Codex pre-command hook
  that blocks raw reads of the card metadata or card images.

## Where things are

| For | Look at |
|---|---|
| Commands and the day-to-day flow | `documentation/workflow.md` |
| Rules for both AIs | `documentation/ai-principles.md` |
| How roadmaps, statuses and specs work | `documentation/ai-planning.md` |
| Corp AI / Runner AI | `documentation/corp-ai/`, `documentation/runner-ai/` |
| Which sets are playable / measured status | `documentation/card-sets.md`, `documentation/card-status.md` |
| Instructions every agent reads | `AGENTS.md` |
| The skills | `.agents/skills/` |
