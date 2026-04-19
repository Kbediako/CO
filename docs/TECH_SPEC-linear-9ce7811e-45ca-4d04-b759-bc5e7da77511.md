---
id: 20260418-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511
title: CO workflow reclassify blocked CO-231 validation floor on current head
relates_to: docs/PRD-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

# TECH_SPEC - CO workflow: reclassify blocked CO-231 validation floor on current head

## Canonical Reference
- Canonical implementation spec: `tasks/specs/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- PRD: `docs/PRD-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`
- Task checklist: `tasks/tasks-linear-9ce7811e-45ca-4d04-b759-bc5e7da77511.md`

## Summary
`CO-247` is a current-head reclassification lane for blocked `CO-231`. The inherited blocker surfaces are the `docs/TASKS.md` `tasks-file-too-large` / `zero_headroom` docs gate and the `SelectedRunProjection` timeout story around `refreshes projection proofs when child-lane reservation ledger placeholders exist`. This packet keeps both surfaces unresolved until the parent reruns fresh evidence on `3d3d56959`.

## Scope
- Preserve `CO-231` source anchors and `linear/co-231-doctor-readiness-stability-r2`.
- Keep the packet explicit that the docs-gate and `SelectedRunProjection` surfaces may each be live blockers or non-repros on the current head.
- Give the parent a bounded current-head validation plan before any docs or code changes.
- Keep parent-owned remediation narrow if a surface still reproduces.
- Keep registry updates, `docs/TASKS.md` edits, code changes, test changes, and review handoff outside this child-lane scope.

## Protected Surfaces
- `docs/TASKS.md`
- `450/450 zero_headroom`
- `tasks-file-too-large`
- `npm run docs:check`
- `orchestrator/tests/SelectedRunProjection.test.ts`
- `refreshes projection proofs when child-lane reservation ledger placeholders exist`
- `npm run test`
- `CO-231`
- `91749283-6dc8-4df8-aee3-5c9127c1200c`
- `linear/co-231-doctor-readiness-stability-r2`

## Validation Plan
- Parent reruns `wc -l docs/TASKS.md` and `npm run docs:check` to classify the docs surface on the current head.
- Parent reruns `npx vitest run --config vitest.config.core.ts orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` to classify the exact named test surface.
- Parent adds broader validation only if the isolated case or docs gate remains red and needs full-path explanation.
- Parent records which inherited surface is still blocking `CO-231`, if any, before any review-handoff claim.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- This same-issue child lane owns only the six packet files; parent owns registry integration, implementation, validation, workpad, and handoff.
