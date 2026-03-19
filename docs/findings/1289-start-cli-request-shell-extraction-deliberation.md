# Deliberation - 1289 Start CLI Request Shell Extraction

## Decision

Open `1289` as a real extraction lane.

## Why

The `1288` reassessment confirmed that `handleStart(...)` still owns a meaningful binary-facing request-shaping seam above `startCliShell.ts`. That is a real nearby extraction, not a forced symmetry slice.

## Scope

- extract request shaping above `startCliShell.ts`
- leave shared parse/help ownership in `bin/codex-orchestrator.ts`
- preserve lower lifecycle ownership in `startCliShell.ts`
