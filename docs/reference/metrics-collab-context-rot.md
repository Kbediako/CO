# Metrics Reference — Collab + Context-Rot

## Data sources
- Run manifests: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Run logs: `.runs/<task-id>/cli/<run-id>/runner.ndjson`.
- Findings notes: `docs/findings/*.md`.

## Collab metrics
- **Event coverage**: collab tool calls recorded in manifest when collab is enabled.
- **Event volume**: total collab events (respect `CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS`).
- **Success ratio**: successful tool calls / total tool calls.
- **Latency**: time between collab spawn and completion.

## Context-rot metrics
- **Contradiction rate**: violations of checkpoint invariants (target = 0).
- **Re-discovery rate**: repeated scans/decisions after resume (target = minimal).
- **Resume latency**: time from resume to first correct action.

## Gate signals
- Checkpoint validation pass rate (build/lint/test/docs as applicable).
- Resume success without manual state repair.

## Reporting format
- Include run id + manifest path.
- State the eval outcome and any drift.
- Record failures with reproduction steps.
