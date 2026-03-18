# PRD: Coordinator Symphony-Aligned Frontend-Test CLI Boundary Reassessment Revisit

## Summary

After the earlier `1272` frontend-test shell extraction, the current tree still leaves a broader binary-facing `frontend-test` wrapper in `bin/codex-orchestrator.ts`.

## Problem

`handleFrontendTest(...)` still appears to own more than thin parse/help glue:

- output format resolution
- `--devtools` request shaping
- runtime-mode resolution
- repo-config policy application
- extra-argument advisory
- task, parent-run, approval-policy, and target-stage shaping

If that broader wrapper-local request shaping is real, the local frontend-test freeze posture would be stale.

## Goal

Reinspect the current frontend-test boundary and record a truthful `go` or `freeze` result from the current tree.

## Non-Goals

- changing lower frontend-testing pipeline execution behavior
- reopening internal devtools pipeline behavior
- widening into unrelated CLI families

## Success Criteria

- the current frontend-test wrapper is reinspected and a truthful freeze-or-go result is recorded
- if `go`, the next bounded seam is named concretely with ownership boundaries
- if `freeze`, the closeout explains why no real local mixed-ownership seam remains
