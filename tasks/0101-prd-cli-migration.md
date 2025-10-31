# PRD Snapshot — Orchestrator Wrapper Template

## Problem Statement
Downstream projects rely on a consistent Codex orchestrator experience, but a single-project configuration creates drift in manifests, guardrails, and reviewer workflows. We need a wrapper that supports multiple task ids and project layouts while keeping durability guarantees intact.

## Goals
- Provide `codex-orchestrator` CLI workflows (`start`, `resume`, `status`, `plan`) that operate without MCP dependencies for every project.
- Persist manifests under `.runs/<task-id>/cli/<run-id>/` with compatibility pointers for legacy MCP locations and optional cloud shims.
- Maintain telemetry parity: metrics JSONL, guardrail summaries, task state snapshots, heartbeat files, and approval logs per project.
- Support nested sub-agent runs by recording `parent_run_id` lineage and sub-run references regardless of project structure.

## Non-Goals
- Introducing new orchestration primitives beyond the existing TaskManager adapters.
- Shipping UI dashboards for manifests or metrics (tracked separately).
- Redesigning downstream build/test tooling; wrapper focuses on orchestration and documentation guardrails.

## Milestones
- **M1 — Planning & Scaffolding:** Refresh docs/tasks/.agent templates with multi-project guidance and verify manifest placeholders.
- **M2 — Project Onboarding:** Configure pipelines for each project (`packages/<project>`) and capture initial diagnostics manifests plus metrics snapshots.
- **M3 — Guardrails & Rollout:** Execute guardrail pipelines, update automation, and hand off documentation with manifest links to reviewers.

## Artifacts
- PRD: `docs/PRD.md`
- Technical Spec: `docs/TECH_SPEC.md`
- Action Plan: `docs/ACTION_PLAN.md`
- Checklist mirrors: `tasks/tasks-<task-id>-<slug>.md`, `.agent/task/<task-id>-<slug>.md`, `docs/TASKS.md`
