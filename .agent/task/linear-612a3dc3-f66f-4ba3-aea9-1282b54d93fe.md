# Task Checklist - linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe

- Linear Issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- MCP Task ID: `linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Primary PRD: `docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- TECH_SPEC: `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `.agent` mirror: `.agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- Shared source 0 anchor: `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001`
- Source object id: `sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560`
- Docs packet child-lane manifest: `.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-docs-packet/cli/2026-04-25T17-57-28-787Z-d2c4e692/manifest.json`

## Docs-First
- [x] PRD drafted for `co-status --format json` authenticated dataset bounds. Evidence: `docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, readiness gate, and parent-owned validation requirements. Evidence: `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`, `.agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`.
- [x] TECH_SPEC registered in canonical `tasks/index.json` `items[]`. Evidence: `tasks/index.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`.

## Source / Assumptions
- [x] Shared source-0 metadata anchor recorded. Evidence: `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001`.
- [x] Child lane preserved the parent-provided source-0 payload reference and verified the effective issue body came from the handoff prompt. Evidence: `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/memory/source-0/source.txt`.
- [x] Child lane preserved the issue intent from the handoff text. Evidence: this checklist, the PRD, and the TECH_SPEC.
- [x] Parent/child ownership split recorded. Evidence: this checklist and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [ ] `codex-orchestrator co-status --format json` completes against authenticated `/ui/data.json` while provider workers are active. Evidence: source-level hot-path benchmark passes; live globally supervised after evidence is pending package rollout because the installed LaunchAgent still runs the global package.
- [x] Status dataset generation is bounded for audit/operator history, especially `provider_workflow.operator_autopilot.last_result`, without only increasing attach timeouts. Evidence: `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`.
- [x] Provider workers and operator autopilot remain enabled for the representative validation. Evidence: baseline supervisor/audit evidence in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`; no validation path disables provider workers or operator autopilot.
- [x] Current status remains operator-useful: counts, running/retrying/issues rows, provider workflow status, current operator autopilot summary, pending actions, and truncation/summary metadata are present as applicable. Evidence: new `status_dataset_bounds` metadata and focused store/projection tests.
- [x] Before/after timings are recorded for the same representative `co-status --format json` target. Evidence: baseline timeout plus synthetic hot-path comparison in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`.
- [x] Before/after response sizes are recorded for the same representative status payload. Evidence: synthetic hot-path comparison in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md` (`35844828` bytes old-like vs `1531180` bytes bounded after preserving current pending actions and truncating rollout stdout/stderr).
- [x] Before/current supervisor status and restart-count behavior are recorded. Evidence: baseline `status=unhealthy`, `restart_count=1868`; current installed-host check `status=quarantined`, `restart_count=1886`, `last_health_status=active_worker_probe_timeout_quarantine`; source-level after evidence remains bounded pending package rollout.
- [x] LaunchAgent entrypoint posture is recorded, or a migration path is documented if the installed LaunchAgent is stale. Evidence: managed global supervision, CLI entrypoint `/opt/homebrew/lib/node_modules/@kbediako/codex-orchestrator/bin/codex-orchestrator.js`, working directory `/Users/kbediako/Code/CO`, `migration_required: false`.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8'))"` exits `0`.
- [x] Docs child lane protected-term grep over the packet and mirrors. Evidence: fixed-string `rg` over protected terms across the six declared files exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/tasks-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md .agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md tasks/index.json` exits `0`.
- [x] Parent focused UI data / co-status / observability read-model tests pass. Evidence: `npx vitest run orchestrator/tests/ProviderWorkflowConfigStore.test.ts orchestrator/tests/ObservabilityReadModel.test.ts orchestrator/tests/CoStatusCliShell.test.ts` passes 29 tests.
- [x] Parent before/after timing and response-size evidence captured. Evidence: `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`.
- [x] Parent supervisor status, restart count, and LaunchAgent posture evidence captured. Evidence: baseline and current installed-host supervisor/LaunchAgent posture in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`; live source fix after evidence remains pending installed package rollout.
- [x] Parent standalone review and elegance evidence captured before PR handoff. Evidence: review telemetry `../../.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/cli/2026-04-25T17-55-01-786Z-8e218e11/review/telemetry.json` reports `status=succeeded` and `review_outcome=bounded-success`; elegance pass recorded in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`.

## Handoff Status
- [x] Child lane leaves packet and registry/checklist changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent accepts the patch artifact and proceeds with implementation. Evidence: accepted child-lane manifest `.runs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-docs-packet/cli/2026-04-25T17-57-28-787Z-d2c4e692/manifest.json`.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending parent lane.

## Progress Log
- 2026-04-26: Created the scoped docs-first packet from the CO-376 handoff intent and metadata-only source anchor.
- 2026-04-26: Preserved the exact protected terms around `co-status --format json`, authenticated `/ui/data.json`, unbounded audit/operator history, active provider workers, attach timeout non-goals, before/after timing and response-size evidence, supervisor restart behavior, and LaunchAgent entrypoint posture.
- 2026-04-26: Completed the requested scoped checks: JSON parse, protected-term grep, and `git diff --check`.
- 2026-04-26: Corrected docs packet source traceability to the parent-provided `ctx:sha256:2ad2a0ba5ecbafe9bb0b7cb2875952678949f28fbb367b10bee33ce33466e560#chunk:c000001` source anchor.
- 2026-04-26: Implemented bounded operator-autopilot status dataset cloning with `status_dataset_bounds` metadata and focused regression coverage.
- 2026-04-26: Captured baseline timeout/supervisor evidence and synthetic old-vs-bounded hot-path timing/size evidence in `out/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe/manual/validation.md`.
- 2026-04-26: Filed CO-378 for unrelated `docs:check`/`docs:freshness` baseline drift discovered before the `origin/main` merge.
- 2026-04-26: Merged latest `origin/main`; completed final standalone review (`bounded-success`), elegance pass, full build/lint/test/docs/repo validation, and pack smoke. Post-merge `docs:check` and `docs:freshness` pass after registering the CO-376 docs packet.

## Relevant Files
- `docs/PRD-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `tasks/specs/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe-co-status-authenticated-dataset-bounds.md`
- `docs/ACTION_PLAN-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `tasks/tasks-linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `.agent/task/linear-612a3dc3-f66f-4ba3-aea9-1282b54d93fe.md`
- `tasks/index.json`

## Notes
- Do not collapse the issue into a timeout-only change.
- Do not require disabled provider workers or disabled operator autopilot for validation.
- Do not drop current provider workflow status to reduce payload size without explicit truncation/summary evidence.
- Do not skip LaunchAgent entrypoint posture or migration-path evidence.
