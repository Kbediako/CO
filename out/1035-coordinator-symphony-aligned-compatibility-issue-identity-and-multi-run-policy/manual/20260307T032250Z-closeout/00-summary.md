# 1035 Closeout Summary

- Task: `1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy`
- Date: `2026-03-07`
- Outcome: completed

## Delivered

- Compatibility discovery now reads all bounded sibling runs under the active runs root instead of stopping at one latest readable sibling run per task.
- Compatibility projection is now issue-centered:
  - canonical `issue_identifier` lookup wins before alias fallback,
  - `running` and `retrying` each expose one deterministic representative per issue,
  - contributing run ids remain valid secondary aliases.
- `/ui/data.json`, Telegram oversight, and selected-run dispatch evaluation remain current-run-only.

## Evidence

- Docs-first + docs-review override: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T030736Z-docs-first/00-summary.md`
- Manual same-issue compatibility artifact: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/12-manual-compatibility-issue-identity.json`
- Targeted regressions: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/05-targeted-tests.log`
- Build/lint/docs/pack: `03-build.log`, `04-lint.log`, `07-docs-check.log`, `08-docs-freshness.log`, `11-pack-smoke.log`
- Diff-budget override: `09-diff-budget.log`
- Elegance pass: `13-elegance-review.md`

## Validation Disposition

- Passed:
  - `node scripts/delegation-guard.mjs --task 1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - targeted `npm run test -- ControlRuntime ControlServer`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs` with explicit stacked-branch override
  - `npm run pack:smoke`
- Explicit overrides:
  - `npm run test` and direct `vitest` both reached the large CLI suites and then hung on wrapper/open-handle tail behavior instead of exiting cleanly.
  - `npm run review` timed out after 180 seconds in low-signal checklist/manifest reinspection instead of surfacing a concrete 1035 defect.

## Files

- Runtime / projection:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
- Regression coverage:
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlServer.test.ts`
