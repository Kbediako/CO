# CO-574 Tasks - Control-Host Recovery Admission

- [x] Rebuild live issue evidence for CO-574/CO-575 and confirm no run identity exists.
- [x] Link CO-575 as blocked by CO-574 and document the incident evidence in Linear.
- [x] Create docs-first packet and task registration.
- [x] Add focused failing coverage for accepted/no-run recovery acknowledgement.
- [x] Add focused failing coverage for manifestless pending-revalidation stale-anchor preservation.
- [x] Add focused failing coverage for bounded machine-status degraded reads.
- [x] Implement provider recovery acknowledgement and handoff changes.
- [x] Add controller-level machine-status timeout/degraded JSON.
- [x] Evaluate whether control-host probe timeout behavior needs code change in this branch.
- [x] Run focused tests and broader validation gates.
- [ ] Open/update PR and request Codex/CodeRabbit review.
- [ ] Resume CO-575 only after the root-cause fix is live.

## Validation Checklist

- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] Focused affected tests
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness` or documented baseline blocker
- [x] `node scripts/diff-budget.mjs`
- [x] `npm run repo:stewardship`
- [x] `npm run pack:smoke`
- [ ] Standalone review / Codex review evidence

## Gate Notes

- `npm run docs:freshness` remains blocked by repo-wide CO-573 rolling cohort debt, not by CO-574 changed paths.
- `npm run docs:freshness:maintain` reports `block_spec_guard_pre_expiry`, owner issue `CO-573`, `blocking changed paths: 0`, and `blocks_handoff=yes`.

## Fallback Expiry / Refactor Decision

- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required CO-382 decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| provider recovery | accepted/no-run pending-revalidation observation | remove fallback | CO-574 | explicit recover/nudge sees accepted claim without launch evidence | 2026-05-22 | 2026-05-22 | 2026-05-22 | recovery returns queued pending or terminal handoff result, never terminal no-launch observation | Observability API regression |
| provider rehydrate | manifestless accepted stale clock based on refreshed `updated_at` | remove fallback | CO-574 | repeated rehydrate of accepted pending-revalidation | 2026-05-22 | 2026-05-22 | 2026-05-22 | stable launch/recovery anchor survives rehydrate | ProviderIssueHandoff regression |
| machine-status endpoint | unbounded controller read | expire fallback | CO-574 | presenter/read-model stall under active workers | 2026-05-22 | 2026-05-22 | 2026-06-21 | endpoint returns current or `machine_status_degraded` JSON within the controller timeout; remove when the read path is proven non-blocking by construction | ControlMachineStatusContract regression |
| control-host supervision | active-worker probe timeout restart safety path | expire fallback | CO-574 | probe timeout while active workers exist | 2026-05-22 | 2026-05-22 | 2026-06-21 | degraded active-worker classification has tests and true dead-host restart no longer depends on same-endpoint probe fallback behavior | ControlHostSupervision regression |

- Large-refactor: required within this lane because recovery truth was split across API acknowledgement, provider-intake rehydrate, machine-status reads, and supervision probes; another one-line timeout or state-cycle patch would leave the root cause alive.
- Minor-seam: rejected for the provider recovery and rehydrate paths; the only temporary seam retained is the bounded machine-status/control-host safety path with expiry metadata and focused regression coverage.
