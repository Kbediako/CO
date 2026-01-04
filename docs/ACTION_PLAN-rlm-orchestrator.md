# Action Plan - Recursive Language Model Orchestrator (Task 0105)

## Status Snapshot
- Current Phase: Planning collateral + docs-review.
- Run Manifest Link: `.runs/0105-rlm-orchestrator/cli/2026-01-04T17-25-13-940Z-0db8bb3c/manifest.json`.
- Metrics / State Snapshots: `.runs/0105-rlm-orchestrator/metrics.json`, `out/0105-rlm-orchestrator/state.json` (per-task rollups, after runs).
- Per-run RLM artifacts: `.runs/<task-id>/cli/<run-id>/rlm/`.
- Approvals / Escalations: None yet; safe `read/edit/run/network` profile expected.
- Mirror updates required: `docs/TASKS.md`, `.agent/task/0105-rlm-orchestrator.md`, `tasks/index.json`.

## Milestones & Tasks
1. Milestone: Planning collateral + docs-review
   - Tasks:
     - Draft PRD, tech spec, action plan, mini-spec, and checklist.
     - Run docs-review gate and record manifest evidence in mirrors (`docs/TASKS.md`, `.agent/task`, `tasks/index.json`).
2. Milestone: RLM runner MVP
   - Tasks:
     - Add `rlm` CLI entrypoint (wrapper) and pipeline definition.
     - Implement iteration loop with validator gate and artifacts.
     - Implement validator auto-detection (node/python/go/rust) + explicit override.
3. Milestone: Role splits + subagent support
   - Tasks:
     - Add `--roles triad` (planner/critic/reviser) with subagent hooks.
     - Add summary + artifact capture per role.
4. Milestone: Hardening + UX polish
   - Tasks:
     - Add optional time-based guardrail.
     - Improve validator explainability output.
     - Add JSON output format for external automation.
5. Milestone: Tests + fixtures
   - Tasks:
     - Validator detection unit tests.
     - Loop stop condition tests.
     - Minimal “done task” fixture + docs demo.

## Risks & Mitigations
- Risk: Validator auto-detect selects the wrong command.
  - Mitigation: Print selection reason + allow override.
- Risk: Infinite loops when `maxIterations=0`.
  - Mitigation: Optional time-based cap + explicit warnings.
- Risk: Subagent interface variance across Codex runtimes.
  - Mitigation: Fallback to single-agent emulation with role prompts.

## Next Review
- Date: 2026-01-05
- Agenda: Approve collateral, confirm CLI/pipeline shape, and agree on validator heuristics + stopping rules.
