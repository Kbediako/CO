# ACTION_PLAN - CO STATUS / observability: restore compatibility row fields after post-recovery rehydrate

## Summary
- Goal: give the parent lane a bounded implementation plan for the post-recovery compatibility-hydration defect where canonical active rows recover, but `/api/v1/state` ids and `co-status --format json` compatibility row fields remain partially null after rehydrate.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned compatibility hydration implementation, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the live CO-227 issue body is the authoritative checksum for this lane
  - the smallest correct fix is one bounded compatibility hydration seam across the existing runtime/projection/presenter path, not a broader recovery or tracked-truth rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - authenticated `/api/v1/state`
  - `running_ids`
  - `retrying_ids`
  - `co-status --format json`
  - compatibility fields `id`, `bucket`, `state`, `reason`, and `aliases`
  - `post-recovery compatibility-field hydration`
- Not done if:
  - `/api/v1/state` still leaves `running_ids` or `retrying_ids` null after recovery
  - `co-status --format json` rows still leave compatibility `id`, `bucket`, `state`, `reason`, or `aliases` null
  - the fix regresses recovered canonical active mapping
  - the fix regresses the newer meaningful event rendering
  - the lane drifts into `CO-223`, `CO-211`, `CO-146`, or `CO-189`
- Pre-implementation issue-quality review:
  - 2026-04-18: the live issue body makes this a compatibility read-model/presenter hydration lane that starts after canonical active identity already recovered. The packet therefore rejects expanding into restart churn, top-level tracked truth, synthetic fallback rows, or original live-worker rehydrate restoration.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-227` within the declared docs scope.
2. Parent audits the compatibility read path through `selectedRunProjection.ts`, `controlRuntime.ts`, `compatibilityIssuePresenter.ts`, `observabilityReadModel.ts`, `observabilitySurface.ts`, and `operatorDashboardPresenter.ts`.
3. Parent identifies the smallest seam where recovered canonical rows lose `running_ids`, `retrying_ids`, or row fields `id`, `bucket`, `state`, `reason`, and `aliases`.
4. Parent restores or adds populated `running_ids` and `retrying_ids` for authenticated `/api/v1/state` after rehydrate.
5. Parent restores or adds populated compatibility row fields `id`, `bucket`, `state`, `reason`, and `aliases` for live or retrying `co-status --format json` rows after the same recovery path.
6. Parent confirms the fix preserves the recovered canonical active-issue mapping instead of inventing a second truth source.
7. Parent confirms the fix does not regress the newer meaningful event rendering.
8. Parent runs focused validation and carries the packet into its normal review/PR path.

## Dependencies
- Shared source anchor: `ctx:sha256:94042dd2db264d8821d3e322490b751dc925f36b8ea0692cb03302b6418ec7b0#chunk:c000001`
- Origin manifest: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`
- Live issue checksum:
  - `/api/v1/state` currently reports `running=3`, `retrying=0`, while `running_ids` and `retrying_ids` are null after recovery
  - `co-status --format json` currently reports `CO-196`, `CO-218`, and `CO-210`, while row fields `id`, `bucket`, `state`, `reason`, and `aliases` stay null
- Likely parent implementation seams:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- Likely parent focused tests:
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Validation
- Child lane only:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`
  - `rg -n "running_ids|retrying_ids|co-status --format json|id|bucket|state|reason|aliases|CO-223|CO-211|CO-146|CO-189" docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md .agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md`
  - `git diff --check -- docs/PRD-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/TECH_SPEC-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md docs/ACTION_PLAN-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/specs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/tasks-linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md .agent/task/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - focused compatibility-hydration regressions for `running_ids` / `retrying_ids`
  - focused `co-status --format json` row-field hydration regressions for `id`, `bucket`, `state`, `reason`, and `aliases`
  - focused regression to prove meaningful event rendering remains intact
  - parent docs-review before implementation
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - parent-selected scoped validation after source edits
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` (or `npm run review`)
- Rollback plan:
  - revert the bounded compatibility-hydration seam if it regresses canonical mapping or meaningful event rendering

## Risks & Mitigations
- Risk: the fix drifts into top-level tracked-truth repair.
  - Mitigation: keep `CO-223` explicit in non-goals and reject conflating top-level tracked truth with per-row compatibility hydration.
- Risk: the fix regresses event/message rendering while hydrating row fields.
  - Mitigation: keep meaningful event rendering as an explicit protected expectation and regression target.
- Risk: ids are restored from a second truth source that conflicts with the recovered canonical mapping.
  - Mitigation: require parent to reuse the existing recovered canonical mapping from the compatibility runtime/projection path.

## Approvals
- Docs packet child lane: `.runs/linear-a0ef4f6c-bf78-4dd6-9d43-244c445b87cb-docs-packet/cli/2026-04-17T22-12-16-013Z-ad2f7b8b/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
