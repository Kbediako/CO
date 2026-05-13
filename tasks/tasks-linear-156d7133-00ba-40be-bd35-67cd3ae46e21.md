# Task Checklist - linear-156d7133-00ba-40be-bd35-67cd3ae46e21

- Linear Issue: `CO-25` / `156d7133-00ba-40be-bd35-67cd3ae46e21`
- MCP Task ID: `linear-156d7133-00ba-40be-bd35-67cd3ae46e21`
- Primary PRD: `docs/PRD-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`
- TECH_SPEC: `tasks/specs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`

## Docs-First
- [x] PRD drafted for the shared-root merge-closeout reconciliation issue. Evidence: `docs/PRD-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`.
- [x] TECH_SPEC drafted with the bounded provider-worker merge-closeout seam and shared-root guardrails. Evidence: `tasks/specs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`, `docs/TECH_SPEC-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, tests, and handoff. Evidence: `docs/ACTION_PLAN-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-156d7133-00ba-40be-bd35-67cd3ae46e21` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`. Evidence: `.agent/task/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`.
- [x] Standalone review approval captured in the spec/checklist notes. Evidence: `tasks/specs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`.
- [x] docs-review approval captured for `linear-156d7133-00ba-40be-bd35-67cd3ae46e21`. Evidence: `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/manifest.json`.

## Implementation
- [x] Update provider-worker first-turn and continuation prompts to require shared-root inspection, safe fast-forward-only sync, and explicit skip-reason evidence before `Done`. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Update repo-local `skills/linear/SKILL.md` and `skills/land/SKILL.md` so merged closeout guidance matches the new shared-root reconciliation contract. Evidence: `skills/linear/SKILL.md`, `skills/land/SKILL.md`.
- [x] Add focused prompt/contract regression coverage for the new merged closeout requirements. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Rework
- [x] Reopen the issue from merged closeout after live validation proved `git fetch origin main` left the shared-root `origin/main` ref stale. Evidence: Linear issue state `Rework`, merged PR `#312`, and the refreshed `## Codex Workpad` comment `3e8e1400-db00-4450-b920-c5bbbb2d3e3a`.
- [x] Restore the shared root manually with an explicit remote-tracking ref refresh plus `git merge --ff-only origin/main`. Evidence: workpad before/after root state (`52224a30b -> 9e577ecbd`) recorded on the issue.
- [x] Refresh the docs-first packet with the stale-`origin/main` failure mode and the explicit tracking-ref refresh requirement. Evidence: `docs/PRD-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`, `docs/TECH_SPEC-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`, `docs/ACTION_PLAN-linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`, `tasks/specs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21.md`, `docs/TASKS.md`.
- [x] Replace merged-closeout `git fetch origin main` guidance with a command that updates local `origin/main` before `merge --ff-only origin/main`. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, `skills/land/SKILL.md`.
- [x] Extend the focused prompt/contract regressions to assert the tracking-ref refresh command in first-turn and continuation guidance. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Re-run docs-review and the required validation floor on the rework branch before the next review handoff. Evidence: `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/manifest.json`, `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/review/output.log`, and `npm run pack:smoke`.

## Validation
- [x] `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`. Evidence: override-backed guard pass recorded in the worker validation log for `linear-156d7133-00ba-40be-bd35-67cd3ae46e21`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command passed on the final tree.
- [x] `npm run build`. Evidence: command passed on the final tree.
- [x] `npm run lint`. Evidence: command passed on the final tree.
- [x] `npm run test`. Evidence: full Vitest run emitted green test output on the final tree, then idled in a quiet tail with `node (vitest)` and its `esbuild --service` child still resident; the worker cleaned up the lingering local processes after capturing the artifact.
- [x] `npm run docs:check`. Evidence: command passed on the final tree.
- [x] `npm run docs:freshness`. Evidence: command passed on the final tree.
- [x] `node scripts/diff-budget.mjs`. Evidence: command passed on the final tree (`files=12/25`, `lines=441/1200`, `+418/-23`).
- [x] `npm run review`. Evidence: clean manifest-backed review with no findings recorded under `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/manifest.json` and `.runs/linear-156d7133-00ba-40be-bd35-67cd3ae46e21/cli/2026-03-28T00-11-01-669Z-43ecf1c4/review/output.log`.
- [x] `npm run pack:smoke`. Evidence: command passed on the final tree (`pack smoke passed`).

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: updated workpad comment `3e8e1400-db00-4450-b920-c5bbbb2d3e3a`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending for the rework PR.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending for the rework branch.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Shared root closeout records before/after root state and either fast-forward success or an explicit skip reason before moving the issue to `Done`. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
