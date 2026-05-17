# Action Plan - CO workflow: refresh Apr 16 docs:freshness stale cohort blocking handoffs

## Traceability
- Linear issue: `CO-201` / `c101cb88-3097-4502-bcd7-723d80da7955`
- PRD: `docs/PRD-linear-c101cb88-3097-4502-bcd7-723d80da7955.md`
- TECH_SPEC: `tasks/specs/linear-c101cb88-3097-4502-bcd7-723d80da7955.md`
- Checklist: `tasks/tasks-linear-c101cb88-3097-4502-bcd7-723d80da7955.md`
- Workpad comment: `000ad4e1-b5de-44d3-afa2-863024494bb3`

## Milestones
1. Workflow setup
   - Read `linear issue-context`.
   - Move `Ready` to `In Progress`.
   - Create the single persistent workpad.
   - Record the required parallelization decision and launch the docs-scoped classification child lane.
2. Baseline reproduction
   - Run `node scripts/spec-guard.mjs`.
   - Run `npm run docs:freshness`.
   - Run `BASE_SHA=origin/main npm run docs:freshness:maintain`.
   - Save logs and JSON under `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/`.
3. Classification
   - Summarize stale rows by `last_review`, doc class, path family, task lineage, and CO-175 relationship.
   - Decide between refresh, archive, reclassify, or new owner path.
   - Record rationale in a finding/policy doc.
4. Implementation
   - Update only reviewed freshness metadata or the smaller truthful archive/reclassify surface.
   - Preserve CO-175 policy caps and rolling provenance.
   - Update docs-first mirrors, task checklist, and workpad.
5. Validation and review
   - Re-run the guard trio and save after artifacts.
   - Run required repo validation floor.
   - Run manifest-backed standalone review and explicit elegance pass.
   - Open/update PR, attach it to Linear, run `pr ready-review`, and hand off only after the drain is clean.

## Current Evidence
- `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/spec-guard.log`: Apr 16 `spec-guard` failure.
- `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness.json`: 192 blocking stale rows plus 221 CO-175 rolling rows.
- `out/linear-c101cb88-3097-4502-bcd7-723d80da7955/before/docs-freshness-maintenance.json`: `block_diff_local` and over-budget candidate capacity.

## Decision Rules
- Refresh is allowed only after classification confirms the stale rows remain truthful historical records.
- Archive is preferred only when the stale rows are already completed implementation docs and the repo archive policy cleanly covers them.
- Reclassify is allowed only when the current catalog class is wrong.
- New owner path is allowed only when direct repair is not truthful inside this lane.
- Increasing rolling caps or converting gates to warnings is out of scope.

## Validation Commands
- `node scripts/spec-guard.mjs`
- `npm run docs:freshness`
- `BASE_SHA=origin/main npm run docs:freshness:maintain`
- `node scripts/delegation-guard.mjs`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `FORCE_CODEX_REVIEW=1 npm run review`

## Handoff Notes
- Attach the PR before moving the issue to `In Review`.
- Keep the workpad current immediately before any review handoff.
- If review tooling hits a boundary failure, record classified telemetry and perform a manual correctness/regression/missing-tests review plus elegance checklist instead of stalling.
