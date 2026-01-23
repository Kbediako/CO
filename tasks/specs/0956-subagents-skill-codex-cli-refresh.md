---
id: 20260123-0956-subagents-skill-codex-cli-refresh
title: Subagents Skill + Codex CLI Refresh Helper
relates_to: tasks/tasks-0956-subagents-skill-codex-cli-refresh.md
risk: low
owners:
  - Codex
last_review: 2026-01-23
---

## Summary
- Objective: Add a repo-relative Codex CLI refresh helper and global subagent guidance (skill + AGENTS).
- Scope: Shell script under `scripts/`, README update, global skill under `~/.codex/skills/`, global `~/.codex/AGENTS.md`, task registry updates.
- Constraints: Keep script path-agnostic and non-destructive; no prebuilt binary distribution.

## Technical Requirements
- Functional requirements:
  - Provide `scripts/codex-cli-refresh.sh` that can fast-forward upstream, optionally push the fork, and rebuild the CO-managed Codex CLI.
  - Support `--repo`, `--no-push`, `--force-rebuild`, and environment overrides (`CODEX_REPO`, `CODEX_CLI_SOURCE`).
  - Update README to document the helper and required environment variables.
  - Create a global subagent-first skill that links to `delegate-early` + `delegation-usage` and includes the required “ALWAYS wait…” line.
  - Create a global `~/.codex/AGENTS.md` linking to the three skills and emphasizing constant subagent usage.
- Non-functional requirements (performance, reliability, security):
  - Script must fail fast on merge conflicts or missing repo.
  - Do not delete branches or reset history.
  - Use ASCII-only output and deterministic behavior.
- Interfaces / contracts:
  - Script output should be human-readable and safe for CI logs.

## Architecture & Data
- Architecture / design adjustments: None (documentation + script only).
- Data model changes / migrations: None.
- External dependencies / integrations: git, cargo, `codex-orchestrator` (global or repo dist).

## Validation Plan
- Tests / checks:
  - Run `scripts/codex-cli-refresh.sh --help`.
  - Dry-run script on a clean repo (no upstream changes) to confirm fast exit.
- Rollout verification:
  - Confirm README references the script and environment overrides.
  - Verify global skill and `~/.codex/AGENTS.md` exist locally.
- Monitoring / alerts: N/A.

## Open Questions
- None.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-01-23
