# Corp AI: LEO Construction ability chosen without consulting its AI hook

**Source:** code inspection while auditing the former R1 spec (now R1.1 to R1.3) (no debug log)
**Reproduction:** none committed; needs a live-run reproduction fixture (see Reproduction). A scratch fixture outside the repository shows the decision at `376f32c`, 2026-09-25.

## Summary
LEO Construction: Labor Solutions' identity ability ("Once per turn, trash 1
rezzed bioroid card in the root of or protecting the attacked server: end the
run") is a paid ability in `abilities[]`, offered through the `trigger` command
in every run paid-ability window. Its `AIWouldTrigger()` decides whether the
sacrifice is worth it, but the Corp AI never calls it for this ability: the run
window handlers pick `trigger` whenever it is offered, and the bioroid is
picked by index. The Corp is therefore expected to trash a bioroid and end the
run at the first run window where the ability is offered, usually on approach
to the outermost ICE, before the ICE has taxed the Runner, even when the hook
would decline, and to trash whichever bioroid is listed first (ICE before
root) rather than the cheapest.

## Evidence
- `sets/elevation.js`, LEO Construction: the ability's `Enumerate` needs only
  a run in progress, `usedThisTurn` false, and a rezzed bioroid in the attacked
  server's ICE or root. `AIWouldTrigger()` computes the cheapest bioroid and
  returns false for, among others, a remote with no agenda whose cheapest
  bioroid costs more than 2, or a server `_evaluateServerSecurity()` reports
  secure. Nothing reads the cheapest bioroid it computes.
- `ai_corp.js`, `Phase_Approaching()` (Run 2.1): after the rez checks,
  "for now assume trigger is always desired" returns `trigger` whenever it is in
  the option list.
- `ai_corp.js`, `Phase_Movement()` (Run 4.5): consults `AIWouldTrigger()` only
  for rezzing root upgrades, then "if trigger is an option, use it by default".
- `ai_corp.js`, `_choiceInner()`: Run 3.1 and Run 4.3 have no handler; the
  bioroid selection (`executingCommand == "trigger"`, choice type `select`) has
  no mid-action handler either. Both reach the "I don't have code to handle this
  situation" fallback, which returns index 0.
- `AIWouldTrigger()` is otherwise only called for upgrades in the attacked root
  (`Phase_Movement()`) and for end-of-turn rezzes (`Phase_EOT()`).
- `tests/corp-server-security.test.js` covers LEO only by calling
  `AIWouldTrigger()` directly.

## Reproduction
A scratch fixture (not committed) built with `CorpTestField(35035, ...)`, one
remote holding a rezzed Bumi 1.0 (rez cost 3) and an Otto Campaign (no
agenda), `attackedServer` set to that remote, `IDENTIFIER: Run 2.1` then
`Run 4.5` with `approachIce=0`, and `OPTIONS: trigger, n`. Its `SETUP` checked
that `AIWouldTrigger()` returns false. Both runs chose `trigger`, expected `n`.

This shows the decision function, but the harness offers `trigger` as a bare
string, so it does not prove that LEO's ability is the one offered in a live
run. The committed reproduction needs:

1. A pending fixture in `tests/fixtures/corp-decisions-pending/`, extracted
   from a live debug log (`node tests/extract-fixture.js <log> <n> <slug>
   --expect n --pending`), of the Corp's Run 2.1 or Run 4.5 decision where
   `trigger` offers only LEO's ability and the hook would decline. To get the
   log: Custom Game with the LEO Glacier precon as Corp; rez Bumi 1.0 on a
   remote holding a non-agenda card; have the Runner run it; the log should
   show "LEO Construction trashes Bumi 1.0 to end the run" on approach to the
   outermost ICE.
2. A pending test in `tests/pending/` for the bioroid selection: a rezzed
   Mercia B4LL4RD (rez cost 2) in the root and a rezzed Bumi 1.0 protecting the
   same server, where the hook fires; expected: the Corp trashes Mercia, not
   the first-listed Bumi.

## Root cause
- [Verified] `Phase_Approaching()` and `Phase_Movement()` choose `trigger`
  while LEO's `AIWouldTrigger()` returns false (scratch fixture above, at
  `376f32c`).
- [Inferred] The ability's bioroid selection falls to the index-0 fallback in
  `_choiceInner()`, and ICE is enumerated before root cards.
- [Inferred] In a live run the first window offering the ability is usually
  Run 2.1 for the outermost ICE.

## Proposed fix
Before choosing `trigger` in a run paid-ability window, ask the offered
abilities' cards: choose `trigger` only for an ability whose card's
`AIWouldTrigger()` (when defined) returns true, and set the preferred ability
and target so the selection steps follow the hook (LEO: the cheapest bioroid
it already computes). Keep cards without the hook on today's default, so other
abilities are unchanged. Make LEO's hook decline before the last Run 4.5
window (Run 4.5 with `approachIce < 1`): ending the run earlier gives up the
tax the remaining ICE would charge. No title checks in `ai_corp.js`.

Rejected: a LEO title check in `Phase_Movement()` (breaks the hooks-over-titles
principle).

## Acceptance criteria
- [ ] Writing the live-run reproduction (fixture and pending test above) is the first step; both fail before the fix.
- [ ] The reproductions pass and have moved into the green suite (`tests/fixtures/corp-decisions/` or `tests/`), expectations unchanged.
- [ ] A test shows an ability on a card without `AIWouldTrigger()` is still chosen as today.
- [ ] Every new test asserts the logged reason as well as the choice.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Valuing the sacrifice against approach triggers still to come (Manegarm
  Skunkworks, Anoetic Void) and holding LEO as a mid-run reservation is roadmap
  item R1.2 (`documentation/corp-ai/specs/R1.2-leo-paid-ability-window.md`),
  which depends on this fix.
- Ordering the Corp's own Run 4.6.2 approach triggers is R2.
