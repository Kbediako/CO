---
id: 20260306-1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane
title: Coordinator App-Server Dynamic-Tool Bridge Experimental Lane
relates_to: docs/PRD-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: instantiate deferred 0998 app-server dynamic-tool bridge scope as task lane 1001 with explicit experimental guardrails.
- Scope: docs-first artifacts, registry synchronization, and targeted docs validation evidence.
- Boundary: CO execution authority unchanged; Coordinator intake/control bridge only; no scheduler ownership transfer.

## Pre-Implementation Review Note
- Decision: approved for docs-first instantiation.
- Reasoning: deferred 0998 scope requires explicit experimental constraints before any runtime implementation.

## Technical Requirements
- Deferred lineage:
  - 1001 scope is anchored to `tasks/specs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md` defer row for app-server dynamic-tool bridge.
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge only.
  - Scheduler ownership transfer is forbidden.
- Security/control invariants:
  - strict auth/token fail-closed rejection for missing/expired/revoked/malformed/mismatched context,
  - deterministic idempotent replay behavior for duplicate request/intent envelopes,
  - canonical traceability mapping (`intent_id`, `task_id`, `run_id`, `manifest_path`, decision, reason),
  - deterministic auditable outputs for accept/reject/replay outcomes.
- Experimental controls:
  - default-off posture,
  - explicit policy enablement requirement,
  - kill-switch with immediate fail-closed behavior and auditable transition records.

## Manual Mock Test Requirements (Future Runtime Lane)
1. Auth/token envelope fail-closed rejects (missing/expired/revoked/malformed/mismatch).
2. Unsupported/unauthorized source context fail-closed rejects.
3. Duplicate request/intent replay idempotency with deterministic outcomes.
4. Traceability mapping stability (`intent_id -> task_id -> run_id -> manifest_path`).
5. Auditable outputs for applied/replayed/rejected decisions.
6. Default-off + kill-switch behavior proving experimental halt capability.
7. Explicit no scheduler ownership transfer signals in outputs/events.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Validation Plan (Docs-First Stream)
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md .agent/task/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
- Logs under `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/`.

## Expected Evidence Paths
- docs-first logs:
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/01-docs-check.log`
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/02-docs-freshness.log`
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/03-mirror-parity.diff`
- future gate manifests:
  - `.runs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/cli/<docs-review-run-id>/manifest.json`
  - `.runs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/cli/<implementation-gate-run-id>/manifest.json`

## Findings Link
- `docs/findings/1001-appserver-dynamic-tool-bridge-experimental-lane-deliberation.md`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
