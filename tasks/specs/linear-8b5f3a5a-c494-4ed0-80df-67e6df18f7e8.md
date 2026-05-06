---
id: 20260405-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8
title: CO: Fix ready-review false block on current-head CodeRabbit issue-comment completion
status: done
owner: Codex
created: 2026-04-05
last_review: 2026-05-06
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md
related_action_plan: docs/ACTION_PLAN-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md
related_tasks:
  - tasks/tasks-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md
review_notes:
  - 2026-05-06: CO-503 live Linear audit confirmed CO-85 is `Done` (state_type=completed, updated_at=2026-04-30T13:27:53.706Z) with merged PR #363 attached; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-04-05` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-04-05: Opened from Linear issue `CO-85` in the provider-worker workspace using issue id `8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`.
  - 2026-04-05: Packaged `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`, `Done`), showed no attached PR, no issue comments, and no existing workpad comment on this issue.
  - 2026-04-05: The issue was moved from `Ready` to `In Progress` before active coding via packaged `linear transition`.
  - 2026-04-05: The workspace started detached and was switched onto branch `linear/co-85-ready-review-coderabbit-issue-comment`.
  - 2026-04-05: Pre-implementation boundary review of the reported seam found the expected narrow owner surface in `scripts/lib/pr-watch-merge.js` and `tests/pr-watch-merge.spec.ts`: current CodeRabbit completion logic accepts review events and current-head pull comments, but ignores top-level PR issue comments.
  - 2026-04-05: Issue-quality review: the ticket is specifically about current-head CodeRabbit completion truth for `ready-review`, not about disabling the drain or relaxing broader review gates. The implementation should stay bounded to current-cycle signal detection plus regression proof.
  - 2026-04-05: Pre-implementation approval: proceed with a narrow fail-closed CodeRabbit issue-comment completion contract and preserve stale/pending rereview blocking behavior.
  - 2026-04-05: The audited child `docs-review` stream ran at `.runs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8-co-85-docs-review/cli/2026-04-05T01-20-27-806Z-8e94d0e8/manifest.json`; `docs:check` passed, while `docs:freshness` failed only on unrelated repo-wide stale docs baseline debt and `spec-guard` dry-run surfaced unrelated stale specs 0996-1008. Manual fallback is recorded in `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012027Z-docs-review-fallback.md`.
  - 2026-04-05: Source PR `#362` issue comments were inspected with `gh api repos/Kbediako/CO/issues/362/comments --paginate`; the latest maintainer rereview request comment names head `3056ee051df73f3f8ec5bf0ab20f1b437d83ac21`, and the later CodeRabbit issue-comment reply repeats that exact head plus clean / merge-ready wording. The earlier no-actionable summary comment predates the rereview request and therefore must stay ineligible for the newer cycle. Evidence: `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T012726Z-source-pr-362-coderabbit-issue-comment.md`.
  - 2026-04-05: Implementation now accepts CodeRabbit top-level issue comments only when they arrive after the latest human rereview request, include the exact current head SHA in the body, and match a narrow clean/merge-ready completion signature. Focused regressions passed via `npx vitest run tests/pr-watch-merge.spec.ts`.
  - 2026-04-05: Required repo validation was run to terminal status. `delegation-guard`, `build`, `lint`, `test`, `docs:check`, `diff-budget`, and `pack:smoke` passed; `spec-guard --dry-run` and `docs:freshness` surfaced only unrelated stale baseline debt (`0996`-`1008` specs and stale `0102` / `0105` packets) outside the CO-85 change surface.
  - 2026-04-05: The unrelated stale `0102` / `0105` packet blocker discovered during `docs:freshness` was split into follow-up `CO-86` so this lane can stay scoped to the `ready-review` watcher fix.
  - 2026-04-05: Manifest-backed standalone review was attempted with `FORCE_CODEX_REVIEW=1 npm run review`, but the wrapper telemetry classified the run as `failed-boundary` with `termination_boundary.kind=startup-anchor`. Manual fallback review of `scripts/lib/pr-watch-merge.js:39-42`, `scripts/lib/pr-watch-merge.js:1064-1095`, and `tests/pr-watch-merge.spec.ts:883-942` found no additional correctness, regression, or missing-test findings. Evidence: `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T014324Z-standalone-review-fallback.md`.
  - 2026-04-05: Explicit elegance review kept the current design unchanged: one local phrase list plus the existing timing/head gate was the smallest safe contract, and no extra abstraction or refactor was justified. Evidence: `out/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8/manual/20260405T014400Z-elegance-review.md`.
  - 2026-04-05: Draft PR `#363` was opened and attached to the issue. Initial `pr ready-review` monitoring on that PR stayed truthful for the repaired seam: `bot_rereview_pending=[-]`, `unack_bot_feedback=0`, and `unresolved_threads=0`; the observed blockers were the intentional `draft` state and pending required check `Core Lane`.
---

# Technical Specification

## Context

`CO-85` is a focused follow-up from `CO-84` after a real `ready-review` run on PR `#362` stayed blocked on `bot_rereview_pending=[coderabbitai]` even though CodeRabbit had already posted a top-level no-actionable / merge-ready issue comment for the current rereview cycle. The existing watcher logic only counts CodeRabbit reviews and current-head pull comments as completion signals, so the issue-comment path is currently invisible.

## Requirements

1. Reproduce the false `bot_rereview_pending=[coderabbitai]` state with deterministic local coverage.
2. Extend the CodeRabbit completion contract so the intended current-cycle issue-comment completion is recognized.
3. Keep the completion logic fail-closed for stale or ambiguous issue comments.
4. Preserve genuine pending rereview detection.
5. Preserve all other ready-review safety bars, including required checks, actionable feedback, and quiet-window enforcement.
6. Capture artifact-backed docs/workpad/validation evidence for provider-worker handoff.

## Current Truth

- `resolveBotRereviewTimingForKind(...)` now uses CodeRabbit pull comments, reviews, and a narrow current-cycle issue-comment completion contract as completion signals.
- `tests/pr-watch-merge.spec.ts` now covers the accepted issue-comment completion path plus stale / missing-signature rejection.
- The source issue cites a real PR `#362` run where CodeRabbit posted a no-actionable issue comment for the current rereview cycle, but `ready-review` still reported `bot_rereview_pending=[coderabbitai]`.
- The current issue has no attached PR or existing review feedback yet, so this lane can start from a clean docs-first packet.

## Issue-Shaping Contract

- User-request translation carried forward:
  - make `ready-review` truthful for current-head CodeRabbit no-actionable issue-comment completion
  - preserve head-aware stale-signal rejection
  - keep all other review gates intact
- Protected terms / exact artifact and surface names:
  - `ready-review`
  - `bot_rereview_pending=[coderabbitai]`
  - `current-head`
  - `No actionable comments were generated in the recent review`
  - `scripts/lib/pr-watch-merge.js`
- Nearby wrong interpretations to reject:
  - any CodeRabbit issue comment can count regardless of timing or head
  - the fix can disable CodeRabbit blocking entirely
  - this lane should expand into a broad watcher rewrite
- Explicit non-goals carried forward:
  - CodeRabbit service changes
  - unrelated merge/check logic changes
  - manual waivers in place of a deterministic fix

## Parity / Alignment Matrix

- Not applicable.
- Current truth:
  - the watcher treats CodeRabbit reviews and current-head pull comments as completion
  - top-level issue comments are ignored
  - the false-block report is tied to an explicit current-cycle rereview on PR `#362`
- Reference truth:
  - current-cycle CodeRabbit completion with no actionable feedback should start the quiet window instead of staying pending
- Target truth / intended delta:
  - the watcher recognizes the intended CodeRabbit issue-comment completion path
  - stale or superseded comments still fail closed
  - ready-review output remains truthful for all other gates
- Explicitly out-of-scope differences:
  - non-CodeRabbit bot signal policy
  - unrelated review wrapper or merge shepherding behavior

## Readiness Gate

- Not done if:
  - current-cycle no-actionable CodeRabbit issue comments still leave the watcher pending
  - stale older-head or pre-request comments are accepted
  - genuine pending rereviews stop blocking
  - required checks or actionable feedback gates are weakened
- Pre-implementation issue-quality review evidence:
  - the issue is specific to the watcher signal contract and has enough traceability to stay narrowly implemented.
- Safeguard ownership split:
  - docs/workpad and task mirrors: current issue packet files plus packaged `linear` helper
  - signal reproduction and implementation: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`, and exact source PR evidence as needed

## Technical Requirements

- Functional requirements:
  - deterministic false-block regression test
  - deterministic stale/pending regression tests
  - current-cycle CodeRabbit issue-comment completion support under a fail-closed contract
  - unchanged Codex reaction behavior and unchanged non-CodeRabbit logic
- Non-functional requirements (performance, reliability, security):
  - bounded change surface
  - no over-permissive heuristics
  - machine-checkable evidence under the issue task id
- Interfaces / contracts:
  - GitHub issue comments, pull review comments, and pull reviews
  - `resolveBotRereviewTimingForKind(...)`
  - `fetchBotRereviewSignals(...)`
  - `tests/pr-watch-merge.spec.ts`

## Architecture & Data

- Architecture / design adjustments:
  - inspect the real CodeRabbit issue-comment payload first to decide the narrowest safe contract
  - preserve latest-request timing as the primary rereview-cycle boundary
  - if issue comments lack commit metadata, require an explicit completion signature plus the latest-request timing boundary instead of accepting all comments
  - keep the change local to the CodeRabbit completion path and adjacent tests
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - GitHub PR comments/reviews payloads via `gh api`
  - CodeRabbit-authored issue comment text

## Validation Plan

- Tests / checks:
  - audited child `docs-review`
  - focused `tests/pr-watch-merge.spec.ts`
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the current-cycle false block is fixed in local coverage
  - confirm stale/pending cases still block
  - keep the Linear workpad current after docs, implementation, and handoff readiness
- Monitoring / alerts:
  - rely on test coverage, ready-review drain output, and review telemetry

## Open Questions

- Keep the current signature set limited to explicit no-actionable / clean / merge-ready wording unless new real PR evidence proves another CodeRabbit completion phrase is required.

## Approvals

- Reviewer: manual fallback after manifest-backed review telemetry reported `failed-boundary/startup-anchor`
- Date: 2026-04-05
