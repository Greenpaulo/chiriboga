# Code Review: `fbe132e` — Corp AI finding 9 (seeded randomness / injectable `_random`)

**Repo:** Greenpaulo/chiriboga
**Commit:** [`fbe132e`](https://github.com/Greenpaulo/chiriboga/commit/fbe132ebfe46144fe082ae5343e57bfeff51bc47)
**Ticket:** `documentation/backlog/code-review/corp_ai_finding_09_seeded_randomness.md`

> GitHub's web diff would likely have truncated this one too (11 files, 3,174 insertions), so I pulled the full patch directly rather than relying on the commit page.

## Verdict

Approve the `ai_corp.js`/test changes — they're a correct, well-tested fix for exactly what the ticket describes. Flag the commit's scope before merging further work on top of it: it bundles the randomness fix together with an unrelated, freshly-diagnosed bug ticket and several large debug-log files that have nothing to do with finding 9.

## The fix itself

**`_shuffleCopy(array)`** is a standard Fisher-Yates over a copy (`array.slice()` first), consuming `this._random()` instead of global `Math.random`:
```js
var randomIndex = Math.max(0, Math.min(currentIndex, Math.floor(roll * (currentIndex + 1))));
```
The `Math.max(0, Math.min(...))` clamp is a nice bit of defensiveness — this function exists specifically so `_random` can be swapped for a test double, and a test double that doesn't perfectly stay in `[0, 1)` (returns exactly `1`, or something odd) can't produce an out-of-bounds swap index. I traced through the algorithm by hand against the first test's fixed-`0` case and it produces exactly the expected permutation, so the implementation itself is correct, not just "looks like Fisher-Yates."

**`_assetDestinationOrder(destinations)`** caches a computed order against `this._decisionRandomState.assetDestinationOrders` for the lifetime of one `Choice()` call, matched by length + element-wise `==` rather than array identity — which correctly handles the case where the caller builds a fresh wrapper array each time (`emptyProtectedRemotes.concat([null])` produces a new array object per call, but the same content matches the cache). When there's no active decision state (`_decisionRandomState` is `null`, i.e. called outside `Choice()`), it degrades gracefully to computing fresh each time rather than throwing — confirmed this is exercised directly by the third test, which calls `_rankedInstallOptions` without wrapping it in `Choice()`.

**`_rankedInstallOptions()`** now computes `standardAssetDestinations`/`extendedAssetDestinations` once per call (function-local, lazy) instead of calling `Shuffle()` in-place inside the per-card loop — this directly fixes both complaints in the ticket: the same call no longer reshuffles per asset card, and (via `_assetDestinationOrder`'s decision-scoped cache) repeated calls to `_rankedInstallOptions()` within one `Choice()` reuse the same order rather than re-rolling.

**`Choice()`** wraps the body in try/finally, saving and restoring `_decisionRandomState` rather than just setting/clearing it:
```js
var previousDecisionRandomState = this._decisionRandomState;
this._decisionRandomState = { assetDestinationOrders: [] };
try { ... } finally { this._decisionRandomState = previousDecisionRandomState; }
```
Saving the previous value instead of hardcoding `null` on the way out means nested `Choice()` calls (if they ever happen) won't clobber an outer decision's cache — a small bit of correctness that costs nothing and would otherwise be an easy latent bug to introduce later.

## Test coverage

Three new tests, and they're targeted at the actual regressions rather than just exercising the code:

1. **`_shuffleCopy` isolation** — same seed twice produces the same order, the input array is provably unmutated, and global `Math.random` is stubbed to throw so the test would fail loudly if anything fell back to it. This is the strongest test in the set because it actively asserts the *absence* of the old behavior, not just the presence of the new one.
2. **Tie-break rolled once per `Choice`** — calls `_assetDestinationOrder` twice inside one `Choice()`, confirms both calls return the same order and only 2 rolls total (not 4), and confirms `_decisionRandomState` resets to `null` after the decision ends.
3. **`_rankedInstallOptions` integration** — mocks out essentially every other AI method to isolate the destination-ranking logic for two asset cards, confirms the destination array is untouched, confirms both cards get the same order, confirms the existing "skip strongest empty remote" behavior survived the refactor, and confirms exactly 2 rolls (one shuffle) for two cards. This is the test that actually reproduces the original bug report ("the same decision can see different tie-breaks") and proves it's gone.

I don't see gaps in coverage for what this commit claims to fix.

## Scope / commit hygiene

This is the one thing worth raising before it goes further. The commit message is "Addressed `.../corp_ai_finding_09_seeded_randomness.md`," and the `ai_corp.js` + test diff (119 + 99 lines) matches that exactly. But the same commit also:

- adds a brand-new, unrelated bug ticket (`documentation/bugs/hq-dilution-bonus-outranks-toothless-remote.md`, 170 lines) diagnosing a completely different problem — an HQ-vs-remote protection-scoring asymmetry where a stuffed-but-toothless HQ can rank as "safer" than an empty remote and get reinforced instead. It's explicitly marked **"Diagnosed, not yet fixed"** — i.e. this is new, real, open work, not incidental cleanup.
- adds three new debug-log files and renames a fourth into a `bug_raised/` subfolder (~2,700 lines combined)
- touches three roadmap docs (`corp_ai_foundations_roadmap.md` new, plus edits to the improvement and install-decision roadmaps)

None of that is wrong content-wise — the new bug ticket in particular looks like solid diagnostic work — but bundling an unrelated open finding into a commit named after a different, closed one means:
- `git log`/`git blame` on the randomness fix will always drag in an unrelated bug report and several megabytes of log text
- if this commit ever needs to be reverted (e.g. the shuffle logic turns out to have an edge case), the revert would also silently remove the HQ-dilution bug ticket
- anyone scanning commit messages for "what's still open" won't see the new finding, since it's hidden inside a commit that reads as closing something out

Worth splitting these into separate commits going forward, even when they land in the same working session — the code fix here is genuinely clean on its own.
