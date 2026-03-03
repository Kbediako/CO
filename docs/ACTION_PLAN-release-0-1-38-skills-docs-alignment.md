# ACTION_PLAN - CO 0.1.38 Release + Skills/Docs Alignment

## Summary
- Goal: ship a patch release backed by deliberate docs/skills consistency checks, explicit fork-context adoption guidance, and minimal corrective edits.
- Scope: docs-first scaffolding, bounded audit streams, focused fixes, fork-context decision capture, full validation, release lifecycle, global skill install verification.
- Assumptions: GitHub CLI auth and npm publish permissions are available.

## Milestones & Sequencing
1) Docs-first scaffolding + task registration/mirror sync (`tasks/index.json`, `docs/TASKS.md`, `tasks/`, `.agent/task/`).
2) Run bounded audit streams (docs contradictions, skills coherence, release readiness, fork-context capability) and capture evidence.
3) Decide fork-context adoption path (guidance-only vs minimal programmatic) and apply only additive observability changes if needed.
4) Apply remaining minimal fixes to resolve validated contradictions/staleness.
5) Run ordered gates 1-10 with fail/fix/pass evidence if needed.
6) Release `0.1.38` (PR -> merge -> signed tag -> workflow watch -> npm verify), then verify global skill install.

## Dependencies
- `gh` authenticated session and repository write permissions.
- npm publish permissions for `@kbediako/codex-orchestrator`.
- Existing release workflow and guard scripts.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs --task 0992-release-0-1-38-skills-docs-alignment`
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
  - Abort release on any failing required gate; patch and rerun from failed gate onward.
  - Keep prior published version (`0.1.37`) as rollback baseline if publish is blocked.

## Risks & Mitigations
- Risk: subtle policy contradictions across distributed docs.
- Mitigation: centralized audit pass across AGENTS/README/SOP/skills surfaces with targeted grep checks.
- Risk: over-scoping fork-context adoption into unnecessary code changes.
- Mitigation: default to guidance-only unless direct programmatic gaps are proven by evidence.
- Risk: codex fork/session-branch workflows bypass task-level manifest evidence when used as primary execution path.
- Mitigation: keep `codex fork` guidance as ad-hoc only; require re-entry through task-scoped orchestrator runs for delivery evidence.
- Risk: release lifecycle race conditions (checks/reviews restarting).
- Mitigation: patience-first monitoring window before merge/tag actions.
