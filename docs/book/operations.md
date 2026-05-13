# Operations

## Task-Scoped Runs

Use a task id for every governed run so manifests, metrics, and summaries are grouped consistently.

```bash
export MCP_RUNNER_TASK_ID=<task-id>
codex-orchestrator start diagnostics --task <task-id> --format json
codex-orchestrator status --run <run-id> --watch --interval 10
```

Run artifacts live under:

- `.runs/<task-id>/cli/<run-id>/manifest.json`
- `.runs/<task-id>/metrics.json`
- `out/<task-id>/state.json`

## Common Workflows

```bash
codex-orchestrator flow --task <task-id>
codex-orchestrator review --task <task-id>
codex-orchestrator doctor --usage --window-days 30
codex-orchestrator co-status
codex-orchestrator control-host supervise status --format json
```

`flow` runs the docs-review and implementation-gate sequence. `review` prepares reviewer handoff evidence and can execute Codex review when the environment is configured to force non-interactive review execution.

## Execution Modes

- Default execution mode is `mcp`.
- Cloud mode is reserved for long-running, highly parallel, or locally constrained work after preflight confirms branch/ref, non-interactive setup, and required cloud secrets.
- `runtimeMode=cli|appserver` is independent of `executionMode=mcp|cloud`.
- Local appserver remains the expected default runtime path.
- `executionMode=cloud` with explicit `runtimeMode=appserver` is unsupported and should fail fast.

## Permission And Trust Posture

Use explicit permission profiles and trust flows instead of `--full-auto` as normal guidance. Current CO docs recognize the built-in profile ids `:read-only`, `:workspace`, and `:danger-no-sandbox`; `default_permissions = ":danger-no-sandbox"` is local-only no-sandbox advisory evidence and not a cloud-readiness signal.

Keep trust/cwd decisions separate from permission profiles. Provider-worker prompts and generated defaults should preserve that split so downstream operators can reason about what is trusted, where commands run, and which profile gates tool authority.

## Validation Floor

For implementation work, use the repo-local gate list from `AGENTS.md`. For documentation-only README/book work, the targeted floor is:

```bash
node scripts/spec-guard.mjs --dry-run
npm run docs:check
npm run docs:freshness
node scripts/diff-budget.mjs
```

Add build, lint, tests, pack smoke, or runtime proof when the diff touches scripts, package surfaces, runtime behavior, or UI/app surfaces.

## Review Handoff

Before handing an issue to `Human Review` or `In Review`, refresh the Linear workpad with:

- final implementation summary
- validation results
- standalone review or fallback review evidence
- explicit elegance/minimality pass result
- PR link and ready-review drain result when a PR exists

After opening or updating a PR, use the repo-local ready-review drain before moving an issue to review:

```bash
codex-orchestrator pr ready-review --pr <number> --quiet-minutes 15
```

When an attached PR is already in `Merging`, use the merge shepherding loop instead of stopping at handoff:

```bash
codex-orchestrator pr resolve-merge --pr <number> --quiet-minutes 15
```
