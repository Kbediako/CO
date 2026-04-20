# ACTION_PLAN - CO-255 stale tracked and retained active claim admission repair

## Summary
- Goal: make post-relaunch control-host admission truthful when stale `tracked.linear=CO-1` and retained active/handoff_failed provider claims flatten `co-status --format json` and block current `Ready` issue pickup.
- Scope: docs-first packet, source diagnosis, narrow implementation, focused regressions, full validation/review floor, PR attachment, and workpad handoff.
- Assumptions: the workspace starts from current `main` on branch `linear/co-255-retained-claim-admission`; live shared-root mutation is avoided unless validation explicitly requires and is safe.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `tracked.linear=CO-1`, `provider_intake.active_issue_identifiers`, `provider_intake.running_issue_identifiers`, `selected_claim`, `CO-212`, `CO-217`, `CO-219`, `provider_issue_merge_closeout_action_required`, `co-status --format json`, and fresh `Ready` admission.
- Not done if: retained stale rows still flatten queue projection, free capacity still fails to admit current Ready work, or the fix cannot distinguish CO-255 from CO-248, CO-41, CO-214, CO-219, and CO-223.
- Pre-implementation issue-quality review: parent reviewed the issue packet and adjacent stale-claim docs before implementation; the lane is not a micro-task because correctness depends on exact protected surfaces and issue-family boundaries.

## Milestones & Sequencing
1. Baseline and docs-first
   - create branch from current detached head
   - create PRD, canonical TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, and registry links
   - refresh the Linear workpad with docs-first status
2. Source diagnosis
   - inspect `providerIntakeState.ts`, `providerIssueHandoff.ts`, `controlRuntime.ts`, and observability read-model/presenter paths
   - model or reproduce the stale tracked plus retained active/handoff_failed shape
   - identify the exact blocking seam
3. Implementation
   - patch only the selected seam
   - keep real active workers and current merge-closeout action-required behavior protected
   - add operator-visible diagnostic information if needed
4. Regression and validation
   - add focused tests that distinguish CO-255 from CO-248, CO-41, CO-214, CO-219, and CO-223
   - run focused tests, then required repo gates
5. Review and handoff
   - run manifest-backed standalone review and explicit elegance pass
   - open/attach PR, merge latest `origin/main`, drain automated PR feedback, refresh workpad, and move to `In Review` only when clean

## Dependencies
- Linear issue CO-255 and current workflow states
- Local control-host/provider code and test harness
- Existing stale-claim/regression docs for adjacent issue boundaries
- Standard repo validation commands and review wrapper

## Validation
- Checks / tests:
  - focused provider/runtime/status regressions for the CO-255 stale retained-state shape
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review or documented fallback plus explicit elegance/minimality pass
- Rollback plan: revert the narrow source/test/docs patch; do not edit live intake state as rollback.

## Risks & Mitigations
- Risk: demoting real active claims could over-admit work.
  - Mitigation: require live terminal/stale proof or explicit freshness evidence before stale retained rows stop consuming capacity.
- Risk: clearing `CO-219`-like merge-closeout residue could hide a real `Merging` action.
  - Mitigation: preserve current merge-closeout action-required behavior unless live issue/PR truth proves the residue is stale.
- Risk: treating this as stale top-level tracked only leaves admission blocked.
  - Mitigation: focused tests must cover retained provider-intake claims and admission/projection behavior, not only selected issue presentation.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-20
