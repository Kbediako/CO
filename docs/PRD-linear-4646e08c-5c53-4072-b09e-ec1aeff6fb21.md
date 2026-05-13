# PRD - Fix Repeated Post-Merge Core Lane Failures in ProviderIssueHandoff and CLI Command Surface Suites

## Added by Bootstrap 2026-03-28

## Traceability
- Linear issue: `CO-31` / `4646e08c-5c53-4072-b09e-ec1aeff6fb21`
- Linear URL: https://linear.app/asabeko/issue/CO-31/co-fix-repeated-post-merge-core-lane-failures-in-providerissuehandoff

## Summary
- Problem Statement: `CO-24` merged as PR `#314`, but the post-merge `Core Lane` run on `main` failed twice on the same merge head `b81084ed121a59ca98f2b522ca1b5b602ceb54e8`. The authoritative failing job (`23680994977` / `68994221283`) shows two clusters on the same lane: `ProviderIssueHandoff` stalls in the queued-retry refetch seam and the late `cli-command-surface` binary-shell cases time out after the rest of the suite runs.
- Desired Outcome: Reproduce or otherwise root-cause the repeated `main`-branch failure pattern with artifact-backed evidence, land the smallest fix that restores a clean `Core Lane` on the fix head, and close the lane with a truthful classification of whether the root cause was a CO-24 regression, a preexisting flaky interaction, or a mixed shared-suite timing issue.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Treat the repeated post-merge `main` failures as a real repo blocker, not a one-off rerun miss, and finish a bounded repair lane that proves which seam owns the instability before review handoff.
- Success criteria / acceptance:
  - artifact-backed reproduction or root-cause evidence exists for the repeated post-merge failure shape
  - `orchestrator/tests/ProviderIssueHandoff.test.ts` no longer hangs or flakes in the queued-retry refetch seam under CI-relevant conditions
  - `tests/cli-command-surface.spec.ts` no longer times out in the repeated binary-shell cases under CI
  - the equivalent of `Core Lane` passes cleanly on the fix head and focused regressions guard the identified seam
  - closeout states clearly whether the root cause was a CO-24 regression, a preexisting instability, or a mixed interaction
- Constraints / non-goals:
  - do not revert CO-24 without stronger evidence
  - do not widen into a broad test-harness refactor without a proven owner
  - keep the diff narrowly scoped to the offending interaction and its regression coverage

## Goals
- Reproduce or otherwise root-cause the repeated `main`-branch failure on merge head `b81084ed121a59ca98f2b522ca1b5b602ceb54e8` or current `main`.
- Determine whether `ProviderIssueHandoff`, CLI command-surface subprocess handling, or cross-suite state leakage owns the failures.
- Apply the smallest defensible fix that restores clean `Core Lane` behavior.
- Add focused regression coverage for the exact failing seams and their interaction.

## Non-Goals
- Reverting PR `#314` without stronger causal evidence.
- Rewriting unrelated Vitest or CLI harness infrastructure.
- Claiming green validation from targeted tests alone if the full-lane failure mode remains unexplained.

## Stakeholders
- Product: CO operator / provider-worker workflow owner
- Engineering: CO maintainers and future issue workers relying on truthful post-merge validation
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - local or CI-backed evidence explains the repeated four-test failure shape on the merge head
  - focused reproductions for the chosen seam become stable and terminal
  - full `Core Lane` equivalent validation passes on the fix branch
- Guardrails / Error Budgets:
  - preserve truthful CI signal instead of papering over slow or hanging subprocesses
  - keep the implementation bounded to the identified shared seam
  - preserve nearby provider and CLI contracts unless evidence requires a change

## User Experience
- Personas: provider worker author, maintainer reviewing post-merge stability, future lane owner depending on `main`
- User Journeys:
  - a maintainer inspects the post-merge failure and sees a concrete root cause rather than an unexplained rerun-only flake
  - the fix branch proves both early provider-handoff timing and late CLI binary-shell behavior terminate cleanly together
  - future post-merge runs on `main` do not silently reintroduce the same suite-order instability

## Technical Considerations
- Architectural Notes:
  - the current workspace started detached at failing merge head `b81084ed121a59ca98f2b522ca1b5b602ceb54e8` and now works on branch `co-31-fix-post-merge-core-lane`
  - authoritative CI evidence comes from GitHub Actions run `23680994977`, rerun attempt `2`, and failing job `68994221283`
  - required baseline files include `orchestrator/tests/ProviderIssueHandoff.test.ts`, `tests/cli-command-surface.spec.ts`, `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`, `vitest.config.core.ts`, and `vitest.config.ts`
  - adjacent historical lanes already narrowed nearby instability seams in `tasks/specs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`, `tasks/specs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md`, and `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`
- Dependencies / Integrations:
  - Vitest core lane execution
  - binary-shell subprocess coverage in `tests/cli-command-surface.spec.ts`
  - provider retry/refresh sequencing in `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - GitHub Actions log evidence for the failing `main` run

## Open Questions
- Does the provider-handoff failure share a causal mechanism with the three late CLI timeouts, or are they two symptoms of one earlier leak?
- Is the smallest fix in production lifecycle code, test cleanup/isolation, or both?
- Can the repeated CI-only pattern be reproduced locally on the merge head, or is artifact-backed root-cause evidence enough to justify a narrow fix?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review and implementation validation
- Design: N/A
