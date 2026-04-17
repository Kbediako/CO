# PRD - CO STATUS: hydrate active child-lane manifests before showing reserved-before-startup progress

## Traceability
- Linear issue: `CO-210` / `34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3`
- Task id: `linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3`
- Canonical spec: `tasks/specs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3.md`
- Docs packet child lane: `.runs/linear-34c13c4f-5839-4c64-b6c3-c2b30b7d7fe3-docs-packet/cli/2026-04-17T01-07-48-639Z-27495b47/manifest.json`
- Source anchor: `ctx:sha256:530ad0bff819be566bc79e33d5f828c1347470cd404c9615dbda890743938120#chunk:c000001`

## Summary
`CO-210` fixes a `CO STATUS` current-progress truth gap for active provider child lanes. A parent worker can reserve a child lane in `provider-linear-worker-child-lanes.json` with the placeholder summary `Child lane reserved before child run startup.`. That placeholder is truthful only until the child run starts. Once a matching child-lane manifest exists, `CO STATUS`, `co-status --format json`, `provider-linear-worker-progress`, and `provider-linear-worker-proof.json` must hydrate the child-lane manifest before presenting reserved-before-startup text as current progress.

This lane is only the docs-first packet and registry mirror. Parent owns implementation, source/test inspection, Linear state, workpad updates, validation, PR lifecycle, and final acceptance.

## User Request Translation
- Preserve the exact issue intent: `CO STATUS` should not keep showing `Child lane reserved before child run startup.` after the child lane has a real child-run manifest.
- Treat the reserved child-lane ledger record as a launch placeholder, not as durable current progress when stronger child-run evidence exists.
- Hydrate only metadata-matching child-lane manifests, using `parent_run_id`, `issue_id`, `issue_identifier`, and `pipeline_id=provider-linear-child-lane` to avoid cross-run or cross-issue evidence.
- Keep historical records in `provider-linear-worker-child-lanes.json` and `provider-linear-worker-proof.json`.
- Do not change stale Linear `updated_at` accept invalidation, child-lane ownership or acceptance semantics, scheduler admission, or historical record retention.

## Intent Checksum
- Protected terms and surfaces:
  - `CO STATUS`
  - `co-status --format json`
  - `provider-linear-worker-progress`
  - `Child lane reserved before child run startup.`
  - `provider-linear-worker-child-lanes.json`
  - `provider-linear-worker-proof.json`
  - child-lane manifest
  - `parent_run_id`
  - `issue_id`
  - `issue_identifier`
  - `pipeline_id=provider-linear-child-lane`
- Nearby wrong interpretations to reject:
  - changing stale Linear `updated_at` accept invalidation
  - weakening child-lane ownership, scope, acceptance, rejection, or invalidation rules
  - redesigning the provider scheduler or child-lane admission policy
  - deleting historical child-lane records from proof or child-lane ledgers
  - only hiding the placeholder string without hydrating real child-run evidence

## Parity / Alignment Matrix

| Surface | Current / Reference Truth | Target Truth |
| --- | --- | --- |
| `provider-linear-worker-child-lanes.json` | Records a reserved child lane before child run startup with summary `Child lane reserved before child run startup.` and future manifest path. | Retains the reservation record for audit, but the placeholder is only eligible as current progress before a matching child manifest has started. |
| Child-lane manifest | Once startup succeeds, the child manifest carries actual child run lineage, status, timing, and summary/progress context. | A metadata-matching child-lane manifest is hydrated before current progress projection chooses the reserved placeholder. |
| `provider-linear-worker-proof.json` | Proof hydration reads child-lane ledgers and can project the reserved summary as active child-lane progress. | Proof hydration/progress projection prefers real active child manifest evidence over reserved-before-startup text. |
| `provider-linear-worker-progress` | The current snapshot can report the placeholder as if no child lane has started. | The snapshot reports the child lane's real active lifecycle or progress when matching manifest evidence exists. |
| `CO STATUS` / `co-status --format json` | Operators can see stale reserved progress even though the active child lane is running or has completed. | Operators see manifest-backed child-lane progress; reserved text appears only while startup evidence is genuinely absent. |
| Metadata matching | Path or run id alone can be too weak for concurrent or historical lanes. | Hydration requires same parent/issue lineage: `parent_run_id`, `issue_id`, `issue_identifier`, and `pipeline_id=provider-linear-child-lane`. |

## Acceptance Criteria
1. A child-lane record with summary `Child lane reserved before child run startup.` no longer renders as current `provider-linear-worker-progress` when its metadata-matching child-lane manifest exists and shows startup or later lifecycle truth.
2. `CO STATUS` and `co-status --format json` show child-lane manifest-backed progress, status, or inspection guidance for active child lanes instead of the reserved-before-startup placeholder.
3. When multiple candidate child signals exist, current-progress projection across `CO STATUS`, `co-status --format json`, and `provider-linear-worker-progress` picks the freshest child by `summary_recorded_at`, including status-only child-manifest progress that derives freshness from `latest(updated_at, heartbeat_at)`.
4. Hydration accepts only child-lane manifests matching the parent worker lineage by `parent_run_id`, `issue_id`, `issue_identifier`, and `pipeline_id=provider-linear-child-lane`.
5. Unmatched, missing, or not-yet-started child-lane manifests do not fabricate progress from unrelated runs; the reservation placeholder remains allowed only for true pre-startup state.
6. `provider-linear-worker-child-lanes.json` and `provider-linear-worker-proof.json` keep historical child-lane records; the fix changes current-progress selection, not audit retention.
7. Existing disposed child-lane behavior from prior projection fixes remains intact: accepted, rejected, or invalidated child lanes do not become current active progress.
8. Focused parent-owned tests cover a reserved child lane with a matching started manifest, unmatched manifests that must not hydrate or outrank fresher child evidence, and the no-manifest pre-startup fallback.

## Non-Goals
- No Linear mutation or workpad mutation from this docs child lane.
- No implementation, test, scheduler, or runtime changes in this child lane.
- No redesign of child-lane launch, admission, acceptance, rejection, or invalidation.
- No stale Linear `updated_at` semantics change.
- No deletion or compaction of historical child-lane records.
- No broad `CO STATUS` dashboard layout redesign.
- No replacement for existing child-lane proof validation or scope ownership rules.

## Not Done If
- `CO STATUS` or `co-status --format json` still shows `Child lane reserved before child run startup.` after a matching child-lane manifest has started.
- The placeholder disappears only because rendering hides that exact string, while no child-run manifest evidence is hydrated.
- Hydration can attach a child manifest from another parent run, issue id, issue identifier, or non-`provider-linear-child-lane` pipeline.
- The fix changes stale Linear `updated_at` accept invalidation or child-lane ownership/acceptance behavior.
- Historical child-lane ledger/proof records are deleted instead of being separated from current progress projection.
- There is no focused regression for manifest-backed replacement of reserved-before-startup progress.

## Guardrails
- Parent lane owns all source changes, validation, Linear state, workpad, PR lifecycle, and final decisions.
- Child-lane manifest hydration must be metadata-safe and fail closed on mismatched lineage.
- Preserve the existing audit trail in `provider-linear-worker-child-lanes.json` and `provider-linear-worker-proof.json`.
- Keep the change local to provider-worker progress/proof/status projection; do not broaden into scheduler or lifecycle redesign.

## User Experience
- Operators watching `CO STATUS` during a parent worker's same-issue child lane see real child-run progress after startup.
- The reserved-before-startup message remains available only for the short window where the parent has reserved a child lane but the child manifest is not yet available.
- Reviewers can audit both the preserved reservation record and the hydrated child manifest lineage.
