<!-- codex:instruction-stamp 463baf4db617b94c6c31d00a60b5f1a61251adf79279549ce79bfbc59ddb41b6 -->
# Repository Agent Guidance

## Project 0303 — Codex Orchestrator Autonomy Enhancements
- Export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy` so diagnostics land in `.runs/0303-orchestrator-autonomy/cli/` and mirrors sync across `/tasks`, `docs/`, and `.agent/`.
- Store evidence under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`, metrics in `.runs/0303-orchestrator-autonomy/metrics.json`, and summaries in `out/0303-orchestrator-autonomy/state.json`.
- Record any approval escalations in the manifest `approvals` array and cross-link when flipping checklist items.
- Run `node scripts/spec-guard.mjs --dry-run` plus `npm run lint`, `npm run test`, `npm run eval:test` (if fixtures exist), and `node scripts/diff-budget.mjs` before reviewer hand-off; attach the manifest path documenting these runs.

## Project 0202 — Codex Orchestrator Resilience Hardening
- Existing manifests remain in `.runs/0202-orchestrator-hardening/cli/`; keep metrics/state snapshots in `.runs/0202-orchestrator-hardening/metrics.json` and `out/0202-orchestrator-hardening/state.json`.
- Maintain checklist mirrors across `tasks/tasks-0202-orchestrator-hardening.md`, `docs/TASKS.md`, and `.agent/task/0202-orchestrator-hardening.md` when updating evidence.

## Project 0506 — TF-GRPO Integration Foundations
- Export `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` so CLI manifests land in `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json` and mirror evidence across `/tasks`, `docs/`, and `.agent/`.
- Reference stamped prompt packs stored in `.agent/prompts/prompt-packs/` when wiring system/inject/summarize/extract/optimize prompts; their hashes surface in the CLI manifest `prompt_packs` array for each epoch.
- Persist experience, metrics, and OTEL artifacts under `.runs/0506-tfgrpo-integration/metrics.*` and `out/0506-tfgrpo-integration/` so reviewers can audit TF-GRPO loops end-to-end.
- Diagnostics reminder: leave `FEATURE_TFGRPO_GROUP`, `TFGRPO_GROUP_SIZE`, and related env vars unset when running the default diagnostics pipeline. Those commands run the full vitest suite (including the guardrail tests) and intentionally fail if grouped execution is forced. Use the `tfgrpo-learning` pipeline (or custom configs) for grouped TF-GRPO validation instead.

## Docs Review Gate (Pre-Implementation)
- Before implementation work, capture a docs-review manifest via `npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>` with `MCP_RUNNER_TASK_ID` set.
- Record the manifest path in the task checklists (`tasks/`, `.agent/task/`, `docs/TASKS.md`) and `tasks/index.json` for evidence.

## DevTools Review Gate (Optional)
- For frontend QA/visual review runs that need Chrome DevTools, use `npx codex-orchestrator start implementation-gate-devtools --format json --no-interactive --task <task-id>` so only the review handoff enables DevTools.
- Default to `implementation-gate` for general reviews; reserve the DevTools gate for cases that need Chrome DevTools capabilities (visual/layout checks, network/perf diagnostics). After addressing review feedback, rerun the same gate until no issues remain and include any follow-up questions in `NOTES`.
- Review-loop steps live in `.agent/SOPs/review-loop.md`.

## Parallel Runs (Meta-Orchestration)
- When coordinating multiple workstreams, prefer one worktree per stream and route manifests with unique `MCP_RUNNER_TASK_ID` values; see `AGENTS.md` and `.agent/SOPs/meta-orchestration.md`.

## Instruction Chain
- Global defaults live in `AGENTS.md`.
- Repository-level specifics (this file) describe project directories and guardrails.
- Project SOPs and task detail live under `.agent/AGENTS.md` and `.agent/task/**`.
