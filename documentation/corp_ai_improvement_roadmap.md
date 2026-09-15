# Corp AI: Server Security & Threat Evaluation Architecture

## Overview

This document outlines the architecture, existing capabilities, and future engineering roadmap for the Corp AI's server security evaluation engine in `ai_corp.js`.

The goal of this system is to replace static ICE-counting heuristics with a dynamic, capability-based simulation of the Runner's rig, credit pool, board state, and threat profile—allowing the Corp AI to evaluate true scoring windows and security lockouts like an experienced human player.

---

## Guiding Principles

### 1. Imperfect Information (Fog of War)

The AI Corp **must operate under strict imperfect information**.

- It **must never** inspect the Runner's hidden hand (`runner.grip` / `runner.hand`) to detect unplayed events or hidden threats unless revealed by an explicit game mechanism.
- Threat evaluation of hidden cards must rely entirely on **Public Information**: Runner Faction, Heap/Discard contents, active board cards, and probabilistic threat estimation.

### 2. Card-Agnostic Engine Hooks (No Hardcoded Titles)

Specific card titles (e.g., _Quetzal: Free Spirit_, _Rielle "Kit" Peddler_, _Inside Job_, _Datasucker_) mentioned throughout this roadmap are provided **strictly for context, illustration, and test-case validation**.

- **Do Not Hardcode Titles:** Logic must never rely on explicit `card.title === "X"` or `GetTitle(card) == "X"` checks unless an engine hook is completely absent.
- **Target Mechanics & Engine Hooks:** All threat modules must target generic engine attributes (subtypes, counters, hosted statuses), rule-modifier objects (`modifyStrength`, `AIMatchingBreakerInstalled`, `AIPreventBreach`), and standardized text regex fallbacks so that mechanics apply seamlessly across past, present, and future card sets.
- **Out-of-Run Context Safety:** When evaluating cards during Corp turn planning, hooks that rely on active run/encounter states (e.g., `CheckEncounter()` inside `modifyStrength.Resolve`) must be safely checked or simulated out-of-run to prevent false zero-returns or runtime crashes.

---

## Architecture Roadmap & Status

### Layer 1: Tactical ICE & Breaker Math — `[COMPLETED]`

- **Breaker Matching:** Maps active installed breakers and identities against ICE subtypes using `AIMatchingBreakerInstalled` / `BreakerMatchesIce` for both human and AI Runners. Hosted counter contributions are evaluated separately, and matching paid breakers are compared by estimated cost.
- **Break Cost Estimation:** Reads activation prices and sizes from existing `AIImplementBreaker` hooks, with card-text regex as a fallback. Pump and break batches are rounded to whole activations. Public installed-breaker counts are prepared on a fresh Corp-owned calculator.
- **Subroutine-Specific Filtering:** Classifies the Corp's actual ice, including unrezzed ice, through a Corp-owned calculator and `AIImplementIce`. Resource-denial effects contribute to `totalBreakCost` (the estimated cost of avoiding punishment). `totalMandatoryBreakCost` counts breaks needed to avoid ETR or lethal damage; only this mandatory cost is compared with Runner credits to declare security. Optional tags or program trash never establish a lockout by themselves. Negligible effects (`misc_minor`/`loseCredits`/`payCredits`) are ignored by the avoidance filter.
- **Effective ICE Strength:** Factors in active strength-reducing cards and virus counters via `_effectiveIceStrength()`.

### Layer 2: Global & Root Security — `[COMPLETED]`

- **Defensive Upgrades:** Inspects server root for breach-preventing upgrades (_Ash 2X3301_, _Caprice Nisei_) via `_hasDefensiveUpgrade()` using `card.AIPreventBreach`.
- **Global ETR Counters:** Evaluates scored agendas with hosted counters (_Nisei MK II_) to recognize global, click-free ETR capabilities via `_hasGlobalETR()`.
- **Punitive Lethality:** Calculates hand-size flatline risks (`_iceIsLethal()`); damage must exceed grip size to be lethal. The mandatory-break estimate breaks only enough damage subroutines on a piece of ice to avoid flatlining.

### Layer 3: Non-Standard Tools & Efficiency — `[COMPLETED]`

- **Hosted Virus Breakers:** Uses the shared subroutine classification for complete free coverage (`_hostedBreakerForIce()`); partial contributions reduce remaining paid breaks. Insufficient counters and unrelated hosted cards never disable the host ice.
- **ID Ability Lockouts:** Models single-subroutine Barrier bypasses for Runner identities (e.g., _Quetzal: Free Spirit_).
- **Set-Agnostic Design:** Uses declarative hooks (`AIReducesIceStrength`, `AIHostedBreakContribution`, `AIMatchingBreakerInstalled`) as the primary path, with text-pattern matching fallbacks (e.g., `"hosted virus counter … break … subroutine"`) only for cards that don't declare a hook. Title fast-paths were removed from `ai_corp.js` in the declarative-hooks refactor.

---

## Pending Roadmap: Advanced Threat Modules

Future AI prompts should implement the remaining macro-threat capabilities listed below in sequence:

### Layer 4: Structural & Type Shifts (Mechanic Classes)

- **Goal:** Replace legacy title fast-paths with engine-hook evaluation and generic pattern matchers for type shifts, targeted bypasses, and layer-depth threats.
- **Dynamic Subtype Shifts:**
  - Generic helper `_effectiveIceSubtypes(iceCard, server, iceIndex)` that checks active card modifier hooks or text patterns for `gains [subtype]` / `treat as [subtype]` (e.g., _Chromatophores_, _Rielle "Kit" Peddler_, _Egret_).
  - Replaces subtype-specific breaker matching with effective subtype matching (e.g., matching outer ICE against Decoders when type-shifted).
- **Targeted ICE Bypasses:**
  - Generic helper `_iceIsBypassed(iceCard)` checking core engine bypass flags (`iceCard.bypassed` / targeted host relationships).
- **Server Structural Depth:**
  - Evaluates 1-ICE vs. Multi-ICE server resilience against outermost-ICE bypass abilities. Single-ICE remote servers holding high-value agendas carry higher structural risk penalties.
- **Entire ice bypasses:**
  - Evaluate threat from cards that redirect runs to a different server therefore bypasses all the ICE (e.g., _Sneakdoor Beta_).

### Layer 5: Public Threat Memory (Imperfect Information Engine)

- **Goal:** Model hidden-card threats (_Inside Job_, _Spear Phishing_, _Forged Activation Orders_) without cheating.
- **Public Threat Estimator:** `_estimateRunnerBypassRisk(server)`
  1. Inspect `runner.identity.faction` (e.g., Criminal carries inherently higher early-game bypass probability).
  2. Inspect `runner.heap` / discard to count revealed copies of run events.
  3. Calculate remaining unaccounted copies: `Math.max(0, expectedCopies - heapMatches)`.
  4. Apply risk penalty to single-ICE servers proportional to remaining unaccounted copies. If all copies are in the Heap, threat probability drops to 0.

### Layer 6: Runner Effective Credit Ceiling

- **Goal:** Prevent false confidence when the Runner's raw credit pool is low but their action economy is rich.
- **Effective Credit Pool Calculation:**
  - Raw credits: `runner.credits`.
  - Add active recurring credits (e.g., _Cyberfeeder_, _Multithreader_, _Ghost Runner_, stealth credits).
  - Add available Bad Publicity credits.
  - Factor in click-to-credit conversion potential if the Runner has remaining clicks.

### Layer 7: Central Server Threat Asymmetry & Win-Cons

- **Goal:** Differentiate Remote server defense from HQ/R&D defense based on game state.
- **Access Multiplier Penalty:**
  - Scale central server protection urgency based on active multi-access cards installed in the Runner's rig (_Conduit_, _Maker's Eye_, _Interface_, _HQ Interface_).
- **Macro Win-Con Classification:**
  - Detect non-interactive or central-focused Runner archetypes (e.g., heavy keyhole/milling or burn decks) to prevent the AI Corp from over-investing in remote servers while Centrals collapse.

---

### Layer 8: Baits & Bluffs

- **Goal:** Understand when to leave a server with less security to bait the runner into a trap (e.g, _Urtica Cipher_), but without being too obvious. Conversly, when to bluff by unprotecting a server to look like a trap (e.g. deadly asset that can be advanced), but playing an agenda in there instead.
- TODO

---

## Reference Engine Hooks & Helpers in `ai_corp.js`

| Engine Hook / Method              | Role                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `_evaluateServerSecurity(server)` | Primary entry point. Returns `{isSecure, hasHardLockout, totalBreakCost, totalMandatoryBreakCost, runnerCredits, reasons}`. |
| `card.modifyStrength`             | Engine hook defining strength modifiers. Inspected in `_effectiveIceStrength()`.                                            |
| `card.AIMatchingBreakerInstalled` | Engine hook on cards/identities that return matching capability for an ICE.                                                 |
| `card.AIPreventBreach`            | Engine hook on root cards/upgrades that prevent breach.                                                                     |
| `_effectiveIceStrength(iceCard)`  | Returns ICE strength minus active debuffs from engine hooks and virus counters.                                             |
| `_matchingBreakerForIce(ice)`     | Resolves matching breaker via active card hooks, hosted cards, or subtype fallbacks.                                        |

## Regression Validation and Current Limits

Run `node tests/corp-server-security.test.js` for focused checks of calculator ownership, actual unrezzed ice classification, breaker activation costs, mandatory versus optional punishment, hosted coverage, lethality, and human/AI identity matching. These tests load the real AI classes and priority card definitions with deterministic engine helpers; they do not replace browser gameplay testing.

Security remains a per-ice heuristic, not a complete run simulation. It does not yet model cumulative damage across encounters, encounter payments, combined optional-effect sequences that disable later breakers, shared strength-reducer counter spending across multiple ice, or the effective-credit ceiling planned in Layer 6. `AIImplementBreaker` pricing probes support the standard `ImplementIcebreaker` activation path; other special breaker mechanisms need their own capability hooks.
