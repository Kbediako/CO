# Task Checklist - 1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up

- MCP Task ID: `1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up`
- Primary PRD: `docs/PRD-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`
- TECH_SPEC: `tasks/specs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`

## Docs-First
- [x] PRD drafted for the post-`1306` test-stage terminal-completion blocker. Evidence: `docs/PRD-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`.
- [x] TECH_SPEC drafted with the bounded CLI subprocess runtime-isolation plan and live rerun requirement. Evidence: `tasks/specs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`.
- [x] ACTION_PLAN drafted for the follow-up lane. Evidence: `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`.
- [x] Deliberation/findings captured for the bounded post-`1306` test-tail follow-up. Evidence: `docs/findings/1307-live-provider-child-run-test-stage-terminal-completion-follow-up-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot and truthful predecessor wording. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`. Evidence: `.agent/task/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Delegation scout run captured for the registered `1307` task id. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up-scout/cli/2026-03-19T23-05-00-179Z-cf51fef1/manifest.json`.
- [x] docs-review approval captured for registered `1307`. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up/cli/2026-03-19T23-03-46-459Z-587c5d05/manifest.json`, `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up-scout/cli/2026-03-19T23-05-00-179Z-cf51fef1/review/telemetry.json`.

## Implementation
- [ ] CLI subprocess command-surface tests default to a deterministic CLI runtime posture unless a test explicitly overrides that runtime behavior. Evidence: pending.
- [ ] Dedicated runtime-provider coverage remains intact and authoritative. Evidence: pending.
- [ ] Full `npm run test` returns terminally on the implementation tree. Evidence: pending.
- [ ] Live provider rerun confirms the child run gets beyond the current `test` stage, or records the next exact blocker. Evidence: pending.

## Validation
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `npm run review`. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.
- [ ] Explicit elegance review pass recorded. Evidence: pending.
- [ ] Unresolved actionable review threads verified as `0`, or waiver recorded with evidence, before merge. Evidence: pending PR closeout.
