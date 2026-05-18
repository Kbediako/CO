# ACTION_PLAN - CO: stabilize run-review fake Codex subprocess timeout flake

## Added by Bootstrap 2026-04-18

## Summary
- Goal: stabilize the `tests/run-review.spec.ts` fake Codex subprocess timeout cleanup path under full `npm run test`.
- Scope: docs-first packet and registry mirrors in this child lane; parent-owned reproduction, root cause, implementation, focused validation, and full-suite validation.
- Assumptions:
  - the reported defect is full-suite reliability around the existing fake Codex subprocess cleanup assertion
  - the cleanup assertion is intentional coverage and must not be removed, skipped, or weakened
  - `CO-234` `LockFile` timing is a separate issue unless parent evidence proves an explicit dependency

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `tests/run-review.spec.ts`, `scripts/run-review.ts`, `fake Codex subprocess`, `hang-started.txt`, `findRunReviewMockPids`, `full npm run test`, `CO-234`, `LockFile`, `no skipping/weakening subprocess cleanup coverage`.
- Not done if:
  - the parent claims completion without full `npm run test` evidence
  - the fake Codex subprocess cleanup regression is skipped, deleted, weakened, or hidden
  - the fix broadens into `CO-234` or generic review-wrapper redesign without evidence
- Pre-implementation issue-quality review:
  - this is not a micro-task path. Correctness depends on exact protected surfaces, full-suite reproduction/classification, and preserving subprocess cleanup coverage.

## Milestones & Sequencing
1. Completed in this child lane: create the PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json` registration, `docs/TASKS.md` snapshot, and docs-freshness registry rows.
2. Completed in the parent lane: classify the focused fake Codex subprocess timeout case in `tests/run-review.spec.ts` as an outer harness startup-marker race under full-suite load.
3. Completed in the parent lane: explain the full `npm run test` flake as `scripts/run-review.ts` startup plus fake Codex marker creation racing the outer subprocess harness timeout before the wrapper was killed.
4. Completed in the parent lane: implement the smallest fix in the proven owner by naming the hanging fake-Codex harness timeout, increasing only that subprocess kill budget to 15s, and giving that slow-path case a 30s Vitest timeout so cleanup assertions have headroom.
5. Completed in the parent lane: rerun focused `run-review` validation, full `npm run test`, docs/spec guards, standalone review, and elegance review before PR handoff.

## Dependencies
- `tests/run-review.spec.ts`
- `scripts/run-review.ts`
- fake Codex subprocess harness
- `hang-started.txt`
- `findRunReviewMockPids`
- `npm run test`
- `CO-234` / `LockFile` only as an explicit non-goal boundary

## Validation
- Checks / tests:
  - child lane: packet-scoped JSON validity for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - parent lane: focused `tests/run-review.spec.ts` fake Codex subprocess timeout rerun
  - parent lane: relevant `run-review` timeout/stall coverage when needed
  - parent lane: full `npm run test`
  - parent lane: process-health check when needed to prove no new fake Codex subprocess remains
  - parent lane: final standalone review completed as `bounded-success` after command-intent retry, followed by explicit elegance review
- Rollback plan:
  - if parent evidence shows the issue cannot be fixed inside the declared `run-review` subprocess-timeout surface, stop and relaunch with widened ownership rather than expanding this packet silently

## Risks & Mitigations
- Risk: the fastest green path is to skip or weaken the subprocess cleanup regression.
  - Mitigation: mark that outcome explicitly as not done.
- Risk: focused tests pass while full `npm run test` still flakes.
  - Mitigation: require full-suite validation before closeout.
- Risk: process cleanup targets real review processes.
  - Mitigation: require sandbox/fake-process ownership checks and preserve real-process safety.
- Risk: adjacent `CO-234` `LockFile` timing work gets folded into this lane.
  - Mitigation: keep `CO-234` as an explicit non-goal unless parent evidence requires relaunch.

## Approvals
- Reviewer: self-approved for docs-first packet creation; parent owns reproduction, implementation, validation, and handoff approval.
- Date: 2026-04-18
