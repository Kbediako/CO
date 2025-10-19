# Codex-Orchestrator Agent Handbook (Template)

Use this repository as the starting point for a new Codex-driven project. After cloning, replace the placeholder metadata (task IDs, documents, SOPs) with values for your initiative. This handbook summarizes the core guardrails that remain constant across projects.

## Execution Modes & Approvals
- Default execution mode is `mcp`.
- Switch to cloud mode only if your task plan explicitly allows a parallel run and the reviewer records the override in the active run manifest.
- Keep the safe approval profile (`read/edit/run/network`). Capture any escalation in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- Run `bash scripts/spec-guard.sh --dry-run` before requesting review. Update specs or refresh approvals when the guard fails.

## Checklist Convention
- Track every task and subtask with `[ ]` until complete, then flip to `[x]` while linking the run manifest that proves the outcome.
- Mirror the same status across `/tasks`, `docs/`, and `.agent/` so reviewers and automation see a single source of truth.

## Build & Test Commands (defaults)
| Command | When to use | Notes |
| --- | --- | --- |
| `npm run lint` | Pre-commit / review gates | Executes `npm run build:patterns` first so codemods compile. |
| `npm run test` | Unit + integration checks | Vitest harness covering orchestrator + patterns. |
| `npm run eval:test` | Evaluation harness smoke tests | Requires fixtures in `evaluation/fixtures/**`; optional, enable when evaluation scope exists. |
| `bash scripts/spec-guard.sh --dry-run` | Spec freshness validation | Blocks merges when touched specs are older than 30 days. |

Update the table once you wire different build pipelines or tooling.

## MCP Runner Quick Start
1. Install and authenticate the Codex CLI.
2. Set `MCP_RUNNER_TASK_ID` to the identifier you plan to track (for example `export MCP_RUNNER_TASK_ID=0001`).
3. Launch diagnostics with `scripts/run-mcp-diagnostics.sh --no-watch` or enqueue a run with `scripts/agents_mcp_runner.mjs start` (add `--command` flags to customize the sequence).
4. Poll the run using `scripts/mcp-runner-poll.sh <run-id> --watch` or inspect `.runs/<task>/mcp/<run-id>/manifest.json`.
5. Attach the manifest path when flipping checklist items.

## Customization Checklist for New Projects
- [ ] Duplicate `/tasks` files and rename them for the new PRD / task identifiers.
- [ ] Refresh `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` with project-specific content.
- [ ] Update `.agent/AGENTS.md` and related SOPs to reflect the new workflows.
- [ ] Remove any placeholder references that remain in manifests or docs before committing.

Once these items are complete you can treat the repo as the canonical workspace for the new project.
