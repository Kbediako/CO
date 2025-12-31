<!-- codex:instruction-stamp 31d975de97a3ac5c1412af39c9a2818442b6509e3f584f0266db161c997b527b -->
# Agent Enablement

## Added by Bootstrap 2025-10-16

### Overview
- Languages: confirm the active stacks before committing changes (common defaults include TypeScript/JavaScript, Python, and SQL).
- Package managers: expect `npm` or `yarn` for JS apps and `pip` for Python utilities; verify per-service.
- Build targets: support `dev`, `prod`, and `ci` workflows via service-specific scripts documented in `/tasks` once established.
- Tests: maintain coverage across unit, integration, and e2e layers; align with the active `/tasks/tasks-*.md` checklist before merging.
- Deployment: coordinate through the deployment SOPs under `.agent/SOPs/` once environments are defined.

### Execution Modes & Approvals
- Default run mode is `mcp`; switch to cloud only when the canonical task list flags `execution.parallel=true` and the reviewer records the override in the run manifest.
- Honor the safe `read/edit/run/network` approval profile. Capture escalations in the manifest `approvals` array with reviewer justification and timestamp.
- Run `node scripts/delegation-guard.mjs` prior to requesting review; if delegation is not possible, set `DELEGATION_GUARD_OVERRIDE_REASON` and record the justification in the checklist.
- Run `node scripts/spec-guard.mjs --dry-run` prior to requesting review; a failing guard requires refreshing relevant specs (see `.agent/SOPs/specs-and-research.md`).

### Meta-Orchestrator Mode (Parallel Workstreams)
- Use parallel workstreams to stay within context limits: split independent work into separate runs/worktrees, then consolidate back to a single reviewed diff.
- Keep “worker” agents single-focused (one subtask/area per run); reserve coordination, merging, and final validation for the meta-orchestrator.
- Prefer one worktree per workstream (example: `git worktree add ../CO-<slug>-a HEAD`) and route artifacts with `MCP_RUNNER_TASK_ID=<task-id>-<stream>`.
- If you need lineage, pass `--parent-run <run-id>` when starting sibling runs so manifests can be audited as a group.
- If worktrees aren’t viable, use `CODEX_ORCHESTRATOR_RUNS_DIR` / `CODEX_ORCHESTRATOR_OUT_DIR` (and optionally `CODEX_ORCHESTRATOR_ROOT` when invoking from outside the repo) to isolate manifests and state snapshots, but treat the working tree as a shared resource (avoid concurrent builds/tests).

### Build & Test Quick Reference
- `npm run lint` — Executes `npm run build:patterns` before linting orchestrator, adapter, and evaluation sources.
- `npm run test` — Complete Vitest suite (manager, agents, persistence, adapters).
- `npx vitest run <pattern>` — Use this non-watch mode for focused suites; plain `npx vitest` launches an interactive watcher that never exits (we can’t press `q`), so always prefer the `run` form in automation.
- `npm run eval:test` — Exercises evaluation harness scenarios; depends on local `python3` for cross-language fixtures.
- `npm run docs:freshness` — Docs freshness audit; writes `out/<task-id>/docs-freshness.json`.
- `npm run build:patterns` — Compile codemods/linters/templates; run whenever `patterns/**` changes.
- `node --loader ts-node/esm evaluation/harness/run-all.ts --mode=mcp` — Manual sweep to generate scenario artifacts for manifests.
- `node scripts/diff-budget.mjs` — Enforces a small-diff budget before review; set `DIFF_BUDGET_OVERRIDE_REASON` to bypass with justification.
- `npm run review` — Launches `codex review` with a non-interactive prompt that includes the latest run manifest path as evidence (reviews “current changes” by default); in CI or when stdin is not a TTY (or `CODEX_REVIEW_NON_INTERACTIVE`/`CODEX_NON_INTERACTIVE` is set) it prints the handoff prompt and exits unless `FORCE_CODEX_REVIEW=1`; `NOTES` is required and should include goal, summary, risks, and optional questions.
- `codex-orchestrator plan [pipeline]` — Preview resolved pipeline stages without execution; add `--format json` for automation inputs.

### Runtime knobs (optional)
- `CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS` caps the number of exec chunk events retained per command (0 disables the cap).
- `CODEX_METRICS_PRIVACY_EVENTS_MAX` caps privacy decision events recorded in `metrics.json` (-1 disables the cap; `privacy_event_count` still tracks the full total).

### Codex CLI prompts
- Keep the prompt files `~/.codex/prompts/diagnostics.md` and `~/.codex/prompts/review-handoff.md` on every workstation (they are not checked into the repo). Each prompt wires `/prompts:<name>` to the required orchestrator commands so contributors do not have to remember the sequences manually.
- `/prompts:diagnostics TASK=<task-id> MANIFEST=<path> [NOTES=<free text>]` exports `MCP_RUNNER_TASK_ID=$TASK`, runs `npx codex-orchestrator start diagnostics --format json`, tails `.runs/$TASK/cli/<run-id>/manifest.json` (or `status --watch`), and reminds you to mirror evidence + `$MANIFEST` references into `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/$TASK/metrics.json`, and `out/$TASK/state.json`.
- `/prompts:review-handoff TASK=<task-id> MANIFEST=<path> NOTES=<goal + summary + risks + optional questions>` re-validates guardrails via `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, executes `npm run lint`, `npm run test`, optional `npm run eval:test`, runs `node scripts/diff-budget.mjs`, then runs `npm run review`, and ensures approvals/escalations are logged in `$MANIFEST` before checklists flip.
- Always use these prompts before running diagnostics or prepping a review; they are the canonical way to drive the orchestrator so manifests, approvals, and docs stay in sync across machines.

### Frontend Testing Pipeline (Core)
Note: pipelines already set `CODEX_NON_INTERACTIVE=1`; keep it for shortcut runs and other automation.
- Default-off DevTools: `CODEX_NON_INTERACTIVE=1 npx codex-orchestrator start frontend-testing --format json --no-interactive --task <task-id>`.
- DevTools-enabled: `CODEX_NON_INTERACTIVE=1 npx codex-orchestrator start frontend-testing-devtools --format json --no-interactive --task <task-id>` or `CODEX_NON_INTERACTIVE=1 codex-orchestrator frontend-test --devtools`.
- Shortcut: `CODEX_NON_INTERACTIVE=1 codex-orchestrator frontend-test` runs the `frontend-testing` pipeline with DevTools off unless `--devtools` is set.
- Readiness check: `codex-orchestrator doctor --format json` reports DevTools skill + MCP config availability.
- Setup helper: `codex-orchestrator devtools setup` prints setup steps (`--yes` to apply).

### Read First Order
1. `.agent/system/architecture.md`
2. `.agent/system/services.md`
3. `.agent/system/api-surface.md`
4. `.agent/system/conventions.md`
5. `.agent/system/database.md`
6. `.agent/SOPs/specs-and-research.md`
7. `.agent/SOPs/db-migration.md`

### PR Lifecycle (Top-Level Agents)
- Open PRs for code/config changes and keep the scope tied to the active task.
- Monitor PR checks and review feedback for 10–20 minutes after all required checks turn green.
- If checks remain green and no new feedback arrives during the window, merge via GitHub and delete the branch.
- Reset the window if checks restart or feedback arrives; do not merge draft PRs or PRs labeled "do not merge."

### Workflow Pointers
- Always start by reviewing the relevant PRD in `/tasks` and its mirrored snapshot in `/docs`.
- Use templates in `.agent/task/templates/` to draft PRDs, task lists, mini-specs, and research notes.
- Run `node scripts/delegation-guard.mjs` and `node scripts/spec-guard.mjs --dry-run` before opening reviews to ensure delegation and specs stay in sync with code changes.
- Default decision policy and autonomy rules live in `.agent/SOPs/agent-autonomy-defaults.md`.
- Use `.agent/task/templates/subagent-request-template.md` for subagent prompts and deliverables.
- Orchestrator-first: use `codex-orchestrator` pipelines for planning, implementation, validation, and review; avoid ad-hoc command chains unless no manifest evidence is required.
- Delegation is mandatory for top-level tasks: spawn at least one subagent run using `MCP_RUNNER_TASK_ID=<task-id>-<stream>`, capture manifest evidence, and summarize in the main run. Use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible and record the justification.
- When writing PR summaries, avoid literal `\n` sequences; use `gh pr create --body-file` or a here-doc so line breaks render correctly in GitHub.
- Keep `docs/TASKS.md` under the line threshold in `docs/tasks-archive-policy.json`; run `npm run docs:archive-tasks` and push archive payloads to the `task-archives` branch when needed.

## Project 0303 — Codex Orchestrator Autonomy Enhancements
- Set `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy` for all diagnostics and orchestrator executions; confirm manifests land in `.runs/0303-orchestrator-autonomy/cli/`.
- Log approvals/escalations inside each run manifest and reference the same path when you flip checkmarks in `tasks/tasks-0303-orchestrator-autonomy.md`, `docs/TASKS.md`, and `.agent/task/0303-orchestrator-autonomy.md`.
- Keep metrics in `.runs/0303-orchestrator-autonomy/metrics.json` and summarize outcomes in `out/0303-orchestrator-autonomy/state.json`; update docs when these files change.
- Before requesting review, run `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, and `npm run eval:test` (if fixtures exist), then capture the manifest path documenting those executions.
- Follow `.agent/SOPs/orchestrator-autonomy.md` for guardrail, evidence, and hand-off requirements specific to Task 0303.

## Project 0506 — TF-GRPO Integration Foundations
- Set `MCP_RUNNER_TASK_ID=0506-tfgrpo-integration` before invoking TF-GRPO pipelines so manifests, metrics, and state snapshots land under `.runs/0506-tfgrpo-integration/**` and `out/0506-tfgrpo-integration/**`.
- Only use stamped prompt packs from `.agent/prompts/prompt-packs/**`; their SHA-256 signatures must match the manifest or the loader will reject the run. Manifests expose these values via the `prompt_packs` array for auditors.
- Persist ≤32-word experiences and reward evidence inside `out/0506-tfgrpo-integration/experiences.jsonl` and cross-link the manifest path each time you flip checklist items in `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md`.
- Guardrails still require `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, and `npm run test` prior to review; attach the TF-GRPO manifest path documenting these validations.

### Database Safety Safeguards
- Treat production data as immutable; require read-only replicas or sanitized fixtures for testing.
- Follow `.agent/SOPs/db-migration.md` for expand/contract rollouts with backups and verification gates.
- Gate schema changes behind peer review plus sign-off recorded in `/tasks` manifests.
