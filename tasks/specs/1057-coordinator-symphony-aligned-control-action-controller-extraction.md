---
id: 20260308-1057-coordinator-symphony-aligned-control-action-controller-extraction
title: Coordinator Symphony-Aligned Control Action Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1057 Coordinator Symphony-Aligned Control Action Controller Extraction

- Task ID: `1057-coordinator-symphony-aligned-control-action-controller-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`

## Summary

This slice extracts the remaining `/control/action` route-local controller shell so `controlServer.ts` becomes route matching plus dependency wiring, while a dedicated controller module owns the orchestration across the already-extracted helpers.

## Scope

- Add a dedicated `/control/action` controller module under `orchestrator/src/cli/control/`.
- Centralize request-body handling, normalization/error mapping, tool/params derivation, sequencing invocation, and finalization-plan application orchestration there.
- Preserve explicit persistence, publish, audit, and HTTP write boundaries.

## Validation Expectations

- Direct controller coverage.
- Targeted `ControlServer` regressions.
- Standard docs-first plus closeout validation lanes.

## Review Notes

- 2026-03-08 local post-`1056` review identified the next smallest useful seam as the remaining `/control/action` route-local controller shell.
- 2026-03-08 delegated fast read-only selector corroborated that the next slice should be a standalone `/control/action` controller extraction and found no real-Symphony signal forcing a different direction.
