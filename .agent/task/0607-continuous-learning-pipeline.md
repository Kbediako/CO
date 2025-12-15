# Task List — Continuous Learning Pipeline (0607)

## Context
- Link to PRD: `tasks/0607-prd-continuous-learning-pipeline.md`
- Summary of scope: Automate post-approval learning runs (harvester → runner → crystalizer) with local snapshot storage, auto validation + heuristic/manual scenario synthesis, alerting, and pattern governance rooted in `.agent/patterns`.
- Auto trigger: Set `LEARNING_PIPELINE_ENABLED=1` (and optionally `LEARNING_SNAPSHOT_DIR=<abs-path>`) to run harvester + validation immediately after successful CLI stages.
- Validation batching policy: validate per-task by default; allow grouped runs only when tasks touch the same service within 24h and record grouping id + membership in the manifest. Other batching requires a change request.

### Checklist Convention
- Keep `[ ]` until acceptance criteria are met; flip to `[x]` only after attaching the manifest path under `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json` that proves completion.

## Parent Tasks
1. **Harvester snapshot integrity + alerting**  
   Owner: Task 0607 DRI
   - Subtask: Immutable snapshot + queue metadata
     - Files: Harvester trigger in agent runtime, queue payload definitions, `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`
     - Commands: `npx codex-orchestrator start diagnostics --format json` (to seed manifest), `npm run test` (harvester/queue coverage)
     - Acceptance: Manifest records `learning.snapshot.{tag,commit_sha,tarball_path,tarball_digest,storage_path,retention_days}` with copies under `learning-snapshots/<task-id>/<run-id>.tar.gz`; queue jobs include prompt/diff/history pointers and `learning.queue.payload_path`; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
   - Subtask: Failure handling + alerts for `snapshot_failed`/`stalled_snapshot`
     - Files: Harvester retry/backoff logic, notification hooks, `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`
     - Commands: `npm run test` (failure state coverage)
     - Acceptance: `snapshot_failed` retries (max 2) with alerts to Slack `#learning-alerts` and PagerDuty service `learning-pipeline`; `stalled_snapshot` captures git status/logs, blocks auto-requeue until approver noted, alerts via same channels; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
2. **Runner scenario synthesis / manual flow**  
   Owner: Runner Lead
   - Subtask: Heuristic scenario synthesis
     - Files: `tfgrpo-runner` (or equivalent) scenario builder, execution history ingestion, `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`
     - Commands: `npm run test` (scenario synthesis), targeted runner harness
     - Acceptance: Scenarios pull from execution history > prompt > diff > templates; synthesized `learning/scenario.json` stored in manifest (`learning.scenario.path`); validation auto-runs and logs to `learning/scenario-validation.log` (`learning.validation.log_path`) with status `validated` or failure states; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
   - Subtask: Manual scenario fallback + requeue
     - Files: `.agent/task/templates/manual-scenario-template.md`, runner requeue path, `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`
     - Commands: `npm run test` (manual fallback gating)
     - Acceptance: After two heuristic failures, job marked `needs_manual_scenario`, partial scenario written to manifest, alert emitted to Slack `#learning-alerts` (PagerDuty `learning-pipeline` only if severity P2+ policy applies); requeue requires completed manual template + approver id logged; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
3. **Crystalizer**  
   Owner: Knowledge Capture Lead
   - Subtask: Pattern generation to `.agent/patterns/staging/`
     - Files: Crystalizer script, `.agent/patterns/staging/**`, `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`
     - Commands: `npm run lint`, `npm run test` (crystalizer format), `node scripts/spec-guard.mjs --dry-run`
     - Acceptance: Validated patches produce Markdown with Problem/Solution/Rationale via OpenAI `gpt-4o` + prompt pack `prompt-packs/crystalizer-v1`, enforcing $0.50/run budget; file lands in candidates with manifest link; no writes outside `.agent/patterns`; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
4. **Pattern governance**  
   Owner: Librarian/Reviewer
   - Subtask: Candidate review + promotion/deprecation
     - Files: `.agent/patterns/{staging,active,deprecated}/`, `docs/` (links only), `.runs/0607-continuous-learning-pipeline/metrics.json`
     - Commands: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`
     - Acceptance: Governance documented; promotions/deprecations recorded with approver + manifest path; repo docs only link to canonical files; Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
   - Subtask: Safety-first metrics + alerting
     - Files: Metrics emitters, `.runs/0607-continuous-learning-pipeline/metrics.json`, `out/0607-continuous-learning-pipeline/state.json`
     - Commands: `npm run test` (telemetry), metrics aggregation script if added
     - Acceptance: Metrics prioritize validation pass/fail, reviewer rejection/latency, regression detection, pattern hygiene; throughput tracked after safety metrics; alerts fire on `snapshot_failed`, `stalled_snapshot`, `needs_manual_scenario` to Slack `#learning-alerts` (+ PagerDuty for P2+ when applicable); Evidence: `.runs/0607-continuous-learning-pipeline/cli/<run-id>/manifest.json`.
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.

## Relevant Files
- `tasks/0607-prd-continuous-learning-pipeline.md`, `docs/TECH_SPEC-continuous-learning-pipeline.md`, `.agent/task/0607-continuous-learning-pipeline.md`, `.runs/0607-continuous-learning-pipeline/**`, `.agent/patterns/**`, `.agent/task/templates/manual-scenario-template.md`

## Notes
- `.agent/patterns` remains the only canonical pattern store; repo docs may link back but must not host canonical copies.
- Use the manual scenario template for any `needs_manual_scenario` requeue; capture approver metadata in the manifest.
- Maintain safety-first sequencing for metrics and alerts (validation + reviewer safeguards + regression detection + pattern hygiene before throughput).
