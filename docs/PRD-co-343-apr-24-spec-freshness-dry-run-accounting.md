# PRD - CO-343 Apr 24 Spec Freshness and Dry-Run Accounting

## Summary
The Apr 24 date boundary exposed stale active spec frontmatter and task-packet freshness rows while CO-341 was validating the Codex CLI `0.124.0` posture lane. `node scripts/spec-guard.mjs --dry-run` exits `0` by design but printed five stale-spec failures, so treating that output as a clean pass would be misleading.

## User Request Translation
- Keep CO-341 scoped to Codex CLI `0.124.0` / `gpt-5.5` posture.
- Create and resolve a separate owner for the Apr 24 spec/docs freshness blocker observed during CO-341 validation.
- Reproduce and classify the exact stale specs and freshness rows.
- Refresh, archive, or reclassify only after an explicit review rationale.
- Stop recording a dry-run that prints failures as passed validation evidence.

## Intent Checksum
Protected terms: `node scripts/spec-guard.mjs --dry-run`, `node scripts/spec-guard.mjs`, `npm run docs:freshness`, `npm run docs:freshness:maintain`, `last_review: 2026-03-24`, `last_review: 2026-01-23`, `CO-343`, `CO-341`, `CO-324`, `docs:freshness:maintain`.

Wrong interpretations to reject: widening CO-341, weakening spec/docs freshness policy, expanding rolling freshness caps, blindly bumping dates without classification, or reusing terminal `CO-324` as the live Apr 24 owner.

## Goals
- Restore truthful green spec/docs freshness gates for the current Apr 24 repo state.
- Preserve machine-readable evidence that the dry-run output was not a clean pass until the stale rows were fixed.
- Re-home the rolling freshness live owner from terminal `CO-324` to active `CO-343`.

## Non-Goals
- No CO-341 model-posture code changes.
- No broad docs archive or reclassification pass.
- No change to dry-run exit semantics in `scripts/spec-guard.mjs`; closeout validation uses the non-dry-run command for terminal truth.

## Validation
- `node scripts/spec-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness:maintain`
- `git diff --check`
