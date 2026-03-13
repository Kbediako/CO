# Task Checklist - 1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction

- MCP Task ID: `1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`

> This lane follows `1149` from the now-neutral coordinator-owned read contract. The next bounded Symphony-aligned move is to extract the remaining update-side `subscribe(...)` contract out of the facade-specific surface without reopening Telegram runtime behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `tasks/specs/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `tasks/tasks-1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `.agent/task/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`
- [x] Deliberation/findings captured for the coordinator-owned oversight update-contract seam. Evidence: `docs/findings/1150-control-oversight-update-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md`, `docs/findings/1150-control-oversight-update-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1150`. Evidence: `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T053108Z-docs-first/00-summary.md`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T053108Z-docs-first/05-docs-review-override.md`, `.runs/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/cli/2026-03-13T05-43-19-850Z-0fdda032/manifest.json`

## Control Oversight Update Contract Extraction

- [ ] One coordinator-owned oversight update contract replaces facade-specific ownership of the update-side `subscribe(...)` surface.
- [ ] The Telegram bridge lifecycle consumes the extracted neutral update boundary instead of a facade-specific type.
- [ ] Focused lifecycle/update regressions preserve the existing runtime behavior.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock oversight update-contract evidence captured.
- [ ] Elegance review completed.
