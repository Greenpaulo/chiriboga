# Implementation Audit & Edge-Case Review (Cards 3021–3055)

> **Instructions for Agent / Code Reviewer:**
> Use this checklist to audit the newly implemented Netrunner set stubs against engine framework capabilities and potential runtime edge cases.

---

## 1. High-Priority Mechanics Review

### Escher (3031)

- **Current Implementation Strategy:** Iterates over all installed ICE, collects them, and prompts for server-by-server reassignment using `MoveCard(selectedIce, targetServer.ice)`.
- **Verification Check:**
  - Does `MoveCard()` accept an array (`server.ice`) directly, or does the engine require a dedicated method like `MoveICE(ice, server, position)` to preserve indexing?
  - Ensure reassigning ICE does not trigger `responseOnInstall` hooks or calculate ICE installation costs.

### Same Old Thing (3054)

- **Current Implementation Strategy:** Spends 2 clicks, trashes self, splices target event out of `runner.heap`, and invokes `selectedEvent.Resolve()`.
- **Verification Check:**
  - Verify if calling `.Resolve()` on an event manually bypasses its credit cost deduction (`SpendCredits(runner, card.playCost)`).
  - If the target event expects normal play resolution, check whether the engine has a native `PlayEventFromHeap(card)` utility instead.

### Dagger (3042)

- **Current Implementation Strategy:** Prompts via `DecisionPhase` to select an installed card with subtype `"Stealth"` and manually decrements `card.recurringCredits -= 1` for a +5 strength boost.
- **Verification Check:**
  - Does the core credit-spending framework (`SpendCredits`) automatically recognize and prioritize stealth credit pools?
  - If manual deduction is required, confirm whether mutating `card.recurringCredits` directly syncs with UI state or if an engine helper (e.g., `SpendHostedCredits`) is required.

---

## 2. Engine Hook & Cost Validations

### The Source (3055)

- **Current Implementation Strategy:** Uses `modifyStealCost` returning `{ credits: 3 }` and `modifyAdvancementRequirement` returning `1`.
- **Verification Check:**
  - Verify that `modifyStealCost` is an active hook recognized by access/steal phases.
  - If additional steal costs are handled through `modifyCannot` or prompt interrupts during access, adapt accordingly.

### Hosted & Recurring Credit Pools

- **Affected Cards:** `Cloak` (3041), `Paricia` (3045), `Sahasrara` (3047), `Ice Analyzer` (3051)
- **Verification Check:**
  - Confirm whether declaring `recurringCredits` or `hostedCredits` automatically registers cards into global payment selectors during installation or ability execution, or if explicit usage restrictions need custom `modifyInstallCost` hooks.

---

## 3. Operational Integrity Checks

### Atman (3040)

- Ensure `Counters(this, "power")` via `modifyStrength` dynamically syncs with breaker strength checks during subroutine interaction.

### Scavenge (3034)

- Verify that trashing the target installed program happens **before** memory allocation (`[mu]`) checks are evaluated for installing the replacement program from Grip/Heap.

### Rielle “Kit” Peddler: Transhuman (3028)

- Confirm that pushing `"Code Gate"` into `ice.subTypes` during encounter resets properly when the run ends, preventing permanent mutation of ICE subtypes.
