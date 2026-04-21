# Task Checklist - linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb

- Linear Issue: `CO-276` / `1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- MCP Task ID: `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- Primary PRD: `docs/PRD-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- TECH_SPEC: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- Shared source 0 anchor: `ctx:sha256:037f0a76dfa8211a54a56b272676253d1646041df2073a17c9a971e9ea74ea69#chunk:c000001`

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
- [x] Current provider-worker turn recorded `stay_serial` / `overlapping_scope` because latest-main reconciliation owned the already-staged docs/README diff. Evidence: Linear `parallelization` helper output for CO-276 on 2026-04-21.

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
- [x] `npm run test`. Evidence: clean intentional post-merge rerun passed `346` files / `4450` tests in 146.45s.
- [x] Focused Doctor rerun classified as non-blocking for CO-276. Evidence: previous focused rerun passed `1/1`; current full-suite validation completed cleanly.
- [x] Focused command-surface blocker classified as resolved by current-main validation. Evidence: clean full-suite rerun passed with the CLI command-surface coverage included.
- [x] Focused SDK artifact blocker classified as resolved by current-main validation. Evidence: clean full-suite rerun passed with the SDK artifact-retention coverage included.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 4325 docs, 4328 registry entries`.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 5429 tracked files, 0 action-required`.
- [x] `npm run docs:archive-tasks`. Evidence: archived one older completed snapshot and kept `docs/TASKS.md` at `440` lines, matching the reserve target.
- [x] Review-finding targeted checks pass. Evidence: `git diff --check`; targeted protected-README `rg` returned no `0801-dead-code-pruning` archive residue and no package-level `npm start` guidance; `wc -l docs/TASKS.md` returned `440`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=3/25, lines=7/1200, +3/-4); advisory stacked aggregate vs origin/main: files=14/25, lines=431/1200, +409/-22`.
- [x] Manifest-backed standalone review plus explicit elegance/minimality pass. Evidence: final review telemetry `.runs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb/cli/2026-04-21T13-11-30-727Z-6376b9fb/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`, and `termination_boundary.kind=command-intent` with no actionable diff-local findings; elegance artifact `out/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb/manual/20260421T135931Z-final-elegance-review.md` found no simplification patch needed.

## Handoff
- [x] Parent kept out-of-scope validation follow-ups out of CO-276. Evidence: CO-290 and CO-291 were closed invalid after current-main validation, so no CO-276 scope expansion is required.
- [ ] Parent refreshes the single workpad with docs, implementation, validation, and review status before handoff. Evidence: pending final refresh after closeout validation.
- [ ] Parent attaches a PR and completes the normal review-state prerequisites before `In Review`. Evidence: pending PR attachment and ready-review drain after clean review/elegance completion.

## Progress Log
- 2026-04-21: parent moved CO-276 from `Ready` to `In Progress`, created the single persistent workpad, recorded the required same-turn parallelization decision, and attempted same-issue docs child-lane launch.
- 2026-04-21: child-lane launch failed closed with `provider_worker_child_lane_provenance_invalid` because the parent provider-worker manifest has null provider control-host provenance; parent-owned docs packet work proceeded with the limitation recorded.
- 2026-04-21: docs-review wrapper stopped at delegation guard for missing subagent manifests; direct `linear child-stream --pipeline docs-review` also failed closed with `provider_worker_child_stream_provenance_invalid`, so the parent recorded a manual docs-review fallback before README implementation.
- 2026-04-21: clean issue worktree `/Users/kbediako/Code/CO/.workspaces/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` created from `origin/main` because the shared checkout was on unrelated CO-278 work; seven protected README files were updated and targeted 0801 archive residue search returned no matches.
- 2026-04-21: resumed provider turn reconciled current `origin/main`, combined CO-276 registry entries with newer main packet entries, and updated the packet away from the earlier blocked CO-290 posture.
- 2026-04-21: clean intentional full-suite validation showed `346` files / `4450` tests passed, including the previous CLI command-surface and SDK artifact-retention blockers; final handoff still requires clean standalone review rerun, elegance pass, PR attachment, and ready-review drain.
- 2026-04-21: manifest-backed review surfaced P2 findings for `docs/TASKS.md` reserve headroom and package-level start guidance; parent addressed both by running `npm run docs:archive-tasks`, keeping `docs/TASKS.md` at `440` lines, and removing misleading package-level `npm start` guidance from the affected mirror READMEs.
- 2026-04-21: final manifest-backed standalone review completed with `status=succeeded`, `review_outcome=bounded-success`, `termination_boundary.kind=command-intent`, and no actionable diff-local findings; explicit elegance/minimality pass found no simplification patch needed.
