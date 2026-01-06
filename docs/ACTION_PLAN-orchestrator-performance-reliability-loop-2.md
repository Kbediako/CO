# Action Plan — Orchestrator Performance & Reliability Loop 2

## Status Snapshot
- Current Phase: Discovery
- Run Manifest Link: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-53-37-814Z-c285a360/manifest.json`
- Metrics / State Snapshots: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`

This Action Plan is a living document. Keep **Progress**, **Surprises & Discoveries**, **Decision Log**, and **Outcomes & Retrospective** up to date.

## Progress
- [x] (2026-01-06) Drafted PRD/TECH_SPEC/ACTION_PLAN and captured docs-review evidence.
- [x] (2026-01-06) Diagnostics + RLM baseline captured; hotspot identified (metrics aggregation full-file reads).
- [x] (2026-01-06) ExecPlan guidance applied to PRD/TECH_SPEC/ACTION_PLAN (evidence + idempotence sections).
- [ ] Capture before/after runtime + manifest write counts in Artifacts and Notes.
- [ ] Implement smallest viable fix (streaming + atomic writes) and add regression guard.
- [ ] Re-run diagnostics + RLM; confirm improvement.
- [ ] Run implementation gate and link evidence.
- [ ] Write Outcomes & Retrospective.

## Surprises & Discoveries
- Observation:
  Evidence:

## Decision Log
- Decision:
  Rationale:
  Date/Author:

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

Validation (post-change; same commands as baseline).

Gate:
- `MCP_RUNNER_TASK_ID=0939-orchestrator-performance-reliability-loop-2 CODEX_NON_INTERACTIVE=1 NOTES="Goal: Validate loop-2 changes | Summary: <fill in> | Risks: <fill in> | Questions (optional): <fill in>" npx codex-orchestrator start implementation-gate --format json --no-interactive --task 0939-orchestrator-performance-reliability-loop-2`

## Artifacts and Notes
- Baseline (docs-review) manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`
- Baseline diagnostics manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-51-26-814Z-8229d14a/manifest.json`
- Baseline RLM manifest: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T06-53-37-814Z-c285a360/manifest.json`
- Metrics summary: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`
- State snapshot: `out/0939-orchestrator-performance-reliability-loop-2/state.json`
- Baseline numbers:
- Post-change numbers:

## Idempotence and Recovery
- Re-running baseline/validation should produce a new `<run-id>` without corrupting prior evidence.
- If a step fails mid-run, re-run the same command; avoid manual artifact edits.
- If metrics regress, revert the isolated commit(s) for fast rollback.

## Outcomes & Retrospective
- What we changed:
- Measured impact:
- Follow-ups / next loop candidate:

## Risks & Mitigations
- Risk: perf fixes introduce regressions. Mitigation: keep diffs small, add targeted tests, validate with implementation gate.
- Risk: RLM loop makes unexpected changes. Mitigation: review diffs and revert non-essential edits.
