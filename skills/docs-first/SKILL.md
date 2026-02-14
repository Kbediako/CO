---
name: docs-first
description: "Use when a task requires a spec-driven workflow: draft/refresh PRD + TECH_SPEC + ACTION_PLAN + tasks, link TECH_SPEC in tasks/index.json, and run docs-review before implementation."
---

# Docs-First (Spec-Driven)

## Overview

Use this skill when a task needs a spec-driven workflow. The objective is to create or refresh PRD + TECH_SPEC + ACTION_PLAN + the task checklist before editing code or docs, capture a brief translation of the user’s request in the PRD for context retention, and keep task mirrors and review evidence in sync as understanding evolves.

## Workflow

1) Draft or refresh PRD + TECH_SPEC + ACTION_PLAN
- PRD: capture intent and user-request translation (use `.agent/task/templates/prd-template.md`).
- TECH_SPEC: capture technical requirements (use `.agent/task/templates/tech-spec-template.md`; stored under `tasks/specs/<id>-<slug>.md`).
- ACTION_PLAN: capture sequencing/milestones (use `.agent/task/templates/action-plan-template.md`).
- Depth scales with scope, but all three docs are required.
- For low-risk tiny edits, follow the bounded shortcut in `docs/micro-task-path.md` instead of long-form rewrites.

2) Register the TECH_SPEC and task
- Add the TECH_SPEC to `tasks/index.json` (including `last_review`).
- Create/refresh the task checklist (`tasks/tasks-*.md`) and mirror to `.agent/task/`.
- Update `docs/TASKS.md` with the snapshot entry.
- When you need machine-readable artifacts, use a consistent template or structured output format.

3) Run docs-review before implementation
- `npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>`
- If running in cloud mode, ensure the branch exists on remote. For local-only branches, set `CODEX_CLOUD_BRANCH=main` (or another pushed branch).
- Link the manifest path in the checklists.

4) Implement and validate
- Keep PRD/TECH_SPEC/ACTION_PLAN, checklists, and manifests aligned.
- Update PRD/TECH_SPEC/ACTION_PLAN when new constraints, risks, or scope changes are discovered during implementation.
- If docs are missing or stale, stop and request approval before proceeding.

## Output expectations
- PRD + TECH_SPEC + ACTION_PLAN + task checklist created/refreshed.
- TECH_SPEC linked in task registry and mirrors updated.
- Docs-review evidence captured before implementation.

## Related docs
- `docs/AGENTS.md`
- `docs/guides/instructions.md`
