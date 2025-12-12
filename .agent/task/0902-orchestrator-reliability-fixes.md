# Task Checklist — Orchestrator Reliability Fixes (0902)

> Set `MCP_RUNNER_TASK_ID=0902-orchestrator-reliability-fixes` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0902-orchestrator-reliability-fixes.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0902-orchestrator-reliability-fixes/cli/<run-id>/manifest.json`).

## Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `tasks/index.json` — Evidence: this commit.

## Fixes
- [x] Issue #1 fixed: sub‑pipeline exceptions finalize parent manifests/stages.
- [x] Issue #2 fixed: CLI exec executor forwards unified exec args.
- [x] Issue #3 fixed: session reuse applies env overrides.
- [x] Issue #4 fixed: retry defaults not clobbered by `undefined` spreads.
- [x] Issue #5 fixed: `isIsoDate` enforces strict ISO‑8601 expectations.
- [x] Issue #6 fixed: instruction loader warns+skips unstamped optional candidates.
- [x] Issue #7 fixed: timeout kill is cross‑platform/Windows‑safe.
- [x] Issue #8 fixed: temp dirs cleaned in crystalizer and SDK exec.
- [x] Issue #9 fixed: eslint plugin no longer runs builds as side effects.

## Guardrails
- [x] Spec guard passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
