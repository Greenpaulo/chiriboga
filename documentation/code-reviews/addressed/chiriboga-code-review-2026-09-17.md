# Code Review: "Tweak ai for critical loss pressure understanding" (2 commits, 17 Sept)

**Repo:** Greenpaulo/chiriboga
**Commits reviewed:**
- `159a8d6` — Tweak ai for critical loss pressure understanding
- `7472a0c` — Tweak ai for critical loss pressure understanding-2 (parent: `159a8d6`)

**Method:** Reviewed the full diffs (via the GitHub API, not just the truncated web view), then cloned the repo and actually ran the test suite at the parent commit, at `159a8d6`, and at `7472a0c` to verify behaviour rather than just reading code.

## What these commits do

Together they add a new tactical layer to the Corp AI: a way to estimate the probability that the Runner wins on their very next central-server breach, and to let that probability override ordinary advancement/economy planning.

- **`_centralBreachLossRisk(server)`** (159a8d6) — computes an order-agnostic probability that the next HQ/R&D breach hands the Runner enough agenda points to win, using a subset-count dynamic program over the server's actual (Corp-visible) card contents rather than the engine's hidden shuffle order.
- **`_criticalBreachDefenseAction()`** (159a8d6) — when that probability crosses 35%, tries, in order: install ICE that measurably lowers the risk, purge if that measurably reduces access, then falls back to an "emergency protection recovery" (rez/install/draw to find ICE). Explicitly exempted when the Corp's own score would already win.
- **`_emergencyProtectionRecovery()` / `Action()`** (159a8d6) — a guarded fallback for "critical server, zero ICE in hand" that uses a new `AIEmergencyDraw` card hook (e.g. Spin Doctor) or a basic draw, with safeguards against starving a worse HQ problem.
- **`AICentralPressureAfterPurge(server)`** (159a8d6, wired into `sets/systemgateway.js` for Conduit) — lets a card describe its *post-purge* pressure so purge value can be judged correctly.
- **`_icePreventsGameWinningBreach()`** (7472a0c) — a follow-up fix folded into `_iceWorthRezzing()`: simulates rezzing an *approached* ICE (including the credit spend) and compares server security with/without it, so the planner will rez a card like Brân 1.0 that single-handedly prevents a lethal breach instead of reserving those credits for a different server.
- Documentation (`documentation/ai.md`, `corp_ai_improvement_roadmap.md`, `corp_ai_install_decision_roadmap.md`) and new regression tests are updated alongside the code in both commits.

`159a8d6` also happens to delete two large accidentally-committed debug log files (~2,300 lines) and adds `documentation/debug_logs` to `.gitignore`, which accounts for most of that commit's `-2,325` line count — good hygiene, unrelated to the AI logic itself.

## Verification

- Checked out the parent commit (`291fb33`) and ran `tests/corp-server-security.test.js`: **64/64 pass**.
- Checked out `159a8d6`: **71/71 pass** (7 new tests added, all green), including the two nontrivial ones — the combinatorial-probability test and the "critical defence prefers ICE that actually secures the threatened central" test.
- Checked out `7472a0c`: **73/73 pass** (2 more new tests). Ran the full `tests/*.test.js` directory; the only failure (`flipped-identity.test.js`, a missing card-art asset check) is pre-existing and unrelated to either commit.
- Cross-checked the specific design choices below against the actual implementations in the repo (not just the diff) to confirm they're consistent rather than assumed.

## Strengths

- **The probability model is genuinely correct, not just plausible-looking.** `_centralBreachLossRisk` uses the standard "count subsets of size k, iterate items high-to-low to avoid reuse" 0/1-knapsack DP to get an exact hypergeometric-style probability without needing combinatorics helpers. I traced it by hand against the new test (`accessCount=2`, 2 agenda-2 cards among 4 total, threshold reached at 4+ points → probability = C(2,2)/C(4,2) = 1/6 chance of *missing*, so 5/6 of hitting — matches the test's asserted `5/6`).
- **The two commits fit together as cause and effect.** `159a8d6` introduces the risk-based interrupt; `7472a0c`'s fix is a real bug it exposed (an ICE that alone prevents a lethal breach was being treated as "not worth rezzing yet" because the planner assumed credits saved for it would be needed elsewhere). The commit message and roadmap doc call this out explicitly, and the new tests target exactly that scenario (`game-saving Brân rez overrides reservation for another central` / `game point does not force a non-stopping ICE rez`).
- **Simulate-then-revert pattern is used correctly and consistently.** Both `_icePreventsGameWinningBreach` (rez simulation) and the install-evaluation loop in `_criticalBreachDefenseAction` mutate `corp.creditPool`/`server.ice` and restore them in a `finally` block, so a thrown exception mid-evaluation can't leave game state corrupted.
- **The "unrezzed ice still counts as security if affordable" design is used correctly.** `_evaluateServerSecurity` (unchanged, pre-existing) already treats affordable-but-unrezzed ICE as real protection, and only skips ICE the Corp can't afford to rez. The new install-simulation code relies on that same assumption without re-rezzing the card, which is correct — I confirmed this against a test that installs an explicitly unrezzed ICE and expects the risk to drop.
- **Install cost matches existing convention.** `installCost = risk.server.ice.length` mirrors an identical calculation already used elsewhere in the file (`extraCost += serverToInstallTo.ice.length`), so it's not a magic number invented for this feature.
- **Exemption logic is sound.** `_criticalBreachDefenseAction` bails out immediately if the Corp's own pending score would already hit the win threshold — this is checked and covered by a dedicated test that flips `corp.agendaPoints` between 3 and 5 against a 7-point win line.
- **Good defensive coding in `AICentralPressureAfterPurge` handling** — the new branch in `_centralServerThreat` normalizes whatever a card hook returns (number, partial object, `null`/`undefined`) into a clamped, well-shaped object before use, so a poorly-written future card hook can't produce `NaN`/negative pressure.
- **`_emergencyProtectionRecovery` has real guardrails**, not just "draw cards when scared": it requires 2+ clicks and sufficient economy, and specifically refuses to spend a turn chasing protection for server B while HQ itself is agenda-flooded and breachable (with a carve-out for when HQ *is* the emergency). That distinction is tested directly.

## Issues / things worth a second look

1. **Two independent call sites for the same fallback.** `_emergencyProtectionRecoveryAction` is invoked both from inside `_criticalBreachDefenseAction` (as its own final fallback) and separately, later in the file, from the "no obvious install options" branch. This looks intentional — the first only fires when breach probability is already ≥35%, the second is a lower-bar safety net that runs whenever the Corp is otherwise out of install ideas — but the two paths aren't documented as distinct from each other anywhere, so a future reader may assume it's accidental duplication. Worth a one-line comment at the second call site explaining why it's not redundant with the first.
2. **Magic thresholds live only in code + prose, not as named constants shared across files.** `criticalThreshold = 0.35` and `minimumImprovement = 0.15` in `ai_corp.js` are echoed as prose in `documentation/ai.md` ("At a probability of 35% or higher…"). That's fine for now, but if these get tuned later (the roadmap doc flags "seeded-game tuning of the tactical thresholds" as still pending), it's an easy way for code and docs to drift out of sync — consider a single named constant referenced from both, or at least a comment in the doc pointing at the exact line.
3. **`_centralBreachLossRisk`'s access-count estimate is still a heuristic, and the code says so** (`Math.max(1, 1 + Math.floor(threat.additionalAccess))`) — it only accounts for *installed* Runner multi-access, not one-shot/hidden effects, consistent with the file's existing stated boundary ("Hidden run events remain Layer 5's responsibility"). Not a defect, just worth knowing this is a deliberately bounded model, not a full solve — the roadmap doc already flags this as expected future work.
4. **Minor:** the `.gitignore` change adds `images/` even though `images/*` was already present on the line below — redundant (not harmful, `images/` is arguably clearer/broader, but one of the two lines is now dead weight).

### Resolution (21 Sept 2026)

1. **Addressed.** The second call site now explains that it is a deliberately lower-bar fallback, reached after normal install planning finds no useful option, while the earlier call belongs to the immediate central-loss interrupt.
2. **Addressed.** The two values are now named `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` and `CORP_AI_CRITICAL_BREACH_MINIMUM_IMPROVEMENT`. `documentation/ai.md` names those constants beside the prose description so future tuning has a clear synchronization point.
3. **Accepted boundary; no change.** Hidden and one-shot access effects remain outside this public-board estimate as designed and documented. Treating that limitation as a bug here would give the Corp AI hidden Runner information.
4. **Addressed.** Removed the redundant `images/*` entry and retained the clearer `images/` directory rule.

Verification after these changes: `node tests/run-all-tests.js` passes all 15 test files, including `corp-decision-fixtures.test.js` and `decision-snapshots.test.js`.

Nothing in either commit broke an existing test, introduced an undefined function/property reference (checked: `_rankedServersToProtect`, `_unrezzedIce`, `_agendasInHand`, `AgendaPointsToWin`, `CheckRez`, etc. all resolve to real, pre-existing definitions), or left temp state unrestored on an exception path.

## Bottom line

Solid, well-tested pair of commits. The core new capability (a real, order-agnostic win-probability estimate driving a bounded tactical override) is mathematically correct and properly gated against overriding a winning Corp score. The second commit is a legitimate, narrowly-targeted bug fix on the first, backed by tests that isolate exactly the scenario it fixes. The only findings above are documentation/maintainability nits, not correctness bugs.
