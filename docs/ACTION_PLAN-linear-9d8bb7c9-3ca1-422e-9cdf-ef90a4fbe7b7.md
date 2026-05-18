# Action Plan: CO-331 queue cap and follow-up admission truth

## Scope

- Task id: `linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Registry id: `20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Linear issue: `CO-331`
- Issue id: `9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`

## Plan

1. Register docs-first artifacts and mirrors for the protected queue-contract scope.
2. Add a `Backlog` promotion hold for helper-created follow-up issues whose traceability packet requires setup before leaving `Backlog`.
3. Align provider admission capacity with resumable claims and queued retry claims so `max_allowed` is enforced during rehydration.
4. Align provider intake summary projection with queued retry active issue identifiers.
5. Add focused regression coverage for follow-up hold behavior, retry/resumable capacity, and active summary projection.
6. Run focused tests, full required validation, standalone review, and an elegance pass before review handoff.

## Acceptance Criteria

- [ ] Newly created or explicitly backlogged follow-up issues remain non-admitted until a real queue policy promotes them.
- [ ] Active provider claims never exceed configured `max_allowed`, even under resumable/retry rehydration.
- [ ] Regression coverage proves backlog/ready/admitted state stays aligned across Linear, provider intake, and `co-status`.
- [ ] Operator-facing evidence makes queue-cap or promotion drift explicit when it occurs.

## Validation

- [ ] Focused provider autopilot/admission/intake tests pass.
- [ ] Full validation floor passes: delegation guard, spec guard, build, lint, test, docs checks, repo stewardship, diff budget.
- [ ] Manifest-backed standalone review completes or a documented manual fallback is recorded.
- [ ] Elegance/minimality pass records no avoidable complexity before handoff.

## Risks

- Counting plain capacity-blocked `accepted` claims as capacity could deadlock admission; the implementation should target resumable and queued retry occupancy, not every accepted row.
- Follow-up hold detection must be traceability-marker based so normal operator-selected `Backlog` promotion still works.
- Summary changes must preserve retained audit history instead of deleting `provider-intake-state.json` rows.
