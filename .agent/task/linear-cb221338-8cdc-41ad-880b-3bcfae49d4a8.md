# Task Checklist - linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8

- Linear Issue: `CO-304` / `cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- MCP Task ID: `linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- Primary PRD: `docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- TECH_SPEC: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- Shared source 0 anchor: `ctx:sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1#chunk:c000001`
- Source object id: `sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1`
- Origin manifest: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/manifest.json`

## Docs-First
- [x] PRD drafted for the `CO-304` degraded-read fallback lane. Evidence: `docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`.
- [x] TECH_SPEC drafted with protected terms, parity matrix, wrong interpretations, and validation guidance. Evidence: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`, `docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`. Evidence: `.agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec notes. Evidence: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state, workpad state, implementation files, or test files. Evidence: touched-file scope is limited to the declared docs/task packet plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Child lane preserved the exact issue checksum: `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `CO-296`, `supervisor truth`, `degraded-read fallback`, and `fail-closed freshness`. Evidence: packet grep across the new files.
- [x] Child lane left the packet in the workspace for parent patch export instead of committing in-lane. Evidence: workspace changes remain uncommitted for export.
- [ ] Parent docs-review captured before implementation. Evidence: pending parent manifest.

## Implementation Acceptance
- [ ] `co-status --format json` can return a bounded `degraded-read fallback` when `/ui/data.json` times out but `provider-intake-state.json` remains fresh after `CO-296`. Evidence: pending parent implementation and focused regression.
- [ ] `fail-closed freshness` blocks degraded output when supervisor truth is stale or absent. Evidence: pending parent implementation and focused regression.
- [ ] Output keeps the distinction explicit between timed-out UI reads, fresh degraded fallback, and stale-supervisor fail-closed results. Evidence: pending parent implementation and focused regression.
- [ ] UI layout work, dashboard visual redesign, and unrelated control-host features remain out of scope. Evidence: pending parent review and implementation closeout.

## Validation
- [ ] Parent focused reproduction of `/ui/data.json` timeout with still-advancing `provider-intake-state.json`. Evidence: pending.
- [ ] Parent focused regression for fresh-supervisor degraded fallback. Evidence: pending.
- [ ] Parent focused regression for stale-supervisor fail-closed behavior. Evidence: pending.
- [ ] Parent docs-review / `node scripts/spec-guard.mjs --dry-run` after patch import. Evidence: pending.
- [ ] Parent required validation/review/elegance gates before PR handoff. Evidence: pending.

## Progress Log
- 2026-04-22: Bounded same-issue child lane created the `CO-304` docs-first packet and registry mirrors only. The packet preserves `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `CO-296`, `supervisor truth`, `degraded-read fallback`, and `fail-closed freshness`, and explicitly rejects UI layout work, dashboard visual redesign, and unrelated control-host features.
