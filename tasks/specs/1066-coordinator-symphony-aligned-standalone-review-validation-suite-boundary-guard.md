---
id: 20260308-1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard
title: Coordinator Symphony-Aligned Standalone Review Validation-Suite Boundary Guard
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1066 Coordinator Symphony-Aligned Standalone Review Validation-Suite Boundary Guard

- Task ID: `1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard.md`

## Summary

- Promote explicit package-manager validation suites into the bounded review command-intent failure path.
- Preserve `ReviewExecutionState` as the one runtime authority and keep `scripts/run-review.ts` thin.
- Keep `CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1` as the explicit escape hatch for intentionally broader review sessions.

## Review Approval

- 2026-03-08: Approved for implementation after local docs-first review plus delegated read-only diagnosis established that the next smallest reliability fix after `1065` is a validation-suite boundary guard, not a broader review-wrapper rewrite or another controller extraction. Evidence: `docs/findings/1066-standalone-review-validation-suite-boundary-guard-deliberation.md`.
