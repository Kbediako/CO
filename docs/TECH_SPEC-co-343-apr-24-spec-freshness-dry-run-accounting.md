---
id: 20260424-co-343-apr-24-spec-freshness-dry-run-accounting
title: CO-343 Apr 24 Spec Freshness and Dry-Run Accounting
relates_to: docs/PRD-co-343-apr-24-spec-freshness-dry-run-accounting.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: resolve the Apr 24 stale active-spec and task-packet freshness blockers found during CO-341 validation without changing CO-341 posture scope.
- Scope: docs-first packet, freshness classification, exact stale-row refresh, live owner metadata, and truthful CO-341 validation notes.
- Constraints: no policy weakening, no rolling cap/window expansion, no implementation code changes outside existing CO-341 posture fixes.

## Requirements
1. Preserve evidence that `spec-guard --dry-run` printed five failures and therefore was not clean validation evidence.
2. Refresh the five stale active spec frontmatters only after classification.
3. Refresh the 24 stale docs-freshness registry rows only after classification.
4. Set `docs/docs-catalog.json` live rolling freshness owner to `CO-343` while keeping `CO-324` as terminal historical evidence.
5. Add the CO-343 docs packet to `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
6. Prove terminal truth with non-dry-run `node scripts/spec-guard.mjs`, `docs:freshness`, and `docs:freshness:maintain`.

## Stale Active Specs
- `tasks/specs/0909-orchestrator-run-reporting-consistency.md`
- `tasks/specs/0977-shipped-feature-adoption-guidance.md`
- `tasks/specs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`
- `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- `tasks/specs/linear-41f54a87-705b-467d-9e88-f49c6315f0dc.md`

## Acceptance
- `node scripts/spec-guard.mjs` prints `OK`.
- `npm run docs:freshness` prints `OK`.
- `npm run docs:freshness:maintain` prints `clean` or a terminal-green owned-debt decision.
- CO-341 validation notes no longer describe the failing dry-run output as a clean pass.

## Review Notes
- 2026-04-24: Classification approved direct refresh for the exact stale rows because the affected packets remain active historical/operator surfaces and no content drift requiring rewrite was found during spot review.
