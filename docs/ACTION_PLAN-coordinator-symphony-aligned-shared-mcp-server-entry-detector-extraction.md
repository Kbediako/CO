# ACTION_PLAN: Coordinator Symphony-Aligned Shared MCP Server Entry Detector Extraction

## Steps

1. Register `1241` docs-first artifacts, task mirrors, registry entries, and index updates.
2. Run the deterministic docs-first gates (`spec-guard`, `docs:check`, `docs:freshness`).
3. Extract the shared MCP server-entry detector into a bounded CLI utility.
4. Rewire `doctor.ts` and `delegationSetup.ts` to the shared helper without changing behavior.
5. Add focused regression coverage for parser parity and both consuming call sites.
6. Run the full bounded validation lane and close the task with summary, elegance review, and override notes.

## Guardrails

- Keep the seam strictly on the shared entry-detector contract.
- Do not widen into broader TOML config parsing unless direct evidence requires it.
- Prefer a tiny shared helper over a more general parser abstraction.
