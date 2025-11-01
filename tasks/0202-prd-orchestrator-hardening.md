# PRD Snapshot — Codex Orchestrator Resilience Hardening (0202)

## Problem Statement
Concurrent orchestrator runs can leave `.runs/<task-id>/` snapshots incomplete, trigger unhandled promise rejections from heartbeat updates, and generate massive stderr payloads. These failure modes erode reviewer trust and can drop manifest lineage.

## Goals
- Add bounded retry/backoff around `TaskStateStore` locks so state snapshots persist even during contention.
- Synchronize heartbeat updates by awaiting manifest/heartbeat writes and throttling manifest churn.
- Limit command output buffering and error payload size to predictable upper bounds suitable for review tooling.

## Non-Goals
- Introducing new storage backends or async job queues.
- Altering pipeline composition or guardrail order beyond documentation adjustments.
- Shipping UI dashboards; scope remains CLI-only.

## Milestones
- **M1 — Persistence Reliability:** Implement lock retry/backoff, expand tests, ensure manifest writes succeed when snapshots fail.
- **M2 — Heartbeat Safety:** Queue heartbeat writes with awaited promises, log failures, and throttle manifest persistence to 30 seconds.
- **M3 — Output Bounding & Enablement:** Cap stdout/stderr buffers, truncate error artifacts, refresh documentation/checklists, and validate via diagnostics and guardrail runs.

## Artifacts
- PRD: `docs/PRD.md`
- Technical Spec: `docs/TECH_SPEC.md`
- Action Plan: `docs/ACTION_PLAN.md`
- Checklist mirrors: `tasks/tasks-0202-orchestrator-hardening.md`, `.agent/task/0202-orchestrator-hardening.md`, `docs/TASKS.md`
