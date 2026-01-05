# Technical Spec — ExperienceStore JSONL Line Repair

## Overview
- Objective: Ensure append-only ExperienceStore writes preserve line boundaries after partial writes.
- In Scope: `ExperienceStore.recordBatch` append behavior and tests.
- Out of Scope: JSONL compaction, rotation, or alternate storage formats.

## Architecture & Design
- Current State:
  - `recordBatch` appends `${payload}\n` without checking the existing file tail.
  - A prior crash can leave a file without a trailing newline, so the next append concatenates onto a partial line.
- Proposed Changes:
  - Add a small tail check: if `experiences.jsonl` exists and the last byte is not `\n`, insert a newline before appending the new batch.
  - Keep append-only behavior (no full-file parsing).
- Data Persistence / State Impact:
  - No schema changes; only ensures line boundaries are maintained for future records.
- External Dependencies:
  - Node.js fs/promises (`open`, `read`, `appendFile`).

## Operational Considerations
- Failure Modes:
  - If tail read fails with ENOENT, treat as new file and append normally.
  - Other I/O errors should surface to avoid silently corrupting data.
- Observability & Telemetry:
  - Add a targeted unit test instead of new logging.
- Security / Privacy:
  - No new data sources.
- Performance Targets:
  - Add at most one byte read per append; avoid full-file reads.

## Testing Strategy
- Unit / Integration:
  - Add a test that starts with a file missing a trailing newline and verifies a new record remains readable.
- Tooling / Automation:
  - Use diagnostics + RLM pipelines to capture evidence during discovery.
- Rollback Plan:
  - Revert the tail-check helper if it causes append failures.

## Documentation & Evidence
- Linked PRD: `docs/PRD-orchestrator-experience-jsonl-repair.md`
- Run Manifest Link: `.runs/0933-orchestrator-experience-jsonl-repair/cli/<run-id>/manifest.json`
- Metrics / State Snapshots: `.runs/0933-orchestrator-experience-jsonl-repair/metrics.json`, `out/0933-orchestrator-experience-jsonl-repair/state.json`

## Approvals
- Engineering:
- Reviewer:
