---
id: 20260405-linear-74d6e549-46cc-46be-9a61-76ae61b014f4
title: CO: Fix non-interactive npm run test quiet-tail / MessagePort hang
relates_to: docs/PRD-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`
- PRD: `docs/PRD-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`
- Task checklist: `tasks/tasks-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`

## Traceability
- Linear issue: `CO-84` / `74d6e549-46cc-46be-9a61-76ae61b014f4`
- Linear URL: https://linear.app/asabeko/issue/CO-84/co-fix-non-interactive-npm-run-test-quiet-tail-messageport-hang
- Source issue: `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- Related prior packet: `CO-69` / `dbddac50-c205-4402-a7a5-e2325a9c4373`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: preserve truthful terminal behavior for non-interactive provider-worker `npm run test` runs by proving the current head exits cleanly, classifying the quiet-tail `MessagePort` samples correctly, and surfacing bounded progress during the long final specs.
- Scope:
  - register the docs-first packet for `linear-74d6e549-46cc-46be-9a61-76ae61b014f4`
  - reproduce the current non-interactive quiet tail with auditable artifacts
  - classify the sampled `MessagePort`s against the suite's real post-tail behavior
  - land the minimum observability fix so worker lanes stop looking hung during long final specs
  - preserve coverage and truthful failure semantics
- Constraints:
  - no validation-bar reduction
  - no blanket force-exit workaround without explicit evidence
  - no broad unrelated suite refactor

## Technical Requirements
- Functional requirements:
  - deterministic reproduction exists for the worker-lane quiet tail
  - the sampled `MessagePort` or equivalent handles are classified truthfully
  - non-interactive `npm run test` exits terminally after the fix
  - non-interactive worker lanes emit bounded progress during the long final specs
  - focused regression coverage or equivalent proof guards the repaired seam
  - the workpad and packet record exact commands and outcomes
- Non-functional requirements (performance, reliability, security):
  - keep the fix bounded to the responsible owner
  - maintain full-suite coverage and truthful non-zero exits
  - keep evidence machine-checkable for review handoff
- Interfaces / contracts:
  - `package.json` `test` scripts
  - `vitest.config.core.ts`
  - the implicated tests/helpers and any worker-thread/subprocess teardown surfaces
  - provider-worker validation/review workflow

## Architecture & Data
- Architecture / design adjustments:
  - reproduce the current worker shape first, then inspect active handles and implicated tests/helpers
  - current-head control runs show the quiet tail lives in `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts` rather than a post-suite linger after `orchestrator/tests/CodexOrchestratorCli.test.ts`
  - widen the existing Vitest progress reporter gate for worker/non-interactive envs instead of adding a broader exit-policy change
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Vitest
  - Node worker-thread / `MessagePort` lifecycle
  - provider-worker validation runners

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - deterministic non-interactive reproduction with handle/owner evidence
  - focused regression validation for the fixed seam
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the affected worker command exits terminally in this workspace
  - confirm real failures still fail truthfully
  - refresh the Linear workpad after docs, reproduction, fix, and handoff readiness
- Monitoring / alerts:
  - rely on command logs, manifests, targeted evidence notes, and review telemetry

## Open Questions
- Should non-interactive progress reporting stay scoped to worker env flags on this lane, or expand to more general non-TTY runs in follow-up work?

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-05
