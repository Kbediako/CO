# Task Checklist - Metrics Pending IO Batching (0936)
## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-metrics-pending-io-batching.md`, `docs/TECH_SPEC-metrics-pending-io-batching.md`, `docs/ACTION_PLAN-metrics-pending-io-batching.md`, `tasks/tasks-0936-metrics-pending-io-batching.md`, `tasks/specs/0936-metrics-pending-io-batching.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0936-metrics-pending-io-batching-scout/cli/2026-01-06T01-05-30-562Z-dfa0b094/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-06-48-284Z-792d4ebb/manifest.json`, `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

## Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-09-05-710Z-4370fedb/manifest.json`, `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-10-29-482Z-91498de9/manifest.json`, `tasks/tasks-0936-metrics-pending-io-batching.md`.

## Implementation
- [x] Targeted performance fix + tests applied - Evidence: code changes, `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.

## Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.
- [x] Validation: `npm run docs:check` passes. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`.
- [x] Validation: `npm run docs:freshness` passes. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`, `out/0936-metrics-pending-io-batching/docs-freshness.json`.
- [x] Validation: `npm run review` executed with NOTES recorded. Evidence: `.runs/0936-metrics-pending-io-batching/cli/2026-01-06T01-50-32-842Z-b559ee97/manifest.json`. NOTES: "Goal: Address docs registry duplicates + revalidate docs checks for 0936 | Summary: remove duplicate entries, rerun implementation-gate for docs:check/docs:freshness evidence | Risks: none known | Questions (optional): none".
