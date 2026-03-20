# TECH_SPEC: Coordinator Live Provider Child-Run Test-Stage Terminal Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Eliminate the current-tree `npm run test` long-tail blocker after `1306` by making CLI subprocess command-surface tests hermetic with respect to runtime selection, then rerun the live provider child run to the next exact stage boundary.
- Scope:
  - docs-first registration for the follow-up lane
  - delegated read-only analysis and docs-review for the current hold-open evidence
  - one minimal CLI subprocess test-harness isolation fix, plus any tightly coupled regression updates
  - required repo validation plus a live provider rerun against the existing control-host state
- Constraints:
  - preserve the shipped `1305`/`1306` provider and delegation contracts
  - keep production runtime-provider behavior unchanged unless fresh evidence proves a production-side cleanup bug is still required
  - stop at the first exact downstream blocker after the current `test` stage

## Technical Requirements
- Functional requirements:
  - CLI subprocess command-surface tests that do not explicitly exercise runtime-provider behavior must default to a deterministic CLI runtime posture instead of inheriting the operator's ambient appserver/login state
  - tests that intentionally exercise runtime/fallback boundaries must still be able to override that deterministic baseline on a per-case basis
  - full `npm run test` must return terminally on the implementation tree without requiring manual process cleanup
  - the live provider-started child run must still clear the current `delegation-guard`, `build`, `lint`, and `test` stages or else capture the next exact failing stage
- Non-functional requirements:
  - keep the diff minimal and localized, preferably to test-only surfaces
  - preserve the CLI command-surface coverage goals while removing ambient-runtime flakiness
  - keep the docs/checklist/evidence trail truthful about what was changed and why
- Interfaces / contracts:
  - CLI subprocess test harness in [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts)
  - runtime selection in [`orchestrator/src/cli/runtime/provider.ts`](../orchestrator/src/cli/runtime/provider.ts)
  - runtime-provider regression coverage in [`orchestrator/tests/RuntimeProvider.test.ts`](../orchestrator/tests/RuntimeProvider.test.ts)
  - live provider child-run evidence under `.runs/local-mcp/cli/control-host/` and `.runs/linear-*/`

## Architecture & Data
- Architecture / design adjustments:
  - prefer a test-harness baseline env in `runCli(...)` that pins `CODEX_ORCHESTRATOR_RUNTIME_MODE`, `CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE`, and `CODEX_RUNTIME_MODE` to `cli`, while allowing explicit per-test overrides to replace those values when runtime-provider behavior is the subject under test
  - rely on dedicated runtime/provider unit tests for appserver preflight and fallback semantics instead of ambient subprocess behavior in the CLI command-surface suite
  - fresh split-run evidence shows [`tests/cli-orchestrator.spec.ts`](../tests/cli-orchestrator.spec.ts) exits cleanly while the quiet long tail stays in [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts)
  - if a fresh full-suite rerun still shows non-terminal behavior or a full-suite-only assertion failure after test-harness isolation, investigate the next smallest cleanup candidate in subprocess/log-stream teardown or timing-only waits before widening scope further
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - local `codex` availability should no longer materially affect ordinary CLI command-surface subprocess tests
  - live provider control-host state and reused child-run lineage remain the authoritative downstream validation target

## Validation Plan
- Tests / checks:
  - docs-review for `1307`
  - focused CLI subprocess regression coverage showing the shared command-surface helper no longer inherits ambient runtime selection unless a test explicitly overrides it
  - full validation floor:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
    - `npm run review`
    - `npm run pack:smoke`
  - explicit elegance review pass
- Rollout verification:
  - verify the control-host state still shows accepted provider claims
  - trigger or observe a real started Linear issue against the current live setup
  - confirm the mapped child run gets beyond the current `test` stage
  - if another blocker appears, capture the manifest/log evidence and stop there
- Monitoring / alerts:
  - monitor the local Vitest process for clean terminal exit
  - monitor the reused or newly launched provider child-run manifest plus `commands/*.ndjson`

## Open Questions
- Whether the test-harness runtime pin is sufficient on its own, or whether a small subprocess/log-stream cleanup is still needed after the first full-suite rerun?
- Which downstream stage becomes the next live blocker once `npm run test` returns cleanly?

## Approvals
- Reviewer: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up/cli/2026-03-19T23-03-46-459Z-587c5d05/manifest.json`
- Date: 2026-03-19
