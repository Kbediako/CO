# Task Checklist - 1306-coordinator-live-provider-child-run-test-stage-regression-follow-up

- MCP Task ID: `1306-coordinator-live-provider-child-run-test-stage-regression-follow-up`
- Primary PRD: `docs/PRD-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`
- TECH_SPEC: `tasks/specs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`

## Docs-First
- [x] PRD drafted for the concrete provider child-run test-stage regressions. Evidence: `docs/PRD-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`.
- [x] TECH_SPEC drafted with the bounded env/guard remediation plan and live rerun requirement. Evidence: `tasks/specs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`.
- [x] ACTION_PLAN drafted for the follow-up lane. Evidence: `docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`.
- [x] Deliberation/findings captured for the bounded `04-test` follow-up. Evidence: `docs/findings/1306-live-provider-child-run-test-stage-regression-follow-up-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot and truthful predecessor wording. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`. Evidence: `.agent/task/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Delegation scout run captured for the registered `1306` task id. Evidence: `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up-scout/cli/2026-03-19T21-42-22-859Z-751ba0c2/manifest.json`.
- [x] docs-review approval captured for registered `1306`. Evidence: `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up/cli/2026-03-19T21-44-24-346Z-e87d8d12/manifest.json`.

## Implementation
- [ ] RLM runtime shell normalizes empty-string non-interactive env vars before exec. Evidence: pending.
- [ ] Provider-started manifest-observed claims stay `starting` until rehydrate confirms an active child run, preventing duplicate starts in the queued window. Evidence: pending.
- [ ] `delegation-guard` negative-path diagnostics stay truthful for top-level provider-started fallback failures. Evidence: pending.
- [ ] `delegation-guard` resolves the authoritative provider-intake ledger for non-default control-host task/run ids via manifest-carried control-host provenance, with resume backfill for older provider manifests. Evidence: pending.
- [ ] Existing sanctioned provider-started and provider-child guard behavior remains intact. Evidence: pending.
- [ ] Live provider rerun confirms the child run gets beyond `stage:test:failed`, or records the next exact blocker. Evidence: pending.

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
