# ACTION_PLAN: Coordinator Symphony-Aligned Flow CLI Shell Extraction

## Steps

1. Reinspect the inline `flow` helpers in `bin/codex-orchestrator.ts` and confirm the exact shell-owned boundary, excluding shared start/issue-log helpers unless extraction requires them.
2. Extract the `flow` orchestration cluster into a dedicated helper/module while keeping the command contract unchanged.
3. Rerun focused flow CLI coverage plus the standard downstream-facing validation lane.

## Deliverables

- updated PRD / TECH_SPEC / ACTION_PLAN / task mirrors
- docs-first validation logs
- bounded `flow` shell extraction with focused parity coverage
