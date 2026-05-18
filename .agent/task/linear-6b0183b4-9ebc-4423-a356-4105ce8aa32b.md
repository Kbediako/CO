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
- [x] Parallelization decision recorded for the current merged-branch turn as `forbid_parallel / parent_only_mutation` after `origin/main` reconciliation exposed parent-owned conflicts in `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and `tasks/index.json`. Evidence: packaged `linear parallelization` result on 2026-04-17.
- [x] CO-196 blocker intake checked. Evidence: live `linear issue-context --issue-id CO-196 --format json` shows `Blocked` / `started`; local provider intake shows `CO-196.issue_blocked_by=[CO-207 / In Progress / started]`.

## Evidence / Implementation
- [x] Required cloud canary current evidence captured before implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-required-r3/cloud-canary-required.log`.
- [x] Fallback canary current failure captured before implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-fallback-r3/cloud-canary-fallback.log`.
- [x] Fallback wrapper classification fixed without weakening non-fallback required cloud failure handling. Evidence: `scripts/cloud-canary-ci.mjs`.
- [x] Focused regression test added, including mixed missing-env plus token stderr coverage. Evidence: `tests/cloud-canary-ci.spec.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (12 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] Cloud-canary regression coverage exercised on the merged branch. Evidence: `npm run test` passed on the merged branch (`344` files / `4014` tests), covering `tests/cloud-canary-ci.spec.ts` and `tests/cloud-canary-ci-classification.spec.ts`.
- [x] Required cloud canary rerun passes after implementation. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-required-r4/cloud-canary-required.log`.
- [x] Required fallback canary rerun passes after implementation and review fix. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/cloud-canary-fallback-r5/cloud-canary-fallback.log`; manifest `.runs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b-cloud-fallback-r5/cli/2026-04-16T23-51-28-686Z-32b85d2e/manifest.json`.
- [x] `npm run build`. Evidence: TypeScript build passed on merged branch.
- [x] `npm run lint`. Evidence: ESLint passed on merged branch.
- [x] `npm run test`. Evidence: `344` files / `4014` tests passed on merged branch.
- [x] `npm run docs:check`. Evidence: docs hygiene passed after folding the CO-209 blocker note into the CO-207 snapshot to stay within the `450`-line `docs/TASKS.md` budget.
- [x] `npm run docs:freshness`. Evidence: passed with only owned rolling cohort debt (`CO-175`: `221` docs).
- [x] `npm run docs:freshness:maintain`. Evidence: `pass_with_owned_rolling_debt`, owner issue `CO-175`, policy capacity `within_policy`, `blocking_changed_paths=0`.
- [x] `npm run repo:stewardship`. Evidence: `5086` tracked files, `0` action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: working-tree scope passed `files=1/25`, `lines=3/1200`; stacked advisory vs `origin/main` remained within `773/1200`.
- [x] Manifest-backed standalone review completed before review handoff. Evidence: `.runs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/cli/2026-04-17T01-37-10-675Z-91bdb94b/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`); manual summary `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/standalone-review.md`.
- [x] Elegance review completed before review handoff. Evidence: `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/manual/elegance-review.md`.

## Handoff Status
- [x] PR opened and attached to CO-207. Evidence: `https://github.com/Kbediako/CO/pull/505`; Linear attachment `c957be0e-44c2-477f-9a60-d81275e1a087`.
- [x] Workpad refreshed with current validation, review, and PR status. Evidence: Linear workpad comment `3f679c93-c549-4628-a0e1-49035a428fc4`.
- [ ] PR ready-review drain completed.
- [ ] Linear transitioned to `In Review` only after required validation, PR checks, ready-review drain, and latest `origin/main` merge are clean or explicitly waived.
