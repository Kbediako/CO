# Provider Control-Host Freshness Gauge

Use the freshness gauge when CO STATUS, provider intake, or provider-worker evidence looks stale, contradictory, or slower than expected. The command is read-only and replays local artifacts; it does not poll Linear or GitHub.

## Command

```bash
codex-orchestrator control-host freshness-gauge --artifact-root <path> --format json --strict
```

Useful inputs:

- `--artifact-root <path>` scans a run directory, `.runs` subset, or sanitized fixture root.
- `--run-dir <path>` is an alias when checking one run directory.
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
