# ACTION_PLAN - Control host: reconcile released-claim run metadata, operator advisories, and advisory-state truth after issue release

## Summary
- Goal: close `CO-294` by making post-release control-host truth surfaces stop presenting stale run pointers, stale blocker-derived unblock advice, and stale advisory JSON as current operator truth.
- Scope: docs-first packet, source inspection, focused implementation, regression coverage, validation, standalone review, elegance review, PR attachment/update, and review drain.
- Assumption: retained `provider-intake-state.json` history remains audit evidence; current operator truth should be sanitized or explicitly stale-labeled, not deleted.

## Issue Readiness Gate
- Protected terms carried forward: `released claims`, `run_manifest_path`, `manifest.json status=in_progress`, `provider-intake-state.json`, `provider-operator-autopilot.jsonl`, `ready_to_unblock`, `linear-advisory-state.json`, `refresh/rehydrate`, `CO-272`, `CO-278:Done`, PR `#571`, `CO-292`, `CO-286`, and `CO-211`.
- Not done if terminal issues still surface stale `in_progress` run pointers, autopilot still recommends unblock from stale terminal blocker edges, advisory JSON still appears current while sourced from a dead/stale path, or the fix only changes display text.
- Pre-implementation issue-quality review: approved on 2026-04-22 by the parent provider worker after issue-context, stale PR sweep, and dirty-workspace isolation. The issue spans run metadata, operator advisories, and advisory-state truth, so it is not a micro-task.

## Milestones & Sequencing
1. Bootstrap docs-first packet, task registry, freshness registry, checklist mirror, and workpad notes.
2. Run docs-review or record manifest-backed fallback before source implementation. Completed: `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-18-01-364Z-26084c74/manifest.json`.
3. Map provider-intake, selected-run/control-runtime, operator-autopilot, and advisory-state code paths.
4. Add focused regressions for stale terminal `in_progress` run pointers, stale `ready_to_unblock`, and stale advisory-state truth.
5. Implement the smallest reconciliation/classification changes that preserve audit history and active-lane attach/admission semantics.
6. Run targeted regressions, adjacent active-lane coverage, required repo gates, standalone review, elegance pass, PR attachment/update, `pr ready-review`, workpad refresh, and `In Review` handoff only after the drain is clean.

## Validation
- Required checks: docs-review, focused run-pointer regression, stale `ready_to_unblock` regression, stale/deprecated advisory-state regression, adjacent active-lane admission/attach tests, `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed standalone review, explicit elegance pass, and `npm run pack:smoke` when downstream-facing paths are touched.
- Rollback plan: revert the narrow reconciliation/classification changes and focused tests together if active-lane attach/admission regresses or retained audit evidence is lost.
## Risks & Mitigations
- Risks: broad run-pointer cleanup could destroy audit history, stale-advisory fallback changes could break consumers, and active-lane attach/cap behavior could regress. Mitigation: keep predicates post-release/terminal-only, preserve fallback when no newer truth exists, and cover adjacent active-lane behavior.
