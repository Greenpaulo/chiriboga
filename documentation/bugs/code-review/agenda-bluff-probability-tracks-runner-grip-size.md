# Corp AI: agenda-bluff probability falls as the Runner's Grip grows, a learnable single-variable tell

**Outcome:** adopted

**Source:** code inspection during the Corp AI planning audit (no debug log)
**Reproduction:** `tests/pending/agenda-bluff-probability-tracks-runner-grip-size.test.js` (`node tests/pending/agenda-bluff-probability-tracks-runner-grip-size.test.js`); fails at `3c25455`, 2026-10-09 (2-point agenda: 0.12 at Grip 4 vs 0.13 at Grip 0). Moved to the green suite unchanged as `tests/agenda-bluff-probability-tracks-runner-grip-size.test.js`; passes with `node tests/agenda-bluff-probability-tracks-runner-grip-size.test.js`.

## Resolution

Implemented from `3c25455`.

- `ai_corp.js` `_shouldBluffAgendaServer()`: removed the `runnerPressure` term, so the stored probability is `clamp(0.22 / points + 0.02, 0.05, 0.18)` and no longer moves with Grip size. Eligibility guards (lone advanceable hidden agenda, Corp-winning score, winning breach) are unchanged. This is the ticket's proposed fix.
- Classification: objective oracle (principles.md §5 invariant), so no F4 gate; `## Acceptance gate` added as N/A. No plan was needed: one function with one caller (`_deceptionPostureActive()`), the diagnosis held under validation (reproduction reproduced the ticket's table exactly), and no green expectation changed.
- Reproduction written first, failed at `3c25455`, then moved unchanged from `tests/pending/` to `tests/agenda-bluff-probability-tracks-runner-grip-size.test.js` (18 cases: 1–3 points × Grip 0–20). The only line changed in the move is the `// Run with:` path comment; assertions are identical.
- Docs: [architecture: baits, bluffs and deterrence](../../../corp-ai/architecture.md#baits-bluffs-and-deterrence) now states the bluff probability's inputs.
- Open: agenda points remain an input (out of scope, as the ticket notes, for L8.6). F4 baselines for L8.2/L8.4/L8.5 should be taken from this commit onward.

## Summary

`_shouldBluffAgendaServer()` lowers its bluff probability by 0.01 for every 4
cards in the Runner's Grip, up to 16 cards. Grip size is public, so over many
games a human can learn "a light agenda-shaped remote is less likely to be a
bluff when my hand is big". `documentation/corp-ai/principles.md` §5 forbids
exactly this: no posture may correlate with a single observable game-state
variable. The effect is small, but it is systematic and one-directional.

## Evidence

`ai_corp.js`, `_shouldBluffAgendaServer(server)`:

```js
var points = Math.max(1, card.agendaPoints || 1);
var runnerPressure = Math.min(4, (runner.grip || []).length * 0.25);
var probability = Math.max(
  0.05,
  Math.min(0.18, 0.22 / points + 0.02 - runnerPressure * 0.01),
);
```

## Reproduction

Load the real `CorpAI` in the `tests/corp-server-security.test.js` harness,
put one advanceable agenda alone in a remote with one ETR ICE, inject
`_random = () => 0.5`, call `_shouldBluffAgendaServer(remote)` with a fresh
`_agendaBluffDecisions`, and read the stored `probability`:

| Agenda points | Grip 0 | 4 | 8 | 12 | 16 | 20 |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0.180 | 0.180 | 0.180 | 0.180 | 0.180 | 0.180 |
| 2 | 0.130 | 0.120 | 0.110 | 0.100 | **0.090** | 0.090 |
| 3 | 0.093 | 0.083 | 0.073 | 0.063 | **0.053** | 0.053 |

A test that fails today asserts the probability is the same for Grip sizes 0
and 16 with every other input fixed.

## Root cause

- [Verified] The probability depends on `runner.grip.length` through
  `runnerPressure` (table above). For 1-point agendas the 0.18 cap hides it; for
  2- and 3-point agendas it falls by up to 0.04 (31% and 43% relative).
- [Verified] No other input in the function moves with Grip size, and the roll
  is cached per server and card in `_agendaBluffDecisions`, so the Grip size at
  the first evaluation fixes the posture for the card's lifetime.
- [Inferred] "Runner pressure" was meant as a proxy for how dangerous a run is,
  but Grip size is not a measure of run threat, and any real threat measure
  would still need to avoid becoming a single-variable tell.

## Proposed fix

Remove the `runnerPressure` term: `probability = clamp(0.22 / points + 0.02,
0.05, 0.18)`. The winning-breach and Corp-winning-score guards, which may depend
on game state, stay as they are. Record baseline F4 numbers after the fix, not
before, so L8.2/L8.4/L8.5 do not compare against a baseline that carries the
defect.

Rejected alternative: keep a threat term but base it on a different public
variable. Any single public input has the same problem; if threat should
matter, it belongs in L8.5's match-local feedback, which is bounded and
checked by `bluffSingleVariableCorrelation`.

## Acceptance gate

N/A — deterministic fix (principle 4): `documentation/corp-ai/principles.md` §5 invariant that no bluff posture may correlate with a single observable game-state variable; with every other input fixed, the stored bluff probability must not change with public Grip size.

## Acceptance criteria

- [x] A deterministic test shows the stored probability is identical for Grip
      sizes 0, 8 and 16 with every other input fixed, and passes in the green
      suite (`tests/`), with its expectation unchanged.
- [x] Existing agenda-bluff and deception tests in
      `tests/corp-server-security.test.js` pass unchanged.
- [x] `documentation/corp-ai/architecture.md` (Baits, bluffs and deterrence)
      states which inputs the bluff probability uses.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related

- **Bait frequency and root card count.** `_calculateBaitFrequency()` uses
  `exposure = 1 + min(3, server.root.length)`, so bait probability rises with
  the server's public root card count (when not clamped). That is the intended
  poker-style "bet size", but it is also a single public variable; L8.2's
  `bluffSingleVariableCorrelation` gate measures it rather than this ticket
  changing it.
- **Agenda points.** The bluff probability also falls with the agenda's own
  points. Those are hidden at decision time but revealed on steal or score, so
  a human could learn "bluffed light remotes are usually 1-pointers" over many
  games. Record it for L8.6's human telemetry; not fixed here.
