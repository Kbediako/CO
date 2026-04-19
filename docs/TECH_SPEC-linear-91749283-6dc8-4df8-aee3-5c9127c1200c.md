---
id: 20260418-linear-91749283-6dc8-4df8-aee3-5c9127c1200c
title: Doctor validation: classify and restore current Doctor readiness stability for CO-220 handoff
relates_to: docs/PRD-linear-91749283-6dc8-4df8-aee3-5c9127c1200c.md
risk: high
owners:
  - Codex
last_review: 2026-04-19
---

# TECH_SPEC - Doctor validation: classify and restore current Doctor readiness stability for CO-220 handoff

## Canonical Reference
- Canonical implementation spec: `tasks/specs/linear-91749283-6dc8-4df8-aee3-5c9127c1200c.md`
- PRD: `docs/PRD-linear-91749283-6dc8-4df8-aee3-5c9127c1200c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-91749283-6dc8-4df8-aee3-5c9127c1200c.md`
- Task checklist: `tasks/tasks-linear-91749283-6dc8-4df8-aee3-5c9127c1200c.md`

## Summary
`CO-231` stays narrowly focused on `Doctor.test` validation stability for `CO-220` handoff. The parent lane preserves the clean-main / `CO-220` comparison buckets, replaces the non-hermetic direct-dist test assumption with a temp-repo fake delegate server, and keeps the repaired current head green in both isolated and full-suite validation without reopening stale-attachment logic from `CO-220`.

## Scope
- Preserve the exact current-head vs `origin/main` vs `CO-220` `Doctor.test` evidence split.
- Fix the bounded direct-dist Doctor test seam so the test does not rely on a prebuilt workspace `dist/` tree.
- Prove the repaired current head is green on both the isolated Doctor surface and the review-handoff validation path.
- Keep the issue ownership split explicit: `CO-231` owns Doctor validation only.

## Protected Surfaces
- `Doctor.test`
- `full-suite`
- `isolated rerun`
- `provider readiness`
- `direct-dist delegation readiness and initialize latency`
- `keeps Telegram incomplete when transport is allowed but mutations are disabled`
- `falls back to legacy collab feature key when canonical key is absent`
- `current branch`
- `origin/main`
- `CO-220`

## Validation Plan
- Focused checks already required by the current state:
  - `npm run build`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts`
  - `npm test`
- Remaining repo gates before review handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review`
  - `npm run pack:smoke`
- Explicit elegance/minimality pass before any PR or review-state transition.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- The docs packet was completed in the parent workspace after same-issue docs child lanes stalled or drifted; the successful `classification-note` lane supplied advisory comparison evidence only.
