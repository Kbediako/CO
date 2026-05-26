# ACTION_PLAN - CO-582 split docs freshness owner binding lifecycle from PR completion

## Assumptions
- `docs:freshness:maintain` remains the authoritative owner-truth surface for retained docs freshness debt.
- `CO-569` and `CO-581` are still live exact rolling-debt owners and must remain blocked until their retained cohorts expire or are resolved.
- `CO-579` terminal-owner evidence is the current symptom that proves active owner lifecycle must be separated from PR completion.
- Passive Backlog owners should verify as owner bindings without counting as provider-worker WIP.

## Sequencing
1. Create docs-first packet and registry mirrors for `linear-9b2d18f0-0062-494f-b37f-340cca5f9fba`.
2. Run docs-review before implementation and record the manifest or explicit degraded-mode evidence.
3. Inspect owner lifecycle resolution in `scripts/docs-freshness-maintain.mjs`, `scripts/docs-freshness.mjs`, policy JSON, and merge/finalizer surfaces.
4. Add owner lifecycle metadata and tests for active, retiring, retired historical, terminal same-project, wrong-project, Backlog, and expired-retention cases.
5. Update maintainer/finalizer output so terminal same-project `active_owner` emits `restore_existing_owner` / `move_to_backlog_not_done` instead of replacement-owner `create_required`.
6. Update merge closeout / PR automation contracts so active owner issues are not closed to `Done` while candidate cohorts still resolve to them.
7. Run focused tests, repo validation floor, elegance pass, standalone review, PR lifecycle, and final queue/status reconciliation.

## Same-Turn Decomposition Matrix

| Stream | Decision | Owner | Status |
| --- | --- | --- | --- |
| Docs-first traceability | Create packet, mirrors, registry rows, and snapshot before code edits. | parent | complete |
| Owner lifecycle implementation | Keep parent-owned because owner-resolution code and tests are tightly coupled. | parent | focused tests passing |
| Diagnostics/delegation evidence | Use a task-scoped diagnostics child because `delegate.spawn` transport closed. | diagnostics child | complete |
| Review and queue closeout | Parent runs full validation, review, ready-review, merge, and co-status reconciliation. | parent | pending |

## Parallelization Decision
- `stay_serial_after_degraded_delegate_spawn`: implementation remains serial in this worktree because the same owner lifecycle resolver, maintainer report, and merge finalizer behavior must stay coherent. Delegation evidence is limited to the diagnostics child run after `delegate.spawn` returned a closed transport.

## Validation Plan
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain -- --format json`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review` / `npm run review`
- `npm run pack:smoke` if CLI/package/skills/review-wrapper paths are touched

## Handoff Criteria
- Workpad records live issue-context, docs-review, validation, review, and maintainer output evidence.
- PR is attached to `CO-582` and monitored through ready-review quiet window.
- `CO-569` and `CO-581` remain blocked only for their live rolling-debt owner roles.
- `CO-579` terminal-owner recurrence is routed through restoration action or proven impossible with explicit evidence.
