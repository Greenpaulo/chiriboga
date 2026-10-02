# F10 Real-board start library for gates

**Roadmap item:** F10 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-planning.md` (Writing a gate), `documentation/ai-batch-harness.md` (Starting from a saved board)
**Verified against code:** 5b8952f (2026-10-02)

## Goal
Gates whose option matters only on boards the deck pool rarely reaches need
start boards. Today each ticket hand-builds them, which caused avoidable
errors on
[corp-silently-declines-rez-of-ice-hosting-a-trojan.md](../../bugs/corp-silently-declines-rez-of-ice-hosting-a-trojan.md):
boards were edited until the option fired, and one board per named card made
gate cost grow with the number of boards. F10 makes start boards come from real
games, built by a tool, stored in one shared library, and run under a fixed
game budget. Every board-based gate then costs the same (one baseline and one
candidate run, about 8 minutes each) and tests real positions.

## Current behaviour
- `node scripts/ai-batch.js --start <fixture|dir>` begins every game from a
  corp-decision fixture board. The pool's decks fill R&D and the Stack unless
  the fixture lists them, and `resolveStarts()` rejects cards outside the
  pool's trusted sets.
- A gate runs every start × every pair × 200 seeds. Each extra board adds
  1,400 games per half (about 8 minutes).
- Metrics pool across all `--start` boards in one command, so a per-board
  check needs its own command.
- Start boards are hand-written by each ticket under
  `tests/fixtures/ai-batch/starts/`, typically by editing a log's
  `RunnerTestField`/`CorpTestField` dump with `sed`. Nothing checks which
  changes were made. "Start boards come from real boards" in
  `ai-planning.md` states the rule, but no tool enforces it.
- A debug log's dump is the end-of-log state, not the decision-time state.
  Rebuilding the board before the decision (an agenda that was stolen at the
  decision, for example) is manual.

## Design
- **Builder script** `scripts/start-board.js <log> --out <name>`: writes
  `tests/fixtures/ai-batch/starts/<name>.txt` from the log's last
  reproduction dump or a decision snapshot (preferred when present). Allowed
  edits are explicit flags, each recorded as a `NOTE` line automatically:
  - `--replace <id>=<id>`, only for a card that crashes the engine or is
    outside the pool's sets, with `--reason`;
  - `--restore-stolen` and similar decision-time reconstructions;
  - `--setup "<js>"` for credits and clicks.

  No flag edits the Runner's rig or the ICE in a server. Any change outside
  the flags fails.
- **Library and tags:** every board carries `// TAGS:` naming the situations
  it contains (for example `hosted-card-on-ice`, `tax-ice`,
  `breakable-ice`). They are derived from the board where possible, such as
  hosted cards and breakers present. A gate selects boards with
  `--start-tag <tag>` instead of naming files.
- **Fixed budget:** with several boards, a gate splits its game budget
  across them (default 1,400 games per half, seeds spread evenly), so cost
  does not grow with the number of boards. Paired seeds stay identical
  between the two halves.
- **Reachability check:** `scripts/start-board.js --check <board>
  --corp-option <name>=true` replays the board's recorded decision off and
  on (as `implement-ticket` step 3 requires) and reports whether the option
  changes it.

## Safety and information boundary
Boards are game states; nothing here feeds hidden information to either AI.
The builder copies the dump's hidden cards (R&D order, the Stack) as the
engine recorded them, exactly as fixtures do today.

## Test scenarios
1. Building a board from a log with a reproduction dump yields a fixture
   that loads under `--start` with no engine errors, and its cards match the
   dump apart from listed flags.
2. A `--replace` without `--reason`, or one that targets an installed
   breaker or ICE, fails.
3. `--start-tag` selects exactly the boards with that tag.
4. With three boards and the default budget, a gate plays 1,400 games per
   half, and the same seeds in both halves.
5. `--check` reports "changes the decision" for a board and option known to
   change it, and "unchanged" for one known not to.

## Acceptance gate
N/A — deterministic fix (principle 4): test infrastructure that changes no
AI decision; its oracle is that boards reproduce their source dump apart
from listed, allowed edits, and that the game budget and seed pairing hold.

## Things to consider
- Existing boards under `tests/fixtures/ai-batch/starts/` should be rebuilt
  with the builder, and their gates re-run if any board changes.
- Splitting the budget across boards lowers games per board; a gate that
  needs a per-board result still uses its own command.
- Logs from sets outside the pool cannot become boards until their set is
  trusted (a new baseline), or the card is replaced with a listed reason.

## Acceptance criteria
- [ ] `scripts/start-board.js` builds, tags and checks boards as designed, with tests.
- [ ] `ai-batch.js` supports `--start-tag` and the fixed game budget, with tests.
- [ ] Existing start boards are rebuilt with the builder.
- [ ] `ai-planning.md` ("Writing a gate") and `ai-batch-harness.md` describe the library, tags and budget.
- [ ] `node tests/run-all-tests.js` passes.
