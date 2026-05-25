# PRD - CO-583 replace control-host machine-status timeout patch with snapshot status plane

## Added by Docs Packet 2026-05-25

## Summary
- Problem Statement: The recurring control-host machine-status same-endpoint timeout reappeared after terminal CO-574 and CO-572 were marked Done. Live 2026-05-25 evidence showed `/ui/machine-status.json` could still couple the serving request path to source-root freshness, stale owner freshness, provider refresh, and synchronous Git/process work (`node::SyncProcessRunner`, `uv_spawn`, `posix_spawn`) while `provider_refresh_lifecycle_stuck` and `dispatch_source_issue_by_id` churn kept the control-host busy. This is a split status-plane authority bug, not stale endpoint discovery and not a timeout-tuning patch.
- Desired Outcome: Replace the patch-style timeout behavior with a snapshot-only status plane: `/ui/machine-status.json` serves only an immutable committed machine-status snapshot, expensive freshness/owner/provider collection runs outside the serving event loop, `/healthz` is control-token-authenticated cheap liveness, `/readyz` is degraded readiness, and `co-status`, `live_host`, supervision, and UI status surfaces expose one monotonic current source-root freshness and owner generation.

## User Request Translation (Context Anchor)
- User intent / needs: Treat CO-583 as the active replacement for terminal CO-574 under canonical owner key `control-host:machine-status-active-worker-timeout-quarantine:v1`, and implement the isolated snapshot status plane described by the issue rather than raising timeouts or adding another `Promise.race`.
- Success criteria / acceptance: The packet defines Non-Goals, Not Done If, acceptance criteria, and a current/reference/target parity matrix across `/ui/machine-status.json`, `/healthz`, `/readyz`, `co-status`, `live_host`, supervision, source-root freshness, stale owner freshness, and owner facts.
- Constraints / non-goals: Do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`; do not delete provider-intake audit history; do not mark terminal CO-574 as the live owner; do not solve this with timeout tuning, endpoint rediscovery, fallback status text, or a CO-557 scope expansion.
- Source anchor: `ctx:sha256:687a20fdf718f72e2f87044a8a517a50912c6a1325dac159ee8adfb6b6be454b#chunk:c000001`.

## Intent Checksum
- Exact protected terms / artifact and surface names: control-host machine-status same-endpoint timeout, `/ui/machine-status.json`, snapshot-only status plane, source-root freshness, stale owner freshness, `provider_refresh_lifecycle_stuck`, `dispatch_source_issue_by_id`, `node::SyncProcessRunner`, `uv_spawn`, `posix_spawn`, `/healthz`, `/readyz`, CO-574, CO-572, CO-557, CO-579, CO-581, CO-569, `control-host:machine-status-active-worker-timeout-quarantine:v1`, `codex-orchestrator:canonical-owner-key=control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Nearby wrong interpretations to reject: This is not a stale endpoint discovery problem; not solved by raising a timeout; not solved by adding another fallback or more `Promise.race`; not a CO-557 docs-review task-key-only change; not permission to weaken docs freshness or spec gates; not a broad provider-worker rewrite; not a manual provider-intake cleanup.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| `/ui/machine-status.json` | Still reaches live status construction and can block on freshness, provider refresh, owner resolution, Git/process, or sync filesystem work. | Machine status request handling must read only an already committed immutable snapshot. | Snapshot-only read path with stale-on-failure collector semantics and no request-path source-root freshness, owner resolution, provider refresh, `spawnSync`, `execSync`, `execFileSync`, or sync Git/process/filesystem work. | Rebuilding the whole UI data model or hiding diagnostics. |
| `/healthz` | Supervision can use heavyweight machine-status diagnostics as liveness and restart on same-endpoint timeouts. | Liveness is cheap authenticated process reachability, not degraded readiness or status freshness. | Control-token-authenticated cheap liveness endpoint independent of collector staleness; supervisor restarts only on liveness failure or unreachable process. | Treating stale snapshots as healthy readiness. |
| `/readyz` | Readiness can be conflated with liveness and machine-status detail. | Readiness reports whether diagnostics are current enough for orchestration. | Degraded readiness reports stale collector/status details without driving restarts alone. | Bypassing admission or WIP caps. |
| `co-status` | Can expose stale dirty source-root freshness after newer clean shared-root truth exists. | Current authority surfaces share one monotonic generation for source-root freshness and owner facts. | `co-status` exposes the same current generation as UI status, `live_host`, and supervision; superseded dirty facts are historical only. | Docs-freshness owner repair. |
| `live_host` | Current live host facts can be overshadowed by older persisted diagnostics. | Live-host facts use the same current snapshot generation as other status surfaces. | `live_host` cannot let stale dirty owner freshness override newer clean source-root freshness. | Manual launchd or control-host reset steps. |
| Supervision | Repeated `/ui/machine-status.json` same-endpoint probe timeouts can trigger restart churn. | Supervision probes cheap liveness and labels machine-status same-endpoint timeouts as starvation/snapshot-read blocking. | No restart on stale collector snapshots alone; current-endpoint same-endpoint timeout classification says endpoint starvation or snapshot-read blocking, not stale endpoint discovery. | Disabling supervision. |
| Source-root and owner facts | Dirty isolated worker workspaces can be mistaken for shared checkout drift, and terminal CO-574 can look like a live owner. | Shared root freshness and live owner facts are single-authority, monotonic, and issue-state aware. | Clean shared root plus dirty isolated worker remains clean; terminal CO-574 is historical/superseded, while live CO-583 is the active owner for this canonical bug class. | Deleting provider-intake audit history or weakening gates. |

## Acceptance Criteria
- `/ui/machine-status.json` serves a committed immutable snapshot and does not invoke source-root freshness, provider refresh, owner resolution, or sync process/filesystem work.
- Freshness/status collection runs outside the serving event loop with bounded async operations, cancellation, no same-root overlap, and stale-on-failure snapshot semantics.
- Provider-intake admission does not infer source-root freshness from provider poll success, poll completion, or polling `updated_at`; it requires explicit collector verification bound to the same owner token, run id, and source-root realpath, and fails closed when that authority is missing or stale.
- `/healthz` is control-token-authenticated cheap liveness, `/readyz` is degraded readiness, and machine-status is snapshot diagnostics; supervision restarts only on liveness failure or unreachable process, not collector staleness alone.
- `co-status`, `live_host`, supervision, and UI machine-status expose the same current freshness/owner generation; superseded facts are visibly historical and cannot drive gates.
- Dirty isolated worker workspaces do not count as shared checkout drift when the shared root is clean/current.
- Same-endpoint timeout diagnostics point to event-loop or snapshot-read starvation, not endpoint discovery.
- Regression coverage includes active worker progress under stalled freshness collection, stale dirty owner freshness superseded by clean current root, clean shared root plus dirty worker workspace, collector sync-workload starvation, supervisor liveness independence, same-endpoint timeout classification, and terminal global owner not overriding live specific owners.
- A local soak reproduces the incident shape with one active worker, clean shared root, dirty isolated workspace, docs-review/freshness activity, delayed freshness collector, repeated status reads, and supervisor enabled, with no machine-status timeout and no false shared-root drift.

## Not Done If
- `/ui/machine-status.json` still computes source-root freshness, owner facts, provider refresh, Git state, or other expensive live status on the request path.
- Any serving-path module can still call sync child-process APIs such as `spawnSync`, `execFileSync`, or `execSync`.
- Supervisor liveness still probes heavyweight machine-status diagnostics and restarts on stale collector data alone.
- A stale dirty source-root fact can override a newer clean shared-root fact on any current authority surface.
- Provider polling success or polling snapshot `updated_at` can make a source-root freshness snapshot look current without collector verification bound to the same owner/run/source root.
- Same-endpoint current-endpoint timeouts are still classified as stale endpoint discovery.
- The fix lacks an active-worker starvation regression test that would have failed under the 2026-05-25 incident shape.

## Goals
- Preserve the exact protected owner contract for CO-583 as the live replacement for terminal CO-574.
- Move machine-status serving to snapshot-only reads.
- Move source-root freshness, owner resolution, provider refresh, and Git/process work out of the serving event loop.
- Make liveness, readiness, and status diagnostics independent authority surfaces.
- Make source-root freshness and owner facts single-authority and monotonic across status consumers.

## Non-Goals
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`.
- Do not delete provider-intake audit history or remove diagnostic evidence to make status look clean.
- Do not mark terminal CO-574 as a live owner without explicit active replacement issue CO-583.
- Do not solve this by increasing request/probe timeouts, retrying endpoint discovery, or adding fallback status text.
- Do not fold this status-plane refactor into CO-557 unless CO-557 scope is explicitly expanded and re-reviewed.

## Stakeholders
- Product: CO operator relying on status surfaces before moving issues or accepting worker ownership.
- Engineering: Codex orchestrator maintainers implementing control-host status and supervision behavior.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: Packet and mirrors exist, preserve protected wording, and make status parity expectations explicit.
- Guardrails / Error Budgets: Docs-only child lane; no full repo validation; no parent-owned state mutation; no broadened implementation scope.

## User Experience
- Personas: CO operator watching provider-worker admission, control-host health, and docs-freshness blocker routing.
- User Journeys: Operator sees timeout quarantine as an explicit status-plane condition rather than a silent host failure or an instruction to cycle workers.

## Technical Considerations
- Architectural Notes: Treat the immutable machine-status snapshot as the sole request-path authority. Collection may produce stale-on-failure snapshots, but request handlers must not initiate source-root freshness, owner resolution, provider refresh, Git, process, or sync filesystem work. Provider-intake admission must use explicit source-root freshness authority metadata from the collector, not incidental polling success or snapshot write times.
- Dependencies / Integrations: Parent implementation may touch machine-status controller/presenter, snapshot collector/runtime, control-host `/healthz` and `/readyz`, `co-status`, live-host evidence projection, supervision probe logic, owner/freshness generation projection, and same-endpoint timeout diagnostics.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: expire the active-worker timeout quarantine seam unless the parent implementation proves a non-blocking, source-labeled status path by construction.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status plane | Active-worker timeout quarantine protects worker evidence while status reads are degraded. | expire fallback | CO-583 | `/ui/machine-status.json` or status probes time out while active workers have lower-authority evidence | 2026-05-25 | 2026-05-25 | 2026-06-24 | Status path is bounded and non-blocking by construction, or quarantine remains fully source-labeled and tested. | Parent focused status/supervision tests and live status proof |
| Control-host owner freshness policy | Implicit hot-path refresh of committed `control_host_owner` source-root freshness snapshots in `controlRuntime` and `providerIssueHandoff` | remove fallback | CO-583 | Post-PR-890 recurrence showed status and handoff policy reads could still recompute owner freshness through synchronous source-root inspection. | 2026-05-25 | Removed in PR #892. | Removed in PR #892. | Hot status and handoff paths resolve source freshness from committed snapshots only; explicit refresh remains limited to cold diagnostic gauge surfaces. | `ControlMachineStatusContract`, `ControlRuntime`, and `ProviderIssueHandoff` regressions plus CI spec-guard evidence |

## Open Questions
- Parent implementation should decide exact response field names for active-worker timeout quarantine, degraded read source, and freshness metadata.

## Approvals
- Product: Parent CO-583 issue owner.
- Engineering: Pending parent implementation review.
- Design: Not applicable.
