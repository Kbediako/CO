# Task Checklist - linear-d2e17480-ee95-4eab-b83d-21be17e58993

- Linear Issue: `CO-585` / `d2e17480-ee95-4eab-b83d-21be17e58993`
- MCP Task ID: `linear-d2e17480-ee95-4eab-b83d-21be17e58993`
- Primary PRD: `docs/PRD-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`
- Canonical TECH_SPEC: `tasks/specs/linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`
- `.agent` mirror: `.agent/task/linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`
- Canonical owner key: `docs:freshness:spec-and-public-pre-expiry:2026-06-01`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:spec-and-public-pre-expiry:2026-06-01`

## Docs-First
- [x] PRD drafted. Evidence: `docs/PRD-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`.
- [x] TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`.
- [x] Canonical task spec drafted. Evidence: `tasks/specs/linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-d2e17480-ee95-4eab-b83d-21be17e58993.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Issue-quality review recorded. Evidence: baseline maintain output under `out/linear-d2e17480-ee95-4eab-b83d-21be17e58993/baseline/docs-freshness-maintenance.json`.

## Review Work
- [x] Baseline reproduced `block_spec_guard_pre_expiry`. Evidence: `out/linear-d2e17480-ee95-4eab-b83d-21be17e58993/baseline/docs-freshness-maintenance.json`.
- [x] Public guides reviewed with same-issue child lane. Evidence: `.runs/linear-d2e17480-ee95-4eab-b83d-21be17e58993-public-guides-review/cli/2026-05-25T04-35-22-745Z-e33025f9/manifest.json`.
- [x] Ten active specs reviewed against implementation/test anchors. Evidence: review notes in the named `tasks/specs/linear-*.md` files.
- [x] Review metadata updated truthfully. Evidence: `tasks/index.json` and `docs/docs-freshness-registry.json`.

## Fallback / Refactor Decision
- Large-refactor check: No code refactor is warranted for this docs/spec review batch.
- Minor-seam check: provider onboarding retains the explicit CLI break-glass path as governed operational guidance while app-server authority remains normal.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker runtime docs | CLI resume break-glass guidance for provider-linear workers. | justify retaining fallback | CO-585 docs freshness review, then runtime policy owner | App-server authority unavailable or intentionally bypassed | 2026-05-22 | 2026-05-25 | Re-review by 2026-06-24 | App-server provider path becomes sufficient without CLI break-glass | Public docs review and docs validation |

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] `git diff --check`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `node scripts/delegation-guard.mjs`.
- [x] `docs:freshness:maintain --check --format json` no longer blocks on the CO-585 pre-expiry batch. Evidence: `out/linear-d2e17480-ee95-4eab-b83d-21be17e58993/after/docs-freshness-maintenance.json` reports zero pre-expiry entries and only separately owned terminal lifecycle residue.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `npm run test`.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness` completed with failure classified to separately owned stale/terminal lifecycle residue, not the CO-585 pre-expiry batch.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] Standalone review and elegance pass. Evidence: `../../.runs/linear-d2e17480-ee95-4eab-b83d-21be17e58993/cli/2026-05-25T04-32-06-712Z-cf10f99d/review/telemetry.json` and `out/linear-d2e17480-ee95-4eab-b83d-21be17e58993/manual/2026-05-25T05-09-33Z-elegance-review.md`.

## Handoff Status
- [ ] PR opened and attached.
- [ ] `pr ready-review` drain completed or blocker recorded.
- [ ] Linear moved to review only after required gates are green or explicitly classified with evidence.
