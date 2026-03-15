# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Execution Runtime Shell Extraction

1. Move the cohesive child execution and monitor runtime shell behind a dedicated helper/module without widening scope.
2. Rewire `scripts/run-review.ts` so `main()` delegates to the extracted runtime shell while keeping orchestration and telemetry ownership local.
3. Add focused regressions, run the deterministic validation lane, and close with an explicit elegance pass plus truthful override notes if wrapper review drifts.
