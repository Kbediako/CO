# PRD Snapshot — Codex Orchestrator Interactive HUD (0407-orchestrator-interactive-hud)

## Problem Statement
The orchestrator run loop lacks a cohesive, real-time view of pipeline progress; users rely on tailing logs/manifests without structured context, making long or parallel runs hard to monitor. No lightweight event surface mirrors existing persistence updates, so adding visibility risks divergence from manifests/metrics.

## Goals
- Add a RunEvents layer that mirrors pipeline lifecycle (`runStarted`, `stageStarted`, `stageCompleted`, `runCompleted`, `runError`, `log`, optional `toolCall`) exactly where manifests/metrics already update.
- Deliver a read-only interactive HUD (Ink/React TUI) rendering header (TASK_ID/run id/status/elapsed), stage progress (pipeline + plan/build/test/review), rolling log tail, and footer hints without altering run semantics.
- Wire `--interactive`/`--ui` to `codex-orchestrator start|resume`, gating on TTY/TERM/CI and falling back to current behavior when disabled.
- Preserve manifest/metrics/summaries parity between interactive and non-interactive modes for identical inputs.

## Non-Goals
- Redesigning telemetry or persistence formats; avoid schema changes unless strictly necessary for event mirroring.
- Shipping aggressive controls (kill/abort) or changing approval/timeouts; optional controls are deferred.
- Building graphical GUIs or altering default CLI output when HUD is disabled.

## Success Metrics
- Interactive vs non-interactive runs produce byte-for-byte identical manifests/metrics for the same inputs (parity tests).
- HUD overhead adds ≤100 ms at stage transitions and does not drop log lines under stress.
- TTY detection correctly disables HUD in CI/non-TTY environments in ≥99% of observed runs.

## Risks
- Event ordering drift if hooks precede persistence writes; mitigate by emitting only after manifest/metric updates.
- False TTY/TERM detection leading to wrong mode; mitigate with explicit flag override plus environment checks.
- Performance regressions in log streaming; mitigate via bounded log tails and batched render updates.

## Milestones
- **M1 — Event Layer:** Define RunEvents API and emit lifecycle/log events at existing manifest touchpoints; add parity guards.
- **M2 — HUD:** Build read-only Ink TUI (header/body/log/footer) driven by RunEvents; cover view-model tests.
- **M3 — CLI Integration:** Add `--interactive/--ui`, TTY/TERM/CI gating, and fallback parity validation.
- **M4 — Guardrails:** Run diagnostics, spec-guard, lint/test, and capture manifests/metrics/state snapshots.

## Artifacts
- PRD: `docs/PRD-codex-orchestrator-interactive-hud.md`
- Technical Spec: `docs/TECH_SPEC-codex-orchestrator-interactive-hud.md`
- Action Plan: `docs/ACTION_PLAN-codex-orchestrator-interactive-hud.md`
- Checklist mirrors: `tasks/tasks-0407-orchestrator-interactive-hud.md`, `.agent/task/0407-orchestrator-interactive-hud.md`, `docs/TASKS.md`
- Evidence manifests: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`; metrics/state snapshots: `.runs/0407-orchestrator-interactive-hud/metrics.json`, `out/0407-orchestrator-interactive-hud/state.json`.
