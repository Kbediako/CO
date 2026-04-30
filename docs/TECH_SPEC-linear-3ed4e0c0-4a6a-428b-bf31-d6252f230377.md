---
id: 20260430-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377
title: "CO-443 completed intake claim live-truth recovery"
relates_to: docs/PRD-linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md
last_review: 2026-04-30
owners:
  - Codex
---

# TECH_SPEC - CO-443 completed intake claim live-truth recovery

This mirror points to the canonical task spec at `tasks/specs/linear-3ed4e0c0-4a6a-428b-bf31-d6252f230377.md`.

## Scope
- Revalidate `provider_issue_run_already_completed` claims before explicit `control-host recover|relaunch|nudge` suppresses provider-worker recovery.
- Allow supported recovery only when live Linear truth is active and fresher than the completed provider-worker run issue truth.
- Preserve duplicate-run prevention for unchanged, equal, older, unknown, inactive, or already-covered completed truth.
- Keep CO-330 stale-owner recovery, CO-393 command plumbing, CO-404 acknowledgement timeout, CO-406 no-run capacity, and CO-392 released-pending-reopen behavior out of scope.

## Non-Goals
- No direct `provider-linear-worker` starts.
- No manual `provider-intake-state.json` edits or deletion of completed provider-intake audit rows.
- No broad provider workflow reconciliation redesign, polling-loop rewrite, or adjacent residue-family fix.
- No weakening of duplicate-worker protection for unchanged or ambiguous live truth.

## Validation Contract
- Focused `ProviderIssueHandoff` regressions must cover the CO-330 shape: completed worker, later active/fresher Linear truth, and supported recover/relaunch/nudge previously returning `provider_issue_run_already_completed`.
- Explicit recovery must fail closed for null, unparsable, equal, older, inactive, already-covered, or missing completed-run issue freshness.
- Full repo validation must keep build, lint, test, docs checks, docs freshness, spec guard, diff budget, pack smoke, standalone review, and the PR ready-review drain green before handoff.
