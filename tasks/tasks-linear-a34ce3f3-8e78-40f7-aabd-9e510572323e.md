# Task Checklist - linear-a34ce3f3-8e78-40f7-aabd-9e510572323e

- Linear Issue: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`
- MCP Task ID: `linear-a34ce3f3-8e78-40f7-aabd-9e510572323e`
- Primary PRD: `docs/PRD-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`
- TECH_SPEC: `tasks/specs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`

## Docs-First
- [x] PRD drafted for the repo-wide docs-freshness baseline-repair lane blocking review handoffs. Evidence: `docs/PRD-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`.
- [x] TECH_SPEC drafted with the bounded stale-set classification and remediation seam. Evidence: `tasks/specs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`, `docs/TECH_SPEC-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`.
- [x] ACTION_PLAN drafted for docs-review, remediation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries and final freshness remediation. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`. Evidence: `.agent/task/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e.md` `review_notes`.
- [x] docs-review approval or explicit override captured for `linear-a34ce3f3-8e78-40f7-aabd-9e510572323e`. Evidence: `.runs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e-co-63-docs-review/cli/2026-04-01T07-11-48-884Z-87ad2dc9/manifest.json`, `.runs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e-co-63-docs-review-final/cli/2026-04-01T07-51-27-509Z-b1c52299/manifest.json`, `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T072517Z-baseline-classification/00-classification.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-63`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad --body-file /tmp/co-63-workpad.md` created comment `2989fa21-5ac5-4f91-94f0-7d45ce29bd94` on `CO-63`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-63-clear-docs-freshness-baseline`.

## Investigation
- [x] The live repo-wide `docs:freshness` failure shape is reproduced on this branch. Evidence: `npm run docs:freshness` currently reports `171` stale docs.
- [x] The stale set is explicitly classified into active guidance versus non-active implementation material. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T072517Z-baseline-classification/00-classification.md`.

## Implementation
- [x] The smallest truthful baseline repair is recorded for every stale-doc class that currently blocks `docs:freshness`. Evidence: `docs/docs-freshness-registry.json`, `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T072517Z-baseline-classification/00-classification.md`.
- [x] Review handoff lanes can cite `CO-63` as the baseline-repair lane rather than carrying unrelated stale-doc debt themselves. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e-co-63-docs-review-final/docs-freshness.json`, `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T072517Z-baseline-classification/00-classification.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-63-docs-review --format json`. Evidence: `.runs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e-co-63-docs-review/cli/2026-04-01T07-11-48-884Z-87ad2dc9/manifest.json`, `.runs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e-co-63-docs-review-final/cli/2026-04-01T07-51-27-509Z-b1c52299/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/delegation-guard.mjs`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/19-delegation-guard-final.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/17-spec-guard-post-review-fix.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run build`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/20-build-final.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run lint`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/21-lint-final.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run test`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/22-test-final.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:check`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/15-docs-check-post-review-fix.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:freshness`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/16-docs-freshness-post-review-fix.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/diff-budget.mjs`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/23-diff-budget-final.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/24-standalone-review-summary.md`, `.runs/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/cli/2026-04-01T07-00-46-013Z-488d525d/review/telemetry.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run pack:smoke` not required for the final docs-only diff. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/26-pack-smoke-skip.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-a34ce3f3-8e78-40f7-aabd-9e510572323e/manual/20260401T075903Z-handoff-gates/25-elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue is currently `In Progress`.
