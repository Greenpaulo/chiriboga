# Corp AI investigation: recovery and asset inventory

Snapshot: 2026-10-05. Start with [runbook v2](../runbook.md),
then [findings](../findings.md). This directory preserves
the actual on-disk tools and runbooks used in the experiment. They are historical
snapshots, not permission to restart a completed queue.

## Resume contract

- The owner runs batches. The agent prepares a resumable queue, gives one command
  and stops. Never launch or poll a batch from the agent. Read-only comparisons
  and foreground smoke games are permitted.
- Preserve reports; an existing JSON means skip, not proof that the report is valid.
  Validate clean-tree metadata, source SHA, game count, failures, poolHash, seeds,
  starts, collectors and options before drawing conclusions.
- Fixed chassis is `corp-ai-tip` (`b52d451`), not whichever branch tip is current.
  Engine, Runner, sets, decks and harness must remain identical.
- Defaults: current Corp `evidenceBasedHostedCardRez: false`, Runner `{}`.
  H0 has empty Corp options because it predates that option; preserve H0 randomness.
- All historic runs use seeds 1–200 on five pairs (1,000 games). An agent must
  freeze a new experiment's selection criteria/guards before new outcomes.
  Investigate win rate and scoring together with server split and length.
- A timeout is a failed game, never an ordinary loss. Preserve it; do not rerun
  automatically. Compare common completed pairs and disclose missing games.
- Early #2/#3/#6/#7/#10 follow-ups and tip/combined ablations are complete; see the current findings. H1→H2 and late H0→H1 localization are complete.
  No new investigation, remediation or production option defaults are authorized
  by this archive alone.

## What is preserved, and what still needs backup

Documents, scripts, overlays and frozen inputs were preserved in `7b28f2a`.
The status table below reflects the current preservation state.

| Item | Location | Preservation status |
|---|---|---|
| Harness and comparison library | `scripts/ai-batch.js`, `scripts/ai-game.js`, `scripts/ai-batch/` | Already committed at b52d451 |
| Current infrastructure docs | `documentation/ai-batch-harness.md`, `documentation/legacy-ai-stack-validation.md` | Already committed |
| Investigation/benchmark docs | `documentation/corp-ai-regression/` | Committed in 7b28f2a |
| Historical harness shim helper | Original `~/bench/make-arm.sh`; copy here | Committed in 7b28f2a |
| Accepted F3/F6 overlays | Both `f3-f6-ai_corp-overlay*.patch` here and in `~/bench` | Committed in 7b28f2a; overlay changes also committed on arm branches |
| Queue scripts | Five `run-queue*.sh` copies here and in `~/bench` | Committed in 7b28f2a |
| Frozen pool/plans, report narrative, saved state | JSON/Markdown files here and in `~/bench` | Committed in 7b28f2a |
| Raw batch JSON, batch/comparison logs | Original `~/bench/`; verified local copy in repository `bench/` | 142 original JSON/log files archived here; `/bench/` remains gitignored |
| Smoke/hash acceptance artifacts | `/tmp/chiriboga-*` | Temporary disk only; may already be absent |
| First-divergence helper/agenda collector | Proposed in v1 | Not implemented or run in this investigation |
| Annotated `corp-ai-*` tags | Local Git refs | Created locally; not pushed |

The five queues are `run-queue.sh` (gate/ICE-weighting causal arms),
`run-queue-h0h1.sh`, `run-queue-h0h1-r2.sh`,
`run-queue-h0h1-causal.sh`, and `run-queue-gate-and-four-off.sh`.
The snapshots in this documentation directory retain their original absolute
paths. The working copies in repository `bench/` now derive the evidence folder
from the script's location, the harness repository from its parent, and sibling
worktrees from the repository's parent. They do not write into `~/bench/`.
Worktrees still need to exist at the expected names and SHAs. Copy and adapt a queue under a
new name before a new experiment; update expected HEAD, output labels, paths and
CPU count. Validate with `bash -n`. Only an approved future experiment may run it.

Archive the full `~/bench/` directory separately, including raw reports and logs.
On 2026-10-05 all 183 files (29,406,146 bytes) were copied to repository `bench/`
and verified byte-for-byte before any path edits. All 177 non-shell files were
then reverified unchanged; six working shell scripts received path-only edits
and passed `bash -n`. All 19 queued worktree HEADs were checked read-only.
The copied state file subsequently records this preservation step. Original
`~/bench/` remains untouched. The ignored copy is not a Git backup and will not
arrive in a fresh clone. The evidence archive below preserves the original
142 JSON/log files; additional working-copy artifacts still need separate backup.
[artifact-manifest.json](artifact-manifest.json) records checksums, full source
SHAs and report metadata for 110 JSON/log artifacts present at this audit.
It detects changed/lost evidence but cannot reconstruct a missing report.
Tags preserve code, not filesystem worktrees or additional disk-only evidence.
The committed documentation and evidence archive are preserved by Git history.

## Archived evidence

[evidence.tar.gz](evidence.tar.gz) contains all 142 JSON/log artifacts from the
original `~/bench/` (28,970,468 uncompressed bytes), including every report and
comparison log cited in the findings. Files retain their original bytes and
names. [evidence-manifest.json](evidence-manifest.json) records each size and
SHA-256 checksum; the original 110-file `artifact-manifest.json` remains a
historical metadata snapshot. Archive contents were verified against both
manifests. No batch was run to create this archive.

From the repository root, extract into a new directory and verify:

```sh
mkdir -p /tmp/chiriboga-pr13-evidence
tar -xzf documentation/corp-ai-regression/assets/evidence.tar.gz -C /tmp/chiriboga-pr13-evidence
python3 - <<'PYVERIFY'
import hashlib, json
from pathlib import Path
manifest = json.loads(Path('documentation/corp-ai-regression/assets/evidence-manifest.json').read_text())
root = Path('/tmp/chiriboga-pr13-evidence')
for entry in manifest['entries']:
    data = (root / entry['name']).read_bytes()
    assert len(data) == entry['bytes'], entry['name']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['name']
print(f"Verified {len(manifest['entries'])} evidence files")
PYVERIFY
```

These are existing experiment results, not authorization to execute archived
queues. Later artifacts outside this archive and temporary smoke evidence still
need independent preservation.

## Commit/tag manifest and reachability

Tags point to historical endpoints or exact benchmark arms as indicated.
The arm tags do NOT point to the corresponding historic policy commit.

| Tag suffix (`corp-ai-`) | Target | Policy source |
|---|---|---|
| h0 | 625b008 | H0 |
| h1 | 6281d7e | H1 |
| h2 | 1361c37 | H2 |
| h3 | f8aa2a5 | H3 |
| tip | b52d451 | fixed chassis/current baseline |
| arm-04 | ac4ed79 | #4 b28b7bf |
| arm-08 | 5d05f45 | #8 752dbf0 |
| arm-12 | 270abd9 | #12 5de59ce |
| arm-16 | 2121431 | #16 159a8d6 |
| arm-20 | d2d9160 | #20 bd9bd79 |
| arm-21 | 56ed6e9 | #21 5e6af68 |
| arm-24 | 5988b40 | #24 3c59ec1 |
| arm-25 | f498fdd | #25 a3d57d3 |
| arm-fa1182c | 81d354d | fa1182c plus seeded F3/F6 overlay |
| combined-gate-and-four-off | edc177a | current tip with five rejection/bypass conditions removed |

All nine arm commits and `edc177a` are on local-only `bisect-*` branches,
absent from every locally recorded remote-tracking branch. They are not ancestors
of the harness branch and will NOT be included by merging that branch.
H0, H1, H2, H3 and b52d451 are ancestors of the published harness branch.
These claims use local remote-tracking refs, not a fresh remote fetch.

A normal merge retains the harness history; a squash does not make all original
commits ancestors of the merged branch. Pushed tags independently preserve their
targets even if branches are later deleted. No push was performed. To preserve
the requested tagged targets, the owner may push just these tags:

```sh
git push origin 'refs/tags/corp-ai-*:refs/tags/corp-ai-*'
```

Other report arms are listed by full SHA in the artifact manifest, including
original shim `4cd91d1`, H1/H2/H3 shims, additional a2 arms and individual causal
arms. They were not all requested for tags. Back up the Git repository/objects
(e.g. an owner-run `git bundle create <backup-file> --all`) or push additional
chosen refs to preserve those exact arms too.

## Historical numbering

Exact `git rev-list --reverse 625b008..6281d7e -- ai_corp.js`:

| # | Historical commit |
|---|---|
| 1 | 97dfdfa098494fb3d40f7496e0c550a1dbd20fb1 |
| 2 | 7591eb447a837ec26b8ec0b95db93892d4ca0b66 |
| 3 | 95f2c157ea8eb6cfd99b9f428814f98f7dd75f44 |
| 4 | b28b7bf222e4825df65b8abe6e44759db24fbaa4 |
| 5 | 037a6a7fc0f322a92956a9fb11527d2157547468 |
| 6 | 32c481947422b847ceca6aa0f9c2b1a2b5d30049 |
| 7 | 03550cf38774b68fd2bbabaf73a85ca836242d65 |
| 8 | 752dbf06170b751d032fd08f3415f8fcf419bcd8 |
| 9 | 82d1387da8d5aafdb65c12baccd826a123b30971 |
| 10 | cc2777ee2e85e59abdcb73b9a7464e5f5635196f |
| 11 | 9a2c0b72a72079595de373cb010f719cc678d6a7 |
| 12 | 5de59ce19a1424343942874a7b10dd1d16c8c15d |
| 13 | c6dac43dde29dbe429a3caa718a271e00fbb7794 |
| 14 | d31811ea2a0919803b531cb02b14218df83099e7 |
| 15 | 3d14ba4586c7cf6aee55ffca6685cc5348fb5d0d |
| 16 | 159a8d6b3c1b811afa12ad7e9942760f4f3dcac6 |
| 17 | 7472a0c0807aa5cd5ba3742a3b7ae37bbce6811a |
| 18 | d12c5ec285b0d09d64407203299d7cc12483b0a3 |
| 19 | 86a898fde7e7694a385f9525345c1aa2a7879445 |
| 20 | bd9bd79ee517a93ea47e4f2ef621f0b8154c315b |
| 21 | 5e6af68402e9dc6505916072c7c2e11b8c985762 |
| 22 | 87243c09b46cbd84b87e2ba38f72a3bc0bf3fc7c |
| 23 | c143116455b7c84513b6ad5d38915278ebaecdc7 |
| 24 | 3c59ec138c3032879c0cf3e3043db384623ebdb8 |
| 25 | a3d57d3b5029be3888d0812ed783aaba11a20560 |
| 26 | f234aa5e788d451422b0d474e3caf8d1e7a239da |
| 27 | 35ca729024fb3a33846f817007be56d305736f66 |
| 28 | 4dfe2612c05a3bb80823d130c4de2dd2dfb17652 |

#28's ai_corp.js equals H1; #27→H1 measures #28's changes. It does not mean
#27 and #28 are identical. Reports retain exact arm SHAs in the manifest.

## Reconstructing arms and the shim

For an existing tagged arm, recreate a worktree directly from its tag rather
than rebuilding its source. For example:

```sh
git worktree add --detach ../recovered-corp-ai-arm-21 corp-ai-arm-21
```

For new historical points, `make-arm.sh` is the exact repaired helper used.
It fixes the original macOS sed first-match/wrapper insertion error. It is
macOS/BSD-sed specific, embeds this owner's paths in this historical snapshot
and emits CRLF shim lines. The working `bench/make-arm.sh` uses derived paths.
Adapt paths and newline handling before use on another machine or an LF-only
source; inspect the diff/line endings and confirm telemetry wrapper detection
means actual telemetry, not merely another `DecisionSnapshots` reference.
Do not copy later policy/default options into historical files.
The expected shim is empty DEFAULT_OPTIONS, constructor options assignment,
and a Choice→_choiceInner timing wrapper. Full-game hashes are unaffected by
timing, but measured latency can be unavailable where an existing historical
DecisionSnapshots reference prevented wrapper insertion.

## Exact F3/F6 recovery recipe

F3 is `cd95844`; F6 is `806922f`. They are native in b52d451. Do not
cherry-pick all files from those commits into an old arm: the first broad attempt
conflicted and touched unrelated files.

1. Preserve the clean shim-only arm. The original patches mix CRLF/LF context;
   the readable `.patch` copies here have normalized LF and must not be applied
   directly. The `.patch.base64` copies preserve exact original bytes. Decode
   those first (macOS `base64 -D`, Linux `base64 -d`) into a fresh external patch
   path, then try `git apply --check`. Pre-seeded patch is
   `f3-f6-ai_corp-overlay.patch`; seeded descendants use the `-seeded` variant.
2. If clean, apply only that ai_corp.js patch, inspect the diff and commit.
   H1's shim arm accepts the pre-seeded patch cleanly; H0 and the six Round-1
   midpoints did not. All H0→H1 reports used unpatched files.
3. The accepted manual #72accd2 port preserved the existing Choice wrapper,
   added F3's cache lifetime, and resolved F6's conflict in `_securityBoardKey`.
   The actual accepted delta is reproducible from the overlay commit:
   `git diff 2dff323^ 2dff323 -- ai_corp.js`.
   The pre-seeded patch is the saved implementation, rather than an instruction
   to guess which side of a conflict to take.
4. #fbe132e required combining the seeded-random wrapper and cache wrapper;
   exact delta: `git diff a0e2579^ a0e2579 -- ai_corp.js`.
   #fa1182c accepted the seeded-compatible patch:
   `git diff 81d354d^ 81d354d -- ai_corp.js`.
5. A manual port is bounded to three attempts or ten minutes, then queue
   unpatched and record why. A successful manual port must reproduce winner,
   errors and all log hashes against its preserved unpatched arm for both
   Gateway and PD–Tao seeds 1–10, with about-two-second game times.
   Foreground ai-game smoke checks are not batch report replays.
6. Spot checks passed, but full-pool comparison to unpatched H2 matched only
   998/1,000 hashes. Therefore the overlay is NOT proven behavior-neutral.
   Do not conceal the two btl-kit divergences or treat matching averages as
   exact fidelity. Prefer consistent overlay treatment within an experiment;
   disclose existing mixed-overlay checkpoint comparisons.

## Replaying and causal attribution

`ai-batch.js replay` does not exist. ai-game uses a different random stream
prefix and cannot hash-reproduce a batch just by using the same numeric seed.
A batch replay helper must call that arm's headless `playGame()` with the exact
batch stream prefix (`<seed>:<pairId>`), set files, options, starts, telemetry
and observation configuration. Validate winner/errors/logHash against the
actual report before reasoning from a trace.

No first-divergent decision trace or agenda-install collector was completed.
Server-shift explanations remain inferences. Timeout seed 117's stalemate was
inspected; debt-aging seed 67 is only known to have timed out, with no recorded
errors. It has not been diagnosed as a stalemate or ruled out as a loop.

For causal arms, record the base, each changed consumer and shared dependencies.
The old Archives ablation changed shared _nothingWorthProtecting and therefore
also influenced debt aging. The combined arm disables both; an allocation-only
future arm must preserve the aging consumer. No option-based build was created
or validated here: edc177a hard-codes changes to five conditions. Any future
option-based equivalent should first match its full-pool log hashes on identical
inputs before using it as the same measured candidate.

## Follow-up evidence after the original asset snapshot

The early checkpoint/causal and combined-build reports now exist in `~/bench/`;
see [the updated findings](../findings.md#updated-early-localization-and-gating-assessment-2026-10-05)
for exact arms, comparisons and gating classifications. The original checksum
manifest and archived state above are historical snapshots and do not cover
these newer reports, logs or queue scripts. Extend the external backup before
relying on those artifacts for recovery. No tags, manifest, raw evidence or
archive copies were changed by this documentation update.

The investigation docs are grouped in `documentation/corp-ai-regression/`, with
these preserved assets in `assets/`. Archived tools and narratives retain their
original paths as historical evidence; use the working `bench/` copies for relocated
commands. Moving this directory did not alter the archived asset payloads.
