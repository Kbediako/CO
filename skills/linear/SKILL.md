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

Keep the workpad body in this exact top-level order, with every section non-empty:

```md
## Codex Workpad

### Environment / Workspace Stamp
### Plan
### Acceptance Criteria
### Validation
### Notes
```

`Acceptance Criteria` and `Validation` must contain non-empty checkbox list items (`- [ ] task` / `- [x] task`).
`Environment / Workspace Stamp`, `Plan`, and `Notes` may stay free-form as long as they remain non-empty.

If the ticket includes `Validation`, `Test Plan`, or `Testing` requirements, mirror them in the workpad `Acceptance Criteria` and `Validation` sections.

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

## Runtime Proof

For app-touching lanes, use the runtime-proof helper to turn permit policy into an explicit screenshot / external-link / video posture and, when allowed, generate reviewer-usable workpad and PR markdown.

Inspect the current permit posture first:

```bash
codex-orchestrator linear runtime-proof \
  --issue-id "$ISSUE_ID" \
  --origin "https://app.example.com" \
  --format json
```

Generate handoff content once you have a reviewer-visible proof URL:

```bash
codex-orchestrator linear runtime-proof \
  --issue-id "$ISSUE_ID" \
  --origin "https://app.example.com" \
  --kind screenshot \
  --proof-url "https://review-assets.example.com/co-8-dashboard.png" \
  --title "Dashboard after launch-app validation" \
  --summary "Signed-in dashboard state used for review handoff." \
  --format json
```

Paste `handoff.workpad_markdown` into the workpad and `handoff.pr_markdown` into the PR description or a review-ready PR comment.
The helper fails closed when:
- the permit file is unreadable
- the origin is not approved
- the requested proof kind is blocked
- the proof URL is loopback or otherwise local-only
- only a local file path exists instead of a reviewer-visible proof URL

## Pre-Review Drain

After opening or updating a PR, run the shipped bounded automated-feedback drain before moving the issue to `Human Review` or `In Review`.

```bash
codex-orchestrator pr ready-review \
  --pr "$PR_NUMBER" \
  --quiet-minutes 15
```

`ready-review` waits for green gating signals plus a bounded quiet window, treats `REVIEW_REQUIRED` as informational for review handoff, and exits non-zero when the author still needs to address actionable blockers.

## Follow-Up Issues

When you discover a meaningful out-of-scope improvement, create a separate same-project follow-up issue in `Backlog` instead of expanding the current issue.
The helper always adds a `related` relation to the source issue and can also add blocker linkage when the follow-up depends on the source issue landing first.

```bash
codex-orchestrator linear create-follow-up \
  --issue-id "$ISSUE_ID" \
  --title "Follow-up title" \
  --description-file /tmp/follow-up-description.md \
  --acceptance-criteria-file /tmp/follow-up-acceptance.md \
  --blocked-by-source \
  --format json
```

## Workflow Notes

- Move `Todo` or the live team's equivalent queued state (for CO, `Ready`) to the actual started state before active coding when the issue is unblocked.
- Use the Linear issue id, not the human identifier, for helper commands.
- When you discover a meaningful out-of-scope improvement, use `create-follow-up` so the new issue stays in the same project, starts in `Backlog`, and returns the created follow-up identifier/URL for workpad references.
- Treat `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` and `CODEX_ORCHESTRATOR_PACKAGE_ROOT` as provider-lane-only overrides. Child streams and repo-local validation/test subprocesses should strip them unless the subprocess explicitly needs provider snapshot/package-root behavior.
- Keep exactly one active `## Codex Workpad` comment current. Refresh it after each meaningful milestone, immediately before review or merge handoffs, after rework, and after merge completion. Final closeout stays in the same workpad comment. Do not create duplicate progress or terminal summary comments.
- Always read `issue-context` before any transition so you use the team's actual workflow state names.
- Attach the PR before handing off to `Human Review` or the live-team alias `In Review`.
- If a PR is already attached, run a full PR feedback sweep before any new implementation work:
  - check top-level PR comments
  - check inline review comments and unresolved review threads
  - check review summaries / decisions
  - resolve each actionable item or post explicit, justified pushback
- For app-touching lanes, use `runtime-proof` before review handoff so the workpad and PR carry reviewer-usable proof links instead of local-only artifact paths. Add `--reachability-mode dns-public` only when worker-local DNS public-resolution evidence is worth the extra environment-dependent check.
- After opening or updating a PR, run `codex-orchestrator pr ready-review --pr "$PR_NUMBER" --quiet-minutes <window>` and keep the issue out of review until that bounded automated-feedback drain exits cleanly or reveals a blocker you handle explicitly.
- Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff before opening a new PR for review handoff, before updating an already attached PR for handoff, and before transitioning the issue to `Human Review` or `In Review`.
- Use the repo heuristic for non-trivial work: about 2+ changed files or about 40+ changed lines, unless you record an explicit skip justification in the workpad.
- Run the standalone review first. When manifest-backed evidence matters, use the wrapper-led review path by default; if review tooling is unavailable or stalls without a concrete verdict, do a manual correctness/regressions/missing-tests review plus a manual elegance checklist and record that fallback instead of stalling.
- After standalone-review findings are addressed, run an explicit elegance/minimality pass before handoff and record any kept complexity or fallback.
- Before handing off to `Human Review` or `In Review`, the completion bar is:
  - required validation is green
  - actionable PR feedback is handled or explicitly pushed back
  - the latest `origin/main` is merged into the branch
  - PR checks are green
  - the `pr ready-review` drain is clean
  - the workpad is refreshed to match the current implementation and remaining risks
  - the workpad records the review goal, findings or fallback, and final clean or justified status for the standalone/elegance gate
- `Human Review` and `In Review` are review handoff states. Do not keep coding there; refresh the workpad if needed, record the handoff clearly, and end the turn instead of polling inside the same run.
- `Rework` means a full reset on the same issue. Close the previous PR, delete the old workpad, create a fresh branch from `origin/main`, create a new bootstrap workpad, then execute end to end again before handing the issue back to `Human Review` or `In Review`.
- `Merging` means the issue is still active. Follow `skills/land/SKILL.md` to shepherd the PR through checks, conflicts, approvals, and merge completion.
- In `Merging`, final closeout must also inspect the shared local root checkout, record before/after `git status --short --branch` output in the same workpad comment, refresh the local `origin/main` tracking ref from remote `main`, and only then fast-forward that checkout to `origin/main` when it is on clean `main`; otherwise, record an explicit skip reason and leave the checkout untouched before `Done`.
- Only move the issue to `Done` after the PR is actually merged and the shared-root closeout result is recorded. `Merging` and `Rework` are active workflow states only when the team exposes them.
