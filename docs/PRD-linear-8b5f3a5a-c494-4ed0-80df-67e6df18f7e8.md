# PRD - CO: Fix ready-review false block on current-head CodeRabbit issue-comment completion

## Added by Bootstrap 2026-04-05

## Summary
- Problem Statement: `codex-orchestrator pr ready-review` can stay falsely blocked on `bot_rereview_pending=[coderabbitai]` after CodeRabbit has already re-reviewed the current PR head and posted a top-level PR issue comment that there are no actionable comments and the PR is ready to merge.
- Desired Outcome: make the ready-review watcher treat the relevant current-head CodeRabbit issue-comment completion as a truthful completion signal without weakening required checks, unresolved feedback gates, or genuine pending rereview detection.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): reproduce the false block from the CO-84 / PR #362 evidence, fix the watcher so current-head CodeRabbit issue-comment completions can unblock the quiet window, and keep the monitor head-aware, so stale bot output never counts for a newer head or rereview cycle.
- Success criteria / acceptance:
  - deterministic reproduction exists for the false `bot_rereview_pending=[coderabbitai]` state
  - current-head CodeRabbit issue-comment completion no longer leaves `ready-review` blocked forever
  - stale-head or pre-request bot output still does not satisfy the current rereview request
  - required checks, unresolved actionable feedback, and quiet-window enforcement remain intact
- Constraints / non-goals:
  - do not disable CodeRabbit gating globally
  - do not accept arbitrary CodeRabbit issue comments without a deterministic current-cycle contract
  - do not broaden the change beyond the watcher seam plus the minimum supporting docs/tests

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `ready-review`
  - `bot_rereview_pending=[coderabbitai]`
  - `current-head`
  - `No actionable comments were generated in the recent review`
  - `PR is ready to merge`
  - `top-level PR issue comments`
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator pr ready-review`
  - `scripts/lib/pr-watch-merge.js`
  - `tests/pr-watch-merge.spec.ts`
  - PR `#362`
  - Linear issues `CO-84` and `CO-85`
- Nearby wrong interpretations to reject:
  - `ready-review` should just be ignored when it gets stuck
  - any CodeRabbit comment on the PR counts even if it predates the latest rereview request or belongs to an older head
  - the fix can weaken required checks or unresolved review gates because this is "only" about a bot

## Parity / Alignment Matrix
- Not applicable.
- Current truth:
  - the watcher already tracks human rereview requests plus CodeRabbit review and pull-comment completion signals
  - the watcher currently ignores top-level PR issue comments for CodeRabbit completion
  - the source issue records a current-head CodeRabbit no-actionable issue comment that still left `ready-review` blocked
- Reference truth:
  - a truthful automated feedback drain should allow the quiet window to begin once CodeRabbit has completed the latest current-head rereview with no actionable feedback
- Target truth / intended delta:
  - current-head CodeRabbit issue-comment completions are accepted under a deterministic contract
  - stale or superseded bot output remains rejected
  - all non-CodeRabbit review and required-check gates behave exactly as before
- Explicitly out-of-scope differences:
  - CodeRabbit service behavior changes
  - broad `pr-watch-merge` refactors unrelated to rereview completion
  - review-loop waivers that bypass the watcher instead of fixing it

## Not Done If
- A current-head CodeRabbit `No actionable comments` or equivalent merge-ready issue comment can still leave `ready-review` stuck on `bot_rereview_pending=[coderabbitai]`.
- The watcher starts accepting stale issue comments from older heads or earlier rereview cycles.
- The only mitigation is a manual waiver or operator instruction to ignore the drain.

## Goals
- Reproduce the false-block condition with deterministic local coverage.
- Land the smallest watcher change that recognizes the intended CodeRabbit issue-comment completion signal.
- Prove stale-head and genuine-pending rereview cases still block.
- Keep the issue packet and Linear workpad aligned through review handoff.

## Non-Goals
- Changing CodeRabbit configuration or GitHub-side behavior.
- Broad comment/review signal refactors outside this seam.
- Relaxing review, check, or quiet-window safety bars.

## Stakeholders
- Product: CO operators depending on truthful ready-review handoff.
- Engineering: CLI/review-wrapper maintainers and provider-worker maintainers.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - targeted regression coverage reproduces the old false block and passes with the fix
  - no regression test shows stale or pending rereview states being misclassified as complete
  - `ready-review` output stays truthful about remaining blockers
- Guardrails / Error Budgets:
  - no safety-bar weakening for required checks or actionable review feedback
  - no non-deterministic heuristics that accept stale bot output
  - no scope creep beyond the minimum watcher/test/docs surfaces

## User Experience
- Personas:
  - provider workers preparing review handoff
  - maintainers waiting on bounded automated feedback drains
- User Journeys:
  - maintainer requests a rereview on the current head
  - CodeRabbit replies with a no-actionable issue comment for that rereview cycle
  - `ready-review` stops reporting `bot_rereview_pending=[coderabbitai]` and starts the quiet window instead of blocking forever

## Technical Considerations
- Architectural Notes:
  - begin from the existing rereview-request/completion signal helpers in `scripts/lib/pr-watch-merge.js`
  - preserve head-aware behavior even though top-level issue comments may not carry the same metadata as pull review comments
  - bias toward an explicit current-cycle completion contract plus regression tests over a broad "any issue comment counts" rule
- Dependencies / Integrations:
  - GitHub PR comments/reviews metadata consumed by `gh api`
  - `pr ready-review` / `pr resolve-merge` watcher snapshots
  - existing `tests/pr-watch-merge.spec.ts` signal-classification coverage

## Open Questions
- Does the actual CodeRabbit issue-comment payload expose enough current-head metadata directly, or should the contract rely on current-cycle timing plus a completion-signature body match?

## Approvals
- Product: pending
- Engineering: pending
- Design: not applicable
