# PRD - Coordinator Dynamic-Tool Bridge Token Attestation + Live App-Server Canary + Rollback Drill (1013)

## Summary
- Problem Statement: task `1001` proved the experimental dynamic-tool bridge with default-off, kill-switch, and non-authoritative Coordinator boundaries, but the bridge still treats hidden-token presence as sufficient auth, has only mock-harness canary evidence, and has no live app-server rollback-drill proof.
- Desired Outcome: harden bridge-token verification, add bounded live app-server canary evidence, and capture an explicit rollback drill without expanding authority.
- Scope Status: runtime implementation and closeout are complete for task `1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill`; attested verification, live canary, rollback drill, custom-runs-root compatibility coverage, and terminal closeout evidence are all recorded in this workspace.

## Prerequisite Status
- Completed predecessor: `1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane` is the technical base for this slice.
- Queueing prerequisite: `1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment` closeout is complete; `1013` is now the active approved follow-on slice.

## Completion Status
- Runtime implementation shipped in the existing bounded seams:
  - attested bridge-token verification lives in `orchestrator/src/cli/delegationServer.ts`,
  - custom-runs-root manifest validation is hardened in `orchestrator/src/cli/control/controlServer.ts`,
  - regression coverage lives in `orchestrator/tests/DelegationServer.test.ts`, `orchestrator/tests/DynamicToolBridgePolicy.test.ts`, and `orchestrator/tests/ControlServer.test.ts`.
- Manual/mock and live evidence is captured under `out/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/manual/`, including:
  - live app-server canary,
  - rollback drill,
  - nested-source custom-runs-root canary,
  - control-server custom-runs-root question enqueue/resume check,
  - explicit elegance review,
  - terminal closeout summary.
- The default appserver implementation-gate run passed `05-test` and later failed in review after a long shared-dirty-tree crawl with no emitted findings. The canonical closeout therefore uses an explicit review-stall override recorded in the task closeout artifact, while the CLI break-glass rerun is retained only as non-authoritative evidence because it failed on an unrelated `packages/orchestrator/tests/UnifiedExec.test.ts` `ENOENT` flake.

## User Request Translation
- Create the `1013` docs-first bundle in worker-owned files only.
- Carry forward the dynamic-tool bridge auth/token weakness explicitly:
  - hidden token presence is not enough,
  - attested provenance is required for the next slice.
- Carry forward the newer control-server `custom-runs-root` `P2` as an explicit inherited implementation input.
- Keep the same hard boundaries:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - no scheduler ownership transfer.

## Slice Scope (1013)
- In scope:
  - attested bridge-token verification contract,
  - bounded live app-server canary contract,
  - explicit rollback-drill evidence contract,
  - inherited custom-runs-root compatibility input for canary/control lookups,
  - auditable traceability for accept/reject/canary/rollback events.
- Concrete runtime auth contract for this slice:
  - runner injects hidden `codex_private.dynamic_tool_bridge_attestation`,
  - attestation object carries `token`, `source_id`, and `principal`,
  - expected run-local attestation metadata lives under `control.json -> feature_toggles.dynamic_tool_bridge.attestation` with compatibility fallback to `control.json -> feature_toggles.coordinator.dynamic_tool_bridge.attestation`,
  - expected metadata carries `token_sha256`, `source_id`, `principal`, and optional `expires_at` / `revoked`,
  - request, hidden, and expected `source_id` values are compared using canonical lowercase normalization.
- Out of scope:
  - scheduler ownership transfer,
  - authority expansion away from CO,
  - broad transport refactors,
  - broad shared-registry churn outside the required `1013` task surfaces.

## Inherited Risks and Inputs
- Carry-forward risk from `1001`:
  - the experimental bridge enforced hidden-token presence, but not signed or otherwise attested token provenance.
- Carry-forward evidence gap from `1001`:
  - manual simulation used the mock harness only; no live app-server canary or rollback drill is yet recorded.
- New inherited implementation input from the `1012` review lane:
  - control-server manifest validation must not assume a literal `.runs` root when `CODEX_ORCHESTRATOR_RUNS_DIR` or allowed run roots relocate artifacts.

## Acceptance Criteria
1. `1013` docs-first artifacts exist and stay aligned around attested token verification, live canary evidence, and rollback drill scope.
2. `1013` remains explicitly queued after `1012` closeout rather than widening current in-flight scope.
3. Attested token requirements are fail-closed and stronger than hidden-token presence checks.
   - bare hidden token strings are insufficient without hidden attestation metadata.
   - expected hash/metadata must be present in run-local control state.
4. Live app-server canary scope is bounded, auditable, and keeps CO as the only execution authority.
5. Rollback drill acceptance proves return to the safe baseline without widening authority.
6. Inherited custom-runs-root compatibility risk is explicit wherever live canary/control lookups are defined.

## Decision Log
- Decision (2026-03-06): scaffold `1013` as the queued next approved Coordinator slice, then complete the required shared-registry sync and docs-review immediately after the `1012` closeout handoff.
- Decision (2026-03-06): treat token attestation weakness as the primary inherited risk and custom-runs-root compatibility as a required implementation input for live canary work.
- Decision (2026-03-06): keep the broader review-wrapper `FORCE_CODEX_REVIEW=1` policy/docs follow-up separate from `1013`, while treating the bridge-token validation `P2` as the core runtime deliverable of this slice.
- Decision (2026-03-06): close the slice on direct validation plus manual evidence after the appserver implementation-gate passed `05-test` and then stalled in shared-checkout review, recording the explicit override and keeping the CLI fallback flake non-authoritative.

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
