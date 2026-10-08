# What went wrong with gate boards, and what fixed it

Written 2026-10-02, after the hosted-Trojan rez ticket
([corp-silently-declines-rez-of-ice-hosting-a-trojan.md](bugs/code-review/corp-silently-declines-rez-of-ice-hosting-a-trojan.md)).
A short record for the owner, so the same mistakes are recognisable if they
come back.

## The short version

A gate was "passed" on boards the agent had edited until the change looked
good. On the real board from the log, the same change made the Corp play
worse. Nothing in the process stopped the edits. Fixing that took a tool
(boards are now built from logs, never by hand), a few written rules, and a
new way to close tickets whose gate fails.

## What happened

1. **The change could not fix the logged case.** The first design only rezzed
   hosted ICE that would stop the run. In the log, the Runner's Rising Tide
   breaks the ICE for 2 credits, so that design never changes the logged
   decision. One replay of the log's board would have shown this. Nobody
   ran it, at planning time or at pickup.
2. **The boards were edited to make the change fire.** The gate needs the
   change to alter at least one game. On the real board it didn't, so the
   agent swapped the ICE for one the Runner couldn't break and moved the
   Runner's breaker into the grip. Rezzing was then right by construction,
   and the gate "passed" (win rate 0.15 → 0.55).
3. **The strategy was misread.** The agent assumed ICE is only worth rezzing
   if it ends the run. The owner pointed out that making the Runner pay
   every run also weakens their economy, which is what the log complained
   about.
4. **On the real board, the honest test failed.** Removing the 5× rule
   (rezzing hosted ICE whenever affordable) made the Corp lose more points
   (+0.48 per game). That's a real result, but it took hours to reach.
5. **Time was lost on the way:**
   - one board per named Trojan, each a full 15-minute gate run;
   - an ad-hoc game script that ran games one by one and printed nothing;
   - a checkout stash in the middle of a gate run.

## What fixed it

| Problem | Fix | Where |
|---|---|---|
| Boards edited by hand until the change fired | `scripts/start-board.js` builds boards from a log's snapshot or dump. It allows only crash-fix swaps, restoring a stolen agenda, credits and clicks, and notes, and records each. A test rebuilds every board and fails on any hand edit. | [ai-batch-harness.md](ai-batch-harness.md#building-a-start-board) |
| Changing the Runner's breakers or the deciding cards | The builder refuses the Runner's rig and hosted cards; replaced ICE is named in the board's notes | same |
| The design never checked against the real case | Before planning a gated ticket with a log, replay the log's board with the change off and on; if the decision doesn't move, re-plan | `implement-ticket` step 3 |
| One board per card, each costing 15 minutes | Gates pick boards by tag (`--start-tag`) and run with `--budget 1400`: one baseline and one candidate run, about 8 minutes each, however many boards | [ai-planning.md](ai-planning.md#writing-a-gate) |
| Reading why a result moved took ad-hoc scripts | `node scripts/ai-batch.js replay ... --diff` replays one batch game exactly and shows only the lines that changed | [ai-batch-harness.md](ai-batch-harness.md#reading-why-a-result-moved) |
| A failed ticket would sit open with a dead option | A failed gate closes the ticket ("not adopted" Outcome line), removes the option, and the next idea gets a new ticket. `ticket.js check` enforces this. | [ai-planning.md](ai-planning.md#when-a-gate-fails) |
| Not knowing a ticket's state without reading all of it | Every ticket gets an `**Outcome:**` line under its title | same |
| Gate rows that can't be expressed (an "unless" clause), or that pool across boards by accident | Written rules: no conditional rows, and metrics pool across the boards in one command | [ai-planning.md](ai-planning.md#writing-a-gate) |

## Where things stand

- The hosted-Trojan ticket is closed as not adopted. Its logging fix stays.
- The next idea, rezzing when the Runner's per-run tax over expected runs
  beats the rez cost, is
  [hosted-ice-rez-ignores-repeated-tax.md](bugs/hosted-ice-rez-ignores-repeated-tax.md).
  Its gate uses the real board, selected by tag.
- The builder is roadmap item F10, in code review on branch
  `roadmap/F10-real-board-start-library`.
- Still open: Scatter Field's crash
  ([corp-install-choice-crashes-on-null-skip-option.md](bugs/corp-install-choice-crashes-on-null-skip-option.md)).
  Until it's fixed, boards from logs with Scatter Field need a recorded
  crash-fix swap.

## What to watch for

- A gate that passes by a huge margin. Check its boards' notes to see what
  was changed.
- A ticket that adds a start board without `scripts/start-board.js`. The
  rebuild test will catch it.
- A gated ticket planned without a replay of its source log.
