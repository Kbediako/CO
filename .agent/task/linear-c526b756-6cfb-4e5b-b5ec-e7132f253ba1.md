# Task Checklist Mirror - linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1

- Linear Issue: `CO-353` / `c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
- Canonical task checklist: `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- PRD: `docs/PRD-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- TECH_SPEC: `tasks/specs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Docs child-lane manifest: `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1-docs-packet/cli/2026-04-25T07-37-29-958Z-656ef03f/manifest.json`
- Standalone review telemetry: `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1/cli/2026-04-25T07-32-47-648Z-9b84420c/review/telemetry.json`

## Active-Lane Proof Checklist
- [x] Docs-first packet exists for PRD, TECH_SPEC, ACTION_PLAN, task checklist, freshness registry, and this `.agent/task` mirror. Evidence: docs child-lane manifest above plus the listed files.
- [x] `provider-linear-worker-proof.json` token parsing stores `reasoning_output_tokens` additively while preserving older missing-field behavior. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts` and `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Provider manifest persistence includes `provider_linear_worker_tokens.reasoning_output_tokens` when available. Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `orchestrator/src/cli/services/commandRunner.ts`, and `orchestrator/tests/CommandRunnerEnvPropagation.test.ts`.
- [x] `ControlTokenUsagePayload` and `codexTotals` expose reasoning-token usage separately from input/output/total counts. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, and `orchestrator/tests/ControlRuntime.test.ts`.
- [x] `CO STATUS` and packaged status UI render reasoning-token usage or explicit unavailable state. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `packages/orchestrator-status-ui/app.js`, `orchestrator/tests/ControlStatusDashboard.test.ts`, and `orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] Review findings are addressed before handoff. Evidence: standalone review telemetry above plus PR feedback follow-up commit on PR `#652`.
- [x] Validation stack completed before PR handoff. Evidence: canonical task checklist validation section records the full command set and outcomes.

## Notes
- This file is a mirror only. Keep status changes synchronized with `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md` and the PRD active-lane checklist.
