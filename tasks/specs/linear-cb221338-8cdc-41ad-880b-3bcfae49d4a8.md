---
id: 20260422-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8
title: CO-304 co-status degraded-read fallback when `/ui/data.json` times out but supervisor truth stays fresh after `CO-296`
status: done
relates_to: docs/PRD-linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (8 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Summary
- `co-status --format json` can time out on `/ui/data.json` even while `provider-intake-state.json` continues advancing after `CO-296`.
- The repair is a bounded `degraded-read fallback` backed by fresh `supervisor truth`.
- `fail-closed freshness` remains mandatory when supervisor data is stale or absent.

## Requirements
1. Preserve the direct-read seam: timed-out `/ui/data.json` versus still-fresh `provider-intake-state.json`.
2. Add degraded JSON output only when freshness proves the supervisor truth is still current.
3. Ensure stale or missing supervisor truth stays on the hard-failure path.
4. Preserve an explicit degraded marker instead of presenting the result as a normal UI-backed read.
5. Leave UI layout work, dashboard redesign, and unrelated control-host features out of scope.

## Protected Terms
- `co-status --format json`
- `/ui/data.json`
- `provider-intake-state.json`
- `CO-296`
- `supervisor truth`
- `degraded-read fallback`
- `fail-closed freshness`

## Wrong Interpretations To Reject
- Reopen `CO-296` instead of closing the adjacent gap.
- Treat every `/ui/data.json` timeout as proof the host is dead.
- Return stale supervisor truth as healthy output.
- Expand the fix into UI layout or dashboard work.

## Parity Matrix

| Surface | Current | Target |
| --- | --- | --- |
| Direct JSON read | `co-status --format json` times out on `/ui/data.json` | direct JSON can emit bounded degraded output |
| Provider intake | `provider-intake-state.json` can still advance | advancing intake truth is used only as fallback input |
| Freshness | stale handling is too coarse for this path | `fail-closed freshness` decides whether degraded output is legal |
| Scope | easy to drift into dashboard work | lane stays bounded to read-contract behavior after `CO-296` |

## Validation
- Focused reproduction of the timeout path.
- Focused fresh degraded-read regression.
- Focused stale fail-closed regression.
- Required docs/spec/review gates before handoff.

## Notes
- 2026-04-22 pre-implementation issue-quality review: this issue is narrower than generic control-host recovery and broader than a message-only tweak; the right seam is the direct JSON fallback plus freshness gating.
