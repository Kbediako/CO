---
id: 20260305-1006-task-index-canonicalization-and-registry-normalization
title: Task Index Canonicalization + Registry Normalization
relates_to: docs/PRD-task-index-canonicalization-and-registry-normalization.md
risk: medium
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: normalize task registry contract to canonical `items[]` and retire legacy split-state safely.
- Scope: docs-first definition + validation gate for implementation handoff.
- Scope status: completed; implementation and mirror-sync closeout validation reached terminal pass.

## Pre-Implementation Review Note
- Decision: approved for implementation planning handoff after docs-review gate passes.
- Reasoning: split-state registry can produce drift/ambiguity; migration requires explicit constraints and bounded scope.
- Constraint: no unrelated refactors.

## Technical Requirements
- Functional:
  - Canonical contract for task registry is top-level `items[]`.
  - Legacy top-level `tasks[]` is retired via safe migration path.
  - Affected docs/tooling references are aligned to canonical contract.
- Non-functional:
  - Preserve guardrail behavior and task-id normalization assumptions.
  - Keep migration minimal and auditable.

## Docs Lane Validation Evidence
- Docs-review manifest: `.runs/1006-task-index-canonicalization-and-registry-normalization/cli/2026-03-05T10-29-59-282Z-375092f4/manifest.json`.
- Docs checks: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/11-docs-check-final.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/12-docs-freshness-final.log`.
- Standalone review checkpoint: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/07-standalone-review.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/08-standalone-review-checkpoint.md`.
- Elegance note: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/09-elegance-note.md`.
- Handoff note: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/10-implementation-handoff-note.md`.
- Optional rerun disposition: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/15-docs-review-rerun-disposition.md`.

## Terminal Closeout Validation Evidence
- Closeout summary: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-terminal-closeout-summary.md`.
- Gate matrix + index: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-gate-matrix.tsv`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-log-index.md`.
- Override records (shared-checkout only): `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/08-diff-budget.attempt2-override.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/09-review.attempt2-override.log`.
- Post-sync docs checks + mirror parity: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/12-docs-check-post-sync.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/13-docs-freshness-post-sync.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/14-task-agent-mirror-parity.diff`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
