# Technical Spec — Codex Orchestrator Interactive HUD (Task 0407-orchestrator-interactive-hud)

## Overview
- Objective: Provide a read-only, Gemini-style HUD for orchestrator runs by emitting lifecycle/log events aligned with existing persistence and gating a TTY-only Ink/React UI behind an opt-in flag, preserving manifest/metric parity.
- In Scope: RunEvents API, HUD view model + Ink/React components, CLI flag + TTY/TERM/CI gating, parity validation, minimal HUD performance safeguards.
- Out of Scope: Telemetry stack redesign, manifest schema changes (unless unavoidable), aggressive controls/abort logic, GUI/web delivery.

## Requirements Mapping
| PRD Goal | Spec Component |
| --- | --- |
| RunEvents mirror of lifecycle/logs | Section 3.1 |
| Read-only HUD rendering stages/log tail | Section 3.2 |
| CLI `--interactive/--ui` with gating + fallback | Section 3.3 |
| Parity of manifests/metrics between modes | Sections 3.1, 5 |
| Performance + bounded logs | Sections 3.2, 4 |

## Architecture & Design

### 3.1 RunEvents / Event API
- Introduce a lightweight event bus (Node EventEmitter or typed emitter) scoped to orchestrator runs.
- Event types: `runStarted`, `stageStarted`, `stageCompleted`, `runCompleted`, `runError`, `log`, optional `toolCall`.
- Emission points: only after manifests/metrics/summaries are updated to keep events a mirror, not a source of truth.
- Payload shape (illustrative): `{ type, timestamp, runId, taskId, stageId?, status?, message?, level?, toolName?, data? }`.
- Subscription lifecycle: created per run; HUD subscriber attaches when interactive mode is enabled; disposed on run completion/error.

### 3.2 HUD Architecture
- Implementation: Ink/React TUI (preferred) mounted when interactive mode is active.
- View model subscribes to RunEvents and maintains:
  - Header: TASK_ID, run id, run status, elapsed time.
  - Body: pipeline stages with status; secondary grouping for plan/build/test/review when available.
  - Logs: bounded rolling tail (configurable length) tagged by stage/level; batched updates to reduce render thrash.
  - Footer: key hints (interactive enabled, manifests/metrics paths, fallback notice).
- State management: reducer-style store fed by event stream; ensures deterministic renders and easy unit testing.
- Performance: log tail capped (e.g., 200 lines) and batched repaint interval (e.g., 100–200 ms) to avoid dropping lines.

### 3.3 CLI Integration
- Flags: `--interactive` (alias `--ui`) on `codex-orchestrator start` and `resume`.
- Gating: enable HUD only when stdout/stderr are TTY, `TERM` not `dumb`, `CI` not truthy; otherwise log a concise note and continue with existing output.
- Fallback: runs proceed identically without HUD; no manifest/metric divergence. Add optional `--no-interactive` to force disable if needed.
- Config propagation: interactive flag stored in run config for telemetry only if existing schema allows; avoid schema changes where possible.

### 3.4 Data & Schema Impact
- Target: no manifest schema changes. If a HUD-enabled flag must be recorded, prefer existing metadata fields; avoid adding new fields unless required.
- Events remain in-memory for HUD; no new persisted event log unless explicitly added under existing diagnostics mechanisms.

### 3.5 Operational Considerations
- Performance: HUD must not block orchestrator; event handling is non-blocking and errors are caught/logged without affecting runs.
- Compatibility: Non-TTY environments (CI) default to current logging; HUD library dependencies loaded lazily to avoid impacting non-interactive runs.
- Logging: HUD-specific logs should not pollute manifest; keep debug logs behind verbose flag.

## Testing Strategy
- Unit Tests:
  - RunEvents emitter/subscriber lifecycle and payload integrity.
  - HUD reducers/view-model updates driven by synthetic event sequences.
  - TTY/TERM/CI gating logic for CLI flags.
- Integration Tests:
  - Run orchestrator with and without `--interactive` using fake TTY; assert manifests/metrics equality.
  - HUD log tail handling under high-volume log sequences (no drops, capped tail).
- Parity Tests:
  - Snapshot manifests/metrics for identical runs in interactive vs non-interactive modes; assert byte-for-byte equality.
- Guardrails:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run test`
  - (Optional) `npm run eval:test`

## Implementation Phases
1. Event Layer: define RunEvents emitter, wire emission points after manifest/metric updates, add unit + parity tests.
2. HUD: build Ink/React components + view model with bounded log tail and reducer-driven state; add tests with fake emitter.
3. CLI: add `--interactive/--ui`, implement TTY/TERM/CI gating, ensure fallback logging path untouched.
4. Verification: run diagnostics, parity tests, lint/test/spec-guard, capture manifest/metrics/state snapshots.

## Risks & Mitigations
- Event ordering drift: emit only after persistence commits and add assertions in tests.
- TTY detection edge cases: allow explicit flag override and log when HUD is skipped.
- Performance regressions: cap log tail, batch renders, and profile under synthetic load.

## Open Questions
- Should we expose a minimal HUD control (e.g., cancel after current stage) behind a feature flag now, or defer entirely?
- Do we need to surface “interactive enabled” in manifests via existing metadata fields for auditing?
- Is Ink the final choice, or do we keep an abstraction layer for alternate TUIs?

## Evidence & Links
- PRD: `docs/PRD-codex-orchestrator-interactive-hud.md`
- Action Plan: `docs/ACTION_PLAN-codex-orchestrator-interactive-hud.md`
- Task Checklists: `tasks/tasks-0407-orchestrator-interactive-hud.md`, `.agent/task/0407-orchestrator-interactive-hud.md`
- Run Manifest: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`
