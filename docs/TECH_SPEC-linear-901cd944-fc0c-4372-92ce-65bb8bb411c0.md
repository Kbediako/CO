---
id: 20260417-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0
title: CO workflow refresh Apr 17 docs freshness stale cohort blocking handoffs
relates_to: docs/PRD-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Summary
- Objective: define the CO-209 implementation contract for resolving the Apr 17 `docs:freshness` stale cohort so unrelated feature lanes no longer fail with `block_policy_over_budget`.
- Scope: docs-first packet, issue-shaping contract, protected terms, cohort classification requirements, disposition options, parent-owned validation, and explicit non-goals.
- Constraints: this child lane cannot mutate Linear, cannot edit outside the six scoped docs/task files, cannot update registry mirrors, and cannot run full repo validation.

## Issue-Shaping Contract
- User-request translation carried forward: CO-209 owns the Apr 17 historical docs freshness blocker surfaced during CO-207 validation. The lane must resolve or explicitly re-own the `last_review=2026-03-17` / lineage `1251-1288` stale cohort without making CO-207 or unrelated feature lanes own historical docs maintenance.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `block_policy_over_budget`, `freshness_decision=block_policy_over_budget`, `CO-175`, `Task Packet`, `Task Mirror`, `Report Only`, `1251-1288`, `last_review=2026-03-17`, `blocking_changed_paths=0`, `co-175-apr-14-march-14-tasks-1164-1195`, `221` rows, `263` stale docs, `484` candidate rows, `8` candidate cohorts, `300` rows, `2` cohorts, `CO-207`, `CO-196`, `docs/guides/docs-freshness-cohorts.md`.
- Nearby wrong interpretations to reject: CO-207 refreshes unrelated historical docs, registry `last_review` dates are bumped without evidence, freshness caps/windows are expanded just to pass, CO-175 is reopened by implication, CO-196 packaging enters scope, or freshness/spec-guard/provider-worker review policy is weakened.
- Explicit non-goals carried forward: no CO-207 promotion-gate changes, no CO-196 marketplace descriptor or packaging work, no policy weakening, no blind date bump, no rolling cap/window expansion, and no implicit CO-175 reopening.

## Parity / Alignment Matrix
- Current truth: `npm run docs:freshness` fails with `263` stale docs; `npm run docs:freshness:maintain` reports `block_policy_over_budget`; `blocking_changed_paths=0`; the over-budget shape combines the `221` CO-175 rolling rows with a new Apr 17 candidate cohort for March 17 reviewed task/report rows.
- Reference truth: docs freshness maintenance can preserve strict gate behavior while historical cohorts are reviewed, refreshed, archived, reclassified, or explicitly re-owned.
- Target truth / intended delta: the Apr 17 stale cohort has a machine-checkable owner action and unrelated feature-lane validation no longer needs bespoke stale-baseline caveats for the same cohort.
- Explicitly out-of-scope differences: cloud-canary gate logic, marketplace packaging, freshness policy caps/windows, provider-worker handoff policy, and unrelated docs registry churn.

## Readiness Gate
- Not done if:
  - the before reports are not captured under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/`
  - the cohort is not classified by doc class, path family, task lineage, and disposition
  - the resolution is a blind `last_review` bump
  - `docs:freshness:maintain` still blocks clean unrelated feature diffs with `blocking_changed_paths=0`
  - CO-207 remains responsible for this historical stale cohort
- Pre-implementation issue-quality review evidence: this spec and PRD preserve the issue prompt, protected terms, wrong interpretations to reject, explicit non-goals, parity matrix, and parent-owned validation plan.
- Safeguard ownership split: child lane owns only the six scoped packet files; parent owns registry mirrors, reports, cohort source changes, validation, workpad, Linear transitions, PR, and merge.

## Technical Requirements
- Functional requirements:
  1. Reproduce `npm run docs:freshness` on the selected baseline and save the machine-readable report under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/`.
  2. Reproduce `npm run docs:freshness:maintain` and save the maintenance report under the same issue `out/` path.
  3. Parse the Apr 17 `last_review=2026-03-17` stale cohort by doc class: `Task Packet`, `Task Mirror`, and `Report Only`.
  4. Classify affected path families: `.agent/task`, `tasks/specs`, `tasks/tasks-*`, `docs/findings`, `docs/PRD-*`, `docs/TECH_SPEC-*`, and `docs/ACTION_PLAN-*`.
  5. Classify affected task lineage `1251-1288` and preserve the existing CO-175 rolling cohort distinction.
  6. Choose and document one disposition per class/path family: review/refresh, archive, reclassify, or assign a new explicit owner path.
  7. Apply only the minimum docs/registry/archive changes needed for that disposition.
  8. Record before/after stale counts, candidate row counts, candidate cohort counts, and policy capacity status.
  9. Confirm unrelated feature-lane diffs with `blocking_changed_paths=0` have a green or explicitly allowed maintenance path.
- Non-functional requirements (performance, reliability, security): no live Linear mutation from child lanes; no full validation in this docs-packet child lane; no policy weakening; no hidden registry churn; every disposition must cite evidence.
- Interfaces / contracts:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `docs/docs-freshness-registry.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - docs/task archive automation when the selected disposition requires archiving

## Architecture & Data
- Architecture / design adjustments: none in this child lane. Parent should use existing docs freshness maintenance and archive mechanisms before adding new policy or script behavior.
- Data model changes / migrations: avoid schema changes unless existing `docs:freshness` outputs cannot represent the required owner action or disposition.
- External dependencies / integrations: Linear issue context is read-only for this packet; parent owns any Linear workpad updates and PR integration.

## Validation Plan
- Child-lane checks:
  - exact six target files exist
  - `git diff --check` over the six target files
  - no full repo validation suites
- Parent-lane checks:
  - before `npm run docs:freshness` report saved
  - before `npm run docs:freshness:maintain` report saved
  - cohort classification artifact saved under the CO-209 issue path
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain` or equivalent allowed maintenance-decision proof for clean diffs
  - standalone review and elegance/minimality pass before handoff
- Rollout verification: parent records before/after counts, exact artifacts, and a workpad update proving CO-207 no longer carries this baseline debt.
- Monitoring / alerts: future date-boundary stale cohorts should remain visible through docs freshness maintenance outputs, not hidden by cap/window changes.

## Open Questions
- Resolved 2026-04-17: CO-209 is the explicit owner path for the Apr 17 `last_review=2026-03-17` refresh; CO-175 remains the owner for the existing Apr 14 March 14 rolling cohort.
- Resolved 2026-04-17: `Report Only` artifacts were reviewed/refreshed with their task lineage instead of archived or reclassified because they remain part of active historical evidence.
- Resolved 2026-04-17: the saved freshness reports plus registry paths were sufficient for classification, so no new extraction helper was added.

## Approvals
- Reviewer: parent docs-review captured the known pre-fix maintenance blocker before implementation; final review evidence is tracked in the task checklist.
- Date: 2026-04-17
