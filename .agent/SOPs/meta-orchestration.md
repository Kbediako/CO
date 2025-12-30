# Meta-Orchestration SOP (Parallel Runs)

Use this playbook when you (the coordinating agent) need to run multiple workstreams in parallel to reduce context pressure or shorten wall-clock time.

## Principles
1. **One workstream → one worktree.** Don’t run build/test-heavy pipelines concurrently in the same checkout.
2. **One task id per workstream.** Route artifacts with `MCP_RUNNER_TASK_ID=<task-id>-<stream>` (or pass `--task <id>` to `codex-orchestrator start <pipeline>`).
3. **Workers stay narrow.** Each worker run should own a single area/subtask; the meta-orchestrator owns integration and final gates.
4. **Evidence is first-class.** Record each run’s `.runs/<task-id>/cli/<run-id>/manifest.json` in your checklist notes.
5. **Delegation is required.** Every top-level task must have at least one worker run before review gates proceed (use `DELEGATION_GUARD_OVERRIDE_REASON` only when delegation is impossible).

## Worktree setup
```bash
# from the primary checkout
git worktree add ../CO-stream-a HEAD
git worktree add ../CO-stream-b HEAD
```

## Run execution (parallel terminals)
```bash
# terminal A
cd ../CO-stream-a
export MCP_RUNNER_TASK_ID=<task-id>-a
npx codex-orchestrator start diagnostics --format json

# terminal B
cd ../CO-stream-b
export MCP_RUNNER_TASK_ID=<task-id>-b
npx codex-orchestrator start diagnostics --format json
```

Optional: add `--parent-run <run-id>` to group related runs in the manifest graph.

## Consolidation
1. Bring changes back to the primary branch via `git diff`/patches or normal git workflows.
2. Run the full gate from a clean worktree/clone (see `.agent/SOPs/git-management.md`).
3. Update checklist mirrors (`tasks/`, `docs/`, `.agent/task/`) with the manifest path proving the final validation run.

## When you can’t use worktrees
You can isolate run artifacts by setting:
- `CODEX_ORCHESTRATOR_ROOT` (optional repo root override; defaults to the current working directory)
- `CODEX_ORCHESTRATOR_RUNS_DIR` (defaults to `.runs/`)
- `CODEX_ORCHESTRATOR_OUT_DIR` (defaults to `out/`)

This helps with manifests/metrics but does **not** prevent collisions in generated build outputs inside the working tree, so only use this for read-only or low-impact pipelines.
