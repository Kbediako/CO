# Task Checklist - linear-ebb62cc0-77d0-41e4-8640-abbd5126cced

- Linear Issue: `CO-34` / `ebb62cc0-77d0-41e4-8640-abbd5126cced`
- MCP Task ID: `linear-ebb62cc0-77d0-41e4-8640-abbd5126cced`
- Primary PRD: `docs/PRD-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`
- TECH_SPEC: `tasks/specs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`

## Docs-First
- [x] PRD drafted for the tracked-issue reread rate-limit lane. Evidence: `docs/PRD-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`.
- [x] TECH_SPEC drafted with the bounded reread repair path, proof surfacing plan, and pacing semantics. Evidence: `tasks/specs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`, `docs/TECH_SPEC-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new task packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`. Evidence: `.agent/task/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md`.
- [x] Standalone pre-implementation review approval captured in spec notes. Evidence: `tasks/specs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md` `review_notes`.
- [x] docs-review approval captured for `linear-ebb62cc0-77d0-41e4-8640-abbd5126cced`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced-docs-review/cli/2026-03-29T11-31-24-681Z-749a0ed3/manifest.json` (wrapper parse bug noted in `tasks/specs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md` `review_notes`).

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-34`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `e6625927-66c4-4f8f-a3ac-ba7fc595830e`.

## Implementation
- [ ] Smallest responsible fix landed for the tracked-issue reread seam only. Evidence: pending.
- [ ] Provider-worker proof distinguishes tracked-issue rate limits from generic reread failures. Evidence: pending.
- [ ] Focused regressions added or updated for by-id rate limits and worker post-turn rereads. Evidence: pending.
- [ ] Docs capture the Linear header/reset semantics used for classification and pacing. Evidence: pending final doc refresh.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] Focused tracked-issue rate-limit regression commands. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-ebb62cc0-77d0-41e4-8640-abbd5126cced npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: pending final diff assessment.
- [ ] Explicit elegance review recorded before review handoff. Evidence: pending.

## Handoff
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.

## Freshness Review
- 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
