# Task Checklist - linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb

- Linear Issue: `CO-227` / `a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- MCP Task ID: `linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb`
- Primary PRD: `docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- TECH_SPEC: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
- Shared source 0 anchor: `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`
- Current origin manifest: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`

## Docs-First
- [x] PRD drafted for post-recovery compatibility-field hydration with explicit `/api/v1/state`, `running_ids`, `retrying_ids`, `co-status --format json`, and row fields `id`, `bucket`, `state`, `reason`, and `aliases` scope. Evidence: `docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.
- [x] TECH_SPEC drafted with the protected terms, parity matrix, explicit issue-boundary contract against `CO-223`, `CO-211`, `CO-146`, and `CO-189`, and parent-owned implementation seams. Evidence: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`, `docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`. Evidence: `.agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.
- [x] Pre-implementation issue-quality review recorded in the canonical spec. Evidence: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] After control-host restart / rehydrate, authenticated `/api/v1/state` exposes populated `running_ids` and `retrying_ids` that match the live canonical issue set.
- [x] After the same recovery path, `co-status --format json` rows expose populated compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases` for live or retrying rows.
- [x] The fix preserves the recovered canonical mapping for active issues.
- [x] The fix does not regress the newer meaningful event rendering.
- [x] The fix remains distinct from `CO-223` so top-level stale tracked truth and per-row compatibility hydration are not conflated.

## Validation
- [x] Child scoped JSON parse check. Evidence: `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "running_ids|retrying_ids|co-status --format json|id|bucket|state|reason|aliases|CO-223|CO-211|CO-146|CO-189" docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md .agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md .agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [x] Parent focused post-rehydrate compatibility-hydration regressions for `/api/v1/state`. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ObservabilityApiController.test.ts orchestrator/tests/UiDataController.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] Parent focused post-rehydrate compatibility row-field hydration regressions for `co-status --format json`. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ObservabilityApiController.test.ts orchestrator/tests/UiDataController.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] Parent focused regression preserving meaningful event rendering. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ObservabilityApiController.test.ts orchestrator/tests/UiDataController.test.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] Parent pre-implementation task/spec review recorded before source edits. Evidence: `tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`, `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`.
- [x] Parent-selected scoped validation after source edits. Evidence: `node scripts/delegation-guard.mjs`; `node scripts/spec-guard.mjs --dry-run`; `npm run build`; `npm run lint`; `npm run test`; `npm run docs:check`; `npm run docs:freshness`; `npm run repo:stewardship`; `node scripts/diff-budget.mjs`; `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb/cli/2026-04-17T22-38-47-946Z-a0cc17f5/review/telemetry.json`.

## Progress Log
- 2026-04-18: bounded same-issue child lane created the `CO-227` docs-first packet and registry mirrors against source anchor `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`. The expected shared source payload was absent in this child checkout, so the packet is anchored on the live read-only CO-227 issue body plus current repo seam names. The preserved issue checksum is explicit: authenticated `/api/v1/state` currently reports correct live counts while `running_ids` and `retrying_ids` stay null, and `co-status --format json` currently reports the live canonical set while compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` stay null after rehydrate.
- 2026-04-18: parent implementation kept the fix bounded to the compatibility read-model / presenter seam. `/api/v1/state` now derives `running_ids` and `retrying_ids` through the same canonical row-resolution path used for row `id`, and dashboard rows now repopulate `id`, `bucket`, `state`, `reason`, and merged canonical-plus-row `aliases` after rehydrate.
- 2026-04-18: the first standalone review surfaced two actionable findings: `/api/v1/state` id derivation needed to reuse canonical row resolution, and row `aliases` needed to preserve row-specific fallback identifiers. Both were fixed before the clean wrapper rerun recorded `status=succeeded` and `review_outcome=clean-success` in `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb/cli/2026-04-17T22-38-47-946Z-a0cc17f5/review/telemetry.json`.
- 2026-04-18: unrelated ambient full-suite flakes were split out instead of expanding scope: `CO-234` for `LockFile.test.ts` keepalive timing and `CO-235` for `SelectedRunProjection.test.ts` timeout drift. Both isolated reruns passed in this lane while the final full `npm run test` completed cleanly.
