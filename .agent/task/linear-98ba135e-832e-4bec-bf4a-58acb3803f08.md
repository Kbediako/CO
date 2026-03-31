# Task Checklist - linear-98ba135e-832e-4bec-bf4a-58acb3803f08

- MCP Task ID: `linear-98ba135e-832e-4bec-bf4a-58acb3803f08`
- Primary PRD: `docs/PRD-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`
- TECH_SPEC: `tasks/specs/linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`

## Docs-first
- [x] PRD drafted for the `CO-28` bounded-success review-outcome lane. Evidence: `docs/PRD-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`, `docs/TECH_SPEC-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`.
- [x] `tasks/index.json` registers the `CO-28` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-28` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`. Evidence: `.agent/task/linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md`.
- [ ] docs-review approved the `CO-28` packet for implementation. Evidence: pending `linear child-stream --pipeline docs-review`.

## Investigation
- [x] Live team workflow states and current issue state were checked before any transition. Evidence: `linear issue-context` output recorded in the run transcript.
- [x] The issue was moved from `Ready` to the team's actual started state (`In Progress`) before active coding. Evidence: `linear transition --issue-id 98ba135e-832e-4bec-bf4a-58acb3803f08 --state "In Progress" --format json`.
- [x] Bootstrap workpad comment updated in the issue using the single active `## Codex Workpad` comment. Evidence: `linear upsert-workpad --issue-id 98ba135e-832e-4bec-bf4a-58acb3803f08 ... --format json`.
- [x] Current artifact and code truth for bounded-success versus failed review-wrapper outcomes was audited before implementation. Evidence: `out/linear-98ba135e-832e-4bec-bf4a-58acb3803f08/manual/20260330T064530Z-baseline-audit.md`.
- [x] The detached workspace was moved onto a task branch before repo edits. Evidence: local branch `co-28-clarify-bounded-review-outcomes`.
- [ ] A bounded child stream was launched for docs or review help, so delegation evidence stays task-scoped and auditable. Evidence: pending `linear child-stream` manifest.

## Implementation
- [ ] Persist an explicit review terminal-outcome classification that distinguishes bounded-success from real wrapper failure.
- [ ] Surface bounded-success explicitly in wrapper closeout output and downstream review-stage summaries.
- [ ] Align provider-worker prompt, `skills/linear`, and standalone-review docs with the new interpretation contract.
- [ ] Add focused regressions for the presentation and interpretation seam without reopening broader review-runtime policy.

## Validation
- [ ] `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`. Evidence: pending docs-review manifest.
- [ ] Focused tests for touched review-outcome surfaces. Evidence: pending test logs.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending validation log.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending validation log.
- [ ] `npm run build`. Evidence: pending validation log.
- [ ] `npm run lint`. Evidence: pending validation log.
- [ ] `npm run test`. Evidence: pending validation log.
- [ ] `npm run docs:check`. Evidence: pending validation log.
- [ ] `npm run docs:freshness`. Evidence: pending validation log.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending validation log.
- [ ] `npm run review`. Evidence: pending review log.
- [ ] `npm run pack:smoke` if downstream-facing review wrapper or worker-facing packaged paths change. Evidence: pending validation log or explicit skip note.
- [ ] Explicit elegance review recorded before any review handoff. Evidence: pending elegance review note.

## Delivery
- [ ] Open or update the PR for `CO-28`, attach it to Linear, and handle actionable review feedback or explicit pushback.
- [ ] Run `pr ready-review`, refresh the workpad with review and validation truth, and move the issue to `In Review` only when the handoff bar is actually satisfied.
