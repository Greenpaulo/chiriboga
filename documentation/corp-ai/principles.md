# Corp AI principles

Corp-specific rules. The rules shared by both AIs (hooks not titles, read-only
planning, tactical safety, randomness, no unsafe mutation, explainability,
calibration, scope) are in [../ai-principles.md](../ai-principles.md); read
that first. Change this file only by explicit decision, and record why.

## 1. The Corp's information boundary

- Never read the identity or properties of cards in the Runner's Grip or Stack,
  saved decklists, or the Runner AI's private state (for example its run
  calculator).
- Public information may be used: the Runner's identity and faction, installed
  and active cards, the Heap, counters, credits, clicks, tags, pile sizes and
  run history.
- The Corp knows its own HQ, Archives, installed cards and decklist, so it may
  reason about *which* cards remain in R&D (as mulligan expectations and bluff
  limits do). It must never use R&D's *order*, such as which card is on top or
  how deep a given card sits, unless a game effect revealed those positions,
  and then only the revealed positions.

Checked by: the hidden-information cases in `tests/corp-server-security.test.js`,
for example "Corp classification never reads hidden grip properties or the
Runner calculator" (Grip and Runner AI state) and "central breach loss risk
uses fair combinations rather than hidden order" (R&D order: agendas on top of
R&D do not raise the loss probability above the fair-combination value).

## 2. Deterministic security is separate from soft signals

The security result (hard lockout, mandatory break cost, affordability) is
computed deterministically. Probabilistic or strategic signals, such as hidden
threat risk, deterrence, bait value or protection debt, adjust bounded urgency
scores only and never change the deterministic security result. Optional
punishment never establishes a lockout by itself.

Checked by: "hidden threats affect protection urgency but not deterministic
security" and related cases in `tests/corp-server-security.test.js`.

## 3. Randomness and hypotheticals in the Corp AI

- AI policy randomness comes only from `CorpAI._random`. Persistent postures
  cache their roll with the card or server; transient tie-breaks are cached for
  one `Choice`.
- The rule for hypotheticals: a probe that temporarily changes state goes
  through `_withHypothetical(apply, evaluate, restore)` (or a shared run or
  encounter wrapper built on the same guard), which is the only place state is
  changed by hand, and each mutated collection or field has a regression test
  showing it is restored, including after a throw.
- Known debt: today only `_ordinaryPurgeOutcome()` uses `_withHypothetical`.
  The other probes mutate by hand, some without `finally`; item F2 in
  [roadmap.md](roadmap.md) lists and migrates them, and F3's cache depends on
  that migration.

Checked by (randomness only): "asset destination shuffle uses injected
randomness without mutating its input", "asset destination tie-break is rolled
once per Choice" and "bait posture rolls once per installed trap and can stop
extra protection" in `tests/corp-server-security.test.js`. The hypothetical
rule is not yet checked mechanically; F2 adds
`tests/corp-ai-hypothetical-mutation.test.js`.

## 4. Tactical safety examples

Never install a stealable winning agenda as a bluff; never spend credits needed
to stop a game-winning breach; a reservation never blocks a game-winning score
or the critical breach-defence interrupt.

## 5. Deception must not be learnable

Bait and bluff behaviour is judged by long-run unpredictability against a
human, not by single decisions:

- no posture may correlate with a single observable game-state variable (turn,
  credits, one card in hand);
- agenda and trap profiles draw from overlapping distributions;
- adaptation is match-local and resets each game; never fingerprint or persist
  a player profile;
- any telemetry is opt-in, anonymous and passive.

## 6. Corp principle debt

Existing card-title special cases in `ai_corp.js` are tracked as item P1 in
[roadmap.md](roadmap.md); `tests/corp-ai-card-titles.test.js` allowlists them
and fails on any new one. Hand-written hypothetical mutation is tracked as
item F2.
