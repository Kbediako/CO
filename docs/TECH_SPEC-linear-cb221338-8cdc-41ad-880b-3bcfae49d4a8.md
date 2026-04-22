---
id: 20260422-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8
title: CO STATUS / observability: degraded-read fallback when `/ui/data.json` times out but supervisor truth stays fresh after `CO-296`
relates_to: docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- PRD: `docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
- Task checklist: `tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`

## Traceability
- Linear issue: `CO-304` / `cb221338-8cdc-41ad-880b-3bcfae49d4a8`
- Source anchor: `ctx:sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1#chunk:c000001`
- Source object id: `sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1`
- Expected source payload: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/memory/source-0/source.txt`
- Docs packet child lane manifest: `.runs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8-docs-packet/cli/2026-04-22T09-12-53-248Z-15113023/manifest.json`
- Shared source note: the expected `source-0` payload is absent in this child checkout, so the packet is anchored on the parent prompt's protected terms and the repo's nearby `co-status --format json` packet patterns.

## Summary
- Objective: give the parent lane a bounded contract for `co-status --format json` timing out on `/ui/data.json` even though `provider-intake-state.json` still advances after `CO-296`.
- Scope:
  - docs-first packet and registry/checklist mirrors for `CO-304`
  - parent-owned degraded-read fallback for the direct JSON path only
  - explicit freshness gating through `fail-closed freshness`
  - explicit scope rejection for UI layout, dashboard visual redesign, and unrelated control-host features
- Constraints:
  - child lane remains docs-only
  - parent owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge
  - no widening into generic dashboard or host-feature redesign

## Issue-Shaping Contract
- User-request translation carried forward: this is the narrow read-contract lane where `co-status --format json` can time out on `/ui/data.json` while `provider-intake-state.json` continues advancing after `CO-296`. The intended fix is a bounded `degraded-read fallback` rooted in `supervisor truth`, not a redesign of the dashboard or unrelated control-host surfaces.
- Protected terms / exact artifact and surface names:
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - `CO-296`
  - `supervisor truth`
  - `degraded-read fallback`
  - `fail-closed freshness`
- Nearby wrong interpretations to reject:
  - redesign the UI layout
  - do dashboard visual redesign work
  - widen into unrelated control-host features
  - emit stale supervisor truth without a freshness gate
  - treat this as a generic host-dead incident instead of a bounded read-side degradation
- Explicit non-goals carried forward:
  - no UI layout work
  - no dashboard visual redesign
  - no unrelated control-host feature work
  - no code or test edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - `co-status --format json` can time out on `/ui/data.json`
  - `provider-intake-state.json` can continue advancing after `CO-296`
  - there is no explicit packeted contract yet for when advancing supervisor truth may support degraded output
- Reference truth:
  - advancing supervisor truth should remain authoritative evidence that the intake loop is alive
  - fallback output must still fail closed once freshness is no longer good enough
  - UI/read degradation should remain separate from UI redesign or unrelated host features
- Target truth / intended delta:
  - `co-status --format json` can emit a bounded degraded snapshot when `/ui/data.json` times out and supervisor truth remains fresh
  - the degraded path is explicitly labeled as `degraded-read fallback`
  - stale or missing supervisor truth still yields fail-closed behavior
  - the lane stays bounded to read-contract behavior after `CO-296`
- Explicitly out-of-scope differences:
  - UI layout changes
  - dashboard visual redesign
  - unrelated control-host features

## Readiness Gate
- Not done if:
  - the packet still allows stale supervisor truth to leak past `fail-closed freshness`
  - the packet does not preserve the explicit post-`CO-296` split between timed-out `/ui/data.json` and still-advancing `provider-intake-state.json`
  - the implementation scope drifts into UI layout, dashboard visual redesign, or unrelated control-host features
- Pre-implementation issue-quality review evidence:
  - 2026-04-22: child-lane review confirms the issue is narrower than generic control-host failure handling and broader than a message-only error tweak. The exact seam is the direct JSON read path failing while supervisor truth remains fresh enough to support a bounded degraded snapshot.
  - 2026-04-22: the micro-task path is ineligible because correctness depends on exact protected terms, explicit non-goals, and a current/reference/target parity matrix around degraded fallback and freshness gating.
- Safeguard ownership split:
  - child lane owns only the packet files, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
1. Create the docs-first packet and registry/checklist mirrors for `CO-304`.
2. Reproduce the split where `/ui/data.json` times out while `provider-intake-state.json` continues advancing after `CO-296`.
3. Add a bounded `degraded-read fallback` for `co-status --format json`.
4. Gate degraded output with explicit `fail-closed freshness`.
5. Preserve explicit distinction between fresh-supervisor degraded output and stale-supervisor fail-closed output.
6. Keep the lane explicitly separate from UI layout work, dashboard visual redesign, and unrelated control-host features.

## Architecture & Data
- Architecture / design adjustments:
  - keep the repair at the direct JSON read contract rather than inventing a new primary state surface
  - make freshness gating explicit and machine-checkable so reviewers can see why degraded output was accepted or rejected
  - preserve direct `/ui/data.json` timeout truth instead of silently hiding it
- Data model / artifact constraints:
  - `provider-intake-state.json` remains fallback input only when freshness is acceptable
  - stale supervisor truth must still fail closed
  - degraded output should carry explicit indication that it came from supervisor truth rather than `/ui/data.json`
- Likely parent implementation surfaces:
  - the `co-status --format json` read path
  - the `/ui/data.json` timeout handling seam
  - the supervisor freshness gate fed by `provider-intake-state.json`

## Validation Plan
- Child-lane checks:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\njson.loads(pathlib.Path('docs/docs-freshness-registry.json').read_text())\nPY`
  - `rg -n "co-status --format json|/ui/data.json|provider-intake-state.json|CO-296|supervisor truth|degraded-read fallback|fail-closed freshness" docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md .agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`
  - `git diff --check -- docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/TECH_SPEC-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md .agent/task/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused reproduction of `/ui/data.json` timeout plus advancing `provider-intake-state.json`
  - focused regression for fresh-supervisor degraded fallback
  - focused regression for stale-supervisor fail-closed behavior
  - parent docs-review before implementation
  - parent-owned `node scripts/spec-guard.mjs --dry-run` after packet acceptance
- Rollout verification:
  - parent records degraded output success while supervisor freshness is still valid
  - parent records hard fail-closed output once freshness ages out or supervisor truth disappears

## Open Questions
- What freshness threshold should qualify supervisor truth for this degraded path?
- Should degraded output surface an explicit freshness age field, or is a degraded marker enough?
- Does the parent need a separate regression for supervisor truth advancing but missing the specific fields required by JSON output?

## Approvals
- Reviewer: docs child lane self-review for packet shape and issue boundaries.
- Date: 2026-04-22.
