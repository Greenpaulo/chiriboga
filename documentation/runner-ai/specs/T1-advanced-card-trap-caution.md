# T1 Caution with advanced face-down cards

**Roadmap item:** T1 · **Depends on:** F4 · **Sets:** playable sets
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`
**Verified against code:** 3f46a2a

## Goal

Make the Runner treat an advanced face-down card in a remote as possibly a
trap, the way a human player does, instead of assuming it is an agenda and
running at it almost every time.

## Current behaviour

Run selection values an unseen remote root card at 5.0 when it has 1–3
advancement counters, 1.5 above 3 and 1.0 with none (`ai_runner.js` around
the "not known to runner" branch of server potential; see
[architecture: run selection](../architecture.md#run-selection-and-the-run-calculator)).
The run calculator adds only Urtica Cipher-style net damage and a Weyland
Clearinghouse credit cost as trap costs. Nothing uses what the Corp's deck
has shown (traps seen or accessed so far) or which traps its faction can play.

**Evidence (I4 `remoteAgendaRisk` baseline, 2026-10-23, 7000 games).** A
remote holding an advanced agenda with no ICE was stolen in 43 of 47 Runner
turns (0.92). Source: [I4 calibration fit cells](../../corp-ai/measurements/I4-3f46a2a-agenda-exposure-calibration.json)
(`fitCells["advanced:bare"]`): sum all margin buckets, 4 + 8 + 31 = 43
steals over 5 + 9 + 33 = 47 remote-turn observations. The filter is a remote
holding an agenda at Runner-turn start, zero installed ICE and at least one
advancement counter; a success means one of those agendas is stolen by that
turn's end. A remote may contribute on multiple turns, so these are not 47
independent games.
With no counters, the same bare remote was stolen at 0.12. With
ICE, advanced agendas were stolen at 0.26–0.34 per Runner turn against
0.09 unadvanced.

## Design

- Replace the fixed 5.0/1.5/1.0 values with an expected value: chance the
  card is an agenda against chance it is a trap, from public information
  only (Corp faction and identity, cards seen or accessed this game, an
  agenda-count prior inferred from public information, advancement count
  and how long it has sat there).
- Charge the trap's expected cost (damage, tags, credits) in the run
  calculator from the same estimate, not only for the named cards above.
- Keep advanced cards attractive when the Runner can afford the worst case
  (enough cards in grip, no tags to fear).

## Safety and information boundary

Only public information: no peeking at the face-down card, R&D order or the
Corp's hand or hidden remaining agenda count. Infer the agenda prior from
public deckbuilding constraints (deck-size bounds and agenda-point minimums)
and publicly revealed/scored/stolen agendas, with uncertainty about unseen
cards and deck composition. Never enumerate hidden zones or read the actual
deck list to obtain this prior. Card hooks on Corp cards are consulted only
for cards the Runner can see, or as deck-level priors (which traps exist), never for the
specific face-down card.

## Test scenarios

1. Corp has shown traps this game; an advanced bare card is no longer the
   automatic run target when a central offers similar value.
2. Corp with no traps in faction or seen; the Runner still runs an advanced
   bare card.
3. Runner with a full grip and spare credits still checks an advanced card.

## Acceptance gate

F4 gate. Option `advancedCardTrapCaution` (Runner AI), off in the baseline
and on in the candidate. Committed core-v1 deck pool, paired seeds,
200 games per deck pair, bootstrap 95% intervals.
Collectors: `runnerTrapRisk` (to be built by T1; adds
`runnerTrapRisk.damageTaken`, the actual net/meat/brain damage suffered by the
Runner per game, and `runnerTrapRisk.flatlineLoss`, 1 for a Runner flatline
loss and 0 otherwise; both declare lower-is-better).
Starts: none. If the pool shows no changed games, record that result and add
real-log-derived trap decision boards under the start-board protocol before
claiming a gate pass.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `runnerTrapRisk.damageTaken` | lower | interval of the improvement above 0 |
| Improve | `runnerTrapRisk.flatlineLoss` | lower | interval of the improvement above 0 |
| Guard | `winRate` (Corp wins) | lower for Runner | regression at most 0.02 |
| Guard | `pointsStolen` | higher for Runner | regression at most 0.2 |
| Guard | `pointsStolenByServer.remote` | higher for Runner | regression at most 0.2 |

Remote points already have a core metric and need no new collector. Damage
and flatline metrics require passive observation of actual damage resolution
and the game's terminal reason; do not infer flatline losses from Corp wins.
The collector, option and any needed start boards are T1 implementation work,
not existing capabilities or gate evidence.

Gate command (after T1 implements the option and collector):

```sh
node scripts/ai-batch.js gate --side runner --games 200 --runner-option advancedCardTrapCaution=true --collector runnerTrapRisk --improve runnerTrapRisk.damageTaken --better runnerTrapRisk.damageTaken=lower --improve runnerTrapRisk.flatlineLoss --better runnerTrapRisk.flatlineLoss=lower --guard winRate=0.02 --guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.2
```

Rerun with Corp trap play (I5) on in both arms once both exist.

## Things to consider

- Corp item I5 (assets and ambushes) will make the Corp better at traps;
  without T1, I5's gate measures a Runner that walks into them. Run I5's gate
  against a baseline that has T1 on if T1 lands first, or rerun it after.
- The 47-case bare-remote sample is small and comes from a Corp that rarely
  leaves advanced agendas unprotected.

## Acceptance criteria

- Arbitrary advanced-card values replaced by a public-information estimate.
- Trap costs come from that estimate, not a title list.
- Build and test `runnerTrapRisk`, including actual damage and flatline attribution.
- Verify gate setup with `--quick` and at least one changed game; add and test real-log-derived starts if required.
- Gate passed; `architecture.md` updated.
