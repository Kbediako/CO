# TECH_SPEC: Coordinator Live Provider Child-Run Task Identity and Delegation Guard Contract Alignment

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Align provider-started child-run fallback task identity with strict `delegation-guard` semantics without weakening the normal top-level task contract or changing the current provider-intake authority model.
- Scope:
  - docs-first registration for the new follow-up lane
  - one narrow contract fix across the provider-intake/delegation boundary
  - focused regression coverage for the sanctioned provider-run guard behavior
  - live rerun against the existing `CO-1` / `CO-2` provider setup
- Constraints:
  - preserve ordinary `tasks/index.json` registration rules for non-provider top-level runs
  - preserve current provider claim, replay, rehydration, and `start` / `resume` behavior outside the guard contract
  - stop at the next downstream blocker after `delegation-guard`

## Technical Requirements
- Functional requirements:
  - provider-started child runs created from the current fallback mapping must be recognized as a sanctioned autonomous provider-run contract, not rejected solely because the fallback task id is absent from `tasks/index.json`
  - the sanctioned provider contract must stay narrow and auditable from active run launch provenance plus a matching control-host provider-intake claim
  - delegated child runs under a sanctioned provider-started task id must remain valid when they use the normal `<task-id>-<stream>` subagent prefix and still present an active child manifest tied to the sanctioned parent run
  - ordinary top-level runs must still fail when they use unregistered task ids without an allowed contract
  - live provider rerun must confirm claim plus child-run progress past `stage:delegation-guard:failed`, or record the next exact blocker
- Non-functional requirements (performance, reliability, security):
  - fail closed when the manifest is missing, malformed, or does not prove the sanctioned provider-run contract
  - avoid repo-wide delegation weakening or hidden override behavior
  - keep the diff narrow and directly traceable to the current mismatch
- Interfaces / contracts:
  - provider manifest fields: `issue_provider`, `issue_id`, `issue_identifier`, and `task_id`
  - control-host launch provenance: `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE=control-host` plus a non-empty `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN`
  - authoritative exemption proof: a matching control-host `provider-intake-state.json` claim with the same provider issue identity, mapped `task_id`, current `provider_id_fallback` mapping source, and the same launch token
  - active-manifest requirement: the current `CODEX_ORCHESTRATOR_MANIFEST_PATH` must point to an `in_progress` manifest whose `task_id` matches the current task before either the top-level provider proof or the delegated-child provider proof can succeed
  - manifest-path continuity: when a matched claim has `run_manifest_path`, it must equal `CODEX_ORCHESTRATOR_MANIFEST_PATH`
  - delegated child lineage proof: a provider-child manifest must carry `parent_run_id` matching the sanctioned provider parent claim/run before the `<task-id>-<stream>` exemption is granted
  - delegated child-run parent proof: when `MCP_RUNNER_TASK_ID` is prefixed by `<provider-task-id>-`, a sanctioned control-host provider claim for `<provider-task-id>` may serve as the parent-key proof for normal subagent exemption
  - guard context: `CODEX_ORCHESTRATOR_MANIFEST_PATH`
  - fallback mapping contract: current provider-started runs use `linear-<opaque-provider-id>` derived from `issue_id`

## Architecture & Data
- Architecture / design adjustments:
  - keep provider-started fallback task ids as the runtime identity carrier for now
  - teach `delegation-guard` to recognize a narrow provider-fallback contract by reading the active manifest and validating that it matches an existing control-host provider-intake claim plus control-host launch provenance; manifest issue fields alone are insufficient because ordinary CLI flags can already set them
  - exempt only the provider-started runs whose active `in_progress` manifest and launch context match a control-host provider-intake claim on provider, issue id, issue identifier, task id, current `provider_id_fallback` mapping source, and launch token
  - treat that sanctioned provider proof as the delegation evidence for the provider-started run itself because the run is already a control-host delegated child; do not require a second pre-existing `<task-id>-*` manifest before the run can begin
  - require claim `run_manifest_path` equality once the control host has rehydrated or resumed a concrete run, so a second run cannot reuse the same provider issue claim after the authoritative manifest path is known
  - when an unregistered task id is prefixed by a sanctioned provider task id, treat it like any other `<parent-task>-<stream>` subagent run only after the current child manifest proves `task_id`, `status=in_progress`, and `parent_run_id` continuity to the sanctioned provider parent; do not re-apply the top-level provider proof path to the child task itself
  - leave `providerIssueHandoff` and the control host responsible for launch/resume authority, while the guard becomes aware of this already-sanctioned autonomous provider lane
- Data model changes / migrations:
  - additive provider-intake claim metadata for control-host launch provenance (`launch_source`, `launch_token`)
- External dependencies / integrations:
  - live provider-intake state and current child-run manifests under `.runs/`
  - real Linear started issues `CO-1` and `CO-2`

## Validation Plan
- Tests / checks:
  - docs-review for `1305`
  - focused guard regressions proving sanctioned provider-fallback runs pass while ordinary unregistered top-level runs still fail
  - explicit negative regressions proving non-control-host `provider-intake-state.json` ledgers cannot satisfy either the top-level provider exemption or the delegated-child parent proof
  - explicit negative regression proving forged `--issue-provider/--issue-id/--issue-identifier` flags without matching provider-intake proof still fail
  - explicit negative regressions proving missing launch provenance or mismatched `run_manifest_path` still fail closed
  - explicit positive regression proving a delegated child task under a sanctioned provider parent id is treated as a normal subagent prefix
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
  - verify current control-host advisory and provider-intake state before rerun
  - trigger or observe the real started issue path using the existing live provider setup
  - confirm the mapped child run clears `delegation-guard`
  - if another blocker appears, capture the manifest/log evidence and stop there
- Monitoring / alerts:
  - monitor `provider-intake-state.json`, `linear-advisory-state.json`, child-run manifests, and the guard command log

## Open Questions
- Whether any helper extraction is worth doing now, or if inline manifest-plus-provider-intake validation inside `scripts/delegation-guard.mjs` is the smallest correct change.
- Whether the current fallback task-id shape should be formalized in a shared helper after this lane, once live validation confirms the narrow contract.

## Approvals
- Reviewer: Waiver granted by the top-level orchestrator on 2026-03-20; the stacked docs-review wrapper remained non-terminal at the final review step. Evidence: `out/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up/manual/20260320T011421Z-live-provider-test-hermeticity-closeout/14-review-waiver.md`
- Date: 2026-03-20
