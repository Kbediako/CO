# ACTION_PLAN - CO-459 stale top-level provider_intake versus fresh raw provider-intake-state authority

## Summary
- Goal: give the parent lane a bounded plan for the authority gap where top-level `provider_intake` stale summary/cache data can outrank a fresh raw provider-intake snapshot in `provider-intake-state.json` across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
- Scope: docs-first packet, checklist mirrors, `tasks/index.json`, parent-owned implementation, and parent-owned focused validation.
- Assumptions:
  - the supplied source payload contains run/source metadata rather than the full issue body
  - the explicit child-lane contract is the issue-shaping authority for this docs packet
  - the smallest correct parent fix is a freshness authority contract in existing provider-intake/runtime/read-model seams, not manual relaunch, timeout-only handling, or state flattening

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `/api/v1/state`
  - `/ui/data.json`
  - `provider_intake`
  - `provider-intake-state.json`
  - `stale summary/cache data`
  - `fresh raw provider-intake snapshot`
  - `selected issue`
  - `concurrent-claim truth`
  - `active/running/released states`
  - `CO-243 regression/follow-up`
  - `CO-455 timeout-only adjacency`
- Not done if:
  - top-level `provider_intake` still presents stale summary/cache data while fresh raw `provider-intake-state.json` says otherwise
  - selected issue, concurrent-claim truth, or active/running/released states disagree across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`
  - parent fixes this via manual relaunch, timeout-only handling, or lifecycle state flattening
  - stale cache outranks raw state
- Pre-implementation issue-quality review:
  - 2026-05-01: the lane is correctly shaped as fresh raw provider-intake snapshot authority over stale summary/cache data. It is not narrower than the user request because it carries the protected terms, explicit non-goals, and current/reference/target parity across status, API, and UI surfaces.
- Fallback / refactor decision: this task touches stale/cached behavior. Decision is `remove fallback` for stale summary/cache data outranking fresh raw provider-intake snapshot; `justify retaining fallback` for raw `provider-intake-state.json` as the durable audit/authority surface; and `justify retaining fallback` for the separate `CO-455 timeout-only adjacency` boundary.
- Durable retention evidence: raw `provider-intake-state.json` remains retained because it preserves selected issue, concurrent-claim truth, and active/running/released states; the stale-cache priority is what must be removed.
- Large-refactor check: parent should first attempt a bounded freshness authority fix. Escalate only if the existing runtime/read-model cache boundary cannot make stale summary/cache data subordinate to raw state.

## Milestones & Sequencing
1. Create the CO-459 docs-first packet and checklist mirrors within the declared child-lane file scope.
2. Parent audits raw `provider-intake-state.json` loading and `ProviderIntakeState` normalization in `providerIntakeState.ts`.
3. Parent audits `buildProviderIntakeSummary()` and `selectProviderIntakeClaim()` for how top-level `provider_intake` can become stale relative to raw state.
4. Parent audits `controlRuntime.ts` cache/snapshot lifetime and how `providerIntake` enters status/API/UI projections.
5. Parent audits `observabilityReadModel.ts`, `observabilitySurface.ts`, `uiDataController.ts`, and `operatorDashboardPresenter.ts` serialization of `provider_intake`.
6. Parent implements the smallest authority contract so fresh raw provider-intake snapshot wins over stale summary/cache data.
7. Parent preserves selected issue, concurrent-claim truth, and active/running/released states, using CO-243 as the regression baseline.
8. Parent confirms CO-459 does not implement `CO-455 timeout-only adjacency` behavior.
9. Parent runs focused validation and carries the packet into docs-review, implementation review, PR, and Linear closeout.

## Dependencies
- Shared source anchor: `ctx:sha256:0601533a80ba224cdbbbb7e4622264b47264850eeeeda93cf956b12cebd305cb#chunk:c000001`
- Origin manifest: `.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/manifest.json`
- Live seam inventory:
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- Likely parent focused tests:
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ObservabilityReadModel.test.ts`

## Validation
- Child lane only:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8'));"`
  - `rg -n "co-status --format json|/api/v1/state|/ui/data\\.json|provider_intake|provider-intake-state\\.json|stale summary/cache data|fresh raw provider-intake snapshot|selected issue|concurrent-claim truth|active/running/released states|CO-243 regression/follow-up|CO-455 timeout-only adjacency" docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md .agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
  - `git diff --check -- docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md .agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md tasks/index.json`
- Parent implementation lane:
  - focused `ProviderIntakeState.test.ts` stale summary/cache data versus fresh raw provider-intake snapshot regression
  - focused `ControlRuntime.test.ts` status/API/UI projection freshness regression
  - focused `/api/v1/state` and `/ui/data.json` coverage as needed
  - CO-243 baseline regression or explicit no-regression proof
  - CO-455 timeout-only boundary proof or explicit no-touch proof
  - parent docs-review before implementation
- Rollback plan:
  - revert the bounded freshness authority seam if it hides raw provider-intake truth, flattens active/running/released states, or widens into timeout-only/manual-relaunch behavior

## Risks & Mitigations
- Risk: parent fixes the stale cache by flattening active/running/released states.
  - Mitigation: keep active/running/released states protected in spec, checklist, and focused validation.
- Risk: parent conflates CO-459 with `CO-455 timeout-only adjacency`.
  - Mitigation: require a boundary check and keep timeout-only handling as a non-goal.
- Risk: parent reopens `CO-243 regression/follow-up` too broadly.
  - Mitigation: use CO-243 as baseline proof for concurrent-claim truth, but keep CO-459 focused on raw-state freshness authority.
- Risk: parent uses manual relaunch as the repair.
  - Mitigation: explicit non-goal and Not Done If reject manual relaunch.

## Approvals
- Docs packet child lane: `.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
