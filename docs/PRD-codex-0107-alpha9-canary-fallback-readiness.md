# PRD - Codex 0.107.0-alpha.9 Canary + Fallback Removal Readiness (0989)

## Summary
- Problem Statement: CO policy currently approves prerelease `0.107.0-alpha.4` for CO-scoped lanes, while upstream has moved to `0.107.0-alpha.9`; fallback removal has been proposed but lacks explicit new evidence against current guardrails.
- Desired Outcome: run an evidence-backed CO-scoped canary against `0.107.0-alpha.9` (with stable `0.106.0` baseline), then record a clear yes/no decision on fallback removal readiness.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): execute the next approved move, confirm whether everything is complete, and decide if fallbacks can now be removed.
- Success criteria / acceptance:
  - Fresh stable vs alpha.9 canary evidence is captured under `out/<task-id>/manual/codex-version-canary/`.
  - Decision on fallback removal is explicit and justified from current repo guardrails/evidence.
  - Docs/task mirrors/index are synchronized.
- Constraints / non-goals:
  - Docs-first before command/code changes.
  - Minimal, high-leverage changes.
  - No fallback removal unless criteria are fully satisfied by evidence.

## Goals
- Validate CO behavior parity on `0.107.0-alpha.9` against baseline `0.106.0` for required lanes.
- Re-evaluate fallback removal readiness with explicit policy criteria and evidence.
- Keep global stable defaults unchanged unless evidence compels change.

## Non-Goals
- Removing fallback/break-glass in this task without passing explicit removal criteria.
- Broad runtime refactors.

## Metrics & Guardrails
- Primary success metric: canary parity on required lanes (`cloud required`, `cloud fallback`, `review fallback`, `unsupported combo fail-fast`) between stable and alpha.9.
- Guardrails:
  - Keep `runtimeMode=cli` break-glass unless removal criteria are met.
  - Preserve backward-compatible behavior and auditable manifest/fallback telemetry.

## Execution Outcome (2026-03-02)
- Stable (`0.106.0`) and prerelease (`0.107.0-alpha.9`) are parity-positive for required-cloud rerun, review fallback, and unsupported-combo fail-fast lanes.
- The currently documented fallback gate command (`CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1`) fails for both channels, so prerelease advancement remains `hold`.
- Fallback removal readiness remains `hold`; CLI fallback/break-glass is retained.

## Approvals
- Product: User approved next-step execution on 2026-03-02.
- Engineering: Completed on 2026-03-02 (`hold` decision recorded).
- Design: N/A.
