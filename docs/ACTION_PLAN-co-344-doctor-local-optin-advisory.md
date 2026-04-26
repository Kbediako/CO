# ACTION_PLAN - CO-344 Doctor Local Opt-In Advisory

## Steps
1. Register CO-344 docs-first packet and mirrors.
2. Keep the implementation bounded to doctor aggregate status and focused coverage.
3. Validate with focused doctor tests plus docs/guard checks.
4. Open and merge a small follow-up PR.
5. Close CO-344 after the PR reaches terminal merged state.

## Validation
- `npm run test:core -- orchestrator/tests/Doctor.test.ts`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `node scripts/delegation-guard.mjs`
- `npx eslint orchestrator/src/cli/doctor.ts orchestrator/tests/Doctor.test.ts`
- `git diff --check`
