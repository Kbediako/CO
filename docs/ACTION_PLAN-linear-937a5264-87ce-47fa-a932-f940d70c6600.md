# ACTION_PLAN - CO-484 keep co-status running row workspace paths issue-local

## Summary
- Goal: create the CO-484 docs-first packet and registry mirrors for the row-local `co-status --format json` `workspace_path` bug.
- Scope: packet files, task checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows only.
- Assumptions:
  - Linear issue CO-484 is the source of truth for protected wording and packet prefix.
  - CO-398 fallback/projection lineage applies because this touches `control-host status surfaces`.
  - Parent owns all implementation and Linear lifecycle work after the packet exists.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `.running[]`
  - `workspace_path`
  - `provider_issue_rehydrated_active_run`
  - `issue_id`
  - `task_id`
  - `run_id`
  - concurrent provider workers
  - row-local proof
  - `CO-456`
  - `CO-474`
  - `CO-398`
- Not done if:
  - concurrent active provider workers can still produce a `.running[]` row whose `workspace_path` UUID disagrees with row identity
  - `co-status --format json` borrows selected-run or last-row workspace data
  - only human-readable output is fixed
  - no regression covers at least two active provider runs
  - fallback provenance is weakened or hidden
- Pre-implementation issue-quality review:
  - 2026-05-05: micro-task path is unavailable because this lane touches fallback/projection behavior and exact protected status surfaces.
  - 2026-05-05: the implementation issue is well-shaped after packet creation; it is narrower than CO-398 fallback expiry and broader than a display-only typo.
- Fallback / refactor decision:
  - `remove fallback`: selected-run or last-row `workspace_path` reuse for neighboring running rows.
  - `justify retaining fallback`: source-labeled `provider_issue_rehydrated_active_run` proof and status provenance that cannot override row-local authority.
- Durable retention evidence:
  - contract name: row-local status proof and source-label projection
  - owning surface: `control-host status surfaces`
  - steady-state proof expected from parent: live row identity, retained proof, source labels, degraded reasons, and `/ui/data.json` truth stay distinct
- Large-refactor check:
  - no large refactor in this packet lane
  - parent may keep this as a focused repair if it removes cross-row workspace borrowing without adding another authority source
  - parent should escalate only if a larger CO-398/CO-400 status-authority consolidation is required

## Milestones & Sequencing
1. Create the CO-484 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical task id in `tasks/index.json`.
3. Add a current CO-484 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows for the six CO-484 packet/checklist surfaces.
5. Validate edited JSON, protected terms, `docs:check`, `docs:freshness`, and `spec-guard`.
6. Report branch, worktree, changed files, validation output, and blockers without pushing or opening a PR.

## Parent-Owned Follow-On Plan
1. Parent reconciles live CO-484 issue context and current `origin/main`.
2. Parent runs docs-review before implementation.
3. Parent identifies the projection path that lets selected or neighboring row `workspace_path` leak into `provider_issue_rehydrated_active_run` rows.
4. Parent implements row-local workspace authority for `.running[]` rows.
5. Parent preserves fallback provenance/source labels and emits truthful degraded state when row-local workspace proof is unavailable.
6. Parent adds selected-plus-rehydrated multi-run regression coverage and JSON/API/UI or presenter coverage.
7. Parent reruns normal validation, review, Linear workpad, PR lifecycle, and merge gates.

## Dependencies
- Linear issue `CO-484`
- Source issue `CO-398`
- `docs/guides/fallback-expiry-and-refactor-policy.md`
- `co-status --format json`
- `provider-intake-state`
- retained run manifests/proofs
- control-host API and `/ui/data.json`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs freshness registry ok')"`
  - `rg -n "co-status --format json|\\.running\\[\\]|workspace_path|provider_issue_rehydrated_active_run|issue_id|task_id|run_id|concurrent provider workers|row-local proof|CO-456|CO-474|CO-398" ...`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/spec-guard.mjs --dry-run`
  - `git diff --name-only`
- Parent-owned validation commands:
  - focused status projection tests for selected plus rehydrated running rows
  - `co-status --format json` fixture or CLI coverage
  - control-host API / `/ui/data.json` fixture checks
  - normal validation floor and review loop
- Rollback plan:
  - revert only the CO-484 packet and registry mirror rows if packet validation fails; implementation remains untouched in this packet lane

## Risks & Mitigations
- Risk: implementation hides `workspace_path` or treats this as a display-only bug.
  - Mitigation: packet makes `workspace_path` and JSON/API/UI validation protected requirements.
- Risk: retained proof becomes hidden authority.
  - Mitigation: packet classifies proof as source-labeled row-local audit evidence only.
- Risk: worker lane drifts into CO-456, CO-474, provider admission, or CO-398 broad fallback expiry.
  - Mitigation: ownership scope excludes those surfaces and names them as non-goals.

## Approvals
- Docs-first packet: parent orchestrator, 2026-05-05
- Parent docs-review / implementation approval: pending
