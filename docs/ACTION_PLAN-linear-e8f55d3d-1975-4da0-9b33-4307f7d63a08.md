# ACTION PLAN - CO-568 preserve CO-558 May 19 retained docs freshness cohort owner

## Summary
- Goal: create the CO-568 docs-first packet and registry evidence while preserving the exact `docs:freshness:maintain` owner contract for retained cohort `co-558-may-19-apr-18-task-report-maintenance`.
- Scope: PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - parent owns live owner verification and any owner repair
  - `CO-558 terminal`, `co-558-may-19-apr-18-task-report-maintenance`, and sample paths remain historical/retained-cohort evidence
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
  - `baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance`
  - `co-558-may-19-apr-18-task-report-maintenance`
  - `CO-558 terminal`
  - `{"rolling_window":131}`
- Not done if:
  - the packet omits the exact canonical owner key or marker
  - registry rows for the six packet files are missing
  - owner routing can fall back to fuzzy title matching
  - terminal-owner replacement is collapsed into owner reuse
  - completed-lane registry residue, rolling-debt cohort, or `co-430-terminal-owner-replacement` are erased from the issue contract
  - historical packet evidence is deleted or hidden
  - the child lane edits parent-owned implementation, Linear, workpad, GitHub, PR, or lifecycle surfaces
- Pre-implementation issue-quality review:
  - 2026-05-24: accepted framing is a docs-first exact-key retained-cohort owner packet, not a global freshness owner re-home, date refresh, historical cleanup, catalog repair, or provider-worker implementation lane.
- Fallback / refactor decision:
  - No new runtime fallback or seam is introduced by this docs-only packet.
  - Parent must preserve fail-closed docs freshness behavior and route any larger owner-authority split back to the parent lane.

## Milestones & Sequencing
1. Create the docs-first packet:
   - `docs/PRD-linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
   - `docs/TECH_SPEC-linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
   - `docs/ACTION_PLAN-linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
2. Create task mirrors:
   - `tasks/specs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
   - `tasks/tasks-linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
   - `.agent/task/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08.md`
3. Register `CO-568` in `tasks/index.json` with the exact canonical owner marker.
4. Add six active rows to `docs/docs-freshness-registry.json`.
5. Add the CO-568 snapshot to `docs/TASKS.md`.
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
- Parent source anchor: `ctx:sha256:bf22c28e17074f82cb454de2914f37fd21db5f3ce911e5f8204df826038433fb#chunk:c000001`
- Parent source payload from checkout root: `../../.runs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08/cli/2026-05-24T19-52-17-215Z-25164624/memory/source-0/source.txt`
- Parent source payload from this document: `../../../.runs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08/cli/2026-05-24T19-52-17-215Z-25164624/memory/source-0/source.txt`
- Parent source manifest from checkout root: `../../.runs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08/cli/2026-05-24T19-52-17-215Z-25164624/manifest.json`
- Parent source manifest from this document: `../../../.runs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08/cli/2026-05-24T19-52-17-215Z-25164624/manifest.json`
- Child docs-packet manifest: `.runs/linear-e8f55d3d-1975-4da0-9b33-4307f7d63a08-docs-packet/cli/2026-05-24T19-56-21-361Z-69fdbf55/manifest.json`
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
  - `rg -n "docs:freshness:maintain|canonical owner key|terminal-owner replacement|completed-lane registry residue|rolling-debt cohort|co-430-terminal-owner-replacement|dry-run/no-token copyable body|baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance|codex-orchestrator:canonical-owner-key=baseline_cohort_id:co-558-may-19-apr-18-task-report-maintenance|co-558-may-19-apr-18-task-report-maintenance|CO-558 terminal" <declared CO-568 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
  - `git diff --check -- <declared CO-568 packet files> tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Rollback plan:
  - parent can reject this patch without touching implementation or lifecycle state
  - if imported, revert only the CO-568 packet files, `tasks/index.json` item, `docs/TASKS.md` snapshot, and `docs/docs-freshness-registry.json` rows

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
- Parent source inspection and validation: passed; Linear state, PR lifecycle, and final review handoff remain parent-owned until PR attach and ready-review drain.
