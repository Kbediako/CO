# 1222 Deliberation: Standalone Review Launch-Attempt Orchestration Shell Extraction

- `1221` already removed the lower-level execution runtime shell, leaving one larger but still cohesive launch-attempt cluster in `scripts/run-review.ts`.
- This is a stronger next seam than a broader `run-review.ts` rewrite because the remaining functions share one contract: preparing artifacts and the concrete review launch attempt, including retry/failure capture policy.
- The lane should stay bounded to launch-attempt orchestration ownership and avoid widening into prompt assembly, live monitor policy, or final telemetry persistence.
