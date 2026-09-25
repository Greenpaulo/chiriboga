# I1 Unified install candidate model

**Roadmap item:** I1 · **Depends on:** I0 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Replace implicit concatenation priority with explicit, inspectable install
candidate records while initially preserving behaviour. This is the foundation
every later I item scores against; it must not change card selection policy.

## Current behaviour
`_rankedInstallOptions()` concatenates independently generated option groups
and `_bestInstallOption()` takes the first generated preference that matches a
legal engine option, so cross-category comparison is impossible. ICE install
generation first picks a server via `_serverToProtect()` (with an optional
eligibility predicate) and only then lists ICE for it.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- Inspect all current producers and consumers of `_rankedInstallOptions()` and
  `_bestInstallOption()` before changing them.
- Normalize all legal ICE and root install choices into one candidate structure
  (the install candidate record in the design note).
- Enumerate card and destination jointly. Do not select one protection server
  and discard other destinations before candidate-level legality and
  affordability have been evaluated.
- Preserve present priority groups, and therefore current choices, through
  temporary compatibility score bands.
- Add structured reasons and rejection reasons, and attach relevant
  server-security diagnostics.
- Make `_bestInstallOption()` consume the ranked candidate list.
- Remove duplicate `(card, server)` candidates or merge their reasons
  deterministically.
- Keep generated preferences compatible with card-driven install effects and
  non-HQ card sources.
- Keep `_rankedInstallOptions()` as a compatibility wrapper; engine-facing
  preferences still resolve to `{cardToInstall, serverToInstallTo}`.
- Add baseline fixtures in `tests/corp-install-decisions.test.js`.
- Avoid changing card selection policy until the baseline is observable.
- Update `documentation/ai.md` only if a card-facing hook contract changes.

## Safety and information boundary
Hypothetical evaluation must not change card locations, server contents,
counters, protection debt, or cached deception decisions. Existing
priority-only and free install/rez behaviour must be preserved exactly.

## Test scenarios
1. Existing priority-only calls still exclude unaffordable ICE and unsafe
   new-server root installs.
2. Free install/rez effects preserve their less-inhibited behaviour.
3. The same legal option is not emitted twice because two legacy categories
   selected it.
4. Candidate ranking is stable when unrelated cards are reordered outside the
   relevant option group.
5. No hypothetical evaluation changes card locations, server contents,
   counters, protection debt, or cached deception decisions.
6. A higher-ranked server with no viable install candidate does not suppress a
   lower-ranked server with an affordable, useful candidate.

## Acceptance gate
Existing focused AI tests pass, baseline fixtures retain intended selections,
and every returned install preference has a score breakdown and reason.

## Things to consider
- The `_serverToProtect(..., targetIsEligible)` predicate is an interim
  compatibility bridge (migration step 7 in the design note). Joint
  enumeration here is what eventually allows its retirement from ordinary
  ICE-install generation; the server ranking itself stays for diagnostics.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
