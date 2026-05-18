---
id: 20260425-linear-17451947-1b72-4d01-9e3d-86dcaab46c39
title: "CO-360 provider-worker Codex 0.125 app-server supervision gate"
status: in_progress
relates_to: docs/PRD-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
task_checklists:
  - tasks/tasks-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 10 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- PRD: `docs/PRD-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- Task checklist: `tasks/tasks-linear-17451947-1b72-4d01-9e3d-86dcaab46c39.md`
- Source anchor: `ctx:sha256:07c7c2fa5d9442a961e0bb4be17721c4884e178304d5767a51417c30e21de227#chunk:c000001`
- Source payload: `.runs/linear-17451947-1b72-4d01-9e3d-86dcaab46c39-docs-packet/cli/2026-04-25T00-45-42-850Z-ac87a210/memory/source-0/source.txt`
- Source payload note: the source payload is present in the parent artifact tree. The child-lane accept helper invalidated the lane because Linear `updated_at` changed while it was running, so the parent reviewed and applied the patch artifact manually.

## Summary
- Objective: define the proof gate for moving provider-worker supervision toward Codex CLI `0.125.0` app-server supervision without replacing exec/resume before parity is proven.
- Scope:
  - configured `provider-linear-worker` canary under `runtime_mode=appserver`
  - sticky environment proof with a real configured environment id, or exact blocker plus retained fallback
  - persisted-turn pagination/resume/fork proof, or exact blocker plus retained fallback
  - fail-closed fallback to `codex exec` / `codex exec resume`
  - manifest/status truth for selected runtime, app-server thread/turn ids, sticky env id, and resume/fork outcomes
  - regression coverage for provider-supervision runtime selection and truth preservation
- Constraints:
  - do not claim blanket migration before the proof gate passes
  - do not remove JSONL/session-log truth before parity is proven
  - do not make CO-358 a hard blocker unless cloud preflight is required for the exact canary path

## Issue-Shaping Contract
- User-request translation carried forward: CO-360 should prove provider-worker app-server supervision for Codex CLI `0.125.0` with real configured turns, sticky environment evidence, persisted-turn resume/fork/pagination evidence, and fail-closed exec/resume fallback before replacing the current supervision default.
- Protected terms / exact artifact and surface names:
  - `CO-360`
  - `Codex CLI 0.125.0`
  - `provider-linear-worker`
  - `runtime_mode=appserver`
  - `codex exec`
  - `codex exec resume`
  - `real turns and proof artifacts`
  - `real configured environment id`
  - `persisted turns`
  - `app-server thread/turn ids`
  - `sticky env id`
  - `resume/fork outcomes`
  - `machine-readable fallback reasons`
  - `JSONL/session-log truth`
  - CO-351, CO-89, CO-198, CO-358, CO-359
- Nearby wrong interpretations to reject:
  - replacing exec/resume by default in this lane before proof passes
  - treating app-server startup as equivalent to provider-worker supervision parity
  - treating synthetic canary data as real-turn proof
  - recording fallback only in prose
  - removing JSONL/session-log truth during the proof gate
  - making CO-358 a hard blocker without exact cloud-preflight dependency evidence
- Explicit non-goals carried forward:
  - no blanket provider-worker app-server migration before the proof lane passes
  - no hard CO-358 blocker unless cloud preflight is required for the exact canary path
  - no implementation or test edits in this docs-packet child lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Runtime selection | Provider workers still intentionally rely on `codex exec` / `codex exec resume`. | CO-351 app-server adoption is bounded to explicit task-scoped/control-host proof usage. | `provider-linear-worker` can select `runtime_mode=appserver` for a configured proof canary while retaining fail-closed exec/resume fallback. | Default provider-worker replacement before proof passes. |
| Sticky environments | Sticky environment behavior is not proven for provider-worker app-server supervision. | Current guidance requires sticky environments before replacing exec/resume. | Proof includes a real configured environment id, or exact blocker plus machine-readable fallback reason. | Synthetic env ids or narrative-only blockers. |
| Persisted turns | Real turn-backed pagination/resume/fork behavior is unproven for provider-worker app-server supervision. | Provider-worker supervision requires real persisted-turn behavior. | Proof includes app-server thread/turn ids and persisted-turn pagination/resume/fork outcomes, or exact blockers plus fallback. | Inferring behavior from process success, local logs, or non-persisted turns alone. |
| Truth surfaces | JSONL/session-log truth remains required for provider-worker auditability. | Existing exec/resume session truth cannot be removed before parity. | Manifests/status proof expose selected runtime, ids, outcomes, and fallback reasons while JSONL/session-log truth remains intact. | Removing or deprecating JSONL/session-log truth in this lane. |
| Regression protection | Runtime-selection/truth-preservation coverage for this app-server gate is missing. | Runtime posture changes require regression coverage. | Tests cover app-server selection, fallback reason preservation, and manifest/status truth fields. | Broad provider-worker or app-server refactors beyond the proof/fallback gate. |

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
- Pre-implementation issue-quality review evidence:
  - 2026-04-25: issue text preserves seven acceptance criteria and two non-goals; this packet mirrors each criterion as a functional requirement and readiness gate.
  - 2026-04-25: micro-task path is not appropriate because correctness depends on protected wording, parity evidence, fallback semantics, manifest/status truth, and regression coverage.
- Safeguard ownership split:
  - child lane owns only this docs packet and `tasks/index.json` registration
  - parent lane owns Linear state, workpad, PR lifecycle, implementation, docs-review, regression tests, and full validation

## Technical Requirements
- Functional requirements:
  1. Run a configured `provider-linear-worker` canary under `runtime_mode=appserver` with real turns and proof artifacts.
  2. Prove sticky environment behavior with a real configured environment id, or record the exact blocker and retain fallback.
  3. Prove real turn-backed pagination/resume/fork behavior on persisted turns, or record the exact blocker and retain fallback.
  4. Preserve fail-closed fallback to `codex exec` / `codex exec resume` with machine-readable fallback reasons.
  5. Surface selected runtime, app-server thread/turn ids, sticky env id, and resume/fork outcomes in manifests/status proof.
  6. Add regression coverage for provider-supervision runtime selection and truth preservation.
  7. Do not remove JSONL/session-log truth until parity is proven.
- Non-functional requirements:
  - proof artifacts must be machine-readable and reviewable
  - fallback must be deterministic and fail closed
  - canary evidence must distinguish app-server startup from provider-worker supervision parity
  - implementation must keep existing auditability while adding app-server proof fields
- Interfaces / contracts:
  - `provider-linear-worker` runtime selection must preserve existing exec/resume path behavior unless app-server proof is explicitly selected
  - manifest/status proof must expose `runtime_mode`, selected runtime, app-server thread/turn identifiers, sticky environment id or blocker, resume/fork outcomes, and fallback reasons
  - JSONL/session-log truth remains available until parity is explicitly proven and reviewed

## Architecture & Data
- Architecture / design adjustments:
  - add or wire a task-scoped provider-worker app-server supervision path only for proof canaries
  - keep exec/resume supervision as fallback, not legacy dead code
  - surface app-server identifiers and fallback decisions in existing manifest/status proof surfaces
- Data model changes / migrations:
  - no database migration expected
  - manifest/status schema may need additive fields for runtime selection, app-server thread/turn ids, sticky env id, resume/fork outcomes, and machine-readable fallback reasons
- External dependencies / integrations:
  - Codex CLI `0.125.0`
  - app-server seam adopted by CO-351
  - configured provider environment id
  - existing provider-worker exec/resume runner and JSONL/session-log artifacts
  - CO-358 only if exact canary path requires cloud preflight

## Validation Plan
- Child-lane scoped checks:
  - `tasks/index.json` parses after registration
  - scoped diff touches only declared docs/task files
- Parent-owned implementation checks:
  - docs-review before implementation
  - configured `provider-linear-worker` app-server canary with real turns and proof artifacts
  - sticky environment proof with real configured environment id, or exact blocker plus fallback
  - persisted-turn pagination/resume/fork proof, or exact blocker plus fallback
  - regression tests for provider-supervision runtime selection and truth preservation
  - manifest/status artifact review for runtime, ids, outcomes, and fallback reasons
  - normal parent validation floor after implementation
- Rollout verification:
  - keep provider-worker default on exec/resume until proof passes
  - record a hold/fallback decision when blockers remain
  - only plan default replacement after proof artifacts and reviews show parity
- Monitoring / alerts:
  - app-server proof canary should leave enough manifest/status evidence for parent watch/review loops to detect selected runtime and fallback behavior

## Open Questions
- Does the exact provider-worker app-server canary path require cloud preflight, making CO-358 relevant for that path? This is implementation-time evidence, not a docs blocker.

## Approvals
- Reviewer: parent CO-360 docs-review / implementation gate, pending
- Date: 2026-04-25
