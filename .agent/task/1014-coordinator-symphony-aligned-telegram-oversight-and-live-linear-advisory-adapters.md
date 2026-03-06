# Task Checklist - 1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters

- MCP Task ID: `1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
- TECH_SPEC: `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`

> This lane converts the already-closed Telegram/Linear planning work into real provider adapters while preserving the current CO control-core authority boundaries.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `tasks/tasks-1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `.agent/task/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1014-symphony-aligned-telegram-linear-adapter-deliberation.md`.

## Shared Registry + Review Handoff
- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated.
- [ ] docs-review manifest captured for registered `1014`.

## Runtime Implementation
- [ ] Live Linear advisory resolver implemented with fail-closed provider/runtime behavior.
- [ ] Compatibility projections expose tracked live Linear metadata for the active item view.
- [ ] Telegram polling oversight adapter implemented with bounded read-only commands.
- [ ] Telegram `/pause` and `/resume` controls are routed through existing transport guardrails.

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
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths
- [ ] Manual simulated/mock usage evidence captured for Telegram and Linear
- [ ] Explicit elegance review captured
- [ ] Coherent 1014 commit recorded
