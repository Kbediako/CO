---
id: 20260420-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4
title: "Maintain docs freshness rolling baseline"
relates_to: docs/PRD-linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - Maintain docs freshness rolling baseline

This mirror points to the canonical task spec at `tasks/specs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4.md`.

## Implementation Summary
- Preserve CO-267 as the canonical owner for `docs:freshness:maintain` and the Apr 20 repo-wide stale-doc sweep.
- Restore green freshness by classifying and reviewing exact stale Agent Policy, Active Guide, Shipped Skill, Task Packet, Task Mirror, Report Only, active spec, and CO-175 rolling cohort rows.
- Rework current-main truth on 2026-04-21 is 37 remaining stale Task Packet / Task Mirror rows for `0954` and `1311`-`1316`; this mirror keeps the rework patch scoped to that reviewed metadata refresh.
- Keep CO-266 terminal-blocker advisory behavior out of scope.
- Do not weaken `docs:freshness`, delete registry rows for count reduction, or hide CO-175 rolling debt.

## Canonical Artifacts
- Before docs freshness report: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness.json`
- Before maintenance report: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/docs-freshness-maintenance.json`
- Before spec guard log: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/spec-guard.log`
- Rework docs freshness report: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/docs-freshness.json`
- Rework maintenance report: `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/docs-freshness-maintenance.json`
- Classification: `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`
- Workpad: Linear comment `4f45cf6d-b02f-4feb-b040-9e353abd59e5`

## Validation Contract
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- manifest-backed `codex-orchestrator review` / `npm run review` before review handoff
