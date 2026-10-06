# Gated Corp AI fix: evidence, source changes and manual playtesting

Updated 2026-10-05 after the owner completed the option-validation queue.
Implementation commit: `28cc665`, **Gate measured Corp AI regression behaviors
behind default-off options**, on `fix/corp-ai-regression-options`.
Its base is `7b28f2a`, the preserved investigation above tested tip `b52d451`.
The implementation was built in `/private/tmp/chiriboga-corp-regression-options`.
The owner's repository checkout is now on the fix branch, with these documentation
updates carried across. The temporary worktree is detached and retained. The
harness branch has not been merged or changed.

## What succeeded, and what remains

All five options default to **false**. That default reproduced the combined
diagnostic arm `edc177a` exactly: 1,000 completed pairs, zero changed games,
identical log hashes, winners, points and turns. All five **true** reproduced
the old tip `b52d451` exactly on the same checks. All seven new reports have
1,000 games and zero failures. The agent did not launch or poll these batches.

| Metric | H0 | Old tip | New default | New default minus old tip [paired 95% interval] | New default minus H0 [paired 95% interval] |
|---|---:|---:|---:|---|---|
| Win rate | 43.3% | 25.3% | 39.8% | +14.5 pp [+11.1, +17.9] | -3.5 pp [-7.5, +0.4] |
| Points scored | 4.264 | 2.541 | 3.920 | +1.379 [+1.194, +1.559] | -0.344 [-0.564, -0.124] |
| Points stolen | 5.675 | 6.238 | 5.767 | -0.471 [-0.627, -0.311] | +0.092 [-0.098, +0.286] |
| HQ theft | 2.060 | 2.697 | 1.756 | -0.941 [-1.092, -0.794] | -0.304 [-0.464, -0.143] |
| R&D theft | 2.058 | 2.658 | 2.044 | -0.614 [-0.767, -0.461] | -0.014 [-0.185, +0.156] |
| Archives theft | 0.010 | 0.112 | 0.008 | -0.104 [-0.139, -0.072] | -0.002 [-0.015, +0.010] |
| Remote theft | 1.547 | 0.771 | 1.959 | +1.188 [+1.053, +1.325] | +0.412 [+0.247, +0.581] |
| Turns | 14.765 | 16.575 | 14.931 | -1.644 [-2.084, -1.219] | +0.166 [-0.281, +0.597] |

Each comparison uses 1,000 pairs. New default versus tip changes 915 games;
versus H0 changes 997. This recovers most of the measured regression, with a
clear remaining scoring deficit. It also trades more remote theft for less
central theft. It does not prove equivalent strength against human opponents,
nor does it mean every part of the source commits was wrong.

## Source commits and the five gates

These are policy gates, not whole-commit reverts. The source commit subjects
below are copied from Git. The intended fixes address real reported situations;
the problem is that their general policy effects hurt the tested benchmark.
Explanations of *how* those effects arise remain hypotheses where no decision
trace or agenda collector demonstrated the mechanism.

### fa1182c — Addressed installing agenda into unsecure remote issue

**Intent:** avoid offering a scoring remote that the security evaluator says
the Runner can breach, even if it ranks better than HQ. The same commit also
reduced the protection value of non-end-the-run ICE; that weighting is retained.

**Code:** `_isAScoringServer` added an unconditional early rejection on
`!security.isSecure`, before considering installed scoring upgrades/agendas
or comparing protection scores. This is a broader admission restriction than
just preventing one unsafe agenda install.

**Evidence:** the historical step lost 8.7 percentage points of win rate
[-11.7, -5.7] and 1.069 scored points [-1.238, -0.896]. Removing only this
rejection at the tip improved scoring +0.787 [+0.638, +0.934]. In the new
default, turning only this gate back on loses 8.7 pp and 0.933 scored points.
It lowers remote theft but raises total theft and lengthens games.

**Likely mechanism:** rejecting potential scoring remotes can leave agendas
in centrals and delay scoring. The server split supports this, but direct
agenda-install/scoring traces have not established the sequence. The security
evaluator itself is not proven incorrect; using its result as a blanket gate
is the measured policy problem.

**Gate:** `secureScoringServerGate`, in `_isAScoringServer`.
`true` restores the strict early rejection. `false` removes only that rejection;
the evaluator, scoring/protection comparisons and other checks remain.

### 5e6af68 — Resolved documentation/bugs/code-review/semak-samun-held-and-send-a-message-delay.md

The [original ticket](../bugs/done/semak-samun-held-and-send-a-message-delay.md)
describes a Corp holding Semak-samun while an agenda remote was breachable,
and a Send a Message scoring plan stalled by the global economy reserve.
This commit introduced two behaviors, gated separately.

**Protection install override:** `_shouldInstallIceLayer` appended
`|| serverAtRisk` to its final return. The intent was to consider another
affordable ICE layer despite existing unrezzed ICE and insufficient global
reserves when a breachable server had an agenda or asset at stake.
Earlier stakes/affordability logic and downstream install/rez filters remain.
Removing the final override at the tip improved scoring +0.208
[+0.091, +0.326]; restoring it alone on the new default loses 0.263
[-0.385, -0.145]. A plausible explanation is additional defensive installs
using credits/clicks that would otherwise fund scoring or economy. We have
not traced that resource diversion directly.

Gate: `serverAtRiskInstallOverride`. `true` includes the final OR term;
`false` excludes only that term. It does not remove every use of `serverAtRisk`.

**Committed agenda reserve bypass:** `_returnPreference` marked installed
agendas `AIScoringPlanCommitted`; `_installedAgendaCanBeCompleted` checked
whether remaining advancement could be funded. `Phase_Main` used that helper
as an additional OR term to enter the advance-selection block despite the
normal economy-reserve condition. The intent was to continue a chosen scoring
plan rather than leave the installed agenda idle. The helper opens the global
advance block; the existing per-card checks still choose what to advance.
At the tip, removing the bypass improved win rate +2.0 pp [+0.1, +4.0], with
inconclusive scoring. On the new default, restoring it alone loses 4.0 pp
and 0.257 scored points, while remote theft rises +0.276 [+0.176, +0.375].
Advancing under weaker economy reserves could expose agendas or leave less
money for defense; this mechanism remains inferred.

Gate: `committedAgendaReserveBypass`. `true` restores the helper's admission
term in `Phase_Main`; `false` removes that term. Commitment marking and the
helper remain, as do the other ordinary advancement paths.

### a3d57d3 — Addressed documentation/bugs/action-needed/pointless-archives-ice-install.md remediation points

The [original ticket](../bugs/done/pointless-archives-ice-install.md) concerns
protection allocation and pointless Archives installs. The commit added
state-aware public/recent run pressure and changed debt aging. We gated two
consumers, retaining the pressure machinery and other commit changes.

**Empty Archives admission:** `_nothingWorthProtecting` began treating
Archives with no agenda or HQ backdoor as a protection stake when public
successful-run rewards or recent successful runs created pressure. This tries
to account for Runner value beyond directly stealing agendas. The shared
predicate is used by both protection allocation and debt aging.
Disabling it at the tip improved scoring +0.181 [+0.064, +0.296]; restoring
it alone on the new default loses 0.216 [-0.341, -0.092]. Spending protection
resources on non-agenda run rewards could compete with scoring/central
defense; that resource-allocation mechanism has not been directly traced.

Gate: `emptyArchivesRunPressure`. `true` makes run pressure affect this
predicate. `false` treats empty Archives without an HQ backdoor as valueless
regardless of that pressure. Visible agendas and HQ backdoors remain stakes.
This gate affects the shared rule, not just the install allocator.

**Valueless-server debt reset:** `_ageProtectionPriorities` began clearing
accumulated protection urgency when `_nothingWorthProtecting` was true,
in addition to the existing reset conditions. The intent was to prevent
irrelevant servers banking debt and later jumping ahead in protection ranking.
This changes later rankings, but an individual scoring/win-rate regression
has **not** been established: both the old tip ablation and new single-on
comparison have intervals including zero. It is included to reproduce the
tested combined build faithfully, not because all five gates are independently
proven harmful.

Gate: `valuelessServerDebtReset`. `true` enables the valueless predicate in
the reset condition; `false` disables only that reset reason. Secure-server,
protection-install and removed-server debt handling remains unchanged, along
with the debt subtraction used in ranking.

**Interaction:** if Archives admission is off, pressured empty Archives is
valueless to this predicate and can have its debt reset when debt reset is on.
If both are on, the same Archives can count as valuable and avoid that reset.
The two gates are not independent policy effects.

## Completed single-option tests on the new default

Differences are **option alone ON minus all-five-OFF default**. Brackets are
paired 95% intervals. Each row uses 1,000 completed pairs with no failures.
These effects are conditional on the new default; do not add them or substitute
the older tip-ablation estimates.

| Option alone ON | Win change (pp) | Scored change | Stolen change | Changed games |
|---|---|---|---|---:|
| `secureScoringServerGate` | -8.7 [-11.6, -5.8] | -0.933 [-1.087, -0.775] | +0.246 [+0.111, +0.381] | 724 |
| `serverAtRiskInstallOverride` | -3.8 [-6.1, -1.5] | -0.263 [-0.385, -0.145] | +0.142 [+0.033, +0.254] | 444 |
| `committedAgendaReserveBypass` | -4.0 [-6.6, -1.5] | -0.257 [-0.373, -0.139] | +0.208 [+0.096, +0.319] | 496 |
| `emptyArchivesRunPressure` | -3.6 [-6.1, -1.1] | -0.216 [-0.341, -0.092] | +0.163 [+0.057, +0.271] | 549 |
| `valuelessServerDebtReset` | +0.7 [-1.0, +2.4] | -0.033 [-0.117, +0.051] | +0.038 [-0.034, +0.111] | 251 |

The first four each clearly worsen scoring and win rate on this pool when
enabled alone. The fifth remains inconclusive. No gate is a universal claim
about strength against a human.

## How to switch gates for personal playtesting

Use the **fix branch's code**, or a branch into which it has been merged.
The original harness checkout still has the old unconditional behaviors.
In [ai_corp.js](../../ai_corp.js), find `CorpAI.DEFAULT_OPTIONS` at the bottom
(line 7023 in commit `28cc665`). This is the existing configuration object:

```js
CorpAI.DEFAULT_OPTIONS = Object.freeze({
  evidenceBasedHostedCardRez: false,
  secureScoringServerGate: false,
  serverAtRiskInstallOverride: false,
  committedAgendaReserveBypass: false,
  emptyArchivesRunPressure: false,
  valuelessServerDebtReset: false,
});
```

Change a named boolean in this source object, save it, reload the game so the
modified JavaScript is loaded, and start a fresh game as the human Runner
against the Corp AI. Ensure the local server serves this checkout. Setting
just `serverAtRiskInstallOverride: true`, for example, tests that behavior
against the new default. All five false is the recovered policy; all five
true restores the tested old-tip policy. Leave `evidenceBasedHostedCardRez`
false to retain the investigated settings. There is no new browser menu or
`config.js` setting for these options.

`Object.freeze` prevents mutating the defaults at runtime. Editing the source
object before loading is fine. The constructor copies it into the mutable
instance object `this.options` (line 6751). For a temporary browser-console
override when a game has a computer-controlled Corp, you can instead use:

```js
const corpPlaytestOptions = {
  secureScoringServerGate: false,
  serverAtRiskInstallOverride: true, // this experiment only
  committedAgendaReserveBypass: false,
  emptyArchivesRunPressure: false,
  valuelessServerDebtReset: false,
};
if (!corp.AI) throw new Error("This game needs a computer-controlled Corp");
Object.assign(corp.AI.options, corpPlaytestOptions);
console.table(corp.AI.options);
```

This changes the current AI instance only; a reload/new instance resets to
the source defaults. `corp.AI` is null when the Corp is human-controlled.
Apply console overrides before decisions you want to observe. They do not
undo previous installs, commitments or accumulated protection debt, so changing
gates halfway through a game is not equivalent to playing a fresh game with
those settings. Source defaults set before loading are the reliable way to
start a whole game with one configuration.

To find each gate's use quickly, search `ai_corp.js` for its option name.
At `28cc665` the uses are lines 630 (security admission), 4190 (install
override), 6457 (reserve bypass), 3564 (Archives admission), and 3466 (debt
reset). Line numbers may shift; names are the stable lookup keys.

The batch harness also accepts repeatable `--corp-option name=true` flags;
it records effective options and rejects unknown names. This does not configure
the browser. The prepared validation queue pins the committed build hash and
requires a clean tree, so editing defaults is for a separate playtest, not
rerunning that frozen queue with different code.

## Evidence, validation and next steps

Raw reports are in the original repository's ignored `bench/` directory:
`corp-options-default.json`, one `corp-options-<option>.json` per option,
and `corp-options-all-on.json`. Controls are `orig.json` (H0 plus shim),
`current.json` (old tip) and `causal-gate-and-four-off.json` (combined arm).
`compare-default.log` and `compare-all-on.log` record fidelity passes.
`compare-<option>.log` contains each single-option comparison, including
server theft, turns and paired intervals. H0 and tip recovery comparisons are
in `compare-orig-to-corp-options-default-h0-recovery.log` and
`compare-current-to-corp-options-default-h0-recovery.log` (reruns use suffixes).

The 41 unit test files passed, including decision fixtures and snapshots;
`ai-batch.test.js` was deliberately excluded because it launches batches.
Fixtures for the original reported situations retain their expectations and
explicitly enable the corresponding option. Unit coverage includes both gate
paths and the Archives/debt interaction. Browser human playtesting remains
outstanding. HQ's relative penalty, the secure-server +2 bonus and debt ranking
subtraction were not changed: the follow-up evidence did not justify including
them in this recovered default.

After PR review/approval, integrate this fix into the tested harness branch.
The owner intends to land the five or six dependent layers **between main and
that harness branch**, in dependency order from the layer nearest main upward,
ending with the harness layer containing this fix. Verify the actual branch/PR
dependency graph and required checks before each merge; this note does not
authorize automatic merges or pushes. Intermediate layers will not include
these gates until the fix-containing layer lands. Branches above the tested
tip need separate validation against the corrected baseline afterward.

The residual H0 scoring gap remains an investigation item. First-divergence
traces and agenda behavior collectors are also still outstanding; no exact
behavioral mechanism should be promoted from hypothesis to fact without them.
