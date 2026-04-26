# PRD - Control host: prevent repeated refresh-stuck restart churn while active provider workers remain healthy

## Added by Docs Child Lane 2026-04-17
## Refreshed by Docs Child Lane 2026-04-18
## Refreshed by Parent Rework Lane 2026-04-21

## Traceability
- Linear issue: `CO-211` / `59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- Linear URL: https://linear.app/asabeko/issue/CO-211/control-host-prevent-repeated-refresh-stuck-restart-churn-while-active
- Task id: `linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- Source anchor: `ctx:sha256:d4239a4784c1cf71c95ab480b4a3821dc2c83dc3648d3b8d4a8c5387ccdfb3f8#chunk:c000001`
- Shared source-0 metadata anchor: `ctx:sha256:737c3cf3d517b1a44673a4ef90593a10f7303f6e022a667e75cceca113e8acb8#chunk:c000001`
- Apr 18 recurrence source anchor: `ctx:sha256:6a9427aa000f73b2f7d86bab415ae29c6ebbeb9172e159c03bc6d29ae012ff52#chunk:c000001`
- Apr 21 Rework source anchor: `ctx:sha256:159ce815aa248f1705d76a533af179440608299883a742a504b31e83b029a294#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`
- Apr 18 docs refresh child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/manifest.json`
- Apr 21 Rework docs child lane manifest: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json` (zero-byte advisory; parent owns this refresh)
- Merged PR #506 commit: `e98d459f4dfdb47a22d981fedbf5ba11053d3a95` (`fix(control-host): quarantine repeated refresh-stuck restart churn`)
- Source payload note: the shared source-0 payload is run metadata and prompt-pack provenance only; the current issue body was read through the packaged read-only `linear issue-context --issue-id 59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c --format json` helper.
- Apr 18 source payload note: the recurrence refresh source-0 payload is also metadata/provenance only; the prompt-carried recurrence framing is after merged PR #506, and parent owns the source fix for quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention.
- Apr 21 Rework note: Linear reopened `CO-211` after live recurrence showed `status=restart_required`, `last_health_status=probe_timeout`, `restart_count=1374`, stale owner reclamation, and active `CO-225`, `CO-276`, and `CO-289` workers still heartbeating.

## Summary
- Problem Statement: Apr 17 and Apr 18 control-host churn showed repeated `provider_refresh_lifecycle_stuck` / `restart_required` recovery while active provider workers stayed healthy and kept progressing. PR #506 and PR #544 landed the initial quarantine and diagnostic-retention fixes, but Apr 21 Rework evidence shows the same operator-visible churn through `probe_timeout` supervision restarts: the supervisor reached `restart_required` with `last_health_status=probe_timeout` while active provider workers were still heartbeating. The problem remains distinct from `CO-210`, which is scoped to CO STATUS child-lane manifest hydration semantics.
- Desired Outcome: isolate and fix or quarantine the remaining re-entry condition that causes repeated restart churn, attach machine-checkable restart-series evidence to both `restart_required` and `probe_timeout` restart records, preserve `owner rotations`, `refresh phases`, and `surviving provider workers`, preserve request-budget/no-request-burn behavior, keep the first genuine stuck/timeout sample fail-closed, and prove post-recovery status through `co-status --format json` with `polling.stuck=false` and `polling.restart_required=false`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete the Rework attempt for `CO-211` after the Apr 21 live recurrence, preserving the exact churn/observability contract while extending the fix beyond repeated `provider_refresh_lifecycle_stuck` payloads to the `probe_timeout` restart path that still churns under healthy active workers.
- Success criteria / acceptance:
  - reproduce or simulate the Apr 17 churn shape where active `CO-207` / `CO-210`-like provider workers stay alive while control-host polling repeatedly enters `provider_refresh_lifecycle_stuck` / `restart_required`
  - persist machine-checkable restart/churn evidence covering restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`
  - diagnose which phase, request, or claim class exceeded `stalled_after_ms=45000`, including operation age, queued/checking state, and current provider keys
  - keep genuine stuck refresh truth, worker safety, and no-request-burn behavior from `CO-163`, `CO-179`, `CO-119`, and `CO-41`
  - ensure recurrence fixes keep quarantined samples and probe-timeout samples from clearing fail-closed unhealthy streaks or dropping diagnostic retention
  - verify `co-status --format json` succeeds after recovery with `polling.stuck=false`, `polling.restart_required=false`, and live running provider workers
- Constraints / non-goals:
  - parent owns authoritative source inspection, implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge
  - Apr 21 zero-byte docs child lane is advisory evidence only; it does not replace this parent docs refresh
  - parent owns the source fix for probe-timeout restart records preserving diagnostic retention and active-worker safety
  - keep `CO-210` child-lane manifest hydration semantics out of scope

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `stalled_after_ms=45000`
  - `owner rotations`
  - `refresh phases`
  - `surviving provider workers`
  - `co-status --format json`
  - `polling.stuck=false`
  - `polling.restart_required=false`
  - `CO-207`
  - `CO-210`
  - `CO-194`
  - `CO-163`
  - `CO-179`
  - `CO-119`
  - `CO-41`
- Protected terms / exact artifact and surface names:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `stalled_after_ms=45000`
  - `owner rotations`
  - `refresh phases`
  - `surviving provider workers`
  - `co-status --format json`
  - `polling.stuck=false`
  - `polling.restart_required=false`
  - `provider-linear-worker`
  - `CO-207`
  - `CO-210`
  - `CO-194`
  - `CO-163`
  - `CO-179`
  - `CO-119`
  - `CO-41`
- Nearby wrong interpretations to reject:
  - this is only an attach or endpoint-rotation issue from `CO-179`
  - this is only a CO STATUS projection or manifest hydration issue from `CO-210`
  - the fix can suppress `provider_refresh_lifecycle_stuck` without exposing or resolving the underlying lifecycle stall
  - killing or restarting active provider workers is an acceptable recovery path
  - the lane can reopen direct issue-by-id burn after `restart_required=true`

## Parity / Alignment Matrix
| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| Restart churn | repeated `provider_refresh_lifecycle_stuck` / `restart_required` windows can happen while active provider workers remain healthy | healthy active workers do not cause repeated supervisor restarts within normal polling cadence |
| Evidence | local artifacts show recovery, but restart series, `owner rotations`, `refresh phases`, and `surviving provider workers` are not durable enough for machine-checkable reconstruction | a single machine-checkable artifact records the full restart/churn sequence and surrounding provider state |
| Diagnostics | stuck detection retains the 45s watchdog, but phase/request/claim detail is insufficient around `stalled_after_ms=45000` | diagnostics identify the blocked phase, request or claim class, operation age, queued/checking state, and current provider keys |
| Post-PR #506 recurrence | the initial merged quarantine can stop repeated restart churn, but Apr 18 recurrence evidence requires diagnostic-retentive quarantined samples | quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention while avoiding repeated active-worker restarts |
| Apr 21 Rework recurrence | live supervision can still reach `restart_required` with `last_health_status=probe_timeout` and no diagnostic snapshot while active workers continue heartbeating | repeated timeout churn for the same active worker series is diagnosed from local persisted provider-intake state and quarantined only after the first fail-closed restart record preserves diagnostic context |
| Worker safety | recovery succeeded without obvious worker death, but repeated churn risks hidden worker interference | supervised recovery preserves active `provider-linear-worker` issue processes for `CO-207` / `CO-210`-like runs |
| Request-budget safety | prior lanes established no-request-burn behavior after `restart_required=true`, but churn ownership is still split across adjacent issues | churn fix preserves `CO-163` / `CO-179` no-request-burn safeguards and does not add new direct issue-by-id burn in the same stuck pass |
| Status verification | read-only status recovered after restart and reported `polling.stuck=false` and `polling.restart_required=false` | `co-status --format json` remains the post-recovery proof surface and shows live running provider workers |

## Goals
- Capture the current churn problem as a distinct control-host/provider lifecycle lane, not a `CO-210` manifest hydration extension.
- Persist machine-checkable restart-series evidence for repeated refresh-stuck restart churn.
- Add enough diagnostics to tell which refresh phase or claim/request class exceeded `stalled_after_ms=45000`.
- Fix or quarantine the re-entry condition without killing active provider workers or reopening request burn.
- Keep quarantine behavior auditable: quarantined samples must preserve fail-closed unhealthy streaks and diagnostic retention.
- Keep probe-timeout behavior auditable: timeout restart records should retain local provider-intake diagnostics when the HTTP `co-status` probe itself cannot return JSON.
- Preserve a no-regression path for `CO-194` stale terminal claims while covering the repeated-churn class.

## Non-Goals
- Changing `CO-210` child-lane manifest hydration semantics.
- Shipping an attach-only reconnect fix from `CO-179` as the answer to this lane.
- Hiding `provider_refresh_lifecycle_stuck` or `restart_required` instead of exposing and resolving the underlying lifecycle stall.
- Killing, restarting, or otherwise disrupting healthy active `provider-linear-worker` issue processes as part of recovery.
- Reopening direct issue-by-id burn after `restart_required=true`.
- Editing the parent-owned recurrence source fix in this docs child lane.
- Broad scheduler, status, or provider workflow redesign outside the repeated-churn seam.
- Implementation or test edits in this docs child lane.

## Not Done If
- Supervisor still reaches `restart_required` every few minutes under active healthy workers.
- The fix only makes `co-status attach` reconnect after endpoint rotation.
- The fix suppresses `provider_refresh_lifecycle_stuck` without exposing or resolving the underlying lifecycle stall.
- Quarantined samples clear fail-closed unhealthy streaks or drop diagnostic retention.
- Active provider workers are killed or restarted as part of recovery.
- `CO-210` child-lane manifest hydration semantics are changed.

## Stakeholders
- Product: CO operators who need repeated restart churn classified separately from healthy active worker progress.
- Engineering: control-host, provider polling, supervision, and status maintainers covering `CO-194`, `CO-163`, `CO-179`, `CO-119`, and `CO-41`.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - restart-series evidence is machine-checkable and reconstructs `owner rotations`, `refresh phases`, and `surviving provider workers`
  - diagnostics identify the exact `stalled_after_ms=45000` phase/request/claim context
  - healthy active workers no longer trigger repeated restart churn
  - quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention
  - `co-status --format json` recovers with `polling.stuck=false`, `polling.restart_required=false`, and live workers visible
- Guardrails / Error Budgets:
  - preserve fail-closed truth for genuine stuck refreshes
  - preserve diagnostic retention across quarantined samples
  - preserve request-budget/no-request-burn behavior after `restart_required=true`
  - preserve active provider workers during supervised recovery
  - keep `CO-210` manifest hydration semantics out of scope

## Technical Considerations
- Architectural Notes:
  - likely source seams are the same parent-inspection surfaces named in the workpad: `providerIssueHandoff`, polling health, public lifecycle, runtime, and supervision
  - PR #506 already landed the first repeated-churn quarantine; the Apr 18 recurrence source fix remains parent-owned and must preserve fail-closed unhealthy streaks and diagnostic retention
  - observability must be artifact-backed rather than only terminal or operator memory
  - post-recovery proof remains `co-status --format json`
- Dependencies / Integrations:
  - `providerIssueHandoff`
  - polling health / `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `co-status --format json`
  - provider-worker preservation from `CO-163`, `CO-179`, `CO-119`, and `CO-41`
  - no-regression stale terminal claim handling from `CO-194`

## Open Questions
- Which seam should own the durable restart-series artifact so polling health, supervision, and status read the same truth?
- Should diagnostics attach the request/claim class directly at the stuck boundary, or summarize it after recovery in the machine-checkable artifact?
- What is the smallest safe fix if healthy active workers and repeated restart churn only intersect through one retained refresh-state re-entry path?
