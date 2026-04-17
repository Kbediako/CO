# Task Checklist - linear-901cd944-fc0c-4372-92ce-65bb8bb411c0

- Linear Issue: `CO-209` / `901cd944-fc0c-4372-92ce-65bb8bb411c0`
- MCP Task ID: `linear-901cd944-fc0c-4372-92ce-65bb8bb411c0`
- Primary PRD: `docs/PRD-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- Task spec: `tasks/specs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`

## Docs-First
- [x] PRD drafted for the Apr 17 `docs:freshness` stale cohort blocker. Evidence: `docs/PRD-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, parity matrix, requirements, and validation plan. Evidence: `docs/TECH_SPEC-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`, `tasks/specs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`, `.agent/task/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`.
- [x] Parent updates registry mirrors before implementation. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Parent docs-review evidence captured before implementation. Evidence: `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-review/cli/2026-04-17T00-48-00-977Z-d429f7b5/manifest.json` (pre-fix docs-review reached spec guard, then failed on the known `docs:freshness:maintain` baseline blocker).

## Source / Assumptions
- [x] Source-0 anchor recorded. Evidence: `ctx:sha256:c985cc4a17a960ff77ecc05c01c47f3154a8cbf57629da5645f50ad8108cfeb9#chunk:c000001`.
- [x] Child lane verified source-0 payload content is metadata/provenance only, not the full issue body. Evidence: `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-packet/cli/2026-04-17T00-34-04-191Z-44a13a0d/memory/source-0/source.txt`.
- [x] Child lane read the issue body through the packaged read-only issue-context helper without Linear mutation. Evidence: `linear issue-context --issue-id 901cd944-fc0c-4372-92ce-65bb8bb411c0 --format json` output in local terminal.
- [x] Parent/child ownership split recorded. Evidence: this checklist and the task spec readiness gate.

## Parent Implementation
- [x] Reproduce before `npm run docs:freshness` on current main or selected baseline and save report under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/`. Evidence: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness.json` (`stale_entries=263`, rolling cohort entries `221`).
- [x] Reproduce before `npm run docs:freshness:maintain` and save report under the same `out/` path. Evidence: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/docs-freshness-maintenance.json` (`freshness_decision=block_policy_over_budget`, `blocking_changed_paths=[]`, capacity `484/300` rows and `8/2` cohorts).
- [x] Classify Apr 17 `last_review=2026-03-17` stale cohort by doc class, path family, task lineage, and recommended disposition. Evidence: `docs/findings/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-freshness-classification.md`.
- [x] Decide whether each group is reviewed/refreshed, archived, reclassified, or assigned a new explicit owner path. Evidence: classification artifact records CO-209 reviewed/refresh disposition for all Apr 17 rows while preserving CO-175 rolling ownership.
- [x] Apply the smallest docs/registry/archive changes needed for the chosen disposition. Evidence: `docs/docs-freshness-registry.json` refreshes the 263 Apr 17 rows; `docs/guides/docs-freshness-cohorts.md` records the owner-action rationale; no rolling caps/windows changed.
- [x] Record before/after stale counts, candidate-cohort counts, policy capacity status, and exact artifacts. Evidence: before reports under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/before/` and after reports under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/after/`.
- [x] Confirm CO-207 or a similar unrelated clean feature lane no longer needs to own this historical maintenance debt. Evidence: after maintenance report `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/after/docs-freshness-maintenance.json` returns `pass_with_owned_rolling_debt` with `blocking_changed_paths=[]`.

## Validation
- [x] Child target-file presence, scoped whitespace check, and task/.agent mirror parity. Evidence: local child command output.
- [x] Parent `node scripts/spec-guard.mjs --dry-run`. Evidence: local run passed on 2026-04-17.
- [x] Parent `npm run docs:check`. Evidence: local run passed on 2026-04-17.
- [x] Parent `npm run docs:freshness`. Evidence: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/after/docs-freshness.json` and rerun artifact `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/after/docs-freshness-rerun.json` (`stale_entries=0`).
- [x] Parent `npm run docs:freshness:maintain` or equivalent allowed maintenance-decision proof for clean diffs. Evidence: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/after/docs-freshness-maintenance.json` (`freshness_decision=pass_with_owned_rolling_debt`, capacity `221/300` rows and `1/2` cohorts).
- [x] Parent standalone review. Evidence: `../../.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/cli/2026-04-17T00-30-34-564Z-3788b7dc/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`, command-intent retry found no actionable correctness issues).
- [x] Parent elegance/minimality pass. Evidence: `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/manual/elegance-review.md`.

## Handoff Status
- [x] Child lane leaves docs packet changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent applies/accepts child-lane patch artifact. Evidence: child lane succeeded with `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-packet/cli/2026-04-17T00-34-04-191Z-44a13a0d/provider-linear-child-lane.patch`; helper accept invalidated on stale Linear `updated_at`, so parent reviewed and applied the saved patch without file-scope collision.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending PR/review handoff.

## Progress Log
- 2026-04-17: Created the scoped docs-first packet from CO-209 issue-context output while preserving protected terms, non-goals, parent ownership, and the source-0 metadata-only caveat.
- 2026-04-17: Reproduced the Apr 17 blocker, classified the 263-row cohort, refreshed the reviewed rows under CO-209 ownership, and restored `docs:freshness` plus maintenance policy to green for clean unrelated diffs.
- 2026-04-17: Manifest-backed standalone review completed with bounded success and no actionable correctness issues; manual elegance pass found no simplification patch needed.

## Relevant Files
- `docs/PRD-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- `docs/TECH_SPEC-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- `docs/ACTION_PLAN-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- `tasks/specs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- `tasks/tasks-linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`
- `.agent/task/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0.md`

## Notes
- Registry mirrors were parent-owned because the child lane was scoped to the six packet files; parent updated them after applying the child patch artifact.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, or provider-worker review-handoff policy.
- Do not silently bump `last_review` dates.
- Do not expand rolling caps/windows to make unrelated lanes pass.
