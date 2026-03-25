---
id: 20260325-linear-74d145eb-305b-4b27-be84-21c248b22e4d
title: CO Recalibrate Diff Budget for Stacked Lanes While Keeping Hard PR Scope Guard
relates_to: docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md
risk: high
owners:
  - Codex
last_review: 2026-03-25
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- PRD: `docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- Task checklist: `tasks/tasks-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`

## Traceability
- Linear issue: `CO-15` / `74d145eb-305b-4b27-be84-21c248b22e4d`
- Linear URL: https://linear.app/asabeko/issue/CO-15/co-recalibrate-diff-budget-for-stacked-lanes-while-keeping-hard-pr

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: preserve a hard diff-budget guard while making local stacked-lane behavior truthful and less override-heavy.
- Scope:
  - docs-first registration and workpad bootstrap for the current Linear worker issue
  - `scripts/diff-budget.mjs` scope recalibration for local working-tree versus explicit base/commit runs
  - any minimal workflow/doc updates needed to make CI and local contracts explicit
  - focused regressions covering stacked-lane auto mode and explicit hard-scope behavior
- Constraints:
  - do not weaken explicit PR/base or commit hard gating
  - keep aggregate stacked scope visible in output
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - explicit `--commit`, explicit `--base`, and CI-provided `BASE_SHA` / `DIFF_BUDGET_BASE` paths must remain hard-gated against the requested base/commit scope
  - default local working-tree runs must hard-gate the current reviewable head scope rather than always hard-gating the full `origin/main` aggregate branch delta
  - when the broad `origin/main` aggregate is larger than the current head scope because the branch is stacked, the script must still print that aggregate scope as advisory context instead of silently dropping it
  - default thresholds must align with the existing large-scope review policy where possible; at minimum the default line threshold must no longer lag the documented `1200`-line standard
  - operator-facing output must make the hard-gated scope versus advisory stacked scope obvious
- Non-functional requirements (performance, reliability, security):
  - keep git inspection narrow and deterministic
  - keep the output auditable enough for closeout logs and CI logs
  - preserve backward compatibility for ordinary single-lane local runs as much as possible
- Interfaces / contracts:
  - primary script contract: `scripts/diff-budget.mjs`
  - local workflow contract: `codex.orchestrator.json` `implementation-gate` and `scripts/run-review.ts`
  - CI contract: `.github/workflows/core-lane.yml`

## Architecture & Data
- Architecture / design adjustments:
  - introduce a diff-budget scope model that distinguishes explicit base/commit runs from local auto working-tree runs
  - in local auto working-tree mode, compute both the current-head scope and the broader base aggregate when possible, then hard-gate the current-head scope while reporting the broader aggregate as advisory when it is stack-inflated
  - keep explicit CI/base runs on the existing base-diff contract
- Data model changes / migrations:
  - none beyond diff-budget stdout/stderr contract and any environment flag used to make CI/local mode explicit
- External dependencies / integrations:
  - git history and working-tree status
  - closeout artifact logs under `out/**/08-diff-budget.log`
  - task docs and standalone review guide

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused regressions in `tests/diff-budget.spec.ts` plus any minimal workflow-facing assertions needed for explicit CI/local mode
  - required repo validation floor after implementation
- Rollout verification:
  - compare the new behavior against the recent focused versus broad stacked artifact evidence captured in the baseline audit
  - confirm that explicit base/commit runs still fail hard when they exceed the budget
  - confirm that stacked local auto runs surface advisory aggregate scope rather than forcing routine overrides
- Monitoring / alerts:
  - use the Linear workpad for operator-facing progress
  - use diff-budget logs and validation manifests as the primary closeout evidence

## Open Questions
- Whether the implementation should expose a new user-facing `--scope` flag, rely on an environment variable for explicit CI hard-base mode, or keep the smallest possible auto-detection plus explicit CI env. Choose the smallest truthful contract.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-74d145eb-305b-4b27-be84-21c248b22e4d/manual/20260325T070238Z-baseline-audit.md`
