# Windows checkouts use CRLF and break repository tests

## Resolution

Implemented from `2c9ad2a`.

Added a repository-wide Git text policy that checks detected text files out with
LF line endings on every platform. This preserves the line-ending convention
already stored in the repository and prevents Windows `core.autocrlf` settings
from changing JavaScript, Markdown, and JSON inputs into CRLF.

The reproduction was moved unchanged into the green suite as
`tests/repository-line-endings.test.js`.

## Diagnosis

On a Windows Git Bash checkout, the full suite failed in
`agent-skills.test.js`, `ai-roadmaps.test.js`, and `card-status.test.js`. The
first two contain checks for LF-delimited Markdown structure, while the third
compares generated LF output byte-for-byte with a tracked Markdown file.

The repository did not contain a `.gitattributes` file, so Git was free to use
the user's `core.autocrlf` setting. With CRLF working-tree files, those tests
failed even though the same commit passed on a default macOS checkout.

The reported `flipped-identity.test.js` failure is separate: its Dewi reverse-side
image was genuinely absent and is not treated as part of this portability bug.

**Reproduction:** `tests/pending/repository-line-endings.test.js` failed at `2c9ad2a`, 2026-09-28; moved unchanged to `tests/repository-line-endings.test.js` after the fix.

## Acceptance gate

N/A — deterministic repository portability fix: Git must give supported text
inputs the same LF representation on Windows and macOS.

## Acceptance criteria

- [x] Git reports `eol: lf` for representative tracked JavaScript, Markdown,
  and JSON files.
- [x] The Windows-only CRLF failures are prevented without weakening their
  assertions.
- [x] The full green regression suite passes; the unrelated missing Dewi image
  remains an independently reported environment/content failure if present.

## Verification

- `node tests/repository-line-endings.test.js`
- `node tests/agent-skills.test.js`
- `node tests/ai-roadmaps.test.js`
- `node tests/card-status.test.js`
- `node tests/run-all-tests.js` — 37 test files passed, including the Corp
  decision fixtures and decision snapshots.
