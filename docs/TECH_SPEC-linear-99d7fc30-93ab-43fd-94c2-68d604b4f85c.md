---
id: 20260409-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c
title: CO: Add memory provenance and outcome schema to manifests, events, and metrics
relates_to: docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
related_prd: docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
related_action_plan: docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- PRD: `docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- ACTION_PLAN: `docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- Task checklist: `tasks/tasks-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.

## Scope
- Keep this lane bounded to additive memory provenance and outcome fields on shared run artifacts.
- Reuse the existing `memory.source_0` and `resume_events` seams instead of inventing transcript-derived telemetry.
- Mirror the bounded memory contract into at least one event surface and `metrics.json`.
- Preserve separation from general provider-worker progress/stall telemetry, `CO STATUS`, resident continuity, and distributed worker-host parity.

## Design
- Extend the manifest memory contract with a bounded memory observability block that records:
  - selected-memory provenance
  - rejected source-artifact candidates
  - rediscovered memory decisions
  - manual repair records derived only from explicitly marked memory-repair resume artifacts
  - counters for contradiction, rediscovery, resume latency, manual repair, repeated-failure streak, and retrieval hits/misses
- Derive selected/rejected/rediscovered decisions from the existing `source_0` inheritance path, using artifact availability plus descriptor/payload lineage validation rather than transcript text.
- Mirror the manifest memory observability payload into `run:summary`.
- Mirror the bounded counters and selected-memory provenance summary into `metrics.json`.

## Validation Plan
- Evidence-bearing execution state lives in `tasks/tasks-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, `.agent/task/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`, and the Linear workpad.
- This lane requires docs-review evidence, focused regressions for manifest / summary / metrics emission, and the standard closeout gates (`delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, standalone review, elegance pass, and `pack:smoke`) before review handoff.
- Branch freshness must be re-established against current `origin/main` before the issue leaves `In Progress`; if main moves after PR creation, rerun the affected validation gates on the refreshed branch and keep the checklist mirrors current.

## Approvals
- Reviewer: `codex-orchestrator docs-review (clean-success)` via `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/manifest.json`
- Date: 2026-04-09
