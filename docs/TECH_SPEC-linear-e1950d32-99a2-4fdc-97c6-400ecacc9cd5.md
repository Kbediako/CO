# TECH_SPEC - CO Reconcile Terminal Provider-Worker Failures and Stale Intake Workpad State

## Added by Bootstrap 2026-03-25

## Summary
- Objective: make terminal provider-worker failures authoritative across run evidence, provider-intake persistence, and operator-visible Linear/workpad state so retries and recovery do not depend on stale ownership metadata.
- Scope: docs-first registration, failed-artifact audit, bounded provider-worker/control-host reconciliation changes, focused regressions, full validation, and normal review handoff.
- Constraints:
  - preserve active-run ownership semantics for healthy lanes
  - do not weaken delegation guard
  - keep any failure-side Linear mutation bounded to truthful workpad/update behavior

## Technical Requirements
- Functional requirements:
  - register canonical task ID `20260325-linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5` under `tasks/index.json` `items[]`, while keeping the existing on-disk doc/checklist filenames and docs freshness registry paths under `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
  - audit the failed `CO-16` manifest/proof pair and compare the current control-host/provider runtime against the local Symphony baseline
  - reconcile terminal failed provider-worker runs from authoritative run evidence so persisted intake no longer remains `running`
  - refresh or overwrite stale tracked-issue metadata during failure reconciliation so later reads do not keep stale `Ready` or equivalent outdated state
  - add a bounded failure-side Linear/workpad update path that records the real blocker when the worker ends terminally failed
  - ensure restart/rehydrate and refresh/poll paths both converge on the same truthful failure semantics
  - add focused regressions for manifest/proof failure reconciliation, rehydrate/refresh metadata updates, and operator-facing runtime state
- Non-functional requirements:
  - no new long-lived background service beyond the existing control-host lifecycle
  - no generic tracker-write expansion beyond the bounded failure-side truthfulness requirement
  - validation must cover the repo’s required floor and include review/elegance passes
- Interfaces / contracts:
  - `providerLinearWorkerRunner.ts` proof remains the worker-owned terminal evidence surface
  - `providerIssueHandoff.ts` remains the source of truth for persisted provider-intake claim transitions
  - control-host runtime/read-model surfaces must reflect the reconciled state after refresh or rehydrate
  - current Symphony `SPEC.md` remains the baseline for single-owner orchestration, retries, and truthful release/recovery behavior

## Architecture & Data
- Architecture / design adjustments:
  - extend provider-run discovery and/or reconciliation to consume terminal worker proof in addition to manifest status where that yields a more authoritative failure classification
  - trigger prompt failure reconciliation from the provider worker back into the control-host refresh/rehydrate path when terminal failure is known, reusing existing control-host communication seams if possible
  - update rehydrate/refresh claim transitions to carry refreshed issue metadata instead of preserving stale pre-failure values
  - add a bounded failure-side Linear workpad refresh path using the existing worker helper surface so operators see the blocker without raw artifact spelunking
- Data model changes / migrations:
  - no schema migration
  - persisted intake claims may transition from stale `running` to `resumable`, `handoff_failed`, `released`, or other truthful non-running states after terminal failure reconciliation
  - claim issue metadata may now refresh from live provider state or terminal evidence during rehydrate/refresh instead of staying frozen at the pre-failure snapshot
- External dependencies / integrations:
  - local control-host refresh/rehydrate lifecycle
  - Linear helper surface already available to provider workers
  - local Symphony baseline at `/Users/kbediako/Code/symphony`

## Current Truth
- The failed `CO-16` manifest ended `status: failed` with `status_detail: stage:provider-linear-worker:failed`.
- The matching `provider-linear-worker-proof.json` ended `owner_status: failed` with `end_reason: codex_exit_1`.
- The proof shows the worker already performed successful Linear operations before dying, which explains why operators saw an active workpad even though the lane had already failed.
- Current `providerIssueHandoff.ts` can classify resumable/completed runs during refresh/rehydrate, but those paths are not guaranteed to run immediately when the child worker exits terminally.
- Current rehydrate transitions do not proactively refresh stale issue metadata from live provider state when they rebuild a claim from run artifacts alone.
- Current control-host snapshot surfaces derive provider-intake summaries from persisted claim state, so stale persisted claims remain operator-visible until reconciliation runs.
- Current `providerLinearWorkerRunner.ts` writes failure proof but does not itself perform explicit terminal-failure reconciliation back into the control host.

## Validation Plan
- Tests / checks:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
  - focused `ProviderIssueHandoff` regressions for:
    - failed manifest/proof reconciliation removing stale `running`
    - rehydrate/refresh metadata updates after terminal failure
    - failure-side deterministic retry/recovery behavior
  - focused `ProviderLinearWorkerRunner` regressions for:
    - terminal failure proof plus control-host/workpad reconciliation callback behavior
    - failure-side Linear update truthfulness
  - focused `ControlRuntime` regressions for operator-visible provider-intake state after reconciliation
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` only if downstream-facing CLI/package/skill surfaces change
  - `docs/implementation-docs-archive-policy.json` archive path recorded through the automation workflow or `npm run docs:archive-implementation` fallback when the archive window is reached, including the resulting archive PR URL, commit hash, or fallback evidence in the closeout packet
- Rollout verification:
  - reproduce the failed-artifact interpretation in tests using the captured `CO-16` evidence shape
  - prove the control-host rehydrate/refresh paths no longer preserve stale `running` or stale `Ready` after terminal failure
  - refresh the active Linear workpad to match the current blocker and implementation status before review handoff
  - record implementation-doc archive completion evidence once the archive window is reached so the packet can be archived without manual reconstruction

## Open Questions
- Whether the smallest correct implementation is a direct child-to-control-host refresh callback, richer proof-aware run discovery, or both.

## Approvals
- Reviewer: `provider-worker` self-approved after `docs-review` for `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5`
- Date: 2026-03-24T23:32:36Z
- Evidence: `/Users/kbediako/Code/CO/.runs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5/cli/2026-03-24T23-27-44-639Z-c2876226/manifest.json`
