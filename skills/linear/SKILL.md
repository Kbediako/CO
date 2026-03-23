# Linear

Use this skill when a CO worker or operator needs to read or mutate Linear through the repo's worker-owned helper surface.
Pair it with `skills/land/SKILL.md` once an attached PR enters the merge shepherding phase.

## Commands

Use the packaged CLI when available:

```bash
codex-orchestrator linear <subcommand> --format json ...
```

Inside provider-worker runs, the exact helper command is usually:

```bash
node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/bin/codex-orchestrator.js" linear <subcommand> --format json ...
```

## Issue Context

Read the current issue state, team states, comments, attachments, and active workpad comment:

```bash
codex-orchestrator linear issue-context \
  --issue-id "$ISSUE_ID" \
  --format json
```

## Workpad

Maintain exactly one persistent `## Codex Workpad` comment. Reuse the existing comment when present; do not create duplicate progress comments.

```bash
codex-orchestrator linear upsert-workpad \
  --issue-id "$ISSUE_ID" \
  --body-file /tmp/workpad.md \
  --format json
```

The body must contain the `## Codex Workpad` marker.

Delete the current unresolved workpad comment when a Symphony-style `Rework` reset requires a fresh attempt:

```bash
codex-orchestrator linear delete-workpad \
  --issue-id "$ISSUE_ID" \
  --format json
```

## State Transition

Move the issue by state name. The helper resolves the target `stateId` from the issue's team workflow states.
Use `Human Review` when the team exposes that exact state and `In Review` when the live team uses that review-handoff alias.

```bash
codex-orchestrator linear transition \
  --issue-id "$ISSUE_ID" \
  --state "Human Review" \
  --format json
```

## PR Attachment

Attach a GitHub PR to the issue. The helper prefers the GitHub-specific attachment mutation and falls back to a plain URL attachment when needed.

```bash
codex-orchestrator linear attach-pr \
  --issue-id "$ISSUE_ID" \
  --url "$PR_URL" \
  --title "$PR_TITLE" \
  --format json
```

## Workflow Notes

- Move `Todo` or the live team's equivalent queued state (for CO, `Ready`) to the actual started state before active coding when the issue is unblocked.
- Use the Linear issue id, not the human identifier, for helper commands.
- Keep exactly one active `## Codex Workpad` comment current. Refresh it before new work, before review handoff, after rework, and after merge completion. Do not create duplicate progress comments.
- Always read `issue-context` before any transition so you use the team's actual workflow state names.
- Attach the PR before handing off to `Human Review` or the live-team alias `In Review`.
- If a PR is already attached, run a full PR feedback sweep before any new implementation work:
  - check top-level PR comments
  - check inline review comments and unresolved review threads
  - check review summaries / decisions
  - resolve each actionable item or post explicit, justified pushback
- Before handing off to `Human Review` or `In Review`, the completion bar is:
  - required validation is green
  - actionable PR feedback is handled or explicitly pushed back
  - the latest `origin/main` is merged into the branch
  - PR checks are green
  - the workpad is refreshed to match the current implementation and remaining risks
- `Human Review` and `In Review` are wait states. Do not keep coding there; wait and poll for review or status updates instead. Use patience-first monitoring semantics while the review state remains unchanged.
- `Rework` means a full reset on the same issue. Close the previous PR, delete the old workpad, create a fresh branch from `origin/main`, create a new bootstrap workpad, then execute end to end again before handing the issue back to `Human Review` or `In Review`.
- `Merging` means the issue is still active. Follow `skills/land/SKILL.md` to shepherd the PR through checks, conflicts, approvals, and merge completion.
- Only move the issue to `Done` after the PR is actually merged. `Merging` and `Rework` are active workflow states only when the team exposes them.
