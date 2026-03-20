# TECH_SPEC: Coordinator Live Provider Child-Run Test-Stage Regression Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Fix the two concrete `04-test` regressions now blocking the live provider-started child-run branch after `1305`, without reopening the provider/delegation contract itself.
- Scope:
  - docs-first registration for the follow-up lane
  - one narrow runtime-shell env normalization fix
  - one narrow provider-intake truthfulness fix for newly spawned child runs
  - one narrow `delegation-guard` provider-contract hardening fix
  - required repo validation plus a live provider rerun against the existing control host state
- Constraints:
  - preserve the `1305` control-host-only provider proof contract
  - preserve the existing provider-intake start/resume and child-run launch behavior while keeping claim state truthful
  - stop at the next exact blocker after the current test stage

## Technical Requirements
- Functional requirements:
  - when `runCompletion(...)` or `runJsonlCompletion(...)` forces non-interactive execution, empty-string `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, and `CODEX_INTERACTIVE` inputs must be treated the same as unset values so the child exec env receives `1`, `1`, and `0`
  - provider-started claims must stay `starting` after manifest discovery until rehydrate proves the child manifest is actually `in_progress`, while still recording `run_id` and `run_manifest_path`
  - `delegation-guard` negative output for a top-level provider-started fallback run that lacks launch provenance must remain focused on the provider-started proof failure and task registration failure, not a spurious provider-child `parent_run_id` complaint
  - `delegation-guard` must continue to resolve the authoritative provider-intake ledger when the control host runs under non-default `--task` / `--run` ids, using control-host provenance persisted on sanctioned provider-started manifests and backfilled on resume instead of trusting arbitrary sidecar ledgers
  - existing sanctioned provider-started runs and sanctioned provider-child runs must keep passing under the `1305` contract
  - live provider rerun must show the child run clearing `test` or capture the next failing stage precisely
- Non-functional requirements:
  - keep the diff minimal and localized to the current regressions
  - avoid broad helper extraction unless it directly reduces duplication in the touched path
  - keep failure messages auditable and aligned with the actual contract being evaluated
- Interfaces / contracts:
  - RLM runtime shell non-interactive env shaping in `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - provider-intake handoff state transitions in `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - control-host provider launch provenance in `orchestrator/src/cli/controlHostCliShell.ts`
  - provider-run manifest bootstrap and resume backfill in `orchestrator/src/cli/run/manifest.ts` and `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`
  - provider-started and provider-child guard logic in `scripts/delegation-guard.mjs`
  - regression harnesses in `orchestrator/tests/Manifest.test.ts`, `orchestrator/tests/OrchestratorResumePreparationShell.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/RlmCodexRuntimeShell.test.ts`, and `tests/delegation-guard.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a small non-empty-string normalization step before applying non-interactive env defaults in the RLM runtime shell, matching the intent already used by other cloud-oriented env readers
  - keep manifest-observed provider starts in `starting` so the repeat-delivery guard continues to suppress duplicate starts until rehydrate confirms the run is active
  - change the provider-child negative path in `delegation-guard` so child-manifest requirements are only surfaced when the task actually matches a sanctioned provider parent prefix, instead of emitting them for every unregistered provider-like top-level task
  - persist control-host `task_id` / `run_id` provenance onto provider-started manifests at bootstrap time, backfill older provider manifests on resume, and let `delegation-guard` prefer manifest-carried locator data before env/default fallback when resolving the authoritative ledger
- Data model changes / migrations:
  - add optional manifest fields `provider_control_host_task_id` and `provider_control_host_run_id`
- External dependencies / integrations:
  - live control-host provider-intake/advisory state
  - existing `CO-2` child-run manifest lineage under `.runs/`

## Validation Plan
- Tests / checks:
  - docs-review for `1306`
  - focused regression coverage for empty-string non-interactive env normalization in the RLM runtime shell
  - focused regression coverage proving manifest-observed provider starts remain inflight until rehydrate confirms activity
  - focused regression coverage proving top-level provider-started fallback failures do not emit provider-child diagnostics before a sanctioned parent prefix exists
  - focused regression coverage proving manifest bootstrap and resume backfill persist the sanctioned control-host locator
  - focused regression coverage proving sanctioned provider-started and provider-child runs still pass when the authoritative control-host ledger is stored under non-default host task/run ids and the rerun relies on the manifest-carried locator
  - required repo validation floor:
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
- Rollout verification:
  - verify the control-host state still shows accepted provider claims
  - trigger or observe a real started Linear issue against the current live setup
  - confirm the mapped child run gets beyond `stage:test:failed`
  - if another blocker appears, capture the manifest/log evidence and stop there
- Monitoring / alerts:
  - monitor the reused or newly launched child-run manifest plus `commands/*.ndjson`

## Open Questions
- Whether the same empty-string normalization bug exists in adjacent non-interactive launchers and is worth a follow-on after this lane if the live rerun exposes it.
- Whether the live child run will now stop at `spec-guard`, `docs:check`, or a later review/pack stage.

## Approvals
- Reviewer: docs-review approved via `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up/cli/2026-03-19T21-44-24-346Z-e87d8d12/manifest.json`
- Date: 2026-03-20
