---
id: 20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7
title: "CO-331 queue cap and follow-up admission truth"
relates_to: docs/PRD-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

# Task Spec: CO-331 queue cap and follow-up admission truth

## User Intent

Restore one truthful queue contract across `Backlog`, `Ready`, `provider-intake-state.json`, `co-status`, `max_allowed`, active issue identifiers, resumable claims, and follow-up issue admission.

## Target Contract

- Helper-created follow-up issues that are explicitly placed in `Backlog` stay non-admitted until a real queue policy promotes them.
- Resumable claims and queued retry claims occupy provider admission capacity.
- `provider-intake-state.json` and `co-status` expose the same active issue identifiers used by admission.
- Queue-cap or promotion drift is visible through concrete hold/block evidence.

## Protected Terms

- `Backlog`
- `Ready`
- `provider-intake-state.json`
- `co-status`
- `max_allowed`
- active issue identifiers
- resumable claims
- follow-up issue admission

## Wrong Interpretations To Reject

- Do not treat this as only `CO-317`.
- Do not explain it away with `CO-329` or `CO-330` runtime/provider failures.
- Do not excuse over-cap retry work because it is not technically `running`.
- Do not solve queue truth through manual moves or host restarts.

## Implementation Checklist

- [x] Add traceability-pending follow-up detection to backlog promotion.
- [x] Hold matching follow-up issues in `Backlog` with operator-visible evidence.
- [x] Count resumable claims against direct admission capacity.
- [x] Count queued retry claims against direct admission capacity.
- [x] Align provider intake active summary projection with queued retry occupancy.
- [x] Add focused regressions for autopilot, admission, and summary projection.
- [x] Run required validation and review gates before handoff.

## Review Notes

- 2026-04-23: Issue-quality review approved this scope as covering the full CO-331 request, including `Backlog` follow-up admission, retry/resumable occupancy, provider intake state, `co-status`, and `max_allowed` alignment.
- 2026-04-23: Manifest-backed standalone review completed with `status: succeeded` and `review_outcome: clean-success`; post-review elegance/minimality pass found no avoidable abstraction or unrelated branch scope.

## Not Done If

- Freshly created backlog follow-ups can still become `Ready` / active without deliberate sequencing.
- Active provider claims can still exceed `max_allowed` during resumable/retry rehydration.
- `co-status`, provider-intake state, and live Linear issue state can still disagree about which issues are truly active.
