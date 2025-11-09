# PRD Overview — Codex Orchestrator Projects

## Task 0303 — Codex Orchestrator Autonomy Enhancements
- Primary Doc: `docs/PRD-codex-orchestrator-autonomy.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` as execution begins)._ 
- Checklist Mirror: `tasks/tasks-0303-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`, `docs/TASKS.md` (0303 section).

## Task 0505 — More Nutrition Pixel Archive
- Primary Doc: `tasks/0505-more-nutrition-pixel.md`
- Run Manifest Link: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`
- Archive Path: `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/`
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
