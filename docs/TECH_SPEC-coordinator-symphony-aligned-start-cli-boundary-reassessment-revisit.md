# TECH_SPEC: Coordinator Symphony-Aligned Start CLI Boundary Reassessment Revisit

## Context

The earlier `1271` lane extracted `orchestrator/src/cli/startCliShell.ts`, but the current `handleStart(...)` wrapper still owns substantial binary-facing request shaping above that shell.

## Requirements

1. Reinspect the current `start` wrapper ownership in `bin/codex-orchestrator.ts`.
2. Record a truthful `freeze` or `go` result from current evidence.
3. Preserve current `start` behavior in this lane; no implementation work unless a narrower truthful seam is proven.
4. Avoid widening into lower pipeline internals or unrelated CLI families.

## Invariants

- `start` help, flag semantics, and output behavior stay unchanged in this reassessment lane.
- Any follow-on seam must stay binary-facing and bounded.
- Same-owner parse/help glue alone is not enough to justify another extraction.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
