---
id: 20260405-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8
title: CO: Fix ready-review false block on current-head CodeRabbit issue-comment completion
relates_to: docs/PRD-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md
risk: high
owners:
  - Codex
last_review: 2026-04-05
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`
- PRD: `docs/PRD-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`
- Task checklist: `tasks/tasks-linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8.md`

## Traceability
- Linear issue: `CO-85` / `8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`
- Linear URL: https://linear.app/asabeko/issue/CO-85/co-fix-ready-review-false-block-on-current-head-coderabbit-issue
- Source issue: `CO-84` / `74d6e549-46cc-46be-9a61-76ae61b014f4`
- Source PR: `#362` / `https://github.com/Kbediako/CO/pull/362`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: make `pr ready-review` treat the relevant current-head CodeRabbit top-level PR issue comment as a completion signal so a no-actionable rereview does not stay falsely blocked.
- Scope:
  - register the docs-first packet for `linear-8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`
  - inspect the existing rereview request/completion contract and the source PR evidence
  - add the smallest watcher logic change required for current-cycle CodeRabbit issue-comment completion
  - add regression coverage for the false-block case plus stale/pending safety cases
  - preserve all other ready-review gates and handoff semantics
- Constraints:
  - no blanket disablement of CodeRabbit gating
  - no stale-head acceptance
  - no broad `pr-watch-merge` refactor

## Technical Requirements
- Functional requirements:
  - deterministic reproduction exists for the false `bot_rereview_pending=[coderabbitai]` state
  - current-head CodeRabbit issue-comment completion is recognized under a deterministic contract
  - stale or pre-request issue comments do not complete the rereview
  - genuine pending rereview states still report `bot_rereview_pending=[coderabbitai]`
  - existing required-check, unresolved-feedback, and quiet-window gates remain unchanged
  - the workpad and packet record exact commands and outcomes
- Non-functional requirements (performance, reliability, security):
  - keep the fix bounded to the rereview signal seam
  - fail closed when issue-comment evidence is ambiguous
  - keep review handoff evidence machine-checkable
- Interfaces / contracts:
  - `scripts/lib/pr-watch-merge.js`
  - `tests/pr-watch-merge.spec.ts`
  - GitHub PR issue comments, pull review comments, and review events
  - `codex-orchestrator pr ready-review`

## Architecture & Data
- Architecture / design adjustments:
  - start from the existing `resolveBotRereviewTimingForKind(...)` and `fetchBotRereviewSignals(...)` flow
  - extend the CodeRabbit completion contract narrowly enough to include the current-cycle issue-comment completion path without turning issue comments into unconditional completion signals
  - preserve the current latest-request and head-aware safety bar
  - keep the regression surface in `tests/pr-watch-merge.spec.ts` near the existing CodeRabbit signal tests
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - `gh api` GitHub issue comment/review payloads
  - CodeRabbit-authored comment/review metadata

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `tests/pr-watch-merge.spec.ts` coverage for the false-block case and stale/pending regressions
  - required repo validation floor after implementation
- Rollout verification:
  - confirm the old false-block scenario now completes for the current rereview cycle
  - confirm stale older-head or pre-request output remains blocked
  - refresh the Linear workpad after docs, implementation, and handoff readiness
- Monitoring / alerts:
  - rely on targeted test coverage, review telemetry, and ready-review drain behavior on the resulting PR

## Open Questions
- Should the completion contract key off exact CodeRabbit completion text, other payload metadata, or both when top-level issue comments do not carry the same commit metadata as pull comments?

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-05
