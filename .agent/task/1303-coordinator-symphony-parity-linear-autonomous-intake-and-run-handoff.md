# Task Checklist - 1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff

- MCP Task ID: `1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff`
- Primary PRD: `docs/PRD-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- TECH_SPEC: `tasks/specs/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`

## Docs-first

- [x] PRD drafted and aligned to the clarified user goal. Evidence: `docs/PRD-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- [x] TECH_SPEC drafted with the broader remaining parity requirements, not just a bare Linear trigger. Evidence: `tasks/specs/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- [x] ACTION_PLAN drafted for the autonomy planning lane. Evidence: `docs/ACTION_PLAN-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md`
- [x] Deliberation/findings captured for the lane. Evidence: `docs/findings/1303-symphony-parity-linear-autonomous-intake-and-run-handoff-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T034533Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T034533Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T034533Z-docs-first/04-docs-freshness.log`
- [x] docs-review approval or explicit override captured for registered `1303`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T034533Z-docs-first/05-docs-review-override.md`

## Downstream Runtime Work

- [x] Persistent intake/control host contract is finalized for autonomous provider-driven work pickup. Evidence: `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/00-summary.md`
- [x] Accepted Linear issue -> CO start/resume handoff contract is finalized with deterministic issue-to-run mapping. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerIntakeState.ts`, `orchestrator/src/cli/startCliShell.ts`, `orchestrator/src/cli/run/manifest.ts`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/00-summary.md`
- [x] Idempotent claim/replay and restart rehydration policy is finalized. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/05-test.log`
- [x] Telegram `/dispatch` and observability surfaces remain coherent after autonomy is introduced. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlTelegramReadController.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/05-test.log`

## Validation

- [x] `node scripts/delegation-guard.mjs` with explicit override for collab-only delegation evidence. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/03-build.log`
- [x] `npm run lint`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/04-lint.log`
- [x] `npm run test`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` with explicit override. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/08-diff-budget.log`
- [x] `npm run review` completed in non-interactive handoff mode against an explicit task manifest. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/09a-diagnostics-manifest.log`, `.runs/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/cli/2026-03-19T05-42-34-905Z-df9fe436/manifest.json`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/10-pack-smoke.log`
- [x] Explicit closeout summary, elegance pass, and override notes captured. Evidence: `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/00-summary.md`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/12-elegance-review.md`, `out/1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff/manual/20260319T050348Z-implementation/13-override-notes.md`
