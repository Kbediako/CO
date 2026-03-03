# ACTION_PLAN - Codex-Orchestrator Skill + Feature Canonical Alignment

## Summary
- Goal: introduce a codex-orchestrator entrypoint skill and align feature/version policy wording with current canonical posture.
- Scope: docs-first scaffolding, delegated bounded review stream, minimal skill/docs/test updates, and full validation lane.
- Assumptions: current repo packaging path for bundled skills remains unchanged.

## Milestones & Sequencing
1) Create docs-first artifacts + task registration/mirrors (`tasks/index.json`, `docs/TASKS.md`, `tasks/`, `.agent/task/`).
2) Delegate a bounded research/review stream to confirm scope, detect drift, and propose minimal patch set.
3) Implement minimal changes: new bundled skill + docs/policy/test alignment.
4) Run ordered validation lane and capture logs.
5) Sync checklist mirrors with evidence and publish final decisions.

## Dependencies
- Existing bundled skills in `skills/`.
- Docs policy surfaces: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `README.md`, `docs/README.md`, guides.
- Packaging/test harness: `npm run pack:smoke`.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs --task 0991-codex-orchestrator-skill-and-memory-alignment`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - Revert to prior docs/skill wording and keep existing skill set if any gate fails.

## Risks & Mitigations
- Risk: docs wording drift across multiple policy surfaces.
- Mitigation: single-pass canonicalization with `rg` verification and mirror sync.
- Risk: skill overlap causes guidance duplication.
- Mitigation: position new skill as entrypoint/router and keep specialized skills unchanged.
