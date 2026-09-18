# Corp AI Improvement — Work Process Summary

This documents the full process behind the Corp AI's server security evaluation
system, from initial code review through to the final, tested implementation.
Companion reading: `corp_ai_improvement_roadmap.md` (architecture and future
layers) and `corp-ai-improvement-prompts.md` (the exact agent task spec used).

---

## 1. Starting point

Commit `95f2c15` ("Strengthen ai corp") introduced `_evaluateServerSecurity()`
— the Corp AI's first real capability-based check of whether a server is
actually defensible, replacing pure ice-counting. It correctly simulated
breaker matching, break costs, hosted virus breakers (Botulus), Quetzal's
free break, and hand-size lethality, integrated as a small `+2` bonus in
`_protectionScore()`.

## 2. Code review findings

Four issues were identified reviewing that commit:

1. **Hardcoded titles contradicted the roadmap's own stated principle.**
   `Leech`, `Datasucker`, `Botulus`, and `Quetzal` were checked by exact
   title string in three functions, despite the roadmap explicitly stating
   card names should be illustrative examples, not hardcoded logic.
2. **`_estimateBreakCost` only counted ETR and damage subroutines as
   "required to break."** Resource-denial subroutines (program trash,
   credit drain, tag-giving) were treated as harmless, meaning the security
   evaluation systematically underestimated how threatening that class of
   ice actually was.
3. A false alarm — a regex was flagged as not handling NSG's "brain damage"
   → "core damage" terminology change, but on re-check the pattern already
   handled both terms (`/(?:net|meat|core|brain)\s*damage/gi`). Corrected
   in conversation; no fix needed.
4. **A fragile synthetic breaker object.** The hosted-Botulus-style free
   breaker set `AIFixedStrength: false`, relying on a regex coincidentally
   failing to match fake `cardText` to arrive at the correct "can't be
   boosted" result, rather than stating it directly.

## 3. Scoping the fix

Point 4 was fixed immediately (one-line change: `AIFixedStrength: true`).

Points 1 and 2 were scoped into an agent task, refined through several
rounds of correction before being finalized:

- **Initial assumption corrected**: the task was first framed as "add hooks
  to the 5 named cards." This was wrong — those 5 are examples of 3 _mechanic
  categories_, and the real card pool already contained other cards with the
  same mechanics getting no special handling at all (`Wyrm`, `Sandstone`,
  `Parasite`, `Chisel`, `Tranquilizer` found via direct search).
- **A stale local clone caused a second error**: `Quetzal` was initially
  reported as not existing in the codebase at all (implying dead code). A
  fresh `git pull` corrected this — it existed as `"Quetzal: Free Spirit"`
  in `sets/systemupdate2021.js`, using a single-quoted title string that an
  exact-match grep had missed.
- **A genuine simplification followed from that correction**: Quetzal
  already had `AIImplementBreaker` defined. Checking `ActiveCards()`
  confirmed the identity card is included in breaker-matching, meaning
  Quetzal's free break needed no new hook type at all — just the same
  `AIMatchingBreakerInstalled` hook already being added for the hosted
  virus breakers, letting the existing `_matchingBreakerForIce` chain find
  it automatically. This let the entire `hasQuetzal` special-case block be
  _deleted_ rather than replaced.
- **Scope was narrowed to 3 sets** (System Gateway, System Update 2021,
  Elevation) to match actual current priorities and conserve agent-session
  usage, explicitly excluding Downfall/Creation & Control (still WIP) from
  this pass.
- **A 4th category was flagged but deliberately not designed**:
  `Chromatophores` (Elevation) grants ice all three breaker-matching
  subtypes simultaneously — a fundamentally different problem (subtype
  matching, not strength/break-cost) from the other three categories, left
  for a dedicated follow-up rather than bolted on speculatively.

## 4. What the agent actually implemented

Verified directly against the real diff (`95f2c15` → `32c4819`, 3 commits:
"part 1 of the doc", "part 2 of the doc", "review and fixes"):

**Part 1 — declarative hooks replacing hardcoded titles:**

- `AIReducesIceStrength` — implemented on `Ice Carver`, `Leech`.
- `AIHostedBreakContribution` — implemented on `Botulus`.
- `AIMatchingBreakerInstalled` — added to `Quetzal`; the old
  `hasQuetzal`/`quetzalUsedThisTurn` block was removed entirely, exactly as
  planned.
- `_matchingBreakerForIce` was generalized to check these hooks first,
  falling back to the existing `Icebreaker` subtype + `BreakerMatchesIce`
  path, and now also compares matched breakers by estimated cost rather
  than returning the first match found — a real improvement beyond the
  original spec.
- **Discovery, done properly**: `Tranquilizer` was checked and found to
  already use `AIMatchingBreakerInstalled` for an unrelated purpose (derez),
  correctly identified as needing no change rather than blindly modified.
  `Datasucker`/`Wyrm`/`Parasite`/`Chisel`/`Sandstone` were confirmed to live
  in out-of-scope files (`coreset.js`, `downfall.js`) and correctly excluded
  from this pass rather than guessed at.

**Part 2 — the ETR/damage-only blind spot:**

- `_requiredSubroutineIndices()` now derives subroutine severity from the
  same `AIImplementIce`-based classification the run calculator already
  uses (`misc_minor` / `loseCredits` / `payCredits` / `endTheRun` /
  `netDamage` / etc. — see `ai.md` §5.2), via a new `_branchRequiresBreak()`
  helper: anything other than `misc_minor`/`loseCredits`/`payCredits` now
  counts as required to break. The old ETR/damage-only regex remains only
  as the fallback for ice without an `AIImplementIce` hook.

**Bonus fixes made during the "review and fixes" pass, beyond the original
spec:**

- `AIFixedStrength: false` → `true` on the synthetic Botulus-style breaker
  (this is Point 4 above — fixed independently, consistent with the earlier
  manual fix).
- **A real correctness bug caught in lethality logic**: damage-equals-hand-
  size was being treated as lethal (`damage >= runnerHandSize`); corrected
  to `damage > runnerHandSize`, since discarding exactly the whole grip does
  not flatline the Runner in the actual game rules.

## 5. New documentation and artifacts produced

- **`documentation/card-implementation-backlog.md`** supersedes the original
  Eternal-specific discovery backlog. It retains the actionable gaps and
  distinguishes them from cards whose hooks are now verified as handled,
  avoiding stale tasks after later AI work.
- **`tests/corp-server-security.test.js`** (new) — 23 regression tests
  covering calculator ownership/isolation, unrezzed ice classification,
  breaker activation costs, mandatory-vs-optional punishment, partial and
  full hosted-breaker coverage, Quetzal's once-per-turn gating for both AI
  and human Runners, and lethality edge cases (damage equal to grip size,
  multiple damage subroutines needing only partial breaks to survive).
- **`documentation/ai.md`** — updated (9 lines) alongside the hook additions,
  though not re-verified line-by-line as part of this summary; worth a
  direct read-through to confirm the new hooks (`AIReducesIceStrength`,
  `AIHostedBreakContribution`) are documented there in the same style as
  existing hooks, since that was flagged during planning as worth doing but
  not confirmed done here.

## 6. What's still open

- **Chromatophores / subtype-shifting category** — flagged, not implemented.
  Needs its own investigation into `_matchingBreakerForIce` /
  `BreakerMatchesIce`'s subtype-reading logic before a fix can be designed.
  This maps onto the roadmap's own "Layer 4: Structural & Type Shifts",
  which was already planned as future work independent of this exercise.
- **Downfall, Creation & Control, and other WIP sets** — deliberately
  excluded from this pass; the backlog doc above is the starting point for
  giving them the same treatment once their content is finalized.
- **Layers 5–7 of the roadmap** (public threat memory / imperfect
  information modeling, effective credit ceiling, central-server threat
  asymmetry) — untouched by this work, still pending as originally scoped.
