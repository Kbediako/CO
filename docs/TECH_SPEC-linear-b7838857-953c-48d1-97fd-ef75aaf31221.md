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

This mirror points to the canonical task spec at `tasks/specs/linear-b7838857-953c-48d1-97fd-ef75aaf31221.md`.

## Implementation Summary
- Preserve CO-307 as the child-lane trust/config isolation lane for `trusted-project pollution`, `child-lane paths`, and `global ~/.codex/config.toml growth`.
- Keep the child-lane output bounded to docs-first packet creation plus `tasks/index.json` and `docs/TASKS.md` updates.
- Parent implementation owns reproducing the trust/config growth seam, choosing the narrowest launch/home/config fix, and validating that trust boundaries were not weakened.
- Do not weaken trust boundaries, do not broaden into generic global config redesign, and do not reopen parent-owned lifecycle or PR workflow contracts.

## Parent-Owned Seams
- `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/controlHostCliShell.ts`
- `orchestrator/src/cli/utils/codexPaths.ts`

## Validation Contract
- Child lane:
  - bounded docs packet plus registry/checklist patch artifact only
  - JSON parse check for `tasks/index.json`
  - `git diff --check` and scoped file review
- Parent lane:
  - reproduce the pollution/growth seam with focused evidence
  - add focused launch/home/config regressions
  - verify child-lane paths no longer create durable global trust residue
  - complete normal parent-owned validation and PR lifecycle
