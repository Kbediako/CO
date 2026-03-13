# Task Checklist - 1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction

- MCP Task ID: `1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`

> This lane follows `1148` from the now-correct coordinator-owned read-service seam. The next bounded Symphony-aligned move is to extract the read contract itself out of Telegram ownership without reopening Telegram runtime behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `tasks/tasks-1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `.agent/task/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`
- [x] Deliberation/findings captured for the coordinator-owned oversight read-contract seam. Evidence: `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md`, `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1149`. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/00-summary.md`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/05-docs-review-override.md`, `.runs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/cli/2026-03-13T04-19-14-058Z-afd63eff/manifest.json`

## Control Oversight Read Contract Extraction

- [ ] One coordinator-owned oversight read contract replaces Telegram ownership of the selected-run/dispatch/question read interface.
- [ ] Coordinator-owned oversight files consume the extracted contract instead of importing it from `telegramOversightBridge.ts`.
- [ ] Focused coordinator and Telegram regressions preserve the existing runtime behavior.

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
- [ ] Manual/mock oversight read-contract evidence captured.
- [ ] Elegance review completed.
