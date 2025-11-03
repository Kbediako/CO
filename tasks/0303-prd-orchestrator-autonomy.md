# PRD Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

## Problem Statement
The orchestrator wrapper lacks Codex CLI autonomy features: approvals are duplicated per run, command streaming is fragmented, telemetry hooks are opt-in scripts, and SDK/CI integrations require bespoke glue. This fragmentation slows reviewers, increases approval friction, and hides manifest lineage across runs.

## Goals
- Introduce a centralized tool orchestrator layer that reuses global approvals, manages sandbox retries, and emits lifecycle events for every tool invocation.
- Upgrade the unified exec runtime with reusable PTY sessions, incremental stdout/stderr streaming, and structured begin/end events to match Codex CLI behavior.
- Deliver a non-interactive `exec` pathway that emits JSONL events, structured summaries, and manifests suitable for SDK and CI consumers.
- Provide a lightweight Node.js SDK wrapper and documentation for integrating orchestrator runs into automation pipelines.
- Offer opt-in telemetry (OTEL exporters) and notification hooks that degrade gracefully without breaking runs.
- Adopt hierarchical AGENTS instruction discovery so global, repo, and project guidance composes without overriding autonomy safeguards.

## Non-Goals
- Changing global approval policies or auto-escalating beyond the configured `approval_policy`.
- Replacing core persistence layers or manifest storage beyond the new event/metric fields.
- Shipping GUI clients or non-Node SDKs in the initial release; those follow-on efforts land in separate tasks.

## Milestones
- **M1 — Foundation & Orchestrator Layer:** Establish manifests/run directories, implement `ToolOrchestrator`, persist approval/retry metadata, and align docs/checklists.
- **M2 — Unified Exec & Interfaces:** Ship PTY session manager, streaming adapters, CLI `exec` command, and Node SDK updates with JSONL support.
- **M3 — Telemetry & Instruction Hierarchy:** Enable OTEL exporter, notification hooks, instruction loader, manifest schema updates, and guardrail verification runs.

## Artifacts
- PRD: `docs/PRD-codex-orchestrator-autonomy.md`
- Technical Spec: `docs/TECH_SPEC-codex-orchestrator-autonomy.md`
- Action Plan: `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`
- Checklist mirrors: `tasks/tasks-0303-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`, `docs/TASKS.md`
