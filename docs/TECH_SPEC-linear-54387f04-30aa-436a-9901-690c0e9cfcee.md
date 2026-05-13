---
id: 20260409-linear-54387f04-30aa-436a-9901-690c0e9cfcee
title: CO: Reduce Core Lane wall time by shrinking subprocess-heavy CLI and review suites without lowering validation coverage
relates_to: docs/PRD-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`
- PRD: `docs/PRD-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`
- Task checklist: `tasks/tasks-linear-54387f04-30aa-436a-9901-690c0e9cfcee.md`

## Traceability
- Linear issue: `CO-114` / `54387f04-30aa-436a-9901-690c0e9cfcee`
- Linear URL: https://linear.app/asabeko/issue/CO-114/co-reduce-core-lane-wall-time-by-shrinking-subprocess-heavy-cli-and

## Summary
- Objective: materially reduce the Core Lane `Test` wall-clock tail by redesigning the hot CLI and review-wrapper suites without lowering validation coverage.
- Scope:
  - move pure command-surface and review-wrapper contract assertions into faster in-process coverage where a real subprocess is unnecessary
  - preserve a bounded subprocess smoke matrix for end-to-end entrypoint confidence
  - reduce remaining subprocess startup cost by preferring a lighter shared or built harness over repeated cold `ts-node/esm` boots where possible
  - capture before/after timing evidence for the two hot suites and the full test-step proxy
- Constraints:
  - keep build/lint/spec/docs/pack-smoke guardrails
  - keep the optimization bounded to `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts` plus direct harness helpers

## Implementation Boundary
- Hot test suites:
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
- Product/runtime surfaces that may need importable seams:
  - `bin/codex-orchestrator.ts`
  - `scripts/run-review.ts`
- Optional helper surfaces:
  - extracted test harness modules under `tests/helpers/**`
  - shared subprocess entrypoint selectors if the remaining smoke layer needs them

## Design
- CLI command-surface strategy:
  - expose an importable entrypoint or equivalent shell-driving seam so pure help, flag-validation, and contract assertions can run in-process
  - keep a small subprocess smoke matrix that still exercises the real root CLI entrypoint
- Review-wrapper strategy:
  - expose an importable review-wrapper execution seam so contract assertions on arg handling, telemetry classification, and prompt transport no longer require a fresh subprocess
  - keep a bounded subprocess matrix for real wrapper boot and shell wiring confidence
- Subprocess optimization:
  - for smoke tests that still need a subprocess, avoid per-case `node --loader ts-node/esm` cold boot when built JS or a shared harness can preserve the same contract
- Coverage guardrail:
  - every removed subprocess assertion must map to equivalent or stronger in-process coverage, with the smoke layer preserving real entrypoint behavior

## Validation
- Focused before/after timings for:
  - `tests/cli-command-surface.spec.ts`
  - `tests/run-review.spec.ts`
- Full test-step proxy timing:
  - `npm run test` before/after comparison, plus the issue’s recorded GitHub Core Lane baseline
- Required repo floor before review handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run eval:test` when `evaluation/fixtures/**` is in scope for the touched lane
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` or truthful manual fallback
  - `npm run pack:smoke` if downstream-facing CLI/review surfaces remain touched

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-09
- Manifest: `.runs/linear-54387f04-30aa-436a-9901-690c0e9cfcee-co-114-docs-review/cli/2026-04-09T04-29-36-631Z-60ef7624/manifest.json`
