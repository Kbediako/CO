# PRD - CO: Prevent provider-worker env override leakage into repo validation

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-42` / `aadbe46e-9e5a-4810-b9fb-52afe70d73a3`
- Linear URL: https://linear.app/asabeko/issue/CO-42/co-prevent-provider-worker-env-override-leakage-into-repo-validation
- Related source issue: `CO-40`

## Summary
- Problem Statement: provider-worker runs intentionally export repo-config and package-root overrides so the worker can reuse the control-host-owned provider workflow snapshot, but those overrides currently bleed into repo-local validation and isolated test entrypoints. In `CO-40`, that made healthy validation look broken because temp-workspace tests loaded the shared provider snapshot instead of their test-local `codex.orchestrator.json`.
- Desired Outcome: provider-worker-only overrides stay available where the worker lane needs them, while repo-local validation and test subprocesses default back to workspace-local config resolution without requiring manual `env -u` cleanup.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-42` in the current provider-worker workspace by making provider-owned env overrides lane-local, keeping the fix narrow, and leaving repo-tracked docs, focused tests, and validation evidence that the false failures from `CO-40` are gone.
- Success criteria / acceptance:
  - provider-worker-owned repo config and package-root overrides no longer leak into repo-local validation or test subprocesses by default
  - `orchestrator/tests/UserConfigStageSets.test.ts` and `tests/cli-frontend-test.spec.ts` pass in a provider-worker shell without manual env scrubbing when the underlying implementation is healthy
  - the chosen sanitization boundary is documented so future worker lanes know which env is intentionally propagated and which is deliberately stripped
- Constraints / non-goals:
  - do not weaken the provider-worker launch contract itself when the worker genuinely needs the snapshot/config override
  - do not widen into unrelated control-host ownership, merge handoff, or review-policy changes
  - do not rely on manual shell cleanup as the long-term fix
  - keep the patch as small and auditable as possible

## Goals
- Identify the smallest boundary where provider-worker-only env can be stripped before repo-local validation/test behavior becomes nondeterministic.
- Preserve truthful provider-worker execution while restoring deterministic repo-local config loading in workspaces and temporary test roots.
- Add focused coverage for the exact false-failure class seen during `CO-40`.
- Document the propagation boundary in the provider-worker / validation workflow notes.

## Non-Goals
- Rewriting the full environment-path model for all pipelines.
- Changing unrelated runtime-mode sanitization or provider workflow state behavior.
- Broadly refactoring all CLI/test env construction when a narrower shared helper or lane boundary will suffice.

## Stakeholders
- Product: CO operators and reviewers relying on truthful provider-worker validation signals
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - provider-worker shell validation no longer produces the `CO-40` false red buckets caused by ambient `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` / `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - isolated tests using temporary repo roots load their own local `codex.orchestrator.json` instead of the shared provider snapshot
  - child review/docs lanes keep only the env they intentionally need
- Guardrails / Error Budgets:
  - preserve provider-worker access to the control-host-owned snapshot where that contract is intentional
  - avoid silently stripping unrelated env that current provider lanes depend on
  - keep docs, tests, and implementation aligned on the same sanitization rule

## User Experience
- Personas: provider-worker owner, repo maintainer running validation in a worker shell, reviewer reading follow-up docs
- User Journeys:
  - a provider-worker lane runs in its workspace with the required control-host snapshot override, but repo-local validation commands inside that lane stay deterministic
  - isolated tests that create temporary repo roots still exercise their own local config rather than inheriting provider snapshot state from the parent shell
  - future workers can read the docs and know exactly which env is expected to propagate into provider-owned commands versus repo-local validation/test subprocesses

## Technical Considerations
- Architectural Notes:
  - control-host/provider launch currently injects `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH` through `buildProviderLaunchSpec` in `orchestrator/src/cli/controlHostCliShell.ts`
  - `loadUserConfig` in `orchestrator/src/cli/config/userConfig.ts` trusts ambient `CODEX_ORCHESTRATOR_REPO_CONFIG_PATH`
  - provider child streams already strip several provider/runtime env keys in `orchestrator/src/cli/providerLinearChildStreamShell.ts`, but not the repo-config/package-root overrides from this issue
  - repo validation tests currently sanitize runtime-mode env in some places, but not the provider-specific overrides targeted here
- Dependencies / Integrations:
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/config/userConfig.ts`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/tests/UserConfigStageSets.test.ts`
  - `tests/cli-frontend-test.spec.ts`

## Open Questions
- Should `CODEX_ORCHESTRATOR_PACKAGE_ROOT` be scrubbed only for validation/test subprocesses, or should provider child streams strip it as well and use explicit invocation routing instead?
- Is the narrowest stable rule “provider-worker-only env is scrubbed at repo-validation/test boundaries,” or is there a smaller existing helper that should own the sanitization?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review and implementation validation
- Design: N/A
