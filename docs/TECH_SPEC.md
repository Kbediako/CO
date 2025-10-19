# Technical Spec Template — Codex-Orchestrator

This file should summarize the technical decisions for your project. Replace the sections below with specifics once you define the scope.

## Scope & Goals
- _List the primary capabilities the orchestrator must deliver._
- _Call out integrations, services, or repos that participate._

## Architecture Overview
- _Describe execution modes (MCP vs. cloud) and how agents interact._
- _Note persistence requirements (manifests, logs, telemetry)._ 
- _Document security/approval expectations._

## Workflows & Tooling
- _Detail the default command sequences (build, lint, test, diagnostics)._ 
- _Reference any custom scripts or adapters you add._

## Guardrails & Telemetry
- _Explain how you validate specs, track metrics, and surface diagnostics._
- _Record any environment variables (e.g., `MCP_RUNNER_TASK_ID`)._

## Open Questions / Follow-ups
- _Track unknowns or future iterations._

Update this spec whenever the implementation evolves and mirror key points in `/tasks` and `.agent/`.
