---
id: 20260106-0940-delegation-autonomy-platform
title: Codex Delegation Autonomy Platform
relates_to: tasks/tasks-0940-delegation-autonomy-platform.md
risk: high
owners:
  - Codex
last_review: 2026-01-08
---

## Summary
- Objective: Deliver a delegate-first control plane (MCP tools + UI) with always-on RLM and real-time observability.
- Constraints: Keep tool surface minimal; default to safe, explicit enablement; avoid remote dependencies.

## Proposed Changes
- Architectural design adjustments:
  - Add MCP server entrypoint with delegate.* tool surface.
  - Add events.jsonl per run and UI control endpoints.
  - Add an escalation question queue for parent runs (events-driven, UI/TUI surfaced).
  - Question queue definition: delegated runs can enqueue questions to the parent run; questions have IDs, status (queued/answered/expired/dismissed), and optional TTL. Parent UI/TUI surfaces the queue; default behavior may auto-pause the child until answered or an expiry fallback is applied. Dismissed means the parent closes a question without an answer.
  - Define the question queue API surface (delegate.question.enqueue and delegate.question.poll) and relay path via the delegation server.
  - Extend status UI into a control center and add a TUI.
- Data model updates: introduce events.jsonl; keep manifests backward compatible.
- External dependencies: optional GitHub CLI; Codex CLI MCP config.

## Impact Assessment
- User impact: higher autonomy with clear oversight and control; multi-repo support.
- Operational risk: high due to cross-cutting changes (MCP, UI, runner controls).
- Security / privacy: local-only by default; GitHub actions gated by config.

## Rollout Plan
- Prerequisites: docs approval + delegation tool contract finalized + MCP host support for codex_private (hard gate for runner-injected secrets).
- Testing strategy: tool contract tests, UI integration tests, config precedence tests.
- Launch steps: staged rollout by milestone; keep default flags disabled until verified.

## Definition of Done
- MCP server shipped and exposes delegate.spawn/status/pause/cancel.
- Delegate tools disabled by default; enabled per run via CLI override (mcp_servers.delegation.enabled=true).
- MCP host supports codex_private for runner-injected secrets (confirm_nonce, delegation_token).
- Delegated runs default to RLM-on; override rules and timing documented and tested.
- RLM budgets and sandbox defaults are defined; budget-exceeded behavior is enforced and testable.
- RLM recursion depth cap (rlm.max_subcall_depth) is defined and configurable; shipping default is depth=1 until the benchmark gate passes, with deeper recursion only via explicit per-run override (opt-in, not default behavior).
- Delegation-first behavior is shipped (delegation-first skill/guidance) so top-level Codex is biased toward spawning delegates and staying in oversight mode.
- Each run emits events.jsonl (append-only, versioned schema with monotonic seq).
- events.jsonl includes policy change events for rlm.policy overrides.
- Parent runs expose a question queue for delegate escalations; UI/TUI can answer/close questions with events emitted.
- Child runs have a restricted delegation surface (delegate.question.* and optional delegate.status) unless nested delegation is explicitly enabled; question_only scopes delegate.* tools, while GitHub.* visibility remains repo-gated.
- delegation_token handling is defined (runner-injected, never logged) with explicit redaction rules for tool_called/events.
- Confirm-to-act semantics include a defined pause/dedupe/persistence/expiry lifecycle for tool-originated actions.
- Confirm-to-act replay path is explicit: runner replays approved actions with confirm_nonce out-of-band; model-supplied nonce is rejected.
- paths.allowed_roots default behavior is specified (repo root when unset, deny when empty).
- Prod vs dev gating is explicit (runner.mode defaults to prod; dev-only features require opt-in).
- Safety-critical config keys are repo-capped and documented (runner.mode, rlm.environment, sandbox/network, repo mounts).
- delegate.tool_profile is repo-capped via delegate.allowed_tool_servers (repo-only cap; defaults to empty when omitted; higher-precedence layers can only narrow via intersection).
- Deep recursion default has a benchmark gate with defined fallback (planned default depth=4; shipping default depth=1 until gate passes).
- Status UI extended into a control center without breaking read-only baseline (controls behind explicit enable).
- Web UI + TUI can pause/resume without confirmation and cancel with confirm-to-act, using secured local control endpoints.
- GitHub workflows are repo-gated; prefer gh; fallback to token; destructive actions confirmed (merge confirm-to-act enforced).
- Tests exist for tool contracts, config precedence, event schema, and pause/resume/cancel state machine.

## Open Questions
- Should GitHub tooling be split into a separate MCP server later?

## Docs Review (non-approval)
- Reviewer: Codex (docs-only review; planning approvals tracked in PRD/TECH_SPEC)
- Date: 2026-01-07
