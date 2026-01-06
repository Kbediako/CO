# Action Plan — Orchestrator Performance & Reliability Loop 2

## Status Snapshot
- Current Phase: Validation + Handoff
- Run Manifest Link: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T11-18-00-343Z-6ee17f0e/manifest.json`
- Post-change diagnostics manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-37-07-569Z-4f1a7a79/manifest.json`
- Post-change RLM manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T10-02-37-053Z-a853796a/manifest.json`
- Metrics / State Snapshots: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`

This Action Plan is a living document. Keep **Progress**, **Surprises & Discoveries**, **Decision Log**, and **Outcomes & Retrospective** up to date.

## Progress
- [x] (2026-01-06) Drafted PRD/TECH_SPEC/ACTION_PLAN and captured docs-review evidence.
- [x] (2026-01-06) Diagnostics + RLM baseline captured; hotspot identified (metrics aggregation full-file reads).
- [x] (2026-01-06) ExecPlan guidance applied to PRD/TECH_SPEC/ACTION_PLAN (evidence + idempotence sections).
- [x] (2026-01-06) Capture before/after runtime + manifest write counts in Artifacts and Notes.
- [x] (2026-01-06) Implemented streaming aggregation + atomic writes; added crash-safe newline guard + regression tests. Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T11-18-00-343Z-6ee17f0e/manifest.json`.
- [x] (2026-01-06) Re-ran diagnostics + RLM; confirm improvement. Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-37-07-569Z-4f1a7a79/manifest.json`, `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T10-02-37-053Z-a853796a/manifest.json`.
- [x] (2026-01-06) Run implementation gate and link evidence.
- [x] (2026-01-06) Write Outcomes & Retrospective.

## Surprises & Discoveries
- Observation (pre-fix): `RLM_MAX_ITERATIONS=unlimited` failed parsing in `rlmRunner` (expected numeric), so the rerun used the existing `0` sentinel plus a time budget when the validator is disabled. `rlmRunner` now accepts `unlimited`/`unbounded` aliases.
  Evidence: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-38-29-984Z-19f2ff13/manifest.json`, `~/.oracle/sessions/rlm-max-iterations/output.log`.
- Observation: Metrics aggregation must guard missing trailing newline to avoid JSON concatenation on append; added newline guard + truncated-line tolerance.
  Evidence: `orchestrator/src/cli/metrics/metricsAggregator.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/tests/MetricsAggregator.test.ts`, `~/.oracle/sessions/metrics-agg-review/output.log`.

## Decision Log
- Decision: Treat `RLM_MAX_ITERATIONS=0` as the unlimited sentinel for the rerun, with `RLM_MAX_MINUTES=10` since validator is disabled.
  Rationale (at the time): `rlmRunner` only accepted numeric values; using the existing sentinel avoided scope creep while honoring the unlimited intent (per Oracle guidance).
  Date/Author: 2026-01-06 / Codex.

## Milestones & Tasks
1. Discovery + Baseline
   - Run diagnostics (subagent + main if both are available).
   - Run RLM pipeline with a performance-focused goal.
   - Capture hotspot summary and candidate fixes.
   - Review codex exec plan guidance (Oracle) and map adoption steps into docs/specs.
2. Targeted Improvements
   - Implement 1–3 high-impact, low-risk changes (initial focus: metrics aggregation streaming + atomic writes).
   - Add or update tests/benchmarks to guard against regressions.
3. Validation + Handoff
   - Run implementation gate (spec-guard → build → lint → test → docs checks → diff budget → review).
   - Update task mirrors and governance log with manifest evidence.

## Concrete Steps (Non-Interactive)
Baseline (already captured; re-run as needed with a new `<run-id>`):
- `MCP_RUNNER_TASK_ID=0939-orchestrator-performance-reliability-loop-2 CODEX_NON_INTERACTIVE=1 npx codex-orchestrator start diagnostics --format json --no-interactive --task 0939-orchestrator-performance-reliability-loop-2`
- `MCP_RUNNER_TASK_ID=0939-orchestrator-performance-reliability-loop-2 CODEX_NON_INTERACTIVE=1 RLM_GOAL="Identify the next top performance/reliability hotspot in orchestrator pipelines (focus on persistence, metrics, manifests, exec, scheduler) and propose 3-5 low-risk fixes with target files/tests." RLM_MAX_ITERATIONS=1 RLM_VALIDATOR=none npx codex-orchestrator start rlm --format json --no-interactive --task 0939-orchestrator-performance-reliability-loop-2`

Validation (post-change; diagnostics command same as baseline. RLM rerun used `RLM_MAX_ITERATIONS=0` + `RLM_MAX_MINUTES=10` per Decision Log).

Gate:
- `MCP_RUNNER_TASK_ID=0939-orchestrator-performance-reliability-loop-2 CODEX_NON_INTERACTIVE=1 NOTES="Goal: Validate loop-2 changes | Summary: <fill in> | Risks: <fill in> | Questions (optional): <fill in>" npx codex-orchestrator start implementation-gate --format json --no-interactive --task 0939-orchestrator-performance-reliability-loop-2`

## Artifacts and Notes
- Baseline (docs-review) manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`
- Baseline diagnostics manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-51-26-814Z-8229d14a/manifest.json`
- Baseline RLM manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-53-37-814Z-c285a360/manifest.json`
- Post-change diagnostics manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-37-07-569Z-4f1a7a79/manifest.json`
- Post-change RLM manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T10-02-37-053Z-a853796a/manifest.json`
- Failed RLM (pre-fix unlimited parse) manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T09-38-29-984Z-19f2ff13/manifest.json`
- Implementation gate manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T11-18-00-343Z-6ee17f0e/manifest.json`
- Oracle review logs: `~/.oracle/sessions/metrics-agg-review/output.log`, `~/.oracle/sessions/rlm-max-iterations/output.log`
- Metrics summary: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`
- State snapshot: `out/0939-orchestrator-performance-reliability-loop-2/state.json`
- Baseline numbers: diagnostics duration 70.193s (manifest writes not explicitly surfaced; command-handle count = 5 as proxy).
- Post-change numbers: diagnostics duration 70.167s (manifest writes not explicitly surfaced; command-handle count = 5 as proxy).

## Idempotence and Recovery
- Re-running baseline/validation should produce a new `<run-id>` without corrupting prior evidence.
- If a step fails mid-run, re-run the same command; avoid manual artifact edits.
- If metrics regress, revert the isolated commit(s) for fast rollback.

## Outcomes & Retrospective
- What we changed: streamed metrics aggregation, atomic aggregate writes, newline guard before append, truncated-line tolerance, regression tests for streaming + atomic writes.
- Measured impact: diagnostics duration effectively flat (70.193s -> 70.167s); reliability improved for partial writes + newline edge cases.
- Follow-ups / next loop candidate: ExperienceStore scan/caching for prompt injection and TaskStateStore run-history I/O; consider exposing manifest write counts in metrics for future loops.

## Risks & Mitigations
- Risk: perf fixes introduce regressions. Mitigation: keep diffs small, add targeted tests, validate with implementation gate.
- Risk: RLM loop makes unexpected changes. Mitigation: review diffs and revert non-essential edits.
