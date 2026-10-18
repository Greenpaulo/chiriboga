# Downfall implementation notes

## Batch 8 — 26036–26040 (2026-10-16)

Implemented on `cards/downfall-batch-8`, from local `main` at `60fa0d7`, in
`/private/tmp/chiriboga-downfall-batch-8`. Batch 1 and batches 2–7 are maintained
separately and are not included in this branch. The Downfall tracker setup and
Vantage Point archive/record were copied from the batch 1 worktree; its gameplay,
shared gameplay changes and completion claims were not copied. The tracker-aware
agent-script regression was reused to remove its historic Vantage Point batch assumption.

### Mechanics and baseline AI

- Fully Operational resolves the first choice before counting qualifying
  remotes; subsequent repeats use that fixed count. Draw and operation-credit
  responses finish before the next choice. Its real Corp economy selector
  plays it; mode selection draws into a small HQ when funded and otherwise
  gains credits.
- Red Level Clearance chooses two different modes in either order, waits for
  draw/install completion, excludes agendas from the install choices and pays
  normal install costs. An impossible install instruction resolves without an
  effect. Its economy selector plays it, choosing credits followed by useful
  draw or the refunded click. Human choices retain all four modes.
- Cold Site Server spends action clicks to add power counters, charges both
  clicks and credits before declaring a run, and clears counters at the next
  Corp turn start while active. The real Corp main-phase selector banks up to
  three counters on an agenda remote after higher-priority tactics; placement
  values protected remotes. The run calculator accounts for entry costs on
  complete and incomplete routes, uses pool credits rather than future
  bad-publicity credits, and does not charge again on mid-run recalculation.
- Hyoubu Institute reveals a random grip card or the top stack card, with empty
  zone and action-click guards. Shared reveal notifications identify the
  revealing player, including mandatory Runner R&D access reveals. It gains
  one credit on the first Corp reveal each turn. The real Corp main-phase
  selector uses a spare click for information and income, without examining
  either hidden zone while selecting a target.
- Project Yagi-Uda gains counters for advancement past three and offers legal
  HQ/root/ICE swaps only during a run from the Corp score area. Swaps preserve
  the exact position and a sole-card remote, respect root/Region/destination
  restrictions, perform uninstall interrupts and hosted-card cleanup, reset
  departing counters and install incoming cards unrezzed without costs.
  Install responses finish before the Runner's optional jack-out. Swapping
  encountered ICE ends that encounter; approaching ICE retains its position.
  The real paid-window selector rescues an exposed agenda or replaces currently
  approached ICE with a stronger affordable piece. The Runner recalculates the
  remaining route to choose whether to continue. Overadvancement aims for four.

Focused evidence is in `tests/downfall-batch8.test.js`: human mode sequencing,
real legal-action discovery/payment/movement, both operation economy consumers,
Corp setup and paid-window selectors, Runner post-swap selection, run calculator
resource/cleanup contrasts, and reveal actor/once-per-turn contrasts.

### Shared contracts

`AdditionalRunCosts(server)` sums active `modifyRunClickCost` and
`modifyRunCreditCost` modifiers. Basic runs and Run-event play checks reserve
these resources; `MakeRun(server, ignoreAdditionalCosts = false)` pays them
before declaration and before granting bad-publicity credits. The explicit
waiver is available to effects such as Always Have a Backup Plan (implemented
on its separate branch; reconcile signatures when integrating).

`GainCredits` accepts an optional fifth `afterGain` callback, invoked after
operation/agenda credit-gain responses, allowing repeated instructions to wait.
`Reveal` accepts an optional sixth `revealingPlayer` argument and emits
`automaticOnReveal(card, revealingPlayer)`. The default actor is the active
player, except mandatory R&D access reveals, which belong to the Runner.

The run calculator's House of Knives check now identifies that agenda before
counting its counters; Yagi-Uda counters do not represent net damage.

### Rules and metadata sources

The [Downfall release notes](https://nullsignal.games/products/downfall/dfreleasenotes/)
clarify Fully Operational's repeat-count timing and Yagi-Uda's approach,
encounter and immediate jack-out behavior. The
[Comprehensive Rules, section 8.8](https://rules.nullsignal.games/?r=section_swapping_cards)
require legal destinations and unrezzed incoming Corp cards, and distinguish a
swap from the normal install procedure. Focused tests preserve those rulings.

These five definitions had no ELO property on main. Exact
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking), retrieved
2026-10-16: Fully Operational 1879, Red Level Clearance 1831, Cold Site Server
1455, Hyoubu Institute 1147, Project Yagi-Uda 1536. Other cards were untouched.

### Optional strategy work

Compare Fully Operational's marginal draw/credit mix with competing economy;
compare all Red Level install and click sequences; calibrate Cold Site's counter
budget and placement against scoring progress; value Hyoubu information against
other spare-click actions; compare Yagi-Uda swaps/overadvancement with rez,
agenda-access, immediate-win and future-counter plans. Its initial swap policy
uses known Corp cards and printed ICE strength, rather than comparing full
counterfactual defense routes. Independent review has not been requested.

### Verification

Passed on Node 20.19.0: `tests/downfall-batch8.test.js`,
`tests/agent-scripts.test.js`, `tests/ai-hook-docs.test.js`,
`tests/eternal-format.test.js`, `tests/deckbuild-format-pool.test.js`, and
`tests/decklauncher-identity-change.test.js`; syntax and diff checks pass.
All five batch cards show no unfinished markers. Card status was regenerated.

The first full run exposed the old agent-script assumption that active batch 3
must be complete. Its replacement checks the actual tracker range and compares
marker reports with source, retaining the assertion for completed batches.
A later focused check also covers charging Cold Site entry again on a forced
subsequent run, while mid-run recalculation owes none.

### Resume verification (2026-10-18)

The previous full runs completed with three failures: the posture-feedback VM
harness lacked the new run-entry helpers, and this temporary worktree lacked
ignored local art required by flipped-identity and Vantage Point integration
checks. The posture-only harness now explicitly supplies a zero-modifier run
cost environment; the batch test continues to exercise real cost utilities,
legality and payment. Local art is linked under the ignored `images/` directory
from the main workspace, without adding image assets to the change.

Passed again on Node 20.19.0: the three previously failing test files,
`tests/downfall-batch8.test.js`, `tests/agent-scripts.test.js`,
`tests/ai-hook-docs.test.js`, and all three required shared format checks.
Card status was regenerated and the batch brief confirms no unfinished markers
for all five cards. No changes were made to other batches.

Final full regression verification passed on Node 20.19.0: all 95 test files,
including Corp decision fixtures and decision snapshots. The run completed with
exit status 0, recorded in
`/private/tmp/chiriboga-downfall-batch-8-resumed-tests.status`; its summary is in
`/private/tmp/chiriboga-downfall-batch-8-resumed-tests.log`.
Batch 8 is Complete; its optimisation row is Pending for the strategy items
above. Other batch statuses and separate-branch ownership remain unchanged.
