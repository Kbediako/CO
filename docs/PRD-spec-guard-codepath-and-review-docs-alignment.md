# PRD - Spec Guard Codepath + Review Docs Alignment (1005)

## Summary
- Problem: docs/tooling drift existed across spec-guard coverage and review guidance, creating contradictions between policy text and actual behavior.
- Outcome: guard coverage and docs wording are aligned so enforcement and operator guidance are consistent and auditable.
- Scope status: implementation-complete on 2026-03-05; authoritative implementation-gate rerun `2026-03-05T08-27-09-532Z-329a23e2` succeeded.

## User Request Translation
- Align docs and tool behavior, reduce contradiction risk, and keep changes minimal.
- Apply immediate remediations for high-signal mismatches discovered in the audit.
- Close and mirror-sync all task/spec/checklist artifacts with final evidence links.

## Goals
- Fix `spec-guard` code-path detection gap for CO source layout.
- Align review/docs wording to actual wrapper behavior.
- Preserve existing run-review runtime behavior (no broad behavioral refactor).

## Non-Goals
- No redesign of `run-review` fallback semantics.
- No broad AGENTS router compression implementation in this slice.
- No Codex default-version flip decision in this slice.

## In Scope
- `scripts/spec-guard.mjs` code-path detection update.
- `tests/spec-guard.spec.ts` regression coverage for `orchestrator/src/**`.
- Docs wording alignment in `AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`, and related task snapshot text.
- Terminal closeout + mirror-sync evidence capture for 1005 mirrors.

## Acceptance Criteria
1. Spec guard fails when code changes under `orchestrator/src/**` occur without required spec updates.
2. Updated tests cover the new path detection and pass.
3. Docs no longer state contradictory behavior for NOTES requirement, spec freshness scope, and non-interactive review handoff.
4. Validation gates for this slice pass with manifest-backed evidence, including explicit override notes where used.

## Implementation Closeout Evidence
- Authoritative implementation-gate manifest: `.runs/1005-spec-guard-codepath-and-review-docs-alignment/cli/2026-03-05T08-27-09-532Z-329a23e2/manifest.json`.
- Terminal closeout summary: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/00-terminal-closeout-summary.md`.
- Override ledger (`delegation-guard`/`diff-budget`/`review`): `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/override-ledger.json`.
- Mirror-sync summary: `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/00-mirror-sync-summary.md`.
