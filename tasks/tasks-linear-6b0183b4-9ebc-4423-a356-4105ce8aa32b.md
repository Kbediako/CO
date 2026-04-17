# Task Checklist - linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b

- Linear Issue: `CO-207` / `6b0183b4-9ebc-4423-a356-4105ce8aa32b`
- MCP Task ID: `linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b`
- Primary PRD: `docs/PRD-linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md`
- Task spec: `tasks/specs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror drafted for CO-207. Evidence: docs packet paths above.
- [x] Pre-implementation issue-quality review notes captured before implementation. Evidence: `tasks/specs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b-docs-review-r3/cli/2026-04-16T23-02-20-276Z-280b30fb/manifest.json`.

## Linear / Delegation
- [x] `linear issue-context` inspected live team states before transition. Evidence: packaged `linear issue-context --issue-id 6b0183b4-9ebc-4423-a356-4105ce8aa32b --format json`.
- [x] Issue moved from live `Ready` to live started state `In Progress`. Evidence: packaged `linear transition --issue-id 6b0183b4-9ebc-4423-a356-4105ce8aa32b --state "In Progress" --format json`.
- [x] Workpad reused and pre-turn decomposition matrix recorded. Evidence: Linear workpad comment `3f679c93-c549-4628-a0e1-49035a428fc4`.
- [x] Parallelization decision recorded as `stay_serial / review_or_validation_only` for the validation-only opening turn. Evidence: packaged `linear parallelization` result.
- [x] CO-196 blocker intake checked. Evidence: local provider intake shows `CO-196.issue_blocked_by` includes CO-207.

## Evidence / Implementation
- [x] Required cloud canary current evidence captured before implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-required-r3/cloud-canary-required.log`.
- [x] Fallback canary current failure captured before implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-fallback-r3/cloud-canary-fallback.log`.
- [x] Fallback wrapper classification fixed without weakening non-fallback required cloud failure handling. Evidence: `scripts/cloud-canary-ci.mjs`.
- [x] Focused regression test added, including mixed missing-env plus token stderr coverage. Evidence: `tests/cloud-canary-ci.spec.ts`.

## Validation
- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [x] Focused fallback wrapper test. Evidence: `npm run test -- --run tests/cloud-canary-ci.spec.ts` (`3` tests).
- [x] Required cloud canary rerun passes after implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-required-r4/cloud-canary-required.log`.
- [x] Required fallback canary rerun passes after implementation and review fix. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-fallback-r5/cloud-canary-fallback.log`; manifest `.runs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b-cloud-fallback-r5/cli/2026-04-16T23-51-28-686Z-32b85d2e/manifest.json`.
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `npm run repo:stewardship`
- [ ] `node scripts/diff-budget.mjs`
- [ ] Manifest-backed standalone review completed before review handoff.
- [ ] Elegance review completed before review handoff.

## Handoff Status
- [ ] PR opened and attached to CO-207.
- [ ] Workpad refreshed with final evidence and review status.
- [ ] PR ready-review drain completed.
- [ ] Linear transitioned to `In Review` only after required validation, PR checks, ready-review drain, and latest `origin/main` merge are clean or explicitly waived.
