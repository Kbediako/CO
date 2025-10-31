# PRD Snapshot — Task 0101 CLI Migration

## Problem Statement
The existing MCP diagnostics runner adds an MCP dependency to every workflow, complicating local execution, telemetry, and manifest durability. We need a first-class Codex Orchestrator CLI that authors, reviewers, and automation can call directly.

## Goals
- Ship `codex-orchestrator` CLI with `start`, `resume`, and `status` commands backed by `TaskManager`.
- Persist manifests under `.runs/0101/cli/<run-id>/` with compatibility pointers for legacy MCP locations.
- Maintain telemetry parity: metrics JSONL, guardrail guidance, task state snapshots, and heartbeat files.
- Support nested sub-agent runs by recording `parent_run_id` lineage and sub-run references.

## Non-Goals
- Introducing new cloud orchestration primitives (cloud sync worker remains unchanged).
- Building UI dashboards for manifests or metrics.
- Changing guardrail command set beyond replacing the runner implementation.

## Milestones
- **M1 — Planning & Scaffolding:** Replace templates across docs/tasks/.agent, pick task id 0101, and confirm checklist mirrors.
- **M2 — CLI Core:** Implement CLI modules, TaskManager adapters, persistence helpers, and shims.
- **M3 — Guardrails & Rollout:** Run diagnostics pipeline, publish manifests, update automation, and document migration steps.

## Artifacts
- PRD: `docs/PRD.md`
- Technical Spec: `docs/TECH_SPEC.md`
- Action Plan: `docs/ACTION_PLAN.md`
- Checklist mirrors: `tasks/tasks-0101-cli-migration.md`, `.agent/task/0101-cli-migration.md`, `docs/TASKS.md`
