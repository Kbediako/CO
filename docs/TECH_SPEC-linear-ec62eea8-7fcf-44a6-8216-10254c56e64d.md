---
id: 20260416-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d
title: CO: terminate hanging run-review mock children after timeout
relates_to: docs/PRD-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

## Canonical Spec
- Implementation contract: `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- PRD: `docs/PRD-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- Action plan: `docs/ACTION_PLAN-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- Checklist: `tasks/tasks-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`

## Scope
- Review-wrapper timeout and cleanup behavior for test/mock `run-review` children.
- Likely runtime surface: `scripts/run-review.ts` and any existing review-launch/process cleanup helper it already delegates to.
- Likely tests: focused `tests/run-review.spec.ts` coverage using `RUN_REVIEW_MODE=hang` and `codex-mock.sh`.
- Evidence surfaces: task checklist commands, focused test output, and passive process-health scan.

## Required Behavior
- A hanging review mock launched by the `run-review` temp harness is terminated and reaped after timeout.
- Cleanup is bounded to harness-owned test/mock children and must not target real user review processes.
- Status or process output remains truthful; leaked processes are not hidden to make checks appear clean.
- The implementation either freshly reproduces the leak or records why the path is obsolete on current code before claiming completion.
- Provider admission, Linear polling, and `CO-189` / `CO-203` / `CO-204` behavior remain unchanged unless the implementation proves a shared cleanup path.

## Non-Goals
- No manual host-only process kill as the fix.
- No live provider-admission fix or Linear polling change.
- No broad review-wrapper rewrite beyond the cleanup/reaping seam needed for the mock timeout path.
- No cleanup of real review processes or unrelated process trees.

## Validation
- Focused regression for `RUN_REVIEW_MODE=hang` proves `codex-mock.sh` / `run-review-*` mock descendants are terminated or reaped after timeout.
- Focused safety coverage proves cleanup does not kill real review processes outside the temp harness ownership boundary.
- Relevant review-wrapper/run-review test lane passes.
- Passive `ps` review drain/process-health scan shows no new orphaned PPID=1 `run-review-*` / `codex-mock.sh` review processes.
- Checklist records exact commands and evidence paths before parent handoff.
