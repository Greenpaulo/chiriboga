# Eternal Format & Legacy Set Card Hooks Backlog

## Format status

The **Eternal** option in the Custom Game format selector (`index.php` →
`formatRegistry.eternal` in `config.js`) is **enabled**. It loads every set
registered in `setRegistry.availableSets` (`sg, su21, df, ur, ms, ph, tai, rwr,
elev, core, cac`), i.e. every card ever released, and opens the deckbuilder
(`decklauncher.php`) with that full card pool.

Notes:

- `selectFormat()` only offers precons whose own `sets` array is fully covered
  by the chosen format, so `su21` and `cac` must stay in `eternal.sets` or most
  precons become ineligible. `tests/eternal-format.test.js` guards this.
- The random-deck generator (`DeckBuild` in `utility.js`) only has curated card
  lists for `sg`, `su21`, and `ms`; identities without a precon can therefore
  generate sparse lists even though the manual card pool exposes everything.
  This is tracked as an open follow-up in **section 4** below.

## Overview

This document tracks out-of-scope cards identified during the System Gateway, System Update 2021, and Elevation refactoring pass.

These cards feature mechanics such as **strength reduction**, **hosted-on-ice breakers**, or **subtype modifications**. They are retained here as an explicit reference so future Eternal format updates can add declarative hooks (`AIReducesIceStrength`, `AIHostedBreakContribution`, `AIMatchingBreakerInstalled`) without performing broad file greps or full card-pool sweeps.

---

## 1. Strength Reduction (`AIReducesIceStrength`)

Hook specification:
`AIReducesIceStrength: function(iceCard) { return amount; }`

| Card       | Set File                             | Evidence       | Notes & Implementation Target                                    |
| ---------- | ------------------------------------ | -------------- | ---------------------------------------------------------------- |
| Datasucker | sets/coreset.js                      | Brief-reported | Virus counter strength reducer. Returns Counters(this, "virus"). |
| Wyrm       | sets/coreset.js                      | Brief-reported | Active credit-to-strength reducer ability.                       |
| Sandstone  | sets/downfall.js                     | Brief-reported | Dynamic strength modifier based on virus counters / state.       |
| Ice Carver | sets/systemupdate2021.js (~line 629) | Observed       | **Implemented** (Flat -1 reduction).                             |
| Leech      | sets/systemgateway.js (~line 595)    | Observed       | **Implemented** (Returns Counters(this, "virus")).               |

---

## 2. Hosted-on-Ice / Special Breakers (`AIHostedBreakContribution` / `AIMatchingBreakerInstalled`)

Hook specification:
`AIHostedBreakContribution: function(iceCard) { return subsItCanBreak; }`

| Card         | Set File                           | Evidence | Notes & Implementation Target                                                      |
| ------------ | ---------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Botulus      | sets/systemgateway.js (~line 181)  | Observed | **Implemented** (Returns Counters(this, "virus")).                                 |
| Tranquilizer | sets/systemgateway.js (~line 1424) | Observed | **Verified** — Uses AIMatchingBreakerInstalled for derez effect; no change needed. |
| Chisel       | sets/downfall.js (~line 73)        | Observed | Trashes host ice on encounter via AIMatchingBreakerInstalled.                      |
| Parasite     | sets/coreset.js (~line 387)        | Observed | Destroys host ice when strength reaches 0 via AIMatchingBreakerInstalled.          |
| Physarum     | sets/rebellion.js (~line 122)      | Observed | Bypasses host ice on encounter via AIMatchingBreakerInstalled.                     |

---

## 3. Subtype & Type Shifting (Flagged 4th Category)

| Card           | Set File                     | Evidence | Notes                                                                                                                                                                                          |
| -------------- | ---------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromatophores | sets/elevation.js (line 615) | Observed | Installs on ICE and grants it **Barrier**, **Code Gate**, and **Sentry** subtypes simultaneously. Requires dedicated subtype-matching handling in \_matchingBreakerForIce / BreakerMatchesIce. |

---

## Discovery & Execution Caveats

1. **Non-Exhaustive:** Out-of-scope sets (`coreset.js`, `downfall.js`, `rebellion.js`) were **not** fully swept. This list captures cards named in the task specification or surfaced via targeted grep snippets.
2. **Other `AIMatchingBreakerInstalled` References:** Standard breakers and identity abilities inspected during discovery:

- Atman (`sets/systemupdate2021.js` ~2560) — Standard variable-strength breaker.
- Chameleon (`sets/systemupdate2021.js` ~2723) — Standard temporary breaker.
- Rielle "Kit" Peddler (`sets/systemupdate2021.js` ~2175) — Code Gate subtype modification identity.

3. **Execution Directive:** When updating these legacy cards in future passes, supply the exact file path and card target directly in the prompt to prevent unnecessary file discovery or token consumption.

---

## 4. Random-deck (`DeckBuild`) coverage for legacy sets

**Status:** Open — user-visible limitation in Eternal and any multi-set format;
no crash, generated decks are legal but thin.

**Symptom:** Pressing **Random deck** in the deckbuilder, or switching to an
identity that has no matching precon (the identity-change handler falls back to
the same generator), produces a deck made up almost entirely of
`sg`/`su21`/`ms` cards. With **Eternal** enabled the manual card pool shows all
11 sets, but auto-generated decks only draw from those three.

**Cause:** `DeckBuild()` in `utility.js` constructs each card pool from
hardcoded ID arrays, each guarded by `setIdentifiers.includes("<code>")`, and
only `sg`, `su21`, and `ms` are handled. The other registered sets (`df`, `ur`,
`ph`, `tai`, `rwr`, `elev`, `core`, `cac`) contribute no cards.

Evidence — `DeckBuild()`, `utility.js` lines 4587-4899:

| Pool                                        | Lines     | Sets handled |
| ------------------------------------------- | --------- | ------------ |
| runner consoles (`consoleCards`)            | 4604-4623 | sg, su21, ms |
| runner fracters (`fracterCards`)            | 4625-4645 | sg, su21, ms |
| runner decoders (`decoderCards`)            | 4647-4668 | sg, su21     |
| runner killers (`killerCards`)              | 4670-4688 | sg, su21     |
| runner credit economy (`creditEconomyCards`) | 4690-4715 | sg, su21, ms |
| runner draw economy (`drawEconomyCards`)    | 4717-4740 | sg, su21, ms |
| runner other (`otherCards`)                 | 4742-4775 | sg, su21, ms |
| corp agendas (`agendaCards`)                | 4781-4804 | sg, su21     |
| corp economy (`economyCards`)               | 4806-4827 | sg, su21     |
| corp ice (`iceCards`)                       | 4829-4861 | sg, su21     |
| corp other (`otherCards`)                   | 4863-4895 | sg, su21     |

`setIdentifiers` is the global array each loaded set file pushes its code into;
it is initialised in `decklauncher.php:25`, `index.php:133`, `gauntlet.php:24`,
and `engine.php:37`.

**Recommended fix (generic derivation, not more hardcoded lists):**

1. Add a helper that returns every card ID in `cardSet` whose owning set is in
   `setIdentifiers`. Derive the set from
   `setRegistry.availableSets[*].idRange` in `config.js` (documented there as
   "Used to map cards to sets when carddata.json doesn't have pack_code info"),
   so the generator does not need `carddata.json`.
2. Classify the IDs with fields already present on card definitions:
   `player`, `cardType` (`agenda`, `ice`, `asset`, `upgrade`, `operation`,
   `program`, `hardware`, `resource`, `event`) and `subTypes`
   (e.g. `["Icebreaker","Fracter"]`, see `sets/systemgateway.js` line 423).
3. Feed the derived lists into the existing `DeckBuildRandomly()`
   (`utility.js:4361`) and `DeckBuildRandomAgendas()` (`utility.js:4499`) calls,
   keeping the current `sg`/`su21`/`ms` lists as a preferred overlay so existing
   behaviour is preserved.
4. Watch `deckBuildingMaxTime` (`utility.js:4271`, currently 200ms): bigger
   pools mean more rejection sampling. Filter by side/faction and honour
   `limitPerDeck` before adding a card to a pool to stay inside that budget.

**Files to change:** `utility.js` (`DeckBuild`, ~4587-4899); optionally
`config.js` if the ID-to-set-code helper is shared.

**Acceptance criteria:**

- In Eternal, an identity with no matching precon (e.g. a Core Set or Creation
  and Control identity) generates a legal deck that includes cards from its own
  set, not only `sg`/`su21`/`ms`.
- Deck size, minimum deck size, influence limit, and max-copies limits are
  unchanged, and no opposite-side cards appear.
- `sg`/`su21`/`ms` output quality is not regressed.

**Test:** extend `tests/decklauncher-identity-change.test.js`, which already
exercises the no-precon `DeckBuild()` fallback, or add
`tests/deckbuild-legacy-sets.test.js` using its `fixture()` + `vm` pattern.
