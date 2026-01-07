---
id: 20260106-0940-delegation-autonomy-platform
title: Codex Delegation Autonomy Platform
relates_to: tasks/tasks-0940-delegation-autonomy-platform.md
risk: high
owners:
  - Codex
last_review: 2026-01-07
---

## Summary
- Objective: Deliver a delegate-first control plane (MCP tools + UI) with always-on RLM and real-time observability.
- Constraints: Keep tool surface minimal; default to safe, explicit enablement; avoid remote dependencies.

## Proposed Changes
- Architectural design adjustments:
  - Add MCP server entrypoint with delegate.* tool surface.
  - Add events.jsonl per run and UI control endpoints.
  - Extend status UI into a control center and add a TUI.
- Data model updates: introduce events.jsonl; keep manifests backward compatible.
- External dependencies: optional GitHub CLI; Codex CLI MCP config.

## Impact Assessment
- User impact: higher autonomy with clear oversight and control; multi-repo support.
- Operational risk: high due to cross-cutting changes (MCP, UI, runner controls).
- Security / privacy: local-only by default; GitHub actions gated by config.

## Rollout Plan
- Prerequisites: docs approval + delegation tool contract finalized.
- Testing strategy: tool contract tests, UI integration tests, config precedence tests.
- Launch steps: staged rollout by milestone; keep default flags disabled until verified.

## Definition of Done
- MCP server shipped and exposes delegate.spawn/status/pause/cancel.
- Delegate tools disabled by default; enabled per run via CLI override (mcp_servers.delegation.enabled=true).
- Delegated runs default to RLM-on; override rules and timing documented and tested.
- RLM budgets and sandbox defaults are defined; budget-exceeded behavior is enforced and testable.
- Delegation-first behavior is shipped (delegation-first skill/guidance) so top-level Codex is biased toward spawning delegates and staying in oversight mode.
- Each run emits events.jsonl (append-only, versioned schema with monotonic seq).
- events.jsonl includes policy change events for rlm.policy overrides.
- Status UI extended into a control center without breaking read-only baseline (controls behind explicit enable).
- Web UI + TUI can pause/resume/cancel with confirmation and secured local control endpoints.
- GitHub workflows are repo-gated; prefer gh; fallback to token; destructive actions confirmed (merge confirm-to-act enforced).
- Tests exist for tool contracts, config precedence, event schema, and pause/resume/cancel state machine.

## Open Questions
- Should GitHub tooling be split into a separate MCP server later?

## Approvals
- Reviewer: TBD
- Date: TBD
