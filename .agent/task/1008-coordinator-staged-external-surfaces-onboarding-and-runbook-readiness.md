# Task Checklist - 1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness

- MCP Task ID: `1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness`
- Primary PRD: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`
- TECH_SPEC: `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/ACTION_PLAN-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/tasks-1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `.agent/task/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- [x] Authority invariants and mutating-control auth/token + idempotency requirements are explicit. Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- [x] Staged rollout order is explicit (Telegram first, Linear advisory now, Discord deferred). Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/findings/1008-transport-readiness-deliberation.md`.

## Runbook + Test Contracts
- [x] Telegram runbook deliverables and canary/rollback expectations are documented. Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- [x] Linear advisory runbook deliverables and no-mutation expectations are documented. Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TECH_SPEC-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.
- [x] Discord defer criteria are documented as prerequisite-gated. Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `tasks/specs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`.

## Registry Sync
- [x] `tasks/index.json` contains task `1008` metadata with docs-first gate context. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` includes task `1008` snapshot line. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` includes 1008 docs/spec/checklist/findings paths. Evidence: `docs/docs-freshness-registry.json`.

## Validation (Docs-First Stream)
- [x] `node scripts/spec-guard.mjs --dry-run` passed and log captured. Evidence: `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/09-spec-guard-dry-run.postsync.log`.
- [x] `npm run docs:check` passed and log captured. Evidence: `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/10-docs-check.postsync.log`.
- [x] `npm run docs:freshness` passed and log captured. Evidence: `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T115910Z-docs-first/11-docs-freshness.postsync.log`.

## Validation (Closeout Sync)
- [x] docs-review run captured with terminal success. Evidence: `.runs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/cli/2026-03-05T12-40-28-913Z-4151892c/manifest.json`.
- [x] implementation-gate override rerun captured with terminal success. Evidence: `.runs/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/cli/2026-03-05T13-20-53-232Z-cb1a0b34/manifest.json`.
- [x] Ordered post-remediation validation evidence directory is recorded. Evidence: `out/1008-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness/manual/20260305T132020Z-post-remediation-gates/`.

## Boundaries
- [x] No runtime files under `orchestrator/src/**` were edited in this stream. Evidence: docs/task-only diff for 1008 files.
- [x] Completion semantics are planning/readiness only and do not enable production onboarding by themselves. Evidence: `docs/PRD-coordinator-staged-external-surfaces-onboarding-and-runbook-readiness.md`, `docs/TASKS.md`.
