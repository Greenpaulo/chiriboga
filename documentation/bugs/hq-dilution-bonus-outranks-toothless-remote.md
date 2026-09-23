# Corp AI: reinforces an empty remote about to hold a cheap asset instead of the agenda-holding, `secure:false` HQ, because HQ's protection score gets a hand-size "dilution" bonus that a remote never receives

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source:** `documentation/debug-logs/secured_remote_asset_when_hq_wasn't_secure.txt` (`Version reference: Sat Sep 19 2026 22:23:18 GMT+0100` — same pre-fix batch as most other logs in this folder).
**File:** `ai_corp.js` (line numbers are from `main` as of this writing and will drift; search by function name).
**Status:** Diagnosed, not yet fixed. This log's filename was flagged twice, by name only, in already-fixed documents (`hq-draw-gate-ignores-server-security.md` §7.4 and `hq-ice-install-blocked-by-economy-reserve.md` §7.3) as a suspected duplicate of patterns those documents fixed. Section 3.4 below works through why it is not: replaying this decision under the current, fixed allocation logic still produces the same wrong answer, because the mechanism is a different one — a scoring asymmetry in `_protectionScore()` itself, not the allocation-list or economy-gate bugs those documents addressed.

---

## 1. Summary

On the Corp's third turn, with 5 credits and an agenda (Longevity Serum) sitting in HQ behind a single Tithe (which cannot end the run — see `documentation/bugs/agenda-scored-behind-ice-with-no-etr.md`), the Corp spent its click and 2 credits adding a **third** piece of ICE to Remote 0 — an empty server about to hold nothing more than a Spin Doctor economy asset — instead of adding a second layer to HQ. `Ranked server protection` at that exact moment read `HQ: 3.78 (secure:false)` vs `Remote 0: 1.28 (secure:false)`: Remote 0 read as the *more* urgent target, so `_serverToProtect()` sent the ICE there. Immediately afterward, the Corp installed Spin Doctor into Remote 0's newly-reinforced root. The very next Runner turn, the Runner ran HQ once — past the same lone, un-ending Tithe — and stole Longevity Serum.

`_serverToProtect()` (~3009) always sends the next ICE install to whichever eligible server has the lowest `_protectionScore()`. That score is computed the same way for every server *except* HQ (and Archives-as-backdoor), which gets an extra, HQ-only term:

```js
// _protectionScore(), ~2833-2859
if (server == corp.HQ || (server == corp.archives && archivesIsBackdoorToHQ)) {
  var hqRealProtection = this._iceAndRootProtection(server);
  var rndRealProtection = this._iceAndRootProtection(corp.RnD);
  var agendaCount = this._agendasInServer(server);
  if (hqRealProtection < rndRealProtection) {
    ret -= 5;
    ret -= agendaCount * 2;
    ...
  } else {
    ret += corp.HQ.cards.length - this._agendaPointsInServer(corp.HQ) - 2.5;
  }
}
```

At the moment of this decision, HQ's real ICE protection (Tithe) wasn't yet rated below R&D's, so HQ fell into the second branch: its score got a bonus of roughly *(cards in hand) − (agenda points in hand) − 2.5*. With 5 cards in hand and 1 agenda point, that's a **+1.5 bonus** on top of whatever Tithe itself contributes — enough, combined with the turns of small increments before it, to put HQ's score (3.78-4.78) well above Remote 0's ICE-only score (1.28-1.3), even though HQ held the only real agenda on the board and Remote 0 held nothing.

The bonus term is a reasonable idea in isolation — a bigger hand does dilute the odds of a *single random HQ access* hitting a specific agenda — but nothing gates it on whether HQ's ICE can actually stop or slow a run in the first place. Tithe cannot end the run, so the Runner isn't relying on random-access luck at all: they can simply run HQ every turn for as long as they like, for a small, predictable cost, until they hit the agenda — which is exactly what happened, on the very next turn. Remote servers get no equivalent dilution credit, so this term makes a hand-stuffed-but-toothless HQ look safer, in the shared ranking, than an emptier but nominally better-ICE'd remote holding nothing valuable at all.

---

## 2. What happened in the log

Corp: AU Co.: The Gold Standard in Clones. Runner: René Loup Arcemont. Same opening as the sibling logs analyzed in `corp-installs-agendas-into-a-never-secure-remote.md` and `agenda-scored-behind-ice-with-no-etr.md` (Tithe/Diviner on Remote 0; two copies of Sericulture Expansion stolen from it in turns 2-3 of this same log, at lines 117-118 and 153-154, matching the pattern already documented there and not repeated here).

### 2.1 The decision

| Log lines | State | Event |
|---|---|---|
| 160-169 | Turn 3 begins. AU Co.'s ability nets +1 card to hand, then the mandatory draw. Hand ≈ 5 cards, including Longevity Serum (agenda) and, shortly, Anthill Excavation Contract (a second agenda) and Spin Doctor. | — |
| 170 | `Ranked server protection`: `Remote 0: 1.20 (secure:false)`, `HQ: 4.78 (secure:false)`, `R&D: 4.28`, `archives: 3` | HQ already reads as the *safest* insecure server, purely from the ranking, before any action this turn |
| 173-181 | `No obvious install options`, `No obvious economy option`, `Oh I know, I'll install something` | The AI talks itself into an ICE install |
| 182-183 | `Corp spent 2 credits` / `Corp installed ice protecting a remote server` | Third ICE piece added to Remote 0 (which already had Tithe + Diviner from turn 2) |
| 184 | `Ranked server protection`: `Remote 0: 1.28`, `HQ: 3.78` (dropped exactly 1.0 from the card just spent on the ICE — see §3.2), `R&D: 4.28`, `archives: 3` | Remote 0 still reads as the weaker (more urgent) server by a wide margin |
| 190 | `HQ Danger Evaluation - ICE: 1, Agendas: 1, Non-Agendas: 3` | Confirms HQ's hand at this point: 4 cards, 1 of them an agenda |
| 198-199 | `Corp spent one click` / `Corp installed a card in root of a remote server` | Spin Doctor (asset) installed into Remote 0's now triple-ICE'd root |
| 212-230 | Runner turn: `Run initiated attacking HQ`. Tithe rezzed, fires 1 net damage (Carnivore trashed) and gains the Corp 1 credit — no ETR. **`Longevity Serum accessed` / `Longevity Serum stolen`** | HQ, still defended by the same single Tithe from turn 1, falls on the very next opportunity |

The Corp spent its last click and its last spare credits of turn 3 thickening the ICE on, and then filling the root of, a server holding nothing of value — while the server actually holding an agenda, and already flagged `secure:false`, received no further investment and was run successfully one turn later.

### 2.2 Why this isn't the already-fixed "protects Archives/Remote 0 over a robbed HQ" bug

Both `pointless-archives-ice-install.md` (Problems A/B/C, all fixed) and `ice-install-remote-over-hq-stale-allocation.md` (stale per-turn allocation list from a rewind, fixed) describe the Corp reinforcing the wrong server because of bookkeeping bugs in *which servers count as already handled this turn*, not because of the underlying protection-score arithmetic. Two things distinguish this log:

1. **The allocation-list mechanism isn't what drives the outcome here.** Even under Problem A's *un*fixed, never-cleared-list behavior, HQ, R&D, and Remote 0 would all have been "allocated" by turns 1-2, which — per `_serverToProtect()`'s own fallback (§3.1 below) — pushes the choice to `eligibleRanked[0]`: the single lowest-scoring server across the *entire* ranked list, allocation status notwithstanding. That fallback still picks Remote 0, because Remote 0's raw `_protectionScore()` (1.28) is lower than HQ's (3.78) on its own merits. Fixing the allocation list (as `main` now does) changes *which branch* of `_serverToProtect()` is taken, but not the comparison that decides the winner within either branch — both branches ultimately sort by the same `_protectionScore()`, and that score is what this document's fix targets.
2. **Problem C (the "too poor for new layers" gate, fixed) governs a different moment.** In this log, `I am feeling poor` / `No obvious install options` start appearing *after* line 188 — once credits ran low. The turn 3 misallocation at line 183 happened while the Corp still had spare credits and was willing to install; Problem C explains why no *further* HQ reinforcement happened later that turn, not why Remote 0 was chosen over HQ in the first place.

A fixture built against current `main` (§5) is the way to confirm this conclusively rather than by inference; this document's analysis (§3) does not depend on the allocation-list state.

---

## 3. Root cause

### 3.1 `_serverToProtect()` always compares by raw `_protectionScore()`

**Where:** `_serverToProtect()` (~3009), `_rankedServersToProtect()` (~2897).

`_rankedServersToProtect()` builds one entry per server, each carrying `score = this._protectionScore(server, {}, security) + scoreAdjustment` (only remotes get a nonzero `scoreAdjustment`, and only when `_isAScoringServer()` says so — not relevant to this log, see §2.2 item 1). Entries are sorted ascending by `adjustedScore` (line 2956-2961: `a.adjustedScore - b.adjustedScore`), and `_serverToProtect()` (§3009-3053) takes the first unallocated-and-insecure entry, or the overall lowest-scoring entry if every insecure server is already allocated. Either way, the server with the numerically lowest `_protectionScore()` wins the next ICE install. Nothing in this path treats "a server with an agenda in it" specially relative to "a server with nothing in it" beyond what's baked into the score itself.

### 3.2 HQ's score includes a hand-size term no other server gets

**Where:** `_protectionScore()`, ~2833-2859 (quoted in full in §1).

The `else` branch — taken whenever HQ's own ICE isn't rated weaker than R&D's — adds `corp.HQ.cards.length - this._agendaPointsInServer(corp.HQ) - 2.5` to HQ's score. `corp.HQ.cards.length` is the Corp's whole hand size (unrezzed hand cards live in the `HQ` zone). This is a plausible idea taken alone: a bigger hand dilutes the odds that any one random HQ access hits a specific agenda. But:

- **It is unconditional.** It applies whether or not HQ's ICE can end the run, whether or not the Runner has the credits/clicks to keep running, and whether or not this is the Runner's first or fifth run this game.
- **Remote servers get no equivalent term.** A remote's score is `_iceAndRootProtection()` plus a handful of small adjustments (§3.3), with nothing analogous to "how many decoys does this root have sitting next to the real target" — largely moot, since remotes typically hold one card, but it does mean the two zones' scores aren't measuring comparable things when they're sorted into the same list.
- **The arithmetic in this log confirms the mechanism cleanly.** Between the two `Ranked server protection` snapshots either side of the ICE-install decision (lines 170 and 184), HQ's score dropped by exactly **1.0** (4.78 → 3.78) — precisely the size of the hand-size term's coefficient — with no other change to HQ (no ICE added, no card scored, no security flip). The one thing that changed was the Corp's hand shrinking by exactly one card, to pay for the ICE it put on Remote 0 instead.

### 3.3 The dilution bonus assumes a game HQ's actual ICE doesn't provide

Dilution against random access matters when the Runner is drawing one random card per successful run and has to make repeated runs to find the agenda by chance. That model implicitly assumes each run costs the Runner something nontrivial, or that ICE eventually stops them. Tithe, HQ's only ICE for the entire log, does neither (see `agenda-scored-behind-ice-with-no-etr.md`): it never ends the run, and its cost to the Runner (1 credit, absorbed as net damage that isn't even flatline-risk at a healthy hand size) is negligible. Against ICE that can't stop or meaningfully tax a run, the Runner can simply keep running until they hit the agenda — the dilution bonus buys, at best, a couple of extra turns of bad luck, not real safety, and definitely not more safety than an actual second layer of ICE would.

---

## 4. Proposed fix

### 4.1 Gate the dilution bonus on whether HQ's ICE can end the run

Reuse the `_iceHasETR()` helper already identified as dead code in `agenda-scored-behind-ice-with-no-etr.md` (~line 1617, still unused anywhere in the file as of this writing):

```js
} else {
  var hqHasRealLockoutPotential = server.ice.some((ice) =>
    this._iceHasETR(ice),
  );
  var dilution = hqHasRealLockoutPotential
    ? corp.HQ.cards.length - this._agendaPointsInServer(corp.HQ) - 2.5
    : Math.min(
        0,
        corp.HQ.cards.length - this._agendaPointsInServer(corp.HQ) - 2.5,
      );
  ret += dilution;
}
```

The `Math.min(0, ...)` keeps the term from ever *penalizing* HQ relative to today's behavior when it has no ETR-capable ICE (a large hand is never worse than a small one) while removing its ability to make an un-ETR'd HQ look safer than it is. This is a minimal, targeted change; a maintainer may prefer to drop the bonus to 0 outright rather than keep the `Math.min` clamp — see §4.2.

### 4.2 Decision for the maintainer: clamp vs. zero

The `Math.min(0, ...)` clamp above still allows a *negative* dilution term (a small, agenda-heavy hand making HQ look worse) to apply even without ETR ICE, which seems directionally correct (a nearly-all-agenda hand behind toothless ICE genuinely is worse than a padded one) but hasn't been checked against other decisions that read `_protectionScore()`. Flattening the whole term to 0 when there's no ETR ICE is simpler and safer if that interaction is a concern; this document doesn't have a strong reason to prefer one over the other and defers to the maintainer.

### 4.3 This composes with the sibling ETR-scoring fix

`agenda-scored-behind-ice-with-no-etr.md` §4.2 proposes making `_cardProtectionValue()` ETR-aware for the *ice-itself* scoring term (`_iceAndRootProtection()`). This document's fix is for the separate, HQ-only dilution term layered on top. Both read from the same underlying `_iceHasETR()` helper and can land together or independently; landing 4.1 here without the sibling fix still helps, because it stops the dilution bonus from *compounding* an already-generous ETR-blind ICE score, but the full picture needs both.

---

## 5. Tests

Follow `tests/fixtures/README.md`. Reconstruct the pre-decision board from the log around lines 170-183 (per the README's guidance for logs without `DecisionSnapshots`):

- `// PHASE: Phase_Main`
- `// OPTIONS:` confirm against a run at that point.
- HQ with one unrezzed Tithe, and hand contents matching line 190's `ICE: 1, Agendas: 1, Non-Agendas: 3` reading (plus one more card, since that reading is taken *after* the ICE install consumed one).
- Remote 0 with Tithe and Diviner already installed (unrezzed), empty root.
- `// SETUP:` credits/clicks matching the log (Corp ~5-6 credits, 2 clicks left at the decision).

Fixture to add under `tests/fixtures/corp-decisions/`:

| Fixture | Setup | Expected |
|---|---|---|
| `corp-protects-hq-not-toothless-remote` | HQ: 1 agenda + non-agenda cards behind a no-ETR Tithe; Remote 0: two no-ETR ICE (Tithe, Diviner), empty root, no agenda in hand for it | `// EXPECT: install` with `EXPECT_SERVER: HQ` (reproduces this log's board; fails before the fix, passes after) |
| `corp-still-pads-hq-hand-with-real-etr-ice` | Same shape, but HQ's ICE includes something that genuinely ends the run (e.g. Flyswatter) | Either server may be chosen by score, but confirm the dilution term is still applied (i.e. this fixture should *not* regress to always picking HQ regardless of its actual ICE) |

**Important, per §2.2:** run these against current `main`, not a pre-fix checkout, since the whole point of this document is that the misallocation survives the Problems A/B/C fixes. If `corp-protects-hq-not-toothless-remote` unexpectedly already passes on `main` before this change, that means some other, undocumented fix already covers this path — stop and re-diagnose rather than assuming this document's analysis is wrong.

Also run: `node tests/corp-server-security.test.js`, `node tests/decision-snapshots.test.js`, `node -c ai_corp.js`, then `node tests/run-all-tests.js`.

---

## 6. Watch-outs

- **`_agendaPointsInServer()` vs `_agendasInServer()`.** The dilution term uses agenda *points* (~line 2292 area); the sibling `HQ WEAKER THAN R&D` branch a few lines above it uses agenda *count* (`_agendasInServer()`, ~1115). Keep this distinction in mind when writing fixtures — a single 2-point agenda affects the two branches differently.
- **This term also feeds `_serverStructuralRisk()` / `_estimateRunnerBypassRisk()` deductions elsewhere in the same function** (lines 2795, 2798) — verify the fix doesn't interact oddly with those when HQ has multiple ICE, only some of which end the run. `_iceHasETR()` as written checks a single card; `server.ice.some(...)` in §4.1 is the natural extension to "does *any* installed ICE on this server end the run", but a maintainer may want "the *outermost* ICE" or "the ICE that would actually be encountered first" instead, depending on how much precision is worth the complexity here.
- **Log spam.** As with the sibling documents, `HQ WEAKER THAN R&D` and `appears secure` lines repeat heavily once the game reaches the flatline-lockout state later in this same log (see `documentation/bugs/done/bugs2.md` item 4 and `leo-secure-ice-and-duplicate-security-logging.md`). Not relevant to this specific fix, but makes the raw log slow to read past the turn analyzed here.

---

## 7. Related observations (not part of this fix)

1. **This log was pre-flagged twice, by filename only, and both flags turned out to be off-target.** `hq-draw-gate-ignores-server-security.md` §7.4 guessed it shared the `_evaluateServerSecurity()`-bypass pattern (it doesn't — `_evaluateServerSecurity()` correctly reported `secure:false` for HQ throughout; the bug is in the *comparison* score, not the security check). `hq-ice-install-blocked-by-economy-reserve.md` §7.3 guessed it was another instance of Problem C (the poverty gate); Problem C is present later in the same turn (§2.2) but isn't what caused the specific misallocation the title describes. Worth remembering when triaging the remaining unread logs referenced in either document's §7 — filename-based guesses in this codebase's history have a mixed hit rate, and this document's own analysis in §2.2 is the kind of check worth doing before assuming a new log is a known duplicate.
2. **The later "empty-hand flatline lockout" section of this same log** (from roughly line 235 onward, after Carnivore was trashed leaving the Runner briefly at 0 cards) is a separate, interesting phenomenon: `_evaluateServerSecurity()`'s `hasHardLockout` flag doesn't distinguish a permanent "no breaker exists" lockout from a transient "the Runner currently has too few cards for this damage to be non-lethal" one (§3 of this document doesn't rely on it, but it dominates the second half of the log's line count and would be worth its own look — the Corp appears to treat the transient state as licence to keep expanding remotes, per the repeated `Corp created a new remote server` / `Corp installed a card in root of a remote server` pattern at lines 356-673, rather than using the brief window to add a durable second layer to HQ before the Runner's hand refills).

---

## 8. Acceptance criteria

- [ ] `_protectionScore()`'s HQ-specific `else` branch no longer grants the full hand-size dilution bonus when none of HQ's installed ICE can end the run (`_iceHasETR()` returns false for all of `server.ice`).
- [ ] `corp-protects-hq-not-toothless-remote` fails before the change and passes after, run against current `main`.
- [ ] `corp-still-pads-hq-hand-with-real-etr-ice` confirms the dilution bonus still applies normally when HQ has genuine ETR-capable ICE.
- [ ] `node -c ai_corp.js` passes and `node tests/run-all-tests.js` still passes.
- [ ] The maintainer has picked between the clamp and zero-out options in §4.2, and the choice is reflected in both the code and this document's implementation record.
- [ ] No other Corp AI decision logic is changed.
