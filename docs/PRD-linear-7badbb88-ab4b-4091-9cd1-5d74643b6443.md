# PRD - CO-474 Ready Accepted/No-Run Revalidation Recovery

## Traceability
Linear `CO-474` / `7badbb88-ab4b-4091-9cd1-5d74643b6443`; task id `linear-7badbb88-ab4b-4091-9cd1-5d74643b6443`; child docs manifest `.runs/linear-7badbb88-ab4b-4091-9cd1-5d74643b6443-docs-packet/cli/2026-05-01T20-33-30-098Z-88f678f6/manifest.json`.

## Contract
A `Ready issue` can remain in provider intake as `accepted/no-run` with `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, no worker, and no actionable retry error. Success requires a CO-470 artifact or fixture reproduction, `control-host recover` / relaunch / nudge starting `provider-linear-worker` with run manifest and launch provenance or returning deterministic actionable failure quickly, no indefinite admission capacity use by null run/manifest/launch claims, CO-472 released-pending-reopen coverage, and CO-470 admission without parent-side manual `provider-intake-state.json` edits.

## Current / Reference / Target Matrix

| Condition | Current | Reference | Target |
| --- | --- | --- | --- |
| `Ready issue` with `provider_issue_rehydration_pending_revalidation` | CO-470 can sit accepted/no-run with `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, no `launch_token`, and no `retry_error`. | CO-472 protects adjacent released-pending-reopen recovery without manual parent-side state edits. | Explicit `control-host recover` / relaunch / nudge starts `provider-linear-worker` with provenance or returns deterministic actionable failure. |
| `request timeout 120000ms` reachability | Recover can hang until caller timeout while no worker or run manifest appears. | Existing recover paths should return once launch, requeue, or fail-fast evidence exists. | Recover completes inside the bounded recovery budget and records launch, retry, or failure evidence. |
| CO-470 admission path | False-ready accepted/no-run claim can occupy active admission capacity indefinitely. | Admission caps count real live/queued workers and actionable retry states. | Null run/manifest/launch evidence does not consume active capacity indefinitely. |
| CO-472 adjacency | Released-pending-reopen handling is nearby but not sufficient for pending-revalidation accepted/no-run. | CO-472 behavior remains the baseline for released-pending-reopen protection. | CO-474 adds pending-revalidation coverage without rewriting CO-472. |

## Intent Checksum
Protected terms: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`, `ProviderIssueHandoff`, `provider-linear-worker`, `launch_token`, `retry_error`. Reject CO-470 fixture-env cleanup, CO-472 rewrite, WIP/admission cap relaxation, parent-side `provider-intake-state.json` edits, direct worker launch, or timeout masking.

## Not Done If
`request timeout 120000ms` remains reachable for this shape, a null run/manifest/launch claim can still occupy active capacity indefinitely, or the fix relies on direct worker starts, CO-470 fixture cleanup, CO-472 rewrites, cap relaxation, or manual state surgery.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker recover | Accepted/no-run pending-revalidation recovery treated as indefinite inflight truth | remove fallback | CO-474 | Ready issue has null run/manifest/launch and no retry error | observed 2026-05-01 | N/A after removal | N/A after removal | Explicit recover launches/retries or fails fast deterministically without occupying capacity | Focused lifecycle and handoff regressions |
