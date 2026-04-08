# Technical Spec — Metrics Pending IO Batching

## Overview
- Objective: Reduce I/O overhead when draining pending metrics entries and avoid redundant aggregate recomputation.
- In Scope:
  - Batch append operations during pending merges.
  - Recompute aggregates once after final merge.
- Out of Scope:
  - Metrics schema changes.
  - Lock/retry policy changes.

## Current State
- `mergePendingMetricsEntries` reads each `.jsonl` pending file and appends to `metrics.json` per file.
- `appendMetricsEntry` updates aggregates, then may re-run aggregation if pending entries appear during the lock.

## Proposed Changes
1. **Batch pending payload writes**
   - Read pending `.jsonl` files in sorted order, collect non-empty lines, append a combined payload to `metrics.json` once per pass.
   - Remove processed files only after a successful append to avoid data loss.
2. **Single aggregate recomputation**
   - In `appendMetricsEntry`, merge pending entries before and after the new entry, then call `updateMetricsAggregates` once at the end.

## Edge Cases
- Empty or missing pending files should be ignored without errors.
- Append failures should leave pending files intact for retry.
- Preserve ordering based on sorted filenames.

## Testing Plan
- Existing metrics aggregator tests should continue to pass.
- Add targeted tests if batching changes observable behavior.

## Rollout Plan
- Ship behind existing behavior; no config change required.
- Validate via implementation-gate.

## Risks & Mitigations
- Risk: Losing pending entries on append failure. Mitigation: remove files only after successful append.
- Risk: Ordering changes. Mitigation: preserve filename sort order.
