# TECH_SPEC - Coordinator App-Server Dynamic-Tool Bridge Experimental Lane (1001)

- Canonical TECH_SPEC: `tasks/specs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: docs-first instantiation of deferred `0998` app-server dynamic-tool bridge as an experimental 1001 lane.
- Hard boundary: CO remains execution authority; Coordinator remains intake/control bridge only.
- Explicit prohibition: no scheduler ownership transfer.

## Deferred-Lineage Contract (0998 -> 1001)
- Source defer record: `tasks/specs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md` (app-server dynamic-tool bridge defer row).
- 1001 must preserve defer prerequisites:
  - experimental isolation,
  - explicit security review,
  - bounded blast radius,
  - reversible kill-switch.

## Requirements
- Create synchronized docs-first artifacts for 1001:
  - `docs/PRD-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `docs/TECH_SPEC-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `docs/ACTION_PLAN-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `tasks/specs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `tasks/tasks-1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
  - `.agent/task/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
- Register task/spec/doc freshness entries in canonical registries.

## Authority + Safety Invariants
- CO remains the only authority that can commit run/control transitions.
- Coordinator only forwards/intakes bridge requests and never becomes execution owner.
- Scheduler ownership transfer is forbidden and treated as a hard-fail condition.

## Auth/Token Boundary (Fail-Closed)
- Bridge requests must include valid scoped auth/token envelopes.
- Reject deterministically when token/auth context is:
  - missing,
  - expired,
  - revoked,
  - malformed,
  - source/principal mismatched.
- Reject unsupported transport/source contexts deterministically.

## Idempotency + Traceability + Auditable Outputs
- Idempotency:
  - duplicate request/intent payloads replay deterministically,
  - no double-apply state mutation.
- Traceability mapping:
  - canonical fields required for every response/event: `intent_id`, `task_id`, `run_id`, `manifest_path`, decision, reason.
- Auditable behavior:
  - accept/reject/replay outcomes emit deterministic audit events,
  - outputs must show non-authoritative Coordinator behavior.

## Experimental Kill-Switch Contract
- Experimental bridge is default-off.
- Explicit policy enablement is required for any experimental bridge intake.
- Kill-switch must force immediate fail-closed rejection for experimental intake when enabled.
- Kill-switch transitions and current posture must be auditable.

## Expected Manual Simulation Coverage (Future Implementation Lanes)
1. Auth/token fail-closed rejects across missing/expired/revoked/malformed envelopes.
2. Unsupported/unauthorized source-context envelopes fail closed with deterministic reasons.
3. Duplicate request/intent idempotent replay behavior is deterministic.
4. Canonical traceability mapping remains stable and complete.
5. Auditable output stream records applied/replayed/rejected decisions.
6. Experimental kill-switch default-off and active-stop behavior is verified.
7. No scheduler ownership transfer indicators in outputs/events.

## Ordered Validation Gates (Repository Policy)
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

## Docs-First Stream Validation (This Lane)
- Required commands:
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `diff -u tasks/tasks-1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md .agent/task/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
- Expected evidence paths:
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/01-docs-check.log`
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/02-docs-freshness.log`
  - `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T164707Z-docs-first/03-mirror-parity.diff`

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/cli/<implementation-gate-run-id>/manifest.json`
