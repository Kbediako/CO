---
id: 20260426-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7
title: "CO: split runtime fallback routing into explicit auto and strict modes"
relates_to: docs/PRD-linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

# TECH_SPEC - CO-381 split runtime fallback routing into explicit auto and strict modes

This mirror points to the canonical task spec at `tasks/specs/linear-9473c8b2-3fcb-48e6-8fd1-d3993dd3caa7.md`.

## Shared Runtime Fallback Policy Contract
- `auto`: fallback routing is allowed when the original runtime target is blocked. The selected fallback target and blocking reason must be recorded.
- `strict`: fallback routing is denied when the original runtime target is blocked. The run must fail before launching the fallback target, with an actionable blocking reason.
- Required fields across runtime fallback surfaces:
  - selected policy
  - policy source
  - original target
  - fallback target
  - blocking reason
- Existing `runtime_fallback` fields should remain readable for current consumers while parent implementation adds enough explicit policy truth to remove ambiguity.

## Likely Touched Surfaces
- `orchestrator/src/cli/runtime/types.ts`
- `orchestrator/src/cli/runtime/provider.ts`
- `orchestrator/src/cli/services/orchestratorExecutionRouteState.ts`
- `orchestrator/src/cli/services/orchestratorRuntimeManifestMutation.ts`
- `orchestrator/src/cli/services/orchestratorLocalRouteShell.ts`
- `orchestrator/src/cli/services/orchestratorCloudRouteFallbackContract.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- control-host/read-model projection helpers
- `bin/codex-orchestrator.ts`

## Validation Contract
- Child lane:
  - docs packet and `tasks/index.json` registration only
  - JSON parse check for `tasks/index.json`
  - scoped diff/status review
- Parent lane:
  - docs-review before implementation
  - focused runtime/provider/router tests for `auto` and `strict`
  - focused provider-worker/control-host projection tests
  - validation floor, standalone review, elegance review, and PR handoff

## Non-Goals
- No new runtime modes.
- No default runtime flip.
- No removal of CLI break-glass.
- No broad cloud fallback rewrite.
- No production source or test edits in this child lane.
