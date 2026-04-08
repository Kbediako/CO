# Task Checklist - 1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy

- MCP Task ID: `1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`
- TECH_SPEC: `tasks/specs/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`

> This lane defines compatibility issue identity and deterministic same-issue multi-run handling while keeping UI/Telegram on the existing selected-run seam.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `tasks/specs/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `tasks/tasks-1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `.agent/task/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1035-compatibility-issue-identity-and-multi-run-policy-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy.md`, `docs/findings/1035-compatibility-issue-identity-and-multi-run-policy-deliberation.md`.
- [x] docs-review approval/override captured for registered `1035`. Evidence: `.runs/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/cli/2026-03-07T03-09-31-041Z-52b863ef/manifest.json`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T030736Z-docs-first/00-summary.md`.

## Compatibility Issue Identity Policy
- [x] The compatibility discovery/runtime seam applies an explicit same-issue multi-run policy instead of stopping at one latest readable sibling run. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/12-manual-compatibility-issue-identity.json`.
- [x] Compatibility `state` / `issue` lookup remains issue-centered while preserving run-id secondary alias lookup. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/12-manual-compatibility-issue-identity.json`.
- [x] The selected-run seam remains current-run-only for `/ui/data.json`, Telegram oversight, and dispatch evaluation. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/12-manual-compatibility-issue-identity.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/05-targeted-tests.log`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/06-test.log`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/06b-direct-vitest.log`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/14-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/07-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/08-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/09-diff-budget.log`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/14-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/10-review.log`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/10-review-timeout.txt`, `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/14-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1035-coordinator-symphony-aligned-compatibility-issue-identity-and-multi-run-policy/manual/20260307T032250Z-closeout/11-pack-smoke.log`.
