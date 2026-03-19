# TECH_SPEC: Coordinator Symphony-Aligned Frontend-Test CLI Help Surface Completion

## Context

The normal frontend-test request path is now extracted, but the subcommand help surface is still incomplete in the binary wrapper.

## Scope

- add bounded help handling for `frontend-test`
- preserve the existing request-shell and lower pipeline execution ownership
- add focused parity for the help path

## Requirements

1. `frontend-test --help` and `frontend-test help` must return help output without entering pipeline execution.
2. Preserve the current frontend-test execution behavior for non-help invocations.
3. Avoid widening into lower request-shell or pipeline execution logic.
4. Add focused tests that pin the corrected help path.

## Validation Plan

- targeted frontend-test CLI help parity
- targeted request-shell/helper parity as needed
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
