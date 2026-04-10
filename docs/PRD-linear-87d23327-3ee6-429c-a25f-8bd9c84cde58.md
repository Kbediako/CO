# PRD - CO: Stabilize broad timeout-heavy repo test lane so unrelated failures stop blocking narrow issue handoffs

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-132` / `87d23327-3ee6-429c-a25f-8bd9c84cde58`
- Linear URL: https://linear.app/asabeko/issue/CO-132/stabilize-broad-timeout-heavy-repo-test-lane-so-unrelated-failures
- Source issue: `CO-94` / `ce6f26d0-029a-40d9-8ffe-289cd40cde8d`
- Branch: `linear/co-132-timeout-test-lane-truth`
- Prior blocker evidence:
  - `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-worker-proof.json`
  - `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/provider-linear-issue-context-cache.json`

## Summary
- Problem Statement: `CO-94` reached a narrow implementation-ready state on 2026-04-09, but its required `npm run test` validation stayed red for reasons outside the run-memory-controller diff. The blocker evidence captured there names broad timeout-heavy failures across `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`, `tests/subagent-edit-guard.spec.ts`, `tests/diff-budget.spec.ts`, `tests/cli-frontend-test.spec.ts`, `tests/spec-guard.spec.ts`, `tests/vitest-progress-config.spec.ts`, `orchestrator/tests/WorkspacePath.test.ts`, and `tests/cli-orchestrator.spec.ts`.
- Desired Outcome: collect fresh evidence for the current broad `npm run test` failures on this tree, determine whether they are baseline, environment-sensitive, or recent regressions outside the original `CO-94` diff, and land the smallest truthful fix or gating/reporting improvement that lets narrow issue lanes distinguish unrelated repo-wide failures from local regressions without hiding the red lane.

## Fresh Evidence Update - Rework Attempt 2026-04-10
- Reset-branch command `env CODEX_VITEST_PROGRESS=1 npm run test` is recorded at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-reset-baseline-repro/01-npm-test-run-1.log`.
- First result on fresh `origin/main`: `324/324` files passed and `3347/3347` tests passed in `123.47s`. That proved the earlier broad multi-suite red family from `CO-94` was no longer reproducing as-is on current head.
- A second uncapped full-lane validation run on the same reset branch then failed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/05-test.log` with two timeout-heavy CLI suites:
  - `tests/cli-command-surface.spec.ts > codex-orchestrator command surface > prints usage for unknown commands and exits non-zero`
  - `tests/cli-frontend-test.spec.ts > codex-orchestrator frontend-test > selects the default frontend-testing pipeline`
- Those failures were narrower than the original `CO-94` blocker list and were clearly load-sensitive rather than broad suite breakage. A manual capped rerun with `env CODEX_VITEST_PROGRESS=1 npm run test -- --maxWorkers=4 --minWorkers=1` passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/06-test-maxworkers4-min1.log`.
- Final post-fix proof is recorded at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-fix-validation/05-test.log`: `324/324` files and `3350/3350` tests passed in `141.62s` under `CODEX_VITEST_PROGRESS=1`.
- Implication: the live broad-lane problem on current head is not the old wide repo-red family. It narrowed to two subprocess-heavy CLI suites that became timeout-prone when the broad lane fully saturated workers, and a bounded worker-cap fix is sufficient to restore truthful green broad-lane validation for the provider-worker path.

## Historical Context - Prior Attempts
- Closed PR `#400` documented a non-reproducing result on older head `2a0e6320c`; that result is historical context only and does not count as current-head proof.
- The immediately previous `CO-132` rework attempt is preserved on local ref `backup/linear-co-132-rework-20260410T095713Z` after closing PR `#410` and resetting this workspace to fresh `origin/main`.
- That backup ref is useful comparison context because it later reported a narrower load-sensitive failure family plus candidate fixes in `vitest.config.core.ts` and `ProviderIssueHandoff`.
- This rework attempt intentionally revalidated those ideas on the reset branch and only re-landed the worker-cap half. The proposed `ProviderIssueHandoff` scheduler seam was not shipped because the current-head failing family no longer implicated that surface.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-132` as a repo-owned follow-up to the `CO-94` blocker by turning broad timeout-heavy `npm run test` noise into an evidence-backed, machine-checkable baseline that no longer forces unrelated narrow lanes to carry ambiguous repo-level failures in their own handoff decisions.
- Success criteria / acceptance:
  - collect fresh current-tree evidence for the broad unrelated suites that keep `npm run test` red
  - determine whether the current failures are baseline, environment-sensitive, or recent regressions outside the narrow lane that surfaced them
  - land the smallest truthful fix or classification/reporting improvement that separates unrelated repo-wide failures from local regressions
  - verify the outcome with scoped validation plus updated docs/workpad/task artifacts
- Constraints / non-goals:
  - keep this lane about the broad repo test lane, not the `CO-94` run-memory-controller implementation itself
  - do not paper over the failures with a blanket skip, silent waiver, or unclassified timeout kill
  - do not widen into review-policy rewrites or broad unrelated suite refactors unless a bounded shared owner proves necessary

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Stabilize broad timeout-heavy repo test lane so unrelated failures stop blocking narrow issue handoffs`
  - `broad timeout-heavy`
  - `npm run test`
  - `unrelated failures`
  - `narrow issue handoffs`
- Protected terms / exact artifact and surface names:
  - repo-wide test lane
  - baseline vs local regression
  - truthful validation semantics
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `tests/cli-frontend-test.spec.ts`
  - `tests/cli-orchestrator.spec.ts`
- Nearby wrong interpretations to reject:
  - absorb this blocker back into `CO-94`
  - accept one lucky rerun as sufficient proof
  - silence the full test lane without a replacement evidence path
  - assume the prior closed `CO-132` attempt is enough current-head proof without rerunning on the new baseline

## Goals
- Reproduce or freshly audit the current broad `npm run test` red lane in this workspace.
- Classify the live failures as baseline, environment-sensitive, or new regressions with exact suite-level evidence.
- Identify the smallest correct owner seam: a bounded shared fix, a narrower config/runtime stabilization, or a truthful classification/reporting contract.
- Leave artifact-backed guidance that future narrow lanes can cite instead of carrying ambiguous repo-wide failure noise.

## Non-Goals
- Reopening `CO-94` implementation work.
- Broadly rewriting Vitest, provider workflow, or review policy without fresh evidence.
- Replacing hard evidence with narrative-only notes about "probably unrelated" failures.

## Stakeholders
- Product: CO operators and issue owners who need truthful review/handoff decisions.
- Engineering: maintainers of repo validation, provider-worker workflows, and the broad orchestrator/CLI test suites.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - the current repo-wide failure set is captured with exact affected suites and classification
  - narrow lanes can distinguish "repo baseline already red" from "my slice regressed"
  - the lane lands either a bounded fix or a machine-checkable truthful classification/reporting improvement
- Guardrails / Error Budgets:
  - preserve failure truth for genuinely red suites
  - keep the diff narrowly scoped to the proven owner or reporting seam
  - create a follow-up instead of widening into unrelated defects discovered during reproduction

## User Experience
- Personas:
  - provider-worker author trying to hand off a narrow PR
  - operator reviewing whether a red `npm run test` lane belongs to the current slice
  - maintainer debugging broad repo validation truth
- User Journeys:
  - a narrow lane reruns its changed-area checks and can cite a current repo-owned baseline artifact for unrelated full-lane failures
  - a maintainer reruns `npm run test`, sees the same named failing suites or a cleared baseline, and can attribute ownership quickly
  - a reviewer can inspect the packet and tell whether the broad lane is fixed, still red for a classified baseline, or environment-sensitive on the worker host

## Technical Considerations
- Architectural Notes:
  - older repo-wide instability lanes already exist: `CO-24` for post-suite idling, `CO-38` for a later full-suite hang investigation, and `CO-57` for implementation-gate heartbeat truth
  - `CO-94` proved the blocker shape was broader than a late-suite heartbeat/readout problem because the workpad recorded many named suite failures, not only a non-terminal idle
  - current-head reproduction now shows the active shared owner seam is narrower: the broad lane becomes timeout-prone when CLI-heavy suites compete for fully saturated worker threads in CI or explicit `CODEX_VITEST_PROGRESS` runs
- Dependencies / Integrations:
  - `package.json` (`npm run test`)
  - `vitest.config.core.ts`
  - the CLI-heavy suites `tests/cli-command-surface.spec.ts` and `tests/cli-frontend-test.spec.ts`
  - provider-worker workpad / validation handoff expectations

## Open Questions
- Pending review handoff only: confirm the final standalone review and elegance pass stay clean after the last branch sync with `origin/main`.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending final standalone review, elegance pass, and PR handoff
- Design: N/A
