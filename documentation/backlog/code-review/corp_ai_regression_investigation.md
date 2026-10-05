# Preserve the Corp AI regression investigation and its evidence

## Resolution

Implemented from `b52d451`.

This ticket tracks the original-versus-current investigation separately from
F4's seeded batch harness. The investigation documents and archived tools were
added in `7b28f2a`, under `documentation/corp-ai-regression/`.

- The findings record historical comparisons, causal variants and uncertainty;
  runbooks and the response plan distinguish completed experiments from future
  work. They do not authorize new batches or implement a production AI fix.
- The benchmark instructions use the selected H0 control `625b008:ai_corp.js`
  on the fixed `b52d451` chassis, with the agreed randomness and options.
- The evidence archive preserves 142 original JSON/log artifacts unchanged,
  including the early-policy follow-ups. Every archived byte was verified
  against its SHA-256 manifest, including the original 110-file manifest.
- The asset inventory provides fresh-checkout extraction and verification
  instructions and identifies local-only Git arms and temporary artifacts that
  still need backup.

## Acceptance criteria

- [x] Investigation findings, runbooks, response plan and tools are preserved
      separately from the F4 harness ticket.
- [x] The control instructions consistently select H0, rather than the owner's
      differently sized original-AI file.
- [x] Cited reports and logs are available from a fresh checkout, with checksums
      and extraction instructions.
- [x] Preservation claims distinguish committed assets from local-only material.

## Validation

Archive verification: 142 files, 28,970,468 uncompressed bytes; all checksums
match. Fresh extraction and changed-document links were verified.
`node tests/agent-scripts.test.js` and the Node 20 full regression suite
(42 test files, including Corp decision fixtures and decision snapshots) pass.
No benchmark or production gameplay change was performed for this ticket.

## Out of scope

New investigations, gating or enabling production AI options, and human
playtesting are separate work. The historical source SHAs remain fixed.
