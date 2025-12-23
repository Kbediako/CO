# Technical Spec - Orchestrator Status UI (Task 0911)

Source of truth for requirements: `tasks/specs/0911-orchestrator-status-ui.md`.

## Objective
Deliver a minimal, dark-themed, read-only dashboard that reports task status buckets and run detail from local orchestrator artifacts, plus codebase health signals for human operators.

## Scope
- In Scope: Local aggregation of `.runs/` and `out/` artifacts, git status signals, and a static UI that renders overview and run detail panels.
- Out of Scope: Run controls, backend services, schema changes, networked data sources, or auth.

## Data Sources
- Orchestrator run artifacts:
  - `.runs/<task-id>/cli/<run-id>/manifest.json` (versioned CLI manifest; fields include `status`, `started_at`, `completed_at`, `updated_at`, `heartbeat_at`, `heartbeat_stale_after_seconds`, `commands[]`, `approvals[]`).
  - Legacy manifests under `.runs/<task-id>/<run-id>/manifest.json` (fields include `taskId`, `runId`, `timestamp`, `plan.items[]`, `build/test/review`).
- Metrics and state:
  - `.runs/<task-id>/metrics.json` (JSONL stream) and `.runs/<task-id>/metrics-summary.json` (if present).
  - `out/<task-id>/state.json` and `out/<task-id>/runs.json` when available.
- Logs (optional, capped):
  - `.runs/<task-id>/cli/<run-id>/runner.ndjson` (run-level log stream).
  - `.runs/<task-id>/cli/<run-id>/commands/*.ndjson` (per-command logs).
- Task metadata:
  - `tasks/index.json` as the canonical list of tasks and titles.
  - `tasks/tasks-*.md` for optional human notes.
- Codebase status:
  - `git` metadata (branch, HEAD SHA, last commit, dirty/untracked counts, diff stats, ahead/behind if upstream exists).

## Task Status Classification
Buckets are derived from the latest run per task plus task presence in `tasks/index.json`.

Classification order (first match wins):
- Pending:
  - Task exists in `tasks/index.json` but no run artifacts are found, OR
  - A run exists but `started_at` is missing and no commands have started.
- Complete:
  - Latest run status is terminal (`succeeded`, `failed`, `canceled`) and `completed_at` is set.
- Ongoing:
  - Latest run status is non-terminal, AND
  - `approvals[]` contains pending entries OR heartbeat is stale (waiting for input or stalled).
  - This bucket overrides Active when both could apply.
- Active:
  - Latest run status is non-terminal, AND
  - `heartbeat_at` is within `heartbeat_stale_after_seconds` (or a command is currently running), AND
  - No pending approvals are present.

Status detail fields should preserve the original run status and highlight pending approvals or stale heartbeats as badges.
If heartbeat fields are missing (legacy manifests), fall back to run status only.

## Codebase Status Signals
Capture lightweight git signals without network access:
- `branch`: current branch name.
- `head_sha`: HEAD commit SHA.
- `last_commit`: subject, author, and timestamp.
- `dirty`: boolean if there are staged or unstaged changes.
- `untracked_count`, `staged_count`, `unstaged_count`.
- `diff_stat`: file count and +/- line totals vs HEAD.
- `ahead`, `behind`: only when upstream is configured; otherwise omit.

## UI Data Model (Example)
```json
{
  "generated_at": "2025-12-23T00:00:00Z",
  "tasks": [
    {
      "task_id": "0911-orchestrator-status-ui",
      "title": "Orchestrator Status UI",
      "bucket": "active",
      "status": "running",
      "last_update": "2025-12-23T00:05:00Z",
      "latest_run_id": "2025-12-23T00-00-00Z-acde1234",
      "approvals_pending": 1,
      "summary": "Stage 3/7: test"
    }
  ],
  "runs": [
    {
      "task_id": "0911-orchestrator-status-ui",
      "run_id": "2025-12-23T00-00-00Z-acde1234",
      "status": "running",
      "started_at": "2025-12-23T00:00:00Z",
      "updated_at": "2025-12-23T00:05:00Z",
      "heartbeat_at": "2025-12-23T00:04:59Z",
      "stages": [
        { "id": "spec-guard", "status": "succeeded", "duration_ms": 32000 },
        { "id": "build", "status": "succeeded", "duration_ms": 120000 },
        { "id": "lint", "status": "running", "duration_ms": 45000 }
      ],
      "approvals": [
        { "scope": "network", "status": "pending", "requested_at": "2025-12-23T00:04:30Z" }
      ],
      "links": {
        "manifest": ".runs/0911-orchestrator-status-ui/cli/2025-12-23T00-00-00Z-acde1234/manifest.json",
        "metrics": ".runs/0911-orchestrator-status-ui/metrics.json",
        "state": "out/0911-orchestrator-status-ui/state.json"
      }
    }
  ],
  "codebase": {
    "branch": "main",
    "head_sha": "abc1234",
    "last_commit": {
      "sha": "abc1234",
      "author": "Jane Doe",
      "subject": "Update status UI docs",
      "timestamp": "2025-12-23T00:00:00Z"
    },
    "dirty": true,
    "staged_count": 2,
    "unstaged_count": 1,
    "untracked_count": 3,
    "diff_stat": { "files": 4, "additions": 120, "deletions": 12 }
  },
  "activity": [
    { "ts": "2025-12-23T00:05:00Z", "type": "stage_completed", "message": "build completed in 120s" }
  ]
}
```

## Aggregation and Refresh
- Use `tasks/index.json` as the task registry and map to run artifacts.
- Prefer `out/<task-id>/runs.json` when present; fall back to scanning `.runs/<task-id>/cli/` for latest run ids.
- Cache results and refresh every 2 to 5 seconds; avoid reading large log files unless requested.
- Emit the UI payload to out/0911-orchestrator-status-ui/data.json (planned).

## File Locations
- Aggregation script (planned): scripts/status-ui-build.mjs.
- UI assets (planned): packages/orchestrator-status-ui/ (static HTML, JS, CSS).

## UI Layout (Dark Theme)
Overview should include a global filter bar, KPI cards for buckets, a task table, a codebase panel, and recent activity.

ASCII wireframe:
```
+-------------------------------------------------------------------+
| Orchestrator Monitor  [Task] [Status] [Time Range] [Search] [Sync] |
+---------------+---------------------------------------------------+
| Overview      | KPI CARDS (active/ongoing/complete/pending)        |
| Task Table    | +-----------+ +-----------+ +-----------+ +------+ |
| Run Detail    | +-----------+ +-----------+ +-----------+ +------+ |
|               |                                                   |
|               | Task Table + Codebase Panel + Activity Feed       |
+---------------+---------------------------------------------------+
```

## Performance and Safety
- Cap log tail (lines and bytes) and avoid loading full logs by default.
- Avoid deep `.runs/` scans by limiting to latest run per task.
- UI must be read-only and operate offline.

## Testing Strategy
- Unit tests for aggregation and status classification once implementation starts.
- Manual validation against a sample `.runs/` directory with mixed run states.

## Evidence
- PRD: `docs/PRD-orchestrator-status-ui.md`
- Mini-Spec: `tasks/specs/0911-orchestrator-status-ui.md`
- Task List: `tasks/tasks-0911-orchestrator-status-ui.md`
