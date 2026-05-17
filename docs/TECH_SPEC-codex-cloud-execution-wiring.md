# Technical Spec - Codex Cloud Execution Wiring (Task 0957)

## Summary
- Objective: Route orchestrator cloud-mode tasks through real Codex Cloud lifecycle operations (`exec/status/diff/apply`) while preserving CO run evidence and audit trails.
- Scope: Cloud-mode dispatch, cloud lifecycle execution, manifest/schema updates, run-summary mapping, and non-interactive review hardening.
- Constraints: Preserve local (`mcp`) behavior; keep apply explicit; avoid scope expansion beyond cloud execution wiring.
- Canonical TECH_SPEC: `tasks/specs/0957-codex-cloud-execution-wiring.md`.

## Technical Requirements
- Functional requirements:
  - `ExecutionMode=cloud` must run Codex Cloud lifecycle commands instead of local command-stage execution.
  - Cloud execution must persist lifecycle data (`task_id`, status progression, poll metadata, diff/apply status, errors) in the CLI manifest.
  - Cloud execution results must map into existing orchestrator contracts (`BuildResult`, `TestResult`, `ReviewResult`, `RunSummary`) so downstream consumers remain stable.
  - CLI must support an explicit run-level mode override (`mcp`/`cloud`) for deterministic operator control.
- Non-functional requirements (performance, reliability, security):
  - Polling and retry behavior must be bounded and deterministic.
  - Terminal failures must preserve the last known remote state and actionable diagnostics.
  - Cloud mode must not silently apply changes.
  - Non-interactive review runs must have hard timeout enforcement that cannot orphan child processes.
- Interfaces / contracts:
  - `codex-orchestrator start` accepts explicit execution-mode override options and forwards them through run lifecycle and child subpipelines.
  - `cloud_execution` remains optional/nullable for local runs to preserve backward compatibility.
  - Event stream and run summary continue emitting/recording stage and status transitions.

## Architecture & Data
- Architecture / design adjustments:
  - Add cloud execution path in `CodexOrchestrator.executePipeline` for command targets, including environment resolution and prompt shaping.
  - Keep planner/manager contracts stable while injecting optional run-level execution-mode override into `modePolicy`.
  - Use `CodexCloudTaskExecutor` for launch, status polling, diff retrieval, and lifecycle result shaping.
- Data model changes / migrations:
  - Extend shared manifest schema/types with `cloud_execution` payload fields (status/polling/diff/apply/log/error metadata).
  - Extend run-summary writing so `cloud_execution` data is surfaced in final summary output.
  - No destructive migrations: existing manifests remain valid with `cloud_execution: null`.
- External dependencies / integrations:
  - Codex CLI cloud commands: `codex cloud exec`, `codex cloud status`, `codex cloud diff`.
  - Existing CO persistence layers (`RunManifestWriter`, `TaskStateStore`) and manifest persister cadence.

## Validation Plan
- Tests / checks:
  - `orchestrator/tests/CodexCloudTaskExecutor.test.ts`
  - `orchestrator/tests/CloudModeAdapters.test.ts`
  - `orchestrator/tests/OrchestratorSubpipelineFailure.test.ts`
  - Full lane: `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`.
- Rollout verification:
  - Docs-review and implementation-gate manifests capture docs-first and guardrail evidence.
  - Cloud canary run validates real task launch and ready-state completion in Codex Cloud UI.
- Monitoring / alerts:
  - Track cloud task terminal statuses, polling attempts, diff availability, and timeout failures through manifest snapshots and run summaries.

## Evidence
- Docs-review: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T09-47-41-178Z-453a5990/manifest.json`
- Implementation-gate: `.runs/0957-codex-cloud-execution-wiring/cli/2026-02-13T10-10-02-475Z-9fa15611/manifest.json`
- Cloud canary: `.runs/0957-cloud-canary-local2/cli/2026-02-13T10-47-30-259Z-6eecdc1a/manifest.json`

## Open Questions
- Should cloud apply remain only a follow-up command, or also be exposed as an optional pipeline stage?
- Should missing diff output be warning-only or policy-configurable failure?
- Should cloud mode support multi-stage command execution in a single run, or remain single-target until stability data improves?

## Approvals
- Reviewer: Codex (self-approved for implementation pass)
- Date: 2026-02-13
