# PRD — TaskStateStore Run History File Fix (Task 0903)

## Summary
- Problem Statement: `TaskStateStore` persists run history to `out/<task>/state.json`, which now also hosts metrics state snapshots. This collision causes snapshot warnings and risks overwriting metrics artifacts.
- Desired Outcome: Move TaskStateStore run history to a dedicated file with backward‑compatible migration, eliminating diagnostics warnings without impacting metrics outputs.

## Goals
- Eliminate run history/metrics `state.json` collision.
- Preserve any existing TaskStateStore snapshots via safe migration.
- Keep guardrails green and record diagnostics evidence.

## Non‑Goals
- Refactors outside persistence snapshot paths.
- Changing metrics aggregator output schema/location.

## Stakeholders
- Engineering: Orchestrator Reliability
- Reviewers: Orchestrator maintainers

## Evidence & Manifests
- Diagnostics manifest: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
