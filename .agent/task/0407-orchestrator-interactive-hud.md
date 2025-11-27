# Task List — Codex Orchestrator Interactive HUD (0407-orchestrator-interactive-hud)

## Context
- Link to PRD: `docs/PRD-codex-orchestrator-interactive-hud.md`
- Summary: Add a read-only Gemini-style HUD to `codex-orchestrator` by emitting RunEvents aligned to existing manifest/metric updates and gating an Ink/React TUI behind `--interactive/--ui` without changing run semantics or persistence.

### Checklist Convention
- Keep `[ ]` until acceptance criteria are met; flip to `[x]` only after attaching the manifest from `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.

## Parent Tasks
1. **Foundation**
   - Subtask: Synchronize collateral
     - Files: `tasks/0407-prd-orchestrator-interactive-hud.md`, `docs/PRD-codex-orchestrator-interactive-hud.md`, `docs/TECH_SPEC-codex-orchestrator-interactive-hud.md`, `docs/ACTION_PLAN-codex-orchestrator-interactive-hud.md`, `.agent/task/0407-orchestrator-interactive-hud.md`
     - Commands: `export MCP_RUNNER_TASK_ID=0407-orchestrator-interactive-hud`
     - Acceptance: All docs reference TASK_ID/FEATURE_NAME; manifest captured.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
   - Subtask: Prepare run directories & env
     - Files: `.runs/0407-orchestrator-interactive-hud/**`, `out/0407-orchestrator-interactive-hud/**`
     - Commands: `npx codex-orchestrator start diagnostics --format json`
     - Acceptance: Diagnostics manifest under `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
2. **Event Instrumentation**
   - Subtask: RunEvents API alignment
     - Files: `orchestrator/src/**` (event bus + hooks)
     - Commands: `npm run test -- --filter events`
     - Acceptance: Lifecycle/log/toolCall events emitted after manifest/metric writes; parity tests added.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
3. **HUD Implementation**
     - Subtask: TUI view model + components
       - Files: `orchestrator/ui/**` (or equivalent Ink/React layer)
       - Commands: `npm run test -- --filter hud`
       - Acceptance: Header/body/log/footer render from RunEvents; log tail bounded; HUD is read-only.
       - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
4. **CLI Integration**
   - Subtask: Flag + gating
     - Files: CLI command handlers
     - Commands: `npm run test -- --filter cli`
     - Acceptance: `--interactive/--ui` wired to `start|resume`, enabled only when stdout/stderr are TTY, TERM not `dumb`, not CI; falls back cleanly.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
   - Subtask: Parity verification
     - Files: tests
     - Commands: `npm run test`
     - Acceptance: Interactive vs non-interactive manifests/metrics identical for same inputs.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
5. **Guardrails & Review**
   - Subtask: Diagnostics + guardrails
     - Commands: `npx codex-orchestrator start diagnostics --format json`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, (optional) `npm run eval:test`
     - Acceptance: Manifest documents all guardrail commands and is referenced here before any checkbox flips.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)
   - Subtask: Reviewer hand-off
     - Commands: `npm run review -- --manifest <latest>` (or default latest)
     - Acceptance: Review manifest recorded and referenced in checklists.
     - [x] Status: Completed (`.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T02-50-15-565Z-56d87472/manifest.json`)

## Notes
- Do not alter manifest or metric semantics; events must mirror existing persistence points.
- Maintain approval guardrails (`read/edit/run/network`); record any escalation in run manifests.
- HUD is read-only in this iteration; abort/pause/force-termination controls are out of scope.
- Link evidence manifests from this file and `tasks/tasks-0407-orchestrator-interactive-hud.md` before flipping checkboxes.

## Relevant Files
- `docs/PRD-codex-orchestrator-interactive-hud.md`, `docs/TECH_SPEC-codex-orchestrator-interactive-hud.md`, `docs/ACTION_PLAN-codex-orchestrator-interactive-hud.md`, `tasks/0407-prd-orchestrator-interactive-hud.md`, `tasks/tasks-0407-orchestrator-interactive-hud.md`
