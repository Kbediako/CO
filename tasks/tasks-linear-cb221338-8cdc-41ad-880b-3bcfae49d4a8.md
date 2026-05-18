# Task Checklist - linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8

- Linear issue: `CO-304`
- PRD: `docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- TECH_SPEC: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, checklist mirror, and registry entries exist for `CO-304`.
- [x] The packet preserves `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `CO-296`, `supervisor truth`, `degraded-read fallback`, and `fail-closed freshness`.
- [x] Pre-implementation issue-quality review is recorded in the canonical spec.

## Implementation
- [x] `co-status --format json` now returns bounded degraded output when `/ui/data.json` times out and provider-intake truth is fresh.
- [x] Stale or missing supervisor truth still fails closed.
- [x] The lane stayed out of UI layout, dashboard redesign, and unrelated control-host work.

## Validation
- [x] Focused reproduction and degraded-read regressions landed.
- [x] Required repo validation, review fallback, and elegance pass completed before handoff.
