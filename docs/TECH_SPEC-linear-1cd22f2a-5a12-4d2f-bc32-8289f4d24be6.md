---
id: 20260411-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6
title: CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint
relates_to: docs/PRD-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- PRD: `docs/PRD-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- Task checklist: `tasks/tasks-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`

## Traceability
- Linear issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- Linear URL: https://linear.app/asabeko/issue/CO-128/co-recover-frontend-test-cli-from-pre-manifest-hang-under-ts-node
- Source issue: `CO-119` / `da009c42-d0fc-4834-be72-f977a778693c`

## Added by Bootstrap 2026-04-11

## Summary
- Objective: verify the stale CO-128 failure against the fresh rework branch and only change runtime code if current `origin/main` still reproduces it.
- Scope:
  - recreate the `CO-128` docs-first packet and mirrors after the Rework reset
  - run an audited `docs-review` child stream before implementation and again after the packet reflects fresh findings
  - reproduce the focused CLI hang in the direct entrypoint and the test harness on current `origin/main`
  - avoid runtime changes unless fresh current-main evidence still shows the original seam
- Constraints:
  - keep the lane limited to `frontend-test` CLI/test harness behavior
  - preserve the existing `frontend-testing` pipeline selection and runtime-sanitization behavior
  - do not mask the problem with timeout inflation or unrelated provider logic changes

## Technical Requirements
- Functional requirements:
  - `tests/cli-frontend-test.spec.ts` must complete without timing out on the fresh rework branch
  - direct `bin/codex-orchestrator.ts frontend-test --format json` repros under `node --loader ts-node/esm` must emit a manifest path and terminal status
  - if current `origin/main` already satisfies those surfaces, the lane must not invent a runtime patch
  - any runtime change applied later must still preserve non-orchestrator task-id validation behavior
- Non-functional requirements:
  - keep the fix deterministic and repo-local
  - avoid broad runtime/bootstrap churn beyond the failing seam
  - preserve the existing validation contract and auditability
- Interfaces / contracts:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/frontendTestCliShell.ts`
  - `orchestrator/src/cli/frontendTestCliRequestShell.ts`
  - `orchestrator/src/cli/frontendTestingRunner.ts`
  - `tests/cli-command-surface.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - isolate whether the hang still occurs in source-entry bootstrap, request shaping, runtime/config sanitization, or the handoff to the `frontend-testing` runner before any manifest is created
  - if the fresh branch does not reproduce the issue, preserve current code and close the lane with docs/workpad evidence instead of reviving the old runtime patch
  - preserve the current entrypoint behavior and task-id guard semantics if any future follow-up change is needed
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - `ts-node/esm`
  - `codex.orchestrator.json`
  - `CODEX_CLI_BIN`
  - focused runner fixture package root created by the test harness

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `npm run test -- tests/cli-frontend-test.spec.ts`
  - manual `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json` repro with a minimal fake `CODEX_CLI_BIN`
  - focused adjacent smoke only if the chosen seam needs it
  - repo validation and review handoff gates after implementation
- Rollout verification:
  - manifest-backed direct repro shows terminal completion instead of hanging pre-manifest
  - focused CLI suite remains green with no timeout inflation
- Monitoring / alerts:
  - rely on saved reproduction logs, manifest paths, and focused validation output

## Open Questions
- The unrelated `npm run test` failure is now tracked in `CO-150`; no additional CO-128 follow-up is needed unless the `frontend-test` seam regresses again.

## Approvals
- Reviewer: docs-review child stream passed cleanly on the refreshed packet; standalone review fallback recorded after wrapper boundary
- Date: 2026-04-11
