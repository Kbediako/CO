# Land

Use this skill when a CO worker is shepherding an attached PR from review-complete into merge and final Linear closeout.
This skill covers the `Merging` phase; use `skills/linear/SKILL.md` for Linear workpad, review, and state-transition rules.

## When To Use

- The Linear issue is in `Merging`.
- The PR is approved or near-approved and needs active watch/resolve/merge handling.
- The worker needs to keep ownership through merge completion instead of stopping at review handoff.

## Preconditions

- The PR is attached to the Linear issue.
- Required implementation work is already complete.
- Required validation and PR checks are green, or you are actively resolving the blockers that prevent green.
- Unresolved actionable review threads are zero before merge.
- The issue does not move to `Done` until the PR merge is complete.

## Preferred Command

Use the shipped repo merge loop first:

```bash
codex-orchestrator pr resolve-merge \
  --pr "$PR_NUMBER" \
  --quiet-minutes 15
```

Add `--auto-merge` only when the PR is approved, mergeable, and ready to land without more author work.

Repo-local fallback:

```bash
npm run pr:resolve-merge -- \
  --pr "$PR_NUMBER" \
  --quiet-minutes 15
```

## Merge Loop

1. Confirm the PR is not draft and is not labeled `do not merge`.
2. Confirm unresolved actionable review threads are zero.
3. Confirm required checks are green or keep shepherding until they are.
4. If merge conflicts, failing checks, or new review feedback appear, handle them immediately. If the PR needs more code changes, resume the issue through `Rework` rather than pretending merge is still blocked-only.
5. Keep the same PR, branch, and workpad current while monitoring the merge loop.
6. Once the PR merges, reconcile the shared local root checkout before `Done`.

## Shared Root Reconciliation

After the PR merges and before moving the issue to `Done`:

1. Inspect the shared local root checkout, not the per-issue worktree. This is the repo checkout that owns `.workspaces/`.
2. Record the before state in the same workpad closeout using `git -C "$SHARED_ROOT" status --short --branch`.
3. Only when that checkout is on `main` and clean, run:

```bash
git -C "$SHARED_ROOT" fetch origin main
git -C "$SHARED_ROOT" merge --ff-only origin/main
```

4. Record the after state with the same `git status --short --branch` command.
5. If the checkout is dirty, detached, on another branch, or otherwise unsafe to mutate, do not force a sync. Leave it untouched and record the explicit skip reason in the same workpad closeout.
6. Do not mutate the issue worktree or other active workspaces as part of this step.

## Linear Closeout

After the PR merges, move the issue to `Done` with the Linear helper:

```bash
codex-orchestrator linear transition \
  --issue-id "$ISSUE_ID" \
  --state "Done" \
  --format json
```

Do not transition to `Done` before the merge has actually completed and the shared-root reconciliation result is recorded.
