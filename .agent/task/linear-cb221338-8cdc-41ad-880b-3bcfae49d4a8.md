# Task Mirror - CO-304

- Issue: `co-status --format json` still timed out on `/ui/data.json` while `provider-intake-state.json` advanced after `CO-296`.
- Scope: bounded `degraded-read fallback` from fresh `supervisor truth` with `fail-closed freshness`.
- Non-goals: UI layout, dashboard redesign, unrelated control-host features.

## Status
- [x] Docs-first packet exists and preserves the protected terms.
- [x] Implementation and focused degraded-read validation landed.
- [x] Review fallback and elegance pass completed before handoff.
