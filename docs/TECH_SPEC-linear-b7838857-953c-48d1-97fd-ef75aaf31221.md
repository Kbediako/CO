---
id: 20260422-linear-b7838857-953c-48d1-97fd-ef75aaf31221
title: "CO-307 child-lane trusted-project pollution and global config growth"
relates_to: docs/PRD-linear-b7838857-953c-48d1-97fd-ef75aaf31221.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

# TECH_SPEC - CO-307 child-lane trusted-project pollution and global config growth

Canonical spec: `tasks/specs/linear-b7838857-953c-48d1-97fd-ef75aaf31221.md`

## Parent-Owned Seams
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/utils/codexPaths.ts`

## Validation Contract
- Child lane: docs packet, `tasks/index.json`, `docs/TASKS.md`, and scoped diff checks only.
- Parent lane: reproduce the residue, land the bounded fix, add focused regressions, complete full validation, and hand off only after clean review drain.
