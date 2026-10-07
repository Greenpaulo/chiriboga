# Corp AI: hosted ICE is never rezzed for its tax, even when the Runner will pay it run after run

**Outcome:** open
**Source log:** `documentation/debug-logs/bug_raised/corp_didnt_rez_ice_when_would_have_forced_runner_to_spend_creds.txt`
**Reproduction:** `tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js` — `node tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js` (fails at `5b8952f`, 2026-10-02)

Follows [corp-silently-declines-rez-of-ice-hosting-a-trojan.md](code-review/corp-silently-declines-rez-of-ice-hosting-a-trojan.md),
which tested two ideas and adopted neither. Read its Resolution for the
evidence.

## Summary
`_iceWorthRezzing()` declines to rez ICE hosting a non-exempt Runner card
unless the Corp has five times the rez cost. In the source log, the Corp had
12 credits and declined to rez Kessleroid (effective cost 3, hosting
Chromatophores) on a remote holding Project Ingatan. The Runner walked in and
stole the agenda. The Runner's Rising Tide breaks Kessleroid for 2 credits,
so rezzing would not have stopped that run. But the rez is paid once, while
the tax is paid on every run, so a server the Runner keeps attacking repays
the rez.

## Evidence
- Log lines 413–421: run on Remote 0, `Corp did not rez ice`, Project
  Ingatan stolen.
- Replaying the dump headlessly: the hosted-card veto declines ("hosted
  Chromatophores requires 15 credits ... (have 12)").
- Two earlier candidates (in the previous ticket):
  - Rez when the ICE would secure the server. Untested on the real board,
    and it never changes the logged case.
  - Always rez like unhosted ICE. Failed its F4 gate on the real board:
    `pointsStolen` +0.478 [+0.280, +0.675], `winRate` −0.036.

## Reproduction
`tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js` is the earlier
reproduction, moved back to pending unchanged. On an undefended remote, with
no breaker and affordable ICE hosting Chromatophores, it expects the rez.
Today it fails: `_iceWorthRezzing()` returns false through the hosted-card
veto. A candidate that rezzes when the ICE would secure the server passes
it. The tax case needs its own deterministic test (see criteria).

## Root cause
- [Verified] The hosted-card veto in `_iceWorthRezzing()` ignores what the
  ICE costs the Runner to pass. Reproduction above, and the replay in the
  previous ticket.
- [Inferred] Rezzing whenever affordable loses because a one-off rez against
  a breakable ICE costs the Corp more than it takes from the Runner, unless
  the Runner keeps running that server.

## Proposed fix
Behind option `taxAwareHostedIceRez` (default off), a non-exempt hosted card
no longer vetoes the rez when either of these holds:
- `_iceWouldSecureServer()` shows that the ICE stops the run; or
- the Runner's cost to pass this ICE (`min(bypassCost, mandatoryCost)` from
  `_securityIcePlanInputs()`, with hosted effects included) times the
  expected further runs through it is greater than the rez cost.

Expected runs come from public history only: the server's `AISuccessfulRuns`
and recent run pressure. A known derez trigger caps them, for example
Tranquilizer's counters left before it derezzes its host. Otherwise the veto
still applies and logs its reason.
- Rejected: a fixed tax-to-rez-cost ratio (a tuned constant), and rezzing
  whenever affordable (failed its gate).
- Open: whether the Corp's own credit needs should lower what a rez is
  worth. Read changed games with `node scripts/ai-batch.js replay ... --diff`.

## Acceptance gate
F4 gate. Option `taxAwareHostedIceRez` (Corp AI), off in the baseline and on
in the candidate. Committed deck pool, paired seeds, 200 games per deck pair,
bootstrap 95% intervals.
Collectors: none.
Starts: boards tagged `hosted-card-on-ice` and `agenda-in-remote`
(`--start-tag`; today
`tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt`, the
log's own board), with a fixed budget of 1,400 games per half.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolen` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsScored` | higher | regression at most 0.1 |

Gate command: `node scripts/ai-batch.js gate --corp-option
taxAwareHostedIceRez=true --start-tag hosted-card-on-ice --start-tag
agenda-in-remote --budget 1400 --improve pointsStolen --guard winRate=0.02
--guard pointsScored=0.1`

No deck-pool command: the hosted-card veto changed no deck-pool game in the
previous ticket's runs, so a pool command would fail `changed option effect`.
Points guards stay at 0.1, stricter than the template's 0.2, matching the
previous ticket.

Depends on: F4.

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged.
- [ ] A deterministic test covers the tax case: breakable ICE is rezzed when the Runner's cost to pass times the expected runs exceeds the rez cost, and is vetoed (with a logged reason) when it does not.
- [ ] Before planning, the log's board is replayed with the candidate off and on (implement-ticket step 3), and the candidate changes the logged decision.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] The gate is ready to run: at least one start board has its tags and is tested, and a `--quick` run of the gate command completes and reports at least one game changed by the options.
- [ ] Applicable gate evidence is recorded in the Resolution: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% interval, guarded-regression result, pass conditions and thresholds. Only then is the option switched on by default.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Scatter Field's install subroutine crash:
  [corp-install-choice-crashes-on-null-skip-option.md](corp-install-choice-crashes-on-null-skip-option.md).
- Real-board start library: roadmap item F10.
