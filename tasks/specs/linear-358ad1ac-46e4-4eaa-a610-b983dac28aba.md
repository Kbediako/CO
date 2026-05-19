---
id: 20260426-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba
title: CO: promote resident app-server seam to authoritative provider-worker control plane
status: in_progress
owner: Codex
created: 2026-04-26
last_review: 2026-05-19
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md
related_action_plan: docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md
related_tasks:
  - tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md
review_notes:
  - 2026-04-26: Opened from bounded same-issue docs child lane for `CO-389`; parent reconciled the accepted packet to shared source anchor `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001` and origin manifest `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/manifest.json`.
  - 2026-04-26: Parent verified the shared source payload at `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/memory/source-0/source.txt`, so the packet is anchored on that payload, the parent-provided issue-shaping prompt, and protected terms.
  - 2026-04-26: Child lane owns only the docs packet files and `tasks/index.json`; parent owns implementation, tests, docs-review, Linear/workpad state, PR lifecycle, and wider mirrors outside child file scope.
---

# Technical Specification

## Context

CO-389 is a control-contract migration lane. It is not a generic presentation cleanup and not a replacement runtime rewrite. The required contract is to promote the resident app-server seam to the authoritative provider-worker control plane while preserving `codex exec` / `codex exec resume` as break-glass or legacy fallback.

The issue-shaping contract requires exact preservation of:

- `resident app-server seam`
- `authoritative provider-worker control plane`
- `provider-worker control paths`
- `control-host read models`
- `runtime proof`
- `codex exec / codex exec resume as break-glass or legacy fallback`
- `drain, restart, resume, and state/read-model continuity`
- `manifests, CO STATUS/control-host, and workpad evidence derive provider-worker truth from the same authority`
- `migration canaries proving continuity, failure semantics, and rollback behavior`

The parent lane verified the shared source payload at `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/memory/source-0/source.txt`, so this spec is anchored on that payload, `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`, and protected terms. Parent owns all implementation, Linear/workpad state, validation, PR lifecycle, and any docs mirrors outside this child lane's declared file scope.

## Requirements

1. Route normal provider-worker control through the resident app-server seam as the authoritative provider-worker control plane.
2. Keep `codex exec` / `codex exec resume` available only as explicitly labeled break-glass or legacy fallback.
3. Define the provider-worker control paths that must share app-server authority: start/admit, drain, restart, resume, status/state reads, and runtime proof.
4. Ensure control-host read models and CO STATUS derive provider-worker truth from the same authority used for provider-worker control actions.
5. Ensure manifests, provider-worker proof artifacts, CO STATUS/control-host, and workpad evidence record the same provider-worker authority and fallback provenance.
6. Prove drain, restart, resume, and state/read-model continuity through migration canaries before parent handoff.
7. Prove failure semantics and rollback behavior through canaries, including fallback to `codex exec` / `codex exec resume` only when explicitly requested or when resident authority fails closed.
8. Reject unsafe mid-turn hot reload claims. Active provider turns must either continue under the preexisting safe owner or drain/restart at a declared safe boundary.
9. Do not widen remote shell/watch authority by default.
10. Keep the implementation bounded to provider-worker control authority; do not redesign unrelated scheduling, queue selection, or workpad flows.

## Issue-Shaping Contract

- User-request translation: create the CO-389 docs-first packet and task-index registration for the authoritative resident app-server provider-worker control contract.
- Protected terms / exact artifact and surface names:
  - `resident app-server seam`
  - `authoritative provider-worker control plane`
  - `provider-worker control paths`
  - `control-host read models`
  - `runtime proof`
  - `manifests`
  - `CO STATUS`
  - `control-host`
  - `workpad evidence`
  - `codex exec`
  - `codex exec resume`
- Nearby wrong interpretations to reject:
  - BEAM rewrite
  - distributed scheduling or SSH worker pool
  - unsafe mid-turn hot reload
  - remote shell/watch authority expansion by default
  - CO STATUS-only projection cleanup
  - keeping `codex exec` / `codex exec resume` as the hidden normal authority
- Explicit non-goals:
  - No BEAM rewrite.
  - No distributed scheduling or SSH worker pool.
  - No unsafe mid-turn hot reload claim.
  - Do not widen remote shell/watch authority by default.
  - No child-lane source/test edits.
  - No child-lane Linear workpad or Linear state mutation.

## Design

The parent implementation should introduce or promote a single provider-worker control authority boundary backed by the resident app-server seam. That boundary should be responsible for accepting provider-worker control requests, exposing read-model state, and recording runtime proof.

Required design properties:

- Authority identity:
  - Every provider-worker control action records whether it was handled by resident app-server authority or by break-glass/legacy exec fallback.
  - Authority identity is carried into manifests, provider-worker proof, CO STATUS/control-host, and workpad-ready summaries.
- Control paths:
  - Normal start/admit, drain, restart, resume, and status/state reads should go through the resident app-server authority.
  - Fallback `codex exec` / `codex exec resume` path must be explicit, reasoned, and machine-checkable.
- Read models:
  - control-host read models derive from the same authority as control actions.
  - CO STATUS, API/UI projections, and provider-worker truth helpers do not independently reconstruct conflicting authority.
- Runtime proof:
  - runtime proof identifies authority, runtime mode, fallback reason, state continuity outcome, failure semantics, and rollback posture.
  - manifests remain the durable audit surface but do not become a competing source of provider-worker control truth.
- Continuity:
  - drain/restart/resume canaries prove state/read-model continuity across migration.
  - No unsafe mid-turn hot reload is claimed. Mid-turn behavior must be safe-boundary drain/restart/resume or explicitly unchanged legacy ownership.
- Rollback:
  - rollback canary proves that fallback behavior is available, labeled, and does not erase authority provenance.

## Implementation Surface

Parent should inspect and select the smallest source/test set required from these likely seams:

- Provider-worker control and authority:
  - `orchestrator/src/cli/control/providerWorkerHosts.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- Resident app-server/control-host lifecycle and read models:
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/observabilityApiController.ts`
  - `orchestrator/src/cli/coStatusCliShell.ts`
- Runtime/fallback execution:
  - `orchestrator/src/cli/runtime/provider.ts`
  - `orchestrator/src/cli/services/execRuntime.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/services/orchestratorControlPlaneLifecycle.ts`

## Parity / Alignment Matrix

| Contract Area | Current truth to verify | Target truth |
| --- | --- | --- |
| Provider-worker authority | Existing paths may mix app-server, control-host helpers, manifest state, and exec/resume fallback. | Resident app-server authority owns normal provider-worker control; fallback is explicit and labeled. |
| Control-host read models | Read models may reconstruct provider state from artifacts rather than a single authority. | Read models derive from the same authority as control actions and expose authority provenance. |
| Runtime proof | Manifest/proof/status/workpad evidence can be read separately. | Runtime proof gives all evidence surfaces the same provider-worker truth and fallback reason. |
| Drain/restart/resume | Continuity can be asserted per flow. | Migration canaries prove continuity across all three flows and state/read-model projections. |
| Failure and rollback | Fallback may be operationally available but not an explicit contract. | Failure semantics and rollback behavior are canary-backed and machine-checkable. |

## Not Done If

- Provider-worker control paths still depend on multiple competing authorities for normal operation.
- control-host read models or CO STATUS can disagree with manifests/runtime proof about provider-worker authority.
- The implementation cannot prove drain, restart, resume, and state/read-model continuity.
- Fallback through `codex exec` / `codex exec resume` is unlabelled, routine, or indistinguishable from resident app-server authority.
- The change claims unsafe mid-turn hot reload or widens remote shell/watch authority without a separate issue.
- The lane broadens into BEAM, distributed scheduling, SSH worker pools, or unrelated queue/workpad redesign.

## Acceptance Criteria

- The resident app-server seam is documented and implemented as the normal authoritative provider-worker control plane.
- Provider-worker control paths for start/admit, drain, restart, resume, and status/state reads share the resident authority.
- control-host read models, CO STATUS, manifests, provider-worker proof, and workpad-ready evidence derive provider-worker truth from the same authority.
- Runtime proof records authority, runtime mode, fallback reason, continuity outcome, failure semantics, and rollback posture.
- `codex exec` / `codex exec resume` are only break-glass or legacy fallback and are labeled as such.
- Migration canaries prove continuity, failure semantics, and rollback behavior.

## Validation Plan

- Child-lane scoped checks:
  - `jq empty tasks/index.json`
  - protected-term grep across `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, and `tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
  - `git diff --check -- docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/index.json`
- Parent docs/guard checks:
  - `node scripts/spec-guard.mjs --dry-run`
  - parent-owned docs-review manifest under `.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba-*/cli/*/manifest.json`
  - docs-freshness/registry handling if parent widens scope beyond this child packet
- Parent focused tests/canaries:
  - focused provider-worker authority and runtime-proof regressions
  - control-host read-model and CO STATUS authority-provenance regressions
  - migration canary for drain continuity
  - migration canary for restart continuity
  - migration canary for resume continuity
  - failure-semantics canary proving fail-closed resident authority behavior
  - rollback canary proving labeled break-glass/legacy `codex exec` / `codex exec resume`

## Decisions

- 2026-04-26: The canonical provider-worker control authority is the app-server JSONL path using `thread/start` or `thread/resume` followed by `turn/start`, with drain observed through `turn/completed`.
- 2026-04-26: Authority provenance lives in both provider-worker proof (`worker_control`) and manifest metadata (`provider_worker_control`), and CO STATUS/control-host read models surface the proof-derived `worker_control` value.
- 2026-04-26: Mandatory canaries are app-server start/drain, app-server resume, seeded resident restart, app-server fail-closed semantics, and explicit CLI break-glass fallback.
- 2026-04-26: Failure and rollback naming uses `appserver_runtime_error` for resident authority failures and `legacy_cli_break_glass` for explicit or fallback `codex exec` / `codex exec resume` control.

## Approvals

- Reviewer: pending parent docs-review and implementation.
- Date: 2026-04-26.
