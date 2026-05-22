# PRD - CO-577 quota hygiene degraded machine-status classification

## Immediate Traceability
- Linear issue: `CO-577` / `f42d51e8-18ab-469a-9155-a272e8eaee70`
- Linear URL: https://linear.app/asabeko/issue/CO-577/co-fix-quota-hygiene-degraded-machine-status-classification
- MCP task id: `linear-f42d51e8-18ab-469a-9155-a272e8eaee70`
- Registry task id: `20260522-linear-f42d51e8-18ab-469a-9155-a272e8eaee70`
- Canonical task spec: `tasks/specs/linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`
- Task checklist: `tasks/tasks-linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`
- `.agent` mirror: `.agent/task/linear-f42d51e8-18ab-469a-9155-a272e8eaee70.md`
- Canonical owner key: `quota-hygiene:co-status-degraded-machine-status-classification:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=quota-hygiene:co-status-degraded-machine-status-classification:v1`
- Source anchor: `ctx:sha256:cc638f5ade0f90ac18fe96d7bdebd0b37cd032abf657289452791ac4547a64ad#chunk:c000001`
- Parent manifest pointer: `.runs/linear-f42d51e8-18ab-469a-9155-a272e8eaee70/cli/2026-05-22T14-01-49-517Z-0fcf6516/manifest.json`

## Summary
- Problem Statement: `codex-orchestrator hygiene quota` currently collapses an available bounded `co-status --format json` machine-status payload into `co_status_unavailable` when `degraded_read.reason=ui_request_timeout` is not one of the stale/unhealthy reasons known to `classifyCoStatusDataset`. The result hides the producer reason/source/freshness and makes partial machine status look like missing status.
- Desired Outcome: quota hygiene preserves available degraded machine-status evidence as a non-healthy partial status. It must keep the overall audit visibly degraded, keep live-token extraction empty for degraded reads, preserve stronger stale endpoint and unhealthy live-host classifications, and distinguish true unavailable status from available degraded machine status.

## User Request Translation
- User intent / needs: fix the quota-hygiene consumer classification for a zero-WIP `co-status` payload with `mode=control_machine_status`, `degraded_read.reason=ui_request_timeout`, `source=local_machine_status`, and `freshness_verdict=healthy`.
- Success criteria / acceptance:
  - add quota hygiene regression coverage for that exact payload shape
  - classify the case as available bounded degraded/partial machine status, not unavailable
  - keep audit verdict degraded until the status read is fully clean
  - keep live-token extraction empty for degraded reads
  - preserve stronger stale endpoint and unhealthy live-host classifications
  - finding text and evidence carry `degraded_read.reason`, `source`, and `freshness_verdict`
  - validation includes focused quota-hygiene tests, spec guard, and normal review gate
- Constraints / non-goals:
  - no producer-side `co-status` rewrite unless tests prove it is required
  - no timeout bump, restart, process kill, or provider-intake manual cleanup
  - no weakening fail-closed handling for true stale endpoints, unhealthy live hosts, auth failures, dead endpoints, active failed runs, or real quota-burning processes
  - no treating degraded machine status as fully healthy or as live worker corroboration

## Intent Checksum
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator hygiene quota`
  - `co-status --format json`
  - `mode=control_machine_status`
  - `degraded_read.reason=ui_request_timeout`
  - `source=local_machine_status`
  - `freshness_verdict=healthy`
  - `co_status_unavailable`
  - `quota_burning_count=0`
  - `unowned_quota_burning_count=0`
  - `Operator dashboard returned degraded data but machine status is not eligible for a degraded read`
  - `classifyCoStatusDataset`
  - status-authority split
  - consumer classification
- Nearby wrong interpretations to reject:
  - hiding real stale endpoints
  - increasing timeouts instead of fixing the consumer contract
  - restarting control-host or workers
  - marking degraded status healthy
  - treating degraded status as live worker proof
  - duplicating CO-572 or CO-574 producer endpoint work

## Not Done If
- `hygiene quota` still reports `co_status_unavailable` when `co-status --format json` returns bounded machine status with `degraded_read.reason=ui_request_timeout`, current source freshness, zero WIP, and available process inventory.
- `ui_request_timeout` degraded machine status is treated as fully healthy or used to infer live worker tokens.
- Stale endpoint, unhealthy live-host, auth failure, dead endpoint, and true unavailable regressions stop failing closed.
- Tests only cover producer-side `co-status` behavior and omit the quota-hygiene consumer path.
- The repeated CO-572/CO-574 style symptom is not traced to this downstream consumer classification contract.

## Goals
- Add a quota-hygiene regression for the zero-WIP `ui_request_timeout` degraded machine-status payload.
- Introduce an explicit available degraded machine-status classification for bounded partial status.
- Preserve `degraded_read.reason/source/freshness_verdict` in quota hygiene summary and finding evidence.
- Keep live-token extraction empty for any degraded read.
- Record the consumer invariant for future downstream status consumers.

## Non-Goals
- No broad dashboard refactor.
- No producer endpoint timeout change.
- No control-host or app-server restart behavior.
- No provider-intake cleanup or queue mutation.
- No automatic remediation.
- No weakening of real stale, unhealthy, auth, dead endpoint, failed-run, unavailable, or quota-burning evidence.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: `remove fallback` for the consumer behavior that flattened unrecognized degraded-read reasons into `unavailable`.
- Owner: `CO-577`.
- Trigger: quota hygiene consumes a bounded degraded `co-status` machine-status payload.
- Introduced date: observed after CO-551 shared-root fast-forward on 2026-05-22.
- Review date: 2026-05-22.
- Maximum lifetime: this issue.
- Removal condition: quota hygiene emits available degraded machine-status evidence with preserved reason/source/freshness instead of `co_status_unavailable`.
- Validation: focused quota-hygiene regression plus full validation gate.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Quota hygiene co-status classification | Unknown `degraded_read.reason` values collapse to `unavailable`. | `remove fallback` | CO-577 | `degraded_read.reason=ui_request_timeout` from `source=local_machine_status`. | 2026-05-22 | 2026-05-22 | This issue | Unknown bounded degraded reads are preserved as available degraded machine status unless they are explicitly stale/unhealthy/unavailable/auth failures. | Focused quota hygiene regression. |
| Live worker corroboration | Partial degraded status could be misread as live WIP proof. | `remove fallback` | CO-577 | Degraded read includes running/count fields. | Existing quota hygiene live-token path | 2026-05-22 | This issue | `collectCoStatusLiveTokens` returns empty for degraded reads. | Existing and new provider-intake corroboration tests. |

## Consumer Contract Invariant
Every downstream status consumer must preserve `degraded_read.reason`, `degraded_read.source`, and `degraded_read.freshness_verdict` instead of flattening unknown bounded degraded reads into `unavailable`. Stale endpoint, unhealthy host, auth failure, dead endpoint, and true unavailable evidence remain stronger fail-closed classifications.

## Acceptance Criteria
- [x] Add regression coverage in quota hygiene for a zero-WIP `co-status` payload with `degraded_read.reason=ui_request_timeout`, `source=local_machine_status`, and current freshness.
- [x] `hygiene quota` classifies that case as bounded degraded/partial machine status, not unavailable, while keeping the overall verdict visibly degraded until the dashboard/status read is fully clean.
- [x] Live-token extraction remains empty for degraded reads so partial status cannot falsely corroborate active workers.
- [x] Existing stale endpoint and unhealthy live-host degraded-read cases keep their stronger classifications and findings.
- [x] Finding text distinguishes unavailable status from available degraded machine status and points to the producer reason/source.
- [x] Documentation or task notes record the consumer contract invariant.
- [x] Validation includes focused quota-hygiene tests, focused co-status tests if touched, `node scripts/spec-guard.mjs --dry-run`, and the normal review gate for the implementation scope.

## Approvals
- Product: Linear issue CO-577.
- Engineering: parent provider-worker lane.
- Date: 2026-05-22.
