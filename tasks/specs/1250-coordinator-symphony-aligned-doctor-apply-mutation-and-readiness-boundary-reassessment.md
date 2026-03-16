---
id: 20260316-1250-coordinator-symphony-aligned-doctor-apply-mutation-and-readiness-boundary-reassessment
title: Coordinator Symphony-Aligned Doctor Apply Mutation And Readiness Boundary Reassessment
status: active
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-doctor-apply-mutation-and-readiness-boundary-reassessment.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-doctor-apply-mutation-and-readiness-boundary-reassessment.md
related_tasks:
  - tasks/tasks-1250-coordinator-symphony-aligned-doctor-apply-mutation-and-readiness-boundary-reassessment.md
review_notes:
  - 2026-03-16: Opened after `1249` extracted the setup bootstrap shell. Local post-implementation inspection indicates that `handleDoctor(...)` is now the most credible remaining top-level CLI candidate, but it still mixes readiness/advisory output with `--apply` mutation through shared setup owners, so this lane starts as a reassessment rather than a forced extraction. Evidence: `out/1249-coordinator-symphony-aligned-setup-bootstrap-shell-extraction/manual/20260316T200645Z-closeout/14-next-slice-note.md`, `docs/findings/1250-doctor-apply-mutation-and-readiness-boundary-reassessment-deliberation.md`.
---

# Technical Specification

## Context

After the `setup` shell extraction, the top-level CLI surface is smaller, and the remaining doctor `--apply` block is the most plausible nearby candidate.

## Requirements

1. Reassess the doctor readiness plus `--apply` mutation boundary.
2. Decide whether the remaining surface is a truthful bounded seam or same-owner glue.
3. Keep the lane docs-only unless a concrete seam clearly exists.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the doctor boundary is explicitly classified as `go` or `freeze`
- `abort`: local evidence remains too ambiguous for a truthful classification
