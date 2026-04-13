---
id: 20260412-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59
title: CO: audit remaining top-level non-doc and config stewardship surfaces and prune low-value residue
relates_to: docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md
risk: medium
owners:
  - Codex
last_review: 2026-04-13
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`
- PRD: `docs/PRD-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`
- Task checklist: `tasks/tasks-linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59.md`

## Traceability
- Linear issue: `CO-139` / `2136ea50-1fdf-44c2-ae3c-0e8d8a364b59`
- Linear URL: https://linear.app/asabeko/issue/CO-139/co-audit-remaining-top-level-non-doc-and-config-stewardship-surfaces
- Source issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`

## Summary
- Objective: audit the remaining named top-level non-doc/config surfaces, refresh stale retained content, and sharpen their stewardship story without reopening `CO-126`.
- Scope:
  - bootstrap the `CO-139` docs-first packet, registry mirrors, and workpad source
  - capture present-day consumer evidence for `.ai-dev-tasks`, `.codex`, `adapters`, `eslint-plugin-patterns`, `patterns`, `prompt-snippets`, `types`, and root config files
  - update stale retained surfaces and sharpen stewardship catalog coverage for this slice
  - rerun `repo:stewardship` and capture explicit output artifacts
- Constraints:
  - no archive/reference cluster cleanup
  - no unrelated compatibility or runtime work
  - keep any prompt-surface change bounded to the reviewed child-lane patch or a smaller parent-owned alternative

## Technical Requirements
- Functional requirements:
  - record an explicit disposition for every targeted surface
  - refresh `.ai-dev-tasks/*.md` so the retained tasking prompts match the current docs-first/template workflow
  - encode sharper local rationale/checks for the targeted surface set in the stewardship catalog or equally local reviewable artifacts
  - review the `prompt-snippets/**` child-lane patch and accept only if it is bounded and truthful
  - rerun `repo:stewardship` with explicit report artifacts after implementation
- Non-functional requirements:
  - keep the diff reviewable and bounded
  - do not weaken fail-closed stewardship behavior
  - keep workpad, checklist, and packet language synchronized
- Interfaces / contracts:
  - `docs/repo-stewardship-catalog.json`
  - `scripts/repo-stewardship-audit.mjs`
  - `scripts/lib/docs-helpers.js`
  - `package.json`
  - `docs/design/PRD-frontend-design-pipeline-v2.md`
  - `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`
  - `tasks/frontend-design-pipeline-v2.md`

## Execution Update 2026-04-13
- Current repo truth before implementation:
  - `.ai-dev-tasks/*.md` is active but stale: the retained prompts still cite deprecated `.agent/task/*_TEMPLATE.md` paths and older identifier guidance
  - `.codex/orchestrator.toml` is a real repo-local policy surface referenced by provider-worker tests and delegation guidance
  - `adapters/**/*`, `eslint-plugin-patterns/**/*`, `patterns/**/*`, `types/**/*`, and root config files all have live code/test/package/docs consumers
  - the same-issue child lane `prompt-snippets-audit` completed successfully and proposed a bounded metadata-only patch to `prompt-snippets/frontend-aesthetics-v1.md`
  - no stray `.DS_Store` or similar filesystem cruft is currently tracked or present in the workspace
- Pre-implementation approval:
  - keep the lane bounded to stale-retained guidance plus sharper rationale/consumer evidence for the targeted surfaces
  - accept a prompt-surface patch only if it remains smaller than adding a new ownership surface
  - prefer explicit “keep and justify” or “update” outcomes over speculative deletes when current consumers exist
- Post-fix state:
  - `.ai-dev-tasks/*.md` now reflects the current docs-first packet shape, including the docs-side `TECH_SPEC` mirror, `tasks/index.json` `paths.docs` linkage, and the conditional `pack:smoke` handoff gate
  - the bounded `prompt-snippets/frontend-aesthetics-v1.md` metadata patch is accepted
  - `docs/repo-stewardship-catalog.json` exact entries keep the refreshed surfaces machine-checkable
  - the branch was fast-forwarded onto current `origin/main`; `git rev-list --left-right --count origin/main...HEAD` now reports `0 0`
  - post-sync reruns of `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, the explicit stewardship audit report, and `node scripts/diff-budget.mjs` are green after stripping provider-only `CODEX_ORCHESTRATOR_*` overrides from repo-local validation subprocesses
  - the forced standalone review wrapper executed successfully enough to emit telemetry, but it ended with `review_outcome: failed-boundary` and `termination_boundary.kind=command-intent` / `provenance=validation-suite` after the reviewer launched a validation suite; the current manual fallback note and explicit elegance pass are recorded under `out/linear-2136ea50-1fdf-44c2-ae3c-0e8d8a364b59/manual/`

## Architecture & Data
- Architecture / design adjustments:
  - retain the broad catalog as fallback, but add sharper exact-path or narrow-pattern entries where they improve machine-checkable truth for this slice
  - keep `prompt-snippets/**` as a prompt surface only if the retained file carries truthful consumer metadata or equivalent local rationale
  - treat the task packet as the human-readable disposition matrix for this issue and the catalog as the ongoing machine-checkable surface
- Data model changes / migrations:
  - refresh three retained `.ai-dev-tasks` markdown files
  - likely add or refine exact entries in `docs/repo-stewardship-catalog.json`
  - optionally accept a one-file prompt snippet metadata patch
- External dependencies / integrations:
  - none beyond existing internal docs, tests, and the repo stewardship audit

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
  - docs-review passes or produces a truthful packet-local fallback before implementation continues
  - the post-change stewardship report shows the target set clean or explicitly justified
  - the workpad reflects the final dispositions, child-lane decision, and validation status
- Monitoring / alerts:
  - rely on recurring `repo:stewardship` plus future packet readers; no new automation is added here

## Open Questions
- Resolved: the prompt-surface is better served by inline metadata than by a dedicated folder-level `README.md` for the current one-file surface.

## Approvals
- Reviewer: docs-review packet-local rerun recorded; standalone review boundary failure manually closed with explicit fallback and elegance
- Status: validation green; PR/review handoff pending
- Date: 2026-04-13
