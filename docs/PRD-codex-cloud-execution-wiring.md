# PRD - Codex Cloud Execution Wiring

## Summary
- Problem Statement: CO currently labels some runs as `cloud`, but execution still runs through local command stages instead of Codex Cloud task APIs.
- Desired Outcome: Wire orchestrator cloud mode to launch and track real Codex Cloud tasks (`exec/status/diff/apply`) while preserving CO manifests, guardrails, and evidence workflows.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Make CO and Codex CLI cloud capabilities work in harmony so cloud-mode runs are truly remote and operationally auditable in the existing CO workflow.
- Success criteria / acceptance:
  - `cloud` mode launches Codex Cloud tasks rather than local pipeline command execution.
  - CO manifests capture cloud task identifiers, status progression, and diff/apply evidence.
  - Existing local (`mcp`) mode behavior remains backward compatible.
  - Planning and implementation follow docs-first + delegation guardrails.
- Constraints / non-goals:
  - Do not regress current local orchestration flows.
  - Do not introduce destructive auto-apply behavior without explicit user action.
  - Keep scope focused on cloud wiring and evidence; avoid broad refactors.

## Goals
- Introduce a real cloud execution path for orchestrator `ExecutionMode = cloud`.
- Add robust cloud status polling, retry policy, and failure reporting.
- Persist cloud metadata in manifests and task state for downstream review/audit.
- Provide a phased rollout plan with an MVP and explicit follow-ups.

## Non-Goals
- Replacing existing local command pipelines.
- Reworking delegation server architecture unrelated to cloud execution.
- Shipping unrelated UX redesigns.

## Stakeholders
- Product: CO maintainers and operators running mixed local/cloud execution.
- Engineering: Orchestrator runtime, CLI adapters, persistence/manifest maintainers.
- Design: N/A.

## Metrics and Guardrails
- Primary Success Metrics:
  - Cloud-mode runs route to Codex Cloud APIs (not local pipeline command execution).
  - Cloud run metadata present in manifests for 100% of cloud runs.
  - Retry/error classification handles transient cloud failures without manual intervention.
- Guardrails / Error Budgets:
  - No regressions in `mcp` mode pipeline success rates.
  - Cloud-mode failures include actionable diagnostics and retained remote task IDs.

## User Experience
- Personas:
  - Maintainers running orchestrator pipelines with cloud-enabled subtasks.
  - Reviewers validating run evidence from `.runs/<task-id>/...` manifests.
- User Journeys:
  - Start cloud-enabled run -> monitor status -> review diff evidence -> optionally apply changes.

## Technical Considerations
- Architectural Notes:
  - Add a cloud execution adapter layer for launch, status polling, diff retrieval, and apply workflows.
  - Map cloud responses into the existing `BuildResult/TestResult/ReviewResult/RunSummary` shapes.
  - Extend the manifest schema to include a cloud execution section.
- Dependencies / Integrations:
  - Codex CLI cloud commands/endpoints (`codex cloud exec / status / diff / apply`).
  - Existing CO persistence (`RunManifestWriter` and `TaskStateStore`) and event streams.

## Open Questions
- Should cloud diff retrieval be mandatory for successful cloud-mode completion, or optional via policy flag?
- Should the cloud apply command be exposed only as an explicit follow-up command, or as a pipeline stage option?
- How should long-poll cancellation semantics map into existing control server pause/cancel behavior?

## Evidence
- Planning scout (subagent): `.runs/0957-codex-cloud-execution-wiring-scout/cli/2026-02-13T09-44-14-289Z-f07a93cd/manifest.json`.
- Implementation docs archive tracking: `docs/implementation-docs-archive-policy.json` (automation syncs archived payloads to `doc-archives` branch when archival triggers are met).

## Approvals
- Product:
- Engineering:
- Design:
