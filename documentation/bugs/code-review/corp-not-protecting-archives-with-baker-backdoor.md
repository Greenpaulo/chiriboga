# Corp AI did not protect Archives with the Baker backdoor active

**Outcome:** adopted — `projectedRedirectThreats` defaults to on after its expanded seeded gate passed; the objective next-turn reset correction is always on.

## Resolution

Implemented from `974ba40` (2026-10-09).

The objective correction now supplies the generic redirect query with an
explicit next-Runner-turn context during Corp planning outside a run. Baker
projects its known use reset without changing live flags. Current-turn queries
and actual redirect enumeration/payment remain exact.

**Gate:** passed — `projectedRedirectThreats` now defaults to on. Expanded F4 evidence recorded below.
The candidate lets Baker consult the new read-only `AIPotentialHostedCredits`
source hook for compatible installed sources. Touchstone reports its possible
first-event refill; the Corp never inspects the hidden Grip or Stack. This
conditional credit affects the existing protection ranking/stakes only, not
deterministic security or real payment availability. The working L3.5.2
viable-target fallback is unchanged.

**Gate command:** `node scripts/ai-batch.js gate --pool tests/fixtures/ai-batch/deck-pool-baker-expanded.json --corp-option projectedRedirectThreats=true --collector redirectExposure --improve redirectExposure.unprotectedSuccessful --guard winRate=0.02 --guard pointsStolen=0.2 --seeds 1001-1400 --jobs 8`

Original v1 gate setup check (`--quick`):
`50 paired games, 29 changed by the options [quick: indicative only, cannot pass a gate]`.
No game failed. Exposure was 0.560 -> 0.100 per game. This confirms the deck
pool reaches the behavior, not that the option is ready for adoption.

The owner rejected the earlier 40-game human requirement on 2026-10-09 and
requested the existing batch runner with 1,000 games using Baker/Touchstone.
That replaces the human gate; no human sample is required. The old annotation
script and its tests were removed. The original choice of a human gate was
unjustified: a dedicated, tested pool can load the narrowly relevant Vantage
Point cards without changing the standard trusted pool or enabling the set.

### Initial full gate and owner-authorized expanded comparison (2026-10-09)

The owner supplied the original command's output: v1 pool, `leo-baker`,
paired seeds 1–1000, 1,000 games per arm, zero failed games, 547 changed pairs.
Baseline and candidate took 143 seconds each. Reports named by the output:
`.ai-batch-cache/baseline-7b8d84d82ef64a51.json` and
`.ai-batch-cache/candidate-341b89291cf96f52.json`.

| Metric | Baseline | Candidate | Candidate − baseline | Bootstrap 95% interval | Result |
|---|---:|---:|---:|---|---|
| Naked Archives successful redirects/game | 0.571 | 0.162 | −0.409 | [−0.466, −0.354] | Improve passed: oriented improvement CI [0.354, 0.466] > 0 |
| Corp win rate | 0.350 | 0.349 | −0.001 | [−0.025, 0.024] | Guard failed: lower bound beyond −0.02 |
| Points stolen/game | 5.983 | 5.982 | −0.001 | [−0.121, 0.120] | Guard passed: upper bound below 0.2 |

**Initial gate result:** failed. This is not proof of a harmful policy: the
observed win difference is −0.1 percentage point, with uncertainty extending
beyond the guard. It is also not a passing gate. The owner explicitly asked
that the candidate not be discarded for this inconclusive win-rate result,
and requested more seeds and a broader pool. That overrides the skill's
automatic candidate-removal step; the option remains off while further
comparative evidence is gathered. No acceptance threshold has been relaxed.

The expanded pool crosses three distinct Corp opponents (LEO glacier, NEH fast
advance, PE damage) with two Runner decks: event-heavy Vic (18 events,
3 Baker/Touchstone copies) and economy-oriented Zahya (15 events,
2 Baker/Touchstone copies). Both decks have 45 cards and legal influence
(10 and 14 respectively). Its full sample is fixed before running: fresh
seeds 1001–1400 for every pair, 2,400 paired comparisons / 4,800 individual
games. These seeds do not overlap the original full gate's 1–1000 sample.
Before the full expanded run, the owner reduced the proposed 2,000 seeds per
matchup to 400 to keep the runtime proportionate (2026-10-09). The six
matchups and all acceptance thresholds are unchanged. This sample may still
leave a guard inconclusive; adoption requires a passing gate.
Both versions of the pool remain available so the first result is reproducible.
Expanded setup check (`--quick`): 300 paired games, 126 changed pairs,
zero failed games in either arm. Baseline took 60 seconds and candidate 54.
Successful unprotected redirects fell from 0.303 to 0.083 per game
(difference −0.220; 95% interval [−0.290, −0.157]). Win rate was 0.497 → 0.490
(difference −0.007; interval [−0.040, 0.027]); its guard remains inconclusive.
Points stolen were 5.133 → 5.143 (difference 0.010; interval [−0.150, 0.173]).
The output reports `Gate: indicative only`; this validates the setup, not
adoption.

### Owner-supplied full expanded result (2026-10-09)

The exact expanded command above completed with `Gate: passed`: 2,400 paired
comparisons, 968 changed pairs, zero failures in either arm. Baseline took
411 seconds and candidate 410 seconds. Printed report paths:
`.ai-batch-cache/baseline-85d95362d9f20443.json` and
`.ai-batch-cache/candidate-edaa1e9426c509ce.json`.

| Metric | Baseline | Candidate | Candidate − baseline | Bootstrap 95% interval | Result |
|---|---:|---:|---:|---|---|
| Naked Archives successful redirects/game | 0.304 | 0.101 | −0.202 | [−0.227, −0.178] | Improve passed: oriented improvement CI [0.178, 0.227] > 0 |
| Corp win rate | 0.462 | 0.472 | +0.010 | [−0.003, +0.023] | Guard passed: lower bound above −0.02 |
| Points stolen/game | 5.417 | 5.344 | −0.072 | [−0.132, −0.013] | Guard passed: upper bound below 0.2 |

Values and differences are recorded as printed; rounded means need not subtract
to the printed paired difference. All four checks passed, including changed
option effect. Adopted on 2026-10-09 (see Adoption below); independent review is pending.

**Interpretation limits:** This is a pass for the equally weighted six-matchup
pool, not proof that the original LEO/Vic matchup passes individually. The
harness pools paired game differences across matchups; its aggregate guard can
mask a matchup-specific regression. The original failed guard remains recorded.
The candidate and numeric thresholds were retained, and the full sample was
specified before this run. However, the expansion followed an initial failed
gate and an indicative quick result was already available: this is follow-up
evidence, not an untouched first confirmatory experiment. Repeatedly changing
samples or pools until a pass would undermine the nominal 95% interpretation.
No additional gate run or threshold change has been authorized here.

### Adoption and review responses (2026-10-09)

Answers to the 2026-10-09 code review, by finding number:

1. **Adopted.** `CorpAI.DEFAULT_OPTIONS.projectedRedirectThreats` is now `true`
   (`ai_corp.js`). The projection test's first case now asserts the default
   and covers the option-off path explicitly. The decision fixture keeps its
   explicit `SETUP` override, which now matches the default. The later debug
   log moved to `documentation/debug-logs/bug_raised/`, as the owner asked.
   `node tests/run-all-tests.js` passed all 77 test files with the default on,
   including `tests/corp-decision-fixtures.test.js` and
   `tests/decision-snapshots.test.js`. No decision snapshot changed: the
   recorded snapshots contain no Baker board, and the option affects only
   Baker's redirect query.
2. **Status records updated.** `architecture.md` describes the adopted option.
   The L3.5.2 roadmap goal no longer says the gate is pending. The Outcome,
   Gate and Status lines agree, and the last criterion is ticked. The
   architecture link points to `code-review/` again after this hand-off.
3. **Evidence strength (no change).** The per-matchup breakdown in the code
   review stands. The gate is pooled by design, and no matchup shows a
   significant regression.
4. **Reproduction hash (no change).** The reviewer confirmed the promoted
   reproduction fails both cases at `974ba40`.
5. **Touchstone projection (no change).** The flat one-credit projection
   is what the gate measured; calibrating it against public Grip/Stack size
   would be a separate gated idea.

**Open check (not an acceptance criterion):** The gate compares the option off
and on at the same code, so the always-on next-turn reset correction is in
both arms and its whole-game effect against `974ba40` is unmeasured. It is an
objective rules correction, accepted ungated under the approved plan, and only
changes a decision when Baker was used and a hosted Stealth credit remains
during the Corp turn. The owner plans to run a paired `974ba40`-versus-current
comparison (option off, Baker pool, core metrics only; the old harness lacks
redirect destinations) during code review. A regression there would be
recorded here and raised as a new ticket.

### Remediation responses (2026-10-09)

1. **L3.5.2:** The original fixture still passes unchanged. This remediation
   makes no change to the eligible-server fallback; it fixes separate turn
   projection and proposes conditional credit-source forecasting.
2. **Stale Baker flag:** The retained-credit reproduction passes with the
   option off. Additional cases cover current-turn use, an active run during
   the Corp turn, and preservation of both public once-per-turn flags.
3. **Empty Touchstone:** The candidate reproduction passes with the option on.
   The reconstructed first post-Baker decision was replayed directly through
   `playGame()` and `Phase_Main` in separate headless processes. Off:
   `install Bumi 1.0 -> NEW`, redirect false. On:
   `install Bumi 1.0 -> Archives`, redirect true. In both, Touchstone remains at
   0 credits and Baker remains used; Archives security and the effective credit
   pool are identical (base 1 + 3 click credits = 4). This is a reconstruction,
   with the unnamed drawn ICE and opening ICE destinations assumed explicitly
   in the fixture; there were no snapshots to support an exact replay.
4. **Scope and safety:** Added 12 projection cases, including generic providers,
   absent/disabled sources, hidden-card access guards, actual unfunded payment,
   and state restoration on throwing probes. Audited all three redirect
   providers: Baker changed; Sneakdoor Beta and Maintenance Access need no
   change because neither has a use-reset or conditional funding restriction.
   No installed Stealth funding provider exists in the playable Gateway,
   Update 2021 or Elevation sets. This ticket explicitly covers Baker and
   Touchstone in Vantage Point; Methuselah's separate hardware-trash projection
   is outside its scope and has not been enabled through this hook.

The original reproduction moved, byte-for-byte unchanged, from
`tests/pending/baker-next-turn-backdoor-threat.test.js` to
`tests/baker-next-turn-backdoor-threat.test.js`. Its two assertions are unchanged.
Passing command: `node tests/baker-next-turn-backdoor-threat.test.js`.
The reconstructed install variation is
`tests/fixtures/corp-decisions/corp-protects-empty-touchstone-baker.txt`; its
off/on direct-engine probe is covered by `tests/baker-redirect-projection.test.js`.
The fixture harness needed the existing engine's install-destination check to
replay the logged Mahkota upgrade; no expectation was weakened.

Documentation updated: [redirect planning](../../corp-ai/architecture.md#type-shifts-bypasses-and-redirects)
and the redirect/source-hook contracts in `documentation/ai.md`. A small
workflow extension accepts a recorded original-byte SHA-256 when a newly
created reproduction has no pending Git history; integration tests reject a
changed assertion or any other changed byte. This avoids a skipped comparison
for this new, uncommitted reproduction and does not replace available Git
history comparisons. The later debug log remains in its current location until
the gate passes, respecting the request to archive it once the reported bug is
actually fixed in default play.

Full regression result: `node tests/run-all-tests.js` passed all 77 test files,
including `tests/corp-decision-fixtures.test.js` and
`tests/decision-snapshots.test.js`. Focused reproduction, projection, batch-gate
setup, hook-documentation and ticket-check integration tests pass.

## Implementation plan

Proposed at `974ba40`, 2026-10-09. **Approved 2026-10-09.**

- **Validation:** The L3.5.2 eligibility fallback exists and its original decision fixture passes; this remediation does not establish a regression in that fallback. The new pending reproduction isolates two omissions: Baker's previous Runner-turn `usedThisTurn` flag suppresses next-turn planning even with a retained credit, and an empty Touchstone suppresses potential redirect pressure even with that flag cleared. The later log shows Baker used at lines 120–134 and 169–180, with Corp planning at lines 135 and 181. Its final dump has no decision snapshots and follows later play/rewinds, so it is not an exact reconstruction of those earlier decisions.
- **Classification:** Projecting the known Runner-turn reset with an already usable credit is an objective turn-boundary correction. Forecasting a Touchstone refill is a strategic preference: an event in the hidden Grip is not guaranteed, and installing on Archives rather than a remote is not a uniquely correct legal choice. The failing refill assertion is a candidate scenario, not an ungated strategic oracle.
- **Approach:** Extend the generic redirect hook with an explicit optional next-Runner-turn planning context supplied by the Corp during its turn. Baker can then disregard the previous turn's use flag without changing live state or its actual ability enumeration. Keep current-turn queries exact. Separately, behind Corp option `projectedRedirectThreats` (default off), model potential public installed-credit replenishment through a narrow documented source hook and a redirect query context that explicitly permits potential funding. Touchstone reports event-dependent potential funding; Baker consumes it without inspecting hidden cards. Potential funding must remain separate from actual payment and deterministic run-credit affordability. Reuse the existing protection ranking and eligibility fallback; add no new protection coefficients or title checks. Audit all redirect providers and consumers before changing the hook contract.
- **Tests:** Keep the existing Baker fallback fixture unchanged. Split/promote the retained-credit and candidate-refill cases from the pending reproduction as appropriate; add current-turn used/unfunded cases, both public turn-reset flags, absent/disabled sources, no hidden Grip/Stack reads, option-off compatibility, state restoration including throwing probes, and an install-decision variation. Before claiming the reported install is fixed, reconstruct the earlier logged public board with assumptions named and compare the direct decision with the candidate off/on. Stop and revise if recognition changes but the install does not. The original log cannot supply an exact decision replay, and the committed F4 pool excludes Vantage Point; do not silently trust a new set or substitute a synthetic pool result for evidence on Baker.
- **Risk:** Redirect detection feeds Archives ranking, stakes, security and debt. The optional projection context must not weaken real payment checks or expose potential credits as spendable credits. The candidate may overprotect Archives when no event is played; the seeded gate measures this tradeoff. Run focused tests followed by `node tests/run-all-tests.js`.
- **Docs:** Update the hook contract and source hook in `documentation/ai.md`, turn projection in Corp architecture, and dated numbered remediation responses in this ticket. Keep L3.5.2's goal limited to the implemented fallback; its workflow status does not certify review. Archive the later debug log only after the reported behavior is addressed. Run the owner-requested seeded gate and adopt only if it passes; no human-game requirement remains.

**Source log:** `documentation/debug-logs/bug_raised/corp_not_protecting_archives_when_i_have_baker_to_redirect_to_hq.txt`
**Additional source log:** `documentation/debug-logs/bug_raised/corp_still_not_protecting_archives_from_baker.txt`
**Verified against code:** 974ba40 (2026-10-09)
**Reproduction:** `tests/pending/baker-next-turn-backdoor-threat.test.js` — `node tests/pending/baker-next-turn-backdoor-threat.test.js` (both isolated cases fail at `974ba40`, 2026-10-09). This is a public-mechanic reconstruction, not an exact install-decision replay.
**Reproduction SHA-256:** `0f5b3080665be820935b95820817869955683f2502e16a5c3b1febe094a8a8ab`
**Status:** Code review. Known next-turn use-reset correction implemented; potential Touchstone refill prediction passed the expanded seeded gate and is adopted (default on).
**Roadmap:** Originally delivered Corp AI item L3.5.2, described in [Protection allocation](../../corp-ai/architecture.md#protection-allocation). Its action-feasible fallback is implemented and passes its fixture; the remaining remediation concerns next-turn redirect threat modelling, described in [Type shifts, bypasses and redirects](../../corp-ai/architecture.md#type-shifts-bypasses-and-redirects).

## Acceptance gate

F4 gate. Option `projectedRedirectThreats` (Corp AI), off in the baseline
and on in the candidate. Expanded versioned pool
`tests/fixtures/ai-batch/deck-pool-baker-expanded.json`, paired fresh seeds
1001–1400 (400 games per deck pair per arm), bootstrap 95% intervals.
Six equally weighted pairings cross LEO, NEH and PE with the Vic and Zahya
Baker/Touchstone decks described in Resolution. This is 2,400 paired
comparisons / 4,800 individual games. The larger, more varied sample was
requested by the owner following the original inconclusive win-rate guard.
Vantage Point use remains limited to Vic, Baker and Touchstone; the normal
regression pool and set playability are unchanged.
Collectors: `redirectExposure` (adds the metrics defined below).
Starts: none; ordinary openings exercise the route. An expanded `--quick`
check must finish with zero failed games and at least one changed pair before
the full run. Guards and improvement threshold are unchanged from v1.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `redirectExposure.unprotectedSuccessful` | lower | bootstrap 95% interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |

Gate command: `node scripts/ai-batch.js gate --pool tests/fixtures/ai-batch/deck-pool-baker-expanded.json --corp-option projectedRedirectThreats=true --collector redirectExposure --improve redirectExposure.unprotectedSuccessful --guard winRate=0.02 --guard pointsStolen=0.2 --seeds 1001-1400 --jobs 8`

`redirectExposure.unprotectedSuccessful` counts actual successful runs that
start on Archives with zero ICE and change the attacked server to HQ or R&D,
per complete game. `redirectExposure.total` counts all observed redirects on
that route; `redirectExposure.successful` counts successful ones through any
number of source ICE. The collector observes generic public run events,
including destination and source ICE count; it never forces the Runner to
play an event or use Baker, and never changes either AI's policy. In this pool
Baker is the only server-redirect provider. The setup check and recorded
replays must show event-funded Baker runs, so a batch cannot pass on unused
cards alone. Deterministic tests separately enforce the information boundary,
real-payment separation and read-only projection invariants.

This gate measures these six deck matchups and the current Runner AI, not every
human strategy. The logged-board decision reproduction remains the direct check that
the reported remediation case changes; the paired gate tests exposure and
whole-game tradeoffs. More games reduce sampling uncertainty, not coverage
limitations. Thresholds above are fixed before the full gate runs.

## Acceptance criteria

- [x] Next-Runner-turn planning recognises Baker's known use reset when an already usable stealth credit is retained; same-turn used Baker remains unavailable.
- [x] Candidate potential-refill planning uses only installed/public source mechanics and leaves real redirect enumeration/payment and deterministic affordability unchanged.
- [x] Baseline option-off behavior is unchanged except for the independently tested known-turn-reset correction; the original L3.5.2 fallback fixture remains unchanged and passes.
- [x] A reconstructed logged planning decision changes in the requested direction with the candidate on, with reconstruction assumptions and off/on results recorded.
- [x] Pending reproduction passes with its assertions unchanged and is promoted to the green suite; focused tests and the full regression suite pass.
- [x] The AI option is off by default until the acceptance gate passes.
- [x] The expanded gate setup is ready: replace `--seeds 1001-1400` with `--quick`; at least one paired game changes and no game fails. Result: 300 pairs, 126 changed, zero game failures; indicative only.
- [x] The `redirectExposure` collector and dedicated Baker/Touchstone pool are built and tested, including legal deck size/influence and exclusion from the normal pool.
- [x] The acceptance gate has passed on the stated paired seeds and metrics before the AI option is switched on.

## Re-grounding and remediation findings (2026-10-09)

1. **[Verified] L3.5.2 is implemented:** `_serverToProtect()` filters action-ineligible targets and returns `undefined` when no eligible target remains. `node tests/corp-server-security.test.js` passes 143 cases; the original `corp-protects-baker-backdoor-after-rnd-layer-blocked.txt` fixture passes. The later log alone does not contradict those results.
2. **[Verified] A stale use flag independently hides the route:** Baker resets `usedThisTurn` only in `responseOnRunnerTurnBegins`. Corp queries `AIRedirectsRun` with no future-turn context. The first pending case returns false even with one retained Touchstone credit; the retained credit is an explicit counterfactual, not a claim about the log.
3. **[Verified] Refill is a separate missing forecast:** With `usedThisTurn` cleared and Touchstone empty, the second pending case returns false. Touchstone's `automaticOnPlay` can create a credit after an event, as the log shows for Lie Low at lines 165–167. Whether a future event will be played is unknown to the Corp; it must be gated as strategic pressure, not asserted as guaranteed funding.
4. **[Corrected scope]** The previous remediation hypothesis identified empty Touchstone but omitted the stale use flag. Both mechanisms must be tested separately. No change to the viable-target fallback is supported by this evidence.

Before implementation: `node tests/run-all-tests.js` passed all 74 test files, including
`tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
At that point the new reproduction was intentionally pending with two failing
cases, and no production behavior had been changed. See Resolution for the
subsequent approved implementation and verification.

## Original outcome

The original report correctly identified that Archives protection was ineffective, but its proposed primary cause was not sufficient and several supporting claims were wrong. The implemented changes fix and test the captured planning state; they do not yet predict that the Runner can refill an empty Touchstone before the next run. A later play-test reproduced that remaining limitation, so this ticket is back in remediation.

The original fix has three parts:

1. Baker's public `AIRedirectsRun` model now checks hosted stealth credits in the prospective Archives-run context. This allows Corp-turn planning to recognize a credit on Touchstone even though Touchstone can spend credits only during a run.
2. ICE-install planning can skip a higher-ranked server whose next layer is disallowed by the economy/layer policy and try the next ranked viable target instead of abandoning ICE installation entirely.
3. `_serverHasStakes()` now treats visible agendas in Archives, an active Archives backdoor, and current public/recent run pressure as real Archives stakes. It deliberately does not inspect hidden R&D contents.

No title-specific Baker check was added. The Corp still consumes the generic `AIRedirectsRun` hook.

## Corrected diagnosis

### Baker was not detected with Touchstone outside a run

The earlier report said `_archivesIsBackdoorToHQ()` correctly detected Baker. It did not in the logged board state.

Baker's `AIRedirectsRun` called `_stealthCreditCards()`. That helper called each source's `canUseCredits()`. Touchstone returns true only while `attackedServer !== null`, which is correct during real payment but false during Corp-turn planning. Consequently, Baker reported no redirect while the AI was deciding where to install ICE.

The log supports this correction. Immediately after Baker was installed, Archives retained the ordinary score of `3` (line 84), rather than receiving the HQ/backdoor formula. Later scores of `2` are explained by the bounded recent-run pressure nudge and are not proof that Baker was recognized.

The fix lets Baker's helper temporarily supply the proposed source server while making this read-only planning query and restores the real `attackedServer` in a `finally` block. Real redirect enumeration and payment still use the actual active run state.

### The reserve gate could not veto Archives' first ICE

The proposed `_serverHasStakes()` diagnosis did not explain a completely naked Archives. `_shouldInstallIceLayer()` starts with:

```js
var shouldInstall = this._unrezzedIce(server).length == 0;
```

For Archives with no ICE, that is true. The low-economy branch only turns it off when the server already has rezzed ICE. Therefore changing `_serverHasStakes()` alone could not make the first Archives layer possible; it was already permitted.

The real downstream planning defect was that `_rankedInstallOptions()` asked for one server before applying the layer policy. In the later log states, accumulated debt often ranked R&D first. R&D already had unrezzed ICE, so the low-economy policy rejected another layer, and planning returned no ICE options without considering Archives next.

`_serverToProtect()` now accepts an optional action-specific eligibility predicate. ICE-install planning uses it to rank only servers that can accept a layer under the current economy policy. Other callers retain the existing ranking and HQ fallback behavior. The Archives rotation guard is applied to this viable set, so an ineligible R&D target cannot suppress a valid Archives install.

### The ICE affordability claim was incorrect

The report described Diviner, Empiricist, and Mycoweb as cost 2–5 and affordable throughout the late game. Current card definitions give these rez costs:

| ICE | Rez cost | Relevant state |
|---|---:|---|
| Diviner | 3 | Already installed in Remote 0 during the early Baker turn |
| Empiricist | 7 | Not affordable at the repeated 4–6 credit decisions |
| Mycoweb | 8 | Not affordable at those decisions |

At the logged 7-credit decision, advancement was considered first and spent a credit; the following decision therefore had only 6 credits. The original log does not prove that the Corp declined an executable Archives ICE install on those exact clicks. The decision fixture is consequently documented as a variation of the 7-credit state with advancement omitted from the offered actions, isolating the protection-install decision without claiming an exact replay.

## Why R&D was not changed as proposed

The original proposal suggested making R&D a stake when an agenda is known or likely to be near the top. The current code has no validated public-state estimate for that fact, and reading `corp.RnD.cards` would let the AI use hidden card order. That change was rejected.

R&D threats already affect ranking through public central-pressure and run-history models. The new viable-target fallback prevents a blocked R&D layer from suppressing another legal protection target. A future R&D reserve exception should be based on a separately calibrated public signal and its own fixtures, not hidden deck contents.

The `.cards` test in `_serverHasStakes()` was therefore not simply inverted. Central servers have `.cards`; remote servers do not. The function now handles HQ and Archives explicitly, deliberately leaves R&D on the ordinary economy policy, and falls through to the HVT-root check only for remotes.

## Tests

Coverage added or extended:

- `tests/vantagepoint-integration.test.js` verifies Baker recognizes a real Touchstone credit outside a run and restores `attackedServer` after planning.
- `tests/corp-server-security.test.js` covers Archives stakes from agendas, backdoors, and run pressure; confirms hidden R&D contents do not bypass the reserve; and verifies that ICE planning can fall through from a blocked higher-ranked target.
- `tests/fixtures/corp-decisions/corp-protects-baker-backdoor-after-rnd-layer-blocked.txt` reconstructs the logged board, supplies its recorded R&D/Archives debt, and verifies an affordable Empiricist is installed on Archives in the isolated install decision.
- The decision-fixture harness now loads `sets/vantagepoint.js`, so the fixture uses the real Baker and Touchstone implementations.

The generic hook contract and Baker's prospective-run handling are documented in `documentation/ai.md`.

## Unchanged behavior

- Empty Archives without an agenda, backdoor, public reward, or recent pressure remains ineligible.
- Baker remains optional per run; direct Archives runs and redirected runs are both possible.
- The overall economy reserve arithmetic is unchanged.
- The Corp still avoids adding frivolous layers when poor, and affordable-install checks include existing unrezzed ICE rez costs.
- R&D contents remain hidden from AI heuristics that should use only public information.

## REMEDIATION - in game testing

Corp still isn't protect archives from Baker. I ran archives 3 times  using credits from Touchstone and accessed 6 cards, stealing 1 agenda, and still corp AI didn't ICE archives. Moving the ticket to remediation. The commit for the original fix was `42fa53e` `Addressed documentation/bugs/code-review/corp-not-protecting-archives-with-baker-backdoor.md` on branch `24Sept-fixes`

A recent debug-log captures the behaviour still existing - `documentation/debug-logs/bug_raised/corp_still_not_protecting_archives_from_baker.txt`

Once the bug is actually fixed, please move this debug-log to `documentation/debug-logs/bug_raised`

Possible issues still remaining:

- Touchstone was empty at both Corp planning points. In the log, Sure Gamble put a credit on Touchstone, and the first Baker run paid it. Lie Low put a credit on it later, and the second Baker run paid it. By each Corp turn it was empty. The fix recognises Baker only if a hosted stealth credit is sitting there during the Corp's turn. It can't see that you'll refill it next turn.

## Code review — 2026-10-09

**Verdict:** Changes required. There are no code defects. The gate passed, but adoption was not done. Two status records are stale.
**Reviewed:** working tree on `bug/remediation/corp-not-protecting-archives-with-baker-backdoor` against `974ba40`, including staged and untracked files.

### Findings
1. **Should fix (unfinished adoption, not a defect)**: `ai_corp.js`, `CorpAI.DEFAULT_OPTIONS` (line 7200). `projectedRedirectThreats` still defaults to `false` although the recorded F4 gate passed. In ai-planning.md's ticket template, the last gate-evidence criterion says "Only then is the option switched on by default". So the ticket is not done. In default play the reported empty-Touchstone behavior is unchanged. Evidence: `tests/baker-redirect-projection.test.js` "real headless install changes…": off → new remote, on → Archives. Required change, via `implement-ticket`:
   - switch the default on;
   - update the option-off assertions that become default assertions (projection test case 1, the fixture `SETUP` override, docs);
   - rerun `node tests/run-all-tests.js`, including decision snapshots, and record any snapshot deltas;
   - set `**Outcome:** adopted`;
   - tick the last criterion;
   - then move the later debug log to `bug_raised/` as the owner requested.
   If the owner's "methodology discussion" is meant to override the passed gate, record that decision and its reason in the ticket. Do not leave the outcome open.
2. **Should fix**: `documentation/corp-ai/architecture.md` ("**Pending seeded gate:**", around line 229) and `documentation/corp-ai/roadmap.md` L3.5.2 ("pending the seeded batch gate") still describe the gate as pending. Inside the ticket, `**Outcome:** blocked — … awaits resolution of the owner's gate-methodology discussion` contradicts `**Gate:** passed`. The last criterion is unticked even though its condition is met. Required change: update these records with the adoption step in finding 1. The architecture link to this ticket also needs updating (`architecture.md` line 236 still points to `code-review/`). `ticket.js move` updated the roadmap link but not that one.
3. **Note (evidence strength)**: The expanded gate passes as written. Its paired pooled result is win rate +0.010 [−0.003, +0.023], points stolen −0.072 [−0.132, −0.013] and unprotected redirects −0.202 [−0.227, −0.178]. It is still follow-up evidence after a failed v1 gate, and the Resolution's disclosure of that must stay. I broke the cached reports down per matchup without playing new games. Each matchup has n=400, and the values are paired candidate − baseline differences with 95% bootstrap intervals:

   | Matchup | Changed | winRate | pointsStolen | unprotectedSuccessful |
   |---|---:|---|---|---|
   | leo-baker (v1 matchup) | 189 | +0.010 [−0.028, +0.043] | −0.098 [−0.258, +0.072] | −0.407 [−0.500, −0.333] |
   | leo-baker-economy | 147 | +0.003 [−0.028, +0.022] | −0.040 [−0.172, +0.095] | −0.170 [−0.215, −0.122] |
   | neh-baker | 156 | −0.003 [−0.028, +0.025] | −0.015 [−0.165, +0.145] | −0.223 [−0.285, −0.177] |
   | neh-baker-economy | 129 | +0.022 [−0.010, +0.052] | −0.083 [−0.190, +0.005] | −0.140 [−0.180, −0.077] |
   | pe-baker | 198 | −0.003 [−0.020, +0.033] | −0.138 [−0.292, +0.035] | −0.203 [−0.260, −0.165] |
   | pe-baker-economy | 150 | +0.028 [0.000, +0.058] | −0.063 [−0.205, +0.075] | −0.072 [−0.117, −0.050] |

   Every matchup reduces exposure, with intervals that exclude zero. No matchup's win-rate point estimate is below −0.003, and every points-stolen point estimate is non-positive. No matchup shows a significant regression. Individually, though, most win-rate intervals still admit a regression of more than 0.02. That includes the original LEO/Vic matchup, so that matchup alone has not passed. The gate is pooled by design and needs no extra run. Redirect attempts also fell, not only unprotected ones: total 0.319 → 0.131 per game, successful 0.317 → 0.130. Steals moved slightly from HQ/R&D (2.079/1.672 → 1.975/1.612) to remotes (1.578 → 1.665). That fits the stated tradeoff.
4. **Note**: `scripts/ticket.js` adds a recorded-SHA-256 fallback. The implementer records the hash themselves, so it proves the file has not changed since the hash was recorded, not since the reproduction was first written. I checked out `974ba40` in a temporary worktree and ran the promoted file there: both cases fail (`2 failed`). That matches the recorded pre-fix claim. A pending reproduction committed to Git remains the stronger route.
5. **Note**: `Touchstone.AIPotentialHostedCredits` returns 1 whenever potential funding is requested. It ignores public facts such as an empty Grip and Stack, or a Grip size of zero with no draw. This is acceptable for a gated, uncalibrated projection. It can over-protect Archives late in a game, which the gate measured only in aggregate. In option-off planning, sources without abilities are now excluded too (`planningContext && !CheckHasAbilities(card)`). That is a correct but unlisted baseline delta, and no current card or test depends on it.

### Checks performed
- `node scripts/ticket.js check`: PASS for the reproduction hash, the reproduction and the full suite (77 files). WARN: one unticked criterion, and the gate passed while the default is false (findings 1–2). Ticket check passed.
- Reproduction validity: the promoted test fails both cases at `974ba40` in a temporary worktree (since removed).
- Turn projection: `nextRunnerTurn` is `playerTurn == corp && attackedServer === null` (`ai_corp.js:249`). Corp decisions during the Runner turn, and runs, take the exact path. Baker's `usedThisTurn` is ignored only with that context (`sets/vantagepoint.js:1319`), and live flags are never written. `AIRunAbilityExtraPotential`, `responseOnWouldApproachServer` and payment (`SpendHostedCredits`) call `_stealthCreditCards()` without a context. Potential credits therefore never reach real enumeration, payment or Runner simulation. The projection test enforces this, along with hidden Grip/Stack getters that throw and restoration after a throw.
- Consumers and providers: `_archivesIsBackdoorToHQ` callers (`ai_corp.js:569, 3308, 3603, 4212`, `systemupdate2021.js:6395`) receive a boolean, unchanged in type. Sneakdoor Beta (`systemupdate2021.js:1777`) and Maintenance Access (`elevation.js:690`) ignore the third argument, as the docs say. `AIPotentialHostedCredits` has one provider and one consumer, both documented in `ai.md` §4.20 and the hook table.
- Gate evidence: the cached reports `.ai-batch-cache/baseline-85d95362d9f20443.json` and `candidate-edaa1e9426c509ce.json` both have codeHash `b5acb1b0e6c5918c` and poolHash `45dd2a896b919eaf`. Recomputing from the current tree gives the same codeHash and candidate key `edaa1e9426c509ce`, so the evidence applies to the code under review. The options differ only in `projectedRedirectThreats`. There are 2,400 games per arm, all paired by deck pair and seed, with zero failures and `quick: false`.
- Collector: `redirectExposure` reads only harness run events. `sourceIceCount` counts all ICE on Archives at run start, rezzed or not, which matches "unprotected". `destination` is taken at the success point. It changes no policy.
- The pool and precons stay outside the standard pool. Set playability is unchanged.
