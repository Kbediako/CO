# PRD — Codex Orchestrator Interactive HUD (Task 0407-orchestrator-interactive-hud)

## Summary
- Problem Statement: Operators of long-running orchestrator pipelines lack a structured, real-time view of run status; visibility depends on tailing logs/manifests and guessing progress.
- Desired Outcome: Provide a Gemini-style, read-only HUD that mirrors orchestrator lifecycle events without changing persistence semantics so interactive and non-interactive runs remain identical.

## Goals
- Add a RunEvents API that emits lifecycle/log/toolCall events at the same points where manifests, metrics, and summaries are already updated.
- Deliver a TUI (prefer Ink/React) that renders header (TASK_ID/run id/status/elapsed), stage progress (pipeline + plan/build/test/review), rolling log tail, and footer hints.
- Wire `--interactive`/`--ui` to `codex-orchestrator start|resume`, enabling HUD only when stdout/stderr are TTY, TERM is not `dumb`, and not running in CI; fall back to existing output otherwise.
- Guarantee parity: identical manifests/metrics/summaries between interactive and non-interactive runs for the same inputs.

## Non-Goals
- Redesigning telemetry stack, schema formats, or persistence; any event payloads mirror existing data only.
- Introducing aggressive controls (kill/abort) or altering approval/timeouts; optional controls are deferred.
- Shipping graphical GUI clients; scope is CLI/TUI only.

## Scope
- In Scope: RunEvents layer, read-only HUD rendering, CLI flag + TTY gating, parity validation, minimal HUD performance tuning.
- Out of Scope: Full telemetry overhaul, manifest schema redesign, deep abort/pause controls, non-CLI delivery channels.

## Documentation & Evidence
- Run Manifest Link: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json` (diagnostics run captured; reuse/replace if a newer guardrail run supersedes it).
- Metrics / State Snapshots (placeholders): `.runs/0407-orchestrator-interactive-hud/metrics.json`, `out/0407-orchestrator-interactive-hud/state.json`.

## Stakeholders
- Product: Platform Enablement (unassigned)
- Engineering: Orchestrator Foundations (unassigned)
- Design: CLI/TUI experience (unassigned)

## Metrics & Guardrails
- Success Metrics: parity (byte-for-byte manifests/metrics) between interactive/non-interactive; HUD overhead ≤100 ms per stage transition; TTY detection disables HUD correctly in CI/non-TTY environments.
- Guardrails: No manifest schema drift; HUD disabled automatically when TTY/TERM/CI checks fail; events emitted only after persistence commits.

## User Experience
- Personas: Developers running long pipelines locally; CI maintainers needing visibility without changing outputs; reviewers tailing runs for progress.
- Journeys:
  - `codex-orchestrator start diagnostics --interactive`: HUD displays run header, stages, and log tail; manifest matches non-interactive run.
  - `codex-orchestrator resume <run-id> --interactive`: HUD attaches to ongoing run when TTY checks pass; otherwise falls back silently.
  - CI invocation without TTY: HUD remains disabled; existing logs and manifests unchanged.

## Technical Considerations
- Event API mirrors orchestrator lifecycle and must not become a second source of truth.
- HUD render loop must buffer logs to avoid dropping lines; tail size bounded to protect performance.
- CLI gating must respect environment variables and approval guardrails; no changes to persistence locations or manifest schemas unless strictly necessary.

## Open Questions
- Do we expose minimal HUD controls (e.g., cancel after current stage) under a feature flag, or defer entirely?
- Should we offer a `--force-interactive` override for trusted TTY scenarios, or rely solely on auto-detection + flag?
- How should we surface HUD availability in manifests or metrics (if at all) without altering existing schema?
