# ACTION PLAN - CO workflow: add rolling docs:freshness cohort policy for Apr 14 stale baseline

## Summary
- Goal: keep `docs:freshness` truthful while preventing one-day-overdue repo-wide task/report cohorts from forcing unrelated feature lanes to refresh historical packets.
- Scope: CO-175 docs packet, rolling freshness policy docs/config, `docs-freshness` report behavior, focused tests, validation evidence, PR handoff.
- Assumptions: The Apr 14 stale baseline is exactly the reproduced `221` entry cohort unless a later rerun shows new drift.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `repo-wide freshness debt`
  - `per-PR diff health`
  - `date-boundary stale cohort`
  - `rolling freshness cohorts`
  - `machine-checkable evidence`
- Not done if:
  - the policy makes `docs:freshness` warning-only
  - rolling stale entries disappear from reports
  - non-task stale docs can pass
  - expired cohorts can pass
- Pre-implementation issue-quality review:
  - approved. The baseline report proves a coherent date-boundary cohort with no registry shape drift, and the issue explicitly calls for baseline ownership/policy rather than another feature-lane scope expansion.

## Milestones & Sequencing
1. Claim issue, create branch/workpad, reproduce and classify the baseline.
2. Register the docs-first packet in `tasks/index.json`, `docs/TASKS.md`, `.agent/task/`, and `docs/docs-freshness-registry.json`.
3. Run docs-review before implementation; if the child-stream wrapper fails closed on the known baseline, record a truthful fallback.
4. Add rolling freshness policy documentation and catalog config.
5. Update `scripts/docs-freshness.mjs` and focused tests.
6. Rerun required validation and save post-change report artifacts.
7. Run standalone review/elegance, open PR, attach it to Linear, drain automated feedback, and hand off to `In Review`.

## Dependencies
- Baseline artifacts under `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/`.
- Existing docs catalog and freshness registry surfaces.
- Linear CO-173 and CO-174 can cite this issue after policy evidence lands.

## Validation
- Checks / tests:
  - `tests/docs-freshness.spec.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance pass
- Rollback plan: remove the `rolling_freshness_cohorts` catalog policy and script/test changes; `docs:freshness` returns to strict stale blocking.

## Risks & Mitigations
- Risk: policy hides real docs drift.
  - Mitigation: restrict eligibility to task packet, task mirror, and report-only classes; keep missing/invalid/uncatalogued failures separate; fail expired or oversized cohorts.
- Risk: report consumers misread a green exit as no stale debt.
  - Mitigation: emit `rolling_cohort_entries` in totals, JSON, markdown, and console output.
- Risk: future lanes overuse the window.
  - Mitigation: bound by owner issue, window days, max cohorts, and max entries.

## Approvals
- Reviewer: pending docs-review / standalone review.
- Date: 2026-04-14
