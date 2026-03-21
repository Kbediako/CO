# PRD - Coordinator Symphony Authoritative Runtime Snapshot and Observability

## Added by Bootstrap 2026-03-21

## Summary
- Problem Statement: `1312` closed the in-worker same-session continuation seam, but CO still could not claim parity for the runtime snapshot contract. Upstream authority in `/Users/kbediako/Code/symphony/SPEC.md:1296-1309,1403-1503` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:1098-1148,1172-1529` expects authoritative running rows, retry rows, aggregate `codex_totals`, and latest `rate_limits`. CO had been hardcoding `session_id`, `turn_count`, retry attempt metadata, `codex_totals`, and `rate_limits` to `null` in the compatibility read-model and API surfaces.
- Desired Outcome: this lane now lands the bounded backend-authoritative runtime snapshot slice after `1312`. On the current branch, `/api/v1/state` and `/api/v1/<issue>` replace those inferred-or-null runtime fields with proof-backed provider-worker/runtime telemetry for running rows, aggregate `codex_totals`, and latest `rate_limits`, while keeping the retry-queue ownership model separate.

## Status Update - 2026-03-22
- Current branch state: `orchestrator/src/cli/providerLinearWorkerRunner.ts` now persists a widened worker proof sidecar that carries enough session/turn/token/rate-limit runtime data for bounded `1313` authority.
- Current branch state: `orchestrator/src/cli/control/selectedRunProjection.ts`, `controlRuntime.ts`, `observabilityReadModel.ts`, `compatibilityIssuePresenter.ts`, and `observabilitySurface.ts` now expose proof-backed running rows plus aggregate `codex_totals` and latest `rate_limits` instead of hardcoded null placeholders.
- Current branch publication posture on `2026-03-22`: `1312`, `1313`, and `1314` are one integrated implemented publication unit. Use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary; older `20260321T124445Z-stacked-closeout` and `20260321T124510Z-stack-closeout` packs are stale for current-head validation.
- The truthful remaining boundary is unchanged: authoritative retry-queue ownership remained a separate slice after `1313` and is tracked by `1314`; optional dashboard/TUI/Telegram richness and tracker write-back stay out of scope for this lane.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue from the current `1312` branch toward full hardened parity, but do it truthfully and docs-first by aligning the next slice to the current Symphony SPEC and Elixir reference instead of assuming `1312` alone closes parity.
- Success criteria / acceptance:
  - `1313` is registered as a real task/spec packet instead of only being referenced in `1312` docs
  - the packet states the current CO gap exactly: runtime snapshot/API fields remain non-authoritative by construction today
  - the packet scopes `1313` to backend/API authority for `/api/v1/state` and `/api/v1/<issue>`, not optional dashboard/TUI/Telegram richness
  - the packet records that orchestrator-managed Linear write-back is not required for parity
  - the packet leaves any stricter post-worker-exit retry-cadence parity question explicit instead of silently folding it into this slice

## Goals
- Replace compatibility/API `null` placeholders for runtime snapshot parity with authoritative provider-worker/runtime data.
- Capture authoritative `session_id`, `turn_count`, token totals, retry metadata, aggregate `codex_totals`, and latest `rate_limits`.
- Keep the slice bounded to backend/API/runtime authority so optional operator-surface richness does not sprawl the diff.

## Non-Goals
- Reopening the `1312` same-session worker seam.
- Bundling optional dashboard/TUI/Telegram richness into this slice.
- Treating orchestrator-managed Linear write-back as a parity requirement.
- Overclaiming closure on the separate post-worker-exit retry-cadence question before implementation evidence settles it.

## Metrics & Guardrails
- Primary Success Metrics:
  - `/api/v1/state` no longer returns hardcoded `codex_totals: null` or `rate_limits: null`
  - `/api/v1/<issue>` and compatibility issue rows no longer fabricate `session_id`, `turn_count`, token totals, or retry attempt metadata as `null` when authoritative runtime data exists
  - runtime/read-model assembly is sourced from authoritative provider-worker/runtime capture rather than presenter-only patching
  - `1312` remains bounded and truthful after `1313` registration
- Guardrails / Error Budgets:
  - do not invent values that CO still does not capture
  - if retry metadata cannot be made authoritative inside this slice, keep the gap explicit instead of guessing
  - keep optional UI/operator-surface richness out unless backend/API work strictly requires a companion update

## User Experience
- Personas:
  - CO operator validating runtime parity progress against Symphony
  - follow-on implementer carrying the observability slice without reopening unrelated UI scope
- User Journeys:
  - the operator can see `1313` as a concrete backend/API parity lane rather than a vague placeholder
  - once implemented, `/api/v1/state` and `/api/v1/<issue>` expose runtime fields that are sourced from real provider-worker telemetry instead of null compatibility placeholders

## Technical Considerations
- Architectural Notes:
  - `provider-linear-worker-proof.json` is no longer only narrow lineage proof; on the current branch it also carries the structured runtime data needed for bounded `1313` authority
  - runtime assembly remains manifest/projection-driven, but the current branch now threads widened worker proof through `controlRuntime`, `selectedRunProjection`, `observabilityReadModel`, `compatibilityIssuePresenter`, and `observabilitySurface`
  - the retry queue surface must remain truthful; strict retry ownership/cadence stayed separate from `1313` and is tracked in `1314`
  - tracker write-back remains outside the orchestrator conformance boundary for this slice
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`

## Open Questions
- Resolved on the current branch: the bounded runtime snapshot slice can be sourced from widened worker proof plus control-runtime assembly without reopening the `1312` seam.
- Remaining open question: live control-host proof for the bounded runtime snapshot payloads is still pending on the current branch.

## Approvals
- Product: Self-approved for the next bounded parity slice after `1312`.
- Engineering: Self-approved on 2026-03-22 against the current upstream SPEC, Elixir runtime snapshot behavior, and the refreshed integrated branch publication posture.
- Design: N/A
