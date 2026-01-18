# PRD - Recursive Language Model Orchestrator (Task 0105)

## Status (Legacy)
This PRD reflects the original iterative RLM scope. True RLM (symbolic context + planner/subcalls) shipped under task 0951. Use:
- `docs/PRD-delegation-rlm-quick-wins.md`
- `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
- `docs/FOLLOWUP-0951-true-rlm-symbolic.md`

## Summary
- Problem Statement: Codex can act as an orchestrator today, but the repo’s capabilities are locked inside this codebase and require heavyweight setup. We need a portable RLM loop (self-refine + tool recursion + optional role splits) that can run against any repo with minimal setup and produce auditable artifacts.
- Desired Outcome: Ship an RLM runner that works via `npx` in any repo, can optionally run as a pipeline, and stops on validator pass while supporting longer-horizon runs (subagents/role splits).

## Goals
- Provide a top-level CLI entrypoint (proposed: `codex-orchestrator rlm "<goal>"`) that runs from any repo without local setup.
- Offer a pipeline-backed mode (`rlm`) so the run can be monitored via `start/resume/status` and manifests are captured.
- Support self-refine / critique loops and tool-augmented recursion.
- Optional role split (planner / critic / reviser) with subagent support when available.
- Validator gate auto-detected by default; allow explicit override.
- Default max iterations = 88; allow `0` or `unlimited`/`unbounded`/`infinite`/`infinity` for unbounded iterations, with safety brakes via a time cap.
- Default max minutes = 48 hours; users can override via `--max-minutes` / `RLM_MAX_MINUTES` (set `0` to disable the time cap only when a validator is present; if the validator is absent and iterations are unbounded, the time cap cannot be disabled and `0` exits 5).
- Define task-id resolution for ad-hoc runs (flag/env fallback with safe default).

## Non-Goals
- Perfect validator inference for all ecosystems.
- Training/fine-tuning or persistent model learning.
- A full new agent framework; we reuse the existing orchestrator runtime.

## Stakeholders
- Product: Codex orchestration platform
- Engineering: Orchestrator maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - % runs that terminate because the validator passed.
  - Median iterations to pass.
  - Time-to-first-signal (validator detected within N seconds).
- Guardrails / Error Budgets:
  - Default iteration cap (88) unless explicitly overridden.
  - Tool calls are recorded in manifests; no hidden side effects.
  - Validator selection is explainable (prints reason + evidence/signals).
  - Auto-detect failure is explicit: in non-interactive runs exit non-zero with guidance; in TTY prompt for `--validator "<cmd>"` or `--validator none`.

## User Experience
- Personas:
  - Agents or automation tasks that need a reliable “keep improving until tests pass” loop.
  - Developers running `npx` in arbitrary repos.
- User Journeys:
  - Run: `npx -y @kbediako/codex-orchestrator rlm "Fix failing tests"` (defaults `task-id` to `rlm-<repo-name>` when not provided).
  - Override: `--task rlm-<repo-name> --validator "npm test" --max-iterations 20 --roles triad`.
  - Monitor: `codex-orchestrator status --run <run-id> --watch` (pipeline-backed run id printed on start).
  - Monitor via pipeline-backed runs (manifests captured in `.runs/<task-id>/cli/<run-id>/`).

## Technical Considerations
- Implementation should reuse the existing `exec` runtime and manifest system.
- RLM runner should be packaged with the published tarball (no repo-only scripts required).
- The built-in `rlm` pipeline is always available; a repo-local `codex.orchestrator.json` overrides it only if it defines `rlm`.
- `codex-orchestrator rlm` is a blocking wrapper over `start <pipeline-id>` (same run-id and manifest behavior; `start <pipeline-id>` follows existing `start` semantics unless a wait mode is added). The built-in pipeline id is `rlm`.
- Task-id resolution order: `--task` flag → `MCP_RUNNER_TASK_ID` → `rlm-<repo-name>` (sanitized); fallback to `rlm-adhoc` if repo name is unavailable.
- Validator detection must be isolated and testable.
- RLM artifacts are stored per run under `.runs/<task-id>/cli/<run-id>/rlm/` (metrics remain per-task in `.runs/<task-id>/metrics.json`; summaries in `out/<task-id>/state.json`).

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-rlm-orchestrator.md`
- Action Plan: `docs/ACTION_PLAN-rlm-orchestrator.md`
- Task checklist: `tasks/tasks-0105-rlm-orchestrator.md`
- Mini-spec: `tasks/specs/0105-rlm-orchestrator.md`
- Run Manifest (docs review): `.runs/0105-rlm-orchestrator/cli/2026-01-04T17-25-13-940Z-0db8bb3c/manifest.json`
- Exit code details: see `docs/TECH_SPEC-rlm-orchestrator.md`

## Open Questions
- Should we ship a separate alias binary (e.g., `codex-rlm`) alongside the main CLI?
- Time-based guardrail defaults to 48 hours; consider shorter presets for CI or release configs.
- How do we best expose subagent usage across different Codex runtimes?

## Approvals
- Product: pending
- Engineering: pending
- Design: N/A
