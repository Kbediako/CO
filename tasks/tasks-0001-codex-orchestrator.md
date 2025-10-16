# Task List — Codex-Orchestrator

## Added by Orchestrator 2025-10-16

## Context
- Link to PRD: `tasks/0001-prd-codex-orchestrator.md`
- Summary of scope: Build the Codex-Orchestrator guardrailed workflow, covering SOP artifacts, Agents SDK manager/builder/tester implementation, MCP-driven automation, learning libraries, adapters, evaluation harness, and CI guardrails.

## Parent Tasks
1. Governance & Approvals Alignment
   1. Secure PRD approval sign-off
      - Files: `tasks/0001-prd-codex-orchestrator.md`, `docs/PRD.md`
      - Commands: `n/a`
      - Acceptance: Product, Engineering, and Design approvals recorded with dates in both canonical and mirror artifacts.
   2. Calibrate phase gates & logging
      - Files: `.agent/SOPs/specs-and-research.md`, `.ai-dev-tasks/process-task-list.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: SOPs updated (if needed) to reference orchestrator phases; `/tasks/index.json` reflects gate statuses and audit log location notes.

2. Technical Architecture & Mini-Spec Authorization
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0001-orchestrator-architecture.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Approved mini-spec stub created referencing PRD and agent architecture triggers; index entry added with `last_review` date ≤30 days.
   2. Elaborate manager/peer roles with sequence diagrams
      - Files: `docs/TECH_SPEC.md`, `tasks/specs/0001-orchestrator-architecture.md`
      - Commands: `n/a`
      - Acceptance: Technical spec details manager, planner, builder, tester, reviewer roles; includes Mermaid/ASCII flow and public interface definitions.
   3. Detail MCP vs Codex SDK integration plan
      - Files: `docs/TECH_SPEC.md`, `scripts/run-local-mcp.sh`
      - Commands: `n/a`
      - Acceptance: Spec explains deterministic MCP server usage and Codex Cloud parallelism options with guardrail requirements.

3. Orchestrator Core Implementation
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0002-orchestrator-core.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Approved spec describing manager orchestration logic, handoff contracts, and persistence plan.
   2. Scaffold manager and agents using Agents SDK
      - Files: `orchestrator/src/manager.ts`, `orchestrator/src/agents/*.ts`, `orchestrator/tests`
      - Commands: `npm install`, `npm run lint`, `npm test`
      - Acceptance: Manager delegates to planner/builder/tester/reviewer; tests cover handoff scenarios; lint and unit tests pass.
   3. Persist run artifacts and logging
      - Files: `orchestrator/src/persistence/*.ts`, `.runs/README.md`
      - Commands: `npm test -- --runInBand orchestrator/tests/persistence.test.ts`
      - Acceptance: Artifacts stored under `.runs` or `/out`, with configurable retention and documented in README.

4. Learning Library & Patterns Ecosystem
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0003-learning-library.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Spec defines codemod/linter/template scope, versioning, and adoption workflow.
   2. Seed codemods, linter rules, templates
      - Files: `patterns/codemods/*.ts`, `patterns/linters/*.ts`, `patterns/templates/*.md`
      - Commands: `npm run build:patterns`, `npm test -- patterns`
      - Acceptance: At least two codemods and one linter rule compiled and tested; templates documented for reuse.
   3. Document learning ingestion flow
      - Files: `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`
      - Commands: `n/a`
      - Acceptance: Spec and plan describe how new learnings enter the library and sync with Codex Cloud workspaces.

5. Adapters & Evaluation Harness
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0004-adapters-evaluation.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Spec covers adapter schema, build/test commands, evaluation harness interfaces, and data handling.
   2. Implement language adapters & configs
      - Files: `adapters/<language>/build-test-configs`, `scripts/run-parallel-goals.ts`
      - Commands: `node scripts/run-parallel-goals.ts --dry-run`
      - Acceptance: Adapters define per-stack build/test commands; parallel goals script orchestrates ≥2 simulated runs.
   3. Build evaluation harness & fixtures
      - Files: `evaluation/harness/index.ts`, `evaluation/fixtures/**/*`
      - Commands: `npm run eval:test`
      - Acceptance: Harness applies patterns/adapters to sample repos; fixtures stored; evaluation tests pass in CI.

6. Guardrails, CI, and Documentation Rollout
   1. Configure spec guard and CI workflow
      - Files: `scripts/spec-guard.sh`, `.github/workflows/spec-guard.example.yml`
      - Commands: `bash scripts/spec-guard.sh --dry-run`, `npm run lint`
      - Acceptance: Spec guard script enforces mini-spec freshness; CI workflow outlined with commented triggers.
   2. Document operational playbooks & approvals
      - Files: `AGENTS.md`, `.agent/readme.md`, `.agent/SOPs/*.md`
      - Commands: `n/a`
      - Acceptance: Docs describe build/test commands, approval modes, MCP registration, and external repo pointers.
   3. Prepare release notes & human-facing snapshots
      - Files: `docs/ACTION_PLAN.md`, `docs/TECH_SPEC.md`, `docs/PRD.md`
      - Commands: `n/a`
      - Acceptance: Action plan finalized with milestones, owners, risks; mirrors reference canonical artifacts with latest statuses.

## Relevant Files
- `tasks/0001-prd-codex-orchestrator.md`
- `tasks/index.json`
- `.ai-dev-tasks/generate-tasks.md`
- `.agent/task/templates/tasks-template.md`
- `docs/TECH_SPEC.md`
- 2025-10-16 Governance Summary: PRD approvals recorded (Jordan Lee, Priya Desai, Mateo Alvarez); gate metadata updated with log anchor `tasks/0001-prd-codex-orchestrator.md#approval-log-2025-10-16` and run ID GOV-0001-PRD-20251016.

## Notes
- Spec Requirements: Mini-specs required before implementing orchestration core, learning library, adapters/evaluation, and architecture decisions.
- Approvals Needed: PRD (Product/Engineering/Design), mini-spec approvals, technical spec sign-off, CI guardrail confirmation.
- Links: Codex platform docs, Agents SDK overview, MCP specification.
