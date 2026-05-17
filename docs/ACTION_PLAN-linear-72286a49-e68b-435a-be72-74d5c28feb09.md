# ACTION_PLAN - Control host: stop stale released-pending-reopen Merging claims from re-triggering refresh stuck/restart loops

## Summary
- Goal: land the smallest refresh-health patch that stops stale terminal released-pending-reopen `Merging` claims with dead worker PIDs from re-triggering `provider_refresh_lifecycle_stuck`, `restart_required`, supervisor restart loops, or `CO STATUS running row` occupancy.
- Scope: docs-first packet, narrow provider handoff/status projection changes, focused tests, validation, standalone review, elegance pass, and PR handoff.
- Lane boundaries: do not replace `CO-192` projection-only pruning or `CO-193` Ready reclaim.

## Sequence
1. Keep docs packet and registry mirrors current for `CO-194`.
2. Run docs-review evidence before source/test handoff.
3. Build a fixture with terminal/Done truth, retained released-pending-reopen `Merging` / started claim, dead local PID proof, and unrelated live workers.
4. Add narrow provider handoff classification so stale in-progress proof can de-authorize dead runs while cancellation remains enabled for stale proofs without dead-local-PID evidence.
5. Align `CO STATUS` running projection with the same terminal truth plus dead-PID stale-claim evidence.
6. Run focused tests, then full repo gates, standalone review, and elegance pass.
7. Attach PR, drain automated feedback, and hand off to review only when validation and workpad are current.

## Validation
- Focused:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts`
- Required gates:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance/minimality pass
  - `npm run pack:smoke`

## Risks
- Hidden refresh-health failures: require terminal truth, released-pending-reopen `Merging` / started state, and dead local PID proof before stale-terminal suppression applies.
- Live worker damage: keep unrelated workers in the fixture and do not cancel/kill them.
- Over-broad cancel suppression: remote or timestamp-stale proof without dead-local-PID evidence must still attempt cancellation.
- Scope drift: keep Ready reclaim and projection-only cleanup as adjacent lanes, not this fix.

## Rollback
- Revert the stale-terminal classifier/projection wiring if it hides genuine `provider_refresh_lifecycle_stuck` / `restart_required` failures or harms live workers.
