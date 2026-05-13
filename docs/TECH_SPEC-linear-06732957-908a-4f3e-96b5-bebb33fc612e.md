---
id: 20260331-linear-06732957-908a-4f3e-96b5-bebb33fc612e
title: CO Make validation tests hermetic to host config and temp-workspace guardrails
relates_to: docs/PRD-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md
risk: high
owners:
  - Codex
last_review: 2026-03-31
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`
- PRD: `docs/PRD-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`
- Task checklist: `tasks/tasks-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`

## Traceability
- Linear issue: `CO-54` / `06732957-908a-4f3e-96b5-bebb33fc612e`
- Linear URL: https://linear.app/asabeko/issue/CO-54/co-make-validation-tests-hermetic-to-host-config-and-temp-workspace

## Summary
- Objective: keep the two cited validation tests hermetic to temp-fixture and local-checkout state by adding an explicit hostile-env regression for `UserConfigStageSets` and making `cli-frontend-test` self-contained instead of package-fallback-dependent.
- Scope:
  - docs-first registration for `CO-54`
  - baseline audit of the live failing seam
  - narrow test/fixture updates for the two cited suites
  - focused validation proving local and CI-friendly determinism
- Constraints:
  - preserve truthful `frontend-test` CLI coverage instead of muting failures blindly
  - do not widen into unrelated provider-worker or packaged-pipeline contract work
  - avoid dependence on workstation `.runs/local-mcp` or repo-root `dist/`
- Current status:
  - implementation is complete and remains bounded to the two cited tests
  - the focused rerun plus the full required repo validation floor are green in this detached workspace
  - manifest-backed standalone review finished with `review_outcome: clean-success`, and an explicit manual elegance pass found no further simplification worth landing

## Technical Requirements
- Functional requirements:
  - `orchestrator/tests/UserConfigStageSets.test.ts` must remain temp-fixture-scoped when provider-style repo-config env points at a host snapshot
  - `tests/cli-frontend-test.spec.ts` must pass from a temp workspace without requiring repo-root package-build assets or host guardrail scripts
  - the focused Vitest lane for the two cited tests must pass in this checkout and under CI
- Non-functional requirements (performance, reliability, security):
  - keep the change small, deterministic, and auditable
  - make the temp-fixture contract explicit in test setup rather than depending on ambient shell state
  - avoid weakening real runtime/package behavior that production commands still need
- Interfaces / contracts:
  - `sanitizeProviderOverrideEnv`
  - repo-config resolution in `loadUserConfig`
  - `frontend-test` CLI temp-fixture harness
  - package-root command execution in staged pipeline commands

## Architecture & Data
- Architecture / design adjustments:
  - strengthen test-owned env setup rather than re-opening global env sanitization unless the narrower patch fails
  - keep the frontend CLI test on the real command entrypoint, but supply a local fixture config or equivalent stub so the test does not require package fallback
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - `orchestrator/tests/UserConfigStageSets.test.ts`
  - `tests/cli-frontend-test.spec.ts`
  - `orchestrator/src/cli/config/userConfig.ts`
  - `orchestrator/src/cli/utils/providerOverrideEnv.ts`

## Validation Plan
- Tests / checks:
  - audited child `docs-review` run before implementation
  - focused Vitest rerun for `orchestrator/tests/UserConfigStageSets.test.ts` and `tests/cli-frontend-test.spec.ts`
  - required repo validation floor after implementation
  - standalone review plus explicit elegance pass before review handoff
- Rollout verification:
  - confirm the stage-set test remains local-fixture-scoped under hostile provider-style env
  - confirm `frontend-test` temp-workspace coverage no longer depends on repo-root package fallback artifacts
- Monitoring / alerts:
  - record baseline and validation notes under `out/linear-06732957-908a-4f3e-96b5-bebb33fc612e/manual/`

## Open Questions
- If the temp-fixture path cannot remain truthful with a local fixture config, revisit whether a smaller shared helper should expose a test-safe frontend-testing stage runner path.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/manifest.json`; final standalone review telemetry is clean-success via `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/review/telemetry.json`; explicit elegance pass completed with no additional code changes required
- Date: 2026-03-31
