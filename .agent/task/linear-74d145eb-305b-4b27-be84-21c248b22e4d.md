# Task Checklist - linear-74d145eb-305b-4b27-be84-21c248b22e4d

- MCP Task ID: `linear-74d145eb-305b-4b27-be84-21c248b22e4d`
- Primary PRD: `docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- TECH_SPEC: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`

## Docs-first
- [x] PRD drafted for the `CO-15` diff-budget recalibration lane. Evidence: `docs/PRD-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`, `docs/TECH_SPEC-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [x] `tasks/index.json` registers the `CO-15` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-15` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`. Evidence: `.agent/task/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.
- [ ] docs-review approved the `CO-15` packet for implementation. Evidence: pending.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id 74d145eb-305b-4b27-be84-21c248b22e4d`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id 74d145eb-305b-4b27-be84-21c248b22e4d --state "In Progress"`.
- [x] Baseline audit captured the current diff-budget codepath and the focused-versus-broad stacked artifact evidence required by the issue. Evidence: `out/linear-74d145eb-305b-4b27-be84-21c248b22e4d/manual/20260325T070238Z-baseline-audit.md`.
- [x] Required diff-budget, review-wrapper, CI workflow, and standalone-review docs seams were audited before implementation. Evidence: `scripts/diff-budget.mjs`, `scripts/run-review.ts`, `codex.orchestrator.json`, `.github/workflows/core-lane.yml`, `docs/standalone-review-guide.md`, `tests/diff-budget.spec.ts`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`.

## Implementation
- [ ] Recalibrate local auto diff-budget scope so stacked local runs hard-gate current-head scope while still surfacing broad aggregate scope as advisory evidence. Evidence: pending.
- [ ] Preserve explicit base/commit/CI hard-gated behavior and align thresholds/docs with the current review large-scope policy. Evidence: pending.
- [ ] Add focused regressions covering explicit hard scope, stacked-lane local auto mode, and output wording. Evidence: pending.

## Validation
- [ ] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-74d145eb-305b-4b27-be84-21c248b22e4d`. Evidence: pending.
- [ ] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `npm run review`. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.

## Delivery
- [ ] Open PR for `CO-15`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence in PR review threads/task notes before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
