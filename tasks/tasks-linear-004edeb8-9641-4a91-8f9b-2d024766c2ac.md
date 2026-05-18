# Task Checklist - linear-004edeb8-9641-4a91-8f9b-2d024766c2ac

- Linear Issue: `CO-208` / `004edeb8-9641-4a91-8f9b-2d024766c2ac`
- MCP Task ID: `linear-004edeb8-9641-4a91-8f9b-2d024766c2ac`
- Primary PRD: `docs/PRD-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- TECH_SPEC: `tasks/specs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`
- Source anchor: `ctx:sha256:7f405408c0778e5b1c89f4493b0bf5fd26674e9b2ceb9a6afaa5c552630b085a#chunk:c000001`

## Docs-First
- [x] PRD drafted for cloud connector/auth drift classification exposed by `CO-207`. Evidence: `docs/PRD-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`.
- [x] TECH_SPEC drafted with protected terms, diagnostic contract, redaction rules, parity matrix, and parent-owned validation requirements. Evidence: `tasks/specs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`.
- [x] Registry and mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.agent/task/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md` readiness gate.
- [x] Parent-owned spec guard completed for the implementation packet. Evidence: `MCP_RUNNER_TASK_ID=linear-004edeb8-9641-4a91-8f9b-2d024766c2ac node scripts/spec-guard.mjs --dry-run` exits `0`.

## Analysis Evidence Required Before Implementation
- [x] Confirm the smallest classifier/normalization ownership seam across `scripts/cloud-canary-ci.mjs`, cloud failure diagnostics, and provider-worker proof. Evidence: `scripts/cloud-canary-ci.mjs`, `orchestrator/src/cli/adapters/cloudFailureDiagnostics.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Capture or synthesize a sanitized fixture for `missing_github_connector_link` with `GitHub connection not found for user`. Evidence: `tests/cloud-canary-ci-classification.spec.ts`, `orchestrator/tests/CloudFailureDiagnostics.test.ts`, `orchestrator/tests/CloudModeAdapters.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Confirm missing `CODEX_CLOUD_ENV_ID` remains distinct from missing connector-link drift. Evidence: `tests/cloud-canary-ci-classification.spec.ts` and `orchestrator/tests/CloudModeAdapters.test.ts`.
- [x] Confirm no live GitHub connector repair, OAuth/token refresh, or connector secret access is required for implementation. Evidence: deterministic fixture-only tests and source classifier updates only.

## Implementation Acceptance
- [x] `missing_github_connector_link` maps to stable machine-readable `cloud_connector_auth_drift` diagnostic classification. Evidence: focused tests plus full `npm run test`.
- [x] `GitHub connection not found for user` is preserved as safe diagnostic signal without unsafe identifiers. Evidence: focused fixture tests.
- [x] Missing `CODEX_CLOUD_ENV_ID` remains a separate environment configuration class. Evidence: `tests/cloud-canary-ci-classification.spec.ts` and `orchestrator/tests/CloudModeAdapters.test.ts`.
- [x] `CODEX_CLOUD_ENV_ID` alone does not report cloud readiness. Evidence: CO-207-shaped fixture keeps `task_id` absent and classifies connector/auth drift.
- [x] Cloud denial, quota/auth/rate-limit, and provider/runtime failures remain distinguishable. Evidence: existing diagnostic regression tests plus added connector drift cases.
- [x] `scripts/cloud-canary-ci.mjs`, cloud failure diagnostics, and provider-worker proof all expose the diagnostic value in parent-selected machine-readable fields. Evidence: changed source files and focused tests.
- [x] cloud-canary gates remain fail-closed when connector/auth drift blocks required cloud execution. Evidence: `scripts/cloud-canary-ci.mjs` formats `credentials (cloud_connector_auth_drift)` in failure output and assertion failures.
- [x] Redaction tests or snapshots reject tokens, cookies, emails, org ids, connector secrets, raw account ids, and raw upstream auth payloads. Evidence: provider-worker proof fixture uses safe connector drift strings only and existing redaction regressions remain green.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane protected-term check. Evidence: `rg -n "missing_github_connector_link|GitHub connection not found for user|CODEX_CLOUD_ENV_ID|cloud-canary gates|provider-worker proof" docs/PRD-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md docs/TECH_SPEC-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md docs/ACTION_PLAN-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md tasks/specs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md tasks/tasks-linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md .agent/task/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac.md` finds all protected terms.
- [x] Parent focused diagnostic/classifier tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CloudFailureDiagnostics.test.ts orchestrator/tests/CloudModeAdapters.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts tests/cloud-canary-ci-classification.spec.ts` passes.
- [x] Parent provider-worker proof redaction/projection test. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: command exits `0`.
- [x] Parent manifest-backed standalone review completed with bounded-success telemetry. Evidence: `.runs/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac/cli/2026-04-16T22-46-55-172Z-da02c01d/review/telemetry.json`.
- [x] Parent explicit elegance/minimality pass completed. Evidence: `out/linear-004edeb8-9641-4a91-8f9b-2d024766c2ac/manual/elegance-review.md`.

## Progress Log
- 2026-04-17: Same-issue docs child lane created the docs-first packet and preserved the `CO-208` scope as diagnostics/reporting for cloud connector/auth drift exposed by `CO-207`, not live connector repair.
- 2026-04-17: Parent implementation added `cloud_connector_auth_drift` across cloud-canary classification, shared cloud failure diagnostics, and provider-worker proof, then passed focused regressions, build, lint, and full `npm run test`.
- 2026-04-17: Parent standalone review completed as `bounded-success` with no actionable findings; parent elegance pass retained the additive classifier/test/docs packet without broad taxonomy or runtime refactors.
