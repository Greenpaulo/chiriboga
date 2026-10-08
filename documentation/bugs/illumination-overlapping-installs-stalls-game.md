# Engine: Illumination overlaps installs and loops on an unaffordable payment

**Source log:** `documentation/debug-logs/bug_raised/illumination-overlapping-installs-startup-seed-133.txt` — archived diagnostic excerpts and inspector observations, not a complete debug dump.
**Reproduction:** `tests/pending/illumination-overlapping-installs-stalls-game.test.js` — `node tests/pending/illumination-overlapping-installs-stalls-game.test.js` (fails at `c47f80d`, 2026-10-08; existing working-tree changes present).

## Summary
Illumination opens its next install choice while the previous installation is
still pending. Choices therefore use credits that the previous install has not
yet spent. In the Startup batch, `wey-shaper` seed 133 installed Principia,
then remained in “Trash Before Install”, repeatedly failing a 2-credit payment.
Installations must resolve one at a time; this is an engine/card sequencing
bug rather than an AI strategic preference or general Vantage Point slowdown.

## Evidence
The source record identifies the decks and seed at lines 5–8. Lines 11–21 show
Illumination's successful R&D run followed by payment of 3 credits and the
installation of Principia. Line 22 records a diagnostic replay timing out at
turn 2 after 22,104 callbacks.

Live inspector observations at lines 24–26 identify stream `133:wey-shaper`
in “Trash Before Install”, with 0 Runner credits and Azimat, Principia and
Telework Contract installed. The callback count was 1,593,071; the last 15
console-error entries all read `Runner could not pay 2 remaining credits`.
The focused test's failing output is recorded at lines 28–31.

The user's four-pair batch reached 793/800 games in 182 seconds and then
appeared hung. Seven remaining workers were CPU-active. Only seed 133 was
identified directly; do not assume all seven had the same cause.

## Reproduction
The pending test uses the real headless engine, `Install`, `DecisionPhase`
and Illumination card code, with committed Gateway decks for initialization.
Its board is a minimal reconstruction: 3 Runner credits, Principia and Unity
in the Grip, and Illumination resolving its successful-run effect. The test
selects the actual offered Principia choice and stops at the sequencing
boundary before paying for the installation. It observes prompts without
changing install/payment logic or the card's effect.

PR #24 review strengthened this reproduction with a second board using 5
credits. It drives the real payment and install-response phases and requires
the next offer to contain Unity at cost 2, with Principia installed, no pending
installation, and 2 credits left. Both scenarios remain known-red. A temporary
test-only callback continuation makes both pass; removing that continuation
fails the second-offer assertion. The production card remains unfixed and the
test remains pending.

The expected invariant is that no further Illumination install prompt opens
while an installation is pending. Today it fails with:

```text
pendingInstalls=[Principia]; credits=3; choices=[Unity, cost=2]
```

This reproduction does not depend on the untracked Startup precons or on
wall-clock batch performance. The original full-game reproduction uses stream
prefix `133:wey-shaper`, Corp `[Startup] De Profundis (3-0 Worlds 2026).js`,
Runner `[Startup] Reg Mag.js`, and System Gateway/Elevation/Vantage Point.

## Root cause
- [Verified] Illumination offers the next installation before the current
  installation completes, using the unspent credit balance — pending test.
- [Verified] Seed 133 repeatedly attempts an unaffordable payment without
  advancing the game — live inspector observation and diagnostic replay in
  the source record.
- [Inferred] `_illuminationInstallLoop` calls `Install` and immediately recurses;
  `Install` opens asynchronous trash/payment/response phases, so this
  continuation should instead wait for completion. Inspect `Install`'s
  `onInstallComplete` contract and return-phase handling before implementing.
- [Inferred] The next choice becomes unaffordable when Principia spends the
  previously counted credits. The focused test proves the stale offer; it
  does not trace the full payment failure to Unity in the original game.
- [Inferred] The harness amplifies the apparent hang: its watchdog checks
  whether callbacks stop, rather than whether game state advances. Repeated
  callbacks defeat that check and wait for the default 900-second game timeout.
  Its console handler only records messages containing `Error` as errors;
  this payment message lacks that word.

## Proposed fix
Continue Illumination's install loop only after the selected install and its
responses finish. Use the engine's completion callback, with correct context
and return-phase handling; regenerate legal choices after payment and any
install responses. Preserve the discount through the selected installation,
then clean it up on completion, decline, cancellation and exhaustion.
Do not patch this through AI card-title exceptions or altered affordability
expectations. Review cancellation behavior explicitly so it cannot strand the
effect or leave the discount enabled.

Separately consider harness detection of repeated failed payments/no state
progress. A shorter timeout limits the symptom but does not fix the card.

## Acceptance gate
N/A — deterministic fix (principle 4): installations resolve one at a time,
and each subsequent offer uses the current legal affordability state.

## Acceptance criteria
- [ ] The reproduction passes and moves into `tests/`, expectation unchanged.
- [ ] A real-engine continuation test completes Principia's payment, then
      verifies that unaffordable Unity is not offered and play resumes.
- [ ] Cover multiple affordable installations, no remaining affordable cards,
      decline, cancellation and install responses; the discount is cleaned up
      and no overlapping install phase or payment loop remains.
- [ ] Where the source precons are available, replay `133:wey-shaper` to normal
      game completion without repeated failed-payment errors.
- [ ] New or changed AI hooks, if any, are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Strategic selection of which Illumination cards to install.
- Other unidentified slow games in the original batch.
- General batch watchdog/error-classification improvements are separate work.
- [Scrounge's unaffordable install](scrounge-unaffordable-program-stalls-game.md)
  and [Humanoid Resources' stalled install](humanoid-resources-install-stalls-game.md)
  concern related installation failures but different card paths.
