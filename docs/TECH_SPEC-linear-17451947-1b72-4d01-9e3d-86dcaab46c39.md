---
id: 20260425-linear-17451947-1b72-4d01-9e3d-86dcaab46c39
title: CO-360 provider-worker Codex 0.125 app-server supervision gate
relates_to: docs/PRD-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
risk: high
owners:
  - Codex
last_review: 2026-04-25
canonical_task_spec: tasks/specs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-provider-worker-codex-0125-appserver-supervision-gate.md
related_action_plan: docs/ACTION_PLAN-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
task_checklists:
  - tasks/tasks-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
---

# TECH_SPEC - CO-360 provider-worker Codex 0.125 app-server supervision gate

## Canonical Reference
- Canonical task spec: `tasks/specs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-provider-worker-codex-0125-appserver-supervision-gate.md`
- PRD: `docs/PRD-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- Task checklist: `tasks/tasks-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- Source anchor: `ctx:sha256:07c7c2fa5d9442a961e0bb4be17721c4884e178304d5767a51417c30e21de227#chunk:c000001`
- Source payload: `.runs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-docs-packet/cli/2026-04-25T00-45-42-850Z-ac87a210/memory/source-0/source.txt`
- Mirror alignment: this docs-side TECH_SPEC mirrors the canonical task spec so `tasks/index.json` can keep `paths.spec` on the canonical task spec while `paths.docs` points at a docs-facing surface.

## Summary
- Objective: define the proof gate for moving `provider-linear-worker` supervision toward Codex CLI `0.125.0` app-server supervision without replacing `codex exec` / `codex exec resume` before parity is proven.
- Scope:
  - configured `provider-linear-worker` canary under `runtime_mode=appserver`
  - sticky environment proof with a real configured environment id, or exact blocker plus retained fallback
  - persisted-turn pagination/resume/fork proof, or exact blocker plus retained fallback
  - fail-closed fallback to `codex exec` / `codex exec resume`
  - manifest/status truth for selected runtime, app-server thread/turn ids, sticky env id, and resume/fork outcomes
  - regression coverage for provider-supervision runtime selection and truth preservation
  - JSONL/session-log truth retention until parity is proven
- Constraints:
  - no blanket provider-worker app-server migration before proof passes
  - no removal of JSONL/session-log truth before parity is proven
  - no hard CO-358 dependency unless the exact canary path requires cloud preflight

## Issue-Shaping Contract
- User-request translation carried forward: CO-360 should prove provider-worker app-server supervision for Codex CLI `0.125.0` with real configured turns, sticky environment evidence, persisted-turn resume/fork/pagination evidence, and fail-closed exec/resume fallback before replacing the current supervision default.
- Protected terms / exact artifact and surface names: `CO-360`, `Codex CLI 0.125.0`, `provider-linear-worker`, `runtime_mode=appserver`, `codex exec`, `codex exec resume`, `real turns and proof artifacts`, `real configured environment id`, `persisted turns`, `app-server thread/turn ids`, `sticky env id`, `resume/fork outcomes`, `machine-readable fallback reasons`, `JSONL/session-log truth`, CO-351, CO-89, CO-198, CO-358, CO-359.
- Nearby wrong interpretations to reject:
  - replacing exec/resume by default in this lane before proof passes
  - treating app-server startup as provider-worker supervision parity
  - treating synthetic canary data as real-turn proof
  - recording fallback only in prose
  - removing JSONL/session-log truth during the proof gate
  - making CO-358 a hard blocker without exact cloud-preflight dependency evidence
- Explicit non-goals: no default provider-worker replacement before proof passes, no hard CO-358 blocker without exact cloud-preflight dependency evidence, and no deletion of the canonical task spec.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Runtime selection | Provider workers still intentionally rely on `codex exec` / `codex exec resume`. | CO-351 app-server adoption is bounded to explicit task-scoped/control-host proof usage. | `provider-linear-worker` can select `runtime_mode=appserver` for a configured proof canary while retaining fail-closed exec/resume fallback. | Default provider-worker replacement before proof passes. |
| Sticky environments | Sticky environment behavior is not proven for provider-worker app-server supervision. | Current guidance requires sticky environments before replacing exec/resume. | Proof includes a real configured environment id, or exact blocker plus machine-readable fallback reason. | Synthetic env ids or narrative-only blockers. |
| Persisted turns | Real turn-backed pagination/resume/fork behavior is unproven for provider-worker app-server supervision. | Provider-worker supervision requires real persisted-turn behavior. | Proof includes app-server thread/turn ids and persisted-turn pagination/resume/fork outcomes, or exact blockers plus fallback. | Inferring behavior from process success, local logs, or non-persisted turns alone. |
| Truth surfaces | JSONL/session-log truth remains required for provider-worker auditability. | Existing exec/resume session truth cannot be removed before parity. | Manifests/status proof expose selected runtime, ids, outcomes, and fallback reasons while JSONL/session-log truth remains intact. | Removing or deprecating JSONL/session-log truth in this lane. |
| Registry docs pointer | `paths.spec` points to the canonical task spec and `paths.docs` previously fell back to the same task spec because this docs mirror was missing. | Current registry entries use `paths.spec` for the canonical task spec and `paths.docs` for a docs-side `TECH_SPEC` mirror when one exists. | Keep `paths.spec` unchanged and point `paths.docs` at this mirror. | Broad registry migration or unrelated row normalization. |

## Readiness Gate
- Not done if:
  - canary is not a configured `provider-linear-worker` run under `runtime_mode=appserver`
  - real turns and proof artifacts are missing
  - sticky env id is missing without exact blocker and retained fallback
  - persisted-turn pagination/resume/fork proof is missing without exact blocker and retained fallback
  - fail-closed fallback to `codex exec` / `codex exec resume` is removed or hidden
  - manifest/status proof omits selected runtime, app-server thread/turn ids, sticky env id, resume/fork outcomes, or fallback reasons
  - JSONL/session-log truth is removed before parity is proven
  - CO-358 is treated as a hard blocker without exact cloud-preflight dependency evidence
  - `tasks/index.json` `paths.docs` points at a missing file
- Pre-implementation issue-quality review evidence:
  - 2026-04-25: the canonical task spec preserves the provider-worker proof gate, protected terms, wrong interpretations, non-goals, parity matrix, and validation expectations.
  - 2026-04-25: CO-369 added this mirror so `paths.docs` no longer needs to rely on the legacy task-spec fallback.

## Technical Requirements
- Run a configured `provider-linear-worker` canary under `runtime_mode=appserver` with real turns and proof artifacts.
- Prove sticky environment behavior with a real configured environment id, or record the exact blocker and retain fallback.
- Prove real turn-backed pagination/resume/fork behavior on persisted turns, or record the exact blocker and retain fallback.
- Preserve fail-closed fallback to `codex exec` / `codex exec resume` with machine-readable fallback reasons.
- Surface selected runtime, app-server thread/turn ids, sticky env id, and resume/fork outcomes in manifests/status proof.
- Add regression coverage for provider-supervision runtime selection and truth preservation.
- Keep JSONL/session-log truth until parity is proven.
- Keep `tasks/index.json` `paths.spec` pointed at the canonical task spec and use this file as the docs-facing `paths.docs` mirror.

## Validation Plan
- CO-360 implementation validation:
  - configured `provider-linear-worker` app-server canary with real turns and proof artifacts
  - sticky environment proof with real configured environment id, or exact blocker plus fallback
  - persisted-turn pagination/resume/fork proof, or exact blocker plus fallback
  - regression tests for provider-supervision runtime selection and truth preservation
  - manifest/status artifact review for runtime, ids, outcomes, and fallback reasons
- CO-369 registry/docs alignment validation:
  - `tasks/index.json` parses after `paths.docs` repoint
  - `docs/docs-freshness-registry.json` tracks this mirror
  - `npm run docs:check`
  - `npm run docs:freshness`

## Approvals
- Reviewer: parent CO-360 implementation gate, pending for CO-360 runtime proof work
- Mirror/repoint reviewer: CO-369 parent lane, validation passed on 2026-04-25
- Date: 2026-04-25
