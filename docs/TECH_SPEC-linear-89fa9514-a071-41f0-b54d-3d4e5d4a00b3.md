---
id: 20260411-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3
title: CO: resolve weakly-owned historical reference and archive residue surfaced by repo stewardship audit
relates_to: docs/PRD-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md
risk: medium
owners:
  - Codex
last_review: 2026-04-11
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`
- PRD: `docs/PRD-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`
- Task checklist: `tasks/tasks-linear-89fa9514-a071-41f0-b54d-3d4e5d4a00b3.md`

## Traceability
- Linear issue: `CO-126` / `89fa9514-a071-41f0-b54d-3d4e5d4a00b3`
- Linear URL: https://linear.app/asabeko/issue/CO-126/co-resolve-weakly-owned-historical-reference-and-archive-residue
- Source issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`

## Summary
- Objective: resolve the bounded historical residue cluster still surfaced by `repo:stewardship` without reopening the audit contract itself.
- Scope:
  - bootstrap the `CO-126` docs-first packet, workpad source, and registry mirrors
  - keep still-referenced `reference/**` history with boundary-local rationale anchors
  - delete the orphaned archive JSON residue if it remains unreferenced
  - rerun `repo:stewardship` and capture reviewable audit artifacts for the targeted cluster
- Constraints:
  - no repo-wide stewardship catalog redesign
  - no unrelated reference/archive cleanup
  - no reopening of broader historical-cleanup issues

## Technical Requirements
- Functional requirements:
  - make every currently flagged historical path resolve to a truthful keep/delete decision
  - retain `reference/0956-subagents-skill-codex-cli-refresh/*` only with a subtree-local README anchor
  - retain `reference/mirror.config.wp.example.json` only with a root-level rationale anchor under `reference/`
  - delete `archives/REPORT.mcp_code_mode.json` if no current repo references justify keeping it
  - prove the targeted residue cluster is cleared by rerunning the audit
- Non-functional requirements:
  - keep the diff small and reviewable
  - avoid speculative rationale prose
  - keep audit behavior fail-closed and unchanged
- Interfaces / contracts:
  - `reference/**` and `archives/**` `retain_with_rationale` rules in `docs/repo-stewardship-catalog.json`
  - `scripts/repo-stewardship-audit.mjs`
  - `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`
  - `docs/guides/pixel-perfect-local-clones.md`

## Execution Update 2026-04-11
- Current repo truth before implementation:
  - `npm run repo:stewardship` reports exactly six action-required historical surfaces and zero uncatalogued files
  - the 0956 evidence pack is still referenced by `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`
  - the WordPress mirror example is still referenced by `docs/guides/pixel-perfect-local-clones.md`
  - `archives/REPORT.mcp_code_mode.json` has no current repo references, and its markdown sibling is already gone
- Pre-implementation approval:
  - keep the lane bounded to current residue truth, add only the anchors still justified by live references, and prefer deletion for the orphan archive surface

## Architecture & Data
- Architecture / design adjustments:
  - treat a root-level rationale anchor under `reference/` as the local boundary for retained root-level reference history
  - treat a subtree-local rationale anchor inside `reference/0956-subagents-skill-codex-cli-refresh/` as the boundary for the 0956 evidence pack
  - avoid introducing `archives/README.md` just to keep an otherwise orphaned single JSON file
- Data model changes / migrations:
  - add two README anchors under `reference/`
  - delete one stale JSON payload under `archives/`
- External dependencies / integrations:
  - none beyond existing internal doc/spec references and the stewardship audit

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - `npm run repo:stewardship`
  - explicit `node scripts/repo-stewardship-audit.mjs --report ... --summary-markdown ...`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
- Rollout verification:
  - pre-change audit output names the six-path residue cluster
  - post-change audit output no longer reports those paths as unexplained `update`
  - workpad reflects the exact dispositions and validation status
- Monitoring / alerts:
  - rely on the existing recurring `repo:stewardship` lane for ongoing detection

## Open Questions
- None expected beyond confirming the archive JSON stays unreferenced during implementation.

## Approvals
- Reviewer: pending
- Status: in progress
- Date: 2026-04-11
