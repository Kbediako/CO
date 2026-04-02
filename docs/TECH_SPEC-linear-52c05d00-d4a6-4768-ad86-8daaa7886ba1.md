---
id: 20260402-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1
title: 'CO: Restore unrelated eval:test baseline failing TypeScript smoke harness'
relates_to: docs/PRD-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md
risk: high
owners:
  - Codex
last_review: 2026-04-02
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`
- PRD: `docs/PRD-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`
- Task checklist: `tasks/tasks-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`

## Traceability
- Linear issue: `CO-58` / `52c05d00-d4a6-4768-ad86-8daaa7886ba1`
- Linear URL: https://linear.app/asabeko/issue/CO-58/co-restore-unrelated-evaltest-baseline-failing-typescript-smoke

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: restore a truthful `npm run eval:test` baseline for the TypeScript smoke scenario failure separated from `CO-46`.
- Scope:
  - docs-first registration for the current Linear worker lane
  - live reproduction of the TypeScript smoke harness failure and exact goal statuses
  - minimal repair in the evaluation harness, scenario fixture, or direct runtime dependency seam
  - required validation, review, and workpad updates for handoff
- Constraints:
  - keep the lane bounded to the TypeScript smoke seam and direct dependencies
  - do not mask the failure by weakening assertions without reproducing the root cause
  - file a follow-up instead of widening into unrelated evaluation issues

## Technical Requirements
- Functional requirements:
  - reproduce the live `evaluation/tests/harness.test.ts` TypeScript smoke failure in this workspace
  - capture and record the exact goal statuses returned by the failing TypeScript smoke scenario
  - determine whether the owning seam is the evaluation harness, the scenario fixture, or another runtime dependency
  - implement the smallest truthful repair so `npm run eval:test` returns green, or record explicit blocker ownership if the lane cannot repair it
- Non-functional requirements:
  - keep the diff reviewable and auditable
  - preserve truthful scenario semantics and fixture behavior
  - keep docs, workpad, and validation evidence synchronized
- Interfaces / contracts:
  - evaluation harness contract: `evaluation/harness/index.ts`
  - scenario registration contract: `evaluation/scenarios/typescript-smoke.json`
  - smoke fixture contract: `evaluation/fixtures/typescript-smoke/**`
  - harness test contract: `evaluation/tests/harness.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - prefer fixture or command-surface corrections over broad harness changes when the harness is behaving correctly
  - if the harness is at fault, keep any behavioral fix narrowly targeted to the TypeScript smoke execution path or shared helper it depends on
  - preserve the ability to inspect per-goal status output during failure analysis
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - local Node/npm runtime used by the evaluation fixture scripts
  - repo Vitest harness and evaluation fixture copy-to-temp workflow

## Validation Plan
- Tests / checks:
  - audited child `docs-review` stream after the docs packet exists
  - focused TypeScript smoke reproduction via `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run eval:test`
  - targeted reruns or direct scenario probes needed to capture exact goal statuses
  - repo validation floor appropriate to the final diff, including `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run eval:test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, and wrapper-led `FORCE_CODEX_REVIEW=1 npm run review` for non-trivial diffs
- Rollout verification:
  - confirm the TypeScript smoke scenario returns all `passed` statuses
  - confirm `npm run eval:test` exits cleanly in this workspace
  - confirm the workpad and docs clearly identify the fixed seam or surviving blocker owner
- Monitoring / alerts:
  - keep the single Linear workpad current after docs, reproduction, implementation, and pre-handoff review

## Open Questions
- No open technical questions remain in the repair itself.
- Remaining operational question: PR attach, quiet-window drain, and review-state handoff are still pending after the validated implementation.

## Approvals
- Reviewer: docs-review clean-success captured; standalone review/elegance gates complete; PR handoff still pending
- Date: 2026-04-02
