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

Future AI prompts should implement the remaining macro-threat capabilities listed below in sequence.

### Layer 3.5: Multi-Server Protection Allocation — `[GAP — NOT ADDRESSED BY LAYERS 1-3]`

- **Goal:** Layers 1-3 improved the _accuracy_ of evaluating whether a given server is secure. None of that work touches _allocation_ — which server actually gets an install action when several are simultaneously insecure. This is a distinct, more foundational problem: accurate evaluation of a server that never gets chosen for protection is wasted.
- **The concrete gap:** `_serverToProtect()` computes a protection score for every server (HQ, R&D, each remote, archives) but returns exactly one `serverToProtect` per call — the single worst-scoring server. It does not fix multiple simultaneously-insecure servers across a turn, and does not carry state across turns to ensure a server that lost out this turn gets priority next turn.
- **Why this matters more than it looks:** this was the root cause of the original "HQ left with zero ice" bug that started this whole investigation — a server can be correctly judged insecure by the now-accurate Layer 1-3 machinery and still never receive protection, because something else keeps scoring as more urgent that specific turn.
- **Suggested approach:** either (a) extend the Corp AI's main-phase install loop to spend multiple clicks/install actions per turn against the _ranked list_ of insecure servers already computed by `_serverToProtect()`'s internals, rather than discarding all but the single worst score, or (b) add a persistence mechanism so a server that loses the ranking this turn is weighted higher next turn if it's still unaddressed. Needs a decision on which approach before implementation — this is a design question, not just a coding task.

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
  4. Fold in grip size as an additional public signal — `runner.grip.length` (or the Runner's hand-size equivalent) is public information: a Runner sitting on a large hand is statistically more likely to be holding a bypass/run event than one on a near-empty hand. Cheap to add to the same estimator, not a separate module.
  5. Apply risk penalty to single-ICE servers proportional to remaining unaccounted copies. If all copies are in the Heap, threat probability drops to 0.

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

- **Goal:** Understand when to leave a server with less security to bait the Runner into a trap (e.g., _Urtica Cipher_), but without being too obvious. Conversely, when to bluff by leaving a server looking like a trap (e.g., a deadly asset that can be advanced) while actually playing an agenda there.
- **Key design constraint — who is actually being deceived:** the Corp AI never plays against the Runner AI; it plays against a human. This layer is not solvable with deterministic unit tests the way Layers 1-7 are (there's no "correct" objective answer to check against) — its correctness is about long-run unpredictability across many games against a human who is actively trying to learn the AI's patterns, not about any single decision being locally optimal.

**8.1 Baiting (under-defend a real trap) — build this first, lower risk**

- Generic hook `AIPunishesAccess(server)` on trap/ambush cards (e.g., _Urtica Cipher_), returning the severity of the punishment if accessed unprotected. Set-agnostic by construction — any future punishing asset/upgrade just declares this, same pattern as every other hook in this codebase.
- `_calculateBaitFrequency(server)`: instead of a fixed random chance, calculate the bait probability per-server using the same logic as a poker bluff-frequency (`bet / (bet + pot)`-style ratio): a server with a severe `AIPunishesAccess` value needs a _lower_ bait frequency to stay correctly balanced than a mild one, since the downside of guessing wrong is bigger — dangerous traps can therefore be baited rarely and still stay credible.
- Roll `Math.random()` against that calculated threshold, independently per server per game — the randomness itself is necessary and correct, it's the threshold that must be computed rather than fixed.

**8.2 Bluffing (protect a real agenda to look like a trap) — harder, sequence after 8.1**

- Requires the Corp AI to act _against_ its own otherwise-optimal install/protection pattern purely to create a false signal, which risks measurably worse average play if the bluff doesn't land — unlike baiting, which is a locally-contained decision on a server that's already a trap.
- Needs the same generic legibility signals a human would actually read (server card count, remote-vs-central framing, protection posture relative to the AI's recent actions) rather than anything Urtica-Cipher-specific, since there's no card-level hook to hang this on the way `AIPunishesAccess` works for baiting.

**8.3 Tag-and-Bag Deterrence (real threat, not a fake trap)**

- A different mechanism achieving the same goal as 8.1/8.2 — shaping the Runner's uncertainty — but through an actual credible threat rather than a bluff. A tagged Runner facing a Corp holding a tag-punishment operation is in a genuinely different risk situation than an untagged one, even against the identical server.
- Generic hook `AITagPunishment` already exists (used elsewhere in `ai_corp.js`) — this layer's work is surfacing that existing signal into the security/deterrence picture: when deciding whether a server needs _actual_ ice investment versus relying on the deterrent value of a live tag-punishment play in hand, factor in `runner.tags > 0` and whether the Corp currently holds a card with `AITagPunishment`.
- Unlike 8.1/8.2, this doesn't need calculated randomness — the deterrence is real, not simulated, so it's closer to Layers 1-7 in character (an objective factor to evaluate) than to 8.1/8.2's game-theory framing.

**Unpredictability requirement (applies to 8.1 and 8.2):** the random roll must never observably correlate with any single game-state variable a human could learn to read over repeated games (e.g., always baiting on turn 3, or only when a specific card is in hand) — a human doesn't need to break any single decision, only find a pattern across many games. Long-run frequency across many games is the thing that has to hold up, not any individual roll.

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
