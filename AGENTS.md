<!-- codex:instruction-stamp dddf9f635c295ae3ef8d803a6a4bf84f9cae21fd74cf79c6cbc7a5fa9d33e0a5 -->
# Codex-Orchestrator Agent Handbook (Template)

Use this repository as the wrapper that coordinates multiple Codex-driven projects. After cloning, replace placeholder metadata (task IDs, documents, SOPs) with values for each downstream initiative while keeping these shared guardrails in place.

## Execution Modes & Approvals
- Default execution mode is `mcp`.
- Switch to cloud mode only if your task plan explicitly allows a parallel run and the reviewer records the override in the active run manifest.
- Keep the safe approval profile (`read/edit/run/network`). Capture any escalation in `.runs/<task>/<timestamp>/manifest.json` under `approvals`.
- Run `node scripts/spec-guard.mjs --dry-run` before requesting review. Update specs or refresh approvals when the guard fails.

## Meta-Orchestration & Parallel Runs
- **Definition:** “Parallel runs” means launching multiple `codex-orchestrator start ...` runs at the same time (separate processes). A single orchestrator run executes its pipeline stages serially.
- **Primary safety rule:** run parallel work in separate worktrees/clones so builds/tests don’t fight over `node_modules/`, `dist/`, or uncommitted edits. See `.agent/SOPs/git-management.md`.
- **Task routing:** use a distinct `MCP_RUNNER_TASK_ID` per parallel workstream so `.runs/<task-id>/` and `out/<task-id>/` remain isolated. For scripted runs, prefer `codex-orchestrator start diagnostics --task <id> --format json` (or the equivalent pipeline you need).
- **Run lineage (optional):** pass `--parent-run <run-id>` to link related runs for later auditing; record the resulting manifest paths when you flip checklist items.
- **Advanced isolation (when worktrees aren’t possible):** `CODEX_ORCHESTRATOR_ROOT` is an optional repo-root override (defaults to the current working directory). `CODEX_ORCHESTRATOR_RUNS_DIR` and `CODEX_ORCHESTRATOR_OUT_DIR` are optional directory overrides (defaults under the repo root). Even with these set, avoid running write-heavy pipelines concurrently in the same working tree.

## Non-interactive Commands
- Agents do not have an interactive TTY; every command must be non-interactive or pre-seeded.
- Prefer native no-prompt flags/env vars (`--yes/-y/--force`, `DEBIAN_FRONTEND=noninteractive`, `AWS_PAGER=`); if a tool still prompts, pipe explicit input (`printf 'y\n' | cmd`, `yes n | cmd`) or feed a here-doc for multi-step answers.
- When a tool insists on a TTY, wrap it with `expect`/`pexpect` and script each `expect`/`send` pair; do not launch unscripted interactive sessions.
- If prompts are unknown, run a dry-run or list-questions mode first, then rerun with scripted responses. Never leave a command waiting for input.

## Scope & Simplicity (anti-overengineering)
- Default to the smallest change that solves the asked problem.
- Prefer editing existing code over adding new abstractions, frameworks, or dependency layers.
- Avoid broad refactors, “nice-to-have” improvements, or fixes for unrelated issues unless explicitly requested.
- If requirements are ambiguous, stop and ask before expanding scope.
- Keep diffs reviewable: split oversized changes, or (when unavoidable) record a justification via `DIFF_BUDGET_OVERRIDE_REASON` so reviewers can audit why the budget was exceeded.

## Multi-project Layout
- Place downstream codebases or adapters under `packages/<project>` (or another top-level directory agreed upon by the team).
- Store manifests, metrics, and state snapshots in `.runs/<task-id>/` and `out/<task-id>/` so each project keeps an isolated run history.
- Set `MCP_RUNNER_TASK_ID=<task-id>` before launching orchestrator commands; this routes artifacts to the correct project directory.
- Log escalations and guardrail outcomes for each project run inside the associated manifest so reviewers can audit approvals per downstream codebase.

## Checklist Convention
- Track every task and subtask with `[ ]` until complete, then flip to `[x]` while linking the manifest path that proves the outcome.
- Mirror the same status across `/tasks`, `docs/`, and `.agent/` for the active project so reviewers and automation see a single source of truth.

## Repository Hygiene & Artifacts
- Land improvements (code/docs/config) in the repo as soon as a run validates them, so `main` is always safe to clone. Heavy artifacts belong in `.runs/<task>/` and `archives/<task>/<timestamp>/`; only check in the references (manifest paths, README instructions, learnings) needed for future agents.
- Use throwaway working directories or branches for exploratory runs. After validation, copy the relevant outputs into `reference/<slug>/` or `archives/` (with README + manifest pointer) and prune bulky `.runs/.../artifacts` that aren’t referenced ensuring any relevant learnings have been extracted.
- Before opening/updating a PR, validate in a clean worktree/clone (no untracked files) so local-only directories don’t mask CI failures (e.g., `docs:check` only sees tracked paths). Quick pattern: `git worktree add ../CO-ci HEAD` then run the core lane commands in `../CO-ci/`.
- Git workflow details: `.agent/SOPs/git-management.md`.
- Keep `reference/` lean by storing only the active snapshot plus the automation scripts (loader macros, serve README). Serve-from-archive instructions should point to the canonical timestamped folder so reviewers can reproduce results without keeping every raw asset in the repo.
- Before new iterations, run the cleanup script (or manually remove stray `.runs`/`archives` folders) so the working tree returns to a clean state while leaving committed improvements intact.

## Build & Test Commands (defaults)
Implementation work is not “complete” until you run (in order):
1. `node scripts/spec-guard.mjs --dry-run`
2. `npm run build`
3. `npm run lint`
4. `npm run test`
5. `npm run docs:check`
6. `node scripts/diff-budget.mjs`
7. `npm run review`

| Command | When to use | Notes |
| --- | --- | --- |
| `node scripts/spec-guard.mjs --dry-run` | Spec freshness validation | Blocks merges when touched specs are older than 30 days. |
| `npm run build` | Build output | Compiles TypeScript to `dist/` (required by `docs:check`, `review`, and other wrappers). |
| `npm run lint` | Pre-commit / review gates | Executes `npm run build:patterns` first so codemods compile. |
| `npm run test` | Unit + integration checks | Vitest harness covering orchestrator + patterns. |
| `npm run docs:check` | Docs hygiene gate | Deterministically validates scripts/pipelines/paths referenced in agent-facing docs. |
| `node scripts/diff-budget.mjs` | Review scope guard | Fails when diffs exceed the configured budget unless `DIFF_BUDGET_OVERRIDE_REASON` is set. |
| `npm run eval:test` | Evaluation harness smoke tests | Requires fixtures in `evaluation/fixtures/**`; optional, enable when evaluation scope exists. |
| `npm run review` | Reviewer hand-off | Runs `codex review` with task/PRD context (when available) and the latest run manifest path included as evidence; set `NOTES="<goal + summary + risks>"` for reviewer context. |

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
