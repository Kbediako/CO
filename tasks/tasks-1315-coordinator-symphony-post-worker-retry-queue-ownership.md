# Task Checklist - 1315-coordinator-symphony-post-worker-retry-queue-ownership

- MCP Task ID: `1315-coordinator-symphony-post-worker-retry-queue-ownership`
- Primary PRD: `docs/PRD-coordinator-symphony-post-worker-retry-queue-ownership.md`
- TECH_SPEC: `tasks/specs/1315-coordinator-symphony-post-worker-retry-queue-ownership.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-post-worker-retry-queue-ownership.md`

## Docs-first
- [x] PRD drafted for the post-worker retry-owner parity slice after `1314`. Evidence: `docs/PRD-coordinator-symphony-post-worker-retry-queue-ownership.md`.
- [x] TECH_SPEC drafted for the post-worker retry-owner parity slice. Evidence: `tasks/specs/1315-coordinator-symphony-post-worker-retry-queue-ownership.md`, `docs/TECH_SPEC-coordinator-symphony-post-worker-retry-queue-ownership.md`.
- [x] ACTION_PLAN drafted for the post-worker retry-owner parity slice. Evidence: `docs/ACTION_PLAN-coordinator-symphony-post-worker-retry-queue-ownership.md`.
- [x] `tasks/index.json` registers the `1315` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1315` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1315-coordinator-symphony-post-worker-retry-queue-ownership.md`. Evidence: `.agent/task/1315-coordinator-symphony-post-worker-retry-queue-ownership.md`.
- [x] docs-review succeeded for `1315` via the registered task manifest. Evidence: `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
- [x] Publication posture stays truthful: `1315` is now implemented on the current branch, while refreshed current-head closeout evidence for the integrated `1312`-`1315` packet still remains pending. The remaining full-parity blockers now move to `1316`. Evidence: `docs/TASKS.md`, `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`, `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`.

## Implementation
- [x] Dedicated retry-owner seam introduced for post-worker continuation/failure retries. Evidence: `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Retry reschedule cancels and replaces older pending retries for the same issue. Evidence: `orchestrator/src/cli/control/providerIssueRetryQueue.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Retry payload truth from `1314` remains correct while ownership changes. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [x] Restart/bootstrap rebuild remains deterministic and truthful. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Broader reconciliation and optional UI richness remain explicitly out of scope unless forced by implementation. Evidence: `docs/TASKS.md`, `tasks/specs/1315-coordinator-symphony-post-worker-retry-queue-ownership.md`.
- [x] Post-`1315` follow-on parity work now moves to `1316` for poll-owned discovery/recovery plus observability API normalization unless provider-driven discovery is later accepted as an intentional divergence. Evidence: `docs/TASKS.md`, `tasks/specs/1316-coordinator-symphony-poll-owned-discovery-and-recovery.md`.

## Validation
- [x] Focused retry-owner regressions proving prompt continuation retry, cancel/requeue behavior, truthful payloads, and restart-safe rebuild. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] review.
- [ ] `npm run pack:smoke` if required by touched downstream-facing surfaces.
- [ ] Live control-host proof for scheduler-owned continuation retry plus truthful `/api/v1/state.retrying` and `/api/v1/<issue>`.
