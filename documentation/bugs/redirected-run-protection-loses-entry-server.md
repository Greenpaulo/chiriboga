# Corp AI: redirected-run protection history loses the entry server

**Source log:** `documentation/debug-logs/bug_raised/corp_still_not_protecting_archives_from_baker.txt`  
**Reproduction:** `tests/pending/redirected-run-protection-retains-entry-server.test.js` — `node tests/pending/redirected-run-protection-retains-entry-server.test.js` (fails at `f795a63`, 2026-10-02)

## Summary

A redirected run has two distinct public facts: the server whose ICE route the
Runner traversed and the final attacked server where the successful access
occurred. Corp protection history currently retains only the final server. In
the captured Baker runs, HQ correctly remains the successful-run destination,
but Archives is lost as the unprotected route used to reach it; consumers can
therefore attribute the defensive failure to the wrong ICE path.

## Evidence

The source log records the same public route twice:

- Lines 122–126: `Run initiated attacking Archives`, `Attacked server changed
  to HQ`, then `Run successful`.
- Lines 171–175 repeat the Archives-to-HQ route.
- Line 586 later records the Corp installing another ICE protecting HQ, while
  Archives remained the route that Baker had traversed.

## Reproduction

The pending test reports a successful redirected route with HQ as its
destination and Archives as its entry, then rolls the existing recent
protection history. HQ correctly has one recent run, but Archives has zero:

```text
AssertionError: Archives must remain attributable as the ICE route traversed to reach HQ
0 !== 1
```

This test asserts route attribution only. It does not assert that the Corp must
install ICE on Archives or predict that an unavailable redirect will become
available again.

## Root cause

- **[Verified]** `_recordSuccessfulRunForProtection(destination, entry)`
  records only its first argument, so the reproduction observes HQ pressure
  `1` and Archives pressure `0` at `f795a63`.
- **[Verified]** `_evaluateServerSecurity(server)` evaluates the ICE and
  payment route of the single supplied server; it has no destination field or
  route object. This is directly visible in
  `_evaluateServerSecurityUncached()` and its server-local `_icePlanOutcome()`.
- **[Inferred]** `MakeRun()` initially assigns Archives to `attackedServer`,
  Baker later changes that global to HQ, and the successful-run phase passes
  only the final `attackedServer` to the Corp recorder. No separate declared
  entry survives at that boundary.

## Proposed fix

Preserve a generic redirected-run route with separate entry and destination
servers from `MakeRun()` through successful-run recording. Keep HQ as the
successful access destination, but make protection consumers evaluate route
security against Archives, the ICE path actually traversed. Direct runs have
identical entry and destination and must count once; unsuccessful or prevented
successful runs must create no successful-route observation; route state must
be cleared at run end.

Do not add a Baker title check or describe the event as a successful Archives
access. An implementation may use an explicit route object or equivalent
lifecycle state, but it must keep destination stakes separate from entry-route
security. Whether old route evidence should predict a future redirect that
cannot currently be paid is outside this deterministic fix.

## Acceptance gate

N/A — deterministic fix (principle 4): the declared entry server and final
attacked server are public engine facts, and security for a redirected route
must use the ICE path actually traversed rather than ICE bypassed by the
redirect.

## Acceptance criteria

- [ ] The reproduction passes and has moved into `tests/` with its expectation
      unchanged.
- [ ] A successful redirected run retains both entry and destination; a direct
      run counts once, and an unsuccessful or success-prevented run records no
      successful route.
- [ ] Route state is reset between runs and at run end.
- [ ] A security-attribution variation with different ICE on the entry and
      destination proves that entry ICE determines route security while the
      destination determines breach stakes.
- [ ] New or changed AI hooks are documented in `documentation/ai.md` (none
      expected).
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

- [Baker unavailable-Stealth-payment remediation](remediation/corp-not-protecting-archives-with-baker-backdoor.md)
  remains strategic: using an observed route to predict that an installed
  Stealth payment source will become usable again is default-off and F4-gated.
- The objective ticket does not choose a protection target or tune protection
  urgency.
