# ACTION_PLAN - linear-11faa458-6864-4317-8f28-3fcf606c55a2

## Summary
- Goal: add explicit historical cleanup for shared repo-local git identity leakage without changing the CO-120 future-leak-prevention contract.
- Scope: docs-first packet, single persistent workpad, audited docs-review child stream, one shared-checkout remediation helper, one bounded preventive-helper wording update, focused regression coverage, and the normal validation/review gates.
- Assumptions:
  - `CO-120` already handles future leak prevention through the worktree helper and workflow
  - the missing contract is shared-checkout detection/remediation for pre-existing shared-checkout config pollution at `/Users/kbediako/Code/CO/.git/config`
  - historical cleanup should stay operator-owned and opt-in

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `shared repo-local git identity override`, `user.name`, `user.email`, .git/config, `linked-worktree helper flow`, `future leak prevention`, and `historical cleanup`.
- Not done if: there is still no exact shared-checkout command path for detection, cleanup still depends on worktree-helper auto-mutation, or docs still blur future prevention with historical cleanup.
- Pre-implementation issue-quality review: approved. The bounded seam is a new shared-checkout helper plus explicit scope wording, not a rewrite of the CO-120 helper/workflow design.

## Milestones & Sequencing
1. Create the CO-148 docs packet, registry entries, checklist mirrors, and local workpad source; upsert the single workpad comment.
2. Run audited `linear child-stream --pipeline docs-review`, record the manifest, and resolve any packet or scope findings before code.
3. Add `scripts/shared-repo-git-identity.mjs` so it reports repo-local `user.name` / `user.email` status and clears them only when explicitly requested from the shared checkout root.
4. Update `scripts/worktree-git-identity.mjs` usage/help text so the preventive helper explicitly points historical cleanup to the shared-checkout path instead of auto-mutating shared config.
5. Add focused temp-repo regression tests plus exact verification commands for detect/clear behavior and linked-worktree refusal.
6. Run the required validation floor, standalone review, explicit elegance review, and workpad refresh before any PR or review handoff.

## Dependencies
- `scripts/worktree-git-identity.mjs`
- `scripts/shared-repo-git-identity.mjs`
- focused `tests/` coverage
- local `git` behavior for shared checkouts and linked worktrees

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-11faa458-6864-4317-8f28-3fcf606c55a2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-148-docs-review --format json`
  - `node scripts/shared-repo-git-identity.mjs --repo-root /Users/kbediako/Code/CO`
  - `node scripts/shared-repo-git-identity.mjs --repo-root /Users/kbediako/Code/CO --clear`
  - focused helper regression in a temporary repo plus linked worktree
  - exact verification path that inspects `/Users/kbediako/Code/CO/.git/config` through the shared-checkout helper
  - required repo validation floor after implementation
  - manifest-backed standalone review and explicit elegance review before handoff
- Rollback plan:
  - revert the shared-checkout helper and preventive-helper wording together so repo behavior returns to the pre-CO-148 state without leaving a misleading partial cleanup contract

## Risks & Mitigations
- Risk: the remediation helper clears config from a linked worktree instead of the shared checkout.
  - Mitigation: require `--repo-root`, verify it resolves to the shared checkout root, and fail closed when `.git` is not a real directory there.
- Risk: cleanup removes allowed shared config beyond `user.name` / `user.email`.
  - Mitigation: target only those keys and assert that unrelated shared config remains.
- Risk: the new docs/helper wording makes reviewers think CO-120 should auto-clean historical pollution.
  - Mitigation: state the contract boundary explicitly in the helper usage text, packet, and workpad.
- Risk: the lane drifts into global git policy or authorship rewriting.
  - Mitigation: keep the scope fixed on detection, opt-in cleanup, and contract wording only.

## Approvals
- Reviewer: `codex-orchestrator linear child-stream docs-review` clean success recorded at `.runs/linear-11faa458-6864-4317-8f28-3fcf606c55a2-co-148-docs-review-r2/cli/2026-04-11T08-05-56-491Z-bce2642d/manifest.json`.
- Date: 2026-04-11
