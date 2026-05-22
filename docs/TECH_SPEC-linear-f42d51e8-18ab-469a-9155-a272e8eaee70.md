---
id: linear-f42d51e8-18ab-469a-9155-a272e8eaee70
title: CO-577 quota hygiene degraded machine-status classification
relates_to: docs/PRD-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md
risk: high
owners:
  - Codex
last_review: 2026-05-23
related_action_plan: docs/ACTION_PLAN-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md
task_checklists:
  - tasks/tasks-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md
---

# TECH_SPEC - CO-577 quota hygiene degraded machine-status classification

Canonical source: `tasks/specs/linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`.

This mirror preserves the same implementation contract:

- `codex-orchestrator hygiene quota` must classify bounded degraded `co-status --format json` machine-status payloads with `degraded_read.reason=ui_request_timeout`, `source=local_machine_status`, and `freshness_verdict=healthy` as available degraded/partial machine status, not `unavailable`.
- The audit remains visibly degraded and must not infer live worker tokens from degraded reads.
- Stale endpoint, unhealthy live host, auth failure, dead endpoint, and true unavailable evidence remain stronger fail-closed classifications.
- Quota hygiene findings must preserve `degraded_read.reason`, `degraded_read.source`, and `degraded_read.freshness_verdict`.
- The consumer invariant is durable: downstream status consumers preserve degraded-read reason/source/freshness instead of flattening unknown bounded degraded reads into `unavailable`.

Validation mirrors the canonical spec: focused quota-hygiene tests, focused co-status tests if touched, spec guard, build, lint, full core tests, docs gates, stewardship, diff budget, standalone review, and elegance review.
