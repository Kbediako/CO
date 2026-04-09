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
- Problem Statement: `CO-94` reached a narrow implementation-ready state on 2026-04-09, but its required `npm run test` validation remained red for reasons outside the run-memory-controller diff. The blocker evidence captured in the `CO-94` workpad names broad timeout-heavy failures across `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`, `tests/subagent-edit-guard.spec.ts`, `tests/diff-budget.spec.ts`, `tests/cli-frontend-test.spec.ts`, `tests/spec-guard.spec.ts`, `tests/vitest-progress-config.spec.ts`, `orchestrator/tests/WorkspacePath.test.ts`, and `tests/cli-orchestrator.spec.ts`. Earlier lanes `CO-24`, `CO-38`, and `CO-57` already narrowed older full-suite post-pass idling and implementation-gate heartbeat issues, so `CO-132` must remeasure the current repo-wide red lane rather than assume an older hang diagnosis still applies.
- Desired Outcome: collect fresh evidence for the current broad `npm run test` failures on this tree, determine whether they are baseline, environment-sensitive, or recent regressions outside the original `CO-94` diff, and land the smallest truthful fix or gating/reporting improvement that lets narrow issue lanes distinguish unrelated repo-wide failures from local regressions without hiding the red lane.

## Evidence Update - 2026-04-10
- Two consecutive full `npm run test` runs are green on the current `linear/co-132-timeout-test-lane-truth` head (`2a0e6320c`) under worker-like non-interactive settings (`CI=1 CODEX_NON_INTERACTIVE=1 CODEX_VITEST_PROGRESS=1`).
- The durable rerun artifact is `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260409T150909Z-baseline-repro/01-npm-test-rerun.log`, which ends `323` test files passed and `3274` tests passed in `131.95s`.
- The first same-command run also ended green (`323` / `3274` in `126.57s`), but its `tee` destination was mistyped after launch, so its summary is retained only in the provider-worker session output rather than a full log file.
- Since the `CO-94` blocker head (`d47f219ef`), later repo merges changed several originally implicated surfaces:
  - `2a0e6320c` (`#396`) updated `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`, `tests/cli-command-surface.spec.ts`, and `tests/cli-frontend-test.spec.ts`
  - `3d775ec0b` (`CO-114`) updated `tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`
  - `a2e9cf1c1` (`CO-112`) updated `orchestrator/tests/ControlRuntime.test.ts`
- Current classification: the `CO-94` blocker is not reproducible on current head and should not be treated as a standing repo-wide red baseline for narrow-lane handoffs. The most defensible explanation is that later repo changes already cleared the previously observed failure family outside the `CO-94` diff.

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
  - assume older `CO-24` / `CO-38` hang diagnoses still explain the current failure family without fresh reproduction

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
- Product: CO operators and issue owners who need truthful review/handoff decisions
- Engineering: maintainers of repo validation, provider-worker workflows, and the broad orchestrator/CLI test suites
- Design: N/A

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
  - `CO-94` proves the current blocker shape is broader than a late-suite heartbeat/readout problem because the workpad recorded many named suite failures, not only a non-terminal idle
  - likely owner seams include shared control-host/provider tests, CLI wrapper/test environment setup, Vitest config/runtime posture, or a missing repo-owned classification artifact for dependent lanes
- Dependencies / Integrations:
  - `package.json` (`npm run test`)
  - `vitest.config.core.ts`
  - `vitest.config.ts`
  - the broad orchestrator and CLI test suites named in the `CO-94` blocker evidence
  - provider-worker workpad / validation handoff expectations

## Open Questions
- Does the current tree still reproduce a genuinely red broad lane, or was the `CO-94` failure family environment-sensitive to that worker attempt?
- If the lane remains red, is there one bounded shared owner seam or only a truthful reporting/classification gap that narrow lanes need?

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review, fresh reproduction, and implementation validation
- Design: N/A
