# Task Checklist - linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702

- Linear Issue: `CO-120` / `cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- MCP Task ID: `linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- Primary PRD: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- TECH_SPEC: `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`

## Docs
- [x] Docs packet recreated and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/TECH_SPEC-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/tasks-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `.agent/task/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`.
- [ ] docs-review child-stream evidence recorded on the rework-reset packet, and any surfaced packet-shape feedback resolved before code changes.
- [ ] Exactly one persistent Linear workpad comment is current for this reset attempt.

## Investigation
- [x] Live Linear workflow states were rechecked in `Rework` before active coding. Evidence: `linear issue-context`.
- [x] Required same-turn parallelization decision recorded as `forbid_parallel` / `parent_only_mutation`. Evidence: `linear parallelization --decision forbid_parallel --reason parent_only_mutation`.
- [x] The stale PR `#395` was closed and the stale Linear workpad was deleted as part of the required rework reset. Evidence: `gh pr close 395`, `linear delete-workpad`.
- [x] The workspace was reset onto fresh branch `linear/co-120-worktree-git-identity-isolation-rework` from `origin/main` before repo edits. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main`, `git switch -c linear/co-120-worktree-git-identity-isolation-rework origin/main`.
- [x] Baseline audit confirmed the bounded seam: the CO-102 archive-sync session log and the checked-in archive automation workflow both use plain `git config user.*` inside linked worktrees, while the repo currently has no repo-owned `git config --worktree` identity path on `origin/main`. Evidence: `/Users/kbediako/.codex/sessions/2026/04/09/rollout-2026-04-09T08-32-53-019d6f3a-208e-7220-a6c7-2e2046309ec0.jsonl`, `.github/workflows/archive-automation-base.yml`.

## Implementation
- [ ] Add a repo-owned helper that preserves global identity inheritance by default and uses `git config --worktree` for explicit alternate identity only.
- [ ] Make the helper own the `extensions.worktreeConfig` precondition explicitly before any first `git config --worktree` identity write.
- [ ] Switch the linked-worktree archive automation workflow to the safe helper path.
- [ ] Add focused regression coverage proving the shared repo git config file remains free of a repo-local `[user]` override after linked-worktree helper execution.
- [ ] Record the exact verification path that proves the cloud/Codex-upgrade hypothesis is not the root cause of this bug.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-120-docs-review-r2 --format json`
- [ ] Focused linked-worktree helper regression coverage in a temporary repo on the fresh `origin/main` base.
- [ ] Exact shared repo git-config before/after verification commands recorded and rerun locally, including any one-time `extensions.worktreeConfig=true` setup step.
- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] Standalone review plus explicit elegance pass completed for the final diff before handoff.

## Handoff
- [ ] Fresh PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
