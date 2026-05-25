# ACTION_PLAN - CO-583 replace control-host machine-status timeout patch with snapshot status plane

## Summary
- Goal: Repair the recurring control-host machine-status same-endpoint timeout by replacing timeout/fallback behavior with a snapshot-only status plane under `control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Scope: Docs packet plus implementation/test changes for `/ui/machine-status.json`, `/healthz`, `/readyz`, `co-status`, `live_host`, supervision, source-root freshness, stale owner freshness, owner generation, and same-endpoint timeout classification.
- Assumptions: Parent owns authoritative Linear state, workpad, implementation, validation, PR lifecycle, and live control-host evidence.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: control-host machine-status same-endpoint timeout, `/ui/machine-status.json`, snapshot-only status plane, source-root freshness, stale owner freshness, `provider_refresh_lifecycle_stuck`, `dispatch_source_issue_by_id`, `node::SyncProcessRunner`, `uv_spawn`, `posix_spawn`, `/healthz`, `/readyz`, CO-574, CO-572, CO-557, CO-579, CO-581, CO-569, `control-host:machine-status-active-worker-timeout-quarantine:v1`, `codex-orchestrator:canonical-owner-key=control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Not done if: `/ui/machine-status.json` still computes source-root freshness, owner facts, provider refresh, Git state, or other expensive live status on the request path; serving path modules can still call sync child-process APIs; supervisor liveness still probes heavyweight machine-status diagnostics; stale dirty source-root facts can override newer clean shared-root facts; same-endpoint current-endpoint timeouts remain classified as stale endpoint discovery; regression coverage misses the active-worker starvation incident shape.
- Acceptance criteria: `/ui/machine-status.json` reads only committed immutable snapshots; freshness/status collection moves outside the serving event loop with bounded async operations, cancellation, no same-root overlap, and stale-on-failure semantics; provider-intake admission requires collector-verified source-root authority bound to owner/run/source root and never treats provider polling success as freshness evidence; `/healthz` is control-token-authenticated cheap liveness, `/readyz` is degraded readiness; current freshness/owner generation is monotonic across `co-status`, `live_host`, supervision, and UI status; clean shared root plus dirty isolated workspace stays clean; same-endpoint diagnostics point to endpoint starvation or snapshot-read blocking.
- Source anchor: `ctx:sha256:687a20fdf718f72e2f87044a8a517a50912c6a1325dac159ee8adfb6b6be454b#chunk:c000001`.

## Milestones & Sequencing
1. Create PRD with user request translation, Non-Goals, Not Done If, acceptance criteria, and parity matrix.
2. Create TECH_SPEC mirror and canonical task spec with status-plane requirements.
3. Create task checklist and `.agent/task` mirror.
4. Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
5. Run scoped docs-only validation for JSON syntax, whitespace, and protected-term presence.
6. Leave all changes uncommitted for parent patch export.

## Parent Implementation Outline
1. Capture the current request-path coupling from `/ui/machine-status.json` through live machine-status construction into source-root freshness, provider refresh, owner resolution, and sync Git/process/filesystem work.
2. Add RED regressions for snapshot-only machine-status reads, active worker progress under stalled freshness collection, stale dirty owner freshness superseded by clean current root, clean shared root plus dirty isolated worker workspace, collector sync-workload starvation, supervisor liveness independence, same-endpoint timeout classification, and terminal CO-574 not overriding live CO-583.
3. Introduce a committed machine-status snapshot read path for `/ui/machine-status.json`; stale-on-failure belongs to the collector/runtime commit path, not request handling.
4. Move expensive source-root freshness, owner resolution, provider state refresh, Git/process work, and filesystem inspection out of the serving event loop with bounded async operations and no same-root overlap.
5. Add explicit source-root freshness authority metadata from the collector and fail provider-intake closed when verification is missing, malformed, stale, or not bound to the same owner token, run id, and source-root realpath.
6. Add control-token-authenticated cheap `/healthz` liveness and degraded `/readyz` readiness; switch supervision restarts to liveness failure or unreachable process, not collector staleness alone.
7. Align `co-status`, `live_host`, supervision, and UI machine-status around one current source-root freshness/owner generation, preserving superseded dirty facts as historical evidence only.
8. Validate with targeted tests, docs-review, implementation-gate/standalone review, elegance pass, required repo gates, and the local incident-shape soak when feasible.

## Fallback / Refactor Decision Evidence
- Large-refactor decision: selected. The repeated same-endpoint timeout involves split authority across `/ui/machine-status.json`, `co-status`, `live_host`, supervision, source-root freshness, and owner freshness, so the repair boundary is the status-plane split rather than a timeout bump.
- Minor-seam decision: rejected except for the explicitly expiring, source-labeled active-worker timeout quarantine row below. Another `Promise.race`, stale endpoint wording tweak, or retry-only branch is not acceptable for this recurrence.

| Surface | Fallback/seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status plane | Active-worker timeout quarantine and same-endpoint timeout compatibility wording in `coStatusAttachCliShell` / `controlRuntime` | expire fallback | CO-583 | machine-status endpoint/probe timeout while active workers exist | 2026-05-25 | 2026-05-25 | 2026-06-24 | Snapshot-only machine-status request path, `/healthz` supervision probe, `/readyz` degraded readiness, and endpoint-starvation diagnostics replace the quarantine | Focused status-plane/supervision tests, `docs:freshness:maintain`, and live hygiene/`co-status` proof |
| Control-host owner freshness policy | Implicit hot-path refresh of committed `control_host_owner` source-root freshness snapshots in `controlRuntime` and `providerIssueHandoff` | remove fallback | CO-583 | Post-PR-890 recurrence showed status and handoff policy reads could still recompute owner freshness through synchronous source-root inspection. | 2026-05-25 | Removed in PR #892. | Removed in PR #892. | Hot status and handoff paths resolve source freshness from committed snapshots only; explicit refresh remains limited to cold diagnostic gauge surfaces. | `ControlMachineStatusContract`, `ControlRuntime`, and `ProviderIssueHandoff` regressions plus CI spec-guard evidence |

## Dependencies
- Parent CO-583 workspace for implementation and live control-host proof.
- Terminal CO-574 and CO-572 are historical/superseded evidence, not live owners for this recurrence.
- Related issues CO-557, CO-579, CO-581, and CO-569 stay preserved as lineage or adjacent blockers without scope expansion.
- CO-584 remains a separate docs-freshness registry integrity lane and does not own this status-plane repair.

## Validation
- Child checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md docs/TECH_SPEC-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md docs/ACTION_PLAN-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/specs/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/tasks-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md .agent/task/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `rg -n "control-host:machine-status-active-worker-timeout-quarantine:v1|/ui/machine-status\\.json|/healthz|/readyz|co-status|live_host|supervision|owner/freshness facts" <declared files>`
- Parent checks:
  - RED then green focused machine-status, health/readiness, `co-status`, live-host, source-root/owner generation, and supervision regressions.
  - Static check or regression proving serving-path modules do not call sync child-process APIs.
  - Source-root authority regressions proving provider polling success is not source-root evidence and exact collector verification binding is required.
  - Local incident-shape soak: one active worker, clean shared root, dirty isolated workspace, docs-review/freshness activity, delayed freshness collector, repeated status reads, supervisor enabled, no machine-status timeout, and no false shared-root drift.

## Risks & Mitigations
- Risk: Parent implementation treats recurrence as timeout tuning. Mitigation: packet rejects larger timeouts, endpoint rediscovery, fallback text, and more `Promise.race`.
- Risk: Status facts conflict across surfaces. Mitigation: require one current monotonic source-root freshness and owner generation for all named surfaces.
- Risk: Collector work still starves the serving loop. Mitigation: move collection out of request handlers and test stalled/sync-workload collector shapes.
- Risk: Docs-freshness lanes absorb status-plane debt. Mitigation: CO-583 owns status health; docs-freshness owner repairs stay separate.

## Approvals
- Reviewer: Parent CO-583 implementation lane.
- Date: 2026-05-25.
