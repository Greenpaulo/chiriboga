# Task: Generalize threat evaluation in ai_corp.js (2 parts)

Context: `ai_corp.js` has a `_evaluateServerSecurity()` system (added in commit
"Strengthen ai corp") that estimates whether a server is safe from the Runner.
Two known limitations need fixing. Read `documentation/ai.md` and
`documentation/corp_ai_improvement_roadmap.md` first for full context on the
hook system and design principles (especially: "Do Not Hardcode Titles" and
"Card-Agnostic Engine Hooks").

Do not change unrelated code. Do not change the overall structure of
`_evaluateServerSecurity()`, `_protectionScore()`, or any function not listed
below. Keep every existing text-regex fallback as a safety net — new hooks are
additive, not replacements, so cards that don't declare a hook keep working
exactly as they do today.

---

## Part 1 — Replace hardcoded card titles with declarative hooks

**Scope note**: limit all discovery and hook additions in this task to
`sets/systemgateway.js`, `sets/systemupdate2021.js`, and `sets/elevation.js`
only — these are the current priority sets. Do not touch Downfall, Creation
and Control, or any other set file even if a matching card happens to exist
there; those will get the same treatment in a separate future pass once
their content is finalized.

`ai_corp.js` currently identifies specific cards by name in three places,
which violates the roadmap's own "no hardcoded titles" principle:

1. `_virusCountersReduceStrength(card)` — hardcodes `"Leech"` and `"Datasucker"`
2. `_isHostedVirusBreaker(hosted)` — hardcodes `"Botulus"`
3. `_evaluateServerSecurity(server)` — hardcodes `"Quetzal"` (via
   `_runnerIdentityTitle().indexOf("Quetzal")`)

**Important — these 5 named cards are illustrative examples of 3 mechanic
categories, not the full scope of this task. Discovery has already been done
for you — do not re-search the card pool, use the lists below directly.**

- **Strength reduction** — add the hook to: `Ice Carver`
  (`sets/systemupdate2021.js`, confirmed) and `Leech`
  (`sets/systemgateway.js`, confirmed). `Datasucker` and `Wyrm` were found in
  `sets/coreset.js` (the legacy, deprecated set — out of scope), but System
  Gateway/System Update 2021 reprint many coreset cards under a different
  card ID (search `sets/systemgateway.js` and `sets/systemupdate2021.js` for
  their titles first — a single grep each, not a sweep — and use whichever
  copy is actually there; skip if neither reprints them within these 3 files).
  `Sandstone` is in `sets/downfall.js` — **out of scope, do not include.**
- **Hosted virus breakers** — add the hook to: `Tranquilizer`
  (`sets/systemgateway.js`, confirmed). `Botulus`'s file location was not
  verified this session — check `sets/systemgateway.js` and
  `sets/systemupdate2021.js` first (single grep each) before assuming it's
  out of scope. `Chisel` is in `sets/downfall.js` — **out of scope, do not
  include.** `Parasite` was found in `sets/coreset.js` — same reprint check
  as Datasucker/Wyrm above before including or excluding it.
- **Free-break identity abilities** — `Chromatophores`
  (Elevation set, exact file/mechanic not yet fully traced this session —
  see the separate note below) may belong here or may need its own category;
  `Quetzal` (`sets/systemupdate2021.js`, confirmed) is handled as described
  below.

**A 4th category was flagged but not designed — do this as a follow-up, not
part of this task, once verified**: `Chromatophores` (Elevation) installs on
a piece of ice and grants it Barrier, Code Gate, and Sentry subtypes
simultaneously. This doesn't fit strength-reduction or hosted-breaker — it
changes which breaker TYPE matches the ice at all, which likely affects
`_matchingBreakerForIce` / `BreakerMatchesIce`'s subtype check specifically
(not yet traced — find where ice subtypes are read for breaker-matching
purposes before designing a fix). Do not implement a fix for this now; just
leave the existing hardcoded-title checks (Leech/Datasucker/Botulus/Quetzal)
untouched by this issue, since it's unrelated to them.

- **Free-break identity abilities** (the Quetzal category) — **this does
  not need a new hook type at all.** `Quetzal: Free Spirit`
  (`sets/systemupdate2021.js`) already has `AIImplementBreaker` defined
  (a standard zero-cost breaker, gated by `this.usedThisTurn`), but is
  missing `AIMatchingBreakerInstalled` — the same hook already being added
  to `Botulus`/`Parasite`/`Chisel`/`Tranquilizer` in the hosted-breaker
  category above. Since `ActiveCards(runner)` already includes
  `runner.identityCard` (confirmed in `utility.js`), adding
  `AIMatchingBreakerInstalled` to Quetzal is enough for the EXISTING
  `_matchingBreakerInstalled` (`ai_runner.js`) / `_matchingBreakerForIce`
  (`ai_corp.js`) chain to find it automatically — no separate mechanism.
  Add something like:
  ```js
  AIMatchingBreakerInstalled: function(iceCard) {
    if (this.usedThisTurn) return null;
    if (!CheckSubType(iceCard, "Barrier")) return null;
    return this;
  },
  ```
  to Quetzal's card definition. Then **delete** the `hasQuetzal` /
  `quetzalUsedThisTurn` special-case block entirely from
  `_evaluateServerSecurity` — it becomes dead code once `_matchingBreakerForIce`
  finds Quetzal through the normal path, since a matched "breaker" with 0
  break cost already resolves correctly through `_estimateBreakCost`.

For each of the 3 hook categories, add the new optional declarative hook (following the exact style of
existing hooks like `AIFastAdvance: true` or `AIIsScoringUpgrade: true` —
see `documentation/ai.md` section 2 for the pattern), check for the hook
FIRST, and fall back to the existing title/text-regex check only if the hook
is absent (so old cards without the hook keep working unchanged).

**1a. Strength reduction** (`_virusCountersReduceStrength`)

- New hook: `AIReducesIceStrength` — a function on the card:
  `AIReducesIceStrength: function(iceCard) { return <amount>; }`
  returning the strength reduction this card currently provides (0 if none
  right now).
- In `_virusCountersReduceStrength`, check
  `if (typeof card.AIReducesIceStrength === 'function') return card.AIReducesIceStrength(iceCard) > 0;`
  before the title check. (Note: `_effectiveIceStrength`, the caller, will
  need updating too — it currently does `reduction += Counters(card, "virus")`
  assuming 1 reduction per virus counter; change it to call
  `card.AIReducesIceStrength(iceCard)` directly when present, instead of
  inferring the amount from virus counters.)
- Add `AIReducesIceStrength` to the real `Leech` and `Datasucker` card
  definitions in `sets/` (search by title to find them), returning
  `Counters(this, "virus")` to preserve their exact current behavior.
- `Ice Carver` (a flat -1, not virus-based) needs the same treatment as a
  separate, simpler case — check how it's currently detected in
  `_effectiveIceStrength` and give it the same hook.

**1b. Hosted virus breakers** (`_isHostedVirusBreaker` / `_hostedBreakerForIce`)

- New hook: `AIHostedBreakContribution` — a function on the hosted card:
  `AIHostedBreakContribution: function(iceCard) { return <subs it can break>; }`
- Check for this hook first in `_isHostedVirusBreaker`, falling back to the
  `"Botulus"` title check and the existing text-pattern fallback.
- Add `AIHostedBreakContribution` to the real `Botulus` card definition,
  returning `Counters(this, "virus")` to preserve current behavior.

**1c. Identity free-break abilities** (`Quetzal` in `_evaluateServerSecurity`)

- No new hook type — reuse `AIMatchingBreakerInstalled` from 1b (see the
  discovery section above for the exact snippet to add to Quetzal's
  definition, and the reasoning for why the existing
  `_matchingBreakerInstalled`/`_matchingBreakerForIce` chain already covers
  this once the hook is added).
- Delete the `hasQuetzal` / `quetzalUsedThisTurn` block from
  `_evaluateServerSecurity` entirely — do not replace it with new logic,
  it becomes unnecessary once `_matchingBreakerForIce` finds Quetzal through
  the normal path.
- Verify: a barrier with an end-the-run subroutine should still correctly
  show as breakable-for-0-credits when Quetzal hasn't used the ability yet
  this turn, and NOT free once `usedThisTurn` is true — same end behavior
  as before, just reached through the generic path instead of a special case.

**Acceptance criteria for Part 1:**

- Grep `ai_corp.js` for `"Leech"`, `"Datasucker"`, `"Botulus"`, `"Quetzal"` —
  these string literals should no longer appear as the primary check (the
  text-pattern fallbacks that don't reference exact titles can remain).
- `Ice Carver`, `Leech`, and `Quetzal` must behave identically to before this
  change in actual play — this is a refactor, not a behavior change, for
  these three (the ones confirmed present and already hardcoded within the
  3 in-scope sets).
- Any of `Datasucker`, `Wyrm`, `Parasite`, `Botulus`, `Tranquilizer` that
  turn out to be reprinted within `sets/systemgateway.js` or
  `sets/systemupdate2021.js` should get the appropriate hook as a genuine
  improvement (not a refactor — they currently get no special handling).
  Skip any that aren't found in these 3 files; don't search elsewhere.
- A hypothetical new card with the same mechanic (e.g. a new virus-counter
  strength reducer) should work correctly by declaring the hook alone, with
  zero changes to `ai_corp.js`.
- No card-pool search is required — the lists above are already complete.

---

## Part 2 — Fix the ETR/damage-only blind spot in `_estimateBreakCost`

`_estimateBreakCost` currently only counts a subroutine as "required to
break" if `_textEndsTheRun()` or `_damageInText()` matches it — meaning
subroutines with other serious effects (trash a program, drain credits, give
a tag, lose a click) are treated as harmless and never contribute to the
break-cost estimate. This causes the security evaluation to underestimate
resource-denial ice.

Fix: use the same subroutine severity classification the run calculator
already gets from each ice's `AIImplementIce` hook (`result.sr`, using the
`endTheRun` / `netDamage` / `tag` / `loseCredits` / `payCredits` /
`misc_minor` / `misc_moderate` / `misc_serious` vocabulary documented in
`documentation/ai.md` section 5.2), instead of re-deriving severity from
`cardText` via regex.

- Find how `AIImplementIce` gets invoked elsewhere in the run calculator
  (search `ai_runner.js` / `runcalculator.js` for where `IceAI()` calls
  `card.AIImplementIce`) and reuse that same call path to get `result.sr`
  for the ice being evaluated in `_estimateBreakCost`.
- Treat a subroutine as "required to break" if ANY branch of its `sr` entry
  contains anything other than `misc_minor`, `loseCredits`, or `payCredits`
  (i.e. `endTheRun`, `netDamage`, `tag`, `misc_moderate`, `misc_serious` all
  count as requiring a break) — matching the run calculator's own notion of
  "a path worth avoiding."
- For ice with no `AIImplementIce` hook at all, `ai.md` says it defaults to a
  single `misc_moderate` per subroutine — so with this change, such ice
  should now correctly count ALL of its subroutines as required-to-break
  (closing exactly the blind spot described), not just the ones matching the
  old ETR/damage regex.
- Keep `_textEndsTheRun` / `_damageInText` — they're still used elsewhere
  (`_iceHasETR`, `_iceIsLethal`, `_hasGlobalETR`) and this change shouldn't
  touch those call sites.

**Acceptance criteria for Part 2:**

- A piece of ice whose only subroutine trashes a program (no ETR, no damage)
  should now contribute to `totalBreakCost` in `_evaluateServerSecurity`,
  where previously it contributed 0.
- Ice with a pure `misc_minor`/`payCredits`-only subroutine (e.g. "gain 1
  credit" with nothing else) should still correctly contribute 0 — don't
  over-correct into treating everything as required.
- Existing ETR and damage-dealing ice must keep working exactly as before —
  this should be a strict widening of what counts as "required," not a
  change to how already-covered cases are handled.

---

## Before you start

Read the full `_evaluateServerSecurity`, `_estimateBreakCost`,
`_effectiveIceStrength`, `_virusCountersReduceStrength`,
`_isHostedVirusBreaker`, and `_hostedBreakerForIce` functions in `ai_corp.js`
in full before editing anything, so the fallback logic you preserve actually
matches what's there today rather than an assumption from this spec. Ask
before making a structural decision this spec doesn't cover.

---

## Review corrections (supersede conflicting implementation details above)

The initial two-part brief is retained as historical task context. The following corrections are required for sound security estimates:

- Use a fresh Corp-owned Run Calculator, with public installed-card counts prepared and `IceAI`'s knowledge player set to Corp. Reusing `runner.AI.rc` permits hidden-hand reads in hooks such as Diviner; breaker pricing hooks must also gate private information by calculator ownership (Mayfly now does this); leaving knowledge at Runner produces guesses for the Corp's unrezzed ice.
- Use public matching hooks for both human and AI Runners. A matching hook is a capability hint, not a guarantee of affordable or complete breaking.
- Read standard activation prices/sizes from `AIImplementBreaker`, and round pumps and break batches to whole activations. Retain card-text fallback for cards without that hook.
- Use a shared severity list for regular and hosted breakers, and subtract partial hosted contributions. Hosting alone never disables ice.
- Preserve resource-denial taxes in `totalBreakCost`, but compare only `totalMandatoryBreakCost` with Runner credits when deciding `isSecure`. A Runner may accept optional punishment, even if a matching breaker is installed. This applies within mixed punishment/ETR ice as well.
- Damage equal to grip size is survivable; zero damage against an empty grip is harmless.

Validation: `node tests/corp-server-security.test.js`. See the architecture roadmap's current limits for mechanics that still need full run simulation or additional hooks.
