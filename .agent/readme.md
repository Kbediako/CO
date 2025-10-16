# Agent Operating Guide

## Added by Bootstrap 2025-10-16

### Loop Overview
Follow the ai-dev-tasks loop: draft a PRD, expand it into a task list, and process one approved subtask at a time. The control playbooks in `/.ai-dev-tasks` (`create-prd.md`, `generate-tasks.md`, `process-task-list.md`) define each phase.

### Source of Truth
Keep `/tasks` as the canonical record for PRDs, task lists, specs, research notes, and the manifest. Human-facing mirrors in `/docs` must explicitly point back to the `/tasks` originals.

### Mini-Spec Policy
When scoped work meets any trigger in `.agent/SOPs/specs-and-research.md`, create or refresh a mini-spec before implementation. Link specs from their parent PRDs and subtask lists.

### Operating Rules
1) Read `.agent/AGENTS.md` and all docs under `.agent/system/` before drafting plans or executing tasks.
2) Update the active `/tasks/tasks-*.md` file after each meaningful change and pause for review.
3) Execute only one subtask at a time and wait for explicit approval before advancing.

### Quick Links
- Control files: `/.ai-dev-tasks/*`
- Templates: `.agent/task/templates/`
- Spec enforcement: `scripts/spec-guard.sh`
