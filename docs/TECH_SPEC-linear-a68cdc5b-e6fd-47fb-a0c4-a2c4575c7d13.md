---
id: 20260421-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13
title: "CO: clarify README when main documents behavior newer than the latest tagged package"
relates_to: docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md
risk: medium
owners:
  - Codex
last_review: 2026-04-21
---

# TECH_SPEC - CO: clarify README when main documents behavior newer than the latest tagged package

This mirror points to the canonical task spec at `tasks/specs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`.

## Implementation Summary
- Root README must say when it is documenting source-head `main` rather than the latest tagged package.
- Release-aligned readers must get a tagged `v0.1.38` doc route.
- Post-`v0.1.38` setup surfaces such as packaged marketplace/plugin guidance and `docs/public/*` links must be labeled as source-head-only in this checkout.
- No release, publish, or runtime/package behavior changes are allowed.

## Canonical Artifacts
- PRD: `docs/PRD-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Task checklist: `tasks/tasks-linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13.md`
- Workpad: Linear comment `18df1d93-b9ae-4350-a779-38fbfa645d8d`
- Child lane manifest: `.runs/linear-a68cdc5b-e6fd-47fb-a0c4-a2c4575c7d13-readme-release-truth/cli/2026-04-21T02-19-06-335Z-b7a27d2f/manifest.json`

## Validation Contract
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `FORCE_CODEX_REVIEW=1 npm run review`
- `npm run pack:smoke`
