# PRD - CO-459 stale top-level provider_intake versus fresh raw provider-intake-state authority

## Added by Docs Child Lane 2026-05-01

## Traceability
- Linear issue: `CO-459` / `d536879d-3ddc-47b0-ae37-0ab657af18ba`
- Task id: `linear-d536879d-3ddc-47b0-ae37-0ab657af18ba`
- Canonical spec: `tasks/specs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- Checklist mirror: `tasks/tasks-linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md` and `.agent/task/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba.md`
- Shared source 0 anchor: `ctx:sha256:0601533a80ba224cdbbbb7e4622264b47264850eeeeda93cf956b12cebd305cb#chunk:c000001`
- Origin manifest: `.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/manifest.json`
- Source payload note: the supplied source payload was available in the parent workspace at `../../.runs/linear-d536879d-3ddc-47b0-ae37-0ab657af18ba-docs-packet/cli/2026-05-01T03-01-30-233Z-69dd6493/memory/source-0/source.txt` and contains run/source metadata rather than the full issue body, so this packet is anchored on the explicit child-lane contract and current repo seam names only.

## Summary
- Problem Statement: `co-status --format json`, `/api/v1/state`, and `/ui/data.json` can expose stale top-level `provider_intake` summary/cache data after a fresher raw `provider-intake-state.json` snapshot already records the authority for the selected issue and concurrent-claim truth. Operators then see a selected summary that can lag the raw provider-intake snapshot, obscure active/running/released states, and blur the boundary with the older `CO-243 regression/follow-up`.
- Desired Outcome: parent implementation makes fresh raw provider-intake snapshot authority outrank stale summary/cache data for top-level `provider_intake` without flattening active/running/released states, without manual relaunch behavior, and without absorbing the adjacent `CO-455 timeout-only adjacency` work.

## User Request Translation (Context Anchor)
- User intent / needs: create the docs-first packet and checklist mirrors for `CO-459` so the parent lane can fix stale top-level `provider_intake` data when raw `provider-intake-state.json` is fresher and more authoritative for the selected issue, concurrent-claim truth, and active/running/released states.
- Success criteria / acceptance:
  - `co-status --format json`, `/api/v1/state`, and `/ui/data.json` do not let stale summary/cache data outrank a fresh raw provider-intake snapshot.
  - top-level `provider_intake` reflects the selected issue and concurrent-claim truth from fresh `provider-intake-state.json`.
  - active/running/released states remain distinct; the parent fix must not flatten them into a single live/not-live bucket.
  - the packet explicitly distinguishes `CO-459` from the `CO-243 regression/follow-up` and from `CO-455 timeout-only adjacency`.
- Constraints / non-goals:
  - child lane owns only the declared docs/checklist files and `tasks/index.json`.
  - parent lane owns source inspection, implementation, validation, Linear state, workpad, PR lifecycle, and review handoff.
  - no Linear or GitHub mutation from this child lane.
  - no source, test, `docs/TASKS.md`, or docs-freshness registry edits from this child lane.

## Intent Checksum
- Exact user wording / phrases to preserve:
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
  - treating this as a manual relaunch or worker-start lane
  - treating this as timeout-only handling for `CO-455`
  - flattening active/running/released states so the raw state loses lifecycle detail
  - allowing stale summary/cache data to outrank the fresh raw provider-intake snapshot
  - relitigating the `CO-243 regression/follow-up` as a generic concurrent-claim redesign instead of fixing stale summary authority

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| `provider-intake-state.json` | Raw provider-intake state can be fresher than cached top-level summary data and can preserve selected issue, concurrent-claim truth, and active/running/released states. | The fresh raw provider-intake snapshot is the authority when it is newer and internally consistent. | Parent reads or rebuilds top-level `provider_intake` from fresh raw state instead of stale summary/cache data. |
| Top-level `provider_intake` | Summary/cache projection can lag the raw snapshot and present stale selected issue or stale counts. | A summary is acceptable only when it is derived from the current raw provider-intake authority or clearly marked unavailable/stale. | Top-level `provider_intake` aligns with fresh raw state for selected issue, claim counts, active/running/released states, and concurrent-claim truth. |
| `co-status --format json` | JSON consumers can inherit stale top-level `provider_intake` while other rows or raw state indicate fresher truth. | `co-status --format json` must be machine-checkable and must not let stale summary/cache data hide fresher raw intake authority. | JSON output keeps selected issue and concurrent-claim truth consistent with fresh `provider-intake-state.json`. |
| `/api/v1/state` | API state can expose top-level `provider_intake` that lags the raw provider-intake snapshot. | `/api/v1/state` should reflect the same provider-intake authority as the direct status path. | `/api/v1/state` aligns top-level `provider_intake` with fresh raw provider-intake snapshot semantics. |
| `/ui/data.json` | UI data can inherit stale summary/cache data and present misleading selected issue or lifecycle state. | `/ui/data.json` should be a presentation of current authority, not a stale cache outranking raw state. | UI data preserves selected issue, concurrent-claim truth, and active/running/released states from fresh raw state. |
| `CO-243 regression/follow-up` | CO-243 already created a selected-claim/concurrent-running contract, but stale summary/cache data can still outrank fresher raw state. | CO-243 remains the regression baseline for concurrent-claim truth. | CO-459 uses CO-243 as a baseline and fixes the newer stale-cache authority gap without reopening scheduler or renderer scope. |
| `CO-455 timeout-only adjacency` | Timeout-only status behavior is nearby but separate. | Timeout classification must stay scoped to CO-455. | CO-459 does not implement timeout-only handling or reclassify timeout failures. |

## Acceptance Criteria
- Docs packet and checklist mirrors exist for the declared CO-459 files only.
- `tasks/index.json` has a CO-459 registry entry that points to the PRD, TECH_SPEC, ACTION_PLAN, checklist mirrors, source anchor, and manifest.
- Protected terms are preserved exactly: `co-status --format json`, `/api/v1/state`, `/ui/data.json`, `provider_intake`, `provider-intake-state.json`, `stale summary/cache data`, `fresh raw provider-intake snapshot`, `selected issue`, `concurrent-claim truth`, `active/running/released states`, `CO-243 regression/follow-up`, and `CO-455 timeout-only adjacency`.
- Parent implementation can prove stale summary/cache data no longer outranks fresh raw provider-intake snapshot authority.
- Parent implementation keeps selected issue, concurrent-claim truth, and active/running/released states distinct across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.

## Non-Goals
- No manual relaunch, manual worker start, or operator-driven provider-intake repair as the primary fix.
- No timeout-only handling; `CO-455 timeout-only adjacency` stays separate.
- No flattening of active/running/released states into one current/not-current flag.
- No stale cache outranking raw state.
- No destructive rewrite or pruning of `provider-intake-state.json`.
- No source or test edits in this docs child lane.
- No Linear mutation, GitHub mutation, workpad mutation, PR workflow, or parent lifecycle work from this child lane.

## Not Done If
- `provider_intake` still reflects stale summary/cache data when a fresher raw `provider-intake-state.json` snapshot is available.
- `co-status --format json`, `/api/v1/state`, or `/ui/data.json` disagree about selected issue, concurrent-claim truth, or active/running/released states after the same fresh raw provider-intake snapshot is available.
- The implementation fixes the mismatch by manual relaunch, timeout-only handling, or state flattening.
- Stale summary/cache data can still outrank the fresh raw provider-intake snapshot.
- The fix widens into scheduler/admission policy, `CO-455` timeout classification, or a broad `CO-243` redesign.

## Stakeholders
- Product: CO operators depending on truthful provider-intake status during queue and handoff incidents.
- Engineering: control-host intake, runtime/read-model, status JSON, API, and UI data maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - top-level `provider_intake` freshness matches or is derived from fresh raw provider-intake snapshot authority
  - selected issue and concurrent-claim truth agree across `co-status --format json`, `/api/v1/state`, and `/ui/data.json`
  - active/running/released states remain separate and auditable
- Guardrails / Error Budgets:
  - no stale cache outranking raw state
  - no manual relaunch as a repair path
  - no timeout-only behavior folded into CO-459
  - no state flattening or destructive raw-state cleanup

## User Experience
- Personas:
  - operator using `co-status --format json` to decide whether a provider lane is truly active, running, or released
  - operator comparing `/api/v1/state` and `/ui/data.json` during a control-host incident
  - maintainer auditing `provider-intake-state.json` against top-level `provider_intake`
- User Journeys:
  - operator sees top-level `provider_intake` agree with the fresh raw provider-intake snapshot instead of stale summary/cache data
  - operator can still distinguish active/running/released states for the selected issue and concurrent claims
  - reviewer can verify CO-459 stayed distinct from `CO-243 regression/follow-up` and `CO-455 timeout-only adjacency`

## Technical Considerations
- Architectural Notes:
  - `providerIntakeState.ts` owns raw state normalization plus `buildProviderIntakeSummary()` / `selectProviderIntakeClaim()`.
  - `controlRuntime.ts` builds runtime snapshots and currently threads top-level `providerIntake`.
  - `observabilityReadModel.ts`, `observabilitySurface.ts`, `uiDataController.ts`, and `operatorDashboardPresenter.ts` serialize or present `provider_intake` through `co-status --format json`, `/api/v1/state`, and `/ui/data.json`.
  - Parent should identify the smallest seam where stale summary/cache data can survive after raw provider-intake authority has advanced.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ObservabilityReadModel.test.ts`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decisions:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| top-level `provider_intake` | stale summary/cache data can outrank a fresh raw provider-intake snapshot | `remove fallback` | CO-459 parent lane | raw `provider-intake-state.json` is fresher than the cached summary projection | pre-CO-459 | 2026-05-01 | immediate removal in CO-459 | summary is rebuilt from or validated against fresh raw state before surfacing | focused stale-cache versus fresh-raw regression across status/API/UI |
| `provider-intake-state.json` raw state | retained audit/history and lifecycle authority | `justify retaining fallback` | provider-intake control-host surface | raw intake state preserves selected issue, concurrent-claim truth, and active/running/released states | existing provider-intake contract | 2026-05-01 | durable authority surface | not removed; parent must avoid destructive cleanup | focused raw-state authority tests and non-destructive diff review |
| `CO-455 timeout-only adjacency` | timeout-only recovery/classification is adjacent but separate | `justify retaining fallback` | CO-455 owner | `/ui/data.json` or status read timeout behavior is the only failure class | CO-455 | 2026-05-01 | durable issue boundary | not removed; CO-459 does not implement timeout-only handling | explicit negative/boundary case or no-touch proof |

- Durable retention evidence: `provider-intake-state.json` remains the retained raw authority and audit surface; CO-459 removes stale-cache priority, not raw-state retention.
- Large-refactor check: a large status/read-model refactor is not required for the docs packet. Parent should escalate only if stale-cache invalidation cannot be fixed at the provider-intake summary/runtime boundary without creating another minor seam.

## Open Questions
- Parent must identify the exact cache/snapshot lifetime that lets stale summary/cache data survive after raw `provider-intake-state.json` advances.
- Parent must decide whether top-level `provider_intake` should be rebuilt on every runtime read or carry explicit freshness provenance when a cached summary is reused.
- Parent must verify the current `CO-455 timeout-only adjacency` boundary before implementation so timeout behavior is not widened into CO-459.

## Validation Contract
- Child lane runs only scoped docs checks: JSON parse for `tasks/index.json`, protected-term grep over the touched packet files, and `git diff --check` over the declared docs scope.
- Parent lane runs focused regressions around stale top-level `provider_intake` versus fresh raw provider-intake snapshot authority, likely in `ProviderIntakeState.test.ts`, `ControlRuntime.test.ts`, `ObservabilityReadModel.test.ts`, and nearby API/UI projection tests.
