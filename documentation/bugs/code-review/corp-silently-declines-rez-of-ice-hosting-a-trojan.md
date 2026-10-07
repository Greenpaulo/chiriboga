# Corp AI: `_iceWorthRezzing()` may silently refuse to rez ice hosting a Runner Trojan, with no logged reason, even when affordable and undefended

**Outcome:** not adopted — gate failed 2026-10-02 (pointsStolen +0.48 on the real log board); the hosted-card logging stays, the option is removed, and the next idea is [hosted-ice-rez-ignores-repeated-tax.md](../hosted-ice-rez-ignores-repeated-tax.md).

## Resolution

Implemented from `64bcf17`.

**PR review validation, 2026-10-05 (Node v23.4.0).** In the isolated
worktree, `node tests/run-all-tests.js` passed all 44 test files, including
`corp-decision-fixtures.test.js` and `decision-snapshots.test.js`. The first
run failed only `flipped-identity.test.js` (missing `images/35023-0.jpg`)
and `vantagepoint-integration.test.js` (missing `images/36001.jpg`). These
files are excluded by the existing `images/` rule in `.gitignore`, so a fresh
worktree lacks them. Neither failing test nor its game code was changed by
this remediation. Copying the existing reverse-side image and 66 Vantage
Point images from the main checkout made both focused tests and the full
suite pass; no expectation was changed and no art was committed.


- Added the first Corp AI options object and the default-off
  `evidenceBasedHostedCardRez` option. With it off, the existing five-times-cost
  rez policy is unchanged. With it on, a non-exempt hosted card no longer vetoes
  an affordable approached ICE when `_iceWouldSecureServer()` shows that this
  ICE changes the current server from breachable to secure.
- The hosted-card branch now logs the approached ICE, first non-exempt hosted
  card, required threshold and current credits whenever it still declines.
  This diagnostic is active with the option off as well as on.
- Moved the original reproduction to
  `tests/hosted-trojan-blocks-rez-silently.test.js` with its `true` decision
  assertion and zero-message-count expectation unchanged (both are present
  in the pending test at `64bcf17`). The historical assertion message incorrectly
  asks for a decline log while asserting zero messages. It is retained verbatim
  so the complete original assertion calls remain comparable; explanatory
  comments clarify that the candidate's successful rez needs no decline log.
  Its harness now resets the option per case, enables the candidate for the
  reproduction, and puts the hosted card in the public installed-card list with its real `host`; these setup-only changes account
  for the ticket checker's non-expectation diff warning. Added option-off
  coverage plus decisive and redundant Tranquilizer cases to the shared Corp
  security suite, while retaining the reproduction's Saci-style and rich-Corp
  guards.
- Updated [Corp AI architecture](../../corp-ai/architecture.md#central-pressure-and-breach-loss-risk)
  with the legacy default, candidate behavior and adoption boundary. No
  card-facing AI hook changed.
- Verification: focused hosted-Trojan reproduction (3 cases), Corp
  server-security test (136 cases), and Node 20.19.0 full suite (38 test files,
  including Corp decision fixtures and decision snapshots) all pass.

**Revision 2, 2026-10-02 (from `5b8952f`).**

- `_iceWorthRezzing()`: with `evidenceBasedHostedCardRez` on, the
  hosted-card veto no longer applies, so hosted ICE gets the normal rez
  decision. Off is unchanged. (Revision 1 lifted the veto only when the ICE
  would secure the server, which never changes the logged case: Rising Tide
  breaks Kessleroid.)
- `tests/corp-server-security.test.js`: two option-on cases that encoded
  revision 1 (redundant Tranquilizer declines; breakable ICE declines) now
  check that hosted ICE gets the same decision as the same ICE unhosted, and
  that breakable ICE is rezzed for its tax. Option-off cases are unchanged.
- The gate setup listed below, plus `node scripts/ai-batch.js replay
  [--diff]` for reading one batch game's full log (`scripts/ai-batch.js`,
  `fullLog` in `headless.js`, tested in `tests/ai-batch.test.js`).
- Docs and process: the "Start boards come from real boards" and "No
  conditional rows" rules (`ai-planning.md`), the real-board replay check in
  `implement-ticket` step 3, the use of `replay` in step 6
  (`ai-batch-harness.md`), and the proposed roadmap item F10 (real-board start
  library).
- Full suite: 43 test files pass.

**Gate:** failed — `evidenceBasedHostedCardRez` removed. F4 gate, real log board; evidence in "Gate run 2" below.

**Closing, 2026-10-02** (following "When a gate fails" in
`documentation/ai-planning.md`).

- Removed the option, its branch and its option-only tests from
  `ai_corp.js` and `tests/corp-server-security.test.js`.
  `CorpAI.DEFAULT_OPTIONS` was empty at closing. The later merge of main
  retains five independent default-off regression options;
  `evidenceBasedHostedCardRez` stays removed. The hosted-card veto and its
  logging are as before the option.
- Split the reproduction. Its two guards (Saci exemption, rich Corp) stay
  green in `tests/hosted-trojan-blocks-rez-silently.test.js`. Its "should
  rez" case moved back, unchanged, to
  `tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js` under the
  follow-up ticket.
- Kept what is useful without the idea: the harness `rez` event, the
  `hostedThreatRezCredits` collector, the real-board start boards (their test
  now checks they reach the hosted-card veto), and `ai-batch.js replay`.
- The harness's own tests now use a no-op test option
  (`AI_BATCH_TEST_OPTION`) instead of a real AI option.
- Process: "When a gate fails" (`ai-planning.md`), `implement-ticket` and
  `review-ticket`. `ticket.js check` now fails a failed option left in the
  code and requires a `not adopted` `**Outcome:**` for a failed gate.

**Gate setup, 2026-10-02 (not gate evidence).** A pool-only run on the F4
branch, `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --guard winRate=0.02 --guard pointsScored=0.1
--guard pointsStolen=0.1`, reused the committed baseline and played 1,400
candidate games. All 1,397 paired games had the same `logHash` as the
baseline (3 known stalls dropped), so the option never comes into play on the
deck pool. The improvement therefore needs the Chromatophores and Tranquilizer
start boards, which do not exist yet, as does the `hostedThreatRezCredits`
collector. The gate's `decisionLatencyMs` guard conflicts with the current
rule that latency is not a gate guard (the same run moved every latency metric
by about 3% with identical games).

**Decisions recorded 2026-10-02.** An earlier agent wrote these up as
owner decisions; the owner confirmed only (1) and asked for the best
supported choice on the rest. (1) Proceed on the F4 branch although F4 is
still in code-review. (2) Drop the `decisionLatencyMs` guard (latency is not
a gate guard under "Writing a gate"). (3) The earlier note's two-command shape
(both start boards in one command plus a pool command) is replaced: metrics
pool across every `--start` board, so one command would measure the
Chromatophores improvement diluted by Tranquilizer games and would halve
the per-game Tranquilizer credits. There is one command per start board,
and no pool command because no pool game changes. See the
normalisation notes under Acceptance gate.

**Gate setup, 2026-10-02 (pickup from `5b8952f`).**

- `scripts/ai-batch/headless.js` emits a `rez` event (card, card type,
  credits paid, hosted cards with their exemption) from a harness-local
  `SpendCredits` wrapper; Rez() pays every rez through it with `"rezzing"`.
  Documented in [Corp AI architecture: Foundations](../../corp-ai/architecture.md#foundations).
- New collector `scripts/ai-batch/collectors/hostedThreatRezCredits.js`.
- New start boards `tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt`
  and `tests/fixtures/ai-batch/starts/hosted-tranquilizer-on-remote-ice.txt`,
  built from the source log's dump. Their `NOTE` lines list each change from
  the dump: Lotus Field replaces Kessleroid on the remote, Rising Tide moves
  to the grip, Palisade replaces Scatter Field, and the central ICE starts
  rezzed. Without that last change the Corp spent its credits on HQ before
  the Runner reached the remote, and no game changed.
- `tests/hosted-threat-rez-gate-setup.test.js` covers the collector (exempt,
  non-ICE and multi-host cases) and plays `pd-tao` seed 1 from each board
  with the option off and on. It checks no engine errors, that the option
  flips the approached remote rez (off `false`, on `true`) and changes the
  game, and that the Corp paid for the hosted-ICE rez.
- Quick runs (not evidence): Chromatophores `350 paired games, 350 changed
  by the options`; Tranquilizer `350 paired games, 350 changed by the
  options`; deck pool `350 paired games, 0 changed by the options`.

**Gate run 2, 2026-10-02: revision 2 (hosted-card veto removed), real log
board. Failed.** The boards were rebuilt from the log's dump with only
Scatter Field swapped (it crashes). Kessleroid and Rising Tide are kept, so
the rez taxes the run rather than stopping it.
Command: `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --start
tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt
--improve pointsStolen --guard winRate=0.02 --guard pointsScored=0.1`.
All seven `core-v1` pairs, seeds 1–200; 1,400 paired games, 1,376 changed.

| Metric | Baseline | Candidate | Difference | 95% interval | Check |
|---|---|---|---|---|---|
| `pointsStolen` | 4.803 | 5.281 | +0.478 | [+0.280, +0.675] | Improve: FAIL |
| `winRate` | 0.284 | 0.247 | −0.036 | [−0.070, −0.003] | Guard 0.02: FAIL |
| `pointsScored` | 3.912 | 3.846 | −0.066 | [−0.231, +0.098] | Guard 0.1: FAIL |

Removing the veto, so that hosted ICE is rezzed whenever affordable, is worse
on the real board. The gate run below, which passed, used the earlier boards,
which were edited so that rezzing stops the run, and is superseded.

**Gate run, 2026-10-02** (code as on this branch; deck pairs: all seven
`core-v1` pairs; paired seeds 1–200 per pair; 1,400 paired games per
command, all changed by the option, 0 failed).

Gate command (Chromatophores): `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --start
tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt
--improve pointsStolen --guard winRate=0.02 --guard pointsScored=0.1`

| Metric | Baseline | Candidate | Difference | 95% interval | Check |
|---|---|---|---|---|---|
| `pointsStolen` | 6.327 | 4.589 | −1.738 | [−1.902, −1.570] | Improve: PASS |
| `winRate` | 0.149 | 0.551 | +0.401 | [+0.370, +0.432] | Guard 0.02: PASS |
| `pointsScored` | 3.439 | 6.043 | +2.604 | [+2.462, +2.746] | Guard 0.1: PASS |

Result: `Gate: passed`.

Gate command (Tranquilizer): `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --collector hostedThreatRezCredits --start
tests/fixtures/ai-batch/starts/hosted-tranquilizer-on-remote-ice.txt
--improve pointsStolen --guard winRate=0.02 --guard pointsScored=0.1`
(run with `--all` to print the collector)

| Metric | Baseline | Candidate | Difference | 95% interval | Check |
|---|---|---|---|---|---|
| `pointsStolen` | 6.445 | 6.031 | −0.414 | [−0.548, −0.281] | Improve: PASS |
| `winRate` | 0.141 | 0.206 | +0.065 | [+0.036, +0.093] | Guard 0.02: PASS |
| `pointsScored` | 3.211 | 3.811 | +0.601 | [+0.459, +0.748] | Guard 0.1: PASS |
| `hostedThreatRezCredits.Tranquilizer` | 0.574 | 8.864 | +8.289 | [+8.026, +8.560] | informational (original 0.5 guard would fail; its escape clause holds) |

Result: `Gate: passed`.

Caveat on what this evidence shows. The start boards were changed from the
log to reach the option: Lotus Field replaces Kessleroid, and Rising Tide
moves off the rig. On those boards rezzing is the right play by
construction, so the passes show the option helps where it applies. They do
not show how often it applies or how it behaves on real boards. The option
changed 0 of 1,397 deck-pool games. On the unmodified log board, all 28 of
28 trial games were voided by the Scatter Field crash, so the faithful case
(a breaker installed, the ICE breakable) is not yet measured.

**Findings from the setup, 2026-10-02.**

- [Verified] The source log's approached Remote 0 ice is Kessleroid
  (`corp.remoteServers[0].ice[0]` in the dump), with an effective `RezCost`
  of 3 on that board, not its printed 2. Replaying the dump in the headless
  engine, `_iceWorthRezzing()` declines through the hosted-card branch
  ("hosted Chromatophores requires 15 credits ... (have 12)"). That confirms
  the ticket's leading hypothesis.
- [Verified] Section 2's "no-icebreaker deck" is wrong: the dump's Runner rig
  has Rising Tide (a Fracter) installed, and Kessleroid is a Barrier. On the
  real board `_iceWouldSecureServer()` is false, so the candidate option
  still declines the logged rez (same replay, option on). The option fixes
  the defenceless-server case the reproduction models, not the logged
  decision itself. Declining there was defensible, because the Runner could
  break the ice.
- Scatter Field's install subroutine offers a `card: null` Decline option and
  crashes the Corp AI the same way as Humanoid Resources. It is added to the
  open ticket [corp-install-choice-crashes-on-null-skip-option.md](../corp-install-choice-crashes-on-null-skip-option.md)
  with the variation reproduction
  `tests/pending/corp-install-choice-null-decline-option.test.js`.

## Next candidate

Moved to [hosted-ice-rez-ignores-repeated-tax.md](../hosted-ice-rez-ignores-repeated-tax.md).

## Implementation plan (revision 2)

Proposed at `5b8952f`, 2026-10-02. **Awaiting approval.**

- **Validation:** The logged case is a tax, not a stop. Rising Tide breaks
  Kessleroid's two ETR subroutines for 2 credits, and the Runner had 9.
  Option v1 only overrides the veto when the ICE secures the server, so it
  still declines here. ICE with nothing hosted is already rezzed for its tax,
  so the hosted-card veto is the only inconsistency.
- **Approach:** With `evidenceBasedHostedCardRez` on, a non-exempt hosted card
  vetoes the rez only when the rez buys nothing. That means the Runner's
  cost to pass this ICE, `min(bypassCost, mandatoryCost)` from
  `_securityIcePlanInputs()` with hosted effects included, is 0. If the cost
  is above 0 (a tax) or Infinity (it stops the run), rez as for unhosted
  ICE. The veto log names the zero pass cost.
  - Rejected: a tax-to-rez-cost ratio. Unhosted ICE uses none, and it would
    add a tuned constant.
- **Tests:** Keep the existing reproduction and cases. Add a tax case
  (breaker installed, affordable break: rez with the option on) and a
  free-pass case (veto and log).
- **Start boards:** Rebuild both from the log's real board, keeping Kessleroid
  and Rising Tide installed, so the gate measures the tax case.
  - Only Scatter Field is swapped (for Palisade), because it crashes; see
    [corp-install-choice-crashes-on-null-skip-option.md](../corp-install-choice-crashes-on-null-skip-option.md).
  - The Chromatophores board puts Tranquilizer back on HQ; the Tranquilizer
    board hosts it on the remote ICE instead of Chromatophores.
  - Pre-rezzing the central ICE only if the quick run shows no change without it.
- **Gate:** The same two commands, re-run; the default switches on if both pass.
- **Risk:** Check that `_securityIcePlanInputs()` prices an unrezzed ICE
  correctly before it is rezzed. Option-off behaviour is unchanged.

## Implementation plan (revision 1)

Proposed at `64bcf17`, 2026-09-28; revised 2026-09-28. **Approved 2026-09-28.**

- **Validation:** The drafted reproduction fails at `64bcf17` because
  `_iceWorthRezzing()` returns `false` for the affordable ETR ice; the source
  log and reconstruction dump confirm the Corp's 12 credits and Chromatophores
  on the approached remote ice. Code at the starting commit confirms that
  Chromatophores has no exemption and that the hosted-card branch changed the
  decision without logging. The diagnostic defect is objective, but the
  expected `true` choice is a strategic preference rather than a rules oracle.
  The behavior change is therefore gated under `documentation/ai-planning.md`;
  the deterministic reproduction specifies the candidate policy but cannot
  justify enabling it.
- **Approach:** Create the first Corp AI options object following the documented
  convention and add `evidenceBasedHostedCardRez`, default `false`. With the
  option off, preserve the five-times-cost decision and add a diagnostic naming
  the hosted card and threshold. With it on, do not apply that veto when
  `_iceWouldSecureServer()` shows that this installed, approached ICE changes
  the current server from breachable to secure; otherwise retain the veto and
  diagnostic. This is generic, uses public state, and adds no title check or
  card-facing hook.
- **Tests:** Keep the pending reproduction's assertions unchanged, enable the
  option in its setup, and move it into the green suite after it passes. Keep
  the Saci-style and super-rich guards. Add option-off coverage proving the
  current decision remains unchanged, plus explicit Tranquilizer cases for a
  decisive current-run stop and a non-decisive rez so the policy tradeoff is
  reviewable. Run the focused test, Corp security tests and the full suite,
  including Corp decision fixtures and decision snapshots.
- **Risk:** `_iceWorthRezzing()` is a shared heuristic used by approach-time
  rezzing, Forged Activation Orders and Brân 1.0. The default-off option keeps
  every existing decision unchanged pending F4. Option-on behavior is limited
  to ICE already installed in the evaluated server; `_iceWouldSecureServer()`
  rejects uninstalled Brân candidates. The evaluator judges the current breach,
  not every delayed hosted effect, which is why F4 evidence is required before
  adoption.
- **Docs:** Update the Rez consistency section of
  `documentation/corp-ai/architecture.md` to describe the default-off candidate
  and gate. No AI hook documentation changes are required.

**Source log:** `documentation/debug-logs/bug_raised/corp_didnt_rez_ice_when_would_have_forced_runner_to_spend_creds.txt`
**Reproduction:** `tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js` — the unadopted "should rez" case remains pending under the repeated-tax follow-up. PR #17 review follow-up removed its obsolete zero-message assertion; the `true` rez expectation is unchanged and still fails.

Original reproduction: `tests/pending/hosted-trojan-blocks-rez-silently.test.js`
failed at `64bcf17`, 2026-09-28. Its two guard cases now pass in
`tests/hosted-trojan-blocks-rez-silently.test.js`; the gated candidate was removed.

---

## 1. Summary

The Corp approaches unrezzed ice guarding a remote server that holds an agenda
(Project Ingatan) and a grid (Mahkota Langit Grid) — clearly not an empty
server. The Corp has 12 credits, comfortably enough to rez the ice, and the
engine prints `Corp did not rez ice`, with **no `AI:` reasoning line before
it.** The credit-reservation and defensive-upgrade declines in
`_iceWorthRezzing()` log reasons such as `"Rez cost not worth it, need to save
it for X"`, but the hosted-card, `_iceToLeaveUnrezzed` and Inside Job branches
are silent. The log therefore does not identify which branch declined the rez;
that ambiguity is what made it hard to diagnose from the log alone.

One possible cause in `_iceWorthRezzing()` is an unconditional, unlogged
branch: if the approached ice hosts any card without
`AIHostedDoesNotPreventRez`, and
`Credits(corp) < currentRezCost * 5`, the function sets `rezIce = false` with
no `_log()` call. The end-of-game reproduction dump in the log confirms the
approached ice hosts Runner card `35030` — **Chromatophores**, a Shaper
Trojan with no `AIHostedDoesNotPreventRez` flag (the only card with that flag
is Saci). This heuristic treats every non-exempted hosted card as
categorically threatening enough to require the Corp be "super rich" (5x rez
cost) before rezzing, with no check on whether refusing to rez actually
protects anything the Corp cares about.

**Proposed fix:** at minimum, log a reason whenever this branch withholds the
rez, matching the logged reservation and defensive-upgrade exits. More
substantively, this
branch should be evidence-based like the sibling cross-server
credit-reservation logic in the same function (which checks
`_iceWouldSecureServer` / `_icePreventsGameWinningBreach` before reserving),
rather than a flat multiplier on cost that ignores whether the approached
server is otherwise defenseless.

---

## 2. What happened in the log

Corp: Poétrï Luxury Brands. Runner: Barry Baz Wong, a no-icebreaker deck
(the decklist contains no Fracter/Decoder/Killer programs at all — it relies
on Trojans and click/credit efficiency instead).

By the final Runner turn of the log, the board (reconstructed from the
`SPOILER:` lines and the end-of-log reproduction dump) was:

| Server | Contents | Rezzed? |
|---|---|---|
| HQ | Scatter Field (ice) | no |
| R&D | one piece of ice | no |
| Remote 0 | one piece of ice, hosting a Runner Trojan; root holds Project Ingatan (agenda, 2 points) and Mahkota Langit Grid (upgrade) | no |
| Archives | (previously accessed/emptied) | — |

No ice was ever rezzed in this entire game (`grep -i rez` on the log finds
only the final decline and two unrelated `"I don't have code to handle this
situation"` messages from other decision points).

The Runner's turn (line numbers from the debug log):

403: SPOILER: Corp has 12 credit(s) and 5 card(s) in hand: [...]
406-411: Runner spent one click / gained one credit (x3, reaching 3 credits)
413: Run initiated attacking Remote 0
415: Side Hustle pays out 6 credits (Runner now has 9 credits)
419: Approaching outermost piece of ice protecting Remote 0
420: Corp did not rez ice
421: Approaching Remote 0
Run successful
Project Ingatan accessed
Project Ingatan stolen
Mahkota Langit Grid accessed


No Corp credit spend or gain is logged between line 403 and the decision at
line 420, so the Corp still had 12 credits at the moment of the decision.

Two Runner Trojans were installed earlier in the game, both `installOnlyOn`
any piece of ice (rezzed or not):

- **Tranquilizer** (id `30017`, derezzes its host at 3 virus counters) — the
  end-of-log dump shows it hosted on `corp.HQ.ice[0]` with 2 virus counters
  (`corp.HQ.ice[0].hostedCards[0].virus=2`), i.e. on **Scatter Field**, not
  on the Remote 0 ice.
- **Chromatophores** (id `35030`, gives its host ice every ice subtype) —
  the dump shows it hosted on `corp.remoteServers[0].ice[0]`
  (`InstanceCardsPush(35030, corp.remoteServers[0].ice[0].hostedCards, ...)`),
  i.e. **on the exact ice the Corp declined to rez**.

`Chromatophores` (`sets/elevation.js:614`) has no `AIHostedDoesNotPreventRez`
property.

---

## 3. Root cause analysis

### 3.1 The hosted-card guard is unconditional and unlogged

`_iceWorthRezzing()`, `ai_corp.js` ~4601-4622:

```js
if (!card.AIDisablesHostedPrograms) {
  //if a card is hosted (e.g. Tranquilizer) only rez if super rich (the *5 is arbitrary, observe and tweak)
  //exception: cards with AIHostedDoesNotPreventRez are not threatening (e.g. Saci just gives runner 3c)
  if (
    typeof card.hostedCards !== "undefined" &&
    card.hostedCards.length > 0 &&
    Credits(corp) < currentRezCost * 5
  ) {
    var hasThreateningHosted = false;
    for (var h = 0; h < card.hostedCards.length; h++) {
      if (!card.hostedCards[h].AIHostedDoesNotPreventRez) {
        hasThreateningHosted = true;
        break;
      }
    }
    if (hasThreateningHosted) {
      rezIce = false;
    }
  }
}
```

There is no `this._log(...)` call anywhere in this block. Compare this to
every other `rezIce = false` assignment in the function (the cross-server
reservation branch, the same-server defensive-upgrade branch), which always
log why. Two further branches later in the function (`_iceToLeaveUnrezzed`
at ~4625 and the Inside Job exception at ~4629-4654) are also silent, but
the live log cannot distinguish among them. The hosted-card branch is the
leading hypothesis and is reproduced independently in section 4, not a
confirmed explanation of the logged decision.

### 3.2 Only one card in this decklist would escape the block

Only `AIHostedDoesNotPreventRez` (set solely on Saci,
`sets/automatainitiative.js:49`) exempts a hosted card. Chromatophores has no
such exemption, so with Corp credits at 12:

`Credits(corp) < currentRezCost * 5` → `12 < currentRezCost * 5`

Every ice in the Poétrï Luxury Brands decklist has a rez cost of 2 or more;
all but the 2-cost Kessleroid (`rezCost: 2`, threshold 10) satisfy this
inequality (Bumi 1.0 and Scatter Field: `rezCost: 3`, threshold 15; Ansel
1.0 / Brân 1.0: `rezCost: 6`, threshold 30; Mycoweb: `rezCost: 8`, threshold
40). The exact identity of the Remote 0 ice is hidden information (it was
never rezzed, so the log never reveals it). The block would fire for any
candidate except Kessleroid, but the log cannot rule Kessleroid out. The
reproduction below therefore uses a representative rez cost of 3 to
demonstrate the branch without claiming it proves the logged ice's identity
or decision path.

### 3.3 The heuristic ignores what refusing to rez actually costs

Elsewhere in the same function, the cross-server credit-reservation branch
only withholds a rez when `_iceWouldSecureServer()` or
`_icePreventsGameWinningBreach()` shows the reservation is actually decisive
(see the `done/rez-decision-saves-credits-for-other-server-on-tie.md` and its
"Follow-up design correction" section). The hosted-card branch has no
equivalent check: it blocks the rez purely on cost multiplier, with no
regard for whether the server is otherwise undefended, whether this ice
would in fact stop the current access, or whether the hosted card's ability
(here: broadening the ice's own subtypes, which only helps the Runner if
they have a compatible special breaker — Barry Baz Wong's deck has none) is
even exploitable in the current game state.

---

## 4. Reproduction

`tests/hosted-trojan-blocks-rez-silently.test.js` calls
`ai._iceWorthRezzing()` directly (the more reliable option noted in
`tests/fixtures/README.md`'s sibling ticket, since `Phase_Approaching`'s
"rez" option is a card object, not a string, and is not replayable through
the standard fixture format).

It builds a minimal board reconstructed from the log's reproduction dump:
unrezzed ice (rez cost 3, matching the deck's Bumi 1.0 / Scatter Field cost)
on a remote server whose root holds an agenda, with a copy of Chromatophores
in `hostedCards`, Corp at 12 credits, no other unrezzed ice anywhere to
compete for credits. Because nothing else in the board would ever cause a
legitimate reservation, this isolates the hosted-card branch as the only
possible reason to withhold the rez.

- [Verified, pre-fix at `64bcf17`] `ai._iceWorthRezzing(ice, 3, remote)`
  returned `false`.
- [Verified, pre-fix at `64bcf17`] No message was logged during that call
  (captured via a temporary `ai._log` stub), reproducing the "no reasoning
  printed" defect directly. The implemented branch now logs its reason when
  it still declines the rez.

Two guard cases are included so a fix does not overcorrect:

- The same board, but the hosted card carries `AIHostedDoesNotPreventRez`
  (the Saci exception) — must remain `true` (unaffected by any fix here).
- The same board with Chromatophores un-exempted, but Corp super rich
  (credits ≥ 5× rez cost) — already `true` today; guards against breaking the
  existing "super rich" path.

---

## 5. Root cause claims

- [Verified] The Corp never rezzed any ice in this game; the specific decline
  at line 420 is the one this ticket investigates.
- [Verified] The approached Remote 0 ice hosted card `35030` (Chromatophores),
  per the end-of-log reproduction dump (`corp.remoteServers[0].ice[0].hostedCards`).
- [Verified] Chromatophores has no `AIHostedDoesNotPreventRez` property
  (checked in `sets/elevation.js`), so it is treated as a threatening hosted
  card by `_iceWorthRezzing()`.
- [Verified] Corp had 12 credits at the decision point (no spend or gain
  logged between the last known total and the decision).
- [Inferred, pre-fix] Given the decklist's ice rez costs, the
  `Credits(corp) < currentRezCost * 5` condition holds for every candidate ice
  except the 2-cost Kessleroid. Because the ice's identity is hidden and other
  silent branches exist, the log alone cannot confirm that this block fired.
- [Verified, pre-fix at `64bcf17`] The hostedCards branch contained no
  `_log()` call. The later `_iceToLeaveUnrezzed` and Inside Job branches were
  also silent, so the missing log line did not prove which branch fired. The
  hostedCards branch now logs every refusal.

---

## 6. Proposed fix

1. **Minimum (diagnosability):** add a `this._log(...)` call when the
   hostedCards branch sets `rezIce = false`, naming the hosted card and the
   "super rich" threshold that was not met, so a future log shows why.
2. **Behavioral:** replace the flat `Credits(corp) < currentRezCost * 5`
   multiplier with an evidence-based comparison. Decisive access that this
   rez would prevent (`_iceWouldSecureServer` /
   `_icePreventsGameWinningBreach`-style reasoning) favors rezzing, not
   withholding. A hosted card justifies withholding only when its public
   effect makes the ice ineffective or exploitable given the Runner's current
   rig (for example, an active `AISpecialBreaker` that benefits), and that loss
   must be weighed against the access the ice would prevent.
3. Do not special-case Chromatophores or Tranquilizer by title; keep the
   general `AIHostedDoesNotPreventRez` opt-out, but make the *default* path
   evidence-based rather than an unconditional block.
4. Leave `_iceToLeaveUnrezzed` and the Inside Job branch alone unless the
   maintainer wants them folded into the same fix — they are also silent but
   are not evidenced by this log.

---

## Acceptance gate

These commands are historical: `evidenceBasedHostedCardRez` was removed after
the failed gate, and the Tranquilizer start board was dropped. They are not
current runnable gates; see the Resolution and F10 evidence above.

F4 gate. Option `evidenceBasedHostedCardRez` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals. Two game sets, one command each; the gate
passes only when both pass.
Collectors: `hostedThreatRezCredits` (adds `hostedThreatRezCredits.total` and
`hostedThreatRezCredits.<hosted-card title>`: credits the Corp paid to rez ICE
hosting a card without `AIHostedDoesNotPreventRez`).
Starts: `tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt`,
`tests/fixtures/ai-batch/starts/hosted-tranquilizer-on-remote-ice.txt`.

Chromatophores start:

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolen` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsScored` | higher | regression at most 0.1 |

Gate command: `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --start
tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt
--improve pointsStolen --guard winRate=0.02 --guard pointsScored=0.1`

Tranquilizer start:

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolen` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsScored` | higher | regression at most 0.1 |

Gate command: `node scripts/ai-batch.js gate --corp-option
evidenceBasedHostedCardRez=true --collector hostedThreatRezCredits --start
tests/fixtures/ai-batch/starts/hosted-tranquilizer-on-remote-ice.txt
--improve pointsStolen --guard winRate=0.02 --guard pointsScored=0.1`

Normalised 2026-10-02 from the earlier free-form gate, keeping its metrics and
thresholds, with these changes:

- The original Tranquilizer condition was: `hostedThreatRezCredits` for
  Tranquilizer must not rise by more than 0.5 credits per game *unless* the
  `pointsStolen` reduction on those starts has a lower bound above zero. One
  flag per row cannot say "unless". Rezzing that ICE is what the option
  does, so the credit rise is certain to exceed 0.5 on this board. The
  condition therefore reduces to its improvement branch, encoded as the
  Improve row. That is stricter than the original only when the credits
  guard alone would pass. The collector stays in the command so its value
  is recorded.
- The `pointsStolen` guard (0.1) on the starts is covered by the Improve row.
- No deck-pool command: the option changes no deck-pool game (1,397 of 1,397
  paired games identical in the setup run below, 350 of 350 in the
  2026-10-02 quick run), so `gate` would fail `changed option effect` by
  design, and the pool guards (`winRate` 0.02, `pointsScored` 0.1,
  `pointsStolen` 0.1) hold with zero difference.
- `decisionLatencyMs` dropped: latency is not a gate guard under "Writing a
  gate" (a cached baseline is timed on a differently loaded machine).
- Standard points guard tolerances stay at the ticket's 0.1, stricter than
  the template's 0.2.

## Acceptance criteria

- [x] The Saci and rich-Corp guard cases from the reproduction remain in
      the green suite with their assertions unchanged. The "should rez" case
      remains pending with its rez expectation unchanged, under the
      [repeated-tax follow-up](../hosted-ice-rez-ignores-repeated-tax.md).
- [x] The hostedCards branch logs a reason whenever it sets `rezIce = false`.
- [x] The Saci (`AIHostedDoesNotPreventRez`) guard case still returns `true`.
- [x] The "super rich" guard case still returns `true`.
- [ ] A new case demonstrates the fixed behavior: a hosted, non-exempt Trojan
      no longer blocks the rez when refusing would leave the server otherwise
      undefended and the Runner cannot exploit the hosted card's actual
      effect. This behavior was not adopted after the failed gate; the
      pending reproduction is tracked by the repeated-tax follow-up above.
- [x] The retained hosted-card threshold returns `false` below five times
      the rez cost and logs the refusal reason, covered by
      `tests/corp-server-security.test.js`.
- [x] The candidate behind an AI option, `evidenceBasedHostedCardRez`, was
      not adopted after its gate failed; the option and its decision branch
      are removed, as recorded in the Resolution.
- [ ] Gate evidence is recorded in the Resolution: exact F4 command, committed
      deck pairs and mid-game starts, paired seeds, seed count, every metric's
      baseline/candidate result and bootstrap 95% confidence interval,
      guarded-regression results, pass conditions and thresholds. Only then is
      `evidenceBasedHostedCardRez` switched on by default.
- [x] The F4 collector `hostedThreatRezCredits` is added through the harness's
      collector extension point before the gate is run.
- [x] The Chromatophores start board is committed and tested to reach the
      hosted-card veto. The Tranquilizer board was dropped because moving a
      hosted card is not an allowed builder edit; see the
      [F10 Resolution](../../backlog/code-review/F10-real-board-start-library.md#resolution).
- [x] The failed gate is closed with the real Chromatophores board evidence
      recorded in the Resolution. The historical commands in this ticket are not
      current runnable gates: the option was removed and the Tranquilizer
      board was dropped (see the F10 Resolution linked above).
- [x] New or changed AI hooks are documented in `documentation/ai.md` (none
      expected — no card-facing hook changes, only internal AI logic).
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related

- The `_iceToLeaveUnrezzed` and Inside Job silent branches noted in 3.1 —
  same defect pattern, not evidenced by this specific log.
- Whether Barry Baz Wong's no-breaker archetype is correctly weighed
  elsewhere in server-security evaluation — not investigated here.
- The exact identity of the Remote 0 ice is hidden information and was never
  confirmed; the reproduction uses a representative rez cost (3) rather than
  asserting a specific card.
