# Engine: Beta Build uses the program-selection click to choose the run server

**Outcome:** adopted

## Resolution

Implemented from `ae70b76`, 2026-10-23.

Beta Build now enumerates program/host choices independently of run destinations.
After the real install-completion callback, including install responses, it
enumerates the current servers and opens a separate Runner decision. Only that
decision's resolution sets the run flag and calls `MakeRun`. Ignoring installation
costs, shuffling, hosted installation and the existing return/uninstall handlers
are preserved. Shared UI and gameplay engine functions are unchanged.

This is the objective choice-boundary fix described by the Acceptance gate,
not strategic tuning. `AIPreferredPlayChoice` retains its existing missing-breaker
preference over program choices. The subsequent decision uses the existing
top-ranked server when still legal, otherwise its first legal choice. The hook
signature is unchanged; the separated choices are documented in
`documentation/ai.md`. No existing Runner architecture description changes.

The pending reproduction moved byte for byte to
`tests/beta-build-program-click-selects-server.test.js`; its original pending
path remains below. `node tests/beta-build-program-click-selects-server.test.js`
passes all three cases. `node tests/vantagepoint-integration.test.js` passes its
existing checks and nine real-engine scenarios: each offered destination
(including a server created by an installation response), a hosted install,
the preferred AI server, a stale AI server fallback, and an uninstalled target.
These exercise actual clicks with one eligible program, install phases, nested
install-response decisions, independent server resolution, ignored costs,
shuffle, return/uninstall behavior, and intentional composite drag selection.
Headless visual sprites are stubbed; exact browser stack-grid placement remains
outside automated coverage.

**Untracked reproduction SHA-256:** `1474e80ce7e2f760308534cde8493cd85f63224e54d2eea3f7aa1f5d6928b41d`

Workflow deviation: the reproduction arrived untracked, and neither the starting
commit nor Git history contains its pending version. A copy saved before
implementation supplies the digest above. To meet the approved plan's requirement
to validate it without committing, `scripts/ticket.js` now accepts a documented
SHA-256 fallback only when Git cannot provide the original. It requires the
entire green file to match, fails on a malformed/mismatched recorded digest, and
leaves the Git comparison unchanged when history exists. Focused tests in
`tests/agent-scripts.test.js` cover unchanged bytes, altered assertions, added
comments, missing baselines and malformed hashes. `tests/README.md` documents
the convention. The helper and AI-hook documentation checks pass.

Final verification: `node scripts/ticket.js check documentation/bugs/code-review/beta-build-program-click-selects-server.md`
passed on Node v20.19.0, exit 0: all 116 full-suite test files passed, including
decision fixtures and snapshots; the original-reproduction checksum comparison
also passed. Output: `/tmp/beta-build-ticket-check.log`; exit status:
`/tmp/beta-build-ticket-check.exit`. No commit made.

## Implementation plan

Proposed at `ae70b76`, 2026-10-23. **Approved 2026-10-23.**

- **Validation:** On Node v20.19.0, the pending reproduction fails in all three cases for the stated reason: the program click starts a run on R&D, Archives or Remote 0 according to pointer position. The current card definition forms a program/host/server Cartesian product and calls `MakeRun(params.server)` from its install-completion callback. `ChoicesArrayInstall` already supplies the legal program/host options independently. `Install` invokes `onInstallComplete` after `responseOnInstall` responses finish, so the existing completion boundary supports the proposed separate prompt. The exact logged screen layout remains unverified and is not needed for the fix. The three untracked files at pickup are this ticket, its source log and its pending reproduction; all belong to this task. No linked roadmap item was found.
- **Classification:** Objective choice-boundary correction under the existing Acceptance gate: a program-selection click cannot announce the attacked server. Preserve the AI's existing preferred-program and top-ranked-server policy across two decisions; this does not introduce a new strategic preference or need a simulation gate.
- **Approach:** In `sets/vantagepoint.js`, return program/host install choices without run-server fields. In the existing installation-completion callback, enumerate the then-current servers and open a Runner `DecisionPhase`; only its resolution starts the run. Preserve ignored costs, shuffle, host selection and the existing return/uninstall lifecycle. Adapt Beta Build's `AIPreferredPlayChoice` to select the program independently, and use the existing Runner AI preference mechanism for the subsequent server decision, retaining a legal fallback when the previously ranked server no longer exists. Keep the shared hook signature and shared UI, engine and AI consumers unchanged. Reject a global click-filter change because intentional install/run dragging uses the same handlers.
- **Tests:** Move the pending reproduction into `tests/` with assertions unchanged. Extend coverage for one eligible program and hosted choices. Update Beta Build's existing case in `tests/vantagepoint-integration.test.js` to explicitly resolve the new server prompt instead of passing a composite option and expecting an immediate run. Exercise real installation and decision phases, including install responses changing available servers; verify no early run, one run per selected destination, ignored costs, shuffle, return/uninstall behavior and AI completion of both choices. Check intentional drag-to-server behavior remains covered. Run affected focused tests while implementing, then one final full `node scripts/ticket.js check <code-review-ticket>` after documentation and movement are ready.
- **Risk:** The existing green integration test explicitly expects a composite program/server option and an immediate run. Its expectation must change to reflect the corrected phase boundary; this triggers the skill's approval requirement. AI preference consumption and installation-response ordering are the main interaction risks and need direct coverage. The pending reproduction is currently untracked, so final validation must also resolve the workflow check's original-reproduction comparison requirement without committing.
- **Docs:** Document Beta Build's separated program/server AI choices in `documentation/ai.md`; update this ticket's Resolution and acceptance criteria, then move it with `ticket.js move` to `code-review/`. No shared AI hook contract change is planned. Update architecture documentation only if validation finds an existing description affected by this change. Do not commit.

**Source log:** `documentation/debug-logs/bug_raised/beta_build_gives_no_server_choice.txt`
**Reproduction:** `tests/pending/beta-build-program-click-selects-server.test.js` — failed at `ae70b76`, 2026-10-23; moved unchanged to `tests/beta-build-program-click-selects-server.test.js`, passes with `node tests/beta-build-program-click-selects-server.test.js`.

## Summary

When a human Runner selects a program from the stack for Beta Build, the engine also selects whichever server lies beneath the pointer. The program installs and the run starts without a separate server choice. The user confirmed that the stack cards appear for selection and the server beneath the clicked card becomes the run target. Program selection must finish independently, followed by installation and a separate “choose server to run” step.

## Evidence

Source log excerpts (original line numbers, preserved in the archived file):

```text
142 Played Beta Build
143 Runner installed Unity
144 Run initiated attacking R&D
...
210 Played Beta Build
211 Runner installed Unity
212 Run initiated attacking Archives
...
224 Played Beta Build
225 Runner installed Unity
226 Run initiated attacking R&D
```

The log records outcomes, not pointer coordinates or UI prompts. The user's follow-up supplies the observed interaction; the reproduction independently demonstrates the coordinate-dependent selection. This is an engine/UI issue affecting the human Runner, not a Corp or Runner AI strategic decision. No matching ticket was found across `documentation/bugs/` and `documentation/backlog/`, including completed tickets.

## Reproduction

The pending test loads the real Vantage Point definitions, `command.js`, and `utility.js` in a VM. It reconstructs a minimal program-selection state with Unity and Carmen in the stack and four existing servers. It calls the real `ResolveClick` handler for Unity with the pointer over R&D, Archives, then Remote 0 in independent cases. Install legality, shuffle, installation completion, timers and DOM rendering are isolated; the actual card enumeration/resolution, availability logic, mouse/server geometry and choice resolution run unchanged.

Each case first verifies that both programs are offered and that Unity installs. It then asserts that no run has begun and that a separate Runner server-choice prompt offers all four destinations. Current output is `Beta Build server choice: 0/3 passed, 3 failed.`, with the first failing assertion in each case:

```text
program selection must wait for a separate server choice; pointer over R&D
actual: ['R&D']; expected: []
```

The other cases similarly produce `['Archives']` and `['Remote 0']`. These are the reported failure, not harness errors. The test reconstructs the interaction rather than replaying the entire logged game; browser rendering and the asynchronous install pipeline are outside its coverage. It computes its root to run unchanged after moving into `tests/`. Shared harness files are unchanged; pending tests are outside green-suite discovery, so no fast/full run is required for this triage.

## Root cause

- [Verified] Beta Build's `Enumerate` combines program/host and server into each option; its `Resolve` installation-completion callback invokes `MakeRun(params.server)` without a separate server prompt — exercised by the pending reproduction above at `ae70b76`.
- [Verified] `GetAvailability` treats these program options as draggable because they contain host/server fields. `ResolveClick` consequently filters matching program options with `MouseIsOverServer`, and `ResolveChoice` commits the resulting composite option. Changing only the pointer position changes the run destination — all three pending reproduction cases.
- [Inferred] The displayed stack grid's screen placement explains the particular R&D/Archives destinations in the log. Pointer positions are absent from the log, so the exact layout cannot be recovered from it.

Rules oracle: local `Null_Signal_Games_Netrunner_Comprehensive_Rules_v26.03.pdf`, §§6.3.2 and 6.9.1a, says the Runner announces the attacked server. Beta Build's card text installs the program, then instructs the Runner to run any server. The UI must obtain that server choice explicitly rather than infer it from the previous program-selection click. This is an objective choice-boundary correction, not a claim about which server is strategically best.

## Proposed fix

Separate Beta Build's program/host choices from its run-server decision. After the installation finishes, offer a Runner `DecisionPhase` over the then-current legal server choices, and call `MakeRun` only from that decision's resolution. Preserve ignoring install costs, stack shuffling, install-response ordering, target tracking, and the end-of-run return effect. Check how the existing `AIPreferredPlayChoice` and Runner AI consumers should select the program and the subsequent server independently; document changed hooks.

Avoid a global change to drag-to-server behavior: ordinary install/run interactions rely on it. Do not add title checks in shared UI/AI code or retain a server selected from incidental coordinates. Recheck install-response timing and current legality helpers during implementation, including any server changes caused by installation.

## Acceptance gate

N/A — deterministic fix (principle 4): selecting the program cannot commit a run destination; the Runner must explicitly choose a legal server after installation before the run starts.

## Acceptance criteria

- [x] The reproduction passes and moves into the green suite (`tests/`), expectation unchanged.
- [x] Selecting a stack program with the pointer over different servers produces a separate server choice, including with only one eligible program.
- [x] Choosing each offered destination starts exactly one run on that server, after install completion and responses; exercise the real install/decision pipeline as well as the isolated UI regression.
- [x] Preserve hosted installation choices, ignoring costs, stack shuffle, and end-of-run return/uninstall behavior.
- [x] Runner AI can complete both decisions with legal choices; preserve existing intentional drag-to-server interactions elsewhere.
- [x] New or changed AI hooks are documented in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes (through the final full ticket check).

## Out of scope / related

No gameplay fix is included in this triage. Existing Beta Build coverage in `tests/vantagepoint-integration.test.js` supplies a fully formed program/server option directly to `Resolve`, so it does not exercise the human program-selection click. Exact browser grid placement remains unverified; the mechanism and separate-choice requirement are established.
