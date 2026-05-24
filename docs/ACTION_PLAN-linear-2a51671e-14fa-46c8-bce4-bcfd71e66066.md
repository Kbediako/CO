# ACTION PLAN - CO-581 preserve CO-558 May 19 retained docs freshness cohort owner

## Summary
- Goal: create the CO-581 docs-first packet and registry evidence while preserving the exact `docs:freshness:maintain` owner contract for retained cohort `co-558-may-19-apr-18-task-report-maintenance`.
- Scope: PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - parent owns live owner verification and any owner repair
  - `CO-568 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, and sample paths remain historical/retained-cohort evidence
  - this child lane should leave a patch artifact only, with no commit

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `canonical owner key`
  - `terminal-owner replacement`
  - `completed-lane registry residue`
  - `rolling-debt cohort`
  - `co-430-terminal-owner-replacement`
  - `dry-run/no-token copyable body`
  - `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `co-558-may-19-apr-18-task-report-maintenance`
  - `CO-568 terminal`
  - `{"rolling_window":71}`
- Not done if:
  - the packet omits the exact canonical owner key or marker
  - registry rows for the six packet files are missing
  - owner routing can fall back to fuzzy title matching
  - terminal-owner replacement is collapsed into owner reuse
  - completed-lane registry residue, rolling-debt cohort, or `co-430-terminal-owner-replacement` are erased from the issue contract
  - historical packet evidence is deleted or hidden
  - parent-owned implementation weakens gates or broadens beyond the exact-key catalog/guide owner re-home
- Pre-implementation issue-quality review:
  - 2026-05-24: accepted framing is a docs-first exact-key retained-cohort owner packet, not a global freshness owner re-home, date refresh, historical cleanup, catalog repair, or provider-worker implementation lane.
- Fallback / refactor decision:
  - No new runtime fallback or seam is introduced by this docs-only packet.
  - Parent must preserve fail-closed docs freshness behavior and route any larger owner-authority split back to the parent lane.

## Milestones & Sequencing
1. Create the docs-first packet:
   - `docs/PRD-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
   - `docs/TECH_SPEC-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
   - `docs/ACTION_PLAN-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
2. Create task mirrors:
   - `tasks/specs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
   - `tasks/tasks-linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
   - `.agent/task/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066.md`
3. Register `CO-581` in `tasks/index.json` with the exact canonical owner marker.
4. Add six active rows to `docs/docs-freshness-registry.json`.
5. Add the CO-581 snapshot to `docs/TASKS.md`.
6. Run child-lane scoped validation only:
   - JSON parse for `tasks/index.json`
   - JSON parse for `docs/docs-freshness-registry.json`
   - protected-term scan over declared packet files, registry, and task index
   - `git diff --check` on declared files
7. Parent imports the patch and then owns any remaining lifecycle:
   - inspect the source payload in the authoritative issue workspace
   - verify live Linear owner state
   - re-home exact-key catalog and guide owner metadata from terminal `CO-568` to live `CO-581`
   - run `docs:freshness:maintain -- --format json`
   - run parent-required docs freshness, spec guard, and review gates
   - update workpad, PR, or Linear only if needed

## Dependencies
- Parent source anchor: `ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001`
- Parent source payload from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/memory/source-0/source.txt`
- Parent source manifest from shared CO root: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Child docs-packet manifest: `.runs/linear-2a51671e-14fa-46c8-bce4-bcfd71e66066-docs-packet/cli/2026-05-24T22-14-44-538Z-a0cffa5b/manifest.json`
- Canonical owner key: `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
- Sample paths:
  - `.agent/task/1289-coordinator-symphony-aligned-start-cli-request-shell-extraction.md`
  - `.agent/task/1290-coordinator-symphony-aligned-start-cli-remaining-boundary-freeze-reassessment.md`
  - `.agent/task/1291-coordinator-symphony-aligned-flow-cli-boundary-reassessment-revisit.md`

## Validation
- Child lane checks:
  - `jq empty tasks/index.json`
  - `jq empty docs/docs-freshness-registry.json`
  - `rg -n "docs:freshness:maintain|canonical owner key|terminal-owner replacement|completed-lane registry residue|rolling-debt cohort|co-430-terminal-owner-replacement|dry-run/no-token copyable body|baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance|codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance|co-558-may-19-apr-18-task-report-maintenance|CO-568 terminal|ctx:sha256:8824b9aeafca297dd598861836955314d72ed9c6909cafd917eb485e571fa786#chunk:c000001" <declared CO-581 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `git diff --check -- <declared CO-581 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Rollback plan:
  - parent can reject this patch without touching implementation or lifecycle state
  - if imported, revert only the CO-581 packet files, `tasks/index.json` item, `docs/TASKS.md` snapshot, and `docs/docs-freshness-registry.json` rows

## Risks & Mitigations
- Risk: exact owner identity gets diluted into generic `docs:freshness:maintain` ownership.
  - Mitigation: every packet artifact names the `baseline_cohort_id` key and full marker.
- Risk: parent fixes the gate with a blind review-date bump or packet deletion.
  - Mitigation: packet acceptance criteria reject both and require historical evidence preservation.
- Risk: a terminal historical owner is accidentally reused.
  - Mitigation: packet preserves `terminal-owner replacement` and `CO-568 terminal` as evidence only.
- Risk: child lane drifts into lifecycle, catalog, guide, or implementation work.
  - Mitigation: task checklist records out-of-scope files and validates only declared files.

## Approvals
- Docs packet child lane: produced for parent import.
- Parent source inspection, live owner verification, Linear state, PR lifecycle, and final review handoff remain parent-owned.
