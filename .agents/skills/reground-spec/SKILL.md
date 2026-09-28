---
name: reground-spec
description: Re-verify a Chiriboga roadmap spec's or ticket's claims, named functions/hooks and AI acceptance-gate classification against the current code, fix what has drifted, and set its Verified against code line. Use before `node scripts/roadmap.js raise <ID>`, when raise fails with a "code has changed since" error, or when asked to re-ground, re-verify or refresh a spec or ticket. Does not implement the change or judge whether it is still worth doing beyond reporting when the premise is gone.
---

# Re-ground a spec or ticket

Specs and tickets describe the code as it was on the day they were written.
Code keeps moving, so before anyone commits to a design
(`node scripts/roadmap.js raise`) or starts building it (`implement-ticket`),
its claims need re-checking against the code as it stands now. This skill is
that check, extracted so the procedure lives in one place: `implement-ticket`
runs it too, by name, rather than restating it.

## When to use

- Before `node scripts/roadmap.js raise <ID>` — it refuses when anything
  under the root `*.js` files or `sets/` changed since the spec's
  `**Verified against code:**` commit, which is true for almost every spec on
  an active repo.
- When `raise` already refused, quoting the changed files.
- When asked to re-ground, re-verify or refresh a spec or ticket.
- At the start of `implement-ticket`, for the ticket it just picked up — even
  if it already carries a recent `**Verified against code:**` line, since
  more code may have landed between raise and pickup.

## Steps

1. **Read the file** and note its current `**Verified against code:**` line
   (or its absence), plus anything it names under `**Read first:**`.
2. **List every claim to check:** every sentence in `## Current behaviour`,
   and every function, hook or field named anywhere in the document — Design,
   Test scenarios and Acceptance gate included. Naming a function in a Design
   section is still asserting it exists today and does what the spec says.
3. **Check each one against the code, not memory.** `node scripts/show.js fn
   <name>` gives a function's current body and line range; `rg -n <name>`
   finds every remaining call site. Read the whole function, not just the
   lines an earlier pass quoted.
4. **Re-check the gate classification for every AI-behaviour item.** Read
   "Acceptance gates" in `documentation/ai-planning.md` and decide from the
   current goal and evidence whether the expected result has an objective
   rules/legality/information-boundary oracle or is a strategic preference
   between legal choices. A deterministic scenario proves reproducibility,
   not strategic correctness. Require the exact, unnumbered headings
   `## Acceptance gate` and `## Acceptance criteria`; scripts parse them
   literally, and a missing section never means ungated. Add or correct:
   - `N/A — deterministic fix (principle 4): <the oracle>` for an objective
     change; or
   - a measurable numeric F4 or human-game gate plus the two gated acceptance
     criteria from the planning template for a strategic change.
   Report any classification change explicitly because it changes how the
   item can be adopted.
5. **Fix what drifted, in place:**
   - A renamed function, a moved line range, a changed count or percentage —
     correct the spec's text to match what the code does now.
   - A claim that's now wrong in a way that doesn't undermine the design —
     fix it and keep going.
   - A claim whose falseness removes the reason for the item at all (the
     problem was already fixed elsewhere, the function no longer exists, an
     assumption the whole design rests on no longer holds) — **stop**. Do not
     force a fix or reword around it. Report this instead of continuing.
6. **Record what changed.** A small drift gets a short inline note (matching
   how tickets already read, e.g. "(previously `_evaluateServerSecurity()`)").
   Anything that changes what the design should actually do — not just its
   wording — must say so explicitly in the report: silently patching a
   spec's prose to match new code while its Design section is now outdated is
   worse than leaving the mismatch visible.
7. **Set the header line** to the commit just checked against:
```markdown
   **Verified against code:** <short sha> (<date>)
```
   Add it directly under `**Read first:**` if it is missing.
8. **If this was to unblock a raise**, run `node scripts/roadmap.js raise
   <ID>` now and confirm it succeeds.

## Report

State, per item checked: confirmed unchanged / corrected (what, briefly) /
premise no longer holds (stop here, say why, and suggest whether the item
should be reworked or moved to `parked`). Re-grounding never changes an
item's status itself — that decision belongs to whoever reads the report.

## Draft mode (read-only agents)

Same constraint as `triage-log`: an agent that can read the repository but
not run commands does steps 1–2 and as much of 3–4 as GitHub search/browsing
allows, including a provisional gate classification, tags anything it could
not confirm against live code [Inferred], and
stops short of setting `**Verified against code:**` — that line asserts a
commit was actually checked, which a read-only pass has not done. Report what
would still need running (`node scripts/show.js fn <name>`, `rg -n`) for
someone with execution access to finish.
