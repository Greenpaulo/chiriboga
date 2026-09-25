# Corp AI principles

Rules every change to the Corp AI must obey, whichever area it belongs to.
Specs and tickets reference this file instead of restating it. Change it only
by explicit decision, and record why.

"Checked by" names the tests that enforce a rule mechanically. A rule without
one relies on review.

## 1. Imperfect information

The Corp AI plays against a human and must not cheat.

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
- A decision must not change when hidden Runner cards are replaced by different
  hidden cards. A test that claims to cover imperfect information runs the same
  board at least twice with different hidden contents, or throws when a hidden
  property is read.

Checked by: the hidden-information cases in `tests/corp-server-security.test.js`
(for example "Corp classification never reads hidden grip properties or the
Runner calculator").

## 2. Card-agnostic hooks, not card titles

- Express card mechanics through declarative hooks on the card definitions.
  Do not add `card.title == "…"`, `GetTitle(card) == "…"` or title lists to
  `ai_corp.js`. Card names in documentation are examples, not targets.
- Text-pattern fallbacks are acceptable only for cards that declare no hook.
- A hook describes one card's mechanics or suitability narrowly; it must not
  recreate a global planner.
- Document every new or changed card-facing hook in `documentation/ai.md`, and
  place AI hooks at the bottom of the card object.
- Existing title special cases are tracked as item P1 in
  [roadmap.md](roadmap.md). Do not add new ones.

Checked by: `tests/ai-hook-docs.test.js` (every `AI*` hook in `sets/*.js` is
documented). New title checks are not yet detected automatically.

## 3. Planning hooks are read-only and safe outside a run

Hooks and helpers consulted during Corp planning must not mutate state, must be
deterministic from public state, and must work when no run is active (no
reliance on live encounter globals). When a hook needs a prospective run
context, supply it through a guarded helper that restores the real state (see
principle 7).

## 4. Tactical safety is authoritative

No bluff, bait, posture, reservation, role or stylistic preference may override
an immediate game outcome: taking a game-winning score, preventing a
game-losing breach or steal, or a forced action. Examples: never install a
stealable winning agenda as a bluff; never spend credits needed to stop a
game-winning breach.

## 5. Deterministic security is separate from soft signals

The security result (hard lockout, mandatory break cost, affordability) is
computed deterministically. Probabilistic or strategic signals, such as hidden
threat risk, deterrence, bait value or protection debt, adjust bounded
urgency scores only and never change the deterministic security result.
Optional punishment never establishes a lockout by itself.

Checked by: "hidden threats affect protection urgency but not deterministic
security" and related cases in `tests/corp-server-security.test.js`.

## 6. Randomness is injected, bounded and has a lifetime

- AI policy draws randomness only from `CorpAI._random`, never from global
  `Math.random`, `RandomRange` or the engine's `Shuffle`. Engine and gameplay
  randomness are outside this rule.
- Every random choice has an explicit lifetime (per card, per server, per
  decision or per posture epoch) and is cached for it, so repeated evaluation
  never rerolls.
- Fixed seeds reproduce identical decisions.

Checked by: "asset destination shuffle uses injected randomness without
mutating its input", "asset destination tie-break is rolled once per Choice"
and "bait posture rolls once per installed trap and can stop extra protection"
in `tests/corp-server-security.test.js`.

## 7. No unsafe state mutation

Evaluate hypotheticals through `_withHypothetical(apply, evaluate, restore)` or
an equivalent guarded helper that restores every mutated field in `finally`,
including when evaluation throws. Hypothetical results must never enter a
cache used for the real board.

## 8. Decisions are explainable

Rankings keep structured reasons and named score components. Hard legality or
safety rejections stay separate from soft penalties: an illegal or unsafe
option is rejected, not merely scored lower.

## 9. Heuristics are bounded and calibrated with evidence

- Score components are bounded and named; avoid one unexplained aggregate
  formula.
- Do not adopt uncalibrated coefficients. Changes that depend on tuning need
  seeded simulation evidence (item F4) before adoption, as each item's
  acceptance gate states. Until then the existing behaviour remains the
  fallback.
- Keep a rejected design and the reason in `architecture.md` so it is not
  retried by accident.

## 10. Deception must not be learnable

Bait and bluff behaviour is judged by long-run unpredictability against a
human, not by single decisions:

- no posture may correlate with a single observable game-state variable (turn,
  credits, one card in hand);
- agenda and trap profiles draw from overlapping distributions;
- adaptation is match-local and resets each game; never fingerprint or persist
  a player profile;
- any telemetry is opt-in, anonymous and passive.

## 11. Scope and documentation duties

- Card-hook work covers the sets marked `playable` in
  `documentation/card-sets.md` unless a ticket states otherwise. Which sets are
  playable is a human decision recorded there; measured status (missing and
  unfinished cards, and where `config.js` disagrees) is in the generated
  `documentation/card-status.md`.
- Record worthwhile out-of-scope findings as a `proposed` item in
  [roadmap.md](roadmap.md) with a spec in `specs/`, not only in code comments or
  a work summary.
- Never describe proposed behaviour as implemented. An item is `done` only
  after review, with `architecture.md` updated.
