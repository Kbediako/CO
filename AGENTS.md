<!-- codex:instruction-stamp 787709cc4152ee570c39bfcc58deb9bfde6fe3140dd98ad14460c6773c07cd4b -->
# Codex-Orchestrator Agent Handbook (Template)

Use this repository as the wrapper that coordinates multiple Codex-driven projects. After cloning, replace placeholder metadata (task IDs, documents, SOPs) with values for each downstream initiative while keeping these shared guardrails in place.

## Execution Modes & Approvals
- Default execution mode is `mcp`.
- Switch to cloud mode only if your task plan explicitly allows a parallel run and the reviewer records the override in the active run manifest.
- Keep the safe approval profile (`read/edit/run/network`). Capture any escalation in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- Run `node scripts/spec-guard.mjs --dry-run` before requesting review. Update specs or refresh approvals when the guard fails.

## Multi-project Layout
- Place downstream codebases or adapters under `packages/<project>` (or another top-level directory agreed upon by the team).
- Store manifests, metrics, and state snapshots in `.runs/<task-id>/` and `out/<task-id>/` so each project keeps an isolated run history.
- Set `MCP_RUNNER_TASK_ID=<task-id>` before launching orchestrator commands; this routes artifacts to the correct project directory.
- Log escalations and guardrail outcomes for each project run inside the associated manifest so reviewers can audit approvals per downstream codebase.

## Checklist Convention
- Track every task and subtask with `[ ]` until complete, then flip to `[x]` while linking the manifest path that proves the outcome.
- Mirror the same status across `/tasks`, `docs/`, and `.agent/` for the active project so reviewers and automation see a single source of truth.

## Build & Test Commands (defaults)
| Command | When to use | Notes |
| --- | --- | --- |
| `npm run lint` | Pre-commit / review gates | Executes `npm run build:patterns` first so codemods compile. |
| `npm run test` | Unit + integration checks | Vitest harness covering orchestrator + patterns. |
| `npm run eval:test` | Evaluation harness smoke tests | Requires fixtures in `evaluation/fixtures/**`; optional, enable when evaluation scope exists. |
| `node scripts/spec-guard.mjs --dry-run` | Spec freshness validation | Blocks merges when touched specs are older than 30 days. |
| `npm run review` | Reviewer hand-off | Runs `codex review --manifest <latest>` using the newest run manifest under `.runs/**`. |

Update the table once you wire different build pipelines or tooling.

## CLI Orchestrator Quick Start
1. Install and authenticate the Codex CLI.
2. Export `MCP_RUNNER_TASK_ID=<task-id>` for the project you are touching so manifests land under `.runs/<task-id>/cli/`.
3. Launch diagnostics with `npx codex-orchestrator start diagnostics --format json`; the command prints the run id, manifest path, and log location.
4. Monitor progress using `npx codex-orchestrator status --run <run-id> --watch --interval 10` or read `.runs/<task-id>/cli/<run-id>/manifest.json` directly.
5. Attach the manifest path when flipping checklist items; metrics aggregate in `.runs/<task-id>/metrics.json` and summaries in `out/<task-id>/state.json`.

## Customization Checklist for New Projects
- [ ] Duplicate `/tasks` files and rename them for the new PRD / task identifiers, updating links to `.runs/<task-id>/...` manifests.
- [ ] Refresh `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` with project-specific content and manifest evidence.
- [ ] Update `.agent/` SOPs to describe project-specific guardrails, escalation paths, and run evidence locations.
- [ ] Remove placeholder references that remain in manifests or docs before committing so downstream teams only see active project data.

Once these items are complete you can treat the repo as the canonical workspace for the new project.
