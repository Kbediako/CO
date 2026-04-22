---
id: 20260422-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8
title: CO-304 co-status degraded-read fallback when `/ui/data.json` times out but supervisor truth stays fresh after `CO-296`
status: in_progress
owner: Codex
created: 2026-04-22
last_review: 2026-04-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md
related_action_plan: docs/ACTION_PLAN-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md
related_tasks:
  - tasks/tasks-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md
review_notes:
  - 2026-04-22: Bounded same-issue docs child lane created the docs-first packet and updated the declared registries only; parent lane owns implementation, validation, Linear/workpad state, PR lifecycle, and patch integration.
  - 2026-04-22: Shared source anchor preserved from the parent prompt: `ctx:sha256:76ba3f055c3147136a183eb8c1b65b40e881d8c91dd0453e5a39d11444a819e1#chunk:c000001`; the expected source payload path is absent in this child checkout, so the packet is anchored on the protected issue wording and nearby repo patterns.
  - 2026-04-22: Pre-implementation issue-quality review keeps the lane narrow: `co-status --format json` timing out on `/ui/data.json` while `provider-intake-state.json` still advances after `CO-296`; reject UI layout work, dashboard visual redesign, and unrelated control-host features.
---

# Technical Specification

## Context

`CO-304` is a read-contract lane for `co-status --format json`. The reported failure is not that the entire host necessarily died; it is that `/ui/data.json` can time out while `provider-intake-state.json` continues advancing after `CO-296`. That leaves the direct JSON path without a truthful degraded contract even though supervisor-owned intake truth is still moving. The correct scope is a bounded degraded read plus explicit freshness gating, not UI redesign or broader control-host feature work.

## Protected Terms / Exact Artifact Names
- `co-status --format json`
- `/ui/data.json`
- `provider-intake-state.json`
- `CO-296`
- `supervisor truth`
- `degraded-read fallback`
- `fail-closed freshness`

## User-Request Translation
- Create the missing docs-first packet for `CO-304` only.
- Preserve the exact boundary where `/ui/data.json` times out while `provider-intake-state.json` continues advancing after `CO-296`.
- Give the parent lane a bounded degraded-read contract based on `supervisor truth`.
- Require `fail-closed freshness` before degraded output is allowed.
- Do not mark implementation, validation, review, or PR work complete in this docs child lane.

## Requirements

1. The implementation must reproduce the split where `/ui/data.json` times out but `provider-intake-state.json` still advances after `CO-296`.
2. `co-status --format json` must support a bounded `degraded-read fallback` for this specific failure class.
3. The fallback must rely on `supervisor truth` only while freshness remains acceptable.
4. `fail-closed freshness` must block degraded output when supervisor truth is stale or absent.
5. Output must keep the difference explicit between timed-out `/ui/data.json`, fresh degraded fallback, and stale-supervisor fail-closed behavior.
6. The implementation must remain separate from UI layout work, dashboard visual redesign, and unrelated control-host features.
7. Validation must include focused coverage for both fresh and stale supervisor-truth cases.

## Nearby Wrong Interpretations To Reject
- `This is a dashboard redesign task.` No: UI layout and visual redesign are explicitly out of scope.
- `This should widen into unrelated control-host features.` No: the lane is bounded to direct JSON read degradation and freshness gating.
- `The fix can just always return supervisor truth.` No: `fail-closed freshness` must still reject stale supervisor data.
- `Any /ui/data.json timeout proves the host is dead.` No: this issue exists because supervisor truth can still be advancing after `CO-296`.
- `CO-296 itself needs to be reopened here.` No: `CO-296` is the adjacent reference boundary preserved by this packet.

## Current / Reference / Target Parity Matrix

| Contract | Current | Reference | Target |
| --- | --- | --- | --- |
| Direct JSON read | `co-status --format json` times out on `/ui/data.json` | direct JSON should stay truthful under degraded reads | direct JSON can use bounded degraded fallback |
| Supervisor truth | `provider-intake-state.json` continues advancing after `CO-296` | advancing supervisor truth is valid evidence that the intake loop is still alive | supervisor truth is used as fallback input only while fresh |
| Freshness | no explicit packeted guard for this lane | stale supervisor truth must still fail closed | `fail-closed freshness` decides whether degraded output is legal |
| Output classification | timeout can collapse into a hard failure only | operators should distinguish degraded-read success from stale-supervisor hard failure | output preserves timeout vs degraded vs stale-fail-closed distinction |
| Scope | easy to drift into wider UI/control-host work | adjacent issues and features should stay out of scope | lane stays bounded to read degradation after `CO-296` |

## Non-Goals
- No UI layout work.
- No dashboard visual redesign.
- No unrelated control-host feature work.
- No source or test edits in this child lane.
- No stale-truth override that bypasses `fail-closed freshness`.

## Not Done If
- The packet still allows stale supervisor truth to appear as current.
- The packet fails to preserve `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `CO-296`, `supervisor truth`, `degraded-read fallback`, or `fail-closed freshness`.
- UI layout, dashboard visual redesign, or unrelated control-host features are described as part of the fix.
- Parent implementation acceptance is implied without fresh/stale supervisor validation.

## Validation Plan

- Child-lane docs validation:
  - JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `git diff --check` over the touched docs/task files
  - protected-term grep over the new packet files
- Parent implementation validation:
  - reproduce the `/ui/data.json` timeout plus advancing `provider-intake-state.json` shape
  - add focused regression for fresh-supervisor degraded fallback
  - add focused regression for stale-supervisor fail-closed behavior
  - keep explicit scope review against UI layout, dashboard visual redesign, and unrelated control-host features
  - run docs-review and review gates before PR handoff

## Open Questions
- What freshness age is the minimum trustworthy threshold for degraded output?
- Should degraded output include an explicit source marker or timestamp age from supervisor truth?
- Is one stale-supervisor regression enough, or does the parent need separate absent-supervisor and stale-supervisor cases?
