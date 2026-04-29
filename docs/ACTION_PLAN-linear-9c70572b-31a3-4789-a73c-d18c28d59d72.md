# ACTION_PLAN - CO-425 re-home docs:freshness:maintain owner after terminal CO-423

## Summary
- Goal: create and register the CO-425 docs-first packet so CO-425 can become admissible as the next canonical owner candidate for `docs:freshness:maintain`.
- Scope: packet files plus task and freshness registry registration only.
- Assumptions:
  - CO-425 is currently Backlog and parent intends it as the canonical owner candidate.
  - Parent has already fixed the Linear description marker to the helper-compatible canonical owner marker line.
  - `CO-423` is terminal owner evidence and parent must verify the current `docs:freshness:maintain` blocker before any catalog re-home.
  - This worker leaves actual owner metadata implementation to the parent or a later admitted worker.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `docs:freshness`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `CO-423`
  - `configured_owner_terminal`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `blocking_changed_paths=[]`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Not done if:
  - the packet omits or renames protected terms
  - the packet mutates `docs/docs-catalog.json`
  - the packet treats terminal `CO-423` as sufficient live ownership
  - the packet hides, deletes, or date-bumps the retained March 28 cohort
  - the packet runs broad validation or mutates Linear/GitHub/PR state
- Pre-implementation issue-quality review:
  - 2026-04-30: CO-425 is not a stale-doc cleanup lane; it is a traceability/admission packet for the next `docs:freshness:maintain` owner.
  - 2026-04-30: the micro-task path is unavailable because correctness depends on exact protected terms, exact surfaces, and canonical owner marker compatibility.
  - 2026-04-30: actual `docs/docs-catalog.json` owner re-home must stay parent-owned until current `docs:freshness:maintain` evidence is verified.
- Fallback / refactor decision: no fallback or refactor seam is introduced; fail-closed `configured_owner_terminal` behavior remains mandatory.

## Milestones & Sequencing
1. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent` mirror for CO-425.
2. Register the canonical spec and mirrors in `tasks/index.json`.
3. Add a top-level snapshot to `docs/TASKS.md`.
4. Add CO-425 packet rows to `docs/docs-freshness-registry.json`.
5. Run cheap structural validation only: JSON parse and targeted `rg` checks.
6. Return the exact changed file list and parent-owned follow-up boundaries.

## Dependencies
- Linear issue `CO-425` / `9c70572b-31a3-4789-a73c-d18c28d59d72`.
- `docs:freshness`.
- `docs:freshness:maintain`.
- `docs/docs-catalog.json`.
- `docs/guides/docs-freshness-cohorts.md`.
- `tasks/index.json`.
- `docs/TASKS.md`.
- `docs/docs-freshness-registry.json`.

## Validation
- Worker checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8'))"`
  - `rg -n "linear-9c70572b-31a3-4789-a73c-d18c28d59d72|CO-425" .agent/task docs tasks`
  - `rg -n "docs:freshness:maintain|docs:freshness|docs/docs-catalog\\.json|docs/guides/docs-freshness-cohorts\\.md|CO-423|configured_owner_terminal|co-420-apr-28-march-28-task-packet-mirror|blocking_changed_paths=\\[\\]|codex-orchestrator:canonical-owner-key=docs:freshness:maintain" .agent/task/linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md docs/PRD-linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md docs/TECH_SPEC-linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md docs/ACTION_PLAN-linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md tasks/specs/linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md tasks/tasks-linear-9c70572b-31a3-4789-a73c-d18c28d59d72.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-owned validation commands:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `npm run docs:check`
  - `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - remove the CO-425 packet files and matching `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` rows if parent rejects admission.

## Risks & Mitigations
- Risk: packet registration is mistaken for completed owner re-home.
  - Mitigation: every packet surface says `docs/docs-catalog.json` is parent-owned and unchanged here.
- Risk: terminal `CO-423` remains configured owner after packet handoff.
  - Mitigation: parent validation must verify and then re-home catalog metadata before claiming lane completion.
- Risk: historical lineage is lost.
  - Mitigation: preserve `CO-420`, `CO-409`, `CO-423`, and `co-420-apr-28-march-28-task-packet-mirror` references as owner-truth lineage.

## Approvals
- Docs-first packet worker: 2026-04-30
- Parent owner re-home / implementation approval: pending
