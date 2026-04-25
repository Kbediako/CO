---
id: 20260422-linear-59a75110-93e5-42f4-a2d2-31dcde884c91
title: CO-299 local Node OOM backpressure and provenance-safe child-lane progress truth
relates_to: docs/PRD-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`
- PRD: `docs/PRD-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`
- Task checklist: `tasks/tasks-linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`

## Summary
- Objective: mirror the canonical CO-299 spec for docs-facing review surfaces.
- Scope: local Node OOM/resource pressure, provider-worker backpressure, provenance-invalid child-lane retry/progress truth, and fail-closed provenance.
- Source anchor: `ctx:sha256:0320d3a6b57e0f8847509632a1b1cf89ffd868f1412cbb569e67ac7eb380f394#chunk:c000001`

## Issue-Shaping Contract
- User-request translation carried forward: CO-299 must make local-host pressure and provenance-invalid child-lane churn observable without weakening provenance validation.
- Protected terms / exact artifact and surface names: `local Node OOM`, `concurrent provider-worker pressure`, `provenance-invalid child-lane retry/progress churn`, `host-safety backpressure/observability`, `fail-closed provenance`, `provider-worker`, `provider-linear-worker`, `linear child-lane`, `linear child-stream`, `provider_worker_child_lane_provenance_invalid`, `provider_worker_child_stream_provenance_invalid`, `manifest.json`, `provider-linear-worker-proof.json`, `provider-intake-state.json`, `co-status --format json`, `CO STATUS`, and `max_concurrent_agents`.
- Nearby wrong interpretations to reject: provenance bypass, cap-only concurrency increase, diagnostic muting, fake progress after failed launch attempts, and unrelated provider-worker/stale-host fixes.

## Technical Requirements
1. Classify local Node OOM/resource-exhaustion signals under provider-worker concurrency as host-safety pressure.
2. Apply provider-worker launch/admission backpressure while host-safety pressure is active.
3. Preserve fail-closed child-lane and child-stream provenance behavior.
4. Keep retry/progress accounting from counting provenance-invalid attempts as real issue progress.
5. Surface host-safety pressure and provenance decisions in machine-checkable proof/status/read-model output.
6. Keep `max_concurrent_agents` authoritative and unchanged for this issue.

## Validation Plan
- Child lane: JSON parse, protected-term grep, and `git diff --check` over the declared docs scope.
- Parent lane: focused host-pressure classification, launch backpressure, provenance-invalid no-progress, and valid-provenance regressions.
- Parent closeout: normal parent-selected review, docs, and PR validation.

## Notes
- Full details live in the canonical task spec at `tasks/specs/linear-59a75110-93e5-42f4-a2d2-31dcde884c91.md`.
- The packet is anchored on the parent-provided source anchor and issue framing. The first docs-reset child lane was invalidated for host-safety recovery, and the parent imported the docs-only patch shape before completing a successful zero-byte docs-shape advisory child lane.
