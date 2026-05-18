# PRD - CO Workflow: Refresh Apr 17 docs:freshness Stale Cohort Blocking Handoffs

## Summary
- Problem Statement: after the 2026-04-17 UTC date boundary, CO-207 post-merge validation reproduced a repo-wide `docs:freshness` blocker outside the CO-207 cloud-canary promotion-gate scope. Current evidence reports `263` stale docs, `docs:freshness:maintain` returning `freshness_decision=block_policy_over_budget`, and `blocking_changed_paths=0`, so unrelated feature lanes can be blocked by historical docs freshness debt they do not own.
- Desired Outcome: restore a truthful green docs freshness path for unrelated feature lanes by reviewing, refreshing, archiving, reclassifying, or explicitly re-owning the Apr 17 historical stale cohort without weakening `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, provider-worker review-handoff policy, or CO-207 scope boundaries.

## Source Traceability
- Linear issue: `CO-209` / `901cd944-fc0c-4372-92ce-65bb8bb411c0`
- Linear title: `CO workflow: refresh Apr 17 docs:freshness stale cohort blocking handoffs`
- Source issue: `CO-207` / `6b0183b4-9ebc-4423-a356-4105ce8aa32b`
- Source payload anchor: `ctx:sha256:c985cc4a17a960ff77ecc05c01c47f3154a8cbf57629da5645f50ad8108cfeb9#chunk:c000001`
- Source payload path: `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-packet/cli/2026-04-17T00-34-04-191Z-44a13a0d/memory/source-0/source.txt`
- Source payload note: the source-0 payload carries run metadata and prompt-pack provenance only; the issue body was read through the packaged read-only `linear issue-context --issue-id 901cd944-fc0c-4372-92ce-65bb8bb411c0 --format json` helper.
- Workpad source: Linear workpad comment `37788d3f-cd25-4baa-b84d-2fa398a16ca1`

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): create the CO-209 docs-first packet for the Apr 17 docs freshness baseline blocker. The implementation lane must own the historical `last_review=2026-03-17` stale cohort and make unrelated feature lanes green again without forcing CO-207 to refresh unrelated docs or weakening the freshness gate.
- Success criteria / acceptance:
  - Reproduce `npm run docs:freshness` and `npm run docs:freshness:maintain` on current main or the selected baseline branch and save reports under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/`.
  - Classify the Apr 17 `last_review=2026-03-17` stale cohort by doc class, path family, task lineage, and recommended disposition.
  - Decide whether the cohort is reviewed/refreshed, archived, reclassified, or assigned a new explicit owner path.
  - Restore a truthful green path for unrelated feature-lane validation, including `npm run docs:freshness` or an allowed maintenance decision for clean diffs.
  - Record before/after stale counts, candidate-cohort counts, policy capacity status, and exact artifacts.
  - Confirm CO-207 or any similar unrelated feature lane no longer needs to own this historical maintenance debt.
- Constraints / non-goals: this child lane creates only the scoped docs packet files. Parent owns registry mirrors, report generation, cohort edits, validation, Linear state, workpad updates, PR lifecycle, and merge.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `block_policy_over_budget`
  - `CO-175`
  - `Task Packet`
  - `Task Mirror`
  - `Report Only`
  - `1251-1288`
  - `last_review=2026-03-17`
  - `blocking_changed_paths=0`
- Protected terms / exact artifact and surface names:
  - `freshness_decision=block_policy_over_budget`
  - `co-175-apr-14-march-14-tasks-1164-1195`
  - `221` rolling rows
  - `263` stale docs
  - `484` candidate rows
  - `8` candidate cohorts
  - `300` rows
  - `2` cohorts
  - `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/docs-freshness.json`
  - `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/docs-freshness-maintenance.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `linear/co-207-cloud-canary-fallback-gate`
  - `04741497f`
- Nearby wrong interpretations to reject:
  - making CO-207 refresh unrelated historical docs
  - silently bumping `last_review` without review, archive, reclassification, or owner-action evidence
  - increasing rolling freshness caps or windows merely to make unrelated feature lanes pass
  - weakening `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, or provider-worker review-handoff policy
  - reopening CO-175 without an explicit owner decision backed by current evidence
  - treating CO-196 marketplace descriptors or packaging as part of this lane

## Parity / Alignment Matrix
| Dimension | Current Truth | Reference Truth | Target Truth / Intended Delta | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Docs freshness gate | `npm run docs:freshness` fails with `263` stale docs while CO-207 diff-local freshness paths are clean. | `docs:freshness` should block true stale docs debt but should not force unrelated feature lanes to own historical baselines. | CO-209 owns the Apr 17 stale cohort and restores a green or explicitly allowed maintenance path for clean unrelated diffs. | Weakening the gate or suppressing stale docs without owner action. |
| Maintenance policy budget | `docs:freshness:maintain` reports `freshness_decision=block_policy_over_budget`. | Current caps are `300` candidate rows and `2` candidate cohorts. | Candidate rows/cohorts return within allowed policy or a recorded owner decision handles the over-budget cohort. | Raising caps/windows to pass by policy dilution. |
| Cohort ownership | Maintenance report owner path is `CO-175`, but CO-175 is already `Done` for the Apr 14 rolling policy. | The existing rolling cohort is `co-175-apr-14-march-14-tasks-1164-1195` with `221` rows. | The new Apr 17 `last_review=2026-03-17` cohort gets explicit current ownership and disposition. | Reopening CO-175 by implication rather than explicit owner decision. |
| New stale cohort | New blocking candidate has `last_review=2026-03-17`, `cadence_days=30`, `age_days=31`, `overdue_days=1`, lineage `1251-1288`. | Stale cohorts should be reviewed, archived, reclassified, or explicitly re-owned. | Classification covers doc class, path family, task lineage, and recommended disposition. | Blind registry date bumps. |
| CO-207 boundary | CO-207 completed the cloud-canary evidence path but cannot complete normal handoff while the repo-wide baseline is over budget. | Follow-up issues should isolate unrelated maintenance debt. | CO-207 and similar feature lanes no longer need bespoke stale-baseline caveats for this cohort. | CO-207 cloud-canary promotion-gate implementation changes. |

## Not Done If
- `npm run docs:freshness` still fails on current main with the Apr 17 `1251-1288` historical cohort and no explicit owner action.
- `npm run docs:freshness:maintain` still reports `block_policy_over_budget` for unrelated feature-lane diffs with `blocking_changed_paths=0`.
- The fix is only a blind registry date bump without review, archive, reclassification, or owner-action rationale.
- The solution expands rolling caps/windows instead of resolving or explicitly re-owning the historical cohort.
- Active feature lanes still need bespoke stale-baseline caveats for this same Apr 17 cohort.

## Goals
- Register the CO-209 docs-first packet and preserve the issue-shaping contract before implementation.
- Classify the Apr 17 historical stale cohort by class, path family, lineage, and disposition.
- Keep the freshness gate strict while making unrelated feature lanes green again.
- Record machine-checkable before/after evidence under the CO-209 `out/` path.

## Non-Goals
- Do not implement or modify CO-207 cloud-canary promotion-gate logic.
- Do not implement CO-196 marketplace descriptors or packaging changes.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, or provider-worker review-handoff policy.
- Do not increase rolling freshness caps or windows merely to make unrelated lanes pass.
- Do not silently bump `last_review` dates without review, archive, reclassification, or owner-action evidence.
- Do not reopen CO-175 unless that is an explicit owner decision backed by current evidence.

## Stakeholders
- Product: CO operators needing unrelated feature lanes to pass handoff gates without inheriting stale historical docs debt.
- Engineering: docs freshness, docs archive, task registry, provider-worker review-handoff, and CO-207 promotion-gate maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: before/after stale counts recorded; candidate row and cohort counts recorded; `blocking_changed_paths=0` feature-lane validation no longer fails on the Apr 17 cohort; disposition is explicit for every affected class/path family.
- Guardrails / Error Budgets: no silent review-date bumps, no policy cap widening, no freshness/spec-guard weakening, no unrelated CO-207 or CO-196 implementation.

## User Experience
- Personas:
  - CO maintainer triaging a feature-lane validation failure after a date boundary.
  - Provider-worker reviewer deciding whether a feature PR can proceed when diff-local freshness is clean.
  - Docs steward reviewing stale task packets and report-only artifacts.
- User Journeys:
  - Maintainer opens CO-209 and sees the exact Apr 17 stale cohort, current counts, owner path ambiguity, and forbidden shortcuts.
  - Parent implementer runs the before reports, classifies the cohort, applies the smallest disposition change, and records after reports.
  - Reviewer confirms unrelated feature lanes no longer carry the same stale-baseline caveat.

## Technical Considerations
- Architectural Notes: prefer existing docs freshness maintenance, archive, registry, and docs catalog mechanisms. Add new policy only if current surfaces cannot express the required explicit owner action.
- Dependencies / Integrations: `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, docs archive automation, `docs/guides/docs-freshness-cohorts.md`, and parent-owned reports under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/`.

## Open Questions
- Resolved 2026-04-17: parent classified the affected path families and chose a CO-209 reviewed/refresh disposition for all Apr 17 rows, with the rationale recorded in `docs/findings/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-freshness-classification.md`.
- Resolved 2026-04-17: CO-175 remains the explicit rolling owner for the Apr 14 March 14 cohort only; CO-209 owns the Apr 17 `last_review=2026-03-17` refresh action.
- Resolved 2026-04-17: `Report Only` rows were refreshed with their source lineage instead of archived or reclassified because they are part of the same March 17 task lineage.

## Approvals
- Product: issue accepted via CO-209.
- Engineering: implementation completed after parent docs-review reproduced the known pre-fix maintenance blocker; final review evidence is tracked in the task checklist.
- Design: Not applicable.
