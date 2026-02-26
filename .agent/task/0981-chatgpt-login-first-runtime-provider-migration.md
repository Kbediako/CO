# Task Checklist - ChatGPT-Login-First Runtime Provider Migration (0981)

- MCP Task ID: `0981-chatgpt-login-first-runtime-provider-migration`
- Primary PRD: `docs/PRD-chatgpt-login-first-runtime-provider-migration.md`
- TECH_SPEC: `tasks/specs/0981-chatgpt-login-first-runtime-provider-migration.md`
- ACTION_PLAN: `docs/ACTION_PLAN-chatgpt-login-first-runtime-provider-migration.md`
- Summary of scope: execute W0-W6 runtime provider migration with docs-first, delegated streams, validation evidence, and guarded default-flip decision.

> Set `MCP_RUNNER_TASK_ID=0981-chatgpt-login-first-runtime-provider-migration` for top-level orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; add `npm run pack:smoke` when downstream-facing CLI/package/skills/review-wrapper paths are touched.

## Checklist

### Foundation and docs-first
- [x] Task scaffolding + mirrors + index/spec registration created. - Evidence: `docs/PRD-chatgpt-login-first-runtime-provider-migration.md`, `docs/TECH_SPEC-chatgpt-login-first-runtime-provider-migration.md`, `docs/ACTION_PLAN-chatgpt-login-first-runtime-provider-migration.md`, `tasks/specs/0981-chatgpt-login-first-runtime-provider-migration.md`, `tasks/tasks-0981-chatgpt-login-first-runtime-provider-migration.md`, `.agent/task/0981-chatgpt-login-first-runtime-provider-migration.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated planning/research/validation streams recorded with evidence. - Evidence: subagents `019c9a5e-c231-7e82-bab2-e4821a24cf22`, `019c9a5e-c6a0-7100-9adf-28c6ef312044`, `019c9a5e-cb15-70c0-92b7-df9dbf171206`; delegated guard manifest `.runs/0981-chatgpt-login-first-runtime-provider-migration-guard/cli/2026-02-26T14-55-57-588Z-b56fc208/manifest.json`.
- [x] Docs-review manifest captured before runtime code edits. - Evidence: `.runs/0981-chatgpt-login-first-runtime-provider-migration/cli/2026-02-26T15-02-39-504Z-3d88b520/manifest.json`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/docs-review-pre-implementation-pass.log`.

### Runtime migration workstreams
- [x] W0 Foundation complete (provider seam + CLI provider adapter + default behavior unchanged). - Evidence: `orchestrator/src/cli/runtime/types.ts`, `orchestrator/src/cli/runtime/mode.ts`, `orchestrator/src/cli/runtime/provider.ts`, `orchestrator/src/cli/runtime/codexCommand.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/commandRunner.ts`.
- [x] W1 Runtime mode + observability complete (mode resolution + fallback telemetry visible). - Evidence: `bin/codex-orchestrator.ts` runtime output payload/help, `orchestrator/src/cli/orchestrator.ts` status payload/runtime fields, `orchestrator/src/cli/run/manifest.ts`, `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/canary-appserver-status.json`.
- [x] W2 AppServer provider MVP complete (preflight + deterministic fallback + end-to-end appserver path). - Evidence: appserver success manifest `.runs/0981-chatgpt-login-first-runtime-provider-migration-canary-appserver-output/cli/2026-02-26T15-39-54-780Z-d274a90d/manifest.json`; fallback manifest `.runs/0981-chatgpt-login-first-runtime-provider-migration-canary-fallback/cli/2026-02-26T15-38-38-325Z-852fe9d9/manifest.json`.
- [x] W3 Review path migrated first with parity protections. - Evidence: `scripts/run-review.ts` runtime-mode wiring + provider context, `bin/codex-orchestrator.ts` review runtime flag/docs, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/09-review.log`.
- [x] W4 RLM + frontend-test migrated through provider APIs. - Evidence: `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/src/cli/frontendTestingRunner.ts`, `orchestrator/tests/RuntimeProvider.test.ts`.
- [x] W5 MCP/cloud integration hardened with unsupported combo fail-fast. - Evidence: unsupported-combo manifest `.runs/0981-chatgpt-login-first-runtime-provider-migration-canary-unsupported/cli/2026-02-26T15-39-04-301Z-fd83f38e/manifest.json`; cloud+cli fallback manifest `.runs/0981-chatgpt-login-first-runtime-provider-migration-canary-cloud-cli/cli/2026-02-26T15-39-11-738Z-5d542f1d/manifest.json`.
- [x] W6 default-flip decision recorded with parity/canary evidence and rollback path. - Decision: keep default `runtimeMode=cli` (no flip yet); break-glass `--runtime-mode cli` remains rollback path while canary coverage expands beyond current bounded frontend/runtime lanes.

### Validation chain (ordered)
- [x] 01 `node scripts/delegation-guard.mjs` - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/01-delegation-guard.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run` - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/02-spec-guard.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build` - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/03-build.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-03-build.log`.
- [x] 04 `npm run lint` - Evidence: fail/fix/pass in `out/0981-chatgpt-login-first-runtime-provider-migration/manual/04-lint-fail-1.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/04-lint.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-04-lint.log`.
- [x] 05 `npm run test` - Evidence: fail/fix/pass in `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-05-test-fail-1.log`, test parser fix in `tests/cli-frontend-test.spec.ts`, and pass log `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-05-test.log`.
- [x] 06 `npm run docs:check` - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/06-docs-check.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness` - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/07-docs-freshness.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs` - Evidence: fail/override in `out/0981-chatgpt-login-first-runtime-provider-migration/manual/08-diff-budget-fail-1.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/08-diff-budget.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-08-diff-budget.log`.
- [x] 09 `npm run review` - Evidence: fail/override in `out/0981-chatgpt-login-first-runtime-provider-migration/manual/09-review-fail-1.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/09-review.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-09-review.log`.
- [x] 10 `npm run pack:smoke` (required: CLI/review-wrapper paths touched) - Evidence: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/10-pack-smoke.log`, `out/0981-chatgpt-login-first-runtime-provider-migration/manual/final-10-pack-smoke.log`.

### Review, merge, and handoff
- [ ] PR opened with scope/decisions/risks/evidence.
- [ ] Review/bot feedback addressed in-thread with reruns.
- [ ] Quiet-window monitoring complete after green checks.
- [ ] Merge complete and branch cleaned up (if unblocked).
- Blocker (2026-02-26): `gh pr create --base main --head task/0981-chatgpt-login-first-runtime-provider-migration` failed with `GraphQL: Kbediako does not have the correct permissions to execute CreatePullRequest (createPullRequest)`.
