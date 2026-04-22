# ACTION_PLAN - CO STATUS / observability: degraded-read fallback when `/ui/data.json` times out but supervisor truth stays fresh after `CO-296`

## Summary
- Goal: give the parent lane a bounded implementation plan for the post-`CO-296` read-side split where `co-status --format json` times out on `/ui/data.json` while `provider-intake-state.json` continues advancing.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned degraded-read fallback implementation, and parent-owned focused validation.
- Assumptions:
  - the expected shared `source-0` payload is absent in this child checkout
  - the parent prompt is the authoritative checksum for `CO-304`
  - the smallest correct fix is a degraded direct-read contract with explicit freshness gating, not UI redesign or broader control-host feature work

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - `CO-296`
  - `supervisor truth`
  - `degraded-read fallback`
  - `fail-closed freshness`
- Not done if:
  - degraded output can use stale supervisor truth
  - the lane drifts into UI layout, dashboard visual redesign, or unrelated control-host features
  - the packet stops making the post-`CO-296` split explicit
- Pre-implementation issue-quality review:
  - 2026-04-22: the issue is a narrow read-contract lane. The parent should fix timeout handling plus freshness gating only, and should not widen into dashboard/UI redesign or generic control-host expansion.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-304` within the declared docs scope.
2. Parent reproduces the `/ui/data.json` timeout while `provider-intake-state.json` still advances after `CO-296`.
3. Parent identifies the smallest seam where `co-status --format json` should switch into `degraded-read fallback`.
4. Parent adds degraded output backed by `supervisor truth` only while freshness remains inside the allowed window.
5. Parent adds explicit `fail-closed freshness` behavior when supervisor truth is stale or missing.
6. Parent confirms the implementation stays separate from UI layout work, dashboard visual redesign, and unrelated control-host features.
7. Parent runs focused validation and carries the lane into its normal docs-review / review / PR path.

## Dependencies
- Shared source anchor: `ctx:sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1#chunk:c000001`
- Origin manifest: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/manifest.json`
- Issue checksum:
  - `co-status --format json` times out on `/ui/data.json`
  - `provider-intake-state.json` continues advancing
  - the incident is explicitly after `CO-296`
  - the parent must preserve `supervisor truth`, `degraded-read fallback`, and `fail-closed freshness`
- Likely parent implementation seams:
  - direct `co-status --format json` read path
  - `/ui/data.json` timeout handling
  - `provider-intake-state.json` freshness gate
- Likely parent focused tests:
  - reproduction/fixture for timed-out `/ui/data.json` with advancing supervisor truth
  - regression for degraded fallback while fresh
  - regression for fail-closed behavior while stale

## Validation
- Child lane only:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\njson.loads(pathlib.Path('docs/docs-freshness-registry.json').read_text())\nPY`
  - `rg -n "co-status --format json|/ui/data.json|provider-intake-state.json|CO-296|supervisor truth|degraded-read fallback|fail-closed freshness" docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md .agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
  - `git diff --check -- docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md .agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused reproduction of the `CO-304` timeout shape
  - focused regression for `degraded-read fallback`
  - focused regression for `fail-closed freshness`
  - parent docs-review before implementation
  - `node scripts/spec-guard.mjs --dry-run`
  - parent-selected scoped validation after source edits
- Rollback plan:
  - revert the degraded fallback seam if it emits stale supervisor truth or broadens into non-issue UI/control-host work

## Risks & Mitigations
- Risk: the fix quietly converts stale supervisor truth into current truth.
  - Mitigation: keep `fail-closed freshness` explicit and regression-tested.
- Risk: the lane drifts into dashboard/UI redesign.
  - Mitigation: keep UI layout and visual redesign listed as explicit non-goals in every packet file.
- Risk: the fix grows into unrelated control-host features.
  - Mitigation: keep `CO-296` as a boundary/reference term, not a reopening target.

## Approvals
- Docs packet child lane: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation/review/PR lifecycle: pending parent lane
