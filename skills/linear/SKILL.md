# Linear

Use this skill when a CO worker or operator needs to read or mutate Linear through the repo's worker-owned helper surface.

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

- Move `Todo` to `In Progress` before active coding when the issue is unblocked.
- Keep exactly one active `## Codex Workpad` comment current.
- Attach the PR before handing off to `Human Review` or the live-team alias `In Review`.
- Stop coding in `Human Review` or `In Review`.
- Treat `Merging` and `Rework` as active workflow states.
