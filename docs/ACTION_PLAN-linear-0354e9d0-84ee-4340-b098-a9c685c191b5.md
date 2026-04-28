# ACTION_PLAN - CO-404 Control-Host Provider-Worker Acknowledgement Timeouts

## Summary
- Goal: make control-host recover/relaunch/nudge acknowledgements truthful under request budgets.
- Scope: docs-first packet, control-host API/CLI acknowledgement, provider-intake accepted truth, focused regressions.
- Non-goals: CO-393 reopening, CO-403 stale proof-lock retry work, timeout-only tuning.

## Steps
1. Register PRD, TECH_SPEC, ACTION_PLAN, checklist, and mirrors.
2. Trace `controlHostProviderWorkerRecoverCliShell.ts`, `observabilityApiController.ts`, and provider handoff acceptance state.
3. Acknowledge only after durable accepted-state evidence or return the real fast skipped/failure result.
4. Keep asynchronous continuation machine-checkable through `queued` metadata.
5. Coalesce retries across UUID and human issue aliases.
6. Preserve accepted pending-revalidation truth without counting null launch/run identity as active capacity.
7. Add focused regressions and run required gates.
8. Open PR, attach to Linear, drain review feedback, and hand off only after clean checks or documented unrelated baseline.

## Validation
- Focused vitest coverage for queued acknowledgement, failure/no-queued truth, retry coalescing, and capacity.
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`, `npm run lint`, `npm run test`
- `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `npm run pack:smoke`
- Standalone review and elegance pass.

## Rollback
Revert acknowledgement changes if accepted metadata weakens idempotency; keep duplicate-launch protection intact.
