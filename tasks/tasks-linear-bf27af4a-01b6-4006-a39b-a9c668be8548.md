# Task Checklist - CO-354 multi_agent_v2 thread-limit safe defaults

- MCP Task ID: `linear-bf27af4a-01b6-4006-a39b-a9c668be8548`
- Linear issue: `CO-354` / `bf27af4a-01b6-4006-a39b-a9c668be8548`
- Primary PRD: `docs/PRD-linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`
- TECH_SPEC: `tasks/specs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`
- Summary of scope: make CO doctor/default setup safe for `multi_agent_v2` thread-limit rules while preserving stable `multi_agent` behavior.

> Set `MCP_RUNNER_TASK_ID=linear-bf27af4a-01b6-4006-a39b-a9c668be8548` for orchestrator commands. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Issue context inspected and state moved to `In Progress`. - Evidence: Linear helper transition on 2026-04-25.
- [x] Workpad created with required decomposition matrix and validation plan. - Evidence: Linear workpad `ca006874-5c89-4ff8-96b1-2d298e93c1d4`.
- [x] Parallelization decision recorded and docs child lane launched. - Evidence: `parallelize_now` / `independent_scope_available`, stream `docs-thread-limit-guidance`.
- [x] Docs-first packet registered. - Evidence: `docs/PRD-linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`, `tasks/specs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`, `docs/TECH_SPEC-linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`, `docs/ACTION_PLAN-linear-bf27af4a-01b6-4006-a39b-a9c668be8548.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Docs-review completed before implementation. - Evidence: `.runs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548-docs-review/cli/2026-04-25T09-12-10-549Z-2d2b081b/manifest.json` reached terminal failed status on pre-existing CO-276 missing packet paths; follow-up CO-370 filed.

### Implementation
- [x] Default setup omits `agents.max_threads` when `multi_agent_v2` is enabled. - Evidence: `orchestrator/src/cli/codexDefaultsSetup.ts` and targeted tests.
- [x] Doctor reports max_threads as compatible-safe/skipped under enabled `multi_agent_v2`. - Evidence: `orchestrator/src/cli/doctor.ts` and targeted tests.
- [x] Repo init omits `agents.max_threads` from copied config when active feature/config state is `multi_agent_v2=true`. - Evidence: `orchestrator/src/cli/init.ts` and `InitTemplates` tests.
- [x] Shared Codex feature-list state prevents defaults and init from seeding `max_threads` when v2 is enabled outside config. - Evidence: `orchestrator/src/cli/utils/codexFeatures.ts` and feature-list tests.
- [x] Stable `multi_agent` and older-Codex max_threads behavior preserved. - Evidence: targeted tests plus full `npm run test`.
- [x] Docs/template wording updated for conditional `multi_agent_v2` compatibility. - Evidence: child lane `docs-thread-limit-guidance` patch applied.

### Validation and handoff
- [x] Targeted doctor/default/init tests pass. - Evidence: post-merge `npx vitest run --config vitest.config.core.ts orchestrator/tests/InitTemplates.test.ts orchestrator/tests/CodexDefaultsSetup.test.ts orchestrator/tests/Doctor.test.ts` passed `3` files / `80` tests after the final elegance cleanup.
- [x] Repo guard lane passes or documented blockers/follow-ups exist. - Evidence: `delegation-guard` OK with `2` subagent manifests; `spec-guard` OK; targeted Vitest passed `3` files / `80` tests after the latest source merge; `npm run build` OK; `npm run lint` OK with the pre-existing `DelegationMcpHealth.test.ts` warnings only; full `npm run test` passed `352` files / `4809` tests after the latest source merge; `docs:check`, `docs:freshness`, `repo:stewardship`, working-tree `diff-budget`, and `pack:smoke` all passed, with docs/guard gates rerun after the final task-archive merge and checklist refresh.
- [x] Manifest-backed standalone review completes. - Evidence: first review found a P2 target-env feature-probe issue that was fixed; final `.runs/linear-bf27af4a-01b6-4006-a39b-a9c668be8548/cli/2026-04-25T09-04-25-100Z-c08fa974/review/telemetry.json` reports `status: succeeded`, `review_outcome: bounded-success` with no emitted actionable findings after the final `origin/main` source merge.
- [x] Elegance/minimality pass completes. - Evidence: final manual pass removed the unused `readCodexFeatureFlags` wrapper, kept the shared feature probe narrow, preserved static normal templates, and avoided broader RLM/delegation refactors; targeted tests, build, and lint reran cleanly afterward.
- [ ] PR is attached to CO-354.
- [ ] `pr ready-review` drain exits cleanly before `In Review`.
