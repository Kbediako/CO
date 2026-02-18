# ACTION_PLAN - Cloud + RLM Adoption Reliability + Fallback Contract Hardening (0974)

## Summary
- Goal: increase cloud/RLM confidence and adoption by reducing setup ambiguity and strengthening fallback/execution verification.
- Scope: doctor cloud preflight path, doctor adoption hints, low-friction MCP enablement, cloud status retry tuning, cloud canary fallback-contract checks.
- Assumptions: cloud remains opt-in and fallback to `mcp` remains allowed when preflight fails.

## Milestones & Sequencing
1) Docs-first scaffolding + task/spec/mirror registration for 0974.
2) Capture pre-implementation docs-review manifest and delegated scout evidence.
3) Implement doctor cloud preflight command path and output wiring.
4) Implement doctor adoption hints for cloud/RLM underuse.
5) Implement safe `mcp enable` flow for disabled MCP servers.
6) Implement cloud status retry/backoff tuning knobs and tests.
7) Extend cloud canary/workflow for explicit fallback-contract validation.
8) Run fresh-repo friction smoke checks + full validation + standalone/elegance review, then handoff.

## Dependencies
- Existing `runCloudPreflight` utility and cloud execution/runtime manifests.
- Existing cloud canary workflow/script.

## Validation
- Checks / tests:
  - `npm run test -- orchestrator/tests/Doctor.test.ts orchestrator/tests/DoctorUsage.test.ts orchestrator/tests/McpEnable.test.ts orchestrator/tests/CodexCloudTaskExecutor.test.ts orchestrator/tests/CloudModeAdapters.test.ts tests/cli-command-surface.spec.ts`
  - `npm run docs:check`
  - `npm run lint`
  - `npm run build`
- Manual smoke:
  - `codex-orchestrator doctor --cloud-preflight`
  - `codex-orchestrator doctor --cloud-preflight --format json`
  - `codex-orchestrator mcp enable --format json`
  - `codex-orchestrator doctor --usage --format json`
  - `CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary` (with task-scoped local env)
- Rollback plan:
  - Revert new doctor flag and canary fallback mode if regressions are detected.
  - Keep prior cloud execution/fallback defaults intact.

## Risks & Mitigations
- Risk: canary logic becomes brittle across envs.
  - Mitigation: keep fallback mode explicit and isolated via env toggle.
- Risk: retry tuning knobs allow pathological values.
  - Mitigation: clamp/bound env values with safe defaults.

## Approvals
- Reviewer: user
- Date: 2026-02-18
