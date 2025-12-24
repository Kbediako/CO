# Codex Orchestrator

Codex Orchestrator is the coordination layer that glues together Codex-driven agents, run pipelines, approval policies, and evidence capture for multi-stage automation projects. It wraps a reusable orchestration core with a CLI that produces auditable manifests, integrates with control-plane validators, and syncs run results to downstream systems.

> **At a glance:** Every run starts from a task description, writes the active CLI manifest to `.runs/<task-id>/cli/<run-id>/manifest.json`, emits a persisted run summary at `.runs/<task-id>/<run-id>/manifest.json`, mirrors human-readable data to `out/<task-id>/`, and can optionally sync to a remote control plane. Pipelines define the concrete commands (build, lint, test, etc.) that execute for a given task.

## How It Works
- **Planner → Builder → Tester → Reviewer:** The core `TaskManager` (see `orchestrator/src/manager.ts`) wires together agent interfaces that decide *what* to run (planner), execute the selected pipeline stage (builder), verify results (tester), and give a final decision (reviewer).
- **Execution modes:** Each plan item can flag `requires_cloud` and task metadata can set `execution.parallel`; the mode policy picks `mcp` (local MCP runtime) or `cloud` execution accordingly.
- **Event-driven persistence:** Milestones emit typed events on `EventBus`. `PersistenceCoordinator` captures run summaries in the task state store and writes manifests so nothing is lost if the process crashes.
- **CLI lifecycle:** `CodexOrchestrator` (in `orchestrator/src/cli/orchestrator.ts`) resolves instruction sources (`AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`), loads the chosen pipeline, executes each command stage via `runCommandStage`, and keeps heartbeats plus command status current inside the manifest (approval evidence will surface once prompt wiring lands).
- **Control-plane & scheduler integrations:** Optional validation (`control-plane/`) and scheduling (`scheduler/`) modules enrich manifests with drift checks, plan assignments, and remote run metadata.
- **Cloud sync (optional):** `orchestrator/src/sync/` includes a `CloudSyncWorker` + `CloudRunsClient`, but the default CLI does not wire cloud uploads yet—treat this as an integration point you enable explicitly.
- **Tool orchestration:** The shared `packages/orchestrator` toolkit handles approval prompts, sandbox retries, and tool run bookkeeping used by higher-level agents.

```
Task input ─► Planner ─► Mode policy (mcp/cloud) ─► Builder ─► Tester ─► Reviewer ─► Run summary
                         │                    │            │            │              │
                         │                    │            │            │              └─► Control-plane validators / Scheduler hooks / Cloud sync
                         │                    │            │            │
                         └─► EventBus ─► PersistenceCoordinator ─► .runs/ manifests ─► out/ audits
                                                                   │
                                                                   └─► Task state snapshots & guardrail evidence

Group execution (when `FEATURE_TFGRPO_GROUP=on`): repeat the Builder → Tester → Reviewer stages for prioritized subtasks until a stage fails or the list completes.
```

- **Mode policy:** Defaults to `mcp` but upgrades to `cloud` whenever a subtask flags `requires_cloud` or task metadata enables parallel execution, ensuring builders/testers run in the correct environment before artifacts are produced.
- **Event-driven persistence:** Every `run:completed` event flows through `PersistenceCoordinator`, writing manifests under `.runs/<task-id>/<run-id>/` and keeping task-state snapshots current before downstream consumers (control-plane validators, scheduler hooks, optional cloud sync) ingest the data.
- **Optional group loop:** When the TF-GRPO feature flag is on, the manager processes the prioritized subtask list serially, stopping early if any Builder or Tester stage fails so reviewers only see runnable work with passing prerequisites.

## Learning Pipeline (local snapshots + auto validation)
- Enabled per run with `LEARNING_PIPELINE_ENABLED=1`; after a successful stage, the CLI captures the working tree (tracked + untracked, git-ignored files excluded) into `.runs/<task-id>/cli/<run-id>/learning/<run-id>.tar.gz` and copies it to `.runs/learning-snapshots/<task-id>/<run-id>.tar.gz` by default (recorded as `learning.snapshot.storage_path`).
- Manifests record the tag, commit SHA, tarball digest/path, queue payload path, and validation status (`validated`, `snapshot_failed`, `stalled_snapshot`, `needs_manual_scenario`) under `learning.*` so reviewers can audit outcomes without external storage.
- Scenario synthesis replays the most recent successful command from the run (or prompt/diff fallback), writes `learning/scenario.json`, and automatically executes the commands; validation logs live at `learning/scenario-validation.log` and are stored in `learning.validation.log_path`.
- Override snapshot storage with `LEARNING_SNAPSHOT_DIR=/custom/dir` when needed; the default lives under `.runs/learning-snapshots/` (or `$CODEX_ORCHESTRATOR_RUNS_DIR/learning-snapshots/` when configured).

### How to run the learning pipeline locally
- Seed a normal run and keep manifests grouped by task:
  ```bash
  export MCP_RUNNER_TASK_ID=<task-id>
  LEARNING_PIPELINE_ENABLED=1 npx codex-orchestrator start diagnostics --format json
  ```
- The learning section is written only when the run succeeds; rerun the command with `LEARNING_SNAPSHOT_DIR=<abs-path>` to redirect tarball copies.

## Repository Layout
- `orchestrator/` – Core orchestration runtime (`TaskManager`, event bus, persistence, CLI, control-plane hooks, scheduler, privacy guard).
- `packages/` – Shared libraries used by downstream projects (tool orchestrator, shared manifest schema, SDK shims, control-plane schema bundle).
- `patterns/`, `eslint-plugin-patterns/` – Codemod + lint infrastructure invoked during builds.
- `scripts/` – Operational helpers (e.g., `scripts/spec-guard.mjs` for spec freshness enforcement).
- `tasks/`, `docs/`, `.agent/` – Project planning artifacts that must stay in sync (`[ ]` → `[x]` checklists pointing to manifest evidence).
- `.runs/<task-id>/` – Per-task manifests, logs, metrics snapshots (`metrics.json`), and CLI run folders.
- `out/<task-id>/` – Human-friendly summaries and (when enabled) cloud-sync audit logs.

## CLI Quick Start
1. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
2. Set the task context so artifacts land in the right folder:
   ```bash
   export MCP_RUNNER_TASK_ID=<task-id>
   ```
3. Launch diagnostics (defaults to the configured pipeline):
   ```bash
   npx codex-orchestrator start diagnostics --format json
   ```
   > Tip: keep `FEATURE_TFGRPO_GROUP`, `TFGRPO_GROUP_SIZE`, and related TF-GRPO env vars **unset** when running diagnostics. Many tests assume grouped execution is off, and the TF-GRPO guardrails require `groupSize >= 2` and `groupSize <= fanOutCapacity`. Use the `tfgrpo-learning` pipeline instead when you need grouped TF-GRPO runs.
   > HUD: add `--interactive` (or `--ui`) when stdout/stderr are TTY, TERM is not `dumb`, and CI is off to view the read-only Ink HUD. Non-interactive or JSON runs skip the HUD automatically.
4. Follow the run:
   ```bash
   npx codex-orchestrator status --run <run-id> --watch --interval 10
   ```
5. Attach the CLI manifest path (`.runs/<task-id>/cli/<run-id>/manifest.json`) when you complete checklist items; the TaskManager summary lives at `.runs/<task-id>/<run-id>/manifest.json`, metrics aggregate in `.runs/<task-id>/metrics.json`, and summaries land in `out/<task-id>/state.json`.

Use `npx codex-orchestrator resume --run <run-id>` to continue interrupted runs; the CLI verifies resume tokens, refreshes the plan, and updates the manifest safely before rerunning.

## Parallel Runs (Meta-Orchestration)
The orchestrator executes a single pipeline serially. “Parallelism” comes from running multiple orchestrator runs at the same time, ideally in separate git worktrees so builds/tests don’t contend for the same working tree outputs.

**Recommended pattern (one worktree per workstream)**
```bash
git worktree add ../CO-stream-a HEAD
git worktree add ../CO-stream-b HEAD

# terminal A
cd ../CO-stream-a
export MCP_RUNNER_TASK_ID=<task-id>-a
npx codex-orchestrator start diagnostics --format json

# terminal B
cd ../CO-stream-b
export MCP_RUNNER_TASK_ID=<task-id>-b
npx codex-orchestrator start diagnostics --format json
```

Notes:
- Use `--task <id>` instead of exporting `MCP_RUNNER_TASK_ID` when scripting runs.
- Use `--parent-run <run-id>` to group related runs in manifests (optional).
- If worktrees aren’t possible, isolate artifacts with `CODEX_ORCHESTRATOR_RUNS_DIR` and `CODEX_ORCHESTRATOR_OUT_DIR`. Use `CODEX_ORCHESTRATOR_ROOT` to point the CLI at a repo root when invoking from outside the repo (optional; defaults to the current working directory). Avoid concurrent builds/tests in the same checkout.
- For a deeper runbook, see `.agent/SOPs/meta-orchestration.md`.

### Codex CLI prompts
- The custom prompts live outside the repo at `~/.codex/prompts/diagnostics.md` and `~/.codex/prompts/review-handoff.md`. Recreate those files on every fresh machine so `/prompts:diagnostics` and `/prompts:review-handoff` are available in the Codex CLI palette.
- `/prompts:diagnostics` takes `TASK=<task-id> MANIFEST=<path> [NOTES=<free text>]`, exports `MCP_RUNNER_TASK_ID=$TASK`, runs `npx codex-orchestrator start diagnostics --format json`, tails `.runs/$TASK/cli/<run-id>/manifest.json` (or `npx codex-orchestrator status --watch`), and records evidence to `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/$TASK/metrics.json`, and `out/$TASK/state.json` using `$MANIFEST`.
- `/prompts:review-handoff` takes `TASK=<task-id> MANIFEST=<path> NOTES=<goal + summary + risks + optional questions>`, re-exports `MCP_RUNNER_TASK_ID`, runs `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, optional `npm run eval:test`, and `npm run review` (wraps `codex review` against the current diff and includes the latest run manifest path as evidence). It also reminds you to log approvals in `$MANIFEST` and mirror the evidence to the same docs/metrics/state targets.
- Always trigger diagnostics and review workflows through these prompts whenever you run the orchestrator so contributors consistently execute the required command sequences and capture auditable manifests.

### Identifier Guardrails
- `MCP_RUNNER_TASK_ID` is no longer coerced or lowercased silently. The CLI calls the shared `sanitizeTaskId` helper and fails fast when the value contains control characters, traversal attempts, or Windows-reserved characters (`<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`). Set the correct task ID in your environment *before* invoking the CLI.
- Run IDs used for manifest or artifact storage must come from the CLI (or pass the shared `sanitizeRunId` helper). Strings with colons, control characters, or `../` are rejected to ensure every run directory lives under `.runs/<task-id>/cli/<run-id>` (and legacy `mcp` mirrors) without risking traversal.

## Pipelines & Execution Plans
- Default pipelines live in `codex.orchestrator.json` (repository-specific) and `orchestrator/src/cli/pipelines/` (built-in defaults). Each stage is either a command (shell execution) or a nested pipeline.
- The `CommandPlanner` inspects the selected pipeline and target stage; you can pass `--target <stage-id>` (alias: `--target-stage`) or set `CODEX_ORCHESTRATOR_TARGET_STAGE` to focus on a specific step (e.g., rerun tests only).
- Stage execution records stdout/stderr logs, exit codes, optional summaries, and failure data directly into the manifest (`commands[]` array).
- Guardrails: before review, run `node scripts/spec-guard.mjs --dry-run` to ensure specs touched in the PR are current; the orchestrator tracks guardrail outcomes in the manifest (`guardrail_status`).

## Approval & Sandbox Model
- Approval policies (`never`, `on-request`, `auto`, or custom strings) flow through `packages/orchestrator`. Tool invocations can require approval before sandbox elevation, and all prompts/decisions are persisted.
- Sandbox retries (for transient `mcp` or cloud failures) use exponential backoff with configurable classifiers, ensuring tools get multiple attempts without masking hard failures.

## Control Plane, Scheduler, and Cloud Sync
- `control-plane/` builds versioned requests (`buildRunRequestV2`) and validates manifests against remote expectations. Drift reports are appended to run summaries so reviewers see deviations.
- `scheduler/` resolves assignments, serializes plan data, and embeds scheduler state in manifests, making it easy to coordinate multi-stage work across agents.
- `sync/` contains the cloud upload client + worker, but is not wired into the default CLI yet. Configure credentials through the credential broker (`orchestrator/src/credentials/`) and wire `createCloudSyncWorker` to an `EventBus` if you need uploads.

## Persistence & Observability
- `TaskStateStore` writes per-task snapshots with bounded lock retries; failures degrade gracefully while still writing the main manifest.
- `RunManifestWriter` generates the canonical manifest JSON for each run (mirrored under `.runs/`), while metrics appenders and summary writers keep `out/` up to date.
- Heartbeat files and timestamps guard against stalled runs. `orchestrator/src/cli/metrics/metricsRecorder.ts` aggregates command durations, exit codes, and guardrail stats for later review.

## Customizing for New Projects
- Duplicate the templates under `/tasks`, `docs/`, and `.agent/` for your task ID and keep checklist status mirrored (`[ ]` → `[x]`) with links to the manifest that proves each outcome.
- Update `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` with project details and evidence paths (`.runs/<task-id>/...`).
- Refresh `.agent/` SOPs with task-specific guardrails, escalation contacts, and artifact locations.
- Remove placeholder references in manifests/docs before merging so downstream teams see only live project data.

## Development Workflow
| Command | Purpose |
| --- | --- |
| `npm run build` | Compiles TypeScript to `dist/` (required by `docs:check`, `review`, and other wrappers). |
| `npm run lint` | Lints orchestrator, adapters, shared packages. Auto-runs `node scripts/build-patterns-if-needed.mjs` so codemods compile when missing/outdated. |
| `npm run test` | Vitest suite covering orchestration core, CLI services, and patterns. |
| `npm run eval:test` | Optional evaluation harness (enable when `evaluation/fixtures/**` is populated). |
| `npm run docs:check` | Deterministically validates scripts/pipelines/paths referenced in agent-facing docs. |
| `node scripts/spec-guard.mjs --dry-run` | Validates spec freshness; required before review. |
| `node scripts/diff-budget.mjs` | Guards against oversized diffs before review (defaults: 25 files / 800 lines; supports explicit overrides). |
| `npm run review` | Runs `codex review` and includes the latest run manifest path as evidence in the prompt. |

Run `npm run build` to compile TypeScript before packaging or invoking the CLI directly from `dist/`.

## Diff Budget

This repo enforces a small “diff budget” via `node scripts/diff-budget.mjs` to keep PRs reviewable and avoid accidental scope creep.

- Defaults: 25 changed files / 800 total lines changed (additions + deletions), excluding ignored paths.
- CI: `.github/workflows/core-lane.yml` runs the diff budget on pull requests and sets `BASE_SHA` to the PR base commit.
- Local: run `node scripts/diff-budget.mjs` before `npm run review` (the review wrapper runs it automatically).

### Local usage
- Working tree diff against the default base (uses `BASE_SHA`/`origin/main`/initial commit as available): `node scripts/diff-budget.mjs`
- Explicit base: `node scripts/diff-budget.mjs --base <ref>`
- Commit-scoped mode (ignores working tree state): `node scripts/diff-budget.mjs --commit <sha>`

### Overrides (exceptional)
- Local: `DIFF_BUDGET_OVERRIDE_REASON="..." node scripts/diff-budget.mjs`
- CI: apply label `diff-budget-override` and add a PR body line `Diff budget override: <reason>` (label without a non-empty reason fails CI).

## Review Handoff

Use an explicit handoff note for reviewers. `NOTES` is required for review runs; questions are optional:

`NOTES="<goal + summary + risks + optional questions>" npm run review`

Template: `Goal: ... | Summary: ... | Risks: ... | Questions (optional): ...`

To enable Chrome DevTools for review runs, set `CODEX_REVIEW_DEVTOOLS=1` (uses `scripts/codex-devtools.sh` when executable; otherwise falls back to `codex -c ...`).
Default to the standard `implementation-gate` for general reviews; use `implementation-gate-devtools` only when the review needs Chrome DevTools capabilities (visual/layout checks, network/perf diagnostics). After fixing review feedback, rerun the same gate and include any follow-up questions in `NOTES`.
To run the full implementation gate with DevTools-enabled review, use `npx codex-orchestrator start implementation-gate-devtools --format json --no-interactive --task <task-id>`.

## Mirror Workflows
- `npm run mirror:fetch -- --project <name> [--dry-run] [--force]`: reads `packages/<project>/mirror.config.json` (origin, routes, asset roots, rewrite/block/allow lists), caches downloads **per project** under `.runs/<task>/mirror/<project>/cache`, strips tracker patterns, rewrites externals to `/external/<host>/...`, localizes OG/twitter preview images, rewrites share links off tracker-heavy hosts, and stages into `.runs/<task>/mirror/<project>/<timestamp>/staging/public` before promoting to `packages/<project>/public`. Non-origin assets fall back to Web Archive when the primary host is down; promotion is skipped if errors are detected unless `--force` is set. Manifests live at `.runs/<task>/mirror/<project>/<timestamp>/manifest.json` (warns when `MCP_RUNNER_TASK_ID` is unset; honors `compliance/permit.json` when present).
- `npm run mirror:serve -- --project <name> [--port <port>] [--csp <self|strict|off>] [--no-range]`: shared local-mirror server with traversal guard, HTML no-cache/asset immutability, optional CSP, optional Range support, and directory-listing blocks.
- `npm run mirror:check -- --project <name> [--port <port>]`: boots a temporary mirror server when needed and verifies all configured routes with Playwright, failing on outbound hosts outside the allowlist, tracker strings (gtag/gtm/analytics/hotjar/facebook/clarity/etc.), unresolved assets, absolute https:// references, or non-200 responses. Keep this opt-in and trigger it when `packages/<project>/public` changes.

## Hi-Fi Design Toolkit Captures
Use the hi-fi pipeline to snapshot complex marketing sites (motion, interactions, tokens) while keeping the repo cloneable:

1. **Configure the source:** Update `design.config.yaml` → `pipelines.hi_fi_design_toolkit.sources` with the target URL, slug, title, and breakpoints (the repo defaults to an empty `sources` list until you add one).
2. **Permit the domain:** Add (or update) the matching record in `compliance/permit.json` so Playwright, video capture, and live assets are explicitly approved for that origin.
3. **Prep tooling:**
   - `npm install && npm run build`
   - `npm run setup:design-tools` (installs design-system deps) and ensure FFmpeg is available (`brew install ffmpeg` on macOS).
4. **Run the pipeline:**
   ```bash
   export MCP_RUNNER_TASK_ID=<task-id>
   npx codex-orchestrator start hi-fi-design-toolkit --format json --task <task-id>
   ```
   Manifests/logs/state land under `.runs/<task-id>/cli/<run-id>/`, while staged artifacts land under `.runs/<task-id>/<run-id>/artifacts/design-toolkit/` with human summaries mirrored to `out/<task-id>/`.
5. **Validate the clone:** serve the staged reference directory, e.g.
   ```bash
   cd .runs/<task-id>/<run-id>/artifacts/design-toolkit/reference/<slug>
   python3 -m http.server 4173
   ```
   The build now mirrors all `/assets/...` content and adds root shortcuts (`wp-content`, `wp-includes`, etc.) so even absolute WordPress paths work offline. A lightweight `codex-scroll-fallback` script only unlocks scrolling if the captured page never enables it.
6. **Document learnings:** Drop run evidence into `docs/findings/<slug>.md` (see `docs/findings/ethical-life.md` for the latest example) so reviewers know which manifest, artifacts, and diffs back each finding.

## Extending the Orchestrator
- Add new agent strategies by implementing the planner/builder/tester/reviewer interfaces and wiring them into `TaskManager`.
- Register additional pipelines or override defaults through `codex.orchestrator.json`. Nested pipelines let you compose reusable command groups.
- Hook external systems by subscribing to `EventBus` events (plan/build/test/review/run) or by wiring optional integrations like `CloudSyncWorker`.
- Leverage the shared TypeScript definitions in `packages/shared` to keep manifest, metrics, and telemetry consumers aligned.

---

When preparing a review, always capture the latest manifest path, run `node scripts/spec-guard.mjs --dry-run`, and ensure checklist mirrors (`/tasks`, `docs/`, `.agent/`) point at the evidence generated by Codex Orchestrator. That keeps the automation trustworthy and auditable across projects.
