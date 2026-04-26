# Task Checklist - CO-344 Doctor Local Opt-In Advisory

- Linear Issue: `CO-344`
- MCP Task ID: `co-344-doctor-local-optin-advisory`
- Primary PRD: `docs/PRD-co-344-doctor-local-optin-advisory.md`
- TECH_SPEC: `docs/TECH_SPEC-co-344-doctor-local-optin-advisory.md`
- Task spec: `tasks/specs/co-344-doctor-local-optin-advisory.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-344-doctor-local-optin-advisory.md`

## Checklist
- [x] Linear issue created for the observed doctor posture bug. Evidence: `CO-344`.
- [x] Read-only validator confirmed this is a real P2 follow-up, not unrelated dirt. Evidence: subagent `019dbd15-97e0-72f0-8030-de4f3d81e584`.
- [x] Docs-first packet registered. Evidence: PRD, TECH_SPEC, ACTION_PLAN, task spec, checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Focused implementation added. Evidence: `orchestrator/src/cli/doctor.ts` and `orchestrator/tests/Doctor.test.ts`.
- [x] `npm run test:core -- orchestrator/tests/Doctor.test.ts`. Evidence: passed with `51` tests after docs registration.
- [x] `npm run build`. Evidence: passed on 2026-04-24 before PR #632 CodeRabbit follow-up.
- [x] `npm run lint`. Evidence: passed on 2026-04-24 before PR #632 CodeRabbit follow-up with existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts` at lines 893, 909, and 911.
- [x] `npm run test`. Evidence: passed on 2026-04-24 in `/Users/kbediako/Code/CO/.workspaces/co-344-doctor-local-optin-advisory` with `350` files and `4727` tests.
- [x] Final docs/guard validation. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `node scripts/spec-guard.mjs`, `npx eslint orchestrator/src/cli/doctor.ts orchestrator/tests/Doctor.test.ts`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, and `git diff --check` passed on 2026-04-24; Curie validator reported no P0/P1/P2 blockers.
- [x] Standalone review and elegance/minimality pass. Evidence: `.runs/co-344-doctor-local-optin-advisory/cli/2026-04-24T01-39-47-093Z-e67addb7/review/telemetry.json` reports bounded success via command-intent with no actionable issues; parent found no simplification patch needed beyond the two-line doctor aggregate condition and focused regression.
- [ ] PR opened, checks green, merged, and Linear issue moved to Done. Evidence: pending.
