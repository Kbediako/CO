---
id: 20260401-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e
title: 'CO: clear repo-wide docs:freshness baseline blocking review handoffs'
relates_to: docs/PRD-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md
risk: high
owners:
  - Codex
last_review: 2026-04-01
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`
- PRD: `docs/PRD-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`
- Task checklist: `tasks/tasks-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`

## Traceability
- Linear issue: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`
- Linear URL: https://linear.app/asabeko/issue/CO-63/co-clear-repo-wide-docsfreshness-baseline-blocking-review-handoffs

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: clear the repo-wide stale-doc baseline that blocks truthful review handoffs even when an implementation lane itself is ready.
- Scope:
  - docs-first registration for the current Linear provider-worker lane
  - audited child docs-review for the packet
  - reproduction and classification of the stale-doc set currently failing `docs:freshness`
  - minimal truthful remediation using registry updates, archive-policy application, and active-doc review-date refreshes where warranted
  - required validation, standalone review, and elegance review before PR handoff
- Constraints:
  - keep `CO-62` feature logic out of scope
  - do not weaken the `docs:freshness` gate
  - do not mark active docs as fresh or archived without explicit rationale

## Technical Requirements
- Functional requirements:
  - reproduce the current `docs:freshness` failure and preserve the report artifact
  - classify stale entries into active guidance that needs review versus historical or implementation docs that should be archived or reclassified
  - update the registry and any affected docs or archive stubs so `docs:freshness` passes truthfully
  - register the `CO-63` issue packet and keep mirrors in sync
- Non-functional requirements:
  - keep the diff audit-friendly and explicitly scoped to docs freshness baseline repair
  - prefer existing repo policy and automation over one-off undocumented reclassification rules
  - preserve deterministic worker-lane validation behavior
- Interfaces / contracts:
  - docs freshness contract: `scripts/docs-freshness.mjs` and `docs/docs-freshness-registry.json`
  - implementation docs archive contract: `scripts/implementation-docs-archive.mjs` and `docs/implementation-docs-archive-policy.json`
  - worker docs-first mirrors: `tasks/index.json`, `docs/TASKS.md`, `tasks/specs/**`, `tasks/tasks-*.md`, `.agent/task/*.md`

## Architecture & Data
- Architecture / design adjustments:
  - use the existing docs-first packet and docs-review pipeline as the authoritative pre-implementation record
  - let the stale-set classification drive the remediation: archive completed implementation docs where policy already says they are no longer active; refresh still-active guidance only after a lane-owned review pass
  - keep any newly discovered larger docs-policy gaps out of scope unless they are required for this baseline to become truthful
- Data model changes / migrations:
  - `docs/docs-freshness-registry.json` entries for the new packet and for the stale-set remediation
  - possible archive stubs and registry status changes for completed implementation docs if the archive policy is exercised
- External dependencies / integrations:
  - packaged `linear child-stream`
  - repo-local validation scripts
  - GitHub PR lifecycle only after the baseline repair is validated

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-63-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/implementation-docs-archive.mjs --dry-run`
  - required repo validation floor on the final diff:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
    - `FORCE_CODEX_REVIEW=1 npm run review`
    - `npm run pack:smoke` when the final diff is not docs-only (skip it for docs-only closeouts like this lane)
- Rollout verification:
  - confirm the final stale-entry count is `0`
  - confirm that the final registry reflects the new active/archive truth instead of a blanket date bump
  - confirm the issue workpad and mirrors explain the distinction between refreshed active docs and reclassified non-active docs
- Monitoring / alerts:
  - if the stale set reveals a larger archive-policy/tooling gap that this lane cannot truthfully finish, create a follow-up rather than diluting the acceptance contract

## Open Questions
- The core product question is already answered: the blocker is repo-wide freshness debt, not `CO-62`. The remaining engineering question is the exact split between archive-policy candidates and genuinely active guidance that must be re-reviewed.

## Approvals
- Reviewer: Pending docs-review, implementation validation, and standalone/elegance review
- Remaining: stale-set classification, final baseline repair, PR validation, and handoff
- Date: 2026-04-01
