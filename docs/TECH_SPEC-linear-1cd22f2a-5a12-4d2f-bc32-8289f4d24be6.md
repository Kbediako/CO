---
id: 20260410-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6
title: CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint
relates_to: docs/PRD-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
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

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore deterministic `frontend-test` CLI startup under `node --loader ts-node/esm` so the command reaches manifest creation and terminal completion again.
- Scope:
  - register the `CO-128` docs-first packet and mirrors
  - run an audited `docs-review` child stream before implementation
  - reproduce the focused CLI hang in the direct entrypoint and the test harness
  - fix the pre-manifest startup seam with focused regressions and manual repro evidence
- Constraints:
  - keep the lane limited to `frontend-test` CLI/test harness behavior
  - preserve the existing `frontend-testing` pipeline selection and runtime-sanitization behavior
  - do not mask the problem with timeout inflation or unrelated provider logic changes

## Technical Requirements
- Functional requirements:
  - `tests/cli-frontend-test.spec.ts` must complete without timing out
  - direct `bin/codex-orchestrator.ts frontend-test --format json` repros under `node --loader ts-node/esm` must emit a manifest path and terminal status
  - the fix must identify and address a pre-manifest startup seam, not only downstream runner behavior
  - the `frontend-testing` pipeline and runtime sanitization contract must remain intact
- Non-functional requirements (performance, reliability, security):
  - keep the fix deterministic and repo-local
  - avoid broad runtime/bootstrap churn beyond the failing seam
  - preserve the existing validation contract and auditability
- Interfaces / contracts:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/frontendTestCliShell.ts`
  - `orchestrator/src/cli/frontendTestCliRequestShell.ts`
  - `orchestrator/src/cli/frontendTestingRunner.ts`

## Architecture & Data
- Architecture / design adjustments:
  - isolate whether the hang occurs in request shaping, runtime/config sanitization, or the handoff to the `frontend-testing` command runner before any manifest is created
  - fix only the startup seam that blocks manifest creation and keep the downstream runner contract unchanged unless the reproduction proves otherwise
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
- Rollout verification:
  - manifest-backed direct repro shows terminal completion instead of hanging pre-manifest
  - focused CLI suite remains green with no timeout inflation
- Monitoring / alerts:
  - rely on saved reproduction logs, manifest paths, and focused validation output

## Open Questions
- Whether the root cause is `ts-node/esm` source-entry loading order or environment/config bootstrap performed before the command-runner handoff.

## Approvals
- Reviewer: pending docs-review child stream
- Date: 2026-04-10
