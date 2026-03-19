# PRD: Coordinator Symphony-Aligned Frontend-Test CLI Request Shell Extraction

## Summary

After `1297` confirmed that `handleFrontendTest(...)` still owns a real binary-facing request-shaping seam, the next truthful nearby move is a bounded frontend-test request-shell extraction.

## Problem

`handleFrontendTest(...)` still owns wrapper-local request shaping above `orchestrator/src/cli/frontendTestCliShell.ts`:

- output format resolution
- `--devtools` request shaping
- runtime-mode resolution
- repo-config policy application
- extra-argument advisory
- task, parent-run, approval-policy, and target-stage shaping

Leaving that logic inline keeps the binary-facing wrapper broader than the surrounding Symphony-aligned shells.

## Goal

Extract a frontend-test request shell that owns the remaining binary-facing request shaping while leaving parse/help ownership in `bin/codex-orchestrator.ts` and preserving lower frontend-testing execution in `orchestrator/src/cli/frontendTestCliShell.ts`.

## Non-Goals

- changing the frontend-testing pipeline id or runtime behavior
- widening into lower devtools env handling already owned by `orchestrator/src/cli/frontendTestCliShell.ts`
- refactoring unrelated CLI families

## Success Criteria

- a new bounded frontend-test request shell owns the remaining request shaping
- `bin/codex-orchestrator.ts` keeps only thin parse/help plus handoff ownership for `frontend-test`
- focused parity covers the extracted request shell and existing frontend-test CLI behavior
