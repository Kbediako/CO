# Agent Task - linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a

- Linear Issue: `CO-394` / `fb31f0d5-56c4-4f56-8faa-1e4ef63a705a`
- PRD: `docs/PRD-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- TECH_SPEC: `tasks/specs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Checklist: `tasks/tasks-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Larger-refactor owner: `CO-400`

## Current Issue Truth
Apply CO-382 `fallback expiry` and `large refactor` policy to provider workflow fallback paths in `orchestrator/src/cli/control/providerIssueHandoff.ts`.

## Protected Terms
`provider workflow`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, `justify retaining fallback`.

## Boundaries
- Do not redesign all provider issue handoff behavior.
- Do not weaken CO-125 admission constraints or expected-state transition guards.
- Do not change review, merge, runtime routing, docs freshness, or control-host status fallback behavior.
- Do not add another provider workflow seam.

## Implementation Notes
- Both provider workflow fallback paths are time-boxed as `expire fallback`:
  - provider-id mapping fallback
  - retained-claim/autopilot fallback
- Owner for larger consolidation/removal is `CO-400`.
- Review date is 2026-05-10; maximum lifetime is 2026-05-26.

## Validation
- Focused metadata regression.
- Focused provider workflow fallback activation and non-activation tests.
- Relevant docs gates and review/elegance pass before handoff.
