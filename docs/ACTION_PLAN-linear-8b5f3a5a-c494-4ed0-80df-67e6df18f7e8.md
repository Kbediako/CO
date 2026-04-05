# ACTION_PLAN - CO: Fix ready-review false block on current-head CodeRabbit issue-comment completion

## Traceability
- Linear issue: `CO-85` / `8b5f3a5a-c494-4ed0-80df-67e6df18f7e8`
- Source issue: `CO-84`
- Source PR: `#362`

## Summary
- Goal: keep `ready-review` truthful by recognizing the intended current-head CodeRabbit issue-comment completion signal without weakening any other review or required-check gate.
- Scope: docs-first registration, audited docs review, targeted source-evidence inspection, narrow watcher/test changes, required validation floor, standalone/elegance review, and review-handoff prep.
- Assumptions:
  - the reported false block is real on the current tree and can be reproduced in local coverage
  - the smallest correct fix lives in the rereview signal contract, not in downstream merge or check logic

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `ready-review`
  - `bot_rereview_pending=[coderabbitai]`
  - `current-head`
  - `No actionable comments were generated in the recent review`
  - `PR is ready to merge`
- Not done if:
  - current-cycle CodeRabbit issue-comment completion still leaves `ready-review` blocked forever
  - stale issue comments from older heads or older rereview cycles start counting as complete
  - the fix weakens required checks, unresolved feedback handling, or quiet-window enforcement
- Pre-implementation issue-quality review:
  - the issue is specifically about the watcher’s interpretation of CodeRabbit completion signals and should stay bounded to that seam plus regression proof

## Milestones & Sequencing
1. Register the docs packet, task mirrors, branch, and single Linear workpad.
2. Run an audited `docs-review` child stream and keep the packet aligned with the approved scope.
3. Inspect the source PR evidence and the existing `pr-watch-merge` rereview signal contract.
4. Implement the smallest current-cycle issue-comment completion fix and add focused regression coverage.
5. Run the validation floor, standalone review, elegance review, and only then prepare PR/review handoff.

## Dependencies
- Current workspace branch `linear/co-85-ready-review-coderabbit-issue-comment`
- `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear ...` helper surface
- `scripts/lib/pr-watch-merge.js`
- `tests/pr-watch-merge.spec.ts`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - targeted watcher regression tests for current-cycle completion, stale-head rejection, and genuine pending rereview
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package/skills/review-wrapper paths change
- Rollback plan:
  - revert the narrow signal-classification change if it misclassifies stale or pending bot states
  - prefer fail-closed classification over an overly permissive issue-comment rule

## Risks & Mitigations
- Risk: top-level issue comments lack explicit commit metadata.
  - Mitigation: inspect the actual payload and require a deterministic current-cycle contract rather than accepting all issue comments.
- Risk: a text-only match could be too permissive across rereview cycles.
  - Mitigation: gate completion on both timing relative to the latest human rereview request and the recognized completion signature.
- Risk: the fix accidentally changes non-CodeRabbit bot behavior.
  - Mitigation: keep the change isolated to the CodeRabbit path and preserve existing Codex reaction logic.

## Approvals
- Reviewer: pending
- Date: 2026-04-05
