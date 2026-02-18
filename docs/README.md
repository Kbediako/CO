# Codex Orchestrator (Repository Guide)

> **Internal/Contributor guide:** This document covers repository internals and workflow details. End‑user installation and usage live in `README.md`.

Codex Orchestrator is the coordination layer that glues together Codex-driven agents, run pipelines, approval policies, and evidence capture for multi-stage automation projects. It wraps a reusable orchestration core with a CLI that produces auditable manifests, integrates with control-plane validators, and syncs run results to downstream systems.

> **At a glance:** Every run starts from a task description, writes the active CLI manifest to `.runs/<task-id>/cli/<run-id>/manifest.json`, emits a persisted run summary at `.runs/<task-id>/<run-id>/manifest.json`, mirrors human-readable data to `out/<task-id>/`, and can optionally sync to a remote control plane. Pipelines define the concrete commands (build, lint, test, etc.) that execute for a given task.

## Evaluation & Metrics
- Evaluation playbook: `docs/guides/evaluation-playbook.md`.
- Metrics reference: `docs/reference/metrics-collab-context-rot.md`.

## Collab vs MCP
- Decision guide: `docs/guides/collab-vs-mcp.md`.

## Downstream init
- See `README.md` for the recommended quick-start flow.

## Upstream Sync
- Codex CLI sync strategy: `docs/guides/upstream-codex-cli-sync.md`.

## Release Notes
- Shipped skills note: `docs/release-notes-template-addendum.md`.
- Optional overview override: add and commit a release overview file at .github/release-overview.md before tagging; the release workflow uses it when present.

## How It Works
- **Planner → Builder → Tester → Reviewer:** The core `TaskManager` (see `orchestrator/src/manager.ts`) wires together agent interfaces that decide *what* to run (planner), execute the selected pipeline stage (builder), verify results (tester), and give a final decision (reviewer).
- **Execution modes:** Each plan item can flag `requires_cloud` and task metadata can set `execution.parallel`; the mode policy picks `mcp` (local MCP runtime) or `cloud` execution accordingly. Cloud runs perform a quick preflight (env id, codex availability, optional remote branch) and fall back to `mcp` with both summary text and a structured `cloud_fallback` manifest block when preflight fails.
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
- Successful pipeline runs also persist lightweight experience records in `out/<task-id>/experiences.jsonl` using prompt-pack domains, so future runs can inject higher-signal context without requiring learning snapshots.
- Prompt-pack injections apply a minimum reward threshold (`TFGRPO_EXPERIENCE_MIN_REWARD`, default `0.1`) to avoid re-injecting low-signal records.
- In cloud execution mode, the orchestrator now injects a bounded subset of relevant prompt-pack experience snippets directly into the cloud task prompt, so persisted experience data can influence execution outcomes immediately.

### How to run the learning pipeline locally
- Seed a normal run and keep manifests grouped by task:
  ```bash
  export MCP_RUNNER_TASK_ID=<task-id>
  LEARNING_PIPELINE_ENABLED=1 npx @kbediako/codex-orchestrator start diagnostics --format json
  ```
- The learning section is written only when the run succeeds; rerun the command with `LEARNING_SNAPSHOT_DIR=<abs-path>` to redirect tarball copies.

## Repository Layout
- `orchestrator/` – Core orchestration runtime (`TaskManager`, event bus, persistence, CLI, control-plane hooks, scheduler, privacy guard).
- `packages/` – Shared libraries used by downstream projects (tool orchestrator, shared manifest schema, SDK shims, control-plane schema bundle).
- `patterns/`, `eslint-plugin-patterns/` – Codemod + lint infrastructure invoked during builds.
- `scripts/` – Operational helpers for repo contributors (e.g., `scripts/spec-guard.mjs`), not shipped in the npm package.
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
   npx @kbediako/codex-orchestrator start diagnostics --format json
   ```
   > Tip: keep `FEATURE_TFGRPO_GROUP`, `TFGRPO_GROUP_SIZE`, and related TF-GRPO env vars **unset** when running diagnostics. Many tests assume grouped execution is off, and the TF-GRPO guardrails require `groupSize >= 2` and `groupSize <= fanOutCapacity`. Use the `tfgrpo-learning` pipeline instead when you need grouped TF-GRPO runs.
   > HUD: add `--interactive` (or `--ui`) when stdout/stderr are TTY, TERM is not `dumb`, and CI is off to view the read-only Ink HUD. Non-interactive or JSON runs skip the HUD automatically.
4. Follow the run:
   ```bash
   npx @kbediako/codex-orchestrator status --run <run-id> --watch --interval 10
   ```
5. Attach the CLI manifest path (`.runs/<task-id>/cli/<run-id>/manifest.json`) when you complete checklist items; the TaskManager summary lives at `.runs/<task-id>/<run-id>/manifest.json`, metrics aggregate in `.runs/<task-id>/metrics.json`, and summaries land in `out/<task-id>/state.json`.

Use `npx @kbediako/codex-orchestrator resume --run <run-id>` to continue interrupted runs; the CLI verifies resume tokens, refreshes the plan, and updates the manifest safely before rerunning.

## Companion Package Commands
- `codex-orchestrator mcp serve [--repo <path>] [--dry-run] [-- <extra args>]`: launch the MCP stdio server (delegates to `codex mcp-server`; stdout guard keeps protocol-only output, logs to stderr).
- `codex-orchestrator init codex [--cwd <path>] [--force]`: copy starter templates into a repo (includes `mcp-client.json` and `AGENTS.md`; no overwrite unless `--force`).
- `codex-orchestrator setup [--yes] [--refresh-skills]`: one-shot bootstrap for downstream users (installs bundled skills, configures delegation + DevTools wiring, and prints policy/usage guidance). By default, setup does not overwrite existing skills; add `--refresh-skills` when you want to replace existing bundled skill files.
- `codex-orchestrator flow [--task <task-id>]`: runs `docs-review` then `implementation-gate` in sequence; stops on the first failure.
- `codex-orchestrator doctor [--format json] [--usage] [--apply]`: check optional tooling dependencies plus collab/cloud/delegation readiness and print enablement commands. `--usage` appends a local usage snapshot (scans `.runs/`) with adoption KPIs. `--apply` plans/applies quick fixes (use with `--yes`).
- `codex-orchestrator devtools setup [--yes]`: print DevTools MCP setup instructions (`--yes` applies `codex mcp add ...`).
- `codex-orchestrator delegation setup [--yes]`: configure delegation MCP wiring (`--yes` applies `codex mcp add ...`).
- `codex-orchestrator skills install [--force] [--only <skills>] [--codex-home <path>]`: install bundled skills into `$CODEX_HOME/skills` (prefer global skills when installed; fall back to bundled skills, for example use `$CODEX_HOME/skills/docs-first` when present, otherwise `skills/docs-first/SKILL.md`).
- `codex-orchestrator self-check --format json`: emit a safe JSON health payload for smoke tests.
- `codex-orchestrator --version`: print the package version.

## Publishing (npm)
- Pack audit: `npm run pack:audit` (validates the tarball file list; run `npm run clean:dist && npm run build` first if `dist/` contains non-runtime artifacts).
- Pack smoke: `npm run pack:smoke` (installs the tarball in a temp dir and runs `--help`, `--version`, `self-check`; uses network).
- Release tags: `vX.Y.Z` or `vX.Y.Z-alpha.N` must match `package.json` version.
- Dist-tags: stable publishes to `latest`; alpha publishes to `alpha` and uses a GitHub prerelease.
- Publishing auth: workflow attempts OIDC trusted publishing first (`id-token: write` + `--provenance`), then falls back to `secrets.NPM_TOKEN` when OIDC is unavailable. `secrets.NPM_TOKEN` must be an npm automation token (not a token that requires OTP).
- Trusted publisher config: npm expects workflow filename `release.yml` (the file must exist at `.github/workflows/release.yml` on the default branch). Leave environment blank unless the publish job sets `environment: ...`.
- OIDC runtime prereqs: npm trusted publishing currently requires Node.js `22.14.0+` and npm `11.5.1+`; the publish job installs npm `^11.5.1` before publishing.

## Parallel Runs (Meta-Orchestration)
The orchestrator executes a single pipeline serially. “Parallelism” comes from running multiple orchestrator runs at the same time, ideally in separate git worktrees so builds/tests don’t contend for the same working tree outputs.

**Recommended pattern (one worktree per workstream)**
```bash
git worktree add ../CO-stream-a HEAD
git worktree add ../CO-stream-b HEAD

# terminal A
cd ../CO-stream-a
export MCP_RUNNER_TASK_ID=<task-id>-a
npx @kbediako/codex-orchestrator start diagnostics --format json

# terminal B
cd ../CO-stream-b
export MCP_RUNNER_TASK_ID=<task-id>-b
npx @kbediako/codex-orchestrator start diagnostics --format json
```

Notes:
- Use `--task <id>` instead of exporting `MCP_RUNNER_TASK_ID` when scripting runs.
- Release usage relies on the scoped package (`npx @kbediako/codex-orchestrator`); for local dev, use the repo CLI (`codex-orch` or `node ./bin/codex-orchestrator.ts`) so your changes are picked up. The unscoped `npx codex-orchestrator` is not published.
- Use `--parent-run <run-id>` to group related runs in manifests (optional).
- If worktrees aren’t possible, isolate artifacts with `CODEX_ORCHESTRATOR_RUNS_DIR` and `CODEX_ORCHESTRATOR_OUT_DIR`. Use `CODEX_ORCHESTRATOR_ROOT` to point the CLI at a repo root when invoking from outside the repo (optional; defaults to the current working directory). Avoid concurrent builds/tests in the same checkout.
- For a deeper runbook, see `.agent/SOPs/meta-orchestration.md`.

### Codex CLI prompts
- Note: prompt installers and guardrail scripts live under `scripts/` and are repo-only (not included in the npm package).
- The custom prompts live outside the repo at `~/.codex/prompts/diagnostics.md` and `~/.codex/prompts/review-handoff.md`. Recreate those files on every fresh machine so `/prompts:diagnostics` and `/prompts:review-handoff` are available in the Codex CLI palette.
- Canonical diagnostics prompt + output expectations: `docs/diagnostics-prompt-guide.md` (keep in sync with `scripts/setup-codex-prompts.sh`).
- Standalone review guidance (Codex CLI `codex review`): `docs/standalone-review-guide.md`.
- These prompts are consumed by the Codex CLI UI only; the orchestrator does not read them. Keep updates synced across machines during onboarding.
- To install or refresh the prompts (repo-only), run `scripts/setup-codex-prompts.sh` (use `--force` to overwrite existing files).
- `/prompts:diagnostics` takes `TASK=<task-id> MANIFEST=<path> [NOTES=<free text>]`, exports `MCP_RUNNER_TASK_ID=$TASK`, runs `npx @kbediako/codex-orchestrator start diagnostics --format json`, tails `.runs/$TASK/cli/<run-id>/manifest.json` (or `npx @kbediako/codex-orchestrator status --run <run-id> --watch --interval 10`), and records evidence to `/tasks`, `docs/TASKS.md`, `.agent/task/...`, `.runs/$TASK/metrics.json`, and `out/$TASK/state.json` using `$MANIFEST`.
- `/prompts:review-handoff` takes `TASK=<task-id> MANIFEST=<path> NOTES=<goal + summary + risks + optional questions>`, re-exports `MCP_RUNNER_TASK_ID`, and (repo-only) runs `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, optional `npm run eval:test`, plus `npm run review` (wraps `codex review` against the current diff and includes the latest run manifest path as evidence). It also reminds you to log approvals in `$MANIFEST` and mirror the evidence to the same docs/metrics/state targets.
- In CI / `--no-interactive` pipelines (or when stdin is not a TTY, or `CODEX_REVIEW_NON_INTERACTIVE=1` / `CODEX_NON_INTERACTIVE=1` / `CODEX_NO_INTERACTIVE=1`), `npm run review` prints the review handoff prompt (including evidence paths) and exits successfully instead of invoking `codex review`. Set `FORCE_CODEX_REVIEW=1` to run `codex review` in those environments.
- When forcing non-interactive review execution, `npm run review` enforces a timeout (`CODEX_REVIEW_TIMEOUT_SECONDS`, default `900`). Set `CODEX_REVIEW_TIMEOUT_SECONDS=0` to disable the timeout.
- Forced non-interactive review execution also enforces a no-output stall timeout (`CODEX_REVIEW_STALL_TIMEOUT_SECONDS`, default `600`). Set `CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0` to disable the stall guard.
- Always trigger diagnostics and review workflows through these prompts whenever you run the orchestrator so contributors consistently execute the required command sequences and capture auditable manifests.

### Identifier Guardrails
- `MCP_RUNNER_TASK_ID` is no longer coerced or lowercased silently. The CLI calls the shared `sanitizeTaskId` helper and fails fast when the value contains control characters, traversal attempts, or Windows-reserved characters (`<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`). Set the correct task ID in your environment *before* invoking the CLI.
- Run IDs used for manifest or artifact storage must come from the CLI (or pass the shared `sanitizeRunId` helper). Strings with colons, control characters, or `../` are rejected to ensure every run directory lives under `.runs/<task-id>/cli/<run-id>` (and legacy `mcp` mirrors) without risking traversal.

### Delegation Guardrails
- `delegate.question.poll` clamps `wait_ms` to `MAX_QUESTION_POLL_WAIT_MS` (10s); each poll timeout is bounded by the remaining `wait_ms`.
- Confirm-to-act fallback only triggers on confirmation-specific errors (`error.code`), not generic tool failures.
- Tool profile entries used for MCP overrides are sanitized; only alphanumeric + `_`/`-` names are allowed (rejects `;`, `/`, `\n`, `=` and similar).

## Pipelines & Execution Plans
- Default pipelines live in `codex.orchestrator.json` (repository-specific) and `orchestrator/src/cli/pipelines/` (built-in defaults). Each stage is either a command (shell execution) or a nested pipeline.
- The `CommandPlanner` inspects the selected pipeline and target stage; you can pass `--target <stage-id>` (alias: `--target-stage`) or set `CODEX_ORCHESTRATOR_TARGET_STAGE` to focus on a specific step (e.g., rerun tests only).
- Stage execution records stdout/stderr logs, exit codes, optional summaries, and failure data directly into the manifest (`commands[]` array).
- Guardrails (repo-only): before review, run `node scripts/delegation-guard.mjs` and `node scripts/spec-guard.mjs --dry-run` to ensure delegation and spec freshness; the orchestrator tracks guardrail outcomes in the manifest (`guardrail_status`).

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
- `run-summary.json` now carries `usageKpi` run-level signals (cloud/collab/delegation/rlm indicators) and `cloudFallback` details when a cloud request is downgraded to MCP.
- `collab_tool_calls` in the manifest captures collab tool call JSONL lines extracted from command stdout (bounded by `CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS`, default 200; set 0 to disable capture). For `spawn_agent` calls, keep prompt-role intent explicit (first-line `[agent_type:<role>]`) and set `agent_type` when supported so routing remains auditable even when event payloads omit `agent_type`.
- Heartbeat files and timestamps guard against stalled runs. `orchestrator/src/cli/metrics/metricsRecorder.ts` aggregates command durations, exit codes, and guardrail stats for later review.
- Optional caps: `CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS` limits captured exec chunk events per command (defaults to 500; set 0 for no cap), `CODEX_ORCHESTRATOR_TELEMETRY_MAX_EVENTS` caps in-memory telemetry events queued before flush (defaults to 1000; set 0 for no cap), and `CODEX_METRICS_PRIVACY_EVENTS_MAX` limits privacy decision events stored in `metrics.json` (-1 = no cap; `privacy_event_count` still reflects total).

## Customizing for New Projects
- Duplicate the templates under `/tasks`, `docs/`, and `.agent/` for your task ID and keep checklist status mirrored (`[ ]` → `[x]`) with links to the manifest that proves each outcome.
- Update `docs/PRD-<slug>.md`, `tasks/specs/<id>-<slug>.md`, and `docs/ACTION_PLAN-<slug>.md` with project details and evidence paths (`.runs/<task-id>/...`).
- Refresh `.agent/` SOPs with task-specific guardrails, escalation contacts, and artifact locations.
- Remove placeholder references in manifests/docs before merging so downstream teams see only live project data.

## Development Workflow
Note: the commands below assume a source checkout; `scripts/` helpers are not included in the npm package.
| Command | Purpose |
| --- | --- |
| `npm run build` | Compiles TypeScript to `dist/` (required for packaging and running the CLI from `dist/`). |
| `npm run lint` | Lints orchestrator, adapters, shared packages. Auto-runs `node scripts/build-patterns-if-needed.mjs` so codemods compile when missing/outdated. |
| `npm run test` | Vitest suite covering orchestration core, CLI services, and patterns. |
| `npm run eval:test` | Optional evaluation harness (enable when `evaluation/fixtures/**` is populated). |
| `npm run docs:check` | Deterministically validates scripts/pipelines/paths referenced in agent-facing docs. |
| `npm run docs:freshness` | Validates docs registry coverage + review recency; writes `out/<task-id>/docs-freshness.json`. |
| `npm run ci:cloud-canary` | Runs the cloud canary harness (`scripts/cloud-canary-ci.mjs`) to verify cloud lifecycle manifest + run-summary evidence; credential-gated by `CODEX_CLOUD_ENV_ID` and optional auth secrets (`CODEX_CLOUD_BRANCH` defaults to `main`). Feature flags can be passed through with `CODEX_CLOUD_ENABLE_FEATURES` / `CODEX_CLOUD_DISABLE_FEATURES` (comma- or space-delimited, e.g. `sqlite,memory_tool`). |
| `node scripts/delegation-guard.mjs` | Enforces subagent delegation evidence before review (repo-only). |
| `node scripts/spec-guard.mjs --dry-run` | Validates spec freshness; required before review (repo-only). |
| `node scripts/diff-budget.mjs` | Guards against oversized diffs before review (repo-only; defaults: 25 files / 800 lines; supports explicit overrides). |
| `npm run review` | Runs `codex review` with the latest run manifest path as evidence (repo-only; CI disables stdin; set `CODEX_REVIEW_NON_INTERACTIVE=1` to enforce locally). |

Run `npm run build` to compile TypeScript before packaging or invoking the CLI directly from `dist/`.

## Diff Budget

This repo enforces a small “diff budget” via `node scripts/diff-budget.mjs` to keep PRs reviewable and avoid accidental scope creep (repo-only).

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

`NOTES="<goal + summary + risks + optional questions>" npm run review` (repo-only; CI disables stdin; set `CODEX_REVIEW_NON_INTERACTIVE=1` to enforce locally).

Template: `Goal: ... | Summary: ... | Risks: ... | Questions (optional): ...`

To enable Chrome DevTools for review runs, set `CODEX_REVIEW_DEVTOOLS=1` (uses a codex config override; no repo scripts required).
Default to the standard `implementation-gate` for general reviews; enable DevTools only when the review needs Chrome DevTools capabilities (visual/layout checks, network/perf diagnostics). After fixing review feedback, rerun the same gate and include any follow-up questions in `NOTES`.
To run the full implementation gate with DevTools-enabled review, use `CODEX_REVIEW_DEVTOOLS=1 npx @kbediako/codex-orchestrator start implementation-gate --format json --no-interactive --task <task-id>`.

## Frontend Testing
Frontend testing is a first-class pipeline with DevTools off by default. The shipped pipelines already set `CODEX_NON_INTERACTIVE=1`; add it explicitly for custom automation or when you want the `frontend-test` shortcut to suppress Codex prompts:
- `CODEX_NON_INTERACTIVE=1 npx @kbediako/codex-orchestrator start frontend-testing --format json --no-interactive --task <task-id>`
- `CODEX_NON_INTERACTIVE=1 CODEX_REVIEW_DEVTOOLS=1 npx @kbediako/codex-orchestrator start frontend-testing --format json --no-interactive --task <task-id>` (DevTools enabled)
- `CODEX_NON_INTERACTIVE=1 codex-orchestrator frontend-test` (shortcut; add `--devtools` to enable DevTools)

If you run the pipelines from this repo, run `npm run build` first so `dist/` stays current (the pipeline executes the compiled runner).

Note: the frontend-testing pipeline reads the shared `CODEX_REVIEW_DEVTOOLS` flag; prefer `--devtools` or `CODEX_REVIEW_DEVTOOLS=1` for explicit enablement.

Optional prompt overrides:
- `CODEX_FRONTEND_TEST_PROMPT` (inline prompt)
- `CODEX_FRONTEND_TEST_PROMPT_PATH` (path to a prompt file)

`--no-interactive` disables the HUD only; set `CODEX_NON_INTERACTIVE=1` when you need to suppress Codex prompts (e.g., shortcut runs or custom automation).

Check readiness with `codex-orchestrator doctor --format json` (reports DevTools skill + MCP config availability). Use `codex-orchestrator devtools setup` to print setup steps.

## Mirror Workflows
- `npm run mirror:fetch -- --project <name> [--dry-run] [--force]`: reads `packages/<project>/mirror.config.json` (origin, routes, asset roots, rewrite/block/allow lists), caches downloads **per project** under `.runs/<task>/mirror/<project>/cache`, strips tracker patterns, rewrites externals to `/external/<host>/...`, localizes OG/twitter preview images, rewrites share links off tracker-heavy hosts, and stages into `.runs/<task>/mirror/<project>/<timestamp>/staging/public` before promoting to `packages/<project>/public`. Non-origin assets fall back to Web Archive when the primary host is down; promotion is skipped if errors are detected unless `--force` is set. Manifests live at `.runs/<task>/mirror/<project>/<timestamp>/manifest.json` (warns when `MCP_RUNNER_TASK_ID` is unset; honors `compliance/permit.json` when present).
- `npm run mirror:serve -- --project <name> [--port <port>] [--csp <self|strict|off>] [--no-range]`: shared local-mirror server with traversal guard, HTML no-cache/asset immutability, optional CSP, optional Range support, and directory-listing blocks.
- `npm run mirror:check -- --project <name> [--port <port>]`: boots a temporary mirror server when needed and verifies all configured routes with Playwright, failing on outbound hosts outside the allowlist, tracker strings (gtag/gtm/analytics/hotjar/facebook/clarity/etc.), unresolved assets, absolute https:// references, or non-200 responses. Keep this opt-in and trigger it when `packages/<project>/public` changes.

## Hi-Fi Design Toolkit Captures
Use the hi-fi pipeline to snapshot complex marketing sites (motion, interactions, tokens) while keeping the repo cloneable:

1. **Configure the source:** Update `design.config.yaml` → `pipelines.hi_fi_design_toolkit.sources` with the target URL, slug, title, and breakpoints (the repo defaults to an empty `sources` list until you add one).
2. **Permit the domain:** Copy `compliance/permit.example.json` to `compliance/permit.json`, then add (or update) the matching record so Playwright, video capture, and live assets are explicitly approved for that origin.
3. **Prep tooling:**
   - `npm install && npm run build`
   - `npm run setup:design-tools` (installs design-system deps) and ensure FFmpeg is available (`brew install ffmpeg` on macOS).
4. **Run the pipeline:**
   ```bash
   export MCP_RUNNER_TASK_ID=<task-id>
   npx @kbediako/codex-orchestrator start hi-fi-design-toolkit --format json --task <task-id>
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

When preparing a review (repo-only), always capture the latest manifest path, run `node scripts/delegation-guard.mjs` and `node scripts/spec-guard.mjs --dry-run`, and ensure checklist mirrors (`/tasks`, `docs/`, `.agent/`) point at the evidence generated by Codex Orchestrator. That keeps the automation trustworthy and auditable across projects.
