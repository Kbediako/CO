# **Action Plan — Codex-Orchestrator**

> **Source Context:** tasks/0001-prd-codex-orchestrator.md, tasks/tasks-0001-codex-orchestrator.md, tasks/specs/tech-spec-0001-codex-orchestrator.md
>
> **Status:** Draft pending stakeholder approval (2025-10-16)

## Milestone M1 — Skeleton Orchestrator & MCP Demo
- Objective: Establish repo scaffolding with working Agents SDK manager, handoffs, and local MCP demo editing one file end-to-end.
- Tasks:
  1. Reviewer — Secure approvals for architecture mini-spec (`tasks/specs/0001-orchestrator-architecture.md`); Acceptance: spec status set to `in-progress`→`done` in `/tasks/index.json`, approval signatures captured; Effort: 0.5 day; Risks: stakeholder misalignment → Mitigation: host quick walkthrough before sign-off.
  2. Manager — Draft orchestrator core mini-spec (`tasks/specs/0002-orchestrator-core.md`) and route for approval; Acceptance: spec stub created, approvals captured, `/tasks/index.json` updated with `last_review` ≤30 days; Effort: 1 day; Risks: unclear persistence requirements → Mitigation: validate with security and platform leads before submission.
  3. Manager — Finalize bootstrap instructions and approval workflow notes in `AGENTS.md`; Acceptance: approvals captured, SOP hooks documented; Effort: 1 day; Risks: SOP drift → Mitigation: schedule quick security review.
  4. Builder — Implement manager/builder/tester stubs in `orchestrator/src` and wire to `codex mcp-server`; Acceptance: `scripts/run-local-mcp.sh` executes demo edit producing diff artifact; Effort: 3 days; Risks: MCP config mismatch → Mitigation: add dry-run validation script.
  5. Tester — Author smoke tests under `orchestrator/tests` validating MCP run plus lint/test commands; Acceptance: `npm test` green with recorded logs in `.runs/`; Effort: 2 days; Risks: flaky MCP responses → Mitigation: cache fixtures, add retry logic.

## Milestone M2 — Parallel Goals & Learning Library
- Objective: Enable Codex Cloud parallelism and seed learning assets (≥2 codemods, 1 linter) with adapters.
- Tasks:
  1. Reviewer — Draft and approve learning library mini-spec (`tasks/specs/0003-learning-library.md`); Acceptance: spec added to `/tasks/index.json` with `last_review` ≤30 days and approval signatures captured; Effort: 0.5 day; Risks: scope creep → Mitigation: limit first iteration to two codemods + one linter.
  2. Manager — Configure Codex Cloud workspace integration and document approval toggles; Acceptance: `scripts/run-parallel-goals.ts --dry-run` enumerates planned jobs; Effort: 2 days; Risks: approval misconfiguration → Mitigation: require dry-run sign-off before live runs.
  3. Builder — Implement codemods/linters/templates under `patterns/` with reusable APIs; Acceptance: assets versioned and sample usage recorded in `/tasks/index.json`; Effort: 4 days; Risks: regressions on target repos → Mitigation: add rollback notes and fixture coverage.
  4. Reviewer — Validate learning ingestion SOP and update `docs/TECH_SPEC.md` & `docs/TASKS.md`; Acceptance: documentation references new assets and guardrails; Effort: 1 day; Risks: knowledge silos → Mitigation: host recorded walkthrough for contributors.

## Milestone M3 — Guardrails, CI, Evaluation Harness
- Objective: Lock guardrails in CI and prove orchestrator across sample repos with evaluation harness.
- Tasks:
  1. Reviewer — Prepare adapters/evaluation mini-spec (`tasks/specs/0004-adapters-evaluation.md`) and secure approval; Acceptance: spec registered with status `planned`→`done` and approvals recorded; Effort: 0.5 day; Risks: unclear adapter scope → Mitigation: review adapter catalog with platform leads.
  2. Builder — Implement `scripts/spec-guard.sh` and `.github/workflows/spec-guard.example.yml`; Acceptance: dry-run blocks missing/stale specs and CI workflow documented; Effort: 2 days; Risks: false positives → Mitigation: allow override flag with approval logging.
  3. Tester — Develop evaluation harness in `evaluation/` applying learning assets to two open-source repos; Acceptance: `npm run eval:test` passes, results stored in `.runs/`; Effort: 3 days; Risks: fixture drift → Mitigation: version fixture snapshots and schedule refresh.
  4. Reviewer — Compile release notes and update `docs/ACTION_PLAN.md`, `docs/PRD.md`, `docs/TECH_SPEC.md` with final statuses; Acceptance: human-facing docs note completion metrics and approvals; Effort: 1 day; Risks: misaligned messaging → Mitigation: cross-check with state manifests before publication.
