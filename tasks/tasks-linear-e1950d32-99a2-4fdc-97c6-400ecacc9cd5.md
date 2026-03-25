# Task Checklist - linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5

- MCP Task ID: `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
- Primary PRD: `docs/PRD-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`
- TECH_SPEC: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`

## Docs-first
- [x] PRD drafted for the `CO-18` terminal provider-worker reconciliation lane. Evidence: `docs/PRD-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`, `docs/TECH_SPEC-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] `tasks/index.json` registers the `CO-18` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `CO-18` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`. Evidence: `.agent/task/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.
- [x] docs-review approved the `CO-18` packet for implementation. Evidence: self-approved by `provider-worker` on 2026-03-24T23:32:36Z after `docs-review` succeeded at `/Users/kbediako/Code/CO/.runs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/cli/2026-03-24T23-27-44-639Z-c2876226/manifest.json`; no blocking review comments remained before implementation.

## Investigation
- [x] Live Linear workflow states and current issue state were rechecked before transition, and the issue was moved from `Ready` to `In Progress`. Evidence: `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id e1950d32-99a2-4fdc-97c6-400ecacc9cd5`, `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear transition --issue-id e1950d32-99a2-4fdc-97c6-400ecacc9cd5 --state "In Progress"`.
- [x] Baseline audit captured the failed `CO-16` manifest/proof pair, the current intake snapshot, and the relevant provider/control runtime seams. Evidence: `out/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/manual/20260325T000000Z-baseline-audit.md`.
- [x] Required provider/control runtime seams and the local Symphony baseline were audited before implementation. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `/Users/kbediako/Code/symphony/SPEC.md`.
- [x] Delegation override was explicitly recorded for this worker run because subagent spawning is unavailable in-session. Evidence: `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`.

## Implementation
- [ ] Make terminal provider-worker failure authoritative for provider-intake reconciliation without leaving stale `running` ownership.
- [ ] Refresh stale provider issue metadata during failure reconciliation and rehydrate/refresh reads.
- [ ] Add a truthful failure-side Linear/workpad update path for terminal worker failures.
- [ ] Add focused regressions across `ProviderIssueHandoff`, `ProviderLinearWorkerRunner`, and `ControlRuntime`.

## Validation
- [ ] `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] `npm run review`.
- [ ] `npm run pack:smoke` if downstream-facing CLI/package/skill surfaces change.

## Delivery
- [ ] Open PR for `CO-18`, attach it to Linear, handle feedback, and wait for required checks to reach terminal green.
- [ ] Verify unresolved actionable review threads = `0` or record a waiver with evidence before moving to `In Review`.
- [ ] Merge the latest `origin/main` into the branch before review handoff, refresh the workpad to match current status and risks, and stop coding once the issue reaches `In Review`.
