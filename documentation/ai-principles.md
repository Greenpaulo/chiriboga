# AI principles

Rules every change to either AI (`ai_corp.js`, `ai_runner.js`, `runcalculator.js`)
must obey. Each side adds its own rules, above all its information boundary:
[corp-ai/principles.md](corp-ai/principles.md) and
[runner-ai/principles.md](runner-ai/principles.md). Specs and tickets reference
these files instead of restating them. Change them only by explicit decision,
and record why.

"Checked by" names the tests that enforce a rule mechanically. A rule without
one relies on review.

## 1. Imperfect information

Each AI plays against a human and must use only information its human
counterpart could have. What each side may know is defined in its own
principles file. A decision must not change when the opponent's hidden cards
are replaced by different hidden cards; a test that claims to cover imperfect
information runs the same board at least twice with different hidden contents,
or throws when a hidden property is read.

## 2. Card-agnostic hooks, not card titles

- Express card mechanics through declarative hooks on the card definitions. Do
  not add `card.title == "…"`, `GetTitle(card) == "…"` or title lists to the AI
  files. Card names in documentation are examples, not targets.
- Text-pattern fallbacks are acceptable only for cards that declare no hook.
- A hook describes one card's mechanics or suitability narrowly; it must not
  recreate a global planner.
- Document every new or changed card-facing hook in `documentation/ai.md`, and
  place AI hooks at the bottom of the card object.
- Existing title special cases are tracked as principle-debt items in each
  side's roadmap. Do not add new ones.

Checked by: `tests/ai-hook-docs.test.js` (every `AI*` hook in `sets/*.js` is
documented). New title checks are not yet detected automatically.

## 3. Planning hooks are read-only and safe outside a run

Hooks and helpers consulted while planning must not mutate state, must be
deterministic from the information the side may use, and must work when no run
is active (no reliance on live encounter globals). When a hook needs a
prospective run context, supply it through a guarded helper that restores the
real state (principle 6).

## 4. Tactical safety is authoritative

No stylistic, speculative or bluffing preference may override an immediate game
outcome: taking a game-winning score or steal, preventing a game-losing breach,
or a forced action.

## 5. Randomness is injected, bounded and has a lifetime

- AI policy draws randomness from an injectable source on the AI object, never
  directly from global `Math.random`, `RandomRange` or the engine's `Shuffle`.
  Engine and gameplay randomness are outside this rule.
- Every random choice has an explicit lifetime (per card, per server, per
  decision or per epoch) and is cached for it, so repeated evaluation never
  rerolls.
- Fixed seeds reproduce identical decisions.

The Corp AI's seam is `CorpAI._random`; see each side's principles file for its
current state.

## 6. No unsafe state mutation

Evaluate hypotheticals through a guarded helper that restores every mutated
field in `finally`, including when evaluation throws. Hypothetical results must
never enter a cache used for the real board.

## 7. Decisions are explainable

Rankings keep structured reasons and named score components, and say which
rule or tier produced a decision. Hard legality or safety rejections stay
separate from soft penalties: an illegal or unsafe option is rejected, not
merely scored lower.

## 8. Heuristics are bounded and calibrated with evidence

- Score components are bounded and named; avoid one unexplained aggregate
  formula. Prefer ranking to arbitrary thresholds.
- Do not adopt uncalibrated coefficients. Changes that depend on tuning need
  seeded simulation evidence (Corp item F4) before adoption, as each item's
  acceptance gate states. Until then the existing behaviour remains the
  fallback.
- Keep a rejected design and the reason in the side's `architecture.md` so it
  is not retried by accident.

## 9. Scope and documentation duties

- Card-hook work covers the sets marked `playable` in
  [card-sets.md](card-sets.md) unless a ticket states otherwise. Measured
  status, including AI hook coverage, is in the generated
  [card-status.md](card-status.md).
- Record worthwhile out-of-scope findings as a `proposed` item in the side's
  `roadmap.md` with a spec in its `specs/` folder, not only in code comments or
  a work summary.
- Never describe proposed behaviour as implemented. An item is `done` only
  after review, with the side's `architecture.md` updated.
- Measurements quoted in plans (counts, coverage) come from a script, not from
  a hand count, so they cannot go stale.
