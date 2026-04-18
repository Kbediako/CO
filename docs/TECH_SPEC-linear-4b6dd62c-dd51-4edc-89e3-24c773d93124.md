---
id: 20260418-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124
title: CO: eliminate residual startup-anchor standalone-review failures that still force manual fallback after CO-173
relates_to: docs/PRD-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---
## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- PRD: `docs/PRD-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- Task checklist: `tasks/tasks-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`

## Traceability
- Linear issue: `CO-242` / `4b6dd62c-dd51-4edc-89e3-24c773d93124`
- Linear URL: https://linear.app/asabeko/issue/CO-242/co-eliminate-residual-startup-anchor-standalone-review-failures-that

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: eliminate the residual post-`CO-173` standalone-review wrapper seam where healthy runs still terminate as `failed-boundary` / `startup-anchor` / `pre-anchor-meta-surface` before a useful startup anchor is observed.
- Scope:
  - docs-first packet and one persistent Linear workpad for `CO-242`
  - fresh local evidence sample for the current failure family
  - bounded implementation in the startup-anchor / pre-anchor meta-surface seam
  - focused regressions for the touched wrapper surfaces
  - before/after telemetry evidence and normal validation/review handoff
- Constraints:
  - keep the lane separate from the older `CO-173` command-intent retry work
  - preserve truthful `failed-boundary` telemetry and manual-fallback accounting
  - do not broaden into generic docs:freshness, prompt transport, or review-wrapper redesign

## Technical Requirements
- Functional requirements:
  - reproduce the live post-`CO-173` startup-anchor boundary with a fresh evidence sample
  - identify whether the residual seam is startup-anchor classification, pre-anchor meta-surface allowlist parity, or startup-anchor promotion timing
  - land the smallest change that reduces routine `startup-anchor` / `pre-anchor-meta-surface` failures for healthy lanes
  - keep `command-intent`, `meta-surface-expansion`, and later dwell-boundary classification distinct
- Non-functional requirements (performance, reliability, security):
  - preserve current telemetry schema and operator-visible boundary messaging
  - keep the fix deterministic and local to repo/workspace evidence
  - avoid weakening guardrails just to improve pass rate
- Interfaces / contracts:
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-runtime.ts`
  - `scripts/lib/review-execution-telemetry.ts`
  - `scripts/lib/review-meta-surface-normalization.ts`
  - `scripts/lib/review-execution-boundary-preflight.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/run-review.spec.ts`
  - `.runs/**/review/telemetry.json`

## Architecture & Data
- Architecture / design adjustments:
  - keep startup-anchor enforcement in the current wrapper architecture, but narrow the residual pre-anchor meta-surface seam so nearby allowed support reads do not trip the boundary prematurely in healthy lanes
  - preserve the existing telemetry projection path from execution state -> runtime -> telemetry writer -> command-runner closeout
  - keep any support-family or allowlist update explicit and bounded rather than silently broadening generic startup reads
- Data model changes / migrations:
  - none expected; telemetry output remains structurally compatible
- External dependencies / integrations:
  - local `.runs/**/review/telemetry.json` evidence
  - `orchestrator/src/cli/services/commandRunner.ts` closeout surfaces
  - existing review wrapper commands (`npm run review`, `codex-orchestrator review`)

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused review-wrapper tests for the touched startup-anchor seam in `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts`
  - fresh evidence sample from local `review/telemetry.json` artifacts before and after the fix
  - full repo validation floor if the final diff is non-trivial
- Rollout verification:
  - compare fresh pre-fix and post-fix startup-anchor evidence
  - confirm the remaining failures, if any, still report truthful boundary kind/provenance
  - confirm adjacent boundary families do not regress
- Monitoring / alerts:
  - rely on local `.runs/**/review/telemetry.json` samples, focused tests, and workpad evidence

## Open Questions
- Does the smallest truthful fix live entirely in startup-anchor classification / allowlist parity, or does the residual recurrence require a bounded startup-anchor promotion adjustment once nearby support reads occur before touched-path inspection?

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-18
