# Task 0105 - Recursive Language Model Orchestrator

- MCP Task ID: `0105-rlm-orchestrator`
- Primary PRD: `docs/PRD-rlm-orchestrator.md`
- Tech Spec: `docs/TECH_SPEC-rlm-orchestrator.md`
- Action Plan: `docs/ACTION_PLAN-rlm-orchestrator.md`
- Mini-spec: `tasks/specs/0105-rlm-orchestrator.md`
- Run Manifest (docs review): `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`
- Run Manifest (implementation gate): `.runs/0105-rlm-orchestrator/cli/2026-01-05T02-28-20-190Z-5dd73dc0/manifest.json`
- Run Manifest (release docs review): `.runs/0105-rlm-orchestrator/cli/2026-01-05T07-32-22-901Z-ebcffeea/manifest.json`
- Run Manifest (release implementation gate): `.runs/0105-rlm-orchestrator/cli/2026-01-05T07-33-16-123Z-a1794c38/manifest.json`
- Release workflow (v0.1.3): `https://github.com/Kbediako/CO/actions/runs/20708675207`
- Metrics/State: `.runs/0105-rlm-orchestrator/metrics.json`, `out/0105-rlm-orchestrator/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec). Evidence: `docs/PRD-rlm-orchestrator.md`, `docs/TECH_SPEC-rlm-orchestrator.md`, `docs/ACTION_PLAN-rlm-orchestrator.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `tasks/specs/0105-rlm-orchestrator.md`.
- [x] Docs-review manifest captured (pre-implementation). Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, and `tasks/index.json`. Evidence: `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, `tasks/index.json`.

### Implementation Planning
- [x] CLI entrypoint + pipeline shape agreed. Evidence: `bin/codex-orchestrator.ts`, `codex.orchestrator.json`.
- [x] Task-id/run-id resolution agreed for ad-hoc runs. Evidence: `bin/codex-orchestrator.ts`.
- [x] `rlm` vs `start <pipeline-id>` behavior agreed (blocking vs detach, run-id output). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Built-in pipeline packaging agreed (no repo config required). Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/rlmRunner.ts`.
- [x] Built-in `rlm` pipeline precedence vs local `codex.orchestrator.json` clarified (override vs disable). Evidence: `orchestrator/src/cli/services/pipelineResolver.ts`, `orchestrator/src/cli/config/userConfig.ts`.
- [x] `rlm` vs `start <pipeline-id>` blocking/detach semantics + exit code retrieval documented. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Validator auto-detect heuristics agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/validator.ts`.
- [x] `--validator none` semantics + exit codes agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Loop stop conditions agreed (validator pass, max iterations, optional time cap). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Tests/fixtures scope agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/tests/RlmLoop.test.ts`, `orchestrator/tests/RlmValidator.test.ts`.

### Release
- [x] Release SOP added + docs freshness registry updated. Evidence: `.agent/SOPs/release.md`, `docs/docs-freshness-registry.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T06-54-44-101Z-8f3e4c12/manifest.json`.
- [x] Pack audit allowlist corrected for npm release. Evidence: `package.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T07-14-39-976Z-0675d878/manifest.json`.
- [x] Release version bumped to 0.1.3 and tag published. Evidence: `package.json`, `package-lock.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T07-33-16-123Z-a1794c38/manifest.json`, `https://github.com/Kbediako/CO/actions/runs/20708675207`.
- [x] Full-matrix local validation + optional deps prep completed. Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-14-953Z-b0b3f296/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-21-194Z-d17b95ea/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-28-570Z-d7d66471/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-37-278Z-240b3d4b/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-44-319Z-2aa70554/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-00-55-091Z-6a986777/manifest.json`.
- [x] Task docs sync + archive run validated. Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-18-47-735Z-09ebcb99/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T08-19-22-832Z-5878f595/manifest.json`.
- [x] Instruction stamp SOP + helper validated (docs:check/docs:freshness rerun). Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T09-24-20-841Z-d6c803af/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T09-24-57-193Z-dcadef70/manifest.json`, `.runs/0105-rlm-orchestrator-docs-check/cli/2026-01-05T09-28-57-237Z-c66c5305/manifest.json`, `.runs/0105-rlm-orchestrator-docs-freshness/cli/2026-01-05T09-29-04-887Z-84c61586/manifest.json`.
- [x] Instruction stamp CI guard added (core-lane). Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T11-08-43-159Z-29698b55/manifest.json`, `.runs/0105-rlm-orchestrator/cli/2026-01-05T11-09-21-930Z-0e59f74b/manifest.json`.
