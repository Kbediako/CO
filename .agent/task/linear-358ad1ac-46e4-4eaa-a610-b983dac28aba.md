# Agent Task Mirror - linear-358ad1ac-46e4-4eaa-a610-b983dac28aba

- Linear Issue: `CO-389`
- Task ID: `linear-358ad1ac-46e4-4eaa-a610-b983dac28aba`
- PRD: `docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- TECH_SPEC: `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- Checklist: `tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`

## Current Scope

Promote the resident app-server JSONL seam to the authoritative provider-worker control plane when the runtime provider selects `appserver`. Keep `codex exec` / `codex exec resume` explicitly labeled as break-glass or legacy CLI fallback.

## Evidence

- Docs packet source anchor: `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`
- Accepted child lane manifest: `.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba-docs-contract-packet/cli/2026-04-26T03-50-46-564Z-0436834d/manifest.json`
- Parent implementation surfaces: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Non-Goals

- No BEAM rewrite.
- No distributed scheduling or SSH worker pool.
- No unsafe mid-turn hot reload claim.
- Do not widen remote shell/watch authority by default.
