# PRD Overview — Codex Orchestrator Projects

## Governance Update 2025-10-16
- Task 0911 PRD approval recorded — `.runs/0911-orchestrator-status-ui/cli/2025-12-23T07-59-47-613Z-344689f5/manifest.json`.
- Task 0932 PRD approval recorded — `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-12-04-477Z-51bd9a65/manifest.json`.


## Task 0932 — Orchestrator Performance & Reliability Loop
- Primary Doc: `docs/PRD-orchestrator-performance-reliability.md`
- Run Manifest Link: `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-12-04-477Z-51bd9a65/manifest.json`.
- Metrics / State Snapshots: `.runs/0932-orchestrator-performance-reliability/metrics.json`, `out/0932-orchestrator-performance-reliability/state.json`.
- Checklist Mirror: `tasks/tasks-0932-orchestrator-performance-reliability.md`, `docs/TASKS.md` (0932 section), `.agent/task/0932-orchestrator-performance-reliability.md`.
- Mini-spec: `tasks/specs/0932-orchestrator-performance-reliability.md`.

## Task 0918 — Subagent Delegation Enforcement
- Primary Doc: `docs/PRD-subagent-delegation-enforcement.md`
- Run Manifest Link: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.
- Metrics / State Snapshots: `.runs/0918-subagent-delegation-enforcement/metrics.json`, `out/0918-subagent-delegation-enforcement/state.json`.
- Checklist Mirror: `tasks/tasks-0918-subagent-delegation-enforcement.md`, `docs/TASKS.md` (0918 section), `.agent/task/0918-subagent-delegation-enforcement.md`.

## Task 0801 — Dead Code Pruning & Evidence
- Primary Doc: `docs/PRD-dead-code-pruning.md`
- Run Manifest Link: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- Metrics / State Snapshots: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`.
- Checklist Mirror: `tasks/tasks-0801-dead-code-pruning.md`, `docs/TASKS.md` (0801 section), `.agent/task/<id>-<slug>.md` _(create if automation requires)_. 
- CI/Test Coverage: run `npm run lint`, `npm run test`, and `node scripts/spec-guard.mjs --dry-run` before removal; add `npm run build` when touching orchestrator packages.

## Task 0901 — Orchestrator Issue Validation & Prioritization
- Primary Doc: `docs/PRD-orchestrator-issue-validation.md`
- Run Manifest Link: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics / State Snapshots: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- Checklist Mirror: `tasks/tasks-0901-orchestrator-issue-validation.md`, `docs/TASKS.md` (0901 section). `.agent/task/<id>-<slug>.md` _(create when activating automation)_.

## Task 0909 — Orchestrator Run Reporting Consistency
- Primary Doc: `docs/PRD-orchestrator-run-reporting-consistency.md`
- Run Manifest Link: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- Metrics / State Snapshots: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- Checklist Mirror: `tasks/tasks-0909-orchestrator-run-reporting-consistency.md`, `docs/TASKS.md` (0909 section), `.agent/task/0909-orchestrator-run-reporting-consistency.md`.

## Task 0910 — Docs Review Gate (Pre/Post Implementation)
- Primary Doc: `docs/PRD-docs-review-gate.md`
- Run Manifest Link: _(pending — capture docs-review run under `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0910-docs-review-gate/metrics.json` and `out/0910-docs-review-gate/state.json`)._
- Checklist Mirror: `tasks/tasks-0910-docs-review-gate.md`, `docs/TASKS.md` (0910 section), `.agent/task/0910-docs-review-gate.md`.

## Task 0911 — Orchestrator Status UI
- Primary Doc: `docs/PRD-orchestrator-status-ui.md`
- Canonical PRD: `tasks/0911-prd-orchestrator-status-ui.md`
- Run Manifest Link: `.runs/0911-orchestrator-status-ui/cli/2025-12-24T05-07-59-073Z-e6a472e8/manifest.json`.
- Metrics / State Snapshots: _(pending — populate `.runs/0911-orchestrator-status-ui/metrics.json` and `out/0911-orchestrator-status-ui/state.json`)._
- Checklist Mirror: `tasks/tasks-0911-orchestrator-status-ui.md`, `docs/TASKS.md` (0911 section), `.agent/task/0911-orchestrator-status-ui.md`.

## Task 0913 — Orchestrator Refactor Roadmap (Robustness + Performance)
- Primary Doc: `docs/PRD-orchestrator-refactor-roadmap.md`
- Run Manifest Link: `.runs/0913-orchestrator-refactor-roadmap/cli/2025-12-26T08-11-25-461Z-6ba85057/manifest.json` _(status: `succeeded`)._
- Metrics / State Snapshots: `.runs/0913-orchestrator-refactor-roadmap/metrics.json` (JSONL; one entry per run), `out/0913-orchestrator-refactor-roadmap/state.json` (latest snapshot)
- Checklist Mirror: `tasks/tasks-0913-orchestrator-refactor-roadmap.md`, `docs/TASKS.md` (0913 section), `.agent/task/0913-orchestrator-refactor-roadmap.md`.
- Mini-spec: `tasks/specs/0913-orchestrator-refactor-roadmap.md`.

## Task 0904 — README vs Codebase Alignment
- Primary Doc: `docs/PRD-readme-codebase-alignment.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0904-readme-codebase-alignment/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0904-readme-codebase-alignment/metrics.json` and `out/0904-readme-codebase-alignment/state.json`)._
- Checklist Mirror: `tasks/tasks-0904-readme-codebase-alignment.md`, `docs/TASKS.md` (0904 section), `.agent/task/0904-readme-codebase-alignment.md`.

## Task 0905 — Agentic Coding Readiness & Onboarding Hygiene
- Primary Doc: `docs/PRD-agentic-coding-readiness.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0905-agentic-coding-readiness/metrics.json` and `out/0905-agentic-coding-readiness/state.json`)._
- Checklist Mirror: `tasks/tasks-0905-agentic-coding-readiness.md`, `docs/TASKS.md` (0905 section), `.agent/task/0905-agentic-coding-readiness.md`.

## Task 0707 — Codex Orchestrator Simplification & Build Slimdown
- Primary Doc: `docs/PRD-codex-orchestrator-slimdown.md`
- Run Manifest Link: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- Metrics / State Snapshots: _(pending — populate `.runs/0707-orchestrator-slimdown/metrics.json` and `out/0707-orchestrator-slimdown/state.json`)._
- Checklist Mirror: `tasks/tasks-0707-orchestrator-slimdown.md`, `docs/TASKS.md` (0707 section), `.agent/task/0707-orchestrator-slimdown.md`.
- CI/Test Coverage: documented core lane (`npm run build`, `npm run lint`, `npm run test`) vs. labeled/path-triggered full matrix (`npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional deps installed); release/RC = full matrix; local core baseline with full matrix when touching adapters/evaluation/design/patterns or prepping releases.

## Task 0303 — Codex Orchestrator Autonomy Enhancements
- Primary Doc: `docs/PRD-codex-orchestrator-autonomy.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` as execution begins)._ 
- Checklist Mirror: `tasks/tasks-0303-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`, `docs/TASKS.md` (0303 section).

## Task 0505 — More Nutrition Pixel Archive
- Primary Doc: `tasks/0505-more-nutrition-pixel.md`
- Run Manifest Link: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`
- Archive Path: `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` *(directory pruned locally after 2025-11-09 cleanup; rerun toolkit if raw assets are needed again)*
- Findings / Deltas: `docs/findings/more-nutrition.md`
- Checklist Mirror: `.agent/task/0505-more-nutrition-pixel.md`, `docs/TASKS.md` (0505 section)

---

# PRD — Codex Orchestrator Resilience Hardening (Task 0202)

## Summary
- Problem Statement: Transient lock contention, unbounded heartbeat writes, and unrestricted command output buffering can corrupt run history or exhaust resources when orchestrator pipelines overlap.
- Desired Outcome: Harden persistence and telemetry paths so concurrent runs remain durable, heartbeat updates stay safe, and captured output stays within predictable limits.

## Goals
- Guarantee `TaskStateStore` records run history even when a lock file already exists by introducing bounded retries with backoff.
- Eliminate unhandled promise rejections from heartbeat maintenance by awaiting manifest/heartbeat writes and throttling manifest churn.
- Cap stdout/stderr buffers and truncate command error payloads to keep artifacts and memory usage within safe limits (≤64 KiB per stream, ≤8 KiB per error detail).

## Non-Goals
- Replacing the local filesystem persistence model or introducing a database-backed store.
- Designing new pipeline stages or changing approval workflows beyond documenting heartbeat behaviour updates.
- Shipping UI dashboards for run artifacts (tracked under a separate enablement effort).

## Stakeholders
- Product: Platform Enablement (Alex Rivera)
- Engineering: Orchestrator Reliability (Jamie Chen)
- Design: N/A — CLI-only scope

## Metrics & Guardrails
- Primary Success Metrics: 0 missed state snapshots across 50 concurrent pipeline runs; <1% heartbeat write failures observed in diagnostics runs.
- Guardrails / Error Budgets: Heartbeat/manifest writes must complete within 10 seconds; error files capped to 10 KB on disk to prevent bloating reviews.

## User Experience
- Personas: Platform engineers running diagnostics, reviewers inspecting manifests, automation agents tailing `.heartbeat`.
- User Journeys: 
  - Engineer launches diagnostics, orchestrator retries lock acquisition transparently, manifest updates proceed without rejections.
  - Reviewer opens error artifacts that remain concise and readable despite failures.

## Technical Considerations
- Architectural Notes: Extend `TaskStateStore` with retry/backoff; restructure `PersistenceCoordinator` to persist manifests even if snapshots are skipped; sequence heartbeat writes via awaited async tasks with a 30s manifest throttle.
- Dependencies / Integrations: No new external services. Continues to rely on Node.js `fs/promises` and existing CLI entrypoints.

## Documentation & Evidence
- Run Manifest Link: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
- Metrics / State Snapshots: `.runs/0202-orchestrator-hardening/metrics.json`, `out/0202-orchestrator-hardening/state.json` (updated 2025-10-31).

## Open Questions
- Should state snapshot retries escalate to warnings in manifest summaries when exhausted?
- Do we need configurable limits for stdout/stderr truncation per project?

## Approvals
- Product: _(pending)_
- Engineering: _(pending)_
- Design: N/A
