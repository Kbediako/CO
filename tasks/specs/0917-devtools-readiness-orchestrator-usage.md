---
id: 20251230-devtools-readiness-orchestrator-usage
title: DevTools Readiness + Orchestrator Usage Discipline
relates_to: tasks/0917-prd-devtools-readiness-orchestrator-usage.md
risk: medium
owners:
  - Codex (top-level agent)
  - Review agent
last_review: 2025-12-30
---

## Summary
- Objective: Ensure DevTools-enabled runs are reliably configurable for npm users and codify a standard that top-level orchestrators use orchestrator pipelines + subagents for scoped work.
- Constraints: DevTools stays optional; no config writes without explicit confirmation; no stdout protocol violations.

## Proposed Changes
- Architecture / design adjustments:
  - Extend DevTools readiness checks to include MCP config detection alongside skill presence.
  - Add an explicit setup helper (CLI subcommand or guided instruction output) with confirmation gates.
  - Update SOPs/agent docs to require orchestrator usage and subagent delegation for multi-step work.
- Data model updates:
  - No schema changes; update manifests/logs only as evidence.
- External dependencies:
  - Codex CLI MCP config (external).
  - Chrome DevTools MCP server (external).

## Impact Assessment
- User impact: Clearer setup flow, fewer failed devtools runs, and consistent evidence capture.
- Operational risk: Low; changes are additive and opt-in.
- Security / privacy: No new telemetry; no automated config edits; logs remain stderr-only.

## Rollout Plan
- Prerequisites: Update docs, add tests for readiness detection, verify no interactive prompts.
- Testing strategy: Unit tests for readiness detection + setup command; CLI tests for error messaging; documentation updates.
- Launch steps: Ship updated CLI and docs; communicate the new orchestrator usage standard.

## Open Questions
- None. Devtools-enabled runs hard-fail when readiness is missing, and `CODEX_HOME/config.toml` (defaulting to `~/.codex/config.toml`) is the authoritative config path.

## Approvals
- Reviewer: Pending
- Date: Pending
