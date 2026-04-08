# Task Checklist - 1005-spec-guard-codepath-and-review-docs-alignment

- MCP Task ID: `1005-spec-guard-codepath-and-review-docs-alignment`
- Primary PRD: `docs/PRD-spec-guard-codepath-and-review-docs-alignment.md`
- TECH_SPEC: `tasks/specs/1005-spec-guard-codepath-and-review-docs-alignment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-spec-guard-codepath-and-review-docs-alignment.md`

> Delegation override note (temporary): subagent usage is currently blocked by account usage-limit errors; direct execution is used for this slice with explicit evidence in logs.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). - Evidence: `docs/PRD-spec-guard-codepath-and-review-docs-alignment.md`, `docs/TECH_SPEC-spec-guard-codepath-and-review-docs-alignment.md`, `docs/ACTION_PLAN-spec-guard-codepath-and-review-docs-alignment.md`, `tasks/specs/1005-spec-guard-codepath-and-review-docs-alignment.md`, `tasks/tasks-1005-spec-guard-codepath-and-review-docs-alignment.md`, `.agent/task/1005-spec-guard-codepath-and-review-docs-alignment.md`.
- [x] Registry snapshots updated (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`). - Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Implementation
- [x] `spec-guard` CO code-path detection remediated. - Evidence: `scripts/spec-guard.mjs`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T081607Z-impl/00-impl-summary.md`.
- [x] Spec-guard regression test coverage added/updated. - Evidence: `tests/spec-guard.spec.ts`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T081607Z-impl/01-vitest-spec-guard.log`.
- [x] Docs wording contradictions remediated. - Evidence: `AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`, `docs/TASKS.md`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T081607Z-impl/00-impl-summary.md`.

## Validation (Terminal Closeout)
- [x] Ordered gate chain (`delegation-guard` through `pack-smoke`) is captured and passed in authoritative order. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/gate-results-authoritative.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/00-terminal-closeout-summary.md`.
- [x] Shared-checkout override reasons are explicit for `delegation-guard`, `diff-budget`, and `review`. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/override-ledger.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/01-delegation-guard.override.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/08-diff-budget.override.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/09-review.override.log`.
- [x] Authoritative implementation-gate rerun reached terminal `succeeded`. - Evidence: `.runs/1005-spec-guard-codepath-and-review-docs-alignment/cli/2026-03-05T08-27-09-532Z-329a23e2/manifest.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/11-implementation-gate.override.log`.

## Validation (Mirror Sync Post-Closeout)
- [x] `npm run docs:check` passed for mirror-sync closeout rerun. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/01-docs-check.log`.
- [x] `npm run docs:freshness` passed for mirror-sync closeout rerun. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/02-docs-freshness.log`.
- [x] Task checklist and `.agent` mirror parity log captured. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/03-mirror-parity.log`.
- [x] Mirror-sync closeout summary recorded with changed files + evidence pointers. - Evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/00-mirror-sync-summary.md`.
