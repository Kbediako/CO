---
id: 20260409-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c
title: CO: Add memory provenance and outcome schema to manifests, events, and metrics
relates_to: docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
related_prd: docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
related_action_plan: docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- PRD: `docs/PRD-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- ACTION_PLAN: `docs/ACTION_PLAN-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.
- Task checklist: `tasks/tasks-linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c.md`.

## Scope
- Keep this lane bounded to additive memory provenance and outcome fields on shared run artifacts.
- Reuse the existing `memory.source_0` and `resume_events` seams instead of inventing transcript-derived telemetry.
- Mirror the bounded memory contract into at least one event surface and `metrics.json`.
- Preserve separation from general provider-worker progress/stall telemetry, `CO STATUS`, resident continuity, and distributed worker-host parity.

## Design
- Extend the manifest memory contract with a bounded memory observability block that records:
  - selected-memory provenance
  - rejected source-artifact candidates
  - rediscovered memory decisions
  - manual repair records derived from existing resume artifacts
  - counters for contradiction, rediscovery, resume latency, manual repair, repeated-failure streak, and retrieval hits/misses
- Derive selected/rejected/rediscovered decisions from the existing `source_0` inheritance path, using artifact availability plus descriptor/payload lineage validation rather than transcript text.
- Mirror the manifest memory observability payload into `run:summary`.
- Mirror the bounded counters and selected-memory provenance summary into `metrics.json`.

## Validation
- [x] `linear child-stream --pipeline docs-review` evidence captured for the new packet. Evidence: `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/manifest.json`, `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/review/telemetry.json`.
- [x] Focused regressions cover manifest emission, inherited-context integrity, plus event and metrics projection. Evidence: `npm run test:orchestrator -- orchestrator/tests/RlmContextStoreOffsets.test.ts orchestrator/tests/Manifest.test.ts orchestrator/tests/ExecSummary.test.ts orchestrator/tests/MetricsRecorderMemory.test.ts` (`25` tests passed).
- [x] The branch was refreshed onto current `origin/main` on the resumed attempt and the focused issue-local regressions reran cleanly afterward. Evidence: `git merge --ff-only origin/main` (fast-forward `d47f219eff01bd4152e8e272c3918668fbf5fa90 -> 889135b664ab6b6d65bd899cb86942d45caf4886`) plus `MCP_RUNNER_TASK_ID=linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c npm run test:orchestrator -- orchestrator/tests/RlmContextStoreOffsets.test.ts orchestrator/tests/Manifest.test.ts orchestrator/tests/ExecSummary.test.ts orchestrator/tests/MetricsRecorderMemory.test.ts`.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [ ] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `node scripts/diff-budget.mjs`
- [x] `FORCE_CODEX_REVIEW=1 npm run review`
- [x] Explicit elegance/minimality pass recorded after review findings are addressed.
- [x] `npm run pack:smoke`

## Approvals
- Reviewer: `codex-orchestrator docs-review (clean-success)` via `.runs/linear-99d7fc30-93ab-43fd-94c2-68d604b4f85c-docs-review/cli/2026-04-09T08-48-16-376Z-e9616108/manifest.json`
- Date: 2026-04-09
