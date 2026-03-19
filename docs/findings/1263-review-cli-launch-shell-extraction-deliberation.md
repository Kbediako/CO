# Findings: 1263 Review CLI Launch Shell Extraction

- After `1262`, the delegation local pocket is explicitly frozen.
- The next stronger nearby real shell boundary is `handleReview(...)` in `bin/codex-orchestrator.ts`.
- That wrapper still owns review-runner resolution, passthrough child-process launch, exit-code mapping, and review-local help behavior above the existing `scripts/run-review.ts` wrapper.
- Result: register a bounded review CLI launch shell extraction lane.
