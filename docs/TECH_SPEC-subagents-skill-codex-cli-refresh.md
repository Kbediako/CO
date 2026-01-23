# Technical Spec — Subagents Skill + Codex CLI Refresh Helper (Task 0956)

## Overview
- Objective: Ship a repo-relative Codex CLI refresh helper and global subagent guidance.
- Scope: `scripts/codex-cli-refresh.sh`, README update, global skill + global AGENTS.md, registry updates.
- Canonical TECH_SPEC: `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`.

## Technical Requirements (Summary)
- Add a path-agnostic refresh script that fast-forwards upstream, optionally pushes the fork, and rebuilds the CO-managed Codex CLI.
- Document environment overrides (`CODEX_REPO`, `CODEX_CLI_SOURCE`) in README.
- Add a global subagent-first skill that links to `delegate-early` and `delegation-usage` and includes the required wait-for-subagents line.
- Add a global `~/.codex/AGENTS.md` that links to all three skills and emphasizes constant subagent usage.
