# ACTION_PLAN - CO-577 quota hygiene degraded machine-status classification

## Summary
- Goal: fix quota hygiene consumer classification for available bounded degraded machine status from `co-status --format json`.
- Scope: docs packet, `classifyCoStatusDataset`, co-status summary/finding evidence, focused quota-hygiene regression, validation, review handoff.
- Non-goals: producer endpoint refactor, timeout bump, process remediation, provider-intake cleanup, restart behavior, queue mutation, or treating degraded status as healthy/live WIP evidence.

## Milestones
1. Workflow setup
   - Read live Linear state and move `Ready` to `In Progress`.
   - Create the single workpad.
   - Record pre-turn decomposition and child-lane decision.
2. Root-cause and red test
   - Inspect quota hygiene co-status classification and existing tests.
   - Add a focused quota-hygiene regression for zero-WIP `ui_request_timeout` degraded machine status.
   - Confirm the new test fails because current classification is `unavailable`.
3. Implementation
   - Add an explicit available degraded machine-status classification.
   - Preserve degraded-read reason/source/freshness in summary and finding evidence.
   - Keep live-token extraction empty for degraded reads.
   - Keep stale endpoint and unhealthy live-host stronger classifications.
4. Documentation and validation
   - Register PRD, TECH_SPEC, ACTION_PLAN, checklist, task mirror, task index, and freshness rows.
   - Run spec guard, focused tests, build, lint, full tests, docs gates, stewardship, and diff budget.
   - Run standalone review and elegance review.
5. Review handoff
   - Attach/update PR.
   - Run ready-review drain.
   - Refresh the workpad with final validation, review evidence, and advisory goal evidence from the current manifest snapshot.

## Consumer Contract Invariant
Every downstream status consumer must preserve `degraded_read.reason`, `degraded_read.source`, and `degraded_read.freshness_verdict` instead of flattening unknown bounded degraded reads into `unavailable`. Stale endpoint, unhealthy host, auth failure, dead endpoint, and true unavailable evidence remain stronger fail-closed classifications.

## Validation
- `npm run test:core -- orchestrator/tests/QuotaHygieneCliShell.test.ts`
- Focused co-status tests only if `orchestrator/src/cli/coStatusCliShell.ts` changes
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- Manifest-backed standalone review
- Explicit elegance/minimality review

## Risks
- Risk: unknown degraded reasons that should be unavailable become only degraded.
  - Mitigation: keep auth/unavailable keywords in the unavailable class and preserve stale/unhealthy stronger matches.
- Risk: partial status counts corroborate live work.
  - Mitigation: maintain `collectCoStatusLiveTokens` degraded-read empty-token behavior and regression coverage.
- Risk: finding prose hides producer evidence.
  - Mitigation: summary and evidence include reason, source, and freshness verdict.

## Approvals
- Reviewer: parent provider-worker lane.
- Date: 2026-05-23.
