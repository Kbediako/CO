# TECH_SPEC - CO: Stabilize timeout-sensitive repo validation suites blocking handoff

## Added by Bootstrap 2026-04-13

## Summary
- Objective: reproduce and classify the timeout-sensitive validation blockers named in `CO-131`, then restore a truthful repo-floor handoff path with the smallest evidence-backed outcome.
- Scope: docs-first packet, single workpad, audited docs-review delegation, focused suite reproductions, exact `npm run test` reruns, bounded implementation if a live defect remains, and the required validation/review gates.
- Constraints:
  - preserve the exact blocker surfaces from the issue and keep `CO-89` out of scope
  - do not rely on global timeout inflation or skipped coverage
  - keep any new follow-up issue explicit when a meaningful blocker is out of scope

## Execution Update 2026-04-13
- Fresh current-head evidence on branch `linear/co-131-stabilize-validation-timeouts` at `b66ca7778` proves the named timeout cluster is a non-repro: all four focused suites passed, and final `npm run test` finished `335/335` files with `3703/3703` tests passing in `133.61s`.
- No live timeout owner seam remained to fix, so the only shipped code change stayed packet-local and truthfulness-oriented: `scripts/tasks-archive.mjs` now accepts `linear-...` snapshot keys, `tests/tasks-archive.spec.ts` pins that path, and `docs/TASKS-archive-2026.md` restores the dropped `1015` archive snapshot.
- The lane therefore closes as validation-floor restoration and packet truthfulness repair, not as a `CO-89` resident-session change.

## Issue-Shaping Contract
- User-request translation carried forward:
  - stabilize the repo validation floor that blocks provider-worker handoff by reproducing and fixing the named timeout-sensitive suites on the current head
  - keep the final outcome truthful: either the repo floor is restored directly, or any remaining blocker is split explicitly with bounded evidence
- Protected terms / exact artifact and surface names:
  - `npm run test`
  - `tests/diff-budget.spec.ts`
  - `tests/subagent-edit-guard.spec.ts`
  - `tests/cli-frontend-test.spec.ts`
  - `orchestrator/tests/CodexOrchestratorCli.test.ts`
  - `flags overlapping scope edits as ownership collisions`
- Nearby wrong interpretations to reject:
  - reopening the `CO-89` resident-session seam
  - treating partial or interrupted test output as sufficient handoff evidence
  - broad repo-wide timeout inflation as the primary fix
- Explicit non-goals carried forward:
  - changing resident-session runtime behavior from `CO-89`
  - unrelated CLI/runtime modernization
  - validation-bar reduction or silent test skipping

## Parity / Alignment Matrix
- Not applicable beyond validation-floor truthfulness.
- Current truth:
  - the issue body names four timeout-sensitive suites and reports split evidence: `diff-budget` passed in isolation, `subagent-edit-guard` still timed out in isolation, and the repo-wide run timed out in unrelated areas during `CO-89` validation
  - adjacent historical packets show related timeout classes can either be live defects or current-head non-repros, so current-tree evidence must be refreshed before choosing implementation scope
- Reference truth:
  - provider-worker closeout requires a truthful repo-floor validation gate
  - the issue already preserves explicit non-goals and wrong-interpretation rejections
- Target truth / intended delta:
  - each named suite has fresh current-head reproduction/classification evidence
  - `npm run test` becomes a trustworthy handoff gate again, or any residual blocker is independently tracked with bounded root-cause evidence
- Explicitly out-of-scope differences:
  - `CO-89` resident-session implementation
  - repo-wide test-framework redesign
  - hand-wavy timeout tuning without proof

## Readiness Gate
- Not done if:
  - the named suites remain unclassified on the current head
  - `npm run test` still lacks a trustworthy terminal result or explicit blocker split
  - the lane still blurs unrelated validation-floor failures with `CO-89`
- Pre-implementation issue-quality review evidence:
  - 2026-04-13: the issue is already correctly shaped. It names the exact blocker suites, preserves non-goals, and rejects the common shortcuts; the missing input is live reproduction evidence.
- Safeguard ownership split:
  - parent: docs packet, workpad, branch, reproduction, remediation selection, validation, review/handoff
  - delegated stream: audited `linear child-stream --pipeline docs-review` after the packet exists

## Technical Requirements
- Functional requirements:
  - reproduce the current timeout behavior for `tests/diff-budget.spec.ts`, `tests/subagent-edit-guard.spec.ts`, `tests/cli-frontend-test.spec.ts`, and `orchestrator/tests/CodexOrchestratorCli.test.ts`
  - reproduce the current full `npm run test` lane and classify whether the blocker is terminal failure, non-terminal quiet tail, or no longer reproducing
  - repair any live harness/process/timing defect with the smallest truthful patch, or split independent residual blockers into follow-ups
  - keep workpad and closeout text explicit about what is unrelated to `CO-89`
- Non-functional requirements (performance, reliability, security):
  - no false-green validation claims
  - deterministic reproduction evidence recorded under the issue task id
  - bounded, reversible implementation surface
- Interfaces / contracts:
  - `npm run test`
  - focused `npx vitest run --config vitest.config.core.ts ...` commands
  - Linear workpad, review handoff, and follow-up creation helpers

## Architecture & Data
- Architecture / design adjustments:
  - begin with the smallest owner search: named suites first, then the full-suite lane
  - if multiple suites share one live root cause, fix that seam once
  - if the blocker is an independent unrelated cluster, file a follow-up instead of widening this lane
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - `package.json`
  - Vitest config and helper utilities
  - the named suites and any immediate helper files they prove responsible
  - Linear provider-worker workflow commands

## Validation Plan
- Tests / checks:
  - audited `docs-review` child stream
  - focused reproductions for the named suites
  - repo-wide `npm run test`
  - standard validation floor for the final non-trivial diff
  - standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - refresh the same workpad after docs, reproduction, implementation, and final validation
  - if a residual blocker is split out, record the new issue id and why it was out of scope
- Monitoring / alerts:
  - record exact timings, failure signatures, and termination modes for any non-terminal test behavior
  - keep validation blockers distinct from review-wrapper, CI, or merge blockers

## Current Evidence
- Issue evidence:
  - `tests/diff-budget.spec.ts` passed in isolation
  - `tests/subagent-edit-guard.spec.ts` still timed out in isolation on `flags overlapping scope edits as ownership collisions`
  - `npm run test` previously timed out in unrelated areas including `tests/diff-budget.spec.ts`, `tests/subagent-edit-guard.spec.ts`, `tests/cli-frontend-test.spec.ts`, and `orchestrator/tests/CodexOrchestratorCli.test.ts`
- Historical context only:
  - `CO-130` closed as a no-code non-repro on 2026-04-12 for a different named suite cluster on an earlier head
  - `CO-46` and `CO-54` previously repaired narrower validation-fixture issues around `cli-frontend-test`
  - `CO-84` previously narrowed a quiet-tail lane to progress visibility rather than a post-suite leak

## Open Questions
- Does `tests/subagent-edit-guard.spec.ts` still reproduce its isolated timeout exactly on current `b66ca7778`?
  - Resolved: no; the current-head rerun passed `12/12` tests in `6.42s`.
- If `tests/cli-frontend-test.spec.ts` regresses again, is it the same self-contained-fixture seam already handled in `CO-54`, or a new dependency leak?
  - Resolved for this lane: no current-head regression remained to classify; the focused rerun passed `4/4` tests in `23.33s`.

## Approvals
- Reviewer: Self-approved for implementation start after the packet and issue-quality review above. Audited docs-review completed with `review_outcome=clean-success`, final validation is green, standalone review completed with `review_outcome=clean-success`, and the explicit elegance pass is recorded. PR create/attach and review handoff remain pending.
- Date: 2026-04-13
