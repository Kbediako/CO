---
id: 20260410-linear-255030bf-bdda-4594-b503-28639a98b9da
title: CO: shift Linear intake to webhook-first targeted reconcile with slow full recovery sweeps
relates_to: docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---
## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`
## Summary
- Replace ordinary full active-set polling with targeted reconcile plus bounded fresh discovery.
- Preserve startup recovery, slower full sweeps, and operator-visible budget truth.
## Design
- `controlServerPublicLifecycle.ts` separates ordinary targeted reconcile from slower recovery sweeps.
- `providerIssueHandoff.ts` asks for deferred fresh discovery only when dispatch budget still has global/state slots.
- `linearDispatchSource.ts` supports `full`, `recovery_sweep`, and `fresh_discovery` query modes plus bounded eligible-target stopping.
- Live compatibility is preserved by scanning priority buckets `[1, 2, 3, 4, 0]` and reverse-paging each bucket by `createdAt`.
## Validation
- Audited `linear child-stream --pipeline docs-review`
- Focused coverage for `LinearDispatchSource`, `ProviderIssueHandoff`, and `ControlServerPublicLifecycle`
- Repo validation floor plus standalone review/elegance before handoff
