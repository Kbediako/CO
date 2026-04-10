# Task Checklist - linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702

- Linear Issue: `CO-120` / `cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- MCP Task ID: `linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702`
- Primary PRD: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- TECH_SPEC: `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`

## Docs
- [x] Docs packet recreated and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/TECH_SPEC-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `docs/ACTION_PLAN-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/specs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `tasks/tasks-linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`, `.agent/task/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702.md`.
- [x] Audited docs-review child-stream attempts were recorded on the rework-reset packet; the latest `co-120-docs-review-r2` run completed delegation/spec/docs checks and then stalled inside bounded review, so packet truth was finalized with manual packet review plus green `docs:check` / `docs:freshness` fallback evidence. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/commands/01-delegation-guard.ndjson`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/commands/03-docs-check.ndjson`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/commands/04-docs-freshness.ndjson`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/review/output.log`.
- [ ] Exactly one persistent Linear workpad comment is current for this reset attempt. Pending: retry `linear upsert-workpad` after the active shared-budget cooldown lifts at `2026-04-10T09:37:42.699Z`. Local source: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`.

## Investigation
- [x] Live Linear workflow states were rechecked in `Rework` before active coding. Evidence: `linear issue-context`.
- [x] Required same-turn parallelization decision recorded as `forbid_parallel` / `parent_only_mutation`. Evidence: `linear parallelization --decision forbid_parallel --reason parent_only_mutation`.
- [x] The stale PR `#395` was closed and the stale Linear workpad was deleted as part of the required rework reset. Evidence: `gh pr close 395`, `linear delete-workpad`.
- [x] The workspace was reset onto fresh branch `linear/co-120-worktree-git-identity-isolation-rework` from `origin/main` before repo edits. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main`, `git switch -c linear/co-120-worktree-git-identity-isolation-rework origin/main`.
- [x] Baseline audit confirmed the bounded seam: the CO-102 archive-sync session log and the checked-in archive automation workflow both use plain `git config user.*` inside linked worktrees, while the repo currently has no repo-owned `git config --worktree` identity path on `origin/main`. Evidence: `/Users/kbediako/.codex/sessions/2026/04/09/rollout-2026-04-09T08-32-53-019d6f3a-208e-7220-a6c7-2e2046309ec0.jsonl`, `.github/workflows/archive-automation-base.yml`.
- [x] Filed same-project follow-up `CO-148` for explicit historical shared-config remediation/detection rather than widening CO-120 beyond future leak prevention. Evidence: https://linear.app/asabeko/issue/CO-148/co-workflow-add-explicit-remediation-for-historical-shared-git

## Implementation
- [x] Add a repo-owned helper that preserves global identity inheritance by default and uses `git config --worktree` for explicit alternate identity only. Evidence: `scripts/worktree-git-identity.mjs`.
- [x] Make the helper own the `extensions.worktreeConfig` precondition explicitly before any first `git config --worktree` identity write. Evidence: `scripts/worktree-git-identity.mjs`.
- [x] Switch the linked-worktree archive automation workflow to the safe helper path. Evidence: `.github/workflows/archive-automation-base.yml`.
- [x] Add focused regression coverage proving the shared repo git config file remains free of a repo-local `[user]` override after linked-worktree helper execution. Evidence: `tests/worktree-git-identity.spec.ts`.
- [x] Record the exact verification path that proves the cloud/Codex-upgrade hypothesis is not the root cause of this bug. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-120-docs-review-r2 --format json` reached the bounded docs-review lane and recorded its manifest/log evidence before stalling inside the review phase. Evidence: `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/manifest.json`, `.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702-co-120-docs-review-r2/cli/2026-04-10T08-33-39-957Z-ee6cd206/review/output.log`.
- [x] Focused linked-worktree helper regression coverage in a temporary repo on the fresh `origin/main` base. Evidence: `npx vitest run tests/worktree-git-identity.spec.ts`.
- [x] Exact shared repo git-config before/after verification commands recorded and rerun locally, including the `extensions.worktreeConfig=true` helper path when explicit worktree-local identity is requested. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/workpad.md`.
- [x] Merged the latest `origin/main` into the rework branch before review handoff prep. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main`, `git merge --no-edit origin/main`.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `node scripts/diff-budget.mjs`
- [x] Manifest-backed standalone review was rerun on the final post-merge diff with `npm run review -- --base origin/main`, and the wrapper again terminated as `review_outcome: failed-boundary` / `termination_boundary.kind: command-intent` after a direct validation-runner launch. Evidence: `/Users/kbediako/Code/CO/.runs/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/cli/2026-04-10T06-48-53-673Z-ff73033a/review/telemetry.json`.
- [x] Manual fallback review of the final post-merge diff found no actionable CO-120 defects. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T100352Z-review-fallback.md`.
- [x] Explicit elegance/minimality review kept the implementation at one helper, one workflow callsite swap, and one focused regression test file. Evidence: `out/linear-cc5c55d9-9145-4fa8-93d9-551a3fff7702/manual/20260410T100352Z-elegance-note.md`.

## Handoff
- [x] Fresh PR attached to the issue. Evidence: `linear issue-context`, `https://github.com/Kbediako/CO/pull/416`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main`, `git merge --no-edit origin/main`.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [x] Unresolved actionable review threads: `0`. Evidence: `gh api graphql ... reviewThreads(first:100)`, `gh api 'repos/Kbediako/CO/pulls/416/comments?per_page=100'`, `gh api 'repos/Kbediako/CO/issues/416/comments?per_page=100'`.
- [ ] Issue moved to `Human Review` or `In Review`.
