# ACTION_PLAN - Coordinator Live Linear Tracked-Issue By-Id Query String Contract Fix

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Unblock live autonomous provider intake by correcting the Linear exact-issue query contract and proving the fix through a real `control-host` rerun.
- Scope: docs-first lane registration, one query patch, one focused regression, host rebuild/restart, and live validation against `CO-1` / `CO-2`.
- Assumptions:
  - provider env, webhook secret, and public ingress are already correct and live
  - `CO-1` and `CO-2` are already in a started Linear state

## Milestones & Sequencing
1) Register the new `1304` docs packet, task registry entry, and checklist mirrors for the live query-contract bug.
2) Run `docs-review` for `1304`, then patch `linearDispatchSource.ts` and add the focused regression in `LinearDispatchSource.test.ts`.
3) Run required validation, rebuild/restart the detached `co-control-host`, and rerun live autonomy until the provider-intake ledger plus child-run handoff confirm the fix or reveal the next blocker.
4) Run an explicit elegance/minimality pass before final handoff so the lane stays at one query-contract fix plus the narrow regression and documentation updates that support it.

## Dependencies
- Live Linear GraphQL availability
- Existing persistent `control-host` restart path via tmux
- Existing provider-intake ledger and run artifacts under `.runs/local-mcp/cli/control-host/`

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - explicit elegance review pass
- Rollback plan:
  - revert the query-contract patch if the focused regression or live rerun disproves the fix
  - restore the prior detached host command if the tmux restart path misbehaves

## Risks & Mitigations
- Risk: a second downstream blocker appears after the query contract is fixed.
  - Mitigation: keep the lane narrow, report the next blocker exactly, and avoid mixing it into this contract fix without evidence.
- Risk: live rerun timing or existing started issues make the post-fix signal noisy.
  - Mitigation: rely on ledger claims, host log, and child manifests as the primary evidence instead of narrative inference.

## Approvals
- Reviewer: Approved via docs-review manifest `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`
- Date: 2026-03-19
