# Engine: Runner install retries an unaffordable cost after trashing a discount source

**Outcome:** adopted

**Source log:** `documentation/debug-logs/bug_raised/zwicky-magdalene-seed-24-install-cost-stall.txt` — diagnostic excerpts, not a full dump.
**Reproduction:** `tests/pending/runner-install-cost-increases-after-trash.test.js` — failed at `04fbe4c`, 2026-10-12; uncommitted L8.5 work present. Promoted unchanged to `tests/runner-install-cost-increases-after-trash.test.js`; `node tests/runner-install-cost-increases-after-trash.test.js` passes.

## Resolution

Implemented from 04fbe4c (2026-10-12).

`Install` now uses the current `InstallCost` and `CheckCredits` for Runner
continuations and checks again before payment. An unaffordable installation
has a separate `continue` command labelled “End unsuccessful install”, so
`n` never represents an unpayable installation and removal of cancellation
after trashing cannot strand the phase. Further legal program trashes remain
available: there is no automatic abort while responses or additional trashes
could restore affordability.

Failure commits the action callback once (including an ordinary action's
click), returns the uninstalled card to its original source, resumes the
appropriate parent/next phase, and invokes existing uninstalled-card cleanup.
It preserves completed trashes, spends no credits and fires no payment or
install-success callbacks. Repeated stale resolution cannot recommit the
attempt. Cancellation before trash remains voluntary and does not commit the
action. The install-phase closure is used when removing cancellation after
trash responses. Callback documentation now distinguishes commitment from
successful payment/installation.

Magdalene no longer relocates its discarded card to the Grip before `Install`:
the engine accepts a Heap source directly. Thus cancellation or payment
failure leaves the card in the Heap. No AI heuristic, hook contract, payment
allocator, title filter or seed exclusion changed. Current behavior is
recorded in [Runner architecture](../../runner-ai/architecture.md#installing-and-playing-cards).

The original reproduction was moved byte-for-byte from
`tests/pending/runner-install-cost-increases-after-trash.test.js` to
`tests/runner-install-cost-increases-after-trash.test.js`.
Both versions have SHA-256
`8f11d6259bbd6071ba1af30535dc2b98bb84c7ded87ae9e14b51196b9634142b`.
The pending file was already untracked at pickup, so it has no committed
pending-path version for the workflow checker to retrieve; the identical
before/after hashes establish that its assertions and all other bytes are
unchanged without creating a commit.

`node tests/runner-install-cost-increases-after-trash.test.js` passes.
`node tests/runner-install-recovery.test.js` passes 14 real-engine scenarios:
Magdalene Heap restoration, ordinary-action clicks/return phase, stale
continuations, disallowed cancellation, voluntary cancellation, MU-driven
trashing, decreasing costs after a further trash, ignored costs, a nested
trash response restoring affordability, human hosted-credit payment,
loss of an eligible payment source, pool restrictions, and eligible hosted,
temporary and ineligible credits. Success cases exercise the real payment and
install responses; failure cases preserve credits and avoid success callbacks.

Fresh baseline replay:
`node scripts/ai-batch.js replay --pairs zwicky-magdalene --seeds 24`
finishes normally: Corp wins 7–0 in 10 turns, 238 log lines,
`logHash 82ca07d82291`. The log contains the unsuccessful-install recovery
and subsequent normal turns; it has no failed-payment retries. Feedback
remains off and the pool/seed are unchanged.

The first full-suite run exposed a Scrounge test-driver assumption: it selected
`continue` solely because the enumerator existed, without checking for a legal
choice. The driver now checks the enumerated choice count; all existing
assertions are unchanged and its five scenarios pass. This harness-only
adjustment is the sole additional file beyond the planned repair/tests/docs.

`node scripts/ticket.js check` invokes `node tests/run-all-tests.js`; its
serial full run passed all 88 test files, including Corp decision fixtures and
decision snapshots. An overlapping standalone suite had a transient
temporary-file race; the checker's subsequent green run is the final full-suite
evidence. L8.5's unchanged quick setup command completed:
`node scripts/ai-batch.js gate --corp-option matchLocalPostureFeedback=true --collector postureScriptWeights --collector bluffSingleVariableCorrelation --max postureScriptWeights.violations=0 --no-worse bluffSingleVariableCorrelation.max --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard winRate=0.02 --quick --jobs 3`.
Baseline and candidate each ran 350 games with zero failures (160 s and
159 s respectively). The comparison reports `350 paired games, 18 changed by
the options [quick: indicative only, cannot pass a gate]`. Thus both arms reach
the option and the formerly blocked baseline now completes without excluding
any pool entry or seed. Quick output passes all three guarded core metrics
and the zero weight-violation check, but flags the measured-no-worse
correlation check: baseline maximum 0.192 versus candidate 0.228.
It ends `Gate: indicative only` and exits 1 as quick mode is designed to do.
This is setup evidence, not an adoption verdict or a failed full strategic
gate. L8.5 remains off and its full evaluation awaits review of this repair.

The final ticket check passes and again runs all 88 test files successfully.
Its sole warning is the unavailable historical version of the untracked
pending reproduction, accounted for by the identical hashes above.
The full L8.5 strategic gate is separate from this deterministic engine repair.

## Implementation plan

Proposed at `04fbe4c`, 2026-10-12. **Approved 2026-10-12.**

- **Validation:** The unchanged pending reproduction fails with `1 !== 0` on
  the current branch. `Install` checks Runner MU but not credits, removes
  cancellation after trash responses, and calls `SpendCredits` without a
  payment preflight. `CheckCredits` uses `AvailableCredits`, including eligible
  hosted/recurring and temporary credits and pool restrictions. CR 1.16.2b,
  1.16.4b and 8.5.16c–d confirm recalculation at payment and an uninstalled card
  when payment is impossible. This is an objective payment-legality repair,
  not a preference between legal Runner plays; no strategic gate or AI option
  is required. Existing dirty files are the L8.5 work the user explicitly
  authorized sharing this branch with; preserve those changes.
- **Approach:** Repair the Runner path in shared `Install` in `mechanics.js`:
  check current affordability for installation continuations and defensively
  before committing payment. Provide an explicit failed-install recovery that
  restores the uninstalled card, preserves completed trashes and their
  responses, and resumes the correct parent phase without partial payment or
  installation/payment-success triggers. Keep voluntary cancellation distinct
  from failure after irreversible trashing, including `allowCancel=false`.
  Do not terminate while trash responses are still resolving or prevent legal
  further trashes that could restore affordability. Account for ordinary
  action click commitment and callbacks rather than refunding a committed
  action. Inspect callback consumers before choosing the precise recovery
  wiring. Magdalene currently moves its Heap card to the Grip before calling
  `Install`; adjust its failure/source restoration handling in
  `sets/elevation.js` if necessary so a failed install leaves it in the Heap.
  Reject a frozen cost, title-specific filtering, AI preference changes and a
  credit check with no recovery path. Keep Corp installation behavior intact.
- **Tests:** Preserve the pending reproduction's assertions and move it into
  the green suite after it passes. Add real-engine coverage for full triggered
  and ordinary-action recovery, original card location, action clicks,
  no partial payment/success callbacks, changing costs in both directions,
  required MU trashes, cancellation before trash versus failure after trash,
  nested responses, ignored costs and eligible/ineligible hosted and temporary
  credits. Run focused tests, then `node tests/run-all-tests.js` including Corp
  fixtures and decision snapshots. Replay
  `node scripts/ai-batch.js replay --pairs zwicky-magdalene --seeds 24` with
  feedback off and verify normal completion on the unchanged pool/seed.
- **Risk:** `Install` has callers throughout the engine and sets. The main
  risks are wrong return phases, callbacks firing twice or only on success,
  temporary card relocation, and ending too early when trash responses change
  credits or discounts. Exercise real response windows and both action/trigger
  return paths; avoid changing the shared payment allocator or AI heuristics.
- **Docs:** Record the implementation, test and replay evidence here; update
  any current architecture description actually affected. No new AI hook
  contract is planned. Move the completed ticket with `ticket.js move` and
  run `ticket.js check`; preserve L8.5's separate adoption gate and do not
  commit.

## Summary

The F4 baseline for `zwicky-magdalene` seed 24 loops during Magdalene's
discard-triggered Principia installation. Principia costs one credit while
three other icebreakers are installed. Trashing Echelon removes a discount
source and raises the cost to two credits, but the Runner has only one credit.
The engine still offers an install continuation, spends that credit and then
repeatedly retries the failed payment. A continuation must not commit an
unpayable installation or leave play in an unrecoverable payment loop.

This happens with feedback off and also with all JavaScript read from
committed `HEAD` at `04fbe4c`; it predates the uncommitted L8.5 changes.

## Evidence

Source lines 3–9 identify the exact pool, stream, decks and read-only diagnostic
wrappers. Lines 11–16 show Magdalene's discarded Principia, install trigger,
Echelon trash and the one credit spent. Lines 17–23 give the before/after
costs, credits, offered commands and repeated failures:

```text
Before trash: Principia pending, InstallCost=1, Runner credits=1.
After Echelon trash: Principia pending, InstallCost=2, Runner credits=1.
Runner could not pay 1 remaining credit
Subsequent state: Principia pending, InstallCost=2, Runner credits=0.
Runner could not pay 2 remaining credits
```

The two-second timeout probe (lines 30–33) returns without a winner, at
Corp 5–0 Runner after seven turns, after observing 175 failed payments.
The timeout is not starved: continued callbacks defeat the no-callback
watchdog, leaving the ordinary 900-second timeout to end the game.

## Reproduction

The real-engine test initializes the committed Zwicky/Magdalene decks and
constructs a minimal board with two Echelons and one Principia installed,
one Runner credit and a second Principia discarded into the Heap. It invokes
Magdalene's real enumeration and resolution, then the real install trash action
and trash-response continuation. No payment/installation behavior is mocked.

After trashing one Echelon, it confirms cost 1→2, unchanged credit pool of 1,
an installed-card discount decrease, a pending Principia and `CheckCredits`
false. It asserts that a still-pending unaffordable install offers no `Enumerate.n()`
continuation; filtering an unsafe trash or aborting the installation is also
accepted. It does not mandate a particular recovery phase.
It currently fails with `1 !== 0`. The test stops before payment retries,
so the pending reproduction does not itself hang for fifteen minutes.

## Root cause

- **[Verified]** Principia's `modifyInstallCost.Resolve` counts other installed
  icebreakers; trashing Echelon increases `InstallCost`. Demonstrated by the
  pending reproduction and both seeded replays.
- **[Verified]** `Install`'s Runner `Enumerate.n` checks program memory but
  does not check credit affordability, unlike its Corp branch. The pending
  reproduction demonstrates the illegal continuation when `CheckCredits`
  is false after a trash.
- **[Verified]** The install trash callback removes `currentPhase.Cancel`.
  `Resolve.n` then calls `SpendCredits` using the newly computed price.
  The real seeded replay consumes the remaining one credit without completing
  the two-credit install; `SpendCredits.finishPayment` logs the shortfall and
  returns without advancing the phase.
- **[Verified]** The Runner AI chooses `n` whenever it is offered in
  `Runner Install`; the replay records repeated command/select choices in that
  same phase. This symptom is not proof that changing its trash preferences
  would be an ungated strategic improvement.
- **[Verified]** The headless watchdog measures callback progress, not game
  state. The two-second probe times out normally despite 175 failed payments.
  Payment errors lack the word `Error` used by its error classifier, so they
  are not individually added to `game.errors`.

## Proposed fix

The [Comprehensive Rules](https://rules.nullsignal.games/) were checked on
2026-10-12: 8.5.6c permits program trashing during installation; 8.5.16c–d
places trashing before payment; 1.16.2b evaluates calculated costs at payment;
1.16.4b leaves an effect's card uninstalled if its install cost cannot be paid.
Do not freeze Principia's earlier one-credit estimate after losing its discount.

Validate the current cost throughout the trash/continue sequence and ensure a
legal completion/recovery path if trashing changes affordability. Re-ground
these rules and related mechanics before implementing a general recovery. Adding only a credit check to `Enumerate.n` could replace
the retry loop with a no-valid-command deadlock after cancellation was removed.

Keep the repair general: no Principia/Echelon title checks, no seed exclusion
and no constants tuned to this game. Cover ordinary action installs as well
as triggered installs, hosted/temporary credits, cost increases/decreases,
MU-driven trashes and cancellation/response windows. A Runner preference change
between otherwise legal trashes would be a separate strategic gated change.
Shared engine changes require an implementation plan under `implement-ticket`.

## Acceptance gate

N/A — deterministic fix (principle 4): an offered installation continuation
must satisfy current payment legality and resolution must not enter an
indefinite failed-payment loop. Cost timing was checked against CR 1.16.2b and 8.5.16;
implementation must re-check those rulings and the general recovery path; this ticket does not adopt an AI preference between legal plays.

## Acceptance criteria

- [x] The unchanged reproduction passes and moves into the green suite.
- [x] A real-engine test of the complete triggered install resumes legal play
      without partial failed payment, repeated retries or a missing-command deadlock.
- [x] Cover ordinary installs, changing discounts, MU-driven trashes, cancellation,
      nested responses and applicable credit sources without title-specific logic.
- [x] Fresh replay of `zwicky-magdalene` seed 24 finishes normally with feedback
      off; confirm the L8.5 gate can then proceed on the unchanged pool/seeds.
- [x] New or changed AI hooks, if any, are documented in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related

- [Illumination's overlapping installs](../illumination-overlapping-installs-stalls-game.md)
  also cause failed payments, but this game uses Magdalene and a changing
  installed-breaker discount, not overlapping Illumination offers.
- [Scrounge's empty install prompt](scrounge-unaffordable-program-stalls-game.md)
  and [Humanoid Resources' sequencing bug](humanoid-resources-install-stalls-game.md)
  have separate completed fixes.
- Harness detection of unchanged game state, payment-error classification and
  an independent worker deadline are separate infrastructure concerns.
- [L8.5](../../backlog/feature-layer-8-5-match-local-public-outcome-feedback.md)
  remains default-off with its full gate blocked by this baseline failure.

### Observed follow-up

The repaired seed-24 replay still uses the existing Runner trash preferences
when the installation is unaffordable: after Echelon it also trashes Fermenter,
Principia and the remaining Echelon before taking the failure exit. These
trashes are legal and cannot cause the former payment loop. Whether to prefer
ending the failed attempt or to plan trashes around changing discounts is a
separate strategic Runner change and requires its own acceptance gate; this
engine repair does not adopt that preference.
