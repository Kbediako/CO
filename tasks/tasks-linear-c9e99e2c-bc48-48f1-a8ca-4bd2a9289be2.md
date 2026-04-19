# Task Checklist - linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2

- Linear Issue: `CO-260` / `c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2`
- MCP Task ID: `linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2`
- Primary PRD: `docs/PRD-CO-260-local-rollout-executor.md`
- TECH_SPEC: `tasks/specs/CO-260-local-rollout-executor.md`
- ACTION_PLAN: `docs/ACTION_PLAN-CO-260-local-rollout-executor.md`
- Parent manifest: `.runs/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2/cli/2026-04-19T07-38-16-390Z-fff356f8/manifest.json`
- Workpad comment: `2ae690d8-10c3-42bf-8056-5a6f1a7182c1`

## Docs-First
- [x] PRD drafted for bounded unattended post-merge `local_rollout` execution. Evidence: `docs/PRD-CO-260-local-rollout-executor.md`.
- [x] TECH_SPEC drafted with protected terms, issue-shaping contract, parity matrix, fail-closed preflights, audit records, and focused test requirements. Evidence: `tasks/specs/CO-260-local-rollout-executor.md`.
- [x] ACTION_PLAN drafted for config, executor, lifecycle, observability, validation, review, and PR handoff. Evidence: `docs/ACTION_PLAN-CO-260-local-rollout-executor.md`.
- [x] Task checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2.md`.
- [x] Registry linked to the canonical task id used by the worker and child lane. Evidence: `tasks/index.json`.
- [x] Bounded docs child lane completed and accepted. Evidence: `.runs/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2-docs-contract/cli/2026-04-19T07-42-33-742Z-4888715b/manifest.json`.

## Implementation
- [x] Added repo-tracked executable action contract under `operator_autopilot.post_merge_rollout.execution`. Evidence: `codex.orchestrator.json`, `providerOperatorAutopilot.ts`.
- [x] Added bounded executor for enabled allowlisted `local_rollout` action ids with deterministic ordering and deploy-class opt-in. Evidence: `providerOperatorAutopilotLocalRolloutExecution.ts`.
- [x] Wired execution into operator-autopilot refresh with durable execution attempts and success-only lifecycle clearing. Evidence: `providerOperatorAutopilot.ts`, `providerIssueHandoff.ts`, `providerOperatorAutopilotLifecycle.ts`.
- [x] Projected execution config, execution path, executable action ids, and attempt records into workflow/read-model payloads. Evidence: `providerWorkflowConfigStore.ts`, `observabilityReadModel.ts`.
- [x] Added focused success, preflight skip, command failure, rehydrate, and undeclared-action tests. Evidence: `orchestrator/tests/ProviderOperatorAutopilot.test.ts`.
- [x] Preserved prior synthetic `execution_audit_failed` terminal attempts when rehydrating a started-only execution sidecar. Evidence: `providerIssueHandoff.ts`, `ProviderIssueHandoff.test.ts`.
- [x] Disabled local rollout execution when lifecycle sidecar reads fail and treated malformed `supported_platforms` entries as unsupported-host preflight failures. Evidence: `providerIssueHandoff.ts`, `providerOperatorAutopilotLocalRolloutExecution.ts`, `ProviderIssueHandoff.test.ts`, `ProviderOperatorAutopilot.test.ts`.
- [x] Failed closed when execution audit or lifecycle persistence writers are unavailable. Evidence: `providerOperatorAutopilotLocalRolloutExecution.ts`, `ProviderOperatorAutopilot.test.ts`.
- [x] Preserved prior failed/skipped/interrupted attempt evidence when a current enabled action list becomes empty for a still-pending `local_rollout`. Evidence: `providerOperatorAutopilotLocalRolloutExecution.ts`, `ProviderOperatorAutopilot.test.ts`.
- [x] Preserved `lifecycle_record_failed` evidence when lifecycle clear persistence fails and the action is later disabled or removed. Evidence: `providerOperatorAutopilotLocalRolloutExecution.ts`, `ProviderOperatorAutopilot.test.ts`.
- [x] Preserved `lifecycle_record_failed` evidence across handoff rehydrate when the execution sidecar already contains a succeeded terminal record for the same action. Evidence: `providerIssueHandoff.ts`, `ProviderIssueHandoff.test.ts`.

## Validation
- [x] `npm run build`. Evidence: local run passed.
- [x] `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderWorkflowConfigStore.test.ts`. Evidence: `48` tests passed.
- [x] `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "operator autopilot"`. Evidence: `8` matched tests passed after matcher update.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: local run passed.
- [x] `node scripts/delegation-guard.mjs`. Evidence: local run passed with `1` subagent manifest found.
- [x] `npm run lint`. Evidence: local run passed with existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: latest local run passed with `345` files and `4267` tests.
- [x] `npm run docs:check`. Evidence: local rerun passed after docs registry update.
- [x] `npm run docs:freshness`. Evidence: local rerun passed with `4186` docs and `4189` registry entries; CO-175 rolling cohort remains visible.
- [x] `npm run repo:stewardship`. Evidence: latest local run passed with `5285` tracked files and `0` action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: local run passed with explicit `DIFF_BUDGET_OVERRIDE_REASON` for the new executor plus docs-first packet and focused tests.
- [x] `npm run pack:smoke`. Evidence: local run passed.
- [x] Post-rehydrate focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|operator autopilot"` passed with `29` matched tests.
- [x] Post-rehydrate full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4261` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Post-lifecycle/platform focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|operator autopilot"` passed with `31` matched tests.
- [x] Post-lifecycle/platform full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4263` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Post-persistence focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|operator autopilot"` passed with `32` matched tests.
- [x] Post-persistence full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4264` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Post-prior-attempt focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|operator autopilot"` passed with `33` matched tests.
- [x] Post-prior-attempt full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4265` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Post-lifecycle-clear-disabled focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts -t "preserves lifecycle clear failure evidence|local rollout"` passed with `23` matched tests.
- [x] Post-lifecycle-clear-disabled full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4266` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Post-lifecycle-rehydrate focused regression tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|lifecycle-clear"` passed with `4` matched tests; `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "local rollout|operator autopilot"` passed with `33` matched tests.
- [x] Post-lifecycle-rehydrate full gate rerun. Evidence: `npm run build`, `npm run lint` (existing `DelegationMcpHealth.test.ts` warnings only), `npm run test` (`345` files, `4267` tests), delegation/spec guards, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget override, `npm run pack:smoke`, and `git diff --check` passed.
- [x] Manifest-backed `codex-orchestrator review` / `npm run review` under `FORCE_CODEX_REVIEW=1`. Evidence: final rerun after lifecycle-rehydrate evidence fix completed with `review_outcome: bounded-success` via command-intent retry and no concrete regression found in local-rollout execution, rehydrate preservation, lifecycle source parsing, or provider workflow projection paths.
- [x] Explicit elegance/minimality pass. Evidence: manual pass kept the current helper seams because they preserve required durable audit, lifecycle retry, and rehydrate projection semantics; no unrelated refactor or extra abstraction remains in scope.
- [ ] PR attachment and `pr ready-review` drain before review handoff. Evidence: pending.

## Notes
- Shared-root sync remains owned by merge closeout, not the local rollout executor.
- Source-fresh CO execution uses the repo bootstrap `bin/codex-orchestrator.js` path.
- Failed and skipped unattended execution remains operator-visible; only successful action completion clears the pending `local_rollout` lifecycle.
