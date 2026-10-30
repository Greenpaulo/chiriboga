# T3 Face-down card risk from public information

**Roadmap item:** T3 · **Depends on:** none · **Sets:** playable sets
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, [T1](T1-advanced-card-trap-caution.md), [T2](../../backlog/T2-check-fresh-remote-installs.md)
**Verified against code:** 582e580 (2026-10-30)

## Goal

Price the risk of breaching a server with face-down cards the way a human
does: from the Corp's faction, the cards it has shown this game and the
card's advancement, instead of fixed guesses about a few named cards. The
Runner should fear traps where the evidence points to them and not
elsewhere. This makes AI-vs-AI batches closer to owner playtests, alongside
T2.

## Current behaviour

The run calculator (`runcalculator.js`, breach costs around lines 1243–1308)
charges an unknown root card as follows, for every Corp:

| Card state | Assumed cost | Stands for |
|---|---|---|
| Unadvanced, any server | 1 net damage per server with one or more | Hokusai Grid |
| Advanced (Weyland: 1–4 only) | 2 + advancements net damage | Urtica Cipher |
| 5+ advancements, Weyland | 3 credits | Clearinghouse |

Jinteki: Personal Evolution adds one more net damage when an agenda might be
accessed. No other trap (Snare!, ambush assets) is priced, and nothing uses
traps seen this game or the Corp's faction except the two cases above.

**Evidence (T2 investigation, 2026-10-30, 420 games at 582e580).** Every
breach of a bare remote with one unknown card cost at least 1.3 (1 assumed
net damage), 2.6 against Personal Evolution. Only one of the seven pool Corp
decks contains Hokusai Grid. The cost alone trips the Runner's low-value
"Favouring setup" gate (`ai_runner.js` around 2508), which accounts for 68%
of skipped fresh-remote decisions (see T2).

## Design

1. One estimate, used by the run calculator for every unknown root card
   (remotes and central upgrades): expected trap cost from public
   information only.
   - Faction prior: in-faction traps likely, out-of-faction (influence
     splash) possible but unlikely.
   - Evidence this game: traps seen, accessed or trashed raise their weight.
   - Card state: advancement and how long it has sat there select which
     traps are plausible (e.g. Urtica Cipher scales with advancement;
     Hokusai Grid and Snare! do not need it).
2. The expected cost feeds path cost (the value of a run). Flatline safety
   keeps the worst plausible damage, so a splashed trap can never kill the
   Runner.
3. Retire the fixed Hokusai, Urtica and Clearinghouse branches under the
   option; keep them as the option-off path.
4. Behind a Runner option (proposed `faceDownCardRisk`, default off).

## Safety and information boundary

- Only public information: faction, identity, cards revealed, accessed,
  trashed or scored this game, advancement counters and install timing.
- No reading of the face-down card, R&D order, the Corp's hand or its deck
  list. Card hooks are used as deck-level priors (which traps exist in which
  faction), never for the specific face-down card.

## Test scenarios

1. Non-Jinteki Corp, no traps seen, bare remote with one unadvanced card:
   breach cost carries no assumed net damage (or only a small expected
   share); logged reason names the estimate.
2. Jinteki Corp, or Hokusai Grid seen this game: the same board carries the
   net damage, as today.
3. Snare! accessed earlier this game: an unadvanced card now carries
   expected trap cost.
4. Grip of one card against a plausible damage trap: the Runner does not run
   (flatline safety uses the worst case).

## Acceptance gate

Human gate. Option `faceDownCardRisk` (Runner AI), new behaviour off unless
the owner requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: the Runner fears traps where the Corp's faction or shown cards
suggest them and runs freely elsewhere; it never flatlines itself against a
plausible trap. Adoption: Paul decides after playtesting; record the tested
flags and decision.

## Things to consider

- T1 (parked) would value advanced cards from the same agenda-versus-trap
  evidence; if revived, it should reuse this estimate.
- Do this after T2 and recalibrate the Corp once (T2 Design step 3) after
  both, rather than twice.
- Central servers' upgrades are affected too, so this shifts run costs
  everywhere, not only on remotes.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] (Gated items) The behaviour change ships under a named AI flag, initially off unless the owner requests otherwise (named in the Resolution).
- [ ] (Owner playtesting) The handoff names the tested flags, the behaviour to assess and contrasting cases; owner adoption remains explicit or pending.
