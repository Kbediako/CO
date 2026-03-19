---
id: 20260306-1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill
title: Coordinator Dynamic-Tool Bridge Token Attestation + Live App-Server Canary + Rollback Drill
relates_to: docs/PRD-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: complete the next approved Coordinator slice after `1012` closeout handoff for attested dynamic-tool bridge token verification plus live app-server canary and rollback-drill evidence.
- Scope: inherited-risk capture, completed registry/review handoff, implemented runtime hardening, custom-runs-root compatibility coverage, and closeout evidence.
- Boundary: CO execution authority remains unchanged; no scheduler ownership transfer.

## Implementation Review Note
- Decision: `1013` is complete.
- Reasoning: the bounded runtime hardening shipped, live canary and rollback evidence were captured, custom-runs-root compatibility was proven in both delegation-server and control-server paths, and the final closeout recorded the shared-checkout review-stall override explicitly instead of leaving the task open on non-owned dirty-tree review churn.

## Technical Requirements
- Authority invariants:
  - CO remains execution authority.
  - Coordinator remains intake/control bridge.
  - No scheduler ownership transfer.
- Attested token requirements:
  - dynamic-tool bridge auth must require stronger provenance than hidden-token presence,
  - hidden runner data must be a structured attestation object, not a bare token string,
  - the minimum hidden attestation object is `codex_private.dynamic_tool_bridge_attestation` with `token`, `source_id`, and `principal`,
  - the expected run-local attestation metadata lives at `control.json -> feature_toggles.dynamic_tool_bridge.attestation` with compatibility fallback to `control.json -> feature_toggles.coordinator.dynamic_tool_bridge.attestation`,
  - expected attestation metadata still carries `token_sha256`, `source_id`, `principal`, and optional `expires_at` / `revoked`,
  - request, hidden, and expected `source_id` values are compared using canonical lowercase normalization,
  - missing/expired/revoked/malformed/source-mismatched/attestation-invalid tokens fail closed,
  - acceptance of arbitrary non-empty `codex_private` values is forbidden.
- Live app-server canary requirements:
  - use the real app-server path,
  - keep enablement bounded and auditable,
  - preserve canonical traceability for accept/reject outcomes.
- Rollback drill requirements:
  - prove return to the safe baseline,
  - preserve default-off and kill-switch semantics,
  - preserve deterministic fail-closed behavior after rollback.

## Inherited Inputs and Risks
- `1001` carry-forward weakness:
  - hidden-token presence was enforced, but attested provenance was not.
- `1001` carry-forward evidence gap:
  - existing canary/manual evidence is mock-harness based, not live app-server based.
- `1012` carry-forward implementation input:
  - live canary/control-path work must not hardcode a literal `.runs` root where configured run roots or allowed run roots relocate manifests.

## Captured Evidence
1. Attested token failure-path matrix with deterministic reasons.
- Evidence: `orchestrator/tests/DelegationServer.test.ts`, `orchestrator/tests/DynamicToolBridgePolicy.test.ts`, `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/05-pass-fail-matrix.md`.
2. Bounded live app-server canary evidence for allowed bridge actions.
- Evidence: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/00-summary.md`.
3. Rollback-drill evidence proving safe-baseline restoration.
- Evidence: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-rollback-drill/00-summary.md`.
4. Traceability evidence showing accepted/rejected/canary/rollback decisions remain auditable.
- Evidence: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/03-session-transcript.json`, `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-rollback-drill/03-session-transcript.json`.
5. Custom-runs-root compatibility evidence for manifest/control-path validation.
- Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T020745Z-custom-runs-root-nested-source-canary/00-summary.md`, `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T022221Z-control-server-custom-runs-root-question-enqueue/00-summary.md`.
6. No scheduler ownership transfer indicators in traces or status outputs.
- Evidence: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/05-pass-fail-matrix.md`, `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-rollback-drill/05-pass-fail-matrix.md`.

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

## Validation Plan (Docs-First Stream, Downstream)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md .agent/task/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
- Capture logs under `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T024855Z-closeout/`.
- Terminal docs-review manifest: `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T00-52-08-829Z-85079438/manifest.json`
- Appserver implementation-gate manifest: `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-29-57-457Z-ed341717/manifest.json`
- CLI fallback manifest (non-authoritative): `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-34-22-214Z-666547ac/manifest.json`
- Terminal closeout summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T024855Z-closeout/00-summary.md`

## Findings Link
- `docs/findings/1013-dynamic-tool-bridge-token-attestation-deliberation.md`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
