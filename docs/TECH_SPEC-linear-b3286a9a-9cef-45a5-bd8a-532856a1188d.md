---
id: 20260412-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d
title: CO: harden run-review direct-exec symlink handling without regressing subprocess harnesses
relates_to: docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- PRD: `docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- Task checklist: `tasks/tasks-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`

## Summary
- Objective: prove the current supported `run-review` launch surface and land the bounded direct-exec hardening for the reproduced symlink seam on current `main`.
- Scope:
  - `scripts/run-review.ts`
  - `dist/scripts/run-review.js`
  - `tests/run-review.spec.ts`
  - `package.json`
  - `orchestrator/src/cli/reviewCliLaunchShell.ts`
  - `orchestrator/tests/ReviewCliLaunchShell.test.ts`
- Constraints:
  - no `bin/codex-orchestrator.ts` edits
  - no timeout inflation or subprocess-harness weakening
  - docs-review plus standalone review/elegance before any new PR handoff

## Boundary
- Parent-owned reset and implementation surfaces:
  - docs packet, task mirrors, and the single workpad source
  - the direct-exec seam in `scripts/run-review.ts`
  - focused launcher/test surfaces named above
- Delegated surface planned after packet draft:
  - audited `docs-review` child stream for the refreshed packet, completed with clean review telemetry before handoff
- No same-issue child lane during the reset turn:
  - the Rework reset requires parent-owned branch/workpad mutation first, so the turn-level parallelization decision is `forbid_parallel` / `parent_only_mutation`

## Design
- Prove the actual supported repo-local and packaged entrypoints from `package.json`, launcher code, docs, and direct runtime behavior under `NODE_OPTIONS=--preserve-symlinks-main`.
- Keep the product-surface docs truthful: there is still no installed standalone `run-review` bin.
- Harden `scripts/run-review.ts` `isDirectExecution(...)` to accept both resolved and realpath entry URLs, which fixes the reproduced same-directory symlink direct-exec gap for the existing source/dist helper surfaces.
- Keep the existing `does not crash when stdout pipe closes early` regression intact, and use focused coverage for the direct-exec seam instead of widening heavy subprocess coverage unnecessarily.

## Validation
- Run audited `linear child-stream --pipeline docs-review`.
- Run focused direct-exec and launcher coverage for the seam under investigation.
- Re-run the existing subprocess regression coverage that proves `stdout pipe closes early` stays truthful.
- Run the repo validation floor, then standalone review followed by elegance review before any new PR handoff.
