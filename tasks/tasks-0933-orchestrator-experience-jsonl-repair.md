# Task 0933 - ExperienceStore JSONL Line Repair

- MCP Task ID: `0933-orchestrator-experience-jsonl-repair`
- Primary PRD: `docs/PRD-orchestrator-experience-jsonl-repair.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-experience-jsonl-repair.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-experience-jsonl-repair.md`
- Mini-spec: `tasks/specs/0933-orchestrator-experience-jsonl-repair.md`
- Run Manifest (docs review): `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-26-16-547Z-91ff2f7d/manifest.json`
- Metrics/State: `.runs/0933-orchestrator-experience-jsonl-repair/metrics.json`, `out/0933-orchestrator-experience-jsonl-repair/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-orchestrator-experience-jsonl-repair.md`, `docs/TECH_SPEC-orchestrator-experience-jsonl-repair.md`, `docs/ACTION_PLAN-orchestrator-experience-jsonl-repair.md`, `tasks/tasks-0933-orchestrator-experience-jsonl-repair.md`, `tasks/specs/0933-orchestrator-experience-jsonl-repair.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0933-orchestrator-experience-jsonl-repair-scout/cli/2026-01-05T18-23-27-725Z-b3dcce02/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-26-16-547Z-91ff2f7d/manifest.json`, `docs/TASKS.md`, `.agent/task/0933-orchestrator-experience-jsonl-repair.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0933-orchestrator-experience-jsonl-repair/metrics.json`, `out/0933-orchestrator-experience-jsonl-repair/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-27-56-032Z-7c590fdf/manifest.json`, `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-29-14-158Z-3055a7e3/manifest.json`, `tasks/tasks-0933-orchestrator-experience-jsonl-repair.md`.

### Implementation
- [x] Targeted reliability fix + tests applied - Evidence: code changes, `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-48-07-086Z-d1ec7ec4/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0933-orchestrator-experience-jsonl-repair/cli/2026-01-05T18-48-07-086Z-d1ec7ec4/manifest.json`.

## Hotspot Summary (RLM)
- ExperienceStore JSONL append can concatenate new records onto a partial trailing line after crashes, making subsequent records unreadable.

## Candidate fixes
- Ensure a trailing newline exists before appending new JSONL records.
- Add a regression test for partial-line append behavior.

## Relevant Files
- `orchestrator/src/persistence/ExperienceStore.ts`
- `orchestrator/tests/ExperienceStore.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0933-orchestrator-experience-jsonl-repair-*/cli/<run-id>/manifest.json`.
