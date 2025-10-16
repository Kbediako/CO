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
2) Track approvals: default mode is safe `read/edit/run/network`. Log any escalations and mode overrides in `.runs/<task>/<timestamp>/manifest.json`.
3) Update the active `/tasks/tasks-*.md` file after each meaningful change and pause for review.
4) Execute only one subtask at a time and wait for explicit approval before advancing.

### Build & Test Checklist
- `npm run lint` (always) — runs `npm run build:patterns` first.
- `npm run test` — covers orchestrator agents, persistence, and adapter logic.
- `npm run eval:test` — validates evaluation harness; ensure fixtures in `evaluation/fixtures/**` are in sync.
- `bash scripts/spec-guard.sh --dry-run` — verify specs updated before review.

### External Pointers
- MCP registration: `scripts/run-local-mcp.sh` launches the local server; confirm builder/tester agents produce artifacts in `.runs`.
- Pattern assets: `patterns/index.json` lists available codemods/linters/templates with versions.
- Release mirrors: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md` must reference their canonical `/tasks` counterparts after every milestone update.

### Quick Links
- Control files: `/.ai-dev-tasks/*`
- Templates: `.agent/task/templates/`
- Spec enforcement: `scripts/spec-guard.sh`
