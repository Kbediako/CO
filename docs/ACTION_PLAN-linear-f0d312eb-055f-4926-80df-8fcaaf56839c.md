# ACTION_PLAN - CO workflow: unblock repo-wide spec/docs freshness review blockers

## Traceability
- Linear issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- Source issue: `CO-99`
- Source PR: `#368`

## Summary
- Goal: restore clean repo-wide docs/spec freshness validation so unrelated implementation lanes can hand off without being blocked by stale baseline debt.
- Scope: docs-first registration, audited docs review, exact stale-surface audit, bounded stale packet/spec refresh or reconciliation, validation reruns, and review-handoff preparation.
- Assumptions:
  - the blocker can be resolved with documentation/task-surface changes rather than policy changes

## Execution Update 2026-04-06
- Baseline stale inventory resolved into two exact cohorts:
  - `Spec guard`: stale `last_review` frontmatter on `1001` and `1009`-`1031`.
  - `docs:freshness`: the separate `stale docs: 19` registry cohort rooted in `.agent/SOPs/instruction-stamps.md` plus the `0932`-`0934` packet family.
- The lane refreshed those exact surfaces and reran the gates to green: `docs-review` child stream, `delegation-guard`, `spec-guard --dry-run`, `docs:freshness`, `docs:check`, `build`, `lint`, and `test`.
- PR `#370` is open with the required diff-budget override metadata; remaining work is limited to the rerun checks, clearing actionable feedback to `0` unresolved review threads (or recording a waiver with evidence), reconfirming branch sync before handoff, and completing the `pr ready-review` drain plus review-state transition.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Spec guard`
  - `docs:freshness`
  - `last_review`
  - `stale docs: 19`
  - `Core Lane`
  - `review handoff blockers`
- Not done if:
  - `spec-guard --dry-run` still fails on the stale cohort
  - `docs:freshness` still reports stale docs after the refresh/reconciliation pass
  - the lane only succeeds by weakening the freshness policies
- Pre-implementation issue-quality review:
  - the issue is specifically about shared repo freshness blockers, so the implementation should stay on docs/spec packet truth and should not expand into unrelated runtime work

## Milestones & Sequencing
1. Register the docs-first packet, branch, task mirrors, and single Linear workpad.
2. Run an audited `docs-review` child stream and keep the packet aligned with the approved scope.
3. Capture the exact `Spec guard` and `docs:freshness` stale surfaces on the current branch.
4. Refresh or otherwise reconcile the stale docs/spec cohort and any required packet mirrors.
5. Rerun the freshness guards, then complete standalone review and an explicit elegance/minimality pass before handoff.

## Dependencies
- Current workspace branch `linear/co-102-spec-docs-freshness-blockers`
- `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear ...` helper surface
- `scripts/spec-guard.mjs`
- `scripts/docs-freshness.mjs`
- stale task/spec packet cohort rooted in `1001` and `1009`-`1031`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-102-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:check`
  - remaining required validation floor as needed if the final diff exceeds docs-only scope
  - `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert the bounded freshness edits if they create incorrect task/spec truth
  - prefer explicit archival or follow-up tracking over silent `last_review` churn if a surface is no longer truthful to keep active

## Risks & Mitigations
- Risk: `docs:freshness` may surface additional stale packet entries beyond the expected spec cohort.
  - Mitigation: rerun the command first, record the full stale set, and either reconcile it in-scope or split a clearly bounded follow-up if truly unrelated. Resolved in this lane: the additional stale set was the exact 19-entry registry cohort already refreshed.
- Risk: blindly updating `last_review` could make stale content look fresh.
  - Mitigation: read the stale surfaces before refreshing them and record why each one still reflects current truth.
- Risk: repo-wide docs changes exceed a trivial diff and need stronger review evidence.
  - Mitigation: keep the edit set bounded, run manifest-backed review, and record any review fallback explicitly.

## Approvals
- Reviewer: pending
- Date: 2026-04-06
