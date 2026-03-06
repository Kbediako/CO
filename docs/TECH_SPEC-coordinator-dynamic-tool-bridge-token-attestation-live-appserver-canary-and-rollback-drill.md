# TECH_SPEC - Coordinator Dynamic-Tool Bridge Token Attestation + Live App-Server Canary + Rollback Drill (1013)

- Canonical TECH_SPEC: `tasks/specs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: runtime implementation and closeout for the next Coordinator slice after `1012` closeout handoff.
- Primary objective: replace hidden-token-presence trust with attested bridge-token verification and capture live app-server canary, rollback-drill, and custom-runs-root compatibility evidence.
- Hard boundary: CO remains execution authority; Coordinator remains intake/control bridge only.

## Implementation Status Note
- Shared-registry updates and docs-review are complete.
- Runtime implementation is also complete in the existing bounded seams:
  - bridge attestation verification in `orchestrator/src/cli/delegationServer.ts`,
  - custom-runs-root manifest validation hardening in `orchestrator/src/cli/control/controlServer.ts`,
  - regression coverage in `orchestrator/tests/DelegationServer.test.ts`, `orchestrator/tests/DynamicToolBridgePolicy.test.ts`, and `orchestrator/tests/ControlServer.test.ts`.

## Requirements
- Create and keep aligned the `1013` docs-first artifacts:
  - `docs/PRD-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `docs/TECH_SPEC-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `docs/ACTION_PLAN-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `tasks/specs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `tasks/tasks-1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `.agent/task/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
  - `docs/findings/1013-dynamic-tool-bridge-token-attestation-deliberation.md`

## Prerequisite Contract
- `1001` is the technical predecessor and remains the authority-boundary baseline.
- `1012` closeout handoff completed before `1013` was registered in shared task/docs registries and before docs-review evidence was captured.

## Attested Token Contract
- Dynamic-tool bridge requests must require stronger provenance than hidden-token presence alone.
- Runner-injected hidden attestation is the minimum accepted shape for this slice:
  - `codex_private.dynamic_tool_bridge_attestation` (camel alias allowed) must be an object.
  - Required hidden fields: `token`, `source_id`, `principal`.
  - Bare hidden token strings are not sufficient.
- Expected run-local attestation metadata is derived from `control.json -> feature_toggles.dynamic_tool_bridge.attestation`, with compatibility fallback to `control.json -> feature_toggles.coordinator.dynamic_tool_bridge.attestation`.
  - Required expected fields: `token_sha256`, `source_id`, `principal`.
  - Optional expected fields: `expires_at`, `revoked`.
- Fail closed when the bridge token or attestation is:
  - missing,
  - expired,
  - revoked,
  - malformed,
  - source/principal mismatched,
  - attestation-invalid.
- The acceptance contract must make it explicit that arbitrary non-empty `codex_private` values are insufficient.
- Validation semantics:
  - reject public/model-supplied token or attestation fields,
  - hash the hidden token and compare to `token_sha256`,
  - compare request, hidden, and expected `source_id` values using canonical lowercase normalization and require them to match,
  - require the hidden `principal` to match expected metadata,
  - set `bridge_token_validated: true` only after successful attestation verification.

## Live App-Server Canary Contract
- Canary evidence must use the real app-server path rather than mock-only harness coverage.
- Canary scope must stay bounded:
  - explicit enablement,
  - explicit transport/source binding,
  - deterministic audit outputs,
  - unchanged CO execution authority.
- Live canary outputs must preserve canonical traceability fields for accepted and rejected actions.

## Rollback Drill Contract
- Rollback evidence must prove the bridge can return to the safe baseline without widening authority.
- The rollback drill must preserve:
  - default-off posture,
  - kill-switch availability,
  - deterministic fail-closed behavior after rollback.

## Implemented Outcome
- Hidden attestation verification now requires a structured `codex_private.dynamic_tool_bridge_attestation` object and rejects public/model-supplied attestation fields.
- Expected attestation metadata is resolved from both supported `control.json` paths:
  - `feature_toggles.dynamic_tool_bridge.attestation`,
  - `feature_toggles.coordinator.dynamic_tool_bridge.attestation`.
- Request, hidden, and expected `source_id` values are canonicalized to lowercase before comparison.
- `bridge_token_validated: true` is emitted only after successful attestation verification.
- Control-server run-manifest validation no longer hardcodes a literal `.runs` root; allowlisted custom run roots using `<root>/<task>/cli/<run>/manifest.json` remain accepted.

## Inherited Compatibility Input
- Carry forward the newer control-server custom-runs-root `P2` into this slice.
- Live canary, control lookup, and rollback contracts must not assume a literal `.runs` root when configured run roots or allowed run roots relocate artifacts.
- If `1013` implementation touches manifest/control-path validation, evidence must explicitly cover configured run-root behavior.

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

## Docs-First Stream Validation (Downstream)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md .agent/task/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill.md`
- `node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task 1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill`

## Gate And Closeout Evidence
- docs-review: `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T00-52-08-829Z-85079438/manifest.json`
- appserver implementation-gate run (passed `05-test`, then review-terminated under shared dirty-tree crawl): `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-29-57-457Z-ed341717/manifest.json`
- CLI break-glass fallback run (non-authoritative unrelated flake): `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T02-34-22-214Z-666547ac/manifest.json`
- live app-server canary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-live-canary/00-summary.md`
- rollback drill: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T014527Z-rollback-drill/00-summary.md`
- custom-runs-root nested-source canary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T020745Z-custom-runs-root-nested-source-canary/00-summary.md`
- control-server custom-runs-root question enqueue: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T022221Z-control-server-custom-runs-root-question-enqueue/00-summary.md`
- terminal closeout summary: `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/20260306T024855Z-closeout/00-summary.md`
