# PRD - CO STATUS / observability: restore compatibility row fields after post-recovery rehydrate

## Added by Docs Child Lane 2026-04-18

## Traceability
- Linear issue: `CO-227` / `a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- Linear URL: https://linear.app/asabeko/issue/CO-227/co-status-observability-restore-compatibility-row-fields-after-post
- Task id: `linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- Canonical spec: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- Docs packet child lane manifest: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`
- Source anchor: `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`
- Source payload note: the expected shared `source-0` payload is not present in this child checkout; this packet is anchored on the preserved handoff metadata plus the live read-only CO-227 issue body and current repo seam names.

## Summary
- Problem Statement: after control-host recovery / rehydrate, canonical issue identity and live occupancy recover, but compatibility-facing truth remains partially null. Authenticated `/api/v1/state` reports the correct live counts (`running=3`, `retrying=0`) while `running_ids` and `retrying_ids` stay null, and `co-status --format json` reports the live canonical set (`CO-196`, `CO-218`, `CO-210`) while each row still leaves compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` null.
- Desired Outcome: after the same post-recovery rehydrate path, authenticated `/api/v1/state` exposes populated `running_ids` and `retrying_ids`, and `co-status --format json` exposes populated compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` for live or retrying rows, without regressing canonical active-issue recovery or the newer meaningful event rendering.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the docs-first packet for `CO-227` only, preserving the exact post-recovery compatibility-hydration gap from the live issue body before the parent lane edits source or tests. The packet must stay explicit that this is not `CO-211` restart churn, not `CO-223` stale top-level tracked truth, not `CO-146` synthetic fallback row rendering, and not `CO-189` live-worker rehydrate recovery itself.
- Success criteria / acceptance:
  - after control-host restart / rehydrate, authenticated `/api/v1/state` exposes populated `running_ids` and `retrying_ids` that match the live canonical issue set
  - after the same recovery path, `co-status --format json` rows expose populated compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` for live or retrying rows
  - the fix preserves the recovered canonical mapping for active issues
  - the fix does not regress the newer meaningful event rendering
  - the fix remains explicitly distinct from `CO-223` so top-level stale tracked truth and per-row compatibility hydration are not conflated
- Constraints / non-goals:
  - child lane owns only the declared docs packet, checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent lane owns the authoritative issue workspace, implementation, validation, Linear state, workpad refreshes, PR lifecycle, and merge
  - do not widen this child lane into source edits, test edits, or full repo validation

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `After control-host recovery / rehydrate, canonical issue identity and live occupancy recover, but compatibility-facing truth does not fully rehydrate.`
  - `running_ids`
  - `retrying_ids`
  - `co-status --format json`
  - `id`
  - `bucket`
  - `state`
  - `reason`
  - `aliases`
  - `post-recovery compatibility-field hydration`
- Protected terms / exact artifact and surface names:
  - authenticated `/api/v1/state`
  - `running_ids`
  - `retrying_ids`
  - `co-status --format json`
  - compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases`
  - `selectedRunProjection.ts`
  - `compatibilityIssuePresenter.ts`
  - `observabilityReadModel.ts`
  - `controlRuntime.ts`
  - `observabilitySurface.ts`
  - `operatorDashboardPresenter.ts`
- Nearby wrong interpretations to reject:
  - this is the same as `CO-211` restart / refresh-stuck churn
  - this is the same as `CO-223` stale top-level `tracked.linear` fallback truth
  - this is the same as `CO-146` synthetic `linear-*` fallback row rendering
  - this is the same as `CO-189` live-worker rehydrate recovery or count restoration
  - only top-level counts matter, so null compatibility fields are acceptable after recovery
  - the fix can regress meaningful event rendering as long as compatibility ids become non-null

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Authenticated `/api/v1/state` | reports the recovered live counts but leaves `running_ids` and `retrying_ids` null after recovery | compatibility-facing state should expose the recovered canonical issue identities, not only aggregate counts | `running_ids` and `retrying_ids` are populated and match the live canonical issue set after recovery |
| `co-status --format json` live rows | reports live canonical issue rows but leaves compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` null | live or retrying rows should carry a fully hydrated compatibility row contract after rehydrate | each live or retrying row exposes populated compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` |
| Canonical active issue mapping | canonical identity and occupancy already recover before this defect appears | recovered canonical mapping should remain authoritative | compatibility hydration reuses the recovered canonical mapping rather than inventing a second truth source |
| Top-level tracked truth | stale `tracked.linear = CO-1` leak can still exist separately | top-level tracked truth is a separate defect | this lane stays distinct from `CO-223` and does not conflate top-level tracked truth with per-row compatibility hydration |
| Event rendering | newer meaningful event rendering already works and is valuable operator truth | compatibility fixes must preserve meaningful event rendering | compatibility-field hydration lands without regressing the newer event/message rendering |

## Acceptance Criteria
- The docs packet and checklist mirrors exist for the declared `CO-227` files only.
- The packet preserves the exact issue wording around post-recovery compatibility-field hydration for `running_ids`, `retrying_ids`, and compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases`.
- Parent implementation can restore populated compatibility ids and row fields after rehydrate without reopening top-level tracked-truth work.
- Parent implementation scope is clearly bounded to post-recovery compatibility hydration, not broader restart churn, synthetic-row rendering, or live-worker rehydrate recovery.
- The packet keeps the explicit boundary against `CO-211`, `CO-223`, `CO-146`, and `CO-189`.

## Non-Goals
- No re-solve of restart-required / refresh-stuck churn already covered by `CO-211`.
- No re-solve of stale top-level `tracked.linear` fallback truth already covered by `CO-223`.
- No re-solve of older synthetic `linear-*` row rendering already covered by `CO-146`.
- No re-solve of original worker rehydrate or count restoration already covered by `CO-189`.
- No implementation or test edits in this docs child lane.

## Not Done If
- Authenticated `/api/v1/state` still leaves `running_ids` or `retrying_ids` null after recovery.
- `co-status --format json` rows still leave compatibility fields `id`, `bucket`, `state`, `reason`, or `aliases` null after recovery.
- The fix regresses the recovered canonical active-issue mapping.
- The fix regresses the newer meaningful event rendering.
- The packet drifts into `CO-211`, `CO-223`, `CO-146`, or `CO-189` scope instead of preserving the distinct post-recovery compatibility-hydration contract.

## Stakeholders
- Product: CO operators depending on truthful post-recovery `/api/v1/state` and `co-status --format json` output.
- Engineering: control runtime, selected-run projection, compatibility presentation, observability/read-model, and operator presenter maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - `running_ids` and `retrying_ids` are populated after recovery and match the live canonical issue set
  - live or retrying `co-status --format json` rows expose populated `id`, `bucket`, `state`, `reason`, and `aliases`
  - recovered canonical mapping remains correct
  - meaningful event rendering does not regress
- Guardrails / Error Budgets:
  - keep this lane distinct from top-level tracked-truth repair
  - do not reopen synthetic fallback-row rendering work
  - preserve current event/message rendering quality while hydrating compatibility fields

## User Experience
- Personas:
  - operator reading authenticated `/api/v1/state` after control-host recovery
  - operator reading `co-status --format json` during or after rehydrate recovery
- User Journeys:
  - operator sees live counts and the same populated canonical issue ids after rehydrate
  - operator reads live canonical rows and sees hydrated compatibility fields instead of partial null row metadata
  - operator keeps meaningful event rendering while post-recovery compatibility data becomes complete

## Technical Considerations
- Architectural Notes:
  - the current compatibility pipeline already rebuilds canonical rows through `selectedRunProjection.ts`, `controlRuntime.ts`, and `compatibilityIssuePresenter.ts`
  - `buildCompatibilityIssueIndex(...)` internally retains `runningOrder` / `retryOrder`, but the external compatibility snapshot currently exposes `running`, `retrying`, `issues`, and `selected`, which is the likely seam where explicit `running_ids` / `retrying_ids` or equivalent row hydration can be lost after rehydrate
  - `observabilityReadModel.ts` defines the compatibility-facing payload contracts, including `ControlCompatibilityProjectionSnapshot`, `CompatibilityProjectionIssueRecord`, and `ControlIssuePayload`
  - parent should keep the authoritative recovered mapping from the existing runtime/projection path rather than inventing a second source for ids or aliases
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Open Questions
- Which single payload contract should own `running_ids` and `retrying_ids` so `/api/v1/state` and `co-status --format json` stay aligned after rehydrate?
- Are the null row fields being dropped in the compatibility snapshot builder, in the runtime handoff to the state surface, or only in the final presenter serialization?
- Is `bucket` expected to come from the compatibility running/retrying classification itself or from later presenter-side shaping?

## Validation Contract
- Parent lane runs focused regressions only, likely in `SelectedRunProjection.test.ts`, `CompatibilityIssuePresenter.test.ts`, and `ControlRuntime.test.ts`, plus any nearby state-surface serialization coverage needed to prove `/api/v1/state` and `co-status --format json` hydrate the same ids and row fields after rehydrate.
- Child lane runs only scoped docs checks: JSON parse for `tasks/index.json`, protected-term grep over the touched packet files, and `git diff --check` over the declared docs scope.
