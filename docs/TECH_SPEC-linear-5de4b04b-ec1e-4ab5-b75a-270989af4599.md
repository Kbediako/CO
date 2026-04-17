---
id: 20260417-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599
title: CO make linear transition race-safe with expected-state/CAS semantics and expected updated_at
relates_to: docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- PRD: `docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- Task checklist: `tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`

## Traceability
- Linear issue: `CO-215` / `5de4b04b-ec1e-4ab5-b75a-270989af4599`
- Linear URL: https://linear.app/asabeko/issue/CO-215
- Source anchor: `ctx:sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167#chunk:c000001`
- Source object id: `sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167`
- Expected source payload: `../../.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599/cli/2026-04-17T09-12-09-997Z-af2c6e14/memory/source-0/source.txt`
- Docs packet child lane: `.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599-co215-docs-packet/cli/2026-04-17T09-16-32-281Z-7ee373ad/manifest.json`
- Source note: the expected source payload from the original worker-run manifest is absent in this child checkout, so the packet uses the protected wording from the request plus direct code inspection of `providerLinearWorkflowFacade.ts`, `linearCliShell.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts`.

## Summary
- Objective: add a narrow race-safety contract to `linear transition` so callers can declare expected-state/CAS semantics and expected updated_at, fail closed on terminal/completed workflow type or stale writes, and use `--force` only with a force reason and richer audit output.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-215`
  - parent-owned transition contract changes in `providerLinearWorkflowFacade.ts` and `linearCliShell.ts`
  - parent-owned race threading through `providerMergeCloseout.ts` for `In Review -> Merging` and `Merging -> Done`
  - parent-owned focused validation in `LinearCliShell.test.ts`, `ProviderLinearWorkflowFacade.test.ts`, and `ProviderMergeCloseout.test.ts`
- Constraints:
  - child lane remains docs-only; parent owns implementation, tests, docs-review, validation, Linear/workpad reconciliation, PR, and merge
  - preserve `CO-212` / `PR #507` reclaim behavior
  - keep `providerLinearWorkflowStates.ts` as the source of terminal/completed workflow type truth

## Issue-Shaping Contract
- User-request translation carried forward: this is a bounded `linear transition` race-safety lane that adds expected-state/CAS semantics, expected updated_at, terminal/completed workflow type guarding, `--force`, force reason, and richer audit output so stale `In Review -> Merging` or `Merging -> Done` callers cannot create a `Done -> Merging race` by accident.
- Protected terms / exact artifact and surface names:
  - `linear transition`
  - `expected-state/CAS semantics`
  - `expected updated_at`
  - `terminal/completed workflow type`
  - `Done -> Merging race`
  - `In Review -> Merging`
  - `Merging -> Done`
  - `--force`
  - `force reason`
  - `audit output`
  - `providerLinearWorkflowFacade.ts`
  - `linearCliShell.ts`
  - `providerLinearWorkflowStates.ts`
  - `providerMergeCloseout.ts`
  - `CO-212`
  - `PR #507`
- Nearby wrong interpretations to reject:
  - broad workflow-state redesign
  - weakening `providerMergeCloseout.ts` safety instead of guarding transition
  - turning mismatch into silent noop
  - adding `--force` without mandatory force reason and audit output
  - implementation or test edits from this child lane
- Explicit non-goals carried forward:
  - no reclaim-policy rewrite for `CO-212`
  - no merge-closeout redesign beyond threading the shared transition contract
  - no generic audit cleanup unrelated to transition mismatch or force reason

## Parity / Alignment Matrix
- Current truth:
  - `linearCliShell.ts` transition accepts only target `--state`
  - `providerLinearWorkflowFacade.ts` transition result exposes previous state, target state, action, and issue updated_at, but no expected-state/CAS semantics or expected updated_at inputs
  - `providerLinearWorkflowStates.ts` already classifies `done` and `state_type=completed` as terminal/completed workflow type
  - `providerMergeCloseout.ts` already performs `In Review -> Merging` and `Merging -> Done`, but both rely on the same target-only transition seam
  - transition audit output records success/failure, action, and resulting state, but not requested expectations, live mismatch data, `--force`, or force reason
- Reference truth:
  - one shared transition contract should guard stale writes regardless of caller
  - terminal/completed workflow type should remain authoritative at the workflow-state layer
  - forced overrides should be rare, explicit, and durable in audit output
- Target truth / intended delta:
  - transition callers can pass expected-state/CAS semantics and expected updated_at
  - terminal/completed workflow type and stale live-state mismatches fail closed by default
  - `In Review -> Merging` and `Merging -> Done` both thread the same race guard
  - `--force` requires explicit force reason and records that fact in audit output
  - stale `Done -> Merging race` attempts are blocked unless deliberately forced
- Explicitly out-of-scope differences:
  - changing reclaim logic from `CO-212` / `PR #507`
  - renaming or redefining workflow states
  - widening this lane into generic audit or CLI cleanup

## Readiness Gate
- Not done if:
  - `linear transition` still has no expected-state/CAS semantics or expected updated_at contract
  - stale `Done -> Merging race` writes can still happen without explicit `--force`
  - force path exists without force reason and richer audit output
  - `In Review -> Merging` and `Merging -> Done` still diverge in race-guard behavior
- Pre-implementation issue-quality review evidence:
  - 2026-04-17: child-lane review confirms the issue is not narrower than a CLI flag tweak. The protected wording requires one shared transition contract across `linearCliShell.ts`, `providerLinearWorkflowFacade.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts`, with explicit `Done -> Merging race` handling and parent-owned validation for `In Review -> Merging`, `Merging -> Done`, and force/audit behavior. The micro-task path is ineligible because correctness depends on exact naming, exact lifecycle surfaces, and exact audit semantics.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements
- Functional requirements:
  1. Create the docs-first packet and registry/checklist mirrors for `CO-215`.
  2. Extend `linear transition` so callers can provide expected-state/CAS semantics and expected updated_at in addition to target state.
  3. Fail closed when the live issue no longer matches the caller's expectations, including terminal/completed workflow type.
  4. Add explicit `--force` override support that requires a force reason.
  5. Extend audit output to capture expected-state/CAS semantics, expected updated_at, observed live state, observed live state type, observed updated_at, `--force`, and force reason.
  6. Thread the shared transition guard through `In Review -> Merging` in `providerMergeCloseout.ts`.
  7. Thread the same guard through `Merging -> Done` in `providerMergeCloseout.ts`.
  8. Preserve current success behavior when expectations still match and preserve `CO-212` reclaim behavior.
  9. Prevent stale `Done -> Merging race` writes by default.
- Non-functional requirements:
  - preserve additive CLI and audit evolution where possible
  - keep failure output machine-checkable
  - keep force usage rare and explicit
  - avoid broad workflow-state or merge-closeout redesign
- Interfaces / contracts:
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - transition audit output from `linearCliShell.ts`

## Architecture & Data
- Architecture / design adjustments:
  - keep terminal/completed workflow type ownership in `providerLinearWorkflowStates.ts`
  - enforce compare-and-set semantics in `providerLinearWorkflowFacade.ts`, where the actual refresh/write boundary already exists
  - let `linearCliShell.ts` surface the new inputs and serialize richer audit output
  - keep `providerMergeCloseout.ts` as a caller that threads expectations, not a second place that re-implements mismatch logic
- Data model changes / migrations:
  - additive transition result and audit output fields only
  - no workflow-state data migration expected
  - no change to reclaim artifacts from `CO-212`
- External dependencies / integrations:
  - parent-owned focused regression harness in `LinearCliShell.test.ts`, `ProviderLinearWorkflowFacade.test.ts`, and `ProviderMergeCloseout.test.ts`
  - parent-owned docs-review and post-patch validation

## Validation Plan
- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md .agent/task/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
  - focused `orchestrator/tests/LinearCliShell.test.ts`
  - focused `orchestrator/tests/ProviderMergeCloseout.test.ts`
  - parent-owned `node scripts/spec-guard.mjs --dry-run`
  - parent-owned docs-review or implementation gate after source edits
- Rollout verification:
  - parent records mismatch-path and force-path audit output artifacts
  - parent records focused race-case evidence for stale `Done -> Merging race`

## Open Questions
- Should expected updated_at be mandatory whenever expected-state/CAS semantics is used, or optional but strongly recommended?
- Should terminal/completed workflow type mismatches use a dedicated error code distinct from generic expected-state mismatch?
- Which audit output fields can be added without widening unrelated audit consumers beyond transition readers?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue-shaping contract.
- Date: 2026-04-17
