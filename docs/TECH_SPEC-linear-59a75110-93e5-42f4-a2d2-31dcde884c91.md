---
id: 20260422-linear-59a75110-93e5-42f4-a2d2-31dcde884c91
title: "CO: prevent local Node OOM under concurrent provider-worker pressure and provenance-invalid retry churn"
relates_to: docs/PRD-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

# TECH_SPEC - CO: prevent local Node OOM under concurrent provider-worker pressure and provenance-invalid retry churn

This mirror points to the canonical task spec at `tasks/specs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`.

## Implementation Summary
- Keep `CO-299` narrowly on local host pressure plus same-minute `provenance-invalid retry churn` under concurrent `provider-worker` load.
- Require a bounded reproduction or simulation of the multi-worker local pressure shape before implementation is called done.
- Preserve `provider_worker_child_lane_provenance_invalid` as a real `fail closed` provenance boundary while adding host-safety containment for repeated invalid attempts.
- Add explicit observability when CO suppresses new work for `host-safety` reasons.

## Likely Owner Surfaces
- Admission and local backpressure candidates:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerAgentCapacity.ts`
- Provenance fail-closed classification candidates:
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - adjacent parity-only check: `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- Same-attempt suppression and worker-truth candidates:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- Host-safety observability candidates:
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/providerControlHostFreshnessGauge.ts`

## Validation Contract
- Child lane:
  - docs-first packet and task-mirror patch only
  - `tasks/index.json` JSON parse
  - protected-term grep across the owned packet files
  - scoped diff review only
- Parent lane:
  - bounded local pressure reproduction or simulation
  - focused admission, child-lane, and observability regressions
  - normal parent-owned validation and review flow after implementation
  - any `docs/docs-freshness-registry.json` follow-on, because that file is outside this child lane's scope
