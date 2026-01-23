# Global Subagent Guidance Manifest (0956)

Date: 2026-01-23

This file captures the intended global guidance content for the subagent-first setup.
It exists as reviewable evidence inside the repo (global paths are not required).

## Intended global skill: subagents-first
- Intended path: `$CODEX_HOME/skills/subagents-first/SKILL.md`
- Fallback: use bundled skills under `skills/` when globals are unavailable.

```markdown
---
name: subagents-first
description: Use when constant subagent usage is required; enforce early delegation, evidence capture, and coordination with delegate-early + delegation-usage.
---

# Subagents First (Global)

## Intent
Default to subagents for all non-trivial work. Coordinate with the existing delegation skills for tooling and guardrails.

## Core rules
- Always spawn at least one subagent for any task that touches multiple files, needs validation, or could exceed ~10 minutes.
- Keep each subagent scope narrow and ask for short, structured summaries.
- ALWAYS wait for all subagents and background terminals to complete before yeiling.

## Workflow
1) Use `delegate-early` to choose streams and spawn subagents quickly.
2) Use `delegation-usage` for delegate.* tool calls, MCP config, and evidence capture.
3) Merge subagent findings into the main plan before implementation.

## Links (required)
- Delegate early skill: `$CODEX_HOME/skills/delegate-early/SKILL.md` (fallback: `skills/delegate-early/SKILL.md`)
- Delegation usage skill: `$CODEX_HOME/skills/delegation-usage/SKILL.md` (fallback: `skills/delegation-usage/SKILL.md`)
```

## Intended global AGENTS.md
- Intended path: `$CODEX_HOME/AGENTS.md`
- Fallback: use repo `AGENTS.md` and bundled skills when globals are unavailable.

```markdown
# Global AGENTS — Subagents First

This global guidance enforces constant subagent usage across runs.

## Core policy
- Default to subagents for any non-trivial task (multi-file, validation, research, or >10 minutes).
- ALWAYS wait for all subagents and background terminals to complete before yeiling.

## Skill references (use together)
- `subagents-first`: `$CODEX_HOME/skills/subagents-first/SKILL.md`
- `delegate-early`: `$CODEX_HOME/skills/delegate-early/SKILL.md`
- `delegation-usage`: `$CODEX_HOME/skills/delegation-usage/SKILL.md`
```
