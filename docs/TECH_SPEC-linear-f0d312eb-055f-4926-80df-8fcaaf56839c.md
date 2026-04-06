---
id: 20260406-linear-f0d312eb-055f-4926-80df-8fcaaf56839c
title: CO workflow: unblock repo-wide spec/docs freshness review blockers
relates_to: docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md
risk: high
owners:
  - Codex
last_review: 2026-04-06
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- PRD: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- Task checklist: `tasks/tasks-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`

## Traceability
- Linear issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- Linear URL: https://linear.app/asabeko/issue/CO-102/co-workflow-unblock-repo-wide-specdocs-freshness-review-blockers
- Source issue: `CO-99` / `7f1931f8-cfd0-4698-951e-df1c3984a337`
- Source PR: `#368` / `https://github.com/Kbediako/CO/pull/368`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: remove the repo-wide stale docs/spec blocker cohort so clean-branch `Spec guard` and `docs:freshness` validation no longer block unrelated review handoffs.
- Scope:
  - register the docs-first packet for `linear-f0d312eb-055f-4926-80df-8fcaaf56839c`
  - audit the exact stale surfaces behind `node scripts/spec-guard.mjs --dry-run` and `npm run docs:freshness`
  - refresh or otherwise reconcile the stale docs/spec cohort with minimal truthful edits
  - record the exact refreshed/reconciled surfaces and command evidence in the packet and workpad
- Constraints:
  - no weakening of `Spec guard` or `docs:freshness`
  - no CO-99 runtime telemetry changes
  - no unrelated repo refactors

## Execution Update 2026-04-06
- Baseline stale inventory split cleanly into two cohorts:
  - `Spec guard`: task specs `1001` and `1009`-`1031`, all stale only because `last_review` was still `2026-03-06`.
  - `docs:freshness`: a separate `stale docs: 19` registry cohort rooted in `.agent/SOPs/instruction-stamps.md` plus the `0932`-`0934` PRD/TECH_SPEC/ACTION_PLAN/task/mirror family.
- The fix stayed at the source: refresh the exact stale task-spec `last_review` frontmatter plus the exact stale registry entries in `docs/docs-freshness-registry.json`.
- Post-fix validation is green on `spec-guard --dry-run`, `docs:freshness`, `docs:check`, `build`, `lint`, `test`, and the rerun audited `docs-review` child stream at `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c-co-102-docs-review/cli/2026-04-06T03-20-19-962Z-29dd089f/manifest.json`.

## Technical Requirements
- Functional requirements:
  - identify the exact stale task/spec packet cohort currently blocking the freshness gates
  - refresh or reconcile every stale surface necessary for clean `spec-guard --dry-run` and `docs:freshness` results
  - preserve the current freshness enforcement and registry semantics
  - keep task packet, task mirror, and workpad evidence current through handoff
- Non-functional requirements (performance, reliability, security):
  - keep the edit set bounded to the stale blocker surfaces and their required mirrors
  - use machine-checkable command output for the stale-surface inventory and final validation
  - avoid speculative claims about repo-wide health without rerunning the guards
- Interfaces / contracts:
  - `scripts/spec-guard.mjs`
  - `scripts/docs-freshness.mjs`
  - `tasks/specs/**`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Architecture & Data
- Architecture / design adjustments:
  - treat this as a documentation and registry hygiene lane, not an implementation or runtime-behavior lane
  - refresh `last_review` only where the packet still represents current truth; archive or otherwise reconcile only if a surface is no longer meant to stay active
  - update the packet mirrors in the same change set so freshness remains self-consistent
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Linear packaged helper for workpad/state continuity
  - repo-local docs/spec freshness scripts

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness`
  - required repo validation floor if any non-doc surfaces are touched
- Rollout verification:
  - capture the stale baseline before edits
  - capture the clean terminal output after refresh/reconciliation
  - refresh the Linear workpad after packet bootstrap, stale-surface reconciliation, and final validation
- Monitoring / alerts:
  - rely on the freshness guard output plus task packet evidence

## Open Questions
- None. The additional `docs:freshness` stale surfaces were the separate 19-entry registry cohort already reconciled in this lane.

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-06
