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

## Card implementation

- Cards that need updating with the new AI Hooks implemented in this work exist in `/sets`. For this initial implementation we are only focused on 3 sets - `systemgateway.js`, `systemupdate2021.js` and `elevation.js`.
- If cards need changes due to new hooks being added in order for them to be picked up by this new threat evaluation architecture, then please make sure to update them as part of the work, and then also update the relevant layer with notes on the cards that were updated as part of that layer, ensuring that all relevant cards have been updated and none missed.
- **AI hook documentation is a crucial part of completing every layer.** Whenever a layer adds, changes, or begins consuming a card-facing AI hook, update `documentation/ai.md` in the same change. Document the hook's signature or schema, return semantics, valid information sources and out-of-run safety constraints, at least one card-definition example, and its quick-reference entry. A layer is not complete until future card implementations can discover and correctly adopt its hooks from that document.

## Follow-up documentation

- If implementing a layer reveals a worthwhile refinement, limitation, calibration task, or architectural follow-up that is outside the current layer's safe scope, add it to this roadmap beneath the relevant layer rather than leaving it only in code comments or the implementation summary.
- Document it as a clearly labelled follow-up subsection, following the pattern used by **Layer 4.1: Unified Bypass Capability Allocation**. Include the goal, proposed design, compatibility or safety constraints, deterministic regression scenarios, and an acceptance gate where applicable.
- Keep the completed layer marked as completed when its stated scope is delivered. The follow-up should have its own status so it does not obscure what is implemented today or imply that speculative work has already shipped.

---

## Architecture Roadmap & Status

### Layer 1: Tactical ICE & Breaker Math — `[COMPLETED]`

- **Breaker Matching:** Maps active installed breakers and identities against ICE subtypes using `AIMatchingBreakerInstalled` / `BreakerMatchesIce` for both human and AI Runners. Hosted counter contributions are evaluated separately, and matching paid breakers are compared by estimated cost.
- **Break Cost Estimation:** Reads activation prices and sizes from existing `AIImplementBreaker` hooks, with card-text regex as a fallback. Pump and break batches are rounded to whole activations. Public installed-breaker counts are prepared on a fresh Corp-owned calculator.
- **Subroutine-Specific Filtering:** Classifies the Corp's actual ice, including unrezzed ice, through a Corp-owned calculator and `AIImplementIce`. Resource-denial effects contribute to `totalBreakCost` (the estimated cost of avoiding punishment). `totalMandatoryBreakCost` counts breaks needed to avoid ETR or lethal damage; only this mandatory cost is compared with Runner credits to declare security. Optional tags or program trash never establish a lockout by themselves. Negligible effects (`misc_minor`/`loseCredits`/`payCredits`) are ignored by the avoidance filter.
- **Effective ICE Strength:** Factors in active strength-reducing cards and virus counters via `_effectiveIceStrength()`.

### Layer 2: Global & Root Security — `[COMPLETED]`

- **Defensive Upgrades:** Inspects server root and active Corp cards via `_hasDefensiveUpgrade()` using `card.AIPreventBreach`. _Ash 2X3ZB9CY_ and _Caprice Nisei_ are intended examples, but neither currently has a set implementation; because their prevention depends on a trace or psi game, they should not receive an unconditional boolean hook.
- **Global ETR Counters:** Evaluates scored agendas with declared, server-specific global ETR policy (_Nisei MK II_) via `_globalETRUses(server)`.
- **Punitive Lethality:** Calculates hand-size flatline risks (`_iceIsLethal()`); damage must exceed grip size to be lethal. The mandatory-break estimate breaks only enough damage subroutines on a piece of ice to avoid flatlining.

#### Layer 2.1: Finite Global ETR Capacity — `[FOLLOW-UP]`

- **Goal:** Model global end-the-run counters as finite run taxes rather than permanent server lockouts.
- **Design:** Cards expose `AIGlobalETRUses(server)`, shared by their live `Enumerate` policy and `_globalETRUses(server)`. Capacity at least equal to the Runner's projected run attempts is a hard lockout; smaller capacity adds one repeated mandatory route cost per use.
- **Compatibility and safety:** The hook must be deterministic from public state, safe outside a run, and must not inspect hidden Runner card identities. Conditional cards should return zero on servers where their live policy would preserve the counter.
- **Regression scenarios:** One counter against four clicks adds one route cost without locking the server; capacity covering every projected run is a lockout; Nisei gives no security credit when a breach cannot win; hidden Grip contents are never inspected.
- **Acceptance gate:** The evaluator and the card's activation decision consume the same hook, and all security regressions pass.

### Layer 3: Non-Standard Tools & Efficiency — `[COMPLETED]`

- **Hosted Virus Breakers:** Uses the shared subroutine classification for complete free coverage (`_hostedBreakerForIce()`); partial contributions reduce remaining paid breaks. Insufficient counters and unrelated hosted cards never disable the host ice.
- **ID Ability Lockouts:** Models single-subroutine Barrier bypasses for Runner identities (e.g., _Quetzal: Free Spirit_).
- **Set-Agnostic Design:** Uses declarative hooks (`AIReducesIceStrength`, `AIHostedBreakContribution`, `AIMatchingBreakerInstalled`) as the primary path, with text-pattern matching fallbacks (e.g., `"hosted virus counter … break … subroutine"`) only for cards that don't declare a hook. Title fast-paths were removed from `ai_corp.js` in the declarative-hooks refactor.

---

## Pending Roadmap: Advanced Threat Modules

Future AI prompts should implement the remaining macro-threat capabilities listed below in sequence.

### Layer 3.5: Multi-Server Protection Allocation — `[COMPLETED]`

- **Goal:** Layers 1-3 improved the _accuracy_ of evaluating whether a given server is secure. None of that work touches _allocation_ — which server actually gets an install action when several are simultaneously insecure. This is a distinct, more foundational problem: accurate evaluation of a server that never gets chosen for protection is wasted.
- **The original gap:** `_serverToProtect()` computed a protection score for every server (HQ, R&D, each remote, archives) but returned exactly one `serverToProtect` per call — the single worst-scoring server. It did not fix multiple simultaneously-insecure servers across a turn or carry state across turns to prioritize a server that previously lost the ranking.
- **Why this matters more than it looks:** this was the root cause of the original "HQ left with zero ice" bug that started this whole investigation — a server could be correctly judged insecure by the Layer 1-3 machinery and still never receive protection because something else kept scoring as more urgent.
- **Implemented approach:** `_rankedServersToProtect()` retains the full ordered target list. During a Corp turn, protection installs rotate through as-yet-unprotected insecure servers before adding another layer to a server already handled that turn. At the end of the Runner turn, skipped insecure servers gain a bounded protection-debt adjustment, while protected or secure servers reset their debt. This hybrid preserves the existing one-action-at-a-time main-phase priorities while preventing both same-turn and cross-turn starvation. The legacy HVT guarantee remains authoritative: if a generic remote or new-server slot would otherwise win the ranking while an HVT is installed, that protection action is redirected to the HVT's server rather than merely tying its score and relying on insertion order.

#### Layer 3.5.1: Value-Weighted Protection Debt — `[FOLLOW-UP — REQUIRES CALIBRATION]`

- **Goal:** Let a repeatedly skipped high-consequence server gain urgency faster than an ordinary empty server without recreating starvation in the opposite direction.
- **Proposed design:** Add `_protectionDebtIncrement(entry)` and use it when aging an insecure server. Start with a narrow, bounded range rather than multiplying the complete protection score—for example, a base increment plus a small public-information consequence bonus. Candidate signals include agenda points exposed by a breach, whether a remote contains an advanced agenda, whether a breach could win the game, and whether Archives is a live backdoor. Existing protection-score inputs must not be counted twice.
- **Safety constraints:** Same-turn rotation remains authoritative; weighting affects only cross-turn debt. Keep both the per-turn increment and total accumulated debt capped. Every continuously insecure server must still have a maximum waiting time, while secure, protected, removed, or repurposed servers must clear or decay their debt. The calculation must use public Corp knowledge and must never inspect hidden Runner cards.
- **Telemetry before tuning:** For each protection decision, record the raw score, security result, current debt, debt increment, adjusted score, chosen server, available ICE, and whether the server was breached before the next Corp turn. Aggregate protection-share, time-to-first-protection, successful breaches, stolen agenda points, and win-causing breaches by server class. Logging should be opt-in so normal games remain quiet.
- **Deterministic regression scenarios:**
  1. Equal-risk insecure servers still rotate within the same turn.
  2. A repeatedly skipped agenda-rich HQ or game-winning remote accumulates debt faster than an empty remote.
  3. A low-value insecure server is selected within the configured maximum wait despite competing with a high-value server.
  4. Installing protection or becoming secure resets debt; destroying a remote removes stale debt.
  5. Archives gains extra urgency only while it is an active backdoor.
  6. Results are unchanged when hidden Runner grip contents change without any corresponding public-information change.
- **Simulation matrix:** Compare the current flat-debt baseline against candidate weightings for simultaneous naked centrals, HQ agenda flood, an advanced scoring remote, an HVT remote, an Archives backdoor, a poor Corp with one affordable ICE, and a Corp with no installable ICE. Run fixed seeds for reproducibility, then broader randomized batches to detect allocation bias.
- **Acceptance gate:** Implement weighted debt only if it reduces high-consequence breaches without increasing any continuously insecure server's worst-case wait beyond the configured cap. Keep the present flat-debt behavior as the fallback until those measurements exist.

### Layer 4: Structural & Type Shifts (Mechanic Classes) — `[COMPLETED]`

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

**Implemented notes:** `_effectiveIceSubtypes()` now combines the Corp-owned run calculator with active `modifySubTypes`/`AIModifyIceAI` hooks and a hosted-card wording fallback, including correct outermost-encounter handling for _Rielle "Kit" Peddler_. Targeted paid bypasses use `AIBypassesIce`; reusable single-encounter and outermost-only structural bypasses use `AIBypassesOneIce` and `AIBypassesOutermostIce`. Single-ICE agenda remotes receive a bounded protection penalty while one of those public bypasses is live, while multi-ICE servers retain their inner layer. Server redirects use `AIRedirectsRun` plus a generic wording fallback, removing the former _Sneakdoor Beta_ title check. Updated cards in the scoped sets: _Femme Fatale_ and _Sneakdoor Beta_ (`systemupdate2021.js`), plus _Fransofia Ward_ and _Maintenance Access_ (`elevation.js`). _Egret_, _Chromatophores_, and _Rielle "Kit" Peddler_ already exposed sufficient subtype engine hooks and required no card-definition changes. No relevant Layer 4 card in `systemgateway.js` required an update.

#### Layer 4.1: Unified Bypass Capability Allocation — `[FOLLOW-UP]`

- **Goal:** Replace the separate targeted, outermost, one-shot, and redirect checks with one normalized capability model, allowing the evaluator to allocate all public bypass tools across the complete run instead of optimizing each mechanic class independently.
- **Capability contract:** Introduce a declarative hook such as `AIBypassCapabilities(server)` that returns capability objects describing:
  - scope (`ice`, `outermost`, `any-one-ice`, or `server-redirect`);
  - eligible target or target predicate;
  - credit cost and any non-credit cost (trash, counters, clicks, once-per-turn usage);
  - number of available uses and whether use persists across encounters;
  - source and destination servers for redirects.
- **Normalization and compatibility:** Add `_runnerBypassCapabilities(server)` to normalize the new objects and adapt the existing `AIBypassesIce`, `AIBypassesOneIce`, `AIBypassesOutermostIce`, and `AIRedirectsRun` hooks. Keep those hooks as compatibility shims until scoped cards have migrated.
- **Run-wide allocation:** Add `_allocateBypassesForServer(server, capabilities)` to assign finite-use capabilities to ICE layers jointly. Optimize for the cheapest path through mandatory effects first, then total punishment avoided; never spend the same card, counter, or once-per-run ability twice. An outermost-only capability must target the first relevant encounter after unaffordable unrezzed ICE is skipped, while an any-one-ICE capability may be saved for a more expensive inner lockout.
- **Cost fidelity:** Preserve the distinction between a hard lockout and an unaffordable soft lockout. A finite bypass cost proves that the Runner has a capability even when their current credits cannot pay for it. Optional bypasses must not add mandatory cost when simply allowing the ICE to fire is cheaper.
- **Information boundary:** Build capabilities only from public, active Runner cards and public state. Hidden grip events remain the responsibility of Layer 5's probabilistic threat estimator.
- **Deterministic regression scenarios:**
  1. Two one-use bypass tools are allocated to two different ICE and are never double-spent.
  2. An outermost-only bypass skips the first relevant encounter, including when an unrezzable outer ICE is passed without encounter.
  3. An any-one-ICE bypass is saved for an inner hard lockout when the outer ICE has no mandatory effect.
  4. A paid targeted bypass produces a soft credit lockout when unaffordable and is ignored when taking the subroutines costs less.
  5. A server redirect compares the complete source-server route with the direct destination route without counting destination ICE twice.
  6. Capability results do not change when hidden Runner grip contents change without a corresponding public-state change.
- **Acceptance gate:** Adopt the unified allocator only if all existing Layer 4 regressions remain unchanged and combined bypass scenarios produce a traversal cost no higher than the current per-class heuristic. Keep the current hooks as the fallback during migration.

### Layer 5: Public Threat Memory (Imperfect Information Engine) — `[COMPLETED]`

- **Goal:** Model hidden-card threats (_Inside Job_, _Spear Phishing_, _Forged Activation Orders_) without cheating.
- **Public Threat Estimator:** `_estimateRunnerBypassRisk(server)`
  1. Inspect `runner.identity.faction` (e.g., Criminal carries inherently higher early-game bypass probability).
  2. Inspect `runner.heap` / discard to count revealed copies of run events.
  3. Calculate remaining unaccounted copies: `Math.max(0, expectedCopies - heapMatches)`.
  4. Fold in grip size as an additional public signal — `runner.grip.length` (or the Runner's hand-size equivalent) is public information: a Runner sitting on a large hand is statistically more likely to be holding a bypass/run event than one on a near-empty hand. Cheap to add to the same estimator, not a separate module.
  5. Apply risk penalty to single-ICE servers proportional to remaining unaccounted copies. If all copies are in the Heap, threat probability drops to 0.

**Implemented notes:** Relevant cards declare a mechanic-level `AIHiddenThreat` profile, so `_estimateRunnerBypassRisk(server)` does not hardcode card titles. The estimator uses the Runner identity faction as a deckbuilding prior, discounts rather than excludes out-of-faction threats, subtracts publicly revealed Heap copies, and combines the remaining expected copies with the public Grip and Stack sizes. The result is a bounded protection-score penalty for one-ICE servers only; it is exposed as `publicThreatRisk` for diagnostics but never changes deterministic security or run-cost results. Updated scoped cards: _Inside Job_ and _Forged Activation Orders_ (`systemupdate2021.js`). No relevant hidden single-ICE threat was present in `systemgateway.js` or `elevation.js`; _Spear Phishing_ is not currently implemented in the scoped card pool.

#### Layer 5.1: Observed-Deck Bayesian Priors — `[FOLLOW-UP — REQUIRES CALIBRATION]`

- **Goal:** Replace fixed faction/import weights with priors learned from public deck evidence while preserving imperfect information.
- **Proposed design:** Adjust mechanic-class expectations from revealed Heap cards, installed cards, influence already observed, deck size, and optionally an offline archetype table. Keep `AIHiddenThreat` as the card-level contract and return both probability and evidence for telemetry.
- **Safety constraints:** Never inspect Grip or Stack card identities, saved decklists, or Runner-AI private caches. Public pile sizes and faceup cards are valid; hidden-card contents are not. Fall back to the current fixed prior when evidence is sparse or no calibrated archetype data exists.
- **Deterministic regression scenarios:** Hidden Grip/Stack substitutions do not change risk; revealing an in-faction threat increases the posterior before its copy is consumed by the Heap count; observed influence caps reduce implausible imported-copy estimates; exhausting all expected copies still yields zero risk.
- **Acceptance gate:** Adopt only after seeded simulations show better-calibrated predicted-versus-observed threat rates than the fixed prior without increasing false confidence on uncommon decklists.

### Layer 6: Runner Effective Credit Ceiling — `[COMPLETED]`

- **Goal:** Prevent false confidence when the Runner's raw credit pool is low but their action economy is rich.
- **Effective Credit Pool Calculation:**
  - Raw credits: `runner.credits`.
  - Add active recurring credits (e.g., _Cyberfeeder_, _Multithreader_, _Ghost Runner_, stealth credits).
  - Add available Bad Publicity credits.
  - Factor in click-to-credit conversion potential if the Runner has remaining clicks.

**Implemented notes:** `_effectiveRunnerCreditPool(server)` now returns a public-information breakdown of the Runner's base pool, already-created temporary run credits, eligible hosted/recurring credits, Bad Publicity credits, and click-to-credit potential. Corp-turn planning projects the Runner's next public click allotment and reserves one click to initiate the run; evaluation during an active run does not invent additional click credits or count Bad Publicity twice. Hosted credits are included only when their `canUseCredits("using", card)` restriction permits a public installed breaker/bypass tool. Existing `AIRunPoolCreditOffset(server, runEventCardToUse)` hooks provide server-specific public run credits, with `null` passed for the hidden run-event argument; cards exposing both interfaces are counted once. `_evaluateServerSecurity()` uses this ceiling for affordability lockouts and exposes the breakdown as `runnerCreditPool` while retaining numeric `runnerCredits` compatibility. No scoped card definitions required changes: the relevant cards in `systemgateway.js`, `systemupdate2021.js`, and `elevation.js` either expose non-run credit restrictions or hidden run-event economy, which must not be assumed by the Corp.

#### Layer 6.1: Payment-Constraint Allocation — `[FOLLOW-UP]`

- **Goal:** Replace the scalar credit ceiling with a payment allocator when a route combines restrictions such as stealth requirements, breaker-specific recurring credits, and paid bypass abilities.
- **Proposed design:** Return credit-source objects with an amount and an eligibility predicate, then allocate each source against the actual per-ICE payments. Spend the most restricted sources first and preserve unrestricted pool credits for later encounters.
- **Safety constraints:** Use only active public cards and declared hooks; never infer economy events from Grip contents. Do not mutate counters or run state while planning, and never allocate one hosted credit twice.
- **Deterministic regression scenarios:** A breaker-only credit cannot pay a bypass; a stealth breaker receives its required stealth composition; one recurring credit cannot cover two encounters; central-only credits apply only to centrals; unrestricted credits fill any remaining payment.
- **Acceptance gate:** Adopt when constrained allocation never reports a cheaper route than the legal payment engine and existing Layer 6 ceiling cases remain stable.

### Layer 7: Central Server Threat Asymmetry & Win-Cons — `[COMPLETED]`

- **Goal:** Differentiate Remote server defense from HQ/R&D defense based on game state.
- **Access Multiplier Penalty:**
  - Scale central server protection urgency based on active multi-access cards installed in the Runner's rig (_Conduit_, _Maker's Eye_, _Interface_, _HQ Interface_).
- **Macro Win-Con Classification:**
  - Detect non-interactive or central-focused Runner archetypes (e.g., heavy keyhole/milling or burn decks) to prevent the AI Corp from over-investing in remote servers while Centrals collapse.

**Implemented notes:** Public installed Runner cards now expose `AICentralPressure(server)`, describing immediate additional access, persistent non-access pressure (milling/burn), and bounded future growth. `_centralServerThreat()` aggregates those mechanics into an eight-point maximum server-specific protection penalty, while `_classifyRunnerMacroThreat()` reports whether the visible board is balanced, HQ-focused, R&D-focused, or split across both centrals and separately identifies non-interactive pressure. Its `focus` field is intentionally diagnostic groundwork for install planning; current protection scoring consumes the server-specific penalties directly so the classification is not counted twice. Hidden run events are deliberately excluded and remain Layer 5's responsibility. Updated scoped cards: _Docklands Pass_ and _Conduit_ (`systemgateway.js`) and _Devadatta Drone_ (`elevation.js`). No installed central-pressure card in `systemupdate2021.js` required an update; _Legwork_ and _The Maker's Eye_ are hidden events, so treating them as active board threats would violate imperfect information.

#### Layer 7.1: Consequence-Calibrated Central Pressure — `[PARTIALLY COMPLETED — TACTICAL LOSS INTERRUPT IMPLEMENTED]`

- **Goal:** Scale the mechanic-level penalty by the actual consequence of the next central breach rather than treating every extra access as equally dangerous.
- **Proposed design:** Combine `AICentralPressure` with public state: agenda points needed to win, HQ size and Corp-known agenda density, R&D size, already-seen top cards, and remaining uses/counters. Keep the hook mechanical; consequence weighting belongs in the evaluator.
- **Safety constraints:** The Corp may use its own HQ and R&D knowledge, but must never inspect hidden Runner cards. Do not double-count the existing HQ agenda-flood adjustment, successful-run history, or Layer 3.5 protection debt. A zero-counter scaling engine may contribute bounded growth pressure but must not claim current multi-access.
- **Deterministic regression scenarios:** One extra HQ access is more urgent when HQ is agenda-rich; R&D multi-access becomes critical when a breach could win; exhausted limited-use hardware contributes zero; zero-counter scaling pressure stays below live multi-access; changing hidden Runner Grip/Stack identities changes nothing.
- **Acceptance gate:** Adopt only after seeded games reduce agenda points lost from centrals without materially suppressing viable remote scoring or causing persistent over-protection of exhausted central tools.
- **Implemented tactical boundary:** `_centralBreachLossRisk()` now computes the fair, order-agnostic probability that the next breach supplies enough agenda points for the Runner to win. At 35% or greater, `_criticalBreachDefenseAction()` may interrupt a non-winning advancement plan, preferring an affordable ICE layer that materially reduces the risk, then a materially effective purge, then guarded emergency ICE acquisition. A game-winning Corp score is explicitly exempt, and risks below the threshold leave ordinary advancement unchanged. `AICentralPressureAfterPurge(server)` lets scaling cards such as _Conduit_ describe their immediate post-purge pressure without title checks.
- **Approach-time consistency:** `_icePreventsGameWinningBreach()` compares server security with an approached ICE rezzed (including the post-payment credit state) and with that ICE absent. If the affordable rez changes a potentially game-winning breach from possible to deterministically prevented, `_iceWorthRezzing()` rezzes it before considering cross-server credit reservations. This prevents the planner from counting an unrezzed hard lock such as _Brân 1.0_ as security and then withholding its rez to save for another server; taxing ICE that does not stop the breach receives no such override.
- **Remaining calibration:** The broader consequence weighting proposed above is still pending for non-lethal central pressure, known-top-card information, exhausted limited-use hardware, and seeded-game tuning of the tactical thresholds.

#### Layer 7.2: Emergency Protection Acquisition — `[COMPLETED]`

- **Gap found in play:** Layers 1-7 could correctly identify and rank a critically exposed server, but the action planner had no recovery policy when HQ contained no ICE. In that state it could repeatedly gain credits even though credits alone could not change the breach outcome. Full or overfull HQ also suppressed the ordinary draw fallback, and draw-on-rez assets were evaluated only for their normal card-specific role.
- **Implemented behavior:** `_emergencyProtectionRecovery()` activates only when the highest-ranked server is insecure with an adjusted protection score of `-3` or worse, has no unrezzed ICE waiting to be funded, HQ contains no ICE, the Corp has sufficient economy, and at least two clicks remain so a found ICE can still be installed. It prefers an affordable installed or installable card declaring immediate emergency draw, then uses the basic draw action. It never inspects Corp R&D or hidden Runner card identities.
- **Agenda-flood safety:** Emergency drawing does not solve a different server while HQ holds multiple agendas and remains deterministically breachable, even if it has nominal ICE. If HQ itself is the critical target, drawing remains permitted because finding protection is the only available recovery route. Game-winning scores retain priority. Ordinary scoring and advancement retain their normal priority unless the tactical Layer 7.1 evaluator finds at least a 35% next-breach game-loss risk and no direct install or purge resolves it; once invoked, emergency acquisition intentionally outranks optional economy and credit accumulation.
- **Card hook:** `AIEmergencyDraw` declares the number of cards immediately drawn by installing/rezzing a Corp asset or upgrade. _Spin Doctor_ in `systemgateway.js` declares `2`; no matching scoped card in `systemupdate2021.js` or `elevation.js` required an update.
- **Regression coverage:** Deterministic tests cover install-and-rez draw before basic draw, fallback basic drawing, the agenda-flood veto, existing ICE in HQ, inadequate economy, and the last-click boundary.

---

### Layer 8: Baits & Bluffs — `[PARTIALLY COMPLETED — POSTURE LIFECYCLE AND FEEDBACK PENDING]`

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

**Implemented notes:** Facedown access-punishing cards now expose the generic
`AIPunishesAccess(server)` hook. `_calculateBaitFrequency()` uses bounded
exposure-versus-punishment odds, so higher-severity traps deliberately adopt a
light-defense posture less often. `_shouldBaitServer()` makes one injectable
random roll per installed trap/server and caches it, preventing repeated AI
evaluations from rerolling the same decision. A trap posture is not permitted
when breaching that root could give the Runner enough agenda points to win,
preserving the same authoritative safety guard as agenda bluffs and
tag-punishment deterrence. Updated scoped cards: _Urtica Cipher_
(`systemgateway.js`) and _Snare!_ (`systemupdate2021.js`); no relevant
access-punishing card in `elevation.js` required an update.

Agenda and trap play now share `_remoteDeceptionProfile(card)`. Each eligible
hidden card independently selects a target ICE depth of one, two, or three; an
opening advancement target of one or two counters; and immediate or one-turn
delayed advancement. The same profile influences candidate scoring-remote
selection, how many ICE layers the Corp adds, and the first turns of advancement
sequencing. This removes the previous deterministic signature in which every
agenda bluff stopped at exactly one ICE. Tactical scoring-window value remains
the primary install signal, profiles never create naked agenda servers, and
agenda deception is disabled when a breach could win the game.

This is still not a complete human-like bluff engine. Posture and bait decisions
are currently cached for the installed card's lifetime, and the AI does not yet
feed public outcomes back into later posture weights. Those are required Layer
8 follow-ups below, not optional polish. Finally, `_tagPunishmentDeterrence()`
gives a bounded protection-score benefit when the Runner is tagged and the Corp
holds an affordable `AITagPunishment`; it never changes deterministic security.

#### Layer 8.4: Bounded Posture Epochs — `[FOLLOW-UP — REQUIRED]`

- **Goal:** Preserve one stable decision during an AI planning window without permanently committing an installed card to a stale bait or bluff posture.
- **Proposed design:** Replace lifetime booleans with a posture record containing an epoch id, selected public script, commitment horizon, and reevaluation reasons. Roll once on install or at the start of a Corp planning epoch. Reevaluate only after a meaningful boundary: the Runner turn ends, the server is challenged, credits or public Runner pressure materially change, advancement changes the server's stakes, or either player reaches match point. Repeated evaluator calls inside the same epoch must reuse the existing result.
- **Compatibility and safety:** Keep `_random` injectable and never reroll because `_NoMoreProtectionForThisServer()` or another scorer happened to run again. A reevaluation may retain the old posture. Match-winning safety overrides remain authoritative, and hidden Runner card identities remain forbidden.
- **Deterministic regression scenarios:** Repeated calls in one epoch consume no extra randomness; a new Corp turn permits at most one reevaluation; a material threat change can abandon a bait; irrelevant state changes do not reroll; reaching match point immediately disables an unsafe agenda posture; seeded games reproduce the same epoch sequence.
- **Acceptance gate:** No installed card remains locked to a posture after its commitment horizon, and instrumentation confirms exactly one posture decision per eligible card per epoch.

#### Layer 8.5: Match-Local Public Outcome Feedback — `[FOLLOW-UP — REQUIRED]`

- **Goal:** Let the Corp adjust later mixed strategies when the human repeatedly challenges or ignores particular visible remote postures during the current game.
- **Proposed design:** Record public outcomes by posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen, and agendas scored. Maintain bounded match-local weights or Beta-style priors for the shared scripts, then use those weights when selecting later profiles. Reset all opponent-response memory when a new game begins.
- **Compatibility and safety:** Learn only from public actions and Corp-known outcomes. Never inspect Runner Grip/Stack identities, persist a player fingerprint, or allow a small sample to collapse any script's probability to zero. Agenda and trap cards must continue drawing from overlapping distributions.
- **Deterministic regression scenarios:** Ignored light postures modestly increase their later use; repeated challenges shift some weight toward deeper or delayed scripts; one outcome cannot dominate; a new game resets weights; changing hidden Runner cards changes nothing; identical seeded public histories produce identical weights.
- **Acceptance gate:** Public-history adaptation changes future script weights within configured bounds while every script retains a non-zero exploration floor and agenda/trap trace distributions remain overlapping.

#### Layer 8.6: Outcome-Calibrated Bluff Telemetry — `[FOLLOW-UP — OPTIONAL, REQUIRES HUMAN DATA]`

- **Goal:** Validate and tune long-run bait/bluff frequencies against humans rather than inferring success from deterministic games.
- **Proposed design:** Add opt-in, anonymous local telemetry for posture probability, roll bucket, visible server shape, current match-local feedback weights, whether the server was run, and the resulting agenda/punishment outcome. Compare policy versions before changing the present bounds. Telemetry must not itself alter decisions; any match-local adaptation belongs to Layer 8.5.
- **Safety and compatibility:** Never record card identities from the Runner's hidden zones, player identifiers, or free text. Keep telemetry disabled by default and preserve injectable randomness for reproducible tests. Offline tuning may change global coefficients only; the AI must not fingerprint or learn an individual opponent.
- **Deterministic regression scenarios:** A posture is rolled once per decision epoch; replacing hidden Runner cards changes no decision; match-winning agendas never bluff; known traps stop baiting; disabled/unaffordable punishment returns zero; fixed seeded rolls reproduce identical postures.
- **Acceptance gate:** Change frequencies only after a sufficiently large human sample shows that run rates are not predictable from any single visible variable and that agenda losses caused by bluffs are offset by improved scoring or trap outcomes.

---

## Reference Engine Hooks & Helpers in `ai_corp.js`

| Engine Hook / Method              | Role                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `_evaluateServerSecurity(server)` | Primary entry point. Returns security, break costs, effective `runnerCredits`, its `runnerCreditPool` breakdown, risks, deterrence, and reasons. |
| `_effectiveRunnerCreditPool(server)` | Public, route-specific credit ceiling from pool, eligible hosted credits, Bad Publicity, and click economy. |
| `card.AICentralPressure(server)` | Public installed multi-access, alternative central pressure, and growth exposed by Runner cards. |
| `card.AICentralPressureAfterPurge(server)` | Optional post-purge version of public central pressure for virus-counter-dependent cards. |
| `_centralServerThreat(server)` | Aggregates central-pressure hooks into a bounded server-specific protection penalty. |
| `_centralBreachLossRisk(server)` | Fair, order-agnostic probability that the next breach supplies the Runner's remaining winning agenda points. |
| `_classifyRunnerMacroThreat()` | Classifies visible central focus and persistent non-access win conditions. |
| `card.AIPunishesAccess(server)` | Corp-card hook returning current access-punishment severity for bait planning. |
| `_calculateBaitFrequency(server)` | Returns the bounded severity-weighted probability for a trap server's cached posture roll. |
| `_remoteDeceptionProfile(card)` | Selects shared agenda/trap ICE-depth and advancement-sequence signals. |
| `_deceptionAdvancementTarget(card, server, normalTarget)` | Applies the posture's delayed/opening advancement cadence before returning to normal advancement. |
| `_tagPunishmentDeterrence(server)` | Returns bounded protection urgency relief from an affordable live tag punishment; never security. |
| `card.modifyStrength`             | Engine hook defining strength modifiers. Inspected in `_effectiveIceStrength()`.                                            |
| `card.AIMatchingBreakerInstalled` | Engine hook on cards/identities that return matching capability for an ICE.                                                 |
| `card.AIPreventBreach`            | Engine hook on root cards/upgrades that prevent breach.                                                                     |
| `_effectiveIceStrength(iceCard)`  | Returns ICE strength minus active debuffs from engine hooks and virus counters.                                             |
| `_matchingBreakerForIce(ice)`     | Resolves matching breaker via active card hooks, hosted cards, or subtype fallbacks.                                        |

## Regression Validation and Current Limits

Run `node tests/corp-server-security.test.js` for focused checks of calculator ownership, actual unrezzed ice classification, breaker activation costs, mandatory versus optional punishment, hosted coverage, lethality, human/AI identity matching, and effective Runner credit sources. These tests load the real AI classes and priority card definitions with deterministic engine helpers; they do not replace browser gameplay testing.

Security remains a per-ice heuristic, not a complete run simulation. It does not yet model cumulative damage across encounters, combined optional-effect sequences that disable later breakers, shared strength-reducer counter spending across multiple ice, or exact allocation of restricted credit sources across payments (Layer 6.1). `AIImplementBreaker` pricing probes support the standard `ImplementIcebreaker` activation path; other special breaker mechanisms need their own capability hooks.
