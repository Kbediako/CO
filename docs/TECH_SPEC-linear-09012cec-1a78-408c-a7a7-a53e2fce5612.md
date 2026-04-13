# TECH_SPEC - CO validation: stabilize unrelated provider-worker full-suite blockers surfaced during CO-164

## Added by Bootstrap 2026-04-13

## Summary
- Objective: reproduce the two named provider-worker full-suite blockers, repair the smallest current-tree seam that explains them, and restore a truthful provider-worker validation baseline without reopening CO-164 cleanup semantics.
- Scope: docs-first packet, single workpad maintenance, live Linear workflow state upkeep, focused provider-suite reproductions, minimal repair, and the required validation/review gates before any handoff.
- Constraints:
  - preserve the issue’s exact protected surfaces and non-goals
  - do not hide failures behind weaker test gates
  - account for the current source bootstrap failure without expanding into unrelated CLI redesign

## Issue-Shaping Contract
- User-request translation carried forward:
  - treat `ProviderIssueHandoffAdmissionCache` and `ProviderLinearWorkerRunner` as the canonical blocker surfaces for this lane
  - restore a truthful current-tree validation story for provider-worker closeout
- Protected terms / exact artifact and surface names:
  - `ProviderIssueHandoffAdmissionCache`
  - `ProviderLinearWorkerRunner`
  - `npm run test`
  - `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- Nearby wrong interpretations to reject:
  - reopening CO-164 generic forced cleanup
  - general timeout inflation or skip-based validation
  - treating the source-loaded helper bootstrap failure as sufficient closeout evidence on its own
- Explicit non-goals carried forward:
  - CO-164 cleanup semantic changes
  - broad provider-worker refactors unrelated to reproduced failures
  - validation gate weakening

## Parity / Alignment Matrix
- Current truth:
  - the source issue evidence names two failing provider-worker suites from the repo-wide test floor
  - the current branch also contains a one-line syntax regression in `providerIssueHandoff.ts` that breaks TypeScript parsing and normal source-loaded helper bootstrap
  - no attached PR or existing workpad comment is present on the live Linear issue at bootstrap
- Reference truth:
  - provider-worker closeout expects truthful repo-wide validation evidence
  - CO-164 remained scoped to `controlHostSupervisionCliShell.ts` plus focused control-host cleanup coverage
- Target truth / intended delta:
  - exact current-tree reproduction or truthful non-repro for both named suites
  - a smallest-correct repair that keeps behavior strong and bounded
  - an auditable repo-wide validation result that distinguishes current local state from historical issue discovery
- Explicitly out-of-scope differences:
  - unrelated control-host or provider-worker redesign
  - permanent validation downgrade
  - reopening CO-164 without new evidence

## Readiness Gate
- Not done if:
  - either named suite still fails without explanation
  - `npm run test` remains ambiguous or red on the affected provider-worker surfaces
  - the final closeout still cannot distinguish local branch breakage from the issue’s named blockers
- Pre-implementation issue-quality review evidence:
  - 2026-04-13: the issue is already appropriately narrow and explicit. The next highest-signal action is current-tree reproduction, not more scope shaping.
- Safeguard ownership split:
  - parent: docs packet, Linear workflow state/workpad upkeep, reproductions, implementation choice, validation, final review/handoff
  - delegated stream: audited `linear child-stream --pipeline docs-review`

## Technical Requirements
- Functional requirements:
  - reproduce or truthfully non-repro the named provider-worker suite failures with exact commands and saved output
  - inspect current provider-worker diffs to determine whether local syntax breakage overlaps the blocker surface
  - land the smallest fix that restores the affected suites and truthful repo-wide validation
  - preserve explicit reporting between local branch breakage and the issue’s named blocker evidence
- Non-functional requirements (performance, reliability, security):
  - no false-green validation claims
  - bounded, reviewable diff surface
  - fail closed when the current tree still cannot produce trustworthy validation
- Interfaces / contracts:
  - packaged Linear helper workflow
  - `npm run test`
  - focused `npx vitest run ...` provider-suite reproductions
  - provider-worker workpad / review-handoff workflow

## Architecture & Data
- Architecture / design adjustments:
  - prefer a shared provider-worker timing/state fix only if both failures converge there
  - treat the missing-brace syntax regression as a prerequisite current-tree defect, not as license to widen scope
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderIssueHandoffAdmissionCache.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`
  - Linear issue workpad / state helpers

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused reproduction commands for the two named suites
  - repo-wide `npm run test`
  - standard validation floor for the final non-trivial diff
  - standalone review and explicit elegance review before any review handoff
- Rollout verification:
  - refresh the same workpad after docs, reproduction, implementation, and final validation milestones
- Monitoring / alerts:
  - capture exact failure text, timings, and terminal state for each reproduction
  - keep review-wrapper or workflow-helper bootstrap failures labeled separately from test failures

## Open Questions
- Does the current missing brace in `providerIssueHandoff.ts` fully explain the admission-cache failure path, or is there a deeper live runtime/timer defect behind the original issue report?
- Does `ProviderLinearWorkerRunner.test.ts` still fail once the current syntax regression is repaired?

## Approvals
- Reviewer: Self-approved for implementation start after this packet and the pre-implementation issue-quality review above. Audited docs-review evidence, exact reproductions, and final validation remain pending.
- Date: 2026-04-13
