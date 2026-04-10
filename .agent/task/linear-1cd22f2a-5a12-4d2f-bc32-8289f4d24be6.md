# Task Checklist - linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6

- Linear Issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- MCP Task ID: `linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- Primary PRD: `docs/PRD-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- Task spec: `tasks/specs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were created or refreshed for `CO-128`.
- [x] Pre-implementation issue-quality review notes were captured in the task spec before coding.
- [x] Audited docs-review delegation evidence is recorded at `.runs/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6-co-128-docs-review/cli/2026-04-10T10-14-57-353Z-fdb0ce95/manifest.json` with clean-success review telemetry.

## Workflow
- [x] The issue was taken into the team’s active started state before implementation work began.
- [x] Exactly one same-turn parallelization decision was recorded as `stay_serial` / `single_bounded_change`.
- [ ] The single Linear workpad comment has been refreshed with the current implementation evidence. Local workpad content is staged, but the Linear helper entered shared-budget cooldown before the refresh write could be sent.
- [ ] Review-state transition / PR attachment is pending because Linear writes are currently rate-limited.

## Investigation
- [x] The real failing seam was reproduced and shown to be pre-manifest. A preserved timing probe captured about `31.85s` outer wall time while the manifest-backed run window was only about `5.9s`, which isolated the dead time to source-entry bootstrap.
- [x] The direct `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json` path was rerun after the fix and still emits a manifest path and terminal status with a fake `CODEX_CLI_BIN`. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T111639Z-manual-repro-postguard.json`.
- [x] The lane remained explicitly separate from provider refresh-path work and generic frontend cleanup.

## Implementation
- [x] `bin/codex-orchestrator.ts` now lazy-loads `CodexOrchestrator` and command-shell modules after command selection instead of importing the full CLI graph up front.
- [x] The entrypoint preserves the old fail-fast `MCP_RUNNER_TASK_ID` validation for non-orchestrator commands via `validateEnvironmentTaskId()`.
- [x] The `frontend-test` command path keeps its existing behavior and output contract; the change is limited to bootstrap timing and import timing.
- [x] Focused regression coverage was added in `tests/cli-command-surface.spec.ts` for the non-orchestrator `self-check` path.

## Validation
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test -- tests/cli-command-surface.spec.ts tests/cli-frontend-test.spec.ts`
- [x] Manual `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json` repro with a fake `CODEX_CLI_BIN`
- [x] `npm run test` (`324` files, `3317` tests)
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `node scripts/diff-budget.mjs`
- [x] `npm run pack:smoke`
- [x] Validation evidence was captured in `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T205500Z-validation-summary.md`

## Closeout
- [x] Fresh standalone review was attempted on the final diff; the wrapper failed via `failed-boundary` / `startup-anchor`, so a manual fallback review was completed and recorded with no findings. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T112047Z-review-fallback.md`
- [x] Explicit elegance/minimality pass kept the follow-up fix to one helper plus one focused regression test. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T112047Z-review-fallback.md`
- [ ] Linear workpad refresh, PR attachment, and issue-state handoff are pending the shared-budget cooldown on Linear writes.
