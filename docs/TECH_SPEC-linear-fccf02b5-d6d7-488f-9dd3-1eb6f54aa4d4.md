---
id: 20260525-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4
title: CO-583 replace control-host machine-status timeout patch with snapshot status plane
relates_to: docs/PRD-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md
risk: high
owners:
  - Codex
last_review: 2026-05-25
---

## Added by Docs Packet 2026-05-25

## Summary
- Objective: Define the CO-583 implementation contract for replacing the control-host machine-status same-endpoint timeout patch with an isolated snapshot-only status plane under `control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Scope: Docs-first packet, status-plane requirements, checklist mirrors, and registry mirrors only.
- Constraints: No implementation or test edits in this child lane; parent owns Linear state, workpad, implementation, validation, PR lifecycle, and any mutation helpers.

## Issue-Shaping Contract
- User-request translation carried forward: treat CO-583 as the active replacement for terminal CO-574 and implement snapshot-only status serving instead of timeout tuning, endpoint rediscovery, fallback status text, or another `Promise.race`.
- Protected terms / exact artifact and surface names: control-host machine-status same-endpoint timeout, `/ui/machine-status.json`, snapshot-only status plane, source-root freshness, stale owner freshness, `provider_refresh_lifecycle_stuck`, `dispatch_source_issue_by_id`, `node::SyncProcessRunner`, `uv_spawn`, `posix_spawn`, `/healthz`, `/readyz`, CO-574, CO-572, CO-557, CO-579, CO-581, CO-569, `control-host:machine-status-active-worker-timeout-quarantine:v1`, `codex-orchestrator:canonical-owner-key=control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Nearby wrong interpretations to reject: this is not a stale endpoint discovery problem; not solved by raising a timeout; not solved by adding another fallback or more `Promise.race`; not a CO-557 docs-review task-key-only change; not permission to weaken docs freshness or spec gates; no provider-intake cleanup; no broad dashboard redesign.
- Explicit non-goals carried forward: do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`; do not delete provider-intake audit history; do not mark terminal CO-574 as the live owner; do not fold the status-plane refactor into CO-557 without explicit scope expansion and re-review.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| `/ui/machine-status.json` | Request path can still construct live status and block on source-root freshness, owner resolution, provider refresh, Git/process, or sync filesystem work. | Machine status request handling reads only an immutable committed snapshot. | Snapshot-only request path with no source-root freshness, owner resolution, provider refresh, `spawnSync`, `execSync`, `execFileSync`, or sync Git/process/filesystem work. | Replacing UI data architecture or hiding diagnostics. |
| `/healthz` | Liveness can be conflated with heavyweight machine-status diagnostics. | Liveness is cheap authenticated process reachability. | `/healthz` uses the control endpoint token and is independent of collector staleness; supervisor restarts only on liveness failure or unreachable process. | Treating stale snapshots as healthy readiness. |
| `/readyz` | Readiness can be ambiguous during degraded status reads. | Readiness reflects whether orchestration decisions are safe. | `/readyz` reports stale/degraded collector status without driving restarts alone. | WIP cap or admission bypass. |
| `co-status` | Stale dirty source-root freshness can survive after newer clean shared-root truth. | Operator status exposes the current monotonic freshness/owner generation. | `co-status` matches UI, `live_host`, and supervision generation; superseded dirty facts are historical only. | Docs-freshness owner repair. |
| `live_host` | Current live-host facts can be overshadowed by persisted diagnostics. | Live facts use the same current generation as status consumers. | `live_host` cannot let stale dirty owner freshness override newer clean source-root freshness. | Manual host reset workflows. |
| Supervision | `/ui/machine-status.json` same-endpoint timeouts can trigger restart churn. | Supervision probes cheap liveness and labels status stalls precisely. | Same-endpoint current-endpoint timeouts are endpoint starvation or snapshot-read blocking, not stale endpoint discovery. | Disabling supervision. |
| Source-root and owner facts | Dirty isolated worker workspaces can look like shared checkout drift; terminal CO-574 can look live. | Shared root freshness and live owner facts are single-authority, monotonic, and issue-state aware. | Clean shared root plus dirty worker remains clean; terminal CO-574 is historical while live CO-583 owns this canonical bug class. | Deleting audit history or weakening gates. |

## Readiness Gate
- Not done if: `/ui/machine-status.json` still computes source-root freshness, owner facts, provider refresh, Git state, or other expensive live status on the request path; serving-path modules can still call sync child-process APIs; supervisor liveness still probes heavyweight machine-status diagnostics; stale dirty facts can override newer clean shared-root facts; same-endpoint timeouts are still classified as stale endpoint discovery.
- Acceptance criteria:
  - `/ui/machine-status.json` serves a committed immutable snapshot only.
  - Freshness/status collection runs outside the serving event loop with bounded async operations, cancellation, no same-root overlap, and stale-on-failure snapshot semantics.
  - Provider-intake admission accepts current source-root freshness only when provider polling health carries a collector-verified authority tuple (`source_root_freshness_verified_at`, owner token, run id, source-root realpath) bound to the same control-host owner/run and not older than the freshness observation; provider polling success or `updated_at` timestamps are not source-root evidence.
  - `/healthz` is control-token-authenticated cheap liveness, `/readyz` is degraded readiness, and machine-status is snapshot diagnostics.
  - `co-status`, `live_host`, supervision, and UI machine-status expose the same current freshness/owner generation with superseded facts historical only.
  - Dirty isolated worker workspaces do not count as shared checkout drift when the shared root is clean/current.
  - Same-endpoint timeout diagnostics point to event-loop or snapshot-read starvation, not endpoint discovery.
  - Regression coverage includes active worker progress under stalled freshness collection, stale dirty owner freshness superseded by clean current root, clean shared root plus dirty worker workspace, collector sync-workload starvation, supervisor liveness independence, same-endpoint timeout classification, and terminal global owner not overriding live specific owners.
- Pre-implementation issue-quality review evidence: The source payload path provided by the parent was absent in this child checkout, so this packet is anchored to the parent-provided source pointer and protected terms.
- Source anchor: `ctx:sha256:687a20fdf718f72e2f87044a8a517a50912c6a1325dac159ee8adfb6b6be454b#chunk:c000001`.

## Technical Requirements
- Functional requirements:
  - Serve `/ui/machine-status.json` from an immutable committed machine-status snapshot only.
  - Run source-root freshness, owner resolution, provider state refresh, and expensive Git/process work outside the serving event loop with bounded async commands, cancellation, no overlapping same-root refreshes, and stale-on-failure commits.
  - Record source-root freshness authority through explicit collector verification metadata on provider polling health, not through routine provider poll completion, poll success, or snapshot write timestamps.
  - Fail provider-intake closed when the current source-root freshness snapshot is missing collector verification, has malformed verification time, predates the freshness observation, or is not bound to the same owner token, run id, and source-root realpath.
  - Keep `/healthz` and `/readyz` semantics separate: control-token-authenticated cheap liveness versus degraded readiness.
  - Ensure `co-status` exposes the same current source-root freshness and owner generation as UI machine-status, `live_host`, and supervision.
  - Preserve superseded dirty owner/source-root facts as historical evidence that cannot drive gates.
  - Classify same-endpoint current-endpoint timeouts as endpoint starvation or snapshot-read blocking, not endpoint discovery.
  - Ensure terminal Done CO-574 cannot satisfy live ownership for this recurring canonical bug class while CO-583 is active.
- Non-functional requirements:
  - Deterministic local status classification and monotonic current generation selection.
  - No new secrets or external network dependency for status validation.
  - Fail closed when source/freshness is missing, but keep liveness independent from collector staleness.
- Interfaces / contracts:
  - `/ui/machine-status.json`
  - `/healthz`
  - `/readyz`
  - `co-status`
  - `live_host`
  - control-host `supervision`
  - source-root freshness and stale owner freshness facts exposed through status and freshness diagnostics

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status plane | Active-worker timeout quarantine protects lower-authority worker and freshness evidence while status reads are degraded. | expire fallback | CO-583 | status endpoint/probe timeout while active workers exist | 2026-05-25 | 2026-05-25 | 2026-06-24 | machine-status request path is snapshot-only and supervisor liveness is independent by construction, or quarantine remains tested and source-labeled | Parent focused status/supervision tests and live status proof |
| Control-host owner freshness policy | Implicit hot-path refresh of committed `control_host_owner` source-root freshness snapshots in `controlRuntime` and `providerIssueHandoff` | remove fallback | CO-583 | Post-PR-890 recurrence showed status and handoff policy reads could still recompute owner freshness through synchronous source-root inspection. | 2026-05-25 | Removed in PR #892. | Removed in PR #892. | Hot status and handoff paths resolve source freshness from committed snapshots only; explicit refresh remains limited to cold diagnostic gauge surfaces. | `ControlMachineStatusContract`, `ControlRuntime`, and `ProviderIssueHandoff` regressions plus CI spec-guard evidence |

- Large-refactor check: Parent should prefer a coherent status-plane repair if classification is split across endpoint, CLI, live-host, and supervision code. Another minor timeout branch is not acceptable unless it is explicitly source-labeled and expiring.

## Architecture & Data
- Architecture / design adjustments: Represent committed machine-status snapshots as the request-path authority. Status collection may refresh source-root freshness, stale owner freshness, provider state, and owner facts asynchronously, but serving handlers must not initiate those operations.
- Data model changes / migrations: Provider polling health may add source-root freshness authority metadata fields (`source_root_freshness_verified_at`, owner token, run id, source-root realpath) plus quarantine reason, degraded read source, freshness verdict, and lower-authority evidence as needed.
- External dependencies / integrations: None for this docs packet.

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md docs/TECH_SPEC-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md docs/ACTION_PLAN-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/specs/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/tasks-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md .agent/task/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation checks:
  - Focused tests for machine-status endpoint, health/readiness semantics, `co-status`, live-host projection, and supervision restart/quarantine behavior.
  - Focused tests proving provider polling success does not imply source-root authority, missing or malformed collector verification fails closed, and exact owner/run/source-root authority binding is required.
  - Live or fixture proof that active-worker timeout quarantine preserves lower-authority owner/freshness facts.

## Open Questions
- Parent should choose exact JSON field names for quarantine reason and freshness/source metadata.

## Approvals
- Reviewer: Parent CO-583 implementation lane.
- Date: 2026-05-25.
