# TECH_SPEC - CO-374 archive Core Lane dispatch discovery break

---
id: 20260426-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f
title: "CO-374 archive Core Lane dispatch discovery break"
relates_to: docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md
related_prd: docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md
related_action_plan: docs/ACTION_PLAN-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md
risk: medium
owners:
  - Codex
last_review: 2026-04-26
---

## Summary
- Objective: stop archive Core Lane dispatch discovery from polling after one unambiguous post-baseline run id is found.
- Scope: `.github/workflows/archive-automation-base.yml`, focused archive workflow tests, and the CO-374 task packet.
- Constraints: preserve ambiguity failure, not-found retry behavior, `gh run watch`, and PR-visible commit-status mirroring.

## Issue-Shaping Contract
- User-request translation carried forward: fix the specific discovery loop delay in `Dispatch Core Lane for archive PR` after `RUN_ID` is known.
- Protected terms / exact artifact and surface names: `.github/workflows/archive-automation-base.yml`, `Dispatch Core Lane for archive PR`, `BASELINE_RUN_IDS`, `CANDIDATE_RUN_ID`, `RUN_ID`, `gh run watch`, `set_core_lane_status`, `Core Lane`.
- Nearby wrong interpretations to reject: first-match selection when multiple runs are visible, shortening the retry window before any id appears, replacing status mirroring, or changing archive PR dispatch inputs.
- Explicit non-goals carried forward: no `core-lane.yml` changes, no archive payload policy changes, no auto-merge token repair, no branch-protection changes.

## Parity / Alignment Matrix
- Current truth: `RUN_ID="${CANDIDATE_RUN_ID}"` is assigned inside `for attempt in $(seq 1 40)` but the loop continues to the `sleep 15` path until all attempts are exhausted.
- Reference truth: `find_dispatched_run_id` already returns non-zero for discovery failure and returns `2` for multiple new matching ids, so a non-empty candidate is safe to watch immediately.
- Target truth / intended delta: after assigning `RUN_ID`, the script breaks out of the discovery loop before the next `sleep 15`; if no id appears, the existing bounded retry and not-found status remain.
- Explicitly out-of-scope differences: broader Actions workflow dispatch semantics, archive auto-merge, branch protection, and status context naming.

## Readiness Gate
- Not done if: fixed delay remains after the run id is found, ambiguity can be silently ignored, or status mirroring is weakened.
- Pre-implementation issue-quality review evidence: Linear issue context confirmed `Ready`, no attached PR, `In Progress` as started state, and the issue description contained concrete run evidence and acceptance criteria.
- Safeguard ownership split: parent owns the workflow YAML and existing workflow spec reconciliation; child lane `dispatch-validation` owns the focused new test harness. Manifest: `.runs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f-dispatch-validation/cli/2026-04-25T17-50-15-458Z-21e3a1b5/manifest.json`.

## Technical Requirements
- Functional requirements:
  - keep the existing baseline/delta discovery strategy
  - keep `find_dispatched_run_id` returning failure on `gh run list` errors
  - keep `find_dispatched_run_id` returning ambiguity failure when more than one new id is visible
  - after `CANDIDATE_RUN_ID` is non-empty, assign `RUN_ID` and break before the next sleep
  - keep the existing not-found status when no id is discovered after all attempts
  - keep `gh run watch "${RUN_ID}"` and terminal conclusion status mirroring unchanged
- Non-functional requirements: minimal workflow diff, no new dependencies, deterministic local test coverage.
- Interfaces / contracts: the `Core Lane` commit status context and archive workflow environment variables remain unchanged.

## Architecture & Data
- Architecture / design adjustments: one shell-control-flow change in the discovery loop plus regression coverage around workflow script ordering.
- Data model changes / migrations: none.
- External dependencies / integrations: GitHub Actions and GitHub CLI behavior remain unchanged.

## Validation Plan
- Tests / checks:
  - `npx vitest run --config vitest.config.core.ts tests/archive-automation-workflow.spec.ts tests/archive-automation-core-lane-dispatch.spec.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review`
- Rollout verification: if an archive workflow run is used after merge, confirm dispatch proceeds to `gh run watch` shortly after a single new run id appears.
- Monitoring / alerts: GitHub Actions logs for archive automation dispatch and `Core Lane` status updates.

## Open Questions
- Whether a live archive PR workflow run will be available during this worker turn. A focused harness is acceptable per the issue acceptance criteria.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-26
