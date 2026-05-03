# TECH_SPEC Mirror - CO-460 stale tracked.linear advisory fallback regression

Canonical spec: `tasks/specs/linear-93785af4-9df9-4713-8a63-b0caddb5796f.md`; PRD: `docs/PRD-linear-93785af4-9df9-4713-8a63-b0caddb5796f.md`; action plan: `docs/ACTION_PLAN-linear-93785af4-9df9-4713-8a63-b0caddb5796f.md`.

## Contract
`co-status --format json`, `/api/v1/state`, and `/ui/data.json` must not expose stale retained `linear-advisory-state.json` as active top-level `tracked.linear`. A stale `CO-1` advisory file from March 2026 must fail closed after fresh provider/control-host truth is available and no longer validates that issue. This is a CO-223 / CO-255 regression follow-up, not provider-intake summary drift or binary/model provenance work.

## Implementation Notes
- Extend stale advisory classification so a fresh provider-intake/control-host snapshot can supersede an unmatched retained advisory issue.
- Preserve existing matched-claim stale marking and polling-only heartbeat protections.
- Keep the shared projection path responsible so `co-status`, `/api/v1/state`, and `/ui/data.json` agree.

## Not Done If
- `tracked.linear.identifier=CO-1` can still be sourced from stale retained advisory data.
- API/UI output diverges from CLI status output.
- The fix changes provider-intake summary selection, binary/model provenance, or source-root freshness behavior.

## Validation
Focused stale-advisory restart regression, full repo validation gates, manifest-backed standalone review, and explicit elegance pass are required before review handoff.
