# Chiriboga — Code Review Notes (16 Sept commits, `ai_corp.js`)

Reviewing commits from 16 Sept in order, starting at `82d1387` (excluding the
first commit of the day, `752dbf0`).

---

## `82d1387` — Implement layer 3.5

**Summary:** Replaces the old `_serverToProtect()` (always returned the
single worst-scoring server) with `_rankedServersToProtect()` — a full
ranked list — plus a `_serverProtectionDebt` Map that ages up insecure
servers that get skipped, so protection installs rotate around the board
instead of always dogpiling the same server. `_ageProtectionPriorities()`
fires from `Phase_EOT` on Runner 2.2 (end of Runner's turn), matching what
the roadmap doc claims.

**Tests:** All 28 pass, including the 2 new ones (rotation within a turn,
debt accumulation across turns).

### Issue: HVT-protection priority silently downgraded

- **Old behavior:** if the naturally worst-scoring server was a generic
  remote (not the HVT's own server) and an HVT was installed, protection
  was **unconditionally** redirected to the HVT server, regardless of its
  own score.
- **New behavior:** the HVT entry's `adjustedScore` is just nudged down to
  _tie_ the weakest remote's score, then the normal sort (score, then
  insertion order) decides the winner. A tie can now lose to whichever
  remote happens to have a lower array index.
- **Not documented:** the "Implemented approach" note in the roadmap for
  Layer 3.5 doesn't mention this change to HVT handling at all.
- **Not tested:** both new regression tests hardcode
  `ai._HVTsInstalled = () => 0`, sidestepping this path entirely — there's
  no coverage for whether the HVT server actually gets prioritized under
  the new logic.
- **Ask:** confirm whether weakening the HVT guarantee to a tie (vs. an
  unconditional override) was an intentional design decision. If so,
  document it in the roadmap's Layer 3.5 notes and add a regression test
  that installs an HVT alongside a lower-scoring generic remote and
  asserts the HVT server is still selected for protection.

---

## `cc2777e` — Implement layer 4

**Roadmap goal (Layer 4: Structural & Type Shifts):** replace legacy
title-fast-paths with generic engine-hook evaluation for dynamic subtype
shifts, targeted ICE bypasses, single-vs-multi-ICE structural depth, and
whole-ICE server redirects (e.g. _Sneakdoor Beta_).

**Summary:** Matches the roadmap goal closely.

- `_effectiveIceSubtypes()` — new generic subtype-shift resolver (hook +
  text-pattern fallback for "gains/treat as [subtype]" wording), replacing
  hardcoded subtype assumptions in breaker matching.
- `_iceBypassCost()` / `_iceIsBypassed()` — public targeted-bypass cost via
  `AIBypassesIce`, with a regex fallback for "pay N credits per subroutine"
  wording.
- `_outermostIceBypassAvailable()` / `_oneShotIceBypassTarget()` — the two
  other bypass mechanic classes (`AIBypassesOutermostIce`,
  `AIBypassesOneIce`), matching the roadmap's split into separate mechanic
  classes (full unification is explicitly deferred to the already-documented
  Layer 4.1 follow-up, so that's expected, not a gap).
- `_serverStructuralRisk()` — bounded penalty for single-ICE agenda remotes
  exposed to a live bypass, feeding into `_protectionScore()`.
- `_archivesIsBackdoorToHQ()` — reworked to use `AIRedirectsRun` +
  text-wording fallback instead of the old `"Sneakdoor Beta"` title check.

**Card updates:** _Femme Fatale_ and _Sneakdoor Beta_ (`systemupdate2021.js`),
_Fransofia Ward_ and _Maintenance Access_ (`elevation.js`) all got the new
hooks. Checked Sneakdoor Beta's actual `cardText` field against the new
regex fallback in `_archivesIsBackdoorToHQ()` — it matches correctly
("...change the **attacked server to HQ** for the remainder of that run").

**Docs:** `documentation/ai.md` was updated in the same commit with all 5
new hooks (§4.18), per the roadmap's own process requirement that hook docs
land with the layer that introduces them. Good adherence to process.

**Tests:** All 38 pass (10 new for this layer), including bypass-vs-ice-count
interactions, structural risk toggling on/off ice count, and Kit's
first-encounter-only subtype shift.

### Minor: fragile subtype-mutation trick in `_matchingBreakerForIce`

When a card's `AIMatchingBreakerInstalled` hook doesn't find a match, the
code temporarily overwrites `iceCard.subTypes` with the effective (shifted)
subtypes, re-calls the hook, then restores the original value in a
`finally`. It's correctly wrapped in try/finally so it won't leak state on
an exception, but mutating a live shared game object to fake a hook's view
of the world is a fragile pattern — if any card's `AIMatchingBreakerInstalled`
implementation stores a reference to `iceCard.subTypes` (rather than reading
it once inline) instead of copying it, it'd end up holding a stale/swapped
array. Not a currently-observed bug, just worth a second pair of eyes if
breaker-matching ever behaves oddly for type-shifted ice in the future.

No other issues found — this one looks clean and well-scoped to what the
roadmap asked for.

---

## `9a2c0b7` — Implement layer 5

**Roadmap goal (Layer 5: Public Threat Memory):** model hidden-card threats
(_Inside Job_, _Spear Phishing_, _Forged Activation Orders_) on single-ICE
servers using only public information — identity faction, revealed Heap
copies, and grip/stack size — without inspecting the Runner's hand.

**Note:** this commit's author timestamp (12:07) is actually _earlier_ than
`82d1387` and `cc2777e` (18:48/19:01), even though it sits later in the git
log. Not a code problem, but worth knowing it wasn't necessarily built
_after_ Layers 3.5/4 in practice — if it was developed against an earlier
version of `ai_corp.js` and only rebased/committed later, that's usually
fine, but worth a sanity check that nothing from those layers got
inadvertently reverted. (It didn't look like it did — combined test suite
after this commit is 42 tests, cumulative and all passing — but flagging
the ordering oddity since it's easy to miss.)

**Summary:** `_estimateRunnerBypassRisk(server)` matches the roadmap
closely: gated to single-ICE servers only, uses a generic `AIHiddenThreat`
profile on card definitions (no title checks), weights by faction (in-faction
1.0, Neutral 0.5, out-of-faction 0.25 — a reasonable discount, not exclusion,
matching the roadmap's "discount rather than exclude" language), subtracts
revealed Heap copies, and folds grip+stack size into a proper hypergeometric
no-hit probability. Feeds into `_protectionScore()` as a bounded, separate
penalty (`publicThreatRisk`, capped at 4) and is explicitly kept out of
`hasHardLockout`/mandatory-cost math — a test asserts this directly
(`hidden threats affect protection urgency but not deterministic security`).
Cards updated: _Forged Activation Orders_ and _Sabotage-style unrezzed-ice
removal card_ (31017) in `systemupdate2021.js`, matching the roadmap's own
note that _Spear Phishing_ isn't implemented in this card pool.

**Tests:** All 42 pass (4 new). One test explicitly proves the imperfect-
information guarantee by making `runner.grip[0].title` throw if read, and
asserting the estimator still runs fine — good, direct test of the "never
inspect hidden grip" rule rather than just trusting the code comment.

### Minor: full `cardSet` scan on every single-ICE security check

`_estimateRunnerBypassRisk()` does a `for (var cardId in cardSet)` over the
_entire_ card pool (likely several hundred definitions) every time it's
called, and it's called from both `_evaluateServerSecurity()` and
`_protectionScore()` for every single-ICE server. Since protection scoring
runs repeatedly per Corp turn (once per server, at multiple decision points
per turn), this is a full card-pool scan happening many times per turn
rather than something computed once and cached. It's not a correctness bug
— just worth flagging as a performance smell if the AI ever feels sluggish;
the per-kind `profiles` result only depends on the Runner's identity
faction, which doesn't change turn to turn, so it's a good candidate to
compute once per game (or once per turn) and reuse rather than rebuilding
from scratch on every call.

No correctness issues found otherwise — this layer's scope, safety
boundary (public-only info), and score-vs-security separation all check
out against what the roadmap asked for.

---

## `4bd2055` — Update ai.md with new hooks

**Docs-only commit** (`ai_corp.js` untouched; tests unchanged, still 42/42
passing). Backfills `ai.md` with the `AIHiddenThreat` hook docs that
Layer 5 (`9a2c0b7`) had actually skipped — that commit's diff touched
`ai_corp.js`, the roadmap, and `sets/systemupdate2021.js`, but not `ai.md`.
Also fills in a couple of other reference-table rows that look like they'd
been missing since even earlier (`AIReducesIceStrength`,
`AIHostedBreakContribution`, `AIModifyIceAI`).

Worth knowing: this is also the commit that **adds** the "document hooks
in the same change" rule to the roadmap in the first place (it's a new
bullet under "Card implementation", not a pre-existing rule Layer 5 broke).
So this reads as the agent noticing its own doc-debt mid-stream, writing
itself a process rule, and paying down the backlog in one commit — a
reasonable self-correction, but it does mean Layers 3.5/4/5 up to this
point weren't held to that standard while being written. Worth a quick
skim to confirm nothing from Layers 6-8 (which come after this point)
reintroduces the same gap now that the rule formally exists.

---

## `5de59ce` — Implement layer 6

**Roadmap goal (Layer 6: Runner Effective Credit Ceiling):** stop the Corp
AI from getting false confidence when the Runner's raw credit pool is low
but their broader economy (recurring credits, Bad Pub, click-to-credit
conversion) is rich.

**Summary:** Matches the goal well. `_effectiveRunnerCreditPool(server)`
builds a public breakdown (`baseCredits`, `temporaryCredits`,
`recurringCredits`, `badPublicityCredits`, `clickCredits`) and
`_evaluateServerSecurity()` now uses `effectiveCredits.total` as
`result.runnerCredits` — which is what actually feeds the
`totalMandatoryBreakCost > result.runnerCredits` lockout comparison, so
the richer ceiling is genuinely wired into the real decision, not just
computed and ignored. Correctly avoids double-dipping: `AIRunPoolCreditOffset`
and `canUseCredits`-sourced credits take the max rather than summing when a
card exposes both; Bad Pub and click-credits are zeroed out once a run is
actually in progress (`evaluatingActiveRun`) so they aren't invented mid-run
or counted twice against `temporaryCredits`. Corp-turn planning correctly
switches from the Runner's leftover `clickTracker` to their next public
`AllottedClicks()` when it's the Corp's own turn. Followed its own new
doc-in-same-commit rule this time — `ai.md` updated alongside.

**Tests:** All 47 pass (5 new), covering the click-allotment switch,
hosted-credit eligibility via `canUseCredits`, route-aware server credits
not double-counting, and active-run credit isolation.

### Minor: `_iceIsBypassed()` wasn't updated to the new credit ceiling

`_iceIsBypassed(iceCard, server, iceIndex)` (added in the Layer 4 commit)
still compares a bypass's cost against the raw `Credits(runner)` rather
than the new `_effectiveRunnerCreditPool()` total. It's currently dead in
production — the real security loop uses `_iceBypassCost()` directly and
never calls `_iceIsBypassed()`; the only caller is a test — so this isn't
affecting AI behavior today. But it's a latent trap: if a future layer
wires `_iceIsBypassed()` into real logic assuming "can the Runner afford
this bypass right now," it'll silently use the narrower, pre-Layer-6
credit definition. Worth a one-line fix or a comment flagging it as
unused/stale.

No other issues found — the credit-ceiling logic itself looks correct and
well-isolated from the active-run case.

---

## `c6dac43` — Implement layer 7

**Roadmap goal (Layer 7):** differentiate central (HQ/R&D) defense from
remote defense based on visible multi-access/non-interactive pressure,
replacing the old hardcoded `_extraThreatOnRnD()` (which only checked for
one specific card, _Conduit_, by title).

**Summary:** Straightforward, matches the goal. `AICentralPressure(server)`
is a new generic hook (`additionalAccess`/`persistentPressure`/`growth`),
aggregated by `_centralServerThreat()` into a capped 8-point penalty, and
`_classifyRunnerMacroThreat()` layers a HQ/R&D/balanced/centrals
classification on top. Cleanly replaces the title-checked _Conduit_ special
case in `_protectionScore()`. Cards updated: _Docklands Pass_, _Conduit_
(`systemgateway.js`), _Devadatta Drone_ (`elevation.js`) — correctly leaves
out _Legwork_/_The Maker's Eye_ since those are hidden run events, not
installed board state, and the commit note explicitly says so.

**Tests:** 52/52 pass (5 new for this layer). `ai.md` updated in the same
commit again — doc-rule is holding since `4bd2055`.

Nothing flagged — didn't spot an issue worth a callout here. `_classifyRunnerMacroThreat()`'s `focus` field isn't actually consumed anywhere in `_protectionScore()` yet (only `.penalty` is), so it's currently diagnostic-only — worth confirming with the agent whether that's intentional groundwork for a later layer or dead output.

---

## `d31811e` — Start implementation of layer 8

**Roadmap goal (Layer 8: Baits & Bluffs):** decide when to under-defend a
real trap to bait the Runner (8.1), when to protect a real agenda to look
like a trap (8.2), and factor in real tag-punishment deterrence (8.3) —
explicitly the hardest layer since there's no deterministic "correct
answer" to test against, only long-run unpredictability.

**Summary:** Implements 8.1 (baiting) and 8.3 (deterrence) plus a shared
posture system (`_remoteDeceptionProfile`) that also covers agenda-bluff
timing (8.2-adjacent). Honestly self-labels as
`[PARTIALLY COMPLETED — POSTURE LIFECYCLE AND FEEDBACK PENDING]` rather
than claiming the whole layer is done — the roadmap diff explicitly calls
out that postures are cached for the installed card's _lifetime_ (no
reevaluation window yet) and there's no outcome feedback, and files those
as **required** follow-ups (8.4, 8.5), not optional polish. That's honest
status-tracking, worth acknowledging.

Checked the safety-override wiring specifically, since that's the part
that actually matters for this layer (a bug here means the AI risks
losing): `_shouldBluffAgendaServer()` correctly refuses to bluff when
scoring the agenda would win the game
(`AgendaPoints(corp) + points >= AgendaPointsToWin()`) or when
`_runnerMayWinIfServerBreached(server)` is true, and `_tagPunishmentDeterrence()`
checks the same win-condition guard before offering any deterrence credit.
Randomness is injectable (`this._random`, defaults to `Math.random`) and
decisions are cached per-server keyed to the specific card occupying it,
matching the "roll once, don't reroll on repeated evaluation" requirement.

**Tests:** 59/59 pass (7 new).

### Worth confirming: `_shouldBaitServer()` has no win-condition guard

Unlike the agenda-bluff and deterrence paths, `_shouldBaitServer()` doesn't
call `_runnerMayWinIfServerBreached()` before deciding to bait. This is
probably fine in practice — baiting applies to trap/ambush cards, and
accessing a trap doesn't normally let the Runner win the game the way
stealing an agenda does — but it's an asymmetry with the other two
deception paths worth a quick confirm-and-comment from the agent (either
"traps can never trigger a Runner win so this is intentionally omitted,"
or it's a gap).

---

## `439064e` — Add new install roadmap

**Docs-only commit**, no code changes: adds a new 619-line planning
document, `documentation/corp_ai_install_decision_roadmap.md`, explicitly
scoped as a **successor roadmap** to the security roadmap reviewed above —
"none of the phases in this document are implemented" until marked
otherwise. It reframes the next body of work as _install decisions_ (what
to install, where, and whether installing beats another action) rather
than _server security_ (how vulnerable is each server), and lays out 10
proposed phases (Phase 0 telemetry baseline through Phase 9
calibration/simplification), a cross-cutting test plan, and an explicit
"Definition of Done" per phase.

This is essentially the agent's own plan for what it'll work on next — not
something to code-review line by line, but worth skimming before handing
off further work, since it'll shape what "layer 9+" actually means. Given
you're feeding this file to the agent in the morning, flagging the same
`_shouldBaitServer()` question above alongside it makes sense as the last
open item from the security roadmap before this new one takes over.

---

## Summary for the agent

1. **`82d1387`** — HVT protection priority quietly weakened from an
   unconditional override to a score-tie; undocumented and untested.
   Confirm intent, document it, add a regression test.
2. **`cc2777e`** — clean; only a minor fragility note on temporarily
   mutating `iceCard.subTypes` in `_matchingBreakerForIce`.
3. **`9a2c0b7`** — clean; minor performance note (`_estimateRunnerBypassRisk`
   does a full `cardSet` scan on every call — candidate for caching).
4. **`4bd2055`** — docs catch-up, no issues; this is also where the
   "document hooks in the same commit" rule was formally added.
5. **`5de59ce`** — clean; `_iceIsBypassed()` wasn't updated to the new
   effective-credit ceiling (currently dead code, but a latent trap).
6. **`c6dac43`** — clean; `_classifyRunnerMacroThreat()`'s `focus` field is
   currently unused/diagnostic-only, confirm if that's intentional.
7. **`d31811e`** — solid safety-override wiring for the risky bluff/deterrence
   paths; confirm whether `_shouldBaitServer()` needs the same win-condition
   guard as the other two deception paths.
8. **`439064e`** — new planning doc for the next body of work, no code.

Nothing here is a "must fix before merge" blocker — all 59 regression tests
pass cumulatively and each layer matches its roadmap section reasonably
closely. Items 1 and 7 are the two worth actually deciding on rather than
just noting.

# Feedback on documentation\corp_ai_install_decision_roadmap.md

1. Phase 2 (ICE Selection) doesn't say how it interacts with a bait-postured server. Phase 3 already notes deception profiles should be "bounded inputs, not dominant policy," and the existing code gates ICE count on bait servers via \_deceptionProtectionTarget. But Phase 2 is purely about picking the best ICE for security once a server is eligible for another layer — it never says whether the ICE chosen for a bait server should stay "credibly light" (consistent with the under-defended signal) or just be whatever scores highest under Phase 2's marginal-security formula. If Phase 2 always picks the objectively strongest option regardless of posture, that's a second, independent channel for the same trap to look more/less credible than intended — worth an explicit line tying Phase 2 back to the active posture, the same way Phase 3 already does for role selection.

2. Phase 9's calibration metrics list doesn't include an unpredictability check. Layer 8's own bar for its randomness is "no observable correlation with any single game-state variable across many games" — that's the standard you and the doc both hold as essential to the fun surviving. But Phase 9's metrics list (agenda points, breach rates, insolvency, decision latency, etc.) is entirely about win/loss efficiency — nothing there would catch it if, say, Phase 3's role-selection logic later introduces a pattern like "the Corp only ever assigns trap role to a remote when it has exactly 8+ credits banked," even though the underlying \_shouldBaitServer() roll itself stays statistically clean. That's a real risk specifically because install-level decisions sit above the posture roll in the stack — they could leak a pattern the posture system itself never would. Worth adding the same exploitability bar to Phase 9's acceptance gate explicitly, not just the existing "deception safety" line, which is vaguer.
