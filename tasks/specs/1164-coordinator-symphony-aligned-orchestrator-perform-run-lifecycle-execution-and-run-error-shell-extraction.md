---
id: 20260314-1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction
title: Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-14
last_review: 2026-03-14
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md
related_tasks:
  - tasks/tasks-1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Orchestrator Perform-Run-Lifecycle Execution-and-Run-Error Shell Extraction

## Summary

Extract the remaining execution / run-error shell from `performRunLifecycle(...)` after `1163` completed the guard-and-planning extraction.

## Scope

- One bounded execution / run-error helper adjacent to `performRunLifecycle(...)`
- `manager.execute(taskContext)`
- `context.runEvents?.runError(...)`
- the catch / rethrow boundary
- Focused success/failure regression coverage

## Out of Scope

- The explicit privacy reset
- TaskManager registration extracted in `1162`
- Guard-and-planning extracted in `1163`
- Completion handling extracted in `1161`
- Public `start()` / `resume()` lifecycle entrypoints

## Notes

- 2026-03-14: Registered after `1163` completed. The next truthful seam is the remaining execute / run-error boundary still inline in `performRunLifecycle(...)`. Evidence: `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T181131Z-closeout/14-next-slice-note.md`, `docs/findings/1164-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-deliberation.md`.
- 2026-03-14: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1164-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-deliberation.md`.
- 2026-03-14: Docs-first registration completed with deterministic guards green after trimming `docs/TASKS.md` back under the line cap via a manual archive fallback for historical snapshot `0935`, because `docs:archive-tasks --dry-run` still failed to detect eligible sections on the current inline snapshot format. The manifest-backed `docs-review` then failed at its own delegation guard before substantive review, so this lane carries an explicit docs-review override. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/00-summary.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/02a-docs-archive-tasks.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/04-manual-tasks-archive-0935.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/05-docs-review-override.md`, `.runs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/cli/2026-03-13T21-53-20-769Z-ca789e4a/manifest.json`.
- 2026-03-14: Completed. `performRunLifecycle(...)` now delegates the remaining execution / run-error boundary through `executeRunLifecycleTask(...)`, the focused lifecycle regressions passed `4/4` files and `9/9` tests, the delegated diagnostics sub-run succeeded, and pack-smoke passed. The explicit non-green items are the recurring full-suite quiet-tail after the late CLI suite and bounded review drift into speculative package/type/import inspection with no concrete `1164` defect. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/00-summary.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/05-targeted-tests.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/05b-test.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/10-pack-smoke.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/12-elegance-review.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/13-override-notes.md`, `.runs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-correctness/cli/2026-03-13T22-07-28-858Z-0ae58fa4/manifest.json`.
