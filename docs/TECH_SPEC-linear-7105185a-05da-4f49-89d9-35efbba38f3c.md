---
id: 20260410-linear-7105185a-05da-4f49-89d9-35efbba38f3c
title: CO: capture live Linear request-burn telemetry after webhook-first targeted reconcile rollout
relates_to: docs/PRD-linear-7105185a-05da-4f49-89d9-35efbba38f3c.md
risk: medium
owners:
  - Codex
last_review: 2026-04-10
---
## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7105185a-05da-4f49-89d9-35efbba38f3c.md`
## Summary
- Reuse the landed `CO-144` control-host/provider path and capture fresh live telemetry rather than changing intake behavior again.
- Store one machine-checkable evidence packet with shared-budget state, query-mode segmentation, and a quota verdict.
## Design
- Read the shared-root control-host state from `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`.
- Read the active CO-147 provider-worker proof from `/Users/kbediako/Code/CO/.runs/linear-7105185a-05da-4f49-89d9-35efbba38f3c/cli/2026-04-10T15-24-22-316Z-f7ff9cbf/provider-linear-worker-proof.json`.
- Force fresh live `fresh_discovery` and `recovery_sweep` samples via `resolveLiveLinearTrackedIssues(...)` with the current Linear binding so the evidence is not limited to earlier same-day observations.
- Record the evidence and verdict under `out/linear-7105185a-05da-4f49-89d9-35efbba38f3c/manual/`.
## Validation
- Audited `linear child-stream --pipeline docs-review`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- Standalone review/elegance before review handoff if repo-tracked diffs remain
