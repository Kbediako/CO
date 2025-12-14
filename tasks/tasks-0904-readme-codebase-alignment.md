# Task 0904 — README vs Codebase Alignment

- MCP Task ID: `0904-readme-codebase-alignment` (export before orchestrator commands so manifests land under `.runs/0904-readme-codebase-alignment/cli/`).
- Primary PRD: `docs/PRD-readme-codebase-alignment.md`
- Tech Spec: `docs/TECH_SPEC-readme-codebase-alignment.md`
- Action Plan: `docs/ACTION_PLAN-readme-codebase-alignment.md`
- Run Manifest (latest diagnostics/plan): `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- Metrics/State: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`.

## Checklist
### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0904-readme-codebase-alignment.md`, and `tasks/index.json` — Evidence: this commit.

### README ↔ Codebase mismatches
- [x] Align `npm run lint` docs vs behavior — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align CLI stage targeting docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align learning snapshot path docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align hi‑fi toolkit “current target” docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align hi‑fi toolkit artifact location docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align mirror workflow staging path docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align metrics path docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Align review workflow docs/script to current Codex CLI — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Clarify cloud sync activation in docs — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Fix TF‑GRPO guardrail wording — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.

### Guardrails
- [x] Spec guard passes (`node scripts/spec-guard.mjs --dry-run`) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Lint passes (`npm run lint`) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
- [x] Tests pass (`npm run test`) — Evidence: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`.
