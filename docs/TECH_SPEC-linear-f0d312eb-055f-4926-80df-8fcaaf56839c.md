---
id: 20260406-linear-f0d312eb-055f-4926-80df-8fcaaf56839c
title: CO workflow: stop repo-wide docs baseline regressions from forcing manual fallback in unrelated lanes
relates_to: docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- PRD: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- Task checklist: `tasks/tasks-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`

## Traceability
- Linear issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- Linear URL: https://linear.app/asabeko/issue/CO-102/co-workflow-stop-repo-wide-docs-baseline-regressions-from-forcing
- Prior attempt: merged PR `#370`

## Summary
- Objective: prevent the repo-wide docs baseline from relapsing into unrelated-lane manual fallback by fixing the archive-eligibility seam behind the current `docs:freshness` failure.
- Scope:
  - refresh the reopened `CO-102` docs-first packet and workpad
  - capture the current baseline (`spec-guard` green, `docs:check` green, `docs:freshness` red on `282` stale docs)
  - patch `scripts/implementation-docs-archive.mjs` so completed task packets using the current `tasks/index.json` completion vocabulary become archive candidates
  - add focused regression coverage and reconcile any residual truly-active stale docs
  - record the repaired baseline and prevention seam in the packet/workpad
- Constraints:
  - no review-policy weakening
  - no broad archive-policy redesign beyond the minimum truthful fix
  - no unrelated runtime or review-wrapper scope

## Execution Update 2026-04-09
- Current main no longer reproduces the April 6 stale-spec cohort. Today:
  - `node scripts/spec-guard.mjs --dry-run`: `OK`
  - `npm run docs:check`: `OK`
  - `npm run docs:freshness`: `FAILED` with `282` stale docs
- Archive automation is succeeding but ineffective:
  - GitHub Actions `Implementation Docs Archive Automation` succeeded on 2026-04-08
  - local `node scripts/implementation-docs-archive.mjs --dry-run` also archived `0` docs
- Root cause:
  - `scripts/implementation-docs-archive.mjs` currently requires `status === "succeeded"` plus `completed_at`
  - `tasks/index.json` now records 59 completed items as `status: "completed"` with `completed_at` and `gate.status: "succeeded"`
  - completed packets therefore stay `active` in `docs/docs-freshness-registry.json` and age into the shared stale baseline

## Technical Requirements
- Functional requirements:
  - capture the current docs-baseline recurrence with machine-checkable evidence
  - make implementation-doc archive selection compatible with the current completed-task status vocabulary
  - restore a truthful green `docs:freshness` baseline without weakening policy
  - preserve `spec-guard` and `docs:check` green status while the fix lands
  - keep packet/workpad evidence aligned with the reopened scope
- Non-functional requirements:
  - keep the implementation change narrowly scoped to archive eligibility and directly-related tests/docs
  - fail closed on ambiguous archive eligibility
  - avoid speculative claims about residual stale docs before rerunning the baseline after the fix
- Interfaces / contracts:
  - `scripts/implementation-docs-archive.mjs`
  - `tests/implementation-docs-archive.spec.ts`
  - `scripts/docs-freshness.mjs`
  - `docs/implementation-docs-archive-policy.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`

## Architecture & Data
- Architecture / design adjustments:
  - treat this lane as a baseline-prevention fix in the archive-selection path, not in the docs-freshness reporter
  - use `completed_at` plus the current completion vocabulary as the archive-selection seam, rather than assuming one legacy status string forever
  - after the code fix, prefer the existing archive policy for completed docs and only do explicit active-doc refreshes for any residual live docs
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Linear packaged helper for issue/workpad continuity
  - GitHub Actions implementation-docs archive automation

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/implementation-docs-archive.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - standalone review and elegance review before handoff
- Rollout verification:
  - capture the current failing baseline
  - capture the post-fix archive dry-run behavior
  - capture the final green baseline or the explicit residual split if a follow-up is required
- Monitoring / alerts:
  - rely on the archive automation workflow, archive dry-run output, and docs-freshness report

## Open Questions
- After the archive-eligibility fix, which stale docs remain active and need explicit review versus a same-project follow-up?

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-09
