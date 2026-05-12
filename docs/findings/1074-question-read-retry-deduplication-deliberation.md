# 1074 Deliberation - Question-Read Retry Deduplication

## Decision

Proceed with a bounded shared-helper fix at the question-read seam.

## Why this slice is next

- The `1073` closeout explicitly queued question-read resolution sequencing as the next bounded autonomous coordination lane.
- The current tree still has the same `expire -> list -> queueQuestionResolutions` ordering in both:
  - `orchestrator/src/cli/control/questionQueueController.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
- `controlExpiryLifecycle.ts` already resolves expired questions synchronously, so the duplicate retry is created by the read surfaces, not the lifecycle.

## Options considered

### Option A - patch each call site inline

Rejected as the final shape because the same bug already exists in two read surfaces.

### Option B - move retry policy into expiry or child-resolution internals

Rejected as scope creep. The defect is read-surface sequencing, not lifecycle or adapter policy.

### Option C - add a tiny shared helper at the question-read boundary

Chosen. It is the smallest fix that:
- keeps retry semantics aligned across API and Telegram,
- preserves retries for already-closed records,
- avoids widening into provider or lifecycle refactors.

## Approval note

Approved for docs-first registration based on the `1073` next-slice note plus live source inspection confirming the duplicate-retry shape in both question-read surfaces.
