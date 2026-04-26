# Task Checklist - linear-358ad1ac-46e4-4eaa-a610-b983dac28aba

- Linear Issue: `CO-389` / `358ad1ac-46e4-4eaa-a610-b983dac28aba`
- MCP Task ID: `linear-358ad1ac-46e4-4eaa-a610-b983dac28aba`
- Canonical task id: `20260426-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba`
- Primary PRD: `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- TECH_SPEC: `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- Source anchor: `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`

## Docs-First

- [x] PRD drafted with user-request translation, protected wording, parity matrix, acceptance criteria, non-goals, and Not Done If. Evidence: `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] TECH_SPEC drafted with the issue-shaping contract, implementation surface, validation plan, and migration canary requirements. Evidence: `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] Task checklist drafted within child-lane scope. Evidence: `tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] Canonical task index registration updated within child-lane scope. Evidence: `tasks/index.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC and ACTION_PLAN. Evidence: `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] Parent handles wider docs mirrors outside this child lane's declared file scope. Evidence: `AGENTS.md`, `docs/guides/codex-version-policy.md`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.agent/task/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.

## Source / Assumptions

- [x] Shared source anchor recorded. Evidence: `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`.
- [x] Parent verified the shared source payload after accepting the docs child lane. Evidence: `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/memory/source-0/source.txt`, `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`, `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`.
- [x] Protected terms preserved: `resident app-server seam`, `authoritative provider-worker control plane`, `provider-worker control paths`, `control-host read models`, `runtime proof`, `codex exec`, `codex exec resume`, `drain`, `restart`, `resume`, `state/read-model continuity`, `manifests`, `CO STATUS/control-host`, `workpad evidence`, and `migration canaries`.
- [x] Parent/child ownership split recorded. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and this checklist.

## Parent Implementation Acceptance

- [x] Resident app-server seam is the normal authoritative provider-worker control plane. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, focused regression `uses app-server JSONL as the authoritative provider-worker control plane when appserver runtime is selected`.
- [x] Provider-worker control paths for start/admit, drain, restart, resume, and status/state reads share the resident authority. Evidence: app-server `thread/start`, `thread/resume`, `turn/start`, and `turn/completed` runner in `orchestrator/src/cli/providerLinearWorkerRunner.ts`; focused regressions for app-server start/drain, resume, and seeded restart continuity.
- [x] `codex exec` / `codex exec resume` remain labeled break-glass or legacy fallback only. Evidence: `worker_control.authority=legacy_cli_break_glass` regression in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] control-host read models and CO STATUS derive provider-worker truth from the same authority as control actions. Evidence: `provider_linear_worker_proof.worker_control` is persisted by `orchestrator/src/cli/providerLinearWorkerRunner.ts` and surfaced in `orchestrator/src/cli/control/operatorDashboardPresenter.ts`.
- [x] Manifests, provider-worker proof artifacts, CO STATUS/control-host, and workpad evidence record the same provider-worker authority and fallback provenance. Evidence: manifest/proof `worker_control` regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`; workpad closeout pending final refresh.
- [x] Migration canaries prove drain, restart, resume, state/read-model continuity, failure semantics, and rollback behavior. Evidence: focused app-server drain/resume/restart/fail-closed/fallback regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] No BEAM rewrite, distributed scheduling, SSH worker pool, unsafe mid-turn hot reload claim, or default remote shell/watch authority expansion entered the implementation. Evidence: implementation limited to provider-worker runtime control, proof/manifest/read-model surfacing, docs, and tests.

## Validation

- [x] Child-lane `jq empty tasks/index.json`. Evidence: command exited `0` on 2026-04-26.
- [x] Child-lane protected-term grep. Evidence: `rg -n "resident app-server seam|authoritative provider-worker control plane|provider-worker control paths|control-host read models|runtime proof|codex exec|codex exec resume|drain|restart|resume|state/read-model continuity|manifests|CO STATUS/control-host|workpad evidence|migration canaries|BEAM rewrite|distributed scheduling|SSH worker pool|unsafe mid-turn hot reload|remote shell/watch authority" docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md` exited `0`.
- [x] Child-lane whitespace check. Evidence: `git diff --check -- tasks/index.json` exited `0`; scoped trailing-whitespace scan over the five new packet files plus `tasks/index.json` exited `0`.
- [ ] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: pending parent lane.
- [ ] Parent docs-review evidence captured before implementation. Evidence: pending parent manifest.
- [x] Parent focused provider-worker authority and runtime-proof regressions. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ControlStatusDashboard.test.ts orchestrator/tests/SelectedRunPresenter.test.ts` passed on 2026-04-26.
- [x] Parent control-host read-model and CO STATUS authority-provenance regressions. Evidence: `npx vitest run orchestrator/tests/ControlStatusDashboard.test.ts orchestrator/tests/SelectedRunPresenter.test.ts` passed on 2026-04-26.
- [x] Parent migration canaries for drain, restart, resume, failure semantics, and rollback. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts` passed on 2026-04-26.

## Handoff Status

- [x] Child lane leaves packet and registry changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent accepts this child-lane patch into the authoritative issue workspace. Evidence: `codex-orchestrator linear child-lane --action accept --stream docs-contract-packet`.
- [ ] Parent updates Linear workpad with current docs/implementation/validation status. Evidence: pending final parent refresh.
- [ ] Parent opens/updates PR and completes review/check drain. Evidence: pending parent lane.

## Relevant Files

- `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- `docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- `tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- `tasks/index.json`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `AGENTS.md`
- `docs/guides/codex-version-policy.md`

## Notes

- Do not treat `codex exec` / `codex exec resume` as normal provider-worker control authority after this migration.
- Do not claim unsafe mid-turn hot reload.
- Do not widen remote shell/watch authority by default.
- Do not broaden into BEAM, distributed scheduling, SSH worker pools, unrelated queue selection, or unrelated workpad lifecycle changes.
