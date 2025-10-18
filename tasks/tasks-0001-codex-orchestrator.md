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
      - [ ] Status: Pending — convert to [x] once approvals and dates are entered in `/tasks/0001-prd-codex-orchestrator.md` and `docs/PRD.md`.
   2. Calibrate phase gates & logging
      - Files: `.agent/SOPs/specs-and-research.md`, `.ai-dev-tasks/process-task-list.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: SOPs updated (if needed) to reference orchestrator phases; `/tasks/index.json` reflects gate statuses and audit log location notes.
      - [ ] Status: Pending — flip to [x] after gate metadata and SOP references are updated and logged in the run manifest.

2. Technical Architecture & Mini-Spec Authorization
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0001-orchestrator-architecture.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Approved mini-spec stub created referencing PRD and agent architecture triggers; index entry added with `last_review` date ≤30 days.
      - [ ] Status: Pending — switch to [x] once approvals are captured and `/tasks/index.json` reflects the refreshed `last_review`.
   2. Elaborate manager/peer roles with sequence diagrams
      - Files: `docs/TECH_SPEC.md`, `tasks/specs/0001-orchestrator-architecture.md`
      - Commands: `n/a`
      - Acceptance: Technical spec details manager, planner, builder, tester, reviewer roles; includes Mermaid/ASCII flow and public interface definitions.
      - [ ] Status: Pending — update to [x] when diagrams and role definitions are approved and cited in manifests.
   3. Detail MCP vs Codex SDK integration plan
      - Files: `docs/TECH_SPEC.md`, `scripts/run-local-mcp.sh`
      - Commands: `n/a`
      - Acceptance: Spec explains deterministic MCP server usage and Codex Cloud parallelism options with guardrail requirements.
      - [ ] Status: Pending — flip to [x] after the integration plan and guardrail guidance are published with manifest proof.

3. Orchestrator Core Implementation
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0002-orchestrator-core.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Approved spec describing manager orchestration logic, handoff contracts, and persistence plan.
      - [x] Completed 2025-10-16 — see `.runs/3/2025-10-16T02-28-10Z/manifest.json` for approval record.
   2. Scaffold manager and agents using Agents SDK
      - Files: `orchestrator/src/manager.ts`, `orchestrator/src/agents/*.ts`, `orchestrator/tests`
      - Commands: `npm install`, `npm run lint`, `npm test`
      - Acceptance: Manager delegates to planner/builder/tester/reviewer; tests cover handoff scenarios; lint and unit tests pass.
      - [x] Completed 2025-10-16 — validated via `.runs/3/2025-10-16T01-21-30Z/`, `.runs/3/2025-10-16T01-33-15Z/`, and `.runs/3/2025-10-16T01-41-05Z/` manifests.
   3. Persist run artifacts and logging
      - Files: `orchestrator/src/persistence/*.ts`, `.runs/README.md`
      - Commands: `npm test -- --runInBand orchestrator/tests/persistence.test.ts`
      - Acceptance: Artifacts stored under `.runs` or `/out`, with configurable retention and documented in README.
      - [x] Completed 2025-10-16 — see `.runs/3/2025-10-16T01-57-50Z/`, `.runs/3/2025-10-16T02-04-25Z/`, `.runs/3/2025-10-16T02-10-20Z/`, and `.runs/3/2025-10-16T02-17-35Z/` for lint/test logs and sync verification.

4. Learning Library & Patterns Ecosystem
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0003-learning-library.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Spec defines codemod/linter/template scope, versioning, and adoption workflow.
      - [ ] Status: Pending — change to [x] once the mini-spec is signed off and indexed with a fresh `last_review`.
   2. Seed codemods, linter rules, templates
      - Files: `patterns/codemods/*.ts`, `patterns/linters/*.ts`, `patterns/templates/*.md`
      - Commands: `npm run build:patterns`, `npm test -- patterns`
      - Acceptance: At least two codemods and one linter rule compiled and tested; templates documented for reuse.
      - [ ] Status: Pending — flip to [x] when build/test logs confirm the assets and manifests capture the evidence.
   3. Document learning ingestion flow
      - Files: `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`
      - Commands: `n/a`
      - Acceptance: Spec and plan describe how new learnings enter the library and sync with Codex Cloud workspaces.
      - [ ] Status: Pending — switch to [x] once documentation updates land with manifest links.

5. Adapters & Evaluation Harness
   1. Write/Update mini-spec and obtain approval
      - Files: `tasks/specs/0004-adapters-evaluation.md`, `/tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Spec covers adapter schema, build/test commands, evaluation harness interfaces, and data handling.
      - [ ] Status: Pending — convert to [x] after approvals land and manifests cite the spec review date.
   2. Implement language adapters & configs
      - Files: `adapters/<language>/build-test-configs`, `scripts/run-parallel-goals.ts`
      - Commands: `node scripts/run-parallel-goals.ts --dry-run`
      - Acceptance: Adapters define per-stack build/test commands; parallel goals script orchestrates ≥2 simulated runs.
      - [ ] Status: Pending — flip to [x] once the dry-run demonstrates ≥2 jobs and logs are attached.
   3. Build evaluation harness & fixtures
      - Files: `evaluation/harness/index.ts`, `evaluation/fixtures/**/*`
      - Commands: `npm run eval:test`
      - Acceptance: Harness applies patterns/adapters to sample repos; fixtures stored; evaluation tests pass in CI.
      - [ ] Status: Pending — switch to [x] when evaluation runs pass with manifest evidence.

6. Guardrails, CI, and Documentation Rollout
   1. Configure spec guard and CI workflow
      - Files: `scripts/spec-guard.sh`, `.github/workflows/spec-guard.example.yml`
      - Commands: `bash scripts/spec-guard.sh --dry-run`, `npm run lint`
      - Acceptance: Spec guard script enforces mini-spec freshness; CI workflow outlined with commented triggers.
      - [ ] Status: Pending — change to [x] once dry-run logs and workflow documentation are captured in the run manifest.
   2. Document operational playbooks & approvals
      - Files: `AGENTS.md`, `.agent/readme.md`, `.agent/SOPs/*.md`
      - Commands: `n/a`
      - Acceptance: Docs describe build/test commands, approval modes, MCP registration, and external repo pointers.
      - [ ] Status: Pending — flip to [x] when docs are updated and manifests link the underlying diff/logs.
   3. Prepare release notes & human-facing snapshots
      - Files: `docs/ACTION_PLAN.md`, `docs/TECH_SPEC.md`, `docs/PRD.md`
      - Commands: `n/a`
      - Acceptance: Action plan finalized with milestones, owners, risks; mirrors reference canonical artifacts with latest statuses.
      - [ ] Status: Pending — switch to [x] once release notes are live and evidence is logged.

7. MCP Runner Enhancements
   1. Draft MCP runner durability mini-spec & route for approval
      - Files: `tasks/specs/0005-mcp-runner-enhancements.md`, `tasks/index.json`
      - Commands: `n/a`
      - Acceptance: Mini-spec captures directory migration, heartbeat/resume, and metrics scope; reviewers sign off with dates recorded in spec and `tasks/index.json`.
      - Rationale: High-risk structural change touching persistence layout and long-lived processes requires spec review before implementation.
      - [ ] Status: Pending — flip to [x] when approvals and manifests (e.g., `.runs/0001/<timestamp>/manifest.json`) document the sign-off.
   2. Migrate MCP artifacts to `.runs/0001/mcp/<run-id>` with compatibility pointers
      - Files: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-migrate.js`, `.runs/README.md`
      - Commands: `node scripts/mcp-runner-migrate.js --dry-run`, `node scripts/mcp-runner-migrate.js`, `scripts/mcp-runner-start.sh --format json`
      - Acceptance: New runs write to task-scoped directories, legacy path exposes redirect or symlink, migration log stored under `.runs/0001/migrations/`. Manifest includes `task_id`, `artifact_root`, `compat_path`.
      - Rationale: Persistence change directly affects reviewer workflows; captured under spec-controlled implementation.
      - [ ] Status: Pending — switch to [x] after migration run manifests (e.g., `.runs/0001/migrations/<timestamp>.log`) and post-migration run evidence are recorded.
   3. Implement heartbeat and resume-token support for detached runs
      - Files: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`
      - Commands: `scripts/mcp-runner-start.sh --format json`, `scripts/mcp-runner-start.sh --resume <run-id>`, `scripts/mcp-runner-poll.sh <run-id> --watch`
      - Acceptance: Manifest updates `heartbeat_at` within 15s cadence, stale heartbeat flagged after 30s, resume command reattaches and appends `resume_events`.
      - Rationale: Operational risk is high for long-lived sessions; requires coordinated rollout alongside spec-controlled migration.
      - [ ] Status: Pending — flip to [x] once resume flow is validated and manifests plus run logs are attached.
   4. Publish MCP runner metrics artifacts
      - Files: `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-metrics.js`, `.runs/0001/metrics.json`
      - Commands: `scripts/mcp-runner-start.sh`, `node scripts/mcp-runner-metrics.js --summarize`
      - Acceptance: Each completed run appends metrics entry; summary file reports success rate and guardrail coverage with 95% reviewer-readiness indicator.
      - Rationale: Medium-high impact for telemetry and review automation; owned alongside spec scope to satisfy PRD goal.
      - [ ] Status: Pending — convert to [x] when metrics artifacts exist and manifests cite the summary refresh.
   5. Add JSON polling output mode
      - Files: `scripts/mcp-runner-poll.sh`, `scripts/agents_mcp_runner.mjs`
      - Commands: `scripts/mcp-runner-poll.sh <run-id> --format json`
      - Acceptance: Poll command emits machine-readable JSON with heartbeat age, command statuses, and manifest path; textual output remains default.
      - Rationale: Low-risk CLI enhancement; tracked as direct implementation task without mini-spec.
      - [ ] Status: Pending — switch to [x] after recorded run demonstrates JSON output saved in `.runs/0001/<run-id>/poll.json`.
   6. Capture structured error artifacts for malformed tool responses
      - Files: `scripts/agents_mcp_runner.mjs`, `.runs/README.md`
      - Commands: `scripts/mcp-runner-start.sh --command "bash -lc 'exit 2'" --format json`
      - Acceptance: Failed commands write `errors/<command-index>-<slug>.json` capturing raw tool payload and error summary, referenced from manifest.
      - Rationale: Medium impact on reviewer diagnostics; safe to deliver as implementation task once metrics groundwork lands.
      - [ ] Status: Pending — flip to [x] with manifests linking error artifacts and logged validation run.
   7. Automate diagnostics suggestion on guardrail failure
      - Files: `scripts/run-mcp-diagnostics.sh`, `scripts/agents_mcp_runner.mjs`
      - Commands: `scripts/run-mcp-diagnostics.sh --no-watch`, `scripts/mcp-runner-start.sh`
      - Acceptance: Runner prints guidance to invoke diagnostics script when guardrail command missing/failing and records recommendation in manifest summary.
      - Rationale: Low-risk UX follow-up improving reviewer handoff; no mini-spec required.
      - [ ] Status: Pending — mark complete once manifest evidence and runner log snippet are attached.
   8. Pin Agents SDK versions for MCP compatibility
      - Files: `package.json`, `package-lock.json`
      - Commands: `npm install`, `npm run lint`
      - Acceptance: `@openai/agents-*` dependencies pinned to approved range; manifest documents version audit and lint/test pass.
      - Rationale: Addresses PRD risk about SDK drift; implementation task coordinated with diagnostics rollout.
      - [ ] Status: Pending — switch to [x] after dependency updates merge with manifest evidence.
   9. Document MCP timeout and error-handling code paths
      - Files: `tasks/0001-prd-codex-orchestrator.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`
      - Commands: `n/a`
      - Acceptance: Canonical PRD and mirrors reference `scripts/agents_mcp_runner.mjs:70-180` timeout/error logic with links or line anchors; manifests capture reviewer acknowledgement.
      - Rationale: Resolves PRD open question on documenting timeout behavior for future spec drift checks; low implementation risk.
      - [ ] Status: Pending — flip to [x] when documentation diff and manifest evidence are recorded.

## Relevant Files
- `tasks/0001-prd-codex-orchestrator.md`
- `tasks/index.json`
- `.ai-dev-tasks/generate-tasks.md`
- `.agent/task/templates/tasks-template.md`
- `docs/TECH_SPEC.md`
- 2025-10-16 Governance Summary: PRD approvals recorded (Jordan Lee, Priya Desai, Mateo Alvarez); gate metadata updated with log anchor `tasks/0001-prd-codex-orchestrator.md#approval-log-2025-10-16` and run ID GOV-0001-PRD-20251016.

## Notes
- Checklist Convention (2025-10-16): Track each parent task and subtask with a `[ ]` checkbox until it is completed, then flip it to `[x]` while citing the run manifest or log that proves the result.
- 2025-10-16: Architecture steward approved mini-spec and technical spec; review decisions capture cloud-sync worker, Vault credential broker, and mode policy updates (see tasks/specs/0001-orchestrator-architecture.md#review-decisions-2025-10-16 and tasks/specs/tech-spec-0001-codex-orchestrator.md#13-review-decisions-2025-10-16).
- Spec Requirements: Mini-specs required before implementing orchestration core, learning library, adapters/evaluation, and architecture decisions.
- Approvals Needed: PRD (Product/Engineering/Design), mini-spec approvals, technical spec sign-off, CI guardrail confirmation.
- Links: Codex platform docs, Agents SDK overview, MCP specification.
- Follow-ups: Monitor `/out/audit.log` growth and tune manifest read/backoff thresholds if production environments exhibit higher latency.
