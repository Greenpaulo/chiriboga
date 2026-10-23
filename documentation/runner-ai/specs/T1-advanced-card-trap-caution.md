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
turns (0.92). With no counters, the same bare remote was stolen at 0.12. With
ICE, advanced agendas were stolen at 0.26–0.34 per Runner turn against
0.09 unadvanced.

## Design
- Replace the fixed 5.0/1.5/1.0 values with an expected value: chance the
  card is an agenda against chance it is a trap, from public information
  only (Corp faction and identity, cards seen or accessed this game, how
  many agendas are still unaccounted for, advancement count and how long it
  has sat there).
- Charge the trap's expected cost (damage, tags, credits) in the run
  calculator from the same estimate, not only for the named cards above.
- Keep advanced cards attractive when the Runner can afford the worst case
  (enough cards in grip, no tags to fear).

## Safety and information boundary
Only public information: no peeking at the face-down card, R&D order or the
Corp's hand. Card hooks on Corp cards are consulted only for cards the
Runner can see, or as deck-level priors (which traps exist), never for the
specific face-down card.

## Test scenarios
1. Corp has shown traps this game; an advanced bare card is no longer the
   automatic run target when a central offers similar value.
2. Corp with no traps in faction or seen; the Runner still runs an advanced
   bare card.
3. Runner with a full grip and spare credits still checks an advanced card.

## Acceptance gate
F4 Runner gate (`--side runner`): Runner win rate not worse; Runner damage
and flatline losses lower; points stolen from remotes not worse by more than
a small tolerance. Rerun with Corp trap play (I5) on once both exist.

## Things to consider
- Corp item I5 (assets and ambushes) will make the Corp better at traps;
  without T1, I5's gate measures a Runner that walks into them. Run I5's gate
  against a baseline that has T1 on if T1 lands first, or rerun it after.
- The 47-case bare-remote sample is small and comes from a Corp that rarely
  leaves advanced agendas unprotected.

## Acceptance criteria
- Arbitrary advanced-card values replaced by a public-information estimate.
- Trap costs come from that estimate, not a title list.
- Gate passed; `architecture.md` updated.
