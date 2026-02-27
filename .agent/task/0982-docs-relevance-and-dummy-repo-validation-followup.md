# Task Checklist - Docs Relevance + Dummy Repo Validation Follow-up (0982)

- MCP Task ID: `0982-docs-relevance-and-dummy-repo-validation-followup`
- Primary PRD: `docs/PRD-docs-relevance-and-dummy-repo-validation-followup.md`
- TECH_SPEC: `tasks/specs/0982-docs-relevance-and-dummy-repo-validation-followup.md`
- ACTION_PLAN: `docs/ACTION_PLAN-docs-relevance-and-dummy-repo-validation-followup.md`
- Summary of scope: targeted post-0981 docs/state relevance corrections plus explicit dummy/simulated downstream validation evidence.

> Set `MCP_RUNNER_TASK_ID=0982-docs-relevance-and-dummy-repo-validation-followup` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; include `npm run pack:smoke` for downstream-facing validation.

## Checklist

### Foundation and docs-first
- [x] Task scaffolding + mirrors + index/spec registration created. - Evidence: `docs/PRD-docs-relevance-and-dummy-repo-validation-followup.md`, `docs/TECH_SPEC-docs-relevance-and-dummy-repo-validation-followup.md`, `docs/ACTION_PLAN-docs-relevance-and-dummy-repo-validation-followup.md`, `tasks/specs/0982-docs-relevance-and-dummy-repo-validation-followup.md`, `tasks/tasks-0982-docs-relevance-and-dummy-repo-validation-followup.md`, `.agent/task/0982-docs-relevance-and-dummy-repo-validation-followup.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated docs-relevance + simulation-planning streams recorded with evidence. - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/docs-audit-findings.md`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/dummy-simulation-plan.md`, `.runs/0982-docs-relevance-and-dummy-repo-validation-followup-guard/cli/2026-02-27T01-06-25-929Z-d3b9608c/manifest.json`.
- [x] Docs-review manifest captured before any non-doc changes. - Evidence: `.runs/0982-docs-relevance-and-dummy-repo-validation-followup/cli/2026-02-27T01-14-10-606Z-3a8e4855/manifest.json`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/docs-review-pre-implementation-final.log`.

### Docs relevance corrections
- [x] 0981 lifecycle/checklist states updated to merged-complete across mirrors. - Evidence: `tasks/tasks-0981-chatgpt-login-first-runtime-provider-migration.md`, `.agent/task/0981-chatgpt-login-first-runtime-provider-migration.md`.
- [x] `docs/TASKS.md` 0981 snapshot updated to merged state. - Evidence: `docs/TASKS.md`.
- [x] `tasks/index.json` status/gate/completed_at drift corrected for 0981 (and 0980 stale row). - Evidence: `tasks/index.json`.

### Dummy/simulated validation
- [x] `pack:smoke` log captured in 0982 manual evidence path. - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/01-pack-smoke.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/01-pack-smoke.assertions.txt`.
- [x] Dummy repo simulation: appserver-requested review with deterministic CLI fallback captured. - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/02-review-runtime-fallback.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/02-review-output.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/02-review-telemetry.json`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/02-review-runtime-fallback.assertions.txt`.
- [x] Dummy repo simulation: unsupported `executionMode=cloud + runtimeMode=appserver` fail-fast captured (terminal failed run payload + explicit unsupported-combo reason). - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/03-frontend-cloud-appserver.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/03-frontend-cloud-appserver.assertions.txt`.

### Validation chain
- [x] 01 `node scripts/delegation-guard.mjs` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-03-build.log`.
- [x] 04 `npm run lint` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-04-lint.log`.
- [x] 05 `npm run test` - Evidence: fail/fix/pass logs `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-05-test.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-05-test-rerun.log`, `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-05-test-rerun2.log`.
- [x] 06 `npm run docs:check` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-08-diff-budget.log`.
- [x] 09 `npm run review` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-09-review.log`.
- [x] 10 `npm run pack:smoke` - Evidence: `out/0982-docs-relevance-and-dummy-repo-validation-followup/manual/final-10-pack-smoke.log`.

### Review, merge, and handoff
- [ ] PR opened with scope/decisions/validation evidence.
- [ ] Review/bot feedback addressed in-thread with reruns.
- [ ] Quiet-window monitoring complete after green checks.
- [ ] Merge complete and branch cleaned up (if unblocked).
