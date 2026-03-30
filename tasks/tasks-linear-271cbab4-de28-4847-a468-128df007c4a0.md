# Task Checklist - linear-271cbab4-de28-4847-a468-128df007c4a0

- Linear Issue: `CO-35` / `271cbab4-de28-4847-a468-128df007c4a0`
- MCP Task ID: `linear-271cbab4-de28-4847-a468-128df007c4a0`
- Primary PRD: `docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- TECH_SPEC: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-271cbab4-de28-4847-a468-128df007c4a0.md`

## Docs-First
- [x] PRD drafted for the parent-owned same-issue multi-worker runtime lane. Evidence: `docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] TECH_SPEC drafted for the same-issue child-lane runtime, parent-only mutation guard, and nested observability path. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`, `docs/TECH_SPEC-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, runtime proof, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-271cbab4-de28-4847-a468-128df007c4a0.md`. Evidence: `.agent/task/linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md` `review_notes`.
- [x] `docs/TASKS.md` line-budget fallback was handled with the repo-sanctioned archive workflow. Evidence: `npm run docs:archive-tasks`, `out/linear-271cbab4-de28-4847-a468-128df007c4a0/TASKS-archive-2026.md`.
- [ ] docs-review approval captured for `linear-271cbab4-de28-4847-a468-128df007c4a0`. Evidence: pending.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-35`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `84cae2cc-c87c-41ed-9efe-1cc65d9ecdb2`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on `origin/main`. Evidence: `linear/co-35-parent-owned-same-issue-multi-worker-runtime`.

## Investigation
- [x] Required `CO-13` and `CO-14` baseline docs plus runtime seams were reviewed before implementation. Evidence: `docs/TECH_SPEC-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`, `docs/TECH_SPEC-linear-62527426-2f74-4134-98e0-bb50c3da7913.md`, `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] The current bounded child-stream seam was narrowed as insufficient for real same-issue worker lanes because it lacks coding scope ownership, stale invalidation, and parent-only Linear mutation enforcement. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md` `review_notes`.
- [x] The implementation boundary is explicit and bounded: extend parent-owned lineage, workspace, and proof truth instead of replacing the existing control-host plus provider-worker ownership seam. Evidence: `docs/TECH_SPEC-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.

## Implementation
- [ ] Parent `provider-linear-worker` can launch more than one subordinate same-issue child lane with `<parent-task-id>-<stream>` identity and `parent_run_id` lineage. Evidence: pending.
- [ ] Subordinate lanes require declared purpose plus explicit file-scope or phase-scope ownership. Evidence: pending.
- [ ] Overlapping unresolved scopes are rejected or otherwise serialized by the parent contract. Evidence: pending.
- [ ] Subordinate output can be accepted, rejected, rerun, or invalidated when stale. Evidence: pending.
- [ ] Parent-only Linear mutation enforcement blocks subordinate same-issue lanes from mutating workpad, issue state, PR attachment, or review handoffs. Evidence: pending.
- [ ] Parent proof and read-side observability surface nested `child_lanes` without surfacing subordinate runs as peer issue owners. Evidence: pending.
- [ ] Real runtime proof for this lane shows more than one subordinate same-issue lane under one truthful parent issue run. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-35-docs-review --format json`. Evidence: pending.
- [ ] Focused child-lane and provider runtime regression command(s). Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run pack:smoke`. Evidence: pending.
- [ ] Explicit elegance review recorded before any review handoff. Evidence: pending.

## Handoff
- [ ] Workpad refreshed after docs-review, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved only to the correct live review state when coding stops, or kept active until handoff prerequisites are complete. Evidence: pending.
