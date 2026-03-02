# TECH_SPEC - Codex 0.107.0-alpha.9 Canary + Fallback Removal Readiness

- Canonical TECH_SPEC: `tasks/specs/0989-codex-0107-alpha9-canary-fallback-readiness.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-02.

## Summary
- Re-run the established Codex version canary matrix using `0.106.0` (stable baseline) and `0.107.0-alpha.9` (prerelease candidate), then issue a fallback removal readiness decision.

## Requirements
- Execute canary matrix for both versions with captured logs:
  - required cloud contract lane,
  - fallback cloud contract lane,
  - forced review fallback lane,
  - unsupported `cloud + appserver` fail-fast lane.
- Capture per-channel summaries plus combined comparison summary.
- Record explicit fallback-removal readiness criteria and decision.
- Keep fallback behavior unchanged unless criteria are fully met.

## Acceptance
- Canary logs and summaries exist for both channels under `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/`.
- Decision document states:
  - alpha.9 adoption status for CO-scoped lanes,
  - fallback removal readiness (`go` or `hold`) with rationale.
- Task mirrors/index/docs snapshot are synchronized.

## Evidence & Artifacts
- Checklists:
  - `tasks/tasks-0989-codex-0107-alpha9-canary-fallback-readiness.md`
  - `.agent/task/0989-codex-0107-alpha9-canary-fallback-readiness.md`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Validation/canary logs:
  - `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/`

## Outcome Notes (2026-03-02)
- Decision: `hold` for advancing CO prerelease candidate to `0.107.0-alpha.9`.
- Decision: `hold` for fallback removal.
- Blocking signal: documented fallback gate command fails with configuration-class hard failure in both stable/prerelease lanes.
