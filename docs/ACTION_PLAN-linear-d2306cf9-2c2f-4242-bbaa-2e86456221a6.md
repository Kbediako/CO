# ACTION_PLAN - CO-292 retained released/not_active claim metadata refresh

## Summary
- Goal: keep retained `provider-intake-state.json` released/not_active claim metadata current when live same-issue Linear truth moves to a newer non-active state such as `Blocked -> Rework`.
- Scope: docs-first packet in this child lane; parent-owned source diagnosis, implementation in `providerIssueHandoff.ts` or existing helper seams, focused regression coverage, validation, review, workpad, and PR lifecycle.
- Assumption: newer same-issue truth should come from existing refresh/dependency hydration paths rather than an unbounded direct issue-by-id sweep over retained released residue.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-intake-state.json`, `providerIssueHandoff.ts`, `released/not_active`, `provider_issue_released:not_active`, `issue_state`, `issue_state_type`, `issue_updated_at`, `Blocked -> Rework`, dependent blocker snapshots, `CO-276`, `CO-64`, `CO-202`, `CO-212`, `CO-248`, and `CO-41`.
- Not done if: stale retained released/not_active rows keep old metadata after newer same-issue truth, dependent blocker snapshots contradict retained claim metadata, or the solution drifts into Ready reclaim/admission, active-claim refresh, restart recovery, destructive cleanup, or unbounded direct reads.
- Pre-implementation issue-quality review: this docs child lane shaped CO-292 as a metadata-only parity issue, not a micro-task, because correctness depends on exact fields and adjacent issue-family boundaries.

## Milestones & Sequencing
1. Docs-first packet
   - create PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, `.agent` mirror, task registry entry, and `docs/TASKS.md` snapshot
   - record source anchor and child-checkout source payload availability
2. Parent source diagnosis
   - inspect `providerIssueHandoff.ts` and existing provider refresh/dependency hydration helpers
   - identify where newer same-issue truth and dependent blocker snapshots are available without new unbounded reads
3. Parent implementation
   - add metadata-only merge behavior for retained `state=released`, `reason=provider_issue_released:not_active` rows
   - update only `issue_state`, `issue_state_type`, and `issue_updated_at` when live truth is newer
   - preserve claim state, reason, audit fields, run identifiers, and no-admission behavior
4. Parent regression and validation
   - cover stale `Blocked` metadata refreshed to newer `Blocked -> Rework` truth
   - prove no Ready reclaim/admission, active-claim refresh, row deletion, or unbounded direct issue-by-id reads
   - run scoped and required parent validation gates
5. Parent handoff
   - refresh workpad, attach PR, drain review feedback, and complete Linear/PR lifecycle outside this child lane

## Dependencies
- Linear issue CO-292 and live workflow state metadata
- Existing provider handoff refresh/dependency hydration paths
- Adjacent issue contracts: `CO-64`, `CO-202`, `CO-212`, `CO-248`, `CO-41`, and `CO-276`

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"`
  - `git diff --check -- docs/PRD-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md docs/TECH_SPEC-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md docs/ACTION_PLAN-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md tasks/specs/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6-control-host-refresh-retained-released-not-active-claim-metadata.md tasks/tasks-linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md .agent/task/linear-d2306cf9-2c2f-4242-bbaa-2e86456221a6.md tasks/index.json docs/TASKS.md`
  - protected-term grep over touched packet files
- Parent checks:
  - focused metadata-refresh regression
  - adjacent provider handoff regressions where touched
  - required repo gates and review/elegance handoff per parent scope
- Rollback plan: revert the narrow docs/source/test patch; do not edit live `provider-intake-state.json` as rollback.

## Risks & Mitigations
- Risk: metadata refresh accidentally reclassifies released rows as active.
  - Mitigation: tests assert `state=released` and `reason=provider_issue_released:not_active` remain unchanged.
- Risk: implementation widens into Ready reclaim/admission.
  - Mitigation: keep CO-292 separate from `CO-202` and `CO-212`; tests assert no admission side effect.
- Risk: request-budget regression from direct reads over retained residue.
  - Mitigation: use existing hydrated same-issue truth or bounded evidence and assert no unbounded issue-by-id sweep.
- Risk: dependent blocker snapshot truth and retained claim metadata continue to diverge.
  - Mitigation: regression covers newer snapshot truth updating retained metadata.

## Approvals
- Docs-first packet: bounded same-issue docs child lane
- Parent implementation/review/PR lifecycle: implementation complete; standalone review bounded-success; PR/review handoff blocked by unrelated CO-293 docs baseline failures.
- Date: 2026-04-21
