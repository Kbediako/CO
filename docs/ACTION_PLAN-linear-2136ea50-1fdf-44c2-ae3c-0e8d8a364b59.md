# ACTION_PLAN - CO: audit remaining top-level non-doc and config stewardship surfaces and prune low-value residue

## Added by Bootstrap 2026-04-12

## Summary
- Goal: finish the bounded stewardship pass for the remaining named top-level non-doc/config surfaces with explicit dispositions, refreshed stale retained guidance, and a clean or justified `repo:stewardship` rerun.
- Scope: docs-first packet and mirrors, targeted surface inventory, bounded `.ai-dev-tasks` refresh, sharper stewardship rationale/checks for the named surfaces, prompt-snippets child-lane review, explicit audit artifacts, and the standard validation/review floor.
- Assumptions:
  - the named surfaces are still live and mostly retained, not bulk-delete candidates
  - the strongest concrete stale guidance is currently inside `.ai-dev-tasks/*.md`
  - prompt-surface changes should stay within the existing single-file snippet unless the child patch proves otherwise

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `top-level non-doc and config stewardship surfaces`
  - `keep`, `update`, `move`, `delete`
  - `.ai-dev-tasks`, `.codex`, `adapters`, `eslint-plugin-patterns`, `patterns`, `prompt-snippets`, `types`, `root JSON/YAML config files`
  - `repo:stewardship`
  - `do not silently reopen CO-126`
- Not done if:
  - any targeted surface still lacks an explicit disposition and rationale
  - `.ai-dev-tasks` still points at deprecated template paths when the lane closes
  - the issue closes without a post-change stewardship rerun and captured evidence
- Pre-implementation issue-quality review:
  - current repo truth supports a bounded follow-up lane: active surfaces exist, at least one retained guidance cluster is stale, and the prompt-surface can be reviewed via an already-completed child lane instead of broadening scope

## Milestones & Sequencing
1) Create the `CO-139` docs-first packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`; then run an audited docs-review child stream.
2) Finish the targeted consumer-evidence inventory for each named surface and review the prompt-snippets child-lane patch artifact.
3) Implement the smallest truthful changes: refresh `.ai-dev-tasks`, sharpen the stewardship catalog for this slice, and accept or reject the prompt-snippets patch with an explicit reason.
4) Rerun `repo:stewardship`, capture JSON/markdown artifacts, refresh the workpad, and complete the required validation/review floor before any PR handoff.

## Dependencies
- `docs/repo-stewardship-catalog.json`
- `scripts/repo-stewardship-audit.mjs`
- `scripts/lib/docs-helpers.js`
- `docs/design/PRD-frontend-design-pipeline-v2.md`
- `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`
- `tasks/frontend-design-pipeline-v2.md`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 npm run repo:stewardship`
  - `MCP_RUNNER_TASK_ID=linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59 node scripts/repo-stewardship-audit.mjs --report out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.json --summary-markdown out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/repo-stewardship.md`
  - standard non-trivial validation/review floor before handoff
- Rollback plan:
  - revert the targeted `.ai-dev-tasks`, catalog, and prompt-surface edits if they introduce stale claims or validation regressions
  - reject the child-lane patch rather than accept a prompt-surface change that broadens the ownership story

## Risks & Mitigations
- Risk: the lane becomes a vague catalog rewrite instead of a bounded disposition pass.
  - Mitigation: keep every change tied to one of the named surfaces and record explicit non-goals in the spec and workpad.
- Risk: prompt-surface retention drifts into speculative design-policy prose.
  - Mitigation: accept only the smallest metadata patch that points to current local consumers.
- Risk: docs-first packet changes fail docs-review because registry mirrors lag.
  - Mitigation: update `docs/docs-freshness-registry.json` alongside the packet before running docs-review.

## Approvals
- Reviewer: pending
- Date: 2026-04-12
