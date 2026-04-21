# Task Checklist - linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb

- Linear Issue: `CO-276` / `1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- MCP Task ID: `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- Primary PRD: `docs/PRD-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- TECH_SPEC: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- Shared source 0 anchor: `ctx:sha256:4530a34d5bcac82b728b1d666d80f35624d95a695580a9c4b1d49238f69e7603#chunk:c000001`

## Docs-First
- [x] PRD drafted for the seven remaining protected README residue surfaces. Evidence: `docs/PRD-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`.
- [x] TECH_SPEC drafted with protected surfaces, parity matrix, non-goals, and validation plan. Evidence: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`.
- [x] ACTION_PLAN drafted for setup, docs packet, README implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`.
- [x] Pre-implementation issue-quality review recorded in the spec readiness gate. Evidence: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`.
- [x] Registry and mirrors updated: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/TECH_SPEC-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`, and `.agent/task/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`. Evidence: those exact files.
- [x] Pre-implementation docs-review captured or fallback recorded. Evidence: wrapper manifest `.runs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb/cli/2026-04-21T05-10-37-588Z-4745098f/manifest.json` failed at delegation guard after child-lane/child-stream provenance failures; manual fallback `out/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb/manual/20260421T0512Z-docs-review-fallback.md` found no docs blockers.

## Parallelization
- [x] Turn opened with a decomposition matrix and `parallelize_now` / `independent_scope_available`. Evidence: Linear workpad comment `93512c43-dc58-41d3-a29f-43fde40a1133`.
- [x] Same-issue child-lane launch attempt failed closed on missing provider control-host provenance; no fabricated child evidence used. Evidence: `provider-linear-worker-linear-audit.jsonl` record at 2026-04-21T05:05:08.246Z with `provider_worker_child_lane_provenance_invalid`.
- [x] Resumed provider-worker turn recorded `stay_serial` / `review_or_validation_only` because the remaining safe work was parent-owned validation and handoff classification of an already-present diff. Evidence: Linear `parallelization` helper output for CO-276 on 2026-04-21.

## Implementation Acceptance
- [x] Replace `packages/des-obys/README.md` durable-looking archive guidance. Evidence: tracked README now points to `mirror:fetch`, `mirror:serve`, and `mirror:check` instead of the missing 0801 archive.
- [x] Replace `packages/des-obys/public/README.md` durable-looking archive guidance. Evidence: tracked README now identifies the directory as a placeholder and gives regeneration commands.
- [x] Replace `packages/eminente/README.md` durable-looking archive guidance. Evidence: tracked README now points to `mirror:fetch`, `mirror:serve`, and `mirror:check` instead of the missing 0801 archive.
- [x] Replace `packages/eminente/public/README.md` durable-looking archive guidance. Evidence: tracked README now identifies the directory as a placeholder and gives regeneration commands.
- [x] Replace `packages/obys-library/README.md` durable-looking archive guidance. Evidence: tracked README now points to `mirror:fetch`, `mirror:serve`, and `mirror:check` instead of the missing 0801 archive.
- [x] Replace `packages/obys-library/public/README.md` durable-looking archive guidance. Evidence: tracked README now identifies the directory as a placeholder and gives regeneration commands.
- [x] Replace `reference/plus-ex-15th/README.md` durable-looking archive guidance and local serve command. Evidence: tracked README now labels the historical manifest as local-only evidence and gives regeneration plus local artifact serving steps.
- [x] Keep implementation bounded to the seven protected README files and avoid generic archive cleanup. Evidence: diff touches only docs-first packet, registry mirrors, and the seven protected README files.

## Validation
- [x] Targeted README residue search passes. Evidence: `rg -n "0801-dead-code-pruning|dead-code-pruning/archive|archive/2025-12-08T10-01-24Z" packages/des-obys packages/eminente packages/obys-library reference/plus-ex-15th --glob 'README.md'` returned no matches.
- [x] Staged diff whitespace and JSON parse checks pass. Evidence: `git diff --cached --check`; JSON parse of `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed after task-scoped diagnostics sub-run created `.runs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb-guard/cli/2026-04-21T05-25-14-986Z-231c527a/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`.
- [x] `npm run build`. Evidence: diagnostics manifest command `02-build` succeeded.
- [x] `npm run lint`. Evidence: passed with three existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [ ] `npm run test`. Evidence: current `origin/main` validation failed with 3 failing files / 4 failing tests outside CO-276 README scope: `orchestrator/tests/Doctor.test.ts`, `tests/cli-command-surface.spec.ts`, and `packages/sdk-node/tests/orchestrator.artifacts.test.ts`; follow-up `CO-290` / `b6b4a553-8870-4328-ac15-e62e924b0aff` owns the reproduced CLI/SDK blockers.
- [x] Focused Doctor rerun classified as non-blocking for CO-276. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts -t "falls back to legacy collab feature key when canonical key is absent"` passed `1/1`.
- [ ] Focused command-surface rerun. Evidence: `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts -t "handles escaped quotes inside quoted single-token exec commands"` timed out at 60000ms; direct quoted `exec` probe timed out at 20000ms with no stdout/stderr.
- [ ] Focused SDK artifact rerun. Evidence: `npx vitest run --config vitest.config.core.ts packages/sdk-node/tests/orchestrator.artifacts.test.ts` timed out both artifact-retention tests at 60000ms.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4307 docs, 4310 registry entries`.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 5411 tracked files, 0 action-required`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=20/25, lines=555/1200, +534/-21)`.
- [ ] Manifest-backed standalone review plus explicit elegance/minimality pass. Evidence: not rerun for review handoff after latest-main reconciliation because the full validation floor is red on CO-290 current-main blockers.

## Handoff
- [x] Parent created an out-of-scope follow-up instead of widening CO-276. Evidence: `CO-290` / `b6b4a553-8870-4328-ac15-e62e924b0aff` in Backlog, related to CO-276.
- [ ] Parent refreshes the single workpad with docs, implementation, validation, and blocker status before pausing. Evidence: pending final blocker refresh.
- [ ] Parent attaches a PR and completes the normal review-state prerequisites before `In Review`. Evidence: blocked by current-main CLI/SDK validation failures pending CO-290.

## Progress Log
- 2026-04-21: parent moved CO-276 from `Ready` to `In Progress`, created the single persistent workpad, recorded the required same-turn parallelization decision, and attempted same-issue docs child-lane launch.
- 2026-04-21: child-lane launch failed closed with `provider_worker_child_lane_provenance_invalid` because the parent provider-worker manifest has null provider control-host provenance; parent-owned docs packet work proceeded with the limitation recorded.
- 2026-04-21: docs-review wrapper stopped at delegation guard for missing subagent manifests; direct `linear child-stream --pipeline docs-review` also failed closed with `provider_worker_child_stream_provenance_invalid`, so the parent recorded a manual docs-review fallback before README implementation.
- 2026-04-21: clean issue worktree `/Users/kbediako/Code/CO/.workspaces/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` created from `origin/main` because the shared checkout was on unrelated CO-278 work; seven protected README files were updated and targeted 0801 archive residue search returned no matches.
- 2026-04-21: resumed provider turn reconciled latest `origin/main`, resolved `docs/docs-freshness-registry.json`, and cleared the prior docs-freshness blocker; `npm run docs:freshness` now passes.
- 2026-04-21: validation is green for targeted residue search, delegation guard, spec guard, build, lint, docs:check, docs:freshness, repo:stewardship, and diff-budget, but full `npm run test` is red on current-main CLI command-surface and SDK artifact-retention blockers outside CO-276 scope. Follow-up `CO-290` was created, so CO-276 is not moved to review state in this turn.
