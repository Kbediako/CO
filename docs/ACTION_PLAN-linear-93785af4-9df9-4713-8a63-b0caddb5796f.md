# ACTION_PLAN - CO-460 stale tracked.linear advisory fallback regression

## Scope
Repair the stale `tracked.linear` advisory fallback regression so retained `linear-advisory-state.json` cannot repopulate active tracked work after control-host restart when fresh provider/control-host truth no longer validates the retained issue.

## Plan
1. Confirm the read-model seam from `linear-advisory-state.json` through runtime projection to `co-status`, `/api/v1/state`, and `/ui/data.json`.
2. Add stale-source classification for fresh unmatched provider-intake/control-host truth that supersedes retained advisory state.
3. Preserve existing matched-claim stale handling and polling-only heartbeat behavior.
4. Add regression coverage with stale `CO-1` advisory state plus fresh provider-intake/control-host state.
5. Validate focused tests, repo gates, standalone review, elegance pass, PR checks, and ready-review drain before Linear review handoff.

## Constraints
Keep this separate from provider-intake summary drift, binary/model provenance, and source-root freshness. Do not hide retained advisory files as audit evidence; only prevent them from becoming active tracked work without current authority.

## Validation
- Focused stale advisory regression tests.
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- Manifest-backed review, elegance pass, PR checks, and ready-review drain.
