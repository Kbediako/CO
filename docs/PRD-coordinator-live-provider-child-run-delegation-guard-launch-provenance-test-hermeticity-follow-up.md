# PRD - Coordinator Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up

## Added by Bootstrap 2025-10-16

## Summary
- Problem Statement: `1308` ended at a live resumed `04-test` failure in `tests/delegation-guard.spec.ts`, so `1309` started by treating ambient provider launch provenance as the likely root cause. Current-tree validation then showed the narrow hermetic helper was already present in `tests/delegation-guard.spec.ts`: targeted delegation-guard coverage passes both from a normal shell and from an injected provider-started parent env. A fresh signed live `CO-2` replay on March 20, 2026 also carried the reused child run past the earlier `stage:test:failed` boundary and through the final visible Vitest success line. The remaining blocker is now downstream of that former failure mode: both the direct local `npm run test` invocation and the live reused child run stop returning after the final visible test success line, so `05-spec-guard` never starts on the live path.
- Desired Outcome: Close `1309` truthfully by proving the prior delegation-guard test hermeticity failure no longer blocks the live provider-started child run, preserve the real provider/runtime contracts, and record the next exact blocker for the follow-up lane.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Continue the provider follow-up end to end as the orchestrator, use docs-first plus heavy delegated analysis, fix the next real blocker with the smallest defensible change, and prove the result again against the existing live provider setup.
- Success criteria / acceptance:
  - a new truthful follow-up lane exists as `1309`
  - the lane records that `1308` ended at a live `tests/delegation-guard.spec.ts` failure inside `04-test`, not at a runtime delegation-guard regression
  - current-tree validation proves `tests/delegation-guard.spec.ts` is hermetic even when the parent process carries provider launch env
  - targeted `tests/delegation-guard.spec.ts` coverage passes even when the parent process carries provider launch env
  - a fresh live `CO-2` replay gets beyond the prior `stage:test:failed` failure mode or records the next exact blocker
  - if the full direct `npm run test` command still does not return cleanly, the lane records that blocker exactly instead of overclaiming success
- Constraints / non-goals:
  - do not weaken `scripts/delegation-guard.mjs` to make tests pass
  - do not undo the control-host launch provenance contract for real provider-started runs
  - do not reopen the `1307` command-surface runtime baseline unless fresh evidence forces it

## Goals
- Verify that delegation-guard test child-process env handling is already hermetic under ambient provider launch provenance on the current tree.
- Preserve current provider-intake and runtime delegation contracts.
- Revalidate the local and live provider path with the smallest truthful diff, then stop at the next exact blocker.

## Non-Goals
- Reopening the provider-intake claim contract from `1305`.
- Reopening the general CLI command-surface runtime isolation contract from `1307`.
- Broad delegation-guard message redesign unrelated to the live failure.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - targeted delegation-guard regressions pass under ambient provider launch env
  - the live provider-started `CO-2` child run gets beyond the prior `stage:test:failed` boundary
  - any remaining post-suite `npm run test` non-return is captured with exact local and live evidence
- Guardrails / Error Budgets:
  - preserve real control-host launch provenance on live provider-started runs
  - keep the fix local to test hermeticity and related assertions unless new evidence forces a production-path change
  - stop at the first exact downstream blocker after the live rerun

## User Experience
- Personas: CO operator validating the real provider-driven autonomous intake and child-run path
- User Journeys:
  - local delegation-guard tests behave the same whether run from a normal shell or from a provider-started resumed run
  - the live `CO-2` child run no longer fails for the same delegation-guard test-stage reason
  - if another blocker appears immediately after that point, the repo records it without reopening provider/delegation scope

## Technical Considerations
- Architectural Notes:
  - the live resumed parent process carries `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE=control-host` and a real launch token
  - [`tests/delegation-guard.spec.ts`](../tests/delegation-guard.spec.ts) now strips inherited orchestration/provider provenance keys in `cleanGuardOverrideEnv(...)` before applying explicit test overrides
  - targeted validation shows that helper behaves hermetically even when the parent process carries real-looking `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_*` env
  - the next blocker is therefore not a delegation-guard assertion mismatch; it is a post-suite non-return that appears after the final visible Vitest success line
- Dependencies / Integrations:
  - [`tests/delegation-guard.spec.ts`](../tests/delegation-guard.spec.ts)
  - [`scripts/delegation-guard.mjs`](../scripts/delegation-guard.mjs)
  - live control-host and provider child-run evidence under `.runs/local-mcp/cli/control-host/` and `.runs/linear-*/`

## Open Questions
- What keeps the direct `npm run test` command and the live reused `04-test` stage from returning after the final visible Vitest success line.
- Whether the next corrective lane belongs in CLI test/process handling rather than delegation-guard coverage.

## Approvals
- Product: Self-approved from operator directive and fresh live rerun evidence
- Engineering: Pending docs-review for `1309`
- Design: N/A
