# Eternal Format & Legacy Set Card Hooks Backlog

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
