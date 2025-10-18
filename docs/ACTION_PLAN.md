# **Action Plan — Codex-Orchestrator**

> **Source Context:** tasks/0001-prd-codex-orchestrator.md, tasks/tasks-0001-codex-orchestrator.md, tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> **Status:** Updated 2025-10-16 — Milestones M1–M3 complete with guardrails and documentation signed off.

## Status Snapshot — 2025-10-16
- **Canonical sources:** `tasks/0001-prd-codex-orchestrator.md`, `tasks/tasks-0001-codex-orchestrator.md`, `tasks/specs/tech-spec-0001-codex-orchestrator.md` (all with `last_review` 2025-10-16).
- **Run evidence:** `.runs/3/*` (orchestrator core), `.runs/4/*` (learning library), `.runs/5/*` (evaluation harness), `.runs/6/2025-10-16T18-49-34Z` (spec guard, lint, eval harness for documentation rollout).
- **Open follow-up:** None — Task 6 documentation mirrors and release notes approved (see `.runs/6/2025-10-16T18-49-34Z/manifest.json` capturing spec guard, lint, and eval harness validations).

## Update — 2025-10-18 MCP Runner Enhancements
- Drafted `tasks/specs/0005-mcp-runner-enhancements.md` to manage task-scoped run directory migration, heartbeat/resume tokens, and metrics aggregation; approvals pending.
- Added checklist Section 7 tasks for migration execution, heartbeat/resume implementation, metrics emission, JSON poll output, structured error artifacts, diagnostics prompts, Agents SDK version pinning, and timeout/error-path documentation.
- Migration tooling will create `.runs/0001/mcp/<run-id>/` with compatibility pointers so reviewers can audit new manifests without breaking existing scripts.
- Metrics targets support the PRD goal of 95% reviewer coverage from artifacts; low-risk items (JSON poll, diagnostics prompt, SDK pin, timeout doc) proceed as implementation tasks without additional specs.
- Log rotation and retry automation remain deferred pending telemetry from the new metrics artifacts.

## Local MCP Harness Usage — Update 2025-10-18
- **Preconditions:** Install and authenticate the Codex CLI, ensure Node.js ≥18 is available (for `npx`), and maintain optional `jq` if you want pretty-printed manifests. No background process is required; the harness is launched per session.
- **Automation shortcut:** `scripts/run-mcp-diagnostics.sh` now wraps the Agents SDK runner. It spawns `scripts/agents_mcp_runner.mjs`, sets `client_session_timeout_seconds=3600`, executes build/lint/test/spec-guard through Codex, and tails progress until completion. The command prints the run id plus `.runs/local-mcp/<run-id>/manifest.json`.
- **Manual start & poll:** Use `scripts/mcp-runner-start.sh --timeout 7200 --approval-policy never` to enqueue a session without blocking, then `scripts/mcp-runner-poll.sh <run-id> --watch` to monitor. Each run directory contains `manifest.json`, `runner.log`, and per-command response JSON (one file per diagnostic).
- **Extended sessions & resilience:** The runner hosts `scripts/run-local-mcp.sh` via `MCPServerStdio`, eliminating the two-minute CLI timeout and persisting state between poll calls. Progress updates write back to the manifest after each command so mid-run monitoring never requires restarting diagnostics.
- **Customization:** Pass `--command "<cmd>"` flags to `node scripts/agents_mcp_runner.mjs start` to add extra MCP actions, or override `--timeout` if longer build/test cycles are expected. All work still flows through Codex MCP tools.
- **Cross-repo reuse:** To bootstrap another repository, copy `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`, and ensure `scripts/run-local-mcp.sh` exists. No `mcp-client.json` is required—the runner invokes the MCP server directly.
- **Workflow integration:** Builder/tester agents continue to operate solely through Codex MCP edits; manifests under `.runs/` remain the audit log for reviewers validating spec guard status before flipping checklist items to `[x]`.
- **Quick reference checklist:**
  1. Confirm Codex CLI auth and run `npm install` so the Agents SDK dependencies (`@openai/agents`, `@modelcontextprotocol/sdk`) are available; optionally export `OPENAI_API_KEY` for tracing.
  2. Run `scripts/run-mcp-diagnostics.sh` (or `scripts/mcp-runner-start.sh`) with the desired approval policy and timeout.
  3. Poll progress via `scripts/mcp-runner-poll.sh <run-id> --watch` or inspect `manifest.json` directly.
  4. Attach the `.runs/local-mcp/<run-id>/manifest.json` path to the relevant checklist entry before marking it complete.

## Milestone M1 — Skeleton Orchestrator & MCP Demo
- Objective: Establish repo scaffolding with working Agents SDK manager, handoffs, and local MCP demo editing one file end-to-end.
- Tasks:
  1. Reviewer — Secure approvals for architecture mini-spec (`tasks/specs/0001-orchestrator-architecture.md`); Acceptance: spec status set to `in-progress`→`done` in `/tasks/index.json`, approval signatures captured; Effort: 0.5 day; Risks: stakeholder misalignment → Mitigation: host quick walkthrough before sign-off.
  2. Manager — Draft orchestrator core mini-spec (`tasks/specs/0002-orchestrator-core.md`) and route for approval; Acceptance: spec stub created, approvals captured, `/tasks/index.json` updated with `last_review` ≤30 days; Effort: 1 day; Risks: unclear persistence requirements → Mitigation: validate with security and platform leads before submission.
  3. Manager — Finalize bootstrap instructions and approval workflow notes in `AGENTS.md`; Acceptance: approvals captured, SOP hooks documented; Effort: 1 day; Risks: SOP drift → Mitigation: schedule quick security review. **Status:** Completed; see `AGENTS.md` (2025-10-16 update) and `.runs/6/2025-10-16T18-19-14Z/diff.patch`.
  4. Builder — Implement manager/builder/tester stubs in `orchestrator/src` and wire to `codex mcp-server`; Acceptance: `scripts/run-local-mcp.sh` executes demo edit producing diff artifact; Effort: 3 days; Risks: MCP config mismatch → Mitigation: add dry-run validation script.
  5. Tester — Author smoke tests under `orchestrator/tests` validating MCP run plus lint/test commands; Acceptance: `npm test` green with recorded logs in `.runs/`; Effort: 2 days; Risks: flaky MCP responses → Mitigation: cache fixtures, add retry logic.

## Milestone M2 — Parallel Goals & Learning Library
- Objective: Enable Codex Cloud parallelism and seed learning assets (≥2 codemods, 1 linter) with adapters.
- Tasks:
  1. Reviewer — Draft and approve learning library mini-spec (`tasks/specs/0003-learning-library.md`); Acceptance: spec added to `/tasks/index.json` with `last_review` ≤30 days and approval signatures captured; Effort: 0.5 day; Risks: scope creep → Mitigation: limit first iteration to two codemods + one linter.
  2. Manager — Configure Codex Cloud workspace integration and document approval toggles; Acceptance: `scripts/run-parallel-goals.ts --dry-run` enumerates planned jobs; Effort: 2 days; Risks: approval misconfiguration → Mitigation: require dry-run sign-off before live runs.
  3. Builder — Implement codemods/linters/templates under `patterns/` with reusable APIs; Acceptance: assets versioned and sample usage recorded in `/tasks/index.json`; Effort: 4 days; Risks: regressions on target repos → Mitigation: add rollback notes and fixture coverage.
  4. Reviewer — Validate learning ingestion SOP and update `docs/TECH_SPEC.md` & `docs/TASKS.md`; Acceptance: documentation references new assets and guardrails; Effort: 1 day; Risks: knowledge silos → Mitigation: host recorded walkthrough for contributors. **Status:** Completed; see `.runs/4/2025-10-16T02-50-35Z/manifest.json` and `docs/TECH_SPEC.md` updates dated 2025-10-16.

### Learning Library Ingestion Flow (Update 2025-10-16)
1. Author new assets in `patterns/`, update `patterns/index.json`, and stage before/after examples in README tables.
2. Run `npm run build:patterns` and `npm test -- patterns`; attach logs to `.runs/<task>/<run>/` alongside `diff.patch`.
3. Record approvals and highlights in the run manifest, referencing the learning-library mini-spec (`tasks/specs/0003-learning-library.md`).
4. Notify the cloud-sync worker to mirror metadata into Codex Cloud learning catalogs; reviewer signs off using `patterns/templates/run-manifest-checklist.md`.

## Milestone M3 — Guardrails, CI, Evaluation Harness
- Objective: Lock guardrails in CI and prove orchestrator across sample repos with evaluation harness.
- Tasks:
  1. Reviewer — Prepare adapters/evaluation mini-spec (`tasks/specs/0004-adapters-evaluation.md`) and secure approval; Acceptance: spec registered with status `planned`→`done` and approvals recorded; Effort: 0.5 day; Risks: unclear adapter scope → Mitigation: review adapter catalog with platform leads.
  2. Builder — Implement `scripts/spec-guard.sh` and `.github/workflows/spec-guard.example.yml`; Acceptance: dry-run blocks missing/stale specs and CI workflow documented; Effort: 2 days; Risks: false positives → Mitigation: allow override flag with approval logging. **Status:** Completed; see `.runs/6/2025-10-16T18-19-14Z/manifest.json`.
  3. Tester — Develop evaluation harness in `evaluation/` applying learning assets to two open-source repos; Acceptance: `npm run eval:test` passes, results stored in `.runs/`; Effort: 3 days; Risks: fixture drift → Mitigation: version fixture snapshots and schedule refresh. **Status:** Completed; see `.runs/5/2025-10-16T18-52-00Z/` + `.runs/5/2025-10-16T18-59-30Z/`.
  4. Reviewer — Compile release notes and update `docs/ACTION_PLAN.md`, `docs/PRD.md`, `docs/TECH_SPEC.md` with final statuses; Acceptance: human-facing docs note completion metrics and approvals; Effort: 1 day; Risks: misaligned messaging → Mitigation: cross-check with state manifests before publication. **Status:** Completed 2025-10-16 — see `.runs/6/2025-10-16T18-49-34Z/manifest.json` for stakeholder approval, including spec guard, lint, and eval harness runs.
