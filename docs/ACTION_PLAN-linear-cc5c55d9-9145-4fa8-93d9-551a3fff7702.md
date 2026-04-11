# ACTION_PLAN - linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702

## Summary
- Goal: stop linked-worktree helper flows from leaking repo-local git identity into the shared checkout while preserving global identity inheritance by default.
- Scope: docs-first packet, single persistent workpad, audited docs-review child stream, one safe worktree-identity helper, one workflow callsite update, focused regression/verification coverage, and the normal validation/review gates.
- Assumptions:
  - the known leak source is local linked-worktree git-config behavior, not cloud authorship mutation
  - the checked-in archive automation workflow is the correct repo-owned callsite to fix now because it still models the unsafe plain `git config user.*` pattern
  - the rework reset should drop the closed PR's unrelated test-harness churn and rebuild only the issue seam on a fresh `origin/main` base

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `/Users/kbediako/Code/CO/.git/config`, `git config --worktree`, `extensions.worktreeConfig`, `inherit global identity by default`, `no shared [user] override`, and `cloud / Codex-upgrade hypothesis is not the root cause`.
- Not done if: any repo-owned linked-worktree helper still writes alternate identity with plain `git config user.*`, still forgets the `extensions.worktreeConfig` precondition, or the closeout still lacks a reproducible proof that the shared repo git config file gained no `[user]` override.
- Pre-implementation issue-quality review: approved. The bounded seam is linked-worktree git identity isolation plus reproducible verification, not historical commit repair, global git configuration, or broader provider/runtime work.

## Milestones & Sequencing
1. Recreate the CO-120 docs packet, registry entries, checklist mirrors, and local workpad source on the fresh rework branch; upsert the single workpad comment.
2. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any packet-shape or scope ambiguity before code.
3. Add a small repo-owned helper that leaves identity unset by default, enables `extensions.worktreeConfig` when Git requires it, and uses `git config --worktree` for explicit alternate identities only.
4. Update `.github/workflows/archive-automation-base.yml` to call the helper instead of plain `git config user.*`.
5. Add a focused temp-repo regression test plus exact verification commands for "no shared `[user]` override", while calling out any explicit `extensions.worktreeConfig=true` setup step.
6. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `.github/workflows/archive-automation-base.yml`
- new `scripts/` helper for linked-worktree git identity isolation
- new `tests/` coverage for linked-worktree git identity behavior
- `git` linked-worktree behavior in the local test environment

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-120-docs-review-r3b --format json`
  - focused helper regression in a temporary linked-worktree repo
  - exact verification path that inspects the shared repo git config file before and after helper execution
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the helper and workflow callsite together so linked-worktree archive flows return to their pre-fix behavior without leaving a half-migrated identity path

## Risks & Mitigations
- Risk: fixing only the workflow callsite still leaves operators without a repeatable safe local path.
  - Mitigation: ship a small repo-owned helper and make the workflow consume the same helper.
- Risk: the helper still writes shared repo-local config due to incorrect git invocation.
  - Mitigation: add a temp-repo regression test that explicitly proves the shared repo git config file has no `[user]` override after the helper runs.
- Risk: `git config --worktree` fails on first use because `extensions.worktreeConfig` is not enabled in the shared repo config.
  - Mitigation: make the helper own that one-time precondition explicitly and prove it in the regression test plus packet wording.
- Risk: the lane drifts into history rewriting, global git policy, or unrelated test churn.
  - Mitigation: keep the scope fixed on future linked-worktree behavior, proof, and the one workflow callsite only.

## Approvals
- Reviewer: pending fresh `docs-review` evidence on the rework-reset packet before implementation.
- Date: 2026-04-10
