# Technical Spec — Metrics Pending Batch Cap

## Overview
- Objective: Bound memory usage and failure blast radius for batched pending merges while preserving ordering and aggregation behavior.
- In Scope:
  - Cap pending batch size by bytes/lines and flush incrementally.
  - Preserve existing aggregate recomputation timing.
- Out of Scope:
  - Metrics schema changes.
  - Lock/retry policy changes or new background workers.

## Current State
- `mergePendingMetricsEntries` now batches pending `.jsonl` entries into a single append per pass.
- `appendMetricsEntry` merges pending before/after the new entry and recomputes aggregates once after the final merge.

## Proposed Changes
1. **Cap batch size and flush incrementally**
   - Read pending `.jsonl` files in sorted order, track accumulated bytes/lines.
   - Flush (append + delete) whenever the batch exceeds a configurable cap, then continue.
   - Preserve ordering by flushing in scan order.
2. **Keep aggregate recomputation timing**
   - Leave `appendMetricsEntry` flow unchanged: single recomputation after final merge.

## Edge Cases
- Empty or missing pending files should be ignored without errors.
- Append failures should leave pending files intact for retry.
- Preserve ordering based on sorted filenames even with multiple flushes.

## Testing Plan
- Extend metrics aggregator tests to cover batch cap flushing and ordering.
- Reuse existing pending-merge tests to verify behavior with small caps.

## Rollout Plan
- Default caps set to conservative values; optionally override via env vars.
- Validate via implementation-gate.

## Risks & Mitigations
- Risk: Memory spikes on large backlogs. Mitigation: cap batch size and flush incrementally.
- Risk: Duplicate entries if process crashes after append but before deletes. Mitigation: limit blast radius via smaller batches.
