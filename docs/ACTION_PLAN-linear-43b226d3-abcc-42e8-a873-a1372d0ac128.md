# ACTION PLAN - CO-569 preserve CO-558 May 20 retained docs freshness cohort owner

## Summary
- Goal: create the CO-569 docs-first packet and registry evidence while preserving the exact `docs:freshness:maintain` owner contract for retained cohort `co-558-may-20-apr-19-task-report-maintenance`.
- Scope: PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - parent owns live owner verification and any owner repair
  - `CO-558 terminal`, `co-558-may-20-apr-19-task-report-maintenance`, source breakdown `{"rolling_window":68}`, and sample paths remain historical/retained-cohort evidence
  - the child lane should leave a patch artifact only, with no commit

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `canonical owner key`
  - `terminal-owner replacement`
  - `completed-lane registry residue`
  - `rolling-debt cohort`
  - `co-430-terminal-owner-replacement`
  - `dry-run/no-token copyable body`
  - `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
  - `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
  - `co-558-may-20-apr-19-task-report-maintenance`
  - `CO-558 terminal`
  - `{"rolling_window":68}`
- Not done if:
  - the packet omits the exact canonical owner key or marker
  - registry rows for the six packet files are missing
  - owner routing can fall back to fuzzy title matching
  - terminal-owner replacement is collapsed into owner reuse
  - completed-lane registry residue, rolling-debt cohort, or `co-430-terminal-owner-replacement` are erased from the issue contract
  - historical packet evidence is deleted or hidden
  - the child lane edits parent-owned implementation, Linear, workpad, GitHub, PR, lifecycle, docs catalog, cohort guide, or validation logic surfaces
- Pre-implementation issue-quality review:
  - 2026-05-24: accepted framing is a docs-first exact-key retained-cohort owner packet, not a global freshness owner re-home, date refresh, historical cleanup, catalog repair, cohort-guide edit, validation-logic edit, or provider-worker implementation lane.
- Fallback / refactor decision:
  - No new runtime fallback or seam is introduced by this docs-only packet.
  - Parent must preserve fail-closed docs freshness behavior and route any larger owner-authority split back to the parent lane.

## Milestones & Sequencing
1. Create the docs-first packet:
   - `docs/PRD-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
   - `docs/TECH_SPEC-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
   - `docs/ACTION_PLAN-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
2. Create task mirrors:
   - `tasks/specs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
   - `tasks/tasks-linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
   - `.agent/task/linear-43b226d3-abcc-42e8-a873-a1372d0ac128.md`
3. Register `CO-569` in `tasks/index.json` with the exact canonical owner marker.
4. Add six active rows to `docs/docs-freshness-registry.json`.
5. Add the CO-569 snapshot to `docs/TASKS.md`.
6. Run child-lane scoped validation only:
   - JSON parse for `tasks/index.json`
   - JSON parse for `docs/docs-freshness-registry.json`
   - protected-term scan over declared packet files, registry, and task index
   - `git diff --check` on declared files
7. Parent imports the patch and then owns any remaining lifecycle:
   - inspect the source payload in the authoritative issue workspace
   - verify live Linear owner state
   - run `docs:freshness:maintain -- --format json`
   - run `docs:freshness`, `spec-guard --dry-run`, and any parent-required review gates
   - update workpad, PR, or Linear only if needed

## Dependencies
- Shared source anchor: `ctx:sha256:c8af3976f2797b2c26a63723a434192feb3b3b84545710ef72467d2da74a98c7#chunk:c000001`
- Shared source payload from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source payload from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/memory/source-0/source.txt`
- Shared source manifest from shared CO root: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from provider issue worktree root to shared CO root: `../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Shared source manifest from this document directory to shared CO root: `../../../.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Child docs-packet manifest: `.runs/linear-43b226d3-abcc-42e8-a873-a1372d0ac128/cli/2026-05-24T21-35-32-567Z-ea35fdc3/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance`
- Source breakdown: `{"rolling_window":68}`
- Sample paths:
  - `.agent/task/1299-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1300-coordinator-symphony-aligned-frontend-test-cli-help-surface-completion.md`
  - `.agent/task/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit.md`

## Validation
- Child lane checks:
  - `jq empty tasks/index.json`
  - `jq empty docs/docs-freshness-registry.json`
  - `rg -n "docs:freshness:maintain|canonical owner key|terminal-owner replacement|completed-lane registry residue|rolling-debt cohort|co-430-terminal-owner-replacement|dry-run/no-token copyable body|baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance|codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-20-apr-19-task-report-maintenance|co-558-may-20-apr-19-task-report-maintenance|CO-558 terminal" <declared CO-569 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `git diff --check -- <declared CO-569 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Rollback plan:
  - parent can reject this patch without touching implementation or lifecycle state
  - if imported, revert only the CO-569 packet files, `tasks/index.json` item, `docs/TASKS.md` snapshot, and `docs/docs-freshness-registry.json` rows

## Risks & Mitigations
- Risk: exact owner identity gets diluted into generic `docs:freshness:maintain` ownership.
  - Mitigation: every packet artifact names the `baseline_cohort_id` key and full marker.
- Risk: parent fixes the gate with a blind review-date bump or packet deletion.
  - Mitigation: packet acceptance criteria reject both and require historical evidence preservation.
- Risk: a terminal historical owner is accidentally reused.
  - Mitigation: packet preserves `terminal-owner replacement` and `CO-558 terminal` as evidence only.
- Risk: child lane drifts into lifecycle or implementation work.
  - Mitigation: task checklist records out-of-scope files and validates only declared files.

## Approvals
- Docs packet child lane: produced for parent import.
- Parent source inspection, validation, Linear state, PR lifecycle, and final review handoff remain parent-owned.

## 2026-05-26 Retained Cohort Resume
- CO-569 moved from Blocked to In Progress at 2026-05-26T04:04:59.655Z to resolve the May 20 retained docs freshness cohort.
- Scope remains exact: reclassify only co-558-may-20-apr-19-task-report-maintenance rows after evidence review; no CO-581 May 19 cleanup, no CO-579 global owner lifecycle, no spec pre-expiry work, no gate weakening, and no historical deletion.
- Live issue-context evidence verified CO-260 and CO-254 as Done/completed for the non-numbered cohort rows; task specs 1299-1302 are already done with no local open checklist obligations.
