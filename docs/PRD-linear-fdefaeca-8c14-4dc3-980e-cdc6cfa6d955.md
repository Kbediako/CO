# PRD - CO: Stabilize implementation-gate when nested npm run test hangs after green tail

## Added by Bootstrap 2026-04-01

## Traceability
- Linear issue: `CO-57` / `fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- Linear URL: https://linear.app/asabeko/issue/CO-57/co-stabilize-implementation-gate-when-nested-npm-run-test-hangs-after

## Summary
- Problem Statement: the `CO-56` report was directionally right about the operator pain but too broad about the live fault. Current-tree reproduction showed the cited late green suites were not terminal; the child run continued into later suites and then finished successfully. The real defect was narrower: long-running stages updated the sidecar `.heartbeat` file but did not persist the same heartbeat into `manifest.json`, so raw-manifest readers could misclassify an active `implementation-gate` run as stalled and intervene manually. That manual cleanup then degraded the run into a generic failed command (`exit 128`) even though the suite output stayed green.
- Desired Outcome: keep `manifest.json` heartbeat data current during active long-running stages so `implementation-gate` reaches and exposes its truthful terminal result without manual PID intervention, while preserving ordinary failure reporting for genuine red `npm run test` runs.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): fix the gate-owned failure mode, not the entire repo-wide full-suite history. Keep provider-worker child streams reliable when the known late-suite symptom reappears, preserve failure truth for real red test runs, and capture the narrower current-tree diagnosis with regression coverage or a concrete evidence note.
- Success criteria / acceptance:
  - `implementation-gate` no longer looks stalled to raw-manifest readers while `npm run test` is still legitimately running through the late suites
  - the gate preserves the difference between an active long-running test stage and a genuinely failing `npm run test` command instead of collapsing manual intervention into a generic failed run
  - regression coverage or an explicit runbook captures the provider-worker child-stream reproduction observed during `CO-56`, including the narrower current-tree diagnosis
- Constraints / non-goals:
  - do not reopen the full repo-wide blocker scope from `CO-24`
  - do not silently mark genuinely failing test output as success
  - keep the fix bounded to the implementation-gate lifecycle or heartbeat-persistence seam unless fresh evidence forces a different minimal owner

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "Stabilize implementation-gate when nested npm run test hangs after green tail"
  - "nested `npm run test:orchestrator` and `esbuild --service` processes stayed alive"
  - "false negative even though the visible suite output was green"
  - "distinguishes this quiet-tail/stall case from a genuine failing test command"
- Protected terms / exact artifact and surface names:
  - `implementation-gate`
  - `npm run test`
  - `npm run test:orchestrator`
  - `esbuild --service`
  - `tests/linear-cli-help.spec.ts`
  - `tests/cli-frontend-test.spec.ts`
  - `exit 128`
  - manifest heartbeats
  - provider-worker child stream
- Nearby wrong interpretations to reject:
  - treat this as a broad rewrite of repo-wide `npm run test` behavior
  - solve the issue by adding an unclassified quiet timeout that kills any slow test run
  - keep treating the current tree as a reproduced post-green-tail hang after `tests/linear-cli-help.spec.ts` and `tests/cli-frontend-test.spec.ts` once the later-suite evidence says otherwise
  - report the quiet-tail as a clean success without preserving machine-checkable distinction from real test failures

## Parity / Alignment Matrix
- Not applicable; this is a bounded gate-stabilization lane, not a parity migration.
- Current truth:
  - older repo work (`CO-24`, `1307`) already documented the quiet-tail family
  - the current-tree baseline reproduction showed `tests/linear-cli-help.spec.ts` and `tests/cli-frontend-test.spec.ts` were not terminal suites; the run continued into `tests/run-review.spec.ts`, `tests/cli-command-surface.spec.ts`, and then succeeded
  - the real blocker is stale `manifest.json` heartbeat data during an active long-running `test` stage, which can mislead raw-manifest readers into a false-stall diagnosis
- Reference truth:
  - provider-worker `implementation-gate` child streams should finish with a truthful terminal status and usable evidence
- Target truth / intended delta:
  - `manifest.json` heartbeat data stays current while the long-running `test` stage is still active
  - provider-worker operators can distinguish an active run from a true failure without adding a new success reclassification path
- Explicitly out-of-scope differences:
  - unrelated review-wrapper bounded-success interpretation work
  - unrelated provider-worker Linear mutation or delegation-guard behavior

## Not Done If
- `manifest.json` heartbeat data still goes stale during an active long-running `test` stage.
- The only available operator action remains manual PID cleanup that degrades the run into a generic `exit 128` failure.
- The shipped outcome does not preserve a concrete distinction between active progress and genuine failing test output.

## Goals
- Reproduce the current `implementation-gate` symptom on the current tree and confirm whether it is a true hang or a stale-progress signal.
- Identify the smallest gate-owned seam responsible for the false-stall diagnosis.
- Land the smallest fix that restores truthful in-flight and terminal behavior without widening into test-harness cleanup.
- Cover the lane with focused regressions and a concrete evidence note so later provider-worker child streams do not depend on manual cleanup.

## Non-Goals
- Re-solving every historical cause of repo-wide `npm run test` idling.
- Broad Vitest, esbuild, or child-process infrastructure rewrites without fresh evidence.
- Quietly weakening validation discipline for real failing test runs.

## Stakeholders
- Product: CO operator and provider-worker author relying on truthful implementation-gate results
- Engineering: implementation-gate pipeline, execution lifecycle, and validation workflow maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - a reproduced long-running implementation-gate run reaches a truthful terminal outcome without stale-manifest misclassification
  - the resulting stage or run evidence distinguishes active progress from actual test failure
  - focused regression coverage and a concrete evidence note document the exact provider-worker reproduction shape
- Guardrails / Error Budgets:
  - preserve failure truth when `npm run test` emits red output or exits non-zero for real reasons
  - keep the fix limited to the current heartbeat-truth seam
  - do not widen scope into unrelated repo validation or provider-worker workflow fixes

## User Experience
- Personas: provider-worker author, operator reviewing child-stream results, reviewer auditing implementation-gate manifests
- User Journeys:
  - a worker launches or observes `implementation-gate` and sees current heartbeat evidence even while the late suites are still running
  - a reviewer can tell whether the run ended because tests actually failed or because the gate simply continued running to completion after a long tail
  - later lanes can cite machine-checkable evidence instead of narrative cleanup notes

## Technical Considerations
- Architectural Notes:
  - `implementation-gate` runs `npm run test` as an ordinary command stage after env scrubbing in `codex.orchestrator.json`
  - the lifecycle path that writes run heartbeats lives in `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - current-tree reproduction showed `commandRunner` and `execRuntime` were not the minimal owner for this issue; the missing manifest-heartbeat persistence in the execution lifecycle was
  - the current issue description cites the failed child run path `.runs/linear-fabdf855-dd07-4f8d-8ffa-f02d22cb27be-implementation-gate/cli/2026-03-31T08-43-29-277Z-47dd6a72/manifest.json`; local retention of that exact run directory may be incomplete, so this lane re-established current-tree evidence instead of depending on stale artifact presence
- Dependencies / Integrations:
  - `codex.orchestrator.json`
  - `package.json`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`
  - provider-worker `linear child-stream` execution of `implementation-gate`

## Open Questions
- None for implementation. A follow-up is only needed if a future run reproduces a true post-suite linger after heartbeat truth is restored.

## Approvals
- Product: self-approved from the Linear issue scope and explicit acceptance criteria
- Engineering: implementation validated; docs-review child stream hit model-capacity `failed-other`, then manual docs review fallback was accepted
- Design: N/A
