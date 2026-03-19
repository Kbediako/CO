# TECH_SPEC - Spec Guard Codepath + Review Docs Alignment (1005)

- Canonical TECH_SPEC: `tasks/specs/1005-spec-guard-codepath-and-review-docs-alignment.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: implementation-complete remediation for `spec-guard` code-path detection and review-doc wording alignment.
- Change boundary: keep runtime behavior stable; patch guard coverage/tests/docs only.
- Closeout state: authoritative implementation-gate rerun `2026-03-05T08-27-09-532Z-329a23e2` is terminal `succeeded`.

## Requirements
- `spec-guard` detects CO core code paths under `orchestrator/src`, `packages/`, `adapters/`, and `evaluation/`.
- Regression tests cover `orchestrator/src/**` path detection and fail pre-fix/pass post-fix behavior.
- Docs wording reflects actual `codex-orchestrator review` / `npm run review` semantics and non-interactive handoff behavior.
- Shared-checkout override reasons are explicit when used in terminal closeout lanes.
- Task/spec/checklist/docs mirrors include authoritative implementation-gate and mirror-sync evidence pointers.

## Validation Evidence
- Authoritative implementation-gate manifest: `.runs/1005-spec-guard-codepath-and-review-docs-alignment/cli/2026-03-05T08-27-09-532Z-329a23e2/manifest.json`.
- Terminal closeout summary and gate matrix: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/00-terminal-closeout-summary.md`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/gate-results-authoritative.json`.
- Override evidence: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/override-ledger.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/01-delegation-guard.override.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/08-diff-budget.override.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/logs/09-review.override.log`.
- Mirror-sync docs checks: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/01-docs-check.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/02-docs-freshness.log`.
- Mirror parity and summary: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/03-mirror-parity.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/00-mirror-sync-summary.md`.

## Acceptance
- 1005 docs/spec/checklist mirrors are synchronized to completed status with final evidence links.
- Registry snapshots point to terminal implementation-gate rerun manifest `2026-03-05T08-27-09-532Z-329a23e2`.
- Override notes for delegation, diff-budget, and review are explicit and traceable in evidence references.
