# Provider Control-Host Freshness Gauge

Use the freshness gauge when CO STATUS, provider intake, or provider-worker evidence looks stale, contradictory, or slower than expected. The command is read-only and replays local artifacts; it does not poll Linear or GitHub.

## Command

```bash
codex-orchestrator control-host freshness-gauge --artifact-root <path> --format json --strict
```

Useful inputs:

- `--artifact-root <path>` scans a run directory, `.runs` subset, or sanitized fixture root.
- `--run-dir <path>` is an alias when checking one run directory.
- Explicit path flags such as `--provider-intake-state <path>` or `--provider-proof <path>` can narrow replay scope without recursively scanning a root.
- `--now <iso>` makes age and latency fields deterministic for replay/evals.
- `--strict` exits non-zero when the overall verdict is `stale` or `contradictory`.

## Verdicts

- `healthy`: no stale, contradictory, degraded, or unknown source findings were detected.
- `degraded`: the artifacts are internally consistent, but throughput or budget evidence needs attention, such as low Linear headroom or exhausted child-lane capacity.
- `stale`: freshness evidence is too old, including stale refresh, stale active heartbeat, stale claim queue, or stale retry/backoff age.
- `contradictory`: artifacts disagree about lifecycle truth, such as a terminal proof/manifest while provider intake still claims the run is active.
- `unknown`: required local artifacts are missing or unreadable.

## JSON Fields

The `metrics` object includes source-backed fields for:

- `claim_queue_age_ms`
- `last_successful_refresh_age_ms`
- `polling_health`
- `claim_to_start_latency_ms`
- `start_to_first_heartbeat_latency_ms`
- `active_heartbeat_age_ms`
- `terminal_reconciliation_lag_ms`
- `retry_backoff_age_ms`
- `child_lane_cap_pressure`
- `stale_source_verdict`

Each metric includes `value`, `unit`, `verdict`, `source_path`, `source_field`, and `reason`. The `findings` array carries machine-readable `code`, `verdict`, `message`, `source_path`, and `source_field`.

`start_to_first_heartbeat_latency_ms` uses explicit first-heartbeat fields such as `first_heartbeat_at`; latest activity fields remain reserved for active heartbeat age. When first-heartbeat evidence is absent, the metric reports `unknown` instead of treating later activity as startup latency. `child_lane_cap_pressure` mirrors the provider child-lane launcher by counting pending child lanes and non-stale in-flight decisions, while ignoring recoverable stale in-flight claims older than 30 minutes or missing `in_flight_started_at`.

## Citation Paths

When reporting a failure, cite the specific `findings[].source_path` and `findings[].source_field`. Common sources:

- `provider-intake-state.json`: claim state, queue age, refresh age, retry/backoff age, and terminal reconciliation contradictions.
- `provider-linear-worker-proof.json`: worker heartbeat age, child-lane cap pressure, proof lifecycle, and Linear budget snapshots.
- `manifest.json`: run status, start time, heartbeat time, and terminal completion time.
- `provider-linear-worker-linear-audit.jsonl`: parent/child lane decision provenance.
- `control_endpoint.json`: control endpoint metadata presence.
- `co-status-dataset.json` or `operator-dashboard-dataset.json`: CO STATUS snapshot freshness, polling, retrying, and rate-limit surfaces.
- `provider-polling-health.json`: persisted polling state when captured separately from intake or CO STATUS.
- `linear-budget-state.json`: replayed Linear shared-budget state when captured separately from polling or proof artifacts.

## Operator Notes

Run the gauge before concluding that CO STATUS is trustworthy when intake state is old, a worker heartbeat has not moved, retry queues look stuck, or Linear headroom is low. A `degraded` verdict is not automatically a stop condition, but it should be cited in review or handoff notes. A `stale` or `contradictory` strict failure means the worker/operator should inspect the cited artifacts before continuing orchestration.

## Failed Wrapper After Terminal Handoff

When `co-status --format json` includes a provider-worker run whose `provider manifest` / `outer provider manifest` failed in `Run provider linear worker`, check the worker proof and provider-intake claim before relaunching anything.

- Treat the wrapper failure as informational when the same run has `worker proof` with `owner_phase=ended`, `owner_status=succeeded`, and `end_reason=issue_review_handoff`, the Linear issue is terminal such as `Done`, and retry state is inactive (`retrying=0`, no retry attempt, no retry due time, no retry error, and no queued retry). Inspect `provider-linear-worker-reconciliation.json`, the original `manifest.json`, and `provider-linear-worker-proof.json` for diagnostics; do not restart or relaunch solely to clear the failed wrapper status.
- Restart or relaunch only when freshness evidence is stale or contradictory, the worker proof is missing/non-terminal/failed, Linear is still active, or retry metadata shows an active or scheduled recovery. Use the cited freshness-gauge source paths to decide whether this is a control-host freshness problem, a real failed implementation worker, or a retry/recovery lane.
- Create a follow-up when the wrapper failure is informational for queue health but still points to a distinct tool or agent-loop defect. Preserve the failed wrapper stage, proof path, Linear state, and retry-state evidence in the follow-up instead of editing historical manifests or provider-intake state by hand.
