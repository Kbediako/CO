---
id: 20260410-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58
title: CO stabilize broad repo test lane truth for unrelated narrow handoffs
relates_to: docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- PRD: `docs/PRD-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`
- Task checklist: `tasks/tasks-linear-87d23327-3ee6-429c-a25f-8bd9c84cde58.md`

## Traceability
- Linear issue: `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`
- Linear URL: https://linear.app/asabeko/issue/CO-132/stabilize-broad-timeout-heavy-repo-test-lane-so-unrelated-failures
- Source issue: `CO-94` / `ce6f26d0-029a-40d9-8ffe-289cd40cde8d`

## Historical Context - Rework Reset 2026-04-10
- The prior `CO-132` attempt is historical context, not current-head proof. Closed PR `#400` documented a non-repro result on older head `2a0e6320c`.
- The immediately previous rework attempt is preserved on local ref `backup/linear-co-132-rework-20260410T095713Z` after closing PR `#410`, deleting the stale workpad, and resetting this workspace to fresh `origin/main`.
- That backup ref was used only as comparison context. It reported a narrower load-sensitive full-lane failure family plus candidate fixes in `vitest.config.core.ts` and `ProviderIssueHandoff`.
- This attempt revalidated those ideas on fresh `origin/main` and only carried forward the worker-cap seam because the live failing family did not implicate `ProviderIssueHandoff`.

## Fresh Evidence Update - Current Main 2026-04-10
- Reset-branch command `env CODEX_VITEST_PROGRESS=1 npm run test` is recorded at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-reset-baseline-repro/01-npm-test-run-1.log`.
- Result 1: `324/324` files passed and `3347/3347` tests passed in `123.47s`.
- Result 2: a later uncapped rerun failed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/05-test.log` with exactly two timeout-heavy CLI suites:
  - `tests/cli-command-surface.spec.ts > codex-orchestrator command surface > prints usage for unknown commands and exits non-zero`
  - `tests/cli-frontend-test.spec.ts > codex-orchestrator frontend-test > selects the default frontend-testing pipeline`
- Result 3: a manual capped rerun with `env CODEX_VITEST_PROGRESS=1 npm run test -- --maxWorkers=4 --minWorkers=1` passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/06-test-maxworkers4-min1.log`.
- Result 4: after landing the bounded config change, the post-fix broad lane passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-fix-validation/05-test.log` with `324/324` files and `3350/3350` tests in `141.62s`.
- Current conclusion: the old broad multi-suite blocker from `CO-94` no longer reproduces on current head. The active failure family is narrower and environment-sensitive, centered on subprocess-heavy CLI suites when the broad lane saturates worker threads. A bounded worker cap restores truthful green broad-lane validation for CI and explicit provider-worker progress runs without weakening the lane.

## Summary
- Objective: remeasure the current broad `npm run test` failure family on the reset branch, classify the exact red suites as baseline, environment-sensitive, or new regressions, and land the smallest truthful fix or reporting-gating improvement that keeps unrelated repo-wide failures from ambiguously blocking narrow review handoffs.
- Scope:
  - fresh current-tree reproduction or evidence collection for the broad full-lane failures cited by `CO-94`
  - comparison against the prior closed `CO-132` attempt plus earlier repo-wide instability lanes (`CO-24`, `CO-38`, `CO-57`) so older diagnoses are not assumed blindly
  - bounded stabilization in the proven owner seam, or a bounded truthful classification/reporting surface when a narrow shared fix is not yet defensible
  - focused regressions and validation evidence for the chosen outcome
  - docs/workpad/task artifacts that dependent lanes can cite
- Constraints:
  - no blanket skip, silent waiver, or unclassified timeout kill
  - no broad unrelated suite refactor unless the reproduced owner seam truly spans them
  - no reopening `CO-94` implementation scope

## Issue-Shaping Contract
- User-request translation carried forward: this lane owns the broad repo test-lane blocker that surfaced during `CO-94`, and its outcome must let narrow lanes separate unrelated repo baseline failures from local regressions.
- Protected terms / exact artifact and surface names:
  - `npm run test`
  - `CO-94`
  - repo-wide test lane
  - narrow issue handoffs
  - truthful validation semantics
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `tests/cli-frontend-test.spec.ts`
  - `tests/cli-orchestrator.spec.ts`
- Nearby wrong interpretations to reject:
  - absorb the blocker back into `CO-94`
  - treat one prior non-reproducing rerun as sufficient proof for the new baseline
  - hide the red lane without a replacement classification surface
  - assume the problem is only the old post-suite idle family from `CO-24` / `CO-38` / `CO-57`
- Explicit non-goals carried forward:
  - broad review/merge-policy rewrites
  - unrelated suite cleanup not required by the reproduced owner seam
  - weakening validation discipline for real regressions

## Parity / Alignment Matrix
- Not applicable; this is a bounded repo-validation truth lane, not a parity migration.
- Current truth:
  - `CO-94` recorded a broad non-green `npm run test` blocker on 2026-04-09 with named failures across control-host, provider-handoff, CLI, and guard/reporting suites
  - the prior closed `CO-132` attempt reported two green full-suite runs on `2a0e6320c`, but that result is stale after the rework reset
  - the current reset branch narrowed the live failure family to two CLI suites that timed out only on the uncapped broad lane
- Reference truth:
  - a narrow issue lane should be able to tell whether the broad repo test lane is already red for unrelated reasons
  - if the broad lane is red, the exact affected suites and blocker class should be explicit and current
- Target truth / intended delta:
  - the current repo-wide failure set is freshly reproduced and classified on the reset branch
  - the broad-lane timeout family is reduced to zero by a bounded worker-cap change for CI and explicit progress-owned runs
  - narrow lanes gain a concrete shared fix plus packet/workpad evidence they can cite
- Explicitly out-of-scope differences:
  - restoring every historical repo-wide test issue ever seen in CO
  - broad CI redesign or arbitrary timeout policies

## Readiness Gate
- Not done if:
  - narrow lanes still cannot distinguish unrelated repo-wide failures from local regressions
  - the exact current failure set and its classification remain ambiguous
  - the shipped outcome only works by suppressing suites or hiding the red lane
- Pre-implementation issue-quality review evidence:
  - the source issue `CO-94` names the exact blocker family and already split this lane out as a repo-owned follow-up
  - the prior `CO-132` attempts demonstrate this lane is narrower than a generic test-infra rewrite, but their outcomes had to be revalidated on the current baseline
  - adjacent prior lanes show this issue is not just another generic full-suite hang story: `CO-24` owned post-suite idling, `CO-38` remeasured that family later, and `CO-57` fixed implementation-gate heartbeat truth
- Safeguard ownership split:
  - this lane owns broad test-lane truth and the smallest shared stabilization/reporting seam
  - it does not own `CO-94` feature logic, unrelated review-policy changes, or wide suite refactors without reproduced necessity

## Technical Requirements
- Functional requirements:
  - capture fresh current-tree evidence for the broad `npm run test` failure family, including the exact affected suites and whether reproduction succeeds on this host
  - classify the current state as one of: baseline red, environment-sensitive, already-cleared/non-reproducing, or recent regression outside the narrow source lane
  - if one bounded shared owner seam is proven, land the smallest code/config/test fix that either clears or materially narrows the broad failure family
  - if a bounded shared fix is not yet justified, land a truthful classification/reporting improvement that dependent narrow lanes can cite to distinguish baseline failures from local regressions
  - preserve explicit failure truth; any new reporting surface must not mislabel real regressions as baseline noise
- Non-functional requirements:
  - full-lane evidence collection should be durable and auditable under `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/`
  - any new classification path must be deterministic enough for review handoffs
  - the final patch should remain reviewable and narrowly scoped to the reproduced seam
- Interfaces / contracts:
  - `npm run test` remains the broad lane under evaluation
  - dependent-lane artifacts must be able to point at the resulting classification/fix evidence
  - the single Linear workpad comment must stay current with the current failure set and final status

## Architecture & Data
- Architecture / design adjustments:
  - keep the existing non-interactive progress reporter behavior for CI, provider-worker, and similar bounded runs
  - add a narrower worker-cap policy for the broad-lane environments that actually reproduced the timeouts: `CI` and `CODEX_VITEST_PROGRESS`
  - do not cap workers for generic `CODEX_NON_INTERACTIVE` lanes, because the reproduction only implicated CI and explicit progress-owned broad-lane runs
  - keep the implementation entirely in Vitest config rather than reworking unrelated provider-handoff logic
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - Vitest core/full-suite behavior on this host
  - broad orchestrator and CLI test suites
  - provider-worker handoff expectations that consume repo validation truth

## Implementation Plan
- `vitest.config.core.ts`
  - continue enabling the progress reporter under `CI`, `CODEX_VITEST_PROGRESS`, and the existing non-interactive aliases
  - add `shouldCapVitestWorkers(env)` and apply `{ maxWorkers: 4, minWorkers: 1 }` only when `CI` or `CODEX_VITEST_PROGRESS` is truthy
- `tests/vitest-progress-config.spec.ts`
  - add targeted assertions that the worker cap is enabled for `CI`
  - add targeted assertions that the worker cap is enabled for `CODEX_VITEST_PROGRESS`
  - add targeted assertions that generic `CODEX_NON_INTERACTIVE` runs remain uncapped
- `docs/TASKS-archive-2026.md`
  - restore the archived `0991` snapshot that was unintentionally trimmed during task-list archiving so the docs-review child stream finding is resolved truthfully
- Packet / workpad surfaces
  - record the uncapped failing log, the capped passing log, the post-fix passing log, and the docs-review child-stream evidence

## Validation Plan
- Tests / checks:
  - same-issue `docs-review` child stream succeeded at `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/manifest.json`
  - docs-review telemetry recorded `status: succeeded` with `review_outcome: clean-success` at `.runs/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58-co-132-docs-review-rework/cli/2026-04-10T10-06-08-744Z-b3959672/review/telemetry.json`
  - focused regression: `npx vitest run tests/vitest-progress-config.spec.ts`
  - required validation floor already completed for the current diff:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `env CODEX_VITEST_PROGRESS=1 npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
- Rollout verification:
  - a future narrow lane can now cite the post-fix broad-lane proof instead of inheriting the stale `CO-94` blocker list
  - the issue packet and single workpad comment both carry the uncapped failure classification and the bounded fix
- Monitoring / alerts:
  - keep manual artifacts under `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/`
  - preserve exact failing-suite lists and validation logs in the task packet and workpad

## Open Questions
- Pending final branch sync, standalone review, and elegance pass only.

## Approvals
- Reviewer: Pending final standalone review, elegance pass, and PR handoff.
- Date: 2026-04-10
