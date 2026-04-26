# ACTION_PLAN - CO-286 attach already-active provider-worker runs before capacity gating

## Summary
- Goal: give the parent lane a bounded implementation plan for the CO-286 ordering seam where already-active discovered provider-worker runs must attach/project before capacity gating suppresses fresh dispatch.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned `providerIssueHandoff.ts` attach/rehydration ordering work, and parent-owned focused full-occupancy regression coverage.
- Assumptions:
  - the shared source payload is absent in this child checkout
  - the parent prompt's protected terms are the authoritative checksum for this packet
  - `max_concurrent_agents` remains authoritative and unchanged
  - missing provider-control-host provenance debt is separate handling

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `control host`
  - `provider-intake`
  - `co-status`
  - `already-active discovered runs`
  - `capacity gating`
  - `max_concurrent_agents`
  - `providerIssueHandoff.ts`
  - `CO-267`
  - `CO-281`
  - `CO-282`
  - `attach/rehydration ordering`
  - `missing provider-control-host provenance debt`
- Not done if:
  - already-active discovered provider-worker runs are not attached/projected before capacity gating suppresses fresh dispatch
  - the fix changes `max_concurrent_agents`
  - manual worker starts become the steady-state answer
  - the result is only a dashboard/terminal cosmetic fix
  - active-run truth validation is weakened
  - missing provider-control-host provenance debt is treated as closed by CO-286
- Pre-implementation issue-quality review:
  - 2026-04-21: the issue is not plausibly narrower than the user request. The packet carries the full protected surface list, preserves the adjacent `CO-267` / `CO-281` / `CO-282` references, and rejects the nearby wrong interpretations before parent implementation.

## Milestones & Sequencing
1. Create the CO-286 docs-first packet and declared mirrors in this child lane.
2. Parent audits `providerIssueHandoff.ts` for ordering between already-active discovery, attach/rehydration, provider-intake updates, projection, and capacity gating.
3. Parent identifies the smallest seam that can attach/project already-active discovered provider-worker runs before the no-slot capacity result.
4. Parent implements the ordering fix without changing `max_concurrent_agents`.
5. Parent confirms fresh dispatch remains suppressed only after already-active work is attached/projected and full occupancy is truthful.
6. Parent keeps active-run truth validation intact and fails closed for invalid or unproven active-run claims.
7. Parent keeps missing provider-control-host provenance debt as a separate follow-up/handling path.
8. Parent runs focused full-occupancy regressions, docs-review, and normal parent-selected review/PR validation.

## Dependencies
- Shared source anchor: `ctx:sha256:084012f69b4bb6720b2260bd7bede38839f9e787c0260245a9c9144c905aad91#chunk:c000001`
- Origin manifest: `.runs/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83-docs-packet/cli/2026-04-21T06-08-56-583Z-f041257c/manifest.json`
- Parent-owned implementation seam:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
- Parent-owned adjacent surfaces:
  - provider-intake state/update surface
  - `co-status` / `CO STATUS` projection surface
  - capacity contract using `max_concurrent_agents`
  - adjacent issue/debt context: `CO-267`, `CO-281`, `CO-282`, and missing provider-control-host provenance debt

## Validation
- Child lane only:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8'))"`
  - `rg -n "control host|provider-intake|co-status|already-active discovered runs|capacity gating|max_concurrent_agents|providerIssueHandoff\\.ts|CO-267|CO-281|CO-282|attach/rehydration ordering|missing provider-control-host provenance debt" docs/PRD-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md docs/ACTION_PLAN-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md tasks/specs/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md tasks/tasks-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md .agent/task/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md`
  - `git diff --check -- docs/PRD-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md docs/ACTION_PLAN-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md tasks/specs/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md tasks/tasks-linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md .agent/task/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83.md tasks/index.json docs/TASKS.md`
- Parent implementation lane:
  - focused provider-handoff regression for full occupancy with already-active discovered provider-worker runs
  - focused projection/status regression showing provider-intake, `co-status`, or `CO STATUS` attaches/projects active work before capacity suppression
  - negative validation that invalid active-run proof remains rejected
  - docs-review before implementation and parent-selected validation after source edits
- Rollback plan:
  - revert the parent ordering change if it changes `max_concurrent_agents`, hides active-run truth, weakens validation, or folds provenance debt into CO-286.

## Risks & Mitigations
- Risk: parent fixes the symptom by changing `max_concurrent_agents`.
  - Mitigation: keep cap-only fix from 3 to 4 as an explicit rejected interpretation.
- Risk: parent makes manual worker starts the steady-state answer.
  - Mitigation: require attach/project ordering to work through control host/provider-intake.
- Risk: parent changes only `co-status` rendering.
  - Mitigation: require focused regression at the handoff/attach ordering seam.
- Risk: provenance debt is mixed into CO-286 and obscures the ordering fix.
  - Mitigation: keep missing provider-control-host provenance debt as separate handling throughout docs and checklist.

## Approvals
- Docs packet child lane: `.runs/linear-937a8e46-5f29-49b6-8272-83db7a3f1a83-docs-packet/cli/2026-04-21T06-08-56-583Z-f041257c/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
