# Technical Spec — Codex Collab Orchestrator Integration (Task 0955)

## Overview
- Objective: Enable orchestrator support for Codex collab capabilities and integrate them into RLM workflows with context-rot mitigation.
- Scope: Config/manifest/event updates, collab-aware RLM execution, MCP vs collab guidance, and long-running task safeguards.
- Canonical TECH_SPEC: `tasks/specs/0955-collab-orchestrator-integration.md`.

## Technical Requirements (Summary)
- Collab mode selection per pipeline stage/run and recorded in run metadata.
- Collab tool-call events captured in logs/manifests with agent identifiers.
- RLM symbolic subcalls can run via collab multi-agent control with concurrency caps.
- Backward-compatible fallback to single-agent execution when collab is disabled.
- Documentation clarifying when to use MCP vs collab.
- Real-world eval plan for multi-hour/multi-day tasks and context-rot regression.
- CO-managed patched Codex CLI install path (side-by-side) with opt-in routing for official CLI users.
- Eval metrics rubric (contradiction rate, re-discovery rate, resume latency, collab event coverage, gate pass rate).
