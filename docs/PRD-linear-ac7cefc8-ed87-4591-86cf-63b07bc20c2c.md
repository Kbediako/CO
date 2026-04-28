# PRD - CO-330 stale-owner/provider-refresh recurrence after PR #624 and PR #658

## Traceability
- Linear issue: `CO-330` / `ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Linear URL: https://linear.app/asabeko/issue/CO-330
- Task id: `linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Canonical spec: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Parent manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-recurrence-docs/cli/2026-04-25T12-07-04-429Z-22659fae/manifest.json`
- Current run manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-28T04-50-04-951Z-a8df80f3/manifest.json`
- Source anchor: `ctx:sha256:d14a6cd66c90db64bf91248f6f68d329bf0b540a68b4243aec21a6770b4dce3b#chunk:c000001`
- Current recurrence anchor: `ctx:sha256:71b3705dcb95cb3d85f4202978c8c661ce6ca70898a38c2971762666659af3f2#chunk:c000001`
- Source payload: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-recurrence-docs/cli/2026-04-25T12-07-04-429Z-22659fae/memory/source-0/source.txt`
- Source payload note: source 0 is the parent-provided recurrence anchor for the 2026-04-24/2026-04-25 stale-owner/provider-refresh failure shape. A bounded child lane refreshed the packet; this parent lane owns Linear state, workpad truth, PR lifecycle, source/test implementation, and final validation.

## Summary
- Problem Statement: PR #624 added a single provider refresh retry after `stale_reclaimed`, but the 2026-04-24/2026-04-25 recurrence shows that was insufficient. Provider workers for `CO-351`, `CO-352`, and `CO-355` still observed `stale_control_host_owner` together with `fetch failed` / `refresh request timeout`, and live `co-status freshness` / `control-host` freshness checks still timed out or reported stale state.
- Current Recurrence: the 2026-04-27/2026-04-28 run evidence shows the stale-owner family survived PR #658 as an explicit recovery failure. `CO-403` logged `refresh request timeout` and repeated `fetch failed` with `stale_control_host_owner`; `CO-399` then showed `codex-orchestrator control-host recover` returning `500 {"error":"provider_refresh_lifecycle_stuck"}` while recovery should have preserved provider progress.
- Desired Outcome: CO-330 should now specify recurrence recovery, not just first-pass reclaim or supervision quarantine. After stale-owner reclaim, explicit provider recovery (`control-host recover` / `/api/v1/provider-worker/recover`) must clear a stale refresh lifecycle boundary enough to resume/recover the tracked provider issue, preserve progress, keep owner diagnostics, and either prove fresh `control-host` / `co-status freshness` or leave auditable failure artifacts without losing or falsely terminalizing provider refresh queue work.

## User Request Translation
- User intent / needs: complete the reopened stale-owner/provider-refresh recurrence after PR #624. Preserve exact incident terms, add the recurrence evidence from `CO-351` / `CO-352` / `CO-355`, and make the implementation target stronger than a single provider refresh retry by addressing repeated control-host supervision restarts during active refresh.
- Success criteria / acceptance:
  - [ ] `stale_control_host_owner` is a distinct diagnosis from duplicate active owner, provider cooldown, API budget exhaustion, and generic `fetch failed`
  - [ ] `stale_reclaimed` is not treated as sufficient success unless follow-up refresh and `co-status freshness` prove the owner is no longer stale
  - [ ] stale owner evidence is written to `control-host-stale-owner.json` with `owner pid/host/task/run` and `attempted pid/host` metadata sufficient for audit
  - [ ] owner reclaim happens only after metadata-first liveness checks prove the owner is stale
  - [ ] `provider-linear-worker could not request control-host refresh` failures caused by a stale owner become retryable/resumable queue behavior after reclaim, refresh, and freshness verification
  - [ ] unrecovered `fetch failed` / `refresh request timeout` recurrence after reclaim writes `provider-control-host-refresh-failure.json` with failure kind, owner status, retry attempts, and the relevant ownership diagnostic payload
  - [ ] repeated `probe_timeout` supervision failures for the same active provider-worker series are quarantined while provider refresh is active before `restart_required`, including retries that retain a historical `last_error`
  - [ ] explicit recovery through `control-host recover` / `/api/v1/provider-worker/recover` does not fail closed with `provider_refresh_lifecycle_stuck` when a supported provider issue can be recovered after resetting the stale refresh lifecycle
  - [ ] provider refresh queue state is not discarded, duplicated, or falsely marked terminal during stale-owner recovery
  - [ ] parent validation covers the observed recurrence shape from `CO-351`, `CO-352`, `CO-355`, `CO-403`, and `CO-399`
  - [ ] prior CO-152, CO-119, and PR #624 behavior remains intact outside this recovery seam
- Constraints / non-goals:
  - do not treat this as already owned by `CO-41`
  - do not collapse the lane into only `CO-317` admission/backfill behavior
  - do not solve it as a generic host restart workaround
  - do not classify it as a stdin bootstrap regression
  - do not mutate Linear state, workpad, PR lifecycle, source, tests, `tasks/index.json`, or docs-freshness registry from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `stale_control_host_owner`
  - `control-host`
  - `provider-linear-worker could not request control-host refresh`
  - `refresh request timeout`
  - `fetch failed`
  - `control-host-stale-owner.json`
  - `provider-control-host-refresh-failure.json`
  - `active_worker_probe_timeout_quarantine`
  - `provider_refresh_lifecycle_stuck`
  - `control-host recover`
  - `/api/v1/provider-worker/recover`
  - `stale_reclaimed`
  - `owner pid/host/task/run`
  - `attempted pid/host`
  - `co-status freshness`
  - `owner reclaim`
  - `provider refresh`
  - `retry/resumable queue behavior`
  - `PR #624`
  - `CO-351`
  - `CO-352`
  - `CO-355`
  - `CO-403`
  - `CO-399`
- Related context to cite narrowly:
  - `CO-152` stale-owner ownership is prior related ownership context, not a replacement for CO-330
  - `CO-119` refresh-timeout recovery is prior related refresh-timeout context, not a complete stale-owner recovery design
  - PR #624 is historical baseline behavior that proved insufficient for the reopened recurrence
- Nearby wrong interpretations to reject:
  - "this is already owned by CO-41"
  - "this is only CO-317 admission/backfill"
  - "restart the host and call it fixed"
  - "this is a stdin bootstrap regression"
  - "delete provider refresh queue state during reclaim"

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Owner metadata | PR #624 can report `stale_reclaimed`, but recurrence evidence still shows `stale_control_host_owner` during provider refresh. | Active owners fail closed; stale owners may be reclaimed only after liveness proof. | `control-host-stale-owner.json` includes `owner pid/host/task/run`, `attempted pid/host`, stale reason, reclaim result, and freshness follow-up. | Reopening the entire CO-152 duplicate-host design or using broad process killing. |
| Provider refresh request | `CO-351`, `CO-352`, and `CO-355` still saw `fetch failed` / `refresh request timeout` after stale-owner handling. | Busy-but-healthy queued/coalesced refresh work should remain recoverable; real failures should be classified. | Stale-owner refresh failures remain retryable/resumable until freshness succeeds or `provider-control-host-refresh-failure.json` records the unrecovered recurrence. | Generic timeout increases, review/merge workflow redesign, or stdin bootstrap fixes. |
| Explicit provider recovery | `CO-403` retained stale-owner fetch/timeout evidence and `CO-399` `control-host recover` failed with `provider_refresh_lifecycle_stuck`. | Operator-initiated recovery should be the safe path to preserve provider-worker progress after a stale lifecycle boundary. | `control-host recover` / `/api/v1/provider-worker/recover` resets the stale refresh lifecycle for the recovery attempt, keeps diagnostics, and returns a recovery result instead of a stuck-lifecycle 500 for a recoverable issue. | Ignoring stale lifecycle truth, deleting provider-intake claims, or requiring manual reruns as the recovery design. |
| Freshness visibility | Live `co-status freshness` / `control-host` freshness still timed out or reported stale after the single retry, and supervision kept restarting on probe timeouts. | Recovery is only truthful when status/freshness surfaces agree that the owner is current. | Acceptance requires a successful freshness check or an explicit failed-freshness artifact path, while repeated same-worker probe timeouts during active refresh are quarantined after the first fail-closed restart. | Treating `stale_reclaimed` alone as proof of recovery. |
| Queue behavior | A stale owner can still make provider refresh look terminal or unrecoverable to a provider worker. | Provider refresh queue state should preserve pending work until a truthful terminal state exists. | Queue entries survive reclaim/freshness retry and resume without duplicate launch, dropped work, or request burn. | CO-317-only admission/backfill behavior or broad provider queue redesign. |

## Not Done If
- A stale owner still appears only as `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, or `fetch failed`.
- No `control-host-stale-owner.json` artifact exists for stale-owner diagnosis.
- `control-host-stale-owner.json` omits `owner pid/host/task/run` or `attempted pid/host`.
- `stale_reclaimed` is recorded but `co-status freshness` / `control-host` freshness still times out or reports stale state without a failure artifact.
- Persistent refresh failure after reclaim does not write `provider-control-host-refresh-failure.json`.
- `control-host recover` returns `provider_refresh_lifecycle_stuck` for a recoverable provider issue after stale-owner reclaim.
- Owner reclaim can run against an active owner or without liveness evidence.
- Provider refresh queue state is dropped, duplicated, or marked terminal during reclaim.
- Focused validation does not cover the `CO-351` / `CO-352` / `CO-355` recurrence shape and the `CO-403` / `CO-399` explicit recovery failure.
- The implementation is described as CO-41, CO-317-only, a host restart workaround, or stdin bootstrap regression handling.

## Goals
- [ ] Refresh the CO-330 docs-first packet for the reopened post-PR #624 recurrence.
- [ ] Preserve protected incident terms and wrong-interpretation guardrails.
- [ ] Establish parent-owned requirements for stale-owner artifact writing, `provider-control-host-refresh-failure.json`, safe owner reclaim, refresh retry/resume, and freshness verification.
- [ ] Prevent repeated same-worker `probe_timeout` restarts from rotating the control-host owner while provider refresh is still active before `restart_required`, even if the active retry still exposes the previous `last_error`.
- [ ] Preserve provider worker progress when explicit recovery is requested after stale-owner reclaim and the stale refresh lifecycle would otherwise block the recovery path.
- [ ] Keep `provider_refresh_lifecycle_stuck` visible as a diagnostic for normal refresh/rehydrate paths while letting operator recovery reset the stale boundary for that recovery attempt.
- [ ] Keep CO-152, CO-119, and PR #624 as adjacent context only.

## Non-Goals
- No source or test edits in this docs child lane.
- No Linear mutation helpers, workpad changes, or PR lifecycle actions.
- No full validation suites from this child lane.
- No edits to `tasks/index.json` or docs-freshness registry from this child lane.
- No broad control-host restart, provider admission/backfill, or stdin bootstrap redesign.
- No weakening of existing owner safety or refresh-timeout guardrails.

## Stakeholders
- Product: CO operators diagnosing provider refresh stalls under local control-host ownership drift.
- Engineering: control-host ownership, provider-linear-worker, provider refresh queue, and recovery-path maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - [ ] packet and mirrors are refreshed under the exact CO-330 task id
  - [ ] protected terms and rejected interpretations are present in PRD/spec/action/checklists
  - [ ] child-lane patch touches only declared docs-phase files
  - [ ] recurrence acceptance criteria distinguish `stale_reclaimed` from verified freshness
- Guardrails / Error Budgets:
  - zero source/test edits in this child lane
  - zero Linear mutations
  - zero `tasks/index.json` or docs-freshness registry edits in this child lane
  - no broad process killing or generic restart language as the durable fix
  - no provider refresh queue state deletion during owner reclaim

## Technical Considerations
- Architectural Notes:
  - implementation should likely sit near existing control-host owner metadata and provider refresh request/queue handling, but this lane does not inspect or edit those source files.
  - stale-owner recovery should be additive to CO-152 owner safety, CO-119 refresh-timeout semantics, and PR #624 retry behavior.
  - diagnostics should be local, auditable, and machine-readable through `control-host-stale-owner.json` and `provider-control-host-refresh-failure.json`.
  - one surviving recurrence was in the supervision layer: first timeout restart remains fail-closed, while subsequent timeouts for the same active provider-worker series during active refresh should quarantine restart churn.
  - the current surviving recurrence is in the explicit provider recovery path: `recoverIssue` can still short-circuit on `provider_refresh_lifecycle_stuck` before it can preserve/resume/recover a provider issue.
  - `co-status freshness` should be treated as a required recovery signal, not an optional operator check.
- Dependencies / Integrations:
  - `control-host` owner metadata and liveness checks
  - provider refresh request path used by `provider-linear-worker`
  - provider refresh queue persistence/resume behavior
  - `co-status freshness` and control-host freshness/status surfaces
  - parent-owned docs-review, implementation, focused tests, and PR lifecycle

## Validation Expectations
- Child lane:
  - [ ] update only the six declared packet files
  - [ ] run scoped text/status checks only
  - [ ] do not run full repo validation suites
- Parent lane:
  - [ ] docs-review before implementation
  - [ ] focused tests for repeated probe-timeout churn while provider refresh is active before `restart_required`
  - [ ] regression evidence that the recurrence shape from `CO-351`, `CO-352`, and `CO-355` is handled or explicitly classified
  - [ ] focused tests for `control-host recover` / `/api/v1/provider-worker/recover` when prior provider polling is stuck with `provider_refresh_lifecycle_stuck`

## Decision / Resolved
- PR #624's single retry after `stale_reclaimed` is retained as historical baseline behavior, but it is no longer sufficient acceptance for CO-330.
- Current target acceptance requires freshness proof after reclaim/refresh, or explicit unrecovered failure evidence in `provider-control-host-refresh-failure.json` while preserving provider refresh queue state.
- The 2026-04-25 parent fix targets repeated supervision `probe_timeout` restart churn while provider refresh is actively running before `restart_required`, because that churn can recreate stale-owner fetch/timeout failures before the worker can recover or classify the failure.
- The 2026-04-28 parent fix targets explicit provider recovery after stale refresh lifecycle evidence, because `control-host recover` must be able to restart recovery without requiring manual rerun/recovery outside the provider workflow.

## Approvals
- Product: parent CO-330 lane, pending
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
