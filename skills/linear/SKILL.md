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
node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/bin/codex-orchestrator.js" linear <subcommand> --format json ...
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

When a lane needs a fresh screenshot on macOS, capture it through the repo-owned helper first:

```bash
codex-orchestrator linear screenshot-proof \
  --issue-id "$ISSUE_ID" \
  --output /absolute/path/to/proof.png \
  --format json
```

Use `capture.embed_markdown` from that JSON directly in the workpad body. The helper keeps local capture outcomes separate from later Linear upload/embed outcomes.

When a screenshot already exists locally, embed it in the workpad body as markdown image syntax that points at that file (prefer `file:///absolute/path/to/proof.png`; use `<file:///absolute/path/to/proof (1).png>` when the path contains spaces or parentheses). The helper uploads local PNG/JPG/JPEG/WEBP/GIF image references to Linear and rewrites them to Linear-hosted asset URLs before the workpad comment mutation lands. Use runtime-proof or external URLs only when reviewer-visible external proof is acceptable.

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

## Parallelization Decision

Ordinary active provider-worker turns are parallel-first where safe. Before recording `linear parallelization`, write a pre-turn decomposition matrix in the workpad or notes. The matrix must include candidate child lanes, file/phase scope, dependencies, overlap risk, expected validation artifact, child-lane owner, and cap-slot use.

```bash
codex-orchestrator linear parallelization \
  --issue-id "$ISSUE_ID" \
  --decision parallelize_now \
  --reason independent_scope_available \
  --summary "matrix found a safe docs/test child lane; cap 0/2 -> 1/2" \
  --format json
```

Use `parallelize_now` when the matrix contains at least one safe independent child-lane candidate. Do not use `stay_serial` while a safe independent candidate remains unless the cap is exhausted. When `single_bounded_change` is the reason, the summary must include labeled per-slice evidence: `docs: ...; test: ...; research: ...; review: ...`.

The same-issue child-lane cap is `2`. It counts active, pending, and unaccepted child lanes and does not bypass provider admission constraints from CO-125. If the cap is exhausted, do not launch another lane; record `stay_serial` with reason `existing_child_lane_active` and include labeled `cap_exhausted:` evidence in the summary. Stale in-flight accept claims older than 30 minutes, and legacy in-flight claims without timestamps, are recoverable and do not consume cap slots.

Parent ownership remains strict. While a child lane is active, the parent avoids delegated files/phases. If parent edits collide with delegated scope, invalidate or reject the child lane, or record explicit rebase/collision reasoning before accepting the child patch.

## Runtime Proof

For app-touching lanes, use the runtime-proof helper to turn permit policy into an explicit screenshot / external-link / video posture and, when allowed, generate reviewer-usable workpad and PR markdown. This is the reviewer-URL path, not the local macOS capture path.

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
The stronger contract also preserves:
- `Intent Checksum`: exact wording, protected terms, and nearby wrong interpretations to reject
- `Non-Goals`
- `Not Done If`
- required `Parity / Alignment Matrix` when `--parity-lane` marks a parity/alignment follow-up
- deterministic `Immediate Traceability` back to the repo packet expected before the follow-up leaves `Backlog`

```bash
codex-orchestrator linear create-follow-up \
  --issue-id "$ISSUE_ID" \
  --title "Follow-up title" \
  --description-file /tmp/follow-up-description.md \
  --intent-checksum-file /tmp/follow-up-intent-checksum.md \
  --non-goals-file /tmp/follow-up-non-goals.md \
  --not-done-if-file /tmp/follow-up-not-done-if.md \
  --acceptance-criteria-file /tmp/follow-up-acceptance.md \
  --parity-lane \
  --parity-matrix-file /tmp/follow-up-parity-matrix.md \
  --blocked-by-source \
  --format json
```

For recurring baseline debt, prefer canonical-owner reuse/update over a fresh issue. Inspect the `candidate_cohorts` emitted by machine output such as `docs:freshness:maintain`, choose the intended cohort, and pass that cohort's exact `canonical_owner_key`; the helper reuses only open same-team same-project issues stamped with the exact marker and treats `Done`, `Duplicate`, and `Cancelled`/`Canceled` issues as evidence only.

When the maintenance output includes `owner_finalizer`, treat it as the owner closeout authority. `blocked_terminal_owner` means the issue must not move to terminal; route the debt through the exact canonical owner key instead of manually swapping owner metadata or closing the short-lived owner lane. `not_applicable` only means no active candidates currently resolve to an owner, not that a terminal owner is reusable later.

```bash
jq '.candidate_cohorts[] | {id, status, canonical_owner_key, sample_paths}' out/<task-id>/docs-freshness-maintenance.json
jq '.owner_finalizer' out/<task-id>/docs-freshness-maintenance.json
# After selecting the intended cohort, replace <cohort-id> with its id.
canonical_owner_key="$(jq -er '.candidate_cohorts[] | select(.id == "<cohort-id>") | .canonical_owner_key // empty' out/<task-id>/docs-freshness-maintenance.json)"
codex-orchestrator linear create-follow-up \
  --issue-id "$ISSUE_ID" \
  --title "Recurring baseline owner" \
  --description-file /tmp/follow-up-description.md \
  --intent-checksum-file /tmp/follow-up-intent-checksum.md \
  --non-goals-file /tmp/follow-up-non-goals.md \
  --not-done-if-file /tmp/follow-up-not-done-if.md \
  --acceptance-criteria-file /tmp/follow-up-acceptance.md \
  --canonical-owner-key "$canonical_owner_key" \
  --format json
```

## Workflow Notes

- Move `Todo` or the live team's equivalent queued state (for CO, `Ready`) to the actual started state before active coding when the issue is unblocked.
- Use the Linear issue id, not the human identifier, for helper commands.
- When you discover a meaningful out-of-scope improvement, use `create-follow-up` so the issue stays in the same project, starts in `Backlog` when newly created, records intent checksum/non-goals/not-done-if, requires a parity matrix for parity/alignment lanes, and returns the reused or created follow-up identifier/URL for workpad references.
- For recurring baseline debt, pass the deterministic `--canonical-owner-key` from machine output before creating follow-ups. Do not file a fresh issue when an open same-team same-project owner is already stamped with that exact marker.
- For docs freshness owner closeout, cite `owner_finalizer` from `docs:freshness:maintain`; do not treat terminal Linear state as local archive readiness or use manual owner swaps to bypass `blocked_terminal_owner`.
- Treat `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` and `CODEX_ORCHESTRATOR_PACKAGE_ROOT` as provider-lane-only overrides. Child streams and repo-local validation/test subprocesses should strip them unless the subprocess explicitly needs provider snapshot/package-root behavior.
- Prefer an installed global `linear` skill when available, and fall back to this bundled `skills/linear/SKILL.md` copy only when no global skill is installed.
- Keep exactly one active `## Codex Workpad` comment current. Refresh it after each meaningful milestone, immediately before review or merge handoffs, after rework, and after merge completion. Final closeout stays in the same workpad comment. Do not create duplicate progress or terminal summary comments.
- Always read `issue-context` before any transition so you use the team's actual workflow state names.
- Attach the PR before handing off to `Human Review` or the live-team alias `In Review`.
- In provider-worker issue workspaces, audited `linear child-stream` and `linear child-lane` runs record manifests under the workspace-scoped artifact root for that issue workspace, for example `.runs/linear-<uuid>/cli/<runId>/manifest.json`.
- Treat those workspace-scoped manifests as the intended delegation evidence path.
- Do not reach for blanket `DELEGATION_GUARD_OVERRIDE_REASON` text when valid child evidence already exists in the workspace artifact tree.
- If a PR is already attached, run a full PR feedback sweep before any new implementation work:
  - check top-level PR comments
  - check inline review comments and unresolved review threads
  - check review summaries / decisions
  - resolve each actionable item or post explicit, justified pushback
- For app-touching lanes, use `runtime-proof` before review handoff so the workpad and PR carry reviewer-usable proof links instead of local-only artifact paths. Add `--reachability-mode dns-public` only when worker-local DNS public-resolution evidence is worth the extra environment-dependent check.
- Use `screenshot-proof` when you still need to create a local screenshot artifact on macOS. For an existing screenshot, direct local-file workpad embedding is the right path. `runtime-proof` is for cases where reviewers need an external proof URL rather than a workpad-embedded local capture.
- After opening or updating a PR, run `codex-orchestrator pr ready-review --pr "$PR_NUMBER" --quiet-minutes <window>` and keep the issue out of review until that bounded automated-feedback drain exits cleanly or reveals a blocker you handle explicitly.
- Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff before opening a new PR for review handoff, before updating an already attached PR for handoff, and before transitioning the issue to `Human Review` or `In Review`.
- Use the repo heuristic for non-trivial work: about 2+ changed files or about 40+ changed lines, unless you record an explicit skip justification in the workpad.
- Run the standalone review first. When manifest-backed evidence matters, use the wrapper-led review path by default; if review tooling is unavailable or stalls without a concrete verdict, do a manual correctness/regressions/missing-tests review plus a manual elegance checklist and record that fallback instead of stalling.
- After standalone-review findings are addressed, run an explicit elegance/minimality pass before handoff and record any kept complexity or fallback.
- Treat `review/telemetry.json` `review_verdict: findings` as actionable review feedback even when wrapper execution reports `status: succeeded`, `review_outcome: clean-success`, or `review_outcome: bounded-success`; record the finding count/severity in the workpad and do not call the review clean until the findings are resolved or explicitly pushed back.
- Treat `review_verdict: unknown` or missing `review_verdict` as a review-handoff blocker until a fresh review produces `review_verdict: clean` or an explicit break-glass waiver records owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence.
- When `review/telemetry.json` reports `status: succeeded` with `review_outcome: bounded-success`, record it in the workpad and validation notes as successful bounded review completion, not as a blocker or generic quiet-tail failure. This wrapper outcome does not override `review_verdict`, and clean handoff still requires `review_verdict: clean`. If you retain an older succeeded payload path with a preserved `termination_boundary`, treat it as retained-fallback behavior and require owner, trigger, introduced date, review date, maximum lifetime or expiry, removal condition, reason, and validation evidence before accepting it as bounded review completion.
- Treat `review_outcome: failed-boundary` (or older failed telemetry with a non-null `termination_boundary`) as an explicit review-wrapper boundary failure. Treat `failed-other` as a failed review command without a classified boundary, not as proof of wrapper breakage, and keep unrelated validation, CI, or merge blockers labeled separately instead of blaming the review wrapper.
- Before handing off to `Human Review` or `In Review`, the completion bar is:
  - required validation is green
  - `docs-review` and `implementation-gate` freshness status comes from the machine-readable `docs:freshness:maintain` decision; cite `pass_with_owned_rolling_debt` only when current diff/task-packet paths are clean and the owner issue/cap/window evidence is present
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
