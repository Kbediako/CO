# ACTION_PLAN - CO-379 retire stale 0.124 evidence-book residue

## Summary
- Goal: demote the old `0.124.0` evidence-book page into an explicitly historical/archive surface after Codex `0.125.0` adoption.
- Scope: docs packet, historical page path, current-facing links, posture matrix/catalog metadata, focused docs-hygiene coverage, validation, review, and Linear handoff.
- Assumptions: current `origin/main` already contains the accepted `0.125.0` / `gpt-5.5` local posture and `0.125.0` package/downstream-smoke compatibility split.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs/book/archive/codex-cli-0124-adoption.md`, `CO-341/CO-345`, `Codex CLI 0.125.0`, `gpt-5.5` / `xhigh`, `gpt-5.4` fallback, `docs/book/README.md`, `README.md`, `docs/guides/codex-version-policy.md`.
- Not done if: old evidence is deleted, `0.124.0` remains current-facing local posture, `gpt-5.4` fallback is broadened, or validation is missing.
- Pre-implementation issue-quality review: CO-379 is narrow cleanup of stale evidence-book residue, not a new release-intake or runtime posture lane.

## Milestones & Sequencing
1. Create CO-379 docs packet and register task/freshness mirrors.
2. Resolve the same-issue child lane for index/README/version-policy audit.
3. Move or rename the old evidence page into a historical/archive path and update matrix/catalog/current-facing links.
4. Run focused docs-hygiene coverage and requested docs gates.
5. Run standalone review and an explicit elegance/minimality pass before PR/review handoff if the diff is non-trivial.

## Dependencies
- Existing posture matrix and docs-hygiene enforcement from current `origin/main`.
- Same-issue child lane `index-readme-version-audit` for bounded current-facing link audit.

## Validation
- Checks / tests:
  - focused docs-hygiene coverage for historical/archive evidence links
  - focused `rg` audit for stale active `codex-cli-0124-adoption.md` references
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
- Rollback plan: restore the old path and matrix/catalog references if validation shows the move breaks required historical evidence links; do not delete evidence.

## Risks & Mitigations
- Risk: moving the file breaks historical task references. Mitigation: update link/path references and run docs checks.
- Risk: current posture wording regresses during cleanup. Mitigation: search for `0.124`, `0.125`, `gpt-5.5`, and `gpt-5.4` across current-facing docs.
- Risk: child-lane scope collision. Mitigation: parent avoids delegated files until child lane is accepted, rejected, or invalidated.

## Approvals
- Reviewer: Codex provider worker
- Date: 2026-04-26
