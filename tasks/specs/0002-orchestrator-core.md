---
id: 20251016-core
title: Codex-Orchestrator Core Execution Mini-Spec
relates_to: tasks/0001-prd-codex-orchestrator.md
risk: medium
owners:
  - Orchestrator Engineering
last_review: 2025-10-16
---

## Added by Orchestrator 2025-10-16

## Summary
- Objective: Define the orchestrator core runtime (manager + peer agents) along with persistence, cloud sync, and credential usage required to execute Task 3 safely.
- Constraints: Honor SOP guardrails (one-subtask rule, approved specs), keep execution deterministic by default (MCP mode), and ensure persistence/logging do not leak credentials or block human review loops.

## Proposed Changes
- Architecture / design adjustments: Manager delegates planner→builder→tester→reviewer using Agents SDK interfaces; persistence coordinator listens to `run:completed` events to write manifests/state; cloud-sync worker replays manifests to Codex Cloud via HTTP client with retries and idempotency keys.
- Data model updates: Store per-run manifests under `.runs/<taskId>/<runId>/manifest.json`; maintain `/out/<taskId>/state.json` snapshots with advisory locks and idempotent run history; append JSONL audit entries to `/out/audit.log` for sync attempts.
- External dependencies: Credential broker for Vault-scoped Codex Cloud tokens; Codex Cloud Runs API (`/workspaces/:id/runs/import`); Node.js filesystem APIs; global `fetch` (or polyfill) for HTTP client.

## Impact Assessment
- User impact: Automates SOP-compliant run execution with auditable artifacts, reducing manual coordination for persistence and cloud mirroring.
- Operational risk: Medium—filesystem contention or slow writes may delay sync; mitigated with lock files and exponential retries plus configurable backoff knobs.
- Security / privacy: Tokens stay in memory via credential broker; manifests and audit logs exclude secrets; idempotency prevents duplicate uploads.

## Rollout Plan
- Prerequisites: Approved PRD and architecture/tech specs; credential broker reachable with Codex Cloud scope; `.runs` directory structure established.
- Testing strategy: Unit tests for manager orchestration, persistence locking, cloud sync retries, HTTP client error handling; integration smoke test wiring manager + persistence + sync in CLI harness.
- Launch steps: Enable persistence and sync modules in orchestrator CLI; configure environment variables (`CODEX_CLOUD_WORKSPACE_ID`, `CLOUD_SYNC_VAULT_PATH`, `CLOUD_SYNC_BUCKET`); monitor audit log for the first runs and adjust retry/backoff thresholds if needed.

## Open Questions
- Should audit log rotation/retention be enforced automatically or delegated to deployment tooling?
- Do Codex Cloud APIs provide explicit retry-after headers for 429 responses that we should honor in backoff logic?

## Approvals
- Reviewer: Orchestrator Reviewer
- Date: 2025-10-16
