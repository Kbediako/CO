# Task Checklist — Codex Orchestrator Interactive HUD (0407-orchestrator-interactive-hud)

> Export `MCP_RUNNER_TASK_ID=0407-orchestrator-interactive-hud` before running orchestrator commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/0407-orchestrator-interactive-hud.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`) that proves completion.

## Foundation & Alignment
- [ ] Synchronize collateral — PRD/TECH_SPEC/ACTION_PLAN/task checklists reference Task 0407 and FEATURE_NAME; Files/Evidence: `tasks/0407-prd-orchestrator-interactive-hud.md`, `docs/PRD-codex-orchestrator-interactive-hud.md`, `docs/TECH_SPEC-codex-orchestrator-interactive-hud.md`, `docs/ACTION_PLAN-codex-orchestrator-interactive-hud.md`, `.agent/task/0407-orchestrator-interactive-hud.md`; Commands: `export MCP_RUNNER_TASK_ID=0407-orchestrator-interactive-hud`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Prepare run directories — Seed `.runs/0407-orchestrator-interactive-hud/cli/` and `out/0407-orchestrator-interactive-hud/**` via diagnostics; Commands: `npx codex-orchestrator start diagnostics --format json`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Environment defaults recorded — Manifest captures task id + approval profile; Commands: diagnostics run above; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.

## Event Instrumentation
- [ ] RunEvents API scaffold — Define lifecycle/log/toolCall events emitted after manifest/metric writes; Files/Evidence: `orchestrator/src/**` (event layer), tests; Commands: `npm run test`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Parity coverage — Add tests comparing manifests/metrics/log outputs with/without events; Files/Evidence: `orchestrator/tests/**`; Commands: `npm run test -- --runInBand`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.

## HUD Implementation (read-only)
- [ ] View model + components — Ink/React TUI rendering header/body/log/footer driven by RunEvents; Files/Evidence: `orchestrator/ui/**` (or equivalent), tests; Commands: `npm run test -- --filter hud`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Performance/log tail bounds — HUD handles long logs with bounded tail and batched renders; Files/Evidence: tests/bench notes; Commands: `npm run test`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.

## CLI Integration
- [ ] Interactive flag + gating — Add `--interactive/--ui` to `start|resume`, enable only when stdout/stderr are TTY, TERM not `dumb`, and not in CI; Files/Evidence: CLI flag handling; Commands: `npm run test -- --filter cli`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Fallback parity — Verify interactive vs non-interactive runs produce identical manifests/metrics for same inputs; Files/Evidence: parity test logs; Commands: `npm run test`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.

## Guardrails & Verification
- [ ] Diagnostics run — `npx codex-orchestrator start diagnostics --format json`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Spec guard + quality gates — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, (optional) `npm run eval:test`; Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Reviewer hand-off — `npm run review -- --manifest <latest>` (or default latest); Evidence: `.runs/0407-orchestrator-interactive-hud/cli/2025-11-27T01-10-31-938Z-ce1ba891/manifest.json`.
- [ ] Evidence mirroring — Ensure manifests referenced above are linked from this file and `.agent/task/0407-orchestrator-interactive-hud.md` before flipping any checkbox.

_Flip each `[ ]` to `[x]` with the exact manifest path once acceptance criteria are satisfied._
