# ACTION_PLAN - Coordinator Symphony Authoritative Runtime Snapshot and Observability

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: register and deliver the bounded backend-authoritative parity slice after `1312`, replacing prior runtime snapshot/API null placeholders with proof-backed provider-worker/runtime telemetry.
- Scope: worker/runtime capture plus `/api/v1/state` and `/api/v1/<issue>` backend/API authority.
- Assumptions:
  - `1312` already covers in-worker same-session continuation
  - the current branch now lands the bounded runtime snapshot slice, while retry ownership/cadence stays separate
  - optional dashboard/TUI/Telegram richness stays out of scope

## Status Update - 2026-03-22
- Completed on the current branch: worker/runtime capture is widened beyond narrow lineage proof, and `/api/v1/state` plus `/api/v1/<issue>` now expose proof-backed running rows, aggregate `codex_totals`, and latest `rate_limits`.
- Completed on the current branch: compatibility/runtime payloads stop hardcoding those runtime fields to `null` when authoritative data exists.
- Current publication posture on `2026-03-22`: `1313` is implemented on this branch as part of the integrated `1312`/`1313`/`1314` publication unit. Use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary, and do not cite older `20260321T124445Z-stacked-closeout` or `20260321T124510Z-stack-closeout` packs as current-head validation.
- In progress: final stacked-branch validation recording plus live control-host proof for the bounded runtime snapshot payloads.
- Still explicitly separate: authoritative retry queue ownership remained the follow-on slice after `1313`, tracked by `1314`, and the broader scheduler/timer ownership model still remains outside this lane.

## Milestones & Sequencing
1. Register the bounded `1313` packet
   - draft PRD, TECH_SPEC, ACTION_PLAN, task checklist, and mirror
   - update `tasks/index.json` and `docs/TASKS.md`
2. Widen worker/runtime capture
   - extend the provider worker runtime snapshot beyond narrow lineage proof
   - capture enough structured runtime data to support authoritative running rows, aggregate totals, and latest rate limits
3. Thread authority through runtime/read-model assembly
   - load the widened runtime snapshot into `selectedRunProjection` and `controlRuntime`
   - stop hardcoding observability read-model fields to `null`
4. Surface authoritative API payloads
   - update compatibility running/retry payloads and `/api/v1/state` aggregation
   - keep selected-only/UI richness separate unless a companion test update is unavoidable
5. Validate and prove
   - run focused worker/runtime/API regressions
   - run the standard full validation lane
   - collect live control-host proof for `/api/v1/state` and `/api/v1/<issue>`

## Dependencies
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

## Validation
- docs-review evidence for the `1313` packet before implementation: `.runs/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/cli/2026-03-21T10-51-39-272Z-84d7b8f1/manifest.json`, `out/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/manual/20260321T110919Z-docs-first/05-docs-review-override.md`
- focused worker/runtime/API regressions proving authoritative runtime fields
- standard implementation lane commands once code lands
- current-head closeout pack for the integrated implemented `1312`/`1313`/`1314` unit: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`; review/elegance reruns plus live control-host proof still remain pending there
- live control-host proof for `/api/v1/state` and `/api/v1/<issue>`

## Risks & Mitigations
- Risk: this turns into a presenter-only patch.
  - Mitigation: require the runtime capture/data-source work first.
- Risk: retry metadata gets guessed instead of sourced.
  - Mitigation: keep unavailable retry fields explicit until they are authoritative.
- Risk: optional operator-surface richness bloats the diff.
  - Mitigation: keep `1313` backend/API-only unless tests prove a hard coupling.

## Approvals
- Reviewer: Self-approved for a bounded backend-observability parity slice after `1312`.
- Date: 2026-03-22
