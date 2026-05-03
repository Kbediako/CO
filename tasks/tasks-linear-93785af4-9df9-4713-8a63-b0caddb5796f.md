# Task Checklist - CO-460

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, action plan, task checklist, and agent mirror exist for `linear-93785af4-9df9-4713-8a63-b0caddb5796f`.
- [x] Protected terms are visible: `co-status --format json`, `tracked.linear`, `linear-advisory-state.json`, `provider_intake.updated_at`, `/api/v1/state`, `/ui/data.json`, `CO-1`, `CO-223`, and `CO-255`.
- [x] The packet keeps this lane separate from provider-intake summary drift and binary/model provenance issues.

## Acceptance
- [x] Regression fixture covers stale `linear-advisory-state.json` with fresh provider/control-host state.
- [x] `co-status --format json` returns `tracked.linear=null` or a current authoritative tracked issue, never stale `CO-1`.
- [x] `/api/v1/state` and `/ui/data.json` match the same behavior.
- [x] Tests prove old retained advisory files cannot repopulate active tracked work after control-host restart.
- [x] Links identify this as a regression/follow-up of CO-223 and CO-255.

## Validation
- [x] Focused stale advisory regression tests.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [ ] `npm run test` - pending resumed validation after CO-460 moved from Blocked back to In Progress.
- [x] `npm run docs:check`
- [ ] `npm run docs:freshness` - pending resumed validation after CO-460 moved from Blocked back to In Progress.
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] Manifest-backed standalone review and elegance pass.
- [ ] PR checks, ready-review drain, and Linear review handoff - pending resumed validation and PR creation.

## Notes
The implementation seam is the retained Linear advisory state path. Provider-intake summary ranking, binary/model provenance, and source-root freshness remain explicit non-goals.

2026-05-01: Implementation was code-complete and review-clean locally, but the issue stopped at Blocked because `npm run test` was blocked by CO-470 and `npm run docs:freshness` was blocked by CO-444, both reproduced on clean `origin/main`.

2026-05-03: CO-460 resumed after the blocker moved terminal and Linear returned the issue to Ready. Focused stale advisory regression tests pass in the resumed workspace; full validation, review, and PR handoff are being refreshed.
