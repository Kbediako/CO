# Task Checklist - 0943-release-notes-template-signing (0943)

> Set `MCP_RUNNER_TASK_ID=0943-release-notes-template-signing` for orchestrator commands. Mirror status with `tasks/tasks-0943-release-notes-template-signing.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: `docs/PRD-release-notes-template-signing.md`, `docs/TECH_SPEC-release-notes-template-signing.md`, `docs/ACTION_PLAN-release-notes-template-signing.md`, `tasks/tasks-0943-release-notes-template-signing.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0943-release-notes-template-signing-scout/cli/2026-01-12T05-13-45-823Z-b64b8852/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs registry/metrics/state snapshots updated - Evidence: `.runs/0943-release-notes-template-signing/cli/2026-01-12T06-29-14-923Z-c4423862/manifest.json`, `docs/TASKS.md`, `.agent/task/0943-release-notes-template-signing.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0943-release-notes-template-signing/metrics.json`, `out/0943-release-notes-template-signing/state.json`.

### Planning
- [x] Release notes template plan captured (label taxonomy + catch-all) - Evidence: `docs/TECH_SPEC-release-notes-template-signing.md`, `docs/ACTION_PLAN-release-notes-template-signing.md`.
- [x] Signed tag/commit requirement documented in SOP (verification + `--verify-tag` guardrail) - Evidence: `.agent/SOPs/release.md`.

### Implementation + Validation
- [x] Add .github/release.yml template with categories + catch-all - Evidence: `.github/release.yml`, `.runs/0943-release-notes-template-signing/cli/2026-01-12T06-14-15-991Z-b126eab2/manifest.json`.
- [x] Align repo label taxonomy to template categories - Evidence: `out/0943-release-notes-template-signing/label-audit.json`.
- [x] Validate release notes sections on a dry-run release - Evidence: `out/0943-release-notes-template-signing/release-notes-dry-run.json`.

### Validation
- [x] Implementation-gate manifest captured - Evidence: `.runs/0943-release-notes-template-signing/cli/2026-01-12T06-14-15-991Z-b126eab2/manifest.json`.

## Relevant Files
- `docs/PRD-release-notes-template-signing.md`
- `docs/TECH_SPEC-release-notes-template-signing.md`
- `docs/ACTION_PLAN-release-notes-template-signing.md`
- `tasks/tasks-0943-release-notes-template-signing.md`
- `.agent/SOPs/release.md`
