---
id: 20260410-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0
title: CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces
relates_to: docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- PRD: `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
- Task checklist: `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`

## Summary
- Objective: land the `r4` CO-88 cleanup replay from fresh `origin/main` so dead truthfulness debt is removed without carrying stale `r3` handoff artifacts forward.
- Scope:
  - dead selected-run presenter/template/archive cleanup
  - truthful RLM model posture alignment
  - truthful design-system/design-reference and instruction wording
  - status UI static-bundle cleanup
  - SDK exec artifact lifetime fix
- Constraints:
  - no replay of unrelated changes from the closed prior attempt
  - no CO-82 / CO-83 scope
  - docs-review before implementation

## Boundary
- In scope:
  - `orchestrator/src/cli/control/`
  - uppercase `.agent/task/*_TEMPLATE.md`
  - `archives/`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `packages/orchestrator-status-ui/app.js`
  - `packages/sdk-node/src/orchestrator.ts`
  - `packages/sdk-node/tests/orchestrator.exec.test.ts`
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - `docs/README.md`
  - `tasks/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `.agent/task/design-reference-pipeline.md`
  - `.agent/task/hi-fi-design-toolkit.md`
  - `docs/design/specs/**`
  - `docs/design/PRD-design-reference-pipeline.md`
  - `docs/design/PRD-hi-fi-design-toolkit.md`
  - `docs/guides/ci-integration.md`
  - `packages/shared/streams/stdio.ts`
- Explicitly audit-only / retain-with-rationale candidates:
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `orchestrator/src/sync/**`
  - `orchestrator/src/cli/services/pipelineResolver.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - `orchestrator/src/types.ts`

## Design
- Remove truly dead surfaces instead of adding shims around them.
- Turn stale present-tense wording into explicit historical notes where deletion is not the right answer.
- Keep the SDK compatibility fix additive: preserve the existing fields while the associated handle/result is alive, and provide explicit cleanup semantics instead of a silent break.
- Keep retained compatibility seams narrowly justified in the spec packet instead of broadening code scope.

## Validation
- Run audited `linear child-stream --pipeline docs-review`.
- Perform focused tests around the SDK and touched truth surfaces.
- Validate the repo validation floor before review handoff.
- Run manifest-backed standalone review and an explicit elegance pass before any PR handoff.
