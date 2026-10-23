# AI Implementation Tutorial

This document explains how the AI players in this Netrunner simulator work, and how to add AI support to new cards.

## How to Use This Document

This file is long. Read only the sections a task needs. To find one hook, search for its name (`rg -n "AIHookName" documentation/ai.md`): its contract is in the §4 or §5 subsection whose heading names it, and §7 lists every documented hook with a one-line purpose.

| Task | Read |
|---|---|
| Add AI support to a new Runner card | §2, §3, the §4 subsection for the card's role, §7 Runner table |
| Add AI support to a new Corp card | §2, §3, the §5 subsection for the card's type, §7 Corp table |
| Icebreakers | §4.1–4.3, §6 |
| ICE | §5.1–5.4, §6 |
| Runner cards the Corp's server-security evaluator must see (type shifts, bypasses, redirects, credit sources, pressure) | §4.16–4.22 |
| Corp protection and economy policy hooks | §5.9–5.11 |
| Logic written directly in a card's `Enumerate`/`Resolve` | §4.15 (Runner), §5.8 (Corp) |
| A hook that evaluates a prospective run, encounter or other temporary state | §2 "Evaluating hypothetical state" |
| Add a new hook | §2 "The Hook Pattern", the nearest existing subsection as a template, then add a row to §7 |
| Hook usage notes for recent Vantage Point cards | §7 "Vantage Point Batch N card hooks" |
| First time adding AI support | §2, then §8 (worked examples) |

`tests/ai-hook-docs.test.js` checks that every `AI*` hook defined in `sets/*.js` is mentioned here.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How the AI System Works](#2-how-the-ai-system-works)
3. [The ELO Property](#3-the-elo-property)
4. [Runner AI Hooks](#4-runner-ai-hooks)
   - [4.1 Standard Icebreakers — `AIImplementBreaker`](#41-standard-icebreakers--aiimplementbreaker)
   - [4.2 Special / Trojan Breakers — `AISpecialBreaker`, `AIMatchingBreakerInstalled`](#42-special--trojan-breakers)
   - [4.3 Fixed-Strength Breakers — `AIFixedStrength`](#43-fixed-strength-breakers)
   - [4.4 Install Decisions — `AIPreferredInstallChoice`, `AIWastefulToInstall`, `AIOkToTrash`](#44-install-decisions)
   - [4.5 Worth Keeping in Hand — `AIWorthKeeping`](#45-worth-keeping-in-hand)
   - [4.6 Economy Cards — `AIEconomyInstall`, `AIEconomyTrigger`, `AIWouldTrigger`](#46-economy-cards)
   - [4.7 Run Events — `AIRunEventExtraPotential`, `AIRunEventModify/Restore`, `AIRunEventExtraCredits`](#47-run-events)
   - [4.8 Access Boosters — `AIAdditionalAccess`](#48-access-boosters)
   - [4.9 Install-Before-Run — `AIInstallBeforeRun`, `AIInstallBeforeInstall`](#49-install-before-run)
   - [4.10 Non-Run Events — `AIWouldPlay`, `AIWastefulToPlay`, `AIPreferredPlayChoice`](#410-non-run-events)
   - [4.11 Draw Cards — `AIPlayToDraw`, `AIDrawInstall`](#411-draw-cards)
   - [4.12 Tutor Cards — `AIIcebreakerTutor`](#412-tutor-cards)
   - [4.13 Run Ability Extras — `AIRunAbilityExtraPotential`, `AIRunExtraPotential`, `AIBreachNotRequired`](#413-run-ability-extras)
   - [4.14 Trash Cost Reduction — `AIReducesTrashCost`](#414-trash-cost-reduction)
   - [4.15 Inline AI Code for Runner](#415-inline-ai-code-for-runner)
   - [4.16 Ice Strength Reduction — `AIReducesIceStrength`](#416-ice-strength-reduction--aireducesicestrength)
   - [4.17 Hosted Subroutine Breakers — `AIHostedBreakContribution`](#417-hosted-subroutine-breakers--aihostedbreakcontribution)
   - [4.18 Corp Security: Type Shifts, Bypasses, and Redirects](#418-corp-security-type-shifts-bypasses-and-redirects)
   - [4.19 Hidden Single-ICE Threats — `AIHiddenThreat`](#419-hidden-single-ice-threats--aihiddenthreat)
   - [4.20 Run Credit Sources — `canUseCredits`, `AIRunPoolCreditOffset`](#420-run-credit-sources--canusecredits-airunpoolcreditoffset)
   - [4.21 Public Central Pressure — `AICentralPressure`](#421-public-central-pressure--aicentralpressure)
   - [4.22 Public Successful-Run Pressure — `AIPublicRunPressure`](#422-public-successful-run-pressure--aipublicrunpressure)
5. [Corp AI Hooks](#5-corp-ai-hooks)
   - [5.1 ICE — `AIImplementIce`](#51-ice--aiimplementice)
   - [5.2 ICE Subroutine Type Reference](#52-ice-subroutine-type-reference)
   - [5.3 Bioroid Click-Break — Corp `AIImplementBreaker`](#53-bioroid-click-break)
   - [5.4 ICE Install Decisions — `AIWorthwhileIce`](#54-ice-install-decisions)
   - [5.5 Upgrades — `AIApproachDefense`, `AIDefensiveValue`, `AIIsScoringUpgrade`, `AILimitPerServer`, `AIPreventBreach`](#55-upgrades)
   - [5.6 Operations — `AIFastAdvance`, `AIDamageOperation`, `AITagPunishment`, `AIWouldPlay`, `AIWouldPlayBeforeScore`](#56-operations)
   - [5.7 Agendas — `AIAdvancementLimit`, `AIOverAdvance`](#57-agendas)
   - [5.8 Inline AI Code for Corp](#58-inline-ai-code-for-corp)
   - [5.9 Access Punishment — `AIPunishesAccess`](#59-access-punishment--aipunishesaccess)
   - [5.10 Reserved Credits — `AIReserveCredits`](#510-reserved-credits--aireservecredits)
   - [5.11 Emergency Protection Draw — `AIEmergencyDraw`](#511-emergency-protection-draw--aiemergencydraw)
6. [The Run Calculator (`rc`)](#6-the-run-calculator-rc)
7. [Quick Reference Table](#7-quick-reference-table)
8. [Step-by-Step Worked Example](#8-step-by-step-worked-example)

---

## 1. Project Overview

This project is a browser-based implementation of the **Netrunner** card game. Two players compete:

- **The Corp** — builds and defends servers, installs ice, and tries to score agendas.
- **The Runner** — attacks those servers, breaks through ice, and tries to steal agendas.

Cards are defined in JavaScript files inside the `sets/` folder. Each card is a plain JavaScript object with properties describing its rules: cost, abilities, subroutines, and so on.

The game can be played against an AI opponent. The AI is driven by two classes:

- `CorpAI` in `ai_corp.js`
- `RunnerAI` in `ai_runner.js`

These classes contain the general decision-making logic — how to economise, when to run, how to protect servers, etc. However, they cannot know every card's specific quirks. That is where **AI hooks** come in.

---

## 2. How the AI System Works

### The Hook Pattern

Each card can define additional properties whose names start with `AI`. The AI engine checks for these properties at the right moment during decision-making and calls them.

For example, a standard icebreaker defines `AIImplementBreaker`, a function that the run calculator calls to understand how that breaker deals with ice. An economy card defines `AIEconomyInstall` to indicate its install priority. A run event defines `AIRunEventExtraPotential` to suggest when it should be played.

If a card does **not** define a given hook, the engine applies a sensible default (or ignores that card for that purpose).

### The Run Calculator

The most complex hooks (icebreakers, ICE) work through an object called the **Run Calculator** (`rc`). The RunnerAI and CorpAI both use it to simulate hypothetical runs: given the ice on a server and the breakers the runner has, can the runner get through? At what credit cost? Is it worthwhile?

The RunCalculator calls each breaker's `AIImplementBreaker` function in turn, and each ICE card's `AIImplementIce` function, to build up a picture of what a run would cost. You do not manually interact with it except through these hooks — `rc` is passed into your hook function as an argument, and you use its helper methods to describe your card's abilities. The full method reference is in [section 6](#6-the-run-calculator-rc).

### What happens without hooks

If you add a new card without any AI hooks:

- **Icebreakers** will not be used to break ice (the run calculator will not know they exist).
- **Economy cards** will not be bought or triggered.
- **Run events** will not be played.
- **ICE** will be treated as having a single `misc_moderate` subroutine per subroutine it has, which is a rough fallback.
- Generic cards will still be installed and played if nothing marks them as wasteful, but with no particular intelligence.

A card with no AI support is playable by a human but will be ignored or misused by the AI. The goal of this tutorial is to help you describe your card precisely enough for the AI to use it well.

### Checking if AI is active

Inside a card's `Enumerate` or `Resolve` function, you can run code specifically for AI players:

```js
if (corp.AI != null) {
    // corp-side AI code
}

if (runner.AI != null) {
    // runner-side AI code
}
```

This is useful for more complex cards where the AI needs to make a choice mid-resolution.

### Evaluating hypothetical state

An AI hook or card helper that needs a prospective run or encounter context,
or any other temporary change to game state, must make it through one of the
guarded wrappers in the utility prefix of `ai_runner.js` (loaded before card
code runs in the game, the headless harness and the test harnesses):

| Wrapper | Temporarily sets | Use it for |
|---|---|---|
| `AIWithRunContext(server, evaluate)` | `attackedServer = server` | Run-only costs or credits, e.g. a `canUseCredits` that only allows spending during a run (Baker's `_stealthCreditCards`) |
| `AIWithIceEncounter(iceCard, evaluate)` | `encountering`, `attackedServer`, `approachIce` as if `iceCard` were encountered | Encounter-only strength or subtype effects (Atman and Chameleon `AIMatchingBreakerInstalled`). `evaluate(entered)` receives `false`, with nothing changed, when `iceCard` is not in a server |
| `AIWithHypothetical(apply, evaluate, restore)` | whatever `apply` changes; `restore` must reassign every field | Anything else. Corp AI code calls it as `this._withHypothetical()` |

Each wrapper returns `evaluate`'s result, restores the state in `finally`
(also when `evaluate` throws) and raises the shared hypothetical depth count
`AIHypothetical.depth` while `evaluate` runs, so the Corp's per-decision
security cache never stores or serves a result computed on a changed board.
Pass only public context: the server being considered or the ICE position,
never the Runner's hidden cards. `tests/corp-ai-hypothetical-mutation.test.js`
fails when an `AI*` or `_*` function in `sets/*.js` changes credits, clicks,
tags, counters, rez state, ICE arrays or run/encounter context outside these
wrappers.

---

## 3. The ELO Property

Every completed card definition must have a finite numeric `elo` property. It
represents the card's general power level and is used as a tiebreaker when the
AI must choose between cards that are otherwise equally attractive.

```js
cardSet[30005] = {
    title: "Buzzsaw",
    elo: 1615,
    // ...
};
```

Higher-ranked cards have higher values, while weaker or more situational cards
have lower values. The value is not a rating for this project to estimate.

**When you add a new card**, find it in the
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking) and
copy its published ELO exactly. Do not guess, substitute a neutral value or tune
the rating against similar cards. Record the lookup date in the set header
because the published rankings can change. Do not omit the property either:
although the format-aware random deckbuilder uses 1500 as a defensive runtime
fallback, other AI paths read `card.elo` directly and a missing value can result
in `undefined`/`NaN` comparisons. The current missing-value inventory is in
[`card-implementation-backlog.md`](card-implementation-backlog.md#4-missing-elo-values).

---

## 4. Runner AI Hooks

### 4.1 Standard Icebreakers — `AIImplementBreaker`

Standard icebreakers have a subtype like `Barrier`, `Code Gate`, or `Sentry` and typically cost credits to pump strength and to break subroutines. The run calculator needs to know these costs to decide whether a run is worthwhile.

You implement this via `AIImplementBreaker`, a function the run calculator calls once per breaker for each piece of ice it is evaluating. Your job inside this function is simple: **describe how this breaker can handle this specific piece of ice, and at what cost**. The run calculator will work out the rest.

Sang Kancil and Principia use this hook for their standard one-credit breaks
and +2 strength boosts (3 credits for Sang Kancil, 2 for Principia). Sang Kancil
reduces its boost cost to 1 credit while a Run event is active, or when
`rc.runEvent` is an event with the Run subtype in the Runner's hypothetical
calculation. Corp pricing uses its own calculator and receives that discount
only from an active public Run event.

#### How the result array works

The function receives a `result` array (initially empty) and must return it with your card's options appended. The pattern is always:

```js
result = result.concat( /* breaking options */ );
return result;
```

You never construct the option objects manually. Instead, you call helper methods on `rc` (the RunCalculator) which generate the correctly structured objects and return them as an array. The most important of these is `rc.ImplementIcebreaker(...)`, which handles all standard icebreaker logic. There are also `rc.SrBreak(...)` and `rc.StrModify(...)` for more exotic cards — all are documented in [section 6](#6-the-run-calculator-rc).

If your breaker cannot interact with the ice being evaluated (wrong subtype, wrong server, etc.), simply return `result` unchanged.

**Signature:**
```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft)
```

- `rc` — the `RunCalculator` instance. Use its helper methods (described in [section 6](#6-the-run-calculator-rc)).
- `result` — accumulator array of break options. Always start with the provided `result` and concatenate to it.
- `point` — the current calculator checkpoint. Passed through to `rc` methods unchanged — you do not need to interpret it.
- `server` — the server being run.
- `cardStrength` — this breaker's current strength (already includes any active modifiers).
- `iceAI` — an object describing the ice from the run calculator's perspective:
  - `iceAI.ice` — the actual ice card object.
  - `iceAI.subTypes` — array of subtype strings (e.g. `["Barrier"]`).
  - `iceAI.strength` — the ice's current effective strength.
  - `iceAI.sr` — the subroutine descriptions (you don't need to read these in `AIImplementBreaker`).
- `iceStrength` — the ice's current strength (same as `iceAI.strength`, provided for convenience).
- `clicksLeft` — how many runner clicks remain in this hypothetical.
- `creditsLeft` — how many credits are left in the run budget.

For a standard icebreaker you will almost always call `rc.ImplementIcebreaker(...)`, which takes the breaker's costs and works out all the ways it can break the ice:

```js
rc.ImplementIcebreaker(
    point,
    this,           // the breaker card
    cardStrength,   // breaker's current strength
    iceAI,          // ice context object
    iceStrength,    // ice's current strength
    iceSubTypes,    // array of subtypes this breaker can handle, e.g. ["Barrier"]
    costToUpStr,    // credit cost per strength boost
    amtToUpStr,     // strength gained per boost
    costToBreak,    // credit cost per break use
    amtToBreak,     // subroutines broken per use
    creditsLeft     // remaining credit budget
)
```

The four numbers at the end — `costToUpStr`, `amtToUpStr`, `costToBreak`, `amtToBreak` — are the heart of the description. They say: "it costs X credits to gain Y strength, and Z credits to break W subroutines." For Buzzsaw: 3 credits to gain 1 strength, 1 credit to break 2 subroutines. For a simple breaker that costs 2 credits per strength and 1 credit per subroutine, you would pass `2, 1, 1, 1`.

**Example — Buzzsaw (Code Gate decoder, 3[c]/+1 str, 1[c]/break up to 2 subs):**

```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    result = result.concat(
        rc.ImplementIcebreaker(
            point, this, cardStrength, iceAI, iceStrength,
            ["Code Gate"],
            3, 1,   // 3[c] to boost +1 str
            1, 2,   // 1[c] to break up to 2 subs
            creditsLeft
        )
    );
    return result;
},
```

**Example — Carmen (Sentry killer, 2[c]/+3 str, 1[c]/break 1 sub):**

```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    result = result.concat(
        rc.ImplementIcebreaker(
            point, this, cardStrength, iceAI, iceStrength,
            ["Sentry"],
            2, 3,   // 2[c] to boost +3 str
            1, 1,   // 1[c] to break 1 sub
            creditsLeft
        )
    );
    return result;
},
```

**Example — Marjanah (Fracter with variable break cost):**

The break cost changes based on game state. Compute the cost first, then pass it:

```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var marcost = 2;
    if (this.madeSuccessfulRunThisTurn) marcost = 1;
    result = result.concat(
        rc.ImplementIcebreaker(
            point, this, cardStrength, iceAI, iceStrength,
            ["Barrier"],
            1, 1,       // 1[c] to boost +1 str
            marcost, 1, // variable cost to break 1 sub
            creditsLeft
        )
    );
    return result;
},
```

**Example — Unity (Decoder with dynamic strength pump):**

The amount per strength boost depends on installed breakers. Use `rc.precalculated.runnerInstalledIcebreakersLength`:

```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var strup = rc.precalculated.runnerInstalledIcebreakersLength;
    result = result.concat(
        rc.ImplementIcebreaker(
            point, this, cardStrength, iceAI, iceStrength,
            ["Code Gate"],
            1, strup,   // 1[c] to boost (amount = number of installed breakers)
            1, 1,
            creditsLeft
        )
    );
    return result;
},
```

**Also add `AIPreferredInstallChoice`:**

For icebreakers, the AI needs to know they are safe to install during an action. The simplest version avoids installing on the last click (to preserve options):

```js
AIPreferredInstallChoice: function(choices) {
    if (runner.clickTracker < 2) return -1; // don't install on last click
    return 0; // install
},
```

Return `-1` to decline, or a non-negative index into `choices` to accept.

---

### 4.2 Special / Trojan Breakers

Some programs break ice without having the `Icebreaker` subtype, or work in unusual ways. Examples are Botulus and Tranquilizer (Virus/Trojan programs that are hosted on ice).

Mark them with `AISpecialBreaker: true` so the AI treats them differently from conventional icebreakers:

```js
AISpecialBreaker: true,
```

You still implement `AIImplementBreaker` to explain how they break ice, and `AIMatchingBreakerInstalled` so the AI can check whether a given piece of ice is already covered.

**`AIMatchingBreakerInstalled(iceCard, effectiveSubTypes)`** — Called on every installed program to find a match for a given ice. Return `this` if this card can handle that ice, or `null` if not. `effectiveSubTypes` is an optional array used by Corp security planning for public subtype shifts; use it instead of mutating or retaining `iceCard.subTypes`. Runner-AI callers may omit it, so fall back to the ice's current subtypes.

The Runner AI's `_matchingBreakerInstalled()` returns `null` before calling this hook when the Runner cannot look at `iceCard` (unrezzed and not exposed), and `_breakerMatchesIce()` returns `false` for such ICE, so card hooks that call either helper get no match on hidden ICE without their own visibility check.

Identity effects that temporarily add a subtype must also restrict the match to
the ICE that would receive that subtype. Rielle "Kit" Peddler uses
`_AIFirstIceToEncounter` for both `AIModifyIceAI` and
`AIMatchingBreakerInstalled`: it skips unrezzed outer ICE when a rezzed inner
ICE would be encountered first, and restores any temporary subtype mutation
before returning. When Corp security supplies `effectiveSubTypes`, Kit defers
to that evaluator's ordinary breaker matching instead of requiring a live
Runner AI.

```js
// Botulus: only matches the ice it is hosted on
AIMatchingBreakerInstalled: function(iceCard) {
    if (this.host) {
        var knownToBeDisabled = false;
        if (PlayerCanLook(runner, this.host)) knownToBeDisabled = this.host.AIDisablesHostedPrograms;
        if (iceCard == this.host && !knownToBeDisabled) return this;
    }
    return null;
},
```

```js
// Tranquilizer: matches only the hosted ice
AIMatchingBreakerInstalled: function(iceCard) {
    if (iceCard == this.host) return this;
    return null;
},
```

**`AIPreferredInstallChoice(choices)`** — Choose which ice to host on. Use `runner.AI._highestThreatScoreIce(excludeList, minRezCost)` to find the highest-threat ice that is not already covered:

```js
// Botulus: installs on the highest-threat ice that doesn't already have a special breaker
AIPreferredInstallChoice: function(choices) {
    var htsi = runner.AI._highestThreatScoreIce(
        [this].concat(runner.AI._iceHostingSpecialBreakers())
    );
    if (htsi) {
        for (var i = 0; i < choices.length; i++) {
            if (htsi == choices[i].host) return i;
        }
    }
    return -1; // don't install
},
```

```js
// Tranquilizer: same, but requires at least 4 rez cost on the target
AIPreferredInstallChoice: function(choices) {
    var htsi = runner.AI._highestThreatScoreIce(
        [this].concat(runner.AI._iceHostingSpecialBreakers()),
        4  // minimum rez cost
    );
    if (htsi) {
        for (var i = 0; i < choices.length; i++) {
            if (htsi == choices[i].host) return i;
        }
    }
    return -1;
},
```

**Hypothetical run preparation** — When the AI calculates whether it can run a server, it may need to simulate the Trojan already being in position. Use these two paired hooks:

```js
AIPrepareHypotheticalForRC: function(preferredHost) {
    this.host = preferredHost;
    this.virus = 1;        // simulate starting counters
},
AIRestoreHypotheticalFromRC: function() {
    this.host = null;
    this.virus = 0;
},
```

**`AIOkToTrash()`** — Return `true` if the card can safely be trashed (for example, if its host ability has been disabled):

```js
AIOkToTrash: function() {
    if (this.host) {
        if (this.host.AIDisablesHostedPrograms) return true;
    }
    return false;
},
```

**Breaking implementation for Trojans** — Use `rc.SrBreak` to represent breaking subroutines from hosted counters:

```js
// Botulus: can break 1 sub per hosted virus counter
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (this.host == iceAI.ice) {
        var sr_broken_by_this = 0;
        for (var i = 0; i < point.sr_broken.length; i++) {
            if (point.sr_broken[i].use == this) sr_broken_by_this++;
        }
        if (sr_broken_by_this < Counters(this, "virus")) {
            result = result.concat(rc.SrBreak(this, iceAI, point, 1));
        }
    }
    return result;
},
```

---

### 4.3 Fixed-Strength Breakers

Some breakers never pump strength in the conventional sense (e.g. Mayfly uses a general `[]` subtype match). Mark them with `AIFixedStrength: true` so the AI knows to install strength-reduction tools like Leech alongside them:

```js
// Mayfly: AI icebreaker that breaks any subroutine for 1[c]
AIFixedStrength: true,  // (implied by [] subtype — mark if card needs this flag)
```

In the `AIImplementBreaker`, use an empty subtype array `[]` to match all ice regardless of subtype:

```js
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (iceAI.ice.cannotBreakUsingAIPrograms) return result;
    // only use Mayfly for worthwhile targets unless a spare is in hand
    var anotherInGrip = runner.grip.some(c => c.title == "Mayfly");
    if (!runner.AI || runner.AI._getCachedPotential(server) > 1.5 || anotherInGrip) {
        result = result.concat(
            rc.ImplementIcebreaker(
                point, this, cardStrength, iceAI, iceStrength,
                [],      // no subtype restriction
                1, 1,    // 1[c] to boost +1 str
                1, 1,    // 1[c] to break 1 sub
                creditsLeft
            )
        );
    }
    return result;
},
```

---

### 4.4 Install Decisions

**`AIPreferredInstallChoice(choices)`**

Called when the AI considers installing this card. Return `-1` to decline, or the index of the preferred choice to accept.

Use this if the card has hosting requirements, or if there are conditions that make installing unwise:

```js
// Don't install if this is the last click (save the click for a run)
AIPreferredInstallChoice: function(choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
},
```

```js
// Carmen: don't need to save a click if already got a run discount
AIPreferredInstallChoice: function(choices) {
    if (runner.clickTracker < 2 && !this.madeSuccessfulRunThisTurn) return -1;
    return 0;
},
```

**`AIWastefulToInstall()`**

Return `true` if installing this card right now would be a waste (e.g. a unique card that is already installed):

```js
// Conduit: don't install a second copy
AIWastefulToInstall: function() {
    for (var j = 0; j < runner.rig.programs.length; j++) {
        if (runner.rig.programs[j].title == "Conduit") return true;
    }
    return false;
},
```

```js
// Mayfly: one at a time only
AIWastefulToInstall: function() {
    return runner.rig.programs.some(p => p.title == "Mayfly");
},
```

**`AIOkToTrash()`**

Return `true` if this installed card can be trashed to make room for another (MU or hand limit):

```js
AIOkToTrash: function() {
    // safe to trash if its ability has been disabled by the host
    if (this.host && this.host.AIDisablesHostedPrograms) return true;
    return false;
},
```

---

### 4.5 Worth Keeping in Hand

**`AIWorthKeeping(installedRunnerCards, spareMU)`**

Called during the discard-to-hand-limit phase. Return `true` to try to keep this card in hand instead of discarding it. Also influences whether the AI plays cards that install from hand (like Mutual Favor).

- `installedRunnerCards` — array of all currently installed Runner cards.
- `spareMU` — memory units available before this card is installed.

```js
// Sure Gamble: always keep (it's always useful)
AIWorthKeeping: function(installedRunnerCards, spareMU) {
    return true;
},
```

```js
// Fermenter: keep if broke (economy needed)
AIWorthKeeping: function(installedRunnerCards, spareMU) {
    if (Credits(runner) < 5) return true;
    return false;
},
```

```js
// Conduit: keep if a run into R&D is possible and no Conduit is installed
AIWorthKeeping: function(installedRunnerCards, spareMU) {
    if (!this.AIWastefulToInstall()) {
        if (runner.AI._getCachedCost(corp.RnD) != Infinity) return true;
    }
    return false;
},
```

```js
// DZMZ Optimizer (memory hardware): keep if MU is tight
AIWorthKeeping: function(installedRunnerCards, spareMU) {
    if (spareMU < 2) return true;
    return false;
},
```

---

### 4.6 Economy Cards

Economy cards generate credits. The AI needs to know when to install them and when to fire their abilities.

**`AIEconomyInstall()`**

Return a priority number (higher = more urgent) for installing this card. Return `0` or don't define this hook if the card is not an economy card.

```js
// Telework Contract: moderate install priority
AIEconomyInstall: function() {
    return 2; // priority 2
},
```

```js
// Smartware Distributor: low install priority
AIEconomyInstall: function() {
    return 1; // priority 1
},
```

**`AIEconomyTrigger`** (a plain number, not a function)

Priority for triggering this card's economy ability. Higher = trigger sooner:

```js
AIEconomyTrigger: 2,  // click-for-credit type abilities
AIEconomyTrigger: 1,  // slower economy
```

**`AIWouldTrigger()`**

Return `true` to allow the ability to be triggered. Return `false` to skip it this turn. Use this for conditional economy cards:

```js
// Fermenter: only trigger when there are at least 3 virus counters
AIWouldTrigger: function() {
    if (!CheckCounters(this, "virus", 3)) return false;
    return true;
},
```

```js
// Pennyshaver: don't use as a pure click-for-credit when overdrawn
AIWouldTrigger: function() {
    if (runner.grip.length > MaxHandSize(runner)) {
        if (!CheckCounters(this, "credits", 1)) return false;
    }
    return true;
},
```

```js
// Smartware Distributor: don't trigger if already loaded, or if a less-loaded copy should go first
AIWouldTrigger: function() {
    var counters = Counters(this, "credits");
    if (counters > 2) return false;
    for (var i = 0; i < runner.rig.resources.length; i++) {
        if (runner.rig.resources[i] !== this && runner.rig.resources[i].title == "Smartware Distributor") {
            if (Counters(runner.rig.resources[i], "credits") < counters) return false;
        }
    }
    return true;
},
```

---

### 4.7 Run Events

Run events (those with subtype `Run`) require special treatment. Instead of `AIWouldPlay`, use potential-based hooks.

**`AIRunEventExtraPotential(server, potential)`**

Called for each server the AI might run. Return a float:
- `0` — don't play this event for this server.
- A positive number — add this to the server's run potential score. The AI will use the event if it has the highest combined potential.

```js
// Overclock: save for high-value targets only
AIRunEventExtraPotential: function(server, potential) {
    if (potential > 1.5) return 0.01; // any positive = "yes"
    return 0;
},
```

```js
// Jailbreak: only use on HQ or R&D with no unrezzed ice
AIRunEventExtraPotential: function(server, potential) {
    if (server == corp.HQ || server == corp.RnD) {
        if (ServerSuccessfulRunPrevented(server)) return 0;
        var unrezzedIce = server.ice.filter(i => !i.rezzed).length;
        if (unrezzedIce == 0) {
            if (server == corp.HQ) return 0.5 * runner.AI._additionalHQAccessValue(this);
            if (server == corp.RnD) return 0.5 * runner.AI._countNewCardsThatWouldBeAccessedInRnD(2);
        }
    }
    return 0;
},
```

```js
// Tread Lightly: useful for targets with multiple unrezzed ice
AIRunEventExtraPotential: function(server, potential) {
    var unrezzedIce = server.ice.filter(i => !i.rezzed).length;
    if (potential > 1.5 || unrezzedIce > 1) {
        if (AvailableCredits(corp) < 5 + 5 * unrezzedIce + runner.creditPool) {
            return 0.1 * unrezzedIce;
        }
    }
    return 0;
},
```

**`AIRunEventModify(server)` / `AIRunEventRestore(server)`**

Use these if the run event temporarily changes game state for the run calculation. Modify in `AIRunEventModify` and undo in `AIRunEventRestore`:

```js
// Tread Lightly: increases ice rez costs, so simulate the corp having less money
AIRunEventModify: function(server) {
    this.storedCorpCreditPool = corp.creditPool;
    corp.creditPool -= 3;
},
AIRunEventRestore: function(server) {
    corp.creditPool = this.storedCorpCreditPool;
},
```

Aircheck uses the same paired-hook pattern to model its inaccessible Runner
credit pool. It temporarily sets `runner.creditPool` to its play cost, which is
then subtracted by the normal run-event calculation, leaving zero pool credits
for the hypothetical run. `AIRunEventExtraCredits` supplies its hosted credits
separately, and `AIRunEventRestore` restores the exact stored pool value.

**`AIRunEventExtraCredits`** (a plain number)

If the run event gives the runner extra credits to spend during the run (like Overclock), declare the amount here. The AI will subtract the play cost to determine net gain:

```js
// Overclock: 5 credits on the card, costs 1 to play = net 4
AIRunEventExtraCredits: 5,
```

**`AIBreachReplacementValue`** (a plain number)

For a card with `specialOnInsteadOfBreaching`. At Run 5.1 the Runner AI picks
the offered replacement with the highest value instead of breaching; a
replacement whose `Enumerate` returns `[{required: true}]` leaves no breach
option. Chastushka, Retrieval Run and Khusyuk use `2`.

```js
AIBreachReplacementValue: 2, // medium priority
```

---

### 4.8 Access Boosters

Some cards (hardware, programs) passively increase how many cards the runner accesses per run.

**`AIAdditionalAccess(server)`**

Return the number of additional cards accessed in `server` when this card is active. Return `0` if it does not apply (wrong server, already used, etc.):

```js
// Docklands Pass: +1 access to HQ, first time per turn
AIAdditionalAccess: function(server) {
    if (server != corp.HQ) return 0;
    if (this.breachedHQThisTurn) return 0; // first time only
    return 1;
},
```

```js
// Jailbreak: +1 access to HQ or R&D if run succeeds
AIAdditionalAccess: function(server) {
    if (server != corp.HQ && server != corp.RnD) return 0;
    if (ServerSuccessfulRunPrevented(server)) return 0;
    return 1;
},
```

---

### 4.9 Install-Before-Run

Some cards are best installed immediately before running (because they give run bonuses). The AI checks this before deciding to run.

**`AIInstallBeforeRun(server, potential, useRunEvent, runCreditCost, runClickCost)`**

Return a positive number to suggest installing this card before running `server`. Return `0` to not suggest it. Higher numbers take priority:

```js
// Leech: install before central server runs (it gains counters on central runs)
AIInstallBeforeRun: function(server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (typeof server.cards !== "undefined") return 1; // yes, for central servers
    return 0;
},
```

```js
// Docklands Pass: install before HQ run if it's worth keeping
AIInstallBeforeRun: function(server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (server == corp.HQ) {
        if (runner.AI.cardsWorthKeeping.includes(this)) return 1;
    }
    return 0;
},
```

```js
// Red Team: install before central server runs that haven't been made this turn
AIInstallBeforeRun: function(server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (ServerSuccessfulRunPrevented(server)) return 0;
    if (typeof server.cards !== "undefined") { // central server
        var alreadyRunThisTurn = (server == corp.HQ) ? this.runHQ :
                                 (server == corp.RnD) ? this.runRnD : this.runArchives;
        if (!alreadyRunThisTurn) return 1;
    }
    return 0;
},
```

**`AIInstallBeforeInstall(cardToInstall)`**

Return `true` to request that this card be installed before `cardToInstall`. Used by support cards (like Cookbook) that must be in play before the card they benefit:

```js
// Cookbook: install before any Virus program you can afford
AIInstallBeforeInstall: function(cardToInstall) {
    if (CheckSubType(cardToInstall, "Virus")) {
        if (AvailableCredits(runner) >= InstallCost(this) + InstallCost(cardToInstall)) {
            return true;
        }
    }
    return false;
},
```

---

### 4.10 Non-Run Events

For events that are **not** run events, use these hooks.

**`AIWouldPlay()`**

Return `true` to allow the AI to play this event. Return `false` to skip it:

```js
// VRcation: draw 4 cards, lose a click — don't play on the last click
AIWouldPlay: function() {
    if (runner.clickTracker == 2) return false;
    if (runner.AI._currentOverDraw() + 2 < runner.AI._maxOverDraw()) return true;
    return false;
},
```

**`AIWastefulToPlay()`**

Return `true` if playing this card right now would be wasteful:

```js
// Creative Commission: gain 5[c] but lose a click — wasteful on 2nd-to-last click
AIWastefulToPlay: function() {
    if (runner.clickTracker == 2) return true;
    return false;
},
```

**`AIPreferredPlayChoice(choices)`**

If the event presents a choice on play, return the preferred index, or `-1` to decline playing:

```js
AIPreferredPlayChoice: function(choices) {
    return 0; // always choose the first option
},
```

---

### 4.11 Draw Cards

**`AIPlayToDraw`** (plain number)

A priority number for events that draw cards. Higher = AI tries to play this earlier when it needs cards:

```js
// VRcation: draws 4 cards — high priority
AIPlayToDraw: 3,

// Some 1-card draw events
AIPlayToDraw: 1,
```

**`AIDrawInstall()`**

Return a priority number for **resources or hardware** that passively increase card draw (e.g. Verbal Plasticity). Higher = install sooner when the runner needs card draw:

```js
AIDrawInstall: function() {
    return 1; // low priority install for draw
},
```

---

### 4.12 Tutor Cards

Cards that search for and fetch another card (tutors) need to tell the AI what they would fetch.

**`AIIcebreakerTutor(installedRunnerCards)`**

Return an array of eligible icebreaker card objects from the stack. The route
planner ranks those candidates for the ice protecting each proposed server;
return an empty array if nothing useful is available:

```js
// Mutual Favor: fetch the most-needed icebreaker that's in the stack but not installed
AIIcebreakerTutor: function(installedRunnerCards) {
    var preferred = runner.AI._icebreakerInPileNotInHandOrArray(
        runner.stack,
        installedRunnerCards,
    );
    return preferred ? [preferred] : [];
},
```

`_icebreakerInPileNotInHandOrArray(pile, installedRunnerCards)` scans a pile
that contains cards the Runner cannot see (such as the Stack) in title order,
so the chosen breaker depends only on the pile's contents, never its hidden
order. A fully visible pile (the Heap) is scanned in its own order.

---

### 4.13 Run Ability Extras

Some installed cards give passive or active bonuses to running a server.

**`AIRunAbilityExtraPotential(server, potential)`**

Return a float for extra potential gained by using this card's active ability during a run on `server`. Used for cards like Conduit and Red Team that have a run-related ability:

```js
// Conduit: worth using if we can access new cards in R&D
AIRunAbilityExtraPotential: function(server, potential) {
    if (server == corp.RnD) {
        if (ServerSuccessfulRunPrevented(corp.RnD)) return 0;
        var conduitDepth = Counters(this, "virus") + 1;
        var bonusCards = runner.AI._countNewCardsThatWouldBeAccessedInRnD(conduitDepth, []);
        if (bonusCards > 0) return bonusCards - 1;
    }
    return 0;
},
```

**`AIRunExtraPotential(server, potential)`**

Return a passive extra potential value for simply running `server` when this card is installed (without needing to use an ability). Lingering effects with `player: runner` are consulted too, e.g. Climactic Showdown's breach bonus after the card leaves the game:

```js
// Conduit: passively benefits from R&D runs (gain virus counters)
AIRunExtraPotential: function(server, potential) {
    if (server == corp.RnD) {
        var conduitDepth = Counters(this, "virus") + 1;
        if (conduitDepth < corp.RnD.cards.length) return 0.5;
    }
    return 0;
},
```

**`AIBreachNotRequired`** (boolean)

Set to `true` if this card's benefit is gained without needing to breach the server. This tells the AI to consider the benefit even when it cannot breach:

```js
// Red Team: credits from successful run even without breach
AIBreachNotRequired: true,
```

---

### 4.14 Trash Cost Reduction

**`AIReducesTrashCost(card)`**

Return by how many credits this card reduces the trash cost of `card`. Used by hardware like Carnivore that lets you trash accessed cards at a discount:

```js
// Carnivore: can trash card for free by trashing 2 grip cards (so reduction = full trash cost)
AIReducesTrashCost: function(card) {
    if (this.usedThisTurn) return 0;
    if (runner.AI._rootKnownToContainCopyOfCard(GetServer(card), "Urtica Cipher")) return 0;
    if (runner.grip.length - runner.AI.cardsWorthKeeping.length < 2) return 0;
    return TrashCost(card); // full reduction
},
```

---

### 4.15 Inline AI Code for Runner

Some cards are complex enough that the AI logic is placed directly inside `Enumerate` or `Resolve`, guarded by `if (runner.AI != null)`. The AI communicates its choice by setting `runner.AI.preferred`.

**Setting a preference:**
```js
runner.AI.preferred = { title: "CardTitle", option: choice };
// "title" must match the title of the currentPhase the choice belongs to
```

**Example — Zahya Sadeghi (identity, always gains credits after a central run):**
```js
if (runner.AI != null) {
    runner.AI._log("I know this one");
    var choice = choices[0]; // always gain the credits
    runner.AI.preferred = { title: "Zahya Sadeghi", option: choice };
}
```

**Example — Conduit (always places a virus counter after a successful R&D run):**
```js
if (runner.AI != null) {
    runner.AI._log("I know this one");
    var choice = choices[0]; // always place a counter
    runner.AI.preferred = { title: "Conduit", option: choice };
}
```

**Example — Mutual Favor (installs the most-needed icebreaker from the stack):**

In `Enumerate`, return only the preferred choice:
```js
if (runner.AI != null && choices.length > 0) {
    var preferredCard = runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, InstalledCards(runner));
    var choice = choices[0];
    for (var i = 0; i < choices.length; i++) {
        if (choices[i].card == preferredCard) choice = choices[i];
    }
    return [choice]; // return only the preferred option
}
```

In `Resolve`, prefer the install option:
```js
if (runner.AI != null && choices.length > 0) {
    runner.AI._log("I know this one");
    var choice = choices[0]; // choose install if possible
    runner.AI.preferred = { title: "Mutual Favor", option: choice };
}
```

**Useful helper methods on `runner.AI`:**
- `runner.AI._log(msg)` — debug logging
- `runner.AI._getCachedCost(server)` — returns `Infinity` if the server is considered unrunnable
- `runner.AI._getCachedPotential(server)` — estimated value of running this server
- `runner.AI._matchingBreakerInstalled(iceCard)` — finds installed breaker for given ice
- `runner.AI._highestThreatScoreIce(excludeList, minRezCost)` — finds most threatening ice
- `runner.AI._iceHostingSpecialBreakers()` — ice that already have Trojan breakers
- `runner.AI._icebreakerInPileNotInHandOrArray(pile, installedCards)` — finds the most-needed breaker in a pile
- `runner.AI._rootKnownToContainCopyOfCard(server, title)` — returns true if server is known to contain a named card
- `runner.AI._additionalHQAccessValue(usingCard)` — estimated value of extra HQ accesses
- `runner.AI._countNewCardsThatWouldBeAccessedInRnD(depth, excludeCards)` — new R&D cards at given depth
- `runner.AI.cardsWorthKeeping` — array of hand cards the AI wants to keep
- `runner.AI._currentOverDraw()` — how many cards over hand limit the runner is
- `runner.AI._maxOverDraw()` — maximum acceptable overdraw amount

---

### 4.16 Ice Strength Reduction — `AIReducesIceStrength`

Cards that reduce the strength of ice the runner is encountering (via virus
counters, a flat modifier, or any other mechanism) should implement this so
the Corp AI's `_effectiveIceStrength()` can account for them when deciding
whether a server is actually secure — without it, the Corp AI will assume
ice is at full printed strength even when it effectively isn't.

**Signature:**
```js
AIReducesIceStrength: function(iceCard) { return amount; }
```
Return how much strength this card currently removes from `iceCard`. Return
`0` if it isn't currently reducing anything (e.g. no virus counters yet).

**Example — Leech (spends virus counters):**
```js
AIReducesIceStrength: function (iceCard) {
    return Counters(this, "virus");
},
```

**Example — Ice Carver (flat -1, no counters involved):**
```js
AIReducesIceStrength: function (iceCard) {
    return 1;
},
```

### 4.17 Hosted Subroutine Breakers — `AIHostedBreakContribution`

Cards hosted on ice that break its subroutines using counters (rather than
credits, e.g. Botulus) should implement this alongside the `AIMatchingBreakerInstalled` hook from [section 4.2](#42-special--trojan-breakers), so the
Corp AI's server security evaluation can correctly account for partial
coverage — a hosted breaker with 1 counter against 2 required subroutines
should reduce, not eliminate, the remaining break cost.

**Signature:**
```js
AIHostedBreakContribution: function(iceCard) { return subsItCanBreak; }
```
Return how many subroutines on `iceCard` this card can currently break for
free. Return `0` (or omit the hook) if it can't currently break anything.

**Example — Botulus:**
```js
AIHostedBreakContribution: function (iceCard) {
    return Counters(this, "virus");
},
```

### 4.18 Corp Security: Type Shifts, Bypasses, and Redirects

The Corp's server-security evaluator reads only public, active Runner cards.
Use these hooks for mechanics that change which breaker matches or let the
Runner skip an ice/server. Hidden run events belong to the public-threat model,
not these hooks.

- `AIEffectiveIceSubtypes(iceCard, server, iceIndex)` returns an object with
  `add` and/or `remove` subtype arrays. Use this when the type shift is needed
  specifically for Corp security planning.
- `AIModifyIceAI(iceAI, startIceIdx)` mutates and returns the Run Calculator's
  `iceAI` object. It can update `iceAI.subTypes` for route-aware effects such as
  changing only the next ice that will be encountered. Existing cards that
  already expose this hook are also understood by Corp security planning.
  `iceAI.knownToEvaluator` records `PlayerCanLook(knowledgePlayer, ice)`:
  true means visible ICE statistics; false means strength and subroutines are
  synthetic hidden-ICE estimates. The knowledge player defaults to the Runner
  and is the Corp during security planning, which can see its own ICE.
  The field is absent on early returns before visibility is evaluated (ignored
  ICE or ICE ineligible for security planning).
  Standard engine `modifySubTypes` modifiers are consumed too, so most subtype
  cards do not need an additional AI-only hook.
  Stick and Poke also uses this hook to prepend its net-damage row when
  predicting the first encounter, and to retain that row while its actual
  added subroutine remains on the encountered ice, even after `usedThisTurn`
  becomes true. Default models already contain the actual added row, so the
  hook replaces that row instead of duplicating it. `IceAI()` applies broken
  flags after these modifiers. A hook prepending prospective rows absent from
  `iceAI.ice.subroutines` must increment `iceAI.srActualOffset` by their count
  (default zero): actual row `i` maps to model row `i + srActualOffset`.
  Stick and Poke sets this offset only for its predicted row; live added rows
  already have actual indexes and keep offset zero. This metadata uses the
  public subroutine list and never inserts prospective rows into live state.
  `tests/stick-and-poke-subroutine-alignment.test.js` covers prospective broken
  rows for printed and default ICE models, and every live Event Horizon row. The
  draw remains unmodeled because the calculator has no draw effect token.
- `AIBypassesIce(iceCard, server, iceIndex)` returns `false`, `true` for a free
  targeted bypass, or the bypass's credit cost.
- `AIBypassesOutermostIce(server)` returns whether this card can skip the next
  outermost ice once during the run.
- `AIBypassesOneIce(iceCard, server, iceIndex)` returns whether a once-per-run
  bypass can target that ice. The evaluator first targets a proven mandatory
  lockout, then a layer with unknown mandatory pricing, then the highest known
  mandatory break cost. Unknown layers retain their zero lower bounds for
  aggregation, but those bounds are not used as their bypass-ranking price.
- `AIRedirectsRun(fromServer, toServer)` returns whether a run through the
  first server can become a run on the second, bypassing the destination's ice.

These hooks are called during Corp-turn planning as well as run simulation.
Base their answers on the supplied arguments and public persistent state; do
not require `CheckEncounter()` or assume `attackedServer` and `approachIce`
describe a real active run.

Baker's `AIRedirectsRun` and `AIRunAbilityExtraPotential` supply their
prospective Archives server while checking hosted stealth credits. This lets
run-only sources such as Touchstone answer in the context where the redirect
cost would actually be paid; the helper restores the real `attackedServer`
immediately after the read-only planning query.

```js
AIEffectiveIceSubtypes: function(iceCard, server, iceIndex) {
    if (iceCard != this.host) return {};
    return { add: ["Code Gate"] };
},

AIBypassesIce: function(iceCard) {
    if (iceCard != this.chosenCard) return false;
    return iceCard.subroutines.length;
},

AIBypassesOutermostIce: function(server) {
    return !this.usedThisTurn && server.ice.length > 0;
},

AIBypassesOneIce: function(iceCard, server, iceIndex) {
    return !this.usedThisTurn && CheckSubType(iceCard, "Sentry");
},

AIRedirectsRun: function(fromServer, toServer) {
    return fromServer == corp.archives && toServer == corp.HQ;
},
```

### 4.19 Hidden Single-ICE Threats — `AIHiddenThreat`

Hidden events that can invalidate a single layer of ice should declare an
`AIHiddenThreat` profile. The Corp AI uses these profiles to estimate risk from
public information without reading the Runner's Grip or Stack contents.

`AIHiddenThreat` is an object with these fields:

| Field | Type | Meaning |
|---|---|---|
| `kind` | string | A mechanic-level identifier shared by cards that create the same class of threat. Do not use a card title. |
| `expectedCopies` | number | Prior estimate of copies in an on-faction deck, normally `3`. Public Heap copies are subtracted from this estimate. |
| `severity` | number | Maximum protection-score pressure contributed when the threat is very likely. Keep this bounded and proportional to the layer invalidated. |
| `AppliesToServer(server)` | function | Return `true` when the card could threaten this server's current ice configuration. |

The estimator applies only to one-ice servers. It groups profiles by `kind`,
weights them using the public Runner identity faction, subtracts faceup copies
in the Heap, and combines the remaining expectation with the public Grip and
Stack sizes. The resulting probability changes the Corp's protection priority;
it does **not** assert that the card is in Grip and does not alter deterministic
run-cost or server-security calculations.

**Example — hidden run event that bypasses the first encountered ice:**

```js
AIHiddenThreat: {
    kind: "first-encounter-bypass",
    expectedCopies: 3,
    severity: 3,
    AppliesToServer: function(server) {
        return server.ice.length == 1;
    },
},
```

**Example — event that pressures an unrezzed ice:**

```js
AIHiddenThreat: {
    kind: "unrezzed-ice-removal",
    expectedCopies: 3,
    severity: 2,
    AppliesToServer: function(server) {
        return !!server.ice[0] && !server.ice[0].rezzed;
    },
},
```

Rules for new cards:

- Use a mechanic class for `kind`, so equivalent future cards contribute to
  the same public threat pool without title checks.
- Keep `AppliesToServer` deterministic and safe outside a run. It may inspect
  the supplied server and public game state, but never Grip or Stack card
  identities, Runner-AI caches, or active encounter state without a safe guard.
- Do not add this hook to a public installed bypass card. Use the appropriate
  `AIBypassesIce`, `AIBypassesOutermostIce`, or `AIBypassesOneIce` hook from
  [section 4.18](#418-corp-security-type-shifts-bypasses-and-redirects).
- When every expected copy of a threat class is faceup in the Heap, its hidden
  risk must be zero.

### 4.20 Run Credit Sources — `canUseCredits`, `AIRunPoolCreditOffset`

Corp security planning calculates a public effective credit ceiling for each server. Existing hosted-credit cards participate through the engine's normal `canUseCredits(doing, card)` hook. A source is eligible for breaking when `canUseCredits("using", installedBreaker)` returns true; credits restricted to installs, event plays, tag removal, or trash costs are deliberately excluded.

Server-specific credits that cannot be described reliably through `canUseCredits` should expose:

```js
AIRunPoolCreditOffset: function(server, runEventCardToUse) {
  if (typeof server.cards === "undefined") return 0;
  return this.credits;
},
```

The return value is the non-negative number of additional credits available for that route. `server` is the proposed attacked server. `runEventCardToUse` is the proposed event for Runner-AI simulation; Corp security planning always passes `null`, because hidden Grip identities are unavailable to the Corp. The hook must be read-only, use only public active state when called with `null`, and be safe outside a run. If a card exposes both usable hosted credits and this hook, the security evaluator takes the larger value rather than adding both.

`corp.AI._effectiveRunnerCreditPool(server)` returns `{baseCredits, temporaryCredits, recurringCredits, badPublicityCredits, clickCredits, total}`. It supplies the proposed `attackedServer` through `AIWithRunContext()` (§2 "Evaluating hypothetical state") while probing route-sensitive `canUseCredits` hooks, so the real value is restored afterward even if a hook throws. Click credits reserve one click for initiating an ordinary run; during the Corp turn `_projectedRunnerClicks()` uses the next Runner allotment, while an active run receives no click-to-credit allowance. `_projectedRunnerRuns(server)` converts that public click budget into ordinary run attempts and includes the current run when applicable.

### 4.21 Public Central Pressure — `AICentralPressure`

Installed Runner cards that amplify attacks on HQ or R&D should describe their
public threat to Corp protection planning:

```js
AICentralPressure: function(server) {
  if (server != corp.RnD) return {};
  return {
    additionalAccess: Counters(this, "virus"),
    persistentPressure: 0,
    growth: 2,
  };
},
```

The hook returns an object with non-negative numeric fields:

| Field | Meaning |
|---|---|
| `additionalAccess` | Extra cards the installed card can expose on the next breach of `server` |
| `persistentPressure` | Severity of a central-focused payoff that replaces or bypasses normal access, such as milling/burn |
| `growth` | Bounded warning that successful central runs strengthen the installed engine |
| `exhausted` | `true` when a limited-use source has spent its public uses or counters and offers no current access (for example Devadatta Drone with no power counters). Ignored when `additionalAccess` is positive |

Return `{}` when the card does not currently apply. The hook is called outside
runs and must be read-only, depend only on the supplied server and public state,
and never inspect Runner Grip or Stack identities. Hidden run events must not use
this hook: they belong to `AIHiddenThreat` or a future hidden central-event model.
Limited-use cards should return no access after their public counters or uses
are exhausted, and say so with `exhausted: true`; the F4 collector
`exhaustedPressureProtectionInstalls` reads that field. A once-per-turn use that
resets when the Runner's turn begins (Docklands Pass) is not exhausted: outside
the Runner's turn the hook reports the access available on the next Runner turn,
because the Corp plans protection on its own turn for that breach. `corp.AI._centralServerThreat(server)` aggregates installed sources;
`_classifyRunnerMacroThreat()` reports the visible board's central focus and
whether persistent non-access pressure is live. Its `focus` field is currently
diagnostic input for future install planning; protection scoring uses each
central's penalty directly.

If purging changes the card's immediate central pressure, it may additionally
expose the same schema through `AICentralPressureAfterPurge(server)`. This hook
describes the next breach after all virus counters are removed; pressure not
affected by a purge should be omitted from the hook and remains unchanged on
cards without it. For example, Conduit returns `{growth: 2}` but no
`additionalAccess`, because it can grow again only after the post-purge breach.
The Corp compares the resulting game-loss probability with the current state
before choosing a tactical purge.

`corp.AI._breachConsequence(server)` is the single breach-consequence signal
for any server, computed "if breached" regardless of current security:
`{pointsExposed, winProbability, advancedAgenda, backdoorTo, weight}`. It does
not change `_centralServerThreat()`'s penalty (weighting the access term by it
failed its F4 gate, L7.1). Card hooks stay mechanical; they never weight their
own pressure by consequence.

`corp.AI._centralBreachLossRisk(server)` calculates an order-agnostic
probability that the next affordable HQ or R&D breach supplies the agenda
points needed to win. It uses combinations of the Corp-known server contents,
never the engine's hidden card order. At a probability of 35% or higher, the
main-phase planner may interrupt a non-winning advancement plan for an ICE
install that materially secures the central, a purge that materially removes
multi-access, or emergency ICE acquisition. A Corp score that wins immediately
always retains priority. These tuning values are named in `ai_corp.js` as
`CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` and
`CORP_AI_CRITICAL_BREACH_MINIMUM_IMPROVEMENT`; keep this description aligned
when adjusting them.

The ordinary three-click purge uses `corp.AI._ordinaryPurgeOutcome()`. It does
not assign an arbitrary value to raw virus-counter totals. A guarded
hypothetical clears counters and temporarily removes installed Runner cards
whose `AIDisabledByPurge` hook is `true`, then chooses purge only if this opens
an immediate agenda score or makes a server containing an agenda or remote HVT
secure. The helper restores exact card locations, ordering, counters, and
install-state properties in `finally`. Cards trashed by purge, including _Clot_
and _Physarum Entangler_, must declare `AIDisabledByPurge` at the bottom of
their card object so counterless purge effects are represented. Public trash
prevention such as _Sacrificial Construct_ declares `AIPreventsPurgeTrash`; the
ordinary purge evaluation then conservatively keeps purge-trash cards active
while still clearing their virus counters.

### 4.22 Public Successful-Run Pressure — `AIPublicRunPressure`

Installed Runner cards that gain value merely by completing a successful run
should expose that visible value to Corp server-protection planning:

```js
AIPublicRunPressure: function(server) {
  if (typeof server.cards === "undefined") return {};
  return {
    economy: 0,
    growth: 1,
    persistentPressure: 0,
  };
},
```

The hook returns an object containing non-negative numeric fields:

| Field | Meaning |
|---|---|
| `economy` | Visible credits, cards, or equivalent resources gained from a successful run |
| `growth` | Counters or other visible effects that make later attacks stronger |
| `persistentPressure` | Repeatable strategic pressure not adequately represented as a one-off payout |

Return `{}` when the card does not benefit from a successful run on `server` in
the current public state. The hook is evaluated outside runs, so it must be
read-only and must use only the supplied server and public information. It must
never inspect Runner Grip or Stack identities. Hidden run events are represented
only after use by the Corp AI's recent-run evidence; they must not expose this
hook while hidden.

`corp.AI._serverRunPressure(server)` combines these declarations with recent
observed successful runs and `_evaluateServerSecurity(server)`. The component
totals are diagnostic rather than a calibrated exchange rate. Any live public
source or recent-run evidence applies one bounded
`CORP_AI_OBSERVED_RUN_PRESSURE_NUDGE` while the server is reachable. Currently
this affects Archives protection: it can make an otherwise empty Archives a
legitimate candidate, but Archives must still win the natural server-urgency
comparison before receiving ICE. Hooks must reflect exhausted public state;
Security Testing returns `{}` after its reward has been used for the turn.

Examples include Leech (`growth: 1` on centrals), Pennyshaver (`economy: 1`),
and Security Testing (`economy: 2`, `persistentPressure: 1`). Add this hook to
future cards whenever their public installed ability rewards successful runs.
Place new AI hooks with the card's other AI hooks at the bottom of its card
object, after gameplay properties and abilities.

## 5. Corp AI Hooks

### 5.1 ICE — `AIImplementIce`

ICE needs to tell the run calculator what its subroutines do. This is the most important hook for Corp cards.

**Signature:**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete)
```

- `rc` — the `RunCalculator`.
- `result` — an object with `{ ice, subTypes, sr, strength, encounterEffects }`. You modify `result.sr` and return `result`.
- Optional `result.maxSrBroken` (number) caps how many subroutines `rc.SrBreak` may plan to break on this encounter; set it to the remaining allowance during a live encounter (Afshar on HQ).
- `maxCorpCred` — corp's available credits (used for cost assumptions about unknown ice).
- `incomplete` — `true` if the subroutine list may be incomplete (e.g. face-down ice). In this case, be defensive and avoid assigning punishing effects to those slots.

**`result.sr`** is an array of subroutine entries. Each entry is an array of "OR" branches. Each branch is an array of effect strings. The run calculator will try to find a path through the ice that avoids the worst effects.

See [section 5.2](#52-ice-subroutine-type-reference) for the full list of effect strings.

**Simple example — Ping (ETR Barrier):**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]]];
    return result;
},
```

**Example — Brân 1.0 (install ice inward + 2 x ETR):**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
    result.sr = [
        [["misc_serious"]],   // sub 1: install ice inward (serious)
        [["endTheRun"]],      // sub 2: end the run
        [["endTheRun"]],      // sub 3: end the run
    ];
    return result;
},
```

**Example — Funhouse (encounter effect + tag subroutine):**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
    // encounter effect: take 1 tag or end the run (OR branches)
    result.encounterEffects = [["endTheRun"], ["tag"]];
    // subroutine: pay 4[c] or take a tag
    result.sr = [
        [["payCredits", "payCredits", "payCredits", "payCredits"], ["tag"]],
    ];
    return result;
},
```

**Example — Ansel 1.0 (complex Sentry with context-dependent effects):**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
    // sub 1: trash a runner card (serious if programs installed)
    var installedPrograms = ChoicesInstalledCards(runner, c => CheckCardType(c, ["program"]));
    if (rc.precalculated.runnerInstalledCardsLength > 0) {
        if (installedPrograms.length > 0) result.sr.push([["misc_serious"]]);
        else result.sr.push([["misc_moderate"]]);
    } else result.sr.push([[]]); // blank if nothing to trash

    // sub 2: corp installs a card
    if (corp.HQ.cards.length == 0 && corp.archives.cards.length == 0) result.sr.push([[]]);
    else result.sr.push([["misc_moderate"]]);

    // sub 3: runner cannot steal or trash (very serious)
    if (incomplete) result.sr.push([[]]);
    else result.sr.push([["misc_serious"]]);

    return result;
},
```

**Example — Karunā (conditional ETR via jack out option):**
```js
AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
    result.sr = [
        // sub 1: 2 net damage, then runner may jack out (ETR variant)
        [["netDamage", "netDamage", "endTheRun"], ["netDamage", "netDamage"]],
        // sub 2: 2 net damage
        [["netDamage", "netDamage"]],
    ];
    return result;
},
```

---

### 5.2 ICE Subroutine Type Reference

These are the effect strings you can use inside `result.sr` arrays:

| String | Meaning |
|---|---|
| `"endTheRun"` | Ends the run. Paths that fire this are avoided. |
| `"netDamage"` | 1 net damage. Include once per point of damage. |
| `"tag"` | Gives the runner 1 tag. |
| `"loseCredits"` | The runner loses 1 credit from their main pool (not extra credits). Will not reduce below zero. |
| `"payCredits"` | Makes the runner pay 1 credit. If unaffordable, this path is skipped. Use for subroutines with a credit-pay option (like Tollbooth or Funhouse's opt-out). |
| `"misc_minor"` | A minor Corp-side benefit (e.g. corp gains 1 credit). |
| `"misc_moderate"` | A moderate threat (e.g. trash 1 program). Paths with this are avoided if possible. |
| `"misc_serious"` | A serious threat (e.g. install another ice inward, runner cannot steal). Treated similarly to `endTheRun`. |
| `"strengthenAllIce"` | Give every ICE on the calculated route +1 strength for the remainder of the run. Multiple entries stack. |

**Tips:**
- For subroutines with optional choices (e.g. "pay 4[c] or take a tag"), represent each option as a separate branch in the OR array.
- For unknown or partially-known effects, default to `misc_moderate`.
- Use `incomplete: true` guards when a subroutine list might be partial to avoid over-punishing the runner AI.

**`AIIceSpecificEffect(poolCreditsLeft, otherCreditsLeft, clicksLeft)`**

Use `"iceSpecificEffect"` in a subroutine branch when its consequence depends
on the resources remaining after earlier effects in that branch. The hook
returns replacement effect strings. `clicksLeft` includes earlier
`"loseClicks"` effects in the same branch; Vertigo uses this to make reaching
zero clicks a serious access restriction without treating every click loss as
the same threat.

---

### 5.3 Bioroid Click-Break

Bioroid ice can have their subroutines broken by spending runner clicks. Add `AIImplementBreaker` to the ice itself:

```js
// Brân 1.0: can break 1 sub per click spent
AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (this == iceAI.ice) {
        if (clicksLeft > 0) {
            var breakresult = rc.SrBreak(this, iceAI, point, 1);
            for (var j = 0; j < breakresult.length; j++) {
                breakresult[j].runner_clicks_spent += 1;
            }
            result = result.concat(breakresult);
        }
    }
    return result;
},
```

`AIImplementBreaker` is read by the Runner's `RunCalculator`. The Corp's
server-security evaluator never treats Corp ICE as a Runner breaker, so also
declare `AIBreakCost` on the ice. It prices breaking `subroutineCount`
subroutines and returns `{credits, clicks}`, or `null` when
`iceCard` is not this ice. The evaluator reads it only for the honest verdict
(`honestIsSecure` and related fields, L9.0); today's `isSecure` ignores it.

The supported costs are linear, finite, non-negative `credits` and `clicks`.
The evaluator requests the cost for one subroutine and scales it by the number
broken; counter costs and discounts for breaking several subroutines are not
supported by this contract.

Use only this ICE's public rules and properties, the supplied arguments, and
public board information. Do not read hidden Runner Grip or Stack identities.
The hook runs during hypothetical server evaluation outside a run: do not rely
on `attackedServer`, `approachIce` or encounter state, pay costs, spend clicks,
mutate cards or start decisions. Return a cost without side effects, and return
`null` when the supplied ICE cannot use this ability.

```js
AIBreakCost: function (iceCard, subroutineCount, server) {
    if (iceCard != this) return null;
    return { credits: 0, clicks: subroutineCount };
},
```

**Breaker-owned `AIBreakCost` (L9.1).** An installed Runner breaker may declare
this same hook to price mechanisms not represented by `AIImplementBreaker`.
The Corp consults it before the standard probe, with the breaker as `this`:
`AIBreakCost(iceCard, subroutineCount, server)`. Return the **total** price for
exactly that many remaining subroutines, including activation and any strength
increase: `{credits, clicks, counters}`. Credits and clicks are required finite,
non-negative numbers. Optional `counters` maps public counter names to finite,
non-negative amounts consumed on this breaker, e.g. `{power: 1}`. Omit it when
no counters are spent. Returning `null`, invalid data, or throwing means
**unknown price**, not inability. Do not declare an unaffordable route as a
zero cost: report the real costs; the planner checks the resources.

```js
//Example: a matching installed breaker spending one power counter per break.
AIBreakCost: function (iceCard, subroutineCount, server) {
    if (!CheckSubType(iceCard, "Barrier")) return null;
    return { credits: 0, clicks: 0, counters: { power: subroutineCount } };
},
```

Unlike ICE-owned linear self-break prices, breaker prices are queried for the
exact requested count, including partial native/breaker combinations. The
planner checks shared clicks and this breaker's counters across ICE and
finite reruns, charging each broken subroutine through its selected mechanism.
It compares full avoidance routes separately from mandatory passage routes.

Use only the installed public rig, public counters/resources, the Corp-known
ICE and supplied prospective server. Do not inspect Grip or Stack identities,
mutate cards, pay costs, or require a live encounter. Pricing runs under guarded
public run context and restores public payment fields and run/encounter state,
including after exceptions. The Runner's `RunCalculator` continues to use
`AIImplementBreaker`; this declaration does not implement Runner planning.

Both Corp verdicts carry `unpricedBreakers` (unique titles) and explain
`unpriced breaker <title>` in their reasons. Cost totals depending on unknown
pricing are `null`; a known native route does not make the unknown cheapest
cost finite. Never coerce these totals to zero or subtract them as candidate
deltas. `knownMandatoryBreakCost`, `knownBreakCost`,
`honestKnownMandatoryBreakCost` and `honestKnownBreakCost` are explicitly
optimistic lower bounds from independently priced portions. Only those bounds,
or an independent defence, may establish security while a price is unknown.
Missing installed matches and explicitly proved fixed-strength inability keep
their existing lockout behaviour.

---

### 5.4 ICE Install Decisions

**`AIWorthwhileIce(server, purpose)`**

Return `true` if this ice is worth using in `server` for the given `purpose`.
The implemented purpose values are `"install"` and `"rez"`. Generally you do
not need this hook unless the ice is situational; omitting it means the ice is
treated as worthwhile.

**`AIWorthInstalling(emptyProtectedRemotes)`**

Corp assets can use this legacy placement hook to decide whether and where to
install. Return `-1` to decline, an index from `0` through
`emptyProtectedRemotes.length - 1` to choose an existing remote, or
`emptyProtectedRemotes.length` to request a new remote. The supplied remotes
are already ordered by protection. The hook should check its own affordability
and payoff conditions; it must not inspect hidden Runner information.

---

### 5.5 Upgrades

**`AIApproachDefense(server, context)`**

For a root card whose effect fires when the Runner approaches its server.
Return `null` when it would not stop the run, or
`{runnerOptions: [{credits, clicks}, ...], corpEndsRunUses: n}`:

- `runnerOptions`: alternative costs the Runner may pay to continue the run.
  The Corp AI adds them as one extra layer after the innermost ICE of the
  honest security route, repeated with the route under global end-the-run.
- `corpEndsRunUses`: how many approaches the Corp would end with its own
  resources, following the card's own AI policy. Added to the server's global
  end-the-run uses; covering the Runner's projected runs is an honest lockout.

`context.spendableCredits` is the Corp's credits minus the rez costs of the
server's chosen ICE rez plan and of the counted unrezzed approach defences. The
security evaluator calls the hook for every root card in `server`, rezzed or
(when the rez is fundable with that plan) unrezzed, including detached
hypothetical servers, so it must be pure: no state, logging or `preferred`, and
no reads of `attackedServer`. It feeds the honest fields
(`honestIsSecure`, `honestLockout`, `honestMandatoryBreakCost`) and I2's
breach margin. With `iceMarginalSecurity` enabled (the default), these affect
live ICE-install ranking through `_marginalIceScore()`; compatibility
`isSecure` and `hasHardLockout` ignore it.
Effects that stop a successful run rather than charge on approach (for
example Flagship) are breach prevention, not approach defences.

```js
// Manegarm Skunkworks: [click][click] or 5[c], unless the breach is lethal
AIApproachDefense: function (server) {
  if (!server) return null;
  if (corp.AI._potentialDamageOnBreach(server, true) > runner.grip.length) return null;
  return {runnerOptions: [{credits: 5, clicks: 0}, {credits: 0, clicks: 2}], corpEndsRunUses: 0};
},
```

Anoetic Void returns `corpEndsRunUses = min(floor(spendableCredits / 2),
floor(non-agenda HQ cards / 2))`, or `null` when its `AIWouldTrigger(server)`
declines.

**`AIDefensiveValue(server)`**

Return a numeric value representing how much protection this upgrade provides to `server`.
If using security cost totals, reject `null` (unknown) and non-finite totals
before calculating a value; Shackleton follows this rule. Higher values make the AI more likely to install it. Return `0` to decline:

```js
// Manegarm Skunkworks: strong defensive upgrade
AIDefensiveValue: function(server) {
    return 4; // arbitrary, tune by observation
},
```

```js
// Anoetic Void: only useful in protected remote servers
AIDefensiveValue: function(server) {
    if (!server) return 0;
    if (typeof server.cards != 'undefined') return 0; // not in centrals
    if (server.ice.length < 1) return 0; // needs ice
    return 3;
},
```

**`AIIsScoringUpgrade`** (boolean)

Set to `true` if this upgrade is used for fast advancing agendas. This tells the AI to prioritise it in scoring servers:

```js
AIIsScoringUpgrade: true,
```

**`AIScoringSupport(agenda, server)`** (I4)

Read-only, on an upgrade. Return `{requirementDelta, requiresRez}` when this
upgrade changes the advancement requirement of `agenda` scored in `server`
(the agenda may still be in HQ), or `null` when it does not apply.
`_advancementLimit()` adds `requirementDelta` for each root upgrade of
`server` that declares it, only when the printed requirement is not already
modified. An unrezzed upgrade with `requiresRez: true` counts only when the
Corp can afford its rez cost plus the remaining advancements. SanSan City
Grid returns `{requirementDelta: -1, requiresRez: true}` in its own server.
Use public and Corp-known state only.

**`AIRezWhenCan()`**

Return `true` to select this installed asset or upgrade for rez at the next
available paid-ability window. Ice qualifies only while
`CheckRezAsNonIceDuringRun(card)` is true (it declares
`rezAsNonIceDuringRunsOnServer` and a run is in progress against the server it
protects, as for Rime); the same check adds that ice to the engine's run-window
rez options. Corp command selection calls this after
`FullCheckRez` validates card type, affordability, additional costs and
`RezUsability`, and before the ordinary phase policy. The hook must be
read-only, safe outside a run, and use only information available to the Corp.
Return `false` to leave selection to ordinary phase policy. Hype Machine uses
this to bank its free rez after either scoring or stealing, even in an empty
server and at the end of the Runner's turn.

**`AILimitPerServer(server)`**

Return the maximum number of copies of this upgrade allowed per server. Prevents the AI from piling up multiple copies:

```js
AILimitPerServer: function(server) {
    return 1; // only 1 copy per server
},
```

**`AIPreventBreach(server)`**

Return `true` if this upgrade (when rezzed) will prevent the runner from breaching `server`. Used by the Corp AI to assess whether a server is truly safe:

```js
// An upgrade that ends the run before breach
AIPreventBreach: function(server) {
    // implement conditions under which this triggers
    return true;
},
```

**`AIWouldTrigger(server?)`**

An optional server argument supports pure planning against detached hypothetical
servers. Anoetic Void uses it when supplied and otherwise falls back to
`GetServer(this)`; runtime callers may omit it. Planning callers must use a
quiet damage calculation (the second argument to `_potentialDamageOnBreach`).

Return `true` to allow an upgrade's defensive ability to fire. Return `false` to suppress it:

```js
// Manegarm Skunkworks: don't fire if a kill is possible on breach
AIWouldTrigger: function() {
    if (corp.AI._potentialDamageOnBreach(attackedServer) > runner.grip.length) return false;
    return true;
},
```

```js
// Anoetic Void: don't fire if there is an ambush in the server, or no cards to discard from HQ
AIWouldTrigger: function(server) {
    var thisServer = server || GetServer(this);
    if (corp.AI._isAmbush(thisServer)) return false;
    var cardsInServer = thisServer.root.length + (thisServer.cards || []).length;
    if (cardsInServer < 2) return false;
    if (corp.HQ.cards.length - corp.AI._agendasInHand() < 2) return false;
    return true;
},
```

---

### 5.6 Operations

**`AIFastAdvance`** (boolean)

Set to `true` if this operation is used to fast advance an agenda:

```js
// Seamless Launch: places 2 advancement counters on an already-installed card
AIFastAdvance: true,
```

**`AIFastAdvanceCounters(card, context)`**

Return the nonnegative number of advancement counters this card can place on
the supplied target. An operation may instead return
`{counters, credits, clicks}`: what it gains beyond its printed play cost,
where a variable X cost is returned as negative `credits` (Psychographics
returns `{counters: X, credits: -X}`; Biotic Labor returns
`{counters: 0, clicks: 2}`). The search applies the printed `PlayCost` and
`PlayClickCost` as before and skips a direction that gains nothing. Operations
receive `context = {thisTurn, credits, clicks, remaining, resolving}` from the
search point (`remaining` is counters still useful before the limit);
installed upgrades and older callers pass no context, so treat a missing
context as this turn. Seamless Launch returns 2 except for a card installed
this turn. The advancement search calls this on operations in its
candidate hand and installed one-shot upgrades. `card` may be null when
estimating advancement of a future install; return zero when its destination
or legality cannot be established. The hook must be read-only, safe outside a
run, and use only public information and the Corp's own cards.

Operations consume their actual `PlayCost` and `PlayClickCost` (including
Double); already-resolving operations have paid those costs. Installed upgrades
consume their rez cost if unrezzed, no clicks, and one locally recorded use.
Unrezzed upgrades must pass `FullCheckRez`, including `RezUsability`, with
the search point’s credits, clicks and target advancement counters. The probe
restores these fields and the active player even if a hook throws; execution
checks full rez legality again against the live board.
This upgrade contract is for trash-to-place-counter abilities without other
costs. Execution rezzes or triggers the planned upgrade and supplies
`AIPreferredTarget`; its ability must validate that target. Flood the Market
returns the number of qualifying remotes; Hype Machine returns one only for
an advanceable card in its own root.

**`AIDamageOperation`** (boolean)

Set to `true` for operations that deal damage to the runner:

```js
// Neurospike: X net damage
AIDamageOperation: true,
```

**`AITagPunishment`** (number)

Set to the minimum number of tags needed for this operation to be worthwhile. The AI will play it against a tagged runner:

```js
// Public Trail: punishes tagged runners
AITagPunishment: 1, // needs at least 1 tag
```

**`AIWouldPlay()`**

Return `true` to allow the operation to be played. Return `false` to hold it:

```js
// An operation that's only useful in specific circumstances
AIWouldPlay: function() {
    if (SpecificCondition()) return true;
    return false;
},
```

**`AIWouldPlayBeforeScore(cardToScore, serverToScoreIn)`**

Return `true` if this operation should be played immediately before scoring `cardToScore` in `serverToScoreIn`:

```js
AIWouldPlayBeforeScore: function(cardToScore, serverToScoreIn) {
    // play this before scoring if conditions are met
    return true;
},
```

**`AIIsRecurOrTutor`** (boolean)

Set to `true` for recursion or tutor operations. These are given lower priority so they don't crowd out economy plays:

```js
AIIsRecurOrTutor: true,
```

**`AIEconomyPlay`** (number)

Marks a Corp economy operation for the main-phase economy policy. Higher
values are considered first among card-declared economy plays; normal play
legality, `Enumerate()` and `AIWouldPlay()` still decide whether it can be used.

**`AIPlayWhenCan`** (number)

Marks a Corp operation whose current opportunity should be used proactively.
Higher values are checked first after the built-in urgent operation list.
Pair it with `AIWouldPlay()` or a target-validating `Enumerate()` so the Corp
does not play it without a useful effect.

---

### 5.7 Agendas

**`AIAdvanceCreditGain(thisTurn, advancedInPlan, context)`**

Return credits gained from a basic advance, excluding its one-credit cost.
The advancement search reads it from the advanced card and from
`corp.identityCard`, passing `context = {card, advancementSoFar}` (counters
before this advance); economy callers pass no context, so fall back to the
card's own counters. Built to Last (identity) returns 2 when
`advancementSoFar` is 0; Oaktown Renovation returns 2, or 3 from its fifth
counter.
`thisTurn` distinguishes the current turn from a future turn;
`advancedInPlan` records whether this plan already used a basic advance on the
card. Consumers track that locally without changing card flags. Counter placement
does not trigger this income. See the Batch 12 contracts below for consumers and
hypothetical advancement budgets.

**`AIAdvancementLimit()`**

Return the number of advancement counters to place on this agenda. Normally you do not need this (the AI reads `advancementRequirement`). Use it for advanceable assets/ambushes that should be advanced to a non-standard level:

```js
// Urtica Cipher: advance to 4 counters to maximise net damage
AIAdvancementLimit: function() {
    return 4;
},
```

**`AICannotScoreOnInstallTurn`** (boolean, agendas only)

Set to `true` when the agenda's own text forbids scoring it on the turn it was
installed (Vulnerability Audit). The card enforces the rule through
`modifyCannot("score")`, so `CheckScore` and the installed-agenda fast-advance
checks already decline it once installed. This flag covers the hand: the Corp
install ranking skips the agenda when looking for an install-and-fast-advance
win this turn. It is static and read-only.

**`AIOverAdvance`** (boolean, agendas only)

Set to `true` to keep the advance action available for an already-scoreable agenda. Pair it with `AIAdvancementLimit()` to define the total advancement-counter target; the flag itself never supplies or overrides that target. The AI may score before that limit when doing so wins the game.

```js
AIOverAdvance: true,
AIAdvancementLimit: function() {
    return AdvancementRequirement(this) + 2;
},
```

---

### 5.8 Inline AI Code for Corp

Like Runner, complex Corp cards include AI logic directly inside `Enumerate` or `Resolve`. Use `corp.AI.preferred` to communicate choices.

Corp card-granted installs should use `_bestInstallOption(choices, inhibit)`
over legal `{card, server}` options, keeping a decline option when installation
is optional. The default-off manual opening option `openingHqThenRdIce` checks
final destination choices, including singletons and preferences. If a card
selects its card before offering destinations, call
`corp.AI._openingIceServerChoices(card, serverChoices)` before presenting or
compressing the list (Project Ingatan, Poétrï and Mycoweb in Elevation). It
returns unchanged options with the flag off; with it on, ICE options also carry
the known card. It does not change legality or advance history. For optional
installs with a destination fixed by the effect,
`_openingIceEmergencyInstall(card, server)` permits the required central or an
explicit critical-breach exception under the existing public-risk thresholds;
false means decline (Brân 1.0). Completed engine installs alone advance the
ordinal. No new card-defined AI hook is introduced. These helpers must not read
opponent-private cards or R&D order, and should not run in hypothetical probes.

**Setting a preference (by option title):**
```js
if (corp.AI != null) {
    corp.AI._log("I know this one");
    var choice = choices[0]; // set your preferred choice
    corp.AI.preferred = { title: "CardTitle", option: choice };
}
```

**Setting a preference (install command):**
```js
if (corp.AI != null) {
    corp.AI.preferred = {
        command: "install",
        cardToInstall: cardObject,
        serverToInstallTo: serverObject
    };
}
```

**Example — Ansel 1.0 (install from HQ or Archives after checking AI install preference):**
```js
if (corp.AI != null) {
    var choice = choicesA[choicesA.length - 1]; // default: continue

    var archivesBestOption = (archivesOptions.length > 0)
        ? corp.AI._bestInstallOption(archivesOptions, false)
        : -1;
    var handBestOption = (archivesBestOption < 0 && handOptions.length > 0)
        ? corp.AI._bestInstallOption(handOptions, true)
        : -1;

    if (archivesBestOption > -1) choice = archivesChoice;
    else if (handBestOption > -1) choice = handChoice;

    corp.AI._log("I think " + choice.label + " would be best right now");
    corp.AI.preferred = { title: "Ansel 1.0", option: choice };
}
```

**Example — Brân 1.0 (install ice from hand or archives via subroutine):**
```js
// When choosing source (HQ or Archives):
if (corp.AI != null) {
    corp.AI._log("I know this one");
    var choice = choicesA[0]; // default
    if (archivesOptions.length > 0 && handOptions.length > 0)
        choice = choicesA[1]; // prefer Archives
    corp.AI.preferred = { title: "Brân 1.0", option: choice };
}

// When choosing specific ice from the selected source:
if (corp.AI != null) {
    // choose highest-printed-rez-cost ice that can be afforded and is worth rezzing
    var best = choicesB[0].card;
    var bestRC = best.rezCost;
    var wouldRezBest = CheckCredits(corp, RezCost(best), "rezzing", best) && corp.AI._iceWorthRezzing(best, RezCost(best), attackedServer);
    for (var i = 1; i < choicesB.length; i++) {
        var c = choicesB[i].card;
        var cRezCost = RezCost(c);
        if (c.rezCost > bestRC || !wouldRezBest) {
            if (CheckCredits(corp, cRezCost, "rezzing", c) && corp.AI._iceWorthRezzing(c, cRezCost, attackedServer)) {
                best = c;
                bestRC = c.rezCost;
                wouldRez = true;
            }
        }
    }
    corp.AI.preferred = { command: "install", cardToInstall: best, serverToInstallTo: attackedServer };
}
```

**Useful helper methods on `corp.AI`:**
- `corp.AI._log(msg)` — debug logging
- `corp.AI._bestInstallOption(optionList, inhibit)` — returns best index to install, or `-1` if none desirable
- `corp.AI._cardShouldBeFastAdvanced(card)` — returns true if the given card should be fast advanced
- `corp.AI._iceWorthRezzing(ice, cost, server)` — returns true if the ice is worth rezzing
- `corp.AI._isAScoringServer(server)` — true only if `_evaluateServerSecurity(server).isSecure` establishes an absolute safety floor and the server also passes the existing relative protection comparison against HQ (or Archives during hand overflow). An insecure remote is never offered as an agenda destination merely because another server has a lower protection score.
- `corp.AI._cardProtectionValue(card)` — coarse ranking value for ICE and defensive upgrades. Affordable ETR-capable ICE receives the normal baseline and high-cost/strength bonus; non-ETR ICE receives only a small deterrence baseline before the existing server, visibility, breaker, and hosted-card adjustments.
- `corp.AI._potentialDamageOnBreach(server)` — estimated damage runner would take
- `corp.AI._evaluateServerSecurity(server)` — estimates server safety (accounting for Runner ID abilities such as Quetzal, hosted virus breakers such as Botulus and strength reductions such as Leech/Ice Carver); returns `{isSecure, hasHardLockout, totalBreakCost, totalMandatoryBreakCost, runnerCredits, runnerCreditPool, structuralRisk, publicThreatRisk, reasons}`. It compares affordable rez plans for unrezzed ICE, including target-compatible hosted rez credits, and may omit a weak outer layer to fund a decisive inner layer; already-rezzed ICE consume no plan budget and omitted layers are listed in `reasons`. `runnerCredits` is the effective ceiling and `runnerCreditPool` is its component breakdown. `totalBreakCost` estimates punishment avoidance, while `totalMandatoryBreakCost` determines affordability lockouts. `structuralRisk` reports known public bypass pressure and `publicThreatRisk` reports probabilistic hidden-event pressure; neither turns a probabilistic threat into a deterministic lockout result.
- `corp.AI._effectiveRunnerCreditPool(server)` — returns the public, server-specific effective credit ceiling, including compatible hosted credits, Bad Publicity, and available click-to-credit conversion while preserving the run click.
- `corp.AI._estimateRunnerBypassRisk(server)` — returns the bounded hidden-threat protection penalty for a one-ice server using `AIHiddenThreat` profiles and only public faction, pile-size, and Heap information
- `corp.AI._centralServerThreat(server)` — aggregates public installed central access, persistent pressure, and growth into a bounded server-specific protection penalty
- `corp.AI._classifyRunnerMacroThreat()` — classifies the public board as balanced, HQ-focused, R&D-focused, or split-central and reports persistent non-access pressure
- `corp.AI._iceHasETR(ice)` — true if the ice can end the run (subroutine or encounter effect)
- `corp.AI._iceIsLethal(ice, runnerHandSize)` — true if printed damage exceeds the Runner's grip size
- `corp.AI._hasDefensiveUpgrade(server)` — true if an upgrade in the server prevents the breach
- `corp.AI._globalETRUses(server)` — number of declared global end-the-run uses the Corp will actually spend defending this server. Cards expose `AIGlobalETRUses(server)` and share it with their live activation policy; finite capacity taxes repeated routes, while capacity covering all projected runs is a hard lockout.
- `corp.AI._estimateBreakCost(ice, breaker, mandatoryOnly = false)` — estimated credit cost for avoiding punishment (`Infinity` when required breaks cannot be covered). Pass `true` to count only breaks needed to avoid ETR or lethal damage. Uses Corp-owned `AIImplementIce` classification, partial hosted contributions, and whole activation prices from `AIImplementBreaker`, falling back to card text. Optional punishment never establishes a security lockout.
- `corp.AI._requiredSubroutines(ice)` — number of subroutines worth breaking per the Corp-owned Run Calculator's classification. Human and AI Runners use the same path; the end-the-run/damage regex is a fallback only when the calculator is unavailable.
- `corp.AI._effectiveIceStrength(ice)` — ice strength after Runner reductions (Ice Carver, Leech, Datasucker)
- `corp.AI._matchingBreakerForIce(ice)` — the cheapest matching active Runner breaker found through public matching hooks, including human Runner identities; returns a synthetic free breaker only when hosted contributions cover the shared severity list
- `corp.AI._countETRSubroutines(ice)` — number of printed end-the-run subroutines on the ice
- `corp.AI._agendasInHand()` — count of agendas currently in HQ
- `corp.AI._isAmbush(server)` — true if server contains an ambush card
- `corp.AI._bestRecurToHQOption(options, serverUnderThreat, useNowIfPossible)` — picks the best card to recur to HQ

### 5.9 Access Punishment — `AIPunishesAccess`

Corp assets and upgrades that impose a real consequence when accessed can
declare its current severity to the bait policy:

```js
AIPunishesAccess: function(server) {
    if (!server || !server.root || !server.root.includes(this)) return 0;
    return 2 + Counters(this, "advancement");
},
```

**Signature:** `AIPunishesAccess(server) -> number`

Return a non-negative, comparable severity value for accessing this card while
it is installed in `server`; return `0` if the consequence cannot currently
fire. Damage can use one point per damage, while serious non-damage riders such
as a tag may add another point. The value is a planning weight, not expected
damage and not a promise that the effect is unpreventable.

The hook is called outside a run. It must be read-only, safe while the card is
unrezzed, and use only Corp-known game state. It may inspect its own public or
Corp-known counters, whether it is installed in the supplied server, and the
Corp's ability to pay its trigger cost. It must not inspect hidden Runner Grip
or Stack identities. Do not encode protection choices or randomness in the
card hook; `_calculateBaitFrequency(server)` owns policy and caches one
independent posture roll for each installed trap.

Tag punishment is separate: `AITagPunishment` continues to declare the minimum
tags needed by an operation. When the Runner is already tagged and the Corp can
pay for such a card in HQ, the Corp protection score receives bounded
deterrence. `_evaluateServerSecurity()` exposes that value as `deterrence`, but
it never changes `isSecure`.

### 5.10 Reserved Credits — `AIReserveCredits`

Corp cards whose abilities expect to spend credits after installation can
declare that amount to economy and ICE-rez planning:

```js
AIReserveCredits: function(server) {
    if (!server || !server.root || !server.root.includes(this)) return 0;
    if (!CheckCounters(this, "advancement", 1)) return 0;
    return 1;
},
```

**Signature:** `AIReserveCredits(server) -> number`

Return the non-negative number of credits this card would currently expect to
spend if its ability fires in `server`, or `0` when the ability is unavailable
or the AI would decline it. The hook must be deterministic, read-only, and safe
outside a run. It may also recognize a card in a central server's `cards`
array when its ability can fire from that location, as Snare! does in R&D and
HQ.

Do not include a card's rez cost. `_sufficientEconomy()` already gathers
unrezzed asset and upgrade costs from every central and remote root, and the
rez-decision code separately compares defensive upgrade costs. The hook is for
additional spending such as an access trigger or a paid defensive ability.
`_sufficientEconomy()` sums declared reserves for installed cards, while
`_iceWorthRezzing()` uses declarations from the attacked server's root and
central cards to avoid spending those credits on ICE first.

#### Shared agenda/trap remote postures

`corp.AI._remoteDeceptionProfile(card)` gives agendas and declared access traps
the same distribution of public action shapes. A profile contains:

- `targetIce`: one, two, or three ICE layers;
- `openingAdvances`: one or two counters during the opening advancement turn;
- `delayTurns`: advance immediately or wait one Runner turn first.

The profile contributes to scoring-remote selection, stops additional protection
only after its selected ICE depth, and controls the opening advancement cadence.
After that opening sequence, the card returns to its ordinary advancement target.
Agenda and trap profiles use the same generator so “one ICE” is not an agenda
bluff signature. Scoring-window value remains the dominant install criterion,
and the policy never deliberately creates a naked agenda or retains an unsafe
agenda posture when a breach could win the game or when the Corp could score
that agenda to win immediately.

Profiles (the shape) are cached with the card. With match-local feedback off,
they last for its lifetime; feedback can refresh a shape at a later active
commitment as described below. The bait/bluff activation decision lasts for
the card's lifetime unless the Corp AI option `postureEpochs` (L8.4,
default on after its revised F4 gate passed) is on: then the decision is kept for a
bounded epoch of two or three Corp turns and reconsidered, at most once per
Corp turn, after a public boundary (the server was run, Runner credits or
breakers changed, the root's advancement changed, or either side reached match
point). Repeated evaluator calls never reroll. `AIPunishesAccess(server)` is
unchanged: its signature and contract are the same with the option on or off,
and posture epochs add no card-facing hook.

The L8.2 relative-depth/parity/top-up experiment was not adopted after its
full gate failed. Its policy and settings have been removed. The existing
absolute-depth sampler, advancement cadence, epoch/feedback behavior and
`AIPunishesAccess(server)` contract remain in force. Passive measurement and
reporting improvements from that work remain available; see the rejected-design
record in the Corp architecture and the L8.2 ticket.

L8.5 records committed public actions through the engine's
`RecordPublicPostureEvent(action, card, server, amount)` and the AI's
`_recordPublicPostureEvent(action, server, card, amount)`. The per-game
`_publicPostureHistory` contains opaque card/server ids, Corp turn, action,
amount, acting side and turn side; it contains no live objects or card identities.
It includes installed roots/ICE, ICE rezzes, advancements placed by all engine
counter-placement paths, run declarations, actual encounters/accesses, actual
trap effects and completed scores/steals. Access is distinct from a successful
run; a declined optional trap effect is not a firing. The gameplay notification
adds no AI card hook and never changes the `AIPunishesAccess` contract.

With `matchLocalPostureFeedback` on (the default after its revised adoption
gate passed), later shapes use the shared twelve-script
distribution and `_postureScriptWeights`. Multipliers stay within 0.8–1.2;
each normalized script retains probability at least 0.015. Only cached active
postures exposed during a real Runner turn supply learning samples. Their
class uses actual visible ICE count and advancement counters, including whether
advancement was delayed, rather than a private agenda/trap label. At the next
Corp turn, an ignored surviving root reinforces its visible depth/delay; a
challenged root modestly favors deeper or delayed shapes. Ten prior exposure
equivalents limit any one sample's multiplier change below 0.02; repeated runs
on a root during one turn remain one sample. `_postureOutcomeCounts` retains
the response totals and `_postureFeedbackReasons` explains weight updates.

Newly profiled cards use current weights. Installed profiles refresh only when
an actual later active L8.4 commitment is rolled, once per card/epoch. With
epochs disabled, installed shapes retain their lifetime cache. Public events
and turn notifications ignore hypothetical probes. All memory belongs to the
AI instance and resets with a new game. Feedback off retains the existing
shape choices, caches and random draw counts; the public record remains available
for later legibility work. The adoption gate and current default are recorded
in the L8.5 ticket.

### 5.11 Emergency Protection Draw — `AIEmergencyDraw`

Corp assets and upgrades that can draw cards immediately after being installed
and rezzed may declare the number of cards drawn:

```js
// Spin Doctor: installing and rezzing it immediately draws 2 cards.
AIEmergencyDraw: 2,
```

**Schema:** `AIEmergencyDraw: number`

Use a positive number only when the draw is immediate and reliably available
after the card is installed and rezzed. The emergency protection planner may
install or rez the card when a critically exposed server needs ICE, HQ contains
none, the Corp can afford its current obligations and rez cost, and enough
clicks remain to install any ICE found. It will not defend a different server
by drawing while an agenda-flooded HQ remains deterministically breachable. The
hook describes card capability only; it must not encode server urgency,
agenda-flood policy, or inspect hidden Runner information. Delayed,
conditional, optional-cost, or click-ability draw
should not use this hook unless the declared number is guaranteed in the
planner's install-and-rez sequence.

### 5.12 Opening-Hand Economy — `AIEconomyCard`

**`AIEconomyCard`** (a boolean)

Set this to `true` on Corp economy cards which are neither Transactions nor
Advertisements. The Corp opening-hand evaluator uses it to recognize economy
without card-title checks. Transactions and Advertisements are recognized
automatically.

---

## 6. The Run Calculator (`rc`)

The `RunCalculator` class simulates hypothetical runs to determine their cost and feasibility. It is passed to both `AIImplementBreaker` and `AIImplementIce` as the first argument `rc`.

### `rc.ImplementIcebreaker(...)`

The central method for describing how a breaker handles ice:

```
rc.ImplementIcebreaker(
    point,          // current checkpoint
    card,           // the breaker card (this)
    cardStrength,   // breaker's current strength (may include temp boosts)
    iceAI,          // ice AI object (from IceAI())
    iceStrength,    // ice's current strength
    iceSubTypes,    // array of subtypes this breaker handles ([] = all)
    costToUpStr,    // credit cost per pump
    amtToUpStr,     // strength gained per pump
    costToBreak,    // credit cost per break use
    amtToBreak,     // subroutines broken per use
    creditsLeft     // credit budget remaining
)
```

Returns an array of breaking possibilities. Always concatenate onto `result`.

### `rc.SrBreak(card, iceAI, point, count)`

Break `count` subroutines using `card` for free (no credit cost). Returns breaking possibilities. Used by click-break (Bioroid) and counter-based breakers (Botulus):

```js
var breakresult = rc.SrBreak(this, iceAI, point, 1); // break 1 sub
```

### `rc.StrModify(card, iceCard, point, amount, persistent)`

Reduce or increase the targeted ice's strength by `amount`. Returns a strength-modification result. Use negative values to reduce:

```js
// Leech: reduce ice strength by 1 (persistent past the encounter)
var modresult = rc.StrModify(this, iceAI.ice, point, -1, true);
modresult.virus_counters_spent += 1;
result = result.concat(modresult);
```

### `rc.precalculated`

Pre-computed data filled in before the run calculation begins. Useful properties:
- `rc.precalculated.runnerInstalledCardsLength` — number of installed Runner cards
- `rc.precalculated.runnerInstalledIcebreakersLength` — number of installed icebreakers

### Checking whether runner.AI owns the rc

Some ICE (e.g. Diviner) needs to avoid using information the runner wouldn't know. Check:

```js
if (!runner.AI || runner.AI.rc !== rc) {
    // corp is running the hypothetical — use defaults
    result.sr = [[["netDamage"]]];
    return result;
}
// runner.AI is running the hypothetical — can use hand knowledge
```

---

## 7. Quick Reference Table

### Runner AI Hooks

| Hook | Type | Purpose |
|---|---|---|
| `AIImplementBreaker` | function | Describe how this breaker handles ice in the run calculator |
| `AIPreferredInstallChoice(choices)` | function | Return preferred install index, or -1 to decline |
| `AIWastefulToInstall()` | function | Return true if installing is wasteful |
| `AIOkToTrash()` | function | Return true if this installed card can be trashed for space |
| `AIWorthKeeping(installed, spareMU)` | function | Return true to keep this card in hand during discard |
| `AIOrdinaryEconomyPlay` | boolean | Opt a grip card into ordinary Runner income selection after legacy candidates, subject to normal play checks |
| `AISpecialBreaker` | bool | Marks non-standard breakers (Trojans etc.) |
| `AIFixedStrength` | bool | Marks breakers that can't pump strength normally |
| `AIMatchingBreakerInstalled(iceCard, effectiveSubTypes)` | function | Return self if this covers the given ice, else null; the optional list includes public subtype shifts |
| `AIReducesIceStrength(ice)` | function | Return the amount this active card currently reduces the ice's strength |
| `AIHostedBreakContribution(ice)` | function | Return how many subroutines this hosted card can currently break for free |
| `AIEffectiveIceSubtypes(ice, server, index)` | function | Add/remove effective ice subtypes for Corp security planning |
| `AIModifyIceAI(iceAI, startIceIdx)` | function | Apply route-aware changes to the Run Calculator's ice description; `knownToEvaluator` distinguishes visible from synthetic statistics |
| `AITriggerToRemoveTags()` | function | Return the alt of a paid ability that removes tags without a click, or falsy |
| `AITriggerInPaidWindow()` | function | Runner: return the alt of a paid ability to use now outside a run, or falsy (Simulchip) |
| `AIEncounterAbility(rc, result, point, iceAI)` | function | Add Run Calculator points for a non-breaker encounter ability; a persistent with `addSubTypes` makes later breaker steps see the gained subtypes |
| `AIInstallDiscountAbility(card, host)` | function | Offer `{alt, discount, select}` when this card's ability can install the grip card more cheaply than the basic install action |
| `AIBypassesIce(ice, server, index)` | function | Return targeted bypass availability or credit cost |
| `AIBypassesOutermostIce(server)` | function | Report a public one-shot outermost bypass |
| `AIDisabledByPurge` | boolean | Treat this installed Runner card's public AI effects as absent in a hypothetical purge because the purge trashes or disables it |
| `AIPreventsPurgeTrash` | boolean | Conservatively keep purge-trashed Runner cards active in an ordinary-purge hypothetical while this public prevention is available |
| `AIBypassesOneIce(ice, server, index)` | function | Report a public one-shot bypass that can target this ice |
| `AIRedirectsRun(from, to)` | function | Report a public server-redirection/backdoor route |
| `AIHiddenThreat` | object | Describe a hidden event's mechanic class, expected copies, severity, and eligible one-ice servers |
| `AICentralPressure(server)` | function | Describe public installed multi-access, non-access central pressure, and growth |
| `AIPublicRunPressure(server)` | function | Describe visible economy, growth, or persistent value from a successful run |
| `AIPrepareHypotheticalForRC(host)` | function | Pre-run: set up fake state for run calculation |
| `AIRestoreHypotheticalFromRC()` | function | Post-run: restore state after run calculation |
| `AIEconomyInstall()` | function | Return priority for economy install, 0 to skip |
| `AIEconomyTrigger` | number | Priority for triggering economy ability |
| `AIWouldTrigger()` | function | Return true to allow ability trigger |
| `AIWouldPlay()` | function | Return true to play this event |
| `AIWastefulToPlay()` | function | Return true if playing is wasteful |
| `AIPreferredPlayChoice(choices)` | function | Return preferred choice index, -1 to hold |
| `AIRunEventExtraPotential(server, potential)` | function | Extra run potential float for run events |
| `AIRunEventModify(server)` | function | Temporarily modify game state for run calc |
| `AIRunEventRestore(server)` | function | Restore state after run calc |
| `AIRunEventExtraCredits` | number | Credits this run event provides |
| `AIBreachReplacementValue` | number | Priority of this card's breach replacement at Run 5.1 |
| `AIRunPoolCreditOffset(server, runEventCardToUse)` | function | Public generic run-credit offset (Methuselah, Touchstone, Cezve, Ken Tenma); safe with a null event; restricted payments use `AIRunRestrictedCredits` |
| `AIRunRestrictedCredits(server)` | function | Nonnegative public credits available only for explicitly modelled restricted payments; shared providers report a maximum, not a sum |
| `AIMeatDamagePrevention()` | function | Nonnegative currently usable public one-shot meat-damage prevention capacity |
| `AIAdditionalAccess(server)` | function | Return extra accesses for given server |
| `AIInstallBeforeRun(server, ...)` | function | Return priority to install before running server |
| `AIInstallBeforeInstall(card)` | function | Return true to install this before the given card |
| `AIRunAbilityExtraPotential(server, pot)` | function | Extra potential from using this card's run ability |
| `AIRunExtraPotential(server, pot)` | function | Passive extra potential from having this installed |
| `AIBreachNotRequired` | bool | True if benefit doesn't require breach |
| `AIReducesTrashCost(card)` | function | Return how much this reduces the trash cost of card |
| `AIPlayToDraw` | number | Priority for playing this card to draw |
| `AIDrawInstall()` | function | Priority for installing this draw-enabling card |
| `AIIcebreakerTutor(installed)` | function | Return eligible icebreakers, or `[]` when none are available |
| `AIPermitMoreLeeches(installed)` | function | Card-specific install limit check |

### Corp AI Hooks

| Hook | Type | Purpose |
|---|---|---|
| `AIImplementIce(rc, result, maxCred, incomplete)` | function | Describe what subroutines do in the run calculator |
| `AIIceSpecificEffect(poolCredits, otherCredits, clicks)` | function | Replace a context-sensitive ICE effect using resources left after earlier effects |
| `AIImplementBreaker` | function | For bioroid ice: how the runner click-breaks them |
| `AIWorthwhileIce(server, purpose)` | function | Return true if ice is worth installing there |
| `AIOperationPlayClickGain(operation, thisTurn, playedInPlan)` | function | Finite identity click income from an operation in advancement search |
| `AIWorthInstalling(remotes)` | function | Asset placement: remote index, list length for new remote, or -1 to decline |
| `AIDefensiveValue(server)` | function | Numeric protection value of this upgrade |
| `AIPreferredUpgradeServer(legalServers)` | function | Return a supplied legal server, or `null` to hold; overrides generic placement |
| `AIAccessLimit(server)` | function | Nonnegative maximum other-card accesses, or `Infinity` for no cap |
| `AIPreventsSuccessfulRun(server)` | function | Boolean public success-prevention capability on the supplied server |
| `AIOutsideCreditDamage(server)` | function | Nonnegative preventable meat damage for an available outside-credit spend opportunity |
| `AIImmediateWin()` | function | Boolean immediate operation win; checked before tactics with normal play legality |
| `agendaPointsForPlayer(player)` | function | Agenda point value for the supplied scoring player; consumed by `AgendaPointsForCard` |
| `AIIsScoringUpgrade` | bool | True if this is a fast-advance scoring upgrade |
| `AIRezWhenCan()` | function | Select a legal asset/upgrade (or run-rezzable ice) rez opportunity in any available paid-ability window |
| `AILimitPerServer(server)` | function | Max copies of this card per server |
| `AIPreventBreach(server)` | function | True if this upgrade prevents breach |
| `AIPunishesAccess(server)` | function | Return current access-punishment severity for bait planning |
| `AIReserveCredits(server)` | function | Return state-sensitive post-rez credits to preserve for this card |
| `AIEmergencyDraw` | number | Immediate cards drawn after installing/rezzing this card during critical protection recovery |
| `AIGlobalETRUses(server)` | function | Number of active global end-the-run uses the Corp will spend defending this server |
| `AITriggerInPaidWindow()` | function | Declare a useful legal paid ability in the current window |
| `AITriggerAfterTactics` | boolean | Delay an `AITriggerWhenCan` setup action until kills, scoring, defense and priority installs are considered |
| `AIMandatoryPassCost(breaker, server, iceIndex, ai, evaluationContext)` | function | Price a mandatory ICE passage when ETR subroutines have payment alternatives |
| `AIBreakCost(iceCard, subroutineCount, server)` | function | ICE: linear native `{credits, clicks}` costs for the honest verdict. Installed breaker: exact `{credits, clicks, counters}` costs for both verdicts; `null` means unknown (§5.3) |
| `AIETRTrashesSelf` | boolean | A declared global ETR consumes its own ICE layer |
| `AIRunExtraRuns(server)` | function | Public self-consuming ICE defense requires an additional ordinary run; see Batch 12 contracts below |
| `AIRunSuccessfulDamage(server)` | function | Public available hand damage after a successful run |
| `AIEconomyCard` | boolean | Mark a non-Transaction, non-Advertisement Corp economy card for opening-hand evaluation |
| `AIWouldTrigger()` | function | Return true to allow upgrade ability to fire |
| `AIFastAdvance` | bool | True if this operation is used for fast advancing |
| `AIFastAdvanceCounters(card, context)` | function | Read-only counter count, or an operation's `{counters, credits, clicks}` gain, for an operation or installed one-shot advancement upgrade |
| `AIDamageOperation` | bool | True if this operation deals damage |
| `AITagPunishment` | number | Min tags needed for this punishment op to fire |
| `AIWouldPlay()` | function | Return true to play this operation |
| `AIEconomyPlay` | number | Priority for treating a Corp operation as a main-phase economy play |
| `AIPlayWhenCan` | number | Priority for proactively using a currently valid Corp operation opportunity |
| `AIWouldPlayBeforeScore(card, server)` | function | Return true to play before scoring |
| `AIIsRecurOrTutor` | bool | True for recursion/tutor ops (lower priority) |
| `AIAdvancementLimit()` | function | Custom advancement counter target |
| `AICannotScoreOnInstallTurn` | bool | Agenda cannot be scored on the turn it is installed; excluded from install-and-fast-advance win plans |
| `AIAdvanceCreditGain(thisTurn, advancedInPlan, context)` | function | Read-only credit income from the next basic advance, on the card or the identity, consumed by advancement and economy planners |
| `AIScoringSupport(agenda, server)` | function | Read-only `{requirementDelta, requiresRez}` an upgrade gives agendas scored in its server (I4) |
| `AIOverAdvance` | bool | Keep advance available past an agenda's score requirement; use with `AIAdvancementLimit()` |
| `AIRezForFree()` | function | True if this ice should be rezzed at zero cost to corp for on-rez effect |
| `AIDrawAbility` | number | Cards drawn by this card's click ability; the Corp prefers it to the basic draw when it draws more than 1 |

### Vantage Point Batch 5 card hooks

- Touchstone uses `AIEconomyInstall`, `AIWorthKeeping` and
  `AIRunPoolCreditOffset`; the offset reports only its currently hosted credits.
- Read-Write Share uses `AIWorthKeeping`, and its optional hosting choices keep
  the AI from hiding a card when its grip is already low.
- Sipa uses `AIWorthKeeping`; its inline trigger preference swaps a passed ICE
  only for a lower-valued installed ICE. There is no route-planning hook that
  safely models future ICE swaps.
- Stowaway uses `AIPreferredInstallChoice`, `AIRunExtraPotential`,
  `AIBreachNotRequired` and `AIWorthKeeping` to favor protected servers and
  value its successful-run payout without requiring a breach.
- Word on the Street uses `AIWorthKeeping`; its scoring effects are mandatory
  once installed and therefore need no activation hook.

### Vantage Point Batch 6 card hooks

- Synchrocyclotron uses `AIWorthInstalling` to seek a non-scoring remote only
  when HQ contains a Double operation and the Corp can afford to rez it, plus
  `AIAvoidInstallingOverThis` because its ongoing click discount is valuable.
- Ansel 2.0 uses `AIImplementIce` for its trash, heap-removal, install and
  end-the-run subroutines. `AIImplementBreaker` models its exact exchange of 2
  Runner clicks for up to 2 broken subroutines; inline Corp preferences choose
  high-ELO trash/removal targets and use the established install-option scorer.
- Reverb uses `AIImplementIce` for its two end-the-run subroutines. Its dynamic
  rez discount flows through the normal `RezCost` calculation, so it needs no
  separate valuation hook.
- Sleipnir uses `AIImplementIce` for its draw, recursion and end-the-run
  subroutines. Inline preferences draw only from nonempty R&D and preferentially
  shuffle a public Archives card rather than blindly cycling HQ.
- Méliès City Luxury Line has no activation decision. Its steal-click cost is
  enforced by the access engine, and its mandatory on-score click gain uses no
  AI hook.

### Vantage Point Batch 7 card hooks

- Vertigo uses `AIImplementIce` with `loseClicks`, then
  `AIIceSpecificEffect` to classify the no-click steal/trash lock as serious
  only when the subroutine actually leaves the Runner on zero clicks.
- Caveat Emptor uses `AIEconomyPlay`. Its inline mode choice normally takes
  the larger credit gain, but denies a click when the Runner is at match point.
- `realloc()` uses `AIEconomyPlay` and `AIWouldPlay`; its inline pair scorer
  balances printed rez-cost income against the ICE protection being given up.
- Retirement Plan uses `AIPlayWhenCan`, `AIWouldPlay` and
  `AIIsRecurOrTutor`, with the normal install scorer choosing a legal Archives
  target and destination.
- Perfect Recall uses `AIIsScoringUpgrade`, `AIDefensiveValue`,
  `AILimitPerServer` and `AIWouldRezBeforeScore`. Its inline ability choice
  favors titles actually at risk in the attacked server, then agendas and
  high-trash-cost cards.

### Vantage Point Batch 8 card hooks

- Méliès U uses inline Corp preferences to set the department corresponding to
  the least-protected central, and only trades the top card of R&D for an
  Archives card when the recursion improves card quality.
- Lotus Haze uses `AITriggerWhenCan`; its enumeration suppresses moves that do
  not improve the destination score, and its inline destination preference
  favors protected agenda servers and an upgrade's existing
  `AIDefensiveValue` declaration.
- Esca uses `AIPunishesAccess` to report its mandatory credit loss plus its
  tagged-only net damage, and `AIAvoidInstallingOverThis` preserves the ambush.
- ezaM uses `AIImplementIce` for its R&D filtering and run-long ICE-strength
  boost, plus `AITriggerWhenCan`; inline choices move agendas away from the top
  of R&D and avoid ICE swaps without a protection gain.
- Knowledge Seeker uses `AIImplementIce` for its counter/purge pressure, R&D
  arrangement and end-the-run subroutines. Its inline arrangement places the
  highest-valued card on top of R&D.

### Vantage Point Batch 9 card hooks

- Lionsmane and Vicsek use `AIImplementIce` to model their alternative payment,
  jack-out, damage and tag branches without treating optional punishment as a
  guaranteed end-the-run effect.
- Cultivate uses `AIWouldPlay` and `AIPlayWhenCan`; its inline choices trash the
  least valuable card, add the most valuable card to HQ and leave the strongest
  remaining draw on top of R&D.
- Unleash uses `AITagPunishment`, `AIWouldPlay` and `AIPlayWhenCan`; its inline
  choices prioritize an expensive unrezzed ICE and its most threatening
  subroutine.
- The Red Room uses `AIDefensiveValue`, `AILimitPerServer` and
  `AIGlobalETRUses`. The live ability and security-planning hook share the same
  server-value policy, and installed active cards now participate in global
  end-the-run capacity planning.

### Vantage Point Batch 10 card hooks

- Editorial Division: Ad Nihilum makes its `responseOnTakeBadPublicity` choice
  inline, tutoring the best legal card while declining when R&D is critically
  low.
- Witch Hunt uses normal agenda advancement policy; its score, steal and
  action-phase effects are mandatory and need no discretionary hook.
- Magistrate Revontulet and Nihilo Agent use `AIWorthInstalling` and
  `AIAvoidInstallingOverThis` to choose the first affordable protected
  non-scoring remote, creating a new one when every candidate is a scoring
  server, and preserve their ongoing effects.
- Grubber uses `AIImplementIce` to model each subroutine as the Runner's choice
  between paying 3 credits and ending the run.

---

### Vantage Point Batch 11 card hooks

- Lethe's `AIImplementIce` describes optional recursion and the installed-card
  return. Its result also carries `fullyBrokenEffects` and `bypassEffects`,
  arrays of effect strings applied by `Directions` when all subroutines were
  broken or the ICE was bypassed, respectively. These branches each add one
  tag; a partial break does not. Recursion prefers a strong non-agenda draw,
  otherwise buries an agenda; the return targets a public Runner threat.
- Paywall's `AIImplementIce` separates the encounter credit loss
  (`loseCredits`) from the pay-one-or-end-the-run subroutine.
- Flood the Market uses `AIFastAdvance`, `AIFastAdvanceCounters` and
  `AIWouldPlay`, respects the planner's `AIPreferredTarget`, and avoids ordinary
  plays with fewer than three qualifying remotes.
- Scapegoat uses `AIPlayWhenCan` and `AIWouldPlay` only when both modes can
  benefit the Corp. Runner mode selection preserves expensive installs, or
  preserves two bad publicity against cheap targets. Corp targeting uses
  public installed-card threat ranking.
- Hype Machine uses `AIIsScoringUpgrade`, `AITriggerWhenCan`, `AIRezWhenCan` and
  `AIFastAdvanceCounters`. `AIRezWhenCan` selects the free rez before its
  discount expires. `RezUsability` permits a free rez, or pays six only
  when the counter can bridge the click shortfall for scoring. Its AI ability
  targets unfinished agendas and honours a legal `AIPreferredTarget`.

### Vantage Point Batch 12 card hooks

- Sacrifice Zone Expansion uses `AIAdvancementLimit()` for its normal scoring
  target. `AIAdvanceCreditGain(thisTurn, advancedInPlan)` returns the credit
  income from a basic advance: three on the first advance, zero thereafter.
  `_potentialAdvancementDirections` consumes it and records the basic advance
  locally in `point.persist`; placed counters do not consume the opportunity.
  `_bestMainPhaseEconomyOption` compares its net income with a credit click.
  Both consumers are read-only. Next-turn plans reset the opportunity and can
  use an explicit click budget and hypothetical starting counter count in
  `_potentialAdvancement(card, limit, thisTurn, fastAdvanceArray, assumeClicks,
  output, startingCounters)` without mutating the board. The live damage choice
  preserves a completed score or a counter essential to scoring next turn,
  unless the damage wins immediately. `AIRunSuccessfulDamage(server)` returns
  the public available damage after a successful run, using only installed
  state, counters and once-per-turn capacity. `CalculatePieceBegin` includes
  it independently of breach replacement. Generic `netDamage` represents the
  meat damage; stopped attempts do not pay successful-run damage.
- Luana Campos uses `AIWorthInstalling(remotes)`, `AIRezWhenCan()` and the
  opening-hand economy flag `AIEconomyCard`. Placement chooses the strongest
  empty protected remote, otherwise a new one. Installing/rezzing requires bad
  publicity, an affordable rez and at least two R&D cards. The rez hook waits
  until no run is active, preserving approached ICE rez funds. Turn-start choices
  decline a draw that leaves no card for the mandatory draw.
- Event Horizon uses `AITriggerInPaidWindow()` for legal Corp paid-window
  command/card selection. It uses the final movement window (`Run 4.5` with
  `approachIce == 0`), or a paid window with `approachIce < 0`, then sacrifices
  against a potentially winning breach or to save an agenda on the Runner's
  last click. `AIGlobalETRUses(server)` shares that one-use policy with Corp
  security planning. `AIMandatoryPassCost(breaker, server, iceIndex, ai,
  evaluationContext)` returns the cheaper of paying three or a credit-only
  breaker price. Breaker clicks/counters remain separate route alternatives;
  `_securityIcePlanInputs` consumes it. `AIETRTrashesSelf` excludes the consumed
  layer from repeated-route taxes.
  `AIRunExtraRuns(server)` returns one when its public, installed, rezzed,
  active and trashable paid defense can stop a run on that server. It must
  describe a self-consuming ICE, not a renewable stop. For complete Runner
  routes, `CalculatePieceEnd` consumes one such defense per attempt and
  `_finiteRunContinuations` calculates an ordinary follow-up run through a
  local ICE-model overlay. The failed attempt pays encounters, the continuation
  receives fresh bad-publicity credits, and only the successful attempt pays
  approach/breach effects. Additional pool expenditure is stored in
  `runner_credits_reserved`, consumed by `ValidPoint` and `PointCost`. Before
  a run, unspent first-attempt bad-publicity credits expire and are also
  reserved so neither continuation nor outer validation can reuse them.
  Credit losses consume permanent credits rather than bad-publicity credits. Incomplete
  encounter planning and Corp severity calculation are unchanged. This is a
  conservative public-information plan assuming the Corp uses each available
  stop; it can afford a rerun and does not treat disposable defense as permanent.
  Hypothetical continuations retain the current installed rig and ordinary run
  calculator assumptions; they do not simulate intervening installs or draws.
  The real Runner subroutine selector follows calculator OR branches. Choices
  can expose `srChoice` to retain their model index when unaffordable payments
  disappear from the legal menu; no inline preference overrides the route.
- Flywheel uses `AIImplementIce` for two economy subroutines, never an ETR.
  Each mandatory credit resolves before the optional draw. The actual option
  selector takes a draw with room in HQ and more than one R&D card, and declines
  overflow or consuming the card needed for the mandatory draw.
- Tocsin uses `AITriggerWhenCan` with `AITriggerAfterTactics: true`. `Phase_Main`
  delays these setup triggers until after kill, scoring, critical defense and
  useful priority installs, before ordinary recovery/economy. Its HQ ability
  uses `availableFromHQ`. It preserves the last click, an affordable ETR
  defender, hand space and mandatory-draw safety. The tutor budget uses the
  current protection target, includes the expend credit and ICE installation
  cost, and reserves credits for that server's already unrezzed ICE. Searches
  select affordable new ICE, ranking stopping subroutines, absence of a compatible installed
  public breaker, then existing ELO, instead of the generic operation tutor
  scorer. Real option selection handles each subtype and a separate decline.
  `AIImplementIce` models two pool-credit losses and two separate ETRs.

### Vantage Point Batch 13

- `AIImmediateWin()` returns a boolean for a Corp operation whose resolution
  wins immediately. `CorpAI.Phase_Main` checks this before ordinary tactics,
  then applies `AIWouldPlay`, `FullCheckPlay`, costs and target legality. It must
  be read-only and use only public state and Corp-owned information. Myōshu
  requires a qualifying score and two more points reaching the victory target.
  Its ordinary `AIPlayWhenCan` opportunity preserves all installed unrezzed
  ICE rez costs; an immediate win can spend that reserve.
- Reanimation Protocol uses `AIPlayWhenCan`, `AIWouldPlay` and
  `AIIsRecurOrTutor`. Resolution sets a normal title/option preference for the
  current protection server. Affordable candidates rank stopping ICE, absence
  of a public matching breaker, Liability (avoiding extra bad publicity), actual
  combined discounted cost and existing ELO. A cheaper affordable stopping HQ
  installation is a reason to hold the operation. The install discount uses
  `modifyInstallCost(card, destination)`, now also consumed for ICE; the unused
  part of its ten-credit reduction is passed to `Rez`, retaining additional
  rez costs and post-rez response timing.
- Vulture Fund uses `AIEconomyPlay: 1`, `AIEconomyCard` and `AIWouldPlay`.
  Main-phase tactics precede economy; existing clean economy titles precede
  its declared economy play. It is unavailable below its seven-credit cost.
- `AIAccessLimit(server)` returns a nonnegative maximum number of other cards
  accessible on a route, or `Infinity`. `ServerAccessLimit` queries rezzed,
  enabled upgrades in the supplied public server root. Corp central-threat
  planning caps additional accesses; Runner `_additionalHQAccessValue` caps
  access bonuses. This query does not simulate a future rez or persistent
  copies after a trash. Flagship returns one for its installed rezzed server.
- `AIPreventsSuccessfulRun(server)` returns a boolean; the public query
  `ServerSuccessfulRunPrevented` uses rezzed, enabled upgrades. Flagship returns
  true for its installed rezzed server. Corp central-pressure planning excludes
  successful-run growth and pressure; the run calculator excludes successful
  damage. Crisium Grid declares the same hook, and Runner benefit hooks
  query `ServerSuccessfulRunPrevented(server)` for this public capability.
  This prevents success, while retaining ordinary breach and single-card value.

- `AIOutsideCreditDamage(server)` returns the nonnegative printed preventable
  meat damage for an unused outside-credit opportunity on the supplied public
  server. `OutsideCreditDamageSources` queries rezzed, enabled root cards;
  `RunCalculator` compares outside-first and pool-only policies, and Corp
  `_evaluateServerSecurityUncached` excludes lethal outside funding while
  retaining affordable pool routes. Surviving damage is deterrence, not an ETR.
  Shackleton returns four; its used opportunity is ignored during the current
  Runner turn and projected fresh on the next Runner turn during Corp planning.
  Queries are read-only and inspect no hidden Runner cards.
- `AIMeatDamagePrevention()` returns the currently usable public one-shot meat
  prevention capacity. `PublicMeatDamagePrevention` sums enabled installed
  Runner cards for both planners. Crash Space returns three when trashable.
  Run routes reduce meat damage, retain the prevention resource's cost using
  the existing damage weight, and carry consumed capacity into repeated runs.
  Runtime still resolves printed damage through normal prevention responses.
- `AIRunRestrictedCredits(server)` returns public credits excluded from the
  generic run budget that can finance an explicitly modelled restricted
  payment. The calculator takes the maximum report across installed providers
  because Corsairs share their stealth sources. Corsair reports stealth credits
  whose `canUseCredits("", null)` is false. Its reduction records restricted
  spending on the route; only those payments release the supplemental budget.
  They cannot fund ordinary breaks or trash costs, and pool-only routes cannot
  substitute pool credits. Consumption is retained across ICE and finite reruns.
  Corp `_icePlanOutcome` consumes a positive credit report through
  `_restrictedPaymentPlanOutcome`, using the shared calculator to follow
  restricted-payment/strength-modification sequences across the entire funded
  ICE route. Its `_securityPlanning` context supplies the selected rez plan,
  Corp knowledge of its own ICE and captured source-damage opportunities.
  It forecasts passing ICE and finite reruns, leaving optional access/trash
  costs out of Corp security. Generic outside credits and payment-only
  supplements remain separate; security uses the actual route's feasibility.
  L9.1 retains exact calculator pricing for supported multi-step
  strength-modification routes (such as Corsair): the scalar probe records
  emitted `StrModify` points as `fullRouteSupported`, without inventing a scalar
  price. Missing or unsupported pricing cannot turn an infeasible calculator
  route into security. A feasible calculator route remains a legal witness;
  its unknown totals stay unknown when an unsupported breaker is also present.
  Breaker-owned `AIBreakCost` uses the per-layer planner because the Runner
  calculator does not understand that contract. The scalar/resource planner retains the
  maximum public supplemental credit report as `restrictedCreditUpperBound`: an
  optimistic affordability bound, not a claim that an actual restricted-payment
  route is feasible. Unknown cost totals remain `null`. Lethal outside-payment
  damage retains the pool-only safety check.
  It enumerates preparation credits with their click costs, preserving separate
  clicks for run initiation, paid click abilities and repeats. Survival uses
  public Grip size and installed prevention; hidden Grip identities, proposed
  hidden run events and the real Runner's cached route are unavailable. The
  hypothetical server context is restored even on failure. Conditional damage
  is counted once, with turn projection captured before changing that context.
  This replaces Corsair's old pool-credit offset. The hook must be read-only,
  safe outside a run, and use public cards and counters only.
- `AIPreferredUpgradeServer(legalServers)` returns a supplied server or `null`
  to hold the upgrade. Corp `_bestServerToUpgrade` validates that result before
  ordinary install ranking. Shackleton filters servers with paid ICE defense
  and a public outside-credit budget, excludes occupied Regions, then uses
  `_serverToProtect` with its third-argument eligibility filter to rank the
  remaining threats, falling back to the first useful supplied server when
  no protection target qualifies. `AIDefensiveValue` values
  its payment tax; `AIRezWhenCan` requires an unused opportunity and an upcoming
  run payment. Both preserve meaningful hold/decline alternatives.
- `RunnerAI.AIPreserveOutsideCredits(doing, card, amount)` follows the cached
  route's `paymentPoolOnly` policy during live payment; absent a route it tries
  the safer pool first. `SpendCredits` offers human temporary-credit choices
  when a source-sensitive hazard is active. A completed payment emits
  `responseOnCreditsSpent(player, outsideAmount, doing, card)` before its
  continuation. `SpendHostedCredits` sends required stealth payments through
  the same checkpoint, including Corsair, Lampades and Baker before redirect.
  Shackleton's optional response uses normal title/option preferences; only
  choosing damage consumes its opportunity, reset at both turn boundaries.
- Let Them Dream uses `AIAdvancementLimit: 4` and normal score-response option
  preferences. `_preferredSearch` takes a fast winning agenda into HQ only
  with a protected scoring location, staging click and hand space; otherwise
  it rescues Archives agendas or hides flooded/exposed HQ agendas at the bottom
  of R&D. It can decline when no useful search exists. `AgendaPointsForCard`
  consumes `agendaPointsForPlayer(player)` so score totals, Runner known-agenda
  potential and Corp breach-loss estimates value this agenda as one Runner point
  and two Corp points, preserving the printed metadata.

### Downfall Batch 2 card hooks

- Utae uses `AIImplementBreaker`. While its once-per-run X break is unused on
  the planned route (`rc.PersistentsUse`), each X from 1 to the subroutine
  count is a branch costing X; the branch records `{use: Utae}` so later ice
  cannot reuse it. Afterwards, with 3+ installed virtual resources, it offers
  the 1[c] break. The X break selects subroutines first, then pays X once; its
  "pay and break" option carries `alt: "continue"` so the run-path executor
  stops after the planned subroutines.
- Climactic Showdown chooses its server and the Corp's response inline: the
  Runner picks the server whose cheapest public ice is dearest (facedown ice
  counts as 3, centrals win ties); the Corp trashes its cheapest protecting
  ice when that costs 3 or less, otherwise it allows the bonus. The bonus is a
  Runner lingering effect (`player: runner`) with `AIRunExtraPotential`; the
  Runner run selector includes such lingering effects with its active cards
  when adding passive run potential.
- Trickster Taka uses `AIRunPoolCreditOffset` (hosted credits pay for programs
  on any run) and `AIEconomyInstall`. At turn end the AI takes the tag only
  when untagged with at least 2 credits; otherwise it trashes Taka.
- Fencer Fueno uses `AIEconomyInstall`; its `canUseCredits` lets the real
  trash/steal cost checks see its credits after a successful run. The AI pays
  1[c] at turn end when it can.
- The Nihilist uses `AIWorthKeeping` (a virus program installed or in Grip)
  and `AIPreferredInstallChoice`. At turn start the AI triggers only when the
  Nihilist itself hosts 2 virus counters and removes those; the Corp AI trashes
  the top of R&D while R&D holds more than 5 cards.


### Downfall Batch 3 card hooks

- `AITriggerToRemoveTags()` returns the `alt` of a paid ability on an installed
  Runner card that removes tags without a click, or a falsy value. The Runner
  AI's tagged branch triggers that ability whenever the current window offers
  it (paid ability windows; the action phase lists click abilities only) and,
  while such an ability is usable, skips the basic click-and-credits remove
  action so the next paid window removes the tag for free. Read-only. Flip
  Switch returns `"flipswitch_removetag"`.
- `AIEncounterOptions(iceIdx, iceAI)` (previously undocumented, used by Inside
  Job) returns an array of `{effects, persistents}` options that the run
  calculator adds at the encounter with ice index `iceIdx`; it is read for
  active cards and for the hypothetical run event. A persistent
  `{use: card, target, iceIdx, action, alt}` makes the AI choose the offered
  trigger or option whose `alt` matches during that encounter, so the card's
  `responseOnEncounter` choice must carry the same `alt`. Return `[]` when the
  option does not apply. Read-only.
- Always Have a Backup Plan uses `AIRunEventExtraPotential` and
  `AIEncounterOptions`. During its second run (or while evaluating one) the
  encounter options add a bypass persistent for the last ice encountered in the
  first run. `AIWouldRunAgain(server)` is the card's own run-end helper: it
  temporarily applies that bypass, asks `_calculateBestCompleteRun` for a
  complete path from the outermost ice, restores the state, and requires a
  positive cached potential. The run-end response returns the AI's single
  choice, so the AI declines when other ice still stops the run.
- Blueberry!™ Diesel uses `AIPlayToDraw: 2` and `AIWouldPlay` (not into an empty
  stack). `AIBottomChoice(choices)` is its own resolution helper: it returns the
  index of a top card that duplicates an installed or held unique card, or a
  console while one is installed, and otherwise the final "leave both" choice.
- Flip Switch's `AIWouldZeroTrace()` is read during its
  `responseOnTraceInitiated` enumeration: it zeroes a trace whose current base
  strength exceeds the Runner's link and otherwise returns the decline choice.
  Jack-out has no AI policy (see the batch notes).
- Lucky Charm's `AIWouldPreventEndRun()` is read during its
  `responsePreventableEndRun` enumeration: it prevents the end of a run on a
  server with positive cached potential and otherwise returns the decline
  choice.
- Az McCaffrey needs no hook: `modifyInstallCost` reaches `InstallCost`, so AI
  install affordability and choices see the discount.

### Downfall Batch 5 card hooks

- Lat: Ethical Freelancer and Supercorridor offer their optional
  end-of-turn draw or gain through an inline `Enumerate` preference: the AI
  always takes it.
- In the Groove uses `AIPlayWhenCan` with `AIWouldPlay`: it is played on the
  first click only when at least two grip cards the AI wants (printed install
  cost 1 or more) are installable and affordable with the clicks left. Its
  install trigger gains 1[c] when the AI is short of credits or hand space,
  otherwise draws.
- Khusyuk uses `AIRunEventExtraPotential` (R&D only, `0.4 × (X − 1)` for the
  best X of 2 or more) and `AIBreachReplacementValue`. Inline preferences pick
  the cost with the most installed cards and access an agenda first, then a
  card it can trash and still keep 3[c].
- Spec Work uses `AIWouldPlay`, `AIPreferredPlayChoice`, `AIEconomyPlay` and
  `AIPlayToDraw`. It trashes only a program marked `AIOkToTrash`, a
  non-icebreaker costing 1[c] or less, or an icebreaker another installed
  breaker duplicates; otherwise it is not played.

### Downfall Batch 6 card hooks

- Gauss uses `AIImplementBreaker` with its +2 pump. Its install bonus is a
  `modifyStrength` effect, so the Run Calculator reads it through the card's
  current strength until the turn's discard step ends.
- Pelangi uses `AIEncounterAbility(rc, result, point, iceAI)`, consumed by
  `rc.IceAct` for every active card. Before any other action on an ice, it adds
  one point per breaker type (Fracter, Decoder, Killer) the ice lacks, spending
  one virus counter (`virus_counters_spent`). Each point carries two
  persistents: `{use, target, iceIdx, addSubTypes}`, which `IceAct` applies to
  later breaker steps on that ice, then `{use, iceIdx, alt: "pelangi_<subtype>"}`,
  which path resolution matches against the subtype choice after triggering.
  `rc.PersistentsUse` keeps it to one use per route. After it resolves,
  `AIModifyIceAI` adds the applied subtype to the live model, because `IceAI()`
  reads printed subtypes. Corp route planning sees it through the same
  `IceAct` call; per-breaker price probes do not include it.
- The Artist uses `AIEconomyTrigger: 3` with `AIWouldTrigger` returning false
  once its credit ability is used, so the economy trigger never falls through to
  the install ability. `AIInstallDiscountAbility(card, host)` is read by
  `RunnerAI.CommandChoice`: when the chosen command is a basic install and the
  option list includes `trigger`, the largest offered discount replaces the
  install with a trigger preference `{cardToTrigger, abilityAlt}`. The offer's
  `select()` records the target, and the ability's `Enumerate` then lists only
  that card. Offers must check that the ability can be used now. The Artist’s
  install enumeration restores the prior temporary discount state in `finally`,
  including when a legality or cost hook throws.
- Direct Access uses `AIRunEventModify`/`AIRunEventRestore` to blank both
  identities while its run is calculated. `AIRunEventExtraPotential` returns
  0.2 for a worthwhile run only when the Corp identity has run-time effects and
  the Runner identity does not. Its optional shuffle-back is chosen with a
  normal title/option preference.
- Rejig uses `AIWouldPlay` and `AIPreferredPlayChoice(choices)`. It returns an
  installed card whose `AIOkToTrash` is true, then installs the grip program or
  hardware with the largest saving that is affordable after the discount and
  not wasteful. A returned card with an install trigger can be reinstalled to
  refresh it. The install choice is narrowed to the planned card.
- Whistleblower chooses through a normal title/option preference. It names a
  known agenda reachable on this breach (remote root, face-up Archives, or a
  certain HQ card) that has a steal cost, preferring the most agenda points;
  otherwise it declines and stays installed.
- Rezeki uses `AIEconomyInstall`.

### Downfall Batch 7 card hooks

- MirrorMorph: Endless Iteration uses the engine's Corp action record
  (`corp.actionsTakenThisTurn`, compared with `SameCorpAction` per CR 5.2.5)
  and `responseOnCorpActionCompletes`, fired once when the Corp first passes
  the post-action window. Its inline AI choice takes the extra different
  action whenever `CorpHasDifferentActionAvailable` finds one with the covered
  click, otherwise gains 1[c]; the following main-phase decision is the normal
  `Phase_Main` over action options already filtered by
  `corp.restrictedNextAction`. It does not plan action order to meet the
  trigger condition.
- Architect Deployment Test has no hook. Its inline AI choice ranks every
  install option of the looked-at cards with `_bestInstallOption(options,
  false)` and installs and rezzes that card at the chosen destination, or
  declines when no option is ranked.
- Calvin B4L3Y uses `AIWorthInstalling` (non-scoring remote, only one copy,
  only with hand room and R&D above 3 cards), `AIRezWhenCan`,
  `AIAvoidInstallingOverThis` and `AIDrawAbility: 2`. `_drawAbilityCard`
  consumes `AIDrawAbility` wherever the Corp would take the basic draw
  (including emergency ICE recovery) and never draws R&D to 0. Its trash
  response draws unless R&D has 2 or fewer cards.
- Nanoetching Matrix uses `AIWorthInstalling`, `AIRezWhenCan` and
  `AIAvoidInstallingOverThis`; the existing click-economy regex now sets a
  trigger preference for the matching card, so another click ability (such as
  Calvin's) is not used by mistake. Its trash response always gains.
- Hagen uses `AIImplementIce`: `misc_serious` for the program trash only
  while a trashable non-decoder/fracter/killer program is installed (as for
  Rototurret), then `endTheRun`. Its strength reduction is a normal
  `modifyStrength`, so rezzed Hagen is priced at its reduced strength; while
  unrezzed it shows printed strength 6, like every other strength-modifying ICE.
- Calvin and Nanoetching trash responses read the `trashingPlayer` argument of
  `responseOnTrash` and fire only when the Runner trashes the rezzed asset.


---

---

## 8. Step-by-Step Worked Example

This section walks through adding AI support to two hypothetical new cards.

### Runner Card: "Spike Drill" (Fracter, 2[c]/+2 str, 2[c]/break 1 sub)

```js
cardSet[99001] = {
    title: "Spike Drill",
    elo: 1500,           // fictional example only; real cards use the exact published rating
    player: runner,
    faction: "Anarch",
    influence: 2,
    cardType: "program",
    subTypes: ["Icebreaker", "Fracter"],
    memoryCost: 1,
    installCost: 4,
    strength: 2,
    strengthBoost: 0,
    modifyStrength: {
        Resolve: function(card) {
            if (card == this) return this.strengthBoost;
            return 0;
        },
    },
    abilities: [
        {
            text: "Break 1 barrier subroutine.",
            Enumerate: function() { /* ... game code ... */ },
            Resolve: function(params) { /* ... game code ... */ },
        },
        {
            text: "+2 strength.",
            Enumerate: function() { /* ... game code ... */ },
            Resolve: function(params) { /* ... game code ... */ },
        },
    ],
    responseOnEncounterEnds: {
        Resolve: function() { this.strengthBoost = 0; },
        automatic: true,
    },

    // --- AI HOOKS ---

    // Tell the run calculator how to use this breaker.
    // It's a Fracter: 2[c] pumps +2 str, 2[c] breaks 1 sub.
    AIImplementBreaker: function(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
        result = result.concat(
            rc.ImplementIcebreaker(
                point, this, cardStrength, iceAI, iceStrength,
                ["Barrier"],  // handles Barrier ice
                2, 2,         // 2[c] per +2 strength
                2, 1,         // 2[c] per 1 subroutine broken
                creditsLeft
            )
        );
        return result;
    },

    // Don't install on the last click (save it for a run instead).
    AIPreferredInstallChoice: function(choices) {
        if (runner.clickTracker < 2) return -1;
        return 0;
    },

    // Reasonably powerful, so keep it in hand until installed.
    AIWorthKeeping: function(installedRunnerCards, spareMU) {
        // keep if no fracter is installed yet (need it eventually)
        for (var i = 0; i < installedRunnerCards.length; i++) {
            if (CheckSubType(installedRunnerCards[i], "Fracter")) return false;
        }
        return true; // keep a fracter in hand until one is installed
    },
};
```

---

### Corp Card: "Spike Trap" (Code Gate, 4 strength, two subroutines: 1 net damage, then ETR)

```js
cardSet[99002] = {
    title: "Spike Trap",
    elo: 1520,
    player: corp,
    faction: "Jinteki",
    influence: 2,
    cardType: "ice",
    rezCost: 4,
    strength: 4,
    subTypes: ["Code Gate"],
    subroutines: [
        {
            text: "Do 1 net damage.",
            Resolve: function() { Damage("net", 1, true); },
        },
        {
            text: "End the run.",
            Resolve: function() { EndTheRun(); },
        },
    ],

    // --- AI HOOKS ---

    // Describe the subroutines to the run calculator.
    // Sub 1: deals 1 net damage.
    // Sub 2: ends the run.
    AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
        result.sr = [
            [["netDamage"]],   // sub 1: 1 net damage
            [["endTheRun"]],   // sub 2: end the run
        ];
        return result;
    },
};
```

---

### Corp Card: "Rapid Mobilization" (Operation, fast advance: place 2 counters)

This is a fast-advance operation similar to Seamless Launch.

```js
cardSet[99003] = {
    title: "Rapid Mobilization",
    elo: 1800,
    player: corp,
    faction: "Haas-Bioroid",
    influence: 2,
    cardType: "operation",
    playCost: 1,

    Enumerate: function() {
        var choices = ChoicesInstalledCards(corp, function(card) {
            if (CheckAdvance(card)) {
                if (corp.AI != null) return corp.AI._cardShouldBeFastAdvanced(card);
                return true;
            }
        });
        if (corp.AI != null) {
            if (this.AIPreferredTarget) {
                for (var i = 0; i < choices.length; i++) {
                    if (choices[i].card == this.AIPreferredTarget) return [choices[i]];
                }
            }
            Shuffle(choices); // randomise to avoid predictability
        }
        return choices;
    },
    Resolve: function(params) {
        PlaceAdvancement(params.card, 2);
    },

    // Tell the AI this is a fast-advance card.
    AIFastAdvance: true,
};
```

---

That covers the full AI hook system. With these patterns you can add solid AI support to almost any card in the game. When in doubt, look at how an existing similar card implements its hooks in the `sets/` files — particularly `systemgateway.js`, which is the most comprehensively annotated set.


### Runner ordinary economy selection

`AIOrdinaryEconomyPlay` (boolean, default false) explicitly opts a grip card
into the Runner's ordinary income policy. Only `true` enables it. When that
policy needs credits and can play, it considers legacy title candidates first,
then opted-in cards in grip order without duplicates. `FullCheckPlay`,
`_wastefulToPlay` and `AIWouldPlay()` still gate play; `AIPreferredPlayChoice`
supplies the follow-up index. This read-only declaration does not itself rank
priority economy, mutate the board, or enable legacy `AIEconomyPlay` cards.

### Downfall batch 1 card hooks

- Isolation uses `AIWouldPlay`, `AIWorthKeeping` and `AIPreferredPlayChoice(choices)`
  to cash out a legal installed resource whose `AIOkToTrash()` returns true.
  It returns -1 for live resources or no target. Its `AIEconomyPlay: 2` informs
  the Runner's priority-economy preparation; `AIOrdinaryEconomyPlay: true`
  opts it into ordinary income selection after legacy candidates. That consumer
  propagates the selected play-choice index into the follow-up decision, after
  checking credit/click legality. This retains the existing economy policy's
  scope rather than enabling every legacy Runner economy declaration.
- Demolisher uses `AIWorthKeeping`, `AIWastefulToInstall` and
  `AIEconomyInstall()` (priority 1) to install an affordable console when none
  is installed. Its passive `modifyTrashCost` reaches the shared `TrashCost`
  evaluator directly; the once-per-turn credit is awarded after an actual
  Runner trash, never counted as permanent run funding.
- Chisel uses `AISpecialBreaker`, `AIMatchingBreakerInstalled`,
  `AIPreferredInstallChoice`, `AIWorthKeeping` and `AIOkToTrash` for legal host
  installation and retention. Target ranking uses only visible ICE stats,
  avoids duplicate Chisels and known cards that disable hosted programs or
  prevent strength reduction. `AIModifyIceAI` models its pending encounter:
  if strength is at or below zero, remove subroutines only if trash is legal;
  otherwise leave the AI state unchanged. Above zero, lower strength by one
  only when `strengthCannotBeLowered` is false. Do not lower again after the
  live trigger resolves. `iceAI.knownToEvaluator` identifies genuine stats, including the
  Corp's own ICE during its security calculations; a hidden synthetic zero
  cannot be interpreted as trashable ICE. On-encounter costs remain represented.
  `AIReducesIceStrength` reports only the pending counter (0 or 1) for Corp
  shortcut pricing: existing counters are already included in `Strength()`.
  Both hooks are read-only with respect to the board and safe outside runs.
- Stargate uses `AIWorthKeeping`, `AIWastefulToInstall`,
  `AIPreferredInstallChoice` and `AIInstallBeforeRun` to install one copy with
  enough MU, credits and clicks for the selected R&D run. The install-before-run
  hook reserves the run's direct costs. `AIRunAbilityExtraPotential` returns
  `max(0, 1.6 - potential)` only for unspent, useful R&D activations without
  successful-run suppression: its reward replaces the access value.
  `AIBreachNotRequired` allows its reveal/trash reward to survive breach
  prevention; `AIBreachReplacementValue: 2` supplies the real replacement
  selector. Its reveal decision sets the Runner's existing preferred index to
  the highest ELO legal revealed target. It never reads unrevealed deck contents
  to rank a run, install or activation. Target competition, Archives follow-up
  and immediate agenda-steal comparisons remain optimisation work.

`tests/downfall-integration.test.js` exercises real Runner commands, follow-up
selection, Corp security and run-calculator consumers, plus resource, timing,
hidden-information, prevention and cleanup cases.

### Elevation missing NBN batch (35057–35060, 35065–35066)

`AIOperationPlayClickGain(operation, thisTurn, playedInPlan)` is an identity hook
consumed by `CorpAI._potentialAdvancementDirections`. Return the nonnegative
click income from playing that operation. The search records the identity in
its local `persist` array after the first operation and passes that fact as
`playedInPlan`; already-resolving operations have already received their income.
The hook must be read-only, use public identity state and Corp-owned cards, and
work outside a run. Nebula returns one only on its reverse side, for the first
operation of the current turn. Ordinary play still requires its full click cost;
this hook models a subsequent gain, not a cost reduction.

Synapse uses `AITriggerWhenCan` for its click/tag economy action, preserving the
last tag after its first-removal benefit has been used. Its response enumeration
uses the real `_bestInstallOption` consumer, with a conservative legal fallback
for a protected empty remote agenda, an affordable-to-rez asset in a new remote,
or affordable-to-rez central ICE when ordinary action planning withholds installs.
Installation itself ignores all costs; subsequent rez costs remain payable.

Embedded Reporting uses `AIOverAdvance` and `AIAdvancementLimit` to seek one
excess advancement counter (two dividends), then the real discard-response
selector tutors a currently affordable operation, ranked by existing ELO (missing
ratings count as zero).
Its response offers no AI option without counters or a useful operation.

Next Big Thing uses `AITriggerWhenCan`; the real paid-ability selector includes
its `availableInRunnerScoreArea` ability only for the Corp. The AI waits for room
in HQ and at least four cards in R&D, then uses the real `_bestDiscardOption`
consumer to shuffle excess HQ cards back. It never activates a spent counter.

Bigger Picture uses `AITagPunishment`, `AIPlayWhenCan`, and `AIWouldPlay` through
the real main-phase play policy. Its enumeration transfers useful credits,
removing only the tags needed, or adds a tag when the Runner has fewer than five
credits. IP Enforcement uses the same play policy (`AIPlayWhenCan`,
`AIWouldPlay`), takes a legal stolen agenda using printed points, and prefers the
largest agenda and an empty protected remote. Neither operation is presented
without its required tags/targets. These are baseline policies; competing kill,
tag-retention, tutor-sequence, and scoring plans remain optimisation work.

### Downfall batch 8

- Fully Operational and Red Level Clearance declare `AIEconomyPlay`; the real
  Corp economy selector checks normal play legality and affordability. Their
  inline choices use the normal title/option preference consumer. Fully
  Operational mixes draw into a small HQ when funded. Red Level chooses credits
  and then draw or a click, while its human install mode uses legal non-agenda
  install choices and waits for completion.
- Cold Site Server uses `AIDefensiveValue(server)` and `AILimitPerServer` for
  protected-remote placement, `AIRezWhenCan()` for useful Corp-turn setup,
  and `AITriggerWhenCan` with `AITriggerAfterTactics` for spare action clicks.
  Its enumeration requires an agenda in its own root and fewer than three
  power counters. Active `modifyRunClickCost` and `modifyRunCreditCost` effects
  feed both actual run initiation and the run calculator. Entry credits are
  charged against the pre-run pool, including on incomplete routes. Mid-run
  recalculation owes no entry costs; counters reset at the next Corp turn.
- Hyoubu uses `AITriggerWhenCan` and `AITriggerAfterTactics` for its unused
  first-reveal action. Enumeration selects an occupied zone without looking
  at its contents. `Reveal` reports `automaticOnReveal(card, revealingPlayer)`;
  only Corp reveals yield its once-per-turn income. Mandatory R&D access
  reveals belong to the Runner.
- Project Yagi-Uda uses `AIOverAdvance` with `AIAdvancementLimit()` of four and
  `AITriggerInPaidWindow()` backed by legal swap enumeration. The baseline
  policy rescues agendas or replaces approached ICE with stronger affordable
  ICE. It reads only Corp-owned information and returns no opportunity outside
  a run. A consumed agenda counter is removed immediately. After install and
  hosted-card responses, the Runner's actual run calculator selects the
  continue/jack-out option; encountered replacement ICE is skipped. Ordinary
  remaining-path recalculation includes the new board and clears the old path.

### Downfall batch 9

- Sting! uses ordinary agenda install/advance/score selection and
  `AIPunishesAccess(server)` for installed bait severity. Its new
  `AIOnStealDamage() -> nonnegative integer` declares preventable net damage
  from stealing this agenda. The Runner run calculator includes it for known
  agendas in a server root; the Corp `_potentialDamageOnBreach` includes the
  largest qualifying agenda consequence among its own server/root cards.
  Both omit damage when stealing wins first. The hook is read-only, callable
  outside a run, and uses only public score areas. Central random-access
  prediction remains the existing coarse estimate.
- Public Health Portal uses `AIWorthInstalling`, `AIEconomyCard`,
  `AIAvoidInstallingOverThis` and `AIRezWhenCan`; its `RezUsability` restricts
  proactive rez to the Runner's final paid window. Reveal completion precedes
  income; the income still resolves with empty R&D.
- Storgotic Resonator uses `AIWorthInstalling` for a new remote,
  `AIRezWhenCan` to start collecting counters, and `AITriggerWhenCan` for
  legal counter-backed click damage. The first qualifying Corp trash is
  counted independently of whether the asset is active. Its callback receives
  a stable trash-event ordinal, so nested automatic effects cannot change
  which trash was first. Its action enumeration checks clicks and counters.
- Saisentan uses the title/option preference consumer for a card-type guess
  based on public Heap/installed cards. `AIImplementIce` budgets up to two
  net damage per subroutine (one original and at most one bonus). Only the
  Runner-owned calculator may rule out that bonus from a chosen type absent
  from its grip. This is a conservative bound, not a prediction of random
  damage draws; the bonus does not recursively trigger itself.
- Complete Image uses `AIPlayWhenCan`, `AIWouldPlay` and `AIDamageOperation`.
  The real main-phase selector plays it against a grip of at most one card,
  subject to agenda points, a successful run on the preceding Runner turn,
  clicks and credits. Its naming preference guesses a publicly observed
  title (or Sure Gamble), without inspecting grip/stack identities. The
  Terminal effect waits for the entire damage chain, moves the resolving
  operation to Archives, and ends the action phase directly.
- Letheia Nisei uses `AIPreferredUpgradeServer(legalServers)` to select an
  ICE-protected destination, `AIDefensiveValue`, `AILimitPerServer` and
  `AIRezWhenCan` with approach-time `RezUsability`. The optional trash uses
  the ordinary preference consumer; the Runner's real run calculator decides
  whether to continue after movement. `PsiGame` creates independent seeded
  bid preferences, bounded by each side's legal credit sources.

`AIRunRepeatIce(server) -> 0 | 1` declares a possible finite repeat traversal
of all ICE in the same run. It is read-only, safe outside a run, and uses only
public run-use state and the Corp's own server. The Runner calculator consumes
it only for known, active-ability, rezzed or affordable root cards. It budgets
the adverse Psi outcome, preserves cumulative clicks, credits, damage, finite
breaker resources and run-duration effects, and marks each defence used in
path-local persistents. There is no new run click, run-entry tax or refreshed
bad-publicity pool. After the real first approach the opportunity is gone.
Corp security records bounded deterrence for this probabilistic effect and
never uses it as a guaranteed lockout. Bid strategy, repeated-encounter target
value and the trade-off against letting a dangerous breach occur remain
optimisation work.

### Downfall batch 10

- Remastered Edition uses `AITriggerWhenCan` with an inline ability enumerator
  that selects a Corp agenda finishable with its counter and remaining basic
  advances. It preserves the counter without a useful affordable target or
  outside the Corp action phase. Human choices include either side's installed
  cards. `AIFastAdvanceCounters(card)` now also supports a scored Corp agenda:
  return the nonnegative counter placement available from one activation, or
  zero without a legal installed Corp target or available counter. The existing
  advancement planner consumes each source once per hypothetical plan, without
  changing its counters. Scored sources cost no rez credits. Main-phase plans
  select their paid ability through `AIPreferredTarget` and `trigger`.
- Daily Quest and Tiered Subscription use `AIWorthInstalling(remotes)`,
  `AIAvoidInstallingOverThis` and `AIRezWhenCan()` for economy setup. Daily Quest
  also declares `AIEconomyCard`. The real `CheckRez` permission check now consumes
  `canBeRezzed()` (boolean, all players), so Daily Quest's Corp action-phase
  restriction applies to humans as well as AI. This is a rules restriction,
  separate from the AI's `RezUsability` preference.
- Daily Quest uses the existing `AIRunExtraPotential(server)` contract on a
  public active Corp card. The Runner's run-potential consumer now includes
  active Corp cards as sources alongside Runner cards and Runner lingering
  effects. Its value reflects the successful-run reward and, before the first
  success that turn, denying next-turn income. `AIBreachNotRequired` keeps this
  successful-run incentive when a breach is replaced. This hook must be
  read-only and use public information only; hidden Corp cards are not sources.
- Congratulations! models its mandatory pass income with `result.passEffects`
  (effect-string array on `AIImplementIce`'s result). `Directions` applies these
  effects after unbroken subroutines, including bypassed or fully broken ICE.
  Its subroutine uses two `misc_minor` effects for Corp income and `gainCredits`
  for the Runner's one credit. `gainCredits` immediately adds one pool credit
  in `ValidateEncounterPoint`, represented as negative cumulative
  `runner_credits_lost`, so subsequent payments can use it. Earlier payments
  cannot use later gains; Corp subroutine ranking treats a gain as harmless.
- Loot Box models its first subroutine as two `payCredits` or `endTheRun`.
  Its second has `gainGripCard` for the card added to the Runner hand,
  `misc_minor` for hidden-card-dependent Corp income, plus
  `trashIce`: this calculator effect records `{action: "trashedIce", card}` in
  the path's persistents, suppresses that layer on subsequent traversals and
  excludes it from finite-run continuations. The local continuation cache
  includes removed layers; no board cards are moved by planning. Corp ranking
  treats self-trash as harmless. A broken second subroutine leaves the ICE in
  place. The live Runner payment preference follows a cached complete route;
  the live Corp reveal choice prefers the highest printed cost among the
  revealed cards, without inspecting unrevealed stack contents.

  `gainGripCard` preserves the printed hand-size effect for later damage: the
  path's damage allowance increases by one for each card actually available in
  the public stack count. Multiple gifts and finite-run continuations share
  that count; the model never reads hidden card identities. Corp subroutine
  ranking treats the gift as harmless. Damage already taken keeps its ordinary
  penalty, while the added card affects survival capacity.

### Downfall batch 11

- Focus Group and Game Over use `AIWouldPlay()` with `AIPlayWhenCan` (1 and 2)
  through the main-phase declared-opportunity consumer. Both track their
  last-turn condition while inactive (successful run / steal during the Runner
  turn, reset when the Runner turn begins). Focus Group's AI chooses the card
  type from public Runner cards (heap and rig) with fixed priors, never the
  grip, then sets X to the smaller of the matching count, affordable credits and
  the target's remaining advancement; it plays only with two Grip cards, two
  spare credits and an unfinished Corp agenda or `_cardShouldBeFastAdvanced`
  target. Game Over's AI chooses the type with the largest credit-equivalent
  loss (install cost, hosted credits/virus counters, hosted cards, consoles),
  assuming the Runner saves cards worth 3 or more while it can pay 3, and plays
  only when that loss is at least 5. The Runner AI pays 3 to save a card worth
  3 or more; the most valuable cards are offered first.
- Increased Drop Rates uses `AIPreferredUpgradeServer(legalServers)`: hold it
  (null) without bad publicity, otherwise a remote with a Corp agenda, else HQ.
  `AIPunishesAccess(server)` returns 1 while the Corp has bad publicity and the
  card is in that server's root or cards. The Runner AI takes the tag only
  when already tagged and the Corp has bad publicity.
- Divested Trust's optional forfeit is an inline Corp preference: forfeit when
  the stolen agenda has at least one printed point.
- SDS Drone Deployment declares `stealCost: {programs: 1}`. `StealCost` now
  returns `programs`; `CheckSteal` requires that many trashable installed
  programs, the access decline option stays available, and
  `PayStealCostPrograms` trashes them as an unpreventable cost before `Steal`.
  The Runner AI chooses through `RunnerAI._stealCostProgramOption(choices)`
  (an `AIOkToTrash` card, else a non-icebreaker, else the cheapest by install
  cost plus hosted credits/virus counters); it still always steals when legal.
  The on-score trash uses the Corp `trash` command and `_bestTrashOption`.

### Downfall batch 12

- Roughneck Repair Squad uses `AIWorthInstalling(remotes)` (non-scoring remote,
  declined when `_sufficientEconomy(false)`), `AIEconomyCard` and
  `AIRezWhenCan()` (its rez is free). The main-phase economy policy finds its
  "Gain 6[c]" click ability through `_clickAbilityLikeAvailable`; the ability
  enumerates only with three action-phase clicks. The Corp AI always removes
  bad publicity through `corp.AI.preferred`.
- Afshar sets `result.maxSrBroken` while protecting HQ: `1` before any
  printed subroutine is broken, `0` afterwards. `rc.SrBreak` returns no option
  that would exceed it, so the Runner plans to break only the ETR and accept the
  credit loss. The engine rule uses `modifyCannot` with id `"break"` on a
  subroutine, consumed by `ChoicesEncounteredSubroutines` and `Break`.
  The Corp security model already treats only the ETR as required.
- Sandstone lowers `result.strength` by one outside its own encounter, because
  its encounter counter is placed before the Runner can break.
- Trebuchet models the trash subroutine as Ansel 1.0 does and a successful
  Trace[6] lock as `misc_serious` (blank when `incomplete`).
- Secure and Protect uses `AIWouldPlay()` with `AIPlayWhenCan: 1` and
  `AIIsRecurOrTutor`. It plays only when `_serverToProtect` (central servers
  only) can receive stopping ICE from R&D and HQ holds no affordable stopping
  ICE. Its resolution prefers ETR ICE, then ICE that can still be rezzed after
  paying, then ICE without an installed compatible breaker, then higher ELO.
  Probes apply the 3[c] discount locally, are read-only, and use only the
  Corp's own deck contents.

### Downfall batch 13

- Reduced Service uses `modifyRunCreditCost` for its run tax, so Runner run
  legality, `AdditionalRunCosts` and the run calculator's run-start cost (also
  used by Corp security planning) charge 2 credits per hosted counter without a
  separate AI hook. `AIDefensiveValue(server)` (2 in an iced remote, else 0) and
  `AILimitPerServer` place it. `AIRezWhenCan()` rezzes it on the Runner's turn
  outside a run, in a central or a non-empty remote, when spare credits remain;
  its `responseOnRez` choice offers the AI only its preferred amount: up to 4,
  keeping enough credits to rez the server's unrezzed ice.
- Vulnerability Audit uses `AICannotScoreOnInstallTurn`; see §5.7.
- CSR Campaign uses `AIWorthInstalling(remotes)` (non-scoring remote, R&D of at
  least 4 and hand room), `AIAvoidInstallingOverThis` and `AIRezWhenCan()` at the
  end of the Runner's turn. The AI draws unless R&D has 2 or fewer cards.
- Rime declares `rezAsNonIceDuringRunsOnServer`; `CheckRezAsNonIceDuringRun`
  adds it to run-window rez options and the `AIRezWhenCan()` consumer, which
  rezzes it at the first Corp opportunity in a run on its server. Its subroutine
  is modelled as `loseCredits`. While rezzed, its `modifyStrength` boost is read by
  `Strength()` in Runner and Corp security calculations.

### Uprising batch 5 card hooks

- Harmony AR Therapy uses `AIWouldPlay()` and `AIWorthKeeping()`: it is worth
  playing when `_icebreakerInPileNotInHandOrArray(runner.heap, …)` finds a needed
  breaker in the Heap, or the Stack has under 5 cards and the Heap at least 3.
  `AIHeapCards()` resolves the choice: that breaker first, then the highest-ELO
  cards, at most 5 with different names.
- Aniccam has no AI hook: its draw is mandatory, and the Runner AI installs it as
  its desired Console.
- Simulchip uses `AITriggerInPaidWindow()`, the Corp hook name, which now also
  has a Runner consumer. In a decision with `trigger` and no run in progress,
  the Runner AI triggers an active card's ability whose `alt` the hook returns.
  In `Runner 1.3` it considers only click abilities. Simulchip returns
  `"simulchip_install"` only when an installed program has already been trashed
  this turn (cost waived) and a needed Heap breaker is installable after the 3[c]
  discount. Its resolution helpers `AICostChoice(choices)` (lowest-value
  program, keeping icebreakers) and `AIHeapInstallChoice(choices)` (the needed
  breaker, else the highest ELO) choose the AI's targets. All are read-only
  apart from Simulchip's own temporary discount flag.
- Cordyceps uses `AIWastefulToInstall()` (no central ice, or fewer than 2
  installed ice) and `AIChooseSwap(server)`. Its success response offers the AI
  only the swap that most lowers `_iceThreatScore` for the central just run:
  known ice protecting it for ice protecting another server. It declines when
  no swap lowers it.
- Euler's `AIImplementBreaker` prices code gates at 1[c] per +1 strength and,
  on its install turn (`installedThisTurn`), free single breaks; otherwise
  2[c] breaks up to 2. Its free ability is listed first, so a planned break uses
  it while available. `AIPreferredInstallChoice` keeps the last click.
