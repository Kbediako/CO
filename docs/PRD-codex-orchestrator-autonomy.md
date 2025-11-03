# PRD — Codex Orchestrator Autonomy Enhancements (Task 0303)

## Summary
- Problem Statement: Our orchestrator lacks the unified tooling, telemetry, and automation hooks present in Codex CLI, leading to inconsistent approvals, fragmented command streaming, and limited CI/SDK integrations.
- Desired Outcome: Deliver a cohesive orchestrator experience that mirrors Codex’s autonomy model, streams structured events, and exposes optional telemetry and MCP connectivity without overriding global approval preferences.

## Goals
- Introduce a centralized tool orchestrator layer to reuse global approvals, manage sandbox escalation, and emit consistent tool lifecycle events.
- Extend the shell/exec runtime to support persistent PTY sessions, incremental stdout/stderr streaming, and retry semantics aligned with Codex’s unified exec.
- Provide a non-interactive “exec” mode for automation that emits JSONL events, optional structured outputs, and final summaries compatible with SDK consumers.
- Package a lightweight SDK wrapper that drives orchestrator runs programmatically (Node.js priority) and documents integration patterns for CI.
- Enable opt-in observability via OTEL exporters and notification hooks while defaulting to local-only telemetry.
- Adopt hierarchical AGENTS-style instruction discovery so repository and workspace guidance composes without reducing user autonomy.

## Non-Goals
- Forcing approval presets beyond the user’s global configuration or introducing auto-approval in restricted environments.
- Replacing existing persistence layers or manifest formats beyond the event additions needed for streaming/telemetry.
- Shipping a graphical UI; scope is CLI, SDK, and manifest outputs.

## Documentation & Evidence
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` after initial run)._

## Stakeholders
- Product: Platform Enablement (TBD)
- Engineering: Orchestrator Foundations (TBD)
- Design: N/A (CLI and programmatic interfaces only)

## Metrics & Guardrails
- Primary Success Metrics:
  - ≥90% of shell/tool calls reuse cached approvals when prior consent exists in on-request/never modes.
  - 95th percentile command latency impact from orchestrator layering ≤ +150 ms compared to baseline.
  - ≥80% adoption of JSONL event stream in CI pipelines within one release cycle of GA.
- Guardrails / Error Budgets:
  - Zero regressions in approval autonomy: if global policy is `never`, orchestrator must not prompt nor block.
  - Streaming mode memory footprint capped at 75 MB per run (process RSS) under stress scenarios.
  - OTEL/exporter failures must degrade gracefully with retries limited to <3 attempts per minute.

## User Experience
- Personas:
  - Power users running Codex locally who expect their global approval and sandbox settings to apply automatically.
  - CI/CD engineers integrating orchestrator automation via CLI/SDK.
  - Observability teams consuming telemetry for fleet-wide audits.
- User Journeys:
  - A developer with `AskForApproval=on-request` runs the orchestrator; existing approvals are respected, commands stream in real time, and retries request consent only when sandbox escalation is required.
  - A CI pipeline invokes the non-interactive mode with `--json`; downstream tooling ingests command/file-change events and structured output without additional parsing.
  - An ops engineer enables OTEL exports; telemetry captures tool decisions and outcomes while failing closed when the collector is unreachable.

## Technical Considerations
- Architectural Notes:
  - Implement a `ToolOrchestrator` service that wraps all runtimes, borrowing Codex’s approval cache semantics and sandbox retry heuristics.
  - Refactor shell/unified exec paths to share a session manager that can maintain PTY handles, chunk output, and emit begin/end events.
  - Add a CLI subcommand (e.g., `orchestrator exec`) that mirrors Codex’s `codex exec` flags, including `--json`, `--output-schema`, and `--full-auto` equivalents.
  - Develop a Node.js SDK that spawns the CLI, streams events over stdout, and exposes helpers for resume/retry flows.
  - Integrate optional OTEL exporters, notifications, and MCP client/server toggles behind config flags with sensible defaults.
  - Adopt AGENTS.md discovery logic (global + repo hierarchy) with configurable fallbacks, ensuring instructions augment rather than override user autonomy.
- Dependencies / Integrations:
  - Requires alignment with existing approval storage and manifest schemas.
  - Depends on OTEL collector availability for telemetry export (optional feature).
  - MCP integration requires compatibility testing with current server definitions.

## Open Questions
- Should we introduce task-scoped overrides for approvals, or rely solely on global settings plus per-run flags?
- What SDK language support beyond Node.js is required for initial launch (e.g., Python)?
- Do we need project-level throttling for OTEL exports to avoid collector saturation in shared CI environments?

## Approvals
- Product: _(pending)_
- Engineering: _(pending)_
- Design: N/A
