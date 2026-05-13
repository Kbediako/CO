---
id: 20260330-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3
title: CO Prevent provider-worker env override leakage into repo validation
status: done
owner: Codex
created: 2026-03-30
last_review: 2026-04-30
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md
related_action_plan: docs/ACTION_PLAN-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md
related_tasks:
  - tasks/tasks-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md
review_notes:
  - 2026-04-30: CO-428 live Linear audit confirmed CO-42 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-30` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-30: Opened from Linear issue `CO-42` in the provider-worker workspace using issue id `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`.
  - 2026-03-30: The packaged `linear issue-context` read succeeded before any transition; the live CO workflow states expose `In Progress`, `In Review`, `Merging`, and `Rework`, and the issue was moved from `Ready` to `In Progress`.
  - 2026-03-30: The single active `## Codex Workpad` comment was created after the state transition, and the detached workspace was resynced onto branch `linear/co-42-provider-env-isolation` from `origin/main`.
  - 2026-03-30: Code inspection narrowed the leak seam to provider-owned env propagation rather than general runtime drift: `buildProviderLaunchSpec` exports `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH`, `commandRunner` exports `CODEX_ORCHESTRATOR_PACKAGE_ROOT`, `providerLinearChildStreamShell` already strips many provider/runtime env keys but not these overrides, and `loadUserConfig` plus isolated CLI tests currently trust the ambient env.
  - 2026-03-30: The failure class from `CO-40` is explicit and bounded: temp-workspace tests intended to load local `codex.orchestrator.json` instead inherit the shared provider snapshot and its guardrail stages from the parent provider-worker shell.
  - 2026-03-30: Pre-implementation approval: proceed with the smallest env-sanitization change that restores deterministic repo-local validation without weakening the provider-worker lane's own snapshot contract.
  - 2026-03-30: Implementation landed as a centralized provider-override sanitizer plus explicit ownership markers from `controlHostCliShell`; `doctor`, the real `frontend-test` CLI request shell, and provider child streams now strip only provider-owned repo-config/package-root overrides by default.
  - 2026-03-30: Focused regressions passed for `Doctor`, `FrontendTestCliRequestShell`, `cli-frontend-test`, `ProviderLinearChildStreamShell`, and `UserConfigStageSets`; the final provider-worker shell rerun of `npm run test` passed with `300` files / `2638` tests under ambient provider overrides.
  - 2026-03-30: Follow-up issue `CO-48` tracks the separate `linear child-stream --format json` output parsing bug so this lane stays scoped to provider env isolation.
  - 2026-03-30: Manifest-backed standalone review and child docs-review both launched under `FORCE_CODEX_REVIEW=1`, but the Codex review subprocess remained in bounded diff inspection for more than four minutes without a concrete verdict. Fallback manual review of the changed code/docs found no blocking issues; residual risk is limited to older mixed-version provider-worker shells that would still rely on the fallback ownership heuristic until refreshed by a control-host spawn that stamps explicit markers.
---

# Technical Specification

## Context

Provider-worker runs intentionally carry extra environment to bind the workspace back to control-host state. That is correct for the worker lane itself. The problem starts when repo-local validation or isolated temp-workspace tests inherit that environment as if it were a generic repo default. During `CO-40`, the inherited `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` pointed at the shared provider workflow snapshot and caused repo-local tests to exercise the wrong configuration source. The inherited `CODEX_ORCHESTRATOR_PACKAGE_ROOT` also made downstream helper resolution less workspace-local than intended.

## Requirements

1. Keep provider-worker-owned repo-config/package-root overrides available where the provider worker explicitly needs them.
2. Strip those overrides by default from repo-local validation and test subprocesses that are supposed to use workspace-local config resolution.
3. Extend the existing provider child-stream sanitization boundary if needed so child review/docs lanes do not inherit the provider-only overrides accidentally.
4. Ensure isolated tests that create temporary repo roots remain deterministic in a provider-worker shell.
5. Add focused coverage for the two cited false-failure seams:
   - `orchestrator/tests/UserConfigStageSets.test.ts`
   - `tests/cli-frontend-test.spec.ts`
6. Document the chosen propagation/sanitization rule in the relevant provider-worker or validation workflow notes.

## Current Truth

- `orchestrator/src/cli/controlHostCliShell.ts` injects `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` into the provider-worker launch spec so the worker can reuse the control-host-owned provider workflow snapshot.
- `orchestrator/src/cli/services/commandRunner.ts` injects `CODEX_ORCHESTRATOR_PACKAGE_ROOT` into command-stage env.
- `orchestrator/src/cli/providerLinearChildStreamShell.ts` already removes several provider/runtime env keys from child streams, but not the repo-config/package-root overrides from this issue.
- `orchestrator/src/cli/config/userConfig.ts` resolves repo config from the ambient `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` override whenever it is present.
- `tests/cli-frontend-test.spec.ts` already strips runtime-mode env for in-suite determinism, but not the provider-worker override env targeted here.

## Validation Plan

- Run child `docs-review` after the packet exists and record the manifest.
- Reproduce the false-failure class under provider-worker env, then rerun:
  - `orchestrator/tests/UserConfigStageSets.test.ts`
  - `tests/cli-frontend-test.spec.ts`
- Run the required validation floor for the final diff.
- Record standalone review and explicit elegance review before any review handoff.

## Manifest Evidence

- Linear issue context and workflow state read: packaged `linear issue-context --issue-id aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- Relevant launch seam: `orchestrator/src/cli/controlHostCliShell.ts`
- Relevant child-stream seam: `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- Relevant config seam: `orchestrator/src/cli/config/userConfig.ts`
- Child docs-review evidence: `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3-co-42-docs-review-final-4/cli/2026-03-30T08-47-15-708Z-b66bf956/manifest.json`
- Provider-worker review evidence: `.runs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3/cli/2026-03-30T06-41-27-338Z-fd46f029/manifest.json`
