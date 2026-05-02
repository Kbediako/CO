---
id: 20260501-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba
title: CO-459 stale top-level provider_intake versus fresh raw provider-intake-state authority
relates_to: docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md
risk: high
owners:
  - Codex
last_review: 2026-05-01
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- PRD: `docs/PRD-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- Task checklist: `tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`

## Traceability
- Linear issue: `CO-459` / `d536879d-3ddc-47b0-ae37-0ab657af18ba`
- Source anchor: `ctx:sha256:0601533a80ba224cdbbbb7e4622264b47264850eeeeda93cf956b12cebd305cb#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/manifest.json`
- Shared source note: the supplied source payload was available only through the parent workspace and contains run/source metadata rather than the full issue body, so this packet preserves the explicit child-lane contract plus current repo seam names.

## Summary
- Objective: make the parent implementation preserve fresh raw provider-intake snapshot authority when top-level `provider_intake` summary/cache data is stale across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
- Scope:
  - docs-first packet and checklist mirrors for `CO-459`
  - parent-owned provider-intake summary/cache invalidation or rebuild behavior
  - parent-owned focused validation for status/API/UI consistency
- Constraints:
  - preserve selected issue, concurrent-claim truth, and active/running/released states
  - do not implement manual relaunch or timeout-only behavior
  - do not let stale summary/cache data outrank fresh raw provider-intake snapshot

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about stale top-level `provider_intake` versus fresh raw `provider-intake-state.json` authority, not manual relaunch, timeout-only handling, state flattening, or broad `CO-243` redesign.
- Protected terms / exact artifact and surface names:
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
  - `providerIntakeState.ts`
  - `buildProviderIntakeSummary()`
  - `selectProviderIntakeClaim()`
  - `controlRuntime.ts`
  - `observabilityReadModel.ts`
  - `observabilitySurface.ts`
  - `uiDataController.ts`
  - `operatorDashboardPresenter.ts`
- Nearby wrong interpretations to reject:
  - manual relaunch or worker-start repair
  - timeout-only handling for CO-455
  - flattening active/running/released states
  - stale cache outranking raw state
  - reopening CO-243 as generic concurrent-claim redesign
- Explicit non-goals carried forward:
  - no manual relaunch
  - no timeout-only handling
  - no lifecycle state flattening
  - no stale cache outranking raw state
  - no source/test edits in this child lane
  - no Linear/GitHub/workpad/PR lifecycle work in this child lane

## Parity / Alignment Matrix
- Current truth:
  - raw `provider-intake-state.json` can be fresher than top-level `provider_intake` summary/cache data
  - stale summary/cache data can misrepresent the selected issue or claim lifecycle
  - `co-status --format json`, `/api/v1/state`, and `/ui/data.json` can all serialize the stale top-level summary
  - CO-243 already covers selected-claim versus concurrent-running semantics, but CO-459 is specifically about freshness and authority precedence
- Reference truth:
  - fresh raw provider-intake snapshot authority outranks stale summary/cache data
  - selected issue and concurrent-claim truth must be consistent across status, API, and UI data surfaces
  - active/running/released states must remain separate lifecycle states
  - CO-455 timeout-only behavior stays outside this lane
- Target truth / intended delta:
  - top-level `provider_intake` is rebuilt from, invalidated by, or freshness-checked against fresh raw `provider-intake-state.json`
  - `co-status --format json`, `/api/v1/state`, and `/ui/data.json` agree on selected issue, concurrent-claim truth, and active/running/released states
  - stale summary/cache data cannot outrank raw state
- Explicitly out-of-scope differences:
  - manual relaunch and operator repair
  - timeout-only classification or retries
  - scheduler/admission policy changes
  - destructive raw-state cleanup
  - broad renderer redesign

## Readiness Gate
- Not done if:
  - top-level `provider_intake` can still present stale summary/cache data while raw `provider-intake-state.json` is fresher
  - the selected issue differs between top-level `provider_intake` and the fresh raw provider-intake snapshot without explicit stale classification
  - concurrent-claim truth or active/running/released states are flattened to make surfaces look consistent
  - CO-459 is implemented as manual relaunch or timeout-only handling
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: child-lane instructions explicitly require preserving `co-status --format json`, `/api/v1/state`, `/ui/data.json`, `provider_intake`, `provider-intake-state.json`, stale summary/cache data, fresh raw provider-intake snapshot, selected issue, concurrent-claim truth, active/running/released states, `CO-243 regression/follow-up`, and `CO-455 timeout-only adjacency`.
  - 2026-05-01: micro-task path is ineligible because correctness depends on exact protected terms, exact status/API/UI surfaces, issue-boundary non-goals, and parity between stale summary/cache data and fresh raw state authority.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist files and `tasks/index.json`
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-459`.
  2. Ensure top-level `provider_intake` does not serialize stale summary/cache data after raw `provider-intake-state.json` advances.
  3. Preserve selected issue and concurrent-claim truth across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
  4. Preserve active/running/released states as distinct lifecycle semantics.
  5. Preserve `CO-243 regression/follow-up` as a baseline, not a broad redesign.
  6. Keep `CO-455 timeout-only adjacency` out of implementation scope.
- Non-functional requirements:
  - deterministic freshness precedence between raw provider-intake state and derived summary data
  - minimal bounded change inside existing provider-intake/runtime/read-model seams
  - no destructive rewrite of `provider-intake-state.json`
  - no hidden stale-cache success path
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`

## Architecture & Data
- Architecture / design adjustments:
  - parent should find the exact cache or runtime snapshot boundary where stale summary/cache data persists after raw provider-intake state advances
  - parent should either rebuild top-level `provider_intake` from the fresh raw provider-intake snapshot or fail closed with explicit stale provenance
  - parent should keep the selected issue and concurrent-claim truth contract from CO-243 intact
  - parent should keep timeout-only handling scoped to CO-455
- Required artifact/content expectations:
  - `provider-intake-state.json` remains the raw authority and retained audit state
  - top-level `provider_intake` no longer outranks the fresh raw provider-intake snapshot
  - active/running/released states remain inspectable in status/API/UI payloads
- Data model changes / migrations:
  - additive freshness/provenance fields are acceptable if parent needs them
  - deleting raw state history is not required and is explicitly out of scope
- External dependencies / integrations:
  - no Linear or GitHub mutation from this child lane
  - parent may reuse existing provider-intake summary helpers if they can be made freshness-aware

## Current Truth
- `providerIntakeState.ts` defines `ProviderIntakeState`, `ProviderIntakeClaimRecord`, `selectProviderIntakeClaim()`, and `buildProviderIntakeSummary()`.
- `buildProviderIntakeSummary()` derives top-level summary fields including `summary_scope`, `selection_strategy`, claim counts, selected claim, active issue identifiers, running issue identifiers, rehydration state, and `updated_at`.
- `controlRuntime.ts` builds selected-run and compatibility runtime snapshots and threads `providerIntake` into downstream status surfaces.
- `observabilityReadModel.ts`, `observabilitySurface.ts`, `uiDataController.ts`, and `operatorDashboardPresenter.ts` serialize top-level `provider_intake` into `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
- CO-243 coverage already proves selected-claim/concurrent-running summary semantics, while CO-459 focuses on stale summary/cache data losing to fresh raw provider-intake snapshot authority.

## Proposed Design
- Add or clarify one freshness authority contract:
  - raw `provider-intake-state.json` wins when it is fresher than cached top-level summary data
  - top-level `provider_intake` is rebuilt, invalidated, or explicitly marked stale before any status/API/UI surface presents it
  - selected issue and concurrent-claim truth are derived from the same fresh raw authority
  - active/running/released states retain their lifecycle meanings
- Keep the implementation bounded to provider-intake summary/runtime/read-model authority instead of adding manual relaunch or timeout-only behavior.

## Protected Expectations
- Preserve exact terms: `co-status --format json`, `/api/v1/state`, `/ui/data.json`, `provider_intake`, `provider-intake-state.json`, `stale summary/cache data`, `fresh raw provider-intake snapshot`, `selected issue`, `concurrent-claim truth`, `active/running/released states`, `CO-243 regression/follow-up`, and `CO-455 timeout-only adjacency`.
- Fresh raw provider-intake snapshot authority outranks stale summary/cache data.
- Selected issue and concurrent-claim truth stay consistent across status/API/UI surfaces.
- Active/running/released states remain separate.

## Reject These Wrong Interpretations
- `This should manually relaunch the worker.`
- `This is just timeout-only handling for CO-455.`
- `Flatten active/running/released states so all surfaces agree.`
- `Let cached provider_intake stay visible even when raw provider-intake-state.json is newer.`
- `Rewrite CO-243 as a broad concurrency redesign.`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| top-level `provider_intake` | stale summary/cache data can outrank a fresh raw provider-intake snapshot | `remove fallback` | CO-459 parent lane | raw `provider-intake-state.json` is fresher than cached summary data | pre-CO-459 | 2026-05-01 | immediate removal in CO-459 | top-level summary is rebuilt from or freshness-checked against raw state | focused status/API/UI stale-cache regression |
| `provider-intake-state.json` | raw retained provider-intake snapshot | `justify retaining fallback` | provider-intake control-host surface | raw state preserves selected issue, concurrent-claim truth, and active/running/released states | existing provider-intake contract | 2026-05-01 | durable authority surface | not removed; remains raw authority and audit trail | raw-state authority and no destructive cleanup proof |
| `CO-455 timeout-only adjacency` | timeout-only classification remains nearby but separate | `justify retaining fallback` | CO-455 owner | read timeout is the only observed failure class | CO-455 | 2026-05-01 | durable boundary | not removed; CO-459 keeps timeout-only handling out of scope | negative/boundary proof or explicit no-touch evidence |

- Durable retention evidence: `provider-intake-state.json` is retained because it is the raw authority and audit state. CO-459 removes stale-cache priority, not raw-state retention.
- Large-refactor check: parent should attempt a bounded cache/freshness authority fix first. Escalate to a larger read-model refactor only if existing runtime snapshots cannot reliably prevent stale summary/cache data from outranking raw state.

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files and mirrors
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused `ProviderIntakeState.test.ts` coverage for summary freshness versus raw state
  - focused `ControlRuntime.test.ts` coverage for status/API/UI projection using fresh raw provider-intake snapshot authority
  - focused `ObservabilityReadModel.test.ts` or nearby controller coverage for `/api/v1/state` and `/ui/data.json`
  - focused regression tying CO-459 to the `CO-243 regression/follow-up` baseline without widening into timeout-only `CO-455` behavior
  - parent docs-review before implementation

## Open Questions
- Which cache or runtime snapshot currently allows stale summary/cache data to survive after raw provider-intake state changes?
- Should parent add explicit freshness/provenance to top-level `provider_intake` or simply rebuild it from raw state before serialization?
- Which exact CO-455 timeout-only proof should parent cite to keep the boundary visible?

## Approvals
- Reviewer: pending parent docs-review / implementation
- Date: 2026-05-01
