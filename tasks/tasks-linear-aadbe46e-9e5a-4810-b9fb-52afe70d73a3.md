# Task Checklist - linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3

- Linear Issue: `CO-42` / `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- MCP Task ID: `linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- Primary PRD: `docs/PRD-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`
- TECH_SPEC: `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`

## Docs-First
- [x] PRD drafted for the provider-worker env isolation lane. Evidence: `docs/PRD-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.
- [x] TECH_SPEC drafted with the bounded env propagation/sanitization seam and regression plan. Evidence: `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`, `docs/TECH_SPEC-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`. Evidence: `.agent/task/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md` `review_notes`.
- [x] docs-review approval captured for `linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3`. Evidence: child docs-review manifest `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3-co-42-docs-review-final-4/cli/2026-03-30T08-47-15-708Z-b66bf956/manifest.json` ran delegation/spec/docs gates successfully; forced `npm run review` launched from the same manifest and then stalled without a verdict, so fallback manual docs review covered the packet + `skills/linear/SKILL.md` and found no blocking issues.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-42`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `c7c2b864-8dcc-4c9b-bc51-c7b895f115d5`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on `origin/main`. Evidence: `linear/co-42-provider-env-isolation`.

## Investigation
- [x] The leak seam was narrowed to provider-owned env propagation rather than broader runtime drift. Evidence: `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md` `review_notes`.
- [x] The current hypothesis is explicit and bounded: provider-worker repo-config/package-root overrides are ambient where repo-local validation/test seams expect workspace-local config. Evidence: `docs/TECH_SPEC-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.
- [x] The failing `CO-40` validation shape is reproduced under provider-worker env without manual scrubbing. Evidence: focused provider-env regressions in `tests/cli-frontend-test.spec.ts`, `orchestrator/tests/UserConfigStageSets.test.ts`, and `orchestrator/tests/Doctor.test.ts` capture the ambient provider override path/package-root leak and the explicit override preservation boundary.

## Implementation
- [x] Provider-worker-owned repo config/package-root overrides no longer leak into repo-local validation or test subprocesses by default. Evidence: `orchestrator/src/cli/utils/providerOverrideEnv.ts`, `orchestrator/src/cli/frontendTestCliRequestShell.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`.
- [x] Provider child review/docs lanes only inherit the env they intentionally need. Evidence: `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/controlHostCliShell.ts`.
- [x] Focused regression coverage proves deterministic local config loading in a provider-worker shell. Evidence: `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/FrontendTestCliRequestShell.test.ts`, `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`, `orchestrator/tests/UserConfigStageSets.test.ts`, `tests/cli-frontend-test.spec.ts`, `tests/cli-command-surface.spec.ts`, `tests/cli-orchestrator.spec.ts`.
- [x] The sanitization boundary is documented in the relevant provider-worker / validation workflow notes. Evidence: `skills/linear/SKILL.md`, `docs/TECH_SPEC-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`, `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-42-docs-review-final-4`. Evidence: `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3-co-42-docs-review-final-4/cli/2026-03-30T08-47-15-708Z-b66bf956/manifest.json` with command entries 1-4 succeeded before the forced review stall fallback.
- [x] Focused `UserConfigStageSets` reproduction/rerun command(s). Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts orchestrator/tests/FrontendTestCliRequestShell.test.ts tests/cli-frontend-test.spec.ts orchestrator/tests/UserConfigStageSets.test.ts` passed (`4` files, `37` tests).
- [x] Focused `cli-frontend-test` reproduction/rerun command(s). Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts orchestrator/tests/FrontendTestCliRequestShell.test.ts tests/cli-frontend-test.spec.ts orchestrator/tests/UserConfigStageSets.test.ts` passed (`4` files, `37` tests); post-review test-hygiene fix rerun `npx vitest run --config vitest.config.core.ts orchestrator/tests/FrontendTestCliRequestShell.test.ts` passed (`1` file, `3` tests).
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/delegation-guard.mjs`. Evidence: latest output `Delegation guard: OK (4 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/spec-guard.mjs --dry-run`. Evidence: latest output `✅ Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run build`. Evidence: passed on the final implementation diff after the control-host package-root fallback correction.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run lint`. Evidence: passed after the final full-suite rerun.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run test`. Evidence: provider-worker shell rerun `env CODEX_ORCHESTRATOR_REPO_CONFIG_PATH=/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json CODEX_ORCHESTRATOR_PACKAGE_ROOT=/Users/kbediako/Code/CO CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED=1 MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run test` passed (`300` files, `2638` tests).
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run docs:check`. Evidence: passed after the final full-suite rerun; child docs-review command `03-docs-check` also succeeded in `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3-co-42-docs-review-final-4/cli/2026-03-30T08-47-15-708Z-b66bf956/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run docs:freshness`. Evidence: `env MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run docs:freshness` passed; child docs-review command `04-docs-freshness` also succeeded in `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3-co-42-docs-review-final-4/cli/2026-03-30T08-47-15-708Z-b66bf956/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 node scripts/diff-budget.mjs`. Evidence: latest output `files=21/25, lines=896/1200, +866/-30`.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: manifest-backed review launched from `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3/cli/2026-03-30T06-41-27-338Z-fd46f029/manifest.json`; `review/output.log` shows bounded diff inspection continuing past `4m 0s` without a concrete verdict, so fallback manual review covered `orchestrator/src/cli/utils/providerOverrideEnv.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/src/cli/frontendTestCliRequestShell.ts`, `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `orchestrator/src/cli/doctor.ts`, and the focused regressions with no blocking findings.
- [x] `MCP_RUNNER_TASK_ID=linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3 npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: rerun on the final diff passed (`✅ pack smoke passed`).
- [x] Explicit elegance review recorded before any review handoff. Evidence: manual elegance pass kept the fix centralized in `providerOverrideEnv.ts`, used explicit provider ownership markers from `controlHostCliShell.ts`, and avoided broader env/refactor churn; no smaller safe patch was found that still preserved doctor explicit overrides plus frontend-test env restoration.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
