# Vantage Point batch 8 independent review

- Date: 2026-10-06.
- Reviewer: Codex, independent batch reviewer in the coordinated full-set audit.
- Exact IDs: 36036, 36037, 36038, 36039, 36040.
- Verdict: **Changes required**.
- Reviewed commit: `bd733d65f3bb9aa104083edb335f7a137e94d3c3` (saved review WIP; production source unchanged from `45833a14c83fef2f9ce71506d344460181445021`).
- Worktree: `/private/tmp/chiriboga-vantagepoint-set-review`. Initial status contained an untracked images symlink; review probes/documents subsequently changed. No production or existing-test edits were made by this reviewer.
- Source/test/probe identity: [SHA-256 manifest](probes/vantagepoint-batches-5-9.sha256).
- Reproduction: `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-5-9.js`, 39 current-behavior scenarios pass on Node 20.19.0. These assertions preserve defects as observed; they are not repair tests.
- Shared full regression, integration/deck checks and headless smoke: use the coordinator's isolated-worktree results in [the set review](vantagepoint-set-review.md). The earlier main-worktree green run is not substituted for that revalidation.

The probe loads actual card definitions, both AI classes and RunCalculator. It reuses the public-board adapters from `corp-server-security.test.js`, with actual `CheckInstall`, `CheckPlay`, `CheckActionClicks`, `CheckSteal`, `FullCheckPlay`, play/steal click costs and install-option builders. Remote servers have no `cards` field. Move/draw/damage and deferred UI decisions are isolated adapters; they do not constitute browser or complete-engine playthroughs. Actual selectors/planners are not stubbed. Existing integration assertions were read and run as mechanic evidence, not accepted as proof of strategy.

## Per-card evidence

| Card | Strategic role and actual consumers | Contrasting evidence | Verdict |
|---|---|---|---|
| 36036 Méliès U | Central filtering/recursion and front-side economy; inline department/trash choices, real Corp preferred consumer | Existing integration checks flip/matching department/economy/render state. Real Corp selector loses an explicit Keep preference due to department decision title mismatch and chooses Trash. Legitimately revealed top-card selection does not itself violate R&D information rules. | Changes required: B8-1 |
| 36037 Lotus Haze | Redeploy finite upgrade defenses; legal move enumeration, inline gain/destination selector | Source/Region exclusions pass focused integration. Real ability selector and destination consumer move The Red Room from HQ to an agenda remote, contrary to central-only restriction. | Changes required: B8-2 |
| 36038 Esca | Mandatory access punishment, stronger against tagged Runner; Corp `_accessPunishmentSeverity` and Runner approach planner | Corp consumer rates facedown Esca 1 untagged / 2 tagged. With visible Esca and tagged Runner, actual calculator accepts a zero-damage route even though access inflicts mandatory net damage. Existing tests check credit loss, tag condition and reveal cleanup. | Changes required: B8-3 |
| 36039 ezaM | Filter R&D and raise later ICE strength; actual Corp preferred selection/paid swap enumeration and run effect consumer | Real Corp choice moves a legitimately viewed agenda to bottom, holds a non-agenda. Paid selector offers greater-depth swap, declines equal depth/no clicks. A counterexample uses the actual move resolution and opens a previously locked winning agenda remote. Existing actual `ValidateEncounterPoint` checks route-wide +1 and sibling branch immutability; swap/cleanup mechanics pass. | Changes required: B8-5 |
| 36040 Knowledge Seeker | ETR plus purge clock/R&D arrangement; actual arrangement selector, ICE model, encounter/purge continuation | Legitimate arrangement during R&D run promotes a stealable winning agenda above filler; answer/break of final ETR makes this material. Existing integration exercises three-counter purge/derez, ordering and two-counter model; shared continuation tests pass. | Changes required: B8-4 |

## Supported findings

### B8-1 — Méliès U's preferred option is ignored because titles differ

**Location:** `sets/vantagepoint.js:2942–2989`; `ai_corp.js:7005–7012`.

Top R&D card has ELO 1900; Archives has an ELO-1000 operation. The identity deliberately sets Keep as its preference. However `preferred.title` is the front identity title while the actual DecisionPhase title is `Tenure Floors` (and analogously the other departments). Real `CorpAI.Choice` rejects the preference and defaults to first option, Trash. The useful top card is sacrificed despite the card's own decline policy.

**Repair criterion:** make the real decision context and preference agree for all department faces and both deferred stages. Exercise real selectors in keep/trash contrasts, useful Archives target selection, empty Archives and correct hidden-information visibility.

### B8-2 — Lotus Haze allows an illegal move of a central-only upgrade

**Location:** `sets/vantagepoint.js:3065–3083`, `:3135–3161`; restriction declared at `sets/vantagepoint.js:3901`.

The Red Room is rezzed in HQ and Lotus Haze has a counter. Its destination list includes a remote. The actual gain-based selector prefers an agenda remote; the actual destination choice then moves Red Room there and spends the counter. The move filters only source and Region occupancy; it never checks `installOnlyIn`/the ongoing location restriction.

This is a demonstrated rules defect, not merely a placement preference. [Null Signal Comprehensive Rules v26.03, rule 8.5.12](https://rules.nullsignal.games/) specifies that server-only upgrade restrictions apply continuously, including moving or swapping an inactive upgrade to a forbidden server.

**Repair criterion:** apply the shared location restriction to every legal move destination and resolution safeguard; preserve Region/source checks and rezzed state. Test Red Room against all three allowed centrals and forbidden remotes, plus an existing remote-only upgrade. Re-review relevant cross-batch relocation consumers.

### B8-3 — Runner route planning ignores known Esca damage and credit loss

**Location:** `sets/vantagepoint.js:3184–3222`; `runcalculator.js:990–1088`.

A visible/rezzed Esca is the only root card in an open remote. Runner is tagged and has a zero damage allowance. The actual calculator returns a complete route, charging its generic trash approach cost but omitting mandatory access damage. Esca's access unconditionally loses one credit and does one net damage when tagged. A tagged empty-grip Runner would flatline; the existing Corp hook is consumed only by Corp bait/punishment policy, not Runner approach planning.

**Repair criterion:** supply a safe public access-effect contract consumed by the Runner model, including mandatory credit loss, damage, prevention and whether the intended access/trash remains affordable. Contrast tagged/untagged visible Esca, zero/adequate grip, hidden-card priors and reveal/reset lifecycle. Do not inspect hidden central contents.

### B8-4 — Knowledge Seeker puts a winning agenda on top during the current R&D run

**Location:** `sets/vantagepoint.js:3381–3409`.

Runner has 5 points and has answered Knowledge Seeker's final ETR. R&D's looked-at group contains a 2-point agenda (ELO 1600) and a lower-valued operation (1200). The ascending order adds 300 to agenda value, placing the winning agenda on top. A legal alternative orders the non-agenda above it, avoiding the imminent single-access loss. The highest future draw is not the correct objective while the current R&D breach is in progress.

**Repair criterion:** rank current breach safety ahead of future draws, respect actual access count and immediate loss, then compare useful draws. Exercise broken ETR, stopping ETR, multi-access, current-run versus out-of-run resolution (including Unleash), and legitimate reveal/visibility cleanup.

## Verification and limits

### B8-5 — ezaM trades away the ICE that prevents a winning agenda breach

**Location:** `sets/vantagepoint.js:3267–3283`.

The Corp has one action click. HQ has ezaM; a remote has two rezzed Ansel 2.0 ICE and a known 2-point Lotus Haze. Runner has 5 points and no killer. With three clicks left after initiating the next run, the actual RunCalculator finds no complete route through the remote: both Ansel paid breaks need four clicks. The depth-only selector offers swapping ezaM with Ansel because the remote has two ICE versus HQ's one. After the actual swap resolves, the remote has ezaM plus one Ansel and a complete three-click route exists. The paid swap therefore destroys the defense of a winning agenda while adding no needed protection to agenda-free HQ.

**Repair criterion:** evaluate protection outcomes for both affected servers and preserve game-saving layers; decline this swap. Keep useful outer-position strength-boost placements, clocks, paid-click affordability and a no-benefit decline. Compare the same public board before/after without leaking hypothetical mutations.

Focused commands rerun in the isolated worktree with `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node`:

- `tests/vantagepoint-integration.test.js`: pass.
- `tests/forfeit-restriction.test.js`: pass.
- `tests/play-and-steal-cost.test.js`: pass.
- `tests/subroutine-visual.test.js`: 76 ICE checked, pass.
- `tests/corp-install-destination.test.js`: pass.
- `tests/corp-server-security.test.js`: 145 cases pass.
- `tests/mycoweb-rez-discount.test.js`: 5 cases pass.
- `documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-5-9.js`: 39 scenarios pass as current behavior.

All allocated cards were inspected against printed metadata, implementation notes, hook contracts, engine consumers and relevant AI architecture. Public-board decisions and legitimate revealed-R&D choices were traced; no new hidden-information violation was demonstrated. Existing generic architecture limitations are not waived by this report. Scenario coverage is bounded, not proof of optimal strategy or every interaction. No browser playthrough was performed by this reviewer; manual coverage belongs to the set report. Repairs require green strategic tests for the specific findings, focused mechanics checks, the full suite, and independent re-review. The coordinator owns tracker/backlog changes.
