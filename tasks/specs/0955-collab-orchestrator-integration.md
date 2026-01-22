---
id: 20260121-0955-collab-orchestrator-integration
title: Codex Collab Orchestrator Integration
relates_to: docs/PRD-collab-orchestrator-integration.md
risk: medium
owners:
  - Codex
last_review: 2026-01-22
---

## Summary
- Objective: Enable the orchestrator to leverage Codex CLI collab capabilities (collaboration modes + multi-agent control) and integrate them into RLM workflows.
- Scope: Config/manifest/event updates, RLM integration strategy, MCP vs collab guidance, context-rot mitigation, CO-managed patched Codex CLI installation, and guardrails for safe rollout.
- Constraints: Preserve existing orchestration behavior; keep collab optional and backward compatible; avoid in-place mutation of official Codex CLI by default.

## Technical Requirements
- Functional requirements:
  - Support selecting collaboration modes per pipeline stage and/or run metadata.
  - Provide a pathway to invoke multi-agent control for RLM iterations/subcalls and role splits.
  - Capture collab activity in run logs and manifests for auditability.
  - Provide fallback behavior when collab is unavailable or disabled.
  - Document MCP vs collab usage and when to prefer each.
  - Add context-rot safeguards for long-running tasks (decision logs, checkpoints, revalidation).
- Non-functional requirements (performance, reliability, security):
  - Avoid regressions in existing pipeline execution.
  - Bound event volume/artifact sizes; avoid unbounded log growth.
  - Keep safety approvals and sandbox behavior unchanged by default.
- Interfaces / contracts:
  - Pipeline config + CLI env/flags to pass collab configuration to Codex CLI.
  - Manifest schema additions for collab events and collaboration mode metadata.
  - RLM runner hooks for multi-agent execution (iterative + symbolic paths).
  - CO-managed Codex CLI config/metadata file and binary resolution strategy (e.g., `~/.codex/orchestrator/codex-cli/codex-cli.json`).

## Architecture & Data
- Architecture / design adjustments:
  - Extend orchestration event capture to include collab tool calls and collaboration mode changes.
  - Add an orchestration-layer adapter for multi-agent coordination (spawn/wait/close) when supported.
  - Integrate collab-aware execution into the RLM symbolic subcall path (parallel subcalls) and optional iterative triad roles.
  - Introduce checkpointed context snapshots and decision logs for multi-day tasks.
- Data model changes / migrations:
  - Manifest schema updates for collab events, agent identifiers, and collaboration mode metadata.
- External dependencies / integrations:
  - Codex CLI v0.88.0+ collab features.
  - MCP server interface for external orchestration clients (unchanged, but documented).

## Validation Plan
- Tests / checks:
  - Unit tests for new manifest/event parsing.
  - Integration test for collab-enabled pipeline run (mocked events if needed).
  - RLM symbolic run with collab subcalls and concurrency cap enforcement.
- Real-world evals:
  - Long-running refactor (multi-hour) with checkpoints; verify decision logs and revalidation.
  - Large context ingestion (multi-MB logs/specs) with symbolic RLM and collab subcalls.
  - Cross-package dependency upgrade with collab planning and delegated execution.
  - Context-rot regression: pause/resume after 24h, verify output stability.
- Rollout verification:
  - Optional feature flag + canary pipeline for collab runs.
  - Validate fallback behavior when collab is disabled.
- Monitoring / alerts:
  - Track collab event counts and timing in run metrics.

## Experiment Notes (2026-01-22)
- Symbolic RLM large-context run failed with `invalid_config` because planner output from `codex exec` can include multiple JSON blocks and extra text; the current parser slices from first `{` to last `}`, leading to parse/validation failure. Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T00-07-21-450Z-e3a8ad9c/manifest.json`, `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T00-09-38-245Z-ce05ddab/manifest.json`.
- Direct `codex exec` with the planner prompt produced multiple JSON fragments and token summaries; we need a JSONL or “last-JSON-only” extraction path for planner outputs.
- `CODEX_CONFIG_OVERRIDES` requires TOML-compatible strings (e.g., `model=\"gpt-5.2-codex\"`).
- CO-managed patched Codex CLI built from `/Users/kbediako/Code/codex` and installed to `~/.codex/orchestrator/codex-cli/bin/codex`. Verified `codex exec --json --enable collab` emits `collab_tool_call` items for `spawn_agent`, `wait`, and `close_agent`. Observed a one-off log: `failed to send tool call event: sending into a closed channel` after `close_agent`.
- CO exec pipeline captured collab JSONL in `run:summary.outputs.stdout` and `exec:chunk` events. Evidence: `.runs/0101/cli/2026-01-22T02-38-54-834Z-ca0433f4/manifest.json`.
- Patched Codex core to downgrade closed-channel event send errors; rebuilt CLI and verified `close_agent` no longer emits the error line.
- CO now parses `collab_tool_call` JSONL lines into `manifest.collab_tool_calls` (bounded via `CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS`, default 200).
- Symbolic RLM subcalls can use collab when `RLM_SYMBOLIC_COLLAB=1`; runs `codex exec --json --enable collab --sandbox read-only` and extracts the final agent message.
- Verified `manifest.collab_tool_calls` population from CO exec run: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T03-31-24-417Z-27f767a8/manifest.json`.
- Large-context symbolic RLM collab smoke failed with `invalid_config` (zero symbolic iterations) using `RLM_SYMBOLIC_COLLAB=1`; likely planner JSON parse issue (see earlier notes). Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T05-09-10-530Z-92da9d86/manifest.json`, details in `docs/findings/0955-collab-evals-2026-01-22.md`.
- Large-context symbolic RLM collab run succeeded with two iterations and collab subcall artifacts after requiring a final answer post-subcall. Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-09-33-041Z-6fad25a7/manifest.json`.
- Cross-package dependency alignment completed in `packages/design-reference-tools` (React/ReactDOM 18.3.1) with collab sub-agent verification. Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T06-20-14-418Z-90a5d7e1/manifest.json`.
- Multi-hour refactor checkpoint run consolidated run path resolution via shared `resolveRunDir` helper; updated design pipeline context and cloud sync path resolution. Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T07-14-45-894Z-7b0ffa51/manifest.json`, notes in `docs/findings/0955-collab-evals-2026-01-22.md`.
- 24h pause/resume eval started and paused before resume marker; awaiting 2026-01-23 resume to verify continuity. Evidence: `.runs/0955-collab-orchestrator-integration/cli/2026-01-22T07-43-11-038Z-21fe6295/manifest.json`, notes in `docs/findings/0955-collab-evals-2026-01-22.md`.

## Open Questions
- Should collab be required for certain RLM roles or remain opt-in everywhere?
- How should collab events be surfaced in the control server/UI?

## Approvals
- Reviewer: Codex (self-review)
- Date: 2026-01-22
- Notes: Reviewed scope against user intent; proceed with option 3 implementation (planner parsing + collab JSONL events).
