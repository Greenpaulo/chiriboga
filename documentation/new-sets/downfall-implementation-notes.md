# Downfall implementation notes

## Batch 1 — 26001–26004

Codex, 2026-10-16, temporary worktree. Existing partial implementations were
verified rather than credited in advance. Vantage Point's records and review
findings were preserved during the implementation-set transition.

- **Isolation:** legal installed-resource trash cost, paid unpreventably before
  play triggers and income, including response sequencing and cancellation.
  Real Runner economy command and follow-up selection cash out an exhausted
  resource; no target and insufficient credits reject the play. Live resources
  are retained. Its existing economy-list consumer now preserves target choices.
- **Demolisher:** +1 MU, shared trash-cost discount, one credit on the first
  Runner-controlled Corp-card trash each turn. Tracks first-time state while
  inactive; Corp sacrifices, hosted casualties and simultaneous groups do not
  manufacture extra rewards. Shared trash attribution captures the controller
  before priority changes; automatic effect ownership is scoped and restored.
  The real selector installs one useful affordable console. Actual trash cost
  and MU evaluators, credits, both-turn resets and inactive timing are covered.
- **Chisel:** legal ICE hosting, counter-based reduction, mandatory encounter
  growth or preventable host trash. The condition is checked before adding a
  counter, so reaching zero leaves the ICE for this encounter. Host movement
  uses engine encounter cleanup and trashes hosted Chisel. Protected strength,
  purge, missing hosts and disabled-host installation are accounted for. Real
  Runner install selection, full run calculations and Corp planning cover its
  direct effects without changing the board. The ICE model now exposes
  `knownToEvaluator` so synthetic hidden strength cannot become free trash.
  Existing counters are already in `Strength`; Corp shortcut adjustment adds
  only the prospective encounter counter, avoiding double counting.
- **Stargate:** click and per-turn limit, R&D run, mandatory successful-run
  replacement, revealing the top three (or fewer), legal mandatory trash and
  order/visibility restoration. A revealed trashed card remains faceup in
  Archives; prevention restores it facedown in R&D. The delayed effect survives
  the program leaving play. Failed/redirected runs and run end clear state.
  Real Runner commands install before a funded R&D run and activate the card;
  real selection chooses the highest ELO revealed legal target. Successful-run
  suppression and spent-use tests prevent useless activation. Empty R&D does
  not create an impossible choice. No hidden deck content informs pre-run AI.

### Engine contracts and scope

`additionalPlayCostTrash` sequences a selected trash additional cost through
`Play` before `automaticOnPlay`. `Trash` accepts an optional explicit actor,
retains it through prevention and supplies actor/direct-card arguments to
trash callbacks; old callbacks ignore the additional arguments. Automatic
source ownership is restored in `finally`. See `engine_patterns.md` for the
contracts. Callers explicitly forcing another player to trash must name that
player. This does not attempt a global revision of older card implementations.

The batch helper regression now reads the active queue and verifies each source
marker report, rather than assuming Vantage Point batch 3 is always complete.
No existing gameplay assertions were removed or relaxed.

All four cards previously lacked ELO. Exact values from
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking), checked
2026-10-16: Isolation 1269, Demolisher 1371, Chisel 1663, Stargate 1710. No other
card's ELO or gameplay was changed.

### Focused evidence and optimisation

`tests/downfall-integration.test.js` covers the mechanics and real consumers
above. Browser rendering and interactive manual games were not tested; the
ignored artwork is linked from the original checkout for read-only
filesystem integration checks.

Queue deeper strategy separately: Isolation's competition with other economy
and willingness to cash out a still-useful resource; Demolisher against other
consoles; Chisel host rankings and repeated-run setup; Stargate revealed target
value versus ELO, an immediate ordinary agenda steal, competing breach
replacements and Archives follow-up plans. These are optional policy advances;
baseline mechanics, legality, direct accounting and usable choices are tested.

### Required verification

All 95 test files pass under Node 20.19.0 using the full
`node tests/run-all-tests.js` command, including Corp decision fixtures and
decision snapshots; known-red pending reproductions remain excluded. The
focused batch, hook documentation, hypothetical mutation, empty-trash, Corp
security, Vantage Point integration and batch 13 checks also pass. Required
Eternal-format, format-aware deckbuilder and identity-change checks pass.
Edited JavaScript syntax checks and `git diff --check` pass. The first full
run identified the old tracker-test assumption and an empty-trash context
lookup; both were repaired before the passing full run.

Batch 1 is Complete. Batch 2 (26005–26009) is next; the set remains In progress,
hidden and untested. Optional strategy work is queued separately. No commits
or pushes were made.
