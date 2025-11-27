# Action Plan — Codex Orchestrator Interactive HUD (Task 0407-orchestrator-interactive-hud)

## Status Snapshot
- Current Phase: Pre-implementation planning (RunEvents/HUD design finalized, no code merged).
- MCP_RUNNER_TASK_ID: 0407-orchestrator-interactive-hud
- Run Manifest Link: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json` (update if superseded by later guardrail runs).
- Metrics / State Snapshots (placeholders): `.runs/0407-orchestrator-interactive-hud/metrics.json`, `out/0407-orchestrator-interactive-hud/state.json`.
- Approvals / Escalations: None; maintain `read/edit/run/network` guardrail profile and record any escalation in manifests.

## Milestones & Tasks
1. Milestone: Event Layer
   - Define RunEvents API; emit lifecycle/log/toolCall events after manifest/metric updates; add parity unit tests.
2. Milestone: HUD Build
   - Implement Ink/React HUD (header/body/log/footer), bounded log tail, reducer-based state; add fake-emitter tests.
   - v1 HUD is read-only / observability-only; abort/pause/force-termination controls are out of scope and deferred to a follow-up task.
3. Milestone: CLI Wiring
   - Add `--interactive/--ui`, TTY/TERM/CI gating, fallback logging; verify interactive vs non-interactive manifest parity.
4. Milestone: Guardrails & Review
   - Run diagnostics; execute `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, (optional) `npm run eval:test`; capture review hand-off via `npm run review`.
   - Evidence manifests for this task (e.g., `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`) must be captured and referenced from `tasks/tasks-0407-orchestrator-interactive-hud.md` and `.agent/task/0407-orchestrator-interactive-hud.md` before any checkboxes are marked complete.

## Risks & Mitigations
- Event alignment drift: gate emissions after persistence updates and assert ordering in tests.
- TTY detection false positives/negatives: log skip reasons and allow explicit flag override.
- HUD performance under heavy logs: cap tail, batch renders, and profile before GA.

## Next Review
- Date: TBC during implementation kickoff.
- Agenda: Confirm RunEvents hook points, finalize HUD component boundaries, decide on any optional controls, and validate guardrail command plan with manifest references.
