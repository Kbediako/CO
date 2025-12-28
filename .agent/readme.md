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

### Checklist Convention
Use explicit checkboxes (`[ ]` → `[x]`) for every task and subtask tracked in `/tasks` or mirror docs. Flip the marker to `[x]` as soon as the work is complete and reference the supporting run manifest or log alongside the checkbox note.

### Build & Test Checklist
- [ ] `npm run lint` (always) — runs `npm run build:patterns` first.
- [ ] `npm run test` — covers orchestrator agents, persistence, and adapter logic.
- [ ] `npm run eval:test` — validates evaluation harness; ensure fixtures in `evaluation/fixtures/**` are in sync.
- [ ] `node scripts/spec-guard.mjs --dry-run` — verify specs updated before review.

### External Pointers
- MCP registration: `codex-orchestrator mcp serve` launches the local server; confirm builder/tester agents produce artifacts in `.runs`.
- Pattern assets: `patterns/index.json` lists available codemods/linters/templates with versions.
- Release mirrors: `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md` must reference their canonical `/tasks` counterparts after every milestone update.

### CLI Orchestrator Quickstart
- **Run diagnostics:** `npx codex-orchestrator start diagnostics --format json` executes the default build/lint/test/spec-guard pipeline and prints the run id plus manifest path under `.runs/<task>/cli/<run-id>/`.
- **Monitor progress:** `npx codex-orchestrator status --run <run-id> --watch --interval 10` streams status updates until the run reaches a terminal state. Use `--format json` to feed automation.
- **Resume a run:** `npx codex-orchestrator resume --run <run-id>` resets stale heartbeats, rewinds failed stages, and restarts the pipeline without touching successful commands.
- **Legacy shims:** Existing scripts (`scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`, `scripts/run-mcp-diagnostics.sh`) now delegate to the CLI so older docs continue to work. Prefer the `codex-orchestrator` binary for new workflows.
- **Custom pipelines:** Define additional pipelines in `codex.orchestrator.json` and invoke them with `codex-orchestrator start <pipeline-id>`. Nested sub-pipelines automatically record child manifests and `parentRunId` lineage.

### Quick Links
- Control files: `/.ai-dev-tasks/*`
- Templates: `templates/`
- Spec enforcement: `scripts/spec-guard.mjs`
