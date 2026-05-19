# ACTION_PLAN - CO-562 hide passive owner claims from retry and failed status

## Summary
- Goal: stop passive released Backlog docs-freshness owner claims from appearing as active retry/failed work because of historical failed run summaries.
- Scope: selected-run/status projection logic, focused tests, docs-freshness owner guidance, validation/review/PR handoff.
- Assumptions: provider-intake remains the raw audit authority; no PR is attached at start; the accepted docs child lane owns only `docs/guides/docs-freshness-cohorts.md`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-intake-state.json`, `co-status --format json`, `provider_issue_released:not_active`, `Backlog`, `docs:freshness:maintain`, `passive owner issue`, `retrying`, `failed run summary`, `run_summary`, `retry_queued=null`.
- Not done if:
  - passive released Backlog owner claims still appear active, retrying, or failed.
  - real failed active workers are hidden.
  - the fix requires manual provider-intake edits or control-host restart.
  - docs-freshness owner issues become terminal as closeout.
- Pre-implementation issue-quality review: CO-562 is concrete implementation work with named artifacts, protected terms, false-done cases, and acceptance criteria; it is not a broad queue policy redesign.
- Fallback / refactor decision: touches stale cached/run-summary projection behavior. Remove stale failed-summary current authority for passive released owner claims; justify retaining provider-intake/raw run artifacts as durable audit evidence.
- Durable retention evidence: `provider-intake-state.json` rows and old run manifests remain retained as audit state, not current status authority.
- Large-refactor check: no large refactor needed because selected-run/compatibility projection is the existing bounded authority seam.

## Milestones & Sequencing
1. Workflow setup.
   - Read live issue-context, transition Ready to In Progress, create one workpad, record parallelization, launch and accept a bounded docs child lane.
2. Docs-first packet.
   - Create PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent/task` mirror, task index row, docs/TASKS snapshot, and docs freshness registry rows.
   - Run docs-review child stream before implementation.
3. Source and tests.
   - Add focused regression coverage for passive CO-558 shape, real failed active-run contrast, and terminal retry/resumable exclusion.
   - Implement the smallest selected-run/status projection change that removes stale failed-summary authority only for passive released owner claims.
4. Validation.
   - Run focused tests, then provider-worker validation floor.
   - Confirm docs guidance and packet stay registered.
5. Review and handoff.
   - Run manifest-backed standalone review and explicit elegance pass.
   - Open/attach PR, run ready-review drain, refresh workpad, and move to `In Review` only after gates are clean.

## Dependencies
- Linear issue-context for workflow states and workpad.
- Current provider-intake/status projection tests.
- `docs:freshness:maintain` guidance surface in `docs/guides/docs-freshness-cohorts.md`.

## Validation
- Checks / tests:
  - focused selected-run/status projection tests.
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
  - explicit elegance pass
- Rollback plan: revert selected-run/status projection changes and CO-562 docs packet/guide updates; old audit artifacts are not mutated by the implementation.

## Risks & Mitigations
- Risk: suppressing real failed active runs.
  - Mitigation: require a matching passive released/not_active Backlog/no-retry provider-intake claim and add negative coverage.
- Risk: retry/resumable behavior regresses.
  - Mitigation: keep queued retry detection intact and add terminal retry exclusion coverage.
- Risk: docs-freshness owner guidance gets interpreted as terminal closeout.
  - Mitigation: guidance explicitly says keep merged owner issues in Backlog while retained cohorts remain visible.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-05-19.
