# Task List Snapshot — Orchestrator Workspace

- **Update — 2025-11-06:** Snakes Arena game assets were extracted from this repository and archived under `/Users/asabeko/Documents/snakes-arena-backup`; the remaining pipelines cover orchestrator diagnostics, linting, testing, and spec guard validation only.

## Checklist Mirror
The Snakes Arena checklist has been retired from this workspace; reference the archived manifests in `/Users/asabeko/Documents/snakes-arena-backup/.runs/` if historical evidence is needed.

> _Guardrail note:_ Minimal diagnostics or smoke-test pipelines can opt out of spec-guard enforcement by setting `guardrailsRequired: false` in their pipeline definition (e.g., inside `codex.orchestrator.json`). Standard design pipelines keep `node scripts/spec-guard.mjs --dry-run` inline so manifests such as `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json` continue to record guardrail evidence automatically.

# Task List Snapshot — Codex Orchestrator NPM Companion Package (0914)

- Update - Planning: PRD/tech spec/action plan/checklist/mini-spec drafted; docs-review manifest captured at `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0914-npm-companion-package` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0914-npm-companion-package.md` and `.agent/task/0914-npm-companion-package.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0914-npm-companion-package.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.

### Packaging & Tarball Controls
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add clean step and pack audit script.
- [x] Tighten pack audit dist allowlist to runtime subtrees.
- [x] Add pack smoke test for the tarball - Evidence: new script + manifest.
- [x] Add CI gate for pack audit and smoke test - Evidence: workflow + manifest.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: pack audit + tests.

### CLI Companion Surface
- [x] Add `codex-orchestrator mcp serve`.
- [x] Enforce or verify downstream `codex` stdout stays protocol-only for `mcp serve`.
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.

### Templates & Init
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.

### Optional Dependencies + Doctor
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.

### Release Workflow
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
- [x] Document release asset download fallbacks - Evidence: spec update.
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] Diff budget override recorded (`DIFF_BUDGET_OVERRIDE_REASON`) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/commands/06-diff-budget.ndjson`.
- Note: CI diff budget override requires label `diff-budget-override` and PR body line `Diff budget override: ...`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.

# Task List Snapshot — Frontend Testing as Core Orchestrator Capability (0915)

- Update - Implementation complete: implementation-gate manifest captured at `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0915-frontend-testing-core` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0915-frontend-testing-core.md` and `.agent/task/0915-frontend-testing-core.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`, `docs/ACTION_PLAN-frontend-testing-core.md`, `tasks/specs/0915-frontend-testing-core.md`, `tasks/tasks-0915-frontend-testing-core.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, and `tasks/index.json` - Evidence: `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, `tasks/index.json`.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.

### Frontend Testing Surface
- [x] Add frontend testing pipelines (`frontend-testing`, `frontend-testing-devtools`) - Evidence: `codex.orchestrator.json`, manifest.
- [x] Add a frontend testing CLI entrypoint (compiled into `dist/**`).

### DevTools Enablement (Packaged)
- [x] Move devtools helper logic into runtime modules shipped in the npm package.

### Doctor Readiness
- [x] Extend `codex-orchestrator doctor` with DevTools readiness checks.

### Documentation
- [x] Update README and agent docs with frontend testing commands and enablement rules.

### Tests
- [x] Add tests for devtools default-off / explicit-on behavior.

### Guardrails & Handoff (post-implementation)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.

# Task List Snapshot — Codex Orchestrator NPM Companion Package Publishability (0916)

- Update - Implementation complete: implementation-gate manifest captured at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`; pack audit manifest at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`; pack smoke manifest at `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0916-npm-companion-package-publishability` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0916-npm-companion-package-publishability.md` and `.agent/task/0916-npm-companion-package-publishability.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-npm-companion-package-publishability.md`, `docs/TECH_SPEC-npm-companion-package-publishability.md`, `docs/ACTION_PLAN-npm-companion-package-publishability.md`, `tasks/specs/0916-npm-companion-package-publishability.md`, `tasks/tasks-0916-npm-companion-package-publishability.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0916-npm-companion-package-publishability/metrics.json`, `out/0916-npm-companion-package-publishability/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0916-npm-companion-package-publishability.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-40-22-001Z-96dbf5f0/manifest.json`.

### Packaging & Tarball Controls
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, manifest.
- [x] Add clean step and pack audit script - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Tighten pack audit dist allowlist to runtime subtrees - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.
- [x] Add pack smoke test for the tarball - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-23-421Z-7c7bab9e/manifest.json`.
- [x] Add CI gate for pack audit and smoke test - Evidence: `.github/workflows/release.yml`.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-51-16-666Z-6c21dcf3/manifest.json`.

### CLI Companion Surface
- [x] Add `codex-orchestrator mcp serve`.
- [x] Enforce or verify downstream `codex` stdout stays protocol-only for `mcp serve`.
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.

### Templates & Init
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.

### Optional Dependencies + Doctor
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.

### Release Workflow
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
- [x] Document release asset download fallbacks - Evidence: spec update.
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

# Task List Snapshot — DevTools Readiness + Orchestrator Usage Discipline (0917)

- Update - Implementation complete: devtools readiness checks + setup helper shipped; guardrails captured at `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0917-devtools-readiness-orchestrator-usage` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0917-devtools-readiness-orchestrator-usage.md` and `.agent/task/0917-devtools-readiness-orchestrator-usage.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/metrics.json`, `out/0917-devtools-readiness-orchestrator-usage/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0917-devtools-readiness-orchestrator-usage.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.

### Implementation
- [x] DevTools readiness checks + setup helper added — Evidence: `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/devtoolsSetup.ts`, `bin/codex-orchestrator.ts`.
- [x] Orchestrator-first SOP + agent docs updated — Evidence: `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `AGENTS.md`.
- [x] Tests added for readiness + setup flows — Evidence: `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/DevtoolsSetup.test.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts` (vitest run 2025-12-30).
- [x] Guardrails complete — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.

# Task List Snapshot — Subagent Delegation Enforcement (0918)

- Update - Implementation complete: docs-review + implementation gate captured at `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json` and `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0918-subagent-delegation-enforcement` before orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0918-subagent-delegation-enforcement.md` and `.agent/task/0918-subagent-delegation-enforcement.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Subagent docs-review run captured - Evidence: `.runs/0918-subagent-delegation-enforcement-docs/cli/2025-12-30T16-38-34-482Z-000d8b75/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0918-subagent-delegation-enforcement/metrics.json`, `out/0918-subagent-delegation-enforcement/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0918-subagent-delegation-enforcement.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

### Implementation
- [x] Delegation guard script added — Evidence: `scripts/delegation-guard.mjs`.
- [x] Pipelines updated to run delegation guard — Evidence: `codex.orchestrator.json`.
- [x] Agent guidance and SOPs updated for mandatory delegation — Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/SOPs/meta-orchestration.md`.
- [x] Templates updated to require subagent evidence — Evidence: `.agent/task/templates/tasks-template.md`, `.agent/task/templates/subagent-request-template.md`.

### Guardrails & handoff
- [x] Guardrails complete — Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

# Task List Snapshot — Repo-wide Refactor Plan (0919)

- Update - Refactor plan drafted at `docs/REFRACTOR_PLAN.md`; docs-review manifest captured at `.runs/0919-refactor-plan/cli/2025-12-30T21-31-09-111Z-12be34c7/manifest.json`; implementation-gate manifest captured at `.runs/0919-refactor-plan/cli/2025-12-30T21-51-39-458Z-a9a82bc7/manifest.json`.

# Task List Snapshot — Refactor Plan Implementation Docs (0920)

- Update - Planning collateral drafted (PRD/tech spec/action plan/checklist/mini-spec); docs-review manifest captured at `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-03-29-881Z-82e0a68d/manifest.json`.

<!-- docs-sync:begin 0920-refactor-plan-implementation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0920-refactor-plan-implementation.md` and `.agent/task/0920-refactor-plan-implementation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0920-prd-refactor-plan-implementation.md`, `docs/PRD-refactor-plan-implementation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-refactor-plan-implementation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-refactor-plan-implementation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0920-refactor-plan-implementation.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-03-29-881Z-82e0a68d/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0920-refactor-plan-implementation.md` - Evidence: this PR.

### Phase 1: Quick wins
- [x] Pipeline DRY consolidation implemented - Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/config/userConfig.ts`, `orchestrator/tests/UserConfigStageSets.test.ts`.
- [x] Checklist mirror automation hardened for legacy docs blocks - Evidence: `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`.
- [x] Legacy wrapper consolidation aligned on shared CLI resolver - Evidence: `scripts/lib/orchestrator-cli.sh`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`, `scripts/run-mcp-diagnostics.sh`.

### Phase 2: Structural consolidation
- [ ] Orchestrator package boundary plan - Evidence: tech spec update.
- [ ] Shared package reduction plan - Evidence: tech spec update.

### Phase 3: Optional modularization
- [ ] Optional module extraction plan - Evidence: tech spec update.
- [ ] Compatibility shim plan - Evidence: tech spec update.

### Validation + handoff
- [ ] Implementation-gate manifest captured (post-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/<run-id>/manifest.json`.

## Relevant Files
- `docs/REFRACTOR_PLAN.md`
- `docs/PRD-refactor-plan-implementation.md`
- `docs/TECH_SPEC-refactor-plan-implementation.md`
- `docs/ACTION_PLAN-refactor-plan-implementation.md`
- `tasks/specs/0920-refactor-plan-implementation.md`

## Subagent Evidence
- 0920-refactor-plan-implementation-docs-verify - `.runs/0920-refactor-plan-implementation-docs-verify/cli/2025-12-30T22-02-59-928Z-ff1875b4/manifest.json`.
- 0920-refactor-plan-implementation-docs-sync-review - `.runs/0920-refactor-plan-implementation-docs-sync-review/cli/2025-12-30T22-23-08-516Z-87e4d8de/manifest.json`.
- 0920-refactor-plan-implementation-pipeline-review - `.runs/0920-refactor-plan-implementation-pipeline-review/cli/2025-12-30T22-22-35-494Z-895dea10/manifest.json`.
- 0920-refactor-plan-implementation-phase2-review - `.runs/0920-refactor-plan-implementation-phase2-review/cli/2025-12-30T22-34-56-017Z-723875aa/manifest.json`.
- 0920-refactor-plan-implementation-phase3-review - `.runs/0920-refactor-plan-implementation-phase3-review/cli/2025-12-30T22-36-11-454Z-94ac6869/manifest.json`.
<!-- docs-sync:end 0920-refactor-plan-implementation -->
# Task List Snapshot — Review Loop + DevTools Review Gate (0912)

- Update - Implementation complete: implementation-gate-devtools manifest captured at `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0912-review-loop-devtools-gate` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0912-review-loop-devtools-gate.md` and `.agent/task/0912-review-loop-devtools-gate.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Implementation-gate-devtools manifest captured — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0912-review-loop-devtools-gate/metrics.json`, `out/0912-review-loop-devtools-gate/state.json`.
- [x] Mirrors updated — Evidence: this commit + manifest above.

### Workflow updates
- [x] DevTools review gate pipeline wired — Evidence: `codex.orchestrator.json`, `scripts/run-review.ts`, `scripts/codex-devtools.sh`.
- [x] Review-loop SOP added and linked in agent docs — Evidence: `.agent/SOPs/review-loop.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- [x] NOTES required for review handoff with optional questions template — Evidence: `scripts/run-review.ts`, `README.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`.
- [x] Prompt installer added for onboarding — Evidence: `scripts/setup-codex-prompts.sh`, `README.md`.

### Guardrails & handoff
- [x] Spec-guard/build/lint/test/docs:check/diff-budget/review recorded — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-56-47-578Z-9b49e1ee/manifest.json`.

# Task List Snapshot - Orchestrator Status UI (0911)

- Update - Manual refresh control removed to keep auto-refresh only; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T14-32-15-222Z-b52429cb/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T14-39-43-441Z-442a873c/manifest.json`.
- Update - Last update timestamp holds steady during sync with subtle pulse indicator; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T13-49-22-466Z-afdb5885/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T14-00-38-767Z-1c6c5ba5/manifest.json`.
- Update - Sync control moved into a floating button beside Signals; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T13-07-12-110Z-ddd75a07/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T13-13-14-168Z-2dfae172/manifest.json`.
- Update - Sync control reduced to icon-only refresh and dropdown arrows spaced; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T12-28-53-481Z-98d67187/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T12-42-17-014Z-af029f6d/manifest.json`.
- Update - Signals icon-only toggle + approvals totals from design runs; docs-review/DevTools QA/implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T11-16-49-336Z-44f558c7/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T11-39-05-349Z-c07276ff/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T11-44-42-624Z-afae2840/manifest.json`.
- Update - Restore focus handoff to avoid aria-hidden warning on run modal/Signals panel close; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T09-15-57-261Z-d7387939/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T09-23-34-986Z-8e6693c4/manifest.json`.
- Update - Run detail modal visibility + centering fix; docs-review/DevTools QA/implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T08-23-06-106Z-3bd5e70b/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T08-23-29-563Z-64ed4a9e/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T08-31-56-263Z-44640215/manifest.json`.
- Update - Run-detail modal + footer status + signals positioning shipped; DevTools QA + implementation gate captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-30T03-44-47-302Z-d69ee8eb/manifest.json` and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T03-53-09-870Z-043c91fa/manifest.json`.
- Update - Implementation complete: aggregation + dashboard shipped; DevTools QA + guardrails captured at `.runs/0911-orchestrator-status-ui/cli/2025-12-29T23-57-33-834Z-548d594f/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-23-39-016Z-e0c9d909/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T00-27-43-100Z-9c2b8a6d/manifest.json`, and `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-33-59-187Z-5f123a71/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0911-orchestrator-status-ui` before orchestrator commands. Implementation gate runs `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, and `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0911-orchestrator-status-ui.md` and `.agent/task/0911-orchestrator-status-ui.md`. Keep `[ ]` until evidence is recorded.

### Planning and approvals
- [x] Mini-spec approved — Evidence: `tasks/specs/0911-orchestrator-status-ui.md`.
- [x] PRD approval recorded in `tasks/index.json` gate metadata — Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-23T07-59-47-613Z-344689f5/manifest.json`.

### Status model and data sources
- [x] Task bucket rules documented (active, ongoing, complete, pending).
- [x] Codebase status signals and log sources documented.

### UX layout and dark theme direction
- [x] Layout and dark theme guidance documented.

### Implementation prep
- [x] Aggregation schema and caching strategy documented.

### Implementation (complete)
- [x] Aggregation script built — Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-24T05-07-59-073Z-e6a472e8/manifest.json`.
- [x] Static UI and styles built — Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-24T05-07-59-073Z-e6a472e8/manifest.json`.

### Post-launch polish
- [x] UI refresh, status palette tuning, favicon, and keyboard selection — Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-29T23-57-33-834Z-548d594f/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-23-39-016Z-e0c9d909/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T00-27-43-100Z-9c2b8a6d/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-33-59-187Z-5f123a71/manifest.json`.

# Task List Snapshot — Orchestrator Issue Validation & Prioritization (0901)

- **Update — Planning:** Validation docs prepared; awaiting first diagnostics/plan manifest under `.runs/0901-orchestrator-issue-validation/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0901-orchestrator-issue-validation` before orchestrator commands. Validation runs should keep guardrails on: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0901-orchestrator-issue-validation.md` and `.agent/task/<id>-<slug>.md` (create if automation requires). Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.

### Validation
- [x] Issue #1 validated (sub‑pipeline error finalization) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #2 validated (CLI exec args passthrough) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #3 validated (session env override on reuse) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #4 validated (retry config clobbering) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #5 validated (`isIsoDate` strictness) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #6 validated (instruction stamp guard behavior) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #7 validated (timeout kill cross‑platform) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #8 validated (temp dir cleanup) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #9 validated (eslint plugin side‑effect build) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.

### Follow‑up Plan
- [x] Prioritized fix backlog created (new task/PR) with acceptance criteria — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

# Task List Snapshot — Orchestrator Run Reporting Consistency (0909)

- Update - Implementation in progress: implementation-gate/guardrails captured at `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0909-orchestrator-run-reporting-consistency` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0909-orchestrator-run-reporting-consistency.md` and `.agent/task/0909-orchestrator-run-reporting-consistency.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Implementation-gate/guardrails manifest captured — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- [x] PRD/spec/tasks mirrors updated — Evidence: this commit.
- [x] Mini-spec reviewed and approved — Evidence: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`, `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.

### Fixes
- [x] Grouped run summaries reflect overall outcome.
- [x] Scheduler finalization avoids completed timestamps for running.
- [x] Metrics aggregation serialized per task with per-entry pending queue + stale lock cleanup.
- [x] Regression tests updated or added.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Build passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Docs check passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Diff budget passes — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- [x] Review run captured — Evidence: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.

# Task List Snapshot - Docs Review Gate (0910)

- Update - Planning: PRD/tech spec/action plan/checklist drafted; docs-review manifest captured at `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0910-docs-review-gate` before orchestrator commands. Docs-review will run spec-guard, docs:check, and review with `SKIP_DIFF_BUDGET=1`.

<!-- docs-sync:begin 0910-docs-review-gate -->
## Checklist Mirror
Mirror status with `tasks/tasks-0910-docs-review-gate.md` and `.agent/task/0910-docs-review-gate.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Mirrors created (`docs/TASKS.md`, `.agent/task/0910-docs-review-gate.md`, `tasks/index.json`) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`.
- [x] `tasks/index.json` gate metadata updated with docs-review manifest - Evidence: `tasks/index.json`, `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.

### Docs-review pipeline
- [x] Add docs-review pipeline to `codex.orchestrator.json` (spec-guard, docs:check, review). - Evidence: `codex.orchestrator.json`.
- [x] Set `SKIP_DIFF_BUDGET=1` for the docs-review review stage. - Evidence: `codex.orchestrator.json`.
- [x] Confirm docs-review runs capture the manifest evidence for the pre-implementation review. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.

### Workflow docs and templates
- [x] Update `docs/AGENTS.md` to require docs-review evidence before implementation. - Evidence: `docs/AGENTS.md`.
- [x] Update task checklist templates to include docs-review and implementation review items. - Evidence: `.agent/task/templates/tasks-template.md`.
- [x] Update `.agent/system/conventions.md` and `.ai-dev-tasks/process-task-list.md` if needed for consistency. - Evidence: `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md`.

### Review handoffs
- [x] Pre-implementation docs review completed and recorded. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-22-14-990Z-d0b0eec7/manifest.json`.
- [x] Post-implementation review completed and recorded. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T14-10-10-712Z-5c987b7e/manifest.json`.
<!-- docs-sync:end 0910-docs-review-gate -->

# Task List Snapshot — Orchestrator Reliability Fixes (0902)

- **Update — Planning:** Follow‑on hardening task from 0901; implementation underway.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0902-orchestrator-reliability-fixes` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0902-orchestrator-reliability-fixes.md` and `.agent/task/0902-orchestrator-reliability-fixes.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Fixes
- [x] Issue #1 fixed: sub‑pipeline exceptions finalize parent manifests/stages — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #2 fixed: CLI exec executor forwards unified exec args — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #3 fixed: session reuse applies env overrides — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #4 fixed: retry defaults not clobbered by `undefined` spreads — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #5 fixed: `isIsoDate` enforces strict ISO‑8601 expectations — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #6 fixed: instruction loader warns+skips unstamped optional candidates — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #7 fixed: timeout kill is cross‑platform/Windows‑safe — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #8 fixed: temp dirs cleaned in crystalizer and SDK exec — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #9 fixed: eslint plugin no longer runs builds as side effects — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.

# Task List Snapshot — TaskStateStore Run History File Fix (0903)

- **Update — Planning:** Follow‑on from 0902 to remove TaskStateStore/metrics `state.json` collision.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0903-taskstate-store-run-history-fix` before orchestrator commands. Guardrails required.

## Checklist Mirror
Mirror status with `tasks/tasks-0903-taskstate-store-run-history-fix.md` and `.agent/task/0903-taskstate-store-run-history-fix.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0903-taskstate-store-run-history-fix/metrics.json`, `out/0903-taskstate-store-run-history-fix/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0903-taskstate-store-run-history-fix.md`.

### Fix
- [x] TaskStateStore run history uses `runs.json` without overwriting metrics `state.json`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.

# Task List Snapshot — README vs Codebase Alignment (0904)

- **Update — Completed:** Diagnostics + guardrails captured at `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`; README/SOP docs aligned to current code behavior.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0904-readme-codebase-alignment` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0904-readme-codebase-alignment.md` and `.agent/task/0904-readme-codebase-alignment.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`.
- [x] PRD/spec/tasks mirrors drafted — Evidence: this commit.

### Findings
- [x] High-impact mismatches reconciled (lint, stage targeting, review workflow) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Remaining mismatches reconciled (paths, hi-fi toolkit docs, mirror workflow docs, cloud sync docs) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.

# Task List Snapshot — Agentic Coding Readiness & Onboarding Hygiene (0905)

- **Update — Completed:** Diagnostics + guardrails captured at `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`; onboarding placeholders replaced and core CI lane enabled.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0905-agentic-coding-readiness` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0905-agentic-coding-readiness.md` and `.agent/task/0905-agentic-coding-readiness.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

### Deliverables
- [x] Replace `.agent/system/*` placeholders with repo-specific content — Evidence: this commit.
- [x] Replace `.ai-dev-tasks/*` placeholders with canonical workflow docs — Evidence: this commit.
- [x] Remove stale/non-standard subagent docs; ensure guidance is Codex-first and self-consistent — Evidence: this commit.
- [x] Enable CI workflow for core lane (build/lint/test/spec-guard) — Evidence: `.github/workflows/core-lane.yml`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Build passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

# Task List Snapshot — Docs Hygiene Automation & Review Handoff Gate (0906)

- **Update — Implementation complete:** Deterministic `docs:check`/`docs:sync` tooling landed and CI-gated; workflow docs require `npm run docs:check` then `npm run review` after validations — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0906-docs-hygiene-automation` before orchestrator commands. Guardrails required (in order): `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run review`.

<!-- docs-sync:begin 0906-docs-hygiene-automation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0906-docs-hygiene-automation.md` and `.agent/task/0906-docs-hygiene-automation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this commit.
- [x] Capture implementation gate manifest — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`.
- [x] Mirrors updated with manifest links (`docs/TASKS.md`, `.agent/task/0906-docs-hygiene-automation.md`, `tasks/index.json`) — Evidence: this commit + `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.

### Docs hygiene tool
- [x] Add `docs:check` (deterministic lint for agentic docs) — Files: `scripts/**`, `package.json`, `.github/workflows/core-lane.yml`; Acceptance: CI fails on doc drift; Evidence: this commit.
- [x] Add `docs:sync` (safe mirror sync for active task only) — Acceptance: updates `.agent/task/<task-id>.md` and `docs/TASKS.md` idempotently; Evidence: this commit.

### Workflow docs (review handoff gate)
- [x] Require `npm run review` after implementation guardrails in the agent-facing workflow docs — Acceptance: `AGENTS.md`, `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md` all reflect the same sequence; Evidence: this commit.

### Guardrails & handoff
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`.
<!-- docs-sync:end 0906-docs-hygiene-automation -->

# Task List Snapshot — Dead Code Pruning & Evidence (0801)

- **Update — Planning:** Diagnostics captured at `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`; dead-code deletions and archive relocations complete (archives parked under `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/` with README pointers) and guardrails/tests rerun on 2025-12-09.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0801-dead-code-pruning` before running orchestrator commands; guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` if touching orchestrator packages).

## Checklist Mirror
Mirror status with `tasks/tasks-0801-dead-code-pruning.md` and `.agent/task/<id>-<slug>.md` (if created). Keep `[ ]` until manifest path is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Remediation Plan
- [x] Unused CLI/learning/SDK helpers removed or justified — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Aggregator entrypoints/pattern registries evaluated and pruned or documented — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Evaluation harness + mirror server + design sample handled (delete/archive/justify) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Archives decision (keep with README pointer or relocate to archive folder) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Guardrails/tests executed — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` when orchestrator code touched); Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Review & Handoff
- [x] Reviewer hand-off run (`npm run review --manifest <latest>`) with approvals captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

# Task List Snapshot — Codex Orchestrator Slimdown (0707)

- **Update — Planning:** PRD + tech spec published; CI/local test coverage policy recorded (core vs full-matrix lanes). Awaiting first diagnostics manifest under `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands so manifests, metrics, and `out/**` land in the correct directories.

## Checklist Mirror
Mirror status with `tasks/tasks-0707-orchestrator-slimdown.md` and `.agent/task/0707-orchestrator-slimdown.md`. Keep `[ ]` until a manifest path such as `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Diagnostics manifest captured — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`.
- [x] CI/test coverage policy mirrored across PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

### Deliverables
- [x] Manifest single-source + generated TS types/AJV validator; duplicate schema removed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unused agent SDK deps removed with usages pruned/shimmed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Core build split (`npm run build` core, `npm run build:all` full matrix) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Design deps optional/lazy across toolkits + mirror scripts with runtime guidance — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Exec command modularized without behavior change — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Characterization tests for execution-mode resolution (flags, metadata modes, parallel override) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Execution-mode logic unified behind a shared helper with no behavior changes — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Task/run ID sanitization unified behind a shared helper with identical error messages — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Shared lock retry helper extracted for TaskStateStore and ExperienceStore — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write behavior verified (directory creation, temp naming) before unification — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write helpers unified with explicit options after verification (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] CLI pipeline result wrappers simplified with explicit result storage — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Enforcement-mode parsing shared between control-plane and privacy guard — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error string expectations verified before centralizing error formatting — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error message formatting centralized without changing prefixes or strings (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

# Task List Snapshot — Design Reference Pipeline (0401-design-reference)

- **Update — 2025-11-21:** Diagnostics + review run captured at `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`; use this evidence path across mirrors.
- **Update — Configuration planning:** `design.config.yaml` schema drafted alongside pipeline toggles documentation; manifest reference set to `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- **Notes:** Optional tool setup lives behind `npm run setup:design-tools`; retention/expiry policies will reference `design.config.yaml > metadata.design.retention`.

## Checklist Mirror
Mirror status with `tasks/design-reference-pipeline.md` and `.agent/task/design-reference-pipeline.md`. Keep `[ ]` until a manifest path such as `.runs/0401-design-reference/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md`; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- [x] Pipeline toggles wired — `design.config.yaml` template + CLI/ENV triggers (`--pipeline design-reference`, `DESIGN_PIPELINE=1`) documented; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Setup tooling — `npm run setup:design-tools` captures Playwright/FFmpeg optional installs without impacting baseline CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Pipeline Stages
- [x] Playwright extractor implemented — stages DOM/CSS/screenshots with privacy approvals logged; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reference page builder shipped — `motherduck.html` staged under `design/reference/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Componentization stage delivered — `packages/design-system` assets staged under `design/components/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Advanced assets optionality — Framer Motion + FFmpeg outputs gated by config quotas; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Manifest & Guardrails
- [x] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] DesignArtifactWriter output — `out/0401-design-reference/design/runs/<run>.json` summary written with retention/privacy fields; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Retention & privacy controls — expiry automation/docs and approval logging established; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Guardrail integration — `scripts/spec-guard.mjs` covers `docs/design/specs/**`; `npm --prefix packages/design-system run test:visual` hooked into pipeline; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Verification & Approvals
- [x] Visual regression evidence — diff artifacts + pass/fail summaries staged under `design/visual-regression/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reviewer hand-off — `npm run review` references latest design-reference manifest and approvals; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.

# Task List Snapshot — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

- **Update — Pending kickoff:** PRD, spec, and task mirrors drafted; awaiting diagnostics run to capture `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — External toolkit:** Autonomous hi-fi design starter will be synchronized into this repo with compliance permits before extractor work begins.
- **Notes:** Always export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` so manifests, metrics, and out files land under the correct directories.

## Checklist Mirror
Mirror status with `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until a manifest path such as `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Collateral minted — `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, `tasks/index.json`, `.agent/task/hi-fi-design-toolkit.md`, `docs/TASKS.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] External toolkit synchronized — vendored `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` with snapshot metadata in `packages/design-reference-tools/VENDOR.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] Compliance permits imported — `compliance/permit.json` mirrors upstream approvals and is referenced by docs; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.

### Pipeline Enablement
- [x] Extractor stage wired — `scripts/design/pipeline/toolkit/extract.ts` enforces permits + approvals and stages context assets; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Tokens + style guide stage — `tokens.ts` + styleguide wrapper emit token bundles + markdown docs with manifest metrics; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reference & self-correction stage — `reference.ts` + optional `self-correct` loops capture diff reductions + FFmpeg approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Publish integration — toolkit outputs merged into `packages/design-system` with `npm --prefix packages/design-system run test:visual` logged; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

### Guardrails & Evidence
- [x] Spec guard stage embedded — `design-spec-guard` runs `node scripts/spec-guard.mjs --dry-run` inside the hi-fi diagnostics pipeline before artifact writes; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Manifest/schema updates — `design_toolkit_artifacts` + summary persisted to manifests and `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Retention/privacy automation — retention window + purge command (`npm run design:purge-expired`) documented, approvals recorded; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start hi-fi-design-toolkit --format json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` cites latest toolkit manifest and approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

# Task List Snapshot — Frontend Design Pipeline v2 (0412-frontend-design-pipeline-v2)

- **Update — Planning:** Fresh + clone-informed pipeline PRD/spec drafted; awaiting diagnostics run to seed `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — Schema & snippet:** Manifest support for design plan/guardrail/history/style profiles plus `prompt-snippets/frontend-aesthetics-v1.md` landed; guardrail metrics/style-overlap gate documented for parity tests.
- **Notes:** Modes differ only in aesthetic plan derivation (brief vs brief+Hifi style profile); artifacts will mirror design pipeline layouts with added guardrail/history outputs.

## Checklist Mirror
Mirror status with `tasks/frontend-design-pipeline-v2.md` and `.agent/task/frontend-design-pipeline-v2.md`. Keep `[ ]` until a manifest path such as `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [ ] Collateral synchronized — `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `.agent/task/frontend-design-pipeline-v2.md`, `docs/TASKS.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Spec guard coverage — `node scripts/spec-guard.mjs --dry-run` watches `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Pipeline Stages
- [ ] Style ingestion (Hifi) — `hifi_style_profile.json` emitted with approvals + similarity level; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design brief normalization — `frontend-design-brief.json` staged with required fields + hash; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetic axes plan — `frontend-aesthetic-plan.json` captures axes + `avoid` lists + snippet version; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Implementation + complexity metadata — `implementation-metadata.json` links plan to framework/density expectations; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetics guardrail — `design-review-report.json` with originality/accessibility/brief-alignment/slop scores + pass/fail; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design diversity memory — `frontend-design-history.json` bounded + mirrored to `out/0412-frontend-design-pipeline-v2/design/history.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Frontend aesthetics snippet library — `prompt-snippets/frontend-aesthetics-v1.md` versioned and referenced by plans/guardrails; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Artifacts, Guardrails, Validation
- [ ] Artifact layout + writer — artifacts under `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/artifacts/design/**`, summary `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Manifest/schema updates — manifest sections for `design_plan`, `design_guardrail`, `design_history`, style profile metadata with approvals/retention; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Metrics/telemetry — metrics (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`) emitted to manifest + `out/**`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Retention/legal logging — retention enforced (style profiles may use shorter window), approvals + `do_not_copy` markers captured; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Mode parity — Fresh vs clone-informed runs show identical stage set; manifests capture mode + reference style id; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Guardrail efficacy — AI-slop mock fails and compliant mock passes with differing `slop_risk`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Style-overlap gate — Clone-informed runs compute `style_overlap` (max of palette/typography/motion/spacing similarities) and fail guardrail when >0.10; manifests + `design-review-report.json` record per-axis scores and `style_overlap_gate`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Diversity penalty check — history reuse increases `diversity_penalty` surfaced in guardrail report; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Reviewer hand-off — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review` executed with latest manifest cited; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

# Task List Snapshot — More Nutrition Pixel Archive (0505-more-nutrition-pixel)

- **Update — 2025-11-09:** Hi-fi design toolkit run captured https://more-nutrition.webflow.io and logged manifest `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json` with full stage telemetry (interactions enabled for scroll/slider playback).
- **Update — Archive minted:** Toolkit outputs mirrored into `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` (context, tokens, style guide, reference, diffs) for desktop + mobile snapshots. *Note: directory pruned from the working copy on 2025-11-09 to keep the repo lean; rerun hi-fi pipeline to regenerate artifacts if needed.*
- **Notes:** Automated self-correction stopped at a 2.59% residual error rate; findings captured in `docs/findings/more-nutrition.md` to track spacing + slider gaps.

## Checklist Mirror
Mirror status with `tasks/0505-more-nutrition-pixel.md` and `.agent/task/0505-more-nutrition-pixel.md`. Keep `[ ]` until manifest + archive references are recorded.

### Capture & Evidence
- [x] Hi-fi pipeline run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0505-more-nutrition-pixel --format json`; Evidence: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`.
- [x] Toolkit summary — `out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json` logs approvals, breakpoints, token counts, and self-correction deltas.

### Artifacts & Findings
- [x] Archive staged — `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` copies `design-toolkit/{context,tokens,styleguide,reference,diffs}` *(local copy removed on 2025-11-09 cleanup; rerun capture to recreate)*.
- [x] Findings doc — `docs/findings/more-nutrition.md` lists residual parity gaps, diff metrics, and next actions referencing the same manifest.

### Documentation Sync
- [x] Mirrors refreshed — `tasks/index.json`, `tasks/0505-more-nutrition-pixel.md`, `.agent/task/0505-more-nutrition-pixel.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` cite the manifest + archive path for Task 0505.

# Task List Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

- **Update — 2025-11-05:** Multi-instance autonomy upgrade validation run recorded; manifest `.runs/autonomy-upgrade/cli/2025-11-05T13-30-00Z-upgrade/manifest.json` captures control-plane enforcement, scheduler fan-out, streaming handles, and privacy guard enforcement.
- **Update — 2025-11-06:** Efficiency optimizations (guard decision pruning, replay window reuse, stdio sliding buffer, `mergeSnapshot` O(1) append) validated; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.
- **Update — 2025-11-04:** Unified exec runtime (session manager + event streaming) completed; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Update — 2025-11-04:** CLI command stages now emit unified exec lifecycle events with streaming logs; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`.
- **Update — 2025-11-04:** Tool orchestrator layer implemented with manifest evidence `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- **Update — 2025-11-04:** Diagnostics run `2025-11-04T01-59-37-568Z-8065982c` captured guardrail execution; manifest at `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Gate Status:** Planning approved — greenlight to begin ToolOrchestrator implementation. Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-46-22-699Z-8be8efb9/manifest.json`.
- **Notes:** Upgrade metrics recorded at `.runs/autonomy-upgrade/metrics.json` with aggregates in `.runs/autonomy-upgrade/metrics/post-rollout.json`, `.runs/autonomy-upgrade/metrics/completeness.json`, and MTTR delta tracked in `out/autonomy-upgrade/metrics/mttr-delta.json`. Legacy diagnostics remain at `.runs/0303-orchestrator-autonomy/metrics.json`; state snapshot refreshed at `out/0303-orchestrator-autonomy/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0303-orchestrator-autonomy.md` and `.agent/task/0303-orchestrator-autonomy.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

### Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run 2025-11-03T23:58:59Z).
- [x] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (manifest records `approval_policy: read/edit/run/network`).

### Tool Orchestrator Layer
- [x] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- [x] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.

### Unified Exec Runtime
- [x] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- [x] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.

### CLI & SDK Interfaces
- [x] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Telemetry & Notifications
- [x] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Instruction Hierarchy & Schema
- [x] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Update manifest/config schemas for new fields and document JSONL event format; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Efficiency Optimizations
- [x] Prune `handle.decisions` along with the frame buffer to keep guard metadata bounded; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replay subscriptions and snapshots reuse the stored frame window (O(replayed frames) per observer); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replace quadratic stdio concatenation with an O(chunk) sliding window; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/shared/tests/StdioTracker.test.ts`.
- [x] Make `TaskStateStore.mergeSnapshot` O(1) for append-only runs while keeping replacements ordered; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
- [x] Diagnostics + guardrails rerun after efficiency fixes (`npm run test`, `node scripts/spec-guard.mjs --dry-run`); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.

### Verification & Guardrails
- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-44-59-137Z-de57c4d7/manifest.json`.
- [x] Guardrails — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json` (diagnostics run captures guardrail execution summary).
- [x] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (review outcome “Skip for now” logged).

---

# Task List Snapshot — Orchestrator Resilience Hardening (0202)

- **Update — 2025-10-31:** Diagnostics run `2025-10-31T22-56-34-431Z-9574035c` succeeded; manifest recorded under `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- **Gate Status:** Resilience enhancements implemented; awaiting reviewer sign-off.
- **Notes:** Metrics appended to `.runs/0202-orchestrator-hardening/metrics.json`; state snapshot refreshed at `out/0202-orchestrator-hardening/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0202-orchestrator-hardening.md` and `.agent/task/0202-orchestrator-hardening.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

- Documentation Sync — `[x]` Collateral references Task 0202 and ties to diagnostics manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Persistence Reliability — `[x]` Lock retry/backoff shipped with passing tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Heartbeat Safety — `[x]` Awaited heartbeat queue implemented; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Output Bounding — `[x]` Command buffer and error truncation verified via tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Guardrails & Review — `[x]` `spec-guard`, `npm run lint`, `npm run test`, and `npm run review` executed; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

Update checklist entries with the exact `.runs/0202-orchestrator-hardening/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` path once runs complete.

# Task List Snapshot — TF-GRPO Integration (0506)

- **Update — 2025-11-21:** `tfgrpo-learning` run succeeded (3 epochs, G=2, rewarders=`gt,relative`, temps 0.7/0.7/0.3) with manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; prompt-pack stamps recorded and spec-guard passed. Diagnostics-with-eval guardrail run succeeded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json` (build/lint/test/eval/spec-guard).
- **Gate Status:** TF-GRPO enablement in planning; implementation gated on Experience Store + prompt pack landing behind `FEATURE_TFGRPO_GROUP`.
- **Guardrails:** Enforce `G ≥ 2`, ≤32-word experiences, three epochs (~100 samples) with train temp 0.7 / eval temp 0.3, stamped instruction sources only, and `node scripts/spec-guard.mjs --dry-run` before review.

## Checklist Mirror
Mirror status with `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`).

### PR-1 Prompt Packs & Loader
- [x] Stamped prompt-pack manifests wired into `packages/orchestrator/src/instructions/loader.ts`; tests: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `packages/orchestrator/tests/InstructionsLoader.test.ts`. Evidence: prompt_packs stamps in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-2 Metrics (Per-Tool & Per-Epoch)
- [x] Emit per-tool, per-epoch token/cost/latency metrics via exec command → recorder/aggregator/OTEL; tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/ExecCommand.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-3 Experience Store & Injection
- [x] Persist ≤32-word stamped experiences and inject them into prompt packs; tests: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-4 Trajectory Summary & Optimizer
- [x] Summarize exec events into trajectory frames, stamp, and re-inject; tests: `orchestrator/tests/ExecCommand.test.ts`, `orchestrator/tests/ExperienceStore.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-5 Rewarders (GT + Relative Rank)
- [x] Evaluation harness exposes deterministic GT + relative ranking rewarders; tests: `evaluation/tests/harness.test.ts` (RewarderExactMatch, RelativeRankingRewarder suites). Evidence: tfgrpo-learning run used `TFGRPO_REWARDERS=gt,relative` (runner log `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/commands/01-tfgrpo-loop.ndjson`).

### PR-6 Learning Schedule
- [x] Three-epoch (~100 sample) schedule with temperature overrides and tfgrpo-learning pipeline wiring; tests: `evaluation/tests/harness.test.ts` (LearningScheduleLoop), `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig). Evidence: runner log shows epochs 1–3 at temps 0.7/0.7/0.3 with 100 samples each; manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-7 Config Guardrails
- [x] Request builder enforces `groupSize ≥ 2` and instruction loader filters stamped sources; tests: `orchestrator/tests/ControlPlaneValidator.test.ts`, `packages/orchestrator/tests/instructions/InstructionGuard.test.ts`. Evidence: command recorded `TFGRPO_GROUP_SIZE=2` with stamped instruction sources + prompt pack stamps in manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-8 Group Runner (Feature Flagged)
- [x] TaskManager + Scheduler run grouped subtasks when `FEATURE_TFGRPO_GROUP` is set; tests: `orchestrator/tests/TaskManager.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`. Evidence: grouped vitest run with `FEATURE_TFGRPO_GROUP=1 TFGRPO_GROUP_SIZE=2` (`.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`).

- **Update — 2025-11-21:** First full tfgrpo-learning loop captured guardrail evidence and prompt-pack stamps under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; guardrail suite (build/lint/test/eval/spec-guard) passed under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.

### Verification & Guardrails
- [x] Diagnostics / tfgrpo-learning pipeline run recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (spec-guard passed).
- [x] Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist). Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.
- [ ] Reviewer hand-off via `npm run review` referencing the latest TF-GRPO manifest.

# Task List Snapshot — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

- **Update — 2025-11-14:** Toolkit re-run captured https://15th.plus-ex.com with runtime canvas/font propagation, ScrollSmoother loader macro, and manifest `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- **Update — Archive refreshed:** `.runs/.../artifacts` copied into `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` before pruning the run directory; README + loader script live in `reference/plus-ex-15th/`.
- **Notes:** Compliance permit `plus-ex-15th-2025-11-14` allows live asset mirroring+ScrollSmoother unlock for localhost validation only.

## Checklist Mirror
Mirror status with `tasks/0520-15th-plus-hi-fi.md` and `.agent/task/0520-15th-plus-hi-fi.md`. Cite the manifest + archive when flipping statuses.

### Capture & Runtime Propagation
- [x] Hi-fi toolkit run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- [x] Runtime metadata — `design/state.json` shows `runtimeCanvasColors`, `resolvedFonts`, `interactionScriptPath`, `interactionWaitMs` for plus-ex-15th; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/design/state.json`.

### Archive & Reference
- [x] Artifacts mirrored — `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` retains `design-toolkit/{context,tokens,styleguide,reference,diffs,motion}`; `.runs/.../artifacts` pruned for hygiene.
- [x] Reference README + loader — `reference/plus-ex-15th/README.md` documents serve command + archive pointer, `reference/plus-ex-15th/scripts/loader-scroll-macro.js` ships DOM-ready ScrollSmoother unlock.

### Validation & Doc Mirrors
- [x] Local validation — `npx serve ... -l 4173` + Playwright probe logged `{\"unlocked\":\"true\",\"sectionCount\":40}`; grep confirms no `/assets/assets/**` references.
- [x] Mirrors updated — `tasks/index.json`, `tasks/0520-15th-plus-hi-fi.md`, `.agent/task/0520-15th-plus-hi-fi.md`, `docs/design/notes/2025-11-13-15th-plus.md`, and `docs/TASKS.md` cite manifest + archive.

<!-- docs-sync:begin 0907-evaluation-diff-match -->
## Checklist Mirror
Mirror status with `tasks/tasks-0907-evaluation-diff-match.md` and `.agent/task/0907-evaluation-diff-match.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`) — Evidence: this PR.

### Validation (current state)
- [x] Confirm `diff-match` is silently skipped by the harness — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm `agentTask` is currently unused/no-op — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Confirm fixture mismatch for `backend-api-opt` (missing `package.json` / npm scripts) — Evidence: `docs/TECH_SPEC-evaluation-diff-match.md` (Validation Report).
- [x] Capture `npm run eval:test` baseline result — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-08-54-880Z-a2571bb6/manifest.json`.

### Implementation
- [x] Add `diff-match` to `evaluation/harness/types.ts` (runtime + TS types) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] Make unknown assertion types fail loudly (no silent skips) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Implement `diff-match` evaluator — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Diff baseline vs final contents for the scoped path.
  - Normalize unified diff headers (support `@@ ... @@` placeholder).
  - Match policy documented (`substring` vs `exact`) and tested.
- [x] Add `agentTask` support (minimal `WRITE|path|content` interpreter) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Update scenario loader validation for `patternAssertions` and `agentTask` shape — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] Add unit tests for `diff-match` normalization/matching and unknown assertion types — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Fixture + scenario alignment
- [x] Bring `evaluation/fixtures/node-api-nplus1` to parity with adapter expectations — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Add `package.json` + `npm run test` script.
  - Add baseline N+1 implementation plus tests that fail until optimized.
- [x] Align `evaluation/scenarios/backend-api-opt.json` to the fixture — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
  - Ensure `expectedDiff` matches the actual diff produced by the `agentTask` edit.
  - Ensure `agentTask` uses the fixture’s module format (`.js` extensions, TypeScript typing conventions) or update the fixture to match.
- [x] Add/extend `evaluation/tests/harness.test.ts` so `backend-api-opt` is exercised (and fails prior to implementation, passes after) — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.

### Guardrails & handoff (required before requesting review)
- [x] Run orchestrator diagnostics with `MCP_RUNNER_TASK_ID=0907-evaluation-diff-match` and record the manifest path — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-00-54-205Z-86e8e277/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run eval:test` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-35-138Z-0259e9fa/manifest.json`.
- [x] `npm run docs:check` passes — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
- [x] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0907-evaluation-diff-match/cli/2025-12-17T06-39-59-393Z-761fbaf3/manifest.json`.
<!-- docs-sync:end 0907-evaluation-diff-match -->

<!-- docs-sync:begin 0908-diff-budget-followups -->
## Checklist Mirror
Mirror status with `tasks/tasks-0908-diff-budget-followups.md` and `.agent/task/0908-diff-budget-followups.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this PR.
- [x] Validation report captured — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0908-diff-budget-followups.md`) — Evidence: this PR.

### Validation (baseline)
- [x] Confirm CI runs diff budget but has no explicit label-based override wiring — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm no automated tests exist for `scripts/diff-budget.mjs` — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.
- [x] Confirm `README.md` does not document diff-budget expectations or the recommended `NOTES="<goal + summary + risks>" npm run review` invocation — Evidence: `docs/findings/validation-tasks-0908-diff-budget-followups.md`.

### Follow-ups (implementation)

#### CI override path (without weakening default gate)
- [x] Add an explicit CI override path for diff-budget (PR label + required reason surfaced in logs). — Evidence: `.github/workflows/core-lane.yml:29`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `.github/workflows/core-lane.yml`, `scripts/diff-budget.mjs`
  - Acceptance:
    - With no override label, diff-budget failure fails CI (default gate stays strict).
    - With override label + reason present, CI exports `DIFF_BUDGET_OVERRIDE_REASON` and diff-budget exits successfully (with the override reason visible in logs).
    - With override label present but reason missing/empty, CI fails loudly with an actionable message.
  - Verification:
    - Add workflow-level checks (e.g., `echo` step summary) so the override is auditable from the run logs.

#### Diff-budget test coverage
- [x] Add tests for `scripts/diff-budget.mjs` (commit-scoped mode, untracked-too-large failure, ignore list, override reason). — Evidence: `tests/diff-budget.spec.ts:1`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `scripts/diff-budget.mjs`, `tests/` (new test file)
  - Acceptance:
    - Tests cover:
      - `--commit <sha>` mode
      - untracked-too-large measurement issue handling
      - ignore list behavior (`package-lock.json`, `.runs/`, `out/`, etc.)
      - override reason behavior (`DIFF_BUDGET_OVERRIDE_REASON`)
    - Tests run under `npm run test` and would fail if diff-budget regresses.

#### README updates (diff-budget + review handoff)
- [x] Update `README.md` to document diff-budget expectations and the recommended `NOTES="<goal + summary + risks>" npm run review` invocation. — Evidence: `README.md:154`, `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
  - Files: `README.md`, `scripts/run-review.ts`
  - Acceptance:
    - README documents: what diff-budget is, how CI selects base (`BASE_SHA`), how to run locally, and how to override with `DIFF_BUDGET_OVERRIDE_REASON`.
    - README documents the recommended `NOTES="<goal + summary + risks>" npm run review` handoff pattern.

### Guardrails & handoff (required before requesting review)
- [x] Implementation-gate run captured (spec-guard/build/lint/test/docs:check + review) — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Guardrails pass — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
- [x] Reviewer handoff uses explicit context — Evidence: `.runs/0908-diff-budget-followups/cli/2025-12-18T14-04-26-998Z-f327e342/manifest.json`.
<!-- docs-sync:end 0908-diff-budget-followups -->

<!-- docs-sync:begin 0913-orchestrator-refactor-roadmap -->
## Checklist Mirror
Mirror status with `tasks/tasks-0913-orchestrator-refactor-roadmap.md` and `.agent/task/0913-orchestrator-refactor-roadmap.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0913-orchestrator-refactor-roadmap.md`, `tasks/index.json`) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL), `out/0913-orchestrator-refactor-roadmap/state.json`.
- [x] `tasks/index.json` gate metadata updated with implementation gate manifest - Evidence: `tasks/index.json`, `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-46-07-459Z-704d0f35/manifest.json`.

### Refactor phases (implementation roadmap)
- [x] Phase 1: Manifest correctness + atomic write safety (tests first, then refactor). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-33-05-345Z-a9de5673/manifest.json`.
- [x] Phase 2: Single-writer manifest persistence (coalescing persister; route direct `saveManifest` calls through it). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-10-07-477Z-d616c709/manifest.json`.
- [x] Phase 3: Bounded exec event capture (opt-in first; preserve full `.ndjson` logs/handles). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-21-58-308Z-786b9c13/manifest.json`.
- [x] Phase 4: Execution mode resolution consolidation (no behavior change; keep existing precedence). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T09-30-43-115Z-c8450274/manifest.json`.
- [x] Phase 5: Metrics + env hygiene (reduce metrics bloat; remove `process.env` leakage with compatibility window). - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json`.

### Guardrails (for future implementation PRs)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run build` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run lint` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run test` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run docs:check` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T12-00-35-931Z-e2fe1006/manifest.json` (implementation gate).
<!-- docs-sync:end 0913-orchestrator-refactor-roadmap -->
