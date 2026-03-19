# ACTION_PLAN: Coordinator Symphony-Aligned Setup Bootstrap Shell Extraction

## Steps

1. Reinspect the inline `setup` helpers in `bin/codex-orchestrator.ts` and confirm the exact shell-owned boundary.
2. Extract the `setup` bootstrap orchestration into a dedicated helper/module while keeping the CLI contract unchanged.
3. Rerun focused setup command coverage plus the standard downstream-facing validation lane.

## Deliverables

- updated PRD / TECH_SPEC / ACTION_PLAN / task mirrors
- docs-first validation logs
- bounded `setup` bootstrap shell extraction with focused parity coverage
