# ACTION_PLAN - CO: Fix non-interactive npm run test quiet-tail / MessagePort hang

## Traceability
- Linear issue: `CO-84` / `74d6e549-46cc-46be-9a61-76ae61b014f4`
- Source issue: `CO-80`
- Related prior packet: `CO-69`

## Summary
- Goal: keep the current provider-worker non-interactive `npm run test` path truthful by proving the head already exits cleanly and by making the long quiet tail visible in worker lanes.
- Scope: docs-first registration, audited docs review, deterministic reproduction, narrow fix, focused regressions, full validation floor, review/elegance gates, and review handoff prep.
- Assumptions:
  - the current issue reflects new evidence beyond the earlier patience-only late-tail packet
  - the smallest truthful fix may be an observability change rather than a teardown change if the current head already exits cleanly

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `non-interactive npm run test`
  - `quiet-tail`
  - `MessagePort`
  - `truthful terminal exit`
- Not done if:
  - the suite still remains non-terminal after visible late-suite completion
  - the worker lane still has an unbounded quiet tail with no progress signals during the long final specs
  - the fix relies on force-exit behavior that can hide failures
  - no artifact-backed reproduction or owner classification exists
- Pre-implementation issue-quality review:
  - the issue is narrower than a general test-harness cleanup and should stay bounded to the leaking owner plus review-handoff truth

## Milestones & Sequencing
1. Register the docs packet, task mirrors, branch, and single Linear workpad.
2. Run an audited `docs-review` child stream and keep the packet aligned with the approved scope.
3. Reproduce the non-interactive quiet tail with process/handle capture under the issue artifact root.
4. Classify the quiet tail truthfully, implement the smallest progress-signal fix, and add focused regression proof.
5. Run the validation floor, standalone review, elegance review, and only then prepare PR/review handoff.

## Dependencies
- Current workspace branch `linear/co-84-non-interactive-test-quiet-tail`
- `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear ...` helper surface
- Vitest and the implicated worker-thread/subprocess helpers

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - reproduction command(s) with artifact-backed handle capture
  - focused regression suite for the repaired seam
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package/skills surfaces change
- Rollback plan:
  - revert the narrow teardown/lifecycle change if it regresses clean exits or failure truth
  - prefer fail-closed validation over broad exit policy weakening

## Risks & Mitigations
- Risk: reproduction is slow or ambiguous because the suite has a long quiet tail.
  - Mitigation: capture process and handle state during the tail and compare with post-exit state instead of relying only on wall-clock time.
- Risk: the leaking owner sits in shared helper code used across multiple slow tests.
  - Mitigation: add focused regression coverage around that helper lifecycle before rerunning the full suite.
- Risk: review tooling or validation wrappers hit a boundary unrelated to the fix.
  - Mitigation: record telemetry truthfully and use the required manual fallback rather than misclassifying the blocker.

## Approvals
- Reviewer: pending
- Date: 2026-04-05
