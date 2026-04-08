# Technical Spec — Metrics Pending Streaming Merge

## Overview
- Objective: Bound memory usage even for oversized pending files while preserving ordering and aggregation behavior.
- In Scope:
  - Stream pending `.jsonl` files line-by-line and flush incrementally within a file when caps are hit.
  - Skip whitespace-only lines during pending merges.
  - Preserve existing aggregate recomputation timing.
- Out of Scope:
  - Metrics schema changes.
  - Lock/retry policy changes or new background workers.

## Current State
- `mergePendingMetricsEntries` reads each pending file into memory and batches by bytes/lines at file boundaries.
- A single large `.jsonl` can still bypass batch caps, spiking memory.
- `appendMetricsEntry` merges pending before/after the new entry and recomputes aggregates once after the final merge.

## Proposed Changes
1. **Stream pending files and cap mid-file**
   - Iterate pending `.jsonl` files in sorted order using `readline` over `createReadStream`.
   - Track bytes/lines per line; flush (append) whenever the next line would exceed caps.
   - Preserve ordering by processing files sequentially and lines in order.
2. **Defer deletion until a file is fully processed**
   - Only enqueue a file for deletion after its final line is appended.
   - Allow a deletion-only flush (no payload) to clean up completed files when needed.
3. **Skip whitespace-only lines**
   - Treat lines with `line.trim().length === 0` as empty.
4. **Keep aggregate recomputation timing**
   - Leave `appendMetricsEntry` flow unchanged: single recomputation after final merge.
5. **Harden metrics.json parsing**
   - Ignore whitespace-only lines when loading `metrics.json` for aggregate recomputation.
6. **Stabilize baseline generation ordering**
   - Ensure `baseline.json` exists before dependent aggregate writes (e.g. MTTR delta).

## Edge Cases
- Empty or missing pending files should be ignored without errors.
- Append failures should leave pending files intact for retry.
- Preserve ordering based on sorted filenames even with multiple flushes and mid-file caps.
- Single oversized line should still be appended (cap is best-effort); memory bounded to one line.

## Testing Plan
- Add a test that a single pending file with many lines flushes multiple times while preserving order.
- Add a test that whitespace-only lines are ignored during pending merges.
- Add a test that whitespace-only lines inside `metrics.json` do not break aggregation.
- Reuse existing pending-merge tests to verify behavior with small caps.

## Rollout Plan
- Default caps remain conservative; optionally override via env vars.
- Validate via implementation-gate.

## Risks & Mitigations
- Risk: Memory spikes on large backlogs or oversized files. Mitigation: stream line-by-line and flush mid-file.
- Risk: Duplicate entries if process crashes after append but before deletes, especially mid-file (file removal happens after the last line). Mitigation: limit blast radius via smaller batches; oversized multi-line files are rare under current writer behavior.
