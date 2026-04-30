# ACTION_PLAN - CO-443 completed intake claim live-truth recovery

## Summary
- Goal: create the CO-443 docs-first packet for restoring supported control-host recovery actions when a stale completed provider-intake claim disagrees with active/fresher Linear truth.
- Scope: docs packet files and `tasks/index.json` registration only in this child lane.
- Assumptions:
  - the parent prompt and source anchor carry the authoritative issue shape for this child lane
  - the referenced source payload path is absent in this child checkout
  - parent owns source inspection, implementation files, focused tests, full validation, Linear state, workpad, PR lifecycle, and merge

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `completed provider-intake claims`
  - `provider_issue_run_already_completed`
  - `control-host recover|relaunch|nudge`
  - `live Linear truth`
  - `active/fresher again`
  - `provider-intake-state.json`
  - `CO-330 stale-owner recovery`
  - `CO-393 command plumbing`
  - `CO-404 timeout acknowledgement`
  - `CO-406 no-run capacity`
  - `CO-392 released-pending-reopen`
- Not done if:
  - `control-host recover|relaunch|nudge` remains suppressed solely by `provider_issue_run_already_completed` after live Linear truth becomes active/fresher again
  - unchanged/equal completed truth starts duplicating provider-worker runs
  - the fix depends on direct `provider-linear-worker` starts or manual `provider-intake-state.json` edits
  - the implementation widens into CO-330, CO-393, CO-404, CO-406, or CO-392 behavior
- Pre-implementation issue-quality review:
  - 2026-04-30: this is a stale completed-claim authority issue, not a generic provider workflow redesign.
  - 2026-04-30: this is narrower than CO-393 command plumbing, CO-404 acknowledgement timeout, CO-406 capacity accounting, CO-392 released-pending-reopen, and CO-330 stale-owner recovery.
  - 2026-04-30: the micro-task path is unavailable because correctness depends on exact protected terms, freshness comparisons, supported control-host actions, and duplicate-run guardrails.
- Fallback / refactor decision:
  - This task touches stale/cached completed provider-intake behavior.
  - Decision: `remove fallback` for stale `provider_issue_run_already_completed` suppression when live Linear truth is active/fresher again.
  - Decision: `justify retaining fallback` for completed-run audit rows and duplicate-run no-op behavior for unchanged/equal truth.
  - Large-refactor check: keep the parent implementation narrow unless source inspection proves completed-claim authority is split across incompatible lifecycle phases.

## Milestones & Sequencing
1. Create the PRD, canonical TECH_SPEC, ACTION_PLAN, and task checklist for `linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377`.
2. Register the canonical TECH_SPEC and checklist in `tasks/index.json` under `items[]`.
3. Parent reconciles live Linear issue context and runs docs-review or equivalent packet review before implementation.
4. Parent inspects the completed-claim suppression path for recover/relaunch/nudge and identifies the shared freshness authority.
5. Parent implements the smallest revalidation change so active/fresher Linear truth supersedes stale completed suppression for explicit control-host recovery.
6. Parent adds focused regressions for recover, relaunch, nudge, unchanged completed no-op, and direct-start guard preservation.
7. Parent runs focused validation, normal provider-worker closeout gates, standalone review, elegance pass, PR lifecycle, ready-review drain, and Linear handoff.

## Dependencies
- Source anchor: `ctx:sha256:cf913ea2dcd62e7ac2df8f89fd2725b8eb43ade503dd23e7c55ae65d81ad7cc7#chunk:c000001`
- Parent manifest path: `.runs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377-docs-packet/cli/2026-04-30T06-34-58-998Z-34bebedf/manifest.json`
- Parent-owned provider-intake and control-host recovery surfaces.

## Validation
- Child-lane checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8')); console.log('tasks/index.json ok')"`
  - `git diff --check -- docs/PRD-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md docs/ACTION_PLAN-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/tasks-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md tasks/index.json`
  - scoped `git diff --name-only` / `git status --short` review
- Parent-owned checks:
  - docs-review before implementation
  - focused recover/relaunch/nudge regressions for stale completed claim plus active/fresher Linear truth
  - focused unchanged/equal completed-claim no-op regression
  - focused direct-start guard and provenance regression
  - standard parent validation floor and PR/review handoff gates
- Rollback plan:
  - revert only the CO-443 packet and `tasks/index.json` entry if live parent issue-context reconciliation changes the scope before implementation

## Risks & Mitigations
- Risk: source payload absence hides narrower acceptance wording.
  - Mitigation: packet records the missing payload and anchors to the parent-provided prompt; parent must reconcile live issue context before implementation.
- Risk: completed-run duplicate safety is weakened while fixing stale suppression.
  - Mitigation: require focused unchanged/equal no-op regression.
- Risk: stale completed-claim recovery is mistaken for CO-330, CO-393, CO-404, CO-406, or CO-392 work.
  - Mitigation: protected non-goals are repeated in PRD, TECH_SPEC, ACTION_PLAN, task checklist, and registry summary.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-30.
