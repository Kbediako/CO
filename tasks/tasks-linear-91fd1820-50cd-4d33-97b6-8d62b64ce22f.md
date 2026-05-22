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
