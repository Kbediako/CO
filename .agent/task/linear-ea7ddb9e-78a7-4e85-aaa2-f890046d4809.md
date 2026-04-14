# Task Checklist - linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809

- Linear Issue: `CO-179` / `ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- MCP Task ID: `linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Primary PRD: `docs/PRD-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`
- TECH_SPEC: `tasks/specs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`

## Docs-First
- [x] PRD drafted for attach endpoint rotation and bounded provider refresh recovery. Evidence: `docs/PRD-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`.
- [x] TECH_SPEC drafted with the reloadable attach target contract, failure taxonomy, supervision boundary, and validation matrix. Evidence: `tasks/specs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`, `docs/TECH_SPEC-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`.
- [x] ACTION_PLAN drafted for parent implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new task packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`. Evidence: `.agent/task/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`.
- [x] Standalone pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md` `review_notes`.
- [x] Parent docs-review manifest recorded. Evidence: `.runs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809-docs-review/cli/2026-04-14T07-22-04-891Z-45eea209/manifest.json`.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or workpad. Evidence: this checklist.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane left changes uncommitted for parent patch export. Evidence: `git status --short`.
- [x] Parent lane handles Linear workpad, PR attach, review handoff, and patch integration. Evidence: PR `#475` attached to CO-179; workpad comment `d8636f3f-85c4-45ec-bbc3-5cd618036aa1`; review/elegance evidence in `.runs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809/cli/2026-04-14T06-59-19-608Z-0566cb5c/review/telemetry.json`.

## Implementation Acceptance
- [x] `co-status attach` reloads endpoint/auth artifacts after stale endpoint rotation. Evidence: `orchestrator/src/cli/coStatusAttachCliShell.ts`, `orchestrator/tests/CoStatusAttachCliShell.test.ts`.
- [x] Dead-port fetches are classified distinctly. Evidence: `orchestrator/tests/CoStatusAttachCliShell.test.ts`.
- [x] Current endpoint recovery is proven after `control_endpoint.json` rotates to a healthy host. Evidence: `orchestrator/tests/CoStatusAttachCliShell.test.ts`.
- [x] Raw network errors are classified with safe detail. Evidence: `orchestrator/src/cli/coStatusAttachCliShell.ts`, `orchestrator/tests/CoStatusAttachCliShell.test.ts`.
- [x] Auth failure and timeout classification are covered where practical. Evidence: `orchestrator/tests/CoStatusAttachCliShell.test.ts`.
- [x] `restart_required` / `probe_timeout` supervision behavior remains bounded. Evidence: `orchestrator/src/cli/control/controlHostSupervision.ts`, `orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Active provider workers are preserved during recovery. Evidence: supervision recovery treats stale restart-required snapshots as quiescent without adding provider-worker termination paths.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 node scripts/delegation-guard.mjs`. Evidence: passed with child-lane manifest present.
- [x] `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/CoStatusAttachCliShell.test.ts`. Evidence: passed.
- [x] `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/ControlHostSupervision.test.ts`. Evidence: passed with `orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] Provider refresh lifecycle focused tests if implementation changes refresh recovery. Evidence: stale/fresh `provider_refresh_lifecycle_stuck` `restart_required` coverage in `orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Unresolved actionable review threads = 0. Evidence: PR `#475` review-thread sweep; actionable CodeRabbit/Codex threads were handled with in-thread replies and the ready-review drain must pass before Linear review-state handoff.
- [x] Parent runs full required validation and review/elegance gates before handoff. Evidence: build, lint, test, docs gates, pack smoke, manifest-backed review, and elegance pass completed.

## Progress Log
- 2026-04-14: Bounded same-issue child lane created the CO-179 docs-first packet and registry mirrors only. The packet preserves the issue intent checksum: attach resilience after `control_endpoint.json` rotation, bounded `provider_refresh_lifecycle_stuck` / `restart_required` recovery, no CO STATUS/provider scheduling redesign, and no active provider worker kills.
- 2026-04-14: Parent lane implemented bounded endpoint/auth re-resolution for `co-status attach`, classified stale endpoint/auth/timeout/unavailable-host failures, added stale `provider_refresh_lifecycle_stuck` quiescence, and completed focused plus full validation before PR handoff.
