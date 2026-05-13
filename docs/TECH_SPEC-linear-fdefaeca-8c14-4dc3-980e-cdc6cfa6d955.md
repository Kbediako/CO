---
id: 20260401-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955
title: CO: Stabilize implementation-gate when nested npm run test hangs after green tail
relates_to: docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md
risk: high
owners:
  - Codex
last_review: 2026-04-01
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`
- PRD: `docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`
- Task checklist: `tasks/tasks-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`

## Traceability
- Linear issue: `CO-57` / `fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- Linear URL: https://linear.app/asabeko/issue/CO-57/co-stabilize-implementation-gate-when-nested-npm-run-test-hangs-after

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: stabilize `implementation-gate` by keeping `manifest.json` heartbeat data current during long-running `npm run test` stages, so raw-manifest readers stop misclassifying active runs as stalled and provoking cleanup that degrades into a generic failure.
- Scope:
  - register the docs-first packet for `linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
  - reproduce the current implementation-gate symptom on the current tree and confirm the minimal owner
  - land the smallest lifecycle change that persists manifest heartbeats truthfully during active stages
  - add focused regression coverage and a concrete evidence note for the provider-worker reproduction
- Constraints:
  - keep the change bounded to the execution lifecycle heartbeat seam unless fresh evidence proves a different narrow owner
  - do not classify genuine red test output as success
  - do not quietly introduce a generic timeout kill with no classified outcome

## Technical Requirements
- Functional requirements:
  - `manifest.json` heartbeat data must advance during an active long-running `implementation-gate` `test` stage, not just the sidecar `.heartbeat` file
  - raw-manifest readers must be able to distinguish an active long-running `npm run test` command from a genuinely failing one without adding a new success reclassification path
  - the fix must preserve the existing command exit contract for real failures
  - regression coverage and an explicit evidence note must capture the provider-worker child-stream reproduction observed during `CO-56`
- Non-functional requirements (performance, reliability, security):
  - keep the fix deterministic and bounded to the current run only
  - preserve existing implementation-gate evidence quality in manifest and command logs
  - avoid widening into unrelated repo-wide validation or provider-worker workflow behavior
- Interfaces / contracts:
  - `codex.orchestrator.json` `implementation-gate` test stage
  - `package.json` `test` and `test:orchestrator` scripts
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - lifecycle regressions under `orchestrator/tests/**`

## Architecture & Data
- Architecture / design adjustments:
  - start from the gate-owned execution path: `implementation-gate` invokes `npm run test`, the execution lifecycle emits periodic heartbeats, and raw readers inspect `manifest.json` while the run is active
  - current-tree reproduction showed the run was still making progress after the late visible suites; the minimal owner is therefore heartbeat persistence, not command cleanup or special quiet-tail classification
  - persist `manifest.json` alongside the sidecar heartbeat on normal heartbeat intervals so operators who read only the manifest see current activity
  - preserve late-suite output and the existing command exit contract; no cleanup path or success reclassification is added in this lane
- Data model changes / migrations:
  - none expected; this lane stays in manifest, command-log, and telemetry shaping only
- External dependencies / integrations:
  - provider-worker `linear child-stream --pipeline implementation-gate`
  - nested `npm run test:orchestrator`
  - older reference packets `CO-24` and `1307` for historical narrowing only

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - current-tree reproduction of the late-suite / stale-manifest symptom
  - `npm run test:orchestrator -- orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`
  - dist-backed `implementation-gate` validation on the modified tree
- Rollout verification:
  - verify the same reproduction no longer looks stale in `manifest.json` while the `test` stage is still running
  - verify the validation run still reaches an ordinary successful terminal result
  - verify a genuinely failing test command would still report as failure because the fix does not alter command exit handling
- Monitoring / alerts:
  - rely on command logs, manifest status, and focused reproduction notes under the issue task id

## Open Questions
- None for this implementation. Any future true post-suite linger can reopen a narrower follow-up with fresh evidence.

## Approvals
- Reviewer: docs-review child stream recorded a model-capacity `failed-other`; manual docs review fallback accepted
- Status: implementation validated
- Date: 2026-04-01
