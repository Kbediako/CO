# PRD - Coordinator Symphony-Aligned Standalone Review Meta-Surface Expansion Guard

## Summary

After `1059`, standalone review fails closed on sustained low-signal nearby-file drift, but the live wrapper can still stay "active" by broadening into meta-surfaces such as global skills/memory, run manifests/logs, and nested review orchestration. This slice adds one bounded guard for that off-task meta-surface expansion.

## Problem

- `scripts/run-review.ts` still treats any ongoing `thinking` / `exec` activity as liveness once startup is complete.
- Real `1059` review evidence showed the reviewer widening from the scoped changed files into `~/.codex/memories`, `~/.codex/skills`, `.runs/**/manifest.json`, `.runs/**/runner.ndjson`, and nested review/delegation activity without converging.
- That remains active enough to avoid both the startup-loop guard and the low-signal nearby-target drift guard.

## Goals

- Detect sustained off-task meta-surface expansion from the shared `ReviewExecutionState` seam.
- Fail closed with explicit review artifacts instead of allowing bounded review to drift into review-orchestration work.
- Keep the policy advisory-only: no retries, no auto-reruns, no supervisor loop, no issue/PR mutations.
- Keep Symphony alignment structural only: one runtime authority, thin wrapper/controller, explicit liveness/scope boundaries.

## Non-Goals

- General semantic classification of review quality or reviewer intent.
- Replacing line-parsed telemetry with provider-native structured review events.
- Rewriting standalone review prompting or delegating broader review orchestration ownership to the wrapper.
- Catching every possible adjacent tangent in one slice.

## User-Facing Outcome

- In the default bounded review path, `npm run review` now terminates with a precise meta-surface expansion reason when the reviewer persistently broadens into global skills/memory, run manifests/logs, or nested review/orchestration surfaces instead of staying on the scoped change surface.
- Review artifacts explain why the run was stopped and which bounded meta-surfaces were observed.
