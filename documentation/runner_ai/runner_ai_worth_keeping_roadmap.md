# Runner AI: Hand-Keep & Discard Decision Architecture Roadmap

## Status

This is a proposed sibling to the Corp AI server-security and install-decision work (`documentation/corp-ai/roadmap.md`, items L and I), extending the same architecture work to the Runner side, which has not yet received an equivalent pass. None of the phases in this document are implemented unless their status is changed explicitly after code, documentation, and regression tests have been completed.

The corp roadmaps answer, in sequence:

> How vulnerable, valuable, or urgent is each server? → What should the Corp install, where, and is that better than another action?

This roadmap answers the Runner-side counterpart of the second question, one level earlier in the decision chain:

> Of the cards currently in the Runner's Grip, which are actually worth keeping, playing, or installing right now — and which should be discarded first if the hand is full?

Discovered while auditing the Vantage Point card batches (18 Sept commits) for AI hook coverage; three newly-implemented cards (Lampades, Sell Out, Tailgate) were missing `AIWorthKeeping`, which traced back to this being a long-standing, codebase-wide architectural gap rather than three isolated oversights.

---

## Scope

This roadmap covers:

- which Grip cards the Runner AI treats as worth keeping versus safe to discard at max hand size;
- the mulligan decision (currently gated on whether _any_ card in the opening hand is judged worth keeping);
- which cards get proactively played/installed by the generic decision loop versus only "along for the ride";
- priority signals that are currently only consulted for cards already judged worth keeping (`AIEconomyInstall`, `AIEconomyPlay`, `AIDrawInstall`, `AIDrawTrigger`);
- the breaker-type coverage check used as part of that judgment;
- producing inspectable reasons for keep/discard decisions and deterministic tests for them.

Initial card-hook work should use the same scoped sets as the corp roadmaps for consistency — `sets/systemgateway.js`, `sets/systemupdate2021.js`, `sets/elevation.js` — plus `sets/vantagepoint.js`, since it is the active batch and the trigger for this investigation.

Whenever a phase introduces or changes a card-facing AI hook, update `documentation/ai.md` in the same change, following the same documentation requirement as both corp roadmaps.

---

## Findings from the Current Implementation

### 1. Corp already solved an equivalent problem — working prior art exists

`_bestNonAgendaTutorOption()` in `ai_corp.js` is a priority cascade: bespoke hooks first (`AIFastAdvance`, then `AITagPunishment`/`AIDamageOperation`/`AIWouldPlay`), then two genuinely board-state-driven need checks (`!_sufficientEconomy()` → `_bestEconomyCardOption()`; no affordable ice → `_affordableIce()`), and finally a fallback that ranks by `elo` rather than excluding anything. The Runner side has no equivalent architecture — this roadmap's job is largely to bring it up to the same shape, not invent a new one.

### 2. `_cardsWorthKeeping()` is a hard gate, not a ranking

Unlike corp's ELO fallback (a ranking that always produces a "least bad" answer), Runner's `_cardsWorthKeeping()` only includes a card if it has an explicit `AIWorthKeeping` returning true, or matches a hardcoded subtype fallback (`Console`/`Fracter`/`Decoder`/`Killer`, or an AI-type/special breaker). Everything else is excluded outright — not deprioritized, excluded. `_indexOfBestDiscardOption()` then treats non-membership in `cardsWorthKeeping` as its second-highest discard priority, right after "already have a copy of this unique."

### 3. Runner already has unconsulted intent hooks that could feed a need-matching tier

`AIEconomyInstall`, `AIEconomyPlay`, `AIDrawInstall`, `AIDrawTrigger` are exactly the kind of type-level "I am an economy/draw card" signal corp matches against centrally-computed needs (`_sufficientEconomy()`, etc.) — but `_cardsWorthKeeping()` never reads them. Measured across all registered sets, of 34 Runner grip-type cards declaring one of these hooks:

|                                                                              |    Count |
| ---------------------------------------------------------------------------- | -------: |
| Also hand-write a separate `AIWorthKeeping` (duplicated logic)               | 26 (76%) |
| Declare the intent hook and never write `AIWorthKeeping` (hook is dead code) |  8 (24%) |

Several duplicated bodies are near-identical copy-paste (`if (Credits(runner) < 5) return true; return false;` appears verbatim across Fermenter, Creative Commission, and Telework Contract) — exactly the kind of check `_sufficientEconomy()` already computes once, centrally, for corp.

### 4. The breaker-coverage check is a generic checklist, not a board-aware need

`_essentialBreakerTypesNotInHandOrArray()` asks only "do I have at least one Fracter/Decoder/Killer anywhere" — a fixed three-category checklist, independent of what ice the Corp actually has installed or rezzed. Corp's equivalent (`_affordableIce()`) is genuinely state-driven: "is there a real, current gap." The state-aware version of the Runner check does exist in the codebase — scattered into individual cards' bespoke `AIWorthKeeping` (e.g. the documented System Gateway example using `runner.AI._getCachedCost(corp.RnD) != Infinity`) — but is not a shared, centrally-computed need the way corp's ice check is.

### 5. Coverage gap, measured

Across all registered sets, of 194 Runner grip-type cards (event/hardware/program/resource):

|                                                             |        Count |
| ----------------------------------------------------------- | -----------: |
| Has explicit `AIWorthKeeping`                               |           72 |
| No hook, but covered by subtype fallback                    |           32 |
| **No hook, no fallback — currently "always discard first"** | **90 (46%)** |

This list includes staples, not just filler — Dirty Laundry, Legwork, Inside Job, Chameleon, Imp among them.

### 6. Downstream consequences of gate membership are broader than just discarding

`this.cardsWorthKeeping` is recomputed once per decision cycle and consumed pervasively: it gates the mulligan decision (`cardsWorthKeeping.length < 1` → mulligan, even if the hand is fine but just under-annotated), the priority-economy card scan (which reads `AIEconomyInstall`/`AIEconomyPlay` only off members of this list), install-priority sorting for breakers/tutors, and the discard-priority ordering itself. A gap in this one function therefore silently degrades several otherwise-correct decision loops downstream, not just one.

### 7. Immediate trigger: the Vantage Point three

Lampades (36005), Sell Out (36011), and Tailgate (36012) — all missing `AIWorthKeeping`, none matching a fallback subtype. Sell Out's case is concrete evidence of finding 3 above: it declares `AIEconomyPlay: 2`, which is currently dead code as a direct result of this gap.

---

## Guiding Principles

Adapted from the corp roadmaps' principles for the Runner side of the same information boundary.

### 1. Preserve imperfect information

Runner keep/discard planning must never inspect Corp's hidden HQ/R&D contents. Use only public Corp state — installed and rezzed cards, credits, bad publicity, agenda points, public run history — the same boundary the Runner AI's other public-facing hooks (`AICentralPressure`, `AIRunPoolCreditOffset`, etc.) already respect.

### 2. Prefer mechanic hooks over card-title policy

No card-title checks in the centralized need-matching logic. Cards declare capability through existing or new hooks (`AIEconomyInstall`, `AIDrawInstall`, a breaker's subtype, etc.); the planner reasons about declared capability, not titles.

### 3. Centralize need computation; keep card logic for genuine synergy only

The relevant question for the new tier is not "is this card good" (that's `elo`) — it's "does the Runner currently need what this card's declared role provides." Compute the need once per decision cycle; match it against declared roles generically. Reserve hand-authored `AIWorthKeeping` for logic that genuinely can't reduce to a shared need (Conduit's own counter mechanic, Docklands Pass's own run-timing check).

### 4. Keep tactical safety authoritative

No keep/discard heuristic may cause the Runner to discard a card that is the only available answer to an urgent, game-relevant situation (e.g. the only breaker that can currently open a locked-out server) in favor of a generically higher-scoring but less urgent card. Need-matching and bespoke logic both take priority over the fallback tier for exactly this reason.

### 5. Make decisions explainable and deterministic under a fixed seed

Every keep decision should be traceable to which tier produced it (explicit hook, matched need, or fallback ranking) and why, mirroring the corp roadmap's score-breakdown/reasons discipline.

### 6. Explicit beats general beats fallback, strictly

Tier ordering is a hard rule, not a heuristic: an explicit `AIWorthKeeping` result always wins over a matched generic need, which always wins over the ELO-ranked fallback. A card that explicitly returns `false` under current conditions stays excluded regardless of ELO or matched needs.

---

## Proposed Architecture

### Runner needs record

Computed once per decision cycle, mirroring corp's `_sufficientEconomy()`/`_affordableIce()` pattern:

```js
{
  needEconomy: bool,        // existing prioritiseEconomy check, generalized
  needDraw: bool,           // existing currentOverDraw/maxOverDraw check, generalized
  lockedOutServers: [...],  // servers where _getCachedCost(server) == Infinity
  missingBreakerTypes: [...] // existing _essentialBreakerTypesNotInHandOrArray, kept as a secondary signal
}
```

### Core helpers

```js
_runnerNeeds(context); // computes the record above, once per cycle
_cardMatchesNeed(card, needs); // generic hook-based matching (AIEconomyInstall/AIEconomyPlay -> needEconomy, etc.)
_cardsWorthKeeping(cards); // refactored: explicit hook -> matched need -> subtype fallback -> ELO rank
_rankedDiscardCandidates(optionList); // discard ordering aware of ELO among fallback-tier cards, not just "first found"
```

`_cardsWorthKeeping()`'s external contract (returns an array of cards) should not change — only its internal tiering — so downstream consumers (`cardsWorthKeeping[i].AIEconomyInstall`, the mulligan check, etc.) require no changes to keep working, and continue to benefit automatically once cards that were previously excluded start appearing in the list.

---

## Implementation Roadmap

### Phase 0: Baseline Capture and Decision Telemetry — `[PROPOSED]`

**Goal:** Establish current behavior before changing priorities, mirroring the corp roadmap's Phase 0.

**Work:**

- Add opt-in structured logging around `_cardsWorthKeeping()` and `_indexOfBestDiscardOption()`: which cards were included/excluded and why (explicit hook result, subtype fallback, or neither).
- Create deterministic fixtures for representative hands across the scoped sets, including the 8 currently-dead-code economy/draw cards and the 3 Vantage Point cards.

**Safety constraints:** Logging must not inspect hidden Corp cards, alter decisions, consume randomness, or be enabled by default.

**Acceptance gate:** Fixed test states produce stable snapshots of current keep/discard membership, sufficient to detect intended versus unintended changes in later phases.

### Phase 1: Centralized Need Computation — `[PROPOSED]`

**Goal:** Introduce `_runnerNeeds()` without yet changing any keep/discard outcome.

**Work:**

- Generalize the main decision loop's existing `prioritiseEconomy`/overdraw checks into a reusable `needEconomy`/`needDraw` computation.
- Add `lockedOutServers` using `_getCachedCost(server) == Infinity` per server, the same signal already used ad hoc inside individual cards' `AIWorthKeeping`.
- No consumer wired yet — this phase only proves the computation is correct and side-effect-free.

**Deterministic regression scenarios:**

1. `needEconomy` matches the existing `prioritiseEconomy` boolean for all current test fixtures.
2. `needDraw` matches the existing overdraw check.
3. `lockedOutServers` correctly identifies a server with no affordable/matching breaker and excludes one that has one.
4. Computing needs does not mutate credits, grip, installed cards, or the run calculator's cached state.

**Acceptance gate:** `_runnerNeeds()` is computable at any decision point with no observable side effects and matches existing ad hoc checks it's meant to replace.

### Phase 2: Need-Matching Tier in `_cardsWorthKeeping()` — `[PROPOSED]`

**Goal:** Wire `_runnerNeeds()` into the keep decision as a new tier, ahead of the ELO fallback and behind explicit `AIWorthKeeping`.

**Work:**

- A card with no `AIWorthKeeping` and a declared `AIEconomyInstall`/`AIEconomyPlay` is kept when `needEconomy` is true.
- A card with no `AIWorthKeeping` and a declared `AIDrawInstall`/`AIDrawTrigger` is kept when `needDraw` is true.
- A card with an `Icebreaker` subtype capable of covering a server in `lockedOutServers` is kept, alongside (not replacing) the existing `atLeastOne` generic-coverage fallback.
- Explicit `AIWorthKeeping`, where present, is checked first and always wins, per Guiding Principle 6.

**Deterministic regression scenarios:**

1. The 8 currently-dead-code economy/draw cards (Pennyshaver, Red Team, Pantograph, Smartware Distributor, Verbal Plasticity, Ghosttongue, Prepaid VoicePAD, Sell Out) are kept exactly when the matching need is true, and excluded when it's false (i.e. `needEconomy` false and no other tier applies).
2. A card with explicit `AIWorthKeeping` returning `false` stays excluded even when the matching need is true.
3. A card that would match a need but is also `_wastefulToInstall()` is still excluded, consistent with existing behavior.
4. Locked-out-server matching does not change results when hidden Corp cards are substituted (public-information boundary holds).

**Acceptance gate:** Baseline fixtures from Phase 0 show only the intended new inclusions (the dead-code cards, plus any others matching a real need); no previously-included card is excluded.

### Phase 3: ELO-Ranked Fallback — `[PROPOSED]`

**Goal:** Replace the remaining hard exclusion with a ranking, mirroring corp's `_bestNonAgendaTutorOption()` final fallback.

**Work:**

- A card matching neither an explicit hook, a matched need, nor a subtype fallback is no longer excluded from `cardsWorthKeeping`; it's included and tagged as fallback-tier.
- No threshold constant — ranking only, matching the existing corp pattern rather than introducing a new mechanism.

**Deterministic regression scenarios:**

1. Fallback-tier cards are present in `cardsWorthKeeping` and available to be played/installed by the generic decision loop.
2. A genuinely unplayable/filler card (very low ELO, no declared role) is still discarded before a moderate-ELO fallback card when both compete for the same discard slot (depends on Phase 4).
3. Mulligan decisions on hands previously judged "nothing worth keeping" solely due to gap coverage now correctly reflect actual hand quality.

**Acceptance gate:** No runner grip-type card across the scoped sets is unconditionally excluded from `cardsWorthKeeping` any more; every card is either explicit-hook-gated, need-matched, or fallback-ranked.

### Phase 4: Discard Ordering Parity — `[PROPOSED]`

**Goal:** Make `_indexOfBestDiscardOption()` prefer discarding the lowest-ranked fallback-tier card, not just "first non-worthkeeping card found."

**Work:**

- Among cards that only qualify via the Phase 3 fallback tier, sort by `elo` ascending before falling through to the existing duplicate/oldest-card rules.
- Cards that qualify via explicit `AIWorthKeeping` or a matched need are not reordered by this change — they already carry a stronger keep signal than ELO alone would represent.

**Deterministic regression scenarios:**

1. Given two fallback-only cards, the lower-ELO one is discarded first.
2. A need-matched card is never discarded ahead of a same-ELO fallback-only card.
3. Existing unique-duplicate discard priority is unaffected.

**Acceptance gate:** Full parity with corp's ranking discipline: discard order among undifferentiated cards is ELO-driven, not first-found.

### Phase 5: Bespoke Logic Cleanup — `[PROPOSED]`

**Goal:** Once Phases 1–4 land, revisit the 26 cards currently duplicating a need-matching pattern in hand-written `AIWorthKeeping`, and the Vantage Point three, with the new architecture in place.

**Work:**

- For each of the 26 duplicated-logic cards, confirm the new need-matching tier reproduces the same behavior; simplify or remove the redundant hand-written check where it does.
- Add real `AIWorthKeeping` to Lampades (`return true`), Sell Out (bespoke: worth keeping if there's a disposable resource to trash, mirroring its own `Enumerate`/`AIWouldPlay`), and Tailgate (`return true`, HQ is ice-protected in the near-totality of games) per the original card review — these fall outside what tier 1's economy/draw/lockout needs cover.
- Update `card-implementation-backlog.md` with remaining fallback-tier-only cards as a visible to-do list, so coverage work has a target instead of disappearing once the fallback makes the symptom invisible.

**Deterministic regression scenarios:**

1. Each simplified card's actual in-game keep behavior is unchanged before/after removing its now-redundant hand-written check.
2. The three Vantage Point cards behave correctly across the scenarios already covered by `tests/vantagepoint-integration.test.js`, now also correctly represented in `cardsWorthKeeping`.

**Acceptance gate:** No card carries hand-written logic that duplicates what a generic need now already covers; `card-implementation-backlog.md` reflects the true remaining bespoke-logic backlog.

---

## Reference Engine Hooks & Helpers Touched

| Engine Hook / Method                                    | Role                                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_cardsWorthKeeping(cards)`                             | Primary entry point (existing, to be refactored). Returns the array of Grip cards judged worth keeping.                                              |
| `_cardsInHandWorthKeeping()`                            | Existing wrapper calling the above with `runner.grip`.                                                                                               |
| `_indexOfBestDiscardOption(optionList)`                 | Existing discard-priority chooser; consumes `cardsWorthKeeping` membership today, ELO ranking within it from Phase 4.                                |
| `card.AIWorthKeeping(installedRunnerCards, spareMU)`    | Existing bespoke per-card hook; always takes priority per Guiding Principle 6.                                                                       |
| `card.AIEconomyInstall` / `AIEconomyPlay`               | Existing intent hooks; become need-matching inputs in Phase 2 instead of being dead code when `AIWorthKeeping` is absent.                            |
| `card.AIDrawInstall` / `AIDrawTrigger`                  | Same, for the draw need.                                                                                                                             |
| `_essentialBreakerTypesNotInHandOrArray()`              | Existing generic three-category breaker checklist; retained as a secondary signal alongside the new board-aware lockout need.                        |
| `runner.AI._getCachedCost(server)`                      | Existing run-calculator signal; `== Infinity` is the real lockout check, to be centralized in `_runnerNeeds()` rather than left to individual cards. |
| `_sufficientEconomy()` / `_affordableIce()` (corp-side) | Prior art this roadmap's `_runnerNeeds()` is modeled on.                                                                                             |
| `_bestNonAgendaTutorOption()` (corp-side)               | Prior art this roadmap's tiered `_cardsWorthKeeping()` is modeled on.                                                                                |

---

## Suggested First Implementation Prompt

Begin with **Phase 0 and Phase 1 only**.

The implementation should:

1. inspect all current producers and consumers of `cardsWorthKeeping` (`_cardsInHandWorthKeeping`, the priority-economy scan, the mulligan check, `_indexOfBestDiscardOption`, install-priority sorting for breakers/tutors);
2. introduce `_runnerNeeds()` as a pure, side-effect-free computation with no consumer wired yet;
3. add deterministic fixtures covering the 8 dead-code economy/draw cards, the 3 Vantage Point cards, and a representative set of already-covered cards, to snapshot current behavior before anything changes;
4. add `tests/runner-worth-keeping.test.js` for these fixtures;
5. avoid changing any keep/discard outcome until the baseline is observable;
6. update `documentation/ai.md` only if a card-facing hook contract changes (it shouldn't in Phase 0/1 — existing hooks are being _read_ differently, not redefined);
7. update this roadmap with implemented notes and any discovered follow-up work.

After that foundation is merged, implement **Phase 2: Need-Matching Tier** as the first intentional behavior change, following the same discipline as the corp roadmap's Phase-by-phase rollout — one policy change at a time, against a proven baseline.

---

## Definition of Done for Any Phase

A phase is complete only when:

- the scoped behavior is implemented in `ai_runner.js` and relevant card definitions;
- deterministic regression tests cover success, failure, and the imperfect-information boundary;
- existing AI and card-integration tests still pass, including `tests/vantagepoint-integration.test.js`;
- any new or changed card-facing hooks are documented in `documentation/ai.md`;
- this roadmap records implemented notes, cards updated, remaining limitations, and calibration follow-ups;
- decisions remain explainable (which tier produced a keep/discard result, and why);
- no speculative follow-up is mislabeled as completed behavior.
