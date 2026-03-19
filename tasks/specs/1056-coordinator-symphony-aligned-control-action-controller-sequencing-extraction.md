---
id: 20260308-1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction
title: Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1056 Coordinator Symphony-Aligned Control Action Controller Sequencing Extraction

- Task ID: `1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`

## Summary

This slice extracts the remaining `/control/action` controller sequencing contract so the replay, confirmation-resolution, and execution-handoff branch logic no longer lives inline inside `controlServer.ts`.

## Scope

- Add a dedicated sequencing helper under `orchestrator/src/cli/control/`.
- Centralize replay short-circuit, confirmation-required, confirmation-resolution, and execute/finalize handoff decisions.
- Preserve controller-owned authority over persistence, publish, audit emission, and raw HTTP writes.

## Validation Expectations

- Direct helper coverage.
- Targeted `ControlServer` regressions.
- Manual mock sequencing artifact.
- Standard closeout validation lane.

## Review Notes

- 2026-03-08 top-level read-only review approved this as the next smallest seam after `1055`; evidence: `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.
- 2026-03-08 bounded `gpt-5.4` research corroborated the same seam and highlighted that Symphony should guide controller shape rather than literal mutating-surface parity; evidence: `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.
- 2026-03-08 docs-review wrapper passed the deterministic docs stages after an explicit registry-id override, then drifted into low-signal exploration and was overridden; evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T014345Z-docs-first/05-docs-review-override.md`.
- 2026-03-08 delegated correctness review found no functional defect in the sequencing helper extraction after targeted helper and `ControlServer` regression coverage; evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/00-summary.md`.
- 2026-03-08 standalone review wrapper cleared the stacked-branch diff-budget gate, then drifted into low-signal code inspection without surfacing an actionable correctness issue before manual termination; evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/09-review.log`, `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/13-override-notes.md`.
