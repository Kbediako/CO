---
id: 20260330-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3
title: CO Prevent provider-worker env override leakage into repo validation
relates_to: docs/PRD-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`
- PRD: `docs/PRD-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`
- Task checklist: `tasks/tasks-linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3.md`

## Traceability
- Linear issue: `CO-42` / `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- Linear URL: https://linear.app/asabeko/issue/CO-42/co-prevent-provider-worker-env-override-leakage-into-repo-validation

## Summary
- Objective: keep provider-worker repo-config/package-root overrides lane-local so repo validation and isolated tests stay deterministic in worker shells.
- Scope:
  - docs-first registration for `CO-42`
  - baseline audit of the current env propagation seams
  - narrow env sanitization changes for provider child streams and repo-local validation/test entrypoints
  - focused regressions for the `CO-40` false-failure class
  - workflow note updates documenting the chosen propagation boundary
- Constraints:
  - preserve the existing provider-worker launch contract when the worker genuinely needs the provider workflow snapshot
  - keep the fix narrow; do not reopen unrelated runtime-mode or merge-handoff work
  - use explicit env propagation/scrub rules instead of relying on manual shell cleanup

## Technical Requirements
- Functional requirements:
  - provider-worker-owned `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` and `CODEX_ORCHESTRATOR_PACKAGE_ROOT` overrides must not leak by default into repo-local validation or test subprocesses that are expected to use workspace-local config
  - provider child review/docs lanes must keep only the env they intentionally need; provider-only repo config/package-root overrides should be stripped unless the child lane explicitly requires them
  - `loadUserConfig`-based isolated test seams must remain able to exercise override behavior intentionally, but default temp-workspace tests must not accidentally inherit provider-worker overrides from the parent shell
  - `orchestrator/tests/UserConfigStageSets.test.ts` and `tests/cli-frontend-test.spec.ts` must pass in a provider-worker shell without manual `env -u ...` cleanup
  - the implementation must document the sanitization boundary in the relevant provider-worker / validation workflow notes
- Non-functional requirements (performance, reliability, security):
  - fail closed to deterministic repo-local config loading for validation/test subprocesses
  - avoid breaking legitimate provider-worker snapshot/config lookup when the worker lane explicitly owns that behavior
  - keep the propagation rule explicit and testable
- Interfaces / contracts:
  - provider launch env construction in `orchestrator/src/cli/controlHostCliShell.ts`
  - repo config loading in `orchestrator/src/cli/config/userConfig.ts`
  - child-stream env sanitation in `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - any shared validation/test env helper introduced or extended by this lane
  - focused coverage in `orchestrator/tests/UserConfigStageSets.test.ts` and `tests/cli-frontend-test.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - keep provider launch overrides explicit at the worker boundary, but scrub them at the narrower repo-validation/test boundary instead of treating them as globally ambient repo defaults
  - extend the existing provider child-stream env sanitization set to include repo-config/package-root overrides if the child lanes do not need them
  - align isolated test env construction with the same boundary so temp-workspace tests prove deterministic local config loading even in provider-worker shells
  - document the explicit allowlist/denylist decision so future worker lanes know which env is intentionally propagated
- Data model changes / migrations:
  - none; this is an env propagation/sanitization correction using existing variables and workflow docs
- External dependencies / integrations:
  - `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH`
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - provider worker docs/workflow guidance
  - repo validation/test commands for `CO-40` and this follow-up lane

## Validation Plan
- Tests / checks:
  - rerun docs-review after the `CO-42` packet exists and record the manifest
  - reproduce the current false-failure shape under provider-worker env and then rerun the two cited tests after the fix
  - run the required repo validation floor for the final diff scope
  - run standalone review plus elegance review before any review handoff
- Rollout verification:
  - confirm isolated temp-workspace tests resolve their local `codex.orchestrator.json`
  - confirm provider child streams and/or validation entrypoints no longer inherit the repo-config/package-root overrides by default
  - refresh the Linear workpad after docs, after implementation, and before any review handoff
- Monitoring / alerts:
  - keep manual notes and validation artifacts under `out/linear-aadbe46e-9e5a-4810-b9fb-52afe70d73a3/manual/`
  - document the final boundary in the provider-worker / validation notes so future operators do not reintroduce ambient leakage

## Open Questions
- Whether the narrowest safe implementation is a shared “provider-worker override scrub” helper reused by child streams and tests, or a smaller targeted patch in the existing validation/test env builders.

## Approvals
- Reviewer: Codex manual fallback after manifest-backed standalone review + child docs-review both launched under `FORCE_CODEX_REVIEW=1` and then stalled without a concrete verdict; no blocking issues found in the changed code/docs.
- Date: 2026-03-30
