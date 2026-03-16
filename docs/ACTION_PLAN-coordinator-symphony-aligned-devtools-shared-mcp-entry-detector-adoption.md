# ACTION_PLAN: Coordinator Symphony-Aligned Devtools Shared MCP Entry Detector Adoption

## Steps

1. Register `1242` docs-first artifacts, task mirrors, registry entries, and index updates.
2. Run the deterministic docs-first gates (`spec-guard`, `docs:check`, `docs:freshness`).
3. Rewire `devtools.ts` to the shared MCP entry detector from `1241`.
4. Remove the local specialized detector copy and any now-unused comment-parsing helpers from `devtools.ts`.
5. Add focused readiness coverage for the adopted helper path.
6. Run the bounded validation lane and close the slice with summary and override notes.

## Guardrails

- Keep the seam strictly on devtools adoption of the shared helper.
- Do not broaden into devtools setup UX, doctor output, or wider config parsing.
- Prefer the smallest possible follow-on after `1241`.
