# Technical Spec — Continuous Learning Pipeline (Task 0607)

## Overview
- Objective: Automate the “Work → Approve → Learn → Crystalize” loop so completed tasks trigger snapshot capture, validation, and pattern crystalization into the canonical library.
- In Scope: Harvester trigger + immutable snapshots, runner scenario synthesis with manual fallback, validation + failure states (`snapshot_failed`, `stalled_snapshot`), alerting, crystalizer output to `.agent/patterns`, safety-first telemetry, and governance for candidate/active/deprecated patterns.
- Out of Scope: New UI/dashboards, training bespoke ML models beyond the crystalizer LLM call, or cross-repo deployment orchestration.

## Architecture & Design
### Current State
- Learning runs are manual; `tfgrpo-runner` needs explicit invocation and lacks snapshot integrity checks.
- Pattern storage exists but does not auto-ingest validated learnings; `.agent/patterns` is canonical but not automatically populated from runs.

### Proposed Changes
- **Harvester:** Detect task completion, tag the repo with `learning-snapshot-<uuid>` (or tarball digest) plus `SnapshotCommitSHA`, and enqueue `(SnapshotID, Diff, Prompt, ExecutionHistory, manifestPath)` for validation. Persist snapshot metadata alongside queue records for runner verification. Snapshot tarballs (when used) stored in S3 bucket `learning-snapshots` with 30-day lifecycle; git tags remain in-repo for traceability.
- **Runner + Scenario Synthesis:** Extend `tfgrpo-runner` (or equivalent pipeline) to infer scenarios from execution history, diffs, and stack templates. If heuristics fail twice, emit `needs_manual_scenario`, write partial `scenario.json` to the manifest, and require a reviewer to fill `.agent/task/templates/manual-scenario-template.md` before requeue.
- **Validation:** Replay synthesized scenarios, record results + exit codes. On checkout/apply failures, set `stalled_snapshot`, attach git status/logs, and block automatic retries until a human requeues with explicit approver metadata.
- **Crystalizer:** Use an LLM helper (provider: `gpt-5.1-codex-max` by default, prompt pack `prompt-packs/crystalizer-v1` with stamped hash) to produce Markdown patterns from validated patches + PRD context, writing to `.agent/patterns/candidates/` with `Problem/Solution/Rationale` sections. Per-run token/cost budget: $0.50 max; abort and alert if exceeded. Model may be overridden via `CRYSTALIZER_MODEL`. A Codex CLI-backed client is available (`createCodexCliCrystalizerClient`) for environments that rely on Codex login instead of OpenAI API keys.
- **Validation Batching:** Default to per-task validation. Allow opt-in grouped runs only when multiple tasks touch the same service within 24h; record grouping id + membership in the manifest. No other batching permitted without a change request.
- **Governance:** Keep `.agent/patterns` as canonical; candidates remain in `candidates/` until reviewed/promoted to `active/` or moved to `deprecated/`. `docs/patterns` may link only.

### Data Flow
1. Completion detected → Harvester tags snapshot and records `{TagName, SnapshotCommitSHA, TarballDigest}`; if tarball used, uploads to `s3://learning-snapshots/<task-id>/<run-id>.tar.gz` with 30-day retention metadata.
2. Harvester enqueues validation job with pointers to diff, prompt, execution history, and manifest path.
3. Runner verifies snapshot integrity against recorded metadata; failures mark `snapshot_failed`, retry with backoff (max 2), then alert operators.
4. Scenario synthesis uses execution history > prompt > diff > stack templates; on repeated failure, flag `needs_manual_scenario`, alert, and wait for manual template completion + requeue.
5. Runner executes validation; if checkout/apply fails, set `stalled_snapshot`, persist logs, and halt until human approval per `.agent/SOPs/incident-response.md`.
6. Successful validation produces best patch + signals; crystalizer emits pattern to `.agent/patterns/candidates/` and links back to run manifest.
7. Librarian/reviewer promotes or deprecates patterns inside `.agent/patterns`, with optional doc links in `docs/patterns/`.

### Data Persistence / State Impact
- Snapshots referenced by git tag + optional tarball digest; tarballs live in `s3://learning-snapshots` with 30-day lifecycle policy. Every run manifest under `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json` must record `{TagName, SnapshotCommitSHA, TarballDigest, s3Uri}` alongside verification hashes and outcomes (`snapshot_failed`, `stalled_snapshot`, `needs_manual_scenario`, `validated`).
- Queue/runner outputs and scenarios recorded in `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`; metrics aggregated in `.runs/0607-continuous-learning-pipeline/metrics.json`.
- Patterns stored only under `.agent/patterns/{candidates,active,deprecated}/`; any `docs/patterns` entry must point back to the canonical file.

### External Dependencies
- Git for tagging/checkouts; local tarball utility for snapshots.
- Existing `tfgrpo-runner`/validation harness; `.agent/task/templates/manual-scenario-template.md` for manual requeues.
- LLM provider for crystalizer; Slack `#learning-alerts` and PagerDuty service `learning-pipeline` for alerts.

## Operational Considerations
- Failure Modes:
  - `snapshot_failed`: tag/tarball/queue errors → retry (max 2) with backoff, log in manifest, alert `#learning-alerts` (Slack) and create PagerDuty incident for severity ≥P2 via service `learning-pipeline`.
  - `stalled_snapshot`: runner cannot checkout/apply → persist git status/logs, block auto-retry, require human requeue referencing incident-response SOP with approver id; alert `#learning-alerts` + PagerDuty `learning-pipeline`.
  - `needs_manual_scenario`: heuristics exhausted → emit partial `scenario.json`, alert `#learning-alerts`, and require manual template completion + signed requeue path in manifest (no PagerDuty unless policy escalates to P2+).
- Observability & Telemetry: Track safety-first metrics (validation pass/fail with root causes, reviewer rejection rate + latency for candidates, regression catches, pattern hygiene/deprecations). Throughput (pattern count/reuse) captured only after safety metrics. Emit alerts on failure states; store metrics in `.runs/0607-continuous-learning-pipeline/metrics.json` and summarize in `out/0607-continuous-learning-pipeline/state.json`.
- Security / Privacy: Snapshots and manifests must exclude secrets; redact env values in manual templates; ensure tarballs respect ignore lists. Restrict crystalizer inputs to approved repo state only.
- Performance Targets: Snapshot tagging should complete <1 minute on typical repos; runner executes asynchronously without blocking primary task completion; retries bounded to avoid queue thrash.

## Testing Strategy
- Unit / Integration: Cover harvester snapshot tagging + metadata persistence, queue payload shape, runner snapshot verification, heuristic scenario synthesis (including fallbacks), manual requeue gating, and crystalizer output format to `.agent/patterns/candidates/`.
- Tooling / Automation: Maintain guardrail commands (`node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`) in manifests for this task; add focused harness runs for validation scenarios.
- Rollback Plan: Feature-flag auto-learning; disable harvester trigger to revert to manual runs; clear queued jobs referencing deprecated snapshots while preserving manifests for audit.

## Documentation & Evidence
- Linked PRD: `tasks/0607-prd-continuous-learning-pipeline.md`
- Run Manifest Link: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json` (seed during first diagnostics/validation run).
- Metrics / State Snapshots: `.runs/0607-continuous-learning-pipeline/metrics.json`, `out/0607-continuous-learning-pipeline/state.json`.

## Policies
- Validation granularity: per-task by default; grouped runs allowed only for tasks touching the same service within 24h and must be logged with grouping id/membership in the manifest. Exemptions require a change request.

## Approvals
- Engineering:
- Reviewer:
