# Task Checklist - linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa

- Linear Issue: `CO-51` / `d223e9f3-3708-40d9-abfe-14c305a8c3aa`
- MCP Task ID: `linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa`
- Primary PRD: `docs/PRD-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`
- TECH_SPEC: `tasks/specs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`

## Docs-First
- [x] PRD drafted for the interrupted `Merging`-stage merge-drain recovery lane. Evidence: `docs/PRD-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`.
- [x] TECH_SPEC drafted with the merge-drain interruption, retry, and operator-artifact requirements. Evidence: `tasks/specs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`, `docs/TECH_SPEC-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`.
- [x] ACTION_PLAN drafted for docs-review, baseline inspection, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new task packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`. Evidence: `.agent/task/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md`.
- [x] Standalone pre-implementation review approval captured in spec notes. Evidence: `tasks/specs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md` `review_notes`.
- [x] docs-review approval captured for `linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa-docs-review/cli/2026-03-30T09-32-57-435Z-ab077912/manifest.json` (wrapper parse bug noted in `tasks/specs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa.md` `review_notes`).

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-51`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `2059d72d-bfd2-48e8-9881-646c05e43d8c`.
- [x] Workspace moved from detached `HEAD` onto a named branch before repo edits. Evidence: `git switch -c linear/co-51-merge-drain-recovery origin/main`.
- [x] Required bounded child stream launched and recorded for this lane. Evidence: packaged `linear child-stream --pipeline docs-review` returned wrapper error `provider_worker_child_stream_output_invalid`, while the underlying docs-review manifest succeeded at `/Users/kbediako/Code/CO/.runs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa-docs-review/cli/2026-03-30T09-32-57-435Z-ab077912/manifest.json`.

## Investigation
- [ ] Required baseline manifest, runner log, and Linear audit inspected against the current merge continuation code. Evidence: pending.
- [ ] Actual interruption seam identified with concrete code references and incident evidence. Evidence: pending.

## Implementation
- [ ] Smallest responsible continuation repair landed without widening into stale-claim or refresh-stall classes. Evidence: pending.
- [ ] Operator-facing artifacts now record quiet-window start, interruption reason, retry decision, and final terminal outcome. Evidence: pending.
- [ ] Focused regression coverage exercises the clean start -> late review noise -> clean recovery sequence. Evidence: pending.
- [ ] Real or simulated proof shows automatic merge completion or explicit actionable failure for the `CO-41` / `#324` incident class. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] Focused merge-continuation regression commands. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run build`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run lint`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run test`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run docs:check`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run docs:freshness`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `MCP_RUNNER_TASK_ID=linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa npm run pack:smoke` if downstream-facing CLI/package/review-wrapper surfaces change. Evidence: pending final diff assessment.
- [ ] Explicit elegance review recorded before review handoff. Evidence: pending.

## Handoff
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.

## Progress Log
- 2026-03-30: Rechecked live Linear workflow states, moved `CO-51` from `Ready` to `In Progress`, switched the detached workspace onto `linear/co-51-merge-drain-recovery`, and bootstrapped the docs-first packet for the merge-drain continuation lane.
- 2026-03-30: `linear child-stream --pipeline docs-review` hit the known wrapper parse failure because Codex-Orchestrator prelude logs preceded the final JSON payload, but the underlying docs-review run succeeded at `/Users/kbediako/Code/CO/.runs/linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa-docs-review/cli/2026-03-30T09-32-57-435Z-ab077912/manifest.json`; the packet records that manifest directly.
