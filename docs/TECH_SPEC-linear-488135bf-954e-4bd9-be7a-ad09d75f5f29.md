---
id: 20260327-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29
title: CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work
relates_to: docs/PRD-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md
risk: high
owners:
  - Codex
last_review: 2026-03-27
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- PRD: `docs/PRD-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`
- Task checklist: `tasks/tasks-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`

## Traceability
- Linear issue: `CO-13` / `488135bf-954e-4bd9-be7a-ad09d75f5f29`
- Linear URL: https://linear.app/asabeko/issue/CO-13/co-add-audited-provider-worker-child-stream-support-for-bounded-multi

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: add a narrow provider-worker child-stream launch/audit seam so provider workers can open bounded read-only, review, or planning streams without weakening `delegation-guard` or violating the single-issue workspace/thread contract.
- Scope:
  - docs-first registration and workpad refresh for the current Linear worker issue
  - Symphony audit plus current CO contract audit for provider-worker, control-host, and delegation-guard behavior
  - a bounded provider-worker child-stream launcher with manifest lineage and proof surfacing
  - a narrow scheduler guard so nested provider-worker child manifests are not treated as scheduler-owned provider runs
  - focused regressions plus live-style validation
- Constraints:
  - keep the main provider worker authoritative for issue lifecycle transitions and scheduling state
  - preserve current single-stream provider-worker success behavior
  - keep child streams confined to the parent issue workspace/root and bounded to non-scheduling work

## Technical Requirements
- Functional requirements:
  - provider-worker runs must be able to launch at least one bounded child stream using a sanctioned `<provider-task-id>-<stream>` task id and `parent_run_id` continuity to the active provider-worker run
  - the child-stream launcher must validate that it is running inside an active `provider-linear-worker` parent run and must propagate current issue metadata, workspace confinement, and control-host provenance to the child run
  - the initial allowlist must stay bounded to review/planning surfaces and must not enable arbitrary unrestricted execution
  - provider-worker proof/read-model artifacts must surface truthful child-stream lineage when child streams are launched
  - control-host provider-run discovery must ignore nested manifests that are clearly provider-worker child streams so the scheduler still tracks exactly one authoritative provider run per issue
  - docs-review and review-style lanes must be able to use real child-stream evidence instead of the blanket provider-worker `DELEGATION_GUARD_OVERRIDE_REASON` when a sanctioned child stream exists
- Non-functional requirements (performance, reliability, security):
  - keep the change narrow to current provider-worker and provider-discovery seams
  - keep lineage auditable from `.runs/**/manifest.json` plus provider proof artifacts without relying on transient in-memory state
  - fail closed when required parent-run metadata is missing or mismatched
  - preserve per-issue workspace confinement and same-thread continuation for the main provider worker
- Interfaces / contracts:
  - provider worker runtime contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - control-host/provider discovery contract: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/controlHostCliShell.ts`
  - provider-child authorization contract: `scripts/delegation-guard.mjs`
  - pipeline configuration contract: `codex.orchestrator.json`

## Architecture & Data
- Architecture / design adjustments:
  - reuse the existing sanctioned provider-child delegation contract rather than inventing a new authorization model
  - add a provider-worker-owned child-stream shell that launches an allowed child pipeline in the same workspace with explicit `--task <provider-task>-<stream>` and `--parent-run <provider-run-id>`
  - persist child-stream lineage in a provider-worker sidecar/summary surface that the main worker proof can expose truthfully
  - tighten scheduler/provider discovery so nested provider-worker child manifests are read as worker-owned descendants, not as duplicate scheduler-owned provider runs
- Data model changes / migrations:
  - provider-worker proof output needs a structured child-stream lineage section or equivalent explicit sidecar reference
  - provider audits may need child-stream events or summary records so operators can correlate launch intent to child manifests
- External dependencies / integrations:
  - local Symphony baseline docs under `/Users/kbediako/Code/symphony`
  - current provider-worker manifest env (`CODEX_ORCHESTRATOR_MANIFEST_PATH`, `CODEX_ORCHESTRATOR_RUN_ID`, `CODEX_ORCHESTRATOR_TASK_ID`, `CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_*`)
  - current provider proof artifacts under `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/cli/2026-03-26T14-32-37-352Z-eda5d760/`

## Validation Plan
- Tests / checks:
  - docs-review on this packet before implementation
  - focused regressions around the child-stream launcher, provider-worker proof surfacing, provider-run discovery, and any current delegation contract seams affected by the new launcher
  - required repo validation floor after implementation
- Rollout verification:
  - verify the live provider-worker manifest context is sufficient to launch a sanctioned child stream
  - prove provider proof/manifests stay truthful both when no child streams run and when at least one bounded child stream runs
  - confirm docs-review and implementation-gate can consume child-stream evidence without the blanket provider-worker override when a real child stream exists
- Monitoring / alerts:
  - maintain the single active Linear workpad comment
  - use provider proof/manifests and child manifest lineage as the primary audit artifacts

## Open Questions
- Whether the cleanest lineage surface is direct manifest `child_runs` mutation, a provider-worker sidecar ledger consumed into proof output, or a hybrid. The implementation should choose the smallest truthful mechanism that survives parent-run persistence behavior.

## Approvals
- Reviewer: docs-review override captured after sanctioned provider-child run reached review-stage stall
- Date: 2026-03-27

## Manifest Evidence
- Current provider-worker manifest: `.runs/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/cli/2026-03-26T14-32-37-352Z-eda5d760/manifest.json`
- Baseline audit: `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T144912Z-baseline-audit.md`
- Docs-review override: `out/linear-488135bf-954e-4bd9-be7a-ad09d75f5f29/manual/20260326T150716Z-docs-review-override.md`
