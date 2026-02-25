# Task Checklist - Standalone Review Runtime Bounding + Telemetry (0979)

- MCP Task ID: `0979-standalone-review-runtime-telemetry`
- Primary PRD: `docs/PRD-standalone-review-runtime-telemetry.md`
- TECH_SPEC: `tasks/specs/0979-standalone-review-runtime-telemetry.md`
- ACTION_PLAN: `docs/ACTION_PLAN-standalone-review-runtime-telemetry.md`
- Summary of scope: investigate forced standalone review timeout behavior and harden wrapper runtime guidance + telemetry diagnostics.

> Set `MCP_RUNNER_TASK_ID=0979-standalone-review-runtime-telemetry` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; add `npm run pack:smoke` when touching downstream-facing CLI/package/skills/review-wrapper/docs paths.

## Checklist

### Foundation and diagnosis
- [x] Root-cause evidence captured from forced run output log. - Evidence: `.runs/0978-agent-first-adoption-steering-skill/cli/2026-02-25T03-48-09-988Z-0e0cd9c1/review/output.log`, `out/0979-standalone-review-runtime-telemetry/manual/validation-chain-2026-02-25.log`.
- [x] Subagent diagnosis stream captured and summarized. - Evidence: subagent `019c92f9-76b1-7781-a295-89de578c6984`.

### Docs-first artifacts and gates
- [x] Task scaffolding + mirrors + registries registered.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0979-standalone-review-runtime-telemetry/cli/2026-02-25T04-08-45-193Z-9f6bc5da/manifest.json`.

### Implementation and validation
- [x] Wrapper bounded-prompt behavior implemented with explicit override. - Evidence: `scripts/run-review.ts`, `docs/standalone-review-guide.md`.
- [x] Timeout/failure telemetry artifact + stderr summary implemented. - Evidence: `scripts/run-review.ts`, `tests/run-review.spec.ts`, `.runs/0979-standalone-review-runtime-telemetry/cli/2026-02-25T04-08-45-193Z-9f6bc5da/review/telemetry.json`.
- [x] Regression tests updated and passing. - Evidence: `tests/run-review.spec.ts`, `out/0979-standalone-review-runtime-telemetry/manual/validation-chain-2026-02-25.log`.
- [x] Downstream pack-smoke validation captured for npm-packaged review/skill paths. - Evidence: `out/0979-standalone-review-runtime-telemetry/manual/pack-smoke-2026-02-25.log`.
- [x] `npm run docs:check` and `npm run docs:freshness` passing after updates. - Evidence: `out/0979-standalone-review-runtime-telemetry/manual/validation-chain-2026-02-25.log`.

### Review and handoff
- [x] Tailored standalone review completed and logged. - Evidence: `out/0979-standalone-review-runtime-telemetry/manual/post-implementation-standalone-review.log`.
- [x] Tailored elegance review completed and logged. - Evidence: `out/0979-standalone-review-runtime-telemetry/manual/post-implementation-elegance-review.log`.
- [x] Final evidence mirrors updated (`tasks/index.json`, `docs/TASKS.md`, `.agent/task/0979-...`). - Evidence: `tasks/index.json`, `docs/TASKS.md`, `.agent/task/0979-standalone-review-runtime-telemetry.md`.
